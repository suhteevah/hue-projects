import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HueLightService } from '../hue/hue-light.service';
import { HueGroupService } from '../hue/hue-group.service';
import { HueBridgeService } from '../hue/hue-bridge.service';
import { HueEventService } from '../hue/hue-event.service';
import { MatterDeviceService } from '../matter/matter-device.service';
import { MatterEventService } from '../matter/matter-event.service';
import { MatterNodeService } from '../matter/matter-node.service';
import type { UnifiedDevice, DeviceState, LightCapabilities } from '@smart-home/shared-types';

@Injectable()
export class DeviceService implements OnModuleInit {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hueLightService: HueLightService,
    private readonly hueGroupService: HueGroupService,
    private readonly hueBridgeService: HueBridgeService,
    private readonly hueEventService: HueEventService,
    private readonly matterDeviceService: MatterDeviceService,
    private readonly matterEventService: MatterEventService,
    private readonly matterNodeService: MatterNodeService,
  ) {}

  async onModuleInit() {
    // Try to connect to Hue event stream if a bridge is paired
    try {
      await this.hueEventService.connect();
    } catch {
      this.logger.warn('No Hue bridge available for event stream');
    }

    // Try to subscribe to Matter event stream
    try {
      await this.matterEventService.subscribeAll();
    } catch {
      this.logger.warn('No Matter devices available for event stream');
    }

    // Sync devices on startup
    try {
      await this.syncDevices();
    } catch {
      this.logger.warn('Initial device sync skipped (no bridge paired)');
    }
  }

  async syncDevices(): Promise<void> {
    this.logger.log('Syncing devices from Hue bridge...');

    const connection = await this.hueBridgeService.getConnection();
    const lights = await this.hueLightService.getAllLights();

    // Also sync rooms
    const rooms = await this.hueGroupService.getAllRooms();
    for (const room of rooms) {
      await this.prisma.room.upsert({
        where: { name: room.metadata?.name ?? room.id },
        update: {},
        create: {
          name: room.metadata?.name ?? room.id,
          icon: room.metadata?.archetype,
        },
      });
    }

    for (const light of lights) {
      const capabilities: LightCapabilities = {
        supportsBrightness: !!light.dimming,
        supportsColor: !!light.color,
        supportsColorTemperature: !!light.color_temperature,
        minMirek: light.color_temperature?.mirek_schema?.mirek_minimum,
        maxMirek: light.color_temperature?.mirek_schema?.mirek_maximum,
      };

      const state: DeviceState = {
        on: light.on?.on,
        brightness: light.dimming?.brightness,
        color: light.color?.xy,
        colorTemperature: light.color_temperature?.mirek ?? undefined,
        reachable: light.status !== 'connectivity_issue',
      };

      // Find the room this light belongs to
      let roomName: string | undefined;
      for (const room of rooms) {
        const childIds = room.children?.map((c: any) => c.rid) ?? [];
        if (childIds.includes(light.owner?.rid)) {
          roomName = room.metadata?.name;
          break;
        }
      }

      const room = roomName
        ? await this.prisma.room.findUnique({ where: { name: roomName } })
        : null;

      await this.prisma.device.upsert({
        where: { externalId: light.id },
        update: {
          name: light.metadata?.name ?? 'Unknown Light',
          capabilities: JSON.stringify(capabilities),
          lastState: JSON.stringify(state),
          online: light.status !== 'connectivity_issue',
          roomId: room?.id ?? undefined,
          updatedAt: new Date(),
        },
        create: {
          externalId: light.id,
          name: light.metadata?.name ?? 'Unknown Light',
          type: 'light',
          source: 'hue',
          capabilities: JSON.stringify(capabilities),
          lastState: JSON.stringify(state),
          online: light.status !== 'connectivity_issue',
          roomId: room?.id ?? undefined,
        },
      });
    }

    this.logger.log(`Synced ${lights.length} lights`);
  }

  async getAll(): Promise<UnifiedDevice[]> {
    const devices = await this.prisma.device.findMany({
      include: { room: true },
      orderBy: [{ room: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    return devices.map((d) => ({
      id: d.id,
      externalId: d.externalId,
      name: d.name,
      type: d.type as any,
      source: d.source as any,
      roomId: d.roomId ?? undefined,
      roomName: d.room?.name,
      capabilities: JSON.parse(d.capabilities),
      state: JSON.parse(d.lastState),
      online: d.online,
    }));
  }

  async getById(id: string): Promise<UnifiedDevice> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }

    // Fetch live state from bridge for Hue devices
    let liveState: DeviceState = JSON.parse(device.lastState);
    if (device.source === 'hue') {
      try {
        const light = await this.hueLightService.getLight(device.externalId);
        liveState = {
          on: light.on?.on,
          brightness: light.dimming?.brightness,
          color: light.color?.xy,
          colorTemperature: light.color_temperature?.mirek ?? undefined,
          reachable: light.status !== 'connectivity_issue',
        };
        // Update cache
        await this.prisma.device.update({
          where: { id },
          data: { lastState: JSON.stringify(liveState) },
        });
      } catch {
        this.logger.warn(`Could not fetch live state for ${device.name}`);
      }
    } else if (device.source === 'matter') {
      try {
        liveState = await this.matterDeviceService.getState(device.externalId);
        await this.prisma.device.update({
          where: { id },
          data: { lastState: JSON.stringify(liveState) },
        });
      } catch {
        this.logger.warn(`Could not fetch live state for Matter device ${device.name}`);
      }
    }

    return {
      id: device.id,
      externalId: device.externalId,
      name: device.name,
      type: device.type as any,
      source: device.source as any,
      roomId: device.roomId ?? undefined,
      roomName: device.room?.name,
      capabilities: JSON.parse(device.capabilities),
      state: liveState,
      online: device.online,
    };
  }

  async setState(id: string, state: Partial<DeviceState>): Promise<void> {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }

    if (device.source === 'hue') {
      await this.setHueDeviceState(device.externalId, state);
    } else if (device.source === 'matter') {
      await this.matterDeviceService.setState(device.externalId, state);
    }

    // Update cached state
    const currentState = JSON.parse(device.lastState);
    const newState = { ...currentState, ...state };
    await this.prisma.device.update({
      where: { id },
      data: { lastState: JSON.stringify(newState) },
    });
  }

  private async setHueDeviceState(
    externalId: string,
    state: Partial<DeviceState>,
  ): Promise<void> {
    const hueState: Record<string, any> = {};

    if (state.on !== undefined) {
      hueState.on = { on: state.on };
    }
    if (state.brightness !== undefined) {
      hueState.dimming = {
        brightness: Math.max(0, Math.min(100, state.brightness)),
      };
    }
    if (state.color !== undefined) {
      hueState.color = { xy: state.color };
    }
    if (state.colorTemperature !== undefined) {
      hueState.color_temperature = {
        mirek: Math.max(153, Math.min(500, state.colorTemperature)),
      };
    }

    await this.hueLightService.setLightState(externalId, hueState);
  }
}
