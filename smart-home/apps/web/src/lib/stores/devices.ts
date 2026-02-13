import { writable, derived } from 'svelte/store';
import type { UnifiedDevice, DeviceState } from '@smart-home/shared-types';
import * as deviceApi from '$lib/api/devices';

interface DeviceStoreState {
  devices: Map<string, UnifiedDevice>;
  loading: boolean;
  error: string | null;
}

function createDeviceStore() {
  const { subscribe, set, update } = writable<DeviceStoreState>({
    devices: new Map(),
    loading: false,
    error: null
  });

  return {
    subscribe,

    async load() {
      update((s) => ({ ...s, loading: true, error: null }));
      try {
        const list = await deviceApi.getDevices();
        const map = new Map<string, UnifiedDevice>();
        for (const device of list) {
          map.set(device.id, device);
        }
        set({ devices: map, loading: false, error: null });
      } catch (err) {
        update((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load devices'
        }));
      }
    },

    async setState(id: string, state: Partial<DeviceState>) {
      // Optimistic update
      update((s) => {
        const device = s.devices.get(id);
        if (device) {
          const updated = {
            ...device,
            state: { ...device.state, ...state }
          };
          const newMap = new Map(s.devices);
          newMap.set(id, updated);
          return { ...s, devices: newMap };
        }
        return s;
      });

      try {
        const updated = await deviceApi.setDeviceState(id, state);
        // Apply server response
        update((s) => {
          const newMap = new Map(s.devices);
          newMap.set(id, updated);
          return { ...s, devices: newMap };
        });
      } catch (err) {
        // Revert on failure — reload from server
        const fresh = await deviceApi.getDevice(id).catch(() => null);
        if (fresh) {
          update((s) => {
            const newMap = new Map(s.devices);
            newMap.set(id, fresh);
            return { ...s, devices: newMap };
          });
        }
        throw err;
      }
    },

    async sync() {
      update((s) => ({ ...s, loading: true }));
      try {
        await deviceApi.syncDevices();
        // Reload all devices after sync
        const list = await deviceApi.getDevices();
        const map = new Map<string, UnifiedDevice>();
        for (const device of list) {
          map.set(device.id, device);
        }
        set({ devices: map, loading: false, error: null });
      } catch (err) {
        update((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Sync failed'
        }));
      }
    },

    applySSEUpdate(deviceExternalId: string, stateChanges: Record<string, unknown>) {
      update((s) => {
        // Find device by externalId
        for (const [id, device] of s.devices) {
          if (device.externalId === deviceExternalId) {
            const updated = {
              ...device,
              state: { ...device.state, ...stateChanges }
            };
            const newMap = new Map(s.devices);
            newMap.set(id, updated);
            return { ...s, devices: newMap };
          }
        }
        return s;
      });
    },

    getById(id: string): UnifiedDevice | undefined {
      let device: UnifiedDevice | undefined;
      const unsub = subscribe((s) => {
        device = s.devices.get(id);
      });
      unsub();
      return device;
    }
  };
}

export const devices = createDeviceStore();

export const deviceList = derived(devices, ($d) => Array.from($d.devices.values()));

export const lightDevices = derived(deviceList, ($list) =>
  $list.filter((d) => d.type === 'light')
);

export const devicesByRoom = derived(deviceList, ($list) => {
  const rooms = new Map<string, UnifiedDevice[]>();
  for (const device of $list) {
    const room = device.roomName || 'Unassigned';
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(device);
  }
  return rooms;
});

export const devicesLoading = derived(devices, ($d) => $d.loading);
