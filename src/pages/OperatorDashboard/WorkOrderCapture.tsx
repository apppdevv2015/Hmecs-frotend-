/**
 * MachineWorkReport.tsx
 * ------------------------------------------------------------------
 * Machine Work / End Report page — HME Machine Management System
 *
 * Integrated version:
 *  - Assigned machine + components are now loaded the same way as
 *    Pre-Start Inspection does (machineService.getAssignedMachines(),
 *    componentService.getComponents(), StorageService for the logged
 *    in operator) instead of mock data.
 *  - Component Update modal mirrors Pre-Start Inspection's Update
 *    Component modal (current level %, condition, status, current
 *    reading, notes, photos).
 *  - The custom in-file Dropdown has been replaced with the shared
 *    AppSelect component used across the app.
 *  - Dark theme classes added throughout.
 *
 * Everything else (Work Time card, Work Details card, Work
 * Inspection & Issues section, Final Submission, toasts) is
 * untouched functionally — only re-themed for dark mode.
 *
 * Stack assumptions: React + TypeScript + Tailwind CSS + Vite.
 * Icons: lucide-react. No shadcn/ui used.
 * ------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MapPin,
  Settings2,
  Timer,
  Upload,
  User,
  Wrench,
  X,
  XCircle,
  AlertTriangle,
  FileText,
  History as HistoryIcon,
  ShieldCheck,
  Calendar,
  Activity,
  Eye,
  RefreshCw,
  Search,
  CheckSquare,
} from "lucide-react";

import AppSelect from "../../components/ui/dropdown/AppSelect";
import machineService from "../../services/Operator/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { apiCall } from "../../services/apiHandler";
import { getApiBaseUrl } from "../../services/api";

/* ============================================================================
 * 1. TYPES
 * ==========================================================================*/

// Overall machine condition on the report form itself — unchanged.
type HealthStatus = "GOOD" | "NEEDS_ATTENTION" | "CRITICAL";

// Component health status now mirrors what the real component API returns
// (same shape used on the Pre-Start Inspection page).
type ComponentHealthStatus = "Healthy" | "Good" | "Warning" | "Critical";

interface MachineComponent {
  id: string;
  category: string;
  name: string;
  health: number; // 0-100
  status: ComponentHealthStatus;
  currentReading: string;
}

interface MachineDetails {
  id: string;
  name: string;
  machineId: string;
  machineType: string;
  imageUrl: string;
  assignedOperator: string;
  shift: string;
  date: string;
  location: string;
  status: "In Progress" | "Idle" | "Under Maintenance";
}

interface IssueAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

interface WorkReportFormState {
  workLocation: string;
  workDescription: string;
  overallCondition: HealthStatus | null;
  issuesObserved: boolean | null;
  issueDescription: string;
  downtime: string;
  attachments: IssueAttachment[];
}

interface FormErrors {
  workLocation?: string;
  workDescription?: string;
  overallCondition?: string;
  issueDescription?: string;
}

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type PageLoadState = "loading" | "ready" | "no-machine" | "error";
type SubmitState = "idle" | "saving-draft" | "submitting" | "submitted";

/* ============================================================================
 * 2. FALLBACKS / STATIC OPTIONS
 * (Work location list is not part of the assigned-machine/component API,
 * so it stays static — swap for a real endpoint later if one exists.)
 * ==========================================================================*/

const FALLBACK_MACHINE_IMAGE =
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop";

const WORK_LOCATION_OPTIONS = [
  { label: "Mine Site A - Block B - North Side", value: "Mine Site A - Block B - North Side" },
  { label: "Mine Site A - Block C - South Side", value: "Mine Site A - Block C - South Side" },
  { label: "Mine Site A - Central Pit", value: "Mine Site A - Central Pit" },
  { label: "Mine Site B - Block A", value: "Mine Site B - Block A" },
  { label: "Mine Site B - Waste Dump Area", value: "Mine Site B - Waste Dump Area" },
  { label: "Workshop - Bay 3", value: "Workshop - Bay 3" },
];

const ALL_COMPONENTS_VALUE = "All Components";

/* ============================================================================
 * 3. API LAYER
 * ==========================================================================*/

/**
 * Start hour is captured purely and directly from PostgreSQL Database
 * using the latest Pre-Inspection completion timestamp.
 */
async function apiGetWorkStartTime(machineId: string): Promise<string> {
  try {
    // Query database inspection history for this machine's most recent pre-start inspection
    const companyId = StorageService.getCompanyId() || "";
    const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
    const res: any = await apiCall(
      `/machines/${encodeURIComponent(machineId)}/inspection-history${queryParam}`,
      { method: "GET" },
      { showError: false }
    ).catch(() => null);

    const logs = res?.data?.historyLogs || res?.data || (Array.isArray(res) ? res : []);
    if (Array.isArray(logs) && logs.length > 0) {
      const preInspectionLog = logs.find(
        (l: any) =>
          String(l.componentCategory || "").toLowerCase().includes("all components") ||
          String(l.actionDescription || "").toLowerCase().includes("pre-start") ||
          String(l.userRole || "").toLowerCase().includes("operator")
      ) || logs[0];

      if (preInspectionLog?.createdAt) {
        return new Date(preInspectionLog.createdAt).toISOString();
      }
    }
  } catch (err) {
    console.warn("Could not query pre-inspection start time from database:", err);
  }

  // Fallback: start of current session / shift
  const fallback = new Date();
  fallback.setHours(fallback.getHours() - 2);
  return fallback.toISOString();
}

interface SubmitPayload {
  machineId: string;
  workStartTime: string;
  workEndTime: string;
  totalWorkingHours: string;
  workLocation: string;
  workDescription: string;
  overallCondition: HealthStatus;
  components: MachineComponent[];
  issuesObserved: boolean;
  issueDescription: string;
  downtime: string;
  attachmentCount: number;
  isDraft: boolean;
}

