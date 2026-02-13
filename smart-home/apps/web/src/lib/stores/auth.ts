import { writable, derived } from 'svelte/store';
import { api } from '$lib/api/client';
import * as authApi from '$lib/api/auth';
import type { AuthUser } from '$lib/api/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  checked: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    token: null,
    loading: false,
    checked: false
  });

  return {
    subscribe,

    async checkStatus() {
      const token = api.getToken();
      if (!token) {
        set({ user: null, token: null, loading: false, checked: true });
        return false;
      }

      try {
        const status = await authApi.getAuthMe();
        if (status.authenticated) {
          set({ user: status.user, token, loading: false, checked: true });
          return true;
        }
      } catch {
        api.clearToken();
      }

      set({ user: null, token: null, loading: false, checked: true });
      return false;
    },

    async login(username: string, password: string) {
      update((s) => ({ ...s, loading: true }));
      try {
        const result = await authApi.login(username, password);
        api.setToken(result.accessToken);
        set({
          user: result.user,
          token: result.accessToken,
          loading: false,
          checked: true
        });
        return result;
      } catch (err) {
        update((s) => ({ ...s, loading: false }));
        throw err;
      }
    },

    async register(username: string, password: string) {
      update((s) => ({ ...s, loading: true }));
      try {
        const result = await authApi.register(username, password);
        api.setToken(result.accessToken);
        set({
          user: result.user,
          token: result.accessToken,
          loading: false,
          checked: true
        });
        return result;
      } catch (err) {
        update((s) => ({ ...s, loading: false }));
        throw err;
      }
    },

    logout() {
      api.clearToken();
      set({ user: null, token: null, loading: false, checked: true });
    }
  };
}

export const auth = createAuthStore();

export const isAuthenticated = derived(auth, ($auth) => !!$auth.token && !!$auth.user);
export const currentUser = derived(auth, ($auth) => $auth.user);
export const authChecked = derived(auth, ($auth) => $auth.checked);
