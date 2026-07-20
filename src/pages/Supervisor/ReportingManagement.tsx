import { useState, useEffect, useCallback } from "react";
import AppSelect from "../../components/ui/dropdown/AppSelect";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════
type Role = "supervisor" | "artisan" | "operator";
type Page = "reports" | "history";
type ToastType = "success" | "error" | "warning" | "info";

interface Report {
  id: string;
  title: string;
  type: "daily" | "weekly" | "incident" | "maintenance";
  status: "pending" | "reviewed" | "approved" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  submittedBy: string;
  role: Role;
  date: string;
  shift: "morning" | "evening" | "night";
  description: string;
  tags: string[];
}

interface HistoryEntry {
  id: string;
  reportId: string;
  reportTitle: string;
  action: "submitted" | "reviewed" | "approved" | "rejected" | "updated";
  performedBy: string;
  performedByRole: Role;
  fromStatus?: Report["status"];
  toStatus?: Report["status"];
  timestamp: string;
  date: string;
  note?: string;
}

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
}

const CURRENT_SUPERVISOR: { name: string; role: Role } = {
  name: "Rohit Mehta",
  role: "supervisor",
};

const DB: { reports: Report[]; history: HistoryEntry[] } = {
  reports: [
    {
      id: "RPT-2401",
      title: "Morning Shift Production Summary",
      type: "daily",
      status: "pending",
      priority: "high",
      submittedBy: "Rajesh Kumar",
      role: "operator",
      date: "2025-06-10",
      shift: "morning",
      description:
        "Production line A operated at 94% efficiency. Minor belt misalignment detected in conveyor unit C-3 at 09:45. Operator manually corrected. Output: 1,240 units. Downtime: 18 minutes.",
      tags: ["Line-A", "Conveyor", "Output"],
    },
    {
      id: "RPT-2402",
      title: "Pump Station Maintenance Log",
      type: "maintenance",
      status: "reviewed",
      priority: "medium",
      submittedBy: "Amit Singh",
      role: "artisan",
      date: "2025-06-10",
      shift: "morning",
      description:
        "Scheduled maintenance on Pump P-07 completed. Seal replaced, bearing lubricated. Vibration levels back within tolerance. Next service due: 2025-07-10.",
      tags: ["Pump-P07", "Maintenance", "Seal"],
    },
    {
      id: "RPT-2403",
      title: "Pressure Valve Incident Report",
      type: "incident",
      status: "pending",
      priority: "critical",
      submittedBy: "Suresh Patel",
      role: "operator",
      date: "2025-06-10",
      shift: "evening",
      description:
        "Pressure relief valve V-12 triggered at 14:32. System pressure reached 8.4 bar (limit: 8.0 bar). Immediate shutdown initiated. Root cause under investigation.",
      tags: ["Valve-V12", "Incident", "Pressure", "Shutdown"],
    },
    {
      id: "RPT-2404",
      title: "Weekly Equipment Health Report",
      type: "weekly",
      status: "approved",
      priority: "medium",
      submittedBy: "Priya Sharma",
      role: "artisan",
      date: "2025-06-09",
      shift: "morning",
      description:
        "All 14 critical equipment units passed weekly inspection. Temperature sensors on units T-03 and T-07 showing drift — calibration scheduled for Monday. Overall health score: 87/100.",
      tags: ["Inspection", "Sensors", "Calibration"],
    },
    {
      id: "RPT-2405",
      title: "Night Shift Handover Report",
      type: "daily",
      status: "reviewed",
      priority: "low",
      submittedBy: "Vikram Rao",
      role: "operator",
      date: "2025-06-09",
      shift: "night",
      description:
        "Uneventful night shift. Production maintained at 88% capacity. Line B paused for 35 minutes due to material supply delay. All safety checks completed. No incidents to report.",
      tags: ["Night-Shift", "Line-B", "Handover"],
    },
    {
      id: "RPT-2406",
      title: "Electrical System Inspection",
      type: "maintenance",
      status: "rejected",
      priority: "high",
      submittedBy: "Deepak Verma",
      role: "artisan",
      date: "2025-06-08",
      shift: "morning",
      description:
        "Inspection report returned for revision. Panel board E-05 thermal readings incomplete. Requires additional data points from IR scan before approval can be granted.",
      tags: ["Electrical", "Panel-E05", "IR-Scan"],
    },
  ],
  history: [
    {
      id: "H-001",
      reportId: "RPT-2404",
      reportTitle: "Weekly Equipment Health Report",
      action: "approved",
      performedBy: CURRENT_SUPERVISOR.name,
      performedByRole: "supervisor",
      fromStatus: "reviewed",
      toStatus: "approved",
      timestamp: "11:42 AM",
      date: "2025-06-09",
      note: "All checks passed. Approved for record.",
    },
    {
      id: "H-002",
      reportId: "RPT-2404",
      reportTitle: "Weekly Equipment Health Report",
      action: "reviewed",
      performedBy: CURRENT_SUPERVISOR.name,
      performedByRole: "supervisor",
      fromStatus: "pending",
      toStatus: "reviewed",
      timestamp: "10:15 AM",
      date: "2025-06-09",
    },
    {
      id: "H-003",
      reportId: "RPT-2404",
      reportTitle: "Weekly Equipment Health Report",
      action: "submitted",
      performedBy: "Priya Sharma",
      performedByRole: "artisan",
      toStatus: "pending",
      timestamp: "09:00 AM",
      date: "2025-06-09",
    },
    {
      id: "H-004",
      reportId: "RPT-2406",
      reportTitle: "Electrical System Inspection",
      action: "rejected",
      performedBy: CURRENT_SUPERVISOR.name,
      performedByRole: "supervisor",
      fromStatus: "reviewed",
      toStatus: "rejected",
      timestamp: "03:30 PM",
      date: "2025-06-08",
      note: "Incomplete IR scan data. Return for revision.",
    },
    {
      id: "H-005",
      reportId: "RPT-2406",
      reportTitle: "Electrical System Inspection",
      action: "reviewed",
      performedBy: CURRENT_SUPERVISOR.name,
      performedByRole: "supervisor",
      fromStatus: "pending",
      toStatus: "reviewed",
      timestamp: "01:00 PM",
      date: "2025-06-08",
    },
    {
      id: "H-006",
      reportId: "RPT-2406",
      reportTitle: "Electrical System Inspection",
      action: "submitted",
      performedBy: "Deepak Verma",
      performedByRole: "artisan",
      toStatus: "pending",
      timestamp: "08:30 AM",
      date: "2025-06-08",
    },
    {
      id: "H-007",
      reportId: "RPT-2402",
      reportTitle: "Pump Station Maintenance Log",
      action: "reviewed",
      performedBy: CURRENT_SUPERVISOR.name,
      performedByRole: "supervisor",
      fromStatus: "pending",
      toStatus: "reviewed",
      timestamp: "02:15 PM",
      date: "2025-06-10",
    },
    {
      id: "H-008",
      reportId: "RPT-2402",
      reportTitle: "Pump Station Maintenance Log",
      action: "submitted",
      performedBy: "Amit Singh",
      performedByRole: "artisan",
      toStatus: "pending",
      timestamp: "10:50 AM",
      date: "2025-06-10",
    },
    {
      id: "H-009",
      reportId: "RPT-2401",
      reportTitle: "Morning Shift Production Summary",
      action: "submitted",
      performedBy: "Rajesh Kumar",
      performedByRole: "operator",
      toStatus: "pending",
      timestamp: "08:05 AM",
      date: "2025-06-10",
    },
    {
      id: "H-010",
      reportId: "RPT-2403",
      reportTitle: "Pressure Valve Incident Report",
      action: "submitted",
      performedBy: "Suresh Patel",
      performedByRole: "operator",
      toStatus: "pending",
      timestamp: "02:40 PM",
      date: "2025-06-10",
    },
  ],
};

