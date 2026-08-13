import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Search, Cpu, ShieldCheck, AlertCircle, Loader2, Gauge, Plus, X } from "lucide-react";

import toast from "react-hot-toast";

import type { MachinePayload } from "../../services/companyadmin/machineService";

import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "../../redux/store";

import { fetchMachines, addMachine as addMachineThunk } from "../../redux/slices/machineSlice";

type Machine = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  companyId?: string;
  machineId?: string;
  equipmentType?: string;
  components?: any[];
  status?: string;
  site?: string;
  location?: string;
};

type MachineForm = {
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  site: string;
};

type FormErrors = Partial<Record<keyof MachineForm, string>>;

const PAGE_SIZE = 5;

const machineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Machine name is required")
    .max(50, "Machine name cannot exceed 50 characters"),

  model: z.string().trim().min(1, "Model is required").max(30, "Model cannot exceed 30 characters"),

  serialNumber: z
    .string()
    .trim()
    .min(1, "Serial number is required")
    .max(50, "Serial number cannot exceed 50 characters"),

  equipmentType: z
    .string()
    .trim()
    .min(1, "Equipment type is required")
    .max(30, "Equipment type cannot exceed 30 characters"),

  site: z.string().trim().min(1, "Site is required").max(100, "Site cannot exceed 100 characters"),
});

type FormInputProps = {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
};

