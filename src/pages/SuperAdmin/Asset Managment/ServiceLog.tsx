import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Trash2,
  X,
  Building2,
  ChevronDown,
  Globe2,
  ShieldCheck,
  MapPin,
  Factory,
  ChevronUp,
} from "lucide-react";
import { superAdminMachineService } from "../../../services/SuperAdmin/machineService";
import { maintenanceService } from "../../../services/companyadmin/maintenanceService";

// ===========================
// TYPES
// ===========================

export type ServiceLogStatus = "Pending" | "Completed" | "In Progress";
export type ServiceLogPriority = "Low" | "Medium" | "High" | "Critical";

interface Company {
  id: string;
  name: string;
  location: string;
  machineCount: number;
  industry: string;
}

interface Machine {
  id: string;
  machineId: string;
  machineName: string;
  site: string;
  companyId: string;
}

interface ServiceLog {
  id: string;
  companyId: string;
  machineId: string;
  machineName: string;
  site: string;
  component: string;
  serviceType: string;
  engineerId: string;
  serviceDate: string;
  nextServiceDate: string;
  runtimeHours: number;
  status: ServiceLogStatus;
  priority: ServiceLogPriority;
  issueFound: string;
  actionTaken: string;
  remarks: string;
  createdAt: string;
}

const statusOptions: ServiceLogStatus[] = ["Pending", "In Progress", "Completed"];
const priorityOptions: ServiceLogPriority[] = ["Low", "Medium", "High", "Critical"];
const itemsPerPage = 6;

// ===========================
// MAIN COMPONENT
// ===========================

