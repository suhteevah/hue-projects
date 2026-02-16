<script lang="ts">
  import { deviceColorToHex, mirekToCSS, hslToXy } from '$lib/utils/color';

  // ── Mock data ──────────────────────────────────────────────
  const mockBridges = [
    {
      id: 'b1',
      name: 'Living Room Bridge',
      ipAddress: '192.168.1.42',
      bridgeId: 'ecb5fa1a9e42',
      modelId: 'BSB002',
      apiVersion: '1.60.0',
      lastSeen: new Date(Date.now() - 45000).toISOString(),
      deviceCount: 8,
    },
    {
      id: 'b2',
      name: 'Upstairs Bridge',
      ipAddress: '192.168.1.87',
      bridgeId: 'ecb5fa2b3d15',
      modelId: 'BSB002',
      apiVersion: '1.60.0',
      lastSeen: new Date(Date.now() - 120000).toISOString(),
      deviceCount: 5,
    },
  ];

  const mockMatterNodes = [
    {
      id: 'mn1',
      nodeId: 'a1b2c3d4e5f6a1b2',
      name: 'Eve Light Strip',
      vendorId: 4874,
      productId: 57,
      deviceType: '0x010d',
      serialNumber: 'EVE-LS-2024-001',
      commissioned: true,
      commissionedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      lastSeen: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: 'mn2',
      nodeId: 'f7e8d9c0b1a2f7e8',
      name: 'Nanoleaf Essentials A19',
      vendorId: 4448,
      productId: 12,
      deviceType: '0x010c',
      serialNumber: 'NL-A19-2024-042',
      commissioned: true,
      commissionedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      lastSeen: new Date(Date.now() - 15000).toISOString(),
    },
  ];

  interface DemoDevice {
    id: string;
    name: string;
    room: string;
    source: 'hue' | 'matter';
    on: boolean;
    brightness: number;
    color?: { x: number; y: number };
    colorTemp?: number;
    supportsColor: boolean;
    supportsTemp: boolean;
    reachable: boolean;
  }

  let demoDevices = $state<DemoDevice[]>([
    { id: 'd1', name: 'Ceiling Light', room: 'Living Room', source: 'hue', on: true, brightness: 80, color: { x: 0.45, y: 0.41 }, supportsColor: true, supportsTemp: true, reachable: true },
    { id: 'd2', name: 'Floor Lamp', room: 'Living Room', source: 'hue', on: true, brightness: 45, colorTemp: 340, supportsColor: true, supportsTemp: true, reachable: true },
    { id: 'd3', name: 'TV Backlight', room: 'Living Room', source: 'hue', on: true, brightness: 30, color: { x: 0.17, y: 0.05 }, supportsColor: true, supportsTemp: false, reachable: true },
    { id: 'd4', name: 'Desk Lamp', room: 'Office', source: 'hue', on: true, brightness: 100, colorTemp: 230, supportsColor: false, supportsTemp: true, reachable: true },
    { id: 'd5', name: 'Bookshelf Strip', room: 'Office', source: 'hue', on: false, brightness: 0, color: { x: 0.3, y: 0.6 }, supportsColor: true, supportsTemp: true, reachable: true },
    { id: 'd6', name: 'Pendant', room: 'Kitchen', source: 'hue', on: true, brightness: 90, colorTemp: 400, supportsColor: false, supportsTemp: true, reachable: true },
    { id: 'd7', name: 'Under Cabinet', room: 'Kitchen', source: 'hue', on: true, brightness: 60, colorTemp: 250, supportsColor: false, supportsTemp: true, reachable: true },
    { id: 'd8', name: 'Nightstand', room: 'Bedroom', source: 'hue', on: false, brightness: 0, colorTemp: 450, supportsColor: true, supportsTemp: true, reachable: true },
    { id: 'd9', name: 'Eve Light Strip', room: 'Living Room', source: 'matter', on: true, brightness: 55, color: { x: 0.31, y: 0.32 }, supportsColor: true, supportsTemp: true, reachable: true },
    { id: 'd10', name: 'Nanoleaf Bulb', room: 'Bedroom', source: 'matter', on: true, brightness: 25, colorTemp: 420, supportsColor: true, supportsTemp: true, reachable: true },
    { id: 'd11', name: 'Reading Light', room: 'Bedroom', source: 'hue', on: false, brightness: 0, supportsColor: false, supportsTemp: true, reachable: true },
    { id: 'd12', name: 'Hallway', room: 'Hallway', source: 'hue', on: true, brightness: 40, colorTemp: 350, supportsColor: false, supportsTemp: true, reachable: true },
    { id: 'd13', name: 'Porch Light', room: 'Outdoor', source: 'hue', on: false, brightness: 0, supportsColor: false, supportsTemp: false, reachable: false },
  ]);

  // ── Derived state ──────────────────────────────────────────
  type DemoView = 'dashboard' | 'devices' | 'rooms' | 'room-detail' | 'device-detail' | 'settings';

  let currentView = $state<DemoView>('dashboard');
  let selectedDeviceId = $state<string | null>(null);
  let selectedRoom = $state<string | null>(null);
  let deviceFilter = $state<'all' | 'lights' | 'on'>('all');
  let sseConnected = $state(true);
  let settingsStep = $state<'idle' | 'input' | 'commissioning' | 'success'>('idle');
  let pairingCode = $state('');

  const onDevices = $derived(demoDevices.filter(d => d.on));
  const rooms = $derived(() => {
    const map = new Map<string, DemoDevice[]>();
    for (const d of demoDevices) {
      if (!map.has(d.room)) map.set(d.room, []);
      map.get(d.room)!.push(d);
    }
    return Array.from(map.entries()).map(([name, devs]) => ({
      name,
      devices: devs,
      totalCount: devs.length,
      onCount: devs.filter(d => d.on).length,
      hasLights: true,
    })).sort((a, b) => a.name.localeCompare(b.name));
  });

  const selectedDevice = $derived(demoDevices.find(d => d.id === selectedDeviceId));
  const selectedRoomData = $derived(rooms().find(r => r.name === selectedRoom));

  const filteredDevices = $derived(
    demoDevices.filter(d => {
      if (deviceFilter === 'on') return d.on;
      return true;
    })
  );

  const totals = $derived({
    bridges: mockBridges.length,
    matterNodes: mockMatterNodes.length,
    hueDevices: demoDevices.filter(d => d.source === 'hue').length,
    matterDevices: demoDevices.filter(d => d.source === 'matter').length,
    totalDevices: demoDevices.length,
  });

  // ── Actions ────────────────────────────────────────────────
  function toggleDevice(id: string) {
    demoDevices = demoDevices.map(d =>
      d.id === id ? { ...d, on: !d.on, brightness: !d.on ? (d.brightness || 80) : 0 } : d
    );
  }

  function setBrightness(id: string, val: number) {
    demoDevices = demoDevices.map(d =>
      d.id === id ? { ...d, brightness: val } : d
    );
  }

  function toggleRoom(roomName: string) {
    const roomDevs = demoDevices.filter(d => d.room === roomName);
    const allOn = roomDevs.every(d => d.on);
    demoDevices = demoDevices.map(d =>
      d.room === roomName ? { ...d, on: !allOn, brightness: !allOn ? (d.brightness || 80) : 0 } : d
    );
  }

  function setRoomBrightness(roomName: string, brightness: number) {
    demoDevices = demoDevices.map(d =>
      d.room === roomName && d.on ? { ...d, brightness } : d
    );
  }

  function getColorHex(device: DemoDevice): string | null {
    if (!device.on) return null;
    if (device.color) return deviceColorToHex(device.color, device.brightness);
    return null;
  }

  function timeSince(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function navigate(view: DemoView, id?: string) {
    currentView = view;
    if (view === 'device-detail') selectedDeviceId = id ?? null;
    else if (view === 'room-detail') selectedRoom = id ?? null;
  }
</script>

<!-- Demo wrapper — simulates the full app shell -->
<div class="flex h-screen bg-surface-900 overflow-hidden">
  <!-- Sidebar (desktop) -->
  <aside class="hidden sm:flex flex-col w-60 h-screen bg-surface-950 border-r border-surface-700 shrink-0">
    <div class="flex items-center gap-3 px-5 py-5 border-b border-surface-700">
      <div class="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
      </div>
      <div>
        <span class="text-lg font-bold text-white">Smart Home</span>
        <span class="block text-[10px] text-accent font-medium uppercase tracking-widest -mt-0.5">Demo</span>
      </div>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1">
      {#each [
        { view: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
        { view: 'devices', label: 'Devices', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
        { view: 'rooms', label: 'Rooms', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { view: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      ] as nav}
        <button
          onclick={() => navigate(nav.view as DemoView)}
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            {currentView === nav.view || (nav.view === 'rooms' && currentView === 'room-detail') || (nav.view === 'devices' && currentView === 'device-detail')
              ? 'bg-accent/15 text-accent-light'
              : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d={nav.icon} />
          </svg>
          {nav.label}
        </button>
      {/each}
    </nav>

    <div class="px-5 py-4 border-t border-surface-700">
      <div class="flex items-center gap-2 text-xs">
        <span class="w-2 h-2 rounded-full bg-device-on animate-pulse"></span>
        <span class="text-surface-400">Live</span>
      </div>
    </div>
  </aside>

  <!-- Main content -->
  <main class="flex-1 overflow-y-auto pb-20 sm:pb-0">

    <!-- ═══════════════════ DASHBOARD ═══════════════════ -->
    {#if currentView === 'dashboard'}
      <div class="p-4 sm:p-6 max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-white">Dashboard</h1>
            <p class="text-sm text-surface-400 mt-0.5">
              {demoDevices.length} device{demoDevices.length !== 1 ? 's' : ''}
              &middot; {onDevices.length} on
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-device-on animate-pulse"></span>
            <span class="text-xs text-surface-400 sm:hidden">Live</span>
          </div>
        </div>

        <section>
          <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Rooms</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each rooms() as room (room.name)}
              <div class="bg-surface-800 rounded-2xl p-5 border border-surface-700 hover:border-surface-600 transition-all">
                <div class="flex items-start justify-between mb-3">
                  <button onclick={() => navigate('room-detail', room.name)} class="flex-1 min-w-0 text-left">
                    <h3 class="text-base font-semibold text-white truncate">{room.name}</h3>
                    <p class="text-xs text-surface-400 mt-0.5">
                      {room.totalCount} device{room.totalCount !== 1 ? 's' : ''}
                    </p>
                  </button>
                  <button
                    onclick={() => toggleRoom(room.name)}
                    class="shrink-0 w-12 h-7 rounded-full transition-colors relative
                      {room.onCount === room.totalCount ? 'bg-accent' : room.onCount > 0 ? 'bg-accent/50' : 'bg-surface-600'}"
                    aria-label="Toggle all lights in {room.name}"
                  >
                    <span
                      class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform
                        {room.onCount > 0 ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
                    ></span>
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                    {room.onCount > 0 ? 'bg-device-on/15 text-device-on' : 'bg-surface-700 text-surface-400'}">
                    <span class="w-1.5 h-1.5 rounded-full {room.onCount > 0 ? 'bg-device-on' : 'bg-surface-500'}"></span>
                    {room.onCount}/{room.totalCount} on
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </section>
      </div>

    <!-- ═══════════════════ DEVICES ═══════════════════ -->
    {:else if currentView === 'devices'}
      <div class="p-4 sm:p-6 max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-white">Devices</h1>
        </div>

        <div class="flex gap-2 mb-4">
          {#each [['all', 'All'], ['lights', 'Lights'], ['on', 'On']] as [value, label]}
            <button
              onclick={() => deviceFilter = value as typeof deviceFilter}
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                {deviceFilter === value
                  ? 'bg-accent/15 text-accent-light border border-accent/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700 hover:text-surface-200'}"
            >
              {label}
            </button>
          {/each}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each filteredDevices as device (device.id)}
            {@const colorHex = getColorHex(device)}
            <div class="group relative bg-surface-800 rounded-2xl p-4 border border-surface-700 hover:border-surface-600 transition-all">
              {#if device.on && colorHex}
                <div
                  class="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
                  style="background: radial-gradient(ellipse at center, {colorHex}, transparent 70%)"
                ></div>
              {/if}
              <div class="relative flex items-start justify-between">
                <button onclick={() => navigate('device-detail', device.id)} class="flex-1 min-w-0 text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 shrink-0 {device.on ? 'text-device-on' : 'text-device-off'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span class="text-xs text-surface-400 truncate">{device.room}</span>
                    {#if device.source === 'matter'}
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">Matter</span>
                    {/if}
                  </div>
                  <h3 class="text-sm font-semibold text-white truncate">{device.name}</h3>
                  {#if device.on}
                    <p class="text-xs text-surface-400 mt-1">{device.brightness}% brightness</p>
                  {:else if !device.reachable}
                    <p class="text-xs text-device-unreachable mt-1">Unreachable</p>
                  {:else}
                    <p class="text-xs text-surface-500 mt-1">Off</p>
                  {/if}
                </button>
                <button
                  onclick={() => toggleDevice(device.id)}
                  class="shrink-0 w-12 h-7 rounded-full transition-colors relative {device.on ? 'bg-accent' : 'bg-surface-600'}"
                  aria-label="{device.on ? 'Turn off' : 'Turn on'} {device.name}"
                >
                  <span
                    class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform
                      {device.on ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
                  ></span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

    <!-- ═══════════════════ ROOMS ═══════════════════ -->
    {:else if currentView === 'rooms'}
      <div class="p-4 sm:p-6 max-w-5xl mx-auto">
        <h1 class="text-2xl font-bold text-white mb-6">Rooms</h1>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each rooms() as room (room.name)}
            <div class="bg-surface-800 rounded-2xl p-5 border border-surface-700 hover:border-surface-600 transition-all">
              <div class="flex items-start justify-between mb-3">
                <button onclick={() => navigate('room-detail', room.name)} class="flex-1 min-w-0 text-left">
                  <h3 class="text-base font-semibold text-white truncate">{room.name}</h3>
                  <p class="text-xs text-surface-400 mt-0.5">{room.totalCount} device{room.totalCount !== 1 ? 's' : ''}</p>
                </button>
                <button
                  onclick={() => toggleRoom(room.name)}
                  class="shrink-0 w-12 h-7 rounded-full transition-colors relative
                    {room.onCount === room.totalCount ? 'bg-accent' : room.onCount > 0 ? 'bg-accent/50' : 'bg-surface-600'}"
                  aria-label="Toggle all lights in {room.name}"
                >
                  <span
                    class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform
                      {room.onCount > 0 ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
                  ></span>
                </button>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                {room.onCount > 0 ? 'bg-device-on/15 text-device-on' : 'bg-surface-700 text-surface-400'}">
                <span class="w-1.5 h-1.5 rounded-full {room.onCount > 0 ? 'bg-device-on' : 'bg-surface-500'}"></span>
                {room.onCount}/{room.totalCount} on
              </span>
            </div>
          {/each}
        </div>
      </div>

    <!-- ═══════════════════ ROOM DETAIL ═══════════════════ -->
    {:else if currentView === 'room-detail' && selectedRoomData}
      {@const rd = selectedRoomData}
      <div class="p-4 sm:p-6 max-w-5xl mx-auto">
        <button onclick={() => navigate('rooms')} class="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors mb-4">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Rooms
        </button>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-white">{rd.name}</h1>
            <p class="text-sm text-surface-400">{rd.onCount}/{rd.totalCount} on</p>
          </div>
          <button
            onclick={() => toggleRoom(rd.name)}
            class="px-4 py-2 rounded-xl text-sm font-medium transition-colors
              {rd.onCount > 0
                ? 'bg-surface-700 text-white hover:bg-surface-600'
                : 'bg-accent text-white hover:bg-accent-dark'}"
          >
            {rd.onCount > 0 ? 'All Off' : 'All On'}
          </button>
        </div>

        {#if rd.onCount > 0}
          <div class="flex gap-2 mb-4">
            {#each [25, 50, 75, 100] as level}
              <button
                onclick={() => setRoomBrightness(rd.name, level)}
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700
                  text-surface-300 hover:bg-surface-700 transition-colors"
              >
                {level}%
              </button>
            {/each}
          </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each rd.devices as device (device.id)}
            {@const colorHex = getColorHex(device)}
            <div class="group relative bg-surface-800 rounded-2xl p-4 border border-surface-700 hover:border-surface-600 transition-all">
              {#if device.on && colorHex}
                <div
                  class="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
                  style="background: radial-gradient(ellipse at center, {colorHex}, transparent 70%)"
                ></div>
              {/if}
              <div class="relative flex items-start justify-between">
                <button onclick={() => navigate('device-detail', device.id)} class="flex-1 min-w-0 text-left">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 shrink-0 {device.on ? 'text-device-on' : 'text-device-off'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span class="text-xs text-surface-400">{device.room}</span>
                    {#if device.source === 'matter'}
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">Matter</span>
                    {/if}
                  </div>
                  <h3 class="text-sm font-semibold text-white truncate">{device.name}</h3>
                  {#if device.on}
                    <p class="text-xs text-surface-400 mt-1">{device.brightness}%</p>
                  {:else}
                    <p class="text-xs text-surface-500 mt-1">Off</p>
                  {/if}
                </button>
                <button
                  onclick={() => toggleDevice(device.id)}
                  class="shrink-0 w-12 h-7 rounded-full transition-colors relative {device.on ? 'bg-accent' : 'bg-surface-600'}"
                  aria-label="Toggle {device.name}"
                >
                  <span
                    class="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform
                      {device.on ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
                  ></span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

    <!-- ═══════════════════ DEVICE DETAIL ═══════════════════ -->
    {:else if currentView === 'device-detail' && selectedDevice}
      {@const dev = selectedDevice}
      {@const colorHex = getColorHex(dev)}
      <div class="p-4 sm:p-6 max-w-lg mx-auto">
        <button onclick={() => navigate('devices')} class="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200 transition-colors mb-4">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Devices
        </button>

        <div class="flex items-center gap-4 mb-6">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style="background: {dev.on && colorHex ? colorHex + '25' : 'var(--color-surface-800)'}"
          >
            <svg
              class="w-7 h-7 {dev.on ? 'text-device-on' : 'text-device-off'}"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white">{dev.name}</h1>
            <p class="text-sm text-surface-400">
              {dev.room} &middot; light
              {#if dev.source === 'matter'}
                <span class="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium align-middle">Matter</span>
              {/if}
            </p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Power -->
          <div class="flex items-center justify-between bg-surface-800 rounded-2xl p-4 border border-surface-700">
            <div>
              <h3 class="text-base font-semibold text-white">Power</h3>
              <p class="text-xs text-surface-400">{dev.on ? 'On' : 'Off'}</p>
            </div>
            <button
              onclick={() => toggleDevice(dev.id)}
              class="w-14 h-8 rounded-full transition-colors relative {dev.on ? 'bg-accent' : 'bg-surface-600'}"
              aria-label="Toggle power"
            >
              <span
                class="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform
                  {dev.on ? 'translate-x-7' : 'translate-x-1'}"
              ></span>
            </button>
          </div>

          {#if dev.on}
            <!-- Brightness -->
            <div class="bg-surface-800 rounded-2xl p-4 border border-surface-700">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-surface-300">Brightness</h3>
                <span class="text-sm text-white font-semibold tabular-nums">{dev.brightness}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={dev.brightness}
                oninput={(e) => setBrightness(dev.id, parseInt(e.currentTarget.value))}
                class="w-full"
              />
            </div>

            <!-- Info card -->
            <div class="bg-surface-800 rounded-2xl p-4 border border-surface-700 space-y-2">
              <h3 class="text-sm font-medium text-surface-300 mb-1">Device Info</h3>
              <div class="flex justify-between text-xs">
                <span class="text-surface-500">Source</span>
                <span class="text-surface-300 capitalize">{dev.source}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-surface-500">Color</span>
                <span class="text-surface-300">{dev.supportsColor ? 'Supported' : 'Not supported'}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-surface-500">Color Temp</span>
                <span class="text-surface-300">{dev.supportsTemp ? 'Supported' : 'Not supported'}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-surface-500">Reachable</span>
                <span class="{dev.reachable ? 'text-device-on' : 'text-device-unreachable'}">{dev.reachable ? 'Yes' : 'No'}</span>
              </div>
            </div>
          {/if}
        </div>
      </div>

    <!-- ═══════════════════ SETTINGS ═══════════════════ -->
    {:else if currentView === 'settings'}
      <div class="p-4 sm:p-6 max-w-lg mx-auto space-y-6">
        <h1 class="text-2xl font-bold text-white">Settings</h1>

        <!-- Account -->
        <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
          <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Account</h2>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-white">demo</p>
              <p class="text-xs text-surface-400">admin</p>
            </div>
            <button class="px-3 py-2 rounded-lg text-sm text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors">
              Sign Out
            </button>
          </div>
        </section>

        <!-- Connected Devices -->
        <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-white">Connected Devices</h2>
              <span class="text-xs text-surface-400 tabular-nums">
                {totals.totalDevices} device{totals.totalDevices !== 1 ? 's' : ''}
              </span>
            </div>

            <!-- Hue Bridges -->
            <div class="space-y-2">
              <h3 class="text-xs font-medium text-surface-400 uppercase tracking-wider">Hue Bridges</h3>
              {#each mockBridges as bridge}
                <div class="bg-surface-900/50 rounded-xl p-3 border border-surface-700">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-white truncate">{bridge.name}</p>
                        <p class="text-xs text-surface-500">{bridge.ipAddress}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 ml-3 shrink-0">
                      <span class="text-xs text-surface-400 tabular-nums">
                        {bridge.deviceCount} light{bridge.deviceCount !== 1 ? 's' : ''}
                      </span>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-device-on/15 text-device-on">Paired</span>
                    </div>
                  </div>
                  <div class="mt-2 flex items-center gap-3 text-xs text-surface-500">
                    <span>{bridge.modelId}</span>
                    <span class="text-surface-700">&middot;</span>
                    <span>API v{bridge.apiVersion}</span>
                    <span class="text-surface-700">&middot;</span>
                    <span>Seen {timeSince(bridge.lastSeen)}</span>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Matter Devices -->
            <div class="space-y-2">
              <h3 class="text-xs font-medium text-surface-400 uppercase tracking-wider">Matter Devices</h3>
              {#each mockMatterNodes as node}
                <div class="bg-surface-900/50 rounded-xl p-3 border border-surface-700">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-white truncate">{node.name}</p>
                        <p class="text-xs text-surface-500">{node.nodeId.slice(0, 12)}&hellip;</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 ml-3 shrink-0">
                      <span class="text-xs px-2 py-0.5 rounded-full bg-device-on/15 text-device-on">Paired</span>
                      <button class="text-xs text-red-400 hover:text-red-300 transition-colors" aria-label="Remove device {node.name}">Remove</button>
                    </div>
                  </div>
                  <div class="mt-2 flex items-center gap-3 text-xs text-surface-500">
                    <span>Type {node.deviceType}</span>
                    <span class="text-surface-700">&middot;</span>
                    <span>Seen {timeSince(node.lastSeen)}</span>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Commissioning -->
            {#if settingsStep === 'idle'}
              <button
                onclick={() => { settingsStep = 'input'; pairingCode = ''; }}
                class="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold transition-colors"
              >
                Add Matter Device
              </button>
            {:else if settingsStep === 'input'}
              <div class="space-y-3">
                <div>
                  <label for="demo-pairing" class="block text-sm font-medium text-surface-300 mb-2">Enter the device's pairing code</label>
                  <p class="text-xs text-surface-500 mb-3">
                    This is the 11 or 21-digit manual code, or the QR code payload starting with <code class="text-surface-400">MT:</code>
                  </p>
                  <input
                    id="demo-pairing"
                    type="text"
                    bind:value={pairingCode}
                    placeholder="e.g. 34970112332 or MT:Y.K90..."
                    class="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-xl text-white
                      placeholder:text-surface-500 focus:outline-none focus:border-accent/50 font-mono text-sm"
                  />
                </div>
                <div class="flex gap-3">
                  <button onclick={() => { settingsStep = 'idle'; }} class="flex-1 py-3 rounded-xl bg-surface-700 text-surface-300 font-medium hover:bg-surface-600 transition-colors">Cancel</button>
                  <button
                    onclick={() => { settingsStep = 'commissioning'; setTimeout(() => { settingsStep = 'success'; }, 2000); }}
                    disabled={!pairingCode.trim()}
                    class="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >Commission</button>
                </div>
              </div>
            {:else if settingsStep === 'commissioning'}
              <div class="flex flex-col items-center gap-3 py-6">
                <div class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"></div>
                <p class="text-sm text-surface-400">Commissioning device...</p>
                <p class="text-xs text-surface-500">This may take up to 60 seconds</p>
              </div>
            {:else if settingsStep === 'success'}
              <div class="flex flex-col items-center gap-3 py-6 text-center">
                <div class="w-12 h-12 rounded-full bg-device-on/15 flex items-center justify-center">
                  <svg class="w-6 h-6 text-device-on" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p class="text-white font-medium">Device commissioned successfully!</p>
                <p class="text-sm text-surface-400">Your devices have been synced.</p>
                <button onclick={() => { settingsStep = 'input'; pairingCode = ''; }} class="text-accent text-sm mt-2 hover:underline">Add another device</button>
              </div>
            {/if}
          </div>
        </section>

        <!-- Bridge Setup -->
        <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
          <h2 class="text-lg font-bold text-white mb-4">Hue Bridge Setup</h2>
          <div class="space-y-2 mb-4">
            <h3 class="text-sm font-medium text-surface-300">Paired Bridges</h3>
            {#each mockBridges as bridge}
              <div class="flex items-center justify-between bg-surface-900/50 rounded-xl p-3 border border-surface-700">
                <div>
                  <p class="text-sm font-medium text-white">{bridge.name}</p>
                  <p class="text-xs text-surface-400">{bridge.ipAddress}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded-full bg-device-on/15 text-device-on">Connected</span>
              </div>
            {/each}
          </div>
          <button class="w-full py-3 rounded-xl bg-accent hover:bg-accent-dark text-white font-semibold transition-colors">
            Discover Bridges
          </button>
        </section>

        <!-- Device Sync -->
        <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
          <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">Devices</h2>
          <button class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-700 text-white font-medium hover:bg-surface-600 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync All Devices
          </button>
          <p class="text-xs text-surface-500 mt-2 text-center">Re-fetch all devices from connected bridges and Matter nodes</p>
        </section>

        <!-- About -->
        <section class="bg-surface-800 rounded-2xl p-5 border border-surface-700">
          <h2 class="text-sm font-medium text-surface-400 uppercase tracking-wider mb-3">About</h2>
          <p class="text-xs text-surface-500">Smart Home Control v0.1.0</p>
        </section>
      </div>
    {/if}
  </main>

  <!-- Bottom Nav (mobile) -->
  <nav class="sm:hidden fixed bottom-0 left-0 right-0 bg-surface-950/95 backdrop-blur-lg border-t border-surface-700 z-50 safe-bottom">
    <div class="flex justify-around items-center h-16 px-2">
      {#each [
        { view: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
        { view: 'devices', label: 'Devices', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
        { view: 'rooms', label: 'Rooms', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { view: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      ] as nav}
        <button
          onclick={() => navigate(nav.view as DemoView)}
          class="flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-lg transition-colors
            {currentView === nav.view || (nav.view === 'rooms' && currentView === 'room-detail') || (nav.view === 'devices' && currentView === 'device-detail')
              ? 'text-accent-light'
              : 'text-surface-400 active:text-surface-200'}"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width={currentView === nav.view || (nav.view === 'rooms' && currentView === 'room-detail') || (nav.view === 'devices' && currentView === 'device-detail') ? 2 : 1.5}>
            <path stroke-linecap="round" stroke-linejoin="round" d={nav.icon} />
          </svg>
          <span class="text-[10px] font-medium">{nav.label}</span>
        </button>
      {/each}
    </div>
  </nav>
</div>
