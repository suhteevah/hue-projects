<script lang="ts">
  import { getMatterNodes, commissionMatterDevice, decommissionMatterDevice } from '$lib/api/matter';
  import type { MatterNode } from '$lib/api/matter';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';

  let step = $state<'idle' | 'input' | 'commissioning' | 'success'>('idle');
  let nodes = $state<MatterNode[]>([]);
  let pairingCode = $state('');
  let commissionError = $state('');
  let removingId = $state<string | null>(null);

  async function loadNodes() {
    try {
      nodes = await getMatterNodes();
    } catch {
      // ignore — no nodes yet
    }
  }

  function startCommission() {
    step = 'input';
    pairingCode = '';
    commissionError = '';
  }

  async function submitCommission() {
    const code = pairingCode.trim();
    if (!code) {
      commissionError = 'Please enter a pairing code.';
      return;
    }

    step = 'commissioning';
    commissionError = '';

    try {
      await commissionMatterDevice(code);
      step = 'success';
      toast.success('Matter device commissioned successfully!');
      await loadNodes();
      // Sync devices from newly commissioned device
      await devices.sync();
    } catch (err) {
      commissionError = err instanceof Error
        ? err.message
        : 'Commissioning failed. Ensure the device is in pairing mode.';
      step = 'input';
    }
  }

  async function removeNode(id: string) {
    removingId = id;
    try {
      await decommissionMatterDevice(id);
      toast.success('Device removed');
      await loadNodes();
      await devices.sync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove device');
    } finally {
      removingId = null;
    }
  }

  // Load existing nodes on mount
  loadNodes();
</script>

<div class="space-y-4">
  <h2 class="text-lg font-bold text-white">Matter Devices</h2>

  <!-- Existing commissioned nodes -->
  {#if nodes.length > 0}
    <div class="space-y-2">
      <h3 class="text-sm font-medium text-surface-300">Commissioned Devices</h3>
      {#each nodes as node}
        <div class="flex items-center justify-between bg-surface-800 rounded-xl p-3 border border-surface-700">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-white truncate">{node.name}</p>
            <p class="text-xs text-surface-400">
              {node.deviceType} &middot; {node.nodeId.slice(0, 12)}
            </p>
          </div>
          <div class="flex items-center gap-2 ml-3">
            <span class="text-xs px-2 py-1 rounded-full bg-device-on/15 text-device-on shrink-0">
              Paired
            </span>
            <button
              onclick={() => removeNode(node.id)}
              disabled={removingId === node.id}
              class="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              aria-label="Remove device"
            >
              {removingId === node.id ? '...' : 'Remove'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Commissioning flow -->
  {#if step === 'idle'}
    <button
      onclick={startCommission}
      class="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold transition-colors"
    >
      Add Matter Device
    </button>

  {:else if step === 'input'}
    <div class="space-y-3">
      {#if commissionError}
        <div class="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm px-4 py-3 rounded-xl">
          {commissionError}
        </div>
      {/if}

      <div>
        <label for="pairing-code" class="block text-sm font-medium text-surface-300 mb-2">
          Enter the device's pairing code
        </label>
        <p class="text-xs text-surface-500 mb-3">
          This is the 11 or 21-digit manual code, or the QR code payload starting with <code class="text-surface-400">MT:</code>
        </p>
        <input
          id="pairing-code"
          type="text"
          bind:value={pairingCode}
          placeholder="e.g. 34970112332 or MT:Y.K90..."
          class="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-xl text-white
            placeholder:text-surface-500 focus:outline-none focus:border-accent/50 font-mono text-sm"
          onkeydown={(e) => e.key === 'Enter' && submitCommission()}
        />
      </div>

      <div class="flex gap-3">
        <button
          onclick={() => { step = 'idle'; }}
          class="flex-1 py-3 rounded-xl bg-surface-700 text-surface-300 font-medium hover:bg-surface-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={submitCommission}
          disabled={!pairingCode.trim()}
          class="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Commission
        </button>
      </div>
    </div>

  {:else if step === 'commissioning'}
    <div class="flex flex-col items-center gap-3 py-6">
      <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      <p class="text-sm text-surface-400">Commissioning device...</p>
      <p class="text-xs text-surface-500">This may take up to 60 seconds</p>
    </div>

  {:else if step === 'success'}
    <div class="flex flex-col items-center gap-3 py-6 text-center">
      <div class="w-12 h-12 rounded-full bg-device-on/15 flex items-center justify-center">
        <svg class="w-6 h-6 text-device-on" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-white font-medium">Device commissioned successfully!</p>
      <p class="text-sm text-surface-400">Your devices have been synced.</p>
      <button
        onclick={startCommission}
        class="text-accent text-sm mt-2 hover:underline"
      >
        Add another device
      </button>
    </div>
  {/if}
</div>
