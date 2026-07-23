import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { createPortal } from "react-dom";

import { machineAssignmentService } from "../../services/Task/machineAssignmentService";

import AppSelect from "../../components/ui/dropdown/AppSelect";

import { fleetService } from "../../services/Fleet/fleetService";

import {
  Search,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  X,
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

type ServiceLogForm = {
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
};

type FormErrors = Partial<Record<keyof ServiceLogForm, string>>;
type UserRole = "Artisans" | "Supervisor" | "Admin";

interface CurrentUser {
  id: string;

  name: string;

  role: UserRole;
}

const serviceLogSchema = z
  .object({
    machineId: z.string().trim().min(1, "Machine is required"),

    component: z
      .string()
      .trim()
      .min(1, "Component is required")
      .max(100, "Component cannot exceed 100 characters"),

    serviceType: z
      .string()
      .trim()
      .min(1, "Service type is required")
      .max(100, "Service type cannot exceed 100 characters"),

    serviceDate: z.string().trim().min(1, "Service date is required"),

    nextServiceDate: z.string().trim().min(1, "Next service date is required"),

    runtimeHours: z.number().min(0, "Runtime hours cannot be negative"),

    status: z.enum(["Pending", "In Progress", "Completed"]),

    priority: z.enum(["Low", "Medium", "High", "Critical"]),
    issueFound: z
      .string()
      .trim()
      .min(1, "Issue found is required")
      .max(500, "Issue found cannot exceed 500 characters"),

    actionTaken: z
      .string()
      .trim()
      .min(1, "Action taken is required")
      .max(500, "Action taken cannot exceed 500 characters"),

    remarks: z
      .string()
      .trim()
      .max(500, "Remarks cannot exceed 500 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.nextServiceDate &&
      data.serviceDate &&
      data.nextServiceDate < data.serviceDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextServiceDate"],
        message: "Next service date cannot be earlier than service date",
      });
    }
  });

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

