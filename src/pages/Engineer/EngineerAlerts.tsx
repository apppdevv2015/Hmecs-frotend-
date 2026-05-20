import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Clock,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

type AlertSeverity = "Critical" | "Warning";
type AlertStatus = "Open" | "Acknowledged";

type AlertItem = {
  id: string;
  machine: string;
  issue: string;
  severity: AlertSeverity;
  time: string;
  status: AlertStatus;
};

const initialAlerts: AlertItem[] = [
  {
    id: "ALT-001",
    machine: "CAT 777D",
    issue: "Engine temperature high",
    severity: "Critical",
    time: "10 min ago",
    status: "Open",
  },
  {
    id: "ALT-002",
    machine: "Komatsu HD785",
    issue: "Hydraulic pressure low",
    severity: "Warning",
    time: "25 min ago",
    status: "Open",
  },
  {
    id: "ALT-003",
    machine: "CAT 740B",
    issue: "Tyre pressure critical",
    severity: "Critical",
    time: "35 min ago",
    status: "Open",
  },
];

const ITEMS_PER_PAGE = 5;

export default function EngineerAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"All" | AlertSeverity>(
    "All"
  );
  const [statusFilter, setStatusFilter] = useState<"All" | AlertStatus>("All");
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((alert) => alert.status === "Open").length;
    const critical = alerts.filter(
      (alert) => alert.severity === "Critical" && alert.status === "Open"
    ).length;
    const acknowledged = alerts.filter(
      (alert) => alert.status === "Acknowledged"
    ).length;

    return {
      total,
      open,
      critical,
      acknowledged,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesSearch =
        alert.id.toLowerCase().includes(search) ||
        alert.machine.toLowerCase().includes(search) ||
        alert.issue.toLowerCase().includes(search) ||
        alert.severity.toLowerCase().includes(search) ||
        alert.status.toLowerCase().includes(search);

      const matchesSeverity =
        severityFilter === "All" || alert.severity === severityFilter;

      const matchesStatus =
        statusFilter === "All" || alert.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, searchTerm, severityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE));

  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlerts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAlerts, currentPage]);

  const startItem =
    filteredAlerts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredAlerts.length);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSeverityChange = (value: "All" | AlertSeverity) => {
    setSeverityFilter(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: "All" | AlertStatus) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "Acknowledged",
            }
          : alert
      )
    );

    toast.success("Alert acknowledged successfully");
  };

  const handleAcknowledgeAll = () => {
    const hasOpenAlerts = alerts.some((alert) => alert.status === "Open");

    if (!hasOpenAlerts) {
      toast.error("No open alerts available");
      return;
    }

    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) => ({
        ...alert,
        status: "Acknowledged",
      }))
    );

    toast.success("All alerts acknowledged successfully");
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSeverityFilter("All");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 dark:bg-[#061426] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Predictive Alerts
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Important alerts from your assigned machines.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAcknowledgeAll}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <CheckCircle2 size={17} />
            Acknowledge All
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Total Alerts
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {stats.total}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                <ShieldAlert size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Open Alerts
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {stats.open}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Critical Open
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {stats.critical}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10">
                <AlertTriangle size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Acknowledged
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {stats.acknowledged}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-500/10">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Card */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
          {/* Filters */}
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search by machine, issue, alert id..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={severityFilter}
                  onChange={(event) =>
                    handleSeverityChange(event.target.value as "All" | AlertSeverity)
                  }
                  className="h-12 min-w-[160px] appearance-none rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-[#0B1D35] dark:text-white"
                >
                  <option value="All">All Severity</option>
                  <option value="Critical">Critical</option>
                  <option value="Warning">Warning</option>
                </select>
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(event.target.value as "All" | AlertStatus)
                }
                className="h-12 min-w-[160px] rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-[#0B1D35] dark:text-white"
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="Acknowledged">Acknowledged</option>
              </select>

              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <XCircle size={16} />
                Clear
              </button>
            </div>
          </div>

          {/* Alert List */}
          {paginatedAlerts.length > 0 ? (
            <div className="space-y-4">
              {paginatedAlerts.map((alert) => {
                const isCritical = alert.severity === "Critical";
                const isAcknowledged = alert.status === "Acknowledged";

                return (
                  <div
                    key={alert.id}
                    className={`flex flex-col gap-4 rounded-3xl border p-5 transition md:flex-row md:items-center md:justify-between ${
                      isAcknowledged
                        ? "border-green-100 bg-green-50/50 dark:border-green-500/10 dark:bg-green-500/5"
                        : "border-gray-100 bg-[#F8FAFC] hover:border-blue-100 hover:bg-blue-50/30 dark:border-white/5 dark:bg-white/5 dark:hover:border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          isAcknowledged
                            ? "bg-green-100 text-green-600 dark:bg-green-500/10"
                            : isCritical
                            ? "bg-red-50 text-red-500 dark:bg-red-500/10"
                            : "bg-orange-50 text-orange-500 dark:bg-orange-500/10"
                        }`}
                      >
                        {isAcknowledged ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          <AlertTriangle size={24} />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900 dark:text-white">
                            {alert.machine}
                          </h3>

                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            {alert.id}
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {alert.issue}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {alert.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-black ${
                          isCritical
                            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                            : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                        }`}
                      >
                        {alert.severity}
                      </span>

                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-black ${
                          isAcknowledged
                            ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        }`}
                      >
                        {alert.status}
                      </span>

                      <button
                        type="button"
                        disabled={isAcknowledged}
                        onClick={() => handleAcknowledge(alert.id)}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                          isAcknowledged
                            ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        {isAcknowledged ? "Acknowledged" : "Acknowledge"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-[#F8FAFC] p-8 text-center dark:border-white/10 dark:bg-white/5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                <Search size={26} />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                No alerts found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                No alert matches your current search or filter. Try clearing
                filters.
              </p>

              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {filteredAlerts.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Showing {startItem}-{endItem} of {filteredAlerts.length} alerts
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Prev
                </button>

                <span className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}