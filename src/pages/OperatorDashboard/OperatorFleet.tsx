import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { fetchOperatorAssignments } from "../../redux/slices/assignedMachineSlice";
import { fetchMachineComponents } from "../../redux/slices/machineComponentSlice";
import ReactECharts from "echarts-for-react";
import {
  Truck,
  Search,
  RefreshCcw,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  HelpCircle,
  Download,
  Eye,
  X,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  User,
  Activity,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import toast from "react-hot-toast";

import tyreImg from "../../../src/assets/images/landingpageimages/FleetLogo/TyreLogo.png";
import engineImg from "../../../src/assets/images/landingpageimages/FleetLogo/Engine.png";
import hydraulicImg from "../../../src/assets/images/landingpageimages/FleetLogo/hydraulic.png";

/* ==========================================================
   TYPES
========================================================== */

type FleetStatus = "Healthy" | "Warning" | "Critical" | "Unknown";
type ComponentStatus = "ok" | "warn" | "crit";
type CategoryTab = "All Equipment" | "Excavators" | "Trucks" | "Dozers" | "Graders";

type InspectionParameter = {
  name: string;
  unit: string;
  safeMax: number;
  safeMin: number;
  defaultVal: number;
  description: string;
};

// Exact component shape returned by the assigned-machine/component API.
// Exact component fields returned by the backend assigned-machine response.
type ApiMachineComponent = {
  id: string;
  machineId: string;
  name: string;
  category: string;
  serialNumber: string;
  healthScore: number;
  condition: number;
  currentHours: number;
  inspectionParameters: InspectionParameter[];
  lastInspectedAt: string | null;
};

type FleetComponent = ApiMachineComponent & {
  status: ComponentStatus;
};

type FleetMachine = {
  id: string;
  machine: string;
  model: string;
  company: string;
  companyId: string;
  fleet: string;
  operator: string;
  location: string;
  type: string;
  health: string;
  healthPercent: number;
  status: FleetStatus;
  assignedOn: string;
  assignedBy: string;
  components: FleetComponent[];
};

type FleetStats = {
  totalMachines: number;
  healthy: number;
  maintenance: number;
  critical: number;
};

type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

interface HeatmapDataPoint {
  fleetIndex: number;
  componentIndex: number;
  healthScore: number;
}

const CATEGORY_TABS: readonly CategoryTab[] = [
  "All Equipment",
  "Excavators",
  "Trucks",
  "Dozers",
  "Graders",
];

const HEALTH_THRESHOLDS = { HEALTHY: 70, WARNING: 40 } as const;

function getHealthStatus(score: number): HealthStatus {
  if (score >= HEALTH_THRESHOLDS.HEALTHY) return "HEALTHY";
  if (score >= HEALTH_THRESHOLDS.WARNING) return "WARNING";
  return "CRITICAL";
}

function getFleetStatus(status: string): FleetStatus {
  if (status === "Healthy" || status === "Warning" || status === "Critical") {
    return status;
  }
  return "Unknown";
}

function getComponentStatus(score: number): ComponentStatus {
  if (score >= 70) return "ok";
  if (score >= 40) return "warn";
  return "crit";
}

function getStatusClasses(status: FleetStatus) {
  switch (status) {
    case "Critical":
      return {
        badge:
          "border-red-100 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
        dot: "bg-red-500",
        bar: "bg-red-500",
      };
    case "Warning":
      return {
        badge:
          "border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400",
        dot: "bg-orange-500",
        bar: "bg-orange-500",
      };
    case "Healthy":
      return {
        badge:
          "border-green-100 bg-green-50 text-green-600 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
        dot: "bg-green-500",
        bar: "bg-green-500",
      };
    case "Unknown":
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
        dot: "bg-slate-400",
        bar: "bg-slate-400",
      };
  }
}

function getComponentStatusLabel(status: ComponentStatus) {
  if (status === "crit") return "CRITICAL";
  if (status === "warn") return "WARNING";
  return "GOOD";
}

function getComponentBadgeClasses(status: ComponentStatus) {
  if (status === "crit")
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (status === "warn")
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
}

