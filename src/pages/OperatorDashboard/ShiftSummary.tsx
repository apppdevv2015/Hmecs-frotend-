import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  HeartPulse,
  ImageIcon,
  ListChecks,
  Truck,
  X,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

/* ============================================================================
 * TYPES
 * ==========================================================================*/

type MachineStatus = "Healthy" | "Warning" | "Critical";
type IssueSeverity = "Low" | "Medium" | "High";
type IssueStatus =
  | "Reported"
  | "Acknowledged"
  | "Assigned"
  | "In Progress"
  | "Resolved"
  | "Closed";
type ShiftRowStatus = "Completed" | "In Progress" | "Missed";

interface ComponentHealth {
  name: string;
  pre: number;
  after: number;
  status: MachineStatus;
  issue?: string;
}

interface Attachment {
  name: string;
  url: string;
}

interface MachineOperation {
  machineId: string;
  machineName: string;
  startTime: string;
  endTime: string;
  operatingHours: string;
  preHealth: number;
  afterHealth: number;
  status: MachineStatus;
  preInspection: "Completed" | "Pending";
  afterInspection: "Completed" | "Pending";
  components: ComponentHealth[];
  attachments?: Attachment[];
}

interface IssueLifecycleStep {
  status: IssueStatus;
  by?: string;
  at?: string;
}

interface IssueReport {
  id: string;
  time: string;
  machineId: string;
  component: string;
  issue: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  lifecycle: IssueLifecycleStep[];
  attachments?: Attachment[];
}

interface ShiftRecord {
  id: string;
  date: string;
  shiftLabel: string;
  shiftTime: string;
  operator: string;
  machines: MachineOperation[];
  issues: IssueReport[];
  status: ShiftRowStatus;
}

/* ============================================================================
 * DUMMY DATA — shaped like the future API envelope
 * BACKEND TODO: replace with shiftSummaryService.getShifts({ from, to, shiftType })
 * ==========================================================================*/

const CURRENT_SHIFT: ShiftRecord = {
  id: "SHIFT-20260819-M",
  date: "19 Aug 2026",
  shiftLabel: "Morning Shift",
  shiftTime: "06:00 AM - 02:00 PM",
  operator: "Raj Kumar",
  status: "In Progress",
  machines: [
    {
      machineId: "WL-102",
      machineName: "Wheel Loader WL-102",
      startTime: "06:15 AM",
      endTime: "10:30 AM",
      operatingHours: "4h 15m",
      preHealth: 91,
      afterHealth: 86,
      status: "Warning",
      preInspection: "Completed",
      afterInspection: "Completed",
      components: [
        { name: "Engine", pre: 94, after: 92, status: "Healthy" },
        {
          name: "Hydraulic System",
          pre: 87,
          after: 78,
          status: "Warning",
          issue: "Low Pressure",
        },
        { name: "Tyre", pre: 82, after: 82, status: "Healthy" },
        { name: "Transmission", pre: 90, after: 88, status: "Healthy" },
      ],
      attachments: [
        { name: "Pre-shift inspection.jpg", url: "https://placehold.co/400x300/dbeafe/1d4ed8?text=Pre-Shift" },
        { name: "Hydraulic hose.jpg", url: "https://placehold.co/400x300/fef3c7/b45309?text=Hydraulic+Hose" },
      ],
    },
    {
      machineId: "EX-205",
      machineName: "Excavator EX-205",
      startTime: "10:45 AM",
      endTime: "02:00 PM",
      operatingHours: "3h 15m",
      preHealth: 88,
      afterHealth: 84,
      status: "Healthy",
      preInspection: "Completed",
      afterInspection: "Completed",
      components: [
        {
          name: "Engine",
          pre: 90,
          after: 81,
          status: "Warning",
          issue: "High Temperature",
        },
        { name: "Hydraulic System", pre: 85, after: 83, status: "Healthy" },
        { name: "Tyre", pre: 88, after: 88, status: "Healthy" },
        { name: "Suspension", pre: 86, after: 85, status: "Healthy" },
      ],
      attachments: [
        { name: "After-shift check.jpg", url: "https://placehold.co/400x300/dcfce7/15803d?text=After-Shift" },
      ],
    },
  ],
  issues: [
    {
      id: "ISS-4471",
      time: "09:20 AM",
      machineId: "WL-102",
      component: "Hydraulic System",
      issue: "Low Pressure",
      description:
        "Hydraulic pressure dropped below the safe operating threshold during loading. Operator paused work and reported immediately.",
      severity: "Medium",
      status: "Resolved",
      reportedBy: "Raj Kumar",
      reportedAt: "09:20 AM",
      assignedTo: "Amit Sharma",
      resolvedBy: "Amit Sharma",
      resolvedAt: "10:05 AM",
      lifecycle: [
        { status: "Reported", by: "Raj Kumar", at: "09:20 AM" },
        { status: "Acknowledged", by: "Supervisor Desk", at: "09:24 AM" },
        { status: "Assigned", by: "Amit Sharma", at: "09:30 AM" },
        { status: "In Progress", by: "Amit Sharma", at: "09:35 AM" },
        { status: "Resolved", by: "Amit Sharma", at: "10:05 AM" },
      ],
      attachments: [
        { name: "Low pressure gauge.jpg", url: "https://placehold.co/400x300/fee2e2/b91c1c?text=Gauge+Reading" },
      ],
    },
    {
      id: "ISS-4478",
      time: "11:40 AM",
      machineId: "EX-205",
      component: "Engine",
      issue: "High Temperature",
      description:
        "Engine temperature gauge crossed the warning band while hauling. Machine kept running under reduced load.",
      severity: "High",
      status: "In Progress",
      reportedBy: "Raj Kumar",
      reportedAt: "11:40 AM",
      assignedTo: "—",
      lifecycle: [
        { status: "Reported", by: "Raj Kumar", at: "11:40 AM" },
        { status: "Acknowledged", by: "Supervisor Desk", at: "11:44 AM" },
      ],
      attachments: [
        { name: "Temperature reading.jpg", url: "https://placehold.co/400x300/fee2e2/b91c1c?text=Engine+Temp" },
      ],
    },
  ],
};

