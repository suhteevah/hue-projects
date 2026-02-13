<script lang="ts">
  import type { UnifiedDevice } from '@smart-home/shared-types';
  import { devices } from '$lib/stores/devices';
  import { toast } from '$lib/stores/toast';
  import { debounce } from '$lib/utils/debounce';
  import BrightnessSlider from './BrightnessSlider.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import ColorTempSlider from './ColorTempSlider.svelte';

  let { device }: { device: UnifiedDevice } = $props();

  const isOn = $derived(device.state?.on ?? false);
  const brightness = $derived(device.state?.brightness ?? 100);
  const colorTemp = $derived(device.state?.colorTemperature ?? 326);
  const hasColor = $derived(device.capabilities?.supportsColor ?? false);
  const hasColorTemp = $derived(device.capabilities?.supportsColorTemperature ?? false);

  let activeTab = $state<'color' | 'temperature'>('color');

  const debouncedSetState = debounce(async (state: Record<string, unknown>) => {
    try {
      await devices.setState(device.id, state);
    } catch {
      toast.error('Failed to update light');
    }
  }, 150);

  async function toggle() {
    try {
      await devices.setState(device.id, { on: !isOn });
    } catch {
      toast.error('Failed to toggle light');
    }
  }

  function onBrightnessChange(v: number) {
    debouncedSetState({ brightness: v });
  }

  function onColorChange(xy: { x: number; y: number }) {
    debouncedSetState({ color: xy });
  }

  function onColorTempChange(mirek: number) {
    debouncedSetState({ colorTemperature: mirek });
  }
</script>

<div class="space-y-6">
  <!-- Power toggle -->
  <div class="flex items-center justify-between bg-surface-800 rounded-2xl p-4 border border-surface-700">
    <div>
      <h3 class="text-base font-semibold text-white">Power</h3>
      <p class="text-xs text-surface-400">{isOn ? 'On' : 'Off'}</p>
    </div>
    <button
      onclick={toggle}
      class="w-14 h-8 rounded-full transition-colors relative {isOn ? 'bg-accent' : 'bg-surface-600'}"
      aria-label="{isOn ? 'Turn off' : 'Turn on'}"
    >
      <span
        class="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform
          {isOn ? 'translate-x-7' : 'translate-x-1'}"
      ></span>
    </button>
  </div>

  {#if isOn}
    <!-- Brightness -->
    <div class="bg-surface-800 rounded-2xl p-4 border border-surface-700">
      <BrightnessSlider value={brightness} onchange={onBrightnessChange} />
    </div>

    <!-- Color controls -->
    {#if hasColor || hasColorTemp}
      <div class="bg-surface-800 rounded-2xl border border-surface-700 overflow-hidden">
        <!-- Tabs -->
        {#if hasColor && hasColorTemp}
          <div class="flex border-b border-surface-700">
            <button
              class="flex-1 py-3 text-sm font-medium transition-colors
                {activeTab === 'color' ? 'text-accent border-b-2 border-accent' : 'text-surface-400 hover:text-surface-200'}"
              onclick={() => activeTab = 'color'}
            >
              Color
            </button>
            <button
              class="flex-1 py-3 text-sm font-medium transition-colors
                {activeTab === 'temperature' ? 'text-accent border-b-2 border-accent' : 'text-surface-400 hover:text-surface-200'}"
              onclick={() => activeTab = 'temperature'}
            >
              Temperature
            </button>
          </div>
        {/if}

        <div class="p-4">
          {#if hasColor && (activeTab === 'color' || !hasColorTemp)}
            <ColorPicker
              x={device.state?.color?.x}
              y={device.state?.color?.y}
              onchange={onColorChange}
            />
          {:else if hasColorTemp}
            <ColorTempSlider value={colorTemp} onchange={onColorTempChange} />
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
