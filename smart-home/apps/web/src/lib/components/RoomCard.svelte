<script lang="ts">
  import type { RoomView } from '$lib/stores/rooms';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';

  let { room }: { room: RoomView } = $props();

  const allOn = $derived(room.onCount === room.totalCount && room.totalCount > 0);
  const someOn = $derived(room.onCount > 0 && !allOn);

  async function toggleAll() {
    const targetState = !allOn;
    try {
      const promises = room.devices
        .filter((d) => d.type === 'light')
        .map((d) => devices.setState(d.id, { on: targetState }));
      await Promise.allSettled(promises);
    } catch {
      toast.error(`Failed to toggle ${room.name}`);
    }
  }
</script>

<div class="bg-surface-800 rounded-2xl p-5 border border-surface-700 hover:border-surface-600 transition-all">
  <div class="flex items-start justify-between mb-3">
    <a href="/rooms/{encodeURIComponent(room.name)}" class="flex-1 min-w-0">
      <h3 class="text-base font-semibold text-white truncate">{room.name}</h3>
      <p class="text-xs text-surface-400 mt-0.5">
        {room.totalCount} device{room.totalCount !== 1 ? 's' : ''}
      </p>
    </a>

    {#if room.hasLights}
      <button
        onclick={toggleAll}
        class="shrink-0 w-12 h-7 rounded-full transition-colors relative
          {allOn ? 'bg-accent' : someOn ? 'bg-accent/50' : 'bg-surface-600'}"
        aria-label="Toggle all lights in {room.name}"
      >
        <span
          class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform
            {allOn || someOn ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
        ></span>
      </button>
    {/if}
  </div>

  <!-- Device status badges -->
  <div class="flex items-center gap-2">
    <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
      {room.onCount > 0 ? 'bg-device-on/15 text-device-on' : 'bg-surface-700 text-surface-400'}">
      <span class="w-1.5 h-1.5 rounded-full {room.onCount > 0 ? 'bg-device-on' : 'bg-surface-500'}"></span>
      {room.onCount}/{room.totalCount} on
    </span>
  </div>
</div>
