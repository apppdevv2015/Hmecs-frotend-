import React, { useState, useEffect, useMemo, useCallback } from "react";

import {
  Activity,
  Truck,
  Settings,
  PieChart,
  AlertTriangle,
  RefreshCw,
  Inbox,
  Bell,
  ChevronDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { fleetService, FleetMachine } from "../../services/Fleet/fleetService";
import { componentService } from "../../services/companyadmin/componentService";
import { useNavigate } from "react-router-dom";

type RiskBucket = "healthy" | "warning" | "critical" | "unknown";

interface ComponentIntelligence {
  hoursRun: number;
  lifeUsedPercent: number;
  remainingHours: number;
  riskStatus: string;
  riskColor: string;
  riskDriver: string;
  estimatedSavings: string;
}

interface ComponentMachine {
  id: string;
  name: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  equipmentType: string | null;
}

interface RawComponentItem {
  id: string;
  name: string | null;
  machineId: string;
  companyId: string;
  category: string | null;
  componentType?: string | null;
  description: string | null;
  serialNumber: string | null;
  installHours: number;
  currentHours: number;
  plannedLife: number;
  replacementCost: string;
  condition: number;
  machine: ComponentMachine;
  intelligence: ComponentIntelligence;
}

interface ComponentCategoryCount {
  category: string;
  total: number;
}

const DISTRIBUTION_PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#f59e0b",
  "#ec4899",
  "#10b981",
  "#0891b2",
  "#94a3b8",
];

// Normalizes the various response shapes existing services may return
function normalizeToArray(raw: unknown): RawComponentItem[] {
  if (Array.isArray(raw)) return raw as RawComponentItem[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as RawComponentItem[];
    if (Array.isArray(obj.components))
      return obj.components as RawComponentItem[];
    if (Array.isArray(obj.items)) return obj.items as RawComponentItem[];
  }
  return [];
}

// Classifies the backend-provided risk label text, does not derive risk from raw numbers
function classifyRiskStatus(raw?: string): RiskBucket {
  if (!raw) return "unknown";
  const value = raw.toLowerCase();
  if (value.includes("critical") || value.includes("high")) return "critical";
  if (
    value.includes("warn") ||
    value.includes("medium") ||
    value.includes("moderate")
  )
    return "warning";
  if (
    value.includes("ok") ||
    value.includes("healthy") ||
    value.includes("good") ||
    value.includes("low")
  )
    return "healthy";
  return "unknown";
}

function formatValue(value: unknown, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number" && Number.isNaN(value)) return "N/A";
  return `${value}${suffix}`;
}

