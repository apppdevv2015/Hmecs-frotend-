import { useMemo, useState } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Gauge,
  Droplet,
  CircleDot,
  BatteryWarning,
  Disc3,
  Thermometer,
  Cog,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppSelect from "../../components/ui/dropdown/AppSelect";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
type AlertStatus = "Open" | "Under Review" | "Resolved";
type AlertComponent =
  | "Engine"
  | "Hydraulic"
  | "Suspension"
  | "Tyre"
  | "Battery"
  | "Brake"
  | "Coolant"
  | "Transmission";

interface AlertItem {
  id: string;
  title: string;
  description: string;
  machine: string;
  machineId: string;
  component: AlertComponent;
  severity: AlertSeverity;
  status: AlertStatus;
  reportedAt: string;
  location: string;
}

// BACKEND TODO: Replace with GET /api/supervisor/alerts?search=&severity=&status=&component=&page=&limit=
// Response envelope shape expected from API (mirrored below for easy swap-in):
// {
//   data: AlertItem[],
//   meta: { total: number, page: number, limit: number, totalPages: number }
// }
const ALERTS_RESPONSE: { data: AlertItem[] } = {
  data: [
    {
      id: "ALT-1024",
      title: "Engine coolant temperature above safe threshold",
      description:
        "Sensor reading crossed 108°C for over 4 minutes during active operation.",
      machine: "Excavator EX-204",
      machineId: "MCH-EX-204",
      component: "Engine",
      severity: "Critical",
      status: "Open",
      reportedAt: "2026-07-02T09:12:00+05:30",
      location: "Site A - Zone 3",
    },
    {
      id: "ALT-1023",
      title: "Hydraulic pressure drop detected",
      description:
        "Main hydraulic circuit pressure fell below operational minimum during lift cycle.",
      machine: "Loader LD-110",
      machineId: "MCH-LD-110",
      component: "Hydraulic",
      severity: "High",
      status: "Under Review",
      reportedAt: "2026-07-02T08:47:00+05:30",
      location: "Site A - Zone 1",
    },
    {
      id: "ALT-1022",
      title: "Suspension arm vibration anomaly",
      description:
        "Vibration amplitude on rear-left suspension exceeded baseline by 32%.",
      machine: "Dump Truck DT-801",
      machineId: "MCH-DT-801",
      component: "Suspension",
      severity: "Medium",
      status: "Open",
      reportedAt: "2026-07-02T07:58:00+05:30",
      location: "Site B - Yard 2",
    },
    {
      id: "ALT-1021",
      title: "Tyre pressure below recommended range",
      description: "Front-right tyre pressure reading at 78% of rated PSI.",
      machine: "Dump Truck DT-801",
      machineId: "MCH-DT-801",
      component: "Tyre",
      severity: "Medium",
      status: "Resolved",
      reportedAt: "2026-07-01T18:20:00+05:30",
      location: "Site B - Yard 2",
    },
    {
      id: "ALT-1020",
      title: "Battery voltage fluctuation",
      description:
        "Auxiliary battery voltage dipped intermittently below 11.8V over 20 minutes.",
      machine: "Crane CR-502",
      machineId: "MCH-CR-502",
      component: "Battery",
      severity: "Low",
      status: "Open",
      reportedAt: "2026-07-01T16:05:00+05:30",
      location: "Site C - Bay 4",
    },
    {
      id: "ALT-1019",
      title: "Brake pad wear limit approaching",
      description: "Rear brake pad thickness reduced to 15% of original.",
      machine: "Loader LD-110",
      machineId: "MCH-LD-110",
      component: "Brake",
      severity: "High",
      status: "Under Review",
      reportedAt: "2026-07-01T14:32:00+05:30",
      location: "Site A - Zone 1",
    },
    {
      id: "ALT-1018",
      title: "Coolant level below minimum mark",
      description: "Radiator coolant reservoir at 22% capacity.",
      machine: "Excavator EX-204",
      machineId: "MCH-EX-204",
      component: "Coolant",
      severity: "Medium",
      status: "Resolved",
      reportedAt: "2026-07-01T11:10:00+05:30",
      location: "Site A - Zone 3",
    },
    {
      id: "ALT-1017",
      title: "Transmission overheating warning",
      description: "Transmission fluid temperature exceeded 130°C threshold.",
      machine: "Bulldozer BD-330",
      machineId: "MCH-BD-330",
      component: "Transmission",
      severity: "Critical",
      status: "Open",
      reportedAt: "2026-07-01T09:44:00+05:30",
      location: "Site D - Zone 2",
    },
    {
      id: "ALT-1016",
      title: "Hydraulic fluid contamination flagged",
      description: "Particle count in return-line filter exceeded ISO limit.",
      machine: "Crane CR-502",
      machineId: "MCH-CR-502",
      component: "Hydraulic",
      severity: "High",
      status: "Resolved",
      reportedAt: "2026-06-30T20:15:00+05:30",
      location: "Site C - Bay 4",
    },
    {
      id: "ALT-1015",
      title: "Engine oil pressure irregularity",
      description: "Oil pressure oscillating outside normal operating band.",
      machine: "Bulldozer BD-330",
      machineId: "MCH-BD-330",
      component: "Engine",
      severity: "High",
      status: "Open",
      reportedAt: "2026-06-30T15:52:00+05:30",
      location: "Site D - Zone 2",
    },
  ],
};

// ---------------------------------------------------------------------------
// Static config maps
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: AlertSeverity[] = ["Critical", "High", "Medium", "Low"];
const STATUS_ORDER: AlertStatus[] = ["Open", "Under Review", "Resolved"];
const COMPONENT_ORDER: AlertComponent[] = [
  "Engine",
  "Hydraulic",
  "Suspension",
  "Tyre",
  "Battery",
  "Brake",
  "Coolant",
  "Transmission",
];