const FormInput = ({
  label,
  value,
  error,
  placeholder,
  type = "text",
  onChange,
}: FormInputProps) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 dark:bg-[#101f33] dark:text-white ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700"
        }`}
      />

      <div className="mt-1 min-h-[20px]">
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    </label>
  );
};

export default function SupervisorMachines() {
  const dispatch = useDispatch<AppDispatch>();

  const { machines, loading, submitLoading, error } = useSelector(
    (state: RootState) => state.machine,
  );

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [form, setForm] = useState<MachineForm>({
    name: "",
    model: "",
    serialNumber: "",
    equipmentType: "",
    site: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const resetForm = () => {
    setForm({
      name: "",
      model: "",
      serialNumber: "",
      equipmentType: "",
      site: "",
    });

    setFormErrors({});
  };

  const updateField = (field: keyof MachineForm, value: string) => {
    const updatedForm = {
      ...form,
      [field]: value,
    };

    setForm(updatedForm);

    const result = machineSchema.safeParse(updatedForm);

    if (result.success) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));

      return;
    }

    const issue = result.error.issues.find((error) => error.path[0] === field);

    setFormErrors((prev) => ({
      ...prev,
      [field]: issue?.message,
    }));
  };

  const validateForm = () => {
    const result = machineSchema.safeParse(form);

    if (result.success) {
      setFormErrors({});
      return true;
    }

    const errors: FormErrors = {};

    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof MachineForm;

      errors[field] = issue.message;
    });

    setFormErrors(errors);

    return false;
  };

  const buildPayload = (): MachinePayload => {
    return {
      name: form.name.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      equipmentType: form.equipmentType.trim(),
      site: form.site.trim(),
    };
  };

  useEffect(() => {
    dispatch(fetchMachines());
  }, [dispatch]);

  const handleAddMachine = async () => {
    try {
      if (!validateForm()) return;

      const payload = buildPayload();

      await dispatch(addMachineThunk(payload)).unwrap();

      toast.success("Machine added successfully");

      setIsAddModalOpen(false);

      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add machine");
    } finally {
    }
  };

  const filteredMachines = useMemo(() => {
    const value = search.toLowerCase().trim();

    return machines.filter(
      (machine) =>
        machine.name?.toLowerCase().includes(value) ||
        machine.model?.toLowerCase().includes(value) ||
        machine.serialNumber?.toLowerCase().includes(value),
    );
  }, [machines, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / PAGE_SIZE));

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedMachines = filteredMachines.slice(startIndex, startIndex + PAGE_SIZE);

  const startItem = filteredMachines.length === 0 ? 0 : startIndex + 1;

  const endItem = Math.min(startIndex + PAGE_SIZE, filteredMachines.length);

  const getMachineHealth = (machine: Machine) => {
    const components = machine.components || [];

    if (components.length === 0) {
      return 0;
    }

    const totalHealth = components.reduce((sum, component) => {
      const condition = Number(component?.condition ?? 3);

      const safeCondition = Math.max(1, Math.min(5, condition));

      const health = (6 - safeCondition) * 20;

      return sum + health;
    }, 0);

    return Math.round(totalHealth / components.length);
  };

  const getHealthStatus = (health: number) => {
    if (health >= 85) {
      return {
        text: "Excellent",
        bg: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        progress: "bg-emerald-500",
      };
    }

    if (health >= 70) {
      return {
        text: "Good",
        bg: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        progress: "bg-amber-500",
      };
    }

    return {
      text: "Critical",
      bg: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
      progress: "bg-red-500",
    };
  };

  const healthyMachines = machines.filter((machine) => getMachineHealth(machine) >= 85).length;

  const warningMachines = machines.filter((machine) => getMachineHealth(machine) < 85).length;

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#07111f]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <Loader2 className="animate-spin text-blue-600" size={24} />

          <span className="font-bold text-slate-800 dark:text-white">Loading Machines...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px] space-y-6">
          {/* Premium Header */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

            {/* Top Right Glow */}
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

            {/* Bottom Left Glow */}
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

            {/* Center Glow */}
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

            {/* Premium Highlight */}
            <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

            {/* Glass Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

            <div className="relative z-10 px-6 py-7">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                {/* Left Content */}
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                    <Gauge size={14} />
                    Fleet Machine Control
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Company Machines
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                    Monitor machine performance, health status, operational overview, utilization
                    trends and fleet activity from a centralized control dashboard.
                  </p>
                </div>

                {/* Right Actions */}
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  {/* Search */}
                  <div className="relative w-full lg:w-[320px]">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />

                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search machine..."
                      className="
              h-12
              w-full
              rounded-xl
              border
              border-white/15
              bg-white/10
              pl-12
              pr-4
              text-sm
              font-medium
              text-white
              backdrop-blur-md
              outline-none
              transition-all
              duration-300
              placeholder:text-white/50
              focus:border-white/30
              focus:bg-white/15
              focus:ring-4
              focus:ring-white/10
            "
                    />
                  </div>

                  {/* Add Machine */}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="
            inline-flex
            h-12
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-blue-300/30
            bg-white
            px-5
            text-sm
            font-bold
            text-[#3730D9]
            shadow-lg
            shadow-black/10
            transition-all
            duration-300
            hover:-translate-y-1
            hover:bg-slate-50
            hover:shadow-xl
            dark:border-slate-600
            dark:bg-slate-900
            dark:text-blue-300
            dark:hover:bg-slate-800
          "
                  >
                    <Plus size={18} />
                    Add Machine
                  </button>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Total Machines
                    </p>

                    <h2 className="mt-2 text-3xl font-extrabold">{machines.length}</h2>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10">
                    <Cpu />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Healthy Machines
                    </p>

                    <h2 className="mt-2 text-3xl font-extrabold text-emerald-600">
                      {healthyMachines}
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10">
                    <ShieldCheck />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Warning Machines
                    </p>

                    <h2 className="mt-2 text-3xl font-extrabold text-amber-600">
                      {warningMachines}
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10">
                    <AlertCircle />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Machine Table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    Machine Overview
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Complete overview of machine inventory and health.
                  </p>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300">
                  {filteredMachines.length} Machines
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#07111f]">
                  <tr>
                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Machine
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Model
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Equipment
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Serial
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Health
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedMachines.map((machine) => {
                    const health = getMachineHealth(machine);

                    const status = getHealthStatus(health);

                    return (
                      <tr
                        key={machine.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-[#101f33]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                              <Cpu className="text-white" />
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white">
                                {machine.name}
                              </h3>

                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {machine.site || "No Site"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 font-semibold text-slate-700 dark:text-slate-300">
                          {machine.model || "N/A"}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            {machine.equipmentType || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300">
                            {machine.serialNumber || "N/A"}
                          </span>
                        </td>

                        <td className="min-w-[250px] px-6 py-5">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${status.bg}`}
                              >
                                {status.text}
                              </span>

                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {health}%
                              </span>
                            </div>

                            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                style={{
                                  width: `${health}%`,
                                }}
                                className={`h-full rounded-full ${status.progress}`}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 p-5 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {startItem} - {endItem} of {filteredMachines.length} machines
              </p>

              <div className="flex items-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-xl border border-slate-300 px-5 py-2 font-semibold disabled:opacity-50 dark:border-slate-700"
                >
                  Previous
                </button>

                <div className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white">
                  {currentPage} / {totalPages}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0b1728]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-blue-600 p-6 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Add New Machine</h2>

                <p className="mt-1 text-sm text-slate-300">
                  Create a new machine for your company.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <FormInput
                label="Machine Name"
                value={form.name}
                error={formErrors.name}
                placeholder="Enter machine name"
                onChange={(value) => updateField("name", value)}
              />

              <FormInput
                label="Model"
                value={form.model}
                error={formErrors.model}
                placeholder="Enter model"
                onChange={(value) => updateField("model", value)}
              />

              <FormInput
                label="Serial Number"
                value={form.serialNumber}
                error={formErrors.serialNumber}
                placeholder="Enter serial number"
                onChange={(value) => updateField("serialNumber", value)}
              />

              {/* Equipment Type */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Equipment Type
                </label>

                <select
                  value={form.equipmentType}
                  onChange={(e) => updateField("equipmentType", e.target.value)}
                  className={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition dark:bg-[#101f33] dark:text-white ${
                    formErrors.equipmentType
                      ? "border-red-500 focus:border-red-500"
                      : "border-slate-300 focus:border-blue-500 dark:border-slate-700"
                  }`}
                >
                  <option value="">Select Equipment Type</option>
                  <option value="Excavator">Excavator</option>
                  <option value="Truck">Truck</option>
                  <option value="Dozer">Dozer</option>
                  <option value="Grader">Grader</option>
                </select>

                <div className="mt-1 min-h-[20px]">
                  {formErrors.equipmentType && (
                    <p className="text-xs font-medium text-red-500">{formErrors.equipmentType}</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <FormInput
                  label="Site (Optional)"
                  value={form.site}
                  error={formErrors.site}
                  placeholder="Enter site"
                  onChange={(value) => updateField("site", value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 p-6 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAddMachine}
                disabled={submitLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLoading && <Loader2 size={18} className="animate-spin" />}

                {submitLoading ? "Adding..." : "Add Machine"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
