import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { superAdminMachineService } from "../../../services/SuperAdmin/machineService";

import tyreImg from "../../../assets/images/landingpageimages/FleetLogo/TyreLogo.png";
import engineImg from "../../../assets/images/landingpageimages/FleetLogo/Engine.png";
import hydraulicImg from "../../../assets/images/landingpageimages/FleetLogo/hydraulic.png";
import suspensionImg from "../../../assets/images/landingpageimages/FleetLogo/suspension.png";

import { fleetService } from "../../../services/Fleet/fleetService";
import StorageService from "../../../services/storage.service";
import ReactECharts from "echarts-for-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  Building2,
} from "lucide-react";

/* ==========================================================
   TYPES
========================================================== */

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
  companyId: string;
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

type ApiCompany = {
  companyName?: string;
  companyId?: string;
};

type ApiOperator = {
  name?: string;
  location?: string;
};

type ApiComponent = {
  status?: string;
  health?: number;
  lifePercent?: number;
};

type ApiMachine = {
  id?: string;
  machineId?: string;
  machineName?: string;
  machine?: string;

  // Company
  company?: ApiCompany | string;
  companyName?: string;
  companyId?: string;

  // Fleet
  fleetId?: string;
  fleet?: string;

  // Operator
  operator?: ApiOperator | string;
  operatorName?: string;

  // Machine Details
  location?: string;
  machineType?: string;
  type?: string;

  // Health
  health?: string | number;
  healthPercent?: number;
  status?: string;

  // Timing
  lastSeen?: string;
  hoursRun?: number;
  engineHours?: number;

  // Fuel
  fuelLevel?: number;

  // Components
  tyre?: ApiComponent;
  engine?: ApiComponent;
  hydraulic?: ApiComponent;
  transmission?: ApiComponent;

  components?: {
    tyre?: ApiComponent;
    engine?: ApiComponent;
    hydraulic?: ApiComponent;
    transmission?: ApiComponent;
  };

  // Maintenance
  maintenanceHistory?: MaintenanceRecord[];
};

type Company = {
  id: string;
  companyName: string;
  companyCode: string;
  adminEmail: string;
  adminName: string;
  staffCount: number;
  activePlan: string;
  createdAt: string;
};

/* ==========================================================
   HEATMAP TYPES
========================================================== */

type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

interface HeatmapDataPoint {
  fleetIndex: number;
  componentIndex: number;
  healthScore: number;
}

const COMPONENT_ICON_MAP: Record<string, any> = {
  TYRE: tyreImg,
  ENGINE: engineImg,
  HYDRAULIC: hydraulicImg,
  SUSPENSION: suspensionImg,
};

/* ==========================================================
   CATEGORY TABS
========================================================== */

const CATEGORY_TABS = [
  "All Equipment",
  "Excavators",
  "Trucks",
  "Dozers",
  "Graders",
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number];

/* ==========================================================
   API CONFIG — apna base URL yahan set karo
========================================================== */

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/* ==========================================================
   API HELPERS — raw machine data ko FleetMachine shape me map karta h
========================================================== */

function mapApiStatusToComponent(status: string): ComponentStatus {
  if (status === "critical") return "crit";
  if (status === "warn" || status === "warning") return "warn";
  if (status === "ok") return "ok";
  return "none";
}

function mapApiStatusToFleet(status: string): FleetStatus {
  const s = status?.toLowerCase();
  if (s === "critical") return "Critical";
  if (s === "warning" || s === "warn") return "Warning";
  return "Healthy";
}

function deriveHealthPercent(machine: ApiMachine): number {
  if (typeof machine.healthPercent === "number") return machine.healthPercent;
  if (typeof machine.health === "string") return parseInt(machine.health) || 0;
  return 0;
}

