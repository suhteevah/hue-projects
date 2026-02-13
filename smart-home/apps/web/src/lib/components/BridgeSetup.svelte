<script lang="ts">
  import { discoverBridges, getBridges, pairBridge } from '$lib/api/bridges';
  import type { DiscoveredBridge, Bridge } from '$lib/api/bridges';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';

  let step = $state<'idle' | 'discovering' | 'select' | 'pairing' | 'success'>('idle');
  let discovered = $state<DiscoveredBridge[]>([]);
  let pairedBridges = $state<Bridge[]>([]);
  let pairError = $state('');

  // Set of already-paired bridge IPs so we can filter the discovery list
  const pairedIps = $derived(new Set(pairedBridges.map((b) => b.ipAddress)));

  // Discovered bridges that aren't already paired
  const unpaired = $derived(discovered.filter((d) => !pairedIps.has(d.ipAddress)));

  async function loadBridges() {
    try {
      pairedBridges = await getBridges();
    } catch {
      // ignore — no bridges yet
    }
  }

  async function startDiscovery() {
    step = 'discovering';
    pairError = '';
    try {
      discovered = await discoverBridges();
      await loadBridges();
      step = 'select';
    } catch (err) {
      toast.error('Discovery failed');
      step = 'idle';
    }
  }

  async function pair(ipAddress: string) {
    step = 'pairing';
    pairError = '';
    try {
      await pairBridge(ipAddress);
      step = 'success';
      toast.success('Bridge paired successfully!');
      await loadBridges();
      // Sync devices from newly paired bridge
      await devices.sync();
    } catch (err) {
      pairError = err instanceof Error ? err.message : 'Pairing failed. Press the link button on the bridge and try again.';
      step = 'select';
    }
  }

  // Load existing bridges on mount
  loadBridges();
</script>

<div class="space-y-4">
  <h2 class="text-lg font-bold text-white">Hue Bridge Setup</h2>

  <!-- Existing paired bridges -->
  {#if pairedBridges.length > 0}
    <div class="space-y-2">
      <h3 class="text-sm font-medium text-surface-300">Paired Bridges</h3>
      {#each pairedBridges as bridge}
        <div class="flex items-center justify-between bg-surface-800 rounded-xl p-3 border border-surface-700">
          <div>
            <p class="text-sm font-medium text-white">{bridge.name || 'Hue Bridge'}</p>
            <p class="text-xs text-surface-400">{bridge.ipAddress}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded-full bg-device-on/15 text-device-on">
            Connected
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Discovery flow -->
  {#if step === 'idle'}
    <button
      onclick={startDiscovery}
      class="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold transition-colors"
    >
      Discover Bridges
    </button>

  {:else if step === 'discovering'}
    <div class="flex flex-col items-center gap-3 py-6">
      <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      <p class="text-sm text-surface-400">Searching for Hue bridges on your network...</p>
    </div>

  {:else if step === 'select'}
    {#if pairError}
      <div class="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm px-4 py-3 rounded-xl">
        {pairError}
      </div>
    {/if}

    {#if unpaired.length === 0}
      <div class="text-center py-6">
        {#if discovered.length === 0}
          <p class="text-surface-400 text-sm">No bridges found on your network.</p>
        {:else}
          <p class="text-surface-400 text-sm">All discovered bridges are already paired.</p>
        {/if}
        <button onclick={startDiscovery} class="text-accent text-sm mt-2 hover:underline">Scan again</button>
      </div>
    {:else}
      <div class="space-y-2">
        <p class="text-sm text-surface-300">
          Press the <strong class="text-white">link button</strong> on your bridge, then tap pair:
        </p>
        {#each unpaired as bridge}
          <button
            onclick={() => pair(bridge.ipAddress)}
            class="w-full flex items-center justify-between bg-surface-800 rounded-xl p-3 border border-surface-700 hover:border-accent/50 transition-colors"
          >
            <div class="text-left">
              <p class="text-sm font-medium text-white">{bridge.name || 'Hue Bridge'}</p>
              <p class="text-xs text-surface-400">{bridge.ipAddress}</p>
            </div>
            <span class="text-xs text-accent font-medium">Pair</span>
          </button>
        {/each}
      </div>
    {/if}

  {:else if step === 'pairing'}
    <div class="flex flex-col items-center gap-3 py-6">
      <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      <p class="text-sm text-surface-400">Pairing with bridge...</p>
    </div>

  {:else if step === 'success'}
    <div class="flex flex-col items-center gap-3 py-6 text-center">
      <div class="w-12 h-12 rounded-full bg-device-on/15 flex items-center justify-center">
        <svg class="w-6 h-6 text-device-on" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-white font-medium">Bridge paired successfully!</p>
      <p class="text-sm text-surface-400">Your devices have been synced.</p>
      <button
        onclick={startDiscovery}
        class="text-accent text-sm mt-2 hover:underline"
      >
        Add another bridge
      </button>
    </div>
  {/if}
</div>