const SHIFT_HISTORY: ShiftRecord[] = [
  CURRENT_SHIFT,
  {
    id: "SHIFT-20260818-N",
    date: "18 Aug 2026",
    shiftLabel: "Night Shift",
    shiftTime: "02:00 PM - 10:00 PM",
    operator: "Raj Kumar",
    status: "Completed",
    machines: [
      {
        machineId: "WL-102",
        machineName: "Wheel Loader WL-102",
        startTime: "02:10 PM",
        endTime: "07:40 PM",
        operatingHours: "5h 30m",
        preHealth: 93,
        afterHealth: 85,
        status: "Warning",
        preInspection: "Completed",
        afterInspection: "Completed",
        components: [
          { name: "Engine", pre: 95, after: 93, status: "Healthy" },
          { name: "Hydraulic System", pre: 90, after: 79, status: "Warning" },
          { name: "Tyre", pre: 84, after: 83, status: "Healthy" },
          { name: "Transmission", pre: 91, after: 89, status: "Healthy" },
        ],
      },
    ],
    issues: [
      {
        id: "ISS-4460",
        time: "05:12 PM",
        machineId: "WL-102",
        component: "Hydraulic System",
        issue: "Seal Wear Detected",
        description: "Minor hydraulic seal wear flagged during routine check.",
        severity: "Low",
        status: "Resolved",
        reportedBy: "Raj Kumar",
        reportedAt: "05:12 PM",
        assignedTo: "Vikram Singh",
        resolvedBy: "Vikram Singh",
        resolvedAt: "06:00 PM",
        lifecycle: [
          { status: "Reported", by: "Raj Kumar", at: "05:12 PM" },
          { status: "Acknowledged", by: "Supervisor Desk", at: "05:15 PM" },
          { status: "Assigned", by: "Vikram Singh", at: "05:20 PM" },
          { status: "In Progress", by: "Vikram Singh", at: "05:25 PM" },
          { status: "Resolved", by: "Vikram Singh", at: "06:00 PM" },
        ],
      },
    ],
  },
  {
    id: "SHIFT-20260818-M",
    date: "18 Aug 2026",
    shiftLabel: "Morning Shift",
    shiftTime: "06:00 AM - 02:00 PM",
    operator: "Raj Kumar",
    status: "Completed",
    machines: [
      {
        machineId: "EX-205",
        machineName: "Excavator EX-205",
        startTime: "06:20 AM",
        endTime: "12:30 PM",
        operatingHours: "6h 10m",
        preHealth: 91,
        afterHealth: 88,
        status: "Healthy",
        preInspection: "Completed",
        afterInspection: "Completed",
        components: [
          { name: "Engine", pre: 92, after: 90, status: "Healthy" },
          { name: "Hydraulic System", pre: 89, after: 87, status: "Healthy" },
          { name: "Tyre", pre: 90, after: 89, status: "Healthy" },
          { name: "Suspension", pre: 88, after: 86, status: "Healthy" },
        ],
      },
    ],
    issues: [
      {
        id: "ISS-4452",
        time: "08:05 AM",
        machineId: "EX-205",
        component: "Tyre",
        issue: "Pressure Slightly Low",
        description: "Tyre pressure slightly below recommended range, topped up on site.",
        severity: "Low",
        status: "Resolved",
        reportedBy: "Raj Kumar",
        reportedAt: "08:05 AM",
        assignedTo: "Amit Sharma",
        resolvedBy: "Amit Sharma",
        resolvedAt: "08:40 AM",
        lifecycle: [
          { status: "Reported", by: "Raj Kumar", at: "08:05 AM" },
          { status: "Acknowledged", by: "Supervisor Desk", at: "08:08 AM" },
          { status: "Assigned", by: "Amit Sharma", at: "08:12 AM" },
          { status: "In Progress", by: "Amit Sharma", at: "08:15 AM" },
          { status: "Resolved", by: "Amit Sharma", at: "08:40 AM" },
        ],
      },
    ],
  },
  {
    id: "SHIFT-20260817-N",
    date: "17 Aug 2026",
    shiftLabel: "Night Shift",
    shiftTime: "02:00 PM - 10:00 PM",
    operator: "Raj Kumar",
    status: "Completed",
    machines: [
      {
        machineId: "WL-102",
        machineName: "Wheel Loader WL-102",
        startTime: "02:05 PM",
        endTime: "06:50 PM",
        operatingHours: "4h 45m",
        preHealth: 94,
        afterHealth: 91,
        status: "Healthy",
        preInspection: "Completed",
        afterInspection: "Completed",
        components: [
          { name: "Engine", pre: 96, after: 95, status: "Healthy" },
          { name: "Hydraulic System", pre: 93, after: 90, status: "Healthy" },
          { name: "Tyre", pre: 90, after: 90, status: "Healthy" },
          { name: "Transmission", pre: 92, after: 91, status: "Healthy" },
        ],
      },
    ],
    issues: [],
  },
  {
    id: "SHIFT-20260817-M",
    date: "17 Aug 2026",
    shiftLabel: "Morning Shift",
    shiftTime: "06:00 AM - 02:00 PM",
    operator: "Raj Kumar",
    status: "Completed",
    machines: [
      {
        machineId: "EX-205",
        machineName: "Excavator EX-205",
        startTime: "06:10 AM",
        endTime: "11:30 AM",
        operatingHours: "5h 20m",
        preHealth: 86,
        afterHealth: 84,
        status: "Healthy",
        preInspection: "Completed",
        afterInspection: "Completed",
        components: [
          { name: "Engine", pre: 88, after: 86, status: "Healthy" },
          { name: "Hydraulic System", pre: 84, after: 82, status: "Healthy" },
          { name: "Tyre", pre: 87, after: 86, status: "Healthy" },
          { name: "Suspension", pre: 85, after: 84, status: "Healthy" },
        ],
      },
    ],
    issues: [
      {
        id: "ISS-4440",
        time: "09:50 AM",
        machineId: "EX-205",
        component: "Suspension",
        issue: "Minor Vibration",
        description: "Slight vibration noticed at high load, logged for monitoring.",
        severity: "Low",
        status: "Closed",
        reportedBy: "Raj Kumar",
        reportedAt: "09:50 AM",
        assignedTo: "Vikram Singh",
        resolvedBy: "Vikram Singh",
        resolvedAt: "10:30 AM",
        lifecycle: [
          { status: "Reported", by: "Raj Kumar", at: "09:50 AM" },
          { status: "Acknowledged", by: "Supervisor Desk", at: "09:52 AM" },
          { status: "Assigned", by: "Vikram Singh", at: "09:55 AM" },
          { status: "In Progress", by: "Vikram Singh", at: "10:00 AM" },
          { status: "Resolved", by: "Vikram Singh", at: "10:30 AM" },
          { status: "Closed", by: "Supervisor Desk", at: "10:35 AM" },
        ],
      },
    ],
  },
];

