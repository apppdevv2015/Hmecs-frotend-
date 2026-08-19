import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "../../redux/store";

import {
  fetchArtisanAssignedMachines,
  type ArtisanMachine,
} from "../../redux/slices/artisanMachineSlice";

// TODO: adjust this relative path to match where you place inspectionService.ts
// in your project (it follows the same pattern as machineService.ts).
import inspectionService from "../../services/Operator/inspectionService";

import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bell,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
  Cog,
  Disc,
  Droplet,
  FileText,
  Flame,
  GitCommitHorizontal,
  History,
  ImagePlus,
  ListChecks,
  Loader2,
  Navigation,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Upload,
  User,
  UserCog,
  Wrench,
  X,
} from "lucide-react";

/* ============================================================================
 * ARTISAN DASHBOARD — PRE-START INSPECTION MODULE
 * ----------------------------------------------------------------------------
 * Single-file implementation (project convention: no new files, except the
 * real `inspectionService` which follows the same pattern as machineService).
 *
 * Machine list -> component list -> per-component health check, issue
 * reporting with evidence, draft/save, submit, history.
 *
 * ALL data comes from real APIs:
 *   - Assigned machines: Redux thunk `fetchArtisanAssignedMachines`
 *     (machineService.getAssignedMachines under the hood).
 *   - Everything inspection-related: `inspectionService` (real endpoints,
 *     see inspectionService.ts).
 *
 * There is NO mock/dummy data anywhere in this file. Every failed API call
 * surfaces a toast error instead of falling back to fake data.
 * ========================================================================== */

/* ============================================================================
 * 1. TYPES
 * ========================================================================== */

export type MachineInspectionStatus = "Pending" | "In Progress" | "Completed";
export type HealthStatus = "Healthy" | "Warning" | "Critical" | "Not Working";
export type IssueType =
  | "Leakage"
  | "Abnormal Noise"
  | "Damage"
  | "Wear"
  | "Electrical Issue"
  | "Fluid Level"
  | "Performance Issue"
  | "Other";
export type IssueSeverity = "Low" | "Medium" | "High" | "Critical";
export type FilterKey = "All" | "Pending" | "In Progress" | "Completed" | "Issues";
export type DetailTab = "inspection" | "issues" | "history";
export type AssignerRole = "Supervisor" | "Artisan" | "Admin";

// Who the machine is currently operated by, and who assigned it to that
// operator. Built from the real assignment fields returned by
// `fetchArtisanAssignedMachines` — see `mapArtisanMachineToUiMachine` below.
export interface MachineAssignment {
  operatorName: string;
  operatorId: string;
  operatorPhone?: string;
  assignedByName: string;
  assignedByRole: AssignerRole;
  assignedDate: string;
}

// UI-facing machine shape. The Redux store holds `ArtisanMachine` (the raw,
// API-normalized shape defined in artisanMachineSlice.ts) — we map it to
// this shape once, in `mapArtisanMachineToUiMachine`, so the rest of the UI
// below doesn't need to change.
export interface Machine {
  id: string;
  name: string;
  machineId: string;
  model: string;
  serialNumber: string;
  imageUrl: string;
  assignedTo: string;
  inspectionStatus: MachineInspectionStatus;
  lastInspectionDate: string | null;
  assignment: MachineAssignment | null;
}

export interface ComponentDef {
  id: string;
  name: string;
  icon: string; // key into COMPONENT_ICONS
}

export interface EvidenceImage {
  id: string;
  file: File | null; // null for images already saved on the backend
  previewUrl: string;
  name: string;
  sizeKb: number;
}

export interface ComponentInspectionRecord {
  componentId: string;
  status: HealthStatus | null; // null = not yet chosen
  inspected: boolean; // true once "Save Component" succeeds
  notes: string;
  issueFound: boolean;
  issueType: IssueType | "";
  severity: IssueSeverity | "";
  issueDescription: string;
  evidence: EvidenceImage[];
  lastInspectedAt: string | null;
}

export interface MachineInspection {
  machineId: string;
  componentIds: string[];
  records: Record<string, ComponentInspectionRecord>;
  isDraft: boolean;
  isSubmitted: boolean;
  submittedAt: string | null;
  submittedBy: string | null;
}

export interface InspectionHistoryEntry {
  id: string;
  machineId: string;
  date: string;
  artisan: string;
  overallHealth: number;
  componentsInspected: number;
  totalComponents: number;
  issuesFound: number;
  status: "Completed";
  submittedAt: string;
}

export interface InspectionSummary {
  totalMachines: number;
  pendingInspection: number;
  completedInspection: number;
  issuesReported: number;
}

/* ============================================================================
 * 2. CONSTANTS / CONFIG
 * ========================================================================== */

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const HEALTH_OPTIONS: HealthStatus[] = ["Healthy", "Warning", "Critical", "Not Working"];
const ISSUE_TYPE_OPTIONS: IssueType[] = [
  "Leakage",
  "Abnormal Noise",
  "Damage",
  "Wear",
  "Electrical Issue",
  "Fluid Level",
  "Performance Issue",
  "Other",
];
const SEVERITY_OPTIONS: IssueSeverity[] = ["Low", "Medium", "High", "Critical"];
const FILTER_OPTIONS: FilterKey[] = ["All", "Pending", "In Progress", "Completed", "Issues"];

const COMPONENT_ICONS: Record<string, React.ElementType> = {
  flame: Flame,
  settings: Settings,
  droplet: Droplet,
  axle: GitCommitHorizontal,
  cog: Cog,
  navigation: Navigation,
  disc: Disc,
  tyre: CircleDot,
};

const HEALTH_SCORE: Record<HealthStatus, number> = {
  Healthy: 100,
  Warning: 65,
  Critical: 30,
  "Not Working": 0,
};

