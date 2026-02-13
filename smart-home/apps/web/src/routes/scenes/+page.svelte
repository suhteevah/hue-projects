<script lang="ts">
  import SceneCard from '$lib/components/SceneCard.svelte';

  // Placeholder scenes until the scenes API is fully wired
  const scenes = [
    { id: '1', name: 'Relax', color: '#f59e0b' },
    { id: '2', name: 'Concentrate', color: '#3b82f6' },
    { id: '3', name: 'Energize', color: '#93c5fd' },
    { id: '4', name: 'Movie Night', color: '#7c3aed' },
    { id: '5', name: 'Nightlight', color: '#f97316' },
    { id: '6', name: 'Bright', color: '#fbbf24' }
  ];
</script>

<div class="p-4 sm:p-6 max-w-5xl mx-auto">
  <h1 class="text-2xl font-bold text-white mb-2">Scenes</h1>
  <p class="text-sm text-surface-400 mb-6">Tap a scene to activate it across your lights.</p>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {#each scenes as scene (scene.id)}
      <SceneCard {scene} />
    {/each}
  </div>
</div>
