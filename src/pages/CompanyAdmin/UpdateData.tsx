// BACKEND TODO: swap dummy data below for real services once the API is ready
import { machineAssignmentService } from "../../services/Task/machineAssignmentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import {
  fleetService,
  type FleetMachine as ServiceFleetMachine,
} from "../../services/Fleet/fleetService";
import AppSelect from "../../components/ui/dropdown/AppSelect";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import tyreBg from "../../assets/images/operatorImages/Tyre.jpg";
import engineBg from "../../assets/images/operatorImages/Engine.jpg";
import hydraulicBg from "../../assets/images/operatorImages/hydraulic.jpg";
import suspensionBg from "../../assets/images/operatorImages/suspension.jpg";

import { z } from "zod";
import toast from "react-hot-toast";
import {
  Truck,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  AlertTriangle,
  Wrench,
  MapPin,
  Clock,
  User,
  Activity,
  ChevronDown,
  Disc,
  Droplet,
  Settings2,
  CalendarDays,
  FileText,
  Hash,
  ClipboardCheck,
  History,
  Loader2,
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  Gauge,
} from "lucide-react";

/* ==========================================================
   TYPES
========================================================== */

type FleetStatus = "Healthy" | "Warning" | "Critical";
type ComponentStatus = "ok" | "warn" | "crit";
type ComponentKey =
  | "tyre"
  | "engine"
  | "hydraulic"
  | "suspension"
  | "transmission"
  | "fuelSystem"
  | "coolingSystem";

type SubMetricConfig = {
  key: string;
  label: string;
  unit: string;
};

// Safe-operating-range config for a single sub-metric.
type MetricRange = {
  critBelow?: number;
  warnBelow?: number;
  warnAbove?: number;
  critAbove?: number;
};

type MachineComponent = {
  status: ComponentStatus;
  label: string;
  lifePercent: number;
  subMetrics: Record<string, number>;
};

type MaintenanceRecord = {
  date: string;
  type: string;
  technician: string;
  notes: string;
  status?: string;
};

type FleetMachine = {
  id: string;
  machine: string;
  company: string;
  fleet: string;
  operator: string;
  location: string;
  type: string;
  healthPercent: number;
  status: FleetStatus;
  lastSeen: string;
  hoursRun: number;
  fuelLevel: number;
  tyre: MachineComponent;
  engine: MachineComponent;
  hydraulic: MachineComponent;
  suspension: MachineComponent;
  transmission: MachineComponent;
  fuelSystem: MachineComponent;
  coolingSystem: MachineComponent;
  maintenanceHistory: MaintenanceRecord[];
};

/* ==========================================================
   CONSTANTS
========================================================== */

const EXPECTED_LIFE_HOURS: Record<ComponentKey, number> = {
  tyre: 5000,
  engine: 20000,
  hydraulic: 15000,
  suspension: 12000,
  transmission: 18000,
  fuelSystem: 10000,
  coolingSystem: 8000,
};

const COMPONENT_META: Record<
  ComponentKey,
  { label: string; icon: typeof Disc }
> = {
  tyre: { label: "Tyre", icon: Disc },
  engine: { label: "Engine", icon: Wrench },
  hydraulic: { label: "Hydraulic", icon: Droplet },
  suspension: { label: "Suspension", icon: Settings2 },
  transmission: { label: "Transmission", icon: SlidersHorizontal },
  fuelSystem: { label: "Fuel System", icon: Gauge },
  coolingSystem: { label: "Cooling System", icon: Activity },
};

const COMPONENT_IMAGES: Record<ComponentKey, string> = {
  tyre: tyreBg,
  engine: engineBg,
  hydraulic: hydraulicBg,
  suspension: suspensionBg,
  transmission: suspensionBg,
  fuelSystem: engineBg,
  coolingSystem: hydraulicBg,
};

const COMPONENT_ORDER: ComponentKey[] = [
  "tyre",
  "engine",
  "hydraulic",
  "suspension",
  "transmission",
  "fuelSystem",
  "coolingSystem",
];

const SUB_METRICS: Record<ComponentKey, SubMetricConfig[]> = {
  tyre: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "airPressure", label: "Air Pressure", unit: "PSI" },
    { key: "temperature", label: "Tyre Temp", unit: "°C" },
    { key: "treadDepth", label: "Tread Depth", unit: "mm" },
    { key: "wheelAlignment", label: "Wheel Alignment", unit: "0=Ok 1=Misaligned" },
    { key: "wheelVibration", label: "Wheel Vibration", unit: "mm/s" },
    { key: "wearRate", label: "Wear Rate", unit: "%/1000hr" },
    { key: "sidewallDamage", label: "Sidewall Damage", unit: "0=No 1=Yes" },
  ],
  engine: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "temperature", label: "Engine Temp", unit: "°C" },
    { key: "oilPressure", label: "Oil Pressure", unit: "Bar" },
    { key: "engineOil", label: "Oil Level", unit: "%" },
    { key: "coolant", label: "Coolant Level", unit: "%" },
    { key: "rpm", label: "RPM", unit: "RPM" },
    { key: "fuelConsumption", label: "Fuel Consumption", unit: "L/hr" },
    { key: "batteryVoltage", label: "Battery Voltage", unit: "V" },
    { key: "exhaustTemp", label: "Exhaust Temp", unit: "°C" },
    { key: "vibration", label: "Engine Vibration", unit: "mm/s" },
  ],
  hydraulic: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "pressure", label: "Hydraulic Pressure", unit: "Bar" },
    { key: "temperature", label: "Oil Temp", unit: "°C" },
    { key: "oilLevel", label: "Oil Level", unit: "%" },
    { key: "flowRate", label: "Pump Flow Rate", unit: "L/min" },
    { key: "filterCondition", label: "Filter Condition", unit: "%" },
    { key: "leakage", label: "Hydraulic Leakage", unit: "0=No 1=Yes" },
    { key: "cylinderPressure", label: "Cylinder Pressure", unit: "Bar" },
  ],
  suspension: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "oilLevel", label: "Suspension Oil Level", unit: "%" },
    { key: "temperature", label: "Suspension Temp", unit: "°C" },
    { key: "shockHealth", label: "Shock Absorber Health", unit: "%" },
    { key: "springCompression", label: "Spring Compression", unit: "mm" },
    { key: "vibration", label: "Vibration", unit: "mm/s" },
    { key: "rideHeight", label: "Ride Height", unit: "mm" },
  ],
  transmission: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "oilLevel", label: "Transmission Oil Level", unit: "%" },
    { key: "temperature", label: "Oil Temp", unit: "°C" },
    { key: "gearPressure", label: "Gear Pressure", unit: "Bar" },
    { key: "gearSlip", label: "Gear Slip", unit: "%" },
    { key: "clutchWear", label: "Clutch Wear", unit: "%" },
    { key: "torque", label: "Torque", unit: "Nm" },
  ],
  fuelSystem: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "fuelLevel", label: "Fuel Level", unit: "%" },
    { key: "fuelPressure", label: "Fuel Pressure", unit: "Bar" },
    { key: "fuelTemp", label: "Fuel Temp", unit: "°C" },
    { key: "injectorStatus", label: "Injector Status", unit: "0=Good 1=Check" },
    { key: "filterHealth", label: "Fuel Filter Health", unit: "%" },
    { key: "consumptionRate", label: "Fuel Consumption Rate", unit: "L/hr" },
  ],
  coolingSystem: [
    { key: "usedHours", label: "Used Hours", unit: "hrs" },
    { key: "coolantTemp", label: "Coolant Temp", unit: "°C" },
    { key: "coolantLevel", label: "Coolant Level", unit: "%" },
    { key: "radiatorPressure", label: "Radiator Pressure", unit: "Bar" },
    { key: "fanSpeed", label: "Fan Speed", unit: "RPM" },
    { key: "waterPumpStatus", label: "Water Pump Status", unit: "0=Normal 1=Fault" },
  ],
};

