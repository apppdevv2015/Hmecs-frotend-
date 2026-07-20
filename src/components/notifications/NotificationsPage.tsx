import { useMemo, useState } from "react";
import {
  Notification,
  useNotifications,
  Severity,
  Category,
} from "../../context/NotificationContext";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Cpu,
  FileText,
  ListChecks,
  Wrench,
  Settings2,
  CreditCard,
  Search,
  CheckCheck,
  Inbox,
  ChevronDown,
  Bell,
  SlidersHorizontal,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// TODO (Backend / Auth / Real-time integration):
// 1. Replace `viewingRole` with the authenticated user's role from AuthContext
//    (e.g. `const { user } = useAuth(); const viewingRole = user.role;`) and
//    remove the demo role switcher below.
// 2. Replace DUMMY_NOTIFICATIONS with data from NotificationContext, hydrated via
//    GET /api/notifications?role={viewingRole}&companyId={companyId}&page={page}
// 3. Subscribe to a WebSocket channel (e.g. `ws://.../notifications/{userId}`) to
//    prepend live events to the list as they arrive.
// 4. `receivedMinutesAgo` is a dummy stand-in for a real ISO `createdAt` field —
//    swap `getRelativeTime` to diff against `Date.now()` once wired to the API.
// 5. `markAsRead` / `markAllAsRead` should call:
//      POST /api/notifications/:id/read
//      POST /api/notifications/mark-all-read
//    with optimistic UI update (the local state update below can stay as the
//    optimistic layer, rolled back on request failure).
// 6. "Load more" should be replaced with real cursor/page-based pagination
//    (GET /api/notifications?cursor={cursor}) once the list is server-driven.
// ─────────────────────────────────────────────────────────────────────────

// Use shared `Notification` type from NotificationContext

const SEVERITY_PRIORITY: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};
const SEVERITY_META: Record<
  Severity,
  {
    icon: typeof AlertTriangle;
    iconWrap: string;
    badge: string;
    ring: string;
    accentBar: string;
    label: string;
  }
> = {
  critical: {
    icon: AlertTriangle,
    iconWrap: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    badge: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    ring: "border-red-500 bg-red-500 text-white shadow-sm shadow-red-500/20",
    accentBar: "bg-red-500",
    label: "Critical",
  },

  warning: {
    icon: AlertCircle,
    iconWrap:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    ring: "border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-500/20",
    accentBar: "bg-amber-500",
    label: "Warning",
  },

  info: {
    icon: Info,
    iconWrap: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    ring: "border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20",
    accentBar: "bg-blue-500",
    label: "Info",
  },

  success: {
    icon: CheckCircle2,
    iconWrap:
      "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    badge:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    ring: "border-green-500 bg-green-500 text-white shadow-sm shadow-green-500/20",
    accentBar: "bg-green-500",
    label: "Success",
  },
};

const CATEGORY_META: Record<Category, { icon: typeof Cpu; badge: string }> = {
  Machine: {
    icon: Cpu,
    badge:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  Report: {
    icon: FileText,
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  },
  Task: {
    icon: ListChecks,
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  },
  Maintenance: {
    icon: Wrench,
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  Component: {
    icon: Settings2,
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  },
  Subscription: {
    icon: CreditCard,
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-300",
  },
};

// BACKEND TODO: dummy data shaped like the real API envelope — replace with fetched/live data.

/** Converts a dummy `receivedMinutesAgo` value into a human relative-time label. */
function getRelativeTime(timestamp: string) {
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

const PAGE_SIZE = 8;

export default function NotificationsPage() {
  // TODO: replace with authenticated role from AuthContext — see integration notes above.

  const [severityFilter, setSeverityFilter] = useState<"All" | Severity>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | Category>("All");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");

  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const roleScoped = useMemo(() => notifications, [notifications]);

  const unreadCount = roleScoped.filter((n) => !n.read).length;

  const criticalCount = roleScoped.filter(
    (n) => n.severity === "critical" && !n.read,
  ).length;
  const successCount = roleScoped.filter(
    (n) => n.severity === "success",
  ).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return roleScoped.filter((n) => {
      if (severityFilter !== "All" && n.severity !== severityFilter)
        return false;
      if (categoryFilter !== "All" && n.category !== categoryFilter)
        return false;
      if (readFilter === "unread" && n.read) return false;
      if (
        query &&
        !`${n.title} ${n.message} ${n.machineName ?? ""} ${n.actorName}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      return true;
    });
  }, [roleScoped, severityFilter, categoryFilter, readFilter, search]);

  const sorted = useMemo(() => sortNotifications(filtered), [filtered]);
  const paged = sorted.slice(0, visibleCount);
  const hasMore = paged.length < sorted.length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-900 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-500 p-8 shadow-lg">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur">
        <Bell size={20} />
      </span>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Notifications
        </h1>

        <p className="mt-1 text-sm text-blue-100">
          Role-wise activity across your fleet, reports, and billing.
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllAsRead}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-medium text-blue-700 shadow transition hover:bg-blue-50"
        >
          <CheckCheck size={16} />
          Mark all as read
        </button>
      )}
    </div>
  </div>
</div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Total
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <Inbox size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {roleScoped.length}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Unread
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Bell size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {unreadCount}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Critical (unread)
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
              {criticalCount}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Resolved
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
                <CheckCircle2 size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-green-600 dark:text-green-400">
              {successCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3.5 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-800/60 sm:p-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search notifications, machines, people..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:bg-gray-900 dark:focus:ring-blue-500/10"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500">
            <SlidersHorizontal size={13} />
            Filters
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(["All", "critical", "warning", "info", "success"] as const).map(
                (option) => {
                  const isActive = severityFilter === option;
                  const meta = option !== "All" ? SEVERITY_META[option] : null;
                  const OptionIcon = meta?.icon;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSeverityFilter(option);
                        setVisibleCount(PAGE_SIZE);
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? meta
                            ? meta.ring
                            : "border-gray-800 bg-gray-800 text-white shadow-sm dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      {OptionIcon && <OptionIcon size={12} />}
                      {option === "All"
                        ? "All"
                        : option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  );
                },
              )}
            </div>

            <span className="mx-1 hidden h-4 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  "All",
                  "Machine",
                  "Report",
                  "Task",
                  "Maintenance",
                  "Component",
                  "Subscription",
                ] as const
              ).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(option);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === option
                      ? "border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/20"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="ml-auto flex gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => {
                  setReadFilter("all");
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  readFilter === "all"
                    ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setReadFilter("unread");
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  readFilter === "unread"
                    ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Unread
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-800/60">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
              <Inbox size={20} />
            </span>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No Notifications
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Nothing matches these filters right now.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {paged.map((notification) => {
              const severity = SEVERITY_META[notification.severity];
              const category = CATEGORY_META[notification.category];
              const SeverityIcon = severity.icon;
              const CategoryIcon = category.icon;

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      notification.read
                        ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800/60"
                        : "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5"
                    }`}
                  >
                    {!notification.read && (
                      <span
                        className={`absolute inset-y-0 left-0 w-1 ${severity.accentBar}`}
                      />
                    )}

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${severity.iconWrap}`}
                    >
                      <SeverityIcon size={18} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-800 dark:text-gray-100">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>

                      <p className="mt-0.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
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

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severity.badge}`}
                        >
                          {notification.severity}
                        </span>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${category.badge}`}
                        >
                          <CategoryIcon size={10} />
                          {notification.category}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-[8px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                            {getInitials(notification.actorName)}
                          </span>
                          {notification.actorRole}
                        </span>
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                          {getRelativeTime(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronDown size={15} />
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}