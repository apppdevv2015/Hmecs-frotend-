import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { machineService, type MachinePayload } from "../../services/companyadmin/machineService";

type Machine = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  companyId?: string;
};

type MachineFormData = {
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
};

const ROWS_PER_PAGE = 5;

const emptyForm: MachineFormData = {
  name: "",
  model: "",
  serialNumber: "",
  equipmentType: "",
};

const normalizeMachine = (item: any, index: number): Machine => {
  return {
    id: String(item?.id ?? item?._id ?? item?.machineId ?? index + 1),
    name: String(item?.name ?? item?.machineName ?? item?.machine_name ?? "N/A"),
    model: String(item?.model ?? item?.machineModel ?? item?.machine_model ?? "N/A"),
    serialNumber: String(item?.serialNumber ?? item?.serial_number ?? item?.serialNo ?? "N/A"),
    equipmentType: String(
      item?.equipmentType ?? item?.equipment_type ?? item?.type ?? item?.category ?? "N/A",
    ),
    companyId: item?.companyId ?? item?.company_id,
  };
};

const getMachineArrayFromResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.data?.machines)) return response.data.machines;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.result)) return response.result;

  return [];
};

const MachineManagement: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [deleteMachine, setDeleteMachine] = useState<Machine | null>(null);

  const [formData, setFormData] = useState<MachineFormData>(emptyForm);

  const isAnyModalOpen = isAddModalOpen || !!viewMachine || !!deleteMachine || !!editMachine;

  useEffect(() => {
    document.body.style.overflow = isAnyModalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const fetchMachines = async () => {
    setLoading(true);

    try {
      const response = await machineService.getMachines();
      const apiMachines = getMachineArrayFromResponse(response);

      setMachines(apiMachines.map(normalizeMachine));
    } catch (error: any) {
      console.error("Failed to fetch machines:", error);
      setMachines([]);
      toast.error(error?.message || "Failed to load machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const filteredMachines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return machines;

    return machines.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.model.toLowerCase().includes(query) ||
        machine.serialNumber.toLowerCase().includes(query) ||
        machine.equipmentType.toLowerCase().includes(query)
      );
    });
  }, [machines, searchQuery]);

  const totalPages = Math.ceil(filteredMachines.length / ROWS_PER_PAGE);

  const startItem = filteredMachines.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ROWS_PER_PAGE, filteredMachines.length);

  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredMachines.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredMachines, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setEditMachine(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (machine: Machine) => {
    setEditMachine(machine);
    setFormData({
      name: machine.name === "N/A" ? "" : machine.name,
      model: machine.model === "N/A" ? "" : machine.model,
      serialNumber: machine.serialNumber === "N/A" ? "" : machine.serialNumber,
      equipmentType: machine.equipmentType === "N/A" ? "" : machine.equipmentType,
    });
    setIsAddModalOpen(true);
  };

  const closeMachineFormModal = () => {
    setIsAddModalOpen(false);
    setEditMachine(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildPayload = (): MachinePayload => {
    return {
      name: formData.name.trim(),
      model: formData.model.trim(),
      serialNumber: formData.serialNumber.trim(),
      equipmentType: formData.equipmentType.trim(),
    };
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Machine name is required");
      return false;
    }

    if (!formData.model.trim()) {
      toast.error("Model is required");
      return false;
    }

    if (!formData.serialNumber.trim()) {
      toast.error("Serial number is required");
      return false;
    }

    if (!formData.equipmentType.trim()) {
      toast.error("Equipment type is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const toastId = toast.loading(editMachine ? "Updating machine..." : "Adding machine...");

    try {
      const payload = buildPayload();

      if (editMachine) {
        await machineService.updateMachine(editMachine.id, payload);
        toast.success("Machine updated successfully", { id: toastId });
      } else {
        await machineService.createMachine(payload);
        toast.success("Machine added successfully", { id: toastId });
      }

      closeMachineFormModal();
      await fetchMachines();
    } catch (error: any) {
      console.error("Machine submit failed:", error);
      toast.error(error?.message || "Something went wrong", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMachine = async () => {
    if (!deleteMachine) return;

    setIsDeleting(true);

    const toastId = toast.loading("Deleting machine...");

    try {
      await machineService.deleteMachine(deleteMachine.id);

      toast.success("Machine deleted successfully", { id: toastId });
      setDeleteMachine(null);
      await fetchMachines();
    } catch (error: any) {
      console.error("Machine delete failed:", error);
      toast.error(error?.message || "Failed to delete machine", {
        id: toastId,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 dark:bg-[#050b18] dark:text-white sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white md:text-3xl">
            Machines
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Manage company machines using GET, POST, PUT and DELETE APIs.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Machine
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Machines List</h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              All machine actions are connected with backend APIs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search machines..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500 sm:w-72"
              />
            </div>

            <button
              onClick={fetchMachines}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
              <tr>
                <th className="w-16 px-5 py-4">#</th>
                <th className="px-5 py-4">Machine Name</th>
                <th className="px-5 py-4">Model</th>
                <th className="px-5 py-4">Serial Number</th>
                <th className="px-5 py-4">Equipment Type</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Loading machines...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedMachines.length > 0 ? (
                paginatedMachines.map((machine, index) => (
                  <tr
                    key={machine.id}
                    className="bg-white transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {machine.name}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {machine.model}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {machine.serialNumber}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                        {machine.equipmentType}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewMachine(machine)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-blue-500/10"
                          title="View"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          onClick={() => openEditModal(machine)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-blue-500/10"
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => setDeleteMachine(machine)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <AlertTriangle size={28} />
                      </div>

                      <h3 className="text-base font-bold text-slate-950 dark:text-white">
                        No machines found
                      </h3>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Add Machine button se new machine create karo.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={filteredMachines.length}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                  {editMachine ? "Edit Machine" : "Add New Machine"}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  API body: name, model, serialNumber, equipmentType.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMachineFormModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6">
              <div className="grid gap-5 md:grid-cols-2">
                <FormInput
                  label="Machine Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. CKIJ-990-020"
                />

                <FormInput
                  label="Model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="e.g. 990H"
                />

                <FormInput
                  label="Serial Number"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. SN-12345"
                />

                <FormInput
                  label="Equipment Type"
                  name="equipmentType"
                  value={formData.equipmentType}
                  onChange={handleInputChange}
                  placeholder="e.g. FEL"
                />
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeMachineFormModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  {editMachine ? "Update Machine" : "Add Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMachine && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                  Machine Details
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Complete information of selected machine.
                </p>
              </div>

              <button
                onClick={() => setViewMachine(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  {viewMachine.name}
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {viewMachine.serialNumber}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Name" value={viewMachine.name} />
                <DetailItem label="Model" value={viewMachine.model} />
                <DetailItem label="Serial Number" value={viewMachine.serialNumber} />
                <DetailItem label="Equipment Type" value={viewMachine.equipmentType} />
              </div>

              <div className="mt-7 flex justify-end">
                <button
                  onClick={() => setViewMachine(null)}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteMachine && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10">
              <Trash2 size={24} />
            </div>

            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Delete Machine?</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900 dark:text-white">{deleteMachine.name}</span>
              ? This action cannot be undone.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setDeleteMachine(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteMachine}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting && <Loader2 size={17} className="animate-spin" />}
                Delete Machine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type FormInputProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value,
  placeholder,
  type = "text",
  onChange,
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </div>
  );
};

function Pagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 px-3 py-2 dark:border-[#1F2A44] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-gray-500 dark:text-slate-400">
        Showing {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          disabled={currentPage === 1}
          onClick={onPrev}
          className="h-8 rounded-lg border border-gray-200 px-3 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A44] dark:text-slate-300 dark:hover:bg-blue-500/10"
        >
          Previous
        </button>

        <span className="text-[11px] font-medium text-gray-600 dark:text-slate-300">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={onNext}
          className="h-8 rounded-lg border border-gray-200 px-3 text-[11px] font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2A44] dark:text-slate-300 dark:hover:bg-blue-500/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type DetailItemProps = {
  label: string;
  value: string;
};

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>

      <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
};

export default MachineManagement;
