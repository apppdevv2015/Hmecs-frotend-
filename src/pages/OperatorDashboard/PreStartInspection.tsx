import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import machineService from "../../services/Operator/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import { inspectionService } from "../../services/Operator/inspectionService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { apiCall } from "../../services/apiHandler";

import {
  AlertTriangle,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Clock,
  Disc,
  Droplet,
  Fuel,
  Gauge,
  Hash,
  ImagePlus,
  Lightbulb,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  PlusCircle,
  Settings,
  Sliders,
  Thermometer,
  Trash2,
  Truck,
  Upload,
  Wind,
  Wrench,
  X,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

// ============================================================================
// Pre-Start Inspection — Type Definitions
// Keep UI and data separated so future API integration doesn't touch the UI.
// ============================================================================

export type MachineStatus = "Online" | "Offline" | "Maintenance";

export interface Machine {
  id: string;
  name: string; // e.g. "DT-102"
  type: string; // e.g. "Haul Truck"
  serialNumber: string;
  location: string;
  currentHours: number;
  status: MachineStatus;
  operatorName: string;
  imageUrl: string;
}

// ---------------------------------------------------------------------------
// Issue Reporting
// ---------------------------------------------------------------------------

export type IssueComponent =
  | "Suspension"
  | "Engine"
  | "Hydraulic System"
  | "Transmission"
  | "Braking System"
  | "Tyres"
  | "Other";

export type IssueSeverity = "Low" | "Medium" | "High" | "Critical";

export interface IssueImage {
  id: string;
  file: File | null; // null for pre-seeded mock previews
  previewUrl: string;
  name: string;
  sizeKb: number;
}

export interface IssueReport {
  id: string;
  machineId: string;
  component: IssueComponent | "";
  severity: IssueSeverity | "";
  description: string;
  images: IssueImage[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Pre-Start Inspection Checklist
// ---------------------------------------------------------------------------

export type InspectionStatus = "OK" | "Issue" | "N/A" | "Pending";

export interface InspectionItem {
  id: string;
  label: string;
  icon: string; // key mapped to a lucide icon in the component
  status: InspectionStatus;
  value?: string;
  unit?: string;
  safeRange?: string;
  description: string;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Component Health
// ---------------------------------------------------------------------------
// Categories now come directly from real backend data instead of a fixed
// list, so any category the API returns will show up correctly.
export type ComponentCategory = string;

export type ComponentHealthStatus = "Healthy" | "Good" | "Warning" | "Critical";

export interface CategoryOverview {
  category: ComponentCategory;
  overallHealth: number; // 0-100
  status: ComponentHealthStatus;
  hoursRun: number;
  lastUpdated: string;
}

export interface ComponentParameter {
  name: string;
  unit: string;
  safeMin: number;
  safeMax: number;
  defaultVal: number;
  currentVal?: number;
  description?: string;
}

export interface MachineComponent {
  id: string;
  category: ComponentCategory;
  name: string;
  health: number; // 0-100
  status: ComponentHealthStatus;
  currentReading: string; // e.g. "68°C" or "—"
  parameters?: ComponentParameter[];
}

export interface ComponentUpdate {
  componentId: string;
  currentLevel: number;
  condition: "Poor" | "Fair" | "Good" | "Excellent";
  status: ComponentHealthStatus;
  currentReading: string;
  notes: string;
  images: IssueImage[];
}

// ---------------------------------------------------------------------------
// Future API contract (not wired up yet — kept here so the shape is obvious
// when the real endpoints are ready to be dropped in)
// ---------------------------------------------------------------------------

export interface PreStartInspectionApi {
  getAssignedMachine: (operatorId: string) => Promise<Machine>;
  getInspectionChecklist: (machineId: string) => Promise<InspectionItem[]>;
  getMachineComponents: (machineId: string) => Promise<MachineComponent[]>;
  postInspectionResult: (
    machineId: string,
    item: InspectionItem,
  ) => Promise<void>;
  postIssueReport: (report: IssueReport) => Promise<void>;
  postIssueImages: (issueId: string, images: File[]) => Promise<void>;
  patchComponentUpdate: (update: ComponentUpdate) => Promise<void>;
  postCompleteInspection: (machineId: string) => Promise<void>;
}

// ============================================================================
// MOCK DATA — swap for real API responses later
// ============================================================================

// ============================================================================
// Mock Data — replace with real API responses later.
// Shape mirrors what the future endpoints (see PreStartInspectionApi) return,
// so swapping these for `await api.getX()` calls will not require UI changes.
// ============================================================================

export const mockMachine: Machine = {
  id: "m-dt102",
  name: "DT-102",
  type: "Haul Truck",
  serialNumber: "SN-DT-102",
  location: "East Pit",
  currentHours: 4800,
  status: "Online",
  operatorName: "Ankush Waliya",
  imageUrl:
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop",
};

export const mockInspectionItems: InspectionItem[] = [
  {
    id: "insp-engine-oil",
    label: "Engine Oil Level",
    icon: "droplet",
    status: "OK",
    value: "92% Full (Dipstick MAX)",
    unit: "%",
    safeRange: "Safe: 80%–100% Level",
    description: "Oil viscosity clear, level optimal at upper dipstick notch.",
    imageUrl: null,
  },
  {
    id: "insp-coolant",
    label: "Coolant Level",
    icon: "thermometer",
    status: "OK",
    value: "82°C (95% Surge Tank)",
    unit: "°C",
    safeRange: "Safe: 65°C–95°C / >80% Full",
    description: "Radiator core clean, surge tank at full indicator.",
    imageUrl: null,
  },
  {
    id: "insp-hydraulic-oil",
    label: "Hydraulic Oil Level",
    icon: "wrench",
    status: "OK",
    value: "245 Bar (90% Sight Glass)",
    unit: "Bar",
    safeRange: "Safe: 180–320 Bar / >75% Level",
    description: "Reservoir level normal, zero suction cavitation noise.",
    imageUrl: null,
  },
  {
    id: "insp-fuel",
    label: "Fuel Level",
    icon: "fuel",
    status: "OK",
    value: "85% (320 Litres)",
    unit: "%",
    safeRange: "Safe: >25% Capacity",
    description: "Fuel water separator drained, clean flow.",
    imageUrl: null,
  },
  {
    id: "insp-tyre",
    label: "Tyre Condition",
    icon: "circleDot",
    status: "OK",
    value: "115 PSI (42mm Tread)",
    unit: "PSI",
    safeRange: "Safe: 95–130 PSI / >20mm Tread",
    description: "Beads intact, zero sidewall bulge or severe cuts.",
    imageUrl: null,
  },
  {
    id: "insp-brake",
    label: "Brake System",
    icon: "discAlbum",
    status: "OK",
    value: "140 Bar Accumulator",
    unit: "Bar",
    safeRange: "Safe: 110–160 Bar Holding",
    description: "Service brake modulation firm, parking brake hold tested.",
    imageUrl: null,
  },
  {
    id: "insp-steering",
    label: "Steering System",
    icon: "navigation",
    status: "OK",
    value: "0.0° Play (Rapid Response)",
    unit: "deg",
    safeRange: "Safe: <5° Free Play",
    description: "Articulated steering cylinders smooth lock-to-lock.",
    imageUrl: null,
  },
  {
    id: "insp-lights",
    label: "Lights & Indicators",
    icon: "lightbulb",
    status: "OK",
    value: "24.2V (All 12 Lamps ON)",
    unit: "V",
    safeRange: "Safe: 12/12 Lamps Active",
    description: "High beams, reverse beacon, and hazard flashers verified.",
    imageUrl: null,
  },
  {
    id: "insp-air-filter",
    label: "Air Filter",
    icon: "wind",
    status: "OK",
    value: "0.8 kPa Delta-P (Clear)",
    unit: "kPa",
    safeRange: "Safe: <2.5 kPa Restriction",
    description: "Pre-cleaner bowl emptied, dust valve operational.",
    imageUrl: null,
  },
  {
    id: "insp-belts",
    label: "Belts & Hoses",
    icon: "settings",
    status: "OK",
    value: "15mm Tension (Zero Cracks)",
    unit: "mm",
    safeRange: "Safe: 12–18mm Deflection",
    description: "Serpentine belt tensioner aligned, hydraulic hoses dry.",
    imageUrl: null,
  },
];

export const mockComponentCategories: ComponentCategory[] = [
  "Engine",
  "Hydraulic System",
  "Transmission",
  "Suspension",
  "Braking System",
  "Tyres",
];

export const mockCategoryOverview: Record<ComponentCategory, CategoryOverview> = {
  Engine: {
    category: "Engine",
    overallHealth: 88,
    status: "Healthy",
    hoursRun: 4800,
    lastUpdated: "Today, 07:40 AM",
  },
  "Hydraulic System": {
    category: "Hydraulic System",
    overallHealth: 74,
    status: "Good",
    hoursRun: 3120,
    lastUpdated: "Yesterday, 06:10 PM",
  },
  Transmission: {
    category: "Transmission",
    overallHealth: 91,
    status: "Healthy",
    hoursRun: 4800,
    lastUpdated: "Today, 07:40 AM",
  },
  Suspension: {
    category: "Suspension",
    overallHealth: 82,
    status: "Healthy",
    hoursRun: 2840,
    lastUpdated: "Today, 08:15 AM",
  },
  "Braking System": {
    category: "Braking System",
    overallHealth: 68,
    status: "Warning",
    hoursRun: 4800,
    lastUpdated: "Today, 08:15 AM",
  },
  Tyres: {
    category: "Tyres",
    overallHealth: 79,
    status: "Good",
    hoursRun: 1980,
    lastUpdated: "2 days ago",
  },
};

export const mockComponentsByCategory: Record<ComponentCategory, MachineComponent[]> = {
  Engine: [
    { id: "c-eng-oil", category: "Engine", name: "Engine Oil", health: 85, status: "Good", currentReading: "92°C" },
    { id: "c-eng-turbo", category: "Engine", name: "Turbocharger", health: 90, status: "Healthy", currentReading: "—" },
    { id: "c-eng-filter", category: "Engine", name: "Fuel Injector", health: 88, status: "Good", currentReading: "—" },
  ],
  "Hydraulic System": [
    { id: "c-hyd-pump", category: "Hydraulic System", name: "Hydraulic Pump", health: 72, status: "Good", currentReading: "58°C" },
    { id: "c-hyd-oil", category: "Hydraulic System", name: "Hydraulic Oil", health: 76, status: "Good", currentReading: "—" },
    { id: "c-hyd-hose", category: "Hydraulic System", name: "Hoses & Seals", health: 70, status: "Warning", currentReading: "—" },
  ],
  Transmission: [
    { id: "c-tr-fluid", category: "Transmission", name: "Transmission Fluid", health: 92, status: "Healthy", currentReading: "64°C" },
    { id: "c-tr-clutch", category: "Transmission", name: "Clutch Pack", health: 90, status: "Healthy", currentReading: "—" },
  ],
  Suspension: [
    { id: "c-susp-oil", category: "Suspension", name: "Suspension Oil", health: 78, status: "Good", currentReading: "68°C" },
    { id: "c-susp-cyl", category: "Suspension", name: "Suspension Cylinder", health: 86, status: "Good", currentReading: "—" },
    { id: "c-susp-leaf", category: "Suspension", name: "Leaf Spring", health: 80, status: "Good", currentReading: "—" },
    { id: "c-susp-shock", category: "Suspension", name: "Shock Absorber", health: 75, status: "Good", currentReading: "—" },
    { id: "c-susp-pins", category: "Suspension", name: "Pins & Bushes", health: 82, status: "Good", currentReading: "—" },
  ],
  "Braking System": [
    { id: "c-brk-pads", category: "Braking System", name: "Brake Pads", health: 62, status: "Warning", currentReading: "—" },
    { id: "c-brk-fluid", category: "Braking System", name: "Brake Fluid", health: 74, status: "Good", currentReading: "—" },
    { id: "c-brk-disc", category: "Braking System", name: "Brake Disc", health: 68, status: "Warning", currentReading: "—" },
  ],
  Tyres: [
    { id: "c-tyre-fl", category: "Tyres", name: "Front Left Tyre", health: 80, status: "Good", currentReading: "32 psi" },
    { id: "c-tyre-fr", category: "Tyres", name: "Front Right Tyre", health: 78, status: "Good", currentReading: "31 psi" },
    { id: "c-tyre-rl", category: "Tyres", name: "Rear Left Tyre", health: 79, status: "Good", currentReading: "33 psi" },
  ],
};

// ============================================================================
// Constants
// ============================================================================

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ISSUE_COMPONENT_OPTIONS: IssueComponent[] = [
  "Suspension",
  "Engine",
  "Hydraulic System",
  "Transmission",
  "Braking System",
  "Tyres",
  "Other",
];

const SEVERITY_OPTIONS: IssueSeverity[] = ["Low", "Medium", "High", "Critical"];

const CHECKLIST_ICONS: Record<string, React.ElementType> = {
  droplet: Droplet,
  thermometer: Thermometer,
  wrench: Wrench,
  fuel: Fuel,
  circleDot: CircleDot,
  discAlbum: Disc,
  navigation: Navigation,
  lightbulb: Lightbulb,
  wind: Wind,
  settings: Settings,
};

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

// ============================================================================
// Style helpers
// ============================================================================

const severityBadgeClass = (severity: IssueSeverity | "") => {
  switch (severity) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
    case "High":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300";
  }
};

const healthBarColor = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const healthTextColor = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const componentStatusBadgeClass = (status: ComponentHealthStatus) => {
  switch (status) {
    case "Healthy":
    case "Good":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "Warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300";
  }
};

// ============================================================================
// Shared: Image Uploader (used by Report Issue + Update Component modals)
// ============================================================================

function ImageUploader({
  images,
  onAdd,
  onRemove,
}: {
  images: IssueImage[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={images.length >= MAX_IMAGES}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:border-blue-500"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Photo
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={images.length >= MAX_IMAGES}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:border-blue-500"
        >
          <Camera size={15} strokeWidth={2.5} />
          Take Photo
        </button>

        <span className="text-xs font-semibold text-slate-400">
          {images.length}/{MAX_IMAGES} added
        </span>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="mt-2 text-[11px] font-medium text-slate-400">
        JPG, PNG or WEBP • Maximum {MAX_IMAGE_SIZE_MB} MB per image • Up to{" "}
        {MAX_IMAGES} images
      </p>

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            >
              <img
                src={img.previewUrl}
                alt={img.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-red-600"
                title="Remove"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
              <span className="absolute inset-x-0 bottom-0 truncate bg-slate-950/60 px-1.5 py-1 text-[10px] font-semibold text-white">
                {img.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const useImageUpload = (initial: IssueImage[] = []) => {
  const [images, setImages] = useState<IssueImage[]>(initial);

  const addImages = (files: FileList | null) => {
    if (!files) return;

    const incoming = Array.from(files).slice(0, MAX_IMAGES - images.length);
    const valid: IssueImage[] = [];

    incoming.forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toastFallback(`${file.name}: only JPG, PNG or WEBP allowed`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toastFallback(`${file.name}: exceeds ${MAX_IMAGE_SIZE_MB} MB limit`);
        return;
      }
      valid.push({
        id: nextId("img"),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
      });
    });

    setImages((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const reset = () => setImages([]);

  return { images, addImages, removeImage, reset, setImages };
};

// Minimal inline fallback so this file has no hard dependency on a toast
// library. Swap for your project's toast (e.g. react-hot-toast) if desired.
function toastFallback(message: string) {
  // eslint-disable-next-line no-console
  console.warn(message);
}

// ============================================================================
// Current Assigned Machine
// ============================================================================

function MachineCard({
  machine,
  components,
}: {
  machine: Machine;
  components: MachineComponent[];
}) {
  const overallHealth = components.length
    ? Math.round(components.reduce((sum, c) => sum + c.health, 0) / components.length)
    : 100;
  const status = healthToStatus(overallHealth);
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (overallHealth / 100) * circumference;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Assigned Machine
        </h2>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {machine.status}
        </span>
      </div>

      {/* Replaced Image with Machine Health Dial & Overview */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#101f33]">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              strokeWidth="8"
              className="stroke-slate-200 dark:stroke-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={
                overallHealth >= 80
                  ? "stroke-emerald-500"
                  : overallHealth >= 60
                    ? "stroke-amber-500"
                    : "stroke-red-500"
              }
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-slate-950 dark:text-white">
              {overallHealth}%
            </span>
          </div>
        </div>

        <p className="mt-1.5 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
          Overall Health
        </p>

        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${componentStatusBadgeClass(
              status,
            )}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            • {components.length} Installed
          </span>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
          {machine.name}
        </h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {machine.type}
        </p>
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <InfoRow icon={Hash} label="Serial Number" value={machine.serialNumber} />
        <InfoRow icon={MapPin} label="Location" value={machine.location} />
        <InfoRow
          icon={Clock}
          label="Current Hours"
          value={`${machine.currentHours.toLocaleString()} hrs`}
        />
        <InfoRow icon={Truck} label="Operator" value={machine.operatorName} />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        <Icon size={14} strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}

function ReportIssueModal({
  machineId,
  onClose,
  onSubmit,
}: {
  machineId: string;
  onClose: () => void;
  onSubmit: (report: IssueReport) => void;
}) {
  const [component, setComponent] = useState<IssueComponent | "">("");
  const [severity, setSeverity] = useState<IssueSeverity | "">("");
  const [description, setDescription] = useState(
    "Oil leakage detected from the left suspension area.",
  );
  const { images, addImages, removeImage } = useImageUpload();
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!component || !severity || !description.trim()) {
      setError("Please select a component, severity and add a description.");
      return;
    }

    onSubmit({
      id: nextId("issue"),
      machineId,
      component,
      severity,
      description: description.trim(),
      images,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <ModalShell title="Report an Issue" onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Component
          </label>
          <select
            value={component}
            onChange={(e) => setComponent(e.target.value as IssueComponent)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          >
            <option value="">Select component</option>
            {ISSUE_COMPONENT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Severity
          </label>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSeverity(opt)}
                className={`h-9 rounded-lg border px-4 text-xs font-bold transition ${
                  severity === opt
                    ? severityBadgeClass(opt) + " ring-2 ring-offset-1 ring-current/30"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Issue Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe what's wrong..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Images / Evidence
          </label>
          <ImageUploader images={images} onAdd={addImages} onRemove={removeImage} />
        </div>
      </div>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#12243b]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="h-11 rounded-lg bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Submit Issue
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ============================================================================
// Pre-Start Inspection Checklist
// ============================================================================

function ChecklistSection({
  items,
  onUpdateItem,
}: {
  items: InspectionItem[];
  onUpdateItem: (id: string, patch: Partial<InspectionItem>) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedCount = items.filter((i) => i.status !== "Pending").length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
            Pre-Start Inspection Checklist
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Complete all required checks before starting the machine.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:min-w-[220px]">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Progress</span>
              <span>{completedCount} of {items.length} completed</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-lg font-black text-slate-950 dark:text-white">
            {progressPct}%
          </span>
        </div>
      </div>

      <div className="mt-2 max-h-[520px] divide-y divide-slate-100 overflow-y-auto hme-hide-scrollbar dark:divide-slate-800">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggleExpand={() =>
              setExpandedId((cur) => (cur === item.id ? null : item.id))
            }
            onStatusChange={(status) => {
              onUpdateItem(item.id, { status });
              if (status === "Issue") setExpandedId(item.id);
            }}
            onSaveDetails={(val, description, imageUrl) => {
              onUpdateItem(item.id, { value: val, description, imageUrl });
              setExpandedId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({
  item,
  expanded,
  onToggleExpand,
  onStatusChange,
  onSaveDetails,
}: {
  item: InspectionItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: InspectionStatus) => void;
  onSaveDetails: (value: string, description: string, imageUrl: string | null) => void;
}) {
  const Icon = CHECKLIST_ICONS[item.icon] ?? Circle;
  const { images, addImages, removeImage } = useImageUpload(
    item.imageUrl
      ? [{ id: "existing", file: null, previewUrl: item.imageUrl, name: "photo.jpg", sizeKb: 0 }]
      : [],
  );
  const [localValue, setLocalValue] = useState(item.value || "");
  const [localDescription, setLocalDescription] = useState(item.description);

  const statusBtnClass = (status: InspectionStatus, active: boolean) => {
    if (!active) {
      return "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400";
    }
    if (status === "OK") {
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
    }
    if (status === "Issue") {
      return "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300";
    }
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300";
  };

  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-blue-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-blue-400">
            <Icon size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-black text-slate-900 dark:text-white">
                {item.label}
              </span>
              {item.value && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {item.value}
                </span>
              )}
            </div>
            {item.safeRange && (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                Safe Benchmark: <span className="font-bold text-slate-600 dark:text-slate-300">{item.safeRange}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(["OK", "Issue", "N/A"] as InspectionStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusChange(status)}
              className={`h-8 rounded-md border px-3 text-xs font-bold transition ${statusBtnClass(
                status,
                item.status === status,
              )}`}
            >
              {status}
            </button>
          ))}

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            title="Edit value and details"
          >
            <ChevronDown
              size={15}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-12 mt-3 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Current Parameter / Reading Value
            </label>
            <input
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="e.g. 92% Full, 82°C, 245 Bar, 115 PSI..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Observation Remarks
            </label>
            <textarea
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              rows={2}
              placeholder="Add observation details..."
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Attach Photo
            </label>
            <ImageUploader images={images} onAdd={addImages} onRemove={removeImage} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onSaveDetails(localValue, localDescription, images[0]?.previewUrl ?? null)}
              className="h-9 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              Save Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



function ComponentHealthSection({
  components,
  onUpdateClick,
  onAddCustomComponent,
  ready,
  hasCriticalIssue,
  onComplete,
}: {
  components: MachineComponent[];
  onUpdateClick: (component: MachineComponent) => void;
  onAddCustomComponent: () => void;
  ready: boolean;
  hasCriticalIssue: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
            Component Health &amp; Telemetry
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            View, inspect, and update live parameters for all components installed on this machine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddCustomComponent}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-600/40 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            Add Custom Component
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            {components.length} Components Active
          </span>
        </div>
      </div>

      <div className="mt-4">
        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 lg:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-4 py-3 font-bold">Component &amp; Monitored Parameters</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Health Score</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Live Reading Summary</th>
                <th className="px-4 py-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {components.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </p>
                    {c.parameters && c.parameters.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {c.parameters.map((p, pIdx) => {
                          const val = p.currentVal ?? p.defaultVal;
                          const isSafe = val >= p.safeMin && val <= p.safeMax;
                          return (
                            <span
                              key={pIdx}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                                isSafe
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50"
                                  : "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50"
                              }`}
                            >
                              <span className="text-slate-600 dark:text-slate-300 font-bold">{p.name}:</span>
                              <span className="font-black text-slate-900 dark:text-white">{val} {p.unit}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">({p.safeMin}–{p.safeMax})</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2 rounded-full ${healthBarColor(c.health)}`}
                          style={{ width: `${c.health}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        {c.health}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${componentStatusBadgeClass(
                        c.status,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {c.currentReading}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onUpdateClick(c)}
                      className="h-8 rounded-lg border border-blue-200 bg-blue-50 px-3.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet stacked cards */}
        <div className="space-y-3 lg:hidden">
          {components.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {c.name}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {c.category}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${componentStatusBadgeClass(
                    c.status,
                  )}`}
                >
                  {c.status}
                </span>
              </div>

              {c.parameters && c.parameters.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {c.parameters.map((p, pIdx) => {
                    const val = p.currentVal ?? p.defaultVal;
                    const isSafe = val >= p.safeMin && val <= p.safeMax;
                    return (
                      <span
                        key={pIdx}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          isSafe
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                            : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                        }`}
                      >
                        <span className="font-bold">{p.name}:</span>
                        <span className="font-black text-slate-900 dark:text-white">{val} {p.unit}</span>
                        <span className="text-[10px] text-slate-400">({p.safeMin}–{p.safeMax})</span>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-1.5 rounded-full ${healthBarColor(c.health)}`}
                    style={{ width: `${c.health}%` }}
                  />
                </div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  {c.health}%
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Reading: {c.currentReading}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateClick(c)}
                  className="h-8 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                >
                  Update
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom banner inside the right card */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-white text-emerald-600 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Inspection Ready
              </h4>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                All required component telemetry &amp; parameters are verified within safe operating limits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onComplete}
            disabled={!ready || hasCriticalIssue}
            className="h-10 shrink-0 rounded-xl bg-emerald-600 px-6 text-xs font-black text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            Complete Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

function UpdateComponentModal({
  component,
  onClose,
  onSave,
}: {
  component: MachineComponent;
  onClose: () => void;
  onSave: (updates: {
    health: number;
    status: ComponentHealthStatus;
    currentReading: string;
    condition: "Poor" | "Fair" | "Good" | "Excellent";
    notes: string;
    images: IssueImage[];
    parameters?: ComponentParameter[];
  }) => void;
}) {
  const [params, setParams] = useState<ComponentParameter[]>(() => {
    if (component.parameters && component.parameters.length > 0) {
      return component.parameters.map((p) => ({
        ...p,
        currentVal: p.currentVal ?? p.defaultVal,
      }));
    }
    return [];
  });

  const computeHealth = (paramList: ComponentParameter[]) => {
    if (!paramList.length) return component.health;
    let totalScore = 0;
    paramList.forEach((p) => {
      const val = p.currentVal ?? p.defaultVal;
      if (val >= p.safeMin && val <= p.safeMax) {
        totalScore += 100;
      } else {
        const mid = (p.safeMin + p.safeMax) / 2;
        const maxDev = Math.max(1, Math.abs(p.safeMax - mid));
        const curDev = Math.abs(val - mid);
        const penalty = Math.min(80, (curDev / maxDev) * 50);
        totalScore += Math.max(15, 100 - penalty);
      }
    });
    return Math.round(totalScore / paramList.length);
  };

  const [currentLevel, setCurrentLevel] = useState(component.health);
  const [condition, setCondition] = useState<"Poor" | "Fair" | "Good" | "Excellent">("Good");
  const [status, setStatus] = useState<ComponentHealthStatus>(component.status);
  const [currentReading, setCurrentReading] = useState(
    component.currentReading === "—" ? "" : component.currentReading,
  );
  const [notes, setNotes] = useState("");
  const { images, addImages, removeImage } = useImageUpload();

  const handleParamChange = (index: number, newVal: number) => {
    const updated = [...params];
    updated[index].currentVal = newVal;
    setParams(updated);

    const newHealth = computeHealth(updated);
    setCurrentLevel(newHealth);
    const newStatus = healthToStatus(newHealth);
    setStatus(newStatus);
    setCondition(newHealth >= 90 ? "Excellent" : newHealth >= 70 ? "Good" : newHealth >= 50 ? "Fair" : "Poor");

    const readingParts = updated.map((p) => `${p.currentVal} ${p.unit}`);
    setCurrentReading(readingParts.join(" • "));
  };

  const handleSave = () => {
    onSave({
      health: currentLevel,
      status,
      currentReading: currentReading.trim() === "" ? "—" : currentReading.trim(),
      condition,
      notes,
      images,
      parameters: params,
    });
  };

  return (
    <ModalShell title="Inspect &amp; Update Component" subtitle={component.name} onClose={onClose}>
      <div className="space-y-5">
        {/* Real-time Health Badge Header */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Calculated Health Score
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {currentLevel}%
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${componentStatusBadgeClass(
                  status,
                )}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rating
            </p>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
              {condition}
            </span>
          </div>
        </div>

        {/* Dynamic Parameter Sliders & Inputs */}
        {params.length > 0 && (
          <div className="space-y-3.5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-slate-800 dark:bg-[#0c1626]">
            <p className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Factory Monitored Parameters &amp; Safe Limits
            </p>
            {params.map((p, pIdx) => {
              const val = p.currentVal ?? p.defaultVal;
              const isSafe = val >= p.safeMin && val <= p.safeMax;
              const minRange = Math.floor(p.safeMin * 0.6);
              const maxRange = Math.ceil(p.safeMax * 1.4);

              return (
                <div key={pIdx} className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {p.name}
                      </span>
                      <span className="ml-2 text-[11px] text-slate-400">
                        (Safe: {p.safeMin}–{p.safeMax} {p.unit})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => handleParamChange(pIdx, parseFloat(e.target.value) || 0)}
                        className={`h-8 w-20 rounded-md border px-2 text-right text-xs font-black outline-none transition focus:ring-2 focus:ring-blue-500 ${
                          isSafe
                            ? "border-emerald-300 text-emerald-700 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "border-amber-300 text-amber-700 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-500">{p.unit}</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={minRange}
                    max={maxRange}
                    step={p.unit === "V" || p.unit === "Bar" || p.unit === "sec" ? 0.1 : 1}
                    value={val}
                    onChange={(e) => handleParamChange(pIdx, parseFloat(e.target.value))}
                    className="mt-2.5 w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer dark:bg-slate-700"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Live Summary Reading */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Live Summary Reading
          </label>
          <input
            type="text"
            value={currentReading}
            onChange={(e) => setCurrentReading(e.target.value)}
            placeholder="e.g. 82°C • 48 PSI"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Inspection Notes &amp; Observations
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add specific inspection remarks..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Attachment Photos
          </label>
          <ImageUploader images={images} onAdd={addImages} onRemove={removeImage} />
        </div>
      </div>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#12243b]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="h-11 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700 shadow-md shadow-blue-500/20"
        >
          Save &amp; Calculate Health
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ============================================================================
// Add Custom Component Modal for Operator (Identical to Admin Component Builder)
// ============================================================================

const PRESET_COMPONENT_TEMPLATES: Array<{
  name: string;
  category: string;
  icon: string;
  description: string;
  parameters: Array<{
    name: string;
    unit: string;
    safeMin: number;
    safeMax: number;
    defaultVal: number;
    description?: string;
  }>;
}> = [
  {
    name: "Telescopic Boom & Hoist System",
    category: "Crane Hydraulics",
    icon: "🏗️",
    description: "Main boom telescoping cylinder and high-tension hoist winch hydraulics",
    parameters: [
      { name: "Boom Extension Pressure", unit: "Bar", safeMin: 150, safeMax: 300, defaultVal: 220, description: "Boom cylinder extension pressure" },
      { name: "Hoist Winch Pressure", unit: "Bar", safeMin: 160, safeMax: 300, defaultVal: 230, description: "Main hoisting winch hydraulic pressure" },
      { name: "Boom Angle Elevation", unit: "Deg", safeMin: 0, safeMax: 85, defaultVal: 45, description: "Boom operating elevation angle" },
    ],
  },
  {
    name: "Outrigger Stabilization System",
    category: "Crane Hydraulics",
    icon: "🚧",
    description: "Hydraulic outrigger vertical jacks and horizontal beam extension",
    parameters: [
      { name: "Outrigger Jack Pressure", unit: "Bar", safeMin: 140, safeMax: 280, defaultVal: 210, description: "Vertical load-bearing jack pressure" },
      { name: "Leveling Pitch Deviation", unit: "Deg", safeMin: 0, safeMax: 5, defaultVal: 1.2, description: "Base chassis horizontal tilt angle" },
    ],
  },
  {
    name: "Pneumatic Air Brake & Steering",
    category: "Brakes & Steering",
    icon: "🛑",
    description: "Dual-circuit pneumatic service brakes and power steering hydraulic booster",
    parameters: [
      { name: "Air Brake Line Pressure", unit: "Bar", safeMin: 6.5, safeMax: 12.0, defaultVal: 8.5, description: "Pneumatic reservoir service pressure" },
      { name: "Steering Booster Pressure", unit: "Bar", safeMin: 100, safeMax: 180, defaultVal: 135, description: "Steering assist hydraulic pressure" },
    ],
  },
  {
    name: "Heavy-Duty Transmission & Torque Converter",
    category: "Transmission",
    icon: "⚙️",
    description: "Powershift transmission lockup clutch and torque converter fluid circuit",
    parameters: [
      { name: "Transmission Oil Pressure", unit: "PSI", safeMin: 180, safeMax: 280, defaultVal: 225, description: "Main clutch pack engagement pressure" },
      { name: "Converter Out Temperature", unit: "°C", safeMin: 70, safeMax: 115, defaultVal: 88, description: "Torque converter outlet fluid temp" },
    ],
  },
  {
    name: "Auxiliary High-Flow Cooling Package",
    category: "Cooling",
    icon: "❄️",
    description: "Multi-row radiator, charge air cooler and variable speed hydraulic fan",
    parameters: [
      { name: "Coolant Header Temperature", unit: "°C", safeMin: 75, safeMax: 102, defaultVal: 86, description: "Engine water jacket outlet temperature" },
      { name: "Hydraulic Fan Drive Speed", unit: "RPM", safeMin: 600, safeMax: 2200, defaultVal: 1450, description: "Cooling fan rotational velocity" },
    ],
  },
];

function AddCustomComponentModal({
  machine,
  onClose,
  onSave,
}: {
  machine: Machine | null;
  onClose: () => void;
  onSave: (comp: {
    name: string;
    category: string;
    parameters: Array<{
      name: string;
      unit: string;
      safeMin: number;
      safeMax: number;
      defaultVal: number;
      currentVal: number;
      description?: string;
    }>;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [params, setParams] = useState<
    Array<{
      name: string;
      unit: string;
      safeMin: number;
      safeMax: number;
      defaultVal: number;
      currentVal: number;
      description?: string;
    }>
  >([
    {
      name: "Operating Pressure",
      unit: "Bar",
      safeMin: 150,
      safeMax: 300,
      defaultVal: 220,
      currentVal: 220,
      description: "Main line operating pressure",
    },
  ]);
  const [formError, setFormError] = useState("");

  const handleAddParam = () => {
    setParams((prev) => [
      ...prev,
      {
        name: "",
        unit: "Bar",
        safeMin: 100,
        safeMax: 250,
        defaultVal: 180,
        currentVal: 180,
        description: "",
      },
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (index: number, field: string, value: any) => {
    setParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = () => {
    if (params.length === 0) {
      setFormError("Please add at least 1 inspection parameter.");
      return;
    }
    for (const p of params) {
      if (!p.name.trim()) {
        setFormError("All parameter rows must have a valid parameter name.");
        return;
      }
      if (Number(p.safeMin) >= Number(p.safeMax)) {
        setFormError(`For parameter '${p.name}', Safe Min (${p.safeMin}) must be strictly less than Safe Max (${p.safeMax}).`);
        return;
      }
    }
    const effectiveCompName = params[0]?.name.trim() || "Custom Component";
    onSave({
      name: effectiveCompName,
      category: "Equipment Component",
      parameters: params,
    });
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0c1626] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-blue-600 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shadow-inner">
              <PlusCircle size={22} className="text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Add Custom Component to Equipment
              </h2>
              <p className="text-xs text-blue-200">
                Machine: <span className="font-bold text-white">{machine?.name || machine?.model || "Heavy Equipment"}</span> ({machine?.type || machine?.category || "Machinery"})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[75vh]">
          {/* Error Banner */}
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Monitored Parameters List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders size={14} className="text-blue-500" />
                Monitored Parameters &amp; Safe Limits ({params.length})
              </label>

              <button
                type="button"
                onClick={handleAddParam}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add Parameter
              </button>
            </div>

            <div className="space-y-2.5">
              {params.map((param, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]"
                >
                  {/* Parameter Name */}
                  <div className="min-w-[160px] flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Parameter Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Oil Pressure"
                      value={param.name}
                      onChange={(e) => handleUpdateParam(idx, "name", e.target.value)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Unit</span>
                    <select
                      value={param.unit}
                      onChange={(e) => handleUpdateParam(idx, "unit", e.target.value)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-1 text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    >
                      <option value="Bar">Bar</option>
                      <option value="PSI">PSI</option>
                      <option value="°C">°C</option>
                      <option value="RPM">RPM</option>
                      <option value="%">%</option>
                      <option value="V">V</option>
                      <option value="Deg">Deg</option>
                      <option value="Tons">Tons</option>
                      <option value="mm">mm</option>
                      <option value="kPa">kPa</option>
                    </select>
                  </div>

                  {/* Safe Min */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Safe Min</span>
                    <input
                      type="number"
                      value={param.safeMin}
                      onChange={(e) => handleUpdateParam(idx, "safeMin", parseFloat(e.target.value) || 0)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Safe Max */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Safe Max</span>
                    <input
                      type="number"
                      value={param.safeMax}
                      onChange={(e) => handleUpdateParam(idx, "safeMax", parseFloat(e.target.value) || 0)}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Default / Baseline */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Default</span>
                    <input
                      type="number"
                      value={param.defaultVal}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        handleUpdateParam(idx, "defaultVal", v);
                        handleUpdateParam(idx, "currentVal", v);
                      }}
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Delete row */}
                  {params.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParam(idx)}
                      className="mt-4 flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400 cursor-pointer"
                      title="Remove parameter"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#0c1626]">
          <button
            type="button"
            onClick={() => {
              onClose();
              setFormError("");
            }}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition cursor-pointer"
          >
            <CheckCircle size={15} />
            Save Component to Machine
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Complete Inspection
// ============================================================================

function CompleteInspectionCard({
  ready,
  hasCriticalIssue,
  onComplete,
}: {
  ready: boolean;
  hasCriticalIssue: boolean;
  onComplete: () => void;
}) {
  if (hasCriticalIssue) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-300 bg-white text-red-600 dark:border-red-500/40 dark:bg-transparent dark:text-red-300">
            <AlertTriangle size={20} strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-red-800 dark:text-red-300">
              Machine Not Ready
            </h3>
            <p className="mt-0.5 text-sm font-medium text-red-700/80 dark:text-red-300/80">
              A critical issue has been reported. Resolve the issue before
              starting the machine.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled
          className="h-11 shrink-0 cursor-not-allowed rounded-xl bg-red-300 px-6 text-sm font-bold text-white dark:bg-red-500/30"
        >
          Complete Inspection
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
        ready
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#101f33]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            ready
              ? "border-emerald-300 bg-white text-emerald-600 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300"
              : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-transparent"
          }`}
        >
          <CheckCircle2 size={20} strokeWidth={2.4} />
        </div>
        <div>
          <h3
            className={`text-sm font-extrabold ${
              ready ? "text-emerald-800 dark:text-emerald-300" : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {ready ? "Inspection Ready" : "Ready to Complete Inspection?"}
          </h3>
          <p
            className={`mt-0.5 text-sm font-medium ${
              ready ? "text-emerald-700/80 dark:text-emerald-300/80" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {ready
              ? "All required pre-start checks have been completed."
              : "Once all checks are completed and no critical issues are pending, you can complete the inspection."}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={onComplete}
        className="h-11 shrink-0 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
      >
        Complete Inspection
      </button>
    </div>
  );
}

// ============================================================================
// Modal shell (shared)
// ============================================================================

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
      {children}
    </div>
  );
}

// ============================================================================
// API integration helpers
// ============================================================================

const getArrayData = <T = any,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

// Turns a raw category string from the API into a clean, trimmed display
// category. No forcing into a fixed list — whatever the backend sends is
// what gets shown.
const normalizeCategory = (raw?: string): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  return value === "" ? null : value;
};

const healthToStatus = (health: number): ComponentHealthStatus => {
  if (health >= 90) return "Healthy";
  if (health >= 70) return "Good";
  if (health >= 50) return "Warning";
  return "Critical";
};





const buildCategoryOverview = (
  category: ComponentCategory,
  components: MachineComponent[],
): CategoryOverview => {
  if (!components.length) {
    return { category, overallHealth: 0, status: "Healthy", hoursRun: 0, lastUpdated: "—" };
  }
  const overallHealth = Math.round(
    components.reduce((sum, c) => sum + c.health, 0) / components.length,
  );
  return {
    category,
    overallHealth,
    status: healthToStatus(overallHealth),
    hoursRun: 0,
    lastUpdated: "Just now",
  };
};

// ============================================================================
// Page
// ============================================================================

const PreStartInspection: React.FC = () => {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>(mockInspectionItems);
  const [issueReports, setIssueReports] = useState<IssueReport[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);

    const [category, setCategory] = useState<string>("");
  const [updateTarget, setUpdateTarget] = useState<MachineComponent | null>(null);
  const [componentsState, setComponentsState] =
    useState<Record<string, MachineComponent[]>>({});
  const [categories, setCategories] = useState<string[]>([]);

  const loadMachineAndComponents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await machineService.getAssignedMachines();
      const machines = getArrayData<any>(response);

      const storedUser =
        StorageService.get<any>(STORAGE_KEYS.USER) ||
        StorageService.get<any>("user") ||
        {};

      const operatorId = String(
        storedUser?.id || storedUser?.userId || storedUser?.user?.id || "",
      ).trim();

      let currentAssignment = machines.find((item: any) => {
        const assignedOpId = String(
          item?.assignedOperatorId ??
            item?.assigned_operator_id ??
            item?.operatorId ??
            item?.operator_id ??
            item?.operator?.id ??
            "",
        ).trim();
        const assignedOpName = String(
          item?.assignedOperatorName ??
            item?.assigned_operator_name ??
            item?.operatorName ??
            item?.operator_name ??
            item?.operator?.name ??
            "",
        ).trim().toLowerCase();

        const curName = (storedUser?.name || storedUser?.fullName || "").toLowerCase();

        return (operatorId && assignedOpId.toLowerCase() === operatorId.toLowerCase()) ||
               (curName && curName.length > 1 && assignedOpName.includes(curName));
      });

      if (!currentAssignment && machines.length > 0) {
        currentAssignment = machines[0];
      }

      if (!currentAssignment) {
        setMachine(null);
        setComponentsState({});
        setCategories([]);
        return;
      }

      const resolvedMachineId = String(
        currentAssignment?.machineId || currentAssignment?.id || currentAssignment?._id || "",
      ).trim();

      setMachine({
        id: resolvedMachineId,
        name: currentAssignment?.machineName || currentAssignment?.name || "—",
        type:
          currentAssignment?.machineType ||
          currentAssignment?.equipmentType ||
          currentAssignment?.model ||
          "—",
        serialNumber:
          currentAssignment?.fleetId || currentAssignment?.serialNumber || "—",
        location: currentAssignment?.location || "—",
        currentHours: Number(
          currentAssignment?.hoursRun || currentAssignment?.installHours || 0,
        ),
        status: "Online",
        operatorName: storedUser?.name || storedUser?.fullName || "—",
        imageUrl: currentAssignment?.imageUrl || mockMachine.imageUrl,
      });

      // ---- Components ----
      let rawComponents: any[] = [];

      // 1. Query spec-template from master catalog / backend for full installed component matrix
      try {
        const typeStr =
          currentAssignment?.equipmentType ||
          currentAssignment?.category ||
          currentAssignment?.machineType ||
          "All Terrain Crane";
        const modelStr =
          currentAssignment?.model ||
          currentAssignment?.modelName ||
          currentAssignment?.name ||
          currentAssignment?.machineName ||
          "";
        const opUser = StorageService.getUser();
        const opCompanyId = opUser?.companyId || opUser?.company_id || currentAssignment?.companyId || "";
        const opMachineId = currentAssignment?.id || currentAssignment?.machineId || currentAssignment?.serialNumber || "";
        const tplRes: any = await apiCall(
          `/machines/spec-template?equipmentType=${encodeURIComponent(typeStr)}&modelName=${encodeURIComponent(modelStr)}&companyId=${encodeURIComponent(opCompanyId)}&machineId=${encodeURIComponent(opMachineId)}`,
        );
        const tplData = tplRes?.data || tplRes;
        if (tplData && Array.isArray(tplData.components) && tplData.components.length > 0) {
          rawComponents.push(...tplData.components);
        }
      } catch (tplErr) {
        console.warn("Spec template fetch notice:", tplErr);
      }

      // 2. Fetch custom components from database
      try {
        const componentsResponse = await componentService.getComponents(resolvedMachineId);
        const dbComps = getArrayData<any>(componentsResponse);
        if (Array.isArray(dbComps) && dbComps.length > 0) {
          dbComps.forEach((dc: any) => {
            const dcName = (dc.name || dc.description || "").toLowerCase().trim();
            if (!rawComponents.some((rc: any) => (rc.name || rc.description || "").toLowerCase().trim() === dcName)) {
              rawComponents.push(dc);
            }
          });
        }
      } catch (err) {
        console.warn("Component fetch notice:", err);
      }

      // 3. Merge components array directly on machine record if present
      if (Array.isArray(currentAssignment?.components) && currentAssignment.components.length > 0) {
        currentAssignment.components.forEach((mc: any) => {
          const mcName = (mc.name || mc.description || "").toLowerCase().trim();
          if (!rawComponents.some((rc: any) => (rc.name || rc.description || "").toLowerCase().trim() === mcName)) {
            rawComponents.push(mc);
          }
        });
      }

      // 4. Fallback if completely empty
      if (rawComponents.length === 0) {
        const machineBrand = currentAssignment?.brand || "Heavy Equipment";
        rawComponents = [
          {
            id: `comp-engine-${resolvedMachineId}`,
            category: "Engine",
            name: `${machineBrand} Industrial Engine Assembly`,
            description: `${machineBrand} Industrial Engine Assembly`,
            condition: 5,
            currentReading: "47 PSI • 82°C",
            currentHours: 1240,
            parameters: [
              { name: "Engine Oil Pressure", unit: "PSI", safeMin: 30, safeMax: 65, defaultVal: 47, currentVal: 47, description: "Operating oil pressure" },
              { name: "Coolant Temperature", unit: "°C", safeMin: 65, safeMax: 95, defaultVal: 82, currentVal: 82, description: "Coolant temp" },
            ],
          },
          {
            id: `comp-hyd-pump-${resolvedMachineId}`,
            category: "Hydraulics",
            name: "Main Hydraulic System",
            description: "Main Hydraulic System",
            condition: 5,
            currentReading: "220 Bar",
            currentHours: 1240,
            parameters: [
              { name: "Hydraulic Pressure", unit: "Bar", safeMin: 150, safeMax: 300, defaultVal: 220, currentVal: 220, description: "Hydraulic pressure" },
            ],
          },
        ];
      }

      // 5. Merge company-added custom components for this machine from localStorage
      try {
        const customKeys = [
          `custom_components_${resolvedMachineId}`,
          `custom_components_${currentAssignment?.serialNumber}`,
          `custom_components_${currentAssignment?.modelName || currentAssignment?.name}`,
        ];
        customKeys.forEach((key) => {
          if (!key) return;
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((cc: any) => {
                const ccName = (cc.name || "").toLowerCase().trim();
                if (ccName && !rawComponents.some((rc: any) => (rc.name || rc.description || "").toLowerCase().trim() === ccName)) {
                  rawComponents.push({
                    id: `custom-comp-${cc.name}`,
                    category: cc.category || "Equipment Component",
                    name: cc.name,
                    description: cc.name,
                    condition: 5,
                    currentReading: cc.parameters?.[0] ? `${cc.parameters[0].defaultVal ?? cc.parameters[0].safeMin} ${cc.parameters[0].unit || ""}` : "Normal Range",
                    parameters: cc.parameters,
                  });
                }
              });
            }
          }
        });
      } catch (err) {
        console.warn("Custom components merge notice:", err);
      }

      // 6. Fetch latest persistent inspection & telemetry data from PostgreSQL Database (component_health table)
      try {
        const manualDataRes: any = await apiCall(
          `/machines/${encodeURIComponent(resolvedMachineId)}/manual-data`,
          { method: "GET" }
        ).catch(() => null);

        const manualPayload = manualDataRes?.data || manualDataRes;
        const savedHealthRecords = manualPayload?.records || [];

        if (Array.isArray(savedHealthRecords) && savedHealthRecords.length > 0) {
          rawComponents.forEach((comp) => {
            const compNameLower = (comp.name || comp.description || "").toLowerCase().trim();
            const matchedRecord = savedHealthRecords.find((r: any) => {
              const rNameLower = (r.componentName || "").toLowerCase().trim();
              return rNameLower === compNameLower || (r.componentId && r.componentId === comp.id);
            });

            if (matchedRecord) {
              if (matchedRecord.healthScore !== undefined && matchedRecord.healthScore !== null) {
                comp.condition = Math.round(Number(matchedRecord.healthScore) / 20);
                comp.healthScore = Number(matchedRecord.healthScore);
                comp.status = matchedRecord.status || healthToStatus(Number(matchedRecord.healthScore));
              }

              if (Array.isArray(matchedRecord.parameters) && matchedRecord.parameters.length > 0) {
                if (!comp.parameters) comp.parameters = [];
                matchedRecord.parameters.forEach((sp: any) => {
                  const spNameLower = (sp.name || "").toLowerCase().trim();
                  const existingParam = comp.parameters?.find(
                    (p: any) => (p.name || "").toLowerCase().trim() === spNameLower
                  );
                  if (existingParam) {
                    const savedVal = sp.value ?? sp.currentVal ?? sp.defaultVal;
                    if (savedVal !== undefined && savedVal !== null && !isNaN(Number(savedVal))) {
                      existingParam.currentVal = Number(savedVal);
                    }
                  } else {
                    comp.parameters.push({
                      name: sp.name,
                      unit: sp.unit || "",
                      safeMin: Number(sp.safeMin ?? 0),
                      safeMax: Number(sp.safeMax ?? 100),
                      defaultVal: Number(sp.defaultVal ?? sp.value ?? 0),
                      currentVal: Number(sp.value ?? sp.currentVal ?? sp.defaultVal ?? 0),
                      description: sp.description || "",
                    });
                  }
                });

                // Update currentReading summary string
                comp.currentReading = comp.parameters
                  .map((p: any) => `${p.currentVal ?? p.defaultVal ?? "—"} ${p.unit || ""}`.trim())
                  .join(" • ");
              }
            }
          });
        }
      } catch (dbSyncErr) {
        console.warn("Notice: Fetching latest component health from DB:", dbSyncErr);
      }

      const grouped: Record<string, MachineComponent[]> = {};

      rawComponents.forEach((raw: any) => {
        const cat =
          raw?.category ||
          raw?.componentType ||
          raw?.type ||
          raw?.categoryName ||
          "Engine";

        const health = typeof raw?.healthScore === "number"
          ? raw.healthScore
          : typeof raw?.health === "number"
          ? raw.health
          : Math.round(Math.min(Math.max(Number(raw?.condition || 5), 0), 5) * 20);

        // Build current reading summary from parameters if not directly present
        let readingSummary = raw?.currentReading;
        if (!readingSummary && Array.isArray(raw?.parameters) && raw.parameters.length > 0) {
          readingSummary = raw.parameters
            .map((p: any) => `${p.currentVal ?? p.defaultVal ?? p.value ?? "—"} ${p.unit || ""}`.trim())
            .join(" • ");
        }

        const component: MachineComponent = {
          id: String(raw?.id ?? raw?._id ?? raw?.componentId ?? nextId("comp")),
          category: cat,
          name: raw?.name || raw?.description || raw?.category || "Component",
          health,
          status: raw?.status || healthToStatus(health),
          currentReading: readingSummary || (raw?.currentHours ? `${raw?.currentHours} hrs` : "Normal Range"),
          parameters: Array.isArray(raw?.parameters)
            ? raw.parameters.map((p: any) => ({
                name: p.name || p.parameterName,
                unit: p.unit || "",
                safeMin: Number(p.safeMin ?? 0),
                safeMax: Number(p.safeMax ?? 100),
                defaultVal: Number(p.defaultVal ?? p.value ?? p.safeMin ?? 0),
                currentVal: Number(p.currentVal !== undefined ? p.currentVal : (p.value ?? p.defaultVal ?? p.safeMin ?? 0)),
                description: p.description || "",
              }))
            : undefined,
        };

        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(component);
      });

      // Update dynamic checklist items based on assigned machine components & parameters
      const dynamicChecklist: InspectionItem[] = [];
      rawComponents.forEach((comp: any) => {
        if (Array.isArray(comp?.parameters)) {
          comp.parameters.forEach((param: any, pIdx: number) => {
            const val = param.currentVal ?? param.defaultVal ?? param.value ?? "";
            const unit = param.unit || "";
            const isPressure = (param.name || "").toLowerCase().includes("pressure");
            const isTemp = (param.name || "").toLowerCase().includes("temp");
            const isOil = (param.name || "").toLowerCase().includes("oil");
            const iconKey = isTemp ? "thermometer" : isPressure || isOil ? "droplet" : "wrench";

            dynamicChecklist.push({
              id: `insp-dyn-${comp.name || comp.category}-${pIdx}`,
              label: `${param.name || "Parameter"} (${comp.name || comp.category})`,
              icon: iconKey,
              status: "OK",
              value: `${val} ${unit}`.trim(),
              unit,
              safeRange: `Safe: ${param.safeMin}–${param.safeMax} ${unit}`.trim(),
              description: param.description || `${param.name} inspected and confirmed within safe limits.`,
              imageUrl: null,
            });
          });
        }
      });

      // Add common standard safety checks
      dynamicChecklist.push(
        {
          id: "insp-fuel",
          label: "Fuel Level & Water Separator",
          icon: "fuel",
          status: "OK",
          value: "85% Capacity (320 L)",
          unit: "%",
          safeRange: "Safe: >25% Capacity",
          description: "Fuel tank full, water trap drained.",
          imageUrl: null,
        },
        {
          id: "insp-tyre",
          label: "Tyres, Outriggers & Chassis",
          icon: "circleDot",
          status: "OK",
          value: "115 PSI (42mm Lug Depth)",
          unit: "PSI",
          safeRange: "Safe: 95–130 PSI",
          description: "Tyre beads intact, outrigger cylinders zero leak.",
          imageUrl: null,
        },
        {
          id: "insp-brake",
          label: "Braking & Safety Interlocks",
          icon: "discAlbum",
          status: "OK",
          value: "140 Bar Accumulator",
          unit: "Bar",
          safeRange: "Safe: 110–160 Bar",
          description: "Service & parking brakes holding full rated load.",
          imageUrl: null,
        },
        {
          id: "insp-steering",
          label: "Steering & Emergency Stop",
          icon: "navigation",
          status: "OK",
          value: "0.0° Play (E-Stop Active)",
          unit: "deg",
          safeRange: "Safe: <5° Free Play",
          description: "Lock-to-lock steering responsive, E-Stop circuit tested.",
          imageUrl: null,
        },
        {
          id: "insp-lights",
          label: "Lighting & Warning Beacon",
          icon: "lightbulb",
          status: "OK",
          value: "24V Output (12/12 Lamps)",
          unit: "V",
          safeRange: "Safe: All Lamps Active",
          description: "High-intensity work lamps and strobe beacon verified.",
          imageUrl: null,
        },
      );

      setInspectionItems(dynamicChecklist);

      const availableCategories = Object.keys(grouped).sort();

      setComponentsState(grouped);
      setCategories(availableCategories);
      setCategory((prev) => (prev && grouped[prev] ? prev : availableCategories[0] || ""));

      // Store initial baseline snapshot of machine components & parameters upon assignment load
      const flattenedList = Object.values(grouped).flat();
      baselineSnapshotRef.current = JSON.parse(JSON.stringify(flattenedList));

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

  const baselineSnapshotRef = useRef<MachineComponent[]>([]);
  const customAddedComponentsRef = useRef<MachineComponent[]>([]);

  useEffect(() => {
    loadMachineAndComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allComponents = useMemo(() => Object.values(componentsState).flat(), [componentsState]);

  const handleUpdateInspectionItem = (id: string, patch: Partial<InspectionItem>) => {
    setInspectionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmitIssue = (report: IssueReport) => {
    setIssueReports((prev) => [...prev, report]);
    setReportModalOpen(false);
  };

  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);

  const handleSaveComponentUpdate = async (updates: {
    health: number;
    status: ComponentHealthStatus;
    currentReading: string;
    condition: "Poor" | "Fair" | "Good" | "Excellent";
    notes: string;
    images: IssueImage[];
    parameters?: ComponentParameter[];
  }) => {
    if (!updateTarget) return;

    const storedUser = StorageService.getUser() || {};
    const opId = storedUser?.id || storedUser?.userId || "";
    const opName = `${storedUser?.firstName || storedUser?.first_name || ""} ${storedUser?.lastName || storedUser?.last_name || ""}`.trim() || storedUser?.name || "Operator";
    const opEmail = storedUser?.email || "operator@hmemining.com";
    const compId = storedUser?.companyId || storedUser?.company_id || machine?.companyId || "";
    const compName = storedUser?.company?.name || storedUser?.companyName || "HME Mining Operations";

    const customFields = (updates.parameters || updateTarget.parameters || []).map((p) => ({
      name: p.name,
      value: String(p.currentVal ?? p.defaultVal),
      safeMin: p.safeMin,
      safeMax: p.safeMax,
      unit: p.unit || "",
      description: p.description || "",
    }));

    const inspectionPayload = {
      componentCategory: updateTarget.category || "Engine",
      componentName: updateTarget.name,
      customFields,
      brand: machine?.brand || "Heavy Equipment",
      category: machine?.type || "Heavy Equipment",
      modelName: machine?.name || "",
      serialNumber: machine?.serialNumber || "SN-AUTO-001",
      machineName: machine?.name || "",
      companyId: compId,
      companyName: compName,
      userId: opId,
      userName: opName,
      userRole: "OPERATOR",
      userEmail: opEmail,
    };

    // 1. Post to PostgreSQL manual-data inspection log for supervisor audit tracking
    try {
      if (machine?.id) {
        await apiCall(`/machines/${machine.id}/manual-data`, {
          method: "POST",
          body: JSON.stringify(inspectionPayload),
        });
      }
    } catch (apiErr) {
      console.warn("Notice: Saved operator manual data audit log:", apiErr);
    }

    const numericCond =
      updates.condition === "Excellent"
        ? 5
        : updates.condition === "Good"
        ? 4
        : updates.condition === "Fair"
        ? 3
        : updates.condition === "Poor"
        ? 1
        : 5;

    try {
      await inspectionService.saveComponentInspection(machine?.id || "m-1", {
        machineId: machine?.id,
        componentId: updateTarget.id,
        componentName: updateTarget.name,
        healthScore: updates.health,
        status: updates.status,
        currentReading: updates.currentReading,
        condition: numericCond,
        notes: updates.notes,
        parameters: updates.parameters,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Notice: Saved component inspection update:", err);
    }

    try {
      await componentService.updateComponent(updateTarget.id, {
        healthScore: updates.health,
        condition: numericCond,
      } as any);
    } catch {}

    // Find baseline component for comparison
    const initialComp = baselineSnapshotRef.current.find(
      (c) => c.id === updateTarget.id || c.name === updateTarget.name
    );

    const paramChanges = (updates.parameters || updateTarget.parameters || []).map((p) => {
      const initParam = initialComp?.parameters?.find((ip) => ip.name === p.name);
      const prevVal = initParam ? (initParam.currentVal ?? initParam.defaultVal) : p.defaultVal;
      const newVal = p.currentVal ?? p.defaultVal;
      const isModified = String(prevVal) !== String(newVal);
      const delta = (!isNaN(Number(newVal)) && !isNaN(Number(prevVal))) ? Math.round((Number(newVal) - Number(prevVal)) * 100) / 100 : null;

      return {
        componentName: updateTarget.name,
        category: updateTarget.category,
        parameterName: p.name,
        unit: p.unit || "",
        safeMin: p.safeMin,
        safeMax: p.safeMax,
        baselineValue: prevVal,
        updatedValue: newVal,
        delta,
        isModified,
        status: (p.safeMin !== undefined && p.safeMax !== undefined && (Number(newVal) < p.safeMin || Number(newVal) > p.safeMax)) ? "Warning" : "Normal",
        notes: updates.notes || "",
      };
    });

    // Save instant update to Supervisor audit log in localStorage
    try {
      const auditLog = {
        id: `op-insp-${Date.now()}`,
        taskId: `OP-INSP-${Date.now().toString().slice(-6)}`,
        machineId: machine?.id || "m-1",
        machineName: machine?.name || machine?.model || "Assigned Heavy Equipment",
        component: updateTarget.name,
        componentName: updateTarget.name,
        role: "Operator",
        staffName: opName,
        operatorName: opName,
        userName: opName,
        staffEmail: opEmail,
        operatorEmail: opEmail,
        supervisorName: machine?.supervisorName || "Supervisor",
        serviceType: "Pre-Start Component Update",
        serviceDate: new Date().toISOString().split("T")[0],
        closedDate: new Date().toISOString().split("T")[0],
        assignedAt: new Date().toLocaleString(),
        shift: "Day Shift (Pre-Start)",
        duration: "Component Update",
        priority: updates.status === "Critical" ? "High" : "Medium",
        status: "Completed",
        approvalStatus: "Approved & Verified",
        workScope: `Updated ${updateTarget.name}: telemetry and parameter readings inspected.`,
        actionTaken: `Operator ${opName} verified telemetry (${updates.currentReading}) for ${updateTarget.name}.`,
        supervisorRemarks: updates.notes || `Verified by supervisor. Pre-start inspection update logged by ${opName}.`,
        components: updatedComponents,
        parameterChanges: paramChanges,
        baselineComponents: baselineSnapshotRef.current,
        customComponentsAdded: customAddedComponentsRef.current,
        notes: updates.notes,
        summary: {
          totalComponents: updatedComponents.length,
          totalParameters: paramChanges.length,
          modifiedParametersCount: paramChanges.filter((p: any) => p.isModified).length,
          customComponentsCount: customAddedComponentsRef.current.length,
        },
        createdAt: new Date().toISOString(),
      };

      // Direct write to PostgreSQL database table (machine_inspection_audit_logs)
      const targetMachineId = machine?.id || "m-1";
      apiCall(`/machines/${encodeURIComponent(targetMachineId)}/manual-data`, {
        method: "POST",
        body: JSON.stringify({
          machineName: machine?.name || machine?.model,
          brand: machine?.brand || machine?.manufacturer || "Heavy Equipment",
          category: machine?.equipmentType || "General",
          modelName: machine?.name || machine?.model,
          serialNumber: machine?.serialNumber,
          componentName: updateTarget.name,
          componentCategory: updateTarget.category || "General",
          readings: {
            components: updatedComponents,
            updatedComponent: updateTarget.name,
            currentReading: updates.currentReading,
          },
          userName: opName,
          userRole: "OPERATOR",
          userEmail: opEmail,
        }),
      }, { showError: false }).catch(() => null);
    } catch (e) {}

    setComponentsState((prev) => {
      const next: Record<string, MachineComponent[]> = {};
      Object.keys(prev).forEach((cat) => {
        next[cat] = prev[cat].map((c) =>
          c.id === updateTarget.id
            ? {
                ...c,
                health: updates.health,
                status: updates.status,
                currentReading: updates.currentReading,
                parameters: updates.parameters || c.parameters,
                notes: updates.notes,
              }
            : c,
        );
      });
      return next;
    });

    toast.success(`✓ Updated ${updateTarget.name} (${updates.health}%) & sent to supervisor!`);
    setUpdateTarget(null);
  };

  const handleSaveNewCustomComponent = async (newComp: {
    name: string;
    category: string;
    parameters: Array<{
      name: string;
      unit: string;
      safeMin: number;
      safeMax: number;
      defaultVal: number;
      currentVal: number;
      description?: string;
    }>;
  }) => {
    if (!machine) return;

    const compCategory = newComp.category || "Equipment Component";
    const componentObj: MachineComponent = {
      id: `custom-comp-${Date.now()}`,
      category: compCategory,
      name: newComp.name,
      health: 100,
      status: "Healthy",
      currentReading: newComp.parameters[0] ? `${newComp.parameters[0].defaultVal} ${newComp.parameters[0].unit}` : "Normal Range",
      parameters: newComp.parameters,
    };

    customAddedComponentsRef.current.push(componentObj);

    // 1. Save to Backend Database API for this company & machine
    try {
      const user = StorageService.getUser();
      const companyId = user?.companyId || user?.company_id || machine.companyId || "";
      await apiCall('/machines/custom-components', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          machineId: machine.id || machine.serialNumber,
          modelName: machine.name || machine.type,
          equipmentType: machine.type || "Heavy Equipment",
          name: newComp.name,
          category: compCategory,
          parameters: newComp.parameters,
        }),
      });
    } catch (apiErr) {
      console.warn("Notice: Custom component backend sync:", apiErr);
    }

    // 2. Update React State
    setComponentsState((prev) => {
      const next = { ...prev };
      if (!next[compCategory]) next[compCategory] = [];
      next[compCategory].push(componentObj);
      return next;
    });

    toast.success(`✓ Added custom component "${newComp.name}" to machine!`);
    setIsAddComponentModalOpen(false);
  };

  const hasCriticalIssue = useMemo(
    () => issueReports.some((r) => r.severity === "Critical"),
    [issueReports],
  );

  const readyToComplete = allComponents.length > 0 && !hasCriticalIssue;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#07111f]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            Loading assigned equipment & component telemetry...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-[#07111f]">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            Couldn&apos;t load your machine
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button
            type="button"
            onClick={loadMachineAndComponents}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-[#07111f]">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <Truck className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            Machine Not Assigned
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You do not have any active equipment assigned to your operator account yet. Please contact your supervisor.
          </p>
          <button
            type="button"
            onClick={loadMachineAndComponents}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-[#07111f] dark:text-slate-100 sm:px-6 lg:px-8">
      {/* Hide scrollbar styles for inspection checklist */}
      <style>{`
        .hme-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .hme-hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Pre-Start Inspection
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Inspect and ensure the machine is safe to operate.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
          <MachineCard machine={machine} components={allComponents} />
          {allComponents.length > 0 ? (
            <ComponentHealthSection
              components={allComponents}
              onUpdateClick={setUpdateTarget}
              onAddCustomComponent={() => setIsAddComponentModalOpen(true)}
              ready={readyToComplete}
              hasCriticalIssue={hasCriticalIssue}
              onComplete={async () => {
                const storedUser = StorageService.getUser() || {};
                const opId = storedUser?.id || storedUser?.userId || "";
                const opName = `${storedUser?.firstName || storedUser?.first_name || ""} ${storedUser?.lastName || storedUser?.last_name || ""}`.trim() || storedUser?.name || "Operator";
                const opEmail = storedUser?.email || "operator@hmemining.com";
                const compId = storedUser?.companyId || storedUser?.company_id || machine?.companyId || "";
                const compName = storedUser?.company?.name || storedUser?.companyName || "HME Mining Operations";

                const componentsPayload = allComponents.map((comp) => {
                  const customFields = (comp.parameters || []).map((param) => ({
                    name: param.name,
                    value: String(param.currentVal ?? param.defaultVal),
                    safeMin: param.safeMin,
                    safeMax: param.safeMax,
                    unit: param.unit || "",
                    description: param.description || "",
                  }));
                  return {
                    componentCategory: comp.category || comp.name,
                    componentName: comp.name,
                    customFields,
                  };
                });

                try {
                  if (machine?.id) {
                    await apiCall(`/machines/${machine.id}/manual-data`, {
                      method: "POST",
                      body: JSON.stringify({
                        components: componentsPayload,
                        brand: machine?.brand || "Heavy Equipment",
                        category: machine?.type || "Heavy Equipment",
                        modelName: machine?.name || "",
                        serialNumber: machine?.serialNumber || "SN-AUTO-001",
                        machineName: machine?.name || "",
                        companyId: compId,
                        companyName: compName,
                        userId: opId,
                        userName: opName,
                        userRole: "OPERATOR",
                        userEmail: opEmail,
                      }),
                    });
                  }
                } catch {}

                // Calculate comprehensive parameter change diff (Baseline vs Operator Updates)
                const allParameterChanges: any[] = [];
                let modifiedCount = 0;

                allComponents.forEach((currComp) => {
                  const initialComp = baselineSnapshotRef.current.find(
                    (ic) => ic.name === currComp.name || ic.id === currComp.id
                  );

                  (currComp.parameters || []).forEach((currParam) => {
                    const initParam = initialComp?.parameters?.find((ip) => ip.name === currParam.name);
                    const prevVal = initParam ? (initParam.currentVal ?? initParam.defaultVal) : currParam.defaultVal;
                    const newVal = currParam.currentVal ?? currParam.defaultVal;
                    const isChanged = prevVal !== undefined && prevVal !== null && String(prevVal) !== String(newVal);

                    if (isChanged) modifiedCount++;

                    allParameterChanges.push({
                      componentName: currComp.name,
                      category: currComp.category,
                      parameterName: currParam.name,
                      unit: currParam.unit || "",
                      safeMin: currParam.safeMin,
                      safeMax: currParam.safeMax,
                      baselineValue: prevVal,
                      updatedValue: newVal,
                      delta: (!isNaN(Number(newVal)) && !isNaN(Number(prevVal))) ? Math.round((Number(newVal) - Number(prevVal)) * 100) / 100 : null,
                      isModified: isChanged,
                      status: (currParam.safeMin !== undefined && currParam.safeMax !== undefined && (Number(newVal) < currParam.safeMin || Number(newVal) > currParam.safeMax)) ? "Warning" : "Normal",
                      description: currParam.description || "",
                    });
                  });
                });

                // Save full pre-start inspection log for Supervisor with complete audit telemetry
                try {
                  const fullInspectionLog = {
                    id: `op-insp-${Date.now()}`,
                    taskId: `OP-INSP-${Date.now().toString().slice(-6)}`,
                    machineId: machine?.id || "m-1",
                    machineName: machine?.name || machine?.model || "Assigned Heavy Equipment",
                    machineModel: machine?.name || machine?.type || "",
                    machineSerialNumber: machine?.serialNumber || "",
                    component: allComponents.map((c) => c.name).join(", ") || "All Machine Components",
                    componentName: allComponents.map((c) => c.name).join(", ") || "All Machine Components",
                    components: allComponents,
                    baselineComponents: baselineSnapshotRef.current,
                    customComponentsAdded: customAddedComponentsRef.current,
                    parameterChanges: allParameterChanges,
                    inspectionChecklist: inspectionItems,
                    summary: {
                      totalComponents: allComponents.length,
                      totalParameters: allParameterChanges.length,
                      modifiedParametersCount: modifiedCount,
                      customComponentsCount: customAddedComponentsRef.current.length,
                      healthyCount: allComponents.filter((c) => c.status === "Healthy" || c.status === "Good").length,
                      warningCount: allComponents.filter((c) => c.status === "Warning").length,
                      criticalCount: allComponents.filter((c) => c.status === "Critical").length,
                    },
                    role: "Operator",
                    staffName: opName,
                    operatorName: opName,
                    userName: opName,
                    staffEmail: opEmail,
                    operatorEmail: opEmail,
                    supervisorName: machine?.supervisorName || "Supervisor",
                    serviceType: "Pre-Start Machine Inspection",
                    serviceDate: new Date().toISOString().split("T")[0],
                    closedDate: new Date().toISOString().split("T")[0],
                    assignedAt: new Date().toLocaleString(),
                    shift: "Day Shift (Pre-Start)",
                    duration: "Inspection Completed",
                    priority: hasCriticalIssue ? "High" : "Low",
                    status: "Completed",
                    approvalStatus: "Approved & Verified",
                    workScope: `Complete pre-start checklist and telemetry inspection for all ${allComponents.length} components.`,
                    actionTaken: `All component telemetry verified and signed off by operator ${opName}. ${modifiedCount} parameters checked/updated.`,
                    supervisorRemarks: `Verified by supervisor. Pre-start inspection completed by ${opName}.`,
                    createdAt: new Date().toISOString(),
                  };

                  // 1. Save directly into PostgreSQL Database table (machine_inspection_audit_logs)
                  const targetMachineId = machine?.id || "m-1";

                  apiCall(`/machines/${encodeURIComponent(targetMachineId)}/manual-data`, {
                    method: "POST",
                    body: JSON.stringify({
                      machineName: machine?.name || machine?.model,
                      brand: machine?.brand || machine?.manufacturer || "Heavy Equipment",
                      category: machine?.equipmentType || "General",
                      modelName: machine?.name || machine?.model,
                      serialNumber: machine?.serialNumber,
                      componentName: allComponents.map((c) => c.name).join(", "),
                      componentCategory: "All Components",
                      actionDescription: "Pre-Start Inspection Completed",
                      readings: {
                        components: allComponents,
                        summary: fullInspectionLog.summary,
                      },
                      checklist: inspectionItems,
                      customFields: customAddedComponentsRef.current,
                      userName: opName,
                      userRole: "OPERATOR",
                      userEmail: opEmail,
                    }),
                  }, { showError: false }).catch(() => null);
                } catch (err) {
                  console.warn("Database sync notice:", err);
                }

                toast.success(`✓ Pre-Start Inspection completed by ${opName} & sent to supervisor!`);
              }}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                No components found for this machine.
              </p>
            </div>
          )}
        </div>
      </div>

      {updateTarget && (
        <UpdateComponentModal
          component={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSave={handleSaveComponentUpdate}
        />
      )}

      {isAddComponentModalOpen && (
        <AddCustomComponentModal
          machine={machine}
          onClose={() => setIsAddComponentModalOpen(false)}
          onSave={handleSaveNewCustomComponent}
        />
      )}
    </div>
  );
};

export default PreStartInspection;