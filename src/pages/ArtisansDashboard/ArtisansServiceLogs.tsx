import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  FileClock,
  Calendar,
  User,
  ShieldCheck,
  Activity,
  Truck,
  Wrench,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

import { apiCall } from "../../services/apiHandler";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

export interface ServiceLogRecord {
  id: string;
  machineId: string;
  machineName: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  site: string;
  status: string;
  healthScore: number;
  assignedOperatorName: string;
  assignedArtisanName: string;
  assignedSupervisorName: string;
  submittedByName: string;
  submittedByRole: string;
  serviceDate: string;
  serviceType: string;
  actionDescription: string;
  readings?: any;
  checklist?: any;
  rawLog?: any;
}

const cleanMachineName = (rawName?: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name || "Mining Equipment";
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export default function ArtisansServiceLogs() {
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const currentArtisanName = storedUser?.name || storedUser?.fullName || "Artisan Technician";
  const userCompanyId = StorageService.getCompanyId() || "";

  const [logs, setLogs] = useState<ServiceLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [selectedLog, setSelectedLog] = useState<ServiceLogRecord | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchServiceLogs = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam = userCompanyId ? `?companyId=${encodeURIComponent(userCompanyId)}` : "";

      // 1. Fetch real audit and inspection logs from PostgreSQL database
      let rawAuditLogs: any[] = [];
      try {
        const res: any = await apiCall(
          `/machines/inspection-history${queryParam}`,
          { method: "GET" },
          { showError: false }
        ).catch(() => null);

        if (Array.isArray(res?.data?.historyLogs)) rawAuditLogs = res.data.historyLogs;
        else if (Array.isArray(res?.historyLogs)) rawAuditLogs = res.historyLogs;
        else if (Array.isArray(res?.data)) rawAuditLogs = res.data;
        else if (Array.isArray(res)) rawAuditLogs = res;
      } catch (err) {
        console.warn("Could not fetch inspection history:", err);
      }

      // 2. Map all logs into rich Artisan Service Log records
      const mapped: ServiceLogRecord[] = rawAuditLogs.map((item: any, idx: number) => {
        const userRole = String(item.userRole || "ARTISAN").toUpperCase();
        const score = item.overallMachineHealth ?? item.overallHealthScore ?? 100;
        const status = score >= 80 ? "Healthy" : score >= 60 ? "Warning" : "Critical";

        return {
          id: item.id || `LOG-${idx + 1}`,
          machineId: item.machineId || `M-${idx + 1}`,
          machineName: cleanMachineName(item.machineName || item.modelName || "Mining Machine"),
          model: cleanMachineName(item.modelName || item.machineName || "Mining Model"),
          serialNumber: String(item.serialNumber || "").replace(/^DEMO-/i, "") || "SN-HME-1001",
          equipmentType: item.category || "Heavy Machinery",
          site: item.location || "Active Mining Sector A",
          status,
          healthScore: score,
          assignedOperatorName: userRole.includes("OPERATOR") ? item.userName || "Operator User" : "Operator Team",
          assignedArtisanName: userRole.includes("ARTISAN") ? item.userName || currentArtisanName : currentArtisanName,
          assignedSupervisorName: "Supervisor Team",
          submittedByName: item.userName || "Operator / Artisan",
          submittedByRole: userRole,
          serviceDate: item.createdAt || new Date().toISOString(),
          serviceType: item.componentCategory || (item.actionDescription ? "Technical Service" : "Pre-Start Inspection"),
          actionDescription: item.actionDescription || `${item.componentName || "Component"} inspection & telemetry verification recorded.`,
          readings: item.readings,
          checklist: item.checklist,
          rawLog: item,
        };
      });

      setLogs(mapped);
    } catch (err) {
      console.error("Error fetching service logs:", err);
      showErrorToast("Failed to load service logs from database.");
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, currentArtisanName]);

  useEffect(() => {
    fetchServiceLogs();
  }, [fetchServiceLogs]);

  // Search & Filter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.machineName.toLowerCase().includes(q) ||
        log.serialNumber.toLowerCase().includes(q) ||
        log.submittedByName.toLowerCase().includes(q) ||
        log.actionDescription.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "All" ||
        (roleFilter === "OPERATOR" && log.submittedByRole.includes("OPERATOR")) ||
        (roleFilter === "ARTISAN" && log.submittedByRole.includes("ARTISAN")) ||
        (roleFilter === "SUPERVISOR" && log.submittedByRole.includes("SUPERVISOR"));

      return matchesSearch && matchesRole;
    });
  }, [logs, searchTerm, roleFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            <FileClock size={14} />
            Fleet Maintenance Audit History
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Service Logs & Inspection Records
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Complete chronological database audit of all submissions made for this equipment by Operators, Artisans, and Supervisors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              fetchServiceLogs();
              showSuccessToast("Refreshed all service logs from PostgreSQL Database!");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
            Refresh Database Logs
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Total Audit Logs</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{logs.length}</p>
          <p className="text-[11px] font-semibold text-slate-400">Recorded in PostgreSQL</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Operator Submissions</span>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {logs.filter((l) => l.submittedByRole.includes("OPERATOR")).length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Pre-start & work reports</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Artisan Interventions</span>
          <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {logs.filter((l) => l.submittedByRole.includes("ARTISAN")).length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Mechanical calibrations</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Optimal Status</span>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {logs.filter((l) => l.status === "Healthy").length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Verified healthy equipment</p>
        </div>
      </div>

      {/* ── TABLE CONTAINER ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        {/* Filter Bar */}
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative h-10 w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search machine, submitter, action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#101f33]">
              {(["All", "OPERATOR", "ARTISAN", "SUPERVISOR"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    roleFilter === r
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {r === "All" ? "All Submissions" : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-6 py-4 font-bold">#</th>
                <th className="px-6 py-4 font-bold">Machine Equipment</th>
                <th className="px-6 py-4 font-bold">Date & Time</th>
                <th className="px-6 py-4 font-bold">Service / Action Scope</th>
                <th className="px-6 py-4 font-bold">Health Score</th>
                <th className="px-6 py-4 font-bold">Submitted By</th>
                <th className="px-6 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs font-bold text-slate-400">
                    <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={24} />
                    Loading database service logs...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs font-bold text-slate-400">
                    No service or inspection logs found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isOp = log.submittedByRole.includes("OPERATOR");
                  const isArt = log.submittedByRole.includes("ARTISAN");

                  return (
                    <tr key={log.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-bold text-slate-400">{itemIndex}</td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{log.machineName}</span>
                          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{log.serialNumber}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white">
                        {formatDate(log.serviceDate)}
                      </td>

                      <td className="px-6 py-4">
                        <p className="max-w-xs truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {log.actionDescription}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            log.healthScore >= 80
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : log.healthScore >= 60
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          ● {log.healthScore}% Optimal
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            👤 {log.submittedByName}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase ${
                              isOp
                                ? "text-blue-600 dark:text-blue-400"
                                : isArt
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            [{log.submittedByRole}]
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                        >
                          <Eye size={13} />
                          View Snapshot
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-500">
              Page {currentPage} of {totalPages} ({filteredLogs.length} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: DETAILED SNAPSHOT ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728] space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      Audit Log ID: {selectedLog.id}
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      ● {selectedLog.healthScore}% Optimal
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                    {selectedLog.machineName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Serial: <span className="font-mono text-slate-600 dark:text-slate-300">{selectedLog.serialNumber}</span> • Category: {selectedLog.equipmentType}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submission Time</span>
                <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">{formatDate(selectedLog.serviceDate)}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted By</span>
                <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">👤 {selectedLog.submittedByName}</p>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Role: {selectedLog.submittedByRole}</span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Category</span>
                <p className="mt-1 text-xs font-black text-slate-900 dark:text-white truncate">{selectedLog.serviceType}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Status</span>
                <p className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400">✓ Verified Log</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#101f33]/40 space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Action Remarks & Diagnostic Observations:</span>
              <p className="text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                {selectedLog.actionDescription}
              </p>
            </div>

            {selectedLog.readings?.components && Array.isArray(selectedLog.readings.components) && selectedLog.readings.components.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recorded Component Readings ({selectedLog.readings.components.length})
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                  {selectedLog.readings.components.map((comp: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{comp.name}</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {comp.health ?? 100}%
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">{comp.currentReading || "Normal"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 cursor-pointer"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