export default function ServiceLogs() {
  const currentUser = { id: "superadmin_1", role: "SuperAdmin", name: "Super Admin" };

  // ===========================
  // STATE
  // ===========================
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [companiesLoading, setCompaniesLoading] = useState(true);

  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ServiceLogStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | ServiceLogPriority>("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ServiceLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceLog | null>(null);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");

  // ===========================
  // FETCH REAL COMPANIES & LOGS
  // ===========================
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setCompaniesLoading(true);
        const list = await superAdminMachineService.getCompanies();
        const arr = Array.isArray(list) ? list : (list as any)?.data || [];
        const formatted: Company[] = arr.map((c: any) => ({
          id: String(c.id),
          name: c.companyName || c.company_name || c.name || "Unnamed Company",
          location: c.companyCode || c.company_code || "Code N/A",
          machineCount: Number(c.staffCount || 0),
          industry: c.activePlan || "Enterprise",
        }));
        setCompanies(formatted);
      } catch (e) {
        console.error("Failed to fetch companies:", e);
      } finally {
        setCompaniesLoading(false);
      }
    };

    loadCompanies();
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLogsLoading(true);
        const rawLogs = await maintenanceService.getLogs({
          scope: selectedCompanyId && selectedCompanyId !== "all" ? "company" : "all",
          companyId: selectedCompanyId && selectedCompanyId !== "all" ? selectedCompanyId : undefined,
        });

        const arr = Array.isArray(rawLogs) ? rawLogs : (rawLogs as any)?.data || [];
        const mapped: ServiceLog[] = arr.map((item: any, idx: number) => {
          const statusRaw = String(item.status || "Completed").toLowerCase();
          let status: ServiceLogStatus = "Completed";
          if (statusRaw.includes("pending") || statusRaw.includes("open")) status = "Pending";
          else if (statusRaw.includes("progress")) status = "In Progress";

          const priorityRaw = String(item.priority || item.severity || "Medium").toLowerCase();
          let priority: ServiceLogPriority = "Medium";
          if (priorityRaw.includes("low")) priority = "Low";
          else if (priorityRaw.includes("high")) priority = "High";
          else if (priorityRaw.includes("crit")) priority = "Critical";

          return {
            id: String(item.id || idx + 1),
            companyId: String(item.companyId || item.machine?.companyId || ""),
            machineId: String(item.machine?.serialNumber || item.machineId || "N/A"),
            machineName: String(item.machine?.name || item.machineName || "Equipment"),
            site: String(item.machine?.site || item.site || "N/A"),
            component: String(item.component?.category || item.component?.description || item.component || "General"),
            serviceType: String(item.work || item.serviceType || "Maintenance"),
            engineerId: String(item.technician || item.engineerId || "N/A"),
            serviceDate: item.date ? new Date(item.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            nextServiceDate: item.nextServiceDate ? new Date(item.nextServiceDate).toISOString().slice(0, 10) : "N/A",
            runtimeHours: Number(item.cost || item.runtimeHours || 0),
            status,
            priority,
            issueFound: String(item.work || item.issueFound || "Service & Inspection"),
            actionTaken: String(item.work || item.actionTaken || "Serviced by technician"),
            remarks: String(item.downtime ? `Downtime: ${item.downtime}` : item.remarks || "Completed successfully"),
            createdAt: item.createdAt || new Date().toISOString(),
          };
        });

        setLogs(mapped);
      } catch (e) {
        console.error("Failed to fetch service logs:", e);
      } finally {
        setLogsLoading(false);
      }
    };

    loadLogs();
  }, [selectedCompanyId]);

  // Reset page on company change
  useEffect(() => { setCurrentPage(1); }, [selectedCompanyId, searchTerm, statusFilter, priorityFilter]);

  // ===========================
  // DERIVED DATA
  // ===========================

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedCompanyId !== "all" && log.companyId !== selectedCompanyId) return false;
      const s = searchTerm.toLowerCase();
      const matchSearch =
        log.machineName.toLowerCase().includes(s) ||
        log.machineId.toLowerCase().includes(s) ||
        log.component.toLowerCase().includes(s) ||
        log.site.toLowerCase().includes(s);
      const matchStatus = statusFilter === "All" || log.status === statusFilter;
      const matchPriority = priorityFilter === "All" || log.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [logs, selectedCompanyId, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const stats = useMemo(() => ({
    total: filteredLogs.length,
    completed: filteredLogs.filter((l) => l.status === "Completed").length,
    inProgress: filteredLogs.filter((l) => l.status === "In Progress").length,
    critical: filteredLogs.filter((l) => l.priority === "Critical").length,
  }), [filteredLogs]);

  // ===========================
  // HANDLERS
  // ===========================
  const handleDelete = () => {
    if (!deleteTarget) return;
    // BACKEND TODO: DELETE API call
    setLogs((prev) => prev.filter((l) => l.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const openViewModal = (log: ServiceLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedLog(null);
    setIsModalOpen(false);
  };

  // ===========================
  // RENDER
  // ===========================
  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 transition-colors duration-300 dark:bg-slate-900 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-5">

          {/* ── HEADER ── */}
         <div className="relative overflow-hidden rounded-[20px] border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-6 shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_40%)]" />
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/8 blur-3xl" />
            <div className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  <ShieldCheck size={13} />
                  Super Admin Console
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Service Log Management
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/80">
                  Full-fleet visibility across all companies. Select a company to drill down, or view all records globally.
                </p>
              </div>

              {/* Global badge */}
              <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <Globe2 size={18} className="text-cyan-300" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Total Companies</p>
                  <p className="text-lg font-black text-white">{companiesLoading ? "—" : companies.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── COMPANY SELECTOR ── */}
          <CompanySelector
            companies={companies}
            logs={logs}
            loading={companiesLoading}
            selectedCompanyId={selectedCompanyId}
            onSelect={(id) => { setSelectedCompanyId(id); setCompanyDropdownOpen(false); setCompanySearch(""); }}
            isOpen={companyDropdownOpen}
            setIsOpen={setCompanyDropdownOpen}
            companySearch={companySearch}
            setCompanySearch={setCompanySearch}
          />

          {/* ── STATS ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Total Logs" value={stats.total} icon={<Wrench size={18} />} color="blue" />
            <StatCard title="Completed" value={stats.completed} icon={<CheckCircle2 size={18} />} color="green" />
            <StatCard title="In Progress" value={stats.inProgress} icon={<Clock size={18} />} color="orange" />
            <StatCard title="Critical" value={stats.critical} icon={<AlertTriangle size={18} />} color="red" />
          </div>

          {/* ── SEARCH & FILTERS ── */}
          <div className="grid grid-cols-1 gap-3 rounded-3xl bg-white p-4 shadow-sm transition-colors dark:bg-slate-800 sm:grid-cols-3">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search machine, component, site..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="All">All Status</option>
              {statusOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/50"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
            >
              <option value="All">All Priority</option>
              {priorityOptions.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          {/* ── TABLE ── */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm transition-colors dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-slate-200 bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-700/50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3.5">Machine</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Component</th>
                    <th className="px-5 py-3.5">Service Type</th>
                    <th className="px-5 py-3.5">Service Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Priority</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                            <Wrench size={22} className="text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-500 dark:text-slate-400">No service logs found</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your filters or select a different company</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const company = companies.find((c) => c.id === log.companyId);
                      return (
                        <tr
                          key={log.id}
                          className="border-b border-slate-100 transition-all duration-150 hover:bg-slate-50/80 dark:border-slate-700 dark:hover:bg-slate-700/40"
                        >
                          {/* Machine */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-500 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                <Wrench size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{log.machineName}</p>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                    {log.machineId}
                                  </span>
                                  <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">{log.site}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Company */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
                              <span className="text-sm text-slate-600 dark:text-slate-300">{company?.name ?? "—"}</span>
                            </div>
                          </td>

                          {/* Component */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{log.component}</p>
                          </td>

                          {/* Service Type */}
                          <td className="px-5 py-4">
                            <span className="rounded-xl border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                              {log.serviceType}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{log.serviceDate}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Next: {log.nextServiceDate}</p>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <StatusBadge status={log.status} />
                          </td>

                          {/* Priority */}
                          <td className="px-5 py-4">
                            <PriorityBadge priority={log.priority} />
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openViewModal(log)}
                                title="View Details"
                                className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(log)}
                                title="Delete Log"
                                className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{paginatedLogs.length}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredLogs.length}</span> logs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Previous
                  </button>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {currentPage} / {totalPages || 1}
                  </div>
                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {isModalOpen && selectedLog && (
        <ServiceLogModal
          log={selectedLog}
          companies={companies}
          onClose={closeModal}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          log={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}


function CompanySelector({
  companies,
  logs,
  loading,
  selectedCompanyId,
  onSelect,
  isOpen,
  setIsOpen,
  companySearch,
  setCompanySearch,
}: {
  companies: Company[];
  logs: ServiceLog[];
  loading: boolean;
  selectedCompanyId: string;
  onSelect: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  companySearch: string;
  setCompanySearch: (v: string) => void;
}) {
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.location.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.industry.toLowerCase().includes(companySearch.toLowerCase())
  );

  const totalAllLogs = logs.length;
  const selectedLogCount = selectedCompanyId === "all"
    ? totalAllLogs
    : logs.filter((l) => l.companyId === selectedCompanyId).length;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800">
      {/* Label row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-indigo-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filter by Company
          </p>
        </div>
        {!loading && (
          <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            {companies.length} companies registered
          </span>
        )}
      </div>

      {/* Trigger button */}
      {loading ? (
        <div className="h-13 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" style={{ height: "52px" }} />
      ) : (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex h-[52px] w-full items-center justify-between rounded-2xl border px-4 text-left transition-all duration-200 ${
              isOpen
                ? "border-indigo-400 ring-4 ring-indigo-100 dark:border-indigo-500 dark:ring-indigo-900/50"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
            } bg-white dark:bg-slate-700`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                selectedCompanyId === "all"
                  ? "bg-indigo-100 dark:bg-indigo-900/50"
                  : "bg-indigo-600"
              }`}>
                {selectedCompanyId === "all"
                  ? <Globe2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                  : <Building2 size={15} className="text-white" />
                }
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {selectedCompanyId === "all" ? "All Companies" : selectedCompany?.name ?? "Select a company"}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {selectedCompanyId === "all"
                    ? `${companies.length} companies · ${totalAllLogs} logs`
                    : selectedCompany
                    ? `${selectedCompany.location} · ${selectedCompany.industry}`
                    : "Click to select"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-xl bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                {selectedLogCount} logs
              </span>
              {isOpen
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />
              }
            </div>
          </button>

          {/* Dropdown panel */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
              {/* Search inside dropdown */}
              <div className="border-b border-slate-100 p-3 dark:border-slate-700">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    placeholder="Search by name, location, industry..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Scrollable list */}
              <div className="max-h-[300px] overflow-y-auto">
                {/* All Companies option */}
                <button
                  onClick={() => onSelect("all")}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedCompanyId === "all"
                      ? "bg-indigo-50 dark:bg-indigo-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/60"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                    <Globe2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${selectedCompanyId === "all" ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-100"}`}>
                      All Companies
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      View service logs across all {companies.length} companies
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                    selectedCompanyId === "all"
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-400"
                  }`}>
                    {totalAllLogs}
                  </span>
                </button>

                {/* Divider */}
                <div className="mx-4 border-t border-slate-100 dark:border-slate-700" />

                {/* Company list */}
                {filteredCompanies.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Building2 size={20} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">No companies found</p>
                    <p className="text-xs text-slate-300 dark:text-slate-600">Try a different search term</p>
                  </div>
                ) : (
                  filteredCompanies.map((company) => {
                    const count = logs.filter((l) => l.companyId === company.id).length;
                    const isActive = selectedCompanyId === company.id;
                    return (
                      <button
                        key={company.id}
                        onClick={() => onSelect(company.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-900/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isActive ? "bg-indigo-600" : "bg-slate-100 dark:bg-slate-700"
                        }`}>
                          <Building2 size={15} className={isActive ? "text-white" : "text-slate-400 dark:text-slate-400"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-100"}`}>
                            {company.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                              <MapPin size={9} /> {company.location}
                            </span>
                            <span className="text-slate-200 dark:text-slate-600">·</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                              <Factory size={9} /> {company.industry}
                            </span>
                            <span className="text-slate-200 dark:text-slate-600">·</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {company.machineCount} machines
                            </span>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                          isActive
                            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected company info card (shown below when a specific company is selected) */}
      {selectedCompany && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 dark:border-indigo-800/40 dark:bg-indigo-900/15">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <Building2 size={13} className="text-white" />
            </div>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">{selectedCompany.name}</p>
          </div>
          <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700" />
          <div className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
            <MapPin size={11} /> {selectedCompany.location}
          </div>
          <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700" />
          <div className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
            <Factory size={11} /> {selectedCompany.industry}
          </div>
          <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700" />
          <div className="text-xs text-indigo-500 dark:text-indigo-400">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">{selectedCompany.machineCount}</span> machines registered
          </div>
          <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700" />
          <div className="text-xs text-indigo-500 dark:text-indigo-400">
            <span className="font-bold text-indigo-700 dark:text-indigo-300">{selectedLogCount}</span> service logs
          </div>
          <button
            onClick={() => onSelect("all")}
            className="ml-auto flex items-center gap-1 rounded-xl border border-indigo-200 px-2.5 py-1 text-[11px] font-medium text-indigo-500 transition hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/40"
          >
            <X size={10} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}


function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 dark:text-indigo-500">{label}</p>
      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{value}</p>
    </div>
  );
}

type StatColor = "blue" | "green" | "orange" | "red";
const colorMap: Record<StatColor, { icon: string; badge: string }> = {
  blue:   { icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",   badge: "" },
  green:  { icon: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", badge: "" },
  orange: { icon: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", badge: "" },
  red:    { icon: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", badge: "" },
};

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: StatColor }) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm transition-colors dark:bg-slate-800">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <h2 className="mt-1.5 text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">{value}</h2>
      </div>
      <div className={`rounded-2xl p-3.5 ${colorMap[color].icon}`}>{icon}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceLogStatus }) {
  const cls =
    status === "Completed"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : status === "In Progress"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`inline-flex items-center justify-center rounded-xl px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ServiceLogPriority }) {
  const cls =
    priority === "Critical"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : priority === "High"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      : priority === "Medium"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  return (
    <span className={`inline-flex items-center justify-center rounded-xl px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {priority}
    </span>
  );
}

// ===========================
// SERVICE LOG VIEW MODAL
// ===========================
function ServiceLogModal({
  log,
  companies,
  onClose,
}: {
  log: ServiceLog;
  companies: Company[];
  onClose: () => void;
}) {
  const company = companies.find((c) => c.id === log.companyId);

  return createPortal(
  <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-[660px] z-[100000]  overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700/60">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Service Log Detail</p>
            <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">{log.machineName}</h2>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{log.machineId} · {log.site}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto p-6" style={{ maxHeight: "72vh" }}>

          {/* Company + Component row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Company</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{company?.name ?? "—"}</h3>
              <p className="text-[11px] text-slate-400">{company?.location}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Component</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{log.component}</h3>
              <p className="text-[11px] text-slate-400">{log.serviceType}</p>
            </div>
          </div>

          {/* Status + Priority */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Status</p>
              <StatusBadge status={log.status} />
            </div>
            <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Priority</p>
              <PriorityBadge priority={log.priority} />
            </div>
            <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Runtime</p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{log.runtimeHours.toLocaleString()} hrs</p>
            </div>
          </div>

          {/* Issue / Action / Remarks */}
          {[
            { label: "Issue Found", value: log.issueFound },
            { label: "Action Taken", value: log.actionTaken },
            { label: "Remarks", value: log.remarks },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{value || "—"}</p>
            </div>
          ))}

          {/* Timeline */}
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-700">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-slate-400">Service Timeline</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[10px] text-slate-400">Last Service</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{log.serviceDate}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[10px] text-slate-400">Next Service</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{log.nextServiceDate}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[10px] text-slate-400">Assigned Engineer</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{log.engineerId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ===========================
// CONFIRM DELETE MODAL
// ===========================
function ConfirmDeleteModal({
  log,
  onCancel,
  onConfirm,
}: {
  log: ServiceLog;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Delete Service Log?</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          This will permanently delete the service log for{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{log.machineName}</span>.
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Delete Log
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}