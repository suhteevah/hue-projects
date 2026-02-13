export type SensorType = 'motion' | 'temperature' | 'light_level' | 'humidity';

export interface SensorReading {
  id: string;
  deviceId: string;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: string;
}

export interface SensorHistoryQuery {
  from: string; // ISO date
  to: string;   // ISO date
  resolution?: 'raw' | '5m' | '15m' | '1h';
}
