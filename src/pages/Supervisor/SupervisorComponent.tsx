"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Wrench,
  Activity,
  Search,
  Eye,
  Pencil,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Gauge,
} from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import AppSelect from "../../components/ui/dropdown/AppSelect";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";

type Machine = {
  id: string;
  name: string;
  machineId: string;
  serialNumber?: string;
  model?: string;
  site?: string;
  location?: string;
  status?: string;
};

type MachineComponent = {
  id: string;
  machineId: string;
  category: string;
  description: string;
  serialNumber: string;
  supplier: string;
  installHours: number;
  currentHours: number;
  plannedLife: number;
  replacementCost: number;
  condition: number;
  createdAt?: string;
  updatedAt?: string;
  intelligence?: {
    hoursRun: number;
    lifeUsedPercent: number;
    remainingHours: number;
    riskStatus: string;
    riskColor: string;
    riskDriver: string;
    estimatedSavings: string;
  };
};

const getArrayData = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.data)) return response.data.data;

  if (Array.isArray(response?.items)) return response.items;

  if (Array.isArray(response?.machines)) return response.machines;

  if (Array.isArray(response?.data?.machines)) return response.data.machines;

  if (Array.isArray(response?.components)) return response.components;

  if (Array.isArray(response?.data?.components))
    return response.data.components;

  if (Array.isArray(response?.result)) return response.result;

  return [];
};

const normalizeMachine = (item: any): Machine => ({
  id: String(item?.id || item?.machine_id || item?.machineId || ""),

  name: String(
    item?.name ||
      item?.machineName ||
      item?.machine_name ||
      item?.model ||
      "Unnamed Machine",
  ),

  machineId: String(item?.machineId || item?.machine_id || item?.id || ""),

  serialNumber: item?.serialNumber || item?.serial_number || "",

  model: item?.model || item?.equipmentType || item?.equipment_type || "",

  site: item?.site || item?.location || "",

  location: item?.location || item?.site || "",

  status: item?.status || "active",
});

const normalizeComponent = (item: any): MachineComponent => ({
  id: String(item?.id || item?.componentId || item?.component_id || ""),

  machineId: String(
    item?.machineId || item?.machine_id || item?.machine?.id || "",
  ),

  category: String(
    item?.category ||
      item?.categoryName ||
      item?.category_name ||
      item?.type ||
      "",
  ),

  description: String(item?.description || ""),

  serialNumber: String(item?.serialNumber || item?.serial_number || ""),

  supplier: String(item?.supplier || ""),

  installHours: Number(item?.installHours ?? item?.install_hours ?? 0),

  currentHours: Number(item?.currentHours ?? item?.current_hours ?? 0),

  plannedLife: Number(item?.plannedLife ?? item?.planned_life ?? 0),

  replacementCost: Number(item?.replacementCost ?? item?.replacement_cost ?? 0),

  condition: Number(item?.condition ?? 3),

  createdAt: item?.createdAt || item?.created_at,

  updatedAt: item?.updatedAt || item?.updated_at,

  intelligence: item?.intelligence,
});

const getHealthPercent = (condition: number) => {
  const safeCondition = Math.max(1, Math.min(5, Number(condition) || 1));

  return Math.max(0, Math.min(100, (6 - safeCondition) * 20));
};
const componentFormSchema = z
  .object({
    machineId: z.string().trim().min(1, "Machine is required."),

    category: z
      .string()
      .trim()
      .min(1, "Category is required.")
      .max(50, "Category cannot exceed 50 characters.")
      .regex(
        /^[A-Za-z0-9\s-]+$/,
        "Category can only contain letters, numbers, spaces and hyphens.",
      ),

    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(200, "Description cannot exceed 200 characters."),

    serialNumber: z
      .string()
      .trim()
      .min(1, "Serial number is required.")
      .max(50, "Serial number cannot exceed 50 characters.")
      .regex(
        /^[A-Za-z0-9-]+$/,
        "Serial number can only contain letters, numbers and hyphens.",
      ),

    supplier: z
      .string()
      .trim()
      .min(1, "Supplier is required.")
      .max(100, "Supplier name cannot exceed 100 characters.")
      .regex(/^[A-Za-z\s.&-]+$/, "Supplier name contains invalid characters."),

    installHours: z.coerce
      .number({
        message: "Install hours is required.",
      })
      .min(0, "Install hours cannot be negative.")
      .max(999999, "Install hours is too large."),

    currentHours: z.coerce
      .number({
        message: "Current hours is required.",
      })
      .min(0, "Current hours cannot be negative.")
      .max(999999, "Current hours is too large."),

    plannedLife: z.coerce
      .number({
        message: "Planned life is required.",
      })
      .min(1, "Planned life must be greater than 0.")
      .max(999999, "Planned life is too large."),

    replacementCost: z.coerce
      .number({
        message: "Replacement cost is required.",
      })
      .min(0, "Replacement cost cannot be negative.")
      .max(999999999, "Replacement cost is too large."),

    condition: z.coerce
      .number({
        message: "Condition is required.",
      })
      .min(1, "Condition must be between 1 and 5.")
      .max(5, "Condition must be between 1 and 5."),
  })
  .refine((data) => data.currentHours >= data.installHours, {
    path: ["currentHours"],
    message: "Current hours cannot be less than install hours.",
  })
  .refine((data) => data.plannedLife >= data.currentHours, {
    path: ["plannedLife"],
    message: "Planned life must be greater than or equal to current hours.",
  });