const SUB_METRIC_RANGES: Record<ComponentKey, Record<string, MetricRange>> = {
  tyre: {
    airPressure: { critBelow: 20, warnBelow: 28, warnAbove: 38, critAbove: 45 },
    temperature: { warnAbove: 70, critAbove: 90 },
  },
  engine: {
    temperature: { warnAbove: 105, critAbove: 120 },
    engineOil: { warnBelow: 40, critBelow: 20 },
    coolant: { warnBelow: 40, critBelow: 20 },
  },
  hydraulic: {
    oilLevel: { warnBelow: 50, critBelow: 25 },
    pressure: { critBelow: 140, warnBelow: 170, warnAbove: 230, critAbove: 260 },
    temperature: { warnAbove: 75, critAbove: 95 },
  },
  suspension: {
    oilLevel: { warnBelow: 50, critBelow: 25 },
    temperature: { warnAbove: 75, critAbove: 95 },
  },
  transmission: {
    oilLevel: { warnBelow: 50, critBelow: 25 },
    temperature: { warnAbove: 75, critAbove: 95 },
  },
  fuelSystem: {
    fuelLevel: { warnBelow: 30, critBelow: 15 },
    fuelPressure: { warnBelow: 3.5, critBelow: 2.0 },
  },
  coolingSystem: {
    coolantLevel: { warnBelow: 40, critBelow: 20 },
    coolantTemp: { warnAbove: 95, critAbove: 110 },
  },
};

const DEFAULT_SUB_METRICS: Record<ComponentKey, Record<string, number>> = {
  tyre: { usedHours: 800, airPressure: 32, temperature: 45, treadDepth: 25, wheelAlignment: 0, wheelVibration: 2.1, wearRate: 1.2, sidewallDamage: 0 },
  engine: { usedHours: 12000, temperature: 90, oilPressure: 4.2, engineOil: 95, coolant: 95, rpm: 1800, fuelConsumption: 42, batteryVoltage: 24.2, exhaustTemp: 450, vibration: 3.5 },
  hydraulic: { usedHours: 4500, pressure: 210, temperature: 55, oilLevel: 90, flowRate: 350, filterCondition: 88, leakage: 0, cylinderPressure: 220 },
  suspension: { usedHours: 3600, oilLevel: 92, temperature: 48, shockHealth: 85, springCompression: 45, vibration: 2.8, rideHeight: 320 },
  transmission: { usedHours: 5400, oilLevel: 94, temperature: 62, gearPressure: 18, gearSlip: 1.5, clutchWear: 12, torque: 2400 },
  fuelSystem: { usedHours: 2500, fuelLevel: 85, fuelPressure: 5.5, fuelTemp: 38, injectorStatus: 0, filterHealth: 92, consumptionRate: 38 },
  coolingSystem: { usedHours: 2000, coolantTemp: 82, coolantLevel: 95, radiatorPressure: 1.4, fanSpeed: 1600, waterPumpStatus: 0 },
};

const STATUS_LABEL: Record<ComponentStatus, string> = {
  ok: "Good",
  warn: "Warning",
  crit: "Critical",
};

// Health thresholds for the lifePercent side of the equation.
// Below 20% = Critical, below 40% = Warning, else Good.
const HEALTH_THRESHOLDS = { CRITICAL_BELOW: 20, WARNING_BELOW: 40 } as const;

const INITIAL_HISTORY_LIMIT = 8;

/* ==========================================================
   HELPERS
========================================================== */

const STATUS_SEVERITY: Record<ComponentStatus, number> = {
  ok: 0,
  warn: 1,
  crit: 2,
};

function worseStatus(a: ComponentStatus, b: ComponentStatus): ComponentStatus {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b;
}

function deriveLifeStatus(percent: number): ComponentStatus {
  if (percent < HEALTH_THRESHOLDS.CRITICAL_BELOW) return "crit";
  if (percent < HEALTH_THRESHOLDS.WARNING_BELOW) return "warn";
  return "ok";
}

