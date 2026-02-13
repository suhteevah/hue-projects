export type DeviceSource = 'hue' | 'matter';

export type DeviceType =
  | 'light'
  | 'plug'
  | 'sensor'
  | 'switch'
  | 'thermostat'
  | 'contact_sensor';

export interface XYColor {
  x: number;
  y: number;
}

export interface LightCapabilities {
  supportsBrightness: boolean;
  supportsColor: boolean;
  supportsColorTemperature: boolean;
  minMirek?: number;
  maxMirek?: number;
}

export interface DeviceState {
  on?: boolean;
  brightness?: number; // 0-100
  color?: XYColor;
  colorTemperature?: number; // mirek
  reachable?: boolean;
}

export interface UnifiedDevice {
  id: string;
  externalId: string;
  name: string;
  type: DeviceType;
  source: DeviceSource;
  roomId?: string;
  roomName?: string;
  capabilities: LightCapabilities;
  state: DeviceState;
  online: boolean;
}