type ComponentFormInput = z.input<typeof componentFormSchema>;
type ComponentFormOutput = z.output<typeof componentFormSchema>;

const emptyComponentForm: ComponentFormInput = {
  machineId: "",
  category: "",
  description: "",
  serialNumber: "",
  supplier: "",
  installHours: 0,
  currentHours: 0,
  plannedLife: 0,
  replacementCost: 0,
  condition: 3,
};

export default function SupervisorComponentsPage() {
  const [machines, setMachines] = useState<Machine[]>([]);

  const [components, setComponents] = useState<MachineComponent[]>([]);

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [selectedComponent, setSelectedComponent] =
    useState<MachineComponent | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // ---------- Add/Edit modal state ----------
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [formMode, setFormMode] = useState<"add" | "edit">("add");

  const [editingComponent, setEditingComponent] =
    useState<MachineComponent | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    clearErrors,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ComponentFormInput, any, ComponentFormOutput>({
    resolver: zodResolver(componentFormSchema) as any,
    mode: "onChange",
    defaultValues: emptyComponentForm,
  });

   useEffect(() => {
    if (isFormModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isFormModalOpen]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [machineResponse, componentResponse] = await Promise.all([
        machineService.getMachines(),
        componentService.getComponents(),
      ]);

      const mappedMachines =
        getArrayData<any>(machineResponse).map(normalizeMachine);

      const mappedComponents =
        getArrayData<any>(componentResponse).map(normalizeComponent);

      setMachines(mappedMachines);

      setComponents(mappedComponents);
    } catch {
     
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredComponents = useMemo(() => {
    let result = components;

    if (selectedMachine) {
      result = result.filter(
        (component) => component.machineId === selectedMachine.machineId,
      );
    }

    const query = searchTerm.trim().toLowerCase();

    if (query) {
      result = result.filter((component) => {
        const machine = machines.find(
          (m) => m.machineId === component.machineId,
        );

        const machineName = machine ? machine.name.toLowerCase() : "";

        return (
          component.category.toLowerCase().includes(query) ||
          component.description.toLowerCase().includes(query) ||
          component.serialNumber.toLowerCase().includes(query) ||
          machineName.includes(query)
        );
      });
    }

    return result;
  }, [components, selectedMachine, searchTerm, machines]);

  const totalComponents = filteredComponents.length;

  const healthyComponents = filteredComponents.filter(
    (item) => getHealthPercent(item.condition) >= 80,
  ).length;

  const maintenanceNeeded = filteredComponents.filter(
    (item) => getHealthPercent(item.condition) < 80,
  ).length;

  const getHealthStyle = (condition: number) => {
    const health = getHealthPercent(condition);

    if (health >= 80) {
      return {
        label: "Good",
        bg: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        progress: "bg-emerald-500",
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    }

    if (health >= 50) {
      return {
        label: "Warning",
        bg: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        progress: "bg-amber-500",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }

    return {
      label: "Critical",
      bg: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
      progress: "bg-red-500",
      icon: <Wrench className="w-4 h-4" />,
    };
  };

  const handleViewDetails = (component: MachineComponent) => {
    setSelectedComponent(component);

    setIsViewModalOpen(true);
  };

  // ---------- Add / Edit handlers ----------
  const handleOpenAddModal = () => {
    setFormMode("add");
    setEditingComponent(null);
    reset(emptyComponentForm);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (component: MachineComponent) => {
    setFormMode("edit");
    setEditingComponent(component);

    reset({
      machineId: component.machineId,
      category: component.category,
      description: component.description,
      serialNumber: component.serialNumber,
      supplier: component.supplier,
      installHours: component.installHours,
      currentHours: component.currentHours,
      plannedLife: component.plannedLife,
      replacementCost: component.replacementCost,
      condition: component.condition,
    });

    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingComponent(null);
    reset(emptyComponentForm);
  };

  const onSubmitComponentForm = async (data: ComponentFormOutput) => {
    try {
      setIsSubmitting(true);

      if (formMode === "add") {
        // BACKEND TODO: confirm componentService.createComponent payload shape with API
        const response = await componentService.createComponent(data);

        const created = normalizeComponent(
          response?.data || response?.component || response,
        );

        setComponents((prev) => [...prev, created]);

      } else if (formMode === "edit" && editingComponent) {
        // BACKEND TODO: confirm componentService.updateComponent payload shape with API
        const response = await componentService.updateComponent(
          editingComponent.id,
          data,
        );

        const updated = normalizeComponent(
          response?.data ||
            response?.component ||
            response || {
              ...editingComponent,
              ...data,
            },
        );

        setComponents((prev) =>
          prev.map((item) =>
            item.id === editingComponent.id ? updated : item,
          ),
        );
      }

      handleCloseFormModal();
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#07111f]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <Loader2 className="animate-spin text-blue-600" size={24} />
          <span className="font-bold text-slate-800 dark:text-white">
            Loading Components...
          </span>
        </div>
      </div>
    );
  }

  const machineOptions = [
    { label: "All Machines", value: "" },
    ...machines.map((machine) => ({
      label: machine.name,
      value: machine.machineId,
    })),
  ];

  const machineSelectOptions = machines.map((machine) => ({
    label: machine.name,
    value: machine.machineId,
  }));

  const conditionOptions = [
    { label: "1 - Excellent", value: "1" },
    { label: "2 - Good", value: "2" },
    { label: "3 - Fair", value: "3" },
    { label: "4 - Poor", value: "4" },
    { label: "5 - Critical", value: "5" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Premium Header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
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

            <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Gauge size={14} />
                  Fleet Component Control
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Components Management
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Monitor, manage and track component health, lifecycle status,
                  maintenance history and operational performance across the
                  entire fleet.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  <Plus size={18} />
                  Add Component
                </button>
              </div>
            </div>
          </div>

          {/* Premium Stats Cards */}
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {/* Total Components */}
            <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Total Components
                  </p>

                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    {totalComponents}
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                  <Cpu size={28} />
                </div>
              </div>
            </div>

            {/* Healthy Components */}
            <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-emerald-500/50 dark:hover:bg-[#12243b]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Healthy Components
                  </p>

                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {healthyComponents}
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Activity size={28} />
                </div>
              </div>
            </div>

            {/* Maintenance Needed */}
            <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-red-500/50 dark:hover:bg-[#12243b]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Needs Maintenance
                  </p>

                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-red-500 dark:text-red-400">
                    {maintenanceNeeded}
                  </h2>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <Wrench size={28} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + Components Wrapper */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {selectedMachine
                  ? `${selectedMachine.name} Components`
                  : "All Components"}
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {selectedMachine
                  ? `${selectedMachine.model || "No Model"} • ${
                      selectedMachine.site ||
                      selectedMachine.location ||
                      "No Site"
                    } • ${selectedMachine.machineId}`
                  : "Overview of all components across the entire fleet"}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={2.4}
                />

                <input
                  type="text"
                  placeholder="Search machine, serial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                />
              </div>

              {/* ////////////////////////////////////////////////////////////// */}
              <div className="w-full sm:w-[260px] md:w-[300px]">
                <AppSelect
                  value={selectedMachine?.machineId ?? ""}
                  options={machineOptions}
                  placeholder="All Machines"
                  onChange={(value) => {
                    if (!value) {
                      setSelectedMachine(null);
                      return;
                    }

                    const machine = machines.find((m) => m.machineId === value);
                    setSelectedMachine(machine ?? null);
                  }}
                />
              </div>
            </div>
          </div>
          {filteredComponents.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <Cpu size={28} strokeWidth={2.4} />
              </div>

              <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                No Components Found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Try changing filters or search keyword.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredComponents.map((component) => {
                const style = getHealthStyle(component.condition);

                const machine = machines.find(
                  (m) => m.machineId === component.machineId,
                );

                const health = getHealthPercent(component.condition);

                const remainingHours = Math.max(
                  0,
                  component.plannedLife -
                    Math.max(
                      0,
                      component.currentHours - component.installHours,
                    ),
                );

                return (
                  <div
                    key={component.id}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-300 hover:bg-white hover:shadow-xl dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/40 dark:hover:bg-[#12243b]"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          {component.category}
                        </div>

                        <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                          {component.description || "No Description"}
                        </h3>

                        <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                          Serial: {component.serialNumber || "N/A"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${style.bg}`}
                      >
                        {style.icon}
                        {style.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0b1728]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          Machine
                        </span>

                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {machine?.name || "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          Supplier
                        </span>

                        <span className="truncate pl-4 text-right font-bold text-slate-800 dark:text-slate-200">
                          {component.supplier || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          Current Hours
                        </span>

                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {component.currentHours.toLocaleString()} h
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          Remaining Life
                        </span>

                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {remainingHours.toLocaleString()} h
                        </span>
                      </div>
                    </div>

                    {/* Health */}
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          Health Status
                        </span>

                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {health}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${style.progress}`}
                          style={{
                            width: `${health}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-xs dark:border-slate-700">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Install: {component.installHours.toLocaleString()}h
                      </span>

                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {new Intl.NumberFormat("en-ZA", {
                          style: "currency",
                          currency: "ZAR",
                        }).format(component.replacementCost)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center gap-3">
                      <button
                        onClick={() => handleViewDetails(component)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition duration-300 hover:bg-blue-700 hover:shadow-lg"
                      >
                        <Eye size={18} />
                        View Details
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(component)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition duration-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-[#0b1728] dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]"
                      >
                        <Pencil size={18} />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Modal - now shows ONLY the selected component's own details */}
          {isViewModalOpen && selectedComponent && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
              <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#07111f]">
                 <div className="flex items-center justify-between border-b border-blue-500/30 bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      Component Details
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                      {selectedComponent.category} •{" "}
                      {selectedComponent.description || "No Description"}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-black transition hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-5">
                  {(() => {
                    const machine = machines.find(
                      (m) => m.machineId === selectedComponent.machineId,
                    );

                    const style = getHealthStyle(selectedComponent.condition);

                    const health = getHealthPercent(
                      selectedComponent.condition,
                    );

                    const remainingHours = Math.max(
                      0,
                      selectedComponent.plannedLife -
                        Math.max(
                          0,
                          selectedComponent.currentHours -
                            selectedComponent.installHours,
                        ),
                    );

                    return (
                      <>
                        {/* Machine Info (only which machine this component belongs to) */}
                        <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Machine Name
                            </p>

                            <h3 className="mt-1 text-base font-bold dark:text-white">
                              {machine?.name || "N/A"}
                            </h3>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Model
                            </p>

                            <h3 className="mt-1 text-base font-bold dark:text-white">
                              {machine?.model || "N/A"}
                            </h3>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Machine Serial
                            </p>

                            <h3 className="mt-1 text-base font-bold dark:text-white">
                              {machine?.serialNumber || "N/A"}
                            </h3>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Location
                            </p>

                            <h3 className="mt-1 text-base font-bold dark:text-white">
                              {machine?.location || "N/A"}
                            </h3>
                          </div>
                        </div>

                        {/* Selected Component Detail Card */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between bg-slate-100 px-5 py-3 dark:bg-[#101f33]">
                            <div>
                              <h3 className="text-lg font-bold dark:text-white">
                                {selectedComponent.category}
                              </h3>

                              <p className="text-sm text-slate-500">
                                Serial:{" "}
                                {selectedComponent.serialNumber || "N/A"}
                              </p>
                            </div>

                            <span
                              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${style.bg}`}
                            >
                              {style.icon}
                              {style.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Description
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {selectedComponent.description || "N/A"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Supplier
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {selectedComponent.supplier || "N/A"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Install Hours
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {selectedComponent.installHours.toLocaleString()}{" "}
                                h
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Current Hours
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {selectedComponent.currentHours.toLocaleString()}{" "}
                                h
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Planned Life
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {selectedComponent.plannedLife.toLocaleString()}{" "}
                                h
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Remaining Life
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {remainingHours.toLocaleString()} h
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Replacement Cost
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {new Intl.NumberFormat("en-ZA", {
                                  style: "currency",
                                  currency: "ZAR",
                                }).format(selectedComponent.replacementCost)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Health Status
                              </p>
                              <p className="mt-1 text-sm font-bold dark:text-white">
                                {health}%
                              </p>
                            </div>
                          </div>

                          <div className="px-5 pb-5">
                            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${style.progress}`}
                                style={{ width: `${health}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Add / Edit Component Modal */}
          {isFormModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#07111f]">
              <div className="flex items-center justify-between border-b border-blue-500/30 bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {formMode === "add" ? "Add Component" : "Edit Component"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                      {formMode === "add"
                        ? "Add a new component to a machine"
                        : "Update existing component details"}
                    </p>
                  </div>

                  <button
                    onClick={handleCloseFormModal}
                     className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-black transition hover:bg-gray-300"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmitComponentForm)}
                  className="max-h-[70vh] overflow-y-auto p-6"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Machine */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Machine
                      </label>

                      <AppSelect
                        value={watch("machineId")}
                        options={machineSelectOptions}
                        placeholder="Select Machine"
                        onChange={(value) => {
                          setValue("machineId", value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });

                          trigger("machineId");
                        }}
                      />
                      {errors.machineId && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.machineId.message as string}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tyre, Engine, Filter"
                        {...register("category", {
                          onChange: async () => {
                            await trigger("category");
                          },
                        })}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.category && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.category.message as string}
                        </p>
                      )}
                    </div>

                    {/* Serial Number */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Serial Number
                      </label>
                      <input
                        type="text"
                        {...register("serialNumber")}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.serialNumber && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.serialNumber.message as string}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Description
                      </label>

                      <textarea
                        rows={4}
                        placeholder="Enter component description..."
                        {...register("description", {
                          onChange: async () => {
                            await trigger("description");
                          },
                        })}
                        className={`w-full rounded-lg bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition resize-none dark:bg-[#101f33] dark:text-white ${
                          errors.description
                            ? "border border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                            : "border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700"
                        }`}
                      />

                      <div className="mt-1 flex items-center justify-between">
                        <div className="min-h-[20px]">
                          {errors.description && (
                            <p className="text-xs font-semibold text-red-500">
                              {errors.description.message as string}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Supplier
                      </label>
                      <input
                        type="text"
                        {...register("supplier", {
                          onChange: async () => {
                            await trigger("supplier");
                          },
                        })}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.supplier && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.supplier.message as string}
                        </p>
                      )}
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Condition
                      </label>

                      <AppSelect
                        value={String(watch("condition"))}
                        options={conditionOptions}
                        placeholder="Select Condition"
                        onChange={(value) => {
                          setValue("condition", Number(value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });

                          trigger("condition");
                        }}
                      />

                      {errors.condition && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.condition.message as string}
                        </p>
                      )}
                    </div>

                    {/* Install Hours */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Install Hours
                      </label>
                      <input
                        type="number"
                        {...register("installHours", {
                          onChange: async () => {
                            await trigger("installHours");
                          },
                        })}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.installHours && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.installHours.message as string}
                        </p>
                      )}
                    </div>

                    {/* Current Hours */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Current Hours
                      </label>
                      <input
                        type="number"
                        {...register("currentHours", {
                          onChange: async () => {
                            await trigger("currentHours");
                          },
                        })}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.currentHours && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.currentHours.message as string}
                        </p>
                      )}
                    </div>

                    {/* Planned Life */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Planned Life (hrs)
                      </label>
                      <input
                        type="number"
                        {...register("plannedLife", {
                          onChange: async () => {
                            await trigger("plannedLife");
                          },
                        })}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.plannedLife && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.plannedLife.message as string}
                        </p>
                      )}
                    </div>

                    {/* Replacement Cost */}
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Replacement Cost (R)
                      </label>
                      <input
                        type="number"
                        {...register("replacementCost", {
                          onChange: async () => {
                            await trigger("replacementCost");
                          },
                        })}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                      {errors.replacementCost && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {errors.replacementCost.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseFormModal}
                      className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting && (
                        <Loader2 className="animate-spin" size={16} />
                      )}
                      {formMode === "add" ? "Add Component" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
