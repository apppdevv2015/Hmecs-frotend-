import StorageService, { STORAGE_KEYS } from "../services/storage.service";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import socketService from "../services/socketService";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

export const NOTIFICATION_CATEGORIES = [
  "Machine",
  "Task",
  "Report",
  "Maintenance",
  "Component",
  "Subscription",
  "Quotation",
  "Contract",
  "Payment",
] as const;

export type Category = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_SEVERITIES = [
  "info",
  "success",
  "warning",
  "critical",
] as const;

export type Severity = (typeof NOTIFICATION_SEVERITIES)[number];

export interface Notification {
  id: string;
  title: string;
  message: string;
  actorName: string;
  actorRole: string;
  category: Category;
  severity: Severity;
  machineName?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

export type NotificationInput = Notification;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const MAX_NOTIFICATIONS = 100;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isCategory = (value: unknown): value is Category =>
  typeof value === "string" &&
  (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);

const isSeverity = (value: unknown): value is Severity =>
  typeof value === "string" &&
  (NOTIFICATION_SEVERITIES as readonly string[]).includes(value);

const isValidNotification = (value: unknown): value is Notification => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    typeof value.actorName === "string" &&
    value.actorName.trim().length > 0 &&
    typeof value.actorRole === "string" &&
    value.actorRole.trim().length > 0 &&
    isCategory(value.category) &&
    isSeverity(value.severity) &&
    typeof value.timestamp === "string" &&
    value.timestamp.trim().length > 0 &&
    typeof value.read === "boolean" &&
    (!("machineName" in value) ||
      value.machineName === undefined ||
      typeof value.machineName === "string") &&
    (!("entityType" in value) ||
      value.entityType === undefined ||
      typeof value.entityType === "string") &&
    (!("entityId" in value) ||
      value.entityId === undefined ||
      typeof value.entityId === "string") &&
    (!("metadata" in value) ||
      value.metadata === undefined ||
      isObject(value.metadata))
  );
};

const extractNotificationPayload = (data: unknown): unknown => {
  if (!isObject(data)) {
    return null;
  }

  if ("data" in data) {
    return data.data;
  }

  return data;
};

const normalizeNotification = (
  raw: Record<string, unknown>,
): Record<string, unknown> => {
  return {
    id: raw.id,
    title: raw.title ?? "",
    message: raw.message ?? "",
    actorName:
      typeof raw.actorName === "string" && raw.actorName.trim().length > 0
        ? raw.actorName
        : "System",
    actorRole:
      typeof raw.actorRole === "string" && raw.actorRole.trim().length > 0
        ? raw.actorRole
        : "System",
    category: raw.type ?? raw.category,
    severity: raw.severity ?? "info",
    machineName: raw.machineName,
    entityType: raw.entityType,
    entityId: raw.entityId,
    metadata: raw.metadata,
    timestamp:
      typeof raw.timestamp === "string"
        ? raw.timestamp
        : raw.createdAt
          ? new Date(raw.createdAt as string).toISOString()
          : new Date().toISOString(),
    read: typeof raw.read === "boolean" ? raw.read : Boolean(raw.isRead),
  };
};

const getAuthToken = (): string | null =>
  StorageService.get<string>(STORAGE_KEYS.TOKEN);

const getApiBase = (): string => {
  const rawSocketUrl =
    import.meta.env.VITE_SOCKET_URL || "ws://localhost:4000/ws/alerts";

  const host =
    typeof window !== "undefined" && window.location
      ? window.location.hostname
      : "localhost";

  let resolved = rawSocketUrl.replace(/localhost|127\.0\.0\.1/g, host);
  resolved = resolved
    .replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://");
  const base = resolved.replace(/\/ws\/alerts.*$/, "");

  return `${base}/api/v1`;
};

const API_BASE = getApiBase();

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((previous) => {
      const existingIndex = previous.findIndex(
        (item) => item.id === notification.id,
      );

      if (existingIndex !== -1) {
        return previous;
      }

      return [notification, ...previous].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification,
      ),
    );

    const token = getAuthToken();
    if (!token) return;

    fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => {
      console.error(
        "[NotificationContext] Failed to sync markAsRead with backend:",
        error,
      );
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      })),
    );

    const token = getAuthToken();
    if (!token) return;

    fetch(`${API_BASE}/notifications/read-all`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => {
      console.error(
        "[NotificationContext] Failed to sync markAllAsRead with backend:",
        error,
      );
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.filter((notification) => notification.id !== id),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        const token = getAuthToken();

        if (!token) {
          console.warn(
            "[NotificationContext] Notification history skipped: authentication token not available.",
          );
          return;
        }

        const response = await fetch(
          `${API_BASE}/notifications?limit=${MAX_NOTIFICATIONS}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");

          console.error(
            "[NotificationContext] Failed to fetch notification history.",
            {
              status: response.status,
              body: errorBody,
            },
          );

          return;
        }

        const json: unknown = await response.json();

        if (cancelled) {
          return;
        }

        const list =
          isObject(json) && Array.isArray(json.data)
            ? json.data
            : Array.isArray(json)
              ? json
              : null;

        if (!list) {
          console.error(
            "[NotificationContext] Invalid notification history response.",
            json,
          );
          return;
        }

                const normalized = list
          .filter(isObject)
          .map((item) => normalizeNotification(item))
          .filter(isValidNotification) as unknown as Notification[];

        setNotifications((previous) => {
          const byId = new Map<string, Notification>();

          for (const notification of normalized) {
            byId.set(notification.id, notification);
          }

          for (const notification of previous) {
            if (!byId.has(notification.id)) {
              byId.set(notification.id, notification);
            }
          }

          return Array.from(byId.values())
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )
            .slice(0, MAX_NOTIFICATIONS);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "[NotificationContext] Failed to fetch notification history.",
          error,
        );
      }
    };

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const unsubscribe = socketService.onMessage((data: unknown) => {
      try {
        if (isObject(data) && "type" in data && data.type !== "ALERT") {
          return;
        }

        const rawPayload = extractNotificationPayload(data);

        if (!isObject(rawPayload)) {
          console.error(
            "[NotificationContext] Invalid notification payload received from WebSocket.",
            rawPayload,
          );
          return;
        }

        const payload = normalizeNotification(rawPayload);

        if (!isValidNotification(payload)) {
          console.error(
            "[NotificationContext] Invalid notification payload received from WebSocket.",
            payload,
          );
          return;
        }

        addNotification(payload);

        const toastMessage = `${payload.title}: ${payload.message}`;

        if (payload.severity === "critical" || payload.severity === "warning") {
          showErrorToast(toastMessage, {
            duration: 5000,
          });
        } else {
          showSuccessToast(toastMessage, {
            duration: 4000,
          });
        }
      } catch (error) {
        console.error(
          "[NotificationContext] Failed to process WebSocket notification:",
          error,
        );
      }
    });

    return unsubscribe;
  }, [addNotification]);

  const unreadCount = useMemo(
    () =>
      notifications.reduce(
        (count, notification) => (notification.read ? count : count + 1),
        0,
      ),
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearNotifications,
    }),
    [
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearNotifications,
    ],
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return context;
};
