/**
 * Client-side Auth Store
 * Manages user session state, login/logout, and credits
 */

import { syncPreferencesFromServer } from '$lib/stores/panels.svelte';

interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface CreditInfo {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

interface AuthState {
  user: AuthUser | null;
  credits: CreditInfo | null;
  loading: boolean;
  initialized: boolean;
}

const AUTH_CACHE_KEY = 'graphini_auth_cache';

function loadCachedAuth(): { user: AuthUser | null; credits: CreditInfo | null } {
  try {
    if (typeof localStorage === 'undefined') return { user: null, credits: null };
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.user) return { user: cached.user, credits: cached.credits || null };
    }
  } catch {}
  return { user: null, credits: null };
}

function saveCachedAuth(user: AuthUser | null, credits: CreditInfo | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, credits }));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {}
}

// Hydrate immediately from cache for instant UI
const cached = loadCachedAuth();

let state = $state<AuthState>({
  user: cached.user,
  credits: cached.credits,
  loading: false,
  initialized: cached.user !== null
});

async function fetchMe(): Promise<void> {
  try {
    state.loading = true;
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      state.credits = data.credits;
      saveCachedAuth(data.user, data.credits);
      // Sync preferences from server after auth check
      if (state.user) syncPreferencesFromServer().catch(() => {});
    } else {
      state.user = null;
      state.credits = null;
      saveCachedAuth(null, null);
    }
  } catch {
    state.user = null;
    state.credits = null;
    saveCachedAuth(null, null);
  } finally {
    state.loading = false;
    state.initialized = true;
  }
}

function login(returnTo?: string): void {
  const url = returnTo ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}` : '/api/auth/login';
  window.location.href = url;
}

function logout(): void {
  state.user = null;
  state.credits = null;
  saveCachedAuth(null, null);
  window.location.href = '/api/auth/logout';
}

async function refreshCredits(): Promise<void> {
  try {
    const res = await fetch('/api/credits', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      state.credits = data.balance;
      saveCachedAuth(state.user, state.credits);
    }
  } catch {
    /* ignore */
  }
}

export const authStore = {
  get state() {
    return state;
  },
  get user() {
    return state.user;
  },
  get credits() {
    return state.credits;
  },
  get isLoggedIn() {
    return !!state.user;
  },
  get isLoading() {
    return state.loading;
  },
  get isInitialized() {
    return state.initialized;
  },
  init: fetchMe,
  login,
  logout,
  refreshCredits
};