let idSeq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idSeq++}`;

/* ============================================================================
 * 3. API RESPONSE NORMALIZATION
 * ----------------------------------------------------------------------------
 * Same defensive pattern used in artisanMachineSlice.ts: the backend may key
 * fields as camelCase or snake_case, or nest the payload under `data`. These
 * helpers turn a raw API response into the exact shape the UI expects —
 * they never invent values, they only read what the API actually returned.
 * ========================================================================== */

const extractArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const blankRecord = (componentId: string): ComponentInspectionRecord => ({
  componentId,
  status: null,
  inspected: false,
  notes: "",
  issueFound: false,
  issueType: "",
  severity: "",
  issueDescription: "",
  evidence: [],
  lastInspectedAt: null,
});

const normalizeComponentDef = (item: any): ComponentDef => ({
  id: String(item?.id ?? item?.componentId ?? item?.component_id ?? ""),
  name: String(item?.name ?? item?.componentName ?? item?.component_name ?? ""),
  icon: String(item?.icon ?? "cog"),
});

const normalizeEvidenceImage = (item: any): EvidenceImage => ({
  id: String(item?.id ?? nextId("img")),
  file: null,
  previewUrl: String(item?.url ?? item?.previewUrl ?? item?.imageUrl ?? item?.image_url ?? ""),
  name: String(item?.name ?? item?.fileName ?? item?.file_name ?? ""),
  sizeKb: Number(item?.sizeKb ?? item?.size_kb ?? 0),
});

const normalizeComponentRecord = (componentId: string, item: any): ComponentInspectionRecord => {
  if (!item) return blankRecord(componentId);
  return {
    componentId,
    status: (item?.status ?? item?.healthStatus ?? item?.health_status ?? null) as HealthStatus | null,
    inspected: Boolean(item?.inspected ?? item?.isInspected ?? item?.is_inspected ?? false),
    notes: String(item?.notes ?? ""),
    issueFound: Boolean(item?.issueFound ?? item?.issue_found ?? false),
    issueType: (item?.issueType ?? item?.issue_type ?? "") as IssueType | "",
    severity: (item?.severity ?? "") as IssueSeverity | "",
    issueDescription: String(item?.issueDescription ?? item?.issue_description ?? ""),
    evidence: extractArray(item?.evidence).map(normalizeEvidenceImage),
    lastInspectedAt: item?.lastInspectedAt ?? item?.last_inspected_at ?? null,
  };
};

const normalizeInspection = (machineId: string, componentIds: string[], response: any): MachineInspection => {
  const payload = response?.data ?? response ?? {};
  const rawRecords = payload?.records ?? payload?.components ?? {};

  const records: Record<string, ComponentInspectionRecord> = {};
  componentIds.forEach((id) => {
    const rawRecord = Array.isArray(rawRecords)
      ? rawRecords.find((r: any) => String(r?.componentId ?? r?.component_id) === id)
      : rawRecords?.[id];
    records[id] = normalizeComponentRecord(id, rawRecord);
  });

  return {
    machineId,
    componentIds,
    records,
    isDraft: Boolean(payload?.isDraft ?? payload?.is_draft ?? false),
    isSubmitted: Boolean(payload?.isSubmitted ?? payload?.is_submitted ?? false),
    submittedAt: payload?.submittedAt ?? payload?.submitted_at ?? null,
    submittedBy: payload?.submittedBy ?? payload?.submitted_by ?? null,
  };
};

const normalizeHistoryEntry = (item: any): InspectionHistoryEntry => ({
  id: String(item?.id ?? nextId("hist")),
  machineId: String(item?.machineId ?? item?.machine_id ?? ""),
  date: String(item?.date ?? item?.inspectionDate ?? item?.inspection_date ?? ""),
  artisan: String(item?.artisan ?? item?.submittedBy ?? item?.submitted_by ?? ""),
  overallHealth: Number(item?.overallHealth ?? item?.overall_health ?? 0),
  componentsInspected: Number(item?.componentsInspected ?? item?.components_inspected ?? 0),
  totalComponents: Number(item?.totalComponents ?? item?.total_components ?? 0),
  issuesFound: Number(item?.issuesFound ?? item?.issues_found ?? 0),
  status: "Completed",
  submittedAt: String(item?.submittedAt ?? item?.submitted_at ?? ""),
});

// Maps the Redux `ArtisanMachine` (real API data, normalized in
// artisanMachineSlice.ts) into the UI-facing `Machine` shape. No dummy
// fields — anything the backend doesn't provide (e.g. a machine photo) is
// left empty and the UI falls back to an icon instead of a fake image.
const mapArtisanMachineToUiMachine = (m: ArtisanMachine): Machine => ({
  id: m.machineId,
  name: m.machineName || "Unnamed Machine",
  machineId: m.machineId,
  model: m.modelYear || "—",
  serialNumber: m.serialNumber || "—",
  imageUrl: "",
  assignedTo: m.assignedArtisanName || "",
  // This is only a starting value — the real, granular Pending / In
  // Progress / Completed state is computed from the fetched inspection
  // record's component counts (see `displayStatus` below).
  inspectionStatus: m.status === "Completed" ? "Completed" : "Pending",
  lastInspectionDate: null,
  assignment:
    m.assignedArtisanName || m.assignedArtisanId
      ? {
          operatorName: m.assignedArtisanName || "—",
          operatorId: m.assignedArtisanId || "—",
          assignedByName: m.assignedBy || "—",
          assignedByRole: "Supervisor",
          assignedDate: m.assignedOn || "—",
        }
      : null,
});

/* ============================================================================
 * 4. HELPERS
 * ========================================================================== */

const calcOverallHealth = (
  componentIds: string[],
  records: Record<string, ComponentInspectionRecord>,
): number => {
  const inspected = componentIds.map((id) => records[id]).filter((r) => r && r.status);
  if (inspected.length === 0) return 0;
  const total = inspected.reduce((sum, r) => sum + HEALTH_SCORE[r!.status as HealthStatus], 0);
  return Math.round(total / inspected.length);
};

const countByStatus = (componentIds: string[], records: Record<string, ComponentInspectionRecord>) => {
  const counts: Record<HealthStatus, number> = { Healthy: 0, Warning: 0, Critical: 0, "Not Working": 0 };
  componentIds.forEach((id) => {
    const status = records[id]?.status;
    if (status) counts[status] += 1;
  });
  return counts;
};

const healthTone = (score: number) => {
  if (score >= 80) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", ring: "stroke-emerald-500" };
  if (score >= 55) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", ring: "stroke-amber-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500", ring: "stroke-red-500" };
};

const statusPillClass = (status: MachineInspectionStatus) => {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "In Progress":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
};

const healthBadgeClass = (status: HealthStatus | null) => {
  switch (status) {
    case "Healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "Warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
    case "Not Working":
      return "border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400";
  }
};

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

/* ============================================================================
 * 5. SHARED PRIMITIVES
 * ========================================================================== */

function ProgressBar({ pct, colorClass = "bg-blue-600" }: { pct: number; colorClass?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-2 rounded-full transition-all ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-[#0b1728]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/60">
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3 className="mt-4 text-sm font-extrabold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-xs text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10">
      <AlertTriangle className="h-9 w-9 text-red-500" />
      <h3 className="mt-3 text-sm font-extrabold text-red-800 dark:text-red-300">{message}</h3>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        <RefreshCw size={14} strokeWidth={2.4} />
        Retry
      </button>
    </div>
  );
}

function SummaryCardSkeleton() {
  return <div className="h-[92px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />;
}

function MachineCardSkeleton() {
  return <div className="h-[168px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />;
}

function ComponentSkeleton() {
  return <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />;
}

function InspectionDetailsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
      <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/70" />
    </div>
  );
}

/* ---- Machine thumbnail (no dummy images — icon fallback) ------------------ */

function MachineThumb({ imageUrl, size = "h-16 w-16" }: { imageUrl: string; size?: string }) {
  if (!imageUrl) {
    return (
      <div className={`${size} shrink-0 flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-500`}>
        <Truck size={22} strokeWidth={2} />
      </div>
    );
  }
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800`}>
      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

