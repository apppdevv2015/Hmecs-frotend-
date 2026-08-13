/// <reference lib="webworker" />

import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";

import { clientsClaim } from "workbox-core";

import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
  
declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

const CACHE_VERSION = "v1";

const CACHE_NAMES = {
  API: `api-cache-${CACHE_VERSION}`,
  IMAGES: `images-${CACHE_VERSION}`,
  STATIC: `static-resources-${CACHE_VERSION}`,
  FONTS: `google-fonts-${CACHE_VERSION}`,
  OFFLINE_QUEUE: "offline-queue-requests",
};

const DB_NAME = "hme-offline-db";
const DB_VERSION = 1;
const STORE_NAME = "offline-requests";

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

registerRoute(
  ({ url }) => url.pathname.includes("favicon.ico"),

  new NetworkOnly(),
);

const handler = createHandlerBoundToURL("/index.html");

const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/api\//, /^\/graphql\//, /^\/auth\//],
});

registerRoute(navigationRoute);

registerRoute(
  ({ url, request }) => {
    if (request.method !== "GET") {
      return false;
    }

    // auth APIs skip
    if (
      url.pathname.includes("/auth") ||
      url.pathname.includes("/login") ||
      url.pathname.includes("/logout")
    ) {
      return false;
    }

    // cache all backend APIs
    return url.origin !== self.location.origin;
  },

  new NetworkFirst({
    cacheName: CACHE_NAMES.API,

    networkTimeoutSeconds: 3,

    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),

      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",

  new CacheFirst({
    cacheName: CACHE_NAMES.FONTS,

    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  }),
);

// Images cache
registerRoute(
  ({ request, url }) =>
    request.destination === "image" && !url.pathname.includes("favicon.ico"),

  new CacheFirst({
    cacheName: CACHE_NAMES.IMAGES,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",

  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.STATIC,
  }),
);

/**
 * Handle POST, PUT, DELETE, PATCH (mutations) - Queue for sync when offline
 */
registerRoute(
  ({ url, request }) => {
    const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
    return mutationMethods.includes(request.method);
  },

  new NetworkFirst({
    cacheName: CACHE_NAMES.OFFLINE_QUEUE,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

/**
 * IndexedDB helper - Open DB for offline request storage
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Save offline request to IndexedDB
 */
async function saveOfflineRequest(
  endpoint: string,
  method: string,
  body: any,
  headers: Record<string, string>,
) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = {
      id: `${Date.now()}_${Math.random()}`,
      endpoint,
      method,
      body,
      headers,
      timestamp: Date.now(),
    };

    store.add(request);

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("[SW] Failed to save offline request:", error);
  }
}

/**
 * Handle messages from clients (main app)
 */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  /**
   * Trigger sync of offline requests
   */
  if (event.data?.type === "SYNC_OFFLINE_REQUESTS") {
    event.waitUntil(syncOfflineRequests());
  }
});

/**
 * Fetch event - Intercept mutations for offline queueing
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip auth and payment endpoints from queueing
  const shouldSkipQueue =
    url.pathname.includes("/auth") ||
    url.pathname.includes("/login") ||
    url.pathname.includes("/logout") ||
    url.pathname.includes("/checkout") ||
    url.pathname.includes("/payment");

  const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (
    mutationMethods.includes(request.method) &&
    !shouldSkipQueue &&
    url.hostname !== self.location.hostname
  ) {
    /**
     * For mutations, try network first, queue if fails
     */
    event.respondWith(
      fetch(request.clone())
        .then((response) => {
          if (response.ok) {
            return response;
          }
          // Non-ok response - still queue for retry
          queueRequestIfOffline(request);
          return response;
        })
        .catch((error) => {
          // Network error - queue for later
          queueRequestIfOffline(request);

          return new Response(
            JSON.stringify({
              success: true,
              offline: true,
              queued: true,
              message: "Request queued for sync when online",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
    );
  }
});

/**
 * Queue request if offline
 */
async function queueRequestIfOffline(request: Request) {
  try {
    const method = request.method;
    let body = null;

    if (request.method !== "GET") {
      try {
        body = await request.clone().json();
      } catch {
        body = await request.clone().text();
      }
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    await saveOfflineRequest(request.url, method, body, headers);

  } catch (error) {
    console.error("[SW] Error queueing request:", error);
  }
}

/**
 * Sync offline requests when online
 */
async function syncOfflineRequests() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const allRequests: any[] = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });



    for (const item of allRequests) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: item.headers,
          body:
            item.body && item.method !== "GET"
              ? JSON.stringify(item.body)
              : undefined,
        });

        if (response.ok) {
          // Remove successfully synced request
          const txDelete = db.transaction(STORE_NAME, "readwrite");
          const storeDelete = txDelete.objectStore(STORE_NAME);
          storeDelete.delete(item.id);

        } else {
          console.warn(
            "[SW Sync] Failed with status:",
            response.status,
            item.endpoint,
          );
        }
      } catch (error) {
        console.error(
          "[SW Sync] Error:",
          error,
          "for endpoint:",
          item.endpoint,
        );
      }
    }
  } catch (error) {
    console.error("[SW] Error syncing requests:", error);
  }
}