function convertFleetMachine(machine: any): FleetMachine {
  const comps = machine.components || {};

  const getComp = (key: ComponentKey, defaultLife: number, label: string) => {
    const expected = EXPECTED_LIFE_HOURS[key];
    const compData = comps[key] || {};
    const used = Number(compData.subMetrics?.usedHours ?? compData.usedHours ?? DEFAULT_SUB_METRICS[key].usedHours);
    const calculatedLife = Math.max(0, Math.min(100, Math.round(((expected - used) / expected) * 100)));
    const lifePercent = compData.health !== undefined ? Number(compData.health) : calculatedLife;
    const subMetrics = compData.subMetrics ? { ...DEFAULT_SUB_METRICS[key], ...compData.subMetrics } : { ...DEFAULT_SUB_METRICS[key] };
    subMetrics.usedHours = used;

    return buildComponent(key, label, lifePercent, subMetrics);
  };

  return {
    id: machine.machineId || machine.id || "m_1",
    machine: machine.machineName || machine.name || "Machine",
    company: machine.company?.companyName || machine.company || "Company",
    fleet: machine.fleetId || machine.fleet || "FL-220",
    operator: machine.operator?.name || machine.operator || "Operator",
    location: machine.location || machine.site || "Main Pit",
    type: machine.machineType || machine.type || "Heavy Haulage",
    healthPercent: Number(machine.healthPercent ?? 80),
    status: machine.status || "Healthy",
    lastSeen: machine.lastSeen || "Just now",
    hoursRun: Number(machine.hoursRun || 1200),
    fuelLevel: Number(machine.fuelLevel || 85),

    tyre: getComp("tyre", 84, "TYRE"),
    engine: getComp("engine", 40, "ENGINE"),
    hydraulic: getComp("hydraulic", 70, "HYDRAULIC"),
    suspension: getComp("suspension", 70, "SUSPENSION"),
    transmission: getComp("transmission", 70, "TRANSMISSION"),
    fuelSystem: getComp("fuelSystem", 75, "FUEL SYSTEM"),
    coolingSystem: getComp("coolingSystem", 75, "COOLING SYSTEM"),

    maintenanceHistory:
      Array.isArray(machine.maintenanceHistory) && machine.maintenanceHistory.length > 0
        ? machine.maintenanceHistory
        : [
            {
              date: formatDateDisplay(new Date().toISOString()),
              type: "7-Component System Audit",
              technician: "Company Admin",
              notes: "All 7 heavy machinery components inspected. Expected life vs used hours verified.",
              status: "Completed",
            },
          ],
  };
}

// Status of a single sensor reading against its safe operating range.
function deriveMetricStatus(
  range: MetricRange | undefined,
  value: number,
): ComponentStatus {
  if (!range || !Number.isFinite(value)) return "ok";
  if (range.critBelow !== undefined && value < range.critBelow) return "crit";
  if (range.critAbove !== undefined && value > range.critAbove) return "crit";
  if (range.warnBelow !== undefined && value < range.warnBelow) return "warn";
  if (range.warnAbove !== undefined && value > range.warnAbove) return "warn";
  return "ok";
}

// THE combined status: worst of (lifePercent status) and (every sub-metric's status).
// This is what should always be used to render a component's badge/color —
// never lifePercent alone.
function deriveOverallComponentStatus(
  componentKey: ComponentKey,
  lifePercent: number,
  subMetrics: Record<string, number>,
): ComponentStatus {
  let status = deriveLifeStatus(Number.isFinite(lifePercent) ? lifePercent : 0);
  const ranges = SUB_METRIC_RANGES[componentKey];
  for (const metric of SUB_METRICS[componentKey]) {
    const value = subMetrics?.[metric.key];
    const metricStatus = deriveMetricStatus(ranges[metric.key], Number(value));
    status = worseStatus(status, metricStatus);
  }
  return status;
}

function deriveFleetStatus(percent: number): FleetStatus {
  if (percent < HEALTH_THRESHOLDS.CRITICAL_BELOW) return "Critical";
  if (percent < HEALTH_THRESHOLDS.WARNING_BELOW) return "Warning";
  return "Healthy";
}

const getStatusClasses = (status: FleetStatus) => {
  switch (status) {
    case "Critical":
      return {
        badge:
          "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
        dot: "bg-red-500",
        gauge: "#dc2626",
      };
    case "Warning":
      return {
        badge:
          "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
        dot: "bg-amber-500",
        gauge: "#d97706",
      };
    default:
      return {
        badge:
          "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
        dot: "bg-emerald-500",
        gauge: "#16a34a",
      };
  }
};

const getComponentBarColor = (status: ComponentStatus) => {
  if (status === "crit") return "bg-red-500";
  if (status === "warn") return "bg-amber-500";
  return "bg-emerald-500";
};

const getComponentBadgeClasses = (status: ComponentStatus) => {
  if (status === "crit")
    return "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  if (status === "warn")
    return "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
  return "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
};

const getComponentIconClasses = (status: ComponentStatus) => {
  if (status === "crit")
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  if (status === "warn")
    return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
};

const getMetricTextColor = (status: ComponentStatus) => {
  if (status === "crit") return "text-red-600 dark:text-red-400";
  if (status === "warn") return "text-amber-600 dark:text-amber-400";
  return "text-slate-800 dark:text-slate-100";
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================
   DUMMY DATA — shaped like a real API response envelope
   BACKEND TODO: replace MOCK_ASSIGNED_MACHINE + fetchAssignedMachineFromApi
   with real calls:
     1) machineAssignmentService.getAssignedMachines(currentUser.id)
     2) fleetService.getFleetMachines() -> find matching machine
   Keep the FleetMachine shape below identical so no other code changes.
========================================================== */

function buildComponent(
  key: ComponentKey,
  label: string,
  lifePercent: number,
  subMetrics: Record<string, number>,
): MachineComponent {
  return {
    status: deriveOverallComponentStatus(key, lifePercent, subMetrics),
    label,
    lifePercent,
    subMetrics,
  };
}

// BACKEND TODO: these come from the same telemetry feed as lifePercent —

/* ==========================================================
   SUB-COMPONENTS
========================================================== */

