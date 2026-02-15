<script lang="ts">
  import {
    getSmartHomeStatus,
    commissionMatterDevice,
    decommissionMatterDevice,
  } from '$lib/api/matter';
  import type { SmartHomeStatus, BridgeStatus, MatterNode } from '$lib/api/matter';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';

  let status = $state<SmartHomeStatus | null>(null);
  let step = $state<'idle' | 'input' | 'commissioning' | 'success'>('idle');
  let pairingCode = $state('');
  let commissionError = $state('');
  let removingId = $state<string | null>(null);
  let loading = $state(true);

  async function loadStatus() {
    loading = true;
    try {
      status = await getSmartHomeStatus();
    } catch {
      status = null;
    } finally {
      loading = false;
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
      await loadStatus();
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
      await loadStatus();
      await devices.sync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove device');
    } finally {
      removingId = null;
    }
  }

  function timeSince(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // Load on mount
  loadStatus();
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-bold text-white">Connected Devices</h2>
    {#if status?.totals}
      <span class="text-xs text-surface-400 tabular-nums">
        {status.totals.totalDevices} device{status.totals.totalDevices !== 1 ? 's' : ''}
      </span>
    {/if}
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-6">
      <div class="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
    </div>

  {:else}
    <!-- Paired Hue Bridges -->
    {#if status?.bridges && status.bridges.length > 0}
      <div class="space-y-2">
        <h3 class="text-xs font-medium text-surface-400 uppercase tracking-wider">Hue Bridges</h3>
        {#each status.bridges as bridge}
          <div class="bg-surface-900/50 rounded-xl p-3 border border-surface-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-white truncate">{bridge.name}</p>
                  <p class="text-xs text-surface-500">{bridge.ipAddress}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-3 shrink-0">
                <span class="text-xs text-surface-400 tabular-nums">
                  {bridge.deviceCount} light{bridge.deviceCount !== 1 ? 's' : ''}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-device-on/15 text-device-on">
                  Paired
                </span>
              </div>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-surface-500">
              {#if bridge.modelId}
                <span>{bridge.modelId}</span>
                <span class="text-surface-700">&middot;</span>
              {/if}
              {#if bridge.apiVersion}
                <span>API v{bridge.apiVersion}</span>
                <span class="text-surface-700">&middot;</span>
              {/if}
              <span>Seen {timeSince(bridge.lastSeen)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Matter Nodes -->
    {#if status?.matterNodes && status.matterNodes.length > 0}
      <div class="space-y-2">
        <h3 class="text-xs font-medium text-surface-400 uppercase tracking-wider">Matter Devices</h3>
        {#each status.matterNodes as node}
          <div class="bg-surface-900/50 rounded-xl p-3 border border-surface-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-white truncate">{node.name}</p>
                  <p class="text-xs text-surface-500">{node.nodeId.slice(0, 12)}&hellip;</p>
                </div>
              </div>
              <div class="flex items-center gap-2 ml-3 shrink-0">
                <span class="text-xs px-2 py-0.5 rounded-full bg-device-on/15 text-device-on">
                  Paired
                </span>
                <button
                  onclick={() => removeNode(node.id)}
                  disabled={removingId === node.id}
                  class="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  aria-label="Remove device {node.name}"
                >
                  {removingId === node.id ? '...' : 'Remove'}
                </button>
              </div>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-surface-500">
              <span>Type {node.deviceType}</span>
              <span class="text-surface-700">&middot;</span>
              <span>Seen {timeSince(node.lastSeen)}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Empty state -->
    {#if !status?.bridges?.length && !status?.matterNodes?.length}
      <div class="text-center py-4">
        <p class="text-sm text-surface-400">No bridges or devices connected yet.</p>
        <p class="text-xs text-surface-500 mt-1">Pair a Hue bridge above or add a Matter device below.</p>
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
  {/if}
</div>