function formatPercent(part: number, total: number): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function SectionCard({
  icon,
  iconTone = "blue",
  title,
  description,
  action,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  iconTone?: "blue" | "red";
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const toneClasses =
    iconTone === "red" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600";
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-5 pb-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}
          >
            {icon}
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      className="space-y-3 px-5 pb-5"
    >
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 pb-6 pt-2 text-center">
      <AlertTriangle size={24} className="text-red-500" aria-hidden="true" />
      <p className="text-sm text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 pb-8 pt-4 text-center">
      <Inbox size={24} className="text-slate-300" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

const machineStatusStyles: Record<
  FleetMachine["status"],
  { icon: React.ElementType; text: string; badgeBg: string; bar: string }
> = {
  Healthy: {
    icon: CheckCircle2,
    text: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    bar: "bg-emerald-500",
  },
  Warning: {
    icon: AlertTriangle,
    text: "text-amber-700",
    badgeBg: "bg-amber-50",
    bar: "bg-amber-500",
  },
  Critical: {
    icon: AlertCircle,
    text: "text-red-700",
    badgeBg: "bg-red-50",
    bar: "bg-red-500",
  },
};

function MachineStatusBadge({ status }: { status: FleetMachine["status"] }) {
  const style = machineStatusStyles[status];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badgeBg} ${style.text}`}
    >
      <Icon size={12} aria-hidden="true" />
      {status}
    </span>
  );
}

const riskBucketStyles: Record<
  RiskBucket,
  { badgeBg: string; text: string; dot: string; label: string }
> = {
  healthy: {
    badgeBg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Healthy",
  },
  warning: {
    badgeBg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Warning",
  },
  critical: {
    badgeBg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Critical",
  },
  unknown: {
    badgeBg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: "N/A",
  },
};

function RiskStatusBadge({ rawStatus }: { rawStatus?: string }) {
  const bucket = classifyRiskStatus(rawStatus);
  const style = riskBucketStyles[bucket];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.badgeBg} ${style.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {rawStatus || style.label}
    </span>
  );
}

function DashboardHeader({ onRefresh }: { onRefresh: () => void }) {
  const now = useMemo(() => new Date(), []);
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(now),
    [now],
  );
  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
    [now],
  );

  return (

      <div className="rounded-2xl border border-blue-100 px-5 py-4 mb-4 ">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm">
          Real-time overview of your mining fleet health and performance.
        </p>
      </div>
  );
}

interface StatCardConfig {
  key: string;
  label: string;
  value: number | null;
  helper?: string;
  icon: React.ElementType;
  iconBg: string;
  iconText: string;
}

function StatCard({
  config,
  loading,
  error,
}: {
  config: StatCardConfig;
  loading: boolean;
  error: string | null;
}) {
  const Icon = config.icon;
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconText}`}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="mt-3">
        {loading ? (
          <div className="h-7 w-12 animate-pulse rounded bg-slate-200" />
        ) : error ? (
          <p className="text-2xl font-bold text-slate-300">—</p>
        ) : (
          <p className="text-2xl font-bold text-slate-900">
            {config.value ?? 0}
          </p>
        )}
        <p className="mt-1 text-sm font-medium text-slate-600">
          {config.label}
        </p>
        {config.helper && !loading && !error && (
          <p className="mt-0.5 text-xs text-slate-400">{config.helper}</p>
        )}
      </div>
    </div>
  );
}

function StatsOverview({
  fleetLoading,
  fleetError,
  componentsLoading,
  componentsError,
  totalMachines,
  totalComponents,
  healthyComponents,
  warningComponents,
  criticalComponents,
}: {
  fleetLoading: boolean;
  fleetError: string | null;
  componentsLoading: boolean;
  componentsError: string | null;
  totalMachines: number | null;
  totalComponents: number | null;
  healthyComponents: number;
  warningComponents: number;
  criticalComponents: number;
}) {
  const totalForPercent = totalComponents || 0;

  const cards: {
    config: StatCardConfig;
    loading: boolean;
    error: string | null;
  }[] = [
    {
      config: {
        key: "machines",
        label: "Total Machines",
        value: totalMachines,
        icon: Truck,
        iconBg: "bg-blue-50",
        iconText: "text-blue-600",
      },
      loading: fleetLoading,
      error: fleetError,
    },
    {
      config: {
        key: "components",
        label: "Total Components",
        value: totalComponents,
        icon: Package,
        iconBg: "bg-purple-50",
        iconText: "text-purple-600",
      },
      loading: componentsLoading,
      error: componentsError,
    },
    {
      config: {
        key: "healthy",
        label: "Healthy Components",
        value: healthyComponents,
        helper: `${formatPercent(healthyComponents, totalForPercent)} of total`,
        icon: Activity,
        iconBg: "bg-emerald-50",
        iconText: "text-emerald-600",
      },
      loading: componentsLoading,
      error: componentsError,
    },
    {
      config: {
        key: "warning",
        label: "Warning Components",
        value: warningComponents,
        helper: `${formatPercent(warningComponents, totalForPercent)} of total`,
        icon: AlertTriangle,
        iconBg: "bg-amber-50",
        iconText: "text-amber-600",
      },
      loading: componentsLoading,
      error: componentsError,
    },
    {
      config: {
        key: "critical",
        label: "Critical Components",
        value: criticalComponents,
        helper: `${formatPercent(criticalComponents, totalForPercent)} of total`,
        icon: AlertCircle,
        iconBg: "bg-red-50",
        iconText: "text-red-600",
      },
      loading: componentsLoading,
      error: componentsError,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => (
        <StatCard
          key={card.config.key}
          config={card.config}
          loading={card.loading}
          error={card.error}
        />
      ))}
    </div>
  );
}