const StatusIcon = ({ status }: { status: ComponentStatus }) => {
  const Icon =
    status === "crit"
      ? AlertCircle
      : status === "warn"
        ? AlertTriangle
        : CheckCircle2;
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-lg ${getComponentIconClasses(status)}`}
    >
      <Icon size={16} strokeWidth={1.5} />
    </div>
  );
};

const HealthBar = ({
  percent,
  status,
}: {
  percent: number;
  status: ComponentStatus;
}) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
    <div
      className={`h-full rounded-full transition-all duration-700 ${getComponentBarColor(status)}`}
      style={{ width: `${percent}%` }}
    />
  </div>
);

// Read-only chips shown on the Component Health grid card.
// Each chip is colored per its OWN safe-range status, not the overall one,
// so operator can see exactly which reading is the problem.
const SubMetricChips = ({
  componentKey,
  subMetrics,
}: {
  componentKey: ComponentKey;
  subMetrics: Record<string, number>;
}) => (
  <div className="mt-3 flex flex-wrap gap-1.5">
    {SUB_METRICS[componentKey].map((metric) => {
      const value = subMetrics[metric.key];
      const metricStatus = deriveMetricStatus(
        SUB_METRIC_RANGES[componentKey][metric.key],
        Number(value),
      );
      return (
        <span
          key={metric.key}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300"
        >
          {metric.label}:{" "}
          <span className={`font-semibold ${getMetricTextColor(metricStatus)}`}>
            {value ?? "—"}
            {metric.unit}
          </span>
        </span>
      );
    })}
  </div>
);

const HealthGauge = ({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 120 120" className="absolute h-36 w-36 -rotate-90">
        {/* Background Ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200 dark:stroke-slate-700"
        />

        {/* Progress Ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s ease",
          }}
        />
      </svg>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-bold leading-none text-slate-900 dark:text-white">
          {percent}%
        </h2>

        <p className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
          Overall Health
        </p>
      </div>
    </div>
  );
};

/* Small read-only badge in the modal that previews the FULL combined status —
   life% AND every sub-metric together — updating live as the operator types. */
const AutoStatusPreview = ({ status }: { status: ComponentStatus }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${getComponentBadgeClasses(status)}`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${getComponentBarColor(status)}`}
    />
    {STATUS_LABEL[status]}
  </span>
);

/* Shared maintenance-record row, used on the page and inside the history modal */
const MaintenanceRow = ({ record }: { record: MaintenanceRecord }) => (
  <div className="flex gap-3.5 rounded-lg border border-slate-100/60 bg-gradient-to-br from-slate-50/60 to-slate-50/30 p-4 transition hover:from-slate-50 hover:to-slate-50/40 dark:border-slate-800/60 dark:from-slate-800/40 dark:to-slate-900/30 dark:hover:from-slate-800/50 dark:hover:to-slate-900/40">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-400">
      <Wrench size={14} strokeWidth={1.5} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800 dark:text-white">
          {record.type}
        </p>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {record.date}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
        Logged by: {record.technician}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {record.notes}
      </p>
    </div>
  </div>
);

/* ==========================================================
   HISTORY MODAL
   NOTE: rendered via createPortal(document.body) so it always sits
   directly under <body> — independent of any transformed/positioned
   ancestor in the page layout (sidebar wrapper, AppLayout, etc).
   This is what stops the "fixed modal shifts with the layout" issue.
========================================================== */

function HistoryModal({

  
  records,
  onClose,
}: {
  records: MaintenanceRecord[];
  onClose: () => void;
}) 

{


  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg dark:border-slate-700/60 dark:bg-slate-950"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <History
              size={16}
              className="text-blue-600 dark:text-blue-400"
              strokeWidth={1.5}
            />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Maintenance History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {records.length} records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-5">
          {records.map((record, i) => (
            <MaintenanceRow key={i} record={record} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ==========================================================
   FORM SCHEMAS
========================================================== */

const componentConditionShape = z.object({
  lifePercent: z.coerce
    .number()
    .min(0, "Minimum is 0")
    .max(100, "Maximum is 100"),
  // BACKEND TODO: keys inside this record must match SUB_METRICS[componentKey]
  subMetrics: z.record(
    z.string(),
    z.coerce.number().min(0, "Must be 0 or above"),
  ),
});

const conditionUpdateSchema = z.object({
  tyre: componentConditionShape,
  engine: componentConditionShape,
  hydraulic: componentConditionShape,
  suspension: componentConditionShape,
  transmission: componentConditionShape,
  fuelSystem: componentConditionShape,
  coolingSystem: componentConditionShape,
  notes: z
    .string()
    .trim()
    .max(400, "Keep notes under 400 characters")
    .optional(),
});

type ConditionFormInput = z.input<typeof conditionUpdateSchema>;
type ConditionFormOutput = z.output<typeof conditionUpdateSchema>;

const replacementSchema = z.object({
  component: z.enum(
    [
      "tyre",
      "engine",
      "hydraulic",
      "suspension",
      "transmission",
      "fuelSystem",
      "coolingSystem",
    ],
    {
      error: "Select which component was replaced",
    },
  ),
  replacementDate: z.string().min(1, "Select the replacement date"),
  partReference: z.string().trim().max(120).optional(),
  notes: z
    .string()
    .trim()
    .min(5, "Add a short note about the replacement")
    .max(400, "Keep notes under 400 characters"),
});

type ReplacementFormInput = z.input<typeof replacementSchema>;
type ReplacementFormOutput = z.output<typeof replacementSchema>;

/* ==========================================================
   UPDATE MODAL
   NOTE: also rendered via createPortal(document.body) for the same
   reason as HistoryModal above — keeps it independent from any
   transformed ancestor so it never shifts when a nested Select
   (Component replaced) opens/closes.
========================================================== */

interface UpdateModalProps {
  machine: FleetMachine;
  onClose: () => void;
  onConditionUpdate: (data: ConditionFormOutput) => Promise<void>;
  onReplacementLog: (data: ReplacementFormOutput) => Promise<void>;
}

function UpdateHealthModal({
  machine,
  onClose,
  onConditionUpdate,
  onReplacementLog,
}: UpdateModalProps) {
  const [tab, setTab] = useState<"condition" | "replacement">("condition");

    useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  
  /* ---- Condition update form ---- */
  const [isSavingCondition, setIsSavingCondition] = useState(false);
  const {
    control: conditionControl,
    register: registerCondition,
    handleSubmit: handleConditionSubmit,
    watch: watchCondition,
    formState: { errors: conditionErrors },
  } = useForm<ConditionFormInput, any, ConditionFormOutput>({
    resolver: zodResolver(conditionUpdateSchema),
    defaultValues: {
      tyre: {
        lifePercent: machine.tyre.lifePercent,
        subMetrics: { ...machine.tyre.subMetrics },
      },
      engine: {
        lifePercent: machine.engine.lifePercent,
        subMetrics: { ...machine.engine.subMetrics },
      },
      hydraulic: {
        lifePercent: machine.hydraulic.lifePercent,
        subMetrics: { ...machine.hydraulic.subMetrics },
      },
      suspension: {
        lifePercent: machine.suspension.lifePercent,
        subMetrics: { ...machine.suspension.subMetrics },
      },
      transmission: {
        lifePercent: machine.transmission.lifePercent,
        subMetrics: { ...machine.transmission.subMetrics },
      },
      fuelSystem: {
        lifePercent: machine.fuelSystem.lifePercent,
        subMetrics: { ...machine.fuelSystem.subMetrics },
      },
      coolingSystem: {
        lifePercent: machine.coolingSystem.lifePercent,
        subMetrics: { ...machine.coolingSystem.subMetrics },
      },
      notes: "",
    },
  });

  // Watch the ENTIRE form so every live status preview (overall + per-metric)
  // reacts together as the operator types — this is the "sab ek dusre se
  // milkar kaam kare" part.
  const liveValues = watchCondition();

  const submitCondition = async (data: ConditionFormOutput) => {
    setIsSavingCondition(true);
    try {
      await onConditionUpdate(data);
      onClose();
    } finally {
      setIsSavingCondition(false);
    }
  };

  /* ---- Replacement form ---- */
  const [isSavingReplacement, setIsSavingReplacement] = useState(false);
  const {
    control: replacementControl,
    register: registerReplacement,
    handleSubmit: handleReplacementSubmit,
    formState: { errors: replacementErrors },
  } = useForm<ReplacementFormInput, any, ReplacementFormOutput>({
    resolver: zodResolver(replacementSchema),
    defaultValues: {
      component: undefined,
      replacementDate: todayISO(),
      partReference: "",
      notes: "",
    },
  });

  const submitReplacement = async (data: ReplacementFormOutput) => {
    setIsSavingReplacement(true);
    try {
      await onReplacementLog(data);
      onClose();
    } finally {
      setIsSavingReplacement(false);
    }
  };

  return createPortal(

    
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
       className="
flex
w-full
max-w-5xl
max-h-[90vh]
flex-col
overflow-hidden
rounded-2xl
bg-white
shadow-2xl
"
      >
        {/* Header */}
        <div
          className="
    rounded-t-2xl
    bg-gradient-to-r
    from-indigo-700
    via-blue-700
    to-indigo-800
    shadow-md
  "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3">
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-500/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100">
                {machine.fleet}
              </span>

              <h2 className="mt-2 text-xl font-bold text-white">
                Update Machine Health
              </h2>

              <p className="mt-0.5 text-xs text-blue-100">{machine.machine}</p>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 pb-4">
            <div className="flex rounded-lg bg-white/10 p-1.5">
              <button
                type="button"
                onClick={() => setTab("condition")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  tab === "condition"
                    ? "bg-white text-blue-700 shadow"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <SlidersHorizontal size={14} strokeWidth={2} />
                <span>Update Condition</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("replacement")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  tab === "replacement"
                    ? "bg-white text-blue-700 shadow"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <RotateCcw size={14} strokeWidth={2} />
                <span>Log Replacement</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="
    flex-1
    overflow-auto
    bg-slate-50
    dark:bg-slate-900
    p-6
    no-scrollbar
  "
        >
          {/* ── CONDITION TAB ── */}
          {tab === "condition" && (
            <form onSubmit={handleConditionSubmit(submitCondition)} noValidate>
              <div className="space-y-6">
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Enter the life remaining and the latest sensor readings for
                  each component. Condition (Good / Warning / Critical) is
                  calculated automatically from BOTH life % and every sensor
                  reading together — whichever one is worst decides the badge.
                  For example 0 PSI air pressure or 130°C engine temp will mark
                  that component Critical even if life % is high.
                </p>

                {COMPONENT_ORDER.map((key) => {
                  const meta = COMPONENT_META[key];
                  const Icon = meta.icon;
                  const componentValues = liveValues?.[key];
                  const previewLifePercent = Number(
                    componentValues?.lifePercent,
                  );
                  const previewSubMetrics = Object.fromEntries(
                    SUB_METRICS[key].map((m) => [
                      m.key,
                      Number(componentValues?.subMetrics?.[m.key]),
                    ]),
                  );
                  const overallStatus = deriveOverallComponentStatus(
                    key,
                    previewLifePercent,
                    previewSubMetrics,
                  );

                  return (
                    <div
                      key={key}
                      className="relative overflow-hidden rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-400">
                            <Icon size={14} strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {meta.label}
                          </p>
                        </div>
                        <AutoStatusPreview status={overallStatus} />
                      </div>

                      {/* Expected Life Hours & Formula Badge */}
                      <div className="mb-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 p-3 text-xs dark:border-blue-900/40 dark:from-blue-950/40 dark:to-indigo-950/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Expected Life: <span className="text-blue-600 dark:text-blue-400">{EXPECTED_LIFE_HOURS[key]} hrs</span>
                          </span>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Formula: (({EXPECTED_LIFE_HOURS[key]} - Used) / {EXPECTED_LIFE_HOURS[key]}) × 100
                          </span>
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                            Calculated Remaining = {Math.max(0, Math.min(100, Math.round((((EXPECTED_LIFE_HOURS[key] - Number(previewSubMetrics.usedHours ?? 0)) / EXPECTED_LIFE_HOURS[key])) * 100)))}%
                          </span>
                        </div>
                      </div>

                      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Life remaining (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        {...registerCondition(`${key}.lifePercent` as const)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      {conditionErrors[key]?.lifePercent && (
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          {conditionErrors[key]?.lifePercent?.message as string}
                        </p>
                      )}

                      {/* ── Sub-component readings ── */}
                      <div className="mt-4 border-t border-slate-200/60 pt-3.5 dark:border-slate-800/60">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                          <Gauge size={12} strokeWidth={2} />
                          Sensor Readings
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {SUB_METRICS[key].map((metric) => {
                            const metricValue = previewSubMetrics[metric.key];
                            const metricStatus = deriveMetricStatus(
                              SUB_METRIC_RANGES[key][metric.key],
                              metricValue,
                            );
                            return (
                              <div key={metric.key}>
                                <div className="mb-1.5 flex items-center justify-between gap-2">
                                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {metric.label} ({metric.unit})
                                  </label>
                                  {metricStatus !== "ok" && (
                                    <span
                                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${getComponentBarColor(metricStatus)}`}
                                      title={STATUS_LABEL[metricStatus]}
                                    />
                                  )}
                                </div>
                                <input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  {...registerCondition(
                                    `${key}.subMetrics.${metric.key}` as const,
                                  )}
                                  className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:bg-slate-900 ${
                                    metricStatus === "crit"
                                      ? "border-red-300 text-red-700 focus:border-red-500 dark:border-red-500/40 dark:text-red-400"
                                      : metricStatus === "warn"
                                        ? "border-amber-300 text-amber-700 focus:border-amber-500 dark:border-amber-500/40 dark:text-amber-400"
                                        : "border-slate-200 text-slate-900 focus:border-blue-500 dark:border-slate-700 dark:text-slate-100"
                                  }`}
                                />
                                {(conditionErrors[key]?.subMetrics as any)?.[
                                  metric.key
                                ] && (
                                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                                    {
                                      (
                                        conditionErrors[key]?.subMetrics as any
                                      )?.[metric.key]?.message as string
                                    }
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Notes (optional)
                  </label>
                  <textarea
                    {...registerCondition("notes")}
                    rows={3}
                    placeholder="Anything else worth noting about this inspection..."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                  />
                  {conditionErrors.notes && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {conditionErrors.notes.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200/60 px-6 py-4 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSavingCondition}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCondition}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:bg-blue-700 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCondition ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                      Save Update
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── REPLACEMENT TAB ── */}
          {tab === "replacement" && (
            <form
              onSubmit={handleReplacementSubmit(submitReplacement)}
              noValidate
            >
              <div className="space-y-5 p-6">
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200/60 bg-gradient-to-r from-blue-50/60 to-blue-50/30 px-4 py-3 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-blue-500/5">
                  <ClipboardCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs leading-5 text-blue-900 dark:text-blue-300">
                    Use this only when a component has been fully replaced with
                    a new part. It resets that component's condition to Good,
                    life to 100%, sensor readings to factory-fresh values, and
                    logs it in maintenance history.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <Wrench size={13} strokeWidth={1.5} />
                    Component replaced
                  </label>

                  <Controller
                    control={replacementControl}
                    name="component"
                    render={({ field }) => (
                      <AppSelect
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select a component"
                        options={COMPONENT_ORDER.map((key) => ({
                          value: key,
                          label: COMPONENT_META[key].label,
                        }))}
                      />
                    )}
                  />

                  {replacementErrors.component && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {replacementErrors.component.message as string}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <CalendarDays size={13} strokeWidth={1.5} />
                      Replacement date
                    </label>
                    <input
                      type="date"
                      {...registerReplacement("replacementDate")}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    {replacementErrors.replacementDate && (
                      <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                        {replacementErrors.replacementDate.message as string}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <Hash size={13} strokeWidth={1.5} />
                      Part reference (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Part No. / Serial"
                      {...registerReplacement("partReference")}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <FileText size={13} strokeWidth={1.5} />
                    Notes
                  </label>
                  <textarea
                    {...registerReplacement("notes")}
                    rows={3}
                    placeholder="Describe the replacement — reason, condition of old part, etc."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
                  />
                  {replacementErrors.notes && (
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                      {replacementErrors.notes.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200/60 px-6 py-4 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSavingReplacement}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingReplacement}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:bg-blue-700 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingReplacement ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                      Log Replacement
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function OperatorMachineDashboard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [machine, setMachine] = useState<FleetMachine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [assignedMachines, setAssignedMachines] = useState<FleetMachine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");

  // BACKEND TODO: pull real user from StorageService.get(STORAGE_KEYS.USER)
  // once auth is wired — not needed for the dummy data path below.

  const fetchAssignedMachine = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      //   type CurrentUser = {
      //     id: string;
      //     name?: string;
      //     role?: string;
      //     companyId?: string;
      //   };

      //   const currentUser = StorageService.get<CurrentUser>(STORAGE_KEYS.USER);

      //   if (!currentUser) {
      //     setLoadError("User not found");
      //     setLoading(false);
      //     return;
      //   }

      // TEMP DUMMY USER (same as Fleet page)
      // TODO: Replace with StorageService after auth integration
      const currentUser = {
        id: "eng_1",
        role: "Artisans",
      };

      const machines = await fleetService.getFleetMachines();

      const convertedMachines = machines.map(convertFleetMachine);

      setAssignedMachines(convertedMachines);

      if (convertedMachines.length > 0) {
        setSelectedMachineId(convertedMachines[0].id);
        setMachine(convertedMachines[0]);
      }

      if (convertedMachines.length > 0) {
        setSelectedMachineId(convertedMachines[0].id);
        setMachine(convertedMachines[0]);
      } else {
        setMachine(null);
      }
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load machine.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedMachine();
  }, [fetchAssignedMachine]);

  const statusStyles = useMemo(
    () => (machine ? getStatusClasses(machine.status) : null),
    [machine],
  );

  const recomputeMachine = (base: FleetMachine): FleetMachine => {
    const sum =
      base.tyre.lifePercent +
      base.engine.lifePercent +
      base.hydraulic.lifePercent +
      base.suspension.lifePercent +
      base.transmission.lifePercent +
      base.fuelSystem.lifePercent +
      base.coolingSystem.lifePercent;
    const avg = Math.round(sum / 7);
    return { ...base, healthPercent: avg, status: deriveFleetStatus(avg) };
  };

  /* ---- Condition update handler ---- */
  const handleConditionUpdate = async (data: ConditionFormOutput) => {
    if (!machine) return;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setMachine((prev) => {
        if (!prev) return prev;

        const updateComp = (key: ComponentKey) => {
          const cData = (data as any)[key];
          if (!cData) return prev[key];
          const expected = EXPECTED_LIFE_HOURS[key];
          const used = Number(cData.subMetrics?.usedHours ?? DEFAULT_SUB_METRICS[key].usedHours);
          const calculatedLife = Math.max(0, Math.min(100, Math.round(((expected - used) / expected) * 100)));
          const lifePercent = cData.lifePercent !== undefined ? Number(cData.lifePercent) : calculatedLife;

          return {
            ...prev[key],
            lifePercent,
            subMetrics: { ...cData.subMetrics, usedHours: used },
            status: deriveOverallComponentStatus(key, lifePercent, cData.subMetrics),
          };
        };

        const nextTyre = updateComp("tyre");
        const nextEngine = updateComp("engine");
        const nextHydraulic = updateComp("hydraulic");
        const nextSuspension = updateComp("suspension");
        const nextTransmission = updateComp("transmission");
        const nextFuelSystem = updateComp("fuelSystem");
        const nextCoolingSystem = updateComp("coolingSystem");

        const newRecord: MaintenanceRecord = {
          date: formatDateDisplay(new Date().toISOString()),
          type: "7-Component Condition Update",
          technician: "Company Admin",
          notes: data.notes?.trim()
            ? data.notes.trim()
            : "Routine condition update logged for all 7 components.",
          status: "Completed",
        };

        return recomputeMachine({
          ...prev,
          tyre: nextTyre,
          engine: nextEngine,
          hydraulic: nextHydraulic,
          suspension: nextSuspension,
          transmission: nextTransmission,
          fuelSystem: nextFuelSystem,
          coolingSystem: nextCoolingSystem,
          maintenanceHistory: [newRecord, ...prev.maintenanceHistory],
        });
      });

      toast.success("Machine health updated for all 7 components");
    } catch (err) {
      toast.error("Couldn't save the update. Please try again.");
    }
  };

  const handleMachineChange = (id: string) => {
    setSelectedMachineId(id);

    const selected = assignedMachines.find((m) => m.id === id);

    if (!selected) return;

    setMachine(selected);
  };

  /* ---- Replacement log handler ---- */
  const handleReplacementLog = async (data: ReplacementFormOutput) => {
    if (!machine) return;
    try {
      // BACKEND TODO: replace with POST /api/machines/{machine.id}/replacements
      await new Promise((resolve) => setTimeout(resolve, 700));

      setMachine((prev) => {
        if (!prev) return prev;
        const replacedLabel = COMPONENT_META[data.component].label;
        const freshSubMetrics = { ...DEFAULT_SUB_METRICS[data.component] };

        const updatedComponent: MachineComponent = {
          ...prev[data.component],
          lifePercent: 100,
          subMetrics: freshSubMetrics,
          status: deriveOverallComponentStatus(
            data.component,
            100,
            freshSubMetrics,
          ),
        };

        const newRecord: MaintenanceRecord = {
          date: formatDateDisplay(data.replacementDate),
          type: `${replacedLabel} Replaced`,
          technician: "You",
          notes: data.partReference
            ? `${data.notes.trim()} (Ref: ${data.partReference.trim()})`
            : data.notes.trim(),
        };

        return recomputeMachine({
          ...prev,
          [data.component]: updatedComponent,
          maintenanceHistory: [newRecord, ...prev.maintenanceHistory],
        });
      });

      toast.success(
        `${COMPONENT_META[data.component].label} replacement logged`,
      );
    } catch (err) {
      toast.error("Couldn't log the replacement. Please try again.");
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-[#F1F5FB] p-5 dark:bg-gradient-to-b dark:from-[#0F172A] dark:to-[#020617]">
      {/* Hides scrollbar visuals on history containers while staying scrollable */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* ── HEADER ── */}
        <div className="rounded-[10px] bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 px-8 py-8 shadow-lg">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
                <Truck size={24} className="text-white" strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">
                  Machine
                </p>

                <h1 className="mt-2 text-4xl font-extrabold text-white">
                  {loading
                    ? "Loading your machine..."
                    : machine
                      ? machine.machine
                      : "No Machine Assigned"}
                </h1>

                {machine && (
                  <p className="mt-2 text-sm text-blue-100">
                    {machine.type} • {machine.fleet} • {machine.company}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Machine Selector Dropdown */}
            {assignedMachines.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                  Select Machine:
                </span>
                <select
                  value={selectedMachineId}
                  onChange={(e) => handleMachineChange(e.target.value)}
                  className="rounded-xl border border-white/20 bg-blue-900/60 px-4 py-2.5 text-sm font-semibold text-white shadow-inner backdrop-blur-md outline-none transition hover:bg-blue-900/80 focus:border-white focus:ring-2 focus:ring-white/20 dark:bg-slate-900 dark:text-white"
                >
                  {assignedMachines.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className="bg-slate-900 text-white"
                    >
                      {m.machine} ({m.fleet})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── LOADING STATE ── */}
        {loading && (
          <div className="rounded-xl border border-slate-200/60 bg-white p-8 shadow-sm dark:border-slate-700/60 dark:bg-slate-950">
            <div className="flex animate-pulse flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-32 w-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-40 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-64 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-52 rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {!loading && loadError && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200/80 bg-gradient-to-b from-red-50 to-red-50/50 p-10 text-center shadow-sm dark:border-red-500/20 dark:from-red-500/10 dark:to-red-500/5">
            <AlertCircle className="text-red-500" size={28} strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">
              {loadError}
            </p>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && !loadError && !machine && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 bg-white p-14 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-950">
            <Truck size={32} className="text-slate-300" strokeWidth={1.5} />
            <h3 className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">
              No machine assigned yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Once a machine is assigned to you, it will show up here.
            </p>
          </div>
        )}

        {/* ── MACHINE DETAIL ── */}
        {!loading && !loadError && machine && statusStyles && (
          <>
            {/* Overview card */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-950 sm:p-7 p-6">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
                <HealthGauge
                  percent={machine.healthPercent}
                  color={statusStyles.gauge}
                />

                <div className="flex-1">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold ${statusStyles.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                      />
                      {machine.status}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Type: {machine.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        icon: User,
                        label: "Operator",
                        value: machine.operator,
                      },
                      {
                        icon: MapPin,
                        label: "Location",
                        value: machine.location,
                      },
                      {
                        icon: Clock,
                        label: "Last Seen",
                        value: machine.lastSeen,
                      },
                      {
                        icon: Activity,
                        label: "Hours Run",
                        value: `${machine.hoursRun.toLocaleString()} hrs`,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="relative overflow-hidden rounded-lg border border-slate-100/60 bg-gradient-to-br from-slate-50/60 to-slate-50/30 p-5 transition hover:from-slate-50 hover:to-slate-50/40 dark:border-slate-800/60 dark:from-slate-800/40 dark:to-slate-900/30 dark:hover:from-slate-800/50 dark:hover:to-slate-900/40"
                        >
                          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                            <Icon size={13} strokeWidth={2} />
                            <p className="text-xs font-semibold uppercase tracking-wider">
                              {item.label}
                            </p>
                          </div>
                          <h4 className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {item.value}
                          </h4>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 dark:border-blue-500/20 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity
                          size={16}
                          className="text-blue-600"
                          strokeWidth={2}
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Overall Machine Health
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          machine.healthPercent >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : machine.healthPercent >= 50
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {machine.healthPercent}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          machine.healthPercent >= 80
                            ? "bg-emerald-500"
                            : machine.healthPercent >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${machine.healthPercent}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Poor</span>
                      <span>Average</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                    {/* Machine Dropdown */}
                    <div className="w-full sm:max-w-sm">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Select Machine
                      </label>

                      <AppSelect
                        value={selectedMachineId}
                        onChange={handleMachineChange}
                        placeholder="Select Machine"
                        options={assignedMachines.map((machine) => ({
                          value: machine.id,
                          label: `${machine.machine} (${machine.fleet})`,
                        }))}
                        triggerClassName="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Update Button */}
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white shadow-md transition hover:bg-blue-700 active:shadow-sm"
                    >
                      <RefreshCcw size={15} strokeWidth={1.8} />
                      Update Machine Health
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Components grid */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-950 sm:p-7 p-6">
              <h3 className="mb-5 text-sm font-semibold text-slate-900 dark:text-white">
                Component Health
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {COMPONENT_ORDER.map((key) => {
                  const comp = machine[key];
                  return (
                    <div
                      key={key}
                      className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700/60"
                    >
                      {/* Background Image */}
                      <img
                        src={COMPONENT_IMAGES[key]}
                        alt={COMPONENT_META[key].label}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/60 to-slate-900/35" />

                      {/* Glass Overlay */}
                      <div className="absolute inset-0 backdrop-blur-[1px]" />

                      {/* Content */}
                      <div className="relative z-10 flex h-full flex-col justify-between p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-white/20 bg-white/90 p-2 shadow-lg backdrop-blur-md">
                              <StatusIcon status={comp.status} />
                            </div>

                            <div>
                              <h3 className="text-lg font-bold tracking-wide text-white drop-shadow">
                                {COMPONENT_META[key].label}
                              </h3>

                              <p className="mt-1 text-xs text-white/80">
                                Component Health Status
                              </p>
                            </div>
                          </div>

                          <span
                            className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg ${
                              comp.status === "ok"
                                ? "bg-emerald-500 text-white"
                                : comp.status === "warn"
                                  ? "bg-orange-500 text-white"
                                  : "bg-red-600 text-white"
                            }`}
                          >
                            {STATUS_LABEL[comp.status]}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="mt-6">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-white/80">
                              Remaining Life
                            </span>

                            <span className="text-sm font-bold text-white">
                              {comp.lifePercent}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/25">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                comp.status === "crit"
                                  ? "bg-red-500"
                                  : comp.status === "warn"
                                    ? "bg-orange-400"
                                    : "bg-emerald-400"
                              }`}
                              style={{
                                width: `${comp.lifePercent}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Sensor Chips */}
                        <div className="mt-5 flex flex-wrap gap-2">
                          {SUB_METRICS[key].map((metric) => {
                            const value = comp.subMetrics[metric.key];

                            const metricStatus = deriveMetricStatus(
                              SUB_METRIC_RANGES[key][metric.key],
                              Number(value),
                            );

                            return (
                              <div
                                key={metric.key}
                                className="rounded-xl border border-white/20 bg-white/90 px-3 py-2 text-xs shadow-lg backdrop-blur-md"
                              >
                                <span className="font-medium text-slate-700">
                                  {metric.label}
                                </span>

                                <span
                                  className={`ml-1 font-bold ${
                                    metricStatus === "crit"
                                      ? "text-red-600"
                                      : metricStatus === "warn"
                                        ? "text-orange-600"
                                        : "text-emerald-600"
                                  }`}
                                >
                                  {value}
                                  {metric.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── COMPONENT UPDATES & MAINTENANCE AUDIT TABLE ── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                    <History size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Component Updates &amp; Maintenance Audit Table
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Live record of all condition updates, component replacements, and health logs for{" "}
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {machine.machine} ({machine.fleet})
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                >
                  <RefreshCcw size={14} />
                  + Update Machine Health
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 whitespace-nowrap">Date</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">Machine</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">Update / Action</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">Logged By</th>
                      <th className="px-5 py-3.5">Notes &amp; Inspection Remarks</th>
                      <th className="px-5 py-3.5 text-right whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {machine.maintenanceHistory.map((record, idx) => (
                      <tr
                        key={idx}
                        className="transition hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {record.date}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {machine.machine}
                          </span>
                          <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {machine.fleet}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {record.type}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {record.technician || "Company Admin"}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-md">
                          {record.notes}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 size={12} />
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      {/* ── UPDATE MODAL ── */}
      {isModalOpen && machine && (
        <UpdateHealthModal
          machine={machine}
          onClose={() => setIsModalOpen(false)}
          onConditionUpdate={handleConditionUpdate}
          onReplacementLog={handleReplacementLog}
        />
      )}

      {/* ── HISTORY MODAL ── */}
      {isHistoryOpen && machine && (
        <HistoryModal
          records={machine.maintenanceHistory}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
}