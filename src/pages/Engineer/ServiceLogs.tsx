import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { serviceLogService } from "../../services/serviceLogService";
import type {
  ServiceLog,
  ServiceLogPriority,
  ServiceLogStatus,
} from "../../types/serviceLog";

const initialForm: Omit<ServiceLog, "id" | "createdAt"> = {
  machineId: "",
  machineName: "",
  site: "",
  component: "",
  serviceType: "",
  engineerName: "",
  serviceDate: "",
  nextServiceDate: "",
  runtimeHours: 0,
  status: "Pending",
  priority: "Medium",
  issueFound: "",
  actionTaken: "",
  remarks: "",
};

const statusOptions: ServiceLogStatus[] = ["Completed", "Pending", "In Progress"];
const priorityOptions: ServiceLogPriority[] = ["Low", "Medium", "High", "Critical"];

const statusStyle: Record<ServiceLogStatus, string> = {
  Completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  Pending:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  "In Progress":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
};

const priorityStyle: Record<ServiceLogPriority, string> = {
  Low: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-600",
  Medium:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  High: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  Critical:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

export default function ServiceLogs() {
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ServiceLogStatus>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | ServiceLogPriority>("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [selectedLog, setSelectedLog] = useState<ServiceLog | null>(null);
  const [formData, setFormData] = useState<Omit<ServiceLog, "id" | "createdAt">>(initialForm);

  const [deleteTarget, setDeleteTarget] = useState<ServiceLog | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await serviceLogService.getServiceLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load service logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        log.machineName.toLowerCase().includes(search) ||
        log.machineId.toLowerCase().includes(search) ||
        log.engineerName.toLowerCase().includes(search) ||
        log.component.toLowerCase().includes(search) ||
        log.serviceType.toLowerCase().includes(search) ||
        log.site.toLowerCase().includes(search);

      const matchesStatus = statusFilter === "All" || log.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || log.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [logs, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      completed: logs.filter((log) => log.status === "Completed").length,
      progress: logs.filter((log) => log.status === "In Progress").length,
      critical: logs.filter((log) => log.priority === "Critical").length,
    };
  }, [logs]);

  const resetForm = () => {
    setFormData(initialForm);
    setSelectedLog(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openViewModal = (log: ServiceLog) => {
    setSelectedLog(log);
    setFormData({
      machineId: log.machineId,
      machineName: log.machineName,
      site: log.site,
      component: log.component,
      serviceType: log.serviceType,
      engineerName: log.engineerName,
      serviceDate: log.serviceDate,
      nextServiceDate: log.nextServiceDate,
      runtimeHours: log.runtimeHours,
      status: log.status,
      priority: log.priority,
      issueFound: log.issueFound,
      actionTaken: log.actionTaken,
      remarks: log.remarks,
    });
    setModalMode("view");
    setIsModalOpen(true);
  };

  const openEditModal = (log: ServiceLog) => {
    setSelectedLog(log);
    setFormData({
      machineId: log.machineId,
      machineName: log.machineName,
      site: log.site,
      component: log.component,
      serviceType: log.serviceType,
      engineerName: log.engineerName,
      serviceDate: log.serviceDate,
      nextServiceDate: log.nextServiceDate,
      runtimeHours: log.runtimeHours,
      status: log.status,
      priority: log.priority,
      issueFound: log.issueFound,
      actionTaken: log.actionTaken,
      remarks: log.remarks,
    });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleChange = (
    field: keyof Omit<ServiceLog, "id" | "createdAt">,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.machineId.trim()) return "Machine ID is required";
    if (!formData.machineName.trim()) return "Machine name is required";
    if (!formData.site.trim()) return "Site is required";
    if (!formData.component.trim()) return "Component is required";
    if (!formData.serviceType.trim()) return "Service type is required";
    if (!formData.engineerName.trim()) return "Engineer name is required";
    if (!formData.serviceDate) return "Service date is required";
    if (!formData.nextServiceDate) return "Next service date is required";
    if (!formData.issueFound.trim()) return "Issue found is required";
    if (!formData.actionTaken.trim()) return "Action taken is required";

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();

    if (error) {
      toast.error(error);
      return;
    }

    try {
      if (modalMode === "add") {
        const createdLog = await serviceLogService.createServiceLog(formData);
        setLogs((prev) => [createdLog, ...prev]);
        toast.success("Service log added successfully");
      }

      if (modalMode === "edit" && selectedLog) {
        await serviceLogService.updateServiceLog(selectedLog.id, formData);

        setLogs((prev) =>
          prev.map((log) =>
            log.id === selectedLog.id
              ? {
                  ...log,
                  ...formData,
                }
              : log
          )
        );

        toast.success("Service log updated successfully");
      }

      closeModal();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await serviceLogService.deleteServiceLog(deleteTarget.id);
      setLogs((prev) => prev.filter((log) => log.id !== deleteTarget.id));
      toast.success("Service log deleted successfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete service log");
    }
  };

  const startItem = filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredLogs.length);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-[#0B1120] dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
              <Wrench size={14} />
              Engineer Module
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Service Logs
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track machine service history, maintenance actions, next service date and engineer remarks.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
          >
            <Plus size={18} />
            Add Service Log
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Logs"
            value={stats.total}
            icon={<Wrench size={20} />}
            subText="All service records"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={<CheckCircle2 size={20} />}
            subText="Finished services"
          />
          <StatCard
            title="In Progress"
            value={stats.progress}
            icon={<Clock size={20} />}
            subText="Active services"
          />
          <StatCard
            title="Critical"
            value={stats.critical}
            icon={<CalendarDays size={20} />}
            subText="High attention logs"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by machine, engineer, component, service type or site..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:focus:border-orange-400"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "All" | ServiceLogStatus);
                  setCurrentPage(1);
                }}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
              >
                <option value="All">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as "All" | ServiceLogPriority);
                setCurrentPage(1);
              }}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-orange-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-white"
            >
              <option value="All">All Priority</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Machine</th>
                  <th className="px-5 py-4">Component</th>
                  <th className="px-5 py-4">Service Type</th>
                  <th className="px-5 py-4">Engineer</th>
                  <th className="px-5 py-4">Service Date</th>
                  <th className="px-5 py-4">Next Service</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                      Loading service logs...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                      No service logs found.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {log.machineName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {log.machineId} · {log.site}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {log.component}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {log.serviceType}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {log.engineerName}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {log.serviceDate}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {log.nextServiceDate}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle[log.status]}`}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityStyle[log.priority]}`}
                        >
                          {log.priority}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(log)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-500/10"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => openEditModal(log)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-orange-500/10"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(log)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-500/10"
                            title="Delete"
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
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {startItem}-{endItem} of {filteredLogs.length} service logs
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Prev
              </button>

              <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {currentPage} / {totalPages || 1}
              </span>

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ServiceLogModal
          mode={modalMode}
          formData={formData}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={handleChange}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          log={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  subText,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  subText: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </h2>
          <p className="mt-1 text-xs text-slate-400">{subText}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ServiceLogModal({
  mode,
  formData,
  onClose,
  onSubmit,
  onChange,
}: {
  mode: "add" | "edit" | "view";
  formData: Omit<ServiceLog, "id" | "createdAt">;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (
    field: keyof Omit<ServiceLog, "id" | "createdAt">,
    value: string | number
  ) => void;
}) {
  const isView = mode === "view";

  const title =
    mode === "add"
      ? "Add Service Log"
      : mode === "edit"
      ? "Edit Service Log"
      : "View Service Log";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#111827]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-[#111827] sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Manage machine maintenance and service history.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Machine ID"
              value={formData.machineId}
              disabled={isView}
              onChange={(value) => onChange("machineId", value)}
            />

            <InputField
              label="Machine Name"
              value={formData.machineName}
              disabled={isView}
              onChange={(value) => onChange("machineName", value)}
            />

            <InputField
              label="Site"
              value={formData.site}
              disabled={isView}
              onChange={(value) => onChange("site", value)}
            />

            <InputField
              label="Component"
              value={formData.component}
              disabled={isView}
              placeholder="Engine / Hydraulics / Tyre / Suspension"
              onChange={(value) => onChange("component", value)}
            />

            <InputField
              label="Service Type"
              value={formData.serviceType}
              disabled={isView}
              placeholder="Preventive Maintenance / Breakdown Service"
              onChange={(value) => onChange("serviceType", value)}
            />

            <InputField
              label="Engineer Name"
              value={formData.engineerName}
              disabled={isView}
              onChange={(value) => onChange("engineerName", value)}
            />

            <InputField
              label="Service Date"
              type="date"
              value={formData.serviceDate}
              disabled={isView}
              onChange={(value) => onChange("serviceDate", value)}
            />

            <InputField
              label="Next Service Date"
              type="date"
              value={formData.nextServiceDate}
              disabled={isView}
              onChange={(value) => onChange("nextServiceDate", value)}
            />

            <InputField
              label="Runtime Hours"
              type="number"
              value={String(formData.runtimeHours)}
              disabled={isView}
              onChange={(value) => onChange("runtimeHours", Number(value))}
            />

            <SelectField
              label="Status"
              value={formData.status}
              disabled={isView}
              options={statusOptions}
              onChange={(value) => onChange("status", value)}
            />

            <SelectField
              label="Priority"
              value={formData.priority}
              disabled={isView}
              options={priorityOptions}
              onChange={(value) => onChange("priority", value)}
            />

            <TextAreaField
              label="Issue Found"
              value={formData.issueFound}
              disabled={isView}
              onChange={(value) => onChange("issueFound", value)}
            />

            <TextAreaField
              label="Action Taken"
              value={formData.actionTaken}
              disabled={isView}
              onChange={(value) => onChange("actionTaken", value)}
            />

            <div className="md:col-span-2">
              <TextAreaField
                label="Remarks"
                value={formData.remarks}
                disabled={isView}
                onChange={(value) => onChange("remarks", value)}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:justify-end sm:px-6">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {isView ? "Close" : "Cancel"}
          </button>

          {!isView && (
            <button
              onClick={onSubmit}
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              {mode === "add" ? "Save Service Log" : "Update Service Log"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:focus:border-orange-400"
      />
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:focus:border-orange-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-[#0B1120] dark:text-white dark:focus:border-orange-400"
      />
    </div>
  );
}

function ConfirmDeleteModal({
  log,
  onCancel,
  onConfirm,
}: {
  log: ServiceLog;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onMouseDown={onCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#111827]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10">
          <Trash2 size={24} />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Delete Service Log?
        </h2>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Are you sure you want to delete service log for{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {log.machineName}
          </span>
          ? This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}