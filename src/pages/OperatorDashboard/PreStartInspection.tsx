import React, { useEffect, useMemo, useRef, useState } from "react";

import machineService from "../../services/Operator/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

import {
  AlertTriangle,
  Camera,
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
  MapPin,
  Navigation,
  Plus,
  Settings,
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

export interface MachineComponent {
  id: string;
  category: ComponentCategory;
  name: string;
  health: number; // 0-100
  status: ComponentHealthStatus;
  currentReading: string; // e.g. "68°C" or "—"
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
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-coolant",
    label: "Coolant Level",
    icon: "thermometer",
    status: "OK",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-hydraulic-oil",
    label: "Hydraulic Oil Level",
    icon: "wrench",
    status: "OK",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-fuel",
    label: "Fuel Level",
    icon: "fuel",
    status: "OK",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-tyre",
    label: "Tyre Condition",
    icon: "circleDot",
    status: "OK",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-brake",
    label: "Brake System",
    icon: "discAlbum",
    status: "OK",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-steering",
    label: "Steering System",
    icon: "navigation",
    status: "OK",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-lights",
    label: "Lights & Indicators",
    icon: "lightbulb",
    status: "Pending",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-air-filter",
    label: "Air Filter",
    icon: "wind",
    status: "Pending",
    description: "",
    imageUrl: null,
  },
  {
    id: "insp-belts",
    label: "Belts & Hoses",
    icon: "settings",
    status: "Pending",
    description: "",
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

function MachineCard({ machine }: { machine: Machine }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Assigned Machine
        </h2>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {machine.status}
        </span>
      </div>

      <div className="h-48 w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
        <img
          src={machine.imageUrl}
          alt={machine.name}
          className="h-full w-full object-cover"
        />
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
            onSaveDetails={(description, imageUrl) => {
              onUpdateItem(item.id, { description, imageUrl });
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
  onSaveDetails: (description: string, imageUrl: string | null) => void;
}) {
  const Icon = CHECKLIST_ICONS[item.icon] ?? Circle;
  const { images, addImages, removeImage } = useImageUpload(
    item.imageUrl
      ? [{ id: "existing", file: null, previewUrl: item.imageUrl, name: "photo.jpg", sizeKb: 0 }]
      : [],
  );
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
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <Icon size={16} strokeWidth={2.2} />
          </div>
          <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
            {item.label}
          </span>
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
              Description
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
              Photo
            </label>
            <ImageUploader images={images} onAdd={addImages} onRemove={removeImage} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onSaveDetails(localDescription, images[0]?.previewUrl ?? null)}
              className="h-9 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component Health & Update
// ============================================================================

function ComponentOverviewCard({
  overview,
}: {
  overview: (typeof mockCategoryOverview)[ComponentCategory];
}) {
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (overview.overallHealth / 100) * circumference;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
          {overview.category} Overview
        </h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${componentStatusBadgeClass(
            overview.status,
          )}`}
        >
          {overview.status}
        </span>
      </div>

      <div className="flex justify-center">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
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
                overview.overallHealth >= 80
                  ? "stroke-emerald-500"
                  : overview.overallHealth >= 60
                    ? "stroke-amber-500"
                    : "stroke-red-500"
              }
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-slate-950 dark:text-white">
              {overview.overallHealth}%
            </span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
        Overall Health
      </p>

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Hours Run</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            {overview.hoursRun.toLocaleString()} hrs
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Last Updated</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            {overview.lastUpdated}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Status</span>
          <span className={`font-extrabold ${healthTextColor(overview.overallHealth)}`}>
            {overview.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function ComponentHealthSection({
  category,
  onCategoryChange,
  categories,
  components,
  onUpdateClick,
}: {
  category: ComponentCategory;
  onCategoryChange: (c: ComponentCategory) => void;
  categories: string[];
  components: MachineComponent[];
  onUpdateClick: (component: MachineComponent) => void;
}) {
    const overview = buildCategoryOverview(category, components);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
            Component Health &amp; Update
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            View and update the current health of components installed on
            this machine.
          </p>
        </div>

        <div className="sm:w-56">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Component Category
          </label>


                    <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <ComponentOverviewCard overview={overview} />

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 lg:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-4 py-3 font-bold">Component</th>
                <th className="px-4 py-3 font-bold">Health</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Current Reading</th>
                <th className="px-4 py-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {components.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {c.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-1.5 rounded-full ${healthBarColor(c.health)}`}
                          style={{ width: `${c.health}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
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
                  <td className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {c.currentReading}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onUpdateClick(c)}
                      className="h-8 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
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
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {c.name}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${componentStatusBadgeClass(
                    c.status,
                  )}`}
                >
                  {c.status}
                </span>
              </div>

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
  }) => void;
}) {
  const [currentLevel, setCurrentLevel] = useState(component.health);
  const [condition, setCondition] = useState<"Poor" | "Fair" | "Good" | "Excellent">("Good");
  const [status, setStatus] = useState<ComponentHealthStatus>(component.status);
  const [currentReading, setCurrentReading] = useState(component.currentReading === "—" ? "" : component.currentReading);
  const [notes, setNotes] = useState("");
  const { images, addImages, removeImage } = useImageUpload();

  const handleSave = () => {
    onSave({
      health: currentLevel,
      status,
      currentReading: currentReading.trim() === "" ? "—" : currentReading.trim(),
      condition,
      notes,
      images,
    });
  };

  return (
    <ModalShell title="Update Component" subtitle={component.name} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current Level (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={currentLevel}
            onChange={(e) => setCurrentLevel(Number(e.target.value))}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as typeof condition)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            >
              {["Poor", "Fair", "Good", "Excellent"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComponentHealthStatus)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
            >
              {["Healthy", "Good", "Warning", "Critical"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current Reading
          </label>
          <input
            type="text"
            value={currentReading}
            onChange={(e) => setCurrentReading(e.target.value)}
            placeholder="e.g. 68°C"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add observation..."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Add Photos
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
          className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          Save Update
        </button>
      </ModalFooter>
    </ModalShell>
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

            if (!operatorId) {
        setMachine(null);
        setComponentsState({});
        setCategories([]);
        return;
      }

            const assignedMachines = machines.filter((item: any) => {
        const assignedOpId = String(
          item?.assignedOperatorId ??
            item?.assigned_operator_id ??
            item?.operatorId ??
            item?.operator_id ??
            item?.operator?.id ??
            "",
        ).trim();
        return assignedOpId.toLowerCase() === operatorId.toLowerCase();
      });
      console.log("ASSIGNED MACHINES (PreStart):", assignedMachines);
      console.log("STATUS VALUES:", assignedMachines.map((m: any) => m?.status ?? m?.assignmentStatus ?? m?.assignment_status));

           const currentAssignment = assignedMachines.find((item: any) => {
        const status = String(
          item?.status ?? item?.assignmentStatus ?? item?.assignment_status ?? "",
        )
          .trim()
          .toLowerCase();
        return status !== "completed" && status !== "unassigned";
      });

            if (!currentAssignment) {
        setMachine(null);
        setComponentsState({});
        setCategories([]);
        return;
      }

      const resolvedMachineId = String(
        currentAssignment?.machineId || currentAssignment?.id || currentAssignment?._id || "",
      ).trim();

            if (!resolvedMachineId) {
        setMachine(null);
        setComponentsState({});
        setCategories([]);
        return;
      }

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
      const componentsResponse = await componentService.getComponents(resolvedMachineId);
      const rawComponents = getArrayData<any>(componentsResponse);

      const grouped: Record<string, MachineComponent[]> = {};

      rawComponents.forEach((raw: any) => {
        const cat =
          normalizeCategory(
            raw?.category ?? raw?.componentType ?? raw?.type ?? raw?.categoryName,
          ) || "Other";

        const health = Math.round(
          Math.min(Math.max(Number(raw?.condition || 0), 0), 5) * 20,
        );

        const component: MachineComponent = {
          id: String(raw?.id ?? raw?._id ?? raw?.componentId ?? nextId("comp")),
          category: cat,
          name: raw?.description || raw?.category || "Component",
          health,
          status: healthToStatus(health),
          currentReading: raw?.currentReading || raw?.currentHours
            ? `${raw?.currentHours} hrs`
            : "—",
        };

        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(component);
      });

      const availableCategories = Object.keys(grouped).sort();

      setComponentsState(grouped);
      setCategories(availableCategories);
      setCategory((prev) => (prev && grouped[prev] ? prev : availableCategories[0] || ""));


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
    loadMachineAndComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   const components = componentsState[category] || [];

  const handleUpdateInspectionItem = (id: string, patch: Partial<InspectionItem>) => {
    setInspectionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmitIssue = (report: IssueReport) => {
    setIssueReports((prev) => [...prev, report]);
    setReportModalOpen(false);
  };

  const handleSaveComponentUpdate = (updates: {
    health: number;
    status: ComponentHealthStatus;
    currentReading: string;
    condition: "Poor" | "Fair" | "Good" | "Excellent";
    notes: string;
    images: IssueImage[];
  }) => {

       if (!updateTarget) return;
    setComponentsState((prev) => ({
      ...prev,
      [category]: (prev[category] || []).map((c) =>
        c.id === updateTarget.id
          ? { ...c, health: updates.health, status: updates.status, currentReading: updates.currentReading }
          : c,
      ),
    }));
    setUpdateTarget(null);
  };

  const allChecksComplete = useMemo(
    () => inspectionItems.every((i) => i.status !== "Pending"),
    [inspectionItems],
  );

  const hasCriticalIssue = useMemo(
    () => issueReports.some((r) => r.severity === "Critical"),
    [issueReports],
  );

  const readyToComplete = allChecksComplete && !hasCriticalIssue;

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-6 bg-slate-100 p-4 dark:bg-[#07111f] sm:p-6 lg:p-8">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
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
            No machine is currently assigned to you.
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
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <style>{`
        .hme-hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hme-hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Pre-Start Inspection
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Inspect and ensure the machine is safe to operate.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 sm:w-fit"
          >
            <AlertTriangle size={16} strokeWidth={2.5} />
            Report New Issue
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
          <MachineCard machine={machine} />
          <ChecklistSection items={inspectionItems} onUpdateItem={handleUpdateInspectionItem} />
        </div>

                {categories.length > 0 ? (
          <ComponentHealthSection
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
            components={components}
            onUpdateClick={setUpdateTarget}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No components found for this machine.
            </p>
          </div>
        )}

        <CompleteInspectionCard
          ready={readyToComplete}
          hasCriticalIssue={hasCriticalIssue}
          onComplete={() => {
            // Local/mock completion only — wire to
            // postCompleteInspection(machine.id) once the API is ready.
            toastFallback("Inspection completed (mock)");
          }}
        />
      </div>

      {reportModalOpen && (
        <ReportIssueModal
          machineId={machine.id}
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleSubmitIssue}
        />
      )}

      {updateTarget && (
        <UpdateComponentModal
          component={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSave={handleSaveComponentUpdate}
        />
      )}
    </div>
  );
};

export default PreStartInspection;