import React, { useEffect, useMemo, useRef, useState } from "react";

import { apiCall } from "../../services/apiHandler";
import { showErrorToast } from "../../utils/toastUtils";

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
  Hash,
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
  Wind,
  Wrench,
  X,
} from "lucide-react";

export type MachineStatus = string;

export interface Machine {
  id: string;
  name: string;
  type: string;
  model?: string;
  category?: string;
  serialNumber: string;
  location: string;
  currentHours?: number;
  healthScore: number;
  status: MachineStatus;
  operatorName: string;
  companyId?: string;
  companyName?: string | null;
  brand?: string;
  manufacturer?: string;
  equipmentType?: string;
  supervisorName?: string;
}

export interface IssueImage {
  id: string;
  file: File | null;
  previewUrl: string;
  name: string;
  sizeKb: number;
}

export type InspectionStatus = "OK" | "Issue" | "N/A" | "Pending";

export interface InspectionItem {
  id: string;
  componentId?: string;
  parameterName?: string;
  label: string;
  icon: string;
  status: InspectionStatus;
  value?: string;
  unit?: string;
  safeRange?: string;
  description: string;
  imageUrl?: string | null;
}

export type ComponentCategory = string;
export type ComponentHealthStatus = string;

export interface ComponentParameter {
  name: string;
  unit?: string;
  safeMin?: number;
  safeMax?: number;
  defaultVal?: number | string;
  currentVal?: number | string;
  value?: number | string;
  status?: InspectionStatus;
  description?: string;
}

export interface MachineComponent {
  id: string;
  category: ComponentCategory;
  name: string;
  healthScore?: number;
  status?: ComponentHealthStatus;
  currentReading?: string;
  parameters?: ComponentParameter[];
}

export interface InspectionApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface MachineAssignmentApi {
  machineId: string;
  machineName: string;
  model: string;
  serialNumber: string;
  companyId: string | null;
  companyName: string | null;
  equipmentType: string;
  site: string;
  status?: string;
  healthScore: number;
  assignedOperatorName: string | null;
  assignedSupervisorName: string | null;
}

interface OperatorAssignmentsApi {
  activeAssignedMachines: MachineAssignmentApi[];
}

interface ComponentApi {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  healthScore?: number;
  status: string;
  currentReading?: string | null;
  currentHours?: number;
  parameters?: ComponentParameter[];
  inspectionParameters?: ComponentParameter[];
}

interface SavedComponentInspectionApi {
  componentId: string | null;
  componentName: string;
  healthScore: number;
  status: string;
  parameters: ComponentParameter[];
}

interface ManualDataApi {
  machine: {
    id: string;
    healthScore: number;
    status: string;
  };
  records: SavedComponentInspectionApi[];
}

interface SpecTemplateApi {
  components: ComponentApi[];
}

