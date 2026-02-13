import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { HueBridgeService } from './hue-bridge.service';
import type { SSEEvent } from '@smart-home/shared-types';
import { EventSource } from 'eventsource';

@Injectable()
export class HueEventService implements OnModuleDestroy {
  private readonly logger = new Logger(HueEventService.name);
  private readonly eventSubject = new Subject<SSEEvent>();
  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  constructor(private readonly bridgeService: HueBridgeService) {}

  get events$(): Observable<SSEEvent> {
    return this.eventSubject.asObservable();
  }

  async connect() {
    try {
      const connection = await this.bridgeService.getConnection();
      const url = `https://${connection.ipAddress}/eventstream/clip/v2`;

      this.logger.log(`Connecting to Hue SSE at ${url}`);

      // eventsource v3 uses fetch options
      const es = new EventSource(url, {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...Object.fromEntries(
                (init?.headers as any)?.entries?.() ?? [],
              ),
              'hue-application-key': connection.applicationKey,
            },
            dispatcher: new (require('undici').Agent)({
              connect: { rejectUnauthorized: false },
            }),
          }),
      });

      this.eventSource = es;

      es.onopen = () => {
        this.logger.log('Connected to Hue bridge event stream');
        this.reconnectAttempts = 0;
        this.eventSubject.next({
          type: 'bridge_connected',
          timestamp: new Date().toISOString(),
          data: {},
        });
      };

      es.onmessage = (event) => {
        try {
          const updates = JSON.parse(event.data);
          for (const update of updates) {
            this.processHueEvent(update);
          }
        } catch (err) {
          this.logger.warn(`Failed to parse SSE event: ${err}`);
        }
      };

      es.onerror = (err) => {
        this.logger.warn(`SSE connection error: ${(err as any)?.message || err}`);
        this.scheduleReconnect();
      };
    } catch (err) {
      this.logger.warn(`Could not connect to bridge events: ${err}`);
      this.scheduleReconnect();
    }
  }

  private processHueEvent(update: any) {
    if (!update.data || !Array.isArray(update.data)) return;

    for (const item of update.data) {
      const deviceId = item.id;
      const type = update.type; // 'update', 'add', 'delete'

      if (type === 'update') {
        const state: Record<string, any> = {};
        if (item.on !== undefined) state.on = item.on.on;
        if (item.dimming !== undefined)
          state.brightness = item.dimming.brightness;
        if (item.color !== undefined) state.color = item.color.xy;
        if (item.color_temperature?.mirek !== undefined) {
          state.colorTemperature = item.color_temperature.mirek;
        }
        if (item.motion !== undefined) state.motion = item.motion.motion;
        if (item.temperature !== undefined) {
          state.temperature = item.temperature.temperature;
        }
        if (item.light !== undefined) {
          state.lightLevel = item.light.light_level;
        }

        this.eventSubject.next({
          type: 'device_state_changed',
          timestamp: new Date().toISOString(),
          deviceId,
          data: state,
        });
      } else if (type === 'add') {
        this.eventSubject.next({
          type: 'device_added',
          timestamp: new Date().toISOString(),
          deviceId,
          data: item,
        });
      } else if (type === 'delete') {
        this.eventSubject.next({
          type: 'device_removed',
          timestamp: new Date().toISOString(),
          deviceId,
          data: {},
        });
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      30000,
    );
    this.reconnectAttempts++;

    this.logger.log(`Reconnecting to Hue SSE in ${delay}ms...`);

    this.eventSubject.next({
      type: 'bridge_disconnected',
      timestamp: new Date().toISOString(),
      data: {},
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.disconnect();
      await this.connect();
    }, delay);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  onModuleDestroy() {
    this.disconnect();
    this.eventSubject.complete();
  }
}
