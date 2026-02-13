<script lang="ts">
  import { page } from '$app/state';
  import { sseConnected } from '$lib/stores/sse';

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'home' },
    { href: '/devices', label: 'Devices', icon: 'lightbulb' },
    { href: '/rooms', label: 'Rooms', icon: 'grid' },
    { href: '/scenes', label: 'Scenes', icon: 'palette' },
    { href: '/settings', label: 'Settings', icon: 'settings' }
  ];

  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
    lightbulb: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    grid: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    palette: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  };

  function isActive(href: string) {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<aside class="hidden sm:flex flex-col w-60 h-screen bg-surface-950 border-r border-surface-700 fixed left-0 top-0 z-40">
  <!-- Logo -->
  <div class="flex items-center gap-3 px-5 py-5 border-b border-surface-700">
    <div class="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
      <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d={icons.home} />
      </svg>
    </div>
    <span class="text-lg font-bold text-white">Smart Home</span>
  </div>

  <!-- Nav items -->
  <nav class="flex-1 px-3 py-4 space-y-1">
    {#each navItems as item}
      <a
        href={item.href}
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
          {isActive(item.href)
            ? 'bg-accent/15 text-accent-light'
            : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
        </svg>
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- SSE Status -->
  <div class="px-5 py-4 border-t border-surface-700">
    <div class="flex items-center gap-2 text-xs">
      <span
        class="w-2 h-2 rounded-full {$sseConnected ? 'bg-device-on animate-pulse' : 'bg-device-off'}"
      ></span>
      <span class="text-surface-400">
        {$sseConnected ? 'Live' : 'Disconnected'}
      </span>
    </div>
  </div>
</aside>
