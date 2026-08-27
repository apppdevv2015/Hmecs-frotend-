import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  Search,
  Puzzle,
  CheckCircle2,
  PauseCircle,
  ArrowUpDown,
  X,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination"; 
import {
  getOptionalServices,
  createOptionalService,
  updateOptionalService,
  deleteOptionalService,
  toggleOptionalServiceStatus,
} from "../../services/SuperAdmin/optionalService";

// ----------------------------------------------------
// Types
// ----------------------------------------------------

type OptionalServiceStatus = "ACTIVE" | "INACTIVE";
type StatusFilter = OptionalServiceStatus | "ALL";

interface OptionalService {
  id: number;
  name: string;
  description: string;
  status: OptionalServiceStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface OptionalServicePayload {
  name: string;
  description: string;
  status: OptionalServiceStatus;
  displayOrder: number;
}

interface FormErrors {
  name?: string;
  description?: string;
  displayOrder?: string;
}

// ----------------------------------------------------
// Validation (agar tumhari common validation file hai to
// yeh function wahan se import kar lena, yahan se hata dena)
// ----------------------------------------------------

function validateOptionalServiceForm(payload: OptionalServicePayload): FormErrors {
  const errors: FormErrors = {};

  const name = payload.name?.trim() ?? "";
  const description = payload.description?.trim() ?? "";

  if (!name) {
    errors.name = "Service name is required.";
  } else if (name.length < 3) {
    errors.name = "Service name must be at least 3 characters.";
  } else if (name.length > 100) {
    errors.name = "Service name cannot exceed 100 characters.";
  }

  if (!description) {
    errors.description = "Description is required.";
  } else if (description.length > 500) {
    errors.description = "Description cannot exceed 500 characters.";
  }

  if (!Number.isFinite(payload.displayOrder) || payload.displayOrder < 1) {
    errors.displayOrder = "Display order must be a positive number.";
  }

  return errors;
}

function isFormValid(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}

// ----------------------------------------------------
// Main Page
// ----------------------------------------------------

export default function OptionalServicePage() {
  const [services, setServices] = useState<OptionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(10);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<OptionalService | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<OptionalService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const data = await getOptionalServices();
      setServices(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load optional services.";
      setFetchError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return services.filter((service) => {
      const matchesSearch =
        term === "" ||
        service.name.toLowerCase().includes(term) ||
        service.description.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "ALL" || service.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, statusFilter]);

  const totalItems = filteredServices.length;
  const isShowAll = itemsPerPage === "all";
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(totalItems / (itemsPerPage as number)));

  const paginatedServices = useMemo(() => {
    if (isShowAll) return filteredServices;
    const start = (currentPage - 1) * (itemsPerPage as number);
    const end = start + (itemsPerPage as number);
    return filteredServices.slice(start, end);
  }, [filteredServices, currentPage, itemsPerPage, isShowAll]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * (itemsPerPage as number) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage as number), totalItems);

  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.status === "ACTIVE").length;
    const inactive = total - active;
    const orders = services.map((s) => s.displayOrder);
    const minOrder = orders.length ? Math.min(...orders) : 0;
    const maxOrder = orders.length ? Math.max(...orders) : 0;
    return { total, active, inactive, minOrder, maxOrder };
  }, [services]);

  const nextDisplayOrder = useMemo(() => {
    if (services.length === 0) return 1;
    return Math.max(...services.map((s) => s.displayOrder)) + 1;
  }, [services]);

  const handleAddClick = () => {
    setEditingService(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (service: OptionalService) => {
    setEditingService(service);
    setFormModalOpen(true);
  };

  const handleFormSuccess = (savedService: OptionalService) => {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === savedService.id);
      return exists
        ? prev.map((s) => (s.id === savedService.id ? savedService : s))
        : [...prev, savedService];
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOptionalService(deleteTarget.id);
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("Optional service deleted successfully.");
      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete service.";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (service: OptionalService) => {
    setTogglingId(service.id);
    try {
      const updated = await toggleOptionalServiceStatus(service.id);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success(`Service marked as ${updated.status === "ACTIVE" ? "Active" : "Inactive"}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status.";
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setItemsPerPage(10);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ---------------- Header ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Optional Services</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage additional integrations and value-added services that can be included in customer
            quotations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Optional Service
        </button>
      </div>

      {/* ---------------- Stats ---------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Puzzle className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50 dark:bg-purple-900/30"
          label="Total Services"
          value={stats.total}
          hint="All services created"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          label="Active Services"
          value={stats.active}
          hint="Currently active"
        />
        <StatCard
          icon={<PauseCircle className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          label="Inactive Services"
          value={stats.inactive}
          hint="Currently inactive"
        />
        <StatCard
          icon={<ArrowUpDown className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          label="Display Orders"
          value={stats.total === 0 ? "—" : `${stats.minOrder} - ${stats.maxOrder}`}
          hint="Service order range"
        />
      </div>

      {/* ---------------- Filters ---------------- */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0b1728] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services by name or description..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as StatusFilter)}
              options={[
                { label: "Status: All", value: "ALL" },
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {/* ---------------- Table ---------------- */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Service Name</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Order</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading optional services...
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <p className="text-sm font-medium text-red-500">{fetchError}</p>
                    <button
                      type="button"
                      onClick={fetchServices}
                      className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No optional services found.
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service, index) => (
                  <tr
                    key={service.id}
                    className="text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4 text-slate-400">
                      {isShowAll
                        ? index + 1
                        : (currentPage - 1) * (itemsPerPage as number) + index + 1}
                    </td>
                    <td className="px-6 py-4 font-semibold">{service.name}</td>
                    <td className="max-w-xs px-6 py-4 text-slate-500 dark:text-slate-400">
                      <p className="line-clamp-1">{service.description}</p>
                    </td>
                    <td className="px-6 py-4">{service.displayOrder}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(service)}
                        disabled={togglingId === service.id}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 ${
                          service.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/30"
                        }`}
                        title="Click to toggle status"
                      >
                        {togglingId === service.id
                          ? "Updating..."
                          : service.status === "ACTIVE"
                          ? "Active"
                          : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{service.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(service)}
                          className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(service)}
                          className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 dark:bg-red-900/30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !fetchError && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemLabel="results"
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            onPageChange={(page) => setCurrentPage(page)}
            onItemsPerPageChange={(val) => setItemsPerPage(val)}
          />
        )}
      </div>

      {/* ---------------- Add/Edit Modal ---------------- */}
      {formModalOpen && (
        <OptionalServiceFormModal
          onClose={() => setFormModalOpen(false)}
          onSuccess={(saved) => {
            handleFormSuccess(saved);
            setFormModalOpen(false);
          }}
          editingService={editingService}
          nextDisplayOrder={nextDisplayOrder}
        />
      )}

      {/* ---------------- Delete Modal ---------------- */}
      {deleteTarget && (
        <DeleteConfirmModal
          serviceName={deleteTarget.name}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Stat Card (local, reused 4 times above)
// ----------------------------------------------------

function StatCard({
  icon,
  iconBg,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0b1728]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
        <p className="text-[11px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Add/Edit Form Modal (local component, reused for both create & edit)
// ----------------------------------------------------

function OptionalServiceFormModal({
  onClose,
  onSuccess,
  editingService,
  nextDisplayOrder,
}: {
  onClose: () => void;
  onSuccess: (service: OptionalService) => void;
  editingService: OptionalService | null;
  nextDisplayOrder: number;
}) {
  const isEditMode = editingService !== null;

  const [formData, setFormData] = useState<OptionalServicePayload>(
    isEditMode
      ? {
          name: editingService.name,
          description: editingService.description,
          status: editingService.status,
          displayOrder: editingService.displayOrder,
        }
      : {
          name: "",
          description: "",
          status: "ACTIVE",
          displayOrder: nextDisplayOrder,
        }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateOptionalServiceForm(formData);
    setErrors(validationErrors);
    if (!isFormValid(validationErrors)) return;

    setSubmitting(true);
    try {
      const result =
        isEditMode && editingService
          ? await updateOptionalService(editingService.id, formData)
          : await createOptionalService(formData);

      toast.success(
        isEditMode ? "Optional service updated successfully." : "Optional service created successfully."
      );
      onSuccess(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#0b1728]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {isEditMode ? "Edit Optional Service" : "Add Optional Service"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={submitting}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-gray-900 dark:text-white ${
                errors.name
                  ? "border-red-400 focus:ring-red-500"
                  : "border-slate-300 focus:ring-blue-500 dark:border-slate-700"
              }`}
              placeholder="e.g. Telematics / ECU Integration"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              disabled={submitting}
              className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-gray-900 dark:text-white ${
                errors.description
                  ? "border-red-400 focus:ring-red-500"
                  : "border-slate-300 focus:ring-blue-500 dark:border-slate-700"
              }`}
              placeholder="Short description of this service"
            />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Display Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))
                }
                disabled={submitting}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-gray-900 dark:text-white ${
                  errors.displayOrder
                    ? "border-red-400 focus:ring-red-500"
                    : "border-slate-300 focus:ring-blue-500 dark:border-slate-700"
                }`}
              />
              {errors.displayOrder && <p className="mt-1 text-xs text-red-500">{errors.displayOrder}</p>}
            </div>

            <div>
              <CustomSelect
                label="Status"
                required
                value={formData.status}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, status: val as OptionalServiceStatus }))
                }
                options={[
                  { label: "Active", value: "ACTIVE" },
                  { label: "Inactive", value: "INACTIVE" },
                ]}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Delete Confirm Modal (local component)
// ----------------------------------------------------

function DeleteConfirmModal({
  serviceName,
  deleting,
  onCancel,
  onConfirm,
}: {
  serviceName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#0b1728]">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <TriangleAlert className="h-5 w-5 text-red-500" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">
          Delete Optional Service?
        </h3>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{serviceName}</span>? This
          action cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}