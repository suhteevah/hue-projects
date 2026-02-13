import type { DeviceState } from './device';

export interface SceneAction {
  deviceId: string;
  state: DeviceState;
  order: number;
}

export interface SceneDefinition {
  id: string;
  name: string;
  icon?: string;
  roomId?: string;
  roomName?: string;
  externalId?: string;
  source: 'hue' | 'local';
  actions: SceneAction[];
}

export interface CreateSceneDto {
  name: string;
  icon?: string;
  roomId?: string;
  actions: Omit<SceneAction, 'order'>[];
}
