<script lang="ts">
  import { rooms } from '$lib/stores/rooms';
  import { devicesLoading } from '$lib/stores/devices';
  import RoomCard from '$lib/components/RoomCard.svelte';
</script>

<div class="p-4 sm:p-6 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold text-white mb-6">Rooms</h1>

  {#if $devicesLoading}
    <div class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
    </div>
  {:else if $rooms.length === 0}
    <div class="text-center py-20">
      <p class="text-surface-400 text-sm">No rooms found. Devices will appear here after you pair a bridge.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each $rooms as room (room.name)}
        <RoomCard {room} />
      {/each}
    </div>
  {/if}
</div>
