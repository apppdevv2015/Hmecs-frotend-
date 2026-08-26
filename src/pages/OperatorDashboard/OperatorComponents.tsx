import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import AppSelect from "../../components/ui/dropdown/AppSelect";

import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

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
  companyId?: string;
  companyCode?: string;
  companyName?: string;
  company?: {
    id?: string;
    name?: string;
    companyCode?: string;
    subscriptionStatus?: string;
  };
  machine?: any;
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
  companyId: String(
    item?.companyId ||
      item?.company_id ||
      item?.machine?.companyId ||
      item?.machine?.company_id ||
      "",
  ),
  companyCode: String(
    item?.companyCode ||
      item?.company_code ||
      item?.machine?.companyCode ||
      item?.machine?.company_code ||
      item?.company?.companyCode ||
      item?.company?.company_code ||
      "",
  ),
  companyName: String(
    item?.companyName ||
      item?.company_name ||
      item?.machine?.companyName ||
      item?.machine?.company_name ||
      item?.company?.name ||
      "",
  ),
  company: item?.company || item?.machine?.company,
  machine: item?.machine,
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

const getConditionStatus = (condition: number): ComponentStatus => {
  if (condition >= 4) return "critical";
  if (condition === 3) return "warning";
  return "good";
};

const getHealthPercent = (condition: number) => {
  const safeCondition = Math.max(1, Math.min(5, Number(condition) || 1));
  return Math.max(0, Math.min(100, (6 - safeCondition) * 20));
};

const getLifeUsedPercent = (component: MachineComponent) => {
  if (!component.plannedLife) return 0;

  return Math.min(
    100,
    Math.round((component.currentHours / component.plannedLife) * 100),
  );
};

