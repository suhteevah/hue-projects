<script lang="ts">
  import type { UnifiedDevice } from '@smart-home/shared-types';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';
  import { deviceColorToHex } from '$lib/utils/color';

  let { device }: { device: UnifiedDevice } = $props();

  const isOn = $derived(device.state?.on ?? false);
  const brightness = $derived(device.state?.brightness ?? 0);
  const colorHex = $derived(
    device.state?.color
      ? deviceColorToHex(device.state.color, brightness)
      : null
  );

  async function toggle() {
    try {
      await devices.setState(device.id, { on: !isOn });
    } catch (err) {
      toast.error(`Failed to toggle ${device.name}`);
    }
  }
</script>

<div class="group relative bg-surface-800 rounded-2xl p-4 border border-surface-700 hover:border-surface-600 transition-all">
  <!-- Color glow when on -->
  {#if isOn && colorHex}
    <div
      class="absolute inset-0 rounded-2xl opacity-10 pointer-events-none transition-opacity"
      style="background: radial-gradient(ellipse at center, {colorHex}, transparent 70%)"
    ></div>
  {/if}

  <div class="relative flex items-start justify-between">
    <!-- Device info -->
    <a href="/devices/{device.id}" class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <svg class="w-4 h-4 shrink-0 {isOn ? 'text-device-on' : 'text-device-off'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span class="text-xs text-surface-400 truncate">{device.roomName || 'Unassigned'}</span>
      </div>
      <h3 class="text-sm font-semibold text-white truncate">{device.name}</h3>
      {#if isOn}
        <p class="text-xs text-surface-400 mt-1">
          {brightness}% brightness
        </p>
      {:else}
        <p class="text-xs text-surface-500 mt-1">Off</p>
      {/if}
    </a>

    <!-- Toggle button -->
    <button
      onclick={toggle}
      class="shrink-0 w-12 h-7 rounded-full transition-colors relative {isOn ? 'bg-accent' : 'bg-surface-600'}"
      aria-label="{isOn ? 'Turn off' : 'Turn on'} {device.name}"
    >
      <span
        class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform
          {isOn ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
      ></span>
    </button>
  </div>
</div>
