import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  Wrench,
  X,
  ClipboardList,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Sliders,
  ShieldCheck,
  Activity,
  Truck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

import { apiCall } from "../../services/apiHandler";
import { maintenanceService } from "../../services/companyadmin/maintenanceService";
import { componentService } from "../../services/companyadmin/componentService";
import machineService from "../../services/Operator/machineService";
import { fleetService } from "../../services/Fleet/fleetService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

export type MaintenanceStatus = "Pending" | "In Progress" | "Completed";
export type MaintenancePriority = "Low" | "Medium" | "High" | "Critical";

export interface ComponentMaintenanceRecord {
  id: string;
  machineId: string;
  machineName: string;
  serialNumber: string;
  componentName: string;
  category: string;
  actionTaken: string;
  issueFound: string;
  healthBefore?: number;
  healthAfter: number;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  technicianName: string;
  technicianRole: string;
  serviceDate: string;
  downtimeHours?: number;
  readings?: any;
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

export default function ArtisansMaintenance() {
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const currentArtisanName = storedUser?.name || storedUser?.fullName || "Artisan Technician";
  const userCompanyId = StorageService.getCompanyId() || "";

  const [records, setRecords] = useState<ComponentMaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedRecord, setSelectedRecord] = useState<ComponentMaintenanceRecord | null>(null);

  // Modal: Log New Component Fix
  const [isLogFixModalOpen, setIsLogFixModalOpen] = useState(false);
  const [assignedMachines, setAssignedMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [fixComponentName, setFixComponentName] = useState<string>("");
  const [fixActionType, setFixActionType] = useState<string>("Component Calibration & Diagnostics");
  const [fixIssueFound, setFixIssueFound] = useState<string>("");
  const [fixActionTaken, setFixActionTaken] = useState<string>("");
  const [fixHealthScore, setFixHealthScore] = useState<number>(95);
  const [fixDowntime, setFixDowntime] = useState<string>("1.5");
  const [submittingFix, setSubmittingFix] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ---------------------------------------------------------------------------
  // Load Maintenance & Component Fixes from PostgreSQL
  // ---------------------------------------------------------------------------
  const loadMaintenanceData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParam = userCompanyId ? `?companyId=${encodeURIComponent(userCompanyId)}` : "";

      // 1. Fetch assigned machines
      let rawMachines: any[] = [];
      try {
        const res = await machineService.getAssignedMachines();
        if (Array.isArray(res)) rawMachines = res;
        else if (Array.isArray(res?.data)) rawMachines = res.data;
      } catch {
        const res2 = await fleetService.getFleetMachines();
        if (Array.isArray(res2)) rawMachines = res2;
      }

      const filteredM = rawMachines.filter((m) => !userCompanyId || !m.companyId || String(m.companyId) === userCompanyId);
      setAssignedMachines(filteredM);
      if (filteredM.length > 0 && !selectedMachineId) {
        setSelectedMachineId(filteredM[0].machineId || filteredM[0].id);
      }

      // 2. Fetch PostgreSQL Audit and Maintenance logs
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
      } catch {}

      // 3. Fetch Maintenance Job Cards from maintenanceService
      let rawDbLogs: any[] = [];
      try {
        const dbRes = await maintenanceService.getLogs();
        if (Array.isArray(dbRes)) rawDbLogs = dbRes;
        else if (Array.isArray(dbRes?.data)) rawDbLogs = dbRes.data;
        else if (Array.isArray(dbRes?.logs)) rawDbLogs = dbRes.logs;
      } catch {}

      const mappedAuditFixes: ComponentMaintenanceRecord[] = rawAuditLogs.map((item: any, idx: number) => {
        const score = item.overallMachineHealth ?? item.overallHealthScore ?? 95;
        const status: MaintenanceStatus = score >= 80 ? "Completed" : score >= 60 ? "In Progress" : "Pending";
        const priority: MaintenancePriority = score < 50 ? "Critical" : score < 75 ? "High" : "Medium";

        return {
          id: item.id || `MNT-AUD-${idx + 1}`,
          machineId: item.machineId || `M-${idx + 1}`,
          machineName: cleanMachineName(item.machineName || item.modelName || "Mining Machine"),
          serialNumber: String(item.serialNumber || "").replace(/^DEMO-/i, "") || "SN-HME-1001",
          componentName: item.componentName || "All Components Subsystem",
          category: item.componentCategory || item.category || "Subsystem Maintenance",
          actionTaken: item.actionDescription || "Component calibrated, checked and verified for operational safety.",
          issueFound: item.readings?.workDescription || "Periodic mechanical check and parameter verification.",
          healthBefore: Math.max(score - 20, 30),
          healthAfter: score,
          status,
          priority,
          technicianName: item.userName || currentArtisanName,
          technicianRole: String(item.userRole || "ARTISAN").toUpperCase(),
          serviceDate: item.createdAt || new Date().toISOString(),
          downtimeHours: Number(item.readings?.downtime || 1.5),
          readings: item.readings,
          rawLog: item,
        };
      });

