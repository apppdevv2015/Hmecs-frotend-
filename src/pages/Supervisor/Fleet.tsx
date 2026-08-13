"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { machineService } from "../../services/companyadmin/machineService";
import { intelligenceService } from "../../services/SuperAdmin/intelligenceService";

import tyreImg from "../../../src/assets/images/landingpageimages/FleetLogo/TyreLogo.png";
import engineImg from "../../../src/assets/images/landingpageimages/FleetLogo/Engine.png";
import hydraulicImg from "../../../src/assets/images/landingpageimages/FleetLogo/hydraulic.png";
import suspensionImg from "../../../src/assets/images/landingpageimages/FleetLogo/suspension.png";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  Wrench,
  ShieldCheck,
  MapPin,
  Clock,
  User,
  Activity,
  Filter,
  ChevronDown,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type FleetStatus = "Healthy" | "Warning" | "Critical";

type FleetStats = {
  totalMachines: number;
  healthy: number;
  maintenance: number;
  critical: number;
};

type ComponentStatus = "ok" | "warn" | "crit" | "none";

// BACKEND TODO: replace with real sensor reading keys once API contract for
// per-component sub-metrics (pressure, temperature, oil/coolant levels) is finalized.
type SubMetric = {
  label: string;
  value: string;
};

type MachineComponent = {
  status: ComponentStatus;
  label: string;
  life: string;
  lifePercent: number;
  // Overall health = inverse of "life used %" until backend exposes a direct health score.
  overallHealthPercent: number | null;
  subMetrics: SubMetric[];
};

type MaintenanceRecord = {
  date: string;
  type: string;
  technician: string;
  notes: string;
};

type FleetMachine = {
  id: string;
  machine: string;
  company: string;
  fleet: string;
  operator: string;
  location: string;
  type: string;
  health: string;
  healthPercent: number;
  status: FleetStatus;
  lastSeen: string;
  hoursRun: number;
  fuelLevel: number;
  tyre: MachineComponent;
  engine: MachineComponent;
  hydraulic: MachineComponent;
  transmission: MachineComponent;
  maintenanceHistory: MaintenanceRecord[];
};

type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

interface HeatmapDataPoint {
  fleetIndex: number;
  componentIndex: number;
  healthScore: number;
}

const CATEGORY_TABS = [
  "All Equipment",
  "Excavators",
  "Trucks",
  "Dozers",
  "Graders",
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number];

const HEALTH_THRESHOLDS = { HEALTHY: 70, WARNING: 40 } as const;

function getHealthStatus(score: number): HealthStatus {
  if (score >= HEALTH_THRESHOLDS.HEALTHY) return "HEALTHY";
  if (score >= HEALTH_THRESHOLDS.WARNING) return "WARNING";
  return "CRITICAL";
}

interface PaletteStop {
  fill: string;
  badgeBg: string;
  badgeText: string;
}

const PALETTE: Record<HealthStatus, { light: PaletteStop; dark: PaletteStop }> =
  {
    HEALTHY: {
      light: { fill: "#3b6d11", badgeBg: "#eaf3de", badgeText: "#3b6d11" },
      dark: { fill: "#2d6a4f", badgeBg: "#0a2e1f", badgeText: "#5dcaa5" },
    },
    WARNING: {
      light: { fill: "#854f0b", badgeBg: "#faeeda", badgeText: "#854f0b" },
      dark: { fill: "#7a4a00", badgeBg: "#2e1e00", badgeText: "#ef9f27" },
    },
    CRITICAL: {
      light: { fill: "#a32d2d", badgeBg: "#fcebeb", badgeText: "#a32d2d" },
      dark: { fill: "#7a1f1f", badgeBg: "#2e0a0a", badgeText: "#f09595" },
    },
  };