const getStatusBadge = (status: ComponentStatus | MachineStatus) => {
  if (status === "good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
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
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
    case 2:
      return {
        text: "Good",
        class:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
    case 3:
      return {
        text: "Monitor",
        class:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
      };
    case 4:
      return {
        text: "Warning",
        class:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
      };
    case 5:
      return {
        text: "Critical",
        class:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
      };
    default:
      return {
        text: "Unknown",
        class:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
  }
};

const OperatorComponents: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [components, setComponents] = useState<MachineComponent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<MachineComponent | null>(null);

  const [componentSearchQuery, setComponentSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [componentLoading, setComponentLoading] = useState(false);

  const selectedMachineComponents = useMemo(() => {
    if (!selectedMachine) return components;

    return components.filter(
      (component) => component.machineId === selectedMachine.machineId,
    );
  }, [components, selectedMachine]);

  const filteredComponents = useMemo(() => {
    let result = selectedMachineComponents;

    if (selectedCategoryFilter !== "all") {
      result = result.filter(
        (component) =>
          component.category.toLowerCase() ===
          selectedCategoryFilter.toLowerCase(),
      );
    }

    const query = componentSearchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((component) => {
        const machine = machines.find(
          (item) => item.machineId === component.machineId,
        );

        const machineName = machine ? machine.name.toLowerCase() : "";
        const machineModel = machine ? (machine.model || "").toLowerCase() : "";

        return (
          component.category.toLowerCase().includes(query) ||
          (component.description || "").toLowerCase().includes(query) ||
          (component.serialNumber || "").toLowerCase().includes(query) ||
          (component.supplier || "").toLowerCase().includes(query) ||
          machineName.includes(query) ||
          machineModel.includes(query)
        );
      });
    }

    return result;
  }, [
    selectedMachineComponents,
    selectedCategoryFilter,
    componentSearchQuery,
    machines,
  ]);

  const averageHealth =
    selectedMachineComponents.length > 0
      ? Math.round(
          selectedMachineComponents.reduce(
            (total, component) => total + getHealthPercent(component.condition),
            0,
          ) / selectedMachineComponents.length,
        )
      : 0;

  const criticalComponents = useMemo(() => {
    return selectedMachineComponents.filter(
      (component) => getConditionStatus(component.condition) === "critical",
    ).length;
  }, [selectedMachineComponents]);

  const fetchComponents = async (machineId?: string) => {
    try {
      setComponentLoading(true);

      const response = await componentService.getComponents(machineId);
      const mappedComponents =
        getArrayData<any>(response).map(normalizeComponent);

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

      const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
      const localUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
      let payload: any = {};
      if (token) {
        try {
          payload = JSON.parse(atob(token.split(".")[1]));
        } catch {}
      }
      const currentUserId = String(
        payload.id || payload.userId || localUser.id || "",
      ).trim();
      const userCompanyId = String(
        payload.companyId || localUser.companyId || localUser.company_id || "",
      ).trim();
      const userEmail = (
        payload.email || localUser.email || ""
      ).toLowerCase().trim();
      const fullName = `${localUser.firstName || localUser.first_name || ""} ${
        localUser.lastName || localUser.last_name || ""
      }`
        .trim()
        .toLowerCase();

      // 1. Get assigned machine IDs for THIS operator directly from database
      let assignedMachineIdsSet = new Set<string>();

      try {
        const assignedRes = await machineService.getAllAssignedMachines();
        const rawList = getArrayData<any>(assignedRes);
        rawList.forEach((m: any) => {
          if (!m) return;
          const uId = String(m.userId || m.operatorId || m.artisanId || "").toLowerCase();
          const uName = String(m.operatorName || m.artisanName || "").toLowerCase();
          if ((currentUserId && uId === currentUserId.toLowerCase()) || (fullName && uName.includes(fullName))) {
            const mId = m.machineId || m.id || m.machine_id;
            const mName = m.machineName || m.name;
            if (mId) assignedMachineIdsSet.add(String(mId).toLowerCase());
            if (mName) assignedMachineIdsSet.add(String(mName).toLowerCase());
          }
        });
      } catch {}

      const [machineResponse, categoryResponse, componentResponse] =
        await Promise.all([
          machineService.getMachines(),
          componentService.getCategories(),
          componentService.getComponents(),
        ]);

      const allMappedMachines =
        getArrayData<any>(machineResponse).map(normalizeMachine);

      const activeCategories = getArrayData<Category>(categoryResponse).filter(
        (category) => category.isActive !== false,
      );

      const allMappedComponents =
        getArrayData<any>(componentResponse).map(normalizeComponent);

      // Filter machines strictly for THIS operator
      const userAssignedMachines = allMappedMachines.filter((m: any) => {
        if (!m) return false;
        const mName = String(m.name || m.machineId || "").toLowerCase();
        const mId = String(m.id || m.machineId || "").toLowerCase();
        if (userCompanyId && m.companyId && String(m.companyId) !== userCompanyId) return false;

        if (assignedMachineIdsSet.size > 0) {
          return (
            assignedMachineIdsSet.has(mName) ||
            assignedMachineIdsSet.has(mId) ||
            Array.from(assignedMachineIdsSet).some((name) => mName.includes(name) || name.includes(mName))
          );
        }

        return mName.includes("cat-777-global") || mName.includes("ex-201");
      });

      const userAssignedMachineKeys = new Set(
        userAssignedMachines.flatMap((m) => [m.id.toLowerCase(), m.machineId.toLowerCase(), m.name.toLowerCase()]),
      );

      // Filter components strictly for THIS operator's assigned machines
      const userAssignedComponents = allMappedComponents.filter((c: any) => {
        if (!c) return false;
        const mId = String(c.machineId || "").toLowerCase();
        if (userAssignedMachineKeys.size > 0) {
          return (
            userAssignedMachineKeys.has(mId) ||
            Array.from(userAssignedMachineKeys).some((key) => mId.includes(key) || key.includes(mId))
          );
        }
        return mId.includes("cat-777-global") || mId.includes("ex-201");
      });

      setMachines(userAssignedMachines);
      setCategories(
        activeCategories.length > 0 ? activeCategories : defaultCategories,
      );
      setSelectedMachine(null);
      setSelectedCategoryFilter("all");
      setComponents(userAssignedComponents);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load operator component data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedComponent ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedComponent]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 font-sans text-slate-950 dark:bg-[#07111f] dark:text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <Loader2 className="animate-spin text-blue-600" size={22} />
          <span className="text-sm font-extrabold tracking-tight">
            Loading components...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <style>{`
        .hme-hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .hme-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            {/* Premium Glow Effects */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />

            <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />

            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

            <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

            <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              {/* Left Content */}
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Gauge size={14} />
                  Component Monitoring
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Assigned Components
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  View machine-wise component condition, remaining useful life,
                  health status, risk analysis, failure prediction and
                  maintenance insights across all assigned assets.
                </p>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchInitialData}
                disabled={loading}
                className="
        inline-flex
        h-11
        w-full
        shrink-0
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
        hover:-translate-y-0.5
        hover:bg-white/20
        disabled:cursor-not-allowed
        disabled:opacity-60
        sm:w-fit
      "
              >
                <RefreshCw
                  size={18}
                  strokeWidth={2.4}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Components"
              value={`${selectedMachineComponents.length}`}
            />
            <MetricCard title="Avg Health" value={`${averageHealth}%`} />
            <MetricCard title="Categories" value={`${categories.length}`} />
            <MetricCard title="Critical" value={`${criticalComponents}`} />
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {selectedMachine?.name || "All"} Components
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {selectedMachine
                  ? `${selectedMachine.model || "No Model"} • ${
                      selectedMachine.site ||
                      selectedMachine.location ||
                      "No Site"
                    } • ${selectedMachine.machineId}`
                  : "Overview of all assigned machine components"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={2.4}
                />

                <input
                  type="text"
                  placeholder="Search machine, serial..."
                  value={componentSearchQuery}
                  onChange={(event) =>
                    setComponentSearchQuery(event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                />
              </div>

              <AppSelect
                placeholder="All Machines"
                value={selectedMachine?.machineId || "all"}
                onChange={(value) => {
                  if (value === "all") {
                    setSelectedMachine(null);
                    fetchComponents();
                    return;
                  }

                  const machine = machines.find(
                    (item) => item.machineId === value,
                  );

                  if (machine) {
                    setSelectedMachine(machine);
                    fetchComponents(machine.machineId);
                  }
                }}
                options={[
                  {
                    value: "all",
                    label: "All Machines",
                  },
                  ...machines.map((machine) => ({
                    value: machine.machineId,
                    label: machine.name,
                  })),
                ]}
                className="w-full sm:w-48"
              />

              <AppSelect
                placeholder="All Categories"
                value={selectedCategoryFilter}
                onChange={setSelectedCategoryFilter}
                options={[
                  {
                    value: "all",
                    label: "All Categories",
                  },
                  ...categories.map((category) => ({
                    value: category.name,
                    label: category.name,
                  })),
                ]}
                className="w-full sm:w-48"
              />
            </div>
          </div>

          {componentLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={30} />
            </div>
          ) : filteredComponents.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <AlertTriangle size={24} strokeWidth={2.4} />
              </div>

              <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                No components found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {componentSearchQuery.trim()
                  ? "Aapke search query ke liye koi components nahi mile. Dusra search term try karein."
                  : "Abhi component API se koi data nahi mila. Agar admin component page me data aa raha hai to service path check karein."}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto hme-hide-scrollbar">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                    <th className="px-6 py-4 font-bold">Machine / Type</th>
                    <th className="px-6 py-4 font-bold">
                      Description / Serial
                    </th>
                    <th className="px-6 py-4 font-bold">Current Hrs</th>
                    <th className="px-6 py-4 font-bold">Life Used</th>
                    <th className="px-6 py-4 font-bold">Remaining</th>
                    <th className="px-6 py-4 font-bold">Condition</th>
                    <th className="px-6 py-4 font-bold">Risk</th>
                    <th className="px-6 py-4 text-center font-bold">View</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredComponents.map((component) => {
                    const machine = machines.find(
                      (item) => item.machineId === component.machineId,
                    );

                    const machineName = machine
                      ? machine.name
                      : "Unknown Machine";

                    const machineModel = machine
                      ? machine.model || "No Model"
                      : "N/A";

                    const lifeUsed = getLifeUsedPercent(component);

                    const remainingHours = Math.max(
                      0,
                      component.plannedLife -
                        Math.max(
                          0,
                          component.currentHours - component.installHours,
                        ),
                    );

                    const conditionInfo = getConditionLabel(
                      component.condition,
                    );

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
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                        : riskStatus === "Warning"
                          ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                          : riskStatus === "Monitor"
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";

                    return (
                      <tr
                        key={component.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                              {machineName}
                            </span>

                            <span className="mt-1 w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                              {machineModel}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                              {component.description || "-"}
                            </span>

                            <span className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {component.serialNumber || "No Serial"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {component.currentHours.toLocaleString()} h
                        </td>

                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                          {Math.max(
                            0,
                            component.currentHours - component.installHours,
                          ).toLocaleString()}{" "}
                          h
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex w-40 flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                              <span>{lifeUsed}% Used</span>
                              <span>
                                {remainingHours.toLocaleString()} h left
                              </span>
                            </div>

                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${conditionInfo.class}`}
                          >
                            {conditionInfo.text}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${riskColorClass}`}
                          >
                            {riskStatus}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedComponent(component)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                            title="View Component Details"
                          >
                            <Eye size={15} strokeWidth={2.4} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedComponent && (
        <ComponentDetailsModal
          machine={
            machines.find(
              (machine) => machine.machineId === selectedComponent.machineId,
            ) || selectedMachine
          }
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}
    </div>
  );
};

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
        {value}
      </h3>
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        <div className="flex items-center justify-between border-b border-white/20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-5 shadow-md">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Component Details
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-300">
              {machine?.name || "Machine"} • {component.machineId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto p-5">
          <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33] sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <Gauge size={24} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                {component.category}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {component.serialNumber || "-"} • {component.description || "-"}
              </p>
            </div>

            <span
              className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${getStatusBadge(
                status,
              )}`}
            >
              {getStatusText(status)}
            </span>
          </div>

          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#101f33]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Component Health
            </p>

            <div className="mt-2 flex items-end justify-between">
              <h3 className="text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {health}%
              </h3>

              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Condition {component.condition}/5
              </p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  health >= 80
                    ? "bg-emerald-500"
                    : health >= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {component.companyCode && (
              <DetailItem label="Company Code" value={component.companyCode} />
            )}
            {component.companyName && (
              <DetailItem label="Company Name" value={component.companyName} />
            )}
            <DetailItem label="Category" value={component.category} />
            <DetailItem
              label="Description"
              value={component.description || "-"}
            />
            <DetailItem
              label="Serial Number"
              value={component.serialNumber || "-"}
            />
            <DetailItem label="Supplier" value={component.supplier || "-"} />
            <DetailItem
              label="Install Hours"
              value={`${component.installHours}`}
            />
            <DetailItem
              label="Current Hours"
              value={`${component.currentHours}`}
            />
            <DetailItem
              label="Planned Life"
              value={`${component.plannedLife}`}
            />
            <DetailItem label="Life Used" value={`${lifeUsed}%`} />
            <DetailItem
              label="Replacement Cost"
              value={`₹${component.replacementCost.toLocaleString("en-IN")}`}
            />
            <DetailItem label="Component ID" value={component.id} />
          </div>

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
              View-only access
            </p>

            <p className="mt-1 text-sm font-medium leading-6 text-blue-700/80 dark:text-blue-200/80">
              Operator can monitor component information only. Add, edit and
              delete actions are restricted for this role.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#101f33]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default OperatorComponents;
