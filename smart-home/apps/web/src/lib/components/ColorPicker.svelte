<script lang="ts">
  import { onMount } from 'svelte';
  import { hslToXy } from '$lib/utils/color';

  let {
    x = 0.3127,
    y = 0.3290,
    onchange
  }: {
    x?: number;
    y?: number;
    onchange?: (xy: { x: number; y: number }) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let dragging = $state(false);
  let selectedHue = $state(0);
  let selectedSat = $state(100);

  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 8;

  onMount(() => {
    drawWheel();
  });

  function drawWheel() {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px - center;
        const dy = py - center;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          const angle = Math.atan2(dy, dx);
          const hue = ((angle * 180) / Math.PI + 360) % 360;
          const sat = (dist / radius) * 100;

          const rgb = hslToRgbLocal(hue, sat, 50);
          const i = (py * size + px) * 4;
          data[i] = rgb.r;
          data[i + 1] = rgb.g;
          data[i + 2] = rgb.b;
          data[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function hslToRgbLocal(h: number, s: number, l: number) {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return {
      r: Math.round(f(0) * 255),
      g: Math.round(f(8) * 255),
      b: Math.round(f(4) * 255)
    };
  }

  function handlePointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dx = px - center;
    const dy = py - center;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    const angle = Math.atan2(dy, dx);

    selectedHue = ((angle * 180) / Math.PI + 360) % 360;
    selectedSat = (dist / radius) * 100;

    const xy = hslToXy(selectedHue, selectedSat, 50);
    onchange?.(xy);
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    handlePointer(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (dragging) handlePointer(e);
  }

  function onPointerUp() {
    dragging = false;
  }

  // Calculate marker position from selected hue/sat
  const markerX = $derived(center + (selectedSat / 100) * radius * Math.cos((selectedHue * Math.PI) / 180));
  const markerY = $derived(center + (selectedSat / 100) * radius * Math.sin((selectedHue * Math.PI) / 180));
</script>

<div class="flex flex-col items-center gap-3">
  <label class="text-xs font-medium text-surface-400 uppercase tracking-wider self-start">Color</label>
  <div class="relative" style="width: {size}px; height: {size}px">
    <canvas
      bind:this={canvas}
      width={size}
      height={size}
      class="rounded-full cursor-crosshair touch-none"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
    ></canvas>
    <!-- Selection marker -->
    <div
      class="absolute w-6 h-6 rounded-full border-3 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
      style="left: {markerX}px; top: {markerY}px;"
    ></div>
  </div>
</div>