function resolvePalette(score: number, isDark: boolean): PaletteStop {
  const status = getHealthStatus(score);
  return isDark ? PALETTE[status].dark : PALETTE[status].light;
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
  const monoStack =
    "'ui-monospace','SF Mono','Cascadia Code','JetBrains Mono',monospace";
  const sansStack = "'Inter','Segoe UI',system-ui,sans-serif";

  const tooltipFormatter = (params: any): string => {
    const [compIdx, fleetIdx, score] = params.value as [number, number, number];
    const fleet = fleets[fleetIdx] ?? "—";
    const component = components[compIdx] ?? "—";
    const status = getHealthStatus(score);
    const pal = resolvePalette(score, isDark);
    const statusLabel =
      status === "HEALTHY"
        ? "Healthy"
        : status === "WARNING"
          ? "Warning"
          : "Critical";
    const tooltipBg = isDark ? "#1c1e26" : "#ffffff";
    const dividerClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

    return `
        <div style="font-family:${monoStack};min-width:190px;background:${tooltipBg};line-height:1;">
          <div style="font-size:10px;font-weight:700;letter-spacing:.09em;color:${textMuted};text-transform:uppercase;padding-bottom:9px;margin-bottom:9px;border-bottom:.5px solid ${dividerClr};">${fleet}&nbsp;·&nbsp;${component}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
            <div style="font-size:28px;font-weight:700;letter-spacing:-.03em;color:${textPrimary};line-height:1;">${score}<span style="font-size:13px;font-weight:500;color:${textMuted};margin-left:2px;">%</span></div>
            <div style="font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:4px 10px;border-radius:5px;background:${pal.badgeBg};color:${pal.badgeText};white-space:nowrap;">${statusLabel}</div>
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
        color: isDark
          ? [
              PALETTE.CRITICAL.dark.fill,
              PALETTE.WARNING.dark.fill,
              PALETTE.HEALTHY.dark.fill,
            ]
          : [
              PALETTE.CRITICAL.light.fill,
              PALETTE.WARNING.light.fill,
              PALETTE.HEALTHY.light.fill,
            ],
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
          formatter: (params: any) =>
            `${(params.value as [number, number, number])[2]}%`,
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
        emphasis: {
          disabled: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.24)",
            borderWidth: 2,
          },
          label: {
            show: true,
            fontSize: 11,
            fontWeight: "bold" as const,
            fontFamily: monoStack,
            color: "#ffffff",
          },
        },
      },
    ],
  };
}

/* ==========================================================
    MISC HELPERS
  ========================================================== */

const getStatusClasses = (status: FleetStatus) => {
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
    default:
      return {
        badge:
          "border-green-100 bg-green-50 text-green-600 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
        dot: "bg-green-500",
        bar: "bg-green-500",
      };
  }
};

const getComponentBarColor = (status: ComponentStatus) => {
  if (status === "crit") return "bg-red-500";
  if (status === "warn") return "bg-orange-400";
  return "bg-green-500";
};

const getComponentStatusLabel = (status: ComponentStatus) => {
  if (status === "crit") return "CRITICAL";
  if (status === "warn") return "WARNING";
  if (status === "ok") return "GOOD";
  return "UNKNOWN";
};

const getComponentBadgeClasses = (status: ComponentStatus) => {
  if (status === "crit")
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (status === "warn")
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (status === "ok")
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
};

// BACKEND TODO: sub-metrics are placeholder values until intelligenceService
// exposes real sensor readings (air pressure, coolant level, oil temperature, etc.)
// per component category. Replace the fallback literals below with the real
// fields once the API contract is confirmed (e.g. intelligence?.airPressure).
const buildSubMetrics = (
  category: "tyre" | "engine" | "hydraulic" | "transmission",
  intelligence: any,
): SubMetric[] => {
  switch (category) {
    case "tyre":
      return [
        {
          label: "Air Pressure",
          value: intelligence?.airPressure
            ? `${intelligence.airPressure} PSI`
            : "32 PSI",
        },
        {
          label: "Tyre Temperature",
          value: intelligence?.tyreTemperature
            ? `${intelligence.tyreTemperature}°C`
            : "45°C",
        },
      ];
    case "engine":
      return [
        {
          label: "Engine Temperature",
          value: intelligence?.engineTemperature
            ? `${intelligence.engineTemperature}°C`
            : "90°C",
        },
        {
          label: "Engine Oil Level",
          value: intelligence?.oilLevel ? `${intelligence.oilLevel}%` : "100%",
        },
        {
          label: "Coolant Level",
          value: intelligence?.coolantLevel
            ? `${intelligence.coolantLevel}%`
            : "100%",
        },
      ];
    case "hydraulic":
      return [
        {
          label: "Oil Level",
          value: intelligence?.oilLevel ? `${intelligence.oilLevel}%` : "100%",
        },
        {
          label: "Hydraulic Pressure",
          value: intelligence?.pressure
            ? `${intelligence.pressure} Bar`
            : "210 Bar",
        },
        {
          label: "Oil Temperature",
          value: intelligence?.oilTemperature
            ? `${intelligence.oilTemperature}°C`
            : "55°C",
        },
      ];
    case "transmission":
      return [
        {
          label: "Fluid Level",
          value: intelligence?.fluidLevel
            ? `${intelligence.fluidLevel}%`
            : "0%",
        },
        {
          label: "Gear Temperature",
          value: intelligence?.gearTemperature
            ? `${intelligence.gearTemperature}°C`
            : "0°C",
        },
      ];
    default:
      return [];
  }
};

const exportFleetReport = (data: FleetMachine[]) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text("Supervisor Fleet Report", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(120);

  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

  // Table
  autoTable(doc, {
    startY: 35,

    head: [
      [
        "Machine ID",
        "Machine",
        "Company",
        "Fleet",
        "Operator",
        "Location",
        "Type",
        "Health",
        "Status",
        "Hours",
        "Fuel",
        "Last Seen",
      ],
    ],

    body: data.map((m) => [
      m.id,
      m.machine,
      m.company,
      m.fleet,
      m.operator,
      m.location,
      m.type,
      `${m.healthPercent}%`,
      m.status,
      m.hoursRun,
      `${m.fuelLevel}%`,
      m.lastSeen,
    ]),

    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: "middle",
    },

    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },

    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },

    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 8) {
        const value = String(hookData.cell.raw);

        if (value === "Healthy") {
          hookData.cell.styles.textColor = [34, 197, 94];
        }

        if (value === "Warning") {
          hookData.cell.styles.textColor = [249, 115, 22];
        }

        if (value === "Critical") {
          hookData.cell.styles.textColor = [239, 68, 68];
        }
      }
    },

    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;
      doc.setFontSize(9);
      doc.text(
        `Page ${pageNumber}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 8,
      );
    },
  });
  doc.save("Supervisor-Fleet-Report.pdf");
};