/* ---- Image upload (used for issue evidence) ------------------------------ */

const useImageUpload = (initial: EvidenceImage[] = []) => {
  const [images, setImages] = useState<EvidenceImage[]>(initial);

  const addImages = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const incoming = Array.from(files).slice(0, MAX_IMAGES - images.length);
      const valid: EvidenceImage[] = [];

      incoming.forEach((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: only JPG, PNG or WEBP allowed`);
          return;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast.error(`${file.name}: exceeds ${MAX_IMAGE_SIZE_MB} MB limit`);
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

      if (valid.length) setImages((prev) => [...prev, ...valid].slice(0, MAX_IMAGES));
    },
    [images.length],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const reset = useCallback((next: EvidenceImage[] = []) => setImages(next), []);

  return { images, addImages, removeImage, reset, setImages };
};

function EvidenceUploader({
  images,
  onAdd,
  onRemove,
}: {
  images: EvidenceImage[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          onAdd(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
            : "border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40"
        }`}
      >
        <Upload size={20} className="text-slate-400" strokeWidth={2} />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Upload Evidence — Drag &amp; Drop or Browse
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
          >
            <ImagePlus size={14} strokeWidth={2.4} />
            Upload Photo
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
          >
            <Camera size={14} strokeWidth={2.4} />
            Take Photo
          </button>
        </div>
        <p className="text-[11px] font-medium text-slate-400">
          JPG, PNG or WEBP • Max {MAX_IMAGE_SIZE_MB}MB • Up to {MAX_IMAGES} images • {images.length}/{MAX_IMAGES} added
        </p>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        aria-label="Upload evidence photo"
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
        aria-label="Take evidence photo"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = "";
        }}
      />

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            >
              <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                aria-label={`Remove ${img.name}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-red-600"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Modal shell ----------------------------------------------------------- */

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 id="modal-title" className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. SUMMARY CARDS
 * ========================================================================== */

function SummaryCards({ summary }: { summary: InspectionSummary }) {
  const cards: { label: string; value: number; sub: string; icon: React.ElementType; tone: string }[] = [
    { label: "Total Machines", value: summary.totalMachines, sub: "Assigned to you", icon: Truck, tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" },
    { label: "Pending Inspection", value: summary.pendingInspection, sub: "Machines", icon: Clock, tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" },
    { label: "Completed Inspection", value: summary.completedInspection, sub: "Machines", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" },
    { label: "Issues Reported", value: summary.issuesReported, sub: "Needs attention", icon: AlertTriangle, tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${c.tone}`}>
            <c.icon size={18} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className="text-xl font-black leading-tight text-slate-950 dark:text-white">{c.value}</p>
            <p className="truncate text-[11px] font-semibold text-slate-400">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 7. ASSIGNED MACHINES LIST
 * ========================================================================== */

