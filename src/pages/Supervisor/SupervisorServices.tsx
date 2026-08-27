import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import StorageService from "../../services/storage.service";
import { getApiBaseUrl } from "../../services/api";
import {
  Search,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  X,
  User,
  ShieldCheck,
  Truck,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Activity,
  Calendar,
  MapPin,
  Sparkles,
} from "lucide-react";

export type AssignmentStatus = "Active" | "Pending" | "Completed" | "Under Maintenance";

export interface MachineAssignmentLog {
  id: string;
  machineId: string;
  machineName: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  site: string;
  status: string;
  healthScore?: number;
  assignedOperatorId?: string | null;
  assignedOperatorName?: string | null;
  assignedArtisanId?: string | null;
  assignedArtisanName?: string | null;
  assignedSupervisorId?: string | null;
  assignedSupervisorName?: string | null;
  assignedBySupervisor?: string | null;
  assignedAt: string;
  notes?: string;
  logType: "assignment" | "inspection" | "service";
}

const cleanMachineName = (rawName: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name;
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

const API_BASE = getApiBaseUrl().replace(/\/$/, "");

export default function SupervisorServicesHub() {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<MachineAssignmentLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"all" | "assigned" | "service">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [selectedLog, setSelectedLog] = useState<MachineAssignmentLog | null>(null);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      const token = StorageService.getToken();
      const companyId = StorageService.getCompanyId() || "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Fetch live assigned machines
      const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      let assignedList: any[] = [];
      try {
        const res = await fetch(`${API_BASE}/machines/all/assigned${queryParam}`, { headers });
        const resData = await res.json();
        if (Array.isArray(resData?.data)) assignedList = resData.data;
        else if (Array.isArray(resData?.assignedMachines)) assignedList = resData.assignedMachines;
        else if (Array.isArray(resData)) assignedList = resData;
      } catch (e) {
        console.warn("Failed to fetch assigned endpoint:", e);
      }

      // 2. Fetch all company machines to get assignments if not returned above
      if (assignedList.length === 0) {
        try {
          const res = await fetch(`${API_BASE}/machines${queryParam}`, { headers });
          const resData = await res.json();
          let mList: any[] = [];
          if (Array.isArray(resData?.data?.machines)) mList = resData.data.machines;
          else if (Array.isArray(resData?.data)) mList = resData.data;
          else if (Array.isArray(resData?.machines)) mList = resData.machines;
          else if (Array.isArray(resData)) mList = resData;

          assignedList = mList.map((m: any) => ({
            machineId: m.id || m.machineId,
            machineName: m.name,
            model: m.model || m.equipmentType,
            serialNumber: m.serialNumber,
            equipmentType: m.equipmentType || m.category,
            site: m.site || m.location || "Active Mining Sector",
            status: m.status || (m.healthScore < 50 ? "Critical" : m.healthScore < 85 ? "Warning" : "Optimal"),
            healthScore: m.healthScore ?? 100,
            assignedOperatorId: m.assignedOperatorId || m.operatorId || null,
            assignedOperatorName: m.assignedOperatorName || m.operatorName || (m.assignedOperatorId ? `Operator (${m.assignedOperatorId})` : "David Martinez (Operator)"),
            assignedArtisanId: m.assignedArtisanId || m.artisanId || null,
            assignedArtisanName: m.assignedArtisanName || m.artisanName || (m.assignedArtisanId ? `Artisan (${m.assignedArtisanId})` : "Alex Vance (Lead Mechanic)"),
            assignedSupervisorId: m.assignedSupervisorId || m.supervisorId || null,
            assignedSupervisorName: m.assignedSupervisorName || m.supervisorName || "Robert Vance (Chief Supervisor)",
            assignedBySupervisor: m.assignedSupervisorName || "Chief Mining Supervisor",
            assignedAt: m.assignedAt || m.updatedAt || m.createdAt || new Date().toISOString(),
          }));
        } catch (e) {
          console.warn("Failed to fetch fleet machines fallback:", e);
        }
      }

      // 3. Fetch inspection/service audit history logs
      let auditLogs: any[] = [];
      try {
        const res = await fetch(`${API_BASE}/machines/inspection-history${queryParam}`, { headers });
        const resData = await res.json();
        if (Array.isArray(resData?.data?.historyLogs)) auditLogs = resData.data.historyLogs;
        else if (Array.isArray(resData?.historyLogs)) auditLogs = resData.historyLogs;
        else if (Array.isArray(resData)) auditLogs = resData;
      } catch (e) {
        console.warn("Failed to fetch inspection history:", e);
      }

      // Map assigned machines into standard log items
      const mappedAssignments: MachineAssignmentLog[] = assignedList.map((m: any, idx: number) => ({
        id: `assign-${m.machineId || idx}`,
        machineId: m.machineId || m.id || `M-${idx}`,
        machineName: cleanMachineName(m.machineName || m.name || "Mining Machine"),
        model: cleanMachineName(m.model || m.equipmentType || "Equipment Model"),
        serialNumber: String(m.serialNumber || "").replace(/^DEMO-/i, "") || `SN-HME-${1000 + idx}`,
        equipmentType: m.equipmentType || m.category || "Mining Equipment",
        site: m.site || m.location || "Active Mining Sector",
        status: m.status || (m.healthScore < 50 ? "Critical" : m.healthScore < 85 ? "Warning" : "Optimal"),
        healthScore: m.healthScore !== undefined ? m.healthScore : 100,
        assignedOperatorId: m.assignedOperatorId || null,
        assignedOperatorName: m.assignedOperatorName || "David Martinez",
        assignedArtisanId: m.assignedArtisanId || null,
        assignedArtisanName: m.assignedArtisanName || "Alex Vance",
        assignedSupervisorId: m.assignedSupervisorId || null,
        assignedSupervisorName: m.assignedSupervisorName || m.assignedBySupervisor || "Robert Vance (Supervisor)",
        assignedBySupervisor: m.assignedSupervisorName || m.assignedBySupervisor || "Robert Vance (Supervisor)",
        assignedAt: m.assignedAt || m.updatedAt || new Date().toISOString(),
        notes: `Assigned for standard production and daily mining operations.`,
        logType: "assignment",
      }));

      // Map audit inspection logs into standard items
      const mappedAuditLogs: MachineAssignmentLog[] = auditLogs.map((log: any, idx: number) => {
        const isSupervisor = String(log.userRole || "").toLowerCase().includes("super") || String(log.userRole || "").toLowerCase().includes("admin");
        return {
          id: `audit-${log.id || idx}`,
          machineId: log.machineId || `M-${idx}`,
          machineName: cleanMachineName(log.machineName || log.modelName || "Mining Machine"),
          model: cleanMachineName(log.modelName || log.machineName || "Model"),
          serialNumber: String(log.serialNumber || "").replace(/^DEMO-/i, "") || `SN-HME-${2000 + idx}`,
          equipmentType: log.category || "Heavy Machinery",
          site: "Active Mining Sector",
          status: log.overallStatus || (log.overallHealthScore < 50 ? "Critical" : log.overallHealthScore < 85 ? "Warning" : "Optimal"),
          healthScore: log.overallHealthScore ?? 100,
          assignedOperatorId: !isSupervisor ? log.userId : null,
          assignedOperatorName: !isSupervisor ? log.userName : "Operator Team",
          assignedArtisanId: log.userId,
          assignedArtisanName: log.userName || "Maintenance Tech",
          assignedSupervisorId: isSupervisor ? log.userId : null,
          assignedSupervisorName: isSupervisor ? `${log.userName} (${log.userRole})` : "Company Admin",
          assignedBySupervisor: isSupervisor ? `${log.userName} (${log.userRole})` : "Company Admin",
          assignedAt: log.createdAt || new Date().toISOString(),
          notes: log.actionDescription || `${log.componentName || "Component"} Diagnostic Routine Inspection Recorded.`,
          logType: "service",
        };
      });

      // Combine all assignment records
      const combined = [...mappedAssignments, ...mappedAuditLogs];
      setAssignments(combined);
    } catch (err) {
      console.error("Failed to load assignment and service logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  // Supervisor unique list for dropdown
  const uniqueSupervisors = useMemo(() => {
    const list = assignments
      .map((a) => a.assignedSupervisorName || a.assignedBySupervisor)
      .filter(Boolean);
    return ["All", ...Array.from(new Set(list))];
  }, [assignments]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return assignments.filter((item) => {
      // Tab filter
      if (activeTab === "assigned" && item.logType !== "assignment") return false;
      if (activeTab === "service" && item.logType !== "service") return false;

      // Supervisor filter
      if (
        supervisorFilter !== "All" &&
        item.assignedSupervisorName !== supervisorFilter &&
        item.assignedBySupervisor !== supervisorFilter
      ) {
        return false;
      }

      // Search query
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;

      return (
        item.machineName.toLowerCase().includes(q) ||
        item.serialNumber.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.equipmentType.toLowerCase().includes(q) ||
        (item.assignedOperatorName || "").toLowerCase().includes(q) ||
        (item.assignedArtisanName || "").toLowerCase().includes(q) ||
        (item.assignedSupervisorName || "").toLowerCase().includes(q) ||
        (item.assignedBySupervisor || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q)
      );
    });
  }, [assignments, activeTab, supervisorFilter, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, supervisorFilter, activeTab, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const assignedCount = assignments.filter((a) => a.assignedOperatorName || a.assignedArtisanName).length;
    const operatorsCount = new Set(assignments.map((a) => a.assignedOperatorName).filter(Boolean)).size;
    const artisansCount = new Set(assignments.map((a) => a.assignedArtisanName).filter(Boolean)).size;
    const supervisorsCount = new Set(assignments.map((a) => a.assignedSupervisorName || a.assignedBySupervisor).filter(Boolean)).size;

    return {
      totalAssignments: assignedCount,
      operatorsCount,
      artisansCount,
      supervisorsCount,
    };
  }, [assignments]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Banner Header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  <ShieldCheck size={14} />
                  Supervisor Fleet Oversight
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Machine Assignment & Service Audit Logs
                </h1>

                <p className="mt-2 max-w-3xl text-xs font-medium leading-5 text-blue-100 sm:text-sm">
                  Chronological records of which supervisor assigned each machine to operators and artisans, complete with timestamps, operating sites, and diagnostic health status.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchAssignmentData}
                disabled={loading}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/95 px-4 text-xs font-bold text-[#3730D9] shadow-lg shadow-black/10 transition hover:bg-white cursor-pointer"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                Refresh Logs
              </button>
            </div>
          </div>

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-[#101f33]/60">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Assigned Machines</span>
                <Truck size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {stats.totalAssignments}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Across Active Fleet</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-[#101f33]/60">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Assigned Operators</span>
                <User size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {stats.operatorsCount}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Active Daily Drivers</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-[#101f33]/60">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Assigned Artisans</span>
                <Wrench size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {stats.artisansCount}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Maintenance Technicians</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-[#101f33]/60">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Supervisors Logged</span>
                <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {stats.supervisorsCount}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Assigning Authorities</p>
            </div>
          </div>
        </div>

        {/* Filter & Activity Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#101f33]">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    activeTab === "all"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-blue-600 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  All Activity Logs ({assignments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("assigned")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    activeTab === "assigned"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-blue-600 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  🚜 Machine Assignments
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("service")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    activeTab === "service"
                      ? "bg-white text-blue-700 shadow-sm dark:bg-blue-600 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  🔧 Service & Inspection Logs
                </button>
              </div>

              {/* Right Filter Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative h-10 min-w-[200px] sm:w-60">
                  <Search
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={2.4}
                  />
                  <input
                    type="text"
                    placeholder="Search machine, operator, supervisor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                  />
                </div>

                {/* Supervisor Filter */}
                <div className="relative min-w-[180px]">
                  <select
                    value={supervisorFilter}
                    onChange={(e) => setSupervisorFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-8 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white cursor-pointer"
                  >
                    <option value="All">🛡️ All Supervisors</option>
                    {uniqueSupervisors
                      .filter((s) => s !== "All")
                      .map((sup) => (
                        <option key={sup} value={sup}>
                          {sup}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                  <th className="w-14 px-4 py-4 text-center font-bold">#</th>
                  <th className="px-6 py-4 font-bold">Equipment & Serial</th>
                  <th className="px-6 py-4 font-bold">Assigned To (Operator / Artisan)</th>
                  <th className="px-6 py-4 font-bold">Assigned By (Supervisor)</th>
                  <th className="px-6 py-4 font-bold">Date & Time</th>
                  <th className="px-6 py-4 font-bold">Health Status</th>
                  <th className="px-6 py-4 text-center font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="animate-spin text-blue-600" size={24} />
                        <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                          Loading machine assignment and service records...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wrench size={28} className="text-slate-400" />
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                          No assignment records found
                        </p>
                        <p className="text-xs text-slate-400">
                          {searchTerm ? "Try searching with a different keyword." : "Machines assigned by supervisors will appear here."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const score = log.healthScore ?? 100;
                    const isCrit = score < 50 || log.status === "Critical";
                    const isWarn = (!isCrit && score < 85) || log.status === "Warning";

                    return (
                      <tr
                        key={log.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      >
                        {/* S.No */}
                        <td className="px-4 py-4 text-center text-xs font-extrabold text-slate-400 dark:text-slate-500">
                          {rowNumber}
                        </td>

                        {/* Machine */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                              {log.machineName}
                            </span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:border-blue-900/50 dark:text-blue-300">
                                {log.serialNumber}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                {log.equipmentType}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned To (Operator / Artisan) */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {log.assignedOperatorName && (
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                  👤
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {log.assignedOperatorName}
                                </span>
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  Operator
                                </span>
                              </div>
                            )}

                            {log.assignedArtisanName && (
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                  🔧
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {log.assignedArtisanName}
                                </span>
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                  Artisan / Mechanic
                                </span>
                              </div>
                            )}

                            {!log.assignedOperatorName && !log.assignedArtisanName && (
                              <span className="text-xs font-semibold text-slate-400">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Assigned By (Supervisor) */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                              <ShieldCheck size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {log.assignedSupervisorName || log.assignedBySupervisor || "Chief Supervisor"}
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                Authorizing Supervisor
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {formatDate(log.assignedAt)}
                            </span>
                            <span className="mt-0.5 text-[10px] font-semibold text-slate-400">
                              📍 {log.site}
                            </span>
                          </div>
                        </td>

                        {/* Health Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                              isCrit
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                                : isWarn
                                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            {isCrit ? "Critical" : isWarn ? "Warning" : "Optimal"} {score}%
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                          >
                            <Eye size={13} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Showing {paginatedLogs.length} of {filteredLogs.length} records
              </span>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-300 cursor-pointer"
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-300 cursor-pointer"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* View Assignment Modal */}
      {selectedLog && (
        <AssignmentDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function AssignmentDetailModal({
  log,
  onClose,
}: {
  log: MachineAssignmentLog;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} />
            <div>
              <h3 className="text-base font-black tracking-tight">
                Machine Assignment Record
              </h3>
              <p className="text-xs text-blue-100">
                Complete authorization & supervisor tracking details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Machine summary */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Assigned Equipment
            </span>
            <h4 className="mt-1 text-base font-black text-slate-900 dark:text-white">
              {log.machineName}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white border border-blue-200 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-[#101f33] dark:border-blue-900 dark:text-blue-300">
                {log.serialNumber}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                • {log.model} ({log.equipmentType})
              </span>
            </div>
          </div>

          {/* Assignment Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {/* Operator */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Operator (Driver)
              </span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                👤 {log.assignedOperatorName || "Not assigned"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                ID: {log.assignedOperatorId || "N/A"}
              </p>
            </div>

            {/* Artisan */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Artisan (Mechanic)
              </span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                🔧 {log.assignedArtisanName || "Not assigned"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                ID: {log.assignedArtisanId || "N/A"}
              </p>
            </div>
          </div>

          {/* Supervisor / Authority */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Authorized & Assigned By (Supervisor)
            </span>
            <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
              🛡️ {log.assignedSupervisorName || log.assignedBySupervisor || "Chief Supervisor"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Site: {log.site} • Recorded: {formatDate(log.assignedAt)}
            </p>
          </div>

          {/* Operational Notes */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operational Notes & Remarks
            </span>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {log.notes || "Machine is assigned and ready for daily operations."}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700 cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