/* ==========================================================
    STATUS ICON SUB-COMPONENT
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
  if (status === "ok") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-white">
        <CheckCircle2 size={18} />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-slate-400 dark:bg-slate-700">
      <HelpCircle size={18} />
    </div>
  );
};

/* ==========================================================
    HEALTH BAR SUB-COMPONENT
  ========================================================== */

const HealthBar = ({
  percent,
  status,
  showLabel = true,
}: {
  percent: number;
  status: ComponentStatus;
  showLabel?: boolean;
}) => (
  <div className="w-full">
    {showLabel && (
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">
          {percent}%
        </span>
      </div>
    )}
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div
        className={`h-full rounded-full transition-all duration-700 ${getComponentBarColor(status)}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

/* ==========================================================
    FUEL GAUGE SUB-COMPONENT
  ========================================================== */

const FuelGauge = ({ level }: { level: number }) => {
  const color =
    level > 60
      ? "text-green-500"
      : level > 30
        ? "text-orange-500"
        : "text-red-500";
  const barColor =
    level > 60 ? "bg-green-500" : level > 30 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <Activity size={14} className={color} />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold ${color}`}>{level}%</span>
    </div>
  );
};

/* ==========================================================
    COMPONENT HEALTH OVERVIEW CARD (Tyre / Engine / Hydraulic / Transmission)
  ========================================================== */

const COMPONENT_ICON_MAP: Record<string, any> = {
  TYRE: tyreImg,
  ENGINE: engineImg,
  HYDRAULIC: hydraulicImg,
  TRANSMISSION: suspensionImg,
};