export default function ServiceLogs() {
  const currentUser = {
    id: "eng_1",

    role: "engineer",
  };

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

    engineerId: currentUser.id,

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
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<ServiceLog | null>(null);

  // DUMMY DATA

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Assigned Machines

        const assignedMachineIds =
          await machineAssignmentService.getAssignedMachines(
            String(currentUser?.id),
          );

        // 2. Get all machines

        const machines = await fleetService.getFleetMachines();

        const filteredMachines = machines.filter((machine) =>
          assignedMachineIds.includes(String(machine.machineId)),
        );

        const formattedMachines = filteredMachines.map((machine) => ({
          id: machine.machineId,

          machineId: machine.machineId,

          machineName: machine.machineName,

          site: machine.location,
        }));

        setAssignedMachines(formattedMachines);

        setLogs([
          {
            id: "1",

            machineId: formattedMachines[0]?.machineId || "",

            machineName: formattedMachines[0]?.machineName || "",

            site: formattedMachines[0]?.site || "",

            component: "Hydraulic Pump",

            serviceType: "Maintenance",

            engineerId: currentUser.id,

            serviceDate: "2026-06-16",

            nextServiceDate: "2026-07-16",

            runtimeHours: 120,

            status: "Pending",

            priority: "High",

            issueFound: "Pressure low",

            actionTaken: "Pump cleaned",

            remarks: "Check again",

            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("Service logs fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ROLE BASED LOG FILTERING
  const visibleLogs = useMemo(() => {
    if (currentUser.role === "Supervisor") {
      return logs;
    }

    const assignedIds = assignedMachines.map((machine) => machine.machineId);

    return logs.filter((log) => assignedIds.includes(log.machineId));
  }, [logs, assignedMachines, currentUser.role]);

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

  const openEditModal = (log: ServiceLog) => {
    setSelectedLog(log);

    setFormData({
      ...log,
    });

    setModalMode("edit");

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

  const updateField = (field: keyof ServiceLogForm, value: string | number) => {
    const updatedForm = {
      ...formData,
      [field]: value,
    };

    setFormData(updatedForm);

    const result = serviceLogSchema.safeParse(updatedForm);

    if (result.success) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
      return;
    }

    const issue = result.error.issues.find((err) => err.path[0] === field);

    setFormErrors((prev) => ({
      ...prev,
      [field]: issue?.message || "",
    }));
  };
  const validateForm = () => {
    const result = serviceLogSchema.safeParse(formData);

    if (!result.success) {
      const errors: FormErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ServiceLogForm;

        errors[field] = issue.message;
      });

      setFormErrors(errors);

      return result.error.issues[0].message;
    }

    setFormErrors({});

    return "";
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

  const canManageLog = (log: ServiceLog) => {
    if (currentUser.role === "Admin") return true;

    if (currentUser.role === "Supervisor") return true;

    return log.engineerId === currentUser.id;
  };

  const statusFilterOptions = [
    {
      value: "All",
      label: "Status",
    },

    ...statusOptions.map((status) => ({
      value: status,
      label: status,
    })),
  ];

  const priorityFilterOptions = [
    {
      value: "All",
      label: "Priority",
    },

    ...priorityOptions.map((priority) => ({
      value: priority,
      label: priority,
    })),
  ];

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-5 transition-colors duration-300 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* HEADER */}

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />
            <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Content */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Wrench size={14} />
                  Artisans Module
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
                  Service Logs
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Manage machine maintenance records, service history,
                  inspection activities, repair tracking and operational service
                  logs from a centralized maintenance platform.
                </p>
              </div>

              {/* Right Action */}
              <div className="flex items-center gap-3">
                <button
                  onClick={openAddModal}
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
                  <Plus size={18} />
                  Add Service Log
                </button>
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
                className="absolute left-4 top-3.5 text-slate-400"
              />

              <input
                placeholder="Search machine..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <AppSelect
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as "All" | ServiceLogStatus)
              }
              placeholder="Status"
              options={statusFilterOptions}
            />

            <AppSelect
              value={priorityFilter}
              onChange={(value) =>
                setPriorityFilter(value as "All" | ServiceLogPriority)
              }
              placeholder="Priority"
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
                            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                              log.status === "Completed"
                                ? "bg-green-100 text-green-700"
                                : log.status === "In Progress"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>

                        {/* PRIORITY */}
                        <td className="p-4">
                          <span
                            className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                              log.priority === "Critical"
                                ? "bg-red-100 text-red-700"
                                : log.priority === "High"
                                  ? "bg-orange-100 text-orange-700"
                                  : log.priority === "Medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
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
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye size={16} />
                            </button>

                            {canManageLog(log) && (
                              <>
                                <button
                                  onClick={() => openEditModal(log)}
                                  className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                                >
                                  <Edit size={16} />
                                </button>

                                <button
                                  onClick={() => setDeleteTarget(log)}
                                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
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
          formErrors={formErrors}
          updateField={updateField}
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
  formErrors,
  updateField,
  assignedMachines,
  onClose,
  handleSubmit,
}: any) {
  const isView = mode === "view";

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const inputCls =
    "h-12 rounded-2xl border px-4 w-full outline-none transition-colors focus:ring-4 border-slate-200 bg-slate-50/50 text-slate-700 focus:ring-blue-100 focus:border-blue-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-blue-900/50 dark:focus:border-blue-500";

  const disabledInputCls =
    "h-12 rounded-2xl border px-4 w-full bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[75vh] w-full max-w-[650px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/50">
        {/* MODAL BODY */}

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {isView ? (
            <div className="space-y-6">
              {/* Status + Priority */}
              <div className="flex flex-wrap gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    formData.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : formData.status === "In Progress"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {formData.status}
                </span>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    formData.priority === "Critical"
                      ? "bg-red-100 text-red-700"
                      : formData.priority === "High"
                        ? "bg-orange-100 text-orange-700"
                        : formData.priority === "Medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                  }`}
                >
                  {formData.priority} Priority
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Machine Information
                  </p>

                  <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-white">
                    {formData.machineName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {formData.machineId}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">{formData.site}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Service Information
                  </p>

                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <strong>Component:</strong> {formData.component}
                    </p>
                    <p>
                      <strong>Service Type:</strong> {formData.serviceType}
                    </p>
                    <p>
                      <strong>Artisans:</strong> {formData.engineerId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h3 className="mb-4 font-semibold text-slate-800 dark:text-white">
                  Service Timeline
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-400">Service Date</p>
                    <p className="mt-2 font-semibold">{formData.serviceDate}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-400">Next Service</p>
                    <p className="mt-2 font-semibold">
                      {formData.nextServiceDate}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
                    <p className="text-xs text-slate-400">Runtime</p>
                    <p className="mt-2 font-semibold">
                      {formData.runtimeHours} hrs
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Issue Found
                </h3>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  {formData.issueFound || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Action Taken
                </h3>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  {formData.actionTaken || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  Remarks
                </h3>

                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  {formData.remarks || "-"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Machine Information */}

              <div>
                <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Machine Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AppSelect
                    value={formData.machineId}
                    placeholder="Select Machine"
                    onChange={(value) => {
                      const machine = assignedMachines.find(
                        (m: Machine) => m.machineId === value,
                      );

                      if (!machine) return;

                      setFormData((prev: any) => ({
                        ...prev,
                        machineId: machine.machineId,
                        machineName: machine.machineName,
                        site: machine.site,
                      }));
                    }}
                    options={assignedMachines.map((machine: Machine) => ({
                      value: machine.machineId,
                      label: machine.machineName,
                    }))}
                  />

                  <input
                    value={formData.site}
                    disabled
                    placeholder="Site"
                    className={disabledInputCls}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Component
                </label>

                <input
                  value={formData.component}
                  onChange={(e) => updateField("component", e.target.value)}
                  className={inputCls}
                  placeholder="Hydraulic Pump"
                />

                <div className="mt-1 min-h-[20px]">
                  <p className="text-sm text-red-500">
                    {formErrors.component || ""}
                  </p>
                </div>
              </div>

              {/* Service Type */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Service Type
                </label>

                <input
                  value={formData.serviceType}
                  onChange={(e) => updateField("serviceType", e.target.value)}
                  className={inputCls}
                  placeholder="Maintenance"
                />

                <div className="mt-1 min-h-[20px]">
                  <p className="text-sm text-red-500">
                    {formErrors.serviceType || ""}
                  </p>
                </div>
              </div>

              {/* Service Date */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Service Date
                </label>

                <input
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => updateField("serviceDate", e.target.value)}
                  className={inputCls}
                />

                <div className="mt-1 min-h-[20px]">
                  <p className="text-sm text-red-500">
                    {formErrors.serviceDate || ""}
                  </p>
                </div>
              </div>

              {/* Next Service Date */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Next Service Date
                </label>

                <input
                  type="date"
                  value={formData.nextServiceDate}
                  onChange={(e) =>
                    updateField("nextServiceDate", e.target.value)
                  }
                  className={inputCls}
                />

                <div className="mt-1 min-h-[20px]">
                  <p className="text-sm text-red-500">
                    {formErrors.nextServiceDate || ""}
                  </p>
                </div>
              </div>

              {/* Runtime Hours */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Runtime Hours
                </label>

                <input
                  type="number"
                  value={formData.runtimeHours}
                  onChange={(e) =>
                    updateField("runtimeHours", Number(e.target.value))
                  }
                  className={inputCls}
                  placeholder="120"
                />

                <div className="mt-1 min-h-[20px]">
                  <p className="text-sm text-red-500">
                    {formErrors.runtimeHours || ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Status */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </label>

                  <AppSelect
                    value={formData.status}
                    placeholder="Select Status"
                    onChange={(value) =>
                      updateField("status", value as ServiceLogStatus)
                    }
                    options={statusOptions.map((status) => ({
                      value: status,
                      label: status,
                    }))}
                  />

                  <div className="mt-1 min-h-[20px]">
                    <p className="text-sm text-red-500">
                      {formErrors.status || ""}
                    </p>
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Priority
                  </label>

                  <AppSelect
                    value={formData.priority}
                    placeholder="Select Priority"
                    onChange={(value) =>
                      updateField("priority", value as ServiceLogPriority)
                    }
                    options={priorityOptions.map((priority) => ({
                      value: priority,
                      label: priority,
                    }))}
                  />

                  <div className="mt-1 min-h-[20px]">
                    <p className="text-sm text-red-500">
                      {formErrors.priority || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Issue Found */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Issue Found
                </label>

                <textarea
                  rows={3}
                  value={formData.issueFound}
                  onChange={(e) => updateField("issueFound", e.target.value)}
                  className={`${inputCls} h-auto py-3`}
                />

                <div className="mt-1 min-h-[20px]">
                  {formErrors.issueFound && (
                    <p className="text-sm text-red-500">
                      {formErrors.issueFound}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Taken */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Action Taken
                </label>

                <textarea
                  rows={3}
                  value={formData.actionTaken}
                  onChange={(e) => updateField("actionTaken", e.target.value)}
                  className={`${inputCls} h-auto py-3`}
                />

                {formErrors.actionTaken && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.actionTaken}
                  </p>
                )}
              </div>

              {/* Remarks */}

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Remarks
                </label>

                <textarea
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => updateField("remarks", e.target.value)}
                  className={`${inputCls} h-auto py-3`}
                />

                {formErrors.remarks && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.remarks}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        {/* MODAL FOOTER */}

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-5 transition-colors dark:border-slate-700 dark:bg-slate-800 sm:px-8">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>

          {!isView && (
            <button
              onClick={handleSubmit}
              className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {mode === "edit" ? "Update Service Log" : "Save Service Log"}
            </button>
          )}
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