// BACKEND TODO: replace with real sensor reading keys once API contract for
// per-component sub-metrics (pressure, temperature, oil/coolant levels) is finalized.
const buildSubMetrics = (
  category: "tyre" | "engine" | "hydraulic" | "transmission",
  intelligence: any,
): SubMetric[] => {
  switch (category) {
    case "tyre":
      return [
        {
          label: "Air Pressure",
          value: intelligence?.airPressure || intelligence?.pressure || intelligence?.sensorData?.pressure
            ? `${intelligence?.airPressure || intelligence?.pressure || intelligence?.sensorData?.pressure} PSI`
            : "N/A",
        },
        {
          label: "Tyre Temperature",
          value: intelligence?.tyreTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature
            ? `${intelligence?.tyreTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature}°C`
            : "N/A",
        },
      ];
    case "engine":
      return [
        {
          label: "Engine Temperature",
          value: intelligence?.engineTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature
            ? `${intelligence?.engineTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature}°C`
            : "N/A",
        },
        {
          label: "Engine Oil Level",
          value: intelligence?.oilLevel || intelligence?.fluidLevel
            ? `${intelligence?.oilLevel || intelligence?.fluidLevel}%`
            : "N/A",
        },
        {
          label: "Coolant Level",
          value: intelligence?.coolantLevel
            ? `${intelligence?.coolantLevel}%`
            : "N/A",
        },
      ];
    case "hydraulic":
      return [
        {
          label: "Oil Level",
          value: intelligence?.oilLevel || intelligence?.fluidLevel
            ? `${intelligence?.oilLevel || intelligence?.fluidLevel}%`
            : "N/A",
        },
        {
          label: "Hydraulic Pressure",
          value: intelligence?.pressure || intelligence?.sensorData?.pressure
            ? `${intelligence?.pressure || intelligence?.sensorData?.pressure} Bar`
            : "N/A",
        },
        {
          label: "Oil Temperature",
          value: intelligence?.oilTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature
            ? `${intelligence?.oilTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature}°C`
            : "N/A",
        },
      ];
    case "transmission":
      return [
        {
          label: "Fluid Level",
          value: intelligence?.fluidLevel || intelligence?.oilLevel
            ? `${intelligence?.fluidLevel || intelligence?.oilLevel}%`
            : "N/A",
        },
        {
          label: "Gear Temperature",
          value: intelligence?.gearTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature
            ? `${intelligence?.gearTemperature || intelligence?.temperature || intelligence?.sensorData?.temperature}°C`
            : "N/A",
        },
      ];
    default:
      return [];
  }
};