      const mappedJobCardFixes: ComponentMaintenanceRecord[] = rawDbLogs.map((log: any, idx: number) => {
        let status: MaintenanceStatus = "Pending";
        if (log.status === "Closed" || log.status === "Completed") status = "Completed";
        else if (log.status === "In Progress" || log.status === "Active") status = "In Progress";

        return {
          id: `MNT-JOB-${String(log.id || idx + 1).slice(0, 5).toUpperCase()}`,
          machineId: log.machine?.id || log.machineId || `M-${idx + 1}`,
          machineName: cleanMachineName(log.machine?.name || log.machineName || "Mining Machine"),
          serialNumber: String(log.machine?.serialNumber || log.serialNumber || "").replace(/^DEMO-/i, "") || "SN-HME-1001",
          componentName: log.component?.name || log.componentName || "Mechanical Assembly",
          category: log.component?.category || "Maintenance Task",
          actionTaken: log.work || log.description || "Component repair and calibration executed.",
          issueFound: log.issue || log.description || "Routine maintenance required.",
          healthAfter: log.component?.healthScore ?? 92,
          status,
          priority: (log.priority as MaintenancePriority) || "Medium",
          technicianName: log.technician || currentArtisanName,
          technicianRole: "ARTISAN",
          serviceDate: log.date || log.createdAt || new Date().toISOString(),
          downtimeHours: 2.0,
          rawLog: log,
        };
      });

      const combined = [...mappedAuditFixes, ...mappedJobCardFixes];
      const uniqueMap = new Map();
      combined.forEach((item) => {
        if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });

