import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatterControllerService } from './matter-controller.service';
import {
  buildDeviceState,
  getMappedDeviceInfo,
} from './matter-state-mapper';
import {
  getOnOffBehavior,
  getLevelControlBehavior,
  getColorControlBehavior,
  getBasicInformationBehavior,
  getDescriptorBehavior,
} from './matter-behaviors';
import type { DeviceState } from '@smart-home/shared-types';

/**
 * Handles Matter device commissioning, decommissioning, and DB CRUD.
 * Analog of HueBridgeService for the Matter protocol.
 */
@Injectable()
export class MatterNodeService {
  private readonly logger = new Logger(MatterNodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly controllerService: MatterControllerService,
  ) {}

  /**
   * Commission a Matter device using a pairing code (manual code or QR payload).
   * The device must be in commissioning mode (advertising).
   */
  async commissionNode(pairingCode: string) {
    this.logger.log(
      `Commissioning device with pairing code: ${pairingCode.slice(0, 8)}...`,
    );

    // Ensure the controller is initialized
    if (!this.controllerService.isInitialized()) {
      await this.controllerService.initialize();
    }

    const serverNode = this.controllerService.getServerNode();

    try {
      // Commission the device — discovers, pairs, and establishes a CASE session.
      // peers.commission() returns a CancelablePromise<ClientNode>.
      const clientNode = await (serverNode.peers as any).commission({
        pairingCode,
      });

      // Read device info from the commissioned node
      const info = await this.readDeviceInfo(clientNode);

      // Upsert the MatterNode in the database
      const matterNode = await this.prisma.matterNode.upsert({
        where: { nodeId: info.nodeId },
        update: {
          name: info.name,
          vendorId: info.vendorId,
          productId: info.productId,
          deviceType: info.deviceType,
          serialNumber: info.serialNumber,
          commissioned: true,
          lastSeen: new Date(),
        },
        create: {
          nodeId: info.nodeId,
          name: info.name,
          vendorId: info.vendorId,
          productId: info.productId,
          deviceType: info.deviceType,
          serialNumber: info.serialNumber,
        },
      });

      // Also create/update a Device record for the unified device model
      const mapped = getMappedDeviceInfo(
        info.deviceTypeId,
        info.hasOnOff,
        info.hasLevelControl,
        info.hasColorControl,
        info.hasColorTemperature,
      );

      const initialState = await this.readCurrentState(clientNode);

      await this.prisma.device.upsert({
        where: { externalId: info.nodeId },
        update: {
          name: info.name,
          capabilities: JSON.stringify(mapped.capabilities),
          lastState: JSON.stringify(initialState),
          online: true,
          updatedAt: new Date(),
        },
        create: {
          externalId: info.nodeId,
          name: info.name,
          type: mapped.type,
          source: 'matter',
          capabilities: JSON.stringify(mapped.capabilities),
          lastState: JSON.stringify(initialState),
          online: true,
        },
      });

      this.logger.log(
        `Successfully commissioned Matter device: ${info.name} (${info.nodeId})`,
      );
      return matterNode;
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Commissioning failed: ${message}`);

      if (message.includes('timeout') || message.includes('Timeout')) {
        throw new BadRequestException(
          'Commissioning timed out. Ensure the device is in pairing mode and nearby.',
        );
      }
      if (message.includes('passcode') || message.includes('Passcode')) {
        throw new BadRequestException(
          'Invalid pairing code. Check the code and try again.',
        );
      }
      throw new BadRequestException(`Commissioning failed: ${message}`);
    }
  }

  /**
   * Decommission (remove) a Matter device by its DB id.
   */
  async decommissionNode(id: string) {
    const matterNode = await this.prisma.matterNode.findUnique({
      where: { id },
    });

    if (!matterNode) {
      throw new NotFoundException(`Matter node ${id} not found`);
    }

    // Try to decommission from the fabric
    if (this.controllerService.isInitialized()) {
      try {
        const serverNode = this.controllerService.getServerNode();
        const clientNode = (serverNode.peers as any).get(matterNode.nodeId);
        if (clientNode) {
          await clientNode.decommission();
          this.logger.log(
            `Decommissioned node ${matterNode.nodeId} from fabric`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Could not decommission from fabric (device may be offline): ${err}`,
        );
      }
    }

    // Remove the Device record
    try {
      await this.prisma.device.delete({
        where: { externalId: matterNode.nodeId },
      });
    } catch {
      // Device record may not exist
    }

    // Remove the MatterNode record
    await this.prisma.matterNode.delete({ where: { id } });

    this.logger.log(
      `Removed Matter node: ${matterNode.name} (${matterNode.nodeId})`,
    );
  }

  /**
   * List all commissioned Matter nodes from the database.
   */
  async listNodes() {
    return this.prisma.matterNode.findMany({
      orderBy: { commissionedAt: 'desc' },
    });
  }

  /**
   * Read device info from a ClientNode's clusters.
   */
  private async readDeviceInfo(clientNode: any): Promise<{
    nodeId: string;
    name: string;
    vendorId?: number;
    productId?: number;
    deviceType: string;
    deviceTypeId: number;
    serialNumber?: string;
    hasOnOff: boolean;
    hasLevelControl: boolean;
    hasColorControl: boolean;
    hasColorTemperature: boolean;
  }> {
    const nodeId = String(clientNode.id ?? clientNode.identity ?? 'unknown');

    let name = `Matter Device (${nodeId})`;
    let vendorId: number | undefined;
    let productId: number | undefined;
    let serialNumber: string | undefined;
    let deviceTypeId = 0x0100; // Default: On/Off Light
    let hasOnOff = false;
    let hasLevelControl = false;
    let hasColorControl = false;
    let hasColorTemperature = false;

    const BasicInformationBehavior = getBasicInformationBehavior();
    const OnOffBehavior = getOnOffBehavior();
    const LevelControlBehavior = getLevelControlBehavior();
    const ColorControlBehavior = getColorControlBehavior();
    const DescriptorBehavior = getDescriptorBehavior();

    try {
      await clientNode.act('readInfo', async (agent: any) => {
        // Read BasicInformation from root endpoint
        try {
          if (agent.has(BasicInformationBehavior)) {
            const basicInfo = agent.get(BasicInformationBehavior);
            name =
              basicInfo.state.nodeLabel ||
              basicInfo.state.productName ||
              name;
            vendorId = basicInfo.state.vendorId;
            productId = basicInfo.state.productId;
            serialNumber = basicInfo.state.serialNumber;
          }
        } catch {
          /* BasicInformation may not be on this endpoint */
        }

        // Check for cluster support
        try {
          hasOnOff = agent.has(OnOffBehavior);
        } catch {
          /* not available */
        }
        try {
          hasLevelControl = agent.has(LevelControlBehavior);
        } catch {
          /* not available */
        }
        try {
          hasColorControl = agent.has(ColorControlBehavior);
        } catch {
          /* not available */
        }

        // Read descriptor to find the device type
        try {
          if (agent.has(DescriptorBehavior)) {
            const descriptor = agent.get(DescriptorBehavior);
            const deviceTypes = descriptor.state.deviceTypeList;
            if (deviceTypes && deviceTypes.length > 0) {
              deviceTypeId = deviceTypes[0].deviceType;
            }
          }
        } catch {
          /* descriptor not available */
        }
      });
    } catch (err) {
      this.logger.warn(`Could not read full device info: ${err}`);
    }

    // Determine color temperature support from device type
    if (hasColorControl) {
      hasColorTemperature =
        deviceTypeId === 0x010c || deviceTypeId === 0x010d;
    }

    return {
      nodeId,
      name,
      vendorId,
      productId,
      deviceType: `0x${deviceTypeId.toString(16).padStart(4, '0')}`,
      deviceTypeId,
      serialNumber,
      hasOnOff,
      hasLevelControl,
      hasColorControl,
      hasColorTemperature,
    };
  }

  /**
   * Read current state from a ClientNode's clusters.
   */
  async readCurrentState(clientNode: any): Promise<DeviceState> {
    const attrs: Record<string, any> = {};

    const OnOffBehavior = getOnOffBehavior();
    const LevelControlBehavior = getLevelControlBehavior();
    const ColorControlBehavior = getColorControlBehavior();

    try {
      await clientNode.act('readState', async (agent: any) => {
        try {
          if (agent.has(OnOffBehavior)) {
            attrs.onOff = agent.get(OnOffBehavior).state.onOff;
          }
        } catch {
          /* not available */
        }

        try {
          if (agent.has(LevelControlBehavior)) {
            attrs.currentLevel =
              agent.get(LevelControlBehavior).state.currentLevel;
          }
        } catch {
          /* not available */
        }

        try {
          if (agent.has(ColorControlBehavior)) {
            const colorState = agent.get(ColorControlBehavior).state;
            if (colorState.currentX !== undefined) {
              attrs.currentX = colorState.currentX;
              attrs.currentY = colorState.currentY;
            }
            if (colorState.colorTemperatureMireds !== undefined) {
              attrs.colorTemperatureMireds =
                colorState.colorTemperatureMireds;
            }
          }
        } catch {
          /* not available */
        }
      });
    } catch (err) {
      this.logger.warn(
        `Could not read state for node ${clientNode.id ?? 'unknown'}: ${err}`,
      );
    }

    return buildDeviceState(attrs);
  }

  /**
   * Get a ClientNode by its node ID (from the ServerNode's peers).
   * Returns undefined if not currently connected.
   */
  getClientNode(nodeId: string): any | undefined {
    if (!this.controllerService.isInitialized()) return undefined;

    try {
      const serverNode = this.controllerService.getServerNode();
      return (serverNode.peers as any).get(nodeId);
    } catch {
      return undefined;
    }
  }
}
