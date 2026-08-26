/**
 * Global Storage Keys
 */
export const STORAGE_KEYS = {
  // Auth Keys
  TOKEN: "token",
  USER: "user",
  ROLE: "role",
  EMAIL: "email",
  NAME: "name",
  COMPANY_ID: "companyId",

  // Auth Remember
  REMEMBER_ME: "rememberMe",
  REMEMBER_EMAIL: "rememberEmail",

  // Theme
  THEME: "theme",

  // Plan/Subscription
  SELECTED_PLAN: "selectedPlan",

  // Alternative Token Keys
  AUTH_TOKEN: "authToken",
  ACCESS_TOKEN: "accessToken",
  USER_ROLE: "userRole",
  USER_TYPE: "user_type",
  USER_NAME: "userName",

  // Dashboard & Data
  DASHBOARD: "dashboard",
  ALERTS: "alerts",
  MACHINES: "machines",
  COMPONENTS: "components",
  NOTIFICATIONS: "notifications",
  SETTINGS: "settings",
} as const;

/**
 * Global Storage Service
 */
class StorageService {
  /**
   * Save Data
   */
  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(
        `[StorageService] Save Error (${key})`,
        error
      );
    }
  }

  /**
   * Get Data
   */
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);

      if (!item) return null;

      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (error) {
      console.error(
        `[StorageService] Read Error (${key})`,
        error
      );

      return null;
    }
  }

  /**
   * Remove Single Item
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(
        `[StorageService] Remove Error (${key})`,
        error
      );
    }
  }

  /**
   * Clear All Storage
   */
  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(
        "[StorageService] Clear Error",
        error
      );
    }
  }

  /**
   * Check Key Exists
   */
  static exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Save Data With Timestamp
   */
  static setWithTimestamp<T>(
    key: string,
    value: T
  ): void {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data: value,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error(
        `[StorageService] Timestamp Save Error (${key})`,
        error
      );
    }
  }

  /**
   * Get Data With Timestamp
   */
  static getWithTimestamp<T>(
    key: string
  ): {
    data: T;
    timestamp: number;
  } | null {
    try {
      const item = localStorage.getItem(key);

      if (!item) return null;

      return JSON.parse(item);
    } catch (error) {
      console.error(
        `[StorageService] Timestamp Read Error (${key})`,
        error
      );

      return null;
    }
  }

  /**
   * Check Cache Expiry
   */
  static isExpired(
    timestamp: number,
    maxAgeInMinutes: number
  ): boolean {
    const age =
      Date.now() - timestamp;

    return (
      age >
      maxAgeInMinutes *
      60 *
      1000
    );
  }

  /**
   * Session Storage - Save Data
   */
  static sessionSet<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(
        `[StorageService] Session Save Error (${key})`,
        error
      );
    }
  }

  /**
   * Session Storage - Get Data
   */
  static sessionGet<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);

      if (!item) return null;

      return JSON.parse(item) as T;
    } catch (error) {
      console.error(
        `[StorageService] Session Read Error (${key})`,
        error
      );

      return null;
    }
  }

  /**
   * Session Storage - Remove Item
   */
  static sessionRemove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(
        `[StorageService] Session Remove Error (${key})`,
        error
      );
    }
  }

  /**
   * Helper: Get User Object
   */
  static getUser(): any {
    return StorageService.get<any>(STORAGE_KEYS.USER) || null;
  }

  /**
   * Helper: Get Company ID
   */
  static getCompanyId(): string | null {
    const user = StorageService.getUser();
    return user?.companyId || user?.company_id || StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) || null;
  }

  /**
   * Helper: Get Token
   */
  static getToken(): string | null {
    return StorageService.get<string>(STORAGE_KEYS.TOKEN) || StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN) || null;
  }

  /**
   * Helper: Get Role
   */
  static getRole(): string | null {
    const user = StorageService.getUser();
    return user?.role || StorageService.get<string>(STORAGE_KEYS.ROLE) || null;
  }
}

export default StorageService;