import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Loader2,
  MoreVertical,
  X,
  ClipboardList,
  UserCheck,
  Settings2,
  Wrench,
  Clock3,
  CheckCircle2,
  RefreshCw,
  Eye,
  Pencil,
  AlertCircle,
} from "lucide-react";

import AppSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination";
import { showErrorToast } from "../../utils/toastUtils";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import ImagePreviewModal from "../../components/common/ImagePreviewModal";
import StorageService from "../../services/storage.service";
import { isReadOnlyRole } from "../../components/common/permissions";

import {
  userService,
  normalizeUsersResponse,
} from "../../services/Auth/userService";
import {
  jobCardService,
  resolveJobCardFileUrl,
  type JobCard,
  type JobCardStatus,
  type JobCardPriority,
  type JobCardMaintenanceType,
  type JobCardStatusSummary,
  type CreateJobCardPayload,
  type UpdateJobCardPayload,
} from "../../services/Job card/jobCardService";

const STATUS_OPTIONS: JobCardStatus[] = [
  "DRAFT",
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "WAITING_FOR_APPROVAL",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
];

const PRIORITY_OPTIONS: JobCardPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

const MAINTENANCE_TYPE_OPTIONS: JobCardMaintenanceType[] = [
  "PREVENTIVE",
  "CORRECTIVE",
  "BREAKDOWN",
  "INSPECTION",
  "REBUILD",
  "COMPONENT_REPLACEMENT",
];

