import type { DeviceState } from './device';

export type SSEEventType =
  | 'device_state_changed'
  | 'device_added'
  | 'device_removed'
  | 'scene_activated'
  | 'sensor_reading'
  | 'bridge_connected'
  | 'bridge_disconnected';

export interface SSEEvent {
  type: SSEEventType;
  timestamp: string;
  deviceId?: string;
  data: DeviceState | Record<string, unknown>;
}
