import React, { useEffect, useMemo, useState } from "react";
import { showErrorToast } from "../../utils/toastUtils";

import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Gauge,
  Loader2,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import {
  getAlerts,
  getAlertById,
  deleteAlert,
  type Alert,
  type AlertStatus,
} from "../../services/Alert/alert.service";

import CustomSelect from "../../components/ui/dropdown/AppSelect";

const FETCH_LIMIT = 200;

type DateRangeOption = "all" | "today" | "7d" | "30d";
type SortOption = "newest" | "oldest";
type StatusFilter = "all" | AlertStatus;

const EMPTY_TEXT = "—";

const displayText = (value?: string | null): string =>
  value && value.trim().length > 0 ? value : EMPTY_TEXT;

const formatDateTime = (value?: string | null): string => {
  if (!value) return EMPTY_TEXT;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_TEXT;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const isWithinRange = (createdAt: string, range: DateRangeOption): boolean => {
  if (range === "all") return true;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return created >= start.getTime();
  }
  if (range === "7d") return now - created <= 7 * day;
  if (range === "30d") return now - created <= 30 * day;
  return true;
};

const getStatusClasses = (status: string): string => {
  if (status === "Critical") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400";
};

const PAGE_SIZE = 10;

const StatCard: React.FC<{
  label: string;
  value: number;
  tone: "critical" | "warning";
}> = ({ label, value, tone }) => {
  const isCritical = tone === "critical";
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-5 ${
        isCritical
          ? "border-red-100 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
          : "border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${
          isCritical ? "bg-red-600" : "bg-amber-500"
        }`}
      >
        {isCritical ? <AlertCircle size={22} /> : <AlertTriangle size={22} />}
      </div>
      <div>
        <p
          className={`text-2xl font-bold leading-none ${
            isCritical
              ? "text-red-700 dark:text-red-400"
              : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {value}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${
            isCritical
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
};

const DetailStat: React.FC<{
  label: string;
  value: string;
  tone?: "default" | "critical" | "warning" | "success";
}> = ({ label, value, tone = "default" }) => {
  const toneClasses =
    tone === "critical"
      ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
        : tone === "success"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
          : "bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-200";

  return (
    <div className={`rounded-xl px-3 py-2.5 text-center ${toneClasses}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
};

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
        {children}
      </p>
    </div>
  </div>
);

const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filters
  const [machineFilter, setMachineFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeOption>("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const fetchAlerts = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAlerts({ page: 1, limit: FETCH_LIMIT, signal });
      setAlerts([...result.data]);
    } catch (err) {
      setError("Unable to load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchAlerts(controller.signal);
    return () => controller.abort();
  }, []);

  const machineOptions = useMemo(() => {
    const map = new Map<string, string>();
    alerts.forEach((a) => {
      if (!map.has(a.machineId))
        map.set(a.machineId, a.machine?.name || a.machineId);
    });
    return Array.from(map.entries());
  }, [alerts]);

  const componentOptions = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach((a) => {
      if (a.componentName) set.add(a.componentName);
    });
    return Array.from(set);
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const search = appliedSearch.trim().toLowerCase();

    const result = alerts.filter((a) => {
      if (machineFilter !== "all" && a.machineId !== machineFilter)
        return false;
      if (componentFilter !== "all" && a.componentName !== componentFilter)
        return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!isWithinRange(a.createdAt, dateRange)) return false;
      if (search) {
        const haystack = [
          a.componentName,
          a.parameterName,
          a.machine?.name,
          a.machine?.serialNumber,
          a.message,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortBy === "newest" ? -diff : diff;
    });

    return result;
  }, [
    alerts,
    machineFilter,
    componentFilter,
    statusFilter,
    dateRange,
    appliedSearch,
    sortBy,
  ]);

  const criticalCount = useMemo(
    () => alerts.filter((a) => a.status === "Critical").length,
    [alerts],
  );
  const warningCount = useMemo(
    () => alerts.filter((a) => a.status === "Warning").length,
    [alerts],
  );

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredAlerts.slice(pageStart, pageStart + PAGE_SIZE);

  const handleApplyFilters = () => {
    setAppliedSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setMachineFilter("all");
    setComponentFilter("all");
    setStatusFilter("all");
    setDateRange("all");
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  const handleSelectAlert = async (alertId: string) => {
    setDetailLoading(true);
    try {
      const detail = await getAlertById(alertId);
      setSelectedAlert(detail);
    } catch {
      // apiCall already surfaces the backend error toast
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedAlert(null);

  const handleDelete = async (alertId: string) => {
    setDeletingId(alertId);
    try {
      await deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (selectedAlert?.id === alertId) setSelectedAlert(null);
    } catch {
      // apiCall already surfaces the backend error toast
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };
  return (
    <div className="w-full min-w-0 pb-8">
      {/* HEADER */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor machine health changes and important notifications
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Loading alerts...
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
          <AlertCircle size={24} />
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchAlerts()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <RotateCcw size={13} />
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:h-[calc(100vh-180px)] lg:flex-row lg:items-stretch lg:overflow-hidden">
          {/* LEFT: summary, filters, list */}
         <div className="min-w-0 flex-1 space-y-5 lg:h-full lg:overflow-y-auto lg:pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* SUMMARY */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Critical"
                value={criticalCount}
                tone="critical"
              />
              <StatCard label="Warning" value={warningCount} tone="warning" />
            </div>

            {/* FILTERS */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Machine
                  </label>
                  <CustomSelect
                    value={machineFilter}
                    onChange={setMachineFilter}
                    options={[
                      { label: "All Machines", value: "all" },
                      ...machineOptions.map(([id, name]) => ({
                        label: name,
                        value: id,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Component
                  </label>
                  <CustomSelect
                    value={componentFilter}
                    onChange={setComponentFilter}
                    options={[
                      { label: "All Components", value: "all" },
                      ...componentOptions.map((name) => ({
                        label: name,
                        value: name,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Status
                  </label>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    options={[
                      { label: "All", value: "all" },
                      { label: "Critical", value: "Critical" },
                      { label: "Warning", value: "Warning" },
                    ]}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Date Range
                  </label>
                  <CustomSelect
                    value={dateRange}
                    onChange={(v) => setDateRange(v as DateRangeOption)}
                    options={[
                      { label: "All Time", value: "all" },
                      { label: "Today", value: "today" },
                      { label: "Last 7 Days", value: "7d" },
                      { label: "Last 30 Days", value: "30d" },
                    ]}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyFilters();
                    }}
                    placeholder="Search alerts..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Filter size={14} />
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCcw size={14} />
                  Clear Filters
                </button>
              </div>
            </div>

            {/* LIST HEADER */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {filteredAlerts.length} Alert
                {filteredAlerts.length === 1 ? "" : "s"} Found
              </h2>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-slate-400" />
                <label className="text-xs text-slate-500">Sort by:</label>
                <CustomSelect
                  value={sortBy}
                  onChange={(v) => setSortBy(v as SortOption)}
                  options={[
                    { label: "Newest First", value: "newest" },
                    { label: "Oldest First", value: "oldest" },
                  ]}
                />
              </div>
            </div>

            {/* LIST */}
            {pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <AlertCircle size={22} />
                <p className="text-sm font-medium">No alerts found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pageItems.map((alert) => {
                  const isCritical = alert.status === "Critical";
                  const isSelected = selectedAlert?.id === alert.id;
                  return (
                    <div
                      key={alert.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectAlert(alert.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSelectAlert(alert.id);
                      }}
                      className={`group relative flex w-full cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 text-left transition ${
                        isCritical
                          ? "border-red-200 bg-red-50/60 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/10"
                          : "border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/10"
                      } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(alert.id);
                        }}
                        disabled={deletingId === alert.id}
                        aria-label="Delete alert"
                        className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition-all duration-150 hover:scale-110 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-red-800 dark:hover:bg-red-950/40 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        {deletingId === alert.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>

                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                            isCritical ? "bg-red-600" : "bg-amber-500"
                          }`}
                        >
                          {isCritical ? (
                            <AlertCircle size={17} />
                          ) : (
                            <AlertTriangle size={17} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                            {alert.componentName}
                          </p>
                          {alert.parameterName && (
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {alert.parameterName}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Truck size={13} className="shrink-0" />
                            <span className="truncate">
                              {displayText(alert.machine?.name)}
                            </span>
                          </div>
                          {alert.machine?.serialNumber && (
                            <p className="pl-[19px] text-xs text-slate-400">
                              {alert.machine.serialNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            isCritical
                              ? "bg-red-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {alert.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(alert.createdAt)}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="rounded bg-white px-1.5 py-0.5 font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                            {alert.previousHealth}%
                          </span>
                          <ChevronRight size={12} className="text-slate-400" />
                          <span
                            className={`rounded px-1.5 py-0.5 font-semibold ${
                              isCritical
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            {alert.currentHealth}%
                          </span>
                        </div>
                        {alert.healthDrop > 0 && (
                          <span className="text-xs font-semibold text-red-500">
                            ↓ {alert.healthDrop} points
                          </span>
                        )}
                        {!alert.isRead && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {filteredAlerts.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {pageStart + 1} to{" "}
                  {Math.min(pageStart + PAGE_SIZE, filteredAlerts.length)} of{" "}
                  {filteredAlerts.length} alert
                  {filteredAlerts.length === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-bold text-white">
                    {currentPage}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: detail panel */}
      <div className="w-full shrink-0 lg:h-full lg:w-[380px] lg:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Alert Details
                </h2>
                {selectedAlert && (
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {detailLoading ? (
                <div className="flex h-40 items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin" size={18} />
                </div>
              ) : !selectedAlert ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-slate-400">
                  <AlertCircle size={20} />
                  <p className="text-xs">Select an alert to view its details</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* status banner */}
                  <div
                    className={`flex items-start justify-between rounded-xl border px-3.5 py-3 ${getStatusClasses(
                      selectedAlert.status,
                    )}`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedAlert.status === "Critical" ? (
                        <AlertCircle size={17} />
                      ) : (
                        <AlertTriangle size={17} />
                      )}
                      <span className="text-sm font-bold">
                        {selectedAlert.status} Alert
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium opacity-80">
                        {formatDateTime(selectedAlert.createdAt)}
                      </p>
                      {!selectedAlert.isRead && (
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          Unread
                        </p>
                      )}
                    </div>
                  </div>

                  {/* machine info */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Machine Information
                    </p>
                    <div className="space-y-2">
                      <DetailRow
                        icon={<Truck size={15} />}
                        label="Machine Name"
                      >
                        {displayText(selectedAlert.machine?.name)}
                      </DetailRow>
                      <DetailRow icon={<Settings2 size={15} />} label="Model">
                        {displayText(selectedAlert.machine?.model)}
                      </DetailRow>
                      <DetailRow icon={<Gauge size={15} />} label="Serial No.">
                        {displayText(selectedAlert.machine?.serialNumber)}
                      </DetailRow>
                    </div>
                  </div>

                  {/* component & parameter */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Component &amp; Parameter
                    </p>
                    <div className="space-y-2">
                      <DetailRow
                        icon={<Settings2 size={15} />}
                        label="Component"
                      >
                        {displayText(selectedAlert.componentName)}
                      </DetailRow>
                      <DetailRow icon={<Gauge size={15} />} label="Parameter">
                        {displayText(selectedAlert.parameterName)}
                      </DetailRow>
                    </div>
                  </div>

                  {/* health */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Health Details
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <DetailStat
                        label="Previous"
                        value={`${selectedAlert.previousHealth}%`}
                      />
                      <DetailStat
                        label="Current"
                        value={`${selectedAlert.currentHealth}%`}
                        tone={
                          selectedAlert.status === "Critical"
                            ? "critical"
                            : "warning"
                        }
                      />
                      <DetailStat
                        label="Drop"
                        value={`${selectedAlert.healthDrop}`}
                        tone="critical"
                      />
                    </div>
                  </div>

                  {/* parameter values */}
                  {selectedAlert.parameterDetails && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Parameter Values
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <DetailStat
                          label="Previous Value"
                          value={`${displayText(
                            selectedAlert.parameterDetails.previousValue,
                          )}${selectedAlert.parameterDetails.unit ?? ""}`}
                        />
                        <DetailStat
                          label="Current Value"
                          value={`${displayText(
                            selectedAlert.parameterDetails.updatedValue,
                          )}${selectedAlert.parameterDetails.unit ?? ""}`}
                          tone="warning"
                        />
                      </div>
                      {selectedAlert.parameterDetails.safeMin !== undefined &&
                        selectedAlert.parameterDetails.safeMax !==
                          undefined && (
                          <div className="mt-2">
                            <DetailStat
                              label="Safe Range"
                              value={`${selectedAlert.parameterDetails.safeMin} - ${selectedAlert.parameterDetails.safeMax}${selectedAlert.parameterDetails.unit ?? ""}`}
                              tone="success"
                            />
                          </div>
                        )}

                      <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Additional Details
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <DetailStat
                          label="Unit"
                          value={displayText(
                            selectedAlert.parameterDetails.unit,
                          )}
                        />
                        <DetailStat
                          label="Delta"
                          value={
                            selectedAlert.parameterDetails.delta !== undefined
                              ? String(selectedAlert.parameterDetails.delta)
                              : EMPTY_TEXT
                          }
                        />
                        <DetailStat
                          label="Safe Min"
                          value={
                            selectedAlert.parameterDetails.safeMin !== undefined
                              ? String(selectedAlert.parameterDetails.safeMin)
                              : EMPTY_TEXT
                          }
                        />
                        <DetailStat
                          label="Safe Max"
                          value={
                            selectedAlert.parameterDetails.safeMax !== undefined
                              ? String(selectedAlert.parameterDetails.safeMax)
                              : EMPTY_TEXT
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* message */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Message
                    </p>
                    <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {selectedAlert.message}
                    </p>
                  </div>

                  {/* delete */}
                  <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    {confirmDeleteId === selectedAlert.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedAlert.id)}
                          disabled={deletingId === selectedAlert.id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingId === selectedAlert.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === selectedAlert.id}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(selectedAlert.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <Trash2 size={14} />
                        Delete Alert
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