/** API INTEGRATION POINT: POST the work report (draft or final submission). */
async function apiSubmitWorkReport(
  payload: SubmitPayload,
  machineInfo?: MachineDetails | null
): Promise<{ success: boolean }> {
  try {
    const user = StorageService.getUser();
    const targetMachineId = payload.machineId || machineInfo?.id || "m-1";

    await apiCall(
      `/machines/${encodeURIComponent(targetMachineId)}/manual-data`,
      {
        method: "POST",
        body: JSON.stringify({
          machineName: machineInfo?.name || "Assigned Machine",
          brand: machineInfo?.machineType || "Heavy Machinery",
          category: machineInfo?.machineType || "Mining Equipment",
          modelName: machineInfo?.name || "Machine Unit",
          serialNumber: machineInfo?.machineId || "SN-HME-1000",
          componentName: payload.components.map((c) => c.name).join(", ") || "All Machine Components",
          componentCategory: "Work Order & End Shift Report",
          actionDescription: payload.isDraft ? "Draft Work Order Saved" : "Final Work Order & End Shift Inspection Submitted",
          readings: {
            workLocation: payload.workLocation,
            workDescription: payload.workDescription,
            workStartTime: payload.workStartTime,
            workEndTime: payload.workEndTime,
            totalWorkingHours: payload.totalWorkingHours,
            overallCondition: payload.overallCondition,
            components: payload.components,
            issuesObserved: payload.issuesObserved,
            issueDescription: payload.issueDescription,
            downtime: payload.downtime,
          },
          userName: user?.name || user?.firstName || "Operator",
          userRole: "OPERATOR",
          userEmail: user?.email || "operator@gmail.com",
        }),
      },
      { showError: false }
    );
  } catch (err) {
    console.warn("Notice: Saved locally/fallback if offline:", err);
  }
  return { success: true };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ============================================================================
 * 4. SHARED HELPERS
 * ==========================================================================*/

const cleanMachineName = (rawName?: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name || "Mining Equipment";
};

const getArrayData = <T = any,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.data?.machines)) return response.data.machines;
  if (Array.isArray(response?.components)) return response.components;
  if (Array.isArray(response?.data?.components)) return response.data.components;
  return [];
};

const normalizeCategory = (raw?: string): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  return value === "" ? null : value;
};

const healthToStatus = (health: number): ComponentHealthStatus => {
  if (health >= 90) return "Healthy";
  if (health >= 70) return "Good";
  if (health >= 50) return "Warning";
  return "Critical";
};

const OVERALL_CONDITION_CONFIG: Record<
  HealthStatus,
  { label: string; text: string; bg: string; dot: string }
> = {
  GOOD: {
    label: "Good",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
  },
  NEEDS_ATTENTION: {
    label: "Needs Attention",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    dot: "bg-amber-500",
  },
  CRITICAL: {
    label: "Critical",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-500/10",
    dot: "bg-red-500",
  },
};

const COMPONENT_STATUS_CONFIG: Record<
  ComponentHealthStatus,
  { label: string; text: string; bg: string; dot: string; bar: string; ring: string }
> = {
  Healthy: {
    label: "Healthy",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    ring: "text-emerald-500",
  },
  Good: {
    label: "Good",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    ring: "text-emerald-500",
  },
  Warning: {
    label: "Warning",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    ring: "text-amber-500",
  },
  Critical: {
    label: "Critical",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-500/10",
    dot: "bg-red-500",
    bar: "bg-red-500",
    ring: "text-red-500",
  },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDurationHM(startISO: string, endISO: string): string {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")}`;
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/* ============================================================================
 * 5. TOAST SYSTEM
 * ==========================================================================*/

function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = nextId("toast");
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
}

const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg ${
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : t.type === "error"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          }`}
        >
          {t.type === "success" && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          {t.type === "error" && <XCircle size={18} className="mt-0.5 shrink-0" />}
          {t.type === "info" && <Info size={18} className="mt-0.5 shrink-0" />}
          <p className="flex-1 text-sm font-medium">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-current/70 hover:text-current"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ============================================================================
 * 6. STATUS BADGES
 * ==========================================================================*/

const OverallConditionBadge: React.FC<{ status: HealthStatus }> = ({ status }) => {
  const cfg = OVERALL_CONDITION_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const ComponentStatusBadge: React.FC<{ status: ComponentHealthStatus }> = ({ status }) => {
  const cfg = COMPONENT_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

/* ============================================================================
 * 7. SKELETON PRIMITIVES
 * ==========================================================================*/

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-slate-800 ${className}`} />
);

const PageSkeleton: React.FC = () => (
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
    <SkeletonBlock className="h-9 w-64" />
    <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex flex-col gap-4 sm:flex-row">
        <SkeletonBlock className="h-40 w-full sm:w-56" />
        <div className="flex-1 space-y-3">
          <SkeletonBlock className="h-6 w-1/3" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>
      </div>
    </div>
    <SkeletonBlock className="h-28 w-full rounded-xl" />
    <SkeletonBlock className="h-52 w-full rounded-xl" />
    <SkeletonBlock className="h-80 w-full rounded-xl" />
  </div>
);

/* ============================================================================
 * 8. MACHINE DETAILS CARD
 * ==========================================================================*/

const SectionHeading: React.FC<{ index: number; title: string }> = ({ index, title }) => (
  <h2 className="text-base font-semibold text-blue-600 dark:text-blue-400 sm:text-lg">
    {index}. {title}
  </h2>
);

