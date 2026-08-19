import { useState, useMemo, useEffect } from "react";
import {
  Wrench,
  CheckCircle2,
  Clock,
  Search,
  User,
  ShieldCheck,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination";
import { reportApprovalService } from "../../services/Task/reportApprovalService";

export type ArtisanFixItem = {
  id: string;
  artisanName: string;
  artisanRole: string;
  machineName: string;
  machineId: string;
  component: string;
  reportedIssue: string;
  operatorName: string;
  workPerformed: string;
  fixDate: string;
  duration: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Verified" | "In Progress" | "Pending Verification";
  supervisorRemarks?: string;
};

export default function ArtisanFixHistory() {
  const [historyList, setHistoryList] = useState<ArtisanFixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [artisanFilter, setArtisanFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(5);

  const formatDuration = (rpt: any) => {
    if (rpt?.duration) return String(rpt.duration);
    if (rpt?.hoursSpent) return `${rpt.hoursSpent}h`;
    if (rpt?.timeTaken) return String(rpt.timeTaken);
    if (rpt?.startTime && rpt?.endTime) {
      const diffMs = new Date(rpt.endTime).getTime() - new Date(rpt.startTime).getTime();
      if (!isNaN(diffMs) && diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
    }
    return "N/A";
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [reports, historyData] = await Promise.all([
        reportApprovalService.getReports(),
        reportApprovalService.getHistory(),
      ]);

      const allReports = [...(reports || []), ...(historyData || [])];

      // Filter strictly for Artisans only (exclude operators like 'Alex Operator')
      const artisanReportsOnly = allReports.filter((rpt: any) => {
        const role = String(rpt?.role || "").toLowerCase();
        const name = String(rpt?.submittedBy || rpt?.artisanName || "").toLowerCase();
        if (role.includes("operator") || name.includes("operator")) return false;
        return true;
      });

      const mappedReports: ArtisanFixItem[] = artisanReportsOnly.map((rpt: any, idx: number) => {
        let statusVal: ArtisanFixItem["status"] = "Verified";
        if (rpt?.status === "pending") statusVal = "Pending Verification";
        else if (rpt?.status === "reviewed" || rpt?.status === "in_progress") statusVal = "In Progress";
        else statusVal = "Verified";

        const artisanName = rpt?.submittedBy || rpt?.artisanName || "Assigned Artisan";
        const machineName = rpt?.machineName || rpt?.tags?.[0] || "Equipment Unit";
        const comp = rpt?.tags?.[1] || rpt?.title || "General Mechanical System";
        const issue = rpt?.description || "Reported issue";
        const fix = rpt?.workPerformed || rpt?.correctiveAction || rpt?.description || "Corrective maintenance performed";
        const dateStr = rpt?.date
          ? `${rpt.date}`
          : rpt?.createdAt
          ? new Date(rpt.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

        return {
          id: String(rpt?.id || `FIX-${1000 + idx}`),
          artisanName,
          artisanRole: rpt?.specialization || rpt?.artisanRole || rpt?.role_name || (typeof rpt?.role === "string" ? rpt.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Artisan"),
          machineName,
          machineId: String(rpt?.machineId || `m_${idx}`),
          component: comp,
          reportedIssue: issue,
          operatorName: rpt?.operatorName || "Operator",
          workPerformed: fix,
          fixDate: dateStr,
          duration: formatDuration(rpt),
          severity: (rpt?.priority === "critical" ? "Critical" : rpt?.priority === "high" ? "High" : rpt?.priority === "low" ? "Low" : "Medium"),
          status: statusVal,
          supervisorRemarks: rpt?.supervisorRemarks || rpt?.remarks || "",
        };
      });

      setHistoryList(mappedReports);
    } catch (err) {
      console.error("Failed to load artisan fix history:", err);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const artisanOptions = useMemo(() => {
    const names = Array.from(new Set(historyList.map((h) => h.artisanName).filter(Boolean)));
    return [
      { label: "All Artisans", value: "All" },
      ...names.map((n) => ({ label: n, value: n })),
    ];
  }, [historyList]);

  const statusOptions = [
    { label: "All Statuses", value: "All" },
    { label: "Verified", value: "Verified" },
    { label: "In Progress", value: "In Progress" },
    { label: "Pending Verification", value: "Pending Verification" },
  ];

  const severityOptions = [
    { label: "All Severities", value: "All" },
    { label: "Critical", value: "Critical" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
  ];

  const filteredHistory = useMemo(() => {
    const q = search.toLowerCase().trim();
    return historyList.filter((item) => {
      const matchesSearch =
        !q ||
        item.artisanName.toLowerCase().includes(q) ||
        item.machineName.toLowerCase().includes(q) ||
        item.component.toLowerCase().includes(q) ||
        item.reportedIssue.toLowerCase().includes(q) ||
        item.workPerformed.toLowerCase().includes(q);

      const matchesArtisan = artisanFilter === "All" || item.artisanName === artisanFilter;
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesSeverity = severityFilter === "All" || item.severity === severityFilter;

      return matchesSearch && matchesArtisan && matchesStatus && matchesSeverity;
    });
  }, [historyList, search, artisanFilter, statusFilter, severityFilter]);

  const isShowAll = itemsPerPage === "all";
  const effectivePageSize = isShowAll ? Math.max(1, filteredHistory.length) : itemsPerPage;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(filteredHistory.length / effectivePageSize));
  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedHistory = isShowAll ? filteredHistory : filteredHistory.slice(startIndex, startIndex + effectivePageSize);
  const startItem = filteredHistory.length === 0 ? 0 : isShowAll ? 1 : startIndex + 1;
  const endItem = isShowAll ? filteredHistory.length : Math.min(startIndex + effectivePageSize, filteredHistory.length);

  const stats = useMemo(() => {
    const topArtisanName = historyList[0]?.artisanName ? historyList[0].artisanName : "N/A";
    const validDurations = historyList.map(h => h.duration).filter(d => d && d !== "N/A");
    const avgDurationText = validDurations.length > 0 ? validDurations[0] : "N/A";

    return {
      total: historyList.length,
      verified: historyList.filter((h) => h.status === "Verified").length,
      avgTime: avgDurationText,
      topArtisan: topArtisanName,
    };
  }, [historyList]);

  // Verification Modal State
  const [selectedItem, setSelectedItem] = useState<ArtisanFixItem | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<ArtisanFixItem["status"]>("Verified");
  const [remarks, setRemarks] = useState("");
  const [savingVerify, setSavingVerify] = useState(false);

  const handleOpenVerifyModal = (item: ArtisanFixItem) => {
    setSelectedItem(item);
    setVerifyStatus(item.status);
    setRemarks(item.supervisorRemarks || "");
    setIsVerifyModalOpen(true);
  };

  const handleSaveVerification = async () => {
    if (!selectedItem) return;
    try {
      setSavingVerify(true);
      let rptStatus: "approved" | "reviewed" | "pending" | "rejected" = "approved";
      if (verifyStatus === "Pending Verification") rptStatus = "pending";
      else if (verifyStatus === "In Progress") rptStatus = "reviewed";

      await reportApprovalService.updateReportStatus(selectedItem.id, rptStatus, remarks);

      setHistoryList((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, status: verifyStatus, supervisorRemarks: remarks }
            : item
        )
      );

      setIsVerifyModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error("Failed to update verification status:", err);
    } finally {
      setSavingVerify(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-8 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Wrench size={14} />
              Supervisor Operations Audit
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Artisan Work & Fixed Issues Log
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Track which Artisan fixed which machine component issue, view work performed, resolution date/time, operator reported issues, and supervisor verification status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search artisan, issue, machine..."
                className="h-12 w-full rounded-xl border border-white/15 bg-white/10 pl-12 pr-4 text-sm font-medium text-white backdrop-blur-md outline-none transition-all placeholder:text-white/50 focus:border-white/30 focus:bg-white/15 focus:ring-4 focus:ring-white/10"
              />
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refresh Fix History"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Fixed Issues</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</h3>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verified Repairs</p>
              <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.verified}</h3>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Repair Duration</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.avgTime}</h3>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Top Artisan Performer</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate max-w-[170px]">{stats.topArtisan}</h3>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <User size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <AppSelect
              options={artisanOptions}
              value={artisanFilter}
              onChange={(val) => {
                setArtisanFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-44">
            <AppSelect
              options={severityOptions}
              value={severityFilter}
              onChange={(val) => {
                setSeverityFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-44">
            <AppSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Fix History Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-[#081226]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Artisan Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Machine & Component
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Reported Issue & Fix Performed
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Completion Time
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading && historyList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Loading artisan fix history & repair logs...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No artisan fix history records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/40 dark:text-blue-400">
                          {item.artisanName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.artisanName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.artisanRole}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.machineName}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Wrench className="h-3 w-3 text-blue-500" />
                          {item.component}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <div className="space-y-2 text-xs">
                        <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/40">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Reported Issue: </span>
                          <span className="text-slate-600 dark:text-slate-400">{item.reportedIssue}</span>
                          <span className="ml-2 font-medium text-slate-400">(By: {item.operatorName})</span>
                        </div>
                        <div className="rounded-lg bg-emerald-50/50 p-2.5 dark:bg-emerald-950/20">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">Fix Performed: </span>
                          <span className="text-emerald-900 dark:text-emerald-200">{item.workPerformed}</span>
                        </div>
                        {item.supervisorRemarks && (
                          <div className="rounded-lg bg-purple-50/60 p-2 dark:bg-purple-950/30">
                            <span className="font-bold text-purple-700 dark:text-purple-300">Supervisor Remarks: </span>
                            <span className="text-purple-900 dark:text-purple-200">{item.supervisorRemarks}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {item.fixDate}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          Time Taken: {item.duration}
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                        item.status === "Verified"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          : item.status === "In Progress"
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                      }`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {item.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenVerifyModal(item)}
                        title="Verify & Add Supervisor Remarks"
                        className="flex h-8 w-8 items-center justify-center mx-auto rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
            totalItems={filteredHistory.length}
            startItem={startItem}
            endItem={endItem}
          />
        </div>
      </div>

      {/* Supervisor Verification & Remarks Modal */}
      {isVerifyModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Supervisor Verification & Audit
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Update verification status and write supervisor audit remarks.
                </p>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Artisan & Equipment</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {selectedItem.artisanName} — <span className="text-blue-600 dark:text-blue-400">{selectedItem.machineName}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Component: {selectedItem.component}</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Verification Status
                </label>
                <AppSelect
                  value={verifyStatus}
                  options={[
                    { label: "Verified", value: "Verified" },
                    { label: "In Progress", value: "In Progress" },
                    { label: "Pending Verification", value: "Pending Verification" },
                  ]}
                  onChange={(val: any) => setVerifyStatus(val)}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Supervisor Remarks & Verification Notes
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter verification notes (e.g. Inspected on site, pressure test verified clean...)"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingVerify}
                  onClick={handleSaveVerification}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingVerify ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Save Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
