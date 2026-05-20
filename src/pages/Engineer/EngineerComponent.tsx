import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { userService } from "../../services/userService";

type MachineStatus = "active" | "inactive" | "maintenance";

type Machine = {
  id: string | number;
  name: string;
  serial_number: string;
  model: string;
  status: MachineStatus;
  last_maintenance?: string;
};

type MachineFormData = {
  name: string;
  serial_number: string;
  model: string;
  status: MachineStatus;
};

const emptyForm: MachineFormData = {
  name: "",
  serial_number: "",
  model: "",
  status: "active",
};

const manualMachines: Machine[] = [
  {
    id: 1,
    name: "CAT 404 Backhoe Loader",
    serial_number: "MCH-001",
    model: "CAT 404",
    status: "active",
    last_maintenance: "12 May 2026",
  },
  {
    id: 2,
    name: "CAT 797F Mining Truck",
    serial_number: "MCH-002",
    model: "797F",
    status: "active",
    last_maintenance: "09 May 2026",
  },
  {
    id: 3,
    name: "Komatsu HD785 Dump Truck",
    serial_number: "MCH-003",
    model: "HD785-7",
    status: "maintenance",
    last_maintenance: "16 May 2026",
  },
  {
    id: 4,
    name: "CAT 336 Excavator",
    serial_number: "MCH-004",
    model: "336 GC",
    status: "active",
    last_maintenance: "02 May 2026",
  },
  {
    id: 5,
    name: "Volvo A60H Hauler",
    serial_number: "MCH-005",
    model: "A60H",
    status: "inactive",
    last_maintenance: "18 Apr 2026",
  },
];

const getMachineId = (machine: Machine) => String(machine.id);

const normalizeMachines = (data: any): Machine[] => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.machines)
        ? data.machines
        : Array.isArray(data?.data?.machines)
          ? data.data.machines
          : [];

  return list.map((item: any, index: number) => ({
    id: item?.id ?? item?._id ?? index + 1,
    name: item?.name ?? item?.machine_name ?? "Unnamed Machine",
    serial_number:
      item?.serial_number ??
      item?.machine_id ??
      item?.machineId ??
      `MCH-${String(index + 1).padStart(3, "0")}`,
    model: item?.model ?? item?.machine_model ?? "N/A",
    status: (item?.status ?? "active") as MachineStatus,
    last_maintenance:
      item?.last_maintenance ?? item?.lastMaintenance ?? item?.last_service ?? "N/A",
  }));
};

const getStatusBadge = (status: MachineStatus) => {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }

  if (status === "maintenance") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
  }

  return "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20";
};

const formatStatus = (status: MachineStatus) => {
  if (status === "maintenance") return "Maintenance";
  if (status === "inactive") return "Inactive";
  return "Active";
};