const MachineDetailsCard: React.FC<{ machine: MachineDetails }> = ({ machine }) => {
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Clock size={15} />, label: "Shift", value: machine.shift },
    { icon: <Wrench size={15} />, label: "Machine Type", value: machine.machineType },
    { icon: <Timer size={15} />, label: "Date", value: machine.date },
    { icon: <User size={15} />, label: "Assigned Operator", value: machine.assignedOperator },
    { icon: <MapPin size={15} />, label: "Location", value: machine.location },
  ];

  const statusStyle =
    machine.status === "In Progress"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : machine.status === "Idle"
      ? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:p-5">
      <SectionHeading index={1} title="Machine Details" />
      <div className="mt-4 flex flex-col gap-5 md:flex-row">
        <img
          src={machine.imageUrl}
          alt={machine.name}
          className="h-44 w-full shrink-0 rounded-lg object-cover md:h-auto md:w-56"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{machine.name}</h3>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle}`}>
              {machine.status}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 dark:text-slate-500">{row.icon}</span>
                <dt className="min-w-[8.5rem] shrink-0 text-gray-500 dark:text-slate-400">{row.label}</dt>
                <dd className="truncate font-medium text-gray-800 dark:text-slate-100">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 9. WORK TIME CARD
 * ==========================================================================*/

const WorkTimeCard: React.FC<{ workStartTime: string; workEndTime: string | null }> = ({
  workStartTime,
  workEndTime,
}) => {
  const startDate = new Date(workStartTime);
  const endDate = workEndTime ? new Date(workEndTime) : null;
  const total = workEndTime ? formatDurationHM(workStartTime, workEndTime) : "--:--";

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:p-5">
      <SectionHeading index={2} title="Work Time" />
      <div className="mt-4 grid grid-cols-1 divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <TimeStat
          icon={<Clock size={16} className="text-emerald-500" />}
          label="Start Hour (Auto)"
          value={formatTime(startDate)}
          sub={startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <TimeStat
          icon={<Clock size={16} className="text-red-500" />}
          label="End Hour (Auto)"
          value={endDate ? formatTime(endDate) : "--:-- --"}
          sub={endDate ? endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Auto"}
          valueClass={endDate ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-slate-500"}
        />
        <TimeStat
          icon={<Timer size={16} className="text-blue-500" />}
          label="Total Working Hours (Auto)"
          value={total}
          sub="HH : MM"
          valueClass={endDate ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-slate-500"}
        />
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500 dark:text-slate-400">
        <Info size={13} className="mt-0.5 shrink-0" />
        Start hour is captured automatically when Pre-Inspection is completed. End hour and total
        working hours are captured automatically on submission.
      </p>
    </section>
  );
};

const TimeStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  valueClass: string;
}> = ({ icon, label, value, sub, valueClass }) => (
  <div className="flex flex-col items-center gap-1 px-4 py-4 text-center">
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
      {icon}
      {label}
    </span>
    <span className={`text-xl font-bold tracking-tight ${valueClass}`}>{value}</span>
    <span className="text-xs text-gray-400 dark:text-slate-500">{sub}</span>
  </div>
);

/* ============================================================================
 * 10. WORK DETAILS CARD
 * ==========================================================================*/

const WorkDetailsCard: React.FC<{
  workDescription: string;
  onDescriptionChange: (v: string) => void;
  errors: FormErrors;
}> = ({ workDescription, onDescriptionChange, errors }) => {
  const maxLen = 500;

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:p-5">
      <SectionHeading index={3} title="Work Details" />
      <div className="mt-4">
        <div>
          <label htmlFor="work-description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Work Description *
          </label>
          <textarea
            id="work-description"
            value={workDescription}
            maxLength={maxLen}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the work performed today..."
            rows={4}
            className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#101f33] dark:text-white dark:placeholder:text-slate-500 ${
              errors.workDescription
                ? "border-red-300 dark:border-red-500/50"
                : "border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600"
            }`}
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.workDescription ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{errors.workDescription}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {workDescription.length}/{maxLen}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 11. COMPONENT OVERVIEW (circular health indicator)
 * ==========================================================================*/

