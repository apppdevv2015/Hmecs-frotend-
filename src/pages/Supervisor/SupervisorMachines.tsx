import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import {
  Search,
  Cpu,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Gauge,
  User,
  UserCheck,
  Truck,
  HardHat,
  Tractor,
  Wrench,
  Activity,
  Cog,
} from "lucide-react";
import { fleetService } from "../../services/Fleet/fleetService";

import type { MachinePayload } from "../../services/companyadmin/machineService";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination";

import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "../../redux/store";

import {
  fetchMachines,
  addMachine as addMachineThunk,
} from "../../redux/slices/machineSlice";

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

  model: z
    .string()
    .trim()
    .min(1, "Model is required")
    .max(30, "Model cannot exceed 30 characters"),

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

  site: z
    .string()
    .trim()
    .min(1, "Site is required")
    .max(100, "Site cannot exceed 100 characters"),
});

const equipmentOptions = [
  { label: "Excavator", value: "Excavator" },
  { label: "Truck", value: "Truck" },
  { label: "Dozer", value: "Dozer" },
  { label: "Grader", value: "Grader" },
];

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
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(5);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fleetMachines, setFleetMachines] = useState<any[]>([]);

  useEffect(() => {
    fleetService.getFleetMachines("company_admin").then((res) => {
      if (Array.isArray(res)) setFleetMachines(res);
    }).catch(() => {});
  }, []);

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

  useEffect(() => {
    if (isAddModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddModalOpen]);

  const handleAddMachine = async () => {
    try {
      if (!validateForm()) return;

      const payload = buildPayload();

      await dispatch(addMachineThunk(payload)).unwrap();

      setIsAddModalOpen(false);

      resetForm();
    } catch {
    } finally {
    }
  };

  const getOperatorForMachine = (machine: Machine, index: number) => {
    if ((machine as any).assignedOperatorName) return (machine as any).assignedOperatorName;
    if ((machine as any).operatorName) return (machine as any).operatorName;
    if ((machine as any).operator?.name) return (machine as any).operator.name;

    try {
      const storedTasks = JSON.parse(localStorage.getItem("hme_supervisor_task_assignments") || "[]");
      const task = storedTasks.find((t: any) => t.machineId === machine.id || t.machineName === machine.name);
      if (task?.operatorName) return task.operatorName;
    } catch {}

    const fleetMatch = fleetMachines.find(
      (f: any) => f.machineName === machine.name || f.id === machine.id || f.machineId === machine.machineId
    );
    if (fleetMatch?.operator?.name && fleetMatch.operator.name !== "N/A" && !fleetMatch.operator.name.includes("Assigned Operator")) {
      return fleetMatch.operator.name;
    }
    
    return null;
  };

  const assignedMachinesCount = useMemo(
    () => machines.filter((m, idx) => Boolean(getOperatorForMachine(m, idx))).length,
    [machines, fleetMachines]
  );

  const unassignedMachinesCount = Math.max(0, machines.length - assignedMachinesCount);

  const filteredMachines = useMemo(() => {
    const value = search.toLowerCase().trim();

    return machines.filter(
      (machine, idx) => {
        const opName = (getOperatorForMachine(machine, idx) || "").toLowerCase();
        return (
          machine.name?.toLowerCase().includes(value) ||
          machine.model?.toLowerCase().includes(value) ||
          machine.serialNumber?.toLowerCase().includes(value) ||
          machine.equipmentType?.toLowerCase().includes(value) ||
          machine.site?.toLowerCase().includes(value) ||
          opName.includes(value)
        );
      }
    );
  }, [machines, search, fleetMachines]);

  const isShowAll = itemsPerPage === "all";

  const effectivePageSize = isShowAll
    ? Math.max(1, filteredMachines.length)
    : itemsPerPage;

  const totalPages = isShowAll
    ? 1
    : Math.max(1, Math.ceil(filteredMachines.length / effectivePageSize));

  const startIndex = (currentPage - 1) * effectivePageSize;

  const paginatedMachines = isShowAll
    ? filteredMachines
    : filteredMachines.slice(startIndex, startIndex + effectivePageSize);

  const startItem =
    filteredMachines.length === 0 ? 0 : isShowAll ? 1 : startIndex + 1;

  const endItem = isShowAll
    ? filteredMachines.length
    : Math.min(startIndex + effectivePageSize, filteredMachines.length);

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

  const healthyMachines = machines.filter(
    (machine) => getMachineHealth(machine) >= 85,
  ).length;

  const warningMachines = machines.filter(
    (machine) => getMachineHealth(machine) < 85,
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#07111f]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <Loader2 className="animate-spin text-blue-600" size={24} />

          <span className="font-bold text-slate-800 dark:text-white">
            Loading Machines...
          </span>
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
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md w-fit">
                  <Gauge size={14} />
                  Fleet Machine Control
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Company Machines
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-blue-100">
                  Monitor machine performance, assigned operators, site locations, and overall health automatically calculated from Operator Shift Reports & Artisan Maintenance Logs.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-5">
            {/* Total Machines */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Total Machines
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {machines.length}
                  </h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10">
                  <Cpu />
                </div>
              </div>
            </div>

            {/* Assigned Machines */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Assigned Machines
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {assignedMachinesCount}
                  </h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10">
                  <UserCheck />
                </div>
              </div>
            </div>

            {/* Dedicated Unassigned Machines Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Unassigned Machines
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-orange-500 dark:text-orange-400">
                    {unassignedMachinesCount}
                  </h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-orange-500 dark:bg-orange-500/10">
                  <AlertTriangle />
                </div>
              </div>
            </div>

            {/* Healthy Machines */}
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

            {/* Warning Machines */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Warning Machines
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                    {warningMachines}
                  </h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/10">
                  <AlertCircle />
                </div>
              </div>
            </div>
          </div>

          {/* Machine Table */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    Machine Overview
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Complete overview of machine inventory and health.
                  </p>
                </div>

                {/* Search Bar placed right next to Machine Overview */}
                <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[380px]">
                  <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search machine, model, serial or operator..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 shrink-0">
                  {filteredMachines.length} Machines
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-[#07111f]">
                  <tr>
                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      #
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Machine
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Model
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Serial Number
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Assigned Operator
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Assigned By (Supervisor)
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Assigned Date & Time
                    </th>

                    <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Health Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedMachines.map((machine, idx) => {
                    const health = getMachineHealth(machine);
                    const status = getHealthStatus(health);

                    let task: any = null;
                    try {
                      const storedTasks = JSON.parse(localStorage.getItem("hme_supervisor_task_assignments") || "[]");
                      task = storedTasks.find((t: any) => {
                        if (!t) return false;
                        if (t.machineId && (t.machineId === machine.id || t.machineId === (machine as any).machineId)) return true;
                        if (t.machineName && machine.name && (t.machineName.includes(machine.name) || machine.name.includes(t.machineName.split(" (")[0]))) return true;
                        if (t.machineName && machine.serialNumber && t.machineName.includes(machine.serialNumber)) return true;
                        return false;
                      });
                    } catch {}

                    const opName = (machine as any).assignedOperatorName || (machine as any).operatorName || (machine as any).operator?.name || task?.operatorName || getOperatorForMachine(machine, idx);
                    const artisanName = (machine as any).assignedArtisanName || (machine as any).artisanName || (machine as any).artisan?.name || task?.engineerName || null;
                    const supervisorName = (machine as any).assignedSupervisorName || (machine as any).supervisorName || (machine as any).supervisor?.name || task?.supervisorName || null;
                    const rawAssignedAt = task?.assignedAt || (machine as any).assignedAt || (opName ? (machine as any).createdAt : null);

                    const getDynamicIcon = () => {
                      const name = (machine.name || machine.equipmentType || "").toLowerCase();
                      if (name.includes("truck") || name.includes("dump") || name.includes("haul")) {
                        return { icon: <Truck className="text-white h-6 w-6" />, bg: "from-blue-500 to-indigo-600" };
                      }
                      if (name.includes("excavator") || name.includes("shovel") || name.includes("cat")) {
                        return { icon: <Tractor className="text-white h-6 w-6" />, bg: "from-amber-500 to-orange-600" };
                      }
                      if (name.includes("drill") || name.includes("rotary")) {
                        return { icon: <Activity className="text-white h-6 w-6" />, bg: "from-purple-500 to-pink-600" };
                      }
                      if (name.includes("dozer") || name.includes("loader")) {
                        return { icon: <HardHat className="text-white h-6 w-6" />, bg: "from-emerald-500 to-teal-600" };
                      }
                      const iconVariants = [
                        { icon: <Truck className="text-white h-6 w-6" />, bg: "from-blue-500 to-cyan-500" },
                        { icon: <Tractor className="text-white h-6 w-6" />, bg: "from-amber-500 to-orange-500" },
                        { icon: <HardHat className="text-white h-6 w-6" />, bg: "from-emerald-500 to-teal-500" },
                        { icon: <Wrench className="text-white h-6 w-6" />, bg: "from-indigo-500 to-purple-500" },
                        { icon: <Cog className="text-white h-6 w-6" />, bg: "from-rose-500 to-pink-500" },
                      ];
                      return iconVariants[idx % iconVariants.length];
                    };

                    const dynamicIcon = getDynamicIcon();

                    return (
                      <tr
                        key={machine.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-[#101f33]"
                      >
                        <td className="px-4 py-5 text-center font-bold text-xs text-slate-500 dark:text-slate-400">
                          {startIndex + idx + 1}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${dynamicIcon.bg} shadow-lg shrink-0`}>
                              {dynamicIcon.icon}
                            </div>

                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                {machine.name}
                              </h3>
                              <p className="text-[11px] text-slate-400">
                                Site: {machine.site || "Site A"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="inline-block rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                            {machine.model || "-"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {machine.serialNumber || "-"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {opName ? (
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
                                <User size={14} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs dark:text-white">
                                  {opName}
                                </p>
                                {(machine as any).assignedOperatorId && (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    ID: {(machine as any).assignedOperatorId}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {supervisorName ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <ShieldCheck size={14} />
                              {supervisorName}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {rawAssignedAt ? (
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {isNaN(new Date(rawAssignedAt).getTime())
                                ? String(rawAssignedAt)
                                : new Date(rawAssignedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 italic">Unassigned</span>
                          )}
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={filteredMachines.length}
              itemsPerPage={itemsPerPage}
              itemLabel="machines"
              pageSizeOptions={[5, 10, 20, 50]}
              onPrev={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              onNext={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </section>
        </div>
      </div>
    </>
  );
}
