<script lang="ts">
  import { page } from '$app/state';
  import { rooms } from '$lib/stores/rooms';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';
  import DeviceCard from '$lib/components/DeviceCard.svelte';

  const roomName = $derived(decodeURIComponent(page.params.id ?? ''));
  const room = $derived($rooms.find((r) => r.name === roomName));

  async function toggleAll() {
    if (!room) return;
    const allOn = room.onCount === room.totalCount;
    try {
      const promises = room.devices
        .filter((d) => d.type === 'light')
        .map((d) => devices.setState(d.id, { on: !allOn }));
      await Promise.allSettled(promises);
    } catch {
      toast.error('Failed to toggle room');
    }
  }

  async function setBrightnessAll(brightness: number) {
    if (!room) return;
    try {
      const promises = room.devices
        .filter((d) => d.type === 'light' && d.state?.on)
        .map((d) => devices.setState(d.id, { brightness }));
      await Promise.allSettled(promises);
    } catch {
      toast.error('Failed to set brightness');
    }
  }
</script>

<div class="p-4 sm:p-6 max-w-5xl mx-auto">
  <a href="/rooms" class="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors mb-4">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Rooms
  </a>

  {#if !room}
    <div class="text-center py-20">
      <p class="text-surface-400">Room not found</p>
    </div>
  {:else}
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">{room.name}</h1>
        <p class="text-sm text-surface-400">{room.onCount}/{room.totalCount} on</p>
      </div>
      {#if room.hasLights}
        <button
          onclick={toggleAll}
          class="px-4 py-2 rounded-xl text-sm font-medium transition-colors
            {room.onCount > 0
              ? 'bg-surface-700 text-white hover:bg-surface-600'
              : 'bg-accent text-white hover:bg-accent-dark'}"
        >
          {room.onCount > 0 ? 'All Off' : 'All On'}
        </button>
      {/if}
    </div>

    <!-- Quick brightness presets (only if some lights on) -->
    {#if room.hasLights && room.onCount > 0}
      <div class="flex gap-2 mb-4">
        {#each [25, 50, 75, 100] as level}
          <button
            onclick={() => setBrightnessAll(level)}
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700
              text-surface-300 hover:bg-surface-700 transition-colors"
          >
            {level}%
          </button>
        {/each}
      </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {#each room.devices as device (device.id)}
        <DeviceCard {device} />
      {/each}
    </div>
  {/if}
</div>
