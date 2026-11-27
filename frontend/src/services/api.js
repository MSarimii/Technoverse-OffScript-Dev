import axios from 'axios';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const ERROR_CODE_MESSAGES = {
  EXAM_NOT_AVAILABLE: 'This examination is not currently open for entry.',
  ATTEMPT_EXPIRED: 'The examination time limit has expired.',
  ALREADY_SUBMITTED: 'Your attempt has already been submitted.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and retry.',
  NOT_FOUND: 'The requested record could not be found.',
};

export function normalizeApiError(error) {
  if (!error.response && error.isAxiosError) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network unavailable. Changes are queued locally if supported.',
      fields: {},
      statusCode: 0,
      isNetworkError: true,
    };
  }

  const payload = error.response?.data;
  const errObj = payload?.error || {};
  const code = errObj.code || payload?.code || 'UNKNOWN_ERROR';
  const message =
    errObj.message ||
    payload?.message ||
    ERROR_CODE_MESSAGES[code] ||
    error.message ||
    'Something went wrong';

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
    const token = localStorage.getItem('sems_token');
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
