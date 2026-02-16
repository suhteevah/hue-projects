<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth, authChecked, isAuthenticated } from '$lib/stores/auth';
  import { devices } from '$lib/stores/devices';
  import { sse } from '$lib/stores/sse';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import '../app.css';

  let { children } = $props();
  let ready = $state(false);

  onMount(async () => {
    const authenticated = await auth.checkStatus();

    if (!authenticated && !page.url.pathname.startsWith('/login') && !page.url.pathname.startsWith('/demo')) {
      goto('/login');
    } else if (authenticated) {
      // Load devices and connect SSE
      devices.load();
      sse.connect();
    }

    ready = true;
  });

  // Show app shell only when auth check is done
  const isPublicRoute = $derived(page.url.pathname.startsWith('/login') || page.url.pathname.startsWith('/demo'));
  const showApp = $derived($authChecked && $isAuthenticated && !isPublicRoute);
</script>

{#if !ready}
  <!-- Loading spinner -->
  <div class="flex items-center justify-center h-screen bg-surface-900">
    <div class="flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin"></div>
      <p class="text-surface-400 text-sm">Loading...</p>
    </div>
  </div>
{:else}
  <Toast />

  {#if showApp}
    <Sidebar />
    <main class="sm:ml-60 min-h-screen pb-20 sm:pb-0">
      {@render children()}
    </main>
    <BottomNav />
  {:else}
    {@render children()}
  {/if}
{/if}
