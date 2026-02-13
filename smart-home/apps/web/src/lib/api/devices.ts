import { api } from './client';
import type { UnifiedDevice, DeviceState } from '@smart-home/shared-types';

export function getDevices() {
  return api.get<UnifiedDevice[]>('/devices');
}

export function getDevice(id: string) {
  return api.get<UnifiedDevice>(`/devices/${id}`);
}

export function setDeviceState(id: string, state: Partial<DeviceState>) {
  return api.put<UnifiedDevice>(`/devices/${id}/state`, state);
}

export function syncDevices() {
  return api.post<{ synced: number }>('/devices/sync');
}
