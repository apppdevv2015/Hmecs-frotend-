import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ImageIcon,
  Info,
  MoreVertical,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

/* ============================================================================
 * TYPES
 * ==========================================================================*/

type MachineStatus = "In Progress" | "Completed" | "Pending";
type HealthStatus = "Good" | "Warning" | "Critical";
type ToastType = "success" | "error";
type OverallCondition = "Good" | "Needs Attention" | "Critical";
type IssuesObserved = "yes" | "no";

interface MachineComponentItem {
  id: string;
  name: string;
  subComponents: number;
  health: number;
  reading: string;
}

interface Machine {
  id: string;
  name: string;
  subtitle: string;
  lastInspection: string;
  status: MachineStatus;
  image: string;
  machineType: string;
  serialNumber: string;
  model: string;
  location: string;
  assignedOperator: string;
  assignedOperatorPhone: string;
  assignedBy: string;
  assignDate: string;
  shift: string;
  startHour: string;
  workLocation: string;
  description: string;
  components: MachineComponentItem[];
}

interface ToastState {
  type: ToastType;
  message: string;
}

interface ComponentSummary {
  good: number;
  warning: number;
  critical: number;
  total: number;
  avg: number;
  overallStatus: HealthStatus;
}

/* ============================================================================
 * DUMMY DATA — shaped like the future API envelope
 * BACKEND TODO: replace with workOrderService.getAssignedMachines() /
 * workOrderService.getMachine(:machineId) / workOrderService.submitWorkOrder()
 * ==========================================================================*/

const INITIAL_MACHINES: Machine[] = [
  {
    id: "CAT-777-DEMO",
    name: "CAT-777-DEMO",
    subtitle: "Haul Truck",
    lastInspection: "19 Aug 2025",
    status: "In Progress",
    image:
      "https://placehold.co/240x160/1d4ed8/ffffff?text=Haul+Truck",
    machineType: "Haul Truck",
    serialNumber: "CAT777X12345",
    model: "777F",
    location: "HME Site - Pit 2",
    assignedOperator: "Rakesh Kumar",
    assignedOperatorPhone: "+91 98765 43210",
    assignedBy: "Supervisor",
    assignDate: "18 Aug 2025, 08:30 AM",
    shift: "Day Shift",
    startHour: "10:15 AM",
    workLocation: "HME Site - Pit 2",
    description:
      "Hydraulic system check, engine oil leakage inspection and brake system verification performed.",
    components: [
      {
        id: "hyd",
        name: "Hydraulic System",
        subComponents: 3,
        health: 20,
        reading: "Leakage detected",
      },
      {
        id: "eng",
        name: "Engine System",
        subComponents: 3,
        health: 80,
        reading: "14520 hrs",
      },
      {
        id: "brk",
        name: "Brake System",
        subComponents: 2,
        health: 20,
        reading: "Brake wear high",
      },
    ],
  },
  {
    id: "HME-EX-001",
    name: "HME-EX-001",
    subtitle: "Excavator 210",
    lastInspection: "18 Aug 2025",
    status: "Completed",
    image: "https://placehold.co/240x160/15803d/ffffff?text=Excavator",
    machineType: "Excavator",
    serialNumber: "EX210X98231",
    model: "210 GC",
    location: "HME Site - Pit 1",
    assignedOperator: "Suresh Yadav",
    assignedOperatorPhone: "+91 90123 44556",
    assignedBy: "Supervisor",
    assignDate: "17 Aug 2025, 07:50 AM",
    shift: "Day Shift",
    startHour: "08:05 AM",
    workLocation: "HME Site - Pit 1",
    description: "Routine after-shift inspection completed, no major faults found.",
    components: [
      { id: "eng", name: "Engine System", subComponents: 3, health: 88, reading: "9820 hrs" },
      { id: "hyd", name: "Hydraulic System", subComponents: 3, health: 74, reading: "Normal" },
    ],
  },
  {
    id: "HME-WL-002",
    name: "HME-WL-002",
    subtitle: "Wheel Loader 950",
    lastInspection: "17 Aug 2025",
    status: "Completed",
    image: "https://placehold.co/240x160/b45309/ffffff?text=Wheel+Loader",
    machineType: "Wheel Loader",
    serialNumber: "WL950X44120",
    model: "950M",
    location: "HME Yard - Central",
    assignedOperator: "Vikram Singh",
    assignedOperatorPhone: "+91 99887 65432",
    assignedBy: "Supervisor",
    assignDate: "16 Aug 2025, 06:40 AM",
    shift: "Night Shift",
    startHour: "02:10 PM",
    workLocation: "HME Yard - Central",
    description: "Tyre pressure and transmission fluid checked, topped up as needed.",
    components: [
      { id: "tyre", name: "Tyre", subComponents: 4, health: 82, reading: "Normal" },
      { id: "trans", name: "Transmission", subComponents: 2, health: 90, reading: "Normal" },
    ],
  },
  {
    id: "HME-DZ-003",
    name: "HME-DZ-003",
    subtitle: "Bulldozer D6",
    lastInspection: "16 Aug 2025",
    status: "In Progress",
    image: "https://placehold.co/240x160/b91c1c/ffffff?text=Bulldozer",
    machineType: "Bulldozer",
    serialNumber: "DZ6X77812",
    model: "D6T",
    location: "Field Site - North Quarry",
    assignedOperator: "Anil Mehta",
    assignedOperatorPhone: "+91 91234 56780",
    assignedBy: "Supervisor",
    assignDate: "15 Aug 2025, 09:10 AM",
    shift: "Day Shift",
    startHour: "09:40 AM",
    workLocation: "Field Site - North Quarry",
    description: "Undercarriage inspection in progress, tension check pending.",
    components: [
      { id: "undc", name: "Undercarriage", subComponents: 3, health: 55, reading: "Wear noted" },
      { id: "eng", name: "Engine System", subComponents: 3, health: 91, reading: "6110 hrs" },
    ],
  },
  {
    id: "HME-GR-004",
    name: "HME-GR-004",
    subtitle: "Grader 140K",
    lastInspection: "15 Aug 2025",
    status: "Pending",
    image: "https://placehold.co/240x160/475569/ffffff?text=Grader",
    machineType: "Grader",
    serialNumber: "GR140X33019",
    model: "140K",
    location: "HME Site - Pit 2",
    assignedOperator: "Deepak Rana",
    assignedOperatorPhone: "+91 90000 11223",
    assignedBy: "Supervisor",
    assignDate: "15 Aug 2025, 06:00 AM",
    shift: "Day Shift",
    startHour: "--:-- --",
    workLocation: "HME Site - Pit 2",
    description: "",
    components: [
      { id: "blade", name: "Blade & Circle", subComponents: 2, health: 68, reading: "Normal" },
      { id: "eng", name: "Engine System", subComponents: 3, health: 76, reading: "3320 hrs" },
    ],
  },
];

