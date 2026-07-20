import { useEffect, useMemo, useState } from "react";
import AppSelect from "../../components/ui/dropdown/AppSelect";

import { createPortal } from "react-dom";
import {
  fleetService,
  type FleetMachine as ServiceFleetMachine,
} from "../../services/Fleet/fleetService";

import {
  Search,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Trash2,
  X,
  ShieldCheck,
} from "lucide-react";

export type ServiceLogStatus = "Pending" | "Completed" | "In Progress";

export type ServiceLogPriority = "Low" | "Medium" | "High" | "Critical";

interface Machine {
  id: string;
  machineId: string;
  machineName: string;
  site: string;
}

interface ServiceLog {
  id: string;
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

type UserRole = "Engineer" | "Supervisor" | "Admin";

interface CurrentUser {
  id: string;

  name: string;

  role: UserRole;
}

const statusOptions: ServiceLogStatus[] = [
  "Pending",

  "In Progress",

  "Completed",
];

const priorityOptions: ServiceLogPriority[] = [
  "Low",

  "Medium",

  "High",

  "Critical",
];

const statusFilterOptions = [
  { label: "All Status", value: "All" },
  ...statusOptions.map((status) => ({
    label: status,
    value: status,
  })),
];

const priorityFilterOptions = [
  { label: "All Priority", value: "All" },
  ...priorityOptions.map((priority) => ({
    label: priority,
    value: priority,
  })),
];

export default function ServiceLogs() {
  // ===========================

  // CURRENT USER (DUMMY)

  // BACKEND SE AYGA

  // ===========================

  const currentUser = {
    id: "admin_1",
    role: "Admin",
  };

  // ===========================

  // DARK MODE STATE

  // ===========================

  // ===========================

  // STATES

  // ===========================

  const [loading, setLoading] = useState(false);

  const [logs, setLogs] = useState<ServiceLog[]>([]);

  const [assignedMachines, setAssignedMachines] = useState<Machine[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<"All" | ServiceLogStatus>(
    "All",
  );

  const [priorityFilter, setPriorityFilter] = useState<
    "All" | ServiceLogPriority
  >("All");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");

  const [selectedLog, setSelectedLog] = useState<ServiceLog | null>(null);

  const initialForm = {
    machineId: "",
    machineName: "",
    site: "",
    component: "",
    serviceType: "",
    engineerId: "ENG-101",
    serviceDate: "",
    nextServiceDate: "",
    runtimeHours: 0,
    status: "Pending" as ServiceLogStatus,
    priority: "Medium" as ServiceLogPriority,
    issueFound: "",
    actionTaken: "",
    remarks: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const [deleteTarget, setDeleteTarget] = useState<ServiceLog | null>(null);

  // ===========================

  // DUMMY DATA

  // BACKEND REPLACE KREGA

  // ===========================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Assigned Machines

        const machines = await fleetService.getFleetMachines();

        // 2. Get all machines

        const formattedMachines = machines.map((machine) => ({
          id: machine.machineId,
          machineId: machine.machineId,
          machineName: machine.machineName,
          site: machine.location,
        }));

        setAssignedMachines(formattedMachines);

        setLogs([
          {
            id: "1",
            machineId: formattedMachines[0]?.machineId || "CAT-EX001",
            machineName:
              formattedMachines[0]?.machineName || "Caterpillar 6040 Excavator",
            site: formattedMachines[0]?.site || "Limpopo Mine Site",
            component: "Hydraulic Pump",
            serviceType: "Preventive Maintenance",
            engineerId: "ENG-SA-101",
            serviceDate: "2026-06-10",
            nextServiceDate: "2026-07-10",
            runtimeHours: 12450,
            status: "Completed",
            priority: "Medium",
            issueFound: "Hydraulic pressure fluctuation detected",
            actionTaken: "Pump seals replaced and pressure calibrated",
            remarks: "Machine operating within normal range",
            createdAt: new Date().toISOString(),
          },

          {
            id: "2",
            machineId: formattedMachines[1]?.machineId || "KOM-HD785",
            machineName:
              formattedMachines[1]?.machineName || "Komatsu HD785 Dump Truck",
            site: formattedMachines[1]?.site || "Mpumalanga Coal Mine",
            component: "Engine Cooling System",
            serviceType: "Corrective Maintenance",
            engineerId: "ENG-SA-102",
            serviceDate: "2026-06-14",
            nextServiceDate: "2026-07-14",
            runtimeHours: 18720,
            status: "In Progress",
            priority: "High",
            issueFound: "Engine temperature exceeding threshold",
            actionTaken: "Radiator inspection and coolant replacement ongoing",
            remarks: "Monitor engine temperature for 72 hours",
            createdAt: new Date().toISOString(),
          },

          {
            id: "3",
            machineId: formattedMachines[2]?.machineId || "HIT-EX3600",
            machineName:
              formattedMachines[2]?.machineName || "Hitachi EX3600 Excavator",
            site: formattedMachines[2]?.site || "Northern Cape Iron Ore Mine",
            component: "Track Assembly",
            serviceType: "Emergency Repair",
            engineerId: "ENG-SA-103",
            serviceDate: "2026-06-16",
            nextServiceDate: "2026-06-30",
            runtimeHours: 22340,
            status: "Pending",
            priority: "Critical",
            issueFound: "Track link damage causing excessive vibration",
            actionTaken: "Awaiting replacement parts",
            remarks: "Machine temporarily removed from production",
            createdAt: new Date().toISOString(),
          },

          {
            id: "4",
            machineId: formattedMachines[3]?.machineId || "CAT-D11T",
            machineName:
              formattedMachines[3]?.machineName || "Caterpillar D11T Dozer",
            site: formattedMachines[3]?.site || "Free State Mining Project",
            component: "Transmission System",
            serviceType: "Inspection",
            engineerId: "ENG-SA-104",
            serviceDate: "2026-06-12",
            nextServiceDate: "2026-07-12",
            runtimeHours: 16480,
            status: "Completed",
            priority: "Low",
            issueFound: "Minor transmission wear observed",
            actionTaken: "Lubrication completed and filters replaced",
            remarks: "No immediate maintenance required",
            createdAt: new Date().toISOString(),
          },

          {
            id: "5",
            machineId: formattedMachines[4]?.machineId || "VOL-A40G",
            machineName:
              formattedMachines[4]?.machineName ||
              "Volvo A40G Articulated Hauler",
            site: formattedMachines[4]?.site || "KwaZulu-Natal Quarry",
            component: "Brake System",
            serviceType: "Safety Inspection",
            engineerId: "ENG-SA-105",
            serviceDate: "2026-06-18",
            nextServiceDate: "2026-07-18",
            runtimeHours: 9840,
            status: "In Progress",
            priority: "High",
            issueFound: "Rear brake response delay detected",
            actionTaken: "Brake line inspection in progress",
            remarks: "Safety clearance pending",
            createdAt: new Date().toISOString(),
          },
        ]);

        // 3. Get Service Logs

        // const logs = await serviceLogService.getLogs(assignedMachineIds);

        // setLogs(logs);
      } catch (error) {
        console.error("Service logs fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ===========================

  // ROLE BASED LOG FILTERING

  // ===========================

  const visibleLogs = useMemo(() => {
    return logs;
  }, [logs]);
  // ===========================

  // SEARCH + FILTER

  // ===========================

  const filteredLogs = useMemo(() => {
    return visibleLogs.filter((log) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        log.machineName.toLowerCase().includes(search) ||
        log.machineId.toLowerCase().includes(search) ||
        log.component.toLowerCase().includes(search) ||
        log.site.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" || log.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || log.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [visibleLogs, searchTerm, statusFilter, priorityFilter]);

  // ===========================

  // PAGINATION

  // ===========================

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  // ===========================

  // STATS

  // ===========================

  const stats = useMemo(() => {
    return {
      total: visibleLogs.length,

      completed: visibleLogs.filter((log) => log.status === "Completed").length,

      progress: visibleLogs.filter((log) => log.status === "In Progress")
        .length,

      critical: visibleLogs.filter((log) => log.priority === "Critical").length,
    };
  }, [visibleLogs]);

  // ===========================

  // PERMISSIONS

  // ===========================

  const openAddModal = () => {
    setFormData({
      ...initialForm,

      engineerId: currentUser.id,
    });

    setModalMode("add");

    setIsModalOpen(true);
  };

  const openViewModal = (log: ServiceLog) => {
    setSelectedLog(log);

    setFormData({
      ...log,
    });

    setModalMode("view");

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedLog(null);

    setIsModalOpen(false);
  };

  const validateForm = () => {
    if (!formData.machineId) return "Machine is required";

    if (!formData.component.trim()) return "Component is required";

    if (!formData.serviceType.trim()) return "Service type is required";

    if (!formData.serviceDate) return "Service date is required";

    if (!formData.nextServiceDate) return "Next service date is required";

    if (!formData.issueFound.trim()) return "Issue found is required";

    if (!formData.actionTaken.trim()) return "Action taken is required";

    return null;
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    // BACKEND TODO

    setLogs((prev) => prev.filter((log) => log.id !== deleteTarget.id));

    setDeleteTarget(null);
  };

  const handleSubmit = async () => {
    const error = validateForm();

    if (error) {
      alert(error);

      return;
    }

    // ===================

    // BACKEND TODO

    // API CALL YAHAN AYGI

    // ===================

    if (modalMode === "add") {
      const newLog: ServiceLog = {
        id: crypto.randomUUID(),

        ...formData,

        createdAt: new Date().toISOString(),
      };
    }

    if (modalMode === "edit" && selectedLog) {
      setLogs((prev) =>
        prev.map((log) =>
          log.id === selectedLog.id
            ? {
                ...log,

                ...formData,
              }
            : log,
        ),
      );
    }

    closeModal();
  };

  const canManageLog = () => currentUser.role === "Admin";
  // ===========================

  // DARK MODE CLASSES

  // ===========================

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-5 transition-colors duration-300 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* HEADER */}

          <div className="relative overflow-hidden rounded-[20px] border border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 shadow-sm">
            {/* Decorative Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  <ShieldCheck size={14} />
                  Supervisor Operations
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  Service Log Management
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Monitor machine service activities, review maintenance
                  records, track engineer assignments, and ensure timely
                  completion of service operations across your fleet.
                </p>
              </div>
            </div>
          </div>

          {/* STATS */}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Total Logs"
              value={stats.total}
              icon={<Wrench />}
            />

            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<CheckCircle2 />}
            />

            <StatCard
              title="In Progress"
              value={stats.progress}
              icon={<Clock />}
            />

            <StatCard
              title="Critical"
              value={stats.critical}
              icon={<AlertTriangle />}
            />
          </div>

          {/* SEARCH */}

          <div className="grid grid-cols-1 gap-4 rounded-3xl bg-white p-4 shadow-sm transition-colors duration-300 dark:bg-slate-800 dark:shadow-slate-700/30 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                placeholder="Search machine..."
                className="w-full h-11 pl-10 pr-4 text-sm border border-blue-100 rounded-lg bg-white text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <AppSelect
              className="w-full"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              options={statusFilterOptions}
            />

            <AppSelect
              className="w-full"
              value={priorityFilter}
              onChange={(value) => setPriorityFilter(value as any)}
              options={priorityFilterOptions}
            />
          </div>

          {/* TABLE */}

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm transition-colors duration-300 dark:bg-slate-800 dark:shadow-slate-700/30">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-slate-200 bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-700/60">
                  <tr className="text-left text-sm text-slate-600 dark:text-slate-300">
                    <th className="p-4">Machine</th>

                    <th className="p-4">Component</th>

                    <th className="p-4">Service Type</th>

                    <th className="p-4">Service Date</th>

                    <th className="p-4">Status</th>

                    <th className="p-4">Priority</th>

                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-10 text-center text-slate-500 dark:text-slate-400"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-10 text-center text-slate-500 dark:text-slate-400"
                      >
                        No service logs found
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-100 transition-all duration-300 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:bg-slate-700/40"
                      >
                        {/* MACHINE */}

                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-500 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-400">
                              <Wrench size={15} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium leading-tight text-slate-700 dark:text-slate-200">
                                {log.machineName}
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                  {log.machineId}
                                </span>

                                <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                                  {log.site}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* COMPONENT */}

                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {log.component}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              Machine Component
                            </p>
                          </div>
                        </td>

                        {/* SERVICE TYPE */}

                        <td className="p-4">
                          <span className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-600 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                            {log.serviceType}
                          </span>
                        </td>

                        {/* DATE */}

                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {log.serviceDate}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              Next: {log.nextServiceDate}
                            </p>
                          </div>
                        </td>
                        {/* STATUS */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center justify-center rounded-xl px-3 py-1 text-[11px] font-semibold ${
                              log.status === "Completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : log.status === "In Progress"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>

                        {/* PRIORITY */}
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-xl px-3 py-1 text-[11px] font-semibold ${
                              log.priority === "Critical"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : log.priority === "High"
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : log.priority === "Medium"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {log.priority}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openViewModal(log)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => setDeleteTarget(log)}
                              className="rounded-lg bg-red-500 px-3 py-2 text-white hover:bg-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-700 sm:flex-row">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {paginatedLogs.length} of {filteredLogs.length} logs
                </p>

                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Prev
                  </button>

                  <div className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
                    {currentPage} / {totalPages || 1}
                  </div>

                  <button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <ServiceLogModal
          mode={modalMode}
          formData={formData}
          setFormData={setFormData}
          assignedMachines={assignedMachines}
          onClose={closeModal}
          handleSubmit={handleSubmit}
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

function StatCard({ title, value, icon }: any) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm transition-colors duration-300 dark:bg-slate-800 dark:shadow-slate-700/30">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>

        <h2 className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
          {value}
        </h2>
      </div>

      <div className="rounded-2xl bg-orange-100 p-4 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
        {icon}
      </div>
    </div>
  );
}
function ServiceLogModal({
  mode,
  formData,
  setFormData,
  assignedMachines,
  onClose,
  handleSubmit,
}: any) {
  const isView = mode === "view";
  const inputCls =
    "h-12 rounded-2xl border px-4 w-full outline-none transition-colors focus:ring-4 border-slate-200 bg-slate-50/50 text-slate-700 focus:ring-blue-100 focus:border-blue-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-blue-900/50 dark:focus:border-blue-500";
  const disabledInputCls =
    "h-12 rounded-2xl border px-4 w-full bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-[650px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
              SERVICE LOG
            </p>

            <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              Service Details
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Machine + Component */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Machine
              </p>

              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formData.machineName}
              </h3>

              <p className="text-[11px] text-slate-500">{formData.machineId}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Component
              </p>

              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formData.component}
              </h3>

              <p className="text-[11px] text-slate-500">
                {formData.serviceType}
              </p>
            </div>
          </div>

          {/* Issue Found */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Issue Found
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {formData.issueFound || "-"}
            </p>
          </div>

          {/* Action Taken */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Action Taken
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {formData.actionTaken || "-"}
            </p>
          </div>

          {/* Remarks */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Remarks
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {formData.remarks || "-"}
            </p>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-white">
              Service Timeline
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[10px] text-slate-500">Last Service</p>

                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {formData.serviceDate}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[10px] text-slate-500">Next Service</p>

                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {formData.nextServiceDate}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="text-[10px] text-slate-500">Runtime</p>

                <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-white">
                  {formData.runtimeHours} hrs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
function ConfirmDeleteModal({
  log,

  onCancel,
  onConfirm,
}: any) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/50">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Delete Service Log?
        </h2>

        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Delete service log for{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            {log.machineName}
          </strong>
          ?
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-5 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition-colors hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
