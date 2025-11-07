import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';

import type { AuthResult } from '../types/auth';

type AuthBindings = {
  getAccessToken: () => string | null;
  applyTokens: (user: AuthResult['user'], accessToken: string) => void;
  clearAuth: () => void;
};

let bindings: AuthBindings = {
  getAccessToken: () => null,
  applyTokens: () => undefined,
  clearAuth: () => undefined
};

export const configureAuthBindings = (nextBindings: AuthBindings) => {
  bindings = nextBindings;
};

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true
});

let refreshPromise: Promise<AuthResult | null> | null = null;

const performRefresh = async (): Promise<AuthResult | null> => {
  const refreshClient = axios.create({
    baseURL,
    withCredentials: true
  });

  try {
    const response = await refreshClient.post<ApiResponse<AuthResult>>('/auth/refresh');
    const result = response.data.data;
    bindings.applyTokens(result.user, result.accessToken);
    return result;
  } catch (error) {
    bindings.clearAuth();
    return null;
  }
};

export const requestSessionRefresh = async (): Promise<AuthResult | null> => {
  refreshPromise = refreshPromise ?? performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = bindings.getAccessToken();
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && error.config) {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        const refreshed = await requestSessionRefresh();
        if (refreshed?.accessToken) {
          const headers =
            originalRequest.headers instanceof AxiosHeaders
              ? originalRequest.headers
              : new AxiosHeaders(originalRequest.headers ?? {});
          headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
          originalRequest.headers = headers;
          return api(originalRequest);
        }
      }
    }
    return Promise.reject(error);
  }
);

export type ApiResponse<T> = {
  status: 'success';
  data: T;
};

export type ApiError = {
  status: 'error';
  message: string;
};