const ISSUE_LIFECYCLE_ORDER: IssueStatus[] = [
  "Reported",
  "Acknowledged",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

const HISTORY_PAGE_SIZE = 4;

/* ============================================================================
 * SMALL HELPERS
 * ==========================================================================*/

function statusBadgeClasses(status: MachineStatus | ShiftRowStatus) {
  switch (status) {
    case "Healthy":
    case "Completed":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "Warning":
    case "In Progress":
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
    case "Critical":
    case "Missed":
      return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function severityBadgeClasses(severity: IssueSeverity) {
  switch (severity) {
    case "Low":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    case "Medium":
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
    case "High":
      return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
  }
}

function issueStatusBadgeClasses(status: IssueStatus) {
  switch (status) {
    case "Resolved":
    case "Closed":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
    case "In Progress":
    case "Assigned":
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
    case "Acknowledged":
      return "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400";
    case "Reported":
      return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  }
}

function healthChangeColor(change: number) {
  if (change > 0) return "text-emerald-600 dark:text-emerald-400";
  if (change < 0) return "text-rose-600 dark:text-rose-400";
  return "text-slate-500 dark:text-slate-400";
}

function parseHoursToMinutes(label: string) {
  const h = /(\d+)h/.exec(label);
  const m = /(\d+)m/.exec(label);
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

/* ============================================================================
 * RESPONSIVE CUSTOM DROPDOWN (replaces native <select>)
 * ==========================================================================*/

function AppSelect<T extends string>({
  value,
  options,
  onChange,
  icon,
}: {
  value: T;
  options: T[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
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
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto sm:min-w-[150px]"
      >
        <span className="flex items-center gap-2">
          {icon}
          {value}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:left-auto sm:right-0 sm:w-48">
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
              {opt}
              {opt === value && <CheckCircle2 className="h-3.5 w-3.5" />}
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

function SummaryCard({
  icon,
  iconClasses,
  label,
  value,
  suffix,
  sublabel,
  loading,
}: {
  icon: React.ReactNode;
  iconClasses: string;
  label: string;
  value: string;
  suffix?: string;
  sublabel: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="mt-4 h-6 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClasses}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
        {value}
        {suffix && (
          <span className="ml-1 text-xs font-medium text-slate-400">{suffix}</span>
        )}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">{sublabel}</p>
    </div>
  );
}

function TableSkeletonRows({ cols, rows = 3 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3.5">
              <div className="h-3 w-full max-w-[90px] animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <ListChecks className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {message}
      </p>
    </div>
  );
}

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
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex: 2147483647 }}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-blue-100">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function AttachmentGallery({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <section className="mt-6 space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
        <ImageIcon className="h-3.5 w-3.5" />
        Attachments ({attachments.length})
      </h4>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {attachments.map((a) => (
          <a
            key={a.url}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800"
          >
            <img
              src={a.url}
              alt={a.name}
              className="h-24 w-full object-cover transition group-hover:scale-105"
            />
            <p className="truncate px-2 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {a.name}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

/* ============================================================================
 * MACHINE DETAILS DRAWER
 * ==========================================================================*/

function MachineDetailsDrawer({
  machine,
  shift,
  onClose,
}: {
  machine: MachineOperation;
  shift: ShiftRecord;
  onClose: () => void;
}) {
  const relatedIssues = shift.issues.filter((i) => i.machineId === machine.machineId);

  return (
    <ModalShell
      title={machine.machineName}
      subtitle={`${machine.machineId} • ${shift.date} • ${shift.shiftLabel}`}
      onClose={onClose}
    >
      <section className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Machine Information
        </h4>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 px-3 dark:divide-slate-800">
          <DetailRow label="Machine ID" value={machine.machineId} />
          <DetailRow label="Machine Name" value={machine.machineName} />
          <DetailRow label="Start Time" value={machine.startTime} />
          <DetailRow label="End Time" value={machine.endTime} />
          <DetailRow label="Total Operating Hours" value={machine.operatingHours} />
          <DetailRow
            label="Current Status"
            value={
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                  machine.status
                )}`}
              >
                {machine.status}
              </span>
            }
          />
        </div>
      </section>

      <section className="mt-6 space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Inspection Information
        </h4>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 px-3 dark:divide-slate-800">
          <DetailRow label="Pre-Inspection" value={machine.preInspection} />
          <DetailRow label="After-Inspection" value={machine.afterInspection} />
          <DetailRow
            label="Inspection Status"
            value={
              machine.preInspection === "Completed" &&
              machine.afterInspection === "Completed"
                ? "Complete"
                : "Pending"
            }
          />
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Component Health
        </h4>
        <div className="space-y-2">
          {machine.components.map((c) => {
            const change = c.after - c.pre;
            return (
              <div
                key={c.name}
                className="rounded-xl border border-slate-100 p-3.5 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {c.name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                      c.status
                    )}`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>{c.pre}%</span>
                  <span className="text-slate-300 dark:text-slate-600">→</span>
                  <span>{c.after}%</span>
                  <span className={`ml-1 ${healthChangeColor(change)}`}>
                    ({change > 0 ? "+" : ""}
                    {change}%)
                  </span>
                </div>
                {c.issue && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-500">
                    Issue: {c.issue}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Issues Reported ({relatedIssues.length})
        </h4>
        {relatedIssues.length === 0 ? (
          <p className="text-xs text-slate-400">No issues reported for this machine.</p>
        ) : (
          <div className="space-y-2">
            {relatedIssues.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{i.issue}</p>
                  <p className="text-slate-400">
                    {i.component} • {i.time}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${issueStatusBadgeClasses(
                    i.status
                  )}`}
                >
                  {i.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <AttachmentGallery attachments={machine.attachments} />
    </ModalShell>
  );
}

/* ============================================================================
 * ISSUE DETAILS DRAWER
 * ==========================================================================*/

function IssueDetailsDrawer({
  issue,
  onClose,
}: {
  issue: IssueReport;
  onClose: () => void;
}) {
  const currentIndex = ISSUE_LIFECYCLE_ORDER.indexOf(issue.status);

  return (
    <ModalShell title={issue.issue} subtitle={`${issue.id} • ${issue.machineId}`} onClose={onClose}>
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 px-3 dark:divide-slate-800">
        <DetailRow label="Report ID" value={issue.id} />
        <DetailRow label="Machine" value={issue.machineId} />
        <DetailRow label="Component" value={issue.component} />
        <DetailRow label="Issue" value={issue.issue} />
        <DetailRow
          label="Severity"
          value={
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${severityBadgeClasses(
                issue.severity
              )}`}
            >
              {issue.severity}
            </span>
          }
        />
        <DetailRow label="Reported By" value={issue.reportedBy} />
        <DetailRow label="Reported At" value={issue.reportedAt} />
        <DetailRow
          label="Current Status"
          value={
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${issueStatusBadgeClasses(
                issue.status
              )}`}
            >
              {issue.status}
            </span>
          }
        />
        <DetailRow label="Assigned To" value={issue.assignedTo || "—"} />
        <DetailRow label="Resolved By" value={issue.resolvedBy || "—"} />
        <DetailRow label="Resolved At" value={issue.resolvedAt || "—"} />
      </div>

      <div className="mt-5">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Description</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {issue.description}
        </p>
      </div>

      <div className="mt-6">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          Issue Lifecycle
        </h4>
        <ol className="space-y-0">
          {ISSUE_LIFECYCLE_ORDER.map((step, idx) => {
            if (idx > currentIndex) return null;
            const record = issue.lifecycle.find((l) => l.status === step);
            const isCurrent = idx === currentIndex;
            const isLast = idx === Math.min(currentIndex, ISSUE_LIFECYCLE_ORDER.length - 1);
            return (
              <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[9px] top-5 h-full w-px bg-slate-200 dark:bg-slate-700" />
                )}
                <span
                  className={`relative z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 ${
                    isCurrent
                      ? "border-blue-600 bg-blue-600"
                      : "border-emerald-500 bg-emerald-500"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </span>
                <div>
                  <p
                    className={`text-xs font-bold ${
                      isCurrent
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {step}
                  </p>
                  {record && (record.by || record.at) && (
                    <p className="text-[11px] text-slate-400">
                      {record.by}
                      {record.by && record.at ? " • " : ""}
                      {record.at}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <AttachmentGallery attachments={issue.attachments} />
    </ModalShell>
  );
}

/* ============================================================================
 * PREVIOUS SHIFT DETAILS DRAWER
 * ==========================================================================*/

function ShiftDetailsDrawer({
  shift,
  onClose,
  onViewMachine,
  onViewIssue,
}: {
  shift: ShiftRecord;
  onClose: () => void;
  onViewMachine: (m: MachineOperation) => void;
  onViewIssue: (i: IssueReport) => void;
}) {
  const totalMinutes = shift.machines.reduce(
    (sum, m) => sum + parseHoursToMinutes(m.operatingHours),
    0
  );

  return (
    <ModalShell
      title={`${shift.shiftLabel} — ${shift.date}`}
      subtitle={shift.shiftTime}
      onClose={onClose}
    >
      <section className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Shift Information
        </h4>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 px-3 dark:divide-slate-800">
          <DetailRow label="Date" value={shift.date} />
          <DetailRow label="Shift" value={`${shift.shiftLabel} (${shift.shiftTime})`} />
          <DetailRow label="Operator" value={shift.operator} />
          <DetailRow label="Shift Duration" value={formatMinutes(totalMinutes)} />
          <DetailRow label="Machines Operated" value={shift.machines.length} />
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Machine Operations
        </h4>
        <div className="space-y-2">
          {shift.machines.map((m) => (
            <button
              key={m.machineId}
              onClick={() => onViewMachine(m)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3.5 text-left text-xs transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {m.machineName}
                </p>
                <p className="text-slate-400">
                  {m.machineId} • {m.operatingHours} • {m.preHealth}% → {m.afterHealth}%
                </p>
              </div>
              <Eye className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Issues ({shift.issues.length})
        </h4>
        {shift.issues.length === 0 ? (
          <p className="text-xs text-slate-400">No issues were reported during this shift.</p>
        ) : (
          <div className="space-y-2">
            {shift.issues.map((i) => (
              <button
                key={i.id}
                onClick={() => onViewIssue(i)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3.5 text-left text-xs transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{i.issue}</p>
                  <p className="text-slate-400">
                    {i.machineId} • {i.component} • Reported by {i.reportedBy}
                    {i.resolvedBy ? ` • Resolved by ${i.resolvedBy}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${issueStatusBadgeClasses(
                    i.status
                  )}`}
                >
                  {i.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </ModalShell>
  );
}

/* ============================================================================
 * MAIN PAGE
 * ==========================================================================*/

export default function ShiftSummary() {
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || "Raj Kumar";

  // BACKEND TODO: replace with GET /operator/shifts and GET /operator/shifts/:shiftId
  const [isLoading] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<"All Shifts" | "Morning Shift" | "Night Shift">(
    "All Shifts"
  );
  const [dateRangeLabel] = useState("12 Aug 2026 - 19 Aug 2026");
  const [historyPage, setHistoryPage] = useState(1);

  const [activeMachine, setActiveMachine] = useState<{
    machine: MachineOperation;
    shift: ShiftRecord;
  } | null>(null);
  const [activeIssue, setActiveIssue] = useState<IssueReport | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);

  const filteredHistory = useMemo(() => {
    if (shiftFilter === "All Shifts") return SHIFT_HISTORY;
    return SHIFT_HISTORY.filter((s) => s.shiftLabel === shiftFilter);
  }, [shiftFilter]);

  const historyRows = useMemo(
    () =>
      filteredHistory.flatMap((shift) =>
        shift.machines.map((machine) => ({ shift, machine }))
      ),
    [filteredHistory]
  );

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(historyRows.length / HISTORY_PAGE_SIZE)
  );
  const pagedHistoryRows = historyRows.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  // Summary metrics — derived from the last 7 days of shift history
  const summary = useMemo(() => {
    const totalShifts = SHIFT_HISTORY.length;
    const uniqueMachines = new Set(
      SHIFT_HISTORY.flatMap((s) => s.machines.map((m) => m.machineId))
    ).size;
    const totalMinutes = SHIFT_HISTORY.flatMap((s) => s.machines).reduce(
      (sum, m) => sum + parseHoursToMinutes(m.operatingHours),
      0
    );
    const allIssues = SHIFT_HISTORY.flatMap((s) => s.issues);
    const issuesReported = allIssues.length;
    const issuesResolved = allIssues.filter(
      (i) => i.status === "Resolved" || i.status === "Closed"
    ).length;
    const allHealthValues = SHIFT_HISTORY.flatMap((s) =>
      s.machines.map((m) => m.afterHealth)
    );
    const avgHealth = allHealthValues.length
      ? Math.round(
          allHealthValues.reduce((a, b) => a + b, 0) / allHealthValues.length
        )
      : 0;

    return {
      totalShifts,
      uniqueMachines,
      totalOperatingHours: formatMinutes(totalMinutes),
      issuesReported,
      issuesResolved,
      avgHealth,
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER ── */}
      <div className="relative rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-lg shadow-blue-900/10 sm:p-7">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <ListChecks className="h-4.5 w-4.5 text-white" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Shift Summary
              </h1>
            </div>
            <p className="mt-1.5 text-xs font-medium text-blue-100">
              Overview of your shift, machine activity, inspections and issues
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20"
            >
              <Calendar className="h-3.5 w-3.5" />
              {dateRangeLabel}
            </button>

            <AppSelect
              value={shiftFilter}
              options={["All Shifts", "Morning Shift", "Night Shift"]}
              onChange={(v) => {
                setShiftFilter(v);
                setHistoryPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          loading={isLoading}
          icon={<ListChecks className="h-4 w-4" />}
          iconClasses="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          label="Total Shifts"
          value={String(summary.totalShifts)}
          sublabel="Last 7 Days"
        />
        <SummaryCard
          loading={isLoading}
          icon={<Truck className="h-4 w-4" />}
          iconClasses="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          label="Machines Operated"
          value={String(summary.uniqueMachines)}
          sublabel="Last 7 Days"
        />
        <SummaryCard
          loading={isLoading}
          icon={<Clock className="h-4 w-4" />}
          iconClasses="bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
          label="Total Operating Hours"
          value={summary.totalOperatingHours}
          sublabel="Last 7 Days"
        />
        <SummaryCard
          loading={isLoading}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconClasses="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          label="Issues Reported"
          value={String(summary.issuesReported)}
          sublabel="Last 7 Days"
        />
        <SummaryCard
          loading={isLoading}
          icon={<CheckCircle2 className="h-4 w-4" />}
          iconClasses="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          label="Issues Resolved"
          value={String(summary.issuesResolved)}
          sublabel="Last 7 Days"
        />
        <SummaryCard
          loading={isLoading}
          icon={<HeartPulse className="h-4 w-4" />}
          iconClasses="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          label="Avg. Machine Health"
          value={String(summary.avgHealth)}
          suffix="%"
          sublabel="Last 7 Days"
        />
      </div>

      {/* ── MACHINES WORKED IN THIS SHIFT ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Machines Worked in This Shift
          </h2>
          <span className="text-[11px] font-medium text-slate-400">
            {CURRENT_SHIFT.date} • {CURRENT_SHIFT.shiftLabel} • {userName}
          </span>
        </div>

        {isLoading ? (
          <table className="w-full text-left text-xs">
            <tbody>
              <TableSkeletonRows cols={9} rows={2} />
            </tbody>
          </table>
        ) : CURRENT_SHIFT.machines.length === 0 ? (
          <EmptyState message="No machines operated during this shift." />
        ) : (
          <div className="hme-hide-scrollbar overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="py-2.5 pr-4">Machine ID</th>
                  <th className="py-2.5 pr-4">Machine Name</th>
                  <th className="py-2.5 pr-4">Start Time</th>
                  <th className="py-2.5 pr-4">End Time</th>
                  <th className="py-2.5 pr-4">Operating Hours</th>
                  <th className="py-2.5 pr-4">Pre Health</th>
                  <th className="py-2.5 pr-4">After Health</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pl-0 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {CURRENT_SHIFT.machines.map((m) => {
                  const change = m.afterHealth - m.preHealth;
                  return (
                    <tr
                      key={m.machineId}
                      className="border-b border-slate-50 last:border-b-0 dark:border-slate-800/60"
                    >
                      <td className="py-3.5 pr-4 font-bold text-blue-600 dark:text-blue-400">
                        {m.machineId}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                        {m.machineName}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                        {m.startTime}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                        {m.endTime}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                        {m.operatingHours}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                        {m.preHealth}%
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {m.afterHealth}%
                        </span>
                        <span className={`ml-1.5 font-bold ${healthChangeColor(change)}`}>
                          ({change > 0 ? "+" : ""}
                          {change}%)
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                            m.status
                          )}`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 pl-0 text-right">
                        <button
                          onClick={() =>
                            setActiveMachine({ machine: m, shift: CURRENT_SHIFT })
                          }
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="pt-3 text-slate-500" colSpan={4}>
                    Total Operating Hours
                  </td>
                  <td className="pt-3 font-bold text-slate-900 dark:text-white" colSpan={5}>
                    {formatMinutes(
                      CURRENT_SHIFT.machines.reduce(
                        (sum, m) => sum + parseHoursToMinutes(m.operatingHours),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── ISSUE / REPORT HISTORY (THIS SHIFT) ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
          Issue / Report History <span className="font-normal text-slate-400">(This Shift)</span>
        </h2>

        {isLoading ? (
          <table className="w-full text-left text-xs">
            <tbody>
              <TableSkeletonRows cols={8} rows={2} />
            </tbody>
          </table>
        ) : CURRENT_SHIFT.issues.length === 0 ? (
          <EmptyState message="No issues were reported during this shift." />
        ) : (
          <div className="hme-hide-scrollbar overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                  <th className="py-2.5 pr-4">Time</th>
                  <th className="py-2.5 pr-4">Machine ID</th>
                  <th className="py-2.5 pr-4">Component</th>
                  <th className="py-2.5 pr-4">Issue</th>
                  <th className="py-2.5 pr-4">Severity</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Reported By</th>
                  <th className="py-2.5 pl-0 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {CURRENT_SHIFT.issues.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-slate-50 last:border-b-0 dark:border-slate-800/60"
                  >
                    <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                      {i.time}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-blue-600 dark:text-blue-400">
                      {i.machineId}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-200">
                      {i.component}
                    </td>
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white">
                      {i.issue}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${severityBadgeClasses(
                          i.severity
                        )}`}
                      >
                        {i.severity}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${issueStatusBadgeClasses(
                          i.status
                        )}`}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-200">
                      {i.reportedBy}
                    </td>
                    <td className="py-3.5 pl-0 text-right">
                      <button
                        onClick={() => setActiveIssue(i)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SHIFT HISTORY ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Shift History
          </h2>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Activity className="h-3.5 w-3.5" />
            {historyRows.length} machine records
          </div>
        </div>

        {isLoading ? (
          <table className="w-full text-left text-xs">
            <tbody>
              <TableSkeletonRows cols={10} rows={4} />
            </tbody>
          </table>
        ) : historyRows.length === 0 ? (
          <EmptyState message="No previous shift history available." />
        ) : (
          <>
            <div className="hme-hide-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Shift</th>
                    <th className="py-2.5 pr-4">Machine ID</th>
                    <th className="py-2.5 pr-4">Machine Name</th>
                    <th className="py-2.5 pr-4">Operating Hours</th>
                    <th className="py-2.5 pr-4">Issues</th>
                    <th className="py-2.5 pr-4">Resolved</th>
                    <th className="py-2.5 pr-4">Machine Health</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pl-0 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistoryRows.map(({ shift, machine }) => {
                    const machineIssues = shift.issues.filter(
                      (i) => i.machineId === machine.machineId
                    );
                    const resolvedCount = machineIssues.filter(
                      (i) => i.status === "Resolved" || i.status === "Closed"
                    ).length;
                    return (
                      <tr
                        key={`${shift.id}-${machine.machineId}`}
                        className="border-b border-slate-50 last:border-b-0 dark:border-slate-800/60"
                      >
                        <td className="py-3.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                          {shift.date}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                          {shift.shiftLabel}
                        </td>
                        <td className="py-3.5 pr-4 font-bold text-blue-600 dark:text-blue-400">
                          {machine.machineId}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-200">
                          {machine.machineName}
                        </td>
                        <td className="py-3.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                          {machine.operatingHours}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-200">
                          {machineIssues.length}
                        </td>
                        <td className="py-3.5 pr-4 text-slate-700 dark:text-slate-200">
                          {resolvedCount}
                        </td>
                        <td className="py-3.5 pr-4 font-semibold text-slate-700 dark:text-slate-200">
                          {machine.afterHealth}%
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClasses(
                              shift.status
                            )}`}
                          >
                            {shift.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-0 text-right">
                          <button
                            onClick={() => setActiveShift(shift)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-400">
                Page {historyPage} of {totalHistoryPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Previous
                </button>
                <button
                  disabled={historyPage === totalHistoryPages}
                  onClick={() =>
                    setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── DRAWERS ── */}
      {activeMachine && (
        <MachineDetailsDrawer
          machine={activeMachine.machine}
          shift={activeMachine.shift}
          onClose={() => setActiveMachine(null)}
        />
      )}
      {activeIssue && (
        <IssueDetailsDrawer issue={activeIssue} onClose={() => setActiveIssue(null)} />
      )}
      {activeShift && (
        <ShiftDetailsDrawer
          shift={activeShift}
          onClose={() => setActiveShift(null)}
          onViewMachine={(m) => {
            setActiveShift(null);
            setActiveMachine({ machine: m, shift: activeShift });
          }}
          onViewIssue={(i) => {
            setActiveShift(null);
            setActiveIssue(i);
          }}
        />
      )}
    </div>
  );
}