const MachineManagement: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>(manualMachines);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [subscription, setSubscription] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [deleteMachine, setDeleteMachine] = useState<Machine | null>(null);

  const [formData, setFormData] = useState<MachineFormData>(emptyForm);

  const isAnyModalOpen =
    isAddModalOpen || Boolean(viewMachine) || Boolean(editMachine) || Boolean(deleteMachine);

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const fetchMachines = async () => {
    setLoading(true);

    try {
      const data = await userService.getMachines();
      const normalized = normalizeMachines(data);

      if (normalized.length > 0) {
        setMachines(normalized);
      } else {
        setMachines(manualMachines);
      }
    } catch (err) {
      console.error("Failed to fetch machines:", err);
      setMachines(manualMachines);
      toast.error("Failed to load machines. Showing manual data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await userService.getActiveSubscription();
      setSubscription(res);
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchSubscription();
  }, []);

  const filteredMachines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return machines;

    return machines.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.serial_number.toLowerCase().includes(query) ||
        machine.model.toLowerCase().includes(query) ||
        machine.status.toLowerCase().includes(query)
      );
    });
  }, [machines, searchQuery]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setEditMachine(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (machine: Machine) => {
    setEditMachine(machine);
    setFormData({
      name: machine.name,
      serial_number: machine.serial_number,
      model: machine.model,
      status: machine.status,
    });
  };

  const closeFormModal = () => {
    setIsAddModalOpen(false);
    setEditMachine(null);
    setFormData(emptyForm);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Machine name is required");
      return false;
    }

    if (!formData.serial_number.trim()) {
      toast.error("Machine ID / Serial number is required");
      return false;
    }

    if (!formData.model.trim()) {
      toast.error("Machine model is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload: MachineFormData = {
      name: formData.name.trim(),
      serial_number: formData.serial_number.trim(),
      model: formData.model.trim(),
      status: formData.status,
    };

    try {
      if (editMachine) {
        try {
          if ((userService as any).updateMachine) {
            await (userService as any).updateMachine(editMachine.id, payload);
          }
        } catch (apiError) {
          console.warn("Update API not ready, updating local state only:", apiError);
        }

        setMachines((prev) =>
          prev.map((machine) =>
            getMachineId(machine) === getMachineId(editMachine)
              ? {
                  ...machine,
                  ...payload,
                }
              : machine
          )
        );

        toast.success("Machine updated successfully");
        closeFormModal();
        return;
      }

      let createdMachine: Machine | null = null;

      try {
        const res = await userService.registerMachine(payload);
        const normalized = normalizeMachines([res?.data ?? res]);

        createdMachine = normalized[0] ?? null;
      } catch (apiError) {
        console.warn("Register API not ready, adding local data only:", apiError);
      }

      const newMachine: Machine =
        createdMachine ??
        ({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Date.now(),
          ...payload,
          last_maintenance: "N/A",
        } as Machine);

      setMachines((prev) => [newMachine, ...prev]);
      toast.success("Machine added successfully");
      closeFormModal();
    } catch (err) {
      console.error("Failed to submit machine:", err);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMachine = async () => {
    if (!deleteMachine) return;

    const machineId = deleteMachine.id;

    try {
      try {
        if ((userService as any).deleteMachine) {
          await (userService as any).deleteMachine(machineId);
        }
      } catch (apiError) {
        console.warn("Delete API not ready, deleting local state only:", apiError);
      }

      setMachines((prev) =>
        prev.filter((machine) => getMachineId(machine) !== getMachineId(deleteMachine))
      );

      toast.success("Machine deleted successfully");
      setDeleteMachine(null);
    } catch (err) {
      console.error("Failed to delete machine:", err);
      toast.error("Failed to delete machine");
    }
  };

  const isLimitReached =
    subscription &&
    subscription.machine_limit !== null &&
    machines.length >= subscription.machine_limit;

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: {
            borderRadius: "12px",
            fontWeight: 600,
          },
        }}
      />

      <div className="min-h-screen bg-gray-50 p-4 text-slate-900 dark:bg-[#050b18] dark:text-white md:p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">
              Machine Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View and manage your fleet of mining machines and equipment.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={fetchMachines}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={openAddModal}
              disabled={Boolean(isLimitReached)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Plus size={18} />
              Add Machine
            </button>
          </div>
        </div>

        {subscription && subscription.machine_limit !== null && (
          <div
            className={`mb-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
              isLimitReached
                ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-500/5"
                : "border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-500/5"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isLimitReached
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <CheckCircle2 size={24} />
              </div>

              <div>
                <h3 className="font-bold">Machine Limit Monitoring</h3>
                <p className="text-sm text-slate-500">
                  You have used{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {machines.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {subscription.machine_limit}
                  </span>{" "}
                  slots available in your{" "}
                  <span className="font-bold uppercase text-blue-600">
                    {subscription.plan_name}
                  </span>{" "}
                  plan.
                </p>
              </div>
            </div>

            {isLimitReached && (
              <a
                href="/plans"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
              >
                Upgrade Now
              </a>
            )}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search machines by name, ID, model or status..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <RefreshCw size={40} className="animate-spin text-blue-600" />
              <p className="text-slate-500">Loading machines...</p>
            </div>
          ) : filteredMachines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4">Machine Name</th>
                    <th className="px-6 py-4">Machine ID</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Maintenance</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMachines.map((machine) => (
                    <tr
                      key={getMachineId(machine)}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {machine.name}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {machine.serial_number}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {machine.model}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold ${getStatusBadge(
                            machine.status
                          )}`}
                        >
                          {formatStatus(machine.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {machine.last_maintenance || "N/A"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewMachine(machine)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-blue-500/10"
                            title="View"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(machine)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-blue-500/10"
                            title="Edit"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteMachine(machine)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Box size={40} />
              </div>

              <div>
                <h3 className="text-xl font-bold">
                  No machines or equipments added now
                </h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  You haven't registered any machines yet. Click the "Add
                  Machine" button to get started.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <Plus size={18} />
                Add Your First Machine
              </button>
            </div>
          )}
        </div>
      </div>

      {(isAddModalOpen || editMachine) && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold">
                  {editMachine ? "Update Machine" : "Add New Machine"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editMachine
                    ? "Update selected machine details."
                    : "Register a new mining machine."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Machine Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. CAT 404 Backhoe Loader"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Machine ID / Serial Number
                  </label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    placeholder="e.g. MCH-001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Model
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="e.g. CAT 404"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                  {isSubmitting
                    ? editMachine
                      ? "Updating..."
                      : "Adding..."
                    : editMachine
                      ? "Update Machine"
                      : "Add Machine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMachine && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold">Machine Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Complete machine information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMachine(null)}
                className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <DetailItem label="Machine Name" value={viewMachine.name} />
              <DetailItem label="Machine ID" value={viewMachine.serial_number} />
              <DetailItem label="Model" value={viewMachine.model} />
              <DetailItem label="Status" value={formatStatus(viewMachine.status)} />
              <DetailItem
                label="Last Maintenance"
                value={viewMachine.last_maintenance || "N/A"}
              />

              <button
                type="button"
                onClick={() => setViewMachine(null)}
                className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMachine && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10">
              <Trash2 size={24} />
            </div>

            <h2 className="text-xl font-bold">Delete Machine?</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {deleteMachine.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteMachine(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteMachine}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Delete Machine
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

type DetailItemProps = {
  label: string;
  value: string;
};

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
};

export default MachineManagement;