function getComponentBarColor(status: ComponentStatus) {
  if (status === "crit") return "bg-red-500";
  if (status === "warn") return "bg-orange-400";
  return "bg-green-500";
}

function getComponentImage(category: string): string | undefined {
  const key = category.trim().toUpperCase();
  if (key === "TYRE" || key === "TIRES" || key === "TIRE") return tyreImg;
  if (key === "ENGINE") return engineImg;
  if (key === "HYDRAULIC" || key === "HYDRAULICS") return hydraulicImg;
  return undefined;
}

function formatComponentName(component: FleetComponent) {
  return component.category;
}

function normalizeFleetComponent(component: any): FleetComponent {
  const healthScore = Number(
    component?.healthScore ??
      component?.health ??
      component?.score ??
      Number(component?.condition || 0) * 20,
  );

  return {
    id: String(component?.id ?? component?.componentId ?? ""),
    machineId: String(component?.machineId ?? ""),
    name: String(
      component?.name ??
        component?.componentName ??
        component?.description ??
        "",
    ),
    category: String(
      component?.category ??
        component?.componentCategory ??
        component?.componentType ??
        component?.name ??
        "",
    ),
    serialNumber: String(component?.serialNumber ?? component?.serial_number ?? ""),
    healthScore,
    condition: Number(component?.condition || 0),
    currentHours: Number(component?.currentHours || 0),
    inspectionParameters: Array.isArray(component?.inspectionParameters)
      ? component.inspectionParameters
      : [],
    lastInspectedAt: component?.lastInspectedAt || null,
    status: getComponentStatus(healthScore),
  };
}

function formatInspectionValue(
  parameter: FleetComponent["inspectionParameters"][number],
) {
  return `${parameter.defaultVal} ${parameter.unit}`;
}

