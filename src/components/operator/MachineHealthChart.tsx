import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Loader2, RefreshCw, Settings2 } from "lucide-react";

import { componentService } from "../../services/companyadmin/componentService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApiComponent = {
  id: string;
  machineId: string;
  category: string;
  description: string;
  serialNumber: string;
  currentHours?: number;
  plannedLife?: number;
  condition?: number;
};

type MachineType = {
  machineId: string;
  machineName?: string;
  machineType?: string;
  fleetId?: string;
  hoursRun?: number;
};

type ComponentCondition = "Healthy" | "Warning" | "Critical";

type Props = {
  machine?: MachineType;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getArrayData = <T = any,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

// Normalizes a raw component API record (snake_case / camelCase fallback)
const normalizeComponent = (raw: any): ApiComponent => ({
  id: String(raw?.id ?? raw?._id ?? raw?.componentId ?? raw?.component_id ?? ""),
  machineId: String(raw?.machineId ?? raw?.machine_id ?? ""),
  category: raw?.category ?? "",
  description: raw?.description ?? raw?.category ?? "Component",
  serialNumber: raw?.serialNumber ?? raw?.serial_number ?? "",
  currentHours: Number(raw?.currentHours ?? raw?.current_hours ?? 0),
  plannedLife: Number(raw?.plannedLife ?? raw?.planned_life ?? 0),
  condition: Number(raw?.condition ?? 0),
});

// condition is stored 0-5 on the backend; chart/UI works in 0-100% health
const conditionToHealth = (condition?: number) =>
  Math.round(Math.min(Math.max(Number(condition || 0), 0), 5) * 20);

const getConditionStatus = (condition?: number): ComponentCondition => {
  const value = Number(condition || 0);
  if (value >= 4) return "Healthy";
  if (value === 3) return "Warning";
  return "Critical";
};

const BRAND_BLUE = "#2563eb"; // blue-600 — matches "Overall X%" badge accent

// Tracks the `dark` class on <html> so Recharts (which can't read Tailwind
// classes) picks the right colors. Kept local — no new files.
const useIsDarkMode = () => {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MachineHealthChart: React.FC<Props> = ({ machine }) => {
  const [components, setComponents] = useState<ApiComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = useIsDarkMode();

  const machineId = machine?.machineId;

  const loadComponents = async () => {
    if (!machineId) {
      setComponents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // BACKEND TODO: confirm componentService.getComponents envelope stays stable
      const response = await componentService.getComponents(machineId);
      const raw = getArrayData<any>(response);
      setComponents(raw.map(normalizeComponent));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't load component health data.",
      );
      setComponents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId]);

  const chartData = useMemo(
    () =>
      components.map((component) => ({
        name: component.description || component.category || "Component",
        health: conditionToHealth(component.condition),
        currentHours: component.currentHours || 0,
      })),
    [components],
  );

  const overallHealth = chartData.length
    ? Math.round(chartData.reduce((sum, c) => sum + c.health, 0) / chartData.length)
    : 0;

  const axisColor = isDark ? "#94A3B8" : "#64748B";
  const gridColor = isDark ? "#1E293B" : "#E2E8F0";
  const tooltipBg = isDark ? "#0b1728" : "#FFFFFF";
  const tooltipBorder = isDark ? "#1E293B" : "#E2E8F0";
  const tooltipText = isDark ? "#F1F5F9" : "#0F172A";

  // -- Loading -----------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex h-[380px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading component health…
      </div>
    );
  }

  // -- Error ---------------------------------------------------------------
  if (error) {
    return (
      <div className="flex h-[380px] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
        <button
          onClick={loadComponents}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  // -- Empty -----------------------------------------------------------
  if (!chartData.length) {
    return (
      <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-center">
        <Settings2 className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          No components found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This machine doesn&apos;t have any components attached yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-12">
      {/* Chart */}
      <div className="xl:col-span-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Component Health Overview
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Health percentage of machine components
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
              Overall {overallHealth}%
            </span>
          </div>
        </div>

        <div className="h-[300px] w-full sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              barCategoryGap="25%"
            >
              <CartesianGrid stroke={gridColor} strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: axisColor, fontSize: 12 }}
                dy={10}
              />
              <YAxis
                width={42}
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={{ fill: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.05)" }}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "12px",
                  color: tooltipText,
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
                }}
                labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: "6px" }}
                formatter={(value) => [`${value}%`, "Health"]}
              />
              <Bar
                dataKey="health"
                name="Health"
                fill={BRAND_BLUE}
                radius={[8, 8, 3, 3]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Healthy 80–100%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Warning 50–79%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Critical 0–49%</span>
          </div>
        </div>
      </div>

      {/* Scrollable component details */}
      <div className="xl:col-span-4">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Component Details
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current health and operating hours
          </p>
        </div>

        <div
          className="hme-hide-scrollbar max-h-[380px] space-y-3 overflow-y-auto pr-1"
        >
          {components.map((component) => {
            const health = conditionToHealth(component.condition);
            const status = getConditionStatus(component.condition);
            const badgeClass =
              status === "Healthy"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                : status === "Warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300";
            const barClass =
              health >= 80 ? "bg-emerald-500" : health >= 50 ? "bg-amber-500" : "bg-rose-500";

            return (
              <div
                key={component.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {component.description || component.category}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                      {(component.currentHours || 0).toLocaleString("en-IN")} hrs
                      {component.serialNumber ? ` • SN ${component.serialNumber}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                  >
                    {health}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                    style={{ width: `${Math.min(Math.max(health, 0), 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MachineHealthChart;