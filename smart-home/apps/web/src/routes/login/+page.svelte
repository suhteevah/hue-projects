<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { auth } from '$lib/stores/auth';
  import { devices } from '$lib/stores/devices';
  import { sse } from '$lib/stores/sse';
  import { toast } from '$lib/stores/toast';

  let isRegister = $derived(page.url.searchParams.get('mode') === 'register');
  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    loading = true;
    error = '';

    try {
      if (isRegister) {
        await auth.register(username.trim(), password);
        toast.success('Account created successfully');
      } else {
        await auth.login(username.trim(), password);
        toast.success('Logged in');
      }

      // Initialize app state
      devices.load();
      sse.connect();
      goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Authentication failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-surface-900 px-4">
  <div class="w-full max-w-sm">
    <!-- Logo -->
    <div class="flex flex-col items-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
        <svg class="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">Smart Home</h1>
      <p class="text-surface-400 text-sm mt-1">
        {isRegister ? 'Create your account' : 'Sign in to continue'}
      </p>
    </div>

    <!-- Form -->
    <form onsubmit={handleSubmit} class="space-y-4">
      {#if error}
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      {/if}

      <div>
        <label for="username" class="block text-sm font-medium text-surface-300 mb-1.5">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          autocomplete="username"
          class="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-white
            placeholder:text-surface-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            transition-colors"
          placeholder="Enter username"
          required
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          autocomplete={isRegister ? 'new-password' : 'current-password'}
          class="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-white
            placeholder:text-surface-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
            transition-colors"
          placeholder="Enter password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if loading}
          <span class="inline-flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {isRegister ? 'Creating account...' : 'Signing in...'}
          </span>
        {:else}
          {isRegister ? 'Create Account' : 'Sign In'}
        {/if}
      </button>
    </form>

    <!-- Toggle mode -->
    <p class="text-center text-sm text-surface-400 mt-6">
      {#if isRegister}
        Already have an account?
        <a href="/login" class="text-accent-light hover:text-accent transition-colors">Sign in</a>
      {:else}
        First time here?
        <a href="/login?mode=register" class="text-accent-light hover:text-accent transition-colors">Create account</a>
      {/if}
    </p>
  </div>
</div>