const ComponentOverviewCard = ({
  component,
}: {
  component: MachineComponent;
}) => {
  const image = COMPONENT_ICON_MAP[component.label];
  const displayLabel =
    component.label.charAt(0) + component.label.slice(1).toLowerCase();

  return (
    <div
      className={`group relative rounded-xl border bg-white  sm:p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
        component.status === "crit"
          ? "border-red-300 dark:border-red-900 animate-status-blink"
          : "border-slate-200 hover:border-blue-200 dark:border-slate-800"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          {/* Status Badge */}
          <span
            className={`absolute left-0 top-0 z-10 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] shadow-sm sm:px-3 sm:text-[10px] ${getComponentBadgeClasses(
              component.status,
            )}`}
          >
            {getComponentStatusLabel(component.status)}
          </span>

          {/* Center Image */}
          <div className="flex justify-center">
            <img
              src={image ?? tyreImg}
              alt={displayLabel}
              className={`h-40 w-40 object-contain transition-transform duration-300 group-hover:scale-105 ${
                component.status === "crit" ? "animate-icon-pulse" : ""
              }`}
            />
          </div>
        </div>

        {/* Title */}
        <div className="min-w-0">
          <h3 className="break-words text-[15px] font-bold leading-snug tracking-tight text-slate-900 dark:text-white sm:text-[16px]">
            {displayLabel}
          </h3>

          <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
            Overall Health
          </p>
        </div>
      </div>

      {/* Health Percentage */}
      <div className="mt-4 sm:mt-5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">
          Health Score
        </p>

        {component.overallHealthPercent === null ? (
          <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50 p-4 text-center">
            <p className="font-semibold text-orange-700">Component Required</p>

            <p className="mt-1 text-sm text-slate-500">
              No component data available.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {component.overallHealthPercent}
              </span>

              <span className="mb-0.5 ml-1 text-base font-bold text-slate-400 sm:text-lg">
                %
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getComponentBarColor(
                  component.status,
                )}`}
                style={{ width: `${component.overallHealthPercent}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Metrics */}
      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800 sm:mt-5 sm:space-y-2 sm:pt-4">
        {component.overallHealthPercent === null ? (
          <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4 text-center dark:border-orange-700 dark:bg-orange-900/20">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
              Component Required
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Register this component to view health metrics.
            </p>
          </div>
        ) : (
          component.subMetrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
                {metric.label}
              </span>

              <span className="flex-shrink-0 text-[11px] font-semibold text-slate-800 dark:text-slate-200 sm:text-[12px]">
                {metric.value}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const MachineModal = ({
  machine,
  onClose,
}: {
  machine: FleetMachine;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "components" | "history"
  >("overview");
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
        {/* Modal Header */}
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

          {/* Tab switcher */}
          <div className="mt-5 flex gap-1">
            {(["overview", "components", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-[12px] font-bold capitalize transition ${
                  activeTab === tab
                    ? "bg-white/20 text-white"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { icon: User, label: "Operator", value: machine.operator },
                  { icon: MapPin, label: "Location", value: machine.location },
                  { icon: Clock, label: "Last Seen", value: machine.lastSeen },
                  { icon: Truck, label: "Type", value: machine.type },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-[18px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-center gap-2 text-slate-400">
                        <Icon size={14} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                          {item.label}
                        </p>
                      </div>
                      <h4 className="mt-2 text-[14px] font-black text-slate-900 dark:text-white">
                        {item.value}
                      </h4>
                    </div>
                  );
                })}
              </div>

              {/* Health + Fuel */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Overall Health
                  </p>
                  <div className="mb-3 flex items-end gap-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      {machine.healthPercent}
                    </span>
                    <span className="mb-1 text-lg font-bold text-slate-400">
                      %
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${statusStyles.bar}`}
                      style={{ width: `${machine.healthPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-[18px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Fuel Level
                  </p>
                  <FuelGauge level={machine.fuelLevel} />
                  <div className="flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
                    <span>Engine Hours</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {machine.hoursRun.toLocaleString()} hrs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COMPONENTS TAB ── */}
          {activeTab === "components" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                machine.tyre,
                machine.engine,
                machine.hydraulic,
                machine.transmission,
              ].map((comp) => (
                <div
                  key={comp.label}
                  className="rounded-[18px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={COMPONENT_ICON_MAP[comp.label] ?? tyreImg}
                          alt={comp.label}
                          className={`h-34 w-44 flex-shrink-0 object-contain ${
                            comp.status === "crit" ? "animate-icon-pulse" : ""
                          }`}
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${
                            comp.status === "crit"
                              ? "bg-red-500"
                              : comp.status === "warn"
                                ? "bg-orange-500"
                                : comp.status === "ok"
                                  ? "bg-green-500"
                                  : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <p className="text-[13px] font-black capitalize text-slate-800 dark:text-white">
                        {comp.label.charAt(0) +
                          comp.label.slice(1).toLowerCase()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getComponentBadgeClasses(
                        comp.status,
                      )}`}
                    >
                      {getComponentStatusLabel(comp.status)}
                    </span>
                  </div>

                  <div className="mb-1 flex items-end gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {comp.overallHealthPercent}
                    </span>
                    <span className="mb-0.5 text-sm font-bold text-slate-400">
                      % health
                    </span>
                  </div>

                  <HealthBar percent={comp.lifePercent} status={comp.status} />
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {comp.life}
                  </p>

                  {/* Sub-metrics: pressure, temperature, oil/coolant levels etc. */}
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    {comp.subMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span className="text-slate-500 dark:text-slate-400">
                          {metric.label}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <div className="space-y-3">
              {machine.maintenanceHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No maintenance records found.
                </div>
              ) : (
                machine.maintenanceHistory.map((record, i) => (
                  <div
                    key={i}
                    className="flex gap-4 rounded-[18px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Wrench size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[13px] font-black text-slate-800 dark:text-white">
                          {record.type}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {record.date}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                        Technician: {record.technician}
                      </p>
                      <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                        {record.notes}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <p className="text-[12px] text-slate-400">
            Last updated: {machine.lastSeen}
          </p>
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

export default function SupervisorFleet() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>("All Equipment");
  const [statusFilter, setStatusFilter] = useState<FleetStatus | "All">("All");
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [fleetTable, setFleetTable] = useState<FleetMachine[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<FleetMachine | null>(
    null,
  );
  const [openModal, setOpenModal] = useState(false);
  const [sortField, setSortField] = useState<keyof FleetMachine | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Machine currently shown in the "Component Health Overview" cards above the table.
  // Updates live whenever a row in the Company Fleet table is clicked.
  const [overviewMachine, setOverviewMachine] = useState<FleetMachine | null>(
    null,
  );

  /* ── Heatmap axis labels built from real fleet data ─── */
  const HEATMAP_COMPONENTS = [
    "Tyre",
    "Engine",
    "Hydraulic",
    "Transmission",
  ] as const;

  const heatmapFleets = useMemo(
    () => fleetTable.map((m) => m.fleet),
    [fleetTable],
  );

  /* ── Dark-mode detection ────────────────────────────── */
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Heatmap option (memo) ──────────────────────────── */
  const heatMapOption = useMemo(
    () =>
      buildHeatmapOption(
        [...HEATMAP_COMPONENTS],
        heatmapFleets,
        heatmapData,
        isDark,
      ),
    [heatmapData, heatmapFleets, isDark],
  );

  const getComponentStatus = (riskStatus?: string): ComponentStatus => {
    switch (riskStatus?.toLowerCase()) {
      case "healthy":
        return "ok";

      case "monitor":
      case "warning":
        return "warn";

      case "critical":
        return "crit";

      default:
        return "none";
    }
  };

  /* ── Data fetch ─────────────────────────────────────── */
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const response: any = await machineService.getMachines();

      const machines = response?.data || [];

      const intelligenceData = await intelligenceService.getRegister();
      const intelligenceMap = new Map<string, any[]>();

      intelligenceData.forEach((item: any) => {
        const existing = intelligenceMap.get(item.machineId) || [];

        existing.push(item);

        intelligenceMap.set(item.machineId, existing);
      });

      const formattedMachines = machines.map((machine: any) => {
        const machineComponents = intelligenceMap.get(machine.id) || [];

        const tyreComponents = machineComponents.filter((c: any) =>
          c.category?.toLowerCase().includes("tyre"),
        );

        const engineComponents = machineComponents.filter((c: any) =>
          c.category?.toLowerCase().includes("engine"),
        );

        const hydraulicComponents = machineComponents.filter((c: any) =>
          c.category?.toLowerCase().includes("hydraulic"),
        );

        const transmissionComponents = machineComponents.filter((c: any) =>
          c.category?.toLowerCase().includes("transmission"),
        );

        const tyre = tyreComponents[0] || null;
        const engine = engineComponents[0] || null;
        const hydraulic = hydraulicComponents[0] || null;
        const transmission = transmissionComponents[0] || null;
        const hasTyre = !!tyre;
        const hasEngine = !!engine;
        const hasHydraulic = !!hydraulic;
        const hasTransmission = !!transmission;

        const tyreLifeUsed = tyre?.intelligence?.lifeUsedPercent ?? null;
        const engineLifeUsed = engine?.intelligence?.lifeUsedPercent ?? null;
        const hydraulicLifeUsed =
          hydraulic?.intelligence?.lifeUsedPercent ?? null;
        const transmissionLifeUsed =
          transmission?.intelligence?.lifeUsedPercent ?? null;
        return {
          id: machine.id,
          machine: machine.name,
          fleet: machine.serialNumber || machine.id,
          operator: "Unassigned",
          location: machine.site || "-",
          type: machine.equipmentType || "-",
          health: "N/A",
          healthPercent: 0,
          status: machine.status || "Healthy",
          lastSeen: machine.updatedAt,
          hoursRun:
            engine?.intelligence?.hoursRun ||
            hydraulic?.intelligence?.hoursRun ||
            tyre?.intelligence?.hoursRun ||
            0,
          fuelLevel: 0,

          tyre: {
            status: hasTyre
              ? getComponentStatus(tyre?.intelligence?.riskStatus)
              : "none",
            label: "TYRE",
            life: hasTyre ? `${tyreLifeUsed}% Used` : "Component Required",
            lifePercent: hasTyre ? (tyreLifeUsed ?? 0) : 0,
            overallHealthPercent: hasTyre
              ? Math.max(0, 100 - (tyreLifeUsed ?? 0))
              : null,
            subMetrics: hasTyre
              ? buildSubMetrics("tyre", tyre?.intelligence)
              : [],
          },

          engine: {
            status: hasEngine
              ? getComponentStatus(engine?.intelligence?.riskStatus)
              : "none",
            label: "ENGINE",
            life: hasEngine ? `${engineLifeUsed}% Used` : "Component Required",
            lifePercent: hasEngine ? (engineLifeUsed ?? 0) : 0,
            overallHealthPercent: hasEngine
              ? Math.max(0, 100 - (engineLifeUsed ?? 0))
              : null,
            subMetrics: hasEngine
              ? buildSubMetrics("engine", engine?.intelligence)
              : [],
          },

          hydraulic: {
            status: hasHydraulic
              ? getComponentStatus(hydraulic?.intelligence?.riskStatus)
              : "none",
            label: "HYDRAULIC",
            life: hasHydraulic
              ? `${hydraulicLifeUsed}% Used`
              : "Component Required",
            lifePercent: hasHydraulic ? (hydraulicLifeUsed ?? 0) : 0,
            overallHealthPercent: hasHydraulic
              ? Math.max(0, 100 - (hydraulicLifeUsed ?? 0))
              : null,
            subMetrics: hasHydraulic
              ? buildSubMetrics("hydraulic", hydraulic?.intelligence)
              : [],
          },

          transmission: {
            status: hasTransmission
              ? getComponentStatus(transmission?.intelligence?.riskStatus)
              : "none",
            label: "TRANSMISSION",
            life: hasTransmission
              ? `${transmissionLifeUsed}% Used`
              : "Component Required",
            lifePercent: hasTransmission ? (transmissionLifeUsed ?? 0) : 0,
            overallHealthPercent: hasTransmission
              ? Math.max(0, 100 - transmissionLifeUsed)
              : null,
            subMetrics: hasTransmission
              ? buildSubMetrics("transmission", transmission?.intelligence)
              : [],
          },

          maintenanceHistory: [],
        };
      });

      const stats = {
        totalMachines: machines.length,

        healthy: machines.filter((m: any) => m.status === "Healthy").length,

        maintenance: machines.filter((m: any) => m.status === "Warning").length,

        critical: machines.filter((m: any) => m.status === "Critical").length,
      };

      const heatmap: HeatmapDataPoint[] = formattedMachines.flatMap(
        (machine: FleetMachine, fleetIndex: number) => [
          {
            fleetIndex,
            componentIndex: 0,
            healthScore: machine.tyre.lifePercent,
          },
          {
            fleetIndex,
            componentIndex: 1,
            healthScore: machine.engine.lifePercent,
          },
          {
            fleetIndex,
            componentIndex: 2,
            healthScore: machine.hydraulic.lifePercent,
          },
          {
            fleetIndex,
            componentIndex: 3,
            healthScore: machine.transmission.lifePercent,
          },
        ],
      );

      setStats(stats);

      
      setFleetTable(formattedMachines as FleetMachine[]);

      setHeatmapData(heatmap);
    } catch (error) {
      console.error("Fleet dashboard fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (fleetTable.length === 0) {
      setOverviewMachine(null);
      return;
    }
    setOverviewMachine((prev) => {
      if (prev) {
        const stillExists = fleetTable.find((m) => m.id === prev.id);
        if (stillExists) return stillExists;
      }
      return fleetTable[0];
    });
  }, [fleetTable]);

  /* ── Sort handler ───────────────────────────────────── */
  const handleSort = (field: keyof FleetMachine) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ── Filtered + sorted table rows ──────────────────── */
  const filteredFleet = useMemo(() => {
    let rows = fleetTable.filter((machine) => {
      const matchesSearch =
        machine.machine.toLowerCase().includes(search.toLowerCase()) ||
        machine.operator.toLowerCase().includes(search.toLowerCase()) ||
        machine.id.toLowerCase().includes(search.toLowerCase()) ||
        machine.location.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeTab === "All Equipment" ||
        machine.type
          .toLowerCase()
          .includes(activeTab.toLowerCase().replace(/s$/, ""));
      const matchesStatus =
        statusFilter === "All" || machine.status === statusFilter;
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

  /* ── Sort indicator helper ──────────────────────────── */
  const SortIndicator = ({ field }: { field: keyof FleetMachine }) => {
    if (sortField !== field)
      return <Minus size={10} className="ml-1 opacity-30" />;
    return sortDir === "asc" ? (
      <TrendingUp size={10} className="ml-1 text-blue-500" />
    ) : (
      <TrendingDown size={10} className="ml-1 text-blue-500" />
    );
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F4F7FB] p-5 dark:bg-[#020617]">
      <div className="mx-auto max-w-[1700px] space-y-6">
        {/* ── HEADER ──────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[32px] border border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] shadow-sm">
          {/* Decorative Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-7 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
                <span>Supervisor</span>
                <ChevronRight size={15} />
                <span className="font-semibold text-white">Company Fleet</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                  <Truck size={24} />
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Company Fleet Monitoring
                  </h1>

                  <p className="mt-1 text-sm text-blue-100">
                    Monitor all company machines, health and operator activity.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => exportFleetReport(filteredFleet)}
                className="flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <Download size={18} />
                Export Report
              </button>

              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white px-6 text-sm font-bold text-[#3730D9] shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCcw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Machines",
              value: stats?.totalMachines || 0,
              icon: Truck,
              color:
                "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
              trend: null,
            },
            {
              title: "Healthy Machines",
              value: stats?.healthy || 0,
              icon: ShieldCheck,
              color:
                "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
              trend: "+3 this week",
            },
            {
              title: "Maintenance",
              value: stats?.maintenance || 0,
              icon: Wrench,
              color:
                "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
              trend: "-2 since yesterday",
            },
            {
              title: "Critical Alerts",
              value: stats?.critical || 0,
              icon: AlertTriangle,
              color:
                "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
              trend: "Needs attention",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${item.color}`}
                >
                  <Icon size={24} />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">
                  {item.title}
                </p>
                <h3 className="mt-1 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {loading ? (
                    <span className="inline-block h-10 w-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    item.value
                  )}
                </h3>
                {item.trend && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                    <BarChart2 size={11} />
                    {item.trend}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── SEARCH + FILTER ─────────────────────────────── */}
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Fleet Controls
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter and manage machines.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search machine, operator, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 rounded-[20px] border border-slate-200 bg-slate-50 pl-14 pr-5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 md:w-[360px]"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown((v) => !v)}
                  className="flex h-14 items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Filter size={16} />
                  {statusFilter === "All" ? "All Status" : statusFilter}
                  <ChevronDown size={14} />
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 top-16 z-50 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {(["All", "Healthy", "Warning", "Critical"] as const).map(
                      (option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setStatusFilter(option);
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full px-5 py-3 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                            statusFilter === option
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {option}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── HEATMAP ─────────────────────────────────────── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Fleet Component Health Map
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Fleet-wise component health monitoring — hover a cell for
                details.
              </p>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              {[
                {
                  label: "Healthy",
                  bg: "bg-green-100  dark:bg-green-900/30",
                  text: "text-green-700  dark:text-green-400",
                },
                {
                  label: "Warning",
                  bg: "bg-orange-100 dark:bg-orange-900/30",
                  text: "text-orange-700 dark:text-orange-400",
                },
                {
                  label: "Critical",
                  bg: "bg-red-100    dark:bg-red-900/30",
                  text: "text-red-700    dark:text-red-400",
                },
              ].map(({ label, bg, text }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${bg} ${text}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-[340px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <RefreshCcw size={24} className="animate-spin" />
                <p className="text-sm">Loading health data…</p>
              </div>
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ReactECharts
                option={heatMapOption}
                style={{ height: "100%", width: "100%" }}
                notMerge
              />
            </div>
          )}
        </div>

        {/* ── COMPONENT HEALTH OVERVIEW ────────────────────
             Live snapshot of the currently selected machine's
             component health. Click any row in the Company
             Fleet table below to update this section. ────── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Component Health Overview
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {overviewMachine
                  ? `Showing live component health for ${overviewMachine.machine}`
                  : "Select a machine from the table below to see its component health."}
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-[22px] bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : overviewMachine ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <ComponentOverviewCard component={overviewMachine.tyre} />
              <ComponentOverviewCard component={overviewMachine.engine} />
              <ComponentOverviewCard component={overviewMachine.hydraulic} />
              <ComponentOverviewCard component={overviewMachine.transmission} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Truck size={36} className="text-slate-300" />
              <p className="mt-3 text-sm">No machine selected yet.</p>
            </div>
          )}
        </div>

        {/* ── FLEET TABLE ─────────────────────────────────── */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#081028]">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <div>
              <h3 className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-white">
                Company Fleet
              </h3>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                Monitor assigned company machines. Click a row to load it above.
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-4 py-2 text-[12px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              {filteredFleet.length} Machines
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/20">
                  {[
                    {
                      label: "Machine",
                      field: "machine" as keyof FleetMachine,
                    },
                    { label: "Fleet ID", field: "fleet" as keyof FleetMachine },
                    {
                      label: "Operator",
                      field: "operator" as keyof FleetMachine,
                    },
                    { label: "Tyre", field: null },
                    { label: "Engine", field: null },
                    { label: "Hydraulic", field: null },
                    { label: "Transmission", field: null },
                    {
                      label: "Health",
                      field: "healthPercent" as keyof FleetMachine,
                    },
                    { label: "Actions", field: null },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      className={`px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 ${
                        field
                          ? "cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-200"
                          : ""
                      }`}
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
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr
                        key={i}
                        className="h-[95px] border-b border-slate-100 dark:border-slate-800"
                      >
                        {Array.from({ length: 10 }).map((__, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-8 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filteredFleet.map((machine) => {
                      const statusStyles = getStatusClasses(machine.status);
                      const isActiveOverview =
                        overviewMachine?.id === machine.id;
                      return (
                        <tr
                          key={machine.id}
                          onClick={() => setOverviewMachine(machine)}
                          className={`h-[95px] cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/20 ${
                            isActiveOverview
                              ? "bg-blue-50/60 dark:bg-blue-500/5"
                              : ""
                          }`}
                        >
                          {/* MACHINE */}
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-100 dark:bg-blue-500/10">
                                <Truck
                                  className="text-blue-600 dark:text-blue-400"
                                  size={18}
                                />
                              </div>
                              <div>
                                <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white">
                                  {machine.machine}
                                </h4>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                  {machine.company}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* FLEET ID */}
                          <td className="px-6 py-4 align-middle">
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                              {machine.fleet}
                            </span>
                          </td>

                          {/* OPERATOR */}
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[12px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                {machine.operator?.charAt(0)}
                              </div>
                              <div>
                                <span className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                                  {machine.operator}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                  <MapPin size={10} />
                                  {machine.location}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* COMPONENTS */}
                          {[
                            machine.tyre,
                            machine.engine,
                            machine.hydraulic,
                            machine.transmission,
                          ].map((component, index) => (
                            <td key={index} className="px-5 py-4 align-middle">
                              <div className="flex flex-col items-center justify-center text-center">
                                <StatusIcon status={component.status} />
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                                  {component.label}
                                </p>
                                <div className="mt-1 w-16">
                                  <HealthBar
                                    percent={component.lifePercent}
                                    status={component.status}
                                    showLabel={false}
                                  />
                                </div>
                                <p className="mt-0.5 whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500">
                                  {component.lifePercent}%
                                </p>
                              </div>
                            </td>
                          ))}

                          {/* HEALTH */}
                          <td className="px-6 py-4 align-middle">
                            <span
                              className={`inline-flex min-w-[110px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold ${statusStyles.badge}`}
                            >
                              <div
                                className={`h-2 w-2 rounded-full ${statusStyles.dot}`}
                              />
                              {machine.status}
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-6 py-4 align-middle">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
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
                <h3 className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">
                  No Machines Found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try a different keyword or filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────── */}
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
