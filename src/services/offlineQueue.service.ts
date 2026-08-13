import StorageService, { STORAGE_KEYS } from "./storage.service";

type OfflineRequest = {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  status?: "pending" | "syncing" | "failed";
  retryCount?: number;
  timestamp: number;
};

const DB_NAME = "hme-offline-db";
const STORE_NAME = "offline-requests";
const DB_VERSION = 1;
const MAX_RETRIES = 3;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

class OfflineQueueService {
  private db: IDBDatabase | null = null;

  /**
   * Open IndexedDB
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[Offline DB] Failed to open DB");
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
        }
      };
    });
  }

  /**
   * Save request to queue
   */
  async saveRequest(request: Omit<OfflineRequest, "id" | "timestamp">) {
    try {
      const db = await this.init();

      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const payload: OfflineRequest = {
          ...request,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          status: "pending",
          retryCount: 0,
        };

        store.add(payload);

        tx.oncomplete = () => {
          resolve();
        };

        tx.onerror = () => {
          console.error("[Offline Queue] Save failed");
          reject(tx.error);
        };
      });
    } catch (error) {
      console.error("[Offline Queue] Error saving request:", error);
    }
  }

  /**
   * Get all pending requests
   */
  async getRequests(): Promise<OfflineRequest[]> {
    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[Offline Queue] Failed to fetch requests:", error);
      return [];
    }
  }

  /**
   * Remove request
   */
  async removeRequest(id: string) {
    try {
      const db = await this.init();

      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        store.delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error("[Offline Queue] Failed to remove request:", error);
    }
  }

  /**
   * Clear all pending requests
   */
  async clearAll() {
    try {
      const db = await this.init();

      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        store.clear();

        tx.oncomplete = () => {
          console.log("[Offline Queue] Cleared all requests");
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error("[Offline Queue] Failed to clear requests:", error);
    }
  }

  /**
   * Sync queued requests
   */
  async syncRequests() {
    if (!navigator.onLine) {
      return;
    }

    const requests = await this.getRequests();
    if (requests.length === 0) {
      return;
    }

    const now = Date.now();
    const currentToken = StorageService.get<string>(STORAGE_KEYS.TOKEN);

    requests.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of requests) {
      // Purge expired requests (> 24h)
      if (now - item.timestamp > MAX_AGE_MS) {
        await this.removeRequest(item.id);
        continue;
      }

      // Max retry limit exceeded
      if ((item.retryCount || 0) >= MAX_RETRIES) {
        console.warn(`[Offline Sync] Discarding request after max retries: ${item.endpoint}`);
        await this.removeRequest(item.id);
        continue;
      }

      try {
        const mergedHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...item.headers,
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        };

        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: mergedHeaders,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.ok) {
          await this.removeRequest(item.id);

          window.dispatchEvent(
            new CustomEvent("offline-sync-success", {
              detail: {
                endpoint: item.endpoint,
              },
            }),
          );
        } else {
          // If it's a 4xx client error (e.g. 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422),
          // retrying will never succeed, so discard it to avoid infinite error loops
          if (response.status >= 400 && response.status < 500) {
            console.warn(`[Offline Sync] Client error (${response.status}) on ${item.endpoint}. Discarding stale request.`);
            await this.removeRequest(item.id);
          } else {
            // 5xx Server error -> increment retry count
            item.retryCount = (item.retryCount || 0) + 1;
            if (item.retryCount >= MAX_RETRIES) {
              await this.removeRequest(item.id);
            }
          }
        }
      } catch (error) {
        console.warn("[Offline Sync] Network retry failed:", error);
      }
    }
  }
}

const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;
