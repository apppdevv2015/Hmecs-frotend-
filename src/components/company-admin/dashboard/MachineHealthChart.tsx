import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";

type MachineHealthStatus = "Healthy" | "Warning" | "Critical" | "Offline";

interface MachineHealthItem {
  status: MachineHealthStatus;
  count: number;
}

interface MachineHealthChartProps {
  machines?: any[];
  components?: any[];
  subscription?: any;
  loading?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<MachineHealthStatus, string> = {
  Healthy: "#22C55E",
  Warning: "#F59E0B",
  Critical: "#EF4444",
  Offline: "#64748B",
};

const STATUS_DESCRIPTION: Record<MachineHealthStatus, string> = {
  Healthy: "Machine is operating normally",
  Warning: "Needs attention soon",
  Critical: "Immediate action required",
  Offline: "Machine is unavailable",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;

  const item = payload?.[0]?.payload as MachineHealthItem;

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{
            backgroundColor: STATUS_COLORS[item.status],
          }}
        />

        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {item.status}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Count:
          <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">
            {item.count} Machine
            {item.count > 1 ? "s" : ""}
          </span>
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {STATUS_DESCRIPTION[item.status]}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <div className="w-full animate-pulse space-y-4 px-5">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MachineHealthChart({
  machines = [],
  components = [],
  subscription,
  loading = false,
  className = "",
}: MachineHealthChartProps) {
  const [selectedMachineId, setSelectedMachineId] = React.useState<string>("all");

  const machineSummary = useMemo(() => {
    const criticalMachines = new Set<string>();
    const warningMachines = new Set<string>();
    const healthyMachines = new Set<string>();
    const offlineMachines = new Set<string>();

    const targetList =
      selectedMachineId === "all"
        ? machines
        : machines.filter(
            (m) =>
              String(m.id || m.machineId || "").toLowerCase() ===
              selectedMachineId.toLowerCase(),
          );

    targetList.forEach((machine) => {
      const mId = String(machine.machineId || machine.id || "");

      const machineComponents = components.filter((component) => {
        const cMachId = String(component.machineId || component.machine_id || component.machine?.id || "");
        return cMachId && mId && (cMachId === mId || cMachId.toLowerCase() === mId.toLowerCase());
      });

      const isOffline = machine.status?.toLowerCase() === "offline";

      const healthScore = typeof machine.healthScore === "number"
        ? machine.healthScore
        : typeof machine.healthPercent === "number"
        ? machine.healthPercent
        : null;

      const mStatus = String(machine.status || "").toLowerCase();

      const hasCritical =
        mStatus === "critical" ||
        (healthScore !== null && healthScore < 50) ||
        machineComponents.some((c) => {
          const rStatus = String(c.intelligence?.riskStatus || c.status || "").toLowerCase();
          const cScore = typeof c.healthScore === "number" ? c.healthScore : null;
          return (
            rStatus.includes("crit") ||
            (cScore !== null && cScore > 0 && cScore < 50) ||
            (c.condition >= 5 && ["engine", "transmission", "hydraulics", "pump"].some((k) => String(c.category || c.name || "").toLowerCase().includes(k)))
          );
        });

      const hasWarning =
        mStatus === "warning" ||
        mStatus === "monitor" ||
        (healthScore !== null && healthScore >= 50 && healthScore < 85) ||
        machineComponents.some((c) => {
          const rStatus = String(c.intelligence?.riskStatus || c.status || "").toLowerCase();
          const cScore = typeof c.healthScore === "number" ? c.healthScore : null;
          return (
            rStatus.includes("warn") ||
            rStatus.includes("monitor") ||
            (cScore !== null && cScore >= 50 && cScore < 85) ||
            c.condition === 4
          );
        });

      if (isOffline) {
        offlineMachines.add(mId);
      } else if (hasCritical) {
        criticalMachines.add(mId);
      } else if (hasWarning) {
        warningMachines.add(mId);
      } else {
        healthyMachines.add(mId);
      }
    });

    // total machines from API
    const totalMachines = machines.length;

    return {
      totalMachines,
      critical: criticalMachines.size,
      warning: warningMachines.size,
      healthy: healthyMachines.size,
      offline: offlineMachines.size,
    };
  }, [machines, components, selectedMachineId]);

  const chartData = useMemo<MachineHealthItem[]>(
    () => [
      {
        status: "Healthy",
        count: machineSummary.healthy,
      },
      {
        status: "Warning",
        count: machineSummary.warning,
      },
      {
        status: "Critical",
        count: machineSummary.critical,
      },
      {
        status: "Offline",
        count: machineSummary.offline,
      },
    ],
    [machineSummary],
  );

  const totalMachines = machineSummary.totalMachines;

  const sortedData = useMemo<MachineHealthItem[]>(() => {
    const order: Record<MachineHealthStatus, number> = {
      Healthy: 1,
      Warning: 2,
      Critical: 3,
      Offline: 4,
    };

    return [...chartData].sort((a, b) => order[a.status] - order[b.status]);
  }, [chartData]);

  if (loading) {
    return (
      <section
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      >
        <LoadingSkeleton />
      </section>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Machine Health Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time machine health monitoring and status breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Machine Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-700 outline-none transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <option value="all">All Machines ({machines.length})</option>
              {machines.map((m: any) => {
                const mId = String(m.id || m.machineId || m.machine_id || "");
                const mName = m.name || m.machineName || m.model || "Machine";
                return (
                  <option key={mId} value={mId}>
                    {mName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total Machines
            </p>

            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {totalMachines}
            </h3>
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full px-4 py-3 sm:px-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{
              top: 5,
              right: 20,
              left: -15,
              bottom: 5,
            }}
            barCategoryGap={18}
          >
            <CartesianGrid
              stroke="#CBD5E1"
              strokeOpacity={0.15}
              horizontal={true}
              vertical={false}
            />

            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 12,
                fill: "#64748B",
              }}
            />

            <YAxis
              type="category"
              dataKey="status"
              width={90}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 13,
                fontWeight: 500,
                fill: "#334155",
              }}
            />

            <Tooltip
              cursor={{
                fill: "rgba(148,163,184,0.08)",
              }}
              content={<CustomTooltip />}
            />

            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={18}>
              <LabelList
                dataKey="count"
                position="right"
                className="fill-slate-600 text-xs font-medium"
              />

              {sortedData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
        {sortedData.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[item.status],
              }}
            />

            <span className="text-sm text-slate-600 dark:text-slate-300">
              {item.status}
            </span>

            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