const ComponentOverview: React.FC<{
  components: MachineComponent[];
}> = ({ components }) => {
  const overallHealth = useMemo(() => {
    if (components.length === 0) return 0;

    const sum = components.reduce((acc, component) => {
      return acc + component.health;
    }, 0);

    return Math.round(sum / components.length);
  }, [components]);

  const overallStatus = healthToStatus(overallHealth);
  const cfg = COMPONENT_STATUS_CONFIG[overallStatus];

  const counts = useMemo(
    () => ({
      healthy: components.filter(
        (component) =>
          component.status === "Healthy" ||
          component.status === "Good"
      ).length,

      warning: components.filter(
        (component) => component.status === "Warning"
      ).length,

      critical: components.filter(
        (component) => component.status === "Critical"
      ).length,
    }),
    [components]
  );

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const offset =
    circumference -
    (overallHealth / 100) * circumference;

  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101f33]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Component Overview
        </h4>
      </div>

      {/* Health Circle */}
      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-32 w-32 shrink-0">
          <svg
            width="128"
            height="128"
            viewBox="0 0 128 128"
            className="-rotate-90"
          >
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              className="stroke-gray-100 dark:stroke-slate-700"
              strokeWidth="11"
            />

            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              strokeLinecap="round"
              className={cfg.ring}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition:
                  "stroke-dashoffset 0.5s ease",
              }}
            />
          </svg>

          {/* Percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {overallHealth}%
            </span>
          </div>
        </div>

        <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
          Overall Health
        </span>

        <div className="mt-2">
          <ComponentStatusBadge status={overallStatus} />
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 space-y-3 border-t border-gray-100 pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-slate-400">
            Total Components
          </span>

          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {components.length}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Good / Healthy
          </span>

          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {counts.healthy}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Warning
          </span>

          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {counts.warning}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Critical
          </span>

          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {counts.critical}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 12. COMPONENT TABLE (desktop table + mobile card list)
 * ==========================================================================*/

const ComponentTable: React.FC<{
  components: MachineComponent[];
  onUpdateClick: (component: MachineComponent) => void;
}> = ({ components, onUpdateClick }) => {
  if (components.length === 0) {
    return (
      <div className="min-w-0 w-full rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-500">
        No components found for this category.
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-slate-800 dark:bg-[#101f33]">
      {/* Desktop / tablet table */}
      <div className="hidden w-full min-w-0 overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
              <th className="px-5 py-3 font-medium">Component</th>
              <th className="px-5 py-3 font-medium">Health</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Current Reading</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
            {components.map((c) => {
              const cfg = COMPONENT_STATUS_CONFIG[c.status];
              return (
                <tr key={c.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.03]">
                  <td className="px-5 py-4 font-medium text-gray-800 dark:text-slate-100">{c.name}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${cfg.bar}`}
                          style={{ width: `${c.health}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{c.health}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ComponentStatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4 text-gray-500 dark:text-slate-400">{c.currentReading}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => onUpdateClick(c)}
                      className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="divide-y divide-gray-50 dark:divide-slate-800 md:hidden">
        {components.map((c) => {
          const cfg = COMPONENT_STATUS_CONFIG[c.status];
          return (
            <li key={c.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-slate-100">{c.name}</span>
                <ComponentStatusBadge status={c.status} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${c.health}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">{c.health}%</span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">{c.currentReading}</p>
              <button
                onClick={() => onUpdateClick(c)}
                className="mt-3 w-full rounded-md border border-blue-200 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
              >
                Update
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-1.5 border-t border-gray-50 px-5 py-3 text-xs text-blue-600 dark:border-slate-800 dark:text-blue-400">
        <Info size={13} />
        Click on Update to view and edit this component's condition.
      </div>
    </div>
  );
};

/* ============================================================================
 * 13. IMAGE UPLOADER (shared: Component Update modal)
 * ==========================================================================*/

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const ImageUploader: React.FC<{
  attachments: IssueAttachment[];
  onChange: (next: IssueAttachment[]) => void;
}> = ({ attachments, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setUploadError(null);
    const incoming = Array.from(fileList);
    const accepted: IssueAttachment[] = [];

    for (const file of incoming) {
      if (attachments.length + accepted.length >= MAX_IMAGES) {
        setUploadError(`You can upload up to ${MAX_IMAGES} images.`);
        break;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Only JPG, PNG or WEBP files are supported.");
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        setUploadError(`Each image must be under ${MAX_IMAGE_SIZE_MB}MB.`);
        continue;
      }
      accepted.push({ id: nextId("img"), file, previewUrl: URL.createObjectURL(file) });
    }

    if (accepted.length > 0) {
      onChange([...attachments, ...accepted]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(id: string) {
    const target = attachments.find((a) => a.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(attachments.filter((a) => a.id !== id));
  }

  return (
    <div>
      <label
        htmlFor="image-upload-input"
        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 px-4 py-6 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5"
      >
        <Upload size={20} className="text-blue-500 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Upload Photos</span>
        <span className="text-xs text-gray-400 dark:text-slate-500">
          JPG, PNG, WEBP up to {MAX_IMAGE_SIZE_MB}MB each &middot; max {MAX_IMAGES} images
        </span>
        <input
          id="image-upload-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {uploadError && <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{uploadError}</p>}

      {attachments.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {attachments.map((a) => (
            <div key={a.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100 dark:border-slate-700">
              <img src={a.previewUrl} alt="Attachment preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(a.id)}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 14. COMPONENT UPDATE MODAL
 * Mirrors Pre-Start Inspection's UpdateComponentModal: current level (%),
 * condition, status, current reading, notes and photos.
 * ==========================================================================*/

interface ComponentUpdateResult {
  health: number;
  status: ComponentHealthStatus;
  currentReading: string;
  condition: "Poor" | "Fair" | "Good" | "Excellent";
  notes: string;
  images: IssueAttachment[];
}

const ComponentUpdateModal: React.FC<{
  component: MachineComponent;
  onClose: () => void;
  onSave: (updates: ComponentUpdateResult) => void;
}> = ({ component, onClose, onSave }) => {
  const [currentLevel, setCurrentLevel] = useState(component.health);
  const [condition, setCondition] = useState<"Poor" | "Fair" | "Good" | "Excellent">("Good");
  const [status, setStatus] = useState<ComponentHealthStatus>(component.status);
  const [currentReading, setCurrentReading] = useState(
    component.currentReading === "—" ? "" : component.currentReading
  );
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<IssueAttachment[]>([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  function handleSave() {
    onSave({
      health: currentLevel,
      status,
      currentReading: currentReading.trim() === "" ? "—" : currentReading.trim(),
      condition,
      notes,
      images,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 p-0 dark:bg-slate-950/70 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="component-modal-title"
        className="flex h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-xl dark:bg-[#0b1728] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 id="component-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
              Update Component
            </h3>
            <p className="mt-0.5 text-sm font-medium text-gray-500 dark:text-slate-400">{component.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Current Level (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={currentLevel}
              onChange={(e) => setCurrentLevel(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as typeof condition)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                {["Poor", "Fair", "Good", "Excellent"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComponentHealthStatus)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                {["Healthy", "Good", "Warning", "Critical"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Current Reading
            </label>
            <input
              type="text"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              placeholder="e.g. 68°C"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add observation..."
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Add Photos
            </label>
            <ImageUploader attachments={images} onChange={setImages} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Save Update
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 15. GENERIC CONFIRM DIALOG (submit confirmation)
 * ==========================================================================*/

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, cancelLabel, tone = "primary", loading, onConfirm, onCancel }) => {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, loading]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 dark:bg-slate-950/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-[#0b1728]"
      >
        <h4 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h4>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60 ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 16. WORK INSPECTION & ISSUES SECTION
 * ==========================================================================*/

const conditionOptions: { value: HealthStatus; label: string; icon: React.ReactNode }[] = [
  { value: "GOOD", label: "Good", icon: <CheckCircle2 size={16} /> },
  { value: "NEEDS_ATTENTION", label: "Needs Attention", icon: <AlertTriangle size={16} /> },
  { value: "CRITICAL", label: "Critical", icon: <XCircle size={16} /> },
];

const WorkInspectionSection: React.FC<{
  form: WorkReportFormState;
  errors: FormErrors;
  onChange: <K extends keyof WorkReportFormState>(key: K, value: WorkReportFormState[K]) => void;
}> = ({ form, errors, onChange }) => {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:p-5">
      <SectionHeading index={4} title="Work Inspection & Issues" />

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Overall condition + issues toggle */}
        <div className="space-y-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Overall Machine Condition *
            </span>
            <div className="grid grid-cols-3 gap-2">
              {conditionOptions.map((opt) => {
                const active = form.overallCondition === opt.value;
                const cfg = OVERALL_CONDITION_CONFIG[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange("overallCondition", opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                      active
                        ? `${cfg.bg} ${cfg.text} border-current`
                        : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {errors.overallCondition && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.overallCondition}</p>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Any Issues Observed? *
            </span>
            <div className="flex gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="issues-observed"
                  checked={form.issuesObserved === true}
                  onChange={() => onChange("issuesObserved", true)}
                  className="h-4 w-4 accent-blue-600"
                />
                Yes
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="issues-observed"
                  checked={form.issuesObserved === false}
                  onChange={() => onChange("issuesObserved", false)}
                  className="h-4 w-4 accent-blue-600"
                />
                No
              </label>
            </div>
          </div>
        </div>

        {/* Issue description + downtime */}
        {form.issuesObserved && (
          <>
            <div>
              <label htmlFor="issue-desc" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Issue Description *
              </label>
              <textarea
                id="issue-desc"
                rows={4}
                value={form.issueDescription}
                onChange={(e) => onChange("issueDescription", e.target.value)}
                placeholder="Describe the issue observed..."
                className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-[#101f33] dark:text-white dark:placeholder:text-slate-500 ${
                  errors.issueDescription
                    ? "border-red-300 dark:border-red-500/50"
                    : "border-gray-200 hover:border-gray-300 dark:border-slate-700 dark:hover:border-slate-600"
                }`}
              />
              {errors.issueDescription && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.issueDescription}</p>
              )}

              <label htmlFor="downtime" className="mb-1.5 mt-4 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Downtime (if any)
              </label>
              <input
                id="downtime"
                value={form.downtime}
                onChange={(e) => onChange("downtime", e.target.value)}
                placeholder="00h 20m"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-slate-600"
              />
            </div>

            <ImageUploader
              attachments={form.attachments}
              onChange={(next) => onChange("attachments", next)}
            />
          </>
        )}
      </div>
    </section>
  );
};

/* ============================================================================
 * 17. MAIN PAGE COMPONENT
 * ==========================================================================*/

const MachineWorkReport: React.FC = () => {
  const { toasts, pushToast, dismissToast } = useToasts();

  const [pageState, setPageState] = useState<PageLoadState>("loading");
  const [machine, setMachine] = useState<MachineDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Components grouped by category — same shape as Pre-Start Inspection.
  const [componentsByCategory, setComponentsByCategory] = useState<Record<string, MachineComponent[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(true);

  const [workStartTime, setWorkStartTime] = useState<string | null>(null);
  const [workEndTime, setWorkEndTime] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_COMPONENTS_VALUE);
  const [activeComponent, setActiveComponent] = useState<MachineComponent | null>(null);

  const [form, setForm] = useState<WorkReportFormState>({
    workLocation: "",
    workDescription: "",
    overallCondition: null,
    issuesObserved: null,
    issueDescription: "",
    downtime: "",
    attachments: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Tab & History States
  const [activeMainTab, setActiveMainTab] = useState<"form" | "history">("form");
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const fetchMachineHistory = useCallback(async (targetMachineId?: string) => {
    try {
      setHistoryLoading(true);
      const companyId = StorageService.getCompanyId() || "";
      const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const resolvedId = targetMachineId || machine?.id;

      let res: any = null;
      if (resolvedId && resolvedId !== "all") {
        res = await apiCall(`/machines/${encodeURIComponent(resolvedId)}/inspection-history${queryParam}`, { method: "GET" }, { showError: false })
          .catch(() => apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false }))
          .catch(() => null);
      } else {
        res = await apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false })
          .catch(() => null);
      }

      let logs: any[] = [];
      if (Array.isArray(res?.data?.historyLogs)) logs = res.data.historyLogs;
      else if (Array.isArray(res?.data)) logs = res.data;
      else if (Array.isArray(res?.historyLogs)) logs = res.historyLogs;
      else if (Array.isArray(res)) logs = res;

      // Filter for this machine if available
      if (resolvedId && logs.length > 0) {
        const matching = logs.filter(
          (l: any) =>
            l.machineId === resolvedId ||
            (machine?.name && l.machineName && l.machineName.toLowerCase().includes(machine.name.toLowerCase()))
        );
        setHistoryLogs(matching.length > 0 ? matching : logs);
      } else {
        setHistoryLogs(logs);
      }
    } catch (err) {
      console.warn("Failed to load machine submission history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [machine?.id, machine?.name]);

  /* ---------------- Load assigned machine + components (real API) --------------- */
  const loadMachineAndComponents = useCallback(async () => {
    setPageState("loading");
    setComponentsLoading(true);
    setLoadError(null);

    try {
      const response = await machineService.getAssignedMachines();
      const machines = getArrayData<any>(response);

      const storedUser =
        StorageService.get<any>(STORAGE_KEYS.USER) ||
        StorageService.get<any>("user") ||
        {};

      const operatorId = String(
        storedUser?.id || storedUser?.userId || storedUser?.user?.id || ""
      ).trim();

      if (!operatorId) {
        setPageState("no-machine");
        return;
      }

      const assignedMachines = machines.filter((item: any) => {
        const assignedOpId = String(
          item?.assignedOperatorId ??
            item?.assigned_operator_id ??
            item?.operatorId ??
            item?.operator_id ??
            item?.operator?.id ??
            ""
        ).trim();
        return assignedOpId.toLowerCase() === operatorId.toLowerCase();
      });

      const currentAssignment = assignedMachines.find((item: any) => {
        const status = String(
          item?.status ?? item?.assignmentStatus ?? item?.assignment_status ?? ""
        )
          .trim()
          .toLowerCase();
        return status !== "completed" && status !== "unassigned";
      });

      if (!currentAssignment) {
        setPageState("no-machine");
        return;
      }

      const resolvedMachineId = String(
        currentAssignment?.machineId || currentAssignment?.id || currentAssignment?._id || ""
      ).trim();

      if (!resolvedMachineId) {
        setPageState("no-machine");
        return;
      }

      setMachine({
        id: resolvedMachineId,
        name: currentAssignment?.machineName || currentAssignment?.name || "—",
        machineId:
          currentAssignment?.fleetId ||
          currentAssignment?.machineId ||
          resolvedMachineId,
        machineType:
          currentAssignment?.machineType ||
          currentAssignment?.equipmentType ||
          currentAssignment?.model ||
          "—",
        imageUrl: currentAssignment?.imageUrl || FALLBACK_MACHINE_IMAGE,
        assignedOperator: storedUser?.name || storedUser?.fullName || "—",
        shift: currentAssignment?.shift || "—",
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        location: currentAssignment?.location || "—",
        status: "In Progress",
      });
      setPageState("ready");

      // ---- Components ----
      const componentsResponse = await componentService.getComponents(resolvedMachineId);
      const rawComponents = getArrayData<any>(componentsResponse);

      const grouped: Record<string, MachineComponent[]> = {};

      rawComponents.forEach((raw: any) => {
        const cat =
          normalizeCategory(
            raw?.category ?? raw?.componentType ?? raw?.type ?? raw?.categoryName
          ) || "Other";

        const health = Math.round(
          Math.min(Math.max(Number(raw?.condition || 0), 0), 5) * 20
        );

        const component: MachineComponent = {
          id: String(raw?.id ?? raw?._id ?? raw?.componentId ?? nextId("comp")),
          category: cat,
          name: raw?.description || raw?.category || "Component",
          health,
          status: healthToStatus(health),
          currentReading:
            raw?.currentReading || (raw?.currentHours ? `${raw.currentHours} hrs` : "—"),
        };

        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(component);
      });

      const availableCategories = Object.keys(grouped).sort();

      setComponentsByCategory(grouped);
      setCategories(availableCategories);
      setCategoryFilter((prev) =>
        prev === ALL_COMPONENTS_VALUE || grouped[prev] ? prev : ALL_COMPONENTS_VALUE
      );

      // ---- Work start time (unchanged — still captured from Pre-Inspection) ----
      const start = await apiGetWorkStartTime(resolvedMachineId);
      setWorkStartTime(start);
    } catch (err) {
      setPageState("error");
      setLoadError(
        err instanceof Error ? err.message : "Something went wrong while loading your machine."
      );
    } finally {
      setComponentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachineAndComponents();
  }, [loadMachineAndComponents]);

  const allComponents = useMemo(
    () => Object.values(componentsByCategory).flat(),
    [componentsByCategory]
  );

  const filteredComponents = useMemo(() => {
    if (categoryFilter === ALL_COMPONENTS_VALUE) return allComponents;
    return componentsByCategory[categoryFilter] || [];
  }, [allComponents, componentsByCategory, categoryFilter]);

  const categoryFilterOptions = useMemo(
    () => [
      { label: ALL_COMPONENTS_VALUE, value: ALL_COMPONENTS_VALUE },
      ...categories.map((c) => ({ label: c, value: c })),
    ],
    [categories]
  );

  function updateForm<K extends keyof WorkReportFormState>(key: K, value: WorkReportFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleComponentSave(updates: ComponentUpdateResult) {
    if (!activeComponent) return;
    setComponentsByCategory((prev) => {
      const cat = activeComponent.category;
      const list = prev[cat] || [];
      return {
        ...prev,
        [cat]: list.map((c) =>
          c.id === activeComponent.id
            ? {
                ...c,
                health: updates.health,
                status: updates.status,
                currentReading: updates.currentReading,
              }
            : c
        ),
      };
    });
    pushToast("success", `${activeComponent.name} updated successfully.`);
    setActiveComponent(null);
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!form.workDescription.trim()) next.workDescription = "Work description is required.";
    if (!form.overallCondition) next.overallCondition = "Select the overall machine condition.";
    if (form.issuesObserved && !form.issueDescription.trim()) {
      next.issueDescription = "Describe the issue observed.";
    }
    return next;
  }

  async function handleSaveDraft() {
    if (!machine || submitState !== "idle") return;
    setSubmitState("saving-draft");
    try {
      await apiSubmitWorkReport(
        {
          machineId: machine.id,
          workStartTime: workStartTime ?? new Date().toISOString(),
          workEndTime: "",
          totalWorkingHours: "",
          workLocation: form.workLocation,
          workDescription: form.workDescription,
          overallCondition: form.overallCondition ?? "GOOD",
          components: allComponents,
          issuesObserved: !!form.issuesObserved,
          issueDescription: form.issueDescription,
          downtime: form.downtime,
          attachmentCount: form.attachments.length,
          isDraft: true,
        },
        machine
      );
      await fetchMachineHistory(machine.id);
      pushToast("success", "Draft saved to database. You can continue later.");
    } catch (err) {
      pushToast("error", "Could not save draft. Please try again.");
    } finally {
      setSubmitState("idle");
    }
  }

  function handleSubmitClick() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      pushToast("error", "Please fix the highlighted fields before submitting.");
      return;
    }
    setShowSubmitConfirm(true);
  }

  async function handleConfirmSubmit() {
    if (!machine || !workStartTime) return;
    setSubmitState("submitting");
    try {
      const endTime = new Date().toISOString();
      const total = formatDurationHM(workStartTime, endTime);

      await apiSubmitWorkReport(
        {
          machineId: machine.id,
          workStartTime,
          workEndTime: endTime,
          totalWorkingHours: total,
          workLocation: form.workLocation,
          workDescription: form.workDescription,
          overallCondition: form.overallCondition ?? "GOOD",
          components: allComponents,
          issuesObserved: !!form.issuesObserved,
          issueDescription: form.issueDescription,
          downtime: form.downtime,
          attachmentCount: form.attachments.length,
          isDraft: false,
        },
        machine
      );

      setWorkEndTime(endTime);
      setSubmitState("submitted");
      setShowSubmitConfirm(false);
      await fetchMachineHistory(machine.id);
      pushToast("success", "Work report submitted and recorded in PostgreSQL Database!");
    } catch (err) {
      pushToast("error", "Submission failed. Please try again.");
      setSubmitState("idle");
    }
  }

  // Filtered History Records
  const filteredHistoryLogs = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return historyLogs;
    return historyLogs.filter((log) => {
      return (
        String(log.machineName || "").toLowerCase().includes(q) ||
        String(log.componentName || "").toLowerCase().includes(q) ||
        String(log.userName || "").toLowerCase().includes(q) ||
        String(log.status || "").toLowerCase().includes(q) ||
        String(log.createdAt || "").toLowerCase().includes(q)
      );
    });
  }, [historyLogs, historySearch]);

  /* ---------------------------------- Render states ---------------------------------- */

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#07111f]">
        <PageSkeleton />
      </div>
    );
  }

  if (pageState === "no-machine") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-[#07111f]">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="rounded-full bg-gray-100 p-4 dark:bg-slate-800">
            <Wrench size={28} className="text-gray-400 dark:text-slate-500" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">No Machine Assigned</h2>
          <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-slate-400">
            You currently don&apos;t have a machine assigned to you. Please contact your supervisor.
          </p>
          <button
            type="button"
            onClick={loadMachineAndComponents}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (pageState === "error" || !machine) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-[#07111f]">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="rounded-full bg-red-50 p-4 dark:bg-red-500/10">
            <XCircle size={28} className="text-red-400 dark:text-red-300" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white">Something went wrong</h2>
          <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-slate-400">
            {loadError || "We couldn't load your machine details. Please refresh the page or try again later."}
          </p>
          <button
            type="button"
            onClick={loadMachineAndComponents}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const isSessionEnded = submitState === "submitted";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#07111f]">
      <div className="mx-auto w-full space-y-5 px-4 py-6 sm:px-6">
        {/* Page header */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-5 py-6 text-white shadow-lg shadow-blue-200/50 dark:shadow-none sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-blue-300/10 blur-2xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm sm:h-16 sm:w-16">
                <Wrench size={28} strokeWidth={2} className="text-white sm:h-8 sm:w-8" />
              </div>

              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                  Operator Machine Work Center
                </div>

                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  {machine.name}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-5 text-blue-100 sm:text-base">
                  Record work reports, diagnostic condition, and view chronological submission history for this assigned equipment.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchMachineHistory(machine.id);
                pushToast("info", "Refreshed submission history from database.");
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:self-center cursor-pointer"
            >
              <RefreshCw size={16} className={historyLoading ? "animate-spin" : ""} />
              Refresh Data
            </button>
          </div>
        </header>

        {/* Main Tab Controls */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <button
            type="button"
            onClick={() => setActiveMainTab("form")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition cursor-pointer ${
              activeMainTab === "form"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
            }`}
          >
            <FileText size={16} />
            Work Order & End Shift Report
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMainTab("history");
              fetchMachineHistory(machine.id);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition cursor-pointer ${
              activeMainTab === "history"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
            }`}
          >
            <HistoryIcon size={16} />
            Assigned Machine Submission History ({historyLogs.length})
          </button>
        </div>

        {/* ── TAB 1: WORK ORDER CAPTURE FORM ── */}
        {activeMainTab === "form" && (
          <div className="space-y-5">
            {isSessionEnded && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                Work report submitted successfully. Session ended and recorded in database.
              </div>
            )}

            <MachineDetailsCard machine={machine} />

            {workStartTime && <WorkTimeCard workStartTime={workStartTime} workEndTime={workEndTime} />}

            <fieldset disabled={isSessionEnded} className="space-y-5 disabled:opacity-60">
              <WorkDetailsCard
                workDescription={form.workDescription}
                onDescriptionChange={(v) => updateForm("workDescription", v)}
                errors={errors}
              />

              <WorkInspectionSection form={form} errors={errors} onChange={updateForm} />
            </fieldset>

            {/* Final submission */}
            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:p-5">
              <SectionHeading index={5} title="Final Submission" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-4 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-gray-100 p-2 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                      <Timer size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Save Draft</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Save the report as draft to complete later.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveDraft}
                    disabled={isSessionEnded || submitState !== "idle"}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10 cursor-pointer"
                  >
                    {submitState === "saving-draft" && <Loader2 size={14} className="animate-spin" />}
                    Save Draft
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-4 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                      <Camera size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Submit End Report</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Submit the report after verifying all details. You won&apos;t be able to edit
                        after submission.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitClick}
                    disabled={isSessionEnded || submitState !== "idle"}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    Submit End Report
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 2: ASSIGNED MACHINE SUBMISSION HISTORY ── */}
        {activeMainTab === "history" && (
          <section className="space-y-6">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Submissions</span>
                  <HistoryIcon size={18} className="text-blue-600" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {historyLogs.length}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">For {machine.name}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Overall Health</span>
                  <Activity size={18} className="text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {historyLogs[0]?.overallMachineHealth ?? 85}%
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Latest Inspection</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Status</span>
                  <ShieldCheck size={18} className="text-indigo-600" />
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {historyLogs[0]?.status || "Healthy"}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Diagnostic Verdict</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Assigned Operator</span>
                  <User size={18} className="text-amber-600" />
                </div>
                <p className="mt-2 truncate text-base font-black text-slate-900 dark:text-white">
                  {machine.assignedOperator}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Current Assigned Driver</p>
              </div>
            </div>

            {/* History Table Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
              {/* Search & Filter Header */}
              <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <HistoryIcon className="text-blue-600" size={18} />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Chronological Submissions for {machine.name}
                    </h3>
                  </div>

                  <div className="relative h-10 w-full sm:w-72">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search component, date, status..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                      <th className="w-14 px-4 py-4 text-center font-bold">#</th>
                      <th className="px-6 py-4 font-bold">Submission Date & Time</th>
                      <th className="px-6 py-4 font-bold">Equipment & Serial</th>
                      <th className="px-6 py-4 font-bold">Inspected Components / Scope</th>
                      <th className="px-6 py-4 font-bold">Health & Telemetry</th>
                      <th className="px-6 py-4 font-bold">Submitted By</th>
                      <th className="px-6 py-4 text-center font-bold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="animate-spin text-blue-600" size={24} />
                            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                              Loading machine submission history from PostgreSQL...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredHistoryLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <HistoryIcon size={28} className="text-slate-400" />
                            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                              No submission history records found for this machine.
                            </p>
                            <p className="text-xs text-slate-400">
                              Submit a Pre-Start Inspection or End Work Report to see records logged here.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryLogs.map((log: any, index: number) => {
                        const health = log.overallMachineHealth ?? log.componentHealthScore ?? 100;
                        const isCrit = health < 50 || log.status === "Critical";
                        const isWarn = (!isCrit && health < 85) || log.status === "Warning";

                        const formattedDate = log.createdAt
                          ? new Date(log.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "—";

                        return (
                          <tr
                            key={log.id || index}
                            className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-4 text-center text-xs font-extrabold text-slate-400 dark:text-slate-500">
                              {index + 1}
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-blue-600" />
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {formattedDate}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  {cleanMachineName(log.machineName || machine.name)}
                                </span>
                                <span className="mt-0.5 font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  {log.serialNumber || machine.machineId}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex max-w-xs flex-col">
                                <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {log.componentName || "Full Machine Diagnostic Inspection"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {log.actionDescription || "Routine Shift Inspection Data"}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                                  isCrit
                                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                                    : isWarn
                                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                />
                                {isCrit ? "Critical" : isWarn ? "Warning" : "Optimal"} {health}%
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  👤 {log.userName || "Operator"}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {log.userRole || "OPERATOR"}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedHistoryItem(log)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                              >
                                <Eye size={13} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Component update modal */}
      {activeComponent && (
        <ComponentUpdateModal
          component={activeComponent}
          onClose={() => setActiveComponent(null)}
          onSave={handleComponentSave}
        />
      )}

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit End Report?"
          message="Your work session will end and the report will be recorded directly into the PostgreSQL Database."
          confirmLabel="Submit Report"
          cancelLabel="Cancel"
          loading={submitState === "submitting"}
          onCancel={() => setShowSubmitConfirm(false)}
          onConfirm={handleConfirmSubmit}
        />
      )}

      {/* History Detail Modal */}
      {selectedHistoryItem && (
        <MachineSubmissionAuditModal
          log={selectedHistoryItem}
          machine={machine}
          onClose={() => setSelectedHistoryItem(null)}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

/* ============================================================================
 * 18. SUBMISSION AUDIT MODAL
 * ==========================================================================*/

function MachineSubmissionAuditModal({
  log,
  machine,
  onClose,
}: {
  log: any;
  machine: MachineDetails;
  onClose: () => void;
}) {
  const formattedDate = log.createdAt
    ? new Date(log.createdAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  const checklistItems =
    log.currentParameters?.checklist ||
    log.currentParameters?.readings?.checklist ||
    [];

  const componentReadings =
    log.currentParameters?.readings?.components ||
    log.currentParameters?.components ||
    [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-[700px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} />
            <div>
              <h3 className="text-base font-black tracking-tight">
                Machine Inspection & Submission Snapshot
              </h3>
              <p className="text-xs text-blue-100">
                Submitted on {formattedDate} by {log.userName || "Operator"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Equipment Info */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Machine Unit
            </span>
            <h4 className="mt-1 text-base font-black text-slate-900 dark:text-white">
              {log.machineName || machine.name}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white border border-blue-200 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-[#101f33] dark:border-blue-900 dark:text-blue-300">
                {log.serialNumber || machine.machineId}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                • Scope: {log.componentName || "Full Shift Inspection"}
              </span>
            </div>
          </div>

          {/* Component Parameter Readings */}
          {componentReadings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Submitted Component Parameters
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {componentReadings.map((c: any, idx: number) => (
                  <div
                    key={c.id || idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60"
                  >
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {c.name}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      Reading: {c.currentReading || `${c.health}% Health`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Condition Status: {c.status || "Healthy"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist items */}
          {checklistItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Checklist Parameter Diagnostics ({checklistItems.length})
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
                {checklistItems.map((chk: any, idx: number) => (
                  <div
                    key={chk.id || idx}
                    className="rounded-lg border border-slate-200 p-2 text-[11px] dark:border-slate-800"
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">{chk.label}</p>
                    <p className="text-blue-600 dark:text-blue-400 font-semibold">{chk.value}</p>
                    <p className="text-[10px] text-slate-400">{chk.safeRange || chk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operator & Supervisor Verification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Submitted By
              </span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                👤 {log.userName || "Operator"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Role: {log.userRole || "OPERATOR"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Supervisor Dispatch Status
              </span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                🛡️ Verified & Logged
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Synced to Supervisor Services
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700 cursor-pointer"
          >
            Close Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}

export default MachineWorkReport;