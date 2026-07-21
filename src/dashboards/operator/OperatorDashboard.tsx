import { useEffect, useState } from "react";
import { fleetService } from "../../services/Fleet/fleetService";
import { machineAssignmentService } from "../../services/Task/machineAssignmentService";

import { Link } from "react-router";

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

import MachineHealthChart from "./MachineHealthChart";

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

  components?: {
    tyre: {
      health: number;
    };

    engine: {
      health: number;
    };

    hydraulic: {
      health: number;
    };

    transmission: {
      health: number;
    };
  };
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
  <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
    <div className={`${panelClass} max-w-md p-8 text-center`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Truck className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
        No machine assigned yet
      </h2>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        You don&apos;t have a machine assigned to your account. Once a
        supervisor assigns one, it will appear here automatically.
      </p>

      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  </div>
);

const OperatorDashboard = () => {
  const [machine, setMachine] = useState<ApiMachine | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const currentUser = {
    id: "op_1",
    role: "operator",
  };

  const loadMachine = async () => {
    setIsLoading(true);

    setError(null);

    try {
      const assignedMachineIds =
        await machineAssignmentService.getAssignedMachines(currentUser.id);

      const machineId = assignedMachineIds[0];

      if (!machineId) {
        setMachine(null);
        return;
      }

      const machine = await fleetService.getMachineById(machineId);

      if (!machine) {
        setMachine(null);
        return;
      }

      setMachine(machine);
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

  if (!machine) {
    return <NoMachineState onRetry={loadMachine} />;
  }

  const assignedMachine = machine;

  const components: ApiComponent[] = [
    {
      id: "tyre",
      machineId: assignedMachine.machineId,
      category: "Tyre",
      description: "Tyre Health",
      serialNumber: "TYRE-001",
      condition: Math.round(
        (assignedMachine.components?.tyre?.health ?? 0) / 20,
      ),
      currentHours: assignedMachine.hoursRun || 0,
    },

    {
      id: "engine",
      machineId: assignedMachine.machineId,
      category: "Engine",
      description: "Engine Health",
      serialNumber: "ENG-001",
      condition: Math.round(
        (assignedMachine.components?.engine?.health ?? 0) / 20,
      ),
      currentHours: assignedMachine.hoursRun || 0,
    },

    {
      id: "hydraulic",
      machineId: assignedMachine.machineId,
      category: "Hydraulic",
      description: "Hydraulic Health",
      serialNumber: "HYD-001",
      condition: Math.round(
        (assignedMachine.components?.hydraulic?.health ?? 0) / 20,
      ),
      currentHours: assignedMachine.hoursRun || 0,
    },

    {
      id: "transmission",
      machineId: assignedMachine.machineId,
      category: "Transmission",
      description: "Transmission Health",
      serialNumber: "TRN-001",
      condition: Math.round(
        (assignedMachine.components?.transmission?.health ?? 0) / 20,
      ),
      currentHours: assignedMachine.hoursRun || 0,
    },
  ];

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

  const mostImportantComponent = [...components].sort((a, b) => {
    const conditionA = Number(a.condition || 0);

    const conditionB = Number(b.condition || 0);

    return conditionA - conditionB;
  })[0];

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
        {/* Premium Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          {/* Glow 1 */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />

          {/* Glow 2 */}
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />

          {/* Glow 3 */}
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

          {/* Glow 4 */}
          <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                <Truck className="h-6 w-6 text-white" />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  Operator Workspace
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="
                inline-flex
                items-center
                gap-1.5
                rounded-full
                border
                border-white/20
                bg-white/10
                px-3
                py-1
                text-xs
                font-semibold
                text-white
                backdrop-blur-md
              "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {machineStatus}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  {assignedMachine.machineName}
                </h1>

                <p className="mt-2 text-sm text-blue-100">
                  {assignedMachine.machineType} • Serial{" "}
                  {assignedMachine.fleetId}
                </p>
              </div>
            </div>

            {/* Right */}
            <button
              onClick={loadMachine}
              className="
          inline-flex
          h-12
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-white/20
          bg-white/10
          px-5
          text-sm
          font-semibold
          text-white
          backdrop-blur-md
          transition-all
          duration-300
          hover:-translate-y-0.5
          hover:bg-white/20
        "
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Facts */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Machine name" value={assignedMachine.machineName} />
          <InfoTile label="Model" value={assignedMachine.machineType} />
          <InfoTile label="Serial number" value={assignedMachine.fleetId} />
          <InfoTile
            label="Total running hours"
            value={`${formatNumber(totalCurrentHours)} hrs`}
          />
        </div>
      </div>

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
        {/* Machine details */}

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

        {/* Component summary */}

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
        {/* Components table */}

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
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
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
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getConditionBadgeClass(
                              condition,
                            )}`}
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
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRiskBadgeClass(
                              risk,
                            )}`}
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

        {/* Priority component */}

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
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRiskBadgeClass(
                  getRiskLevel(mostImportantComponent.condition),
                )}`}
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
    </div>
  );
};

export default OperatorDashboard;
