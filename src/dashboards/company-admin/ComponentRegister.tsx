import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  Eye,
  Gauge,
  Loader2,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";

type MachineStatus = "good" | "warning" | "critical";
type ComponentStatus = "good" | "warning" | "critical";

type Category = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

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

type ComponentForm = {
  category: string;
  customCategory: string;
  description: string;
  serialNumber: string;
  supplier: string;
  installHours: string;
  currentHours: string;
  plannedLife: string;
  replacementCost: string;
  condition: string;
  machineId: string;
};

const emptyForm: ComponentForm = {
  category: "",
  customCategory: "",
  description: "",
  serialNumber: "",
  supplier: "",
  installHours: "",
  currentHours: "",
  plannedLife: "",
  replacementCost: "",
  condition: "3",
  machineId: "",
};

const defaultCategories: Category[] = [
  { id: "1", name: "Engine" },
  { id: "2", name: "Transmission" },
  { id: "3", name: "Tyres" },
  { id: "4", name: "Hydraulics" },
  { id: "5", name: "Electrical" },
  { id: "6", name: "Brakes" },
  { id: "7", name: "Chassis" },
  { id: "8", name: "Cooling System" },
];

const getArrayData = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.components)) return response.components;
  return [];
};

const normalizeMachine = (item: any): Machine => ({
  id: String(item.id || item.machine_id || item.machineId || ""),
  name: String(item.name || item.machineName || item.model || "Unnamed Machine"),
  machineId: String(item.machineId || item.machine_id || item.id || ""),
  serialNumber: item.serialNumber || item.serial_number || "",
  model: item.model || item.equipmentType || item.equipment_type || "",
  site: item.site || item.location || "",
  location: item.location || item.site || "",
  status: item.status || "active",
});

const normalizeComponent = (item: any): MachineComponent => ({
  id: String(item.id || item.componentId || item.component_id || ""),
  machineId: String(item.machineId || item.machine_id || item.machine?.id || ""),
  category: String(item.category || item.categoryName || item.type || ""),
  description: String(item.description || ""),
  serialNumber: String(item.serialNumber || item.serial_number || ""),
  supplier: String(item.supplier || ""),
  installHours: Number(item.installHours ?? item.install_hours ?? 0),
  currentHours: Number(item.currentHours ?? item.current_hours ?? 0),
  plannedLife: Number(item.plannedLife ?? item.planned_life ?? 0),
  replacementCost: Number(item.replacementCost ?? item.replacement_cost ?? 0),
  condition: Number(item.condition ?? 3),
  createdAt: item.createdAt || item.created_at,
  updatedAt: item.updatedAt || item.updated_at,
  intelligence: item.intelligence,
});

const getConditionStatus = (condition: number): ComponentStatus => {
  if (condition >= 4) return "good";
  if (condition === 3) return "warning";
  return "critical";
};

const getHealthPercent = (condition: number) => {
  const safeCondition = Math.max(1, Math.min(5, Number(condition) || 1));
  return (6 - safeCondition) * 20;
};

const getLifeUsedPercent = (component: MachineComponent) => {
  if (!component.plannedLife) return 0;

  return Math.min(100, Math.round((component.currentHours / component.plannedLife) * 100));
};

const getStatusBadge = (status: ComponentStatus | MachineStatus) => {
  if (status === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "warning") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300";
  }

  return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
};

const getStatusText = (status: ComponentStatus | MachineStatus) => {
  if (status === "good") return "Good";
  if (status === "warning") return "Warning";
  return "Critical";
};