function mapApiMachineToFleet(raw: ApiMachine): FleetMachine {
  const tyre = raw.components?.tyre ?? raw.tyre ?? {};
  const engine = raw.components?.engine ?? raw.engine ?? {};
  const hydraulic = raw.components?.hydraulic ?? raw.hydraulic ?? {};
  const transmission = raw.components?.transmission ?? raw.transmission ?? {};

  const tyreLife = tyre.health ?? tyre.lifePercent ?? 0;
  const engineLife = engine.health ?? engine.lifePercent ?? 0;
  const hydraulicLife = hydraulic.health ?? hydraulic.lifePercent ?? 0;
  const transmissionLife = transmission.health ?? transmission.lifePercent ?? 0;

  const hp = deriveHealthPercent(raw);

  return {
    id: raw.machineId ?? raw.id ?? "—",

    machine: raw.machineName ?? raw.machine ?? "Unknown",

    company:
      typeof raw.company === "object"
        ? (raw.company?.companyName ?? raw.companyName ?? "—")
        : (raw.company ?? raw.companyName ?? "—"),

    companyId:
      typeof raw.company === "object"
        ? (raw.company?.companyId ?? raw.companyId ?? "")
        : (raw.companyId ?? ""),

    fleet: raw.fleetId ?? raw.fleet ?? "—",

    operator:
      typeof raw.operator === "object"
        ? (raw.operator?.name ?? raw.operatorName ?? "—")
        : (raw.operator ?? raw.operatorName ?? "—"),

    location:
      raw.location ??
      (typeof raw.operator === "object" ? raw.operator?.location : undefined) ??
      "—",

    type: raw.machineType ?? raw.type ?? "—",

    health: `${hp}%`,
    healthPercent: hp,

    status: mapApiStatusToFleet(raw.status ?? "healthy"),

    lastSeen: raw.lastSeen ?? "—",

    hoursRun: raw.hoursRun ?? raw.engineHours ?? 0,

    fuelLevel: raw.fuelLevel ?? 0,

    tyre: {
      status: mapApiStatusToComponent(tyre.status ?? "ok"),
      label: "TYRE",
      life: `${tyreLife}% life left`,
      lifePercent: tyreLife,
      overallHealthPercent: tyreLife,
      subMetrics: buildSubMetrics("tyre", tyre),
    },

    engine: {
      status: mapApiStatusToComponent(engine.status ?? "ok"),
      label: "ENGINE",
      life: `${engineLife}% life left`,
      lifePercent: engineLife,
      overallHealthPercent: engineLife,
      subMetrics: buildSubMetrics("engine", engine),
    },

    hydraulic: {
      status: mapApiStatusToComponent(hydraulic.status ?? "ok"),
      label: "HYDRAULIC",
      life: `${hydraulicLife}% life left`,
      lifePercent: hydraulicLife,
      overallHealthPercent: hydraulicLife,
      subMetrics: buildSubMetrics("hydraulic", hydraulic),
    },

    transmission: {
      status: mapApiStatusToComponent(transmission.status ?? "ok"),
      label: "SUSPENSION",
      life: `${transmissionLife}% life left`,
      lifePercent: transmissionLife,
      overallHealthPercent: transmissionLife,
      subMetrics: buildSubMetrics("transmission", transmission),
    },

    maintenanceHistory: raw.maintenanceHistory ?? [],
  };
}

function buildHeatmapFromMachines(
  machines: FleetMachine[],
): HeatmapDataPoint[] {
  const COMPONENTS = ["tyre", "engine", "hydraulic", "transmission"] as const;
  const points: HeatmapDataPoint[] = [];
  machines.forEach((m, fi) => {
    COMPONENTS.forEach((comp, ci) => {
      points.push({
        fleetIndex: fi,
        componentIndex: ci,
        healthScore: m[comp].lifePercent,
      });
    });
  });
  return points;
}

/* ==========================================================
   HEATMAP HELPERS
========================================================== */

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