function MachineHealthOverview({
  loading,
  error,
  machines,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  machines: FleetMachine[] | null;
  onRetry: () => void;
}) {
  const stats = useMemo(() => {
    if (!machines) return null;
    const total = machines.length;
    const healthy = machines.filter((m) => m.status === "Healthy").length;
    const warning = machines.filter((m) => m.status === "Warning").length;
    const critical = machines.filter((m) => m.status === "Critical").length;
    return { total, healthy, warning, critical };
  }, [machines]);

  const rows = stats
    ? [
        {
          key: "Healthy" as const,
          value: stats.healthy,
          bar: "bg-emerald-500",
          chipBg: "bg-emerald-50",
          chipText: "text-emerald-700",
          icon: CheckCircle2,
        },
        {
          key: "Warning" as const,
          value: stats.warning,
          bar: "bg-amber-500",
          chipBg: "bg-amber-50",
          chipText: "text-amber-700",
          icon: AlertTriangle,
        },
        {
          key: "Critical" as const,
          value: stats.critical,
          bar: "bg-red-500",
          chipBg: "bg-red-50",
          chipText: "text-red-700",
          icon: AlertCircle,
        },
      ]
    : [];

  return (
    <SectionCard
      icon={<Activity size={20} aria-hidden="true" />}
      title="Machine Health Overview"
      description="Real-time machine health monitoring and status breakdown."
      action={
        stats && (
          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
            All Machines ({stats.total})
            <ChevronDown size={14} aria-hidden="true" />
          </span>
        )
      }
    >
      {loading && <LoadingState label="machine health overview" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && stats && stats.total === 0 && (
        <EmptyState
          title="No machines found"
          message="Machine health data will appear here once machines are registered."
        />
      )}
      {!loading && !error && stats && stats.total > 0 && (
        <>
          <div className="space-y-4 px-5">
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-medium text-slate-700">
                  {row.key}
                </span>
                <div className="h-3 flex-1 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${row.bar}`}
                    style={{ width: `${(row.value / stats.total) * 100}%` }}
                    role="img"
                    aria-label={`${row.key}: ${row.value} machines, ${formatPercent(row.value, stats.total)}`}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-semibold text-slate-900">
                  {row.value} ({formatPercent(row.value, stats.total)})
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.key}
                  className={`flex items-center justify-between rounded-xl border border-slate-200 p-3 ${row.chipBg}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={20}
                      className={row.chipText}
                      aria-hidden="true"
                    />
                    <div className="leading-tight">
                      <p className="text-xl font-bold text-slate-900">
                        {row.value}
                      </p>
                      <p className="text-xs text-slate-600">{row.key}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${row.chipText}`}>
                    {formatPercent(row.value, stats.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </SectionCard>
  );
}

function ComponentDistribution({
  loading,
  error,
  categoryCounts,
  totalComponents,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  categoryCounts: ComponentCategoryCount[] | null;
  totalComponents: number | null;
  onRetry: () => void;
}) {
  const gradient = useMemo(() => {
    if (!categoryCounts || !totalComponents) return "";
    let cursor = 0;
    const segments = categoryCounts.map((row, index) => {
      const share = (row.total / totalComponents) * 100;
      const color = DISTRIBUTION_PALETTE[index % DISTRIBUTION_PALETTE.length];
      const segment = `${color} ${cursor}% ${cursor + share}%`;
      cursor += share;
      return segment;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [categoryCounts, totalComponents]);

  return (
    <SectionCard
      icon={<PieChart size={20} aria-hidden="true" />}
      title="Component Distribution"
      description="Distribution of components across machines."
    >
      {loading && <LoadingState label="component distribution" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && (!categoryCounts || totalComponents === 0) && (
        <EmptyState
          title="No component data"
          message="Component distribution will appear here once components are registered."
        />
      )}
      {!loading &&
        !error &&
        categoryCounts &&
        totalComponents !== null &&
        totalComponents > 0 && (
          <div className="flex flex-col items-center gap-6 px-5 pb-5 sm:flex-row sm:items-center">
            <div
              className="relative h-40 w-40 shrink-0 rounded-full"
              style={{ background: gradient }}
              role="img"
              aria-label={`Total components: ${totalComponents}, across ${categoryCounts.length} categories`}
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white text-center">
                <p className="text-3xl font-bold text-slate-900">
                  {totalComponents}
                </p>
                <p className="text-xs text-slate-500">Total Components</p>
              </div>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-2.5">
              {categoryCounts.map((row, index) => (
                <li
                  key={row.category}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          DISTRIBUTION_PALETTE[
                            index % DISTRIBUTION_PALETTE.length
                          ],
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{row.category}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {row.total}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({formatPercent(row.total, totalComponents)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </SectionCard>
  );
}

function ComponentHealth({
  loading,
  error,
  components,
  machineNameById,
  onRetry,
  onViewAll,
}: {
  loading: boolean;
  error: string | null;
  components: RawComponentItem[] | null;
  machineNameById: Record<string, string>;
  onRetry: () => void;
  onViewAll: () => void;
}) {
  return (
    <SectionCard
      icon={<Settings size={20} aria-hidden="true" />}
      title="Component Health"
      description="Health status of all components."
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View All
        </button>
      }
    >
      {loading && <LoadingState label="component health" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && components && components.length === 0 && (
        <EmptyState
          title="No components found"
          message="Component health data will appear here once components are registered."
        />
      )}
      {!loading && !error && components && components.length > 0 && (
        <div className="scrollbar-hide max-h-80 overflow-auto px-5 pb-5">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="pb-2 font-medium">
                  Component
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Machine
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Risk Status
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Life Used
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Remain Hrs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {components.map((component) => {
                const machineLabel =
                  component.machine?.name ||
                  machineNameById[component.machineId] ||
                  component.machineId;
                const componentLabel =
                  component.name ||
                  component.category ||
                  component.componentType ||
                  component.serialNumber ||
                  "N/A";
                return (
                  <tr key={component.id}>
                    <td className="py-3 font-medium text-slate-900">
                      {componentLabel}
                    </td>
                    <td className="py-3 text-blue-600">{machineLabel}</td>
                    <td className="py-3">
                      <RiskStatusBadge
                        rawStatus={component.intelligence.riskStatus}
                      />
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatValue(component.intelligence.lifeUsedPercent, "%")}
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatValue(component.intelligence.remainingHours)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function FleetOverview({
  loading,
  error,
  machines,
  onRetry,
  onViewAll,
}: {
  loading: boolean;
  error: string | null;
  machines: FleetMachine[] | null;
  onRetry: () => void;
  onViewAll: () => void;
}) {
  return (
    <SectionCard
      icon={<Truck size={20} aria-hidden="true" />}
      title="Fleet Overview"
      description="Live status of all machines in your fleet."
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View All
        </button>
      }
    >
      {loading && <LoadingState label="fleet overview" />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && machines && machines.length === 0 && (
        <EmptyState
          title="No fleet data"
          message="Fleet machines will appear here once they are connected."
        />
      )}
      {!loading && !error && machines && machines.length > 0 && (
        <div className="scrollbar-hide max-h-80 overflow-auto px-5 pb-5">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="pb-2 font-medium">
                  Machine
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Type
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Location
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Health
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Hours Run
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {machines.map((machine) => {
                const style = machineStatusStyles[machine.status];
                return (
                  <tr key={machine.machineId}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Truck size={16} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 leading-tight">
                          <p className="truncate font-semibold text-slate-900">
                            {formatValue(machine.machineName)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {formatValue(machine.machineType)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatValue(machine.machineType)}
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatValue(machine.location)}
                    </td>
                    <td className="py-3">
                      <div className="w-24">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatValue(machine.healthPercent, "%")}
                        </p>
                        {typeof machine.healthPercent === "number" && (
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div
                              className={`h-1.5 rounded-full ${style.bar}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, machine.healthPercent))}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {formatValue(machine.hoursRun)}
                    </td>
                    <td className="py-3">
                      <MachineStatusBadge status={machine.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function CriticalAlerts() {
  return (
    <SectionCard
      icon={<Bell size={20} aria-hidden="true" />}
      iconTone="red"
      title="Notifications & Critical Alerts"
      description="Latest alerts and notifications requiring your attention."
      className="xl:col-span-3"
      action={
        <button
          type="button"
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View All
        </button>
      }
    >
      <EmptyState
        title="No critical alert data is available yet."
        message="Alert monitoring will appear here once the alert service is enabled."
      />
    </SectionCard>
  );
}

export default function EngineerDashboard() {
  const navigate = useNavigate();
  const [fleetMachines, setFleetMachines] = useState<FleetMachine[] | null>(
    null,
  );
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState<string | null>(null);

  const [rawComponents, setRawComponents] = useState<RawComponentItem[] | null>(
    null,
  );
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [componentsError, setComponentsError] = useState<string | null>(null);

  const fetchFleet = useCallback(async () => {
    setFleetLoading(true);
    setFleetError(null);
    try {
      const data = await fleetService.getFleetMachines();
      setFleetMachines(Array.isArray(data) ? data : []);
    } catch (err) {
      setFleetError(
        err instanceof Error ? err.message : "Failed to load fleet data.",
      );
      setFleetMachines(null);
    } finally {
      setFleetLoading(false);
    }
  }, []);

  const fetchComponents = useCallback(async () => {
    setComponentsLoading(true);
    setComponentsError(null);
    try {
      const data = await componentService.getEngineerDashboardComponents();
      setRawComponents(normalizeToArray(data));
    } catch (err) {
      setComponentsError(
        err instanceof Error ? err.message : "Failed to load component data.",
      );
      setRawComponents(null);
    } finally {
      setComponentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    fetchComponents();
  }, [fetchFleet, fetchComponents]);

  const handleRefresh = useCallback(() => {
    fetchFleet();
    fetchComponents();
  }, [fetchFleet, fetchComponents]);

  const machineNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (fleetMachines || []).forEach((machine) => {
      map[machine.machineId] = machine.machineName;
    });
    return map;
  }, [fleetMachines]);

  const categoryCounts = useMemo<ComponentCategoryCount[] | null>(() => {
    if (!rawComponents) return null;
    const counts = new Map<string, number>();
    rawComponents.forEach((component) => {
      const category =
        (component.category && String(component.category).trim()) ||
        (component.componentType && String(component.componentType).trim()) ||
        "Uncategorized";
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [rawComponents]);

  const totalComponents = rawComponents ? rawComponents.length : null;

  const componentRiskCounts = useMemo(() => {
    const counts = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
    (rawComponents || []).forEach((component) => {
      const bucket = classifyRiskStatus(component.intelligence?.riskStatus);
      counts[bucket] += 1;
    });
    return counts;
  }, [rawComponents]);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="p-4 sm:p-6">
        <DashboardHeader onRefresh={handleRefresh} />

        <StatsOverview
          fleetLoading={fleetLoading}
          fleetError={fleetError}
          componentsLoading={componentsLoading}
          componentsError={componentsError}
          totalMachines={fleetMachines ? fleetMachines.length : null}
          totalComponents={totalComponents}
          healthyComponents={componentRiskCounts.healthy}
          warningComponents={componentRiskCounts.warning}
          criticalComponents={componentRiskCounts.critical}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MachineHealthOverview
            loading={fleetLoading}
            error={fleetError}
            machines={fleetMachines}
            onRetry={fetchFleet}
          />
          <ComponentDistribution
            loading={componentsLoading}
            error={componentsError}
            categoryCounts={categoryCounts}
            totalComponents={totalComponents}
            onRetry={fetchComponents}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ComponentHealth
            loading={componentsLoading}
            error={componentsError}
            components={rawComponents}
            machineNameById={machineNameById}
            onRetry={fetchComponents}
            onViewAll={() => navigate("/engineers/components")}
          />

          <FleetOverview
            loading={fleetLoading}
            error={fleetError}
            machines={fleetMachines}
            onRetry={fetchFleet}
            onViewAll={() => navigate("/engineers/heatmap")}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3">
          <CriticalAlerts />
        </div>
      </main>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