function MachineListCard({
  machine,
  inspection,
  active,
  onSelect,
}: {
  machine: Machine;
  inspection: MachineInspection | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const componentIds = inspection?.componentIds ?? [];
  const records = inspection?.records ?? {};
  const inspectedCount = componentIds.filter((id) => records[id]?.inspected).length;
  const issueCount = componentIds.filter((id) => records[id]?.issueFound).length;
  const overall = calcOverallHealth(componentIds, records);
  const tone = healthTone(overall);

  const isInProgress = inspectedCount > 0 && inspectedCount < componentIds.length;
  const displayStatus: MachineInspectionStatus = machine.inspectionStatus === "Completed" ? "Completed" : isInProgress ? "In Progress" : "Pending";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-500/20 dark:border-blue-500/50 dark:bg-blue-500/10"
          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-[#0b1728] dark:hover:border-blue-500/40"
      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
    >
      <div className="flex gap-3">
        <MachineThumb imageUrl={machine.imageUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{machine.name}</h3>
            <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Machine ID: {machine.machineId}</p>
          <span className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPillClass(displayStatus)}`}>
            {displayStatus === "Pending" ? "Inspection Pending" : displayStatus === "In Progress" ? "In Progress" : "Inspection Completed"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <User size={13} className="shrink-0 text-slate-400" />
        {machine.assignment ? (
          <span className="truncate">
            Operator: <span className="font-extrabold text-slate-700 dark:text-slate-200">{machine.assignment.operatorName}</span>
          </span>
        ) : (
          <span className="truncate italic text-slate-400">No operator assigned</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-sm font-black ${tone.text}`}>{overall}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Health</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100">
            {inspectedCount}/{componentIds.length}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Inspected</p>
        </div>
        <div>
          <p className={`text-sm font-black ${issueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100"}`}>{issueCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Issues</p>
        </div>
      </div>
    </button>
  );
}

function AssignedMachineList({
  machines,
  inspections,
  selectedId,
  onSelect,
  loading,
}: {
  machines: Machine[];
  inspections: Record<string, MachineInspection>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("All");

  const filtered = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.machineId.toLowerCase().includes(search.toLowerCase()) ||
        m.model.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const inspection = inspections[m.id];
      const componentIds = inspection?.componentIds ?? [];
      const records = inspection?.records ?? {};
      const inspectedCount = componentIds.filter((id) => records[id]?.inspected).length;
      const issueCount = componentIds.filter((id) => records[id]?.issueFound).length;
      const isInProgress = inspectedCount > 0 && inspectedCount < componentIds.length;
      const displayStatus: MachineInspectionStatus =
        m.inspectionStatus === "Completed" ? "Completed" : isInProgress ? "In Progress" : "Pending";

      switch (filter) {
        case "Pending":
          return displayStatus === "Pending";
        case "In Progress":
          return displayStatus === "In Progress";
        case "Completed":
          return displayStatus === "Completed";
        case "Issues":
          return issueCount > 0;
        default:
          return true;
      }
    });
  }, [machines, inspections, search, filter]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-950 dark:text-white">Assigned Machines</h2>

        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search machine, ID, or model..."
            aria-label="Search machines"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 hme-hide-scrollbar" role="group" aria-label="Filter machines by status">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`h-8 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${
                filter === f
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[560px] flex-1 space-y-3 overflow-y-auto p-4 hme-hide-scrollbar">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <MachineCardSkeleton key={i} />)}

        {!loading && filtered.length === 0 && (
          <EmptyState icon={Truck} title="No Machines Found" description="Try a different search term or filter." />
        )}

        {!loading &&
          filtered.map((m) => (
            <MachineListCard
              key={m.id}
              machine={m}
              inspection={inspections[m.id]}
              active={selectedId === m.id}
              onSelect={() => onSelect(m.id)}
            />
          ))}
      </div>
    </div>
  );
}

/* ============================================================================
 * 8. MACHINE DETAIL — HEADER + HEALTH DONUT
 * ========================================================================== */

function OverallHealthDonut({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  const tone = healthTone(score);

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all ${tone.ring}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black text-slate-950 dark:text-white">{score}%</span>
      </div>
    </div>
  );
}

function MachineDetailHeader({
  machine,
  inspection,
  onBack,
}: {
  machine: Machine;
  inspection: MachineInspection;
  onBack: () => void;
}) {
  const overall = calcOverallHealth(inspection.componentIds, inspection.records);
  const counts = countByStatus(inspection.componentIds, inspection.records);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 transition hover:text-blue-800 dark:text-blue-400 lg:hidden"
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
        Back to Machines
      </button>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <MachineThumb imageUrl={machine.imageUrl} size="h-20 w-20" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{machine.name}</h2>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusPillClass(machine.inspectionStatus)}`}>
                {machine.inspectionStatus}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Machine ID: {machine.machineId} • {machine.model}
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Serial No: {machine.serialNumber}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400">
              <Clock size={12} /> Last Inspection: {machine.lastInspectionDate ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <OverallHealthDonut score={overall} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Overall Machine Health</p>
            <div className="mt-1.5 space-y-1 text-xs font-bold">
              <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy <span className="text-slate-400">{counts.Healthy}</span>
              </p>
              <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Warning <span className="text-slate-400">{counts.Warning}</span>
              </p>
              <p className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Critical <span className="text-slate-400">{counts.Critical + counts["Not Working"]}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <MachineAssignmentInfo assignment={machine.assignment} />
    </div>
  );
}

function MachineAssignmentInfo({ assignment }: { assignment: MachineAssignment | null }) {
  if (!assignment) {
    return (
      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
        <User size={15} className="shrink-0 text-slate-400" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          No operator is currently assigned to this machine.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2">
      {/* Operator this machine is currently assigned to */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 dark:border-blue-500/30 dark:bg-transparent dark:text-blue-300">
          <User size={16} strokeWidth={2.3} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Assigned Operator</p>
          <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{assignment.operatorName}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {assignment.operatorId}
            {assignment.operatorPhone ? ` • ${assignment.operatorPhone}` : ""}
          </p>
        </div>
      </div>

      {/* Who assigned this operator to the machine */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400">
          <UserCog size={16} strokeWidth={2.3} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Assigned By</p>
          <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{assignment.assignedByName}</p>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck size={12} className="shrink-0" />
            {assignment.assignedByRole} • {assignment.assignedDate}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 9. COMPONENT LIST (left column of detail view)
 * ========================================================================== */

function ComponentListItem({
  def,
  record,
  active,
  onSelect,
}: {
  def: ComponentDef;
  record: ComponentInspectionRecord;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = COMPONENT_ICONS[def.icon] ?? Wrench;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? "border-blue-400 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
          : "border-transparent bg-slate-50/60 hover:bg-slate-100 dark:bg-slate-900/30 dark:hover:bg-slate-800/60"
      } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400">
        <Icon size={15} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{def.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {record.inspected ? (
            <CheckCircle2 size={12} className="text-emerald-500" />
          ) : (
            <Circle size={12} className="text-slate-300 dark:text-slate-600" />
          )}
          <span className="text-[11px] font-semibold text-slate-400">{record.inspected ? "Inspected" : "Pending"}</span>
          {record.issueFound && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
              <AlertTriangle size={11} /> Issue
            </span>
          )}
        </div>
      </div>
      {record.status && (
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${healthBadgeClass(record.status)}`}>
          {record.status}
        </span>
      )}
    </button>
  );
}

