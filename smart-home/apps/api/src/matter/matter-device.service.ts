import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatterNodeService } from './matter-node.service';
import {
  brightnessToMatterLevel,
  deviceXyToMatterXy,
} from './matter-state-mapper';
import {
  getOnOffBehavior,
  getLevelControlBehavior,
  getColorControlBehavior,
} from './matter-behaviors';
import type { DeviceState } from '@smart-home/shared-types';

/**
 * Handles Matter device state control via cluster commands.
 * Analog of HueLightService for the Matter protocol.
 */
@Injectable()
export class MatterDeviceService {
  private readonly logger = new Logger(MatterDeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matterNodeService: MatterNodeService,
  ) {}

  /**
   * Set device state by sending Matter cluster commands.
   * @param nodeId The Matter node ID (externalId in Device table)
   * @param state Partial device state to apply
   */
  async setState(nodeId: string, state: Partial<DeviceState>): Promise<void> {
    const clientNode = this.matterNodeService.getClientNode(nodeId);
    if (!clientNode) {
      throw new NotFoundException(
        `Matter node ${nodeId} is not currently connected`,
      );
    }

    this.logger.debug(
      `Setting state for Matter node ${nodeId}: ${JSON.stringify(state)}`,
    );

    const OnOffBehavior = getOnOffBehavior();
    const LevelControlBehavior = getLevelControlBehavior();
    const ColorControlBehavior = getColorControlBehavior();

    await (clientNode as any).act('setState', async (agent: any) => {
      // Handle On/Off
      if (state.on !== undefined) {
        try {
          if (agent.has(OnOffBehavior)) {
            const onOff = agent.get(OnOffBehavior);
            if (state.on) {
              await onOff.on();
            } else {
              await onOff.off();
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to set on/off for ${nodeId}: ${err}`);
        }
      }

      // Handle Brightness (LevelControl)
      if (state.brightness !== undefined) {
        try {
          if (agent.has(LevelControlBehavior)) {
            const level = agent.get(LevelControlBehavior);
            await level.moveToLevelWithOnOff({
              level: brightnessToMatterLevel(state.brightness),
              transitionTime: 3, // 0.3 seconds (1/10th second units)
              optionsMask: {},
              optionsOverride: {},
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to set brightness for ${nodeId}: ${err}`);
        }
      }

      // Handle Color (ColorControl XY)
      if (state.color !== undefined) {
        try {
          if (agent.has(ColorControlBehavior)) {
            const color = agent.get(ColorControlBehavior);
            const matterXy = deviceXyToMatterXy(state.color.x, state.color.y);
            await color.moveToColor({
              colorX: matterXy.x,
              colorY: matterXy.y,
              transitionTime: 3,
              optionsMask: 0,
              optionsOverride: 0,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to set color for ${nodeId}: ${err}`);
        }
      }

      // Handle Color Temperature
      if (state.colorTemperature !== undefined) {
        try {
          if (agent.has(ColorControlBehavior)) {
            const color = agent.get(ColorControlBehavior);
            await color.moveToColorTemperature({
              colorTemperatureMireds: Math.round(state.colorTemperature),
              transitionTime: 3,
              optionsMask: 0,
              optionsOverride: 0,
            });
          }
        } catch (err) {
          this.logger.warn(
            `Failed to set color temperature for ${nodeId}: ${err}`,
          );
        }
      }
    });
  }

  /**
   * Get current device state by reading Matter cluster attributes.
   * @param nodeId The Matter node ID
   */
  async getState(nodeId: string): Promise<DeviceState> {
    const clientNode = this.matterNodeService.getClientNode(nodeId);
    if (!clientNode) {
      // Fall back to cached state from DB
      const device = await this.prisma.device.findUnique({
        where: { externalId: nodeId },
      });
      if (device) {
        return JSON.parse(device.lastState);
      }
      throw new NotFoundException(`Matter node ${nodeId} not found`);
    }

    return this.matterNodeService.readCurrentState(clientNode as any);
  }
}
