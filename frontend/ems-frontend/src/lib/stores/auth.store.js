import { writable } from 'svelte/store';

const STORAGE_KEY = 'ems_auth';

const EMPTY_STATE = { user: null, token: null, refreshToken: null };

function isBrowser() {
  return typeof window !== 'undefined';
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function loadFromStorage() {
  if (!isBrowser()) return { ...EMPTY_STATE };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...EMPTY_STATE };
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_STATE };

    const token = parsed.token ?? null;

    if (token && isTokenExpired(token)) {
      localStorage.removeItem(STORAGE_KEY);
      return { ...EMPTY_STATE };
    }

    return {
      user: parsed.user ?? null,
      token: token,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function saveToStorage(value) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    console.warn('[authStore] Failed to persist auth state to localStorage.');
  }
}

function clearStorage() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function createAuthStore() {
  const { subscribe, set, update } = writable(loadFromStorage());

  return {
    subscribe,

    set: (value) => {
      saveToStorage(value);
      set(value);
    },

    update: (fn) => {
      update((current) => {
        const next = fn(current);
        saveToStorage(next);
        return next;
      });
    },

    logout: () => {
      clearStorage();
      set({ ...EMPTY_STATE });
    },
  };
}

export const authStore = createAuthStore();