interface BatchInspectionResultApi {
  machineHealth: {
    machineId: string;
    overallMachineHealth: number;
    machineStatus: string;
  };
  components: Array<{
    componentId: string | null;
    componentName: string;
    healthScore: number;
    status: string;
    parameters: ComponentParameter[];
  }>;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

const componentStatusBadgeClass = (status?: ComponentHealthStatus) => {
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
        showErrorToast(`${file.name}: only JPG, PNG or WEBP allowed`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        showErrorToast(`${file.name}: exceeds ${MAX_IMAGE_SIZE_MB} MB limit`);
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
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (machine.healthScore / 100) * circumference;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Assigned Machine
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${componentStatusBadgeClass(machine.status)}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {machine.status}
        </span>
      </div>

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
              className="stroke-blue-600"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-slate-950 dark:text-white">
              {machine.healthScore}%
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
          Overall Health
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${componentStatusBadgeClass(machine.status)}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {machine.status}
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
        <InfoRow
          icon={Hash}
          label="Serial Number"
          value={machine.serialNumber}
        />
        <InfoRow icon={MapPin} label="Location" value={machine.location} />
        {machine.currentHours !== undefined && (
          <InfoRow
            icon={Clock}
            label="Current Hours"
            value={`${machine.currentHours.toLocaleString()} hrs`}
          />
        )}
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
              <span>
                {completedCount} of {items.length} completed
              </span>
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
  onSaveDetails: (
    value: string,
    description: string,
    imageUrl: string | null,
  ) => void;
}) {
  const Icon = CHECKLIST_ICONS[item.icon] ?? Circle;
  const { images, addImages, removeImage } = useImageUpload(
    item.imageUrl
      ? [
          {
            id: "existing",
            file: null,
            previewUrl: item.imageUrl,
            name: "photo.jpg",
            sizeKb: 0,
          },
        ]
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
                Safe Benchmark:{" "}
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {item.safeRange}
                </span>
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
            <ImageUploader
              images={images}
              onAdd={addImages}
              onRemove={removeImage}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                onSaveDetails(
                  localValue,
                  localDescription,
                  images[0]?.previewUrl ?? null,
                )
              }
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
  onComplete,
}: {
  components: MachineComponent[];
  onUpdateClick: (component: MachineComponent) => void;
  onAddCustomComponent: () => void;
  ready: boolean;
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
            View, inspect, and update live parameters for all components
            installed on this machine.
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
                <th className="px-4 py-3 font-bold">
                  Component &amp; Monitored Parameters
                </th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Health Score</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Live Reading Summary</th>
                <th className="px-4 py-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {components.map((c) => (
                <tr
                  key={c.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </p>
                    {c.parameters && c.parameters.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {c.parameters.map((p, pIdx) => {
                          const val = p.currentVal ?? p.value;
                          return (
                            <span
                              key={pIdx}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800"
                            >
                              <span className="text-slate-600 dark:text-slate-300 font-bold">
                                {p.name}:
                              </span>
                              <span className="font-black text-slate-900 dark:text-white">
                                {val ?? "Not recorded"} {p.unit}
                              </span>
                              {p.safeMin !== undefined &&
                                p.safeMax !== undefined && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    ({p.safeMin}–{p.safeMax})
                                  </span>
                                )}
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
                        {c.healthScore !== undefined && (
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${c.healthScore}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        {c.healthScore !== undefined
                          ? `${c.healthScore}%`
                          : "Not recorded"}
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
                      {c.status ?? "Not recorded"}
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
                  {c.status ?? "Not recorded"}
                </span>
              </div>

              {c.parameters && c.parameters.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {c.parameters.map((p, pIdx) => {
                    const val = p.currentVal ?? p.value;
                    return (
                      <span
                        key={pIdx}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span className="font-bold">{p.name}:</span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {val ?? "Not recorded"} {p.unit}
                        </span>
                        {p.safeMin !== undefined && p.safeMax !== undefined && (
                          <span className="text-[10px] text-slate-400">
                            ({p.safeMin}–{p.safeMax})
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  {c.healthScore !== undefined && (
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
                      style={{ width: `${c.healthScore}%` }}
                    />
                  )}
                </div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  {c.healthScore !== undefined
                    ? `${c.healthScore}%`
                    : "Not recorded"}
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
                Submit all component readings for backend health evaluation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onComplete}
            disabled={!ready}
            className="h-10 shrink-0 rounded-xl bg-emerald-600 px-6 text-xs font-black text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            Submit Inspection
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
    currentReading: string;
    notes: string;
    images: IssueImage[];
    parameters?: ComponentParameter[];
  }) => void;
}) {
  const [params, setParams] = useState<ComponentParameter[]>(() => {
    return (component.parameters || []).map((parameter) => ({
      ...parameter,
      currentVal: parameter.currentVal ?? parameter.value ?? "",
    }));
  });
  const [currentReading, setCurrentReading] = useState(
    component.currentReading || "",
  );
  const [notes, setNotes] = useState("");
  const { images, addImages, removeImage } = useImageUpload();

  const handleParamChange = (index: number, value: string) => {
    setParams((previous) =>
      previous.map((parameter, parameterIndex) =>
        parameterIndex === index
          ? { ...parameter, currentVal: value }
          : parameter,
      ),
    );
  };

  const handleSave = () => {
    onSave({ currentReading, notes, images, parameters: params });
  };

  return (
    <ModalShell
      title="Inspect &amp; Update Component"
      subtitle={component.name}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Real-time Health Badge Header */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Backend Health Score
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {component.healthScore !== undefined
                  ? `${component.healthScore}%`
                  : "Not recorded"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${componentStatusBadgeClass(component.status)}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {component.status ?? "Not recorded"}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Parameter Sliders & Inputs */}
        {params.length > 0 && (
          <div className="space-y-3.5 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-slate-800 dark:bg-[#0c1626]">
            <p className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Factory Monitored Parameters &amp; Safe Limits
            </p>
            {params.map((p, pIdx) => {
              const val = p.currentVal ?? p.value ?? "";

              return (
                <div
                  key={pIdx}
                  className="rounded-lg bg-white p-3 border border-slate-200 shadow-sm dark:border-slate-700/80 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {p.name}
                      </span>
                      {p.safeMin !== undefined && p.safeMax !== undefined && (
                        <span className="ml-2 text-[11px] text-slate-400">
                          (Safe: {p.safeMin}–{p.safeMax} {p.unit})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) =>
                          handleParamChange(pIdx, e.target.value)
                        }
                        className="h-8 w-28 rounded-md border border-slate-300 bg-white px-2 text-right text-xs font-black outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <span className="text-xs font-bold text-slate-500">
                        {p.unit}
                      </span>
                    </div>
                  </div>
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
          <ImageUploader
            images={images}
            onAdd={addImages}
            onRemove={removeImage}
          />
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
          Save Readings
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

// ============================================================================
// Add Custom Component Modal for Operator (Identical to Admin Component Builder)
// ============================================================================

interface CustomComponentParameterInput {
  name: string;
  unit: string;
  safeMin: number;
  safeMax: number;
  defaultVal: number;
  currentVal?: number;
  description?: string;
}

interface CustomComponentInput {
  name: string;
  category: string;
  parameters: CustomComponentParameterInput[];
}

interface CustomComponentParameterDraft {
  name: string;
  unit: string;
  safeMin: string;
  safeMax: string;
  defaultVal: string;
  currentVal: string;
  description: string;
}

function AddCustomComponentModal({
  machine,
  onClose,
  onSave,
}: {
  machine: Machine | null;
  onClose: () => void;
  onSave: (component: CustomComponentInput) => void;
}) {
  const [name, setName] = useState("");
  const [componentCategory, setComponentCategory] = useState("");
  const [params, setParams] = useState<CustomComponentParameterDraft[]>([]);
  const [formError, setFormError] = useState("");

  const handleAddParam = () => {
    setParams((prev) => [
      ...prev,
      {
        name: "",
        unit: "Bar",
        safeMin: "",
        safeMax: "",
        defaultVal: "",
        currentVal: "",
        description: "",
      },
    ]);
  };

  const handleRemoveParam = (index: number) => {
    setParams((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateParam = (
    index: number,
    field: keyof CustomComponentParameterDraft,
    value: string,
  ) => {
    setParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const handleSave = () => {
    if (!name.trim() || !componentCategory.trim()) {
      setFormError("Component name and category are required.");
      return;
    }
    if (params.length === 0) {
      setFormError("Please add at least 1 inspection parameter.");
      return;
    }
    const normalizedParameters: CustomComponentParameterInput[] = [];
    for (const parameter of params) {
      const safeMin = Number(parameter.safeMin);
      const safeMax = Number(parameter.safeMax);
      const defaultVal = Number(parameter.defaultVal);
      if (!parameter.name.trim() || !parameter.unit.trim()) {
        setFormError("Each parameter needs a name and unit.");
        return;
      }
      if (
        !Number.isFinite(safeMin) ||
        !Number.isFinite(safeMax) ||
        !Number.isFinite(defaultVal) ||
        safeMin >= safeMax
      ) {
        setFormError(
          `Enter valid limits and a baseline for ${parameter.name}.`,
        );
        return;
      }
      normalizedParameters.push({
        name: parameter.name.trim(),
        unit: parameter.unit.trim(),
        safeMin,
        safeMax,
        defaultVal,
        ...(parameter.currentVal.trim()
          ? { currentVal: Number(parameter.currentVal) }
          : {}),
        ...(parameter.description.trim()
          ? { description: parameter.description.trim() }
          : {}),
      });
    }
    onSave({
      name: name.trim(),
      category: componentCategory.trim(),
      parameters: normalizedParameters,
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
                Machine:{" "}
                <span className="font-bold text-white">
                  {machine?.name ?? ""}
                </span>{" "}
                ({machine?.type ?? ""})
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Component Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold normal-case dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
              />
            </label>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Category
              <input
                value={componentCategory}
                onChange={(event) => setComponentCategory(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold normal-case dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
              />
            </label>
          </div>

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
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Parameter Name
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Oil Pressure"
                      value={param.name}
                      onChange={(e) =>
                        handleUpdateParam(idx, "name", e.target.value)
                      }
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Unit
                    </span>
                    <select
                      value={param.unit}
                      onChange={(e) =>
                        handleUpdateParam(idx, "unit", e.target.value)
                      }
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Safe Min
                    </span>
                    <input
                      type="number"
                      value={param.safeMin}
                      onChange={(e) =>
                        handleUpdateParam(idx, "safeMin", e.target.value)
                      }
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Safe Max */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Safe Max
                    </span>
                    <input
                      type="number"
                      value={param.safeMax}
                      onChange={(e) =>
                        handleUpdateParam(idx, "safeMax", e.target.value)
                      }
                      className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                    />
                  </div>

                  {/* Default / Baseline */}
                  <div className="w-20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Default
                    </span>
                    <input
                      type="number"
                      value={param.defaultVal}
                      onChange={(e) =>
                        handleUpdateParam(idx, "defaultVal", e.target.value)
                      }
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

const requireApiData = <T,>(response: InspectionApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.message || "Inspection API request failed.");
  }
  return response.data;
};

// ============================================================================
// Page
// ============================================================================

const PreStartInspection: React.FC = () => {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);

  const [updateTarget, setUpdateTarget] = useState<MachineComponent | null>(
    null,
  );
  const [componentsState, setComponentsState] = useState<
    Record<string, MachineComponent[]>
  >({});

  const loadMachineAndComponents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const assignmentResponse = await apiCall<
        InspectionApiResponse<OperatorAssignmentsApi>
      >("/machines/operator-assignments", { method: "GET" });
      const assignmentData = requireApiData(assignmentResponse);
      if (!Array.isArray(assignmentData.activeAssignedMachines)) {
        throw new Error("The assignment API returned an invalid machine list.");
      }
      const assignment = assignmentData.activeAssignedMachines[0];

      if (!assignment) {
        setMachine(null);
        setComponentsState({});
        setInspectionItems([]);
        return;
      }

      const machineId = assignment.machineId;
      const templateQuery = new URLSearchParams({
        equipmentType: assignment.equipmentType,
        modelName: assignment.model,
        machineId,
        companyId: assignment.companyId ?? "",
      });
      const [componentsResponse, manualDataResponse, templateResponse] =
        await Promise.all([
          apiCall<InspectionApiResponse<ComponentApi[]>>(
            `/machines/${encodeURIComponent(machineId)}/components`,
            { method: "GET" },
          ),
          apiCall<InspectionApiResponse<ManualDataApi>>(
            `/machines/${encodeURIComponent(machineId)}/manual-data`,
            { method: "GET" },
          ),
          apiCall<InspectionApiResponse<SpecTemplateApi>>(
            `/machines/spec-template?${templateQuery.toString()}`,
            { method: "GET" },
          ),
        ]);
      const apiComponents = requireApiData(componentsResponse);
      const manualData = requireApiData(manualDataResponse);
      const template = requireApiData(templateResponse);
      if (
        !Array.isArray(apiComponents) ||
        !Array.isArray(manualData.records) ||
        !Array.isArray(template.components)
      ) {
        throw new Error("Inspection API returned incomplete machine data.");
      }

      const nextMachine: Machine = {
        id: machineId,
        name: assignment.machineName,
        type: assignment.equipmentType,
        model: assignment.model,
        serialNumber: assignment.serialNumber,
        location: assignment.site,
        healthScore: manualData.machine.healthScore,
        status: manualData.machine.status,
        operatorName: assignment.assignedOperatorName ?? "",
        companyId: assignment.companyId ?? undefined,
        companyName: assignment.companyName,
        equipmentType: assignment.equipmentType,
        supervisorName: assignment.assignedSupervisorName ?? undefined,
      };

      const nextComponents = apiComponents.map((apiComponent) => {
        const savedRecord = manualData.records.find(
          (record) =>
            record.componentId === apiComponent.id ||
            record.componentName === apiComponent.name,
        );
        const templateComponent = template.components.find(
          (candidate) => candidate.name === apiComponent.name,
        );
        const parameterDefinitions =
          apiComponent.parameters ??
          apiComponent.inspectionParameters ??
          templateComponent?.parameters ??
          [];
        const parameters = parameterDefinitions.map((parameter) => {
          const savedParameter = savedRecord?.parameters.find(
            (candidate) => candidate.name === parameter.name,
          );
          return {
            ...parameter,
            currentVal: savedParameter?.currentVal ?? savedParameter?.value,
          };
        });

        return {
          id: apiComponent.id,
          name: apiComponent.name,
          category: apiComponent.category ?? templateComponent?.category ?? "",
          healthScore: savedRecord?.healthScore ?? apiComponent.healthScore,
          status: savedRecord?.status ?? apiComponent.status,
          currentReading: apiComponent.currentReading ?? undefined,
          parameters,
        } satisfies MachineComponent;
      });

      const grouped = nextComponents.reduce<Record<string, MachineComponent[]>>(
        (result, component) => {
          const componentCategory = component.category || "";
          result[componentCategory] ??= [];
          result[componentCategory].push(component);
          return result;
        },
        {},
      );
      const nextChecklist = nextComponents.flatMap((component) =>
        (component.parameters ?? []).map((parameter) => ({
          id: `${component.id}:${parameter.name}`,
          componentId: component.id,
          parameterName: parameter.name,
          label: `${parameter.name} (${component.name})`,
          icon: "wrench",
          status: "Pending" as InspectionStatus,
          value:
            parameter.currentVal !== undefined
              ? String(parameter.currentVal)
              : parameter.value !== undefined
                ? String(parameter.value)
                : undefined,
          unit: parameter.unit,
          safeRange:
            parameter.safeMin !== undefined && parameter.safeMax !== undefined
              ? `Safe: ${parameter.safeMin}–${parameter.safeMax} ${parameter.unit ?? ""}`
              : undefined,
          description: parameter.description ?? "",
        })),
      );

      setMachine(nextMachine);
      setComponentsState(grouped);
      setInspectionItems((previous) =>
        nextChecklist.map((item) => {
          const old = previous.find((candidate) => candidate.id === item.id);
          return old && old.status !== "Pending"
            ? { ...item, status: old.status }
            : item;
        }),
      );

      setCompletionStatus("idle");
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

  const allComponents = useMemo(
    () => Object.values(componentsState).flat(),
    [componentsState],
  );

  const handleUpdateInspectionItem = (
    id: string,
    patch: Partial<InspectionItem>,
  ) => {
    setInspectionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");

  const handleSaveComponentUpdate = async (updates: {
    currentReading: string;
    notes: string;
    images: IssueImage[];
    parameters?: ComponentParameter[];
  }) => {
    if (!machine || !updateTarget) return;

    const parameters = updates.parameters ?? updateTarget.parameters ?? [];
    if (parameters.length === 0) {
      showErrorToast(
        "No inspection parameters were returned for this component.",
      );
      return;
    }
    if (
      parameters.some(
        (parameter) =>
          !String(parameter.currentVal ?? parameter.value ?? "").trim(),
      )
    ) {
      showErrorToast(
        "Enter a reading for every component parameter before saving.",
      );
      return;
    }

    const componentChecklist = inspectionItems.filter(
      (item) => item.componentId === updateTarget.id,
    );
    const customFields = parameters.map((parameter) => {
      const checklistItem = componentChecklist.find(
        (item) => item.parameterName === parameter.name,
      );
      return {
        name: parameter.name,
        value: String(parameter.currentVal ?? parameter.value),
        safeMin: parameter.safeMin,
        safeMax: parameter.safeMax,
        unit: parameter.unit,
        description: parameter.description,
        status: checklistItem?.status,
      };
    });

    try {
      const response = await apiCall<InspectionApiResponse<unknown>>(
        `/machines/${encodeURIComponent(machine.id)}/manual-data`,
        {
          method: "POST",
          body: JSON.stringify({
            componentId: updateTarget.id,
            componentName: updateTarget.name,
            componentCategory: updateTarget.category,
            customFields,
            readings: Object.fromEntries(
              componentChecklist.map((item) => [
                item.parameterName ?? item.label,
                item.value ?? "",
              ]),
            ),
            checklist: Object.fromEntries(
              componentChecklist.map((item) => [
                item.parameterName ?? item.label,
                item.status,
              ]),
            ),
            brand: machine.brand ?? machine.manufacturer,
            category: machine.type,
            modelName: machine.model,
            serialNumber: machine.serialNumber,
            machineName: machine.name,
            companyId: machine.companyId,
            companyName: machine.companyName,
          }),
        },
      );
      requireApiData(response);
      await loadMachineAndComponents();
      setUpdateTarget(null);
    } catch (saveError) {
      showErrorToast(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the inspection readings.",
      );
    }
  };

  const handleSaveNewCustomComponent = async (
    newComp: CustomComponentInput,
  ) => {
    if (!machine) return;

    try {
      const response = await apiCall<InspectionApiResponse<unknown>>(
        "/machines/custom-components",
        {
          method: "POST",
          body: JSON.stringify({
            companyId: machine.companyId,
            machineId: machine.id,
            modelName: machine.model,
            equipmentType: machine.equipmentType,
            ...newComp,
          }),
        },
      );
      requireApiData(response);
      setIsAddComponentModalOpen(false);
      await loadMachineAndComponents();
    } catch (saveError) {
      showErrorToast(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the inspection readings.",
      );
    }
  };

  const readyToComplete =
    allComponents.length > 0 &&
    inspectionItems.length > 0 &&
    inspectionItems.every(
      (item) => item.status !== "Pending" && Boolean(item.value?.trim()),
    );

  const handleCompleteInspection = async () => {
    if (!machine) return;
    setCompletionStatus("saving");

    try {
      const components = allComponents.map((component) => {
        const componentItems = inspectionItems.filter(
          (item) => item.componentId === component.id,
        );
        const parameters = component.parameters ?? [];
        if (parameters.length === 0) {
          throw new Error(
            `No API inspection parameters for ${component.name}.`,
          );
        }

        const customFields = parameters.map((parameter) => {
          const item = componentItems.find(
            (inspectionItem) => inspectionItem.parameterName === parameter.name,
          );
          const value = item?.value ?? parameter.currentVal ?? parameter.value;
          if (value === undefined || !String(value).trim()) {
            throw new Error(`Enter a reading for ${parameter.name}.`);
          }
          if (!item || item.status === "Pending") {
            throw new Error(`Complete the inspection for ${parameter.name}.`);
          }
          return {
            name: parameter.name,
            value: String(value),
            safeMin: parameter.safeMin,
            safeMax: parameter.safeMax,
            unit: parameter.unit,
            description: parameter.description,
            status: item.status,
          };
        });

        return {
          componentId: component.id,
          componentCategory: component.category,
          componentName: component.name,
          customFields,
          readings: Object.fromEntries(
            componentItems.map((item) => [
              item.parameterName ?? item.label,
              item.value ?? "",
            ]),
          ),
          checklist: Object.fromEntries(
            componentItems.map((item) => [
              item.parameterName ?? item.label,
              item.status,
            ]),
          ),
        };
      });

      const response = await apiCall<
        InspectionApiResponse<BatchInspectionResultApi>
      >(`/machines/${encodeURIComponent(machine.id)}/manual-data`, {
        method: "POST",
        body: JSON.stringify({
          components,
          brand: machine.brand ?? machine.manufacturer,
          category: machine.type,
          modelName: machine.model,
          serialNumber: machine.serialNumber,
          machineName: machine.name,
          companyId: machine.companyId,
          companyName: machine.companyName,
        }),
      });
      const result = requireApiData(response);

      setMachine((previous) =>
        previous
          ? {
              ...previous,
              healthScore: result.machineHealth.overallMachineHealth,
              status: result.machineHealth.machineStatus,
            }
          : previous,
      );
      setComponentsState((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(
            ([componentCategory, categoryComponents]) => [
              componentCategory,
              categoryComponents.map((component) => {
                const savedComponent = result.components.find(
                  (resultComponent) =>
                    resultComponent.componentId === component.id ||
                    resultComponent.componentName === component.name,
                );
                return savedComponent
                  ? {
                      ...component,
                      healthScore: savedComponent.healthScore,
                      status: savedComponent.status,
                      parameters: savedComponent.parameters,
                    }
                  : component;
              }),
            ],
          ),
        ),
      );
      setCompletionStatus("success");
    } catch (submitError) {
      setCompletionStatus("error");

      showErrorToast(
        submitError instanceof Error
          ? submitError.message
          : "Inspection submission failed.",
      );
    }
  };

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
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error}
          </p>
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
            You do not have any active equipment assigned to your operator
            account yet. Please contact your supervisor.
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

        {completionStatus === "success" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            ✅ Inspection completed and submitted successfully.
          </div>
        )}
        {completionStatus === "error" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            ⚠️ Something went wrong while submitting the inspection. Please try
            again.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
          <MachineCard machine={machine} components={allComponents} />
          {allComponents.length > 0 ? (
            <div className="space-y-5">
              <ComponentHealthSection
                components={allComponents}
                onUpdateClick={setUpdateTarget}
                onAddCustomComponent={() => setIsAddComponentModalOpen(true)}
                ready={readyToComplete}
                onComplete={handleCompleteInspection}
              />
              {inspectionItems.length > 0 && (
                <ChecklistSection
                  items={inspectionItems}
                  onUpdateItem={handleUpdateInspectionItem}
                />
              )}
            </div>
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