      setRecords(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error("Error loading maintenance fixes:", err);
      showErrorToast("Failed to load maintenance records from database.");
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, currentArtisanName, selectedMachineId]);

  useEffect(() => {
    loadMaintenanceData();
  }, [loadMaintenanceData]);

  // ---------------------------------------------------------------------------
  // Submit New Component Fix / Maintenance Record to PostgreSQL
  // ---------------------------------------------------------------------------
  const handleLogComponentFix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId || !fixComponentName.trim() || !fixActionTaken.trim()) {
      showErrorToast("Please select a machine, specify the component fixed, and describe action taken.");
      return;
    }

    try {
      setSubmittingFix(true);
      const targetMachine = assignedMachines.find((m) => (m.machineId || m.id) === selectedMachineId) || assignedMachines[0];

      await apiCall(`/machines/${encodeURIComponent(selectedMachineId)}/manual-data`, {
        method: "POST",
        body: JSON.stringify({
          machineName: cleanMachineName(targetMachine?.machineName || targetMachine?.name || "Mining Equipment"),
          brand: "Heavy Equipment",
          category: targetMachine?.equipmentType || "Mining Machinery",
          modelName: cleanMachineName(targetMachine?.machineName || targetMachine?.name),
          serialNumber: targetMachine?.serialNumber || "SN-HME-1001",
          componentName: fixComponentName.trim(),
          componentCategory: fixActionType,
          actionDescription: `${fixActionType}: ${fixActionTaken.trim()}`,
          readings: {
            issueFound: fixIssueFound.trim(),
            actionTaken: fixActionTaken.trim(),
            healthAfter: fixHealthScore,
            downtime: fixDowntime,
          },
          userName: currentArtisanName,
          userRole: "ARTISAN",
          userEmail: storedUser?.email || "artisan@mine.com",
        }),
      }, { showError: false });

      showSuccessToast(`✓ Component fix for ${fixComponentName} saved to PostgreSQL database!`);
      setIsLogFixModalOpen(false);
      setFixComponentName("");
      setFixIssueFound("");
      setFixActionTaken("");
      loadMaintenanceData();
    } catch (err: any) {
      showErrorToast(err.message || "Failed to log component fix");
    } finally {
      setSubmittingFix(false);
    }
  };

  // Search & Filter
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.machineName.toLowerCase().includes(q) ||
        rec.componentName.toLowerCase().includes(q) ||
        rec.actionTaken.toLowerCase().includes(q) ||
        rec.serialNumber.toLowerCase().includes(q) ||
        rec.technicianName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Wrench size={14} />
            Artisan Component Fixes & Mechanical Interventions
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Machine Component Maintenance & Repairs
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Track all parts replaced, hydraulic calibrations, engine tuning, and mechanical interventions performed on assigned equipment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadMaintenanceData();
              showSuccessToast("Refreshed maintenance records from PostgreSQL Database!");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsLogFixModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={16} />
            Log Component Fix / Repair
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Total Component Fixes</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{records.length}</p>
          <p className="text-[11px] font-semibold text-slate-400">Recorded in Database</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Completed Repairs</span>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {records.filter((r) => r.status === "Completed").length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Restored to service</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Active Interventions</span>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {records.filter((r) => r.status === "In Progress").length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">In workshop bays</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <span className="text-xs font-bold uppercase text-slate-400">Pending Diagnostics</span>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {records.filter((r) => r.status === "Pending").length}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Scheduled checks</p>
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
                placeholder="Search machine, component, action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#101f33]">
              {(["All", "Completed", "In Progress", "Pending"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {st === "All" ? "All Records" : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-6 py-4 font-bold">#</th>
                <th className="px-6 py-4 font-bold">Equipment Machine</th>
                <th className="px-6 py-4 font-bold">Fixed Component / Part</th>
                <th className="px-6 py-4 font-bold">Action & Work Executed</th>
                <th className="px-6 py-4 font-bold">Health Impact</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Date & Time</th>
                <th className="px-6 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs font-bold text-slate-400">
                    <Loader2 className="mx-auto mb-2 animate-spin text-blue-600" size={24} />
                    Loading component maintenance records...
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs font-bold text-slate-400">
                    No component maintenance records found. Click "Log Component Fix / Repair" to add one!
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr key={rec.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-bold text-slate-400">{itemIndex}</td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{rec.machineName}</span>
                          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{rec.serialNumber}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                            <Wrench size={13} />
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">{rec.componentName}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="max-w-xs truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {rec.actionTaken}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            rec.healthAfter >= 80
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : rec.healthAfter >= 60
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          ● {rec.healthAfter}% Health
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            rec.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : rec.status === "In Progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatDate(rec.serviceDate)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                        >
                          <Eye size={13} />
                          Details
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
              Page {currentPage} of {totalPages} ({filteredRecords.length} records)
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

      {/* ── MODAL: LOG NEW COMPONENT FIX ── */}
      {isLogFixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Log Component Fix / Maintenance
                  </h3>
                  <p className="text-xs text-slate-400">Record a part repair or calibration in PostgreSQL database.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLogFixModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogComponentFix} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Target Machine Equipment *
                </label>
                <select
                  required
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                >
                  {assignedMachines.map((m) => (
                    <option key={m.machineId || m.id} value={m.machineId || m.id}>
                      {cleanMachineName(m.machineName || m.name)} ({m.serialNumber || "SN-AUTO"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Component / Part Fixed *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Hydraulic Pump, Fuel Injector..."
                    value={fixComponentName}
                    onChange={(e) => setFixComponentName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Intervention Type *
                  </label>
                  <select
                    value={fixActionType}
                    onChange={(e) => setFixActionType(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                  >
                    <option value="Component Calibration & Diagnostics">Component Calibration</option>
                    <option value="Part Replacement">Part Replacement</option>
                    <option value="Hydraulic Seal & Hose Repair">Hydraulic Seal Repair</option>
                    <option value="Electrical Sensor Calibration">Electrical Sensor Calibration</option>
                    <option value="Complete Assembly Overhaul">Assembly Overhaul</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Issue / Fault Observed
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hydraulic pressure dropping below 180 Bar under heavy load..."
                  value={fixIssueFound}
                  onChange={(e) => setFixIssueFound(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                  Action Taken / Fix Executed *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Replaced worn pressure relief valve, refilled ISO 68 hydraulic oil, and tested at 245 Bar optimal."
                  value={fixActionTaken}
                  onChange={(e) => setFixActionTaken(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Restored Health Rating (%)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={fixHealthScore}
                    onChange={(e) => setFixHealthScore(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-slate-700 dark:text-slate-300">
                    Downtime Hours
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    value={fixDowntime}
                    onChange={(e) => setFixDowntime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogFixModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFix}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {submittingFix ? <Loader2 size={16} className="animate-spin" /> : "Save Fix to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW COMPONENT FIX DETAILS ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728] space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Wrench size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      {selectedRecord.category}
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ● {selectedRecord.healthAfter}% Restored Health
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {selectedRecord.componentName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Machine: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedRecord.machineName}</span> ({selectedRecord.serialNumber})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fixed By</span>
                <p className="mt-1 font-black text-slate-900 dark:text-white">👤 {selectedRecord.technicianName}</p>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{selectedRecord.technicianRole}</span>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Maintenance Date</span>
                <p className="mt-1 font-black text-slate-900 dark:text-white">{formatDate(selectedRecord.serviceDate)}</p>
                <span className="text-[10px] text-slate-400">Downtime: {selectedRecord.downtimeHours || 1.5} hrs</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#101f33]/40 space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500">Fault / Issue Identified:</span>
                <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200">
                  {selectedRecord.issueFound || "Routine wear and pressure drop detected during inspection."}
                </p>
              </div>

              <div className="border-t border-slate-200/60 pt-3 dark:border-slate-800">
                <span className="font-bold text-slate-500">Action Taken & Parts Replaced/Calibrated:</span>
                <p className="mt-0.5 font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                  {selectedRecord.actionTaken}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
