import { writable, derived } from 'svelte/store';
import { api } from '$lib/api/client';
import { devices } from './devices';

type SSEStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SSEState {
  status: SSEStatus;
  reconnectAttempts: number;
}

function createSSEStore() {
  const { subscribe, set, update } = writable<SSEState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });

  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    const token = api.getToken();
    if (!token) return;

    disconnect();
    update((s) => ({ ...s, status: 'connecting' }));

    const url = `/api/events/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSource = es;

    es.onopen = () => {
      set({ status: 'connected', reconnectAttempts: 0 });
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        handleEvent(parsed);
      } catch {
        // Ignore parse errors (heartbeats, etc.)
      }
    };

    es.onerror = () => {
      update((s) => ({ ...s, status: 'error' }));
      scheduleReconnect();
    };
  }

  function handleEvent(event: { type: string; deviceId?: string; data?: Record<string, unknown> }) {
    switch (event.type) {
      case 'device_state_changed':
        if (event.deviceId && event.data) {
          devices.applySSEUpdate(event.deviceId, event.data);
        }
        break;
      case 'device_added':
      case 'device_removed':
        // Full reload on structural changes
        devices.load();
        break;
      case 'bridge_connected':
      case 'bridge_disconnected':
        // Could show a toast, for now just log
        break;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;

    update((s) => {
      const delay = Math.min(1000 * Math.pow(2, s.reconnectAttempts), 30000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
      return { ...s, reconnectAttempts: s.reconnectAttempts + 1 };
    });
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    set({ status: 'disconnected', reconnectAttempts: 0 });
  }

  return {
    subscribe,
    connect,
    disconnect
  };
}

export const sse = createSSEStore();

export const sseStatus = derived(sse, ($sse) => $sse.status);
export const sseConnected = derived(sse, ($sse) => $sse.status === 'connected');
