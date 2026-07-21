"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  BellRing,
  RefreshCw,
  Cpu,
  Droplets,
  SlidersHorizontal,
  Circle,
  MapPin,
  Calendar,
  Clock,
  User,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — Real API se yahi shape aani chahiye
// ─────────────────────────────────────────────────────────────────────────────

type ComponentCondition = 1 | 2 | 3 | 4 | 5;
// 1–2 = Healthy | 3 = Moderate | 4 = Warning | 5 = Critical

type ComponentCategory = "Engine" | "Hydraulics" | "Suspension" | "Tyre";

interface MachineComponent {
  id: string;
  category: ComponentCategory;
  name: string;
  serialNumber: string;
  currentHours: number;
  plannedLife: number;
  condition: ComponentCondition;
  lastServicedAt: string; // ISO 8601
  nextServiceDue: number; // hours
}

interface AssignedMachine {
  machineId: string;
  machineName: string;
  model: string;
  operatorId: string;
  operatorName: string;
  siteLocation: string;
  assignedAt: string; // ISO 8601
  components: MachineComponent[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API — Sirf is function ki body replace karo jab real API aaye
// ─────────────────────────────────────────────────────────────────────────────

const fetchAssignedMachine = async (_operatorId: string): Promise<ApiResponse<AssignedMachine>> => {
  // ── Real API lagani ho to sirf yahan replace karo ──────────────────────
  // const res = await fetch(`/api/v1/operators/${_operatorId}/machine`, {
  //   headers: { Authorization: `Bearer ${getToken()}` },
  // });
  // if (!res.ok) throw new Error("Failed to fetch machine data");
  // return res.json();
  // ────────────────────────────────────────────────────────────────────────

  await new Promise((r) => setTimeout(r, 900));

  return {
    success: true,
    message: "Machine data fetched successfully",
    timestamp: new Date().toISOString(),
    data: {
      machineId: "MCH-4821",
      machineName: "Excavator Unit 4",
      model: "CAT 320D",
      operatorId: "OPR-091",
      operatorName: "Rajan Singh",
      siteLocation: "Site B – North Sector",
      assignedAt: "2025-01-10T08:00:00Z",
      components: [
        {
          id: "engine",
          category: "Engine",
          name: "Engine",
          serialNumber: "ENG-7741",
          currentHours: 4850,
          plannedLife: 5000,
          condition: 5,
          lastServicedAt: "2024-09-15T00:00:00Z",
          nextServiceDue: 5000,
        },
        {
          id: "hydraulic",
          category: "Hydraulics",
          name: "Hydraulic system",
          serialNumber: "HYD-3302",
          currentHours: 3750,
          plannedLife: 4000,
          condition: 5,
          lastServicedAt: "2024-10-20T00:00:00Z",
          nextServiceDue: 4000,
        },
        {
          id: "suspension",
          category: "Suspension",
          name: "Suspension",
          serialNumber: "SUS-1194",
          currentHours: 2100,
          plannedLife: 4000,
          condition: 4,
          lastServicedAt: "2024-12-01T00:00:00Z",
          nextServiceDue: 2500,
        },
        {
          id: "tyre",
          category: "Tyre",
          name: "Tyres",
          serialNumber: "TYR-8820",
          currentHours: 1200,
          plannedLife: 5000,
          condition: 2,
          lastServicedAt: "2025-01-05T00:00:00Z",
          nextServiceDue: 2500,
        },
      ],
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

const useOperatorAlerts = (operatorId: string) => {
  const [machine, setMachine] = useState<AssignedMachine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage("");
      try {
        const res = await fetchAssignedMachine(operatorId);
        if (!cancelled) {
          if (res.success) setMachine(res.data);
          else throw new Error(res.message);
        }
      } catch (err) {
        if (!cancelled) {
          setIsError(true);
          setErrorMessage(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [operatorId, trigger]);

  return {
    machine,
    isLoading,
    isError,
    errorMessage,
    refetch: () => setTrigger((t) => t + 1),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

type SeverityLevel = "critical" | "warning" | "moderate" | "healthy";

const getSeverity = (c: ComponentCondition): SeverityLevel => {
  if (c === 5) return "critical";
  if (c === 4) return "warning";
  if (c === 3) return "moderate";
  return "healthy";
};

const getSeverityLabel = (c: ComponentCondition) =>
  ({ 5: "Critical", 4: "Warning", 3: "Moderate", 2: "Good", 1: "Excellent" })[c];

const severityStyles: Record<
  SeverityLevel,
  {
    leftBorder: string;
    iconBg: string;
    iconColor: string;
    badge: string;
    bar: string;
    pct: string;
    dot: string;
    heading: string;
  }
> = {
  critical: {
    leftBorder: "border-l-[3px] border-l-red-500",
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconColor: "text-red-500 dark:text-red-400",
    badge:
      "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    bar: "bg-red-500",
    pct: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    heading: "text-red-600 dark:text-red-400",
  },
  warning: {
    leftBorder: "border-l-[3px] border-l-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-500 dark:text-amber-400",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    bar: "bg-amber-400",
    pct: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
    heading: "text-amber-600 dark:text-amber-400",
  },
  moderate: {
    leftBorder: "border-l-[3px] border-l-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-500 dark:text-blue-400",
    badge:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    bar: "bg-blue-400",
    pct: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-400",
    heading: "text-blue-600 dark:text-blue-400",
  },
  healthy: {
    leftBorder: "border-l-[3px] border-l-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    bar: "bg-emerald-500",
    pct: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    heading: "text-emerald-600 dark:text-emerald-400",
  },
};

const CATEGORY_ICONS: Record<ComponentCategory, React.ReactNode> = {
  Engine: <Cpu className="h-[17px] w-[17px]" />,
  Hydraulics: <Droplets className="h-[17px] w-[17px]" />,
  Suspension: <SlidersHorizontal className="h-[17px] w-[17px]" />,
  Tyre: <Circle className="h-[17px] w-[17px]" />,
};

const fmtHours = (h: number) => `${h.toLocaleString("en-IN")} hrs`;
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const lifePercent = (cur: number, planned: number) =>
  Math.min(100, Math.round((cur / planned) * 100));

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3 animate-pulse">
    <div className="flex items-start justify-between gap-2">
      <div className="flex gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/60" />
      <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-800/60" />
    </div>
    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
    <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
  </div>
);

const PageSkeleton = () => (
  <div className="flex flex-col gap-5 p-4 sm:p-5">
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 animate-pulse flex flex-col gap-3">
      <div className="flex justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="flex gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col gap-2 animate-pulse"
        >
          <div className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-800" />
          <div className="h-5 w-5 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-2 w-12 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────────────────────────────────────────

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="m-4 sm:m-5 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-6 flex flex-col items-center gap-3 text-center">
    <div className="rounded-full bg-red-100 dark:bg-red-500/20 p-2.5">
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-900 dark:text-white">
        Failed to load machine data
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message}</p>
    </div>
    <button
      onClick={onRetry}
      className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
    >
      <RefreshCw className="h-3 w-3" /> Retry
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CARD
// ─────────────────────────────────────────────────────────────────────────────

const ComponentAlertCard = ({ component }: { component: MachineComponent }) => {
  const sev = getSeverity(component.condition);
  const s = severityStyles[sev];
  const pct = lifePercent(component.currentHours, component.plannedLife);
  const rem = Math.max(0, component.plannedLife - component.currentHours);

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${s.leftBorder} p-4 flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 rounded-lg p-2 shrink-0 ${s.iconBg} ${s.iconColor}`}>
            {CATEGORY_ICONS[component.category]}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
              {component.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {component.category} · {component.serialNumber}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.badge}`}>
          {getSeverityLabel(component.condition)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Current hours
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {fmtHours(component.currentHours)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Planned life
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
            {fmtHours(component.plannedLife)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Life consumed</span>
          <span className={`text-[11px] font-semibold ${s.pct}`}>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {fmtHours(rem)} remaining
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Next svc: {fmtHours(component.nextServiceDue)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-100 dark:border-slate-800">
        <Clock className="h-3 w-3 text-slate-400 shrink-0" />
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Last serviced: {fmtDate(component.lastServicedAt)}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT SECTION
// ─────────────────────────────────────────────────────────────────────────────

const AlertSection = ({
  label,
  components,
  severity,
}: {
  label: string;
  components: MachineComponent[];
  severity: SeverityLevel;
}) => {
  if (!components.length) return null;
  const s = severityStyles[severity];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-0.5">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${s.heading}`}>
          {label} ({components.length})
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {components.map((c) => (
          <ComponentAlertCard key={c.id} component={c} />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CHIP
// ─────────────────────────────────────────────────────────────────────────────

const SummaryChip = ({
  icon,
  count,
  label,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  iconBg: string;
  iconColor: string;
}) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 flex flex-col gap-2">
    <div className={`w-fit rounded-md p-1.5 ${iconBg} ${iconColor}`}>{icon}</div>
    <p className="text-lg font-semibold text-slate-900 dark:text-white leading-none">{count}</p>
    <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// Usage: <OperatorAlerts operatorId="OPR-091" />
// operatorId auth context ya route params se pass karo
// ─────────────────────────────────────────────────────────────────────────────

const OperatorAlerts = ({ operatorId = "OPR-091" }: { operatorId?: string }) => {
  const { machine, isLoading, isError, errorMessage, refetch } = useOperatorAlerts(operatorId);

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState message={errorMessage} onRetry={refetch} />;
  if (!machine) return null;

  const { components } = machine;
  const critical = components.filter((c) => c.condition === 5);
  const warning = components.filter((c) => c.condition === 4);
  const moderate = components.filter((c) => c.condition === 3);
  const healthy = components.filter((c) => c.condition <= 2);
  const allClear = critical.length === 0 && warning.length === 0;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-5 py-5 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.35)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        {/* Premium Glow Effects */}
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-[100px]" />

        <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-blue-500/20 blur-[90px]" />

        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[100px]" />

        <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-white/5 blur-[70px]" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                <BellRing size={13} />
                Component Alerts
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-white">
                {machine.machineName}
              </h1>

              <p className="mt-1 text-sm text-blue-100">
                {machine.model} • {machine.machineId}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <BellRing className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4">
            <span className="flex items-center gap-1.5 text-xs text-blue-100">
              <MapPin className="h-3.5 w-3.5" />
              {machine.siteLocation}
            </span>

            <span className="flex items-center gap-1.5 text-xs text-blue-100">
              <User className="h-3.5 w-3.5" />
              {machine.operatorName}
            </span>

            <span className="flex items-center gap-1.5 text-xs text-blue-100">
              <Calendar className="h-3.5 w-3.5" />
              Assigned {fmtDate(machine.assignedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-4 gap-2">
        <SummaryChip
          icon={<AlertTriangle className="h-4 w-4" />}
          count={critical.length}
          label="Critical"
          iconBg="bg-red-50 dark:bg-red-500/10"
          iconColor="text-red-500 dark:text-red-400"
        />
        <SummaryChip
          icon={<AlertCircle className="h-4 w-4" />}
          count={warning.length}
          label="Warning"
          iconBg="bg-amber-50 dark:bg-amber-500/10"
          iconColor="text-amber-500 dark:text-amber-400"
        />
        <SummaryChip
          icon={<CheckCircle2 className="h-4 w-4" />}
          count={healthy.length + moderate.length}
          label="Healthy"
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryChip
          icon={<Cpu className="h-4 w-4" />}
          count={components.length}
          label="Total"
          iconBg="bg-blue-50 dark:bg-blue-500/10"
          iconColor="text-blue-500 dark:text-blue-400"
        />
      </div>

      {/* All clear state */}
      {allClear && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-5 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            All components healthy
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No critical or warning alerts on this machine
          </p>
        </div>
      )}

      {/* Sections — empty ones auto hide */}
      <AlertSection label="Critical" components={critical} severity="critical" />
      <AlertSection label="Warning" components={warning} severity="warning" />
      <AlertSection label="Moderate" components={moderate} severity="moderate" />
      <AlertSection label="Healthy" components={healthy} severity="healthy" />
    </div>
  );
};

export default OperatorAlerts;
