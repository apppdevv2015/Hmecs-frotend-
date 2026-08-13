import { useMemo, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";

import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { Notification, useNotifications, Severity, Category } from "../../context/NotificationContext";
// ─────────────────────────────────────────────────────────────────────────



type ActorRole = "Supervisor" | "Engineer" | "Artisan" | "Operator" | "Admin";



const SEVERITY_PRIORITY: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

const SEVERITY_STYLES: Record<
  Severity,
  { dot: string; badge: string; label: string }
> = {
  critical: {
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    label: "Critical",
  },
  warning: {
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    label: "Warning",
  },
  info: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    label: "Info",
  },

  success: {
    dot: "bg-green-500",
    badge:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    label: "Success",
  },
};

const CATEGORY_STYLES: Record<Category, string> = {
  Machine:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  Report: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Task: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  Maintenance:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Component: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  Subscription:
    "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300",
};

function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutesAgo = Math.floor(diff / 1000 / 60);

  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;

  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";

  return `${days} days ago`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Sorts by severity priority first, then most recent first within the same severity. */
function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    const severityDiff =
      SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const navigate = useNavigate();

  const currentRole = StorageService.get<string>(STORAGE_KEYS.ROLE);

  

  const sortedNotifications = useMemo(
    () => sortNotifications(notifications),
    [notifications],
  );

  const notifying = unreadCount > 0;
  const unreadBadgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  const visibleNotifications =
    filter === "unread"
      ? sortedNotifications.filter((n) => !n.read)
      : sortedNotifications;

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleViewAllNotifications = () => {
    closeDropdown();

    const normalizedRole = String(currentRole || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_")
      .replace(/_+$/g, "");

    const notificationRouteMap: Record<string, string> = {
      super_admin: "/super-admin/notifications",
      superadmin: "/super-admin/notifications",
      system_admin: "/super-admin/notifications",
      admin: "/company-admin/notifications",
      company_admin: "/company-admin/notifications",
      companyadmin: "/company-admin/notifications",
      supervisor: "/supervisor/notifications",
      operator: "/operator/notifications",
      planner: "/operator/notifications",
      artisans: "/artisans/notifications",
    };

    const destination = notificationRouteMap[normalizedRole] || "/";
    navigate(destination);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleDropdown();
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11"
        onClick={handleClick}
      >
        {notifying && (
          <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-orange-500 px-0.5 text-[10px] font-semibold leading-none text-white dark:border-gray-900">
            {unreadBadgeLabel}
          </span>
        )}

        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="fixed inset-x-3 top-16 z-99999 mx-auto flex max-h-[min(480px,calc(100dvh-88px))] w-auto max-w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-[17px] lg:max-h-[500px] lg:w-[380px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 pb-3.5 pt-4 dark:border-gray-800">
          <div className="min-w-0">
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Notifications
            </h5>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </span>
          </div>

          <button
            type="button"
            onClick={closeDropdown}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X size={14} />
          </button>
        </div>

        {/* Filter row */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <div className="flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === "unread"
                  ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Unread
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="shrink-0 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark all as read
            </button>
          )}
        </div>

        <ul className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 py-1.5">
          {visibleNotifications.length === 0 && (
            <li className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                <svg
                  className="fill-current"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                No Notifications
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                You're all caught up.
              </p>
            </li>
          )}

          {visibleNotifications.map((notification) => {
            const severity = SEVERITY_STYLES[notification.severity];

            return (
              <li key={notification.id}>
                <DropdownItem
                  onItemClick={() => markAsRead(notification.id)}
                  className={`relative flex gap-3 rounded-xl px-2.5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 sm:px-3 ${
                    !notification.read ? "bg-blue-50/50 dark:bg-blue-500/5" : ""
                  }`}
                >
                  <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {getInitials(notification.actorName)}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-dark ${severity.dot}`}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {notification.message}
                      {notification.machineName && (
                        <>
                          {" — "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {notification.machineName}
                          </span>
                        </>
                      )}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severity.badge}`}
                      >
                        {severity.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLES[notification.category]}`}
                      >
                        {notification.category}
                      </span>
                      <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                        {getRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                </DropdownItem>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 p-2.5 dark:border-gray-800">
          <button
            type="button"
            onClick={handleViewAllNotifications}
            className="group flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
          >
            View all notifications
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </Dropdown>
    </div>
  );
}