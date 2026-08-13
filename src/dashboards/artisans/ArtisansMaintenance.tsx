import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Search,
  Wrench,
  X,
  Filter,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

type MaintenanceStatus = "Pending" | "In Progress" | "Completed";
type MaintenancePriority = "Low" | "Medium" | "High";

type MaintenanceItem = {
  id: string;
  machine: string;
  issue: string;
  component: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedTo: string;
  createdAt: string;
  dueDate: string;
  remarks?: string;
};

const initialMaintenanceList: MaintenanceItem[] = [
  {
    id: "MNT-001",
    machine: "CAT 777D",
    issue: "Engine overheating",
    component: "Engine",
    status: "Pending",
    priority: "High",
    assignedTo: "Artisans Aman",
    createdAt: "15-05-2026",
    dueDate: "16-05-2026",
    remarks: "Engine temperature is above normal range.",
  },
  {
    id: "MNT-002",
    machine: "Komatsu HD785",
    issue: "Hydraulic pressure low",
    component: "Hydraulic",
    status: "In Progress",
    priority: "Medium",
    assignedTo: "Artisans Rahul",
    createdAt: "15-05-2026",
    dueDate: "17-05-2026",
    remarks: "Hydraulic pressure inspection is required.",
  },
  {
    id: "MNT-003",
    machine: "CAT 740B",
    issue: "Tyre pressure critical",
    component: "Tyre",
    status: "Completed",
    priority: "High",
    assignedTo: "Artisans Aman",
    createdAt: "14-05-2026",
    dueDate: "15-05-2026",
    remarks: "Tyre pressure corrected successfully.",
  },
];

const ITEMS_PER_PAGE = 5;

const statusClass = (status: MaintenanceStatus) => {
  if (status === "Pending") {
    return "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400";
  }

  if (status === "In Progress") {
    return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
  }

  return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400";
};

const priorityClass = (priority: MaintenancePriority) => {
  if (priority === "High") {
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  }

  if (priority === "Medium") {
    return "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400";
  }

  return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400";
};

const statusIcon = (status: MaintenanceStatus) => {
  if (status === "Pending") return <Clock size={18} />;
  if (status === "In Progress") return <Wrench size={18} />;
  return <CheckCircle2 size={18} />;
};

