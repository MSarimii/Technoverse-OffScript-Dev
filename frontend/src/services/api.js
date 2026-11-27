import axios from 'axios';
import { mapErrorCodeToCopy } from '../lib/errors';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

let memoryToken = null;
export function setMemoryToken(tok) {
  memoryToken = tok;
}

export function normalizeApiError(error) {
  if (!error.response && error.isAxiosError) {
    return {
      code: 'NETWORK_ERROR',
      message: mapErrorCodeToCopy('NETWORK_ERROR'),
      fields: {},
      statusCode: 0,
      isNetworkError: true,
    };
  }

  const payload = error.response?.data;
  const errObj = payload?.error || {};
  const code = errObj.code || payload?.code || 'UNKNOWN_ERROR';
  const message = mapErrorCodeToCopy(code, errObj.message || payload?.message || error.message);

  return {
    code,
    message,
    fields: errObj.fields || {},
    statusCode: error.response?.status || error.statusCode || 500,
    isNetworkError: false,
  };
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = memoryToken || sessionStorage.getItem('sems_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Retry/backoff ONLY for idempotent GET requests on transient 5xx/network errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config;
    const isGet = config?.method?.toLowerCase() === 'get';
    const status = error.response?.status || 0;
    const isTransient = !error.response || status >= 500;

    if (status === 401) {
      memoryToken = null;
      sessionStorage.removeItem('sems_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sems:unauthorized'));
      }
    }

    if (isGet && isTransient && (config.__retryCount || 0) < 2) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delayMs = 300 * Math.pow(2, config.__retryCount - 1);
      await new Promise((r) => setTimeout(r, delayMs));
      return api(config);
    }

    return Promise.reject(normalizeApiError(error));
  }
);

export default api;
