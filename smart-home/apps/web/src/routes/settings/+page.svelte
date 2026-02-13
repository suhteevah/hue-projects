<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth, currentUser } from '$lib/stores/auth';
  import { devices } from '$lib/stores/devices';
  import { sse } from '$lib/stores/sse';
  import { toast } from '$lib/stores/toast';
  import BridgeSetup from '$lib/components/BridgeSetup.svelte';
  import MatterSetup from '$lib/components/MatterSetup.svelte';

  let syncing = $state(false);

  function handleLogout() {
    sse.disconnect();
    auth.logout();
    goto('/login');
  }

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

<div class="p-4 sm:p-6 max-w-lg mx-auto space-y-6">
  <h1 class="text-2xl font-bold text-white">Settings</h1>

  <!-- Account -->
  <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
    <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Account</h2>
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-white">{$currentUser?.username ?? '—'}</p>
        <p class="text-xs text-surface-400">{$currentUser?.role ?? ''}</p>
      </div>
      <button
        onclick={handleLogout}
        class="px-3 py-2 rounded-lg text-sm text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors"
      >
        Sign Out
      </button>
    </div>
  </section>

  <!-- Bridge Setup -->
  <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
    <BridgeSetup />
  </section>

  <!-- Matter Setup -->
  <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
    <MatterSetup />
  </section>

  <!-- Device Sync -->
  <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
    <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Devices</h2>
    <button
      onclick={handleSync}
      disabled={syncing}
      class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-700 text-white
        font-medium hover:bg-surface-600 transition-colors disabled:opacity-50"
    >
      <svg class="w-5 h-5 {syncing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {syncing ? 'Syncing...' : 'Sync All Devices'}
    </button>
    <p class="text-xs text-surface-500 mt-2 text-center">
      Re-fetch all devices from connected bridges
    </p>
  </section>

  <!-- About -->
  <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
    <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">About</h2>
    <p class="text-xs text-surface-500">Smart Home Control v0.1.0</p>
  </section>
</div>