const getConditionLabel = (condition: number) => {
  switch (condition) {
    case 1:
      return {
        text: "New",
        class:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
    case 2:
      return {
        text: "Good",
        class:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
    case 3:
      return {
        text: "Monitor",
        class:
          "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300",
      };
    case 4:
      return {
        text: "Warning",
        class:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
      };
    case 5:
      return {
        text: "Critical",
        class:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
      };
    default:
      return {
        text: "Unknown",
        class:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/10 dark:text-slate-300",
      };
  }
};

const getMachineStatus = (components: MachineComponent[]): MachineStatus => {
  if (components.some((component) => getConditionStatus(component.condition) === "critical")) {
    return "critical";
  }

  if (components.some((component) => getConditionStatus(component.condition) === "warning")) {
    return "warning";
  }

  return "good";
};

const ComponentManagement: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [components, setComponents] = useState<MachineComponent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<MachineComponent | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [componentSearchQuery, setComponentSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [componentLoading, setComponentLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<MachineComponent | null>(null);
  const [form, setForm] = useState<ComponentForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MachineComponent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredMachines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return machines;

    return machines.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.machineId.toLowerCase().includes(query) ||
        (machine.model || "").toLowerCase().includes(query) ||
        (machine.site || "").toLowerCase().includes(query) ||
        (machine.location || "").toLowerCase().includes(query)
      );
    });
  }, [machines, searchQuery]);

  const selectedMachineComponents = useMemo(() => {
    if (!selectedMachine) return components;

    return components.filter((component) => component.machineId === selectedMachine.machineId);
  }, [components, selectedMachine]);

  const uniqueCategories = useMemo(() => {
    const cats = components.map((c) => c.category);
    return Array.from(new Set(cats)).filter(Boolean);
  }, [components]);

  const filteredComponents = useMemo(() => {
    let result = selectedMachineComponents;

    // Filter by Category
    if (selectedCategoryFilter !== "all") {
      result = result.filter(
        (comp) => comp.category.toLowerCase() === selectedCategoryFilter.toLowerCase(),
      );
    }

    // Filter by Search Query
    const query = componentSearchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((comp) => {
        const machine = machines.find((m) => m.machineId === comp.machineId);
        const machineName = machine ? machine.name.toLowerCase() : "";
        const machineModel = machine ? (machine.model || "").toLowerCase() : "";

        return (
          comp.category.toLowerCase().includes(query) ||
          (comp.description || "").toLowerCase().includes(query) ||
          (comp.serialNumber || "").toLowerCase().includes(query) ||
          (comp.supplier || "").toLowerCase().includes(query) ||
          machineName.includes(query) ||
          machineModel.includes(query)
        );
      });
    }

    return result;
  }, [selectedMachineComponents, selectedCategoryFilter, componentSearchQuery, machines]);

  const averageHealth =
    selectedMachineComponents.length > 0
      ? Math.round(
          selectedMachineComponents.reduce(
            (total, component) => total + getHealthPercent(component.condition),
            0,
          ) / selectedMachineComponents.length,
        )
      : 0;

  const machineStatus = getMachineStatus(selectedMachineComponents);

  const fetchComponents = async (machineId?: string) => {
    try {
      setComponentLoading(true);

      const response = await componentService.getComponents(machineId);
      const mappedComponents = getArrayData<any>(response).map(normalizeComponent);

      setComponents((previous) => {
        if (!machineId) return mappedComponents;

        const otherMachineComponents = previous.filter(
          (component) => component.machineId !== machineId,
        );

        return [...otherMachineComponents, ...mappedComponents];
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load components");
    } finally {
      setComponentLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [machineResponse, categoryResponse] = await Promise.all([
        machineService.getMachines(),
        componentService.getCategories(),
      ]);

      const mappedMachines = getArrayData<any>(machineResponse).map(normalizeMachine);

      const activeCategories = getArrayData<Category>(categoryResponse).filter(
        (category) => category.isActive !== false,
      );

      setMachines(mappedMachines);

      if (activeCategories.length > 0) {
        setCategories(activeCategories);
      } else {
        setCategories(defaultCategories);
      }

      setSelectedMachine(null);
      await fetchComponents();
    } catch (error: any) {
      toast.error(error?.message || "Failed to load component page data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedComponent || isFormOpen || deleteTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedComponent, isFormOpen, deleteTarget]);

  const handleMachineSelect = async (machine: Machine) => {
    setSelectedMachine(machine);
    await fetchComponents(machine.machineId);
    toast.success(`${machine.name} components loaded`);
  };

  const openAddModal = () => {
    if (machines.length === 0) {
      toast.error("No machines found! Please add a machine first under the 'Machines' page.", {
        duration: 5000,
        position: "top-center",
      });
      return;
    }

    setEditingComponent(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || "",
      machineId: selectedMachine?.machineId || machines[0]?.machineId || "",
    });
    setIsFormOpen(true);
  };

  const openEditModal = (component: MachineComponent) => {
    const categoryExists = categories.some((cat) => cat.name === component.category);

    setEditingComponent(component);
    setForm({
      category: categoryExists ? component.category : "Custom",
      customCategory: categoryExists ? "" : component.category,
      description: component.description,
      serialNumber: component.serialNumber,
      supplier: component.supplier,
      installHours: String(component.installHours),
      currentHours: String(component.currentHours),
      plannedLife: String(component.plannedLife),
      replacementCost: String(component.replacementCost),
      condition: String(component.condition),
      machineId: component.machineId || selectedMachine?.machineId || "",
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingComponent(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.machineId.trim()) return "Please select a machine";
    if (!form.category.trim()) return "Please select component category";
    if (form.category === "Custom" && !form.customCategory.trim()) {
      return "Please enter custom category name";
    }
    if (!form.description.trim()) return "Description is required";
    if (!form.serialNumber.trim()) return "Serial number is required";
    if (!form.supplier.trim()) return "Supplier is required";

    const numberFields = [
      ["Install hours", form.installHours],
      ["Current hours", form.currentHours],
      ["Planned life", form.plannedLife],
      ["Replacement cost", form.replacementCost],
      ["Condition", form.condition],
    ];

    for (const [label, value] of numberFields) {
      if (value === "" || Number.isNaN(Number(value))) {
        return `${label} must be a valid number`;
      }
    }

    const condition = Number(form.condition);

    if (condition < 1 || condition > 5) {
      return "Condition must be between 1 and 5";
    }

    return "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const finalCategory = form.category === "Custom" ? form.customCategory.trim() : form.category;

    const payload = {
      category: finalCategory,
      description: form.description.trim(),
      serialNumber: form.serialNumber.trim(),
      supplier: form.supplier.trim(),
      installHours: Number(form.installHours),
      currentHours: Number(form.currentHours),
      plannedLife: Number(form.plannedLife),
      replacementCost: Number(form.replacementCost),
      condition: Number(form.condition),
    };

    try {
      setSubmitting(true);
      const targetMachine = machines.find((m) => m.machineId === form.machineId);

      if (editingComponent) {
        await componentService.updateComponent(editingComponent.id, payload);
        toast.success("Component updated successfully");
      } else {
        await componentService.createComponent({
          machineId: form.machineId,
          ...payload,
        });

        toast.success("Component added successfully");
      }

      closeFormModal();

      if (selectedMachine) {
        await fetchComponents(selectedMachine.machineId);
        if (targetMachine && targetMachine.machineId !== selectedMachine.machineId) {
          await fetchComponents(targetMachine.machineId);
        }
      } else {
        await fetchComponents();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to save component");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await componentService.deleteComponent(deleteTarget.id);

      toast.success("Component deleted successfully");
      setDeleteTarget(null);
      await fetchComponents(selectedMachine?.machineId);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete component");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] text-slate-950 dark:bg-[#050b18] dark:text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="animate-spin text-blue-600" size={22} />
          <span className="text-sm font-black">Loading components...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-3 py-4 text-slate-950 dark:bg-[#050b18] dark:text-white sm:px-4 lg:px-5">
      <style>{`
        .hme-hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .hme-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
            Component Management
          </h1>

          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Machine-wise component add, edit, delete and monitoring from API.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            onClick={openAddModal}
            className="inline-flex h-11 w-full sm:w-fit items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 shrink-0"
          >
            <Plus size={18} />
            Add Component
          </button>
        </div>
      </div>

      <div className="w-full">
        <main className="min-w-0 space-y-4">
          <section className="grid gap-3 md:grid-cols-3">
            <MetricCard title="Total Components" value={`${selectedMachineComponents.length}`} />
            <MetricCard title="Avg Health" value={`${averageHealth}%`} />
            <MetricCard title="Categories" value={`${categories.length}`} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-blue-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  {selectedMachine?.name || "All"} Components
                </h2>

                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {selectedMachine
                    ? `${selectedMachine.model || "No Model"} • ${selectedMachine.site || selectedMachine.location || "No Site"} • ${selectedMachine.machineId}`
                    : "Overview of all components across the entire fleet"}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                {/* Search */}
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search machine, serial..."
                    value={componentSearchQuery}
                    onChange={(e) => setComponentSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-blue-100/50 bg-[#f8fafc] pl-11 pr-4 text-xs font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
                  />
                </div>

                {/* Filter by Machine */}
                <select
                  value={selectedMachine?.machineId || "all"}
                  onChange={(e) => {
                    if (e.target.value === "all") {
                      setSelectedMachine(null);
                      fetchComponents();
                    } else {
                      const mach = machines.find((m) => m.machineId === e.target.value);
                      if (mach) {
                        setSelectedMachine(mach);
                        fetchComponents(mach.machineId);
                      }
                    }
                  }}
                  className="h-10 w-full sm:w-44 rounded-2xl border border-blue-100/50 bg-[#f8fafc] px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  <option value="all">All Machines</option>
                  {machines.map((mach) => (
                    <option key={mach.id} value={mach.machineId}>
                      {mach.name}
                    </option>
                  ))}
                </select>

                {/* Filter by Category */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-10 w-full sm:w-44 rounded-2xl border border-blue-100/50 bg-[#f8fafc] px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {componentLoading ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={26} />
              </div>
            ) : filteredComponents.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <Gauge size={24} />
                </div>

                <h3 className="text-base font-black text-slate-950 dark:text-white">
                  No components found
                </h3>

                <p className="mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                  {componentSearchQuery.trim()
                    ? "Aapke search query ke liye koi components nahi mile. Dusra search term try karein."
                    : "Is machine ke liye abhi koi component API se nahi mila. Add Component button se naya component create karo."}
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto hme-hide-scrollbar">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-blue-50 bg-[#f8fbff] text-xs font-black uppercase tracking-wider text-slate-400 dark:border-slate-800/50 dark:bg-slate-950/60">
                      <th className="px-6 py-4">Machine / Type</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description / Serial</th>
                      <th className="px-6 py-4">Current Hrs</th>
                      <th className="px-6 py-4">Life Used</th>
                      <th className="px-6 py-4">Remaining</th>
                      <th className="px-6 py-4">Condition</th>
                      <th className="px-6 py-4">Risk</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50/50 dark:divide-slate-800/50">
                    {filteredComponents.map((component) => {
                      const machine = machines.find((m) => m.machineId === component.machineId);
                      const machineName = machine ? machine.name : "Unknown Machine";
                      const machineModel = machine ? machine.model || "No Model" : "N/A";

                      const lifeUsed = getLifeUsedPercent(component);
                      const remainingHours = Math.max(
                        0,
                        component.plannedLife -
                          Math.max(0, component.currentHours - component.installHours),
                      );

                      const conditionInfo = getConditionLabel(component.condition);

                      const riskStatus =
                        component.intelligence?.riskStatus ||
                        (component.condition >= 5 || lifeUsed >= 95
                          ? "Critical"
                          : component.condition >= 4 || lifeUsed >= 85
                            ? "Warning"
                            : component.condition >= 3 || lifeUsed >= 70
                              ? "Monitor"
                              : "Healthy");

                      const riskColorClass =
                        riskStatus === "Critical"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                          : riskStatus === "Warning"
                            ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
                            : riskStatus === "Monitor"
                              ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

                      return (
                        <tr
                          key={component.id}
                          className="transition hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-950 dark:text-white">
                                {machineName}
                              </span>
                              <span className="mt-1 w-fit rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                                {machineModel}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-800 dark:text-slate-200">
                            {component.category}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-950 dark:text-white">
                                {component.description || "-"}
                              </span>
                              <span className="mt-0.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                                {component.serialNumber || "No Serial"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-800 dark:text-slate-200">
                            {component.currentHours.toLocaleString()} h
                          </td>
                          <td className="px-6 py-4 text-sm font-black text-slate-800 dark:text-slate-200">
                            {Math.max(
                              0,
                              component.currentHours - component.installHours,
                            ).toLocaleString()}{" "}
                            h
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5 w-40">
                              <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                                <span>{lifeUsed}% Used</span>
                                <span>{remainingHours.toLocaleString()} h left</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-blue-50 dark:bg-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    lifeUsed >= 90
                                      ? "bg-red-500"
                                      : lifeUsed >= 75
                                        ? "bg-orange-500"
                                        : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${lifeUsed}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${conditionInfo.class}`}
                            >
                              {conditionInfo.text}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${riskColorClass}`}
                            >
                              {riskStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedComponent(component)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="View Component Details"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => openEditModal(component)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition hover:bg-orange-100 dark:bg-slate-800 dark:text-orange-300 dark:hover:bg-slate-700"
                                title="Edit Component"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(component)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-slate-700"
                                title="Delete Component"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {selectedComponent && (
        <ComponentDetailsModal
          machine={selectedMachine}
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      {isFormOpen && (
        <ComponentFormModal
          title={editingComponent ? "Edit Component" : "Add Component"}
          form={form}
          categories={categories}
          machines={machines}
          submitting={submitting}
          onChange={(key, value) => setForm((previous) => ({ ...previous, [key]: value }))}
          onSubmit={handleSubmit}
          onClose={closeFormModal}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          component={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>

      <h3 className="mt-2 truncate text-2xl font-black text-slate-950 dark:text-white">{value}</h3>
    </div>
  );
}

function ComponentCard({
  component,
  onView,
  onEdit,
  onDelete,
  machines,
}: {
  component: MachineComponent;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  machines: Machine[];
}) {
  const status = getConditionStatus(component.condition);
  const health = getHealthPercent(component.condition);
  const lifeUsed = getLifeUsedPercent(component);

  const machine = machines.find((m) => m.machineId === component.machineId);
  const machineName = machine ? machine.name : "Unknown Machine";

  return (
    <div className="flex min-h-[360px] flex-col rounded-2xl border border-blue-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <Gauge size={17} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
              {component.category}
            </h3>

            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {component.serialNumber || "No Serial"}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusBadge(
            status,
          )}`}
        >
          {getStatusText(status)}
        </span>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Condition Health
            </p>

            <h4 className="text-3xl font-black text-slate-950 dark:text-white">{health}%</h4>
          </div>

          <p className="text-xs font-black text-slate-500 dark:text-slate-400">
            {component.condition}/5
          </p>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${
              health >= 80 ? "bg-blue-500" : health >= 60 ? "bg-orange-400" : "bg-red-400"
            }`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <InfoLine label="Machine" value={machineName} />
        <InfoLine label="Description" value={component.description || "-"} />
        <InfoLine label="Supplier" value={component.supplier || "-"} />
        <InfoLine label="Install Hours" value={`${component.installHours}`} />
        <InfoLine label="Current Hours" value={`${component.currentHours}`} />
        <InfoLine label="Planned Life" value={`${component.plannedLife}`} />
        <InfoLine label="Life Used" value={`${lifeUsed}%`} />
        <InfoLine
          label="Replacement Cost"
          value={`₹${component.replacementCost.toLocaleString("en-IN")}`}
        />
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 pt-3">
        <button
          onClick={onView}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-blue-600 text-xs font-black text-white transition hover:bg-blue-700"
        >
          <Eye size={14} />
          View
        </button>

        <button
          onClick={onEdit}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-orange-500 text-xs font-black text-white transition hover:bg-orange-600"
        >
          <Edit size={14} />
          Edit
        </button>

        <button
          onClick={onDelete}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-red-500 text-xs font-black text-white transition hover:bg-red-600"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

function ComponentDetailsModal({
  machine,
  component,
  onClose,
}: {
  machine: Machine | null;
  component: MachineComponent;
  onClose: () => void;
}) {
  const status = getConditionStatus(component.condition);
  const health = getHealthPercent(component.condition);
  const lifeUsed = getLifeUsedPercent(component);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Component Details</h2>

            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {machine?.name || "Machine"} • {component.machineId}
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="mb-5 flex items-center gap-4 rounded-3xl border border-blue-100 bg-[#f8fbff] p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Gauge size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">
                {component.category}
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                {component.serialNumber || "-"} • {component.description || "-"}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide ${getStatusBadge(
                status,
              )}`}
            >
              {getStatusText(status)}
            </span>
          </div>

          <div className="mb-5 rounded-3xl border border-blue-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Component Health
            </p>

            <div className="mt-2 flex items-end justify-between">
              <h3 className="text-5xl font-black text-slate-950 dark:text-white">{health}%</h3>

              <p className="text-sm font-black text-slate-500 dark:text-slate-400">
                Condition {component.condition}/5
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  health >= 80 ? "bg-blue-500" : health >= 60 ? "bg-orange-400" : "bg-red-400"
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Category" value={component.category} />
            <DetailItem label="Description" value={component.description || "-"} />
            <DetailItem label="Serial Number" value={component.serialNumber || "-"} />
            <DetailItem label="Supplier" value={component.supplier || "-"} />
            <DetailItem label="Install Hours" value={`${component.installHours}`} />
            <DetailItem label="Current Hours" value={`${component.currentHours}`} />
            <DetailItem label="Planned Life" value={`${component.plannedLife}`} />
            <DetailItem label="Life Used" value={`${lifeUsed}%`} />
            <DetailItem
              label="Replacement Cost"
              value={`₹${component.replacementCost.toLocaleString("en-IN")}`}
            />
            <DetailItem label="Component ID" value={component.id} />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentFormModal({
  title,
  form,
  categories,
  machines,
  submitting,
  onChange,
  onSubmit,
  onClose,
}: {
  title: string;
  form: ComponentForm;
  categories: Category[];
  machines: Machine[];
  submitting: boolean;
  onChange: (key: keyof ComponentForm, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>

            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Category API dropdown and component API form
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Machine
            </span>

            <select
              value={form.machineId}
              onChange={(event) => onChange("machineId", event.target.value)}
              className="h-11 w-full rounded-2xl border border-blue-100 bg-[#f8fafc] px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500 cursor-pointer"
            >
              <option value="" disabled>
                Select Machine
              </option>
              {machines.map((mach) => (
                <option key={mach.id} value={mach.machineId}>
                  {mach.name} ({mach.model || "No Model"})
                </option>
              ))}
            </select>
          </label>

          <FormSelect
            label="Category"
            value={form.category}
            onChange={(value) => onChange("category", value)}
            options={[...categories.map((category) => category.name), "Custom"]}
          />

          {form.category === "Custom" && (
            <div className="sm:col-span-2">
              <FormInput
                label="Custom Category Name"
                value={form.customCategory || ""}
                onChange={(value) => onChange("customCategory", value)}
                placeholder="Enter custom category name (e.g. Gearbox)"
              />
            </div>
          )}

          <FormInput
            label="Serial Number"
            value={form.serialNumber}
            onChange={(value) => onChange("serialNumber", value)}
            placeholder="TY-990-001"
          />

          <div className="sm:col-span-2">
            <FormInput
              label="Description"
              value={form.description}
              onChange={(value) => onChange("description", value)}
              placeholder="Front Left Tyre"
            />
          </div>

          <FormInput
            label="Supplier"
            value={form.supplier}
            onChange={(value) => onChange("supplier", value)}
            placeholder="CK & IJ Group"
          />

          <FormInput
            label="Install Hours"
            type="number"
            value={form.installHours}
            onChange={(value) => onChange("installHours", value)}
            placeholder="800"
          />

          <FormInput
            label="Current Hours"
            type="number"
            value={form.currentHours}
            onChange={(value) => onChange("currentHours", value)}
            placeholder="4900"
          />

          <FormInput
            label="Planned Life"
            type="number"
            value={form.plannedLife}
            onChange={(value) => onChange("plannedLife", value)}
            placeholder="8000"
          />

          <FormInput
            label="Replacement Cost"
            type="number"
            value={form.replacementCost}
            onChange={(value) => onChange("replacementCost", value)}
            placeholder="14200"
          />

          <FormSelect
            label="Condition"
            value={form.condition}
            onChange={(value) => onChange("condition", value)}
            options={["1", "2", "3", "4", "5"]}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-blue-100 px-6 py-5 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 className="animate-spin" size={16} />}
            Save Component
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteModal({
  component,
  deleting,
  onCancel,
  onConfirm,
}: {
  component: MachineComponent;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
          <Trash2 size={24} />
        </div>

        <h2 className="text-xl font-black text-slate-950 dark:text-white">Delete Component?</h2>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          Are you sure you want to delete{" "}
          <span className="font-black text-slate-900 dark:text-white">{component.category}</span>{" "}
          component? This action cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-2xl border border-blue-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deleting && <Loader2 className="animate-spin" size={16} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-blue-100 bg-[#f8fafc] px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-blue-100 bg-[#f8fafc] px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {label === "Condition" ? `${option} / 5` : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-blue-100 py-1 last:border-b-0 dark:border-slate-800">
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</span>

      <span className="truncate text-right text-xs font-black text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>

      <p className="mt-1 break-words text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

export default ComponentManagement;
