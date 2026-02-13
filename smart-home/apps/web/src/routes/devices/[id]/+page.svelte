<script lang="ts">
  import { page } from '$app/state';
  import { deviceList } from '$lib/stores/devices';
  import LightControl from '$lib/components/LightControl.svelte';
  import { deviceColorToHex } from '$lib/utils/color';

  const deviceId = $derived(page.params.id ?? '');
  const device = $derived($deviceList.find((d) => d.id === deviceId));

  const colorHex = $derived(
    device?.state?.color
      ? deviceColorToHex(device.state.color, device.state.brightness ?? 100)
      : null
  );
</script>

<div class="p-4 sm:p-6 max-w-lg mx-auto">
  <!-- Back link -->
  <a href="/devices" class="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors mb-4">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Devices
  </a>

  {#if !device}
    <div class="text-center py-20">
      <p class="text-surface-400">Device not found</p>
    </div>
  {:else}
    <!-- Device header -->
    <div class="flex items-center gap-4 mb-6">
      <div
        class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style="background: {device.state?.on && colorHex ? colorHex + '25' : 'var(--color-surface-800)'}"
      >
        <svg
          class="w-7 h-7 {device.state?.on ? 'text-device-on' : 'text-device-off'}"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div>
        <h1 class="text-xl font-bold text-white">{device.name}</h1>
        <p class="text-sm text-surface-400">{device.roomName || 'Unassigned'} · {device.type}</p>
      </div>
    </div>

    <!-- Light controls -->
    {#if device.type === 'light'}
      <LightControl {device} />
    {:else}
      <div class="bg-surface-800 rounded-2xl p-6 border border-surface-700 text-center">
        <p class="text-surface-400 text-sm">Controls for this device type are coming soon.</p>
      </div>
    {/if}
  {/if}
</div>