function buildHeatmapOption(
  components: string[],
  fleets: string[],
  data: HeatmapDataPoint[],
  isDark: boolean,
) {
  const seriesData = data.map(
    ({ fleetIndex, componentIndex, healthScore }) =>
      [componentIndex, fleetIndex, healthScore] as [number, number, number],
  );

  const bg = isDark ? "#0f1117" : "#ffffff";
  const textPrimary = isDark ? "#e8e6e1" : "#1e1e1e";
  const textMuted = isDark ? "#6b6b72" : "#888780";
  const borderLine = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cellBorder = isDark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)";
  const monoStack = "'ui-monospace','SF Mono','Cascadia Code','JetBrains Mono',monospace";
  const sansStack = "'Inter','Segoe UI',system-ui,sans-serif";

  const tooltipFormatter = (params: any): string => {
    const [compIdx, fleetIdx, score] = params.value as [number, number, number];
    const fleet = fleets[fleetIdx];
    const component = components[compIdx];
    const status = getHealthStatus(score);
    const statusLabel =
      status === "HEALTHY" ? "Healthy" : status === "WARNING" ? "Warning" : "Critical";
    const tooltipBg = isDark ? "#1c1e26" : "#ffffff";
    const dividerClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const pal =
      status === "HEALTHY"
        ? { bg: isDark ? "#0a2e1f" : "#eaf3de", text: isDark ? "#5dcaa5" : "#3b6d11" }
        : status === "WARNING"
          ? { bg: isDark ? "#2e1e00" : "#faeeda", text: isDark ? "#ef9f27" : "#854f0b" }
          : { bg: isDark ? "#2e0a0a" : "#fcebeb", text: isDark ? "#f09595" : "#a32d2d" };

    return `
      <div style="font-family:${monoStack};min-width:190px;background:${tooltipBg};line-height:1;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.09em;color:${textMuted};text-transform:uppercase;padding-bottom:9px;margin-bottom:9px;border-bottom:.5px solid ${dividerClr};">${fleet} · ${component}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div style="font-size:28px;font-weight:700;letter-spacing:-.03em;color:${textPrimary};line-height:1;">${score}<span style="font-size:13px;font-weight:500;color:${textMuted};margin-left:2px;">%</span></div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:4px 10px;border-radius:5px;background:${pal.bg};color:${pal.text};white-space:nowrap;">${statusLabel}</div>
        </div>
      </div>
    `;
  };

  return {
    backgroundColor: bg,
    animation: true,
    animationDuration: 500,
    animationEasing: "cubicOut" as const,
    grid: { top: 24, right: 100, bottom: 52, left: 110, containLabel: false },
    xAxis: {
      type: "category" as const,
      data: components,
      position: "bottom" as const,
      splitArea: { show: false },
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: borderLine, width: 0.5 } },
      axisTick: { show: false },
      axisLabel: {
        color: textMuted,
        fontSize: 11,
        fontWeight: "bold" as const,
        fontFamily: monoStack,
        margin: 12,
        interval: 0,
      },
    },
    yAxis: {
      type: "category" as const,
      data: fleets,
      splitArea: { show: false },
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: borderLine, width: 0.5 } },
      axisTick: { show: false },
      axisLabel: {
        color: textMuted,
        fontSize: 11,
        fontWeight: "bold" as const,
        fontFamily: monoStack,
        margin: 12,
      },
    },
    visualMap: {
      type: "continuous" as const,
      min: 0,
      max: 100,
      show: true,
      orient: "vertical" as const,
      right: 12,
      top: "center" as const,
      itemWidth: 8,
      itemHeight: 100,
      borderRadius: 4,
      precision: 0,
      text: ["100%", "0%"],
      textStyle: { color: textMuted, fontSize: 10, fontFamily: sansStack },
      inRange: {
        color: isDark ? ["#7a1f1f", "#7a4a00", "#2d6a4f"] : ["#a32d2d", "#854f0b", "#3b6d11"],
      },
    },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: isDark ? "#1c1e26" : "#ffffff",
      borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
      borderWidth: 0.5,
      padding: [12, 16],
      extraCssText: `border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,${isDark ? "0.50" : "0.13"});`,
      textStyle: { color: textPrimary, fontSize: 12 },
      formatter: tooltipFormatter,
    },
    series: [
      {
        type: "heatmap" as const,
        data: seriesData,
        coordinateSystem: "cartesian2d" as const,
        label: {
          show: true,
          formatter: (params: any) => `${(params.value as [number, number, number])[2]}%`,
          fontSize: 10,
          fontWeight: "bold" as const,
          fontFamily: monoStack,
          color: "rgba(255,255,255,0.90)",
        },
        itemStyle: {
          borderRadius: 6,
          borderColor: cellBorder,
          borderWidth: 2,
        },
      },
    ],
  };
}

/* ==========================================================
   SMALL UI HELPERS
========================================================== */

const StatusIcon = ({ status }: { status: ComponentStatus }) => {
  if (status === "crit") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500 text-white">
        <AlertCircle size={18} />
      </div>
    );
  }
  if (status === "warn") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white">
        <Circle size={14} fill="white" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-white">
      <CheckCircle2 size={18} />
    </div>
  );
};

