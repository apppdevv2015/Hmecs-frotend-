import offlineQueueService from "./offlineQueue.service";

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const currentHost = window.location.hostname;
    if (currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      return envUrl.replace(/localhost|127\.0\.0\.1/, currentHost);
    }
  }
  return envUrl;
};

import StorageService, { STORAGE_KEYS } from "./storage.service";

// Strict localStorage Cleanup: Keep ONLY authentication session keys & theme
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const keysToRemove: string[] = [];
    const allowedKeys = new Set(["token", "accessToken", "refreshToken", "theme", "user", "role", "email", "companyId", "name"]);
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !allowedKeys.has(k)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { }
}

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

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);

  const baseUrl = getApiBaseUrl().replace(/\/$/, "");

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



  if (isMutationMethod && !shouldSkipOfflineQueue && !navigator.onLine) {

    console.warn(`[Offline Queue] Saved: ${endpoint}`);
    console.log("OFFLINE QUEUE HIT");
    await offlineQueueService.saveRequest({
      endpoint: finalUrl,

      method,

      body: parseRequestBody(options.body),
      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
            Authorization: `Bearer ${token}`,
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
      const rawBody = (options as any).data !== undefined ? (options as any).data : options.body;
      const isBodyObject = rawBody && typeof rawBody === "object" && !(rawBody instanceof FormData) && !(rawBody instanceof Blob);
      const serializedBody = isBodyObject ? JSON.stringify(rawBody) : rawBody;

      const fetchHeaders: Record<string, string> = {
        "ngrok-skip-browser-warning": "true",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      };

      if (serializedBody !== undefined && serializedBody !== null && !(rawBody instanceof FormData)) {
        fetchHeaders["Content-Type"] = "application/json";
      }

      const response = await fetch(finalUrl, {
        ...options,
        body: isMutationMethod ? serializedBody : undefined,
        cache: isMutationMethod ? "no-store" : "no-cache",
        headers: fetchHeaders,
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

        const error: any = new Error(
          data?.message || data?.error || "Something went wrong",
        );

        error.errors = data?.errors || {};
        error.status = response.status;
        error.response = data;

        throw error;
      }

      return data as T;
    } catch (error: any) {
      const isNetworkFailure = !navigator.onLine || !error?.status;

      if (isMutationMethod && !shouldSkipOfflineQueue && isNetworkFailure) {
        console.warn(`[Offline Queue] Network offline. Queued for sync: ${endpoint}`);

        await offlineQueueService.saveRequest({
          endpoint: finalUrl,
          method,
          body: parseRequestBody(options.body),
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }

      throw error;
    }
  };

  /**
   * Always execute direct API request without storing API responses in localStorage
   */
  return makeRequest();
}
