import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearTokens, getTokens, updateAccessToken } from "./auth-storage";

/**
 * Same backend, same auth contract as Admin/src/Api/Api.js:
 * POST auth/login/ -> {tokens:{access,refresh}}, Bearer access on every
 * request, POST api/token/refresh/ on 401, logout + redirect on refresh failure.
 */
export const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.["VITE_API_BASE_URL"] ??
  "http://127.0.0.1:8000/";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getTokens();
  if (tokens?.access) {
    config.headers.set("Authorization", `Bearer ${tokens.access}`);
  }
  config.headers.set("Accept", "application/json");
  return config;
});

let refreshing: Promise<string> | null = null;

function doLogout() {
  clearTokens();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function refreshAccessToken(): Promise<string> {
  const tokens = getTokens();
  if (!tokens?.refresh) throw new Error("No refresh token");
  const { data } = await axios.post(`${API_BASE_URL}api/token/refresh/`, {
    refresh: tokens.refresh,
  });
  updateAccessToken(data.access);
  return data.access as string;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        refreshing ??= refreshAccessToken().finally(() => {
          refreshing = null;
        });
        const access = await refreshing;
        original.headers.set("Authorization", `Bearer ${access}`);
        return apiClient(original);
      } catch {
        doLogout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