const STATUS_OPTIONS: string[] = ["All Status", "In Progress", "Completed", "Pending"];
const COMPONENT_FILTER_OPTIONS: string[] = ["All Components", "Good", "Warning", "Critical"];
const WORK_LOCATION_OPTIONS: string[] = [
  "HME Site - Pit 2",
  "HME Site - Pit 1",
  "HME Yard - Central",
  "Field Site - North Quarry",
];

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

function healthStatus(health: number): HealthStatus {
  if (health >= 70) return "Good";
  if (health >= 40) return "Warning";
  return "Critical";
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case "Good":
    case "Completed":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "Warning":
    case "In Progress":
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
    case "Critical":
    case "Pending":
      return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function healthBarColor(health: number): string {
  if (health >= 70) return "bg-emerald-500";
  if (health >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function parseClock(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec((label || "").trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3];
  if (/pm/i.test(ap) && h !== 12) h += 12;
  if (/am/i.test(ap) && h === 12) h = 0;
  return h * 60 + mm;
}

function formatDuration(mins: number | null): string {
  if (mins == null || mins < 0) return "--:--";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/* ============================================================================
 * RESPONSIVE CUSTOM DROPDOWN — AppSelect (used everywhere instead of <select>)
 * ==========================================================================*/

interface AppSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  className?: string;
}

function AppSelect({ value, options, onChange, icon, className = "" }: AppSelectProps) {
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{value}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                opt === value
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="truncate">{opt}</span>
              {opt === value && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * SMALL UI PRIMITIVES
 * ==========================================================================*/

interface DetailFieldProps {
  label: string;
  value: ReactNode;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

interface ToastProps {
  toast: ToastState | null;
}

function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed bottom-5 right-5 z-[2147483647] flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-lg ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
    >
      {isError ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      {toast.message}
    </div>
  );
}

/* ============================================================================
 * COMPONENT UPDATE MODAL
 * ==========================================================================*/

interface ComponentUpdateModalProps {
  component: MachineComponentItem;
  onClose: () => void;
  onSave: (updated: MachineComponentItem) => void;
}

function ComponentUpdateModal({ component, onClose, onSave }: ComponentUpdateModalProps) {
  const [health, setHealth] = useState<number>(component.health);
  const [reading, setReading] = useState<string>(component.reading);
  const status = healthStatus(health);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483647 }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">{component.name}</h3>
            <p className="mt-0.5 text-xs font-medium text-blue-100">
              {component.subComponents} sub-components
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Health</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{health}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={health}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setHealth(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-blue-600"
          />
          <div className="mt-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(status)}`}>
              {status}
            </span>
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Current Reading / Note
            </label>
            <input
              type="text"
              value={reading}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setReading(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              placeholder="e.g. Leakage detected, 14520 hrs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...component, health, reading })}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            Save Component
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================================
 * MAIN PAGE
 * ==========================================================================*/

export default function ArtisanWorkOrderCapture() {
  // BACKEND TODO: replace with GET /artisan/assigned-machines
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_MACHINES[0].id);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All Status");
  const [componentFilter, setComponentFilter] = useState<string>("All Components");
  const [overallCondition, setOverallCondition] = useState<OverallCondition>("Critical");
  const [issuesObserved, setIssuesObserved] = useState<IssuesObserved>("yes");
  const [updateTarget, setUpdateTarget] = useState<MachineComponentItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [endHour, setEndHour] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMachine: Machine = useMemo(
    () => machines.find((m) => m.id === selectedId) || machines[0],
    [machines, selectedId]
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  function updateMachine(id: string, patch: Partial<Machine>) {
    setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  const filteredMachines: Machine[] = useMemo(() => {
    return machines.filter((m) => {
      const matchesSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        m.subtitle.toLowerCase().includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "All Status" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [machines, search, statusFilter]);

  const componentSummary: ComponentSummary = useMemo(() => {
    const comps = selectedMachine.components;
    const good = comps.filter((c) => healthStatus(c.health) === "Good").length;
    const warning = comps.filter((c) => healthStatus(c.health) === "Warning").length;
    const critical = comps.filter((c) => healthStatus(c.health) === "Critical").length;
    const avg = comps.length
      ? Math.round(comps.reduce((s, c) => s + c.health, 0) / comps.length)
      : 0;
    const overallStatus: HealthStatus = critical > 0 ? "Critical" : warning > 0 ? "Warning" : "Good";
    return { good, warning, critical, total: comps.length, avg, overallStatus };
  }, [selectedMachine]);

  const donutGradient: string = useMemo(() => {
    const total = componentSummary.total || 1;
    const goodPct = (componentSummary.good / total) * 100;
    const warnPct = (componentSummary.warning / total) * 100;
    const critPct = (componentSummary.critical / total) * 100;
    const p1 = goodPct;
    const p2 = p1 + warnPct;
    const p3 = p2 + critPct;
    return `conic-gradient(#10b981 0% ${p1}%, #f59e0b ${p1}% ${p2}%, #f43f5e ${p2}% ${p3}%, #e2e8f0 ${p3}% 100%)`;
  }, [componentSummary]);

  const visibleComponents: MachineComponentItem[] = useMemo(() => {
    if (componentFilter === "All Components") return selectedMachine.components;
    return selectedMachine.components.filter((c) => healthStatus(c.health) === componentFilter);
  }, [selectedMachine, componentFilter]);

  const totalWorkingMinutes: number | null = useMemo(() => {
    if (!endHour) return null;
    const start = parseClock(selectedMachine.startHour);
    const end = parseClock(endHour);
    if (start == null || end == null) return null;
    return end >= start ? end - start : end + 24 * 60 - start;
  }, [endHour, selectedMachine.startHour]);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateMachine(selectedMachine.id, { image: url });
    setToast({ type: "success", message: "Machine image updated." });
  }

  function handleSaveDraft() {
    setToast({ type: "success", message: "Draft saved for " + selectedMachine.id + "." });
  }

  function handleSubmit() {
    if (!selectedMachine.description.trim()) {
      setToast({ type: "error", message: "Add a work description before submitting." });
      return;
    }
    const end = nowLabel();
    setEndHour(end);
    updateMachine(selectedMachine.id, { status: "Completed" });
    setToast({ type: "success", message: "Work order submitted for " + selectedMachine.id + "." });
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800 dark:bg-slate-950/90">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Work Order Capture (Post Inspection)
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">
            Capture work order with components, sub-components, parts, images &amp; details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Send className="h-3.5 w-3.5" />
            Submit Work Order
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:p-8">
        {/* ── LEFT: ASSIGNED MACHINES ── */}
        <div className="w-full shrink-0 lg:w-[300px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Assigned Machines</h2>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search machine..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>

            <div className="mt-2.5">
              <AppSelect value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
            </div>

            <div className="hme-hide-scrollbar mt-3 max-h-[520px] space-y-2.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-320px)]">
              {filteredMachines.map((m) => {
                const active = m.id === selectedMachine.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id);
                      setEndHour(null);
                    }}
                    className={`flex w-full gap-3 rounded-xl border p-2.5 text-left transition ${
                      active
                        ? "border-blue-400 bg-blue-50/60 ring-1 ring-blue-200 dark:border-blue-700 dark:bg-blue-950/30 dark:ring-blue-900"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <img
                      src={m.image}
                      alt={m.name}
                      className="h-16 w-20 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {m.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{m.subtitle}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Last Inspection
                        <br />
                        {m.lastInspection}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                          m.status
                        )}`}
                      >
                        {m.status}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredMachines.length === 0 && (
                <p className="px-2 py-6 text-center text-xs font-semibold text-slate-400">
                  No machines match your search.
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400 dark:border-slate-800">
              <span>
                Showing {filteredMachines.length} of {machines.length} machines
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All Status");
                }}
                className="flex items-center gap-1 font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: MAIN FORM ── */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* 1. MACHINE DETAILS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Machine Details
              </h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative shrink-0 self-start">
                <img
                  src={selectedMachine.image}
                  alt={selectedMachine.name}
                  className="h-40 w-64 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm transition hover:bg-white"
                >
                  <ImageIcon className="h-3 w-3" />
                  Change Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedMachine.id}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                      selectedMachine.status
                    )}`}
                  >
                    {selectedMachine.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5 sm:grid-cols-3">
                  <DetailField label="Machine Type" value={selectedMachine.machineType} />
                  <DetailField label="Serial Number" value={selectedMachine.serialNumber} />
                  <DetailField label="Model" value={selectedMachine.model} />
                  <DetailField label="Machine ID" value={selectedMachine.id} />
                  <DetailField label="Location" value={selectedMachine.location} />
                  <DetailField
                    label="Assigned Operator"
                    value={
                      <span className="flex items-center gap-1.5">
                        {selectedMachine.assignedOperator}
                        <a
                          href={`tel:${selectedMachine.assignedOperatorPhone}`}
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      </span>
                    }
                  />
                  <DetailField label="Assigned By" value={selectedMachine.assignedBy} />
                  <DetailField label="Assign Date" value={selectedMachine.assignDate} />
                  <DetailField label="Shift" value={selectedMachine.shift} />
                </div>
              </div>
            </div>
          </section>

          {/* 2. WORK TIME */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">2. Work Time</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  Start Hour (Auto)
                </span>
                <p className="mt-1.5 text-base font-black text-emerald-600 dark:text-emerald-400">
                  {selectedMachine.startHour}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-rose-500" />
                  End Hour (Auto)
                </span>
                <p className="mt-1.5 text-base font-black text-slate-400">
                  {endHour || "--:-- --"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Total Working Hours (Auto)
                </span>
                <p className="mt-1.5 text-base font-black text-slate-400">
                  {formatDuration(totalWorkingMinutes)}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Start hour is captured automatically when pre-inspection is completed. End hour and
              total working hours are captured automatically on submission.
            </p>
          </section>

          {/* 3. WORK DETAILS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
              3. Work Details
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Work Location <span className="text-rose-500">*</span>
                </label>
                <div className="mt-1.5">
                  <AppSelect
                    value={selectedMachine.workLocation}
                    options={WORK_LOCATION_OPTIONS}
                    onChange={(v) => updateMachine(selectedMachine.id, { workLocation: v })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Work Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={selectedMachine.description}
                  maxLength={500}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    updateMachine(selectedMachine.id, { description: e.target.value })
                  }
                  rows={3}
                  placeholder="Describe the work performed..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {selectedMachine.description.length}/500
                </p>
              </div>
            </div>
          </section>

          {/* 4. COMPONENT UPDATE */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                4. Component Update
              </h2>
              <AppSelect
                value={componentFilter}
                options={COMPONENT_FILTER_OPTIONS}
                onChange={setComponentFilter}
                className="!w-auto sm:min-w-[170px]"
              />
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-3 lg:w-52">
                <p className="self-start text-xs font-bold text-slate-500 dark:text-slate-400">
                  Component Overview
                </p>
                <div
                  className="relative flex h-32 w-32 items-center justify-center rounded-full"
                  style={{ background: donutGradient }}
                >
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {componentSummary.avg}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      Overall Health
                    </span>
                    <span
                      className={`mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${statusBadgeClasses(
                        componentSummary.overallStatus
                      )}`}
                    >
                      {componentSummary.overallStatus}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-1.5 text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Good / Healthy
                    </span>
                    <span className="text-slate-900 dark:text-white">{componentSummary.good}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Warning
                    </span>
                    <span className="text-slate-900 dark:text-white">{componentSummary.warning}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical
                    </span>
                    <span className="text-slate-900 dark:text-white">{componentSummary.critical}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Total Components</span>
                    <span className="text-slate-900 dark:text-white">{componentSummary.total}</span>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="hme-hide-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                        <th className="py-2.5 pr-4">Component</th>
                        <th className="py-2.5 pr-4">Sub Components</th>
                        <th className="py-2.5 pr-4">Health</th>
                        <th className="py-2.5 pr-4">Status</th>
                        <th className="py-2.5 pr-4">Current Reading</th>
                        <th className="py-2.5 pl-0 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleComponents.map((c) => {
                        const status = healthStatus(c.health);
                        return (
                          <tr
                            key={c.id}
                            className="border-b border-slate-50 last:border-b-0 dark:border-slate-800/60"
                          >
                            <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-white">
                              <span className="flex items-center gap-2">
                                <Wrench className="h-3.5 w-3.5 text-slate-400" />
                                {c.name}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                              {c.subComponents}
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className={`h-full ${healthBarColor(c.health)}`}
                                    style={{ width: `${c.health}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                  {c.health}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                                  status
                                )}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                              {c.reading}
                            </td>
                            <td className="py-3.5 pl-0 text-right">
                              <button
                                onClick={() => setUpdateTarget(c)}
                                className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/40"
                              >
                                Update
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleComponents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No components match this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Click on Update to view and edit this component's condition.
                </p>
              </div>
            </div>
          </section>

          {/* 5. WORK INSPECTION & ISSUES */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
              5. Work Inspection &amp; Issues
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Overall Machine Condition <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: "Good", icon: ShieldCheck, color: "emerald" },
                      { key: "Needs Attention", icon: ShieldAlert, color: "amber" },
                      { key: "Critical", icon: XCircle, color: "rose" },
                    ] as const
                  ).map(({ key, icon: Icon, color }) => {
                    const active = overallCondition === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setOverallCondition(key)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-[11px] font-bold transition ${
                          active
                            ? color === "emerald"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                              : color === "amber"
                              ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-500/10"
                              : "border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-500/10"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Any Issues Observed? <span className="text-rose-500">*</span>
                </label>
                <div className="mt-2 flex items-center gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="radio"
                      name="issuesObserved"
                      checked={issuesObserved === "yes"}
                      onChange={() => setIssuesObserved("yes")}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Yes
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="radio"
                      name="issuesObserved"
                      checked={issuesObserved === "no"}
                      onChange={() => setIssuesObserved("no")}
                      className="h-4 w-4 accent-blue-600"
                    />
                    No
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* 6. FINAL SUBMISSION */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
              6. Final Submission
            </h2>
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Please review all details before submitting. Once submitted, it will be recorded in
              the system.
            </div>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Work Order
              </button>
            </div>
          </section>
        </div>
      </div>

      {updateTarget && (
        <ComponentUpdateModal
          component={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSave={(updated: MachineComponentItem) => {
            updateMachine(selectedMachine.id, {
              components: selectedMachine.components.map((c) =>
                c.id === updated.id ? updated : c
              ),
            });
            setUpdateTarget(null);
            setToast({ type: "success", message: updated.name + " updated." });
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}