const COMPONENT_ICON: Record<AlertComponent, LucideIcon> = {
  Engine: Cog,
  Hydraulic: Droplet,
  Suspension: Gauge,
  Tyre: CircleDot,
  Battery: BatteryWarning,
  Brake: Disc3,
  Coolant: Thermometer,
  Transmission: Cog,
};

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { badge: string; bar: string; dot: string }
> = {
  Critical: {
    badge:
      "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  High: {
    badge:
      "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:ring-orange-900",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
  },
  Medium: {
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  Low: {
    badge:
      "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    bar: "bg-slate-400",
    dot: "bg-slate-400",
  },
};

const STATUS_STYLES: Record<AlertStatus, { badge: string; icon: LucideIcon }> =
  {
    Open: {
      badge:
        "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900",
      icon: ShieldAlert,
    },
    "Under Review": {
      badge:
        "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-900",
      icon: Clock,
    },
    Resolved: {
      badge:
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900",
      icon: CheckCircle2,
    },
  };

const PAGE_SIZE = 6;

const componentOptions = [
  { label: "All Components", value: "All" },
  ...COMPONENT_ORDER.map((item) => ({
    label: item,
    value: item,
  })),
];

const severityOptions = [
  { label: "All Severities", value: "All" },
  ...SEVERITY_ORDER.map((item) => ({
    label: item,
    value: item,
  })),
];

const statusOptions = [
  { label: "All Status", value: "All" },
  ...STATUS_ORDER.map((item) => ({
    label: item,
    value: item,
  })),
];

const formatReportedAt = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupervisorAlerts() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "All">(
    "All",
  );
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "All">("All");
  const [componentFilter, setComponentFilter] = useState<
    AlertComponent | "All"
  >("All");
  const [currentPage, setCurrentPage] = useState(1);

  const alerts = ALERTS_RESPONSE.data;

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "Critical").length,
      open: alerts.filter((a) => a.status === "Open").length,
      resolved: alerts.filter((a) => a.status === "Resolved").length,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const value = search.toLowerCase().trim();

    return alerts.filter((alert) => {
      const matchesSearch =
        value.length === 0 ||
        alert.title.toLowerCase().includes(value) ||
        alert.machine.toLowerCase().includes(value) ||
        alert.machineId.toLowerCase().includes(value) ||
        alert.id.toLowerCase().includes(value) ||
        alert.location.toLowerCase().includes(value);

      const matchesSeverity =
        severityFilter === "All" || alert.severity === severityFilter;
      const matchesStatus =
        statusFilter === "All" || alert.status === statusFilter;
      const matchesComponent =
        componentFilter === "All" || alert.component === componentFilter;

      return (
        matchesSearch && matchesSeverity && matchesStatus && matchesComponent
      );
    });
  }, [alerts, search, severityFilter, statusFilter, componentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedAlerts = filteredAlerts.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );
  const startItem = filteredAlerts.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + PAGE_SIZE, filteredAlerts.length);

  const hasActiveFilters =
    severityFilter !== "All" ||
    statusFilter !== "All" ||
    componentFilter !== "All" ||
    search.trim().length > 0;

  const resetFilters = () => {
    setSearch("");
    setSeverityFilter("All");
    setStatusFilter("All");
    setComponentFilter("All");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-full space-y-6 bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Fleet Monitoring
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Supervisor Alerts
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track component-level faults across your fleet and manage resolution
          status in real time.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Alerts
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Critical
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.critical}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Open
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.open}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Resolved
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.resolved}
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by alert, machine, ID or location..."
             className="w-full h-11 pl-10 pr-4 text-sm border border-blue-100 rounded-lg bg-white text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 text-slate-400 lg:flex">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            <AppSelect
              className="w-[180px]"
              value={componentFilter}
              onChange={(value) => {
                setComponentFilter(value as AlertComponent | "All");
                setCurrentPage(1);
              }}
              options={componentOptions}
            />
            <AppSelect
              className="w-[170px]"
              value={severityFilter}
              onChange={(value) => {
                setSeverityFilter(value as AlertSeverity | "All");
                setCurrentPage(1);
              }}
              options={severityOptions}
            />

            <AppSelect
              className="w-[170px]"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as AlertStatus | "All");
                setCurrentPage(1);
              }}
              options={statusOptions}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {paginatedAlerts.map((alert) => {
          const ComponentIcon = COMPONENT_ICON[alert.component];
          const StatusIcon = STATUS_STYLES[alert.status].icon;
          const severityStyle = SEVERITY_STYLES[alert.severity];

          return (
            <div
              key={alert.id}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <span
                className={`absolute inset-y-0 left-0 w-1 ${severityStyle.bar}`}
              />

              <div className="flex flex-col gap-4 p-4 pl-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <ComponentIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {alert.title}
                      </h3>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {alert.id}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {alert.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {alert.machine}
                      </span>
                      <span>{alert.machineId}</span>
                      <span>{alert.location}</span>
                      <span>{formatReportedAt(alert.reportedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyle.badge}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${severityStyle.dot}`}
                    />
                    {alert.severity}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[alert.status].badge}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {alert.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {paginatedAlerts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              No alerts match your filters
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting search or clearing filters.
            </p>
          </div>
        )}
      </div>
      {/* Pagination */}
      {filteredAlerts.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {startItem}-{endItem}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {filteredAlerts.length}
            </span>{" "}
            alerts
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
