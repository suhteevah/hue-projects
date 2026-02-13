<script lang="ts">
  import { toast } from '$lib/stores/toast';

  let { scene }: { scene: { id: string; name: string; color?: string } } = $props();

  async function activate() {
    toast.info(`Activating "${scene.name}"...`);
    // Scene activation will be wired when scene API is fully integrated
  }
</script>

<button
  onclick={activate}
  class="w-full bg-surface-800 rounded-2xl p-4 border border-surface-700 hover:border-accent/50
    hover:bg-surface-750 transition-all text-left group"
>
  <div class="flex items-center gap-3">
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style="background: {scene.color || '#3b82f6'}20"
    >
      <div
        class="w-4 h-4 rounded-full"
        style="background: {scene.color || '#3b82f6'}"
      ></div>
    </div>
    <div class="flex-1 min-w-0">
      <h3 class="text-sm font-semibold text-white truncate">{scene.name}</h3>
      <p class="text-xs text-surface-400">Tap to activate</p>
    </div>
    <svg class="w-5 h-5 text-surface-500 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </svg>
  </div>
</button>
