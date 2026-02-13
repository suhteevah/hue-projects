<script lang="ts">
  import { deviceList, devices, devicesLoading } from '$lib/stores/devices';
  import DeviceCard from '$lib/components/DeviceCard.svelte';
  import { toast } from '$lib/stores/toast';

  let filter = $state<'all' | 'lights' | 'on'>('all');

  const filteredDevices = $derived(
    $deviceList.filter((d) => {
      if (filter === 'lights') return d.type === 'light';
      if (filter === 'on') return d.state?.on;
      return true;
    })
  );

  let syncing = $state(false);

  async function handleSync() {
    syncing = true;
    try {
      await devices.sync();
      toast.success('Devices synced');
    } catch {
      toast.error('Sync failed');
    } finally {
      syncing = false;
    }
  }
</script>

<div class="p-4 sm:p-6 max-w-5xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-white">Devices</h1>
    <button
      onclick={handleSync}
      disabled={syncing}
      class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700
        text-sm text-surface-300 hover:bg-surface-700 transition-colors disabled:opacity-50"
    >
      <svg class="w-4 h-4 {syncing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Sync
    </button>
  </div>

  <!-- Filters -->
  <div class="flex gap-2 mb-4">
    {#each [['all', 'All'], ['lights', 'Lights'], ['on', 'On']] as [value, label]}
      <button
        onclick={() => filter = value as typeof filter}
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          {filter === value
            ? 'bg-accent/15 text-accent-light border border-accent/30'
            : 'bg-surface-800 text-surface-400 border border-surface-700 hover:text-surface-200'}"
      >
        {label}
      </button>
    {/each}
  </div>

  {#if $devicesLoading}
    <div class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
    </div>
  {:else if filteredDevices.length === 0}
    <div class="text-center py-20">
      <p class="text-surface-400 text-sm">
        {filter === 'all' ? 'No devices found. Pair a bridge to get started.' : 'No matching devices.'}
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each filteredDevices as device (device.id)}
        <DeviceCard {device} />
      {/each}
    </div>
  {/if}
</div>
