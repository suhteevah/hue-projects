<script lang="ts">
  import { mirekToKelvin, mirekToCSS } from '$lib/utils/color';

  let { value = 326, onchange }: { value?: number; onchange?: (v: number) => void } = $props();

  const kelvin = $derived(mirekToKelvin(value));
  const colorPreview = $derived(mirekToCSS(value));

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const v = parseInt(target.value, 10);
    onchange?.(v);
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <label class="text-xs font-medium text-surface-400 uppercase tracking-wider">Color Temperature</label>
    <span class="text-sm font-semibold text-white tabular-nums">{kelvin}K</span>
  </div>
  <div class="relative">
    <input
      type="range"
      min="153"
      max="500"
      {value}
      oninput={handleInput}
      class="w-full h-2 rounded-full cursor-pointer"
      style="background: linear-gradient(to right, var(--color-temp-cool), var(--color-temp-warm))"
    />
  </div>
  <div class="flex justify-between text-[10px] text-surface-500">
    <span>Cool</span>
    <div class="w-3 h-3 rounded-full border border-surface-600" style="background: {colorPreview}"></div>
    <span>Warm</span>
  </div>
</div>