/* ============================================================================
 * 10. COMPONENT HEALTH CHECK PANEL (right column of detail view)
 * ========================================================================== */

function ComponentHealthCheck({
  def,
  record,
  onSave,
  onNavigate,
  hasNext,
  hasPrev,
  saving,
}: {
  def: ComponentDef;
  record: ComponentInspectionRecord;
  onSave: (record: ComponentInspectionRecord) => Promise<boolean>;
  onNavigate: (dir: "next" | "prev") => void;
  hasNext: boolean;
  hasPrev: boolean;
  saving: boolean;
}) {
  const [status, setStatus] = useState<HealthStatus | null>(record.status);
  const [notes, setNotes] = useState(record.notes);
  const [issueFound, setIssueFound] = useState(record.issueFound);
  const [issueType, setIssueType] = useState<IssueType | "">(record.issueType);
  const [severity, setSeverity] = useState<IssueSeverity | "">(record.severity);
  const [issueDescription, setIssueDescription] = useState(record.issueDescription);
  const { images, addImages, removeImage, reset: resetImages } = useImageUpload(record.evidence);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset local form state whenever the selected component changes.
  useEffect(() => {
    setStatus(record.status);
    setNotes(record.notes);
    setIssueFound(record.issueFound);
    setIssueType(record.issueType);
    setSeverity(record.severity);
    setIssueDescription(record.issueDescription);
    resetImages(record.evidence);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!status) next.status = "Select a current health status.";
    if (issueFound) {
      if (!issueType) next.issueType = "Select an issue type.";
      if (!severity) next.severity = "Select a severity level.";
      if (!issueDescription.trim()) next.issueDescription = "Describe the issue.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildRecord = (): ComponentInspectionRecord => ({
    componentId: def.id,
    status,
    inspected: true,
    notes: notes.trim(),
    issueFound,
    issueType: issueFound ? issueType : "",
    severity: issueFound ? severity : "",
    issueDescription: issueFound ? issueDescription.trim() : "",
    evidence: issueFound ? images : [],
    lastInspectedAt: record.lastInspectedAt,
  });

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please complete the required fields before saving.");
      return;
    }
    const ok = await onSave(buildRecord());
    if (ok) toast.success(`${def.name} saved`);
  };

  const handleSaveAndNext = async () => {
    if (!validate()) {
      toast.error("Please complete the required fields before saving.");
      return;
    }
    const ok = await onSave(buildRecord());
    if (ok) {
      toast.success(`${def.name} saved`);
      if (hasNext) onNavigate("next");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">{def.name} — Health Check</h3>
          {record.lastInspectedAt && (
            <p className="mt-0.5 text-xs font-semibold text-slate-400">Last inspected: {record.lastInspectedAt}</p>
          )}
        </div>
        {status && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${healthBadgeClass(status)}`}>{status}</span>}
      </div>

      <div className="mt-4 space-y-5">
        {/* Health status selector */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Current Status
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Component health status">
            {HEALTH_OPTIONS.map((opt) => {
              const isActive = status === opt;
              const iconMap: Record<HealthStatus, React.ElementType> = {
                Healthy: CheckCircle2,
                Warning: AlertTriangle,
                Critical: AlertTriangle,
                "Not Working": Ban,
              };
              const OptIcon = iconMap[opt];
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setStatus(opt)}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition ${
                    isActive
                      ? healthBadgeClass(opt) + " ring-2 ring-offset-1 ring-current/30"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400"
                  }`}
                >
                  <OptIcon size={14} strokeWidth={2.4} />
                  {opt}
                </button>
              );
            })}
          </div>
          {errors.status && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{errors.status}</p>}
        </div>

        {/* Inspection details */}
        <div>
          <label htmlFor={`notes-${def.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Inspection Details
          </label>
          <textarea
            id={`notes-${def.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Engine oil level normal. No abnormal noise observed. No visible leakage."
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>

        {/* Issue found toggle */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Issue Found?</label>
          <div className="flex gap-2" role="radiogroup" aria-label="Issue found">
            {[
              { label: "No", value: false },
              { label: "Yes", value: true },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={issueFound === opt.value}
                onClick={() => setIssueFound(opt.value)}
                className={`h-10 flex-1 rounded-lg border text-sm font-bold transition sm:flex-none sm:px-8 ${
                  issueFound === opt.value
                    ? opt.value
                      ? "border-red-400 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                      : "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issue form */}
        {issueFound && (
          <div className="space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4 dark:border-red-500/20 dark:bg-red-500/5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Issue Type</label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Issue type">
                {ISSUE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={issueType === opt}
                    onClick={() => setIssueType(opt)}
                    className={`h-9 rounded-lg border px-3 text-xs font-bold transition ${
                      issueType === opt
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {errors.issueType && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{errors.issueType}</p>}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Severity</label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Issue severity">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={severity === opt}
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
              {errors.severity && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{errors.severity}</p>}
            </div>

            <div>
              <label htmlFor={`issue-desc-${def.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Issue Description
              </label>
              <textarea
                id={`issue-desc-${def.id}`}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                rows={3}
                placeholder="Describe what's wrong..."
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
              {errors.issueDescription && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{errors.issueDescription}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Evidence <span className="font-medium normal-case text-slate-400">(optional)</span>
              </label>
              <EvidenceUploader images={images} onAdd={addImages} onRemove={removeImage} />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigate("prev")}
            disabled={!hasPrev}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
          >
            <ChevronLeft size={14} /> Previous
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.4} />}
            Save Component
          </button>
          <button
            type="button"
            onClick={handleSaveAndNext}
            disabled={saving || !hasNext}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            Next Component <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 11. INSPECTION PROGRESS + INCOMPLETE LIST
 * ========================================================================== */

function InspectionProgress({
  componentDefs,
  records,
}: {
  componentDefs: ComponentDef[];
  records: Record<string, ComponentInspectionRecord>;
}) {
  const total = componentDefs.length;
  const completed = componentDefs.filter((c) => records[c.id]?.inspected).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const incomplete = componentDefs.filter((c) => !records[c.id]?.inspected);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-950 dark:text-white">Inspection Progress</h3>
        <span className="text-sm font-black text-slate-800 dark:text-slate-100">
          {completed} / {total} Completed
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar pct={pct} colorClass={pct === 100 ? "bg-emerald-500" : "bg-blue-600"} />
      </div>

      {incomplete.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
            {incomplete.length} component{incomplete.length > 1 ? "s" : ""} remaining
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {incomplete.map((c) => (
              <li key={c.id} className="text-xs font-semibold text-amber-700/90 dark:text-amber-300/80">
                • {c.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 12. SUBMIT BAR + CONFIRMATION MODAL + SUCCESS STATE
 * ========================================================================== */

function SubmitBar({
  canSubmit,
  isDraft,
  saving,
  onSaveDraft,
  onSubmit,
}: {
  canSubmit: boolean;
  isDraft: boolean;
  saving: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#07111f]/95 sm:mx-0 sm:rounded-2xl sm:border sm:shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {canSubmit
            ? "All components inspected — ready to submit."
            : isDraft
              ? "Draft saved. Continue inspecting remaining components."
              : "Complete all component inspections to enable submission."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
          >
            <FileText size={15} strokeWidth={2.3} />
            Save as Draft
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || saving}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            <CheckCircle2 size={15} strokeWidth={2.3} />
            Submit Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitConfirmationModal({
  machine,
  componentDefs,
  records,
  onCancel,
  onConfirm,
  submitting,
}: {
  machine: Machine;
  componentDefs: ComponentDef[];
  records: Record<string, ComponentInspectionRecord>;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const counts = countByStatus(
    componentDefs.map((c) => c.id),
    records,
  );
  const issues = componentDefs.filter((c) => records[c.id]?.issueFound).length;

  return (
    <ModalShell title="Submit Pre-Start Inspection?" subtitle={machine.name} onClose={onCancel}>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
        You have completed all required component inspections.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{counts.Healthy}</p>
          <p className="text-[11px] font-bold text-emerald-700/80 dark:text-emerald-300/80">Healthy</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-lg font-black text-amber-700 dark:text-amber-300">{counts.Warning}</p>
          <p className="text-[11px] font-bold text-amber-700/80 dark:text-amber-300/80">Warning</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-lg font-black text-red-700 dark:text-red-300">{counts.Critical + counts["Not Working"]}</p>
          <p className="text-[11px] font-bold text-red-700/80 dark:text-red-300/80">Critical</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{issues}</p>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Issues Reported</p>
        </div>
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        Once submitted, the inspection will be marked as completed.
      </p>

      <ModalFooter>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-70"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Submit Inspection
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">{children}</div>;
}

function SubmissionSuccessCard({
  machine,
  entry,
  onBackToMachines,
  onViewInspection,
}: {
  machine: Machine;
  entry: InspectionHistoryEntry;
  onBackToMachines: () => void;
  onViewInspection: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10 sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-600 dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-300">
        <CheckCircle2 size={28} strokeWidth={2.3} />
      </div>
      <h2 className="mt-4 text-lg font-black text-emerald-800 dark:text-emerald-300">Inspection Submitted Successfully</h2>

      <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-x-6 gap-y-3 text-left">
        <InfoPair label="Machine" value={machine.name} />
        <InfoPair label="Inspection Status" value="Completed" />
        <InfoPair label="Inspected Components" value={`${entry.componentsInspected} / ${entry.totalComponents}`} />
        <InfoPair label="Issues Reported" value={String(entry.issuesFound)} />
        <InfoPair label="Overall Health" value={`${entry.overallHealth}%`} />
        <InfoPair label="Submitted By" value={entry.artisan} />
        <InfoPair label="Submitted At" value={entry.submittedAt} />
      </div>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onBackToMachines}
          className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
        >
          Back to Machines
        </button>
        <button
          type="button"
          onClick={onViewInspection}
          className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          View Inspection
        </button>
      </div>
    </div>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

/* ============================================================================
 * 13. ISSUES REPORTED TAB
 * ========================================================================== */

function ReportedIssuesTab({ componentDefs, records }: { componentDefs: ComponentDef[]; records: Record<string, ComponentInspectionRecord> }) {
  const issues = componentDefs
    .map((def) => ({ def, record: records[def.id] }))
    .filter((x) => x.record?.issueFound);

  if (issues.length === 0) {
    return <EmptyState icon={CheckCircle2} title="No Issues Reported" description="All inspected components are currently healthy." />;
  }

  return (
    <div className="space-y-3">
      {issues.map(({ def, record }) => (
        <div key={def.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{def.name}</h4>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severityBadgeClass(record.severity)}`}>
              {record.severity || "—"}
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{record.issueType}</p>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{record.issueDescription}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400">Reported: {record.lastInspectedAt ?? "—"}</p>
            {record.evidence.length > 0 && (
              <div className="flex -space-x-2">
                {record.evidence.slice(0, 4).map((img) => (
                  <img
                    key={img.id}
                    src={img.previewUrl}
                    alt="Evidence"
                    className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-[#101f33]"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 14. INSPECTION HISTORY TAB
 * ========================================================================== */

function InspectionHistoryTab({ history, loading }: { history: InspectionHistoryEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ComponentSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return <EmptyState icon={History} title="No Inspection History" description="Completed inspections for this machine will appear here." />;
  }

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{h.date}</p>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {h.status}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <InfoPair label="Overall Health" value={`${h.overallHealth}%`} />
            <InfoPair label="Components" value={`${h.componentsInspected}/${h.totalComponents}`} />
            <InfoPair label="Issues" value={String(h.issuesFound)} />
            <InfoPair label="Artisan" value={h.artisan} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-400">Submitted: {h.submittedAt}</p>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 15. MACHINE DETAIL — ORCHESTRATOR (tabs + component list + health check)
 * ========================================================================== */

function MachineDetail({
  machine,
  componentDefs,
  inspection,
  onBack,
  onInspectionChange,
  loadingComponents,
}: {
  machine: Machine;
  componentDefs: ComponentDef[];
  inspection: MachineInspection;
  onBack: () => void;
  onInspectionChange: (next: MachineInspection) => void;
  loadingComponents: boolean;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("inspection");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(componentDefs[0]?.id ?? null);
  const [savingComponent, setSavingComponent] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successEntry, setSuccessEntry] = useState<InspectionHistoryEntry | null>(null);
  const [history, setHistory] = useState<InspectionHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setSelectedComponentId((prev) => (prev && componentDefs.some((c) => c.id === prev) ? prev : componentDefs[0]?.id ?? null));
    setSuccessEntry(null);
    setActiveTab("inspection");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.id]);

  useEffect(() => {
    if (activeTab !== "history") return;
    let cancelled = false;
    setHistoryLoading(true);
    inspectionService
      .getInspectionHistory(machine.id)
      .then((res: any) => {
        if (!cancelled) setHistory(extractArray(res).map(normalizeHistoryEntry));
      })
      .catch(() => {
        if (!cancelled) toast.error("Unable to load inspection history.");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, machine.id]);

  const selectedIndex = componentDefs.findIndex((c) => c.id === selectedComponentId);
  const selectedDef = selectedIndex >= 0 ? componentDefs[selectedIndex] : null;
  const selectedRecord = selectedDef ? inspection.records[selectedDef.id] ?? blankRecord(selectedDef.id) : null;

  const completedCount = componentDefs.filter((c) => inspection.records[c.id]?.inspected).length;
  const canSubmit = componentDefs.length > 0 && completedCount === componentDefs.length;
  const issueCount = componentDefs.filter((c) => inspection.records[c.id]?.issueFound).length;

  const handleSaveComponent = async (record: ComponentInspectionRecord): Promise<boolean> => {
    setSavingComponent(true);
    try {
      const res = await inspectionService.saveComponentInspection(machine.id, record);
      const saved = normalizeComponentRecord(record.componentId, res?.data ?? res ?? record);
      const nextInspection: MachineInspection = {
        ...inspection,
        records: { ...inspection.records, [record.componentId]: saved },
      };
      onInspectionChange(nextInspection);
      return true;
    } catch {
      toast.error("Unable to save inspection. Please try again.");
      return false;
    } finally {
      setSavingComponent(false);
    }
  };

  const handleNavigate = (dir: "next" | "prev") => {
    if (selectedIndex < 0) return;
    const nextIndex = dir === "next" ? selectedIndex + 1 : selectedIndex - 1;
    if (nextIndex >= 0 && nextIndex < componentDefs.length) {
      setSelectedComponentId(componentDefs[nextIndex].id);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const draft: MachineInspection = { ...inspection, isDraft: true };
      await inspectionService.saveInspectionDraft(machine.id, draft);
      onInspectionChange(draft);
      toast.success("Draft saved");
    } catch {
      toast.error("Unable to save inspection. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await inspectionService.submitInspection(machine.id, inspection);
      const entry = normalizeHistoryEntry(res?.data ?? res ?? {});
      onInspectionChange({ ...inspection, isDraft: false, isSubmitted: true });
      setConfirmOpen(false);
      setSuccessEntry(entry);
    } catch {
      toast.error("Inspection could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successEntry) {
    return (
      <SubmissionSuccessCard
        machine={machine}
        entry={successEntry}
        onBackToMachines={onBack}
        onViewInspection={() => {
          setSuccessEntry(null);
          setActiveTab("history");
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <MachineDetailHeader machine={machine} inspection={inspection} onBack={onBack} />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#0b1728]" role="tablist">
        {(
          [
            { key: "inspection", label: "Component Inspection", icon: ListChecks },
            { key: "issues", label: `Issues Reported${issueCount ? ` (${issueCount})` : ""}`, icon: AlertTriangle },
            { key: "history", label: "Inspection History", icon: History },
          ] as { key: DetailTab; label: string; icon: React.ElementType }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <tab.icon size={14} strokeWidth={2.3} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inspection" && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr] lg:items-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Components ({componentDefs.length})
              </h3>
              <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1 hme-hide-scrollbar">
                {loadingComponents
                  ? Array.from({ length: 6 }).map((_, i) => <ComponentSkeleton key={i} />)
                  : componentDefs.map((def) => (
                      <ComponentListItem
                        key={def.id}
                        def={def}
                        record={inspection.records[def.id] ?? blankRecord(def.id)}
                        active={selectedComponentId === def.id}
                        onSelect={() => setSelectedComponentId(def.id)}
                      />
                    ))}
              </div>
            </div>

            {loadingComponents || !selectedDef || !selectedRecord ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
                <InspectionDetailsSkeleton />
              </div>
            ) : (
              <ComponentHealthCheck
                key={selectedDef.id}
                def={selectedDef}
                record={selectedRecord}
                onSave={handleSaveComponent}
                onNavigate={handleNavigate}
                hasNext={selectedIndex < componentDefs.length - 1}
                hasPrev={selectedIndex > 0}
                saving={savingComponent}
              />
            )}
          </div>

          <InspectionProgress componentDefs={componentDefs} records={inspection.records} />

          <SubmitBar
            canSubmit={canSubmit}
            isDraft={inspection.isDraft}
            saving={savingDraft || submitting}
            onSaveDraft={handleSaveDraft}
            onSubmit={() => {
              if (!canSubmit) {
                toast.error("Please complete all required component inspections before submitting.");
                return;
              }
              setConfirmOpen(true);
            }}
          />
        </>
      )}

      {activeTab === "issues" && <ReportedIssuesTab componentDefs={componentDefs} records={inspection.records} />}

      {activeTab === "history" && <InspectionHistoryTab history={history} loading={historyLoading} />}

      {confirmOpen && (
        <SubmitConfirmationModal
          machine={machine}
          componentDefs={componentDefs}
          records={inspection.records}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirmSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * 16. PAGE HEADER
 * ========================================================================== */

function PageHeader({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            aria-label="Back to Artisan Dashboard"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0b1728] dark:text-slate-400"
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">Pre-Start Inspection</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            Inspect assigned machines and update component health before operation.
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Notifications"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0b1728] dark:text-slate-400"
      >
        <Bell size={16} strokeWidth={2.3} />
      </button>
    </div>
  );
}

/* ============================================================================
 * 17. PAGE — ArtisanPreStartInspection
 * ========================================================================== */

const ArtisanPreStartInspection: React.FC = () => {
  const [componentDefsByMachine, setComponentDefsByMachine] = useState<Record<string, ComponentDef[]>>({});
  const [inspections, setInspections] = useState<Record<string, MachineInspection>>({});
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  const {
    machines: rawMachines,
    loading: loadingMachines,
    error,
  } = useSelector((state: RootState) => state.artisanMachine);

  // Map the real Redux data into the shape the UI below expects. No dummy
  // fields are introduced here — see `mapArtisanMachineToUiMachine`.
  const machines: Machine[] = useMemo(
    () => rawMachines.map(mapArtisanMachineToUiMachine),
    [rawMachines],
  );

  const loadMachines = useCallback(() => {
    dispatch(fetchArtisanAssignedMachines(undefined));
  }, [dispatch]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const loadMachineDetail = useCallback(async (machineId: string) => {
    setLoadingDetail(true);
    try {
      const [componentsRes, inspectionRes] = await Promise.all([
        inspectionService.getMachineComponents(machineId),
        inspectionService.getMachineInspection(machineId),
      ]);

      const defs = extractArray(componentsRes).map(normalizeComponentDef);
      const inspection = normalizeInspection(
        machineId,
        defs.map((d) => d.id),
        inspectionRes,
      );

      setComponentDefsByMachine((prev) => ({ ...prev, [machineId]: defs }));
      setInspections((prev) => ({ ...prev, [machineId]: inspection }));
    } catch {
      toast.error("Unable to load machine inspection details.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleSelectMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
    if (!inspections[machineId]) {
      loadMachineDetail(machineId);
    }
  };

  // Pre-warm inspection summaries for every assigned machine so the list +
  // summary cards reflect real progress even before a machine has been
  // opened. Prefetch failures are logged (not toasted) so opening dozens of
  // machines with a flaky connection doesn't spam the user with toasts —
  // explicitly opening a machine (loadMachineDetail above) still toasts.
  useEffect(() => {
    if (loadingMachines || machines.length === 0) return;
    machines.forEach((m) => {
      if (inspections[m.id] || componentDefsByMachine[m.id]) return;
      Promise.all([
        inspectionService.getMachineComponents(m.id),
        inspectionService.getMachineInspection(m.id),
      ])
        .then(([componentsRes, inspectionRes]) => {
          const defs = extractArray(componentsRes).map(normalizeComponentDef);
          const inspection = normalizeInspection(m.id, defs.map((d) => d.id), inspectionRes);
          setComponentDefsByMachine((prev) => (prev[m.id] ? prev : { ...prev, [m.id]: defs }));
          setInspections((prev) => (prev[m.id] ? prev : { ...prev, [m.id]: inspection }));
        })
        .catch((err) => {
          console.error(`Unable to prefetch inspection for machine ${m.id}`, err);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMachines, machines]);

  const summary: InspectionSummary = useMemo(() => {
    const totalMachines = machines.length;
    const pendingInspection = machines.filter((m) => m.inspectionStatus === "Pending").length;
    const completedInspection = machines.filter((m) => m.inspectionStatus === "Completed").length;
    const issuesReported = Object.values(inspections).reduce(
      (sum, insp) => sum + insp.componentIds.filter((id) => insp.records[id]?.issueFound).length,
      0,
    );
    return { totalMachines, pendingInspection, completedInspection, issuesReported };
  }, [machines, inspections]);

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) ?? null;
  const selectedComponentDefs = selectedMachineId ? componentDefsByMachine[selectedMachineId] ?? [] : [];
  const selectedInspection = selectedMachineId ? inspections[selectedMachineId] : undefined;

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <style>{`
        .hme-hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hme-hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-6">
        <PageHeader onBackToDashboard={selectedMachineId ? () => setSelectedMachineId(null) : undefined} />

        {loadingMachines ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SummaryCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <SummaryCards summary={summary} />
        )}

        {error && !loadingMachines ? (
          <ErrorState message={error} onRetry={loadMachines} />
        ) : !loadingMachines && machines.length === 0 ? (
          <EmptyState icon={Truck} title="No Machines Assigned" description="There are currently no machines assigned to you." />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr] lg:items-start">
            <div className={selectedMachineId ? "hidden lg:block" : "block"}>
              <AssignedMachineList
                machines={machines}
                inspections={inspections}
                selectedId={selectedMachineId}
                onSelect={handleSelectMachine}
                loading={loadingMachines}
              />
            </div>

            <div className={selectedMachineId ? "block" : "hidden lg:flex lg:items-center lg:justify-center"}>
              {selectedMachine && selectedInspection ? (
                <MachineDetail
                  machine={selectedMachine}
                  componentDefs={selectedComponentDefs}
                  inspection={selectedInspection}
                  loadingComponents={loadingDetail}
                  onBack={() => setSelectedMachineId(null)}
                  onInspectionChange={(next) =>
                    setInspections((prev) => ({ ...prev, [next.machineId]: next }))
                  }
                />
              ) : selectedMachineId && loadingDetail ? (
                <div className="space-y-5">
                  <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                </div>
              ) : (
                <EmptyState
                  icon={Wrench}
                  title="Select a Machine"
                  description="Choose a machine from the list to start or continue its pre-start inspection."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtisanPreStartInspection;