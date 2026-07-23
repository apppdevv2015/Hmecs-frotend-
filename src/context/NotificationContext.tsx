import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  ReactNode,
} from "react";

import socketService from "../services/socketService";

export interface Notification {
  id: string;
  title: string;
  message: string;

  actorName: string;
  actorRole: string;

  /** Optional list of recipient roles (if provided by backend) */
  recipientRoles?: string[];

  category:
    | "Machine"
    | "Task"
    | "Report"
    | "Maintenance"
    | "Component"
    | "Subscription";

  machineName?: string;

  severity: "info" | "success" | "warning" | "critical";

  timestamp: string;

  read: boolean;
}

export type Severity = Notification["severity"];
export type Category = Notification["category"];
export type ActorRole = Notification["actorRole"];

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (
    notification: Partial<Omit<Notification, "id" | "timestamp" | "read">>,
  ) => void;

  markAsRead: (id: string) => void;

  markAllAsRead: () => void;

  removeNotification: (id: string) => void;

  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (
    notification: Partial<Omit<Notification, "id" | "timestamp" | "read">>,
  ) => {
    const newNotification: Notification = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
      title: notification.title || notification.message || "Notification",
      message: notification.message || "",
      actorName: notification.actorName || "System",
      actorRole: notification.actorRole || "",
      category: notification.category || "Subscription",
      machineName: notification.machineName,
      severity: (notification.severity || "info") as Notification["severity"],
      recipientRoles: notification.recipientRoles,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const unsubscribe = socketService.onMessage((data) => {

      // Defensive guards: socket payloads may vary. Ignore non-object messages.
      try {
        

        if (!data || typeof data !== "object") return;

        const type = (data as any).type || null;

        // If a type is present and it's not ALERT, ignore. If no type, proceed (some backends publish raw alerts).
        if (type && type !== "ALERT") return;

        const payload = (data as any).data || (data as any);

        if (!payload || typeof payload !== "object") return;
         

        addNotification({
          title: payload.title || payload.component || "Notification",
          message: payload.message || "",
          actorName: payload.actorName || payload.actor_name || "System",
          actorRole: payload.actorRole || payload.actor_role || "",
          category: payload.category || "Subscription",
          machineName: payload.machineName || payload.machine_name,
          severity: (payload.severity || "info").toLowerCase() as Notification["severity"],
        });
      } catch (e) {
        console.error("Failed to handle WS notification:", e);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  }

  return context;
};
