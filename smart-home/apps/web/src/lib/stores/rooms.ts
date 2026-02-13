import { derived } from 'svelte/store';
import { devicesByRoom } from './devices';
import type { UnifiedDevice } from '@smart-home/shared-types';

export interface RoomView {
  name: string;
  devices: UnifiedDevice[];
  onCount: number;
  totalCount: number;
  hasLights: boolean;
}

export const rooms = derived(devicesByRoom, ($byRoom) => {
  const list: RoomView[] = [];
  for (const [name, roomDevices] of $byRoom) {
    const onCount = roomDevices.filter((d) => d.state?.on).length;
    const hasLights = roomDevices.some((d) => d.type === 'light');
    list.push({
      name,
      devices: roomDevices,
      onCount,
      totalCount: roomDevices.length,
      hasLights
    });
  }
  // Sort rooms by name, but "Unassigned" goes last
  list.sort((a, b) => {
    if (a.name === 'Unassigned') return 1;
    if (b.name === 'Unassigned') return -1;
    return a.name.localeCompare(b.name);
  });
  return list;
});
