<script lang="ts">
  import { toast, type Toast as ToastItem } from '$lib/stores/toast';
  import { fly } from 'svelte/transition';

  const typeStyles: Record<string, string> = {
    info: 'bg-blue-600/90 border-blue-500',
    success: 'bg-emerald-600/90 border-emerald-500',
    error: 'bg-red-600/90 border-red-500',
    warning: 'bg-amber-600/90 border-amber-500'
  };

  const typeIcons: Record<string, string> = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'
  };
</script>

<div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
  {#each $toast as item (item.id)}
    <div
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-white shadow-2xl max-w-sm {typeStyles[item.type]}"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d={typeIcons[item.type]} />
      </svg>
      <span class="flex-1">{item.message}</span>
      <button
        class="shrink-0 text-white/60 hover:text-white transition-colors"
        onclick={() => toast.dismiss(item.id)}
        aria-label="Dismiss"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