// Simulated API calls with artificial network delay (mimic real API)
const api = {
  getReports: (): Promise<Report[]> =>
    new Promise((res) => setTimeout(() => res([...DB.reports]), 700)),

  getHistory: (): Promise<HistoryEntry[]> =>
    new Promise((res) => setTimeout(() => res([...DB.history]), 600)),

  updateReportStatus: (
    id: string,
    status: Report["status"],
    actor: { name: string; role: Role },
    note?: string,
  ): Promise<{ report: Report; historyEntry: HistoryEntry }> =>
    new Promise((res, rej) => {
      setTimeout(() => {
        const idx = DB.reports.findIndex((r) => r.id === id);
        if (idx === -1) return rej(new Error("Report not found"));
        const old = DB.reports[idx];
        const updated: Report = { ...old, status };
        DB.reports[idx] = updated;
        const now = new Date();
        const entry: HistoryEntry = {
          id: `H-${Date.now()}`,
          reportId: id,
          reportTitle: old.title,
          action: status as HistoryEntry["action"],
          performedBy: actor.name,
          performedByRole: actor.role,
          fromStatus: old.status,
          toStatus: status,
          timestamp: now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: now.toISOString().split("T")[0],
          note: note || undefined,
        };
        DB.history.unshift(entry);
        res({ report: updated, historyEntry: entry });
      }, 800); // simulated latency
    }),
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIG MAPS
// ════════════════════════════════════════════════════════════════════════════
const STATUS_CFG = {
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    border: "border-amber-200",
  },
  reviewed: {
    label: "Reviewed",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
    border: "border-blue-200",
  },
  approved: {
    label: "Approved",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
    border: "border-red-200",
  },
};

