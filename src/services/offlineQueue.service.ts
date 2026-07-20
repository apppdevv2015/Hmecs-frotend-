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

        console.log("[Offline DB] Connected");

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

        const payload = {
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
   * Remove synced request
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
   * Sync queued requests
   */
  async syncRequests() {
    if (!navigator.onLine) {
      console.warn("[Offline Sync] Still offline");

      return;
    }

    const requests = await this.getRequests();
    requests.sort((a, b) => a.timestamp - b.timestamp);

    if (requests.length === 0) {
      return;
    }
    for (const item of requests) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,

          headers: item.headers,

          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.ok) {
          await this.removeRequest(item.id);

          // Notify app to refetch data
          window.dispatchEvent(
            new CustomEvent("offline-sync-success", {
              detail: {
                endpoint: item.endpoint,
              },
            }),
          );
        } else {
          console.error(
            "[Offline Sync] Failed:",
            response.status,
            item.endpoint,
          );
        }
      } catch (error) {
        console.error("[Offline Sync] Error:", error);
      }
    }
  }
}

const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;
