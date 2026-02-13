import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { MatterControllerService } from './matter-controller.service';
import {
  matterLevelToBrightness,
  matterXyToDeviceXy,
} from './matter-state-mapper';
import {
  getOnOffBehavior,
  getLevelControlBehavior,
  getColorControlBehavior,
} from './matter-behaviors';
import type { SSEEvent } from '@smart-home/shared-types';

/**
 * Subscribes to Matter device attribute changes and emits them as SSE events.
 * Analog of HueEventService for the Matter protocol.
 */
@Injectable()
export class MatterEventService implements OnModuleDestroy {
  private readonly logger = new Logger(MatterEventService.name);
  private readonly eventSubject = new Subject<SSEEvent>();
  private subscribed = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly controllerService: MatterControllerService,
  ) {}

  get events$(): Observable<SSEEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * Subscribe to attribute changes on all commissioned Matter nodes.
   * This should be called once on startup (after the controller is initialized).
   */
  async subscribeAll(): Promise<void> {
    if (this.subscribed) return;
    if (!this.controllerService.isInitialized()) {
      this.logger.debug(
        'Matter controller not initialized, skipping subscriptions',
      );
      return;
    }

    this.subscribed = true;

    try {
      const serverNode = this.controllerService.getServerNode();

      // Iterate all known peers and subscribe to each
      // Use Array.from() to safely iterate the EndpointContainer
      const peers = Array.from(serverNode.peers as any);
      for (const clientNode of peers) {
        await this.subscribeNode(clientNode);
      }

      this.logger.log('Subscribed to all Matter node events');
    } catch (err) {
      this.logger.warn(`Failed to subscribe to Matter events: ${err}`);
      this.subscribed = false;
    }
  }

  /**
   * Subscribe to attribute changes on a specific Matter node.
   */
  async subscribeNode(clientNode: any): Promise<void> {
    const nodeId = String(clientNode.id ?? clientNode.identity ?? 'unknown');
    this.logger.debug(`Subscribing to events for Matter node: ${nodeId}`);

    const OnOffBehavior = getOnOffBehavior();
    const LevelControlBehavior = getLevelControlBehavior();
    const ColorControlBehavior = getColorControlBehavior();

    try {
      await clientNode.act('subscribe', async (agent: any) => {
        // Subscribe to OnOff changes
        try {
          if (agent.has(OnOffBehavior)) {
            const onOff = agent.get(OnOffBehavior);
            onOff.events.onOff$Changed.on((newValue: boolean) => {
              this.emitStateChange(nodeId, { on: newValue });
              this.updateCachedState(nodeId, { on: newValue });
            });
          }
        } catch {
          /* behavior not available */
        }

        // Subscribe to LevelControl changes
        try {
          if (agent.has(LevelControlBehavior)) {
            const level = agent.get(LevelControlBehavior);
            level.events.currentLevel$Changed.on(
              (newValue: number | null) => {
                if (newValue !== null) {
                  const brightness = matterLevelToBrightness(newValue);
                  this.emitStateChange(nodeId, { brightness });
                  this.updateCachedState(nodeId, { brightness });
                }
              },
            );
          }
        } catch {
          /* behavior not available */
        }

        // Subscribe to ColorControl changes
        try {
          if (agent.has(ColorControlBehavior)) {
            const color = agent.get(ColorControlBehavior);
            const colorEvents = color.events;

            // XY color changes
            if (colorEvents.currentX$Changed) {
              colorEvents.currentX$Changed.on((newX: number) => {
                const colorState = color.state;
                const xy = matterXyToDeviceXy(
                  newX,
                  colorState.currentY ?? 0,
                );
                this.emitStateChange(nodeId, { color: xy });
                this.updateCachedState(nodeId, { color: xy });
              });
            }

            // Color temperature changes
            if (colorEvents.colorTemperatureMireds$Changed) {
              colorEvents.colorTemperatureMireds$Changed.on(
                (newMireds: number) => {
                  this.emitStateChange(nodeId, {
                    colorTemperature: newMireds,
                  });
                  this.updateCachedState(nodeId, {
                    colorTemperature: newMireds,
                  });
                },
              );
            }
          }
        } catch {
          /* behavior not available */
        }
      });

      this.logger.debug(`Subscribed to events for Matter node: ${nodeId}`);
    } catch (err) {
      this.logger.warn(`Failed to subscribe to node ${nodeId}: ${err}`);
    }
  }

  /**
   * Emit a device state change as an SSE event.
   */
  private emitStateChange(nodeId: string, state: Record<string, any>): void {
    this.eventSubject.next({
      type: 'device_state_changed',
      timestamp: new Date().toISOString(),
      deviceId: nodeId,
      data: state,
    });
  }

  /**
   * Update the cached state in the database.
   */
  private async updateCachedState(
    nodeId: string,
    stateUpdate: Record<string, any>,
  ): Promise<void> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { externalId: nodeId },
      });
      if (device) {
        const currentState = JSON.parse(device.lastState);
        const newState = { ...currentState, ...stateUpdate };
        await this.prisma.device.update({
          where: { externalId: nodeId },
          data: {
            lastState: JSON.stringify(newState),
            updatedAt: new Date(),
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to update cached state for ${nodeId}: ${err}`);
    }
  }

  onModuleDestroy() {
    this.eventSubject.complete();
    this.subscribed = false;
  }
}
