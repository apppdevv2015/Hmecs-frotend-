import offlineQueueService from "./offlineQueue.service";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

import StorageService, { STORAGE_KEYS } from "./storage.service";

import { fetchWithCache } from "./api-cache.service";

const parseRequestBody = (body: any) => {
  if (!body) return undefined;

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return body;
};

const invalidateCache = (endpoint: string) => {
  try {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const segments = cleanEndpoint.split("?")[0].split("/");
    const basePath = segments
      .slice(0, 2)
      .join("_")
      .replace(/[/?=&]/g, "_")
      .replace(/_+/g, "_");

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(basePath)) {
        localStorage.removeItem(key);
        i--;
      }
    }
    console.log(`[Cache Invalidate] Cleared cache keys starting with: ${basePath}`);
  } catch (e) {
    console.error("Failed to invalidate cache:", e);
  }
};

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
  const accessToken =
    StorageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN) ||
    StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN);
  const refreshToken = StorageService.get<string>(STORAGE_KEYS.REFRESH_TOKEN);

  const baseUrl = String(API_BASE_URL || "").replace(/\/$/, "");

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const finalUrl = `${baseUrl}${cleanEndpoint}`;

  /**
   * Generate cache key
   */
  const cacheKey = endpoint.replace(/[/?=&]/g, "_").replace(/_+/g, "_");

  /**
   * Request method
   */
  const method = String(options.method || "GET").toUpperCase();

  /**
   * Mutation methods
   */
  const isMutationMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  /**
   * Skip auth/payment queue
   */
  const shouldSkipOfflineQueue =
    endpoint.includes("/login") ||
    endpoint.includes("/logout") ||
    endpoint.includes("/checkout") ||
    endpoint.includes("/payment");

  /**
   * Save request if offline
   */
  console.log("METHOD =>", method);
  console.log("ONLINE =>", navigator.onLine);
  console.log("ENDPOINT =>", endpoint);

  if (isMutationMethod && !shouldSkipOfflineQueue && !navigator.onLine) {
    console.warn(`[Offline Queue] Saved: ${endpoint}`);
    console.log("OFFLINE QUEUE HIT");
    await offlineQueueService.saveRequest({
      endpoint: finalUrl,

      method,

      body: parseRequestBody(options.body),
      headers: {
        "Content-Type": "application/json",
        ...(accessToken || token
          ? {
              Authorization: `Bearer ${accessToken || token}`,
            }
          : {}),
        ...(refreshToken
          ? {
              "x-refresh-token": refreshToken,
              "x-refresh": refreshToken,
            }
          : {}),
      },
    });

    return {
      success: true,
      offline: true,
      queued: true,
      message: "Saved offline. Will sync automatically.",
    } as T;
  }

  /**
   * Main request function
   */
  const makeRequest = async (): Promise<T> => {
    try {
      const response = await fetch(finalUrl, {
        ...options,

        cache: isMutationMethod ? "no-store" : "no-cache",

        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...(accessToken || token
            ? {
                Authorization: `Bearer ${accessToken || token}`,
              }
            : {}),
          ...(refreshToken
            ? {
                "x-refresh-token": refreshToken,
                "x-refresh": refreshToken,
              }
            : {}),
          ...options.headers,
        },
      });

      let data: any = null;

      try {
        const text = await response.text();

        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          url: finalUrl,
          data,
        });

        const error: any = new Error(data?.message || data?.error || "Something went wrong");

        error.errors = data?.errors || {};
        error.status = response.status;
        error.response = data;

        throw error;
      }

      if (isMutationMethod) {
        invalidateCache(endpoint);
      }

      return data as T;
    } catch (error) {
      console.log("FETCH FAILED");
      console.log("ONLINE STATUS:", navigator.onLine);
      console.log("ERROR:", error);

      if (isMutationMethod && !shouldSkipOfflineQueue) {
        console.warn(`[Offline Queue] Queued: ${endpoint}`);

        await offlineQueueService.saveRequest({
          endpoint: finalUrl,

          method,

          body: parseRequestBody(options.body),

          headers: {
            "Content-Type": "application/json",
            ...(accessToken || token
              ? {
                  Authorization: `Bearer ${accessToken || token}`,
                }
              : {}),
            ...(refreshToken
              ? {
                  "x-refresh-token": refreshToken,
                  "x-refresh": refreshToken,
                }
              : {}),
          },
        });
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        throw error;
      }

      throw error;
    }
  };

  /**
   * Cache GET APIs
   */
  const shouldCache =
    method === "GET" && !endpoint.includes("/login") && !endpoint.includes("/logout");

  if (shouldCache) {
    return fetchWithCache<T>(cacheKey, makeRequest, 2);
  }

  /**
   * Normal request
   */
  return makeRequest();
}