/* ==========================================================
   HEATMAP OPTION BUILDER
========================================================== */

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

  const tooltipFormatter = (params: {
    value: [number, number, number];
  }): string => {
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
    grid: {
      top: 24,
      right: 100,
      bottom: 52,
      left: 110,
      containLabel: false,
    },
    xAxis: {
      type: "category" as const,
      data: components,
      position: "bottom" as const,
      splitArea: { show: false },
      splitLine: { show: false },
      axisLine: {
        show: true,
        lineStyle: { color: borderLine, width: 0.5 },
      },
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
      axisLine: {
        show: true,
        lineStyle: { color: borderLine, width: 0.5 },
      },
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

          formatter: (params: { value: [number, number, number] }) =>
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

const exportFleetReport = (data: FleetMachine[]) => {
 
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  autoTable(doc, {
    startY: 32,

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
      doc.setFontSize(18);
      doc.setTextColor(33, 37, 41);
      doc.text("Super Admin Fleet Report", 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

      doc.setFontSize(9);
      doc.text(
        `Page ${data.pageNumber}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 8,
      );
    },
  });

  doc.save("Super-Admin-Fleet-Report.pdf");
};

/* ==========================================================
   STATUS ICON SUB-COMPONENT
========================================================== */

const StatusIcon = ({ status }: { status: ComponentStatus }) => {
  if (status === "crit")
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500 text-white">
        <AlertCircle size={18} />
      </div>
    );
  if (status === "warn")
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white">
        <Circle size={14} fill="white" />
      </div>
    );
  if (status === "ok")
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500 text-white">
        <CheckCircle2 size={18} />
      </div>
    );
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
   COMPONENT HEALTH OVERVIEW CARD (Tyre / Engine / Hydraulic / Suspension)
========================================================== */

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

/* ==========================================================
   MACHINE DETAIL MODAL
========================================================== */

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

              {/* Company Info */}
              <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-slate-400">
                  <Building2 size={14} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    Company
                  </p>
                </div>
                <h4 className="mt-2 text-[14px] font-black text-slate-900 dark:text-white">
                  {machine.company}
                </h4>
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
                          className={`h-20 w-20 flex-shrink-0 object-contain ${
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
                      {comp.overallHealthPercent ?? comp.lifePercent}
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

export default function SuperAdminFleet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [activeTab, setActiveTab] = useState<string>("All Equipment");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Machine currently shown in the "Component Health Overview" cards above the table.
  // Updates live whenever a row in the Company Fleet table is clicked.
  const [overviewMachine, setOverviewMachine] = useState<FleetMachine | null>(
    null,
  );

  const chartRef = useRef<any>(null);

  const HEATMAP_COMPONENTS = [
    "Tyre",
    "Engine",
    "Hydraulic",
    "Suspension",
  ] as const;

  const heatmapFleets = useMemo(
    () => fleetTable.map((m) => m.fleet),
    [fleetTable],
  );

  /* ── Dark-mode detection ── */
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Heatmap option ── */
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

  /* ── Fetch companies once on mount ── */
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const list = await superAdminMachineService.getCompanies();
        const arr = Array.isArray(list) ? list : (list as any)?.data || [];
        const formatted: Company[] = arr.map((c: any) => ({
          id: String(c.id),
          companyName: c.companyName || c.company_name || c.name || "Unnamed Company",
          companyCode: c.companyCode || c.company_code || "N/A",
          adminEmail: c.adminEmail || c.email || "",
          adminName: c.adminName || "Admin",
          staffCount: Number(c.staffCount || 0),
          activePlan: c.activePlan || "Enterprise",
          createdAt: c.createdAt || new Date().toISOString(),
        }));
        setCompanies(formatted);
      } catch (err) {
        console.error("Failed to load fleet companies:", err);
      }
    };
    loadCompanies();
  }, []);

  /* ── Fetch fleet dashboard (re-runs when company filter changes) ── */
  const fetchDashboard = useCallback(
    async (companyId?: string) => {
      try {
        setLoading(true);
        setError(null);

        const cid = companyId !== undefined ? companyId : selectedCompanyId;

        const rawMachines = await fleetService.getFleetMachines(
          "super_admin",
          cid === "all" ? undefined : cid,
        );

        const machines: FleetMachine[] = (rawMachines || []).map((machine: any) => ({
          id: String(machine?.machineId || machine?.id || ""),

          machine: String(machine?.machineName || machine?.name || machine?.model || "Machine"),

          company:
            machine?.company?.companyName && machine.company.companyName !== "N/A"
              ? machine.company.companyName
              : companies.find((c) => c.id === machine?.companyId)?.companyName || "Company",

          companyId: machine?.company?.companyId || machine?.companyId || "",

          fleet: String(machine?.fleetId || machine?.serialNumber || "SN-101"),

          operator: typeof machine?.operator === "object" ? (machine.operator?.name || "Assigned Operator") : String(machine?.operator || "Assigned Operator"),

          location: String(machine?.location || machine?.site || "Site"),

          type: String(machine?.machineType || machine?.equipmentType || "Equipment"),

          health: `${machine?.healthPercent ?? 85}%`,

          healthPercent: Number(machine?.healthPercent ?? 85),

          status: machine?.status || "Healthy",

          lastSeen: machine?.lastSeen || "Just now",

          hoursRun: Number(machine?.hoursRun || 0),

          fuelLevel: Number(machine?.fuelLevel || 80),

          tyre: {
            status: mapApiStatusToComponent(machine?.components?.tyre?.status),
            label: "TYRE",
            life: `${machine?.components?.tyre?.health ?? 85}% life left`,
            lifePercent: Number(machine?.components?.tyre?.health ?? 85),
            overallHealthPercent: Number(machine?.components?.tyre?.health ?? 85),
            subMetrics: buildSubMetrics("tyre", machine?.components?.tyre),
          },

          engine: {
            status: mapApiStatusToComponent(machine?.components?.engine?.status),
            label: "ENGINE",
            life: `${machine?.components?.engine?.health ?? 88}% life left`,
            lifePercent: Number(machine?.components?.engine?.health ?? 88),
            overallHealthPercent: Number(machine?.components?.engine?.health ?? 88),
            subMetrics: buildSubMetrics("engine", machine?.components?.engine),
          },

          hydraulic: {
            status: mapApiStatusToComponent(
              machine?.components?.hydraulic?.status,
            ),
            label: "HYDRAULIC",
            life: `${machine?.components?.hydraulic?.health ?? 75}% life left`,
            lifePercent: Number(machine?.components?.hydraulic?.health ?? 75),
            overallHealthPercent: Number(machine?.components?.hydraulic?.health ?? 75),
            subMetrics: buildSubMetrics(
              "hydraulic",
              machine?.components?.hydraulic,
            ),
          },

          transmission: {
            status: mapApiStatusToComponent(
              machine?.components?.transmission?.status,
            ),
            label: "SUSPENSION",
            life: `${machine?.components?.transmission?.health ?? 80}% life left`,
            lifePercent: Number(machine?.components?.transmission?.health ?? 80),
            overallHealthPercent: Number(machine?.components?.transmission?.health ?? 80),
            subMetrics: buildSubMetrics(
              "transmission",
              machine?.components?.transmission,
            ),
          },

          maintenanceHistory: Array.isArray(machine?.maintenanceHistory) ? machine.maintenanceHistory : [],
        }));

        const stats = await fleetService.getFleetStats();

        setStats(stats);

        setFleetTable(machines);

        setHeatmapData(buildHeatmapFromMachines(machines));
      } catch (error) {
        console.error("Fleet dashboard fetch failed:", error);

        setError("Failed to load fleet data.");
      } finally {
        setLoading(false);
      }
    },
    [selectedCompanyId, companies],
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Keep Component Health Overview in sync with the table / company filter.
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

  /* ── Company dropdown change ── */
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    fetchDashboard(companyId);
  };

  const exportChart = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) {
      console.error("Chart not found");
      return;
    }
    const url = chart.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.href = url;
    link.download = "Fleet-Health-Chart.png";
    link.click();
  };

  /* ── Sort handler ── */
  const handleSort = (field: keyof FleetMachine) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ── Filtered + sorted rows ── */
  const filteredFleet = useMemo(() => {
    let rows = fleetTable.filter((machine) => {
      const matchesSearch =
        machine.machine.toLowerCase().includes(search.toLowerCase()) ||
        machine.operator.toLowerCase().includes(search.toLowerCase()) ||
        machine.id.toLowerCase().includes(search.toLowerCase()) ||
        machine.location.toLowerCase().includes(search.toLowerCase()) ||
        machine.company.toLowerCase().includes(search.toLowerCase());
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

  /* ── Sort indicator ── */
  const SortIndicator = ({ field }: { field: keyof FleetMachine }) => {
    if (sortField !== field)
      return <Minus size={10} className="ml-1 opacity-30" />;
    return sortDir === "asc" ? (
      <TrendingUp size={10} className="ml-1 text-blue-500" />
    ) : (
      <TrendingDown size={10} className="ml-1 text-blue-500" />
    );
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-5 dark:bg-[#020617]">
      {error && (
        <div className="mx-auto mb-4 max-w-[1700px] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="mx-auto max-w-[1700px] space-y-6">
        {/* ── HEADER ── */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 shadow-xl">
          <div className="flex flex-col gap-6 px-8 py-7 xl:flex-row xl:items-center xl:justify-between">
            {/* Left Content */}
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                <Truck size={15} className="text-cyan-300" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                  Super Admin Fleet Monitoring
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white">
                Company Fleet Monitoring
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Monitor all company machines, health status, fleet performance and
                operator activity across every organization from one centralized
                dashboard.
              </p>
            </div>

            {/* Right Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3">
              {/* Export PDF */}
              <button
                onClick={() => exportFleetReport(filteredFleet)}
                className="group inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg"
              >
                <Download
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span>Export PDF</span>
              </button>

              {/* Export Chart */}
              <button
                onClick={exportChart}
                className="group inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg"
              >
                <BarChart2
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span>Export Chart</span>
              </button>

              {/* Refresh */}
              <button
                onClick={() => fetchDashboard()}
                disabled={loading}
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={16}
                  className={`${loading ? "animate-spin" : ""} transition-transform duration-300 group-hover:rotate-180`}
                />

                <span>{loading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Machines",
              value: stats?.totalMachines ?? 0,
              icon: Truck,
              color:
                "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
              trend: null,
            },
            {
              title: "Healthy Machines",
              value: stats?.healthy ?? 0,
              icon: ShieldCheck,
              color:
                "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
              trend: "Fully operational",
            },
            {
              title: "Maintenance",
              value: stats?.maintenance ?? 0,
              icon: Wrench,
              color:
                "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
              trend: "Needs attention",
            },
            {
              title: "Critical Alerts",
              value: stats?.critical ?? 0,
              icon: AlertTriangle,
              color:
                "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
              trend: "Immediate action",
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

        {/* ── SEARCH + FILTER + COMPANY DROPDOWN ── */}
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Fleet Controls
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter and manage machines across all companies.
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
                  className="h-14 rounded-[20px] border border-slate-200 bg-slate-50 pl-14 pr-5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 md:w-[320px]"
                />
              </div>

              {/* Company Filter Dropdown — populated from GET API */}
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="h-14 min-w-[220px] appearance-none rounded-[20px] border border-slate-200 bg-slate-50 pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
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

        {/* ── HEATMAP ── */}
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
          ) : heatmapData.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <BarChart2 size={32} />
                <p className="text-sm">
                  No data available for selected company.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ReactECharts
                ref={chartRef}
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
                  ? `Showing live component health for ${overviewMachine.machine} (${
                      overviewMachine.company && overviewMachine.company !== "Company" && overviewMachine.company !== "N/A"
                        ? overviewMachine.company
                        : companies.find((c) => c.id === overviewMachine.companyId)?.companyName || "HME Systems"
                    })`
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

        {/* ── FLEET TABLE ── */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#081028]">
          <div className="flex items-center justify-between border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-5">
            <div>
              <h3 className="text-[18px] font-bold tracking-tight text-white">
                Company Fleet
              </h3>

              <p className="mt-1 text-[13px] text-blue-100">
                All machines across registered companies. Click a row to load it above.
              </p>
            </div>

            <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-semibold text-white backdrop-blur-sm">
              {filteredFleet.length} Machines
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/20">
                  {[
                    {
                      label: "Machine",
                      field: "machine" as keyof FleetMachine,
                    },
                    {
                      label: "Company",
                      field: "company" as keyof FleetMachine,
                    },
                    { label: "Fleet ID", field: "fleet" as keyof FleetMachine },
                    {
                      label: "Operator",
                      field: "operator" as keyof FleetMachine,
                    },
                    { label: "Tyre", field: null },
                    { label: "Engine", field: null },
                    { label: "Hydraulic", field: null },
                    { label: "Suspension", field: null },
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
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {machine.type}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* COMPANY */}
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-700">
                                <Building2 size={14} />
                              </div>
                              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                                {machine.company && machine.company !== "Company" && machine.company !== "N/A"
                                  ? machine.company
                                  : companies.find((c) => c.id === machine.companyId)?.companyName || "HME Systems"}
                              </span>
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

                          {/* HEALTH BADGE */}
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
                  Try a different keyword, company, or filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
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