const STATUS_META: Record<JobCardStatus, { label: string; badge: string }> = {
  DRAFT: {
    label: "Draft",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  OPEN: {
    label: "Open",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  ASSIGNED: {
    label: "Assigned",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
  WAITING_FOR_PARTS: {
    label: "Waiting for Parts",
    badge:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  },
  WAITING_FOR_APPROVAL: {
    label: "Waiting for Approval",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  COMPLETED: {
    label: "Completed",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  CLOSED: {
    label: "Closed",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  },
};

const PRIORITY_META: Record<JobCardPriority, { label: string; badge: string }> =
  {
    LOW: {
      label: "Low",
      badge:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    MEDIUM: {
      label: "Medium",
      badge:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    HIGH: {
      label: "High",
      badge:
        "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    },
    CRITICAL: {
      label: "Critical",
      badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    },
  };

const MAINTENANCE_TYPE_META: Record<
  JobCardMaintenanceType,
  { label: string; badge: string }
> = {
  PREVENTIVE: {
    label: "Preventive",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  CORRECTIVE: {
    label: "Corrective",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  BREAKDOWN: {
    label: "Breakdown",
    badge: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  INSPECTION: {
    label: "Inspection",
    badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  },
  REBUILD: {
    label: "Rebuild",
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  },
  COMPONENT_REPLACEMENT: {
    label: "Component Replacement",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const SUMMARY_CARD_CONFIG: Array<{
  key: keyof JobCardStatusSummary;
  label: string;
  icon: typeof ClipboardList;
  iconBg: string;
  iconColor: string;
}> = [
  {
    key: "open",
    label: "Open",
    icon: ClipboardList,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "assigned",
    label: "Assigned",
    icon: UserCheck,
    iconBg: "bg-orange-50 dark:bg-orange-950/40",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: Settings2,
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
  },
  {
    key: "waitingParts",
    label: "Waiting for Parts",
    icon: Wrench,
    iconBg: "bg-purple-50 dark:bg-purple-950/40",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "waitingApproval",
    label: "Waiting for Approval",
    icon: Clock3,
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "closed",
    label: "Closed",
    icon: CheckCircle2,
    iconBg: "bg-teal-50 dark:bg-teal-950/40",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface StaffOption {
  id: string;
  name: string;
}

interface MachineOption {
  id: string;
  name: string;
  serialNumber?: string;
}

interface ComponentOption {
  id: string;
  label: string;
}

interface JobCardFormState {
  machineId: string;
  title: string;
  componentId: string;
  description: string;
  maintenanceType: JobCardMaintenanceType;
  priority: JobCardPriority;
  plannedStartDate: string;
  plannedFinishDate: string;
  assignedTechnicianId: string;
  assignedSupervisorId: string;
  assignedPlannerId: string;
  allocatedLaborHours: string;
  laborRate: string;
}

const EMPTY_FORM: JobCardFormState = {
  machineId: "",
  title: "",
  componentId: "",
  description: "",
  maintenanceType: "PREVENTIVE",
  priority: "MEDIUM",
  plannedStartDate: "",
  plannedFinishDate: "",
  assignedTechnicianId: "",
  assignedSupervisorId: "",
  assignedPlannerId: "",
  allocatedLaborHours: "",
  laborRate: "",
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function extractRoleName(user: any): string {
  const raw =
    typeof user.role === "string"
      ? user.role
      : (user.role?.name ??
        user.role?.role ??
        user.role?.value ??
        user.role_name ??
        user.roleName ??
        "");
  return String(raw).toLowerCase().trim();
}

function extractUserName(user: any, index: number): string {
  const first = user.firstName || user.first_name || "";
  const last = user.lastName || user.last_name || "";
  return `${first} ${last}`.trim() || user.name || `User ${index + 1}`;
}

function extractMachinesList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.machines)) return res.machines;
  return [];
}

function extractComponentsList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.components)) return res.components;
  return [];
}

function StatusBadge({ status }: { status: JobCardStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: JobCardPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function MaintenanceTypeBadge({ type }: { type: JobCardMaintenanceType }) {
  const meta = MAINTENANCE_TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function ArtisanAvatar({ name }: { name?: string | null }) {
  if (!name) {
    return (
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
        Unassigned
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        {name}
      </span>
    </div>
  );
}

function RowActionsMenu({
  onView,
  onEdit,
  onApprove,
  canApprove,
  approving,
  readOnly,
}: {
  onView: () => void;
  onEdit: () => void;
  onApprove: () => void;
  canApprove: boolean;
  approving: boolean;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_WIDTH = 160;

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 120;

    setMenuPos({
      top: openUpward ? rect.top - 8 : rect.bottom + 4,
      left: rect.right - MENU_WIDTH,
    });
  }, []);

  const handleToggle = () => {
    if (!open) calculatePosition();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleReposition = () => calculatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, calculatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreVertical size={16} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
            }}
            className="z-[999999] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Eye size={14} /> View Details
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Pencil size={14} /> Edit
              </button>
            )}

            {!readOnly && (
              <button
                type="button"
                disabled={!canApprove || approving}
                onClick={() => {
                  if (!canApprove || approving) return;
                  setOpen(false);
                  onApprove();
                }}
                title={
                  canApprove
                    ? "Approve this job card"
                    : "Only available when the job card is Waiting for Approval"
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:disabled:text-slate-600"
              >
                {approving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Approve
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function JobCardFormModal({
  mode,
  initialMachine,
  machines,
  technicians,
  supervisors,
  planners,
  onClose,
  onSubmit,
  submitting,
}: {
  mode: "create" | "edit";
  initialMachine?: { id: string; name: string; serialNumber?: string } | null;
  machines: MachineOption[];
  technicians: StaffOption[];
  supervisors: StaffOption[];
  planners: StaffOption[];
  onClose: () => void;
  onSubmit: (
    payload: CreateJobCardPayload | UpdateJobCardPayload,
  ) => Promise<void>;
  submitting: boolean;
}) {
  const [form, setForm] = useState<JobCardFormState>(EMPTY_FORM);
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(false);

  useEffect(() => {
    if (mode === "edit" && initialMachine) {
      setForm((prev) => ({ ...prev, machineId: initialMachine.id }));
    }
  }, [mode, initialMachine]);

  const activeMachineId =
    mode === "edit" ? (initialMachine?.id ?? "") : form.machineId;

  useEffect(() => {
    if (!activeMachineId) {
      setComponents([]);
      return;
    }
    let cancelled = false;
    setLoadingComponents(true);
    componentService
      .getComponentsByMachineId(activeMachineId)
      .then((res: any) => {
        if (cancelled) return;
        const list = extractComponentsList(res);
        setComponents(
          list.map((c: any) => ({
            id: c.id,
            label: c.name || c.description || c.serialNumber || "Component",
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setComponents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComponents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMachineId]);

  const machineOptions = useMemo(
    () =>
      machines.map((m) => ({
        label: m.serialNumber ? `${m.name} (${m.serialNumber})` : m.name,
        value: m.id,
      })),
    [machines],
  );

  const componentOptions = useMemo(
    () => [
      { label: "No component", value: "" },
      ...components.map((c) => ({ label: c.label, value: c.id })),
    ],
    [components],
  );

  const staffOptions = (list: StaffOption[], emptyLabel: string) => [
    { label: emptyLabel, value: "" },
    ...list.map((s) => ({ label: s.name, value: s.id })),
  ];

  const handleChange = <K extends keyof JobCardFormState>(
    field: K,
    value: JobCardFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (mode === "create" && !form.machineId) {
      showErrorToast("Please select a machine");
      return;
    }
    if (!form.title.trim()) {
      showErrorToast("Please enter a job card title");
      return;
    }

    const basePayload: Record<string, unknown> = {
      title: form.title.trim(),
      maintenanceType: form.maintenanceType,
      priority: form.priority,
    };

    if (form.componentId) basePayload.componentId = form.componentId;
    if (form.description.trim())
      basePayload.description = form.description.trim();
    if (form.plannedStartDate)
      basePayload.plannedStartDate = form.plannedStartDate;
    if (form.plannedFinishDate)
      basePayload.plannedFinishDate = form.plannedFinishDate;
    if (form.assignedTechnicianId)
      basePayload.assignedTechnicianId = form.assignedTechnicianId;
    if (form.allocatedLaborHours)
      basePayload.allocatedLaborHours = Number(form.allocatedLaborHours);
    if (form.laborRate) basePayload.laborRate = Number(form.laborRate);

    if (mode === "create") {
      basePayload.machineId = form.machineId;
    }

    await onSubmit(basePayload as CreateJobCardPayload | UpdateJobCardPayload);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {mode === "create" ? "Create Job Card" : "Edit Job Card"}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {mode === "create"
                ? "Log a new maintenance job card"
                : "Update job card details"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3.5 overflow-y-auto p-5 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mode === "create" ? (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Machine *
              </label>
              <AppSelect
                value={form.machineId}
                options={machineOptions}
                placeholder="Select a machine"
                onChange={(val: string) => handleChange("machineId", val)}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Machine
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {initialMachine?.serialNumber
                  ? `${initialMachine.name} (${initialMachine.serialNumber})`
                  : initialMachine?.name}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Hydraulic Leak Repair"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the work to be performed..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Component
            </label>
            <AppSelect
              value={form.componentId}
              options={componentOptions}
              placeholder={
                loadingComponents
                  ? "Loading components..."
                  : "Select a component (optional)"
              }
              onChange={(val: string) => handleChange("componentId", val)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Maintenance Type
              </label>
              <AppSelect
                value={form.maintenanceType}
                options={MAINTENANCE_TYPE_OPTIONS.map((t) => ({
                  label: MAINTENANCE_TYPE_META[t].label,
                  value: t,
                }))}
                onChange={(val: string) =>
                  handleChange("maintenanceType", val as JobCardMaintenanceType)
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Priority
              </label>
              <AppSelect
                value={form.priority}
                options={PRIORITY_OPTIONS.map((p) => ({
                  label: PRIORITY_META[p].label,
                  value: p,
                }))}
                onChange={(val: string) =>
                  handleChange("priority", val as JobCardPriority)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Planned Start Date
              </label>
              <input
                type="date"
                value={form.plannedStartDate}
                onChange={(e) =>
                  handleChange("plannedStartDate", e.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Planned Finish Date
              </label>
              <input
                type="date"
                value={form.plannedFinishDate}
                onChange={(e) =>
                  handleChange("plannedFinishDate", e.target.value)
                }
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Artisan *
            </label>
            <AppSelect
              value={form.assignedTechnicianId}
              options={staffOptions(technicians, "Unassigned")}
              onChange={(val: string) =>
                handleChange("assignedTechnicianId", val)
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Allocated Labour Hours
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.allocatedLaborHours}
                onChange={(e) =>
                  handleChange("allocatedLaborHours", e.target.value)
                }
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Labour Rate (per hour)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.laborRate}
                onChange={(e) => handleChange("laborRate", e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B37E6] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {mode === "create" ? "Create Job Card" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobCardDetailModal({
  jobCard,
  onClose,
  onApprove,
  approving,
  onPreviewImage,
  readOnly,
}: {
  jobCard: JobCard;
  onClose: () => void;
  onApprove: () => void;
  approving: boolean;
  onPreviewImage: (imageUrl: string) => void;
  readOnly: boolean;
}) {
  const canApprove = jobCard.status === "WAITING_FOR_APPROVAL";
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="font-mono text-[11px] font-bold text-slate-400">
              {jobCard.jobCardNumber}
            </p>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {jobCard.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={jobCard.status} />
            <PriorityBadge priority={jobCard.priority} />
            <MaintenanceTypeBadge type={jobCard.maintenanceType} />
          </div>

          {jobCard.description && (
            <p className="rounded-xl bg-slate-50 p-3 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {jobCard.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Machine
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {jobCard.machine?.name || "—"}
              </p>
              <p className="text-[11px] text-slate-500">
                {jobCard.machine?.serialNumber}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Component
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {jobCard.component?.description || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Artisan
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {jobCard.assignedTechnicianName || "Unassigned"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Supervisor
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {jobCard.assignedSupervisorName || "Unassigned"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Planned Start
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(jobCard.plannedStartDate)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Planned Finish
              </p>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(jobCard.plannedFinishDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-950">
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {jobCard.parts.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Parts
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-950">
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {jobCard.findings.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Findings
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-950">
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {jobCard.attachments.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Attachments
              </p>
            </div>
          </div>

          {(jobCard.rootCause ||
            jobCard.correctiveAction ||
            jobCard.postRepairCondition ||
            Number(jobCard.downtimeHours) > 0) && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Repair Report
              </p>
              <div className="space-y-2">
                {jobCard.rootCause && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400">
                      Root Cause
                    </p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {jobCard.rootCause}
                    </p>
                  </div>
                )}
                {jobCard.correctiveAction && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400">
                      Corrective Action
                    </p>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {jobCard.correctiveAction}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {jobCard.postRepairCondition && (
                    <span>
                      Condition after repair:{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {jobCard.postRepairCondition} / 5
                      </strong>
                    </span>
                  )}
                  {Number(jobCard.downtimeHours) > 0 && (
                    <span>
                      Downtime:{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {Number(jobCard.downtimeHours)}h
                      </strong>
                    </span>
                  )}
                  {Number(jobCard.actualLaborHours) > 0 && (
                    <span>
                      Labour logged:{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {Number(jobCard.actualLaborHours)}h
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Parts Used ({jobCard.parts.length})
            </p>
            {jobCard.parts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-slate-800">
                No parts recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {jobCard.parts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {p.partName}{" "}
                      <span className="font-normal text-slate-400">
                        × {p.quantity}
                      </span>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {Number(p.totalCost).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Findings ({jobCard.findings.length})
            </p>
            {jobCard.findings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-slate-800">
                No findings recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {jobCard.findings.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {f.parameterName}
                      {f.measuredValue && (
                        <span className="font-normal text-slate-400">
                          {" "}
                          · {f.measuredValue}
                          {f.unit ? ` ${f.unit}` : ""}
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-bold ${
                        f.status === "PASS"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {f.status === "PASS" ? "Pass" : "Fail"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Attachments ({jobCard.attachments.length})
            </p>
            {jobCard.attachments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-slate-800">
                No photos or files attached yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {jobCard.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                      {a.fileName}
                      <span className="font-normal text-slate-400">
                        {" "}
                        · {a.fileType.replace(/_/g, " ")}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onPreviewImage(resolveJobCardFileUrl(a.fileUrl))
                      }
                      className="shrink-0 font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Labour Time Log ({jobCard.laborLogs.length})
            </p>
            {jobCard.laborLogs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-slate-800">
                No time logged yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {jobCard.laborLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {log.artisanName || "Artisan"}
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                      {log.endTime
                        ? `${((log.durationMinutes ?? 0) / 60).toFixed(1)}h`
                        : "Running"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Labour Cost
              </p>
              <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                {Number(jobCard.laborCost).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Cost
              </p>
              <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                {Number(jobCard.totalCost).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
          {!readOnly && (
            <button
              type="button"
              disabled={!canApprove || approving}
              onClick={onApprove}
              title={
                canApprove
                  ? "Approve this job card"
                  : "Only available when the job card is Waiting for Approval"
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              {approving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobCardsPage() {
  const navigate = useNavigate();
  const readOnly = isReadOnlyRole(StorageService.getRole());

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [summary, setSummary] = useState<JobCardStatusSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] =
    useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [componentFilter, setComponentFilter] = useState<string>("all");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [technicians, setTechnicians] = useState<StaffOption[]>([]);
  const [supervisors, setSupervisors] = useState<StaffOption[]>([]);
  const [planners, setPlanners] = useState<StaffOption[]>([]);
  const [filterComponents, setFilterComponents] = useState<ComponentOption[]>(
    [],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editingJobCard, setEditingJobCard] = useState<JobCard | null>(null);
  const [viewingJobCard, setViewingJobCard] = useState<JobCard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    Promise.allSettled([
      machineService.getCompanyMachines(),
      userService.getUsers({ limit: 100 }),
    ]).then(([machinesRes, usersRes]) => {
      if (machinesRes.status === "fulfilled") {
        const list = extractMachinesList(machinesRes.value);
        setMachines(
          list.map((m: any) => ({
            id: m.id,
            name: m.name || m.model || "Machine",
            serialNumber: m.serialNumber,
          })),
        );
      }

      if (usersRes.status === "fulfilled") {
        const users = normalizeUsersResponse(usersRes.value as any);
        const buildList = (keyword: string): StaffOption[] =>
          users
            .filter((u: any) => extractRoleName(u).includes(keyword))
            .map((u: any, idx: number) => ({
              id: u.id,
              name: extractUserName(u, idx),
            }));

        setTechnicians(buildList("artisan"));
        setSupervisors(buildList("supervisor"));
        setPlanners(buildList("engineer"));
      }
    });
  }, []);

  useEffect(() => {
    if (machineFilter === "all") {
      setFilterComponents([]);
      setComponentFilter("all");
      return;
    }
    let cancelled = false;
    componentService
      .getComponentsByMachineId(machineFilter)
      .then((res: any) => {
        if (cancelled) return;
        const list = extractComponentsList(res);
        setFilterComponents(
          list.map((c: any) => ({
            id: c.id,
            label: c.name || c.description || c.serialNumber || "Component",
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setFilterComponents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [machineFilter]);

  const fetchJobCards = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await jobCardService.getJobCards({
        status:
          statusFilter === "all" ? undefined : (statusFilter as JobCardStatus),
        maintenanceType:
          maintenanceTypeFilter === "all"
            ? undefined
            : (maintenanceTypeFilter as JobCardMaintenanceType),
        priority:
          priorityFilter === "all"
            ? undefined
            : (priorityFilter as JobCardPriority),
        machineId: machineFilter === "all" ? undefined : machineFilter,
        componentId: componentFilter === "all" ? undefined : componentFilter,
        search: search || undefined,
        page,
        limit,
      });
      setJobCards([...response.data.items]);
      setSummary(response.data.summary);
      setTotal(response.data.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load job cards";
      setLoadError(message);
      setJobCards([]);
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    maintenanceTypeFilter,
    priorityFilter,
    machineFilter,
    componentFilter,
    search,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchJobCards();
  }, [fetchJobCards]);

  const machineFilterOptions = useMemo(
    () => [
      { label: "All Machines", value: "all" },
      ...machines.map((m) => ({
        label: m.serialNumber ? `${m.name} (${m.serialNumber})` : m.name,
        value: m.id,
      })),
    ],
    [machines],
  );

  const componentFilterOptions = useMemo(
    () => [
      {
        label:
          machineFilter === "all" ? "Select a machine first" : "All Components",
        value: "all",
      },
      ...filterComponents.map((c) => ({ label: c.label, value: c.id })),
    ],
    [filterComponents, machineFilter],
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setMaintenanceTypeFilter("all");
    setPriorityFilter("all");
    setMachineFilter("all");
    setComponentFilter("all");
    setPage(1);
  };

 const handleCreate = async (payload: CreateJobCardPayload) => {
  if (readOnly) return;

  setSubmitting(true);
    try {
      await jobCardService.createJobCard(payload);
      setCreateOpen(false);
      fetchJobCards();
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Failed to create job card",
      );
    } finally {
      setSubmitting(false);
    }
  };

 const handleUpdate = async (payload: UpdateJobCardPayload) => {
  if (readOnly) return;
  if (!editingJobCard) return;

  setSubmitting(true);

    try {
      await jobCardService.updateJobCard(editingJobCard.id, payload);
      setEditingJobCard(null);
      fetchJobCards();
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update job card",
      );
    } finally {
      setSubmitting(false);
    }
  };

const handleApprove = async (jobCard: JobCard) => {
  if (readOnly) return;
  if (jobCard.status !== "WAITING_FOR_APPROVAL") return;

  setApprovingId(jobCard.id);


    try {
      await jobCardService.approveJobCard(jobCard.id);
      fetchJobCards();
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Failed to approve job card",
      );
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 font-sans md:p-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] shadow-lg">
        <div className="flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              <ClipboardList size={14} />
              Maintenance Workflow
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Job Card Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Create, assign, and track every maintenance job card from start to
              close-out.
            </p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-[#3730D9] shadow-md transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                <Plus size={16} /> Create Job Card
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SUMMARY_CARD_CONFIG.map(
          ({ key, label, icon: Icon, iconBg, iconColor }) => (
            <div
              key={key}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
              >
                <Icon size={18} className={iconColor} />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {summary ? (
                  summary[key]
                ) : loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  0
                )}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {label}
              </p>
            </div>
          ),
        )}
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search job card number, title..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <AppSelect
              value={statusFilter}
              options={[
                { label: "All Statuses", value: "all" },
                ...STATUS_OPTIONS.map((s) => ({
                  label: STATUS_META[s].label,
                  value: s,
                })),
              ]}
              onChange={(val: string) => {
                setStatusFilter(val);
                setPage(1);
              }}
            />
          </div>

          <div>
            <AppSelect
              value={maintenanceTypeFilter}
              options={[
                { label: "All Types", value: "all" },
                ...MAINTENANCE_TYPE_OPTIONS.map((t) => ({
                  label: MAINTENANCE_TYPE_META[t].label,
                  value: t,
                })),
              ]}
              onChange={(val: string) => {
                setMaintenanceTypeFilter(val);
                setPage(1);
              }}
            />
          </div>

          <div>
            <AppSelect
              value={priorityFilter}
              options={[
                { label: "All Priorities", value: "all" },
                ...PRIORITY_OPTIONS.map((p) => ({
                  label: PRIORITY_META[p].label,
                  value: p,
                })),
              ]}
              onChange={(val: string) => {
                setPriorityFilter(val);
                setPage(1);
              }}
            />
          </div>

          <div>
            <AppSelect
              value={machineFilter}
              options={machineFilterOptions}
              onChange={(val: string) => {
                setMachineFilter(val);
                setComponentFilter("all");
                setPage(1);
              }}
            />
          </div>

          <div>
            <AppSelect
              value={componentFilter}
              options={componentFilterOptions}
              onChange={(val: string) => {
                setComponentFilter(val);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 w-full rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-[#081226]/95">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  #
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Job Card No.
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Title / Description
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Machine
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Component
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Planned Dates
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assigned Artisan
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Loading job cards...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : jobCards.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                  >
                    No job cards found matching your filters.
                  </td>
                </tr>
              ) : (
                jobCards.map((jc, idx) => (
                  <tr
                    key={jc.id}
                    className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-slate-400">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {jc.jobCardNumber}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {jc.title}
                      </p>
                      {jc.description && (
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {jc.description}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {jc.machine?.name || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {jc.machine?.serialNumber}
                      </p>
                    </td>
                    <td className="max-w-[160px] px-4 py-3">
                      <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {jc.component?.description || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <MaintenanceTypeBadge type={jc.maintenanceType} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PriorityBadge priority={jc.priority} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={jc.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {formatDate(jc.plannedStartDate)} →{" "}
                      {formatDate(jc.plannedFinishDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ArtisanAvatar name={jc.assignedTechnicianName} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <RowActionsMenu
                        onView={() => setViewingJobCard(jc)}
                        onEdit={() => setEditingJobCard(jc)}
                        onApprove={() => handleApprove(jc)}
                        canApprove={jc.status === "WAITING_FOR_APPROVAL"}
                        approving={approvingId === jc.id}
                        readOnly={readOnly}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {startItem} to {endItem} of {total} job cards
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onPrev={() => setPage((p) => Math.max(p - 1, 1))}
            onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
            itemsPerPage={limit}
            onItemsPerPageChange={(val: number | "all") => {
              if (val === "all") return;
              setLimit(val);
              setPage(1);
            }}
            totalItems={total}
            startItem={startItem}
            endItem={endItem}
          />
        </div>
      </div>

      {createOpen && (
        <JobCardFormModal
          mode="create"
          machines={machines}
          technicians={technicians}
          supervisors={supervisors}
          planners={planners}
          onClose={() => setCreateOpen(false)}
          onSubmit={
            handleCreate as (
              payload: CreateJobCardPayload | UpdateJobCardPayload,
            ) => Promise<void>
          }
          submitting={submitting}
        />
      )}

      {editingJobCard && (
        <JobCardFormModal
          mode="edit"
          initialMachine={
            editingJobCard.machine
              ? {
                  id: editingJobCard.machine.id,
                  name: editingJobCard.machine.name,
                  serialNumber:
                    editingJobCard.machine.serialNumber ?? undefined,
                }
              : null
          }
          machines={machines}
          technicians={technicians}
          supervisors={supervisors}
          planners={planners}
          onClose={() => setEditingJobCard(null)}
          onSubmit={
            handleUpdate as (
              payload: CreateJobCardPayload | UpdateJobCardPayload,
            ) => Promise<void>
          }
          submitting={submitting}
        />
      )}

      {viewingJobCard && (
        <JobCardDetailModal
          jobCard={viewingJobCard}
          onClose={() => setViewingJobCard(null)}
          onApprove={() => handleApprove(viewingJobCard)}
          approving={approvingId === viewingJobCard.id}
          onPreviewImage={setPreviewImage}
          readOnly={readOnly}
        />
      )}

      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
