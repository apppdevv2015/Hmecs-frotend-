import { useEffect, useState } from "react";

import machineService from "../../services/Operator/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";


import { Link } from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Gauge,
  RefreshCw,
  Settings2,
  ShieldAlert,
  TimerReset,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import MachineHealthChart from "../../components/operator/MachineHealthChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiComponent = {
  id: string;
  machineId: string;
  category: string;
  description: string;
  serialNumber: string;
  supplier?: string;
  installHours?: number;
  currentHours?: number;
  plannedLife?: number;
  replacementCost?: string | number;
  condition?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ApiMachine = {
  machineId: string;
  machineName: string;
  machineType: string;
  fleetId: string;
  hoursRun?: number;
};

type ComponentCondition = "Healthy" | "Warning" | "Critical";

type RiskLevel = "Low" | "Medium" | "High";

const formatNumber = (value?: number | string) => {
  const numberValue = Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(numberValue);
};

const getConditionStatus = (condition?: number): ComponentCondition => {
  const value = Number(condition || 0);
  if (value >= 4) return "Healthy";
  if (value === 3) return "Warning";
  return "Critical";
};

const getArrayData = <T = any,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getRiskLevel = (condition?: number): RiskLevel => {
  const value = Number(condition || 0);
  if (value >= 4) return "Low";
  if (value === 3) return "Medium";
  return "High";
};

const getConditionBadgeClass = (condition: ComponentCondition) => {
  switch (condition) {
    case "Healthy":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20";
    case "Warning":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20";
    case "Critical":
      return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300";
  }
};

const getRiskBadgeClass = (risk: RiskLevel) => {
  switch (risk) {
    case "Low":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20";
    case "Medium":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20";
    case "High":
      return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300";
  }
};

const getRemainingLife = (component: ApiComponent) => {
  const plannedLife = Number(component.plannedLife || 0);
  const currentHours = Number(component.currentHours || 0);
  if (!plannedLife) return 0;
  return Math.max(plannedLife - currentHours, 0);
};

const getOverallHealth = (components: ApiComponent[]) => {
  if (!components.length) return 0;
  const total = components.reduce((sum, component) => {
    const condition = Number(component.condition || 0);
    return sum + Math.min(Math.max(condition, 0), 5) * 20;
  }, 0);
  return Math.round(total / components.length);
};

// Normalizes a raw component API record (snake_case / camelCase fallback) into ApiComponent
const normalizeComponent = (raw: any): ApiComponent => ({
  id: String(
    raw?.id ?? raw?._id ?? raw?.componentId ?? raw?.component_id ?? "",
  ),
  machineId: String(raw?.machineId ?? raw?.machine_id ?? ""),
  category: raw?.category ?? "",
  description: raw?.description ?? raw?.category ?? "",
  serialNumber: raw?.serialNumber ?? raw?.serial_number ?? "",
  supplier: raw?.supplier ?? "",
  installHours: Number(raw?.installHours ?? raw?.install_hours ?? 0),
  currentHours: Number(raw?.currentHours ?? raw?.current_hours ?? 0),
  plannedLife: Number(raw?.plannedLife ?? raw?.planned_life ?? 0),
  replacementCost: raw?.replacementCost ?? raw?.replacement_cost ?? 0,
  condition: Number(raw?.condition ?? 0),
  createdAt: raw?.createdAt ?? raw?.created_at,
  updatedAt: raw?.updatedAt ?? raw?.updated_at,
});

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------

const panelClass =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const sectionHeadingClass =
  "text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50";

const sectionSubClass = "mt-1 text-sm text-slate-500 dark:text-slate-400";

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  link,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  tone: "default" | "positive" | "neutral" | "warning";
  link?: string;
}) => {
  const toneClass: Record<typeof tone, string> = {
    default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    positive: "bg-emerald-600 text-white",
    neutral: "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
    warning: "bg-rose-600 text-white",
  };

  const valueToneClass: Record<typeof tone, string> = {
    default: "text-slate-900 dark:text-slate-50",
    positive: "text-emerald-700 dark:text-emerald-400",
    neutral: "text-slate-900 dark:text-slate-50",
    warning: "text-rose-700 dark:text-rose-400",
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p
            className={`mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl ${valueToneClass[tone]}`}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </>
  );

  const baseClass = `${panelClass} group relative p-5 transition-colors ${
    link ? "hover:border-slate-300 dark:hover:border-slate-700" : ""
  }`;

  if (link) {
    return (
      <Link to={link} className={baseClass}>
        {content}
        <ArrowRight className="absolute right-5 top-5 h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
};

const InfoTile = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
};

const MetricRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
    <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Icon className="h-4 w-4" />
      {label}
    </span>
    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
      {value}
    </span>
  </div>
);

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`}
  />
);

const DashboardSkeleton = () => (
  <div className="min-h-screen space-y-6 bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
    <SkeletonBlock className="h-40 rounded-2xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonBlock key={index} className="h-32 rounded-2xl" />
      ))}
    </div>
    <SkeletonBlock className="h-72 rounded-2xl" />
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <SkeletonBlock className="h-80 rounded-2xl" />
      <SkeletonBlock className="h-80 rounded-2xl" />
    </div>
  </div>
);

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
    <div className={`${panelClass} max-w-md p-8 text-center`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Couldn&apos;t load your machine
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  </div>
);

const NoMachineState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="space-y-6">
    {/* Machine details section - empty state */}
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className={sectionHeadingClass}>Machine details</h2>
          <p className={sectionSubClass}>
            Read-only view of the machine assigned to you.
          </p>
        </div>
        <div className="flex min-h-[320px] items-center justify-center p-5">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Machine Not Assigned
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              No machine is currently assigned to you.
            </p>
            <button
              onClick={onRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Component health summary - empty state */}
      <div className={`${panelClass} p-5`}>
        <div className="mb-5">
          <h2 className={sectionHeadingClass}>Component health summary</h2>
          <p className={sectionSubClass}>
            Quick overview of component condition.
          </p>
        </div>

        <div className="flex min-h-[240px] items-center justify-center">
          <div className="text-center">
            <Settings2 className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
              No components available
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Assign a machine to view component details.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const OperatorDashboard = () => {
  const [machine, setMachine] = useState<ApiMachine | null>(null);
  const [components, setComponents] = useState<ApiComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMachine = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await machineService.getAssignedMachines();
      console.log("RAW ASSIGNMENTS:", JSON.stringify(response, null, 2));
      const machines = getArrayData<any>(response);
      console.log("PARSED MACHINES:", machines);

      const storedUser =
        StorageService.get<any>(STORAGE_KEYS.USER) ||
        StorageService.get<any>("user") ||
        {};

      const operatorId = String(
        storedUser?.id || storedUser?.userId || storedUser?.user?.id || "",
      ).trim();

      console.log("CURRENT OPERATOR ID:", operatorId);
      console.log("STORED USER DATA:", storedUser);

      if (!operatorId) {
        console.warn("No operator ID found in storage");
        setMachine(null);
        setComponents([]);
        return;
      }

      // Filter machines assigned to current operator
      const assignedMachines = machines.filter((item) => {
        const assignedOpId = String(
          item?.assignedOperatorId ?? 
          item?.assigned_operator_id ?? 
          item?.operatorId ?? 
          item?.operator_id ?? 
          item?.operator?.id ??
          ""
        ).trim();
        
        console.log(`Comparing: operatorId="${operatorId}" vs assignedOpId="${assignedOpId}"`, {
          matches: assignedOpId === operatorId,
          machineId: item?.id || item?.machineId,
          machineName: item?.name || item?.machineName
        });
        
        return assignedOpId === operatorId || assignedOpId.toLowerCase() === operatorId.toLowerCase();
      });

      console.log("FILTERED ASSIGNED MACHINES:", assignedMachines);

      if (!assignedMachines.length) {
        console.warn("No machines assigned to this operator");
        setMachine(null);
        setComponents([]);
        return;
      }

            const currentAssignment = assignedMachines.find((item) => {
        const status = String(
          item?.status ??
            item?.assignmentStatus ??
            item?.assignment_status ??
            "",
        )
          .trim()
          .toLowerCase();

        // Blacklist approach (matches OperatorAssignedMachines.tsx logic):
        // treat everything as a valid/current assignment unless it's
        // explicitly marked completed or unassigned.
        return status !== "completed" && status !== "unassigned";
      });

      if (!currentAssignment) {
        console.warn("No active assignment found");
        setMachine(null);
        setComponents([]);
        return;
      }

      const resolvedMachineId = String(
        currentAssignment?.machineId || 
        currentAssignment?.id || 
        currentAssignment?._id ||
        "",
      ).trim();

      console.log("RESOLVED MACHINE ID:", resolvedMachineId);
      console.log("CURRENT ASSIGNMENT:", currentAssignment);

      if (!resolvedMachineId) {
        console.error("Machine ID is empty");
        setMachine(null);
        setComponents([]);
        return;
      }

      setMachine(currentAssignment as ApiMachine);

      // ---- Component API integration ----
      if (resolvedMachineId) {
        const componentsResponse =
          await componentService.getComponents(resolvedMachineId);
        const rawComponents = getArrayData<any>(componentsResponse);
        setComponents(rawComponents.map(normalizeComponent));
      } else {
        setComponents([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your machine.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMachine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadMachine} />;
  }

  const assignedMachine: ApiMachine = {
  machineId: machine?.machineId || (machine as any)?.id || "",
  machineName: machine?.machineName || (machine as any)?.name || "",
  machineType:
    machine?.machineType ||
    (machine as any)?.equipmentType ||
    (machine as any)?.model ||
    "",
  fleetId:
    machine?.fleetId ||
    (machine as any)?.serialNumber ||
    (machine as any)?.id ||
    "",
  hoursRun:
    machine?.hoursRun ||
    (machine as any)?.installHours ||
    0,
};

  const healthyComponents = components.filter(
    (component) => getConditionStatus(component.condition) === "Healthy",
  ).length;

  const warningComponents = components.filter(
    (component) => getConditionStatus(component.condition) === "Warning",
  ).length;

  const criticalComponents = components.filter(
    (component) => getConditionStatus(component.condition) === "Critical",
  ).length;

  const overallHealth = getOverallHealth(components);

  const totalCurrentHours = components.reduce(
    (sum, component) => sum + Number(component.currentHours || 0),
    0,
  );

  const mostImportantComponent = components.length
    ? [...components].sort(
        (a, b) => Number(a.condition || 0) - Number(b.condition || 0),
      )[0]
    : undefined;

  const componentChartData = [
    { name: "Healthy", value: healthyComponents, color: "#10b981" },
    { name: "Warning", value: warningComponents, color: "#f59e0b" },
    { name: "Critical", value: criticalComponents, color: "#f43f5e" },
  ];

  const machineStatus =
    criticalComponents > 0
      ? "Needs attention"
      : warningComponents > 0
        ? "Monitor closely"
        : "Operating normally";

  const machineStatusClass =
    criticalComponents > 0
      ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20"
      : warningComponents > 0
        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20"
        : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20";

  return (
    <div className=" w-full min-h-screen space-y-6 bg-slate-50 p-4 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50 sm:p-6 lg:p-8">
      {/* Header */}
      <div className={`${panelClass} p-5 sm:p-6 `}>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />
          <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  Operator Workspace
                </div>

                {machine ? (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {machineStatus}
                      </span>
                    </div>

                    <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                      {assignedMachine?.machineName}
                    </h1>

                    <p className="mt-2 text-sm text-blue-100">
                      {assignedMachine?.machineType} • Serial{" "}
                      {assignedMachine?.fleetId}
                    </p>
                  </>
                ) : (
                  <>

                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      Machine Not Assigned
                    </div>

                    <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                      No Machine Assigned
                    </h1>

                    <p className="mt-2 text-sm text-blue-100">
                      No machine is currently assigned to you.
                    </p>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={loadMachine}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

       {machine ? (
  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <InfoTile
      label="Machine name"
      value={assignedMachine?.machineName || "-"}
    />

    <InfoTile
      label="Model"
      value={assignedMachine?.machineType || "-"}
    />

    <InfoTile
      label="Serial number"
      value={assignedMachine?.fleetId || "-"}
    />

    <InfoTile
      label="Total running hours"
      value={`${formatNumber(totalCurrentHours)} hrs`}
    />
  </div>
) : null}
      </div>

      {/* Main Content - Show based on machine assignment status */}
      {machine ? (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Overall health"
              value={`${overallHealth}%`}
              subtitle="Average component condition"
              icon={Gauge}
              tone={
                overallHealth >= 70
                  ? "positive"
                  : overallHealth >= 40
                    ? "neutral"
                    : "warning"
              }
            />
            <StatCard
              title="Total components"
              value={components.length}
              subtitle="Tracked on this machine"
              icon={Settings2}
              tone="default"
            />
            <StatCard
              title="Running hours"
              value={formatNumber(totalCurrentHours)}
              subtitle="Across all components"
              icon={TimerReset}
              tone="neutral"
            />
            <StatCard
              title="Critical components"
              value={criticalComponents}
              subtitle="Need immediate attention"
              icon={ShieldAlert}
              tone={criticalComponents > 0 ? "warning" : "positive"}
              link="/operator/alerts"
            />
          </div>

          {/* Health analytics */}
          <div className={`${panelClass} overflow-hidden`}>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className={sectionHeadingClass}>Machine health analytics</h2>
                <p className={sectionSubClass}>
                  Trend of overall machine health over time.
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <MachineHealthChart machine={assignedMachine} />
          </div>

          {/* Machine details + component summary */}
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={`${panelClass} overflow-hidden`}>
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h2 className={sectionHeadingClass}>Machine details</h2>
                <p className={sectionSubClass}>
                  Read-only view of the machine assigned to you.
                </p>
              </div>
              <div className="p-5 overflow-x-hidden">
                <div className="flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 sm:w-32">
                    <Truck className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {assignedMachine.machineName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Serial number {assignedMachine.fleetId}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoTile
                    label="Machine model"
                    value={assignedMachine.machineType}
                  />
                  <InfoTile label="Serial number" value={assignedMachine.fleetId} />
                  <InfoTile
                    label="Total running hours"
                    value={`${formatNumber(totalCurrentHours)} hrs`}
                  />
                  <InfoTile label="Machine ID" value={assignedMachine.machineId} />
                </div>
              </div>
            </div>

            <div className={`${panelClass} p-5`}>
              <div className="mb-5">
                <h2 className={sectionHeadingClass}>Component health summary</h2>
                <p className={sectionSubClass}>
                  Quick overview of component condition.
                </p>
              </div>

              {components.length > 0 ? (
                <>
                  <div className="relative h-56 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-semibold tracking-tight">
                          {overallHealth}%
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Overall health
                        </p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={componentChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={86}
                          paddingAngle={4}
                          stroke="none"
                        >
                          {componentChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {componentChartData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {item.name}
                          </span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <Settings2 className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    No components found
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    This machine doesn&apos;t have any components attached yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Components table + priority */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className={`${panelClass} overflow-x-hidden w-full max-w-full`}>
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className={sectionHeadingClass}>Assigned components</h2>
              <p className={sectionSubClass}>
                Current status of components on this machine.
              </p>
            </div>
          </div>

          {components.length > 0 ? (
            <div
              className="overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3">Component</th>
                    <th className="whitespace-nowrap px-5 py-3">Category</th>
                    <th className="whitespace-nowrap px-5 py-3">Condition</th>
                    <th className="whitespace-nowrap px-5 py-3">
                      Current hours
                    </th>
                    <th className="whitespace-nowrap px-5 py-3">
                      Remaining life
                    </th>
                    <th className="whitespace-nowrap px-5 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {components.map((component) => {
                    const condition = getConditionStatus(component.condition);
                    const risk = getRiskLevel(component.condition);

                    return (
                      <tr
                        key={component.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Settings2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900 dark:text-slate-50">
                                {component.description || component.category}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                SN: {component.serialNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-300">
                          {component.category}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getConditionBadgeClass(condition)}`}
                          >
                            {condition}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {formatNumber(component.currentHours)} hrs
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {formatNumber(getRemainingLife(component))} hrs
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRiskBadgeClass(risk)}`}
                          >
                            {risk}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No components available for this machine yet.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={`${panelClass} p-5`}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className={sectionHeadingClass}>Priority component</h2>
              <p className={sectionSubClass}>
                Component with the lowest condition score.
              </p>
            </div>
            {mostImportantComponent && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRiskBadgeClass(getRiskLevel(mostImportantComponent.condition))}`}
              >
                {getRiskLevel(mostImportantComponent.condition)} risk
              </span>
            )}
          </div>

          {mostImportantComponent ? (
            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40">
                <Wrench className="h-9 w-9 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">
                {mostImportantComponent.description ||
                  mostImportantComponent.category}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {mostImportantComponent.category} &middot; SN{" "}
                {mostImportantComponent.serialNumber}
              </p>

              <div className="mt-4 space-y-2">
                <MetricRow
                  icon={TimerReset}
                  label="Current hours"
                  value={`${formatNumber(mostImportantComponent.currentHours)} hrs`}
                />
                <MetricRow
                  icon={Gauge}
                  label="Planned life"
                  value={`${formatNumber(mostImportantComponent.plannedLife)} hrs`}
                />
                <MetricRow
                  icon={Activity}
                  label="Remaining life"
                  value={`${formatNumber(getRemainingLife(mostImportantComponent))} hrs`}
                />
                <MetricRow
                  icon={CheckCircle2}
                  label="Condition score"
                  value={`${Number(mostImportantComponent.condition || 0)} / 5`}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <Wrench className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                No priority component
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Once components are added, the highest-priority one will appear
                here.
              </p>
            </div>
          )}

          <Link
            to="/operator/fleet"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Open component view
            <ArrowRight className="h-4 w-4" />
                    </Link>
        </div>
      </div>

      </>
    ) : (
      <NoMachineState onRetry={loadMachine} />
    )}
    </div>
  );
}
export default OperatorDashboard;