export default function ArtisansMaintenance() {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>(initialMaintenanceList);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | MaintenanceStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | MaintenancePriority>("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceItem | null>(null);

  const [formStatus, setFormStatus] = useState<MaintenanceStatus>("Pending");
  const [formPriority, setFormPriority] = useState<MaintenancePriority>("Medium");
  const [formRemarks, setFormRemarks] = useState("");

  const stats = useMemo(() => {
    const pending = maintenanceList.filter((item) => item.status === "Pending").length;

    const inProgress = maintenanceList.filter((item) => item.status === "In Progress").length;

    const completed = maintenanceList.filter((item) => item.status === "Completed").length;

    const total = maintenanceList.length;

    return {
      total,
      pending,
      inProgress,
      completed,
    };
  }, [maintenanceList]);

  const filteredMaintenanceList = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return maintenanceList.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(search) ||
        item.machine.toLowerCase().includes(search) ||
        item.issue.toLowerCase().includes(search) ||
        item.component.toLowerCase().includes(search) ||
        item.status.toLowerCase().includes(search) ||
        item.priority.toLowerCase().includes(search) ||
        item.assignedTo.toLowerCase().includes(search);

      const matchesStatus = statusFilter === "All" || item.status === statusFilter;

      const matchesPriority = priorityFilter === "All" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [maintenanceList, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMaintenanceList.length / ITEMS_PER_PAGE));

  const paginatedMaintenanceList = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredMaintenanceList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMaintenanceList, currentPage]);

  const startItem =
    filteredMaintenanceList.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredMaintenanceList.length);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: "All" | MaintenanceStatus) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePriorityFilterChange = (value: "All" | MaintenancePriority) => {
    setPriorityFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCurrentPage(1);
  };

  const handleOpenUpdateModal = (item: MaintenanceItem) => {
    setSelectedMaintenance(item);
    setFormStatus(item.status);
    setFormPriority(item.priority);
    setFormRemarks(item.remarks || "");
  };

  const handleCloseModal = () => {
    setSelectedMaintenance(null);
    setFormStatus("Pending");
    setFormPriority("Medium");
    setFormRemarks("");
  };

  const handleSaveUpdate = () => {
    if (!selectedMaintenance) return;

    setMaintenanceList((prevList) =>
      prevList.map((item) =>
        item.id === selectedMaintenance.id
          ? {
              ...item,
              status: formStatus,
              priority: formPriority,
              remarks: formRemarks.trim(),
            }
          : item,
      ),
    );

    toast.success("Maintenance updated successfully");
    handleCloseModal();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 dark:bg-[#061426] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          {/* Premium Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

          <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Wrench size={14} />
              Maintenance Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">Maintenance</h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Track pending, in-progress and completed maintenance activities, monitor service
              schedules and manage maintenance operations across your assigned machines.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0B1D35]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Total Work
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  {stats.total}
                </h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                <ClipboardList size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5 text-orange-600 dark:border-orange-500/10 dark:bg-orange-500/10 dark:text-orange-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Pending</p>
                <h2 className="mt-2 text-3xl font-black">{stats.pending}</h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/10">
                <Clock size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-blue-600 dark:border-blue-500/10 dark:bg-blue-500/10 dark:text-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider">In Progress</p>
                <h2 className="mt-2 text-3xl font-black">{stats.inProgress}</h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/10">
                <Wrench size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-green-100 bg-green-50 p-5 text-green-600 dark:border-green-500/10 dark:bg-green-500/10 dark:text-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Completed</p>
                <h2 className="mt-2 text-3xl font-black">{stats.completed}</h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/10">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
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
                placeholder="Search by machine, issue, component..."
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
                  value={statusFilter}
                  onChange={(event) =>
                    handleStatusFilterChange(event.target.value as "All" | MaintenanceStatus)
                  }
                  className="h-12 min-w-[170px] appearance-none rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-[#0B1D35] dark:text-white"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  handlePriorityFilterChange(event.target.value as "All" | MaintenancePriority)
                }
                className="h-12 min-w-[170px] rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-[#0B1D35] dark:text-white"
              >
                <option value="All">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <button
                type="button"
                onClick={handleClearFilters}
                className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Clear
              </button>
            </div>
          </div>

          {/* List */}
          {paginatedMaintenanceList.length > 0 ? (
            <div className="space-y-4">
              {paginatedMaintenanceList.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-[#F8FAFC] p-5 transition hover:border-blue-100 hover:bg-blue-50/30 dark:border-white/5 dark:bg-white/5 dark:hover:border-blue-500/20 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Wrench size={24} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white">
                          {item.machine}
                        </h3>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {item.id}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {item.issue}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                        <span>Component: {item.component}</span>
                        <span>•</span>
                        <span>Assigned: {item.assignedTo}</span>
                        <span>•</span>
                        <span>Due: {item.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${priorityClass(
                        item.priority,
                      )}`}
                    >
                      <AlertTriangle size={16} />
                      {item.priority}
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${statusClass(
                        item.status,
                      )}`}
                    >
                      {statusIcon(item.status)}
                      {item.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenUpdateModal(item)}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-[#F8FAFC] p-8 text-center dark:border-white/10 dark:bg-white/5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                <Search size={26} />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                No maintenance work found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                No record matches your current search or filter.
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
          {filteredMaintenanceList.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Showing {startItem}-{endItem} of {filteredMaintenanceList.length} records
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
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="h-10 rounded-xl border border-gray-200 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {selectedMaintenance && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="relative z-[100000000] max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0B1D35]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Update Maintenance
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Update maintenance status and remarks.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-[#F8FAFC] p-4 dark:bg-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white">
                  {selectedMaintenance.machine}
                </h3>

                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {selectedMaintenance.id}
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {selectedMaintenance.issue}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                Component: {selectedMaintenance.component}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </label>

                <select
                  value={formStatus}
                  onChange={(event) => setFormStatus(event.target.value as MaintenanceStatus)}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Priority
                </label>

                <select
                  value={formPriority}
                  onChange={(event) => setFormPriority(event.target.value as MaintenancePriority)}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Remarks
                </label>

                <textarea
                  value={formRemarks}
                  onChange={(event) => setFormRemarks(event.target.value)}
                  rows={4}
                  placeholder="Write maintenance remarks..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="h-12 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveUpdate}
                className="h-12 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Save Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
