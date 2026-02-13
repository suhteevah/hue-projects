<script lang="ts">
  let { value = 100, onchange }: { value?: number; onchange?: (v: number) => void } = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const v = parseInt(target.value, 10);
    onchange?.(v);
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <label class="text-xs font-medium text-surface-400 uppercase tracking-wider">Brightness</label>
    <span class="text-sm font-semibold text-white tabular-nums">{value}%</span>
  </div>
  <div class="relative">
    <input
      type="range"
      min="1"
      max="100"
      {value}
      oninput={handleInput}
      class="w-full h-2 rounded-full cursor-pointer"
      style="background: linear-gradient(to right, var(--color-accent) {value}%, var(--color-surface-700) {value}%)"
    />
  </div>
</div>