const HealthBar = ({ percent, status }: { percent: number; status: ComponentStatus }) => (
  <div className="w-full">
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div
        className={`h-full rounded-full transition-all duration-700 ${getComponentBarColor(status)}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

const ComponentOverviewCard = ({ component }: { component: FleetComponent }) => {
  const image = getComponentImage(component.category);
  const displayLabel = formatComponentName(component);

  return (
    <div
      className={`group relative rounded-xl border bg-white sm:p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
        component.status === "crit"
          ? "border-red-300 dark:border-red-900 animate-status-blink"
          : "border-slate-200 hover:border-blue-200 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span
            className={`absolute left-0 top-0 z-10 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] shadow-sm sm:px-3 sm:text-[10px] ${getComponentBadgeClasses(component.status)}`}
          >
            {getComponentStatusLabel(component.status)}
          </span>
          <div className="flex justify-center">
            {image ? (
              <img
                src={image}
                alt={displayLabel}
                className={`h-40 w-40 object-contain transition-transform duration-300 group-hover:scale-105 ${
                  component.status === "crit" ? "animate-icon-pulse" : ""
                }`}
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center text-slate-400">
                <Activity size={42} />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="break-words text-[15px] font-bold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-[16px]">
            {displayLabel}
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
            Overall Health
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mt-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">
          Health Score
        </p>
        <div className="flex items-end">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {component.healthScore}
          </span>
          <span className="mb-0.5 ml-1 text-base font-bold text-slate-400 sm:text-lg">%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getComponentBarColor(component.status)}`}
            style={{ width: `${component.healthScore}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800 sm:mt-5 sm:space-y-2 sm:pt-4">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
            Current Hours
          </span>
          <span className="flex-shrink-0 text-[11px] font-semibold text-slate-800 dark:text-slate-200 sm:text-[12px]">
            {component.currentHours.toLocaleString("en-IN")} Hrs
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
            Serial Number
          </span>
          <span className="max-w-[55%] truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200 sm:text-[12px]">
            {component.serialNumber}
          </span>
        </div>
        {component.inspectionParameters.map((parameter) => (
          <div
            key={`${component.id}-${parameter.name}`}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
          >
            <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
              {parameter.name}
            </span>
            <span className="flex-shrink-0 text-[11px] font-semibold text-slate-800 dark:text-slate-200 sm:text-[12px]">
              {formatInspectionValue(parameter)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================
   MACHINE DETAIL MODAL
========================================================== */

const MachineModal = ({ machine, onClose }: { machine: FleetMachine; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "components">("overview");
  const statusStyles = getStatusClasses(machine.status);

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:border-slate-700 dark:bg-slate-900"
        style={{ maxHeight: "90vh" }}
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/15">
                <Truck size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black">{machine.machine}</h2>
                <p className="mt-0.5 text-sm text-blue-100">
                  {machine.id} · {machine.fleet} · {machine.company}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-bold ${statusStyles.badge}`}
              >
                <div className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
                {machine.status}
              </span>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 transition hover:bg-white/25"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-1">
            {(["overview", "components"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-[12px] font-bold capitalize transition ${
                  activeTab === tab ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { icon: User, label: "Operator", value: machine.operator },
                  { icon: MapPin, label: "Location", value: machine.location },
                  { icon: Truck, label: "Type", value: machine.type },
                  { icon: Activity, label: "Company", value: machine.company },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-[18px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center gap-2 text-slate-400">
                        <Icon size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{item.label}</p>
                      </div>
                      <h4 className="mt-2 text-[14px] font-black text-slate-900 dark:text-white">
                        {item.value}
                      </h4>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Overall Health
                  </p>
                  <div className="mb-3 flex items-end gap-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      {machine.healthPercent}
                    </span>
                    <span className="mb-1 text-lg font-bold text-slate-400">%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${statusStyles.bar}`}
                      style={{ width: `${machine.healthPercent}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Assignment
                  </p>
                  <div className="mt-4 space-y-3 text-[12px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Assigned On</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{machine.assignedOn}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Assigned By</span>
                      <span className="font-bold text-right text-slate-700 dark:text-slate-200">{machine.assignedBy}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Components</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{machine.components.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "components" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {machine.components.map((comp) => {
                const image = getComponentImage(comp.category);
                return (
                  <div
                    key={comp.id}
                    className="rounded-[18px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="mb-5 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {image ? (
                          <img src={image} alt={formatComponentName(comp)} className="h-16 w-16 object-contain" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center text-slate-400">
                            <Activity size={26} />
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">
                            {formatComponentName(comp)}
                          </h3>
                          <p className="text-xs text-slate-500">Component Health</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getComponentBadgeClasses(comp.status)}`}
                      >
                        {getComponentStatusLabel(comp.status)}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Overall Health</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{comp.healthScore}%</span>
                      </div>
                      <HealthBar percent={comp.healthScore} status={comp.status} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
                        <span className="text-xs text-slate-500">Serial Number</span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">{comp.serialNumber}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
                        <span className="text-xs text-slate-500">Current Hours</span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {comp.currentHours.toLocaleString("en-IN")} hrs
                        </span>
                      </div>
                      {comp.inspectionParameters.map((parameter) => (
                        <div
                          key={`${comp.id}-${parameter.name}`}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-slate-900"
                        >
                          <span className="text-xs text-slate-500">{parameter.name}</span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {formatInspectionValue(parameter)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            onClick={onClose}
            className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function EngineerFleet() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentMachine, assignedMachines, assignmentHistory, loading, error } = useSelector(
    (state: RootState) => state.assignedMachine,
  );
  const { components } = useSelector((state: RootState) => state.machineComponent);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>("All Equipment");
  const [statusFilter, setStatusFilter] = useState<FleetStatus | "All">("All");
  const [selectedMachine, setSelectedMachine] = useState<FleetMachine | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [sortField, setSortField] = useState<keyof FleetMachine | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [overviewMachine, setOverviewMachine] = useState<FleetMachine | null>(null);
  const [isDark, setIsDark] = useState(false);

  const fetchDashboard = useCallback(() => {
    dispatch(fetchOperatorAssignments());
  }, [dispatch]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (currentMachine?.machineId) {
      dispatch(fetchMachineComponents(currentMachine.machineId));
    }
  }, [dispatch, currentMachine?.machineId]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const normalizedComponents = useMemo<FleetComponent[]>(() => {
    const apiComponents = Array.isArray(components)
      ? (components as unknown as Partial<ApiMachineComponent>[])
      : [];

    return apiComponents.map(normalizeFleetComponent);
  }, [components]);

  const fleetTable = useMemo<FleetMachine[]>(() => {
    return assignedMachines.map((machine) => {
      const embeddedComponents = Array.isArray(machine.components)
        ? machine.components.map(normalizeFleetComponent)
        : [];
      const liveComponents = normalizedComponents.filter(
        (component) =>
          component.machineId === machine.machineId || !component.machineId,
      );
      const componentMap = new Map<string, FleetComponent>();

      [...embeddedComponents, ...liveComponents].forEach((component) => {
        const key = component.id || `${component.category}-${component.serialNumber}`;
        if (!componentMap.has(key)) componentMap.set(key, component);
      });

      const machineComponents = Array.from(componentMap.values());
      const healthPercent = machine.healthScore ?? machine.overallHealth;

      return {
        id: machine.machineId,
        machine: machine.machineName,
        model: machine.model,
        company: machine.companyName,
        companyId: machine.companyId,
        fleet: machine.serialNumber,
        operator: machine.assignedOperatorName,
        location: machine.site || machine.location,
        type: machine.equipmentType || machine.fuelType,
        health: `${healthPercent}%`,
        healthPercent,
        status: getFleetStatus(machine.healthStatus),
        assignedOn: machine.assignedAt || machine.assignedOn,
        assignedBy: machine.assignedSupervisorName || machine.assignedBy,
        components: machineComponents,
      };
    });
  }, [assignedMachines, currentMachine?.machineId, normalizedComponents]);

  const stats = useMemo<FleetStats>(() => {
    return {
      totalMachines: fleetTable.length,
      healthy: fleetTable.filter((machine) => machine.status === "Healthy").length,
      maintenance: fleetTable.filter((machine) => machine.status === "Warning").length,
      critical: fleetTable.filter((machine) => machine.status === "Critical").length,
    };
  }, [fleetTable]);

const heatmapComponents = useMemo<string[]>(() => {
  const seen = new Set<string>();
  const componentNames: string[] = [];

  fleetTable.forEach((machine) => {
    machine.components.forEach((component) => {
      const name = formatComponentName(component).trim();

      if (!name) return;

      const key = name.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        componentNames.push(name);
      }
    });
  });

  return componentNames;
}, [fleetTable]);

const heatmapData = useMemo<HeatmapDataPoint[]>(() => {
  return fleetTable.flatMap((machine, fleetIndex) =>
    heatmapComponents
      .map((componentName, componentIndex) => {
        const machineComponent = machine.components.find(
          (component) =>
            formatComponentName(component).trim().toLowerCase() ===
            componentName.trim().toLowerCase()
        );

        if (!machineComponent) return null;

        return {
          fleetIndex,
          componentIndex,
          healthScore: Number(machineComponent.healthScore),
        };
      })
      .filter(
        (item): item is HeatmapDataPoint => item !== null
      )
  );
}, [fleetTable, heatmapComponents]);





  const heatMapOption = useMemo(
    () =>
      buildHeatmapOption(
        heatmapComponents,
        fleetTable.map((machine) => machine.fleet),
        heatmapData,
        isDark,
      ),
    [heatmapComponents, fleetTable, heatmapData, isDark],
  );

  useEffect(() => {
    setOverviewMachine((previous) => {
      if (!fleetTable.length) return null;
      if (previous) {
        const current = fleetTable.find((machine) => machine.id === previous.id);
        if (current) return current;
      }
      return fleetTable[0];
    });
  }, [fleetTable]);

  const filteredFleet = useMemo(() => {
    let rows = fleetTable.filter((machine) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        machine.machine.toLowerCase().includes(query) ||
        machine.operator.toLowerCase().includes(query) ||
        machine.id.toLowerCase().includes(query) ||
        machine.location.toLowerCase().includes(query);

      const matchesCategory =
        activeTab === "All Equipment" ||
        machine.type.toLowerCase().includes(activeTab.toLowerCase().replace(/s$/, ""));

      const matchesStatus = statusFilter === "All" || machine.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortField) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return rows;
  }, [fleetTable, search, activeTab, statusFilter, sortField, sortDir]);

  const handleSort = (field: keyof FleetMachine) => {
    if (sortField === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir("asc");
  };

  const SortIndicator = ({ field }: { field: keyof FleetMachine }) => {
    if (sortField !== field) return <Minus size={10} className="ml-1 opacity-30" />;
    return sortDir === "asc" ? (
      <TrendingUp size={10} className="ml-1 text-blue-500" />
    ) : (
      <TrendingDown size={10} className="ml-1 text-blue-500" />
    );
  };

  const exportFleetReport = () => {
    const rows = [
      ["Machine ID", "Machine", "Company", "Fleet", "Operator", "Location", "Type", "Health", "Status", "Assigned On", "Assigned By"].join(","),
      ...fleetTable.map((machine) =>
        [
          machine.id,
          machine.machine,
          machine.company,
          machine.fleet,
          machine.operator,
          machine.location,
          machine.type,
          machine.health,
          machine.status,
          machine.assignedOn,
          machine.assignedBy,
        ].join(","),
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "operator-assigned-machine-report.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-5 dark:bg-[#020617]">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-7 py-7 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />
          <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/20 bg-white/10 backdrop-blur-md">
                  <Truck className="text-white" size={24} />
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                    <Activity size={14} />
                    Machine Operations Center
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-white">Machine Monitoring</h1>
                  <p className="mt-2 text-sm leading-6 text-blue-100">
                    Monitor your assigned machine health, operational activity, alerts and performance metrics from a centralized dashboard.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Assigned Machines", value: stats.totalMachines, icon: Truck, color: "bg-blue-100 text-blue-600" },
            { title: "Healthy", value: stats.healthy, icon: CheckCircle2, color: "bg-green-100 text-green-600" },
            { title: "Maintenance", value: stats.maintenance, icon: AlertCircle, color: "bg-orange-100 text-orange-600" },
            { title: "Critical", value: stats.critical, icon: AlertTriangle, color: "bg-red-100 text-red-600" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${item.color}`}>
                  <Icon size={24} />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">{item.title}</p>
                <h3 className="mt-1 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {loading ? <span className="inline-block h-10 w-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" /> : item.value}
                </h3>
              </div>
            );
          })}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900 sm:text-xl dark:text-white">Fleet Component Health Map</h3>
              <p className="mt-1 text-sm text-slate-500">Fleet-wise component health monitoring — hover a cell for details.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["Healthy", "Warning", "Critical"].map((label) => (
                <span key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${label === "Healthy" ? "bg-green-500/20 text-green-600 dark:bg-green-500/25 dark:text-green-400" : label === "Warning" ? "bg-amber-500/20 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400" : "bg-red-500/20 text-red-600 dark:bg-red-500/25 dark:text-red-400"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-[280px] items-center justify-center sm:h-[340px]">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <RefreshCcw size={24} className="animate-spin" />
                <p className="text-sm">Loading health data…</p>
              </div>
            </div>
          ) : heatmapData.length ? (
            <div className="h-[320px] w-full sm:h-[340px]">
              <ReactECharts option={heatMapOption} style={{ height: "100%", width: "100%" }} notMerge />
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No component health data available.</div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Component Health Overview</h3>
              <p className="mt-1 text-sm text-slate-500">
                {overviewMachine ? `Showing live component health for ${overviewMachine.machine}` : "Select a machine from the table below to see its component health."}
              </p>
            </div>
            {overviewMachine && (
              <button
                onClick={() => {
                  setSelectedMachine(overviewMachine);
                  setOpenModal(true);
                }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                View Detailed Analytics
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-[22px] bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : overviewMachine?.components.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {overviewMachine.components.map((component) => (
                <ComponentOverviewCard key={component.id} component={component} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Truck size={36} className="text-slate-300" />
              <p className="mt-3 text-sm">No component data available.</p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#081028]">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
            <div>
              <h3 className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-white">Company Fleet</h3>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Monitor assigned company machines. Click a row to load it above.</p>
            </div>
            <div className="rounded-full bg-blue-50 px-4 py-2 text-[12px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              {filteredFleet.length} Machines
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/20">
                  {[
                    { label: "Machine", field: "machine" as keyof FleetMachine },
                    { label: "Company", field: "company" as keyof FleetMachine },
                    { label: "Fleet ID", field: "fleet" as keyof FleetMachine },
                    { label: "Operator", field: "operator" as keyof FleetMachine },
                    { label: "Components", field: null },
                    { label: "Health", field: "healthPercent" as keyof FleetMachine },
                    { label: "Actions", field: null },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      className={`px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 ${field ? "cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-200" : ""}`}
                      onClick={() => field && handleSort(field)}
                    >
                      <span className="inline-flex items-center">
                        {label}
                        {field && <SortIndicator field={field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="h-[95px] border-b border-slate-100 dark:border-slate-800">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="h-8 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                        </td>
                      </tr>
                    ))
                  : filteredFleet.map((machine) => {
                      const statusStyles = getStatusClasses(machine.status);
                      const isActiveOverview = overviewMachine?.id === machine.id;
                      return (
                        <tr
                          key={machine.id}
                          onClick={() => setOverviewMachine(machine)}
                          className={`h-[95px] cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/20 ${isActiveOverview ? "bg-blue-50/60 dark:bg-blue-500/5" : ""}`}
                        >
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-100 dark:bg-blue-500/10">
                                <Truck className="text-blue-600 dark:text-blue-400" size={18} />
                              </div>
                              <div>
                                <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white">{machine.machine}</h4>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400">{machine.company}</p>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">{machine.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                              <Activity size={13} className="text-slate-400" />
                              {machine.company}
                            </div>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{machine.fleet}</span>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[12px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                {machine.operator.charAt(0)}
                              </div>
                              <div>
                                <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">{machine.operator}</span>
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <MapPin size={10} />
                                  {machine.location}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-middle">
                            <div className="flex items-center justify-center gap-4">
                              {machine.components.map((component) => (
                                <div key={component.id} className="flex min-w-16 flex-col items-center text-center">
                                  <span className="text-[13px] font-bold text-green-600 dark:text-green-400">{component.healthScore}%</span>
                                  <span className="mt-1 max-w-20 truncate text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                                    {formatComponentName(component)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <span className={`inline-flex min-w-[110px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold ${statusStyles.badge}`}>
                              <div className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
                              {machine.status}
                            </span>
                          </td>

                          <td className="px-6 py-4 align-middle">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedMachine(machine);
                                setOpenModal(true);
                              }}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[12px] font-medium text-white transition hover:bg-blue-700"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>

            {!loading && !filteredFleet.length && (
              <div className="flex flex-col items-center justify-center py-20">
                <Truck size={40} className="text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">No Machines Found</h3>
                <p className="mt-1 text-sm text-slate-500">Try a different keyword or filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {openModal && selectedMachine && (
        <MachineModal
          machine={selectedMachine}
          onClose={() => {
            setOpenModal(false);
            setSelectedMachine(null);
          }}
        />
      )}
    </div>
  );
}