const PRIORITY_CFG = {
  low: { label: "Low", bg: "bg-slate-100", text: "text-slate-600" },
  medium: { label: "Medium", bg: "bg-blue-100", text: "text-blue-700" },
  high: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
  critical: { label: "Critical", bg: "bg-red-100", text: "text-red-700" },
};

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string }> = {
  supervisor: {
    label: "Supervisor",
    color: "text-blue-800",
    bg: "bg-blue-100",
  },
  artisan: {
    label: "Artisan",
    color: "text-orange-700",
    bg: "bg-orange-100",
  },
  operator: {
    label: "Operator",
    color: "text-indigo-700",
    bg: "bg-indigo-100",
  },
};

const ACTION_CFG: Record<
  HistoryEntry["action"],
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    dot: string;
    border: string;
  }
> = {
  submitted: {
    label: "Submitted",
    icon: "📤",
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
  reviewed: {
    label: "Reviewed",
    icon: "🔍",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    border: "border-blue-200",
  },
  approved: {
    label: "Approved",
    icon: "✅",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: "❌",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    border: "border-red-200",
  },
  updated: {
    label: "Updated",
    icon: "✏️",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
    border: "border-purple-200",
  },
};

const TYPE_ICONS: Record<string, string> = {
  daily: "📋",
  weekly: "📊",
  incident: "⚠️",
  maintenance: "🔧",
};

const TOAST_CFG: Record<
  ToastType,
  { icon: string; bar: string; bg: string; title: string; border: string }
> = {
  success: {
    icon: "✅",
    bar: "bg-emerald-500",
    bg: "bg-white",
    title: "text-emerald-700",
    border: "border-emerald-200",
  },
  error: {
    icon: "❌",
    bar: "bg-red-500",
    bg: "bg-white",
    title: "text-red-700",
    border: "border-red-200",
  },
  warning: {
    icon: "⚠️",
    bar: "bg-amber-400",
    bg: "bg-white",
    title: "text-amber-700",
    border: "border-amber-200",
  },
  info: {
    icon: "ℹ️",
    bar: "bg-blue-500",
    bg: "bg-white",
    title: "text-blue-700",
    border: "border-blue-200",
  },
};

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const typeOptions = [
  { label: "All Types", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Incident", value: "incident" },
  { label: "Maintenance", value: "maintenance" },
];

const roleOptions = [
  { label: "All Submitters", value: "all" },
  { label: "Artisan", value: "artisan" },
  { label: "Operator", value: "operator" },
];

// Supervisor has full authority on any report that isn't already finalized.
const canAct = (status: Report["status"]) =>
  status === "pending" || status === "reviewed";

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE — BADGE COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
function StatusBadge({ status }: { status: Report["status"] }) {
  const c = STATUS_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Report["priority"] }) {
  const c = PRIORITY_CFG[priority];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}
    >
      {priority === "critical" && <span className="mr-1">🔴</span>}
      {c.label}
    </span>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const c = ROLE_CFG[role];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.color}`}
    >
      {c.label}
    </span>
  );
}

function ActionBadge({ action }: { action: HistoryEntry["action"] }) {
  const c = ACTION_CFG[action];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE — STAT CARD
// ════════════════════════════════════════════════════════════════════════════
function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  loading = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-800 leading-none">
              {value}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            {sub && (
              <p className="text-xs text-blue-500 mt-1 font-medium">{sub}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE — SKELETON ROWS
// ════════════════════════════════════════════════════════════════════════════
function SkeletonRow() {
  return (
    <tr className="border-b border-blue-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-4 hidden lg:table-cell">
        <div className="h-5 w-16 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-3.5 w-20 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-3.5 w-10 bg-slate-100 rounded animate-pulse" />
      </td>
    </tr>
  );
}

function SkeletonHistoryCard() {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
        <div
          className="w-0.5 flex-1 bg-slate-100 mt-1"
          style={{ minHeight: 24 }}
        />
      </div>
      <div className="flex-1 rounded-xl border border-slate-100 bg-white p-4">
        <div className="flex justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-4 w-52 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE — EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════
function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: string;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-4 border border-blue-100">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE — TOAST SYSTEM
// ════════════════════════════════════════════════════════════════════════════
function ToastItemView({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const c = TOAST_CFG[toast.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg border overflow-hidden min-w-[300px] max-w-sm transition-all duration-300 ${c.border} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar}`} />
      <div className="flex items-start gap-3 px-4 py-3 pl-5 w-full">
        <span className="text-lg flex-shrink-0 mt-0.5">{c.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${c.title}`}>{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5 text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItemView key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback(
    (id: string) => setToasts((p) => p.filter((t) => t.id !== id)),
    [],
  );
  const push = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `T-${Date.now()}`;
      setToasts((p) => [...p, { id, type, title, message }]);
    },
    [],
  );
  return { toasts, dismiss, push };
}

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE — CONFIRM DIALOG
// ════════════════════════════════════════════════════════════════════════════
function ConfirmDialog({
  config,
  onCancel,
  loading,
}: {
  config: ConfirmConfig;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-xl flex-shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {config.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {config.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white text-slate-600 hover:bg-slate-100 text-sm font-semibold border border-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={config.onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 min-w-[100px] justify-center ${config.confirmClass} disabled:opacity-60`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              config.confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SPINNER
// ════════════════════════════════════════════════════════════════════════════
function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <span
      className={`${s} border-2 border-current border-t-transparent rounded-full animate-spin inline-block`}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT DETAIL MODAL (Supervisor actions: Mark Reviewed / Approve / Reject)
// ════════════════════════════════════════════════════════════════════════════
function ReportModal({
  report,
  onClose,
  onAction,
}: {
  report: Report;
  onClose: () => void;
  onAction: (
    id: string,
    status: Report["status"],
    note?: string,
  ) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null);

  const runAction = async (status: Report["status"]) => {
    setSubmitting(true);
    await onAction(report.id, status, note);
    setSubmitting(false);
    setConfirm(null);
    onClose();
  };

  const handleAction = (status: Report["status"]) => {
    if (status === "rejected") {
      setConfirm({
        title: "Reject this report?",
        message: `You are about to reject "${report.title}". This will be logged in the activity history and ${report.submittedBy} will need to resubmit.`,
        confirmLabel: "Yes, Reject",
        confirmClass: "bg-red-600 hover:bg-red-700",
        onConfirm: () => runAction("rejected"),
      });
    } else if (status === "approved") {
      setConfirm({
        title: "Approve this report?",
        message: `You are about to approve "${report.title}" as final. This action will be recorded in the activity history.`,
        confirmLabel: "Yes, Approve",
        confirmClass: "bg-emerald-600 hover:bg-emerald-700",
        onConfirm: () => runAction("approved"),
      });
    } else {
      runAction(status);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[999999] flex items-center justify-center overflow-y-auto p-6"
        style={{ backgroundColor: "rgba(15,23,42,0.55)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-blue-100">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-blue-50">
            <div className="flex items-start gap-3">
              <span className="text-3xl mt-0.5">{TYPE_ICONS[report.type]}</span>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">
                  {report.title}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {report.id} · {report.date}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors ml-4 flex-shrink-0 disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 px-6 pt-4">
            <StatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
            <RoleBadge role={report.role} />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
              🕐 {report.shift} shift
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 px-6 pt-4">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">
                Submitted By
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {report.submittedBy}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">
                Report Type
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-1 capitalize">
                {report.type}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="px-6 pt-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">
              Description
            </p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
              {report.description}
            </p>
          </div>

          {/* Tags */}
          <div className="px-6 pt-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {report.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Note input — visible whenever supervisor can act on this report */}
          {canAct(report.status) && (
            <div className="px-6 pt-4">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">
                Remark / Note{" "}
                <span className="normal-case text-slate-300">(optional)</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a remark that will be saved in the activity log…"
                rows={2}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm border border-blue-100 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none placeholder-slate-300 disabled:opacity-60"
              />
            </div>
          )}

          {/* Action footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-5 mt-2 border-t border-blue-50">
            {report.status === "pending" && (
              <>
                <button
                  onClick={() => handleAction("rejected")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-semibold border border-red-200 transition-colors disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction("reviewed")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-semibold border border-blue-200 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Spinner />
                      Processing…
                    </>
                  ) : (
                    "Mark Reviewed"
                  )}
                </button>
                <button
                  onClick={() => handleAction("approved")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
                >
                  Approve Directly
                </button>
              </>
            )}

            {report.status === "reviewed" && (
              <>
                <button
                  onClick={() => handleAction("rejected")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-semibold border border-red-200 transition-colors disabled:opacity-60"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction("approved")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Spinner />
                      Processing…
                    </>
                  ) : (
                    "Approve Report"
                  )}
                </button>
              </>
            )}

            {!canAct(report.status) && (
              <p className="text-xs text-slate-400 italic">
                Final decision already recorded for this report
              </p>
            )}

            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          config={confirm}
          onCancel={() => setConfirm(null)}
          loading={submitting}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT TABLE ROW
// ════════════════════════════════════════════════════════════════════════════
function ReportRow({
  report,
  onClick,
}: {
  report: Report;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-blue-50 hover:bg-blue-50/60 cursor-pointer transition-colors group"
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="text-xl flex-shrink-0">
            {TYPE_ICONS[report.type]}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight">
              {report.title}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{report.id}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <p className="text-sm text-slate-700 font-medium">
          {report.submittedBy}
        </p>
        <RoleBadge role={report.role} />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <PriorityBadge priority={report.priority} />
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={report.status} />
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell text-sm text-slate-400">
        {report.date}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-blue-400 hover:text-blue-600 text-sm font-medium group-hover:underline">
          View →
        </span>
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY CARD (timeline)
// ════════════════════════════════════════════════════════════════════════════
function HistoryCard({
  entry,
  isLast,
  onClick,
}: {
  entry: HistoryEntry;
  isLast: boolean;
  onClick: (entry: HistoryEntry) => void;
}) {
  const a = ACTION_CFG[entry.action];
  return (
    <div
      className="flex gap-4 cursor-pointer group"
      onClick={() => onClick(entry)}
    >
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2 border-white shadow-sm ${a.bg}`}
        >
          {a.icon}
        </div>
        {!isLast && (
          <div
            className="w-0.5 flex-1 bg-blue-100 mt-1"
            style={{ minHeight: 24 }}
          />
        )}
      </div>
      <div
        className={`flex-1 rounded-xl border p-4 mb-4 ${entry.action === "approved" ? "border-emerald-100 bg-emerald-50/30" : entry.action === "rejected" ? "border-red-100 bg-red-50/20" : "border-blue-100 bg-white"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-slate-800">
              {entry.reportTitle}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{entry.reportId}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ActionBadge action={entry.action} />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {entry.date} · {entry.timestamp}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {entry.performedBy.charAt(0)}
            </div>
            <span className="text-xs text-slate-600 font-medium">
              {entry.performedBy}
            </span>
          </div>
          <RoleBadge role={entry.performedByRole} />
          {entry.fromStatus && entry.toStatus && (
            <div className="flex items-center gap-1.5 ml-auto">
              <StatusBadge status={entry.fromStatus} />
              <span className="text-slate-300 text-xs font-bold">→</span>
              <StatusBadge status={entry.toStatus} />
            </div>
          )}
          {!entry.fromStatus && entry.toStatus && (
            <div className="ml-auto">
              <StatusBadge status={entry.toStatus} />
            </div>
          )}
        </div>
        {entry.note && (
          <div className="mt-3 px-3 py-2 bg-white rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Note:</span>{" "}
              {entry.note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ════════════════════════════════════════════════════════════════════════════
function ReportsPage({
  reports,
  loading,
  onAction,
}: {
  reports: Report[];
  loading: boolean;
  onAction: (
    id: string,
    status: Report["status"],
    note?: string,
  ) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Report | null>(null);
  const [filterStatus, setFS] = useState("all");
  const [filterType, setFT] = useState("all");
  const [filterRole, setFR] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "critical">(
    "all",
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const approvedCount = reports.filter((r) => r.status === "approved").length;
  const criticalCount = reports.filter((r) => r.priority === "critical").length;

  const filtered = reports.filter((r) => {
    if (activeTab === "pending" && r.status !== "pending") return false;
    if (activeTab === "critical" && r.priority !== "critical") return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterRole !== "all" && r.role !== filterRole) return false;
    const q = search.toLowerCase();
    if (
      q &&
      !r.title.toLowerCase().includes(q) &&
      !r.submittedBy.toLowerCase().includes(q) &&
      !r.id.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const hasFilters =
    filterStatus !== "all" ||
    filterType !== "all" ||
    filterRole !== "all" ||
    !!search;
  const clearFilters = () => {
    setFS("all");
    setFT("all");
    setFR("all");
    setSearch("");
  };

  return (
    <div>
      {/* Page header */}
      <div className="relative mb-6 overflow-hidden rounded-[28px] border border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 shadow-sm">
        {/* Decorative Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2 text-xs text-blue-100">
            <span>Supervisor</span>
            <span>›</span>
            <span className="font-semibold text-white">Report Approvals</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Report Approvals
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                Reports submitted by your Artisans & Operators, awaiting your
                review
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                Live
              </span>

              <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-blue-100 backdrop-blur-sm">
                {CURRENT_SUPERVISOR.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Reports"
          value={reports.length}
          sub="This month"
          icon="📋"
          color="bg-blue-50"
          loading={loading}
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          sub="Needs your action"
          icon="⏳"
          color="bg-amber-50"
          loading={loading}
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          sub="Completed"
          icon="✅"
          color="bg-emerald-50"
          loading={loading}
        />
        <StatCard
          label="Critical Priority"
          value={criticalCount}
          sub="Immediate action"
          icon="🚨"
          color="bg-red-50"
          loading={loading}
        />
      </div>

      {/* Main table card */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center border-b border-blue-50 px-4 pt-1">
          {(["all", "pending", "critical"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 transition-colors mr-1 ${activeTab === tab ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-700"}`}
            >
              {tab === "all"
                ? "All Reports"
                : tab === "pending"
                  ? `Pending (${pendingCount})`
                  : `Critical (${criticalCount})`}
            </button>
          ))}
        </div>

        {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/70 border-b border-blue-50">
          <div className="flex-1 min-w-0 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by title, ID, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm border border-blue-100 rounded-lg bg-white text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <AppSelect
            className="w-[140px]"
            value={filterStatus}
            onChange={setFS}
            options={statusOptions}
          />

          <AppSelect
            className="w-[140px]"
            value={filterType}
            onChange={setFT}
            options={typeOptions}
          />

          <AppSelect
            className="w-[170px]"
            value={filterRole}
            onChange={setFR}
            options={roleOptions}
          />

          <span className="ml-auto whitespace-nowrap text-xs text-slate-400 font-medium">
            {filtered.length} reports
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-50/50">
                {[
                  "Report",
                  "Submitted By",
                  "Priority",
                  "Status",
                  "Date",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left text-xs font-bold text-blue-600 uppercase tracking-wider ${i === 1 ? "hidden md:table-cell" : i === 2 ? "hidden lg:table-cell" : i === 4 ? "hidden sm:table-cell" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={hasFilters ? "🔎" : "📭"}
                      title={
                        hasFilters
                          ? "No reports match your filters"
                          : "No reports yet"
                      }
                      message={
                        hasFilters
                          ? "Try adjusting the filters or clearing your search to see more results."
                          : "Reports submitted by artisans and operators will appear here."
                      }
                      action={
                        hasFilters
                          ? {
                              label: "Clear all filters",
                              onClick: clearFilters,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <ReportRow
                    key={r.id}
                    report={r}
                    onClick={() => setSelected(r)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-blue-50 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-600">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-600">
                {reports.length}
              </span>{" "}
              reports
            </p>
            <p className="text-xs text-slate-400">Last synced: just now</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 px-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Legend:
        </p>
        {Object.entries(STATUS_CFG).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${val.dot}`} />
            <span className="text-xs text-slate-500">{val.label}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-slate-400">
          <span className="font-semibold text-blue-800">Supervisor</span>
          {" · "}
          Full review, approve & reject authority on all reports
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <ReportModal
          report={selected}
          onClose={() => setSelected(null)}
          onAction={async (id, status, note) => {
            await onAction(id, status, note);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY PAGE
// ════════════════════════════════════════════════════════════════════════════
function HistoryDetailModal({
  entry,
  report,
  onClose,
}: {
  entry: HistoryEntry;
  report?: Report;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {entry.reportTitle}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{entry.reportId}</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Action</p>
              <div className="mt-2">
                <ActionBadge action={entry.action} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Date & Time</p>
              <p className="text-sm font-semibold text-slate-700 mt-2">
                {entry.date} · {entry.timestamp}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Performed By</p>
              <p className="text-sm font-semibold text-slate-700 mt-2">
                {entry.performedBy}
              </p>
              <div className="mt-2">
                <RoleBadge role={entry.performedByRole} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase">Status Change</p>

              <div className="flex items-center gap-2 mt-2">
                {entry.fromStatus && <StatusBadge status={entry.fromStatus} />}

                <span>→</span>

                {entry.toStatus && <StatusBadge status={entry.toStatus} />}
              </div>
            </div>
          </div>

          {report?.description && (
            <div>
              <p className="text-xs text-slate-400 uppercase mb-2">
                Description
              </p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {report.description}
                </p>
              </div>
            </div>
          )}

          {entry.note && (
            <div>
              <p className="text-xs text-slate-400 uppercase mb-2">Note</p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {entry.note}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryPage({
  history,
  reports,
  loading,
}: {
  history: HistoryEntry[];
  reports: Report[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [filterAction, setFilterAction] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [groupBy, setGroupBy] = useState<"date" | "report">("date");

  const dates = [...new Set(history.map((h) => h.date))].sort((a, b) =>
    b.localeCompare(a),
  );

  const filtered = history.filter((h) => {
    if (filterAction !== "all" && h.action !== filterAction) return false;
    if (filterRole !== "all" && h.performedByRole !== filterRole) return false;
    if (filterDate !== "all" && h.date !== filterDate) return false;
    const q = search.toLowerCase();
    if (
      q &&
      !h.reportTitle.toLowerCase().includes(q) &&
      !h.reportId.toLowerCase().includes(q) &&
      !h.performedBy.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const hasFilters =
    filterAction !== "all" ||
    filterRole !== "all" ||
    filterDate !== "all" ||
    !!search;
  const clearFilters = () => {
    setFilterAction("all");
    setFilterRole("all");
    setFilterDate("all");
    setSearch("");
  };

  const grouped: Record<string, HistoryEntry[]> = {};
  filtered.forEach((h) => {
    const key =
      groupBy === "date" ? h.date : `${h.reportId}|||${h.reportTitle}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  });
  const groupKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const approvedCount = history.filter((h) => h.action === "approved").length;
  const rejectedCount = history.filter((h) => h.action === "rejected").length;
  const reviewedCount = history.filter((h) => h.action === "reviewed").length;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>Supervisor</span>
          <span>›</span>
          <span className="text-blue-600 font-medium">Activity History</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Activity History
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Complete audit trail of every review, approval and rejection
              you've made
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
            🗂️ {history.length} total entries
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Actions"
          value={history.length}
          sub="All time"
          icon="🗂️"
          color="bg-blue-50"
          loading={loading}
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          sub="Successfully done"
          icon="✅"
          color="bg-emerald-50"
          loading={loading}
        />
        <StatCard
          label="Reviewed"
          value={reviewedCount}
          sub="Checked"
          icon="🔍"
          color="bg-sky-50"
          loading={loading}
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          sub="Returned"
          icon="❌"
          color="bg-red-50"
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm mb-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-blue-50">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by report, ID, or person…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-blue-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder-slate-300"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-sm border border-blue-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600"
          >
            <option value="all">All Actions</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm border border-blue-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600"
          >
            <option value="all">All Roles</option>
            <option value="supervisor">Supervisor</option>
            <option value="artisan">Artisan</option>
            <option value="operator">Operator</option>
          </select>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 text-sm border border-blue-100 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600"
          >
            <option value="all">All Dates</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="flex bg-blue-50 rounded-lg p-0.5 border border-blue-100">
            {(["date", "report"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${groupBy === g ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-blue-700"}`}
              >
                By {g}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50/50 border-b border-blue-50">
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600">
              {filtered.length}
            </span>{" "}
            entries found
          </p>
        </div>

        {/* Timeline */}
        <div className="px-6 py-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonHistoryCard key={i} />
            ))
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={hasFilters ? "🔎" : "🗂️"}
              title={
                hasFilters ? "No entries match your filters" : "No activity yet"
              }
              message={
                hasFilters
                  ? "Try changing the filters to find what you're looking for."
                  : "When you review, approve, or reject reports, the activity will appear here."
              }
              action={
                hasFilters
                  ? { label: "Clear all filters", onClick: clearFilters }
                  : undefined
              }
            />
          ) : (
            groupKeys.map((gKey) => {
              const entries = grouped[gKey];
              const displayLabel =
                groupBy === "date" ? gKey : gKey.split("|||")[1];
              return (
                <div key={gKey} className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-blue-100" />
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold whitespace-nowrap">
                      {displayLabel}
                    </span>
                    <span className="text-xs text-slate-400">
                      {entries.length} action{entries.length > 1 ? "s" : ""}
                    </span>
                    <div className="h-px flex-1 bg-blue-100" />
                  </div>
                  {entries.map((entry, idx) => (
                    <HistoryCard
                      key={entry.id}
                      entry={entry}
                      isLast={idx === entries.length - 1}
                      onClick={setSelectedEntry}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedEntry && (
        <HistoryDetailModal
          entry={selectedEntry}
          report={reports.find((r) => r.id === selectedEntry.reportId)}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP — Supervisor Report Approvals
// ════════════════════════════════════════════════════════════════════════════
export default function SupervisorReportApprovals() {
  const [activePage, setActivePage] = useState<Page>("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { toasts, dismiss, push } = useToast();

  // Fetch reports on mount (simulated API)
  useEffect(() => {
    setLoadingReports(true);
    api.getReports().then((data) => {
      setReports(data);
      setLoadingReports(false);
    });
  }, []);

  // Fetch history on mount
  useEffect(() => {
    setLoadingHistory(true);
    api.getHistory().then((data) => {
      setHistory(data);
      setLoadingHistory(false);
    });
  }, []);

  const handleAction = useCallback(
    async (id: string, status: Report["status"], note?: string) => {
      try {
        const { report: updated, historyEntry } = await api.updateReportStatus(
          id,
          status,
          CURRENT_SUPERVISOR,
          note,
        );
        setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setHistory((prev) => [historyEntry, ...prev]);

        const labels: Record<Report["status"], string> = {
          approved: "Report Approved",
          rejected: "Report Rejected",
          reviewed: "Report Marked as Reviewed",
          pending: "Report Updated",
        };
        const types: Record<Report["status"], ToastType> = {
          approved: "success",
          rejected: "error",
          reviewed: "info",
          pending: "info",
        };
        push(
          types[status],
          labels[status],
          `"${updated.title}" has been ${status} successfully.`,
        );
      } catch {
        push(
          "error",
          "Action Failed",
          "Something went wrong. Please try again.",
        );
      }
    },
    [push],
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Reports / History Switch */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex justify-end">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setActivePage("reports")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                activePage === "reports"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm">📋</span>
              Reports
              {pendingCount > 0 && (
                <span
                  className={`ml-1 min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full flex items-center justify-center ${
                    activePage === "reports"
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActivePage("history")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                activePage === "history"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm">🕘</span>
              History
            </button>
          </div>
        </div>
      </div>

      {/* ── Page ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {activePage === "reports" ? (
          <ReportsPage
            reports={reports}
            loading={loadingReports}
            onAction={handleAction}
          />
        ) : (
          <HistoryPage
            history={history}
            reports={reports}
            loading={loadingHistory}
          />
        )}
      </div>

      {/* ── Toast Container ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
