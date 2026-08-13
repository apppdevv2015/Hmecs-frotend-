import { useMemo, useState, useEffect, useCallback } from "react";
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
  Loader2,
  RefreshCw,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import {
  supervisorAlertsService,
  type AlertItem,
  type AlertSeverity,
  type AlertStatus,
  type AlertComponent,
} from "../../services/Task/supervisorAlertsService";

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
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupervisorAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "All">(
    "All"
  );
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "All">("All");
  const [componentFilter, setComponentFilter] = useState<
    AlertComponent | "All"
  >("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch live alerts from API service
  const loadAlerts = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const data = await supervisorAlertsService.getAlerts();
      setAlerts(data);
    } catch (err: any) {
      console.error("Failed to load alerts:", err);
      showErrorToast(err?.message || "Failed to load supervisor alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

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
    startIndex + PAGE_SIZE
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

  const handleUpdateStatus = async (alertId: string, newStatus: AlertStatus) => {
    try {
      setActionLoading(true);
      const updated = await supervisorAlertsService.updateAlertStatus(
        alertId,
        newStatus,
        undefined,
        resolutionNote
      );

      setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
      setSelectedAlert(null);
      setResolutionNote("");
      showSuccessToast(`Alert marked as ${newStatus}`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to update alert status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-full space-y-6 bg-slate-50 p-4 dark:bg-slate-950 md:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Fleet Monitoring
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Supervisor Alerts
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Track component-level faults across your fleet and manage resolution
            status in real time.
          </p>
        </div>

        <button
          onClick={() => loadAlerts(true)}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin text-blue-600" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Alerts
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            ) : (
              stats.total
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Critical
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-red-400" />
            ) : (
              stats.critical
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Open
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            ) : (
              stats.open
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Resolved
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            ) : (
              stats.resolved
            )}
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-600 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 text-slate-400 lg:flex">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            <AppSelect
              className="w-full sm:w-[180px]"
              value={componentFilter}
              onChange={(value) => {
                setComponentFilter(value as AlertComponent | "All");
                setCurrentPage(1);
              }}
              options={componentOptions}
            />
            <AppSelect
              className="w-full sm:w-[170px]"
              value={severityFilter}
              onChange={(value) => {
                setSeverityFilter(value as AlertSeverity | "All");
                setCurrentPage(1);
              }}
              options={severityOptions}
            />

            <AppSelect
              className="w-full sm:w-[170px]"
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
                className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-3 text-xs font-medium text-slate-500">
              Loading live fleet alerts...
            </p>
          </div>
        ) : paginatedAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No alerts match your filters
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting search or clearing filters.
            </p>
          </div>
        ) : (
          paginatedAlerts.map((alert) => {
            const ComponentIcon = COMPONENT_ICON[alert.component] || Cog;
            const StatusIcon = STATUS_STYLES[alert.status]?.icon || ShieldAlert;
            const severityStyle =
              SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.Medium;

            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1.5 ${severityStyle.bar}`}
                />

                <div className="flex flex-col gap-4 p-4 pl-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <ComponentIcon className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                          {alert.title}
                        </h3>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {alert.id}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                        {alert.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${severityStyle.badge}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${severityStyle.dot}`}
                      />
                      {alert.severity}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        STATUS_STYLES[alert.status]?.badge ||
                        STATUS_STYLES.Open.badge
                      }`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {alert.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredAlerts.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {startItem}-{endItem}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
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

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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

      {/* Alert Review Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  {(() => {
                    const Icon =
                      COMPONENT_ICON[selectedAlert.component] || Cog;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedAlert.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400">
                    {selectedAlert.id} · {selectedAlert.machine}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-slate-600 dark:text-slate-300">
                  {selectedAlert.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <p className="font-medium text-slate-400">Component</p>
                  <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {selectedAlert.component}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <p className="font-medium text-slate-400">Severity</p>
                  <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {selectedAlert.severity}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <p className="font-medium text-slate-400">Location</p>
                  <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {selectedAlert.location}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <p className="font-medium text-slate-400">Reported At</p>
                  <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {formatReportedAt(selectedAlert.reportedAt)}
                  </p>
                </div>
              </div>

              {/* Resolution Notes Input */}
              <div className="pt-2">
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Supervisor Resolution Notes / Action
                </label>
                <textarea
                  rows={2}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Enter corrective action or inspection notes..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Close
              </button>

              {selectedAlert.status !== "Under Review" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    handleUpdateStatus(selectedAlert.id, "Under Review")
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Mark Under Review
                </button>
              )}

              {selectedAlert.status !== "Resolved" ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    handleUpdateStatus(selectedAlert.id, "Resolved")
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Resolve Alert
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedAlert.id, "Open")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reopen Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
