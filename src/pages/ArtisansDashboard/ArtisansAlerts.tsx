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
import AppSelect from "../../components/ui/dropdown/AppSelect";

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

export default function ArtisansAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"All" | AlertSeverity>(
    "All",
  );
  const [statusFilter, setStatusFilter] = useState<"All" | AlertStatus>("All");
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((alert) => alert.status === "Open").length;
    const critical = alerts.filter(
      (alert) => alert.severity === "Critical" && alert.status === "Open",
    ).length;
    const acknowledged = alerts.filter(
      (alert) => alert.status === "Acknowledged",
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE),
  );

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
          : alert,
      ),
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
      })),
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
        <div className="relative overflow-hidden rounded-[10px] border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          {/* Premium Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

          {/* Top Right Glow */}
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

          {/* Bottom Left Glow */}
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

          {/* Center Glow */}
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

          {/* Premium Highlight */}
          <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

          {/* Glass Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            {/* Left Content */}
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-[8px] border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                <AlertTriangle size={14} />
                Predictive Monitoring
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Predictive Alerts
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Review critical predictive alerts, machine risk warnings,
                component health degradation and maintenance recommendations
                from your assigned fleet.
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleAcknowledgeAll}
              className="
        inline-flex
        h-12
        items-center
        justify-center
        gap-2
        rounded-xl
        border
        border-white/15
        bg-white/10
        px-5
        text-sm
        font-bold
        text-white
        backdrop-blur-md
        transition-all
        duration-300
        hover:-translate-y-1
        hover:bg-white/20
        hover:shadow-xl
      "
            >
              <CheckCircle2 size={17} />
              Acknowledge All
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[8px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
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

          <div className="rounded-[8px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
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

          <div className="rounded-[8px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
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

          <div className="rounded-[8px] border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
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
                className="h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="w-full sm:w-auto">
                  <AppSelect
                    value={severityFilter}
                    onChange={(value) =>
                      handleSeverityChange(value as "All" | AlertSeverity)
                    }
                    placeholder="All Severity"
                    options={[
                      {
                        value: "All",
                        label: "Severity",
                      },
                      {
                        value: "Critical",
                        label: "Critical",
                      },
                      {
                        value: "Warning",
                        label: "Warning",
                      },
                    ]}
                    className="w-full sm:w-44"
                  />
                </div>
              </div>

              <div className="w-full sm:w-auto">
                <AppSelect
                  value={statusFilter}
                  onChange={(value) =>
                    handleStatusChange(value as "All" | AlertStatus)
                  }
                  placeholder="All Status"
                  options={[
                    {
                      value: "All",
                      label: "Status",
                    },
                    {
                      value: "Open",
                      label: "Open",
                    },
                    {
                      value: "Acknowledged",
                      label: "Acknowledged",
                    },
                  ]}
                  className="w-full sm:w-44"
                />
              </div>

              <button
                type="button"
                onClick={handleClearFilters}
                className="
    inline-flex
    h-12
    items-center
    justify-center
    gap-2
    rounded-[8px]
    border
    border-slate-200
    bg-white
    px-5
    text-sm
    font-semibold
    text-slate-700
    shadow-sm
    transition-all
    duration-200
    hover:border-blue-300
    hover:bg-slate-50
    focus:outline-none
    focus:ring-2
    focus:ring-blue-500/20
    dark:border-slate-700
    dark:bg-slate-800
    dark:text-slate-100
    dark:hover:bg-slate-700
    dark:focus:ring-blue-400/20
  "
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
                    className={`flex flex-col gap-4 rounded-[8px] border p-5 transition md:flex-row md:items-center md:justify-between ${
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
                        className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-3 text-sm font-black transition ${
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
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
