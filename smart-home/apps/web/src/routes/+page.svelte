<script lang="ts">
  import { rooms } from '$lib/stores/rooms';
  import { deviceList, devicesLoading } from '$lib/stores/devices';
  import { sseConnected } from '$lib/stores/sse';
  import RoomCard from '$lib/components/RoomCard.svelte';
</script>

<div class="p-4 sm:p-6 max-w-5xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-white">Dashboard</h1>
      <p class="text-sm text-surface-400 mt-0.5">
        {$deviceList.length} device{$deviceList.length !== 1 ? 's' : ''}
        · {$deviceList.filter(d => d.state?.on).length} on
      </p>
    </div>
    <div class="flex items-center gap-2">
      <span
        class="w-2 h-2 rounded-full {$sseConnected ? 'bg-device-on animate-pulse' : 'bg-device-off'}"
      ></span>
      <span class="text-xs text-surface-400 sm:hidden">
        {$sseConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  </div>

  {#if $devicesLoading}
    <div class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
    </div>
  {:else if $deviceList.length === 0}
    <!-- Empty state -->
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-white mb-1">No devices yet</h2>
      <p class="text-sm text-surface-400 max-w-xs">
        Pair a Hue bridge in <a href="/settings" class="text-accent hover:underline">Settings</a> to get started.
      </p>
    </div>
  {:else}
    <!-- Room cards -->
    <section>
      <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Rooms</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each $rooms as room (room.name)}
          <RoomCard {room} />
        {/each}
      </div>
    </section>
  {/if}
</div>
