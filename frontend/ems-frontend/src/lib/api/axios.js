import axios from 'axios';
import { authStore } from '../stores/auth.store.js';
import { get } from 'svelte/store';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').trim();

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const { token } = get(authStore);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise = null;
const pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  pendingQueue.length = 0;
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const { refreshToken } = get(authStore);

    if (!refreshToken) {
      authStore.logout();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (refreshPromise) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;

    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, { token: refreshToken })
      .finally(() => {
        refreshPromise = null;
      });

    try {
      const res = await refreshPromise;
      const newToken = res.data?.token;

      if (!newToken) throw new Error('No token in refresh response');

      authStore.update((state) => ({ ...state, token: newToken }));
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      authStore.logout();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export default api;
