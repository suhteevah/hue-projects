import type { UnifiedDevice } from './device';

export interface Room {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  deviceCount: number;
}

export interface RoomWithDevices extends Room {
  devices: UnifiedDevice[];
}
