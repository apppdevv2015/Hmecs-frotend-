import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Activity,
  Edit,
  Eye,
  Gauge,
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";

import AppSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination";


import StorageService from "../../services/storage.service";
import { isReadOnlyRole } from "../../components/common/permissions";

import { componentSchema } from "../../validations/companyAdminValidation";


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
  imageUrl?: string;
  parentComponentId?: string;
  parentComponent?: any;
  subComponents?: any[];
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
  name: string;
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
  parentComponentId: string;
  imageUrl?: string;
};

type FormErrors = Partial<Record<keyof ComponentForm, string>>;

const emptyForm: ComponentForm = {
  name: "",
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
  parentComponentId: "",
  imageUrl: "",
};


const LOCKED_ON_EDIT_FIELDS: (keyof ComponentForm)[] = [
  "machineId",
  "category",
  "customCategory",
  "serialNumber",
  "supplier",
  "installHours",
  "plannedLife",
  "replacementCost",
];


const componentSchema = z
  .object({
    machineId: z.string().trim().min(1, "Machine is required"),

    category: z.string().trim().optional(),

    customCategory: z
      .string()
      .trim()
      .max(50, "Custom category cannot exceed 50 characters"),

    name: z
      .string()
      .trim()
      .min(1, "Component name is required")
      .max(100, "Component name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters"),

    serialNumber: z
      .string()
      .trim()
      .min(1, "Serial number is required")
      .max(50, "Serial number cannot exceed 50 characters"),

    supplier: z
      .string()
      .trim()
      .min(1, "Supplier is required")
      .max(100, "Supplier cannot exceed 100 characters"),

    installHours: z
      .string()
      .trim()
      .min(1, "Install hours is required")
      .regex(/^\d+$/, "Install hours must contain only numbers"),

    currentHours: z
      .string()
      .trim()
      .min(1, "Current hours is required")
      .regex(/^\d+$/, "Current hours must contain only numbers"),

    plannedLife: z
      .string()
      .trim()
      .min(1, "Planned life is required")
      .regex(/^\d+$/, "Planned life must contain only numbers"),

    replacementCost: z.string().optional(),

    condition: z.string().trim().min(1, "Condition is required"),
  })
  .superRefine((data, ctx) => {
    if (data.category === "Custom" && data.customCategory.trim().length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCategory"],
        message: "Custom category is required",
      });
    }

    const install = Number(data.installHours);
    const current = Number(data.currentHours);
    const planned = Number(data.plannedLife);
    const replacement = Number(data.replacementCost);
    const condition = Number(data.condition);

    if (current < install) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentHours"],
        message: "Current hours cannot be less than install hours",
      });
    }

    if (planned <= install) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["plannedLife"],
        message: "Planned life must be greater than install hours",
      });
    }

    if (condition < 1 || condition > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["condition"],
        message: "Condition must be between 1 and 5",
      });
    }
  });


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

const cleanMachineName = (rawName: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name;
};

const normalizeMachine = (item: any): Machine => {
  const rawName = String(
    item?.name ||
      item?.machineName ||
      item?.machine_name ||
      item?.model ||
      "Unnamed Machine",
  );
  const rawModel = String(item?.model || item?.equipmentType || item?.equipment_type || "");

  return {
    id: String(item?.id || item?.machine_id || item?.machineId || ""),
    name: cleanMachineName(rawName),
    machineId: String(item?.machineId || item?.machine_id || item?.id || ""),
    serialNumber: item?.serialNumber || item?.serial_number || "",
    model: cleanMachineName(rawModel),
    site: item?.site || item?.location || "",
    location: item?.location || item?.site || "",
    status: item?.status || "active",
  };
};

const deriveComponentName = (item: any): string => {
  const directName = item?.name || item?.componentName || item?.component_name;
  if (directName && directName !== "General") {
    return String(directName);
  }

  const desc = String(item?.description || "").trim();
  if (desc) {
    const cleaned = desc.replace(/^Spec Notes:\s*/i, "").trim();
    const parts = cleaned.split(" - ");
    if (parts[0]) return parts[0].trim();
  }

  if (directName) return String(directName);

  return "Component";
};

const normalizeComponent = (item: any): MachineComponent => {
  const currentHrs = Number(
    item?.currentHours ??
      item?.current_hours ??
      item?.usedHours ??
      item?.hoursRun ??
      item?.subMetrics?.usedHours ??
      0,
  );
  const planned = Number(
    item?.plannedLife ??
      item?.planned_life ??
      item?.expectedLife ??
      (currentHrs > 0 ? 18000 : 0),
  );

  return {
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
    name: deriveComponentName(item),
    description: String(item?.description || ""),
    serialNumber: String(
      item?.serialNumber || item?.serial_number || "",
    ).replace(/^DEMO-/i, ""),
    supplier: String(item?.supplier || ""),
    installHours: Number(item?.installHours ?? item?.install_hours ?? 0),
    currentHours: currentHrs,
    plannedLife: planned,
    replacementCost: Number(
      item?.replacementCost ?? item?.replacement_cost ?? 0,
    ),
    condition: Number(item?.condition ?? 3),
    parentComponentId:
      item?.parentComponentId || item?.parent_component_id || "",
    parentComponent: item?.parentComponent,
    subComponents: item?.subComponents || [],
    imageUrl: item?.imageUrl || item?.image || item?.photo || "",
    createdAt: item?.createdAt || item?.created_at,
    updatedAt: item?.updatedAt || item?.updated_at,
    intelligence: item?.intelligence,
  };
};

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
  const planned = component.plannedLife || 18000;
  if (!planned || !component.currentHours) return 0;

  return Math.min(100, Math.round((component.currentHours / planned) * 100));
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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

const getConditionLabel = (condition: any) => {
  const num = Number(condition);
  switch (num) {
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
        text: "New",
        class:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
  }
};

const ComponentManagement: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const readOnly = isReadOnlyRole(StorageService.getRole());
  const [components, setComponents] = useState<MachineComponent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedComponent, setSelectedComponent] =
    useState<MachineComponent | null>(null);

  const [componentSearchQuery, setComponentSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedComponentFilter, setSelectedComponentFilter] = useState("all");
  const [showHealthView, setShowHealthView] = useState(false);

  const [loading, setLoading] = useState(true);
  const [componentLoading, setComponentLoading] = useState(false);
  const [inspectionMap, setInspectionMap] = useState<Record<string, { healthScore: number; status: string; updatedAt?: string; hasData: boolean }>>({});

  const fetchMachineComponentsAndSpecs = async (machList: Machine[]) => {
    try {
      const results = await Promise.all(
        machList.map(async (m) => {
          try {
            const targetId = m.id || m.machineId;
            const res: any = await machineService.getManualInspectionData(targetId);
            const data = res?.data || res || {};
            
            let records: any[] = [];
            if (Array.isArray(data.records)) records = data.records;
            else if (Array.isArray(data)) records = data;

            let specs: any[] = [];
            if (Array.isArray(data.specComponents)) specs = data.specComponents;
            else if (Array.isArray(data.spec?.components)) specs = data.spec.components;

            return { machine: m, records, specs };
          } catch (e) {
            return { machine: m, records: [], specs: [] };
          }
        })
      );

      const generatedComponents: MachineComponent[] = [];
      const map: Record<string, { healthScore: number; status: string; updatedAt?: string; hasData: boolean }> = {};

      results.forEach(({ machine, records, specs }) => {
        // Build inspection map
        records.forEach((r: any) => {
          const keyByName = String(r.componentName || "").toLowerCase().trim();
          const keyById = String(r.componentId || r.id || "").toLowerCase().trim();
          const keyBySn = String(r.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();
          const score = Number(r.healthScore ?? r.health_score ?? r.score ?? 100);
          const status = r.status || (score < 50 ? "Critical" : score < 85 ? "Warning" : "Healthy");
          const item = { healthScore: score, status, updatedAt: r.updatedAt || r.createdAt, hasData: true };

          if (keyById) map[keyById] = item;
          if (keyBySn) map[keyBySn] = item;
          if (keyByName) map[keyByName] = item;
        });

        // If specs exist for this machine, generate structured components
        if (specs.length > 0) {
          specs.forEach((sp: any, idx: number) => {
            const compName = sp.name || `Component ${idx + 1}`;
            const compCat = sp.category || compName.split(" ")[0] || "General";
            const key = compName.toLowerCase().trim();
            const inspectData = map[key] || { healthScore: 100, status: "Healthy", hasData: false };

            const cond = inspectData.healthScore >= 90 ? 1 : inspectData.healthScore >= 75 ? 2 : inspectData.healthScore >= 50 ? 3 : inspectData.healthScore >= 30 ? 4 : 5;
            const paramCount = Array.isArray(sp.parameters) ? sp.parameters.length : 4;
            const paramSummary = Array.isArray(sp.parameters) ? sp.parameters.map((p: any) => p.name).join(", ") : "";

            generatedComponents.push({
              id: `spec-${machine.id || machine.machineId}-${idx}`,
              machineId: machine.machineId || machine.id,
              name: compName,
              category: compCat,
              description: sp.description || `${compName} (${paramCount} parameters: ${paramSummary})`,
              serialNumber: `SN-${machine.serialNumber ? machine.serialNumber.replace('SN-', '') : 'AUTO'}-${compCat.substring(0, 3).toUpperCase()}`,
              supplier: machine.name?.split(" ")[0] || "OEM Standard",
              installHours: 0,
              currentHours: Math.round((100 - inspectData.healthScore) * 150),
              plannedLife: 15000,
              replacementCost: 45000,
              condition: cond,
              createdAt: machine.status || new Date().toISOString(),
              updatedAt: inspectData.updatedAt || new Date().toISOString(),
              machine: {
                id: machine.id,
                name: machine.name,
                model: machine.model,
                serialNumber: machine.serialNumber,
                equipmentType: machine.model,
              },
              intelligence: {
                hoursRun: Math.round((100 - inspectData.healthScore) * 150),
                lifeUsedPercent: 100 - inspectData.healthScore,
                remainingHours: Math.max(0, 15000 - Math.round((100 - inspectData.healthScore) * 150)),
                riskStatus: inspectData.status,
                riskColor: inspectData.status === "Critical" ? "red" : inspectData.status === "Warning" ? "amber" : "emerald",
                riskDriver: "Inspection Diagnostics",
                estimatedSavings: "$12,400",
              },
            });
          });
        }
      });

      setInspectionMap(map);
      return generatedComponents;
    } catch (err) {
      console.error("Failed to load inspection records:", err);
      return [];
    }
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingComponent, setEditingComponent] =
    useState<MachineComponent | null>(null);
  const [form, setForm] = useState<ComponentForm>(emptyForm);

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // When editing, fields in LOCKED_ON_EDIT_FIELDS stay read-only unless the
  // user explicitly turns on "Replace Component" mode. Always true (fully
  // editable) when adding a brand new component.
  const [isFullReplace, setIsFullReplace] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MachineComponent | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const machineFilterOptions = useMemo(() => {
    return [
      { label: `🌐 All Machines (${machines.length})`, value: "all" },
      ...machines.map((m) => ({
        label: `🚜 ${m.name || m.model || "Machine"} ${m.serialNumber ? `(${m.serialNumber})` : ""}`,
        value: m.id || m.machineId,
      })),
    ];
  }, [machines]);

  const selectedMachineComponents = useMemo(() => {
    if (!selectedMachine) return components;

    const machIds = new Set(
      [selectedMachine.machineId, selectedMachine.id].filter(Boolean),
    );
    return components.filter(
      (component) =>
        machIds.has(component.machineId) ||
        (component.machineId &&
          selectedMachine.name &&

          component.machineId.toLowerCase() ===
            selectedMachine.name.toLowerCase()),

          component.machineId.toLowerCase() === selectedMachine.name.toLowerCase()) ||
        (component.machineId &&
          selectedMachine.serialNumber &&
          component.machineId.toLowerCase() === selectedMachine.serialNumber.toLowerCase()),

    );
  }, [components, selectedMachine]);

  const componentDropdownOptions = useMemo(() => {
    return [
      {
        label: `All Components (${selectedMachineComponents.length})`,
        value: "all",
      },
      ...selectedMachineComponents.map((c) => ({
        label: `${c.name} (${c.serialNumber || "No S/N"})`,
        value: c.id,
      })),
    ];
  }, [selectedMachineComponents]);

  const filteredComponents = useMemo(() => {
    let result = selectedMachineComponents;

    if (selectedComponentFilter !== "all") {
      result = result.filter((comp) => comp.id === selectedComponentFilter);
    }

    const query = componentSearchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((comp) => {
        const machine = machines.find((m) => m.machineId === comp.machineId);
        const machineName = machine ? machine.name.toLowerCase() : "";
        const machineModel = machine ? (machine.model || "").toLowerCase() : "";

        return (
          comp.name.toLowerCase().includes(query) ||
          (comp.description || "").toLowerCase().includes(query) ||
          (comp.serialNumber || "").toLowerCase().includes(query) ||
          (comp.supplier || "").toLowerCase().includes(query) ||
          machineName.includes(query) ||
          machineModel.includes(query)
        );
      });
    }

    return result;
  }, [
    selectedMachineComponents,
    selectedComponentFilter,
    componentSearchQuery,
    machines,
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">("all");

  type CompSortField = "machine" | "name" | "condition" | "updatedAt";
  type SortOrder = "asc" | "desc";

  const [sortField, setSortField] = useState<CompSortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: CompSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedComponents = useMemo(() => {
    const list = [...filteredComponents];
    return list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "machine") {
        const machA = machines.find((m) => m.machineId === a.machineId);
        const machB = machines.find((m) => m.machineId === b.machineId);
        valA = (machA?.name || "").toLowerCase();
        valB = (machB?.name || "").toLowerCase();
      } else if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      } else if (sortField === "condition") {
        valA = Number(a.condition || 0);
        valB = Number(b.condition || 0);
      } else if (sortField === "updatedAt") {
        valA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        valB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredComponents, machines, sortField, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMachine, selectedComponentFilter, componentSearchQuery]);

  const isShowAll = itemsPerPage === "all";
  const numericItemsPerPage = isShowAll
    ? sortedComponents.length
    : Number(itemsPerPage);
  const totalPages = isShowAll
    ? 1
    : Math.ceil(sortedComponents.length / (numericItemsPerPage || 1));

  const paginatedComponents = useMemo(() => {
    if (isShowAll) return sortedComponents;
    const start = (currentPage - 1) * numericItemsPerPage;
    return sortedComponents.slice(start, start + numericItemsPerPage);
  }, [sortedComponents, currentPage, numericItemsPerPage, isShowAll]);

  const startItem =
    filteredComponents.length === 0
      ? 0
      : isShowAll
        ? 1
        : (currentPage - 1) * numericItemsPerPage + 1;
  const endItem = isShowAll
    ? filteredComponents.length
    : Math.min(currentPage * numericItemsPerPage, filteredComponents.length);

  const averageHealth =
    selectedMachineComponents.length > 0
      ? Math.round(
          selectedMachineComponents.reduce(
            (total, component) => total + getHealthPercent(component.condition),
            0,
          ) / selectedMachineComponents.length,
        )
      : 0;

  const fetchComponents = async (machineId?: string) => {
    try {
      setComponentLoading(true);

      const response = machineId
        ? await componentService.getComponentsByMachineId(machineId)
        : await componentService.getComponents();
      const mappedComponents =
        getArrayData<any>(response).map(normalizeComponent);

      setComponents((previous) => {
        if (!machineId) return mappedComponents;

        const otherMachineComponents = previous.filter(
          (component) => component.machineId !== machineId,
        );

        return [...otherMachineComponents, ...mappedComponents];
      });
    } catch (error) {
      console.error("Failed to load components:", error);
    } finally {
      setComponentLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [machineResponse, categoryResponse, componentResponse] =
        await Promise.all([
          machineService.getMachines(),
          componentService.getCategories(),
          componentService.getComponents(),
        ]);

      const mappedMachines =
        getArrayData<any>(machineResponse).map(normalizeMachine);

      const activeCategories = getArrayData<Category>(categoryResponse).filter(
        (category) => category.isActive !== false,
      );

      const mappedComponents =
        getArrayData<any>(componentResponse).map(normalizeComponent);

      setMachines(mappedMachines);
      setCategories(
        activeCategories.length > 0 ? activeCategories : defaultCategories,
      );

      // Fetch rich spec components and inspection health from backend
      const specComponents = await fetchMachineComponentsAndSpecs(mappedMachines);

      // Combine DB registered components and spec components (deduplicating by name+machineId)
      const combinedComponents = [...mappedComponents];
      specComponents.forEach((sc) => {
        const exists = combinedComponents.some(
          (c) =>
            c.machineId === sc.machineId &&
            c.name.toLowerCase() === sc.name.toLowerCase()
        );
        if (!exists) {
          combinedComponents.push(sc);
        }
      });

      setComponents(combinedComponents);
      setSelectedMachine(null);
      setSelectedCategoryFilter("all");
    } catch (error) {
      console.error("Failed to load component page data:", error);
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

  const openAddModal = () => {
    setFormErrors({});
    if (machines.length === 0) {
      toast.error(
        "No machines found! Please add a machine first under the 'Machines' page.",
        {
          duration: 5000,
          position: "top-center",
        },
      );
      return;
    }

    setEditingComponent(null);
    setIsFullReplace(true);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || "",
      machineId: selectedMachine?.machineId || machines[0]?.machineId || "",
    });
    setIsFormOpen(true);
  };

  const openEditModal = (component: MachineComponent) => {
    const categoryExists = categories.some(
      (cat) => cat.name === component.category,
    );

    setEditingComponent(component);
    // Default to the safe "update only" mode — the operator has to
    // deliberately opt into replacing the full component spec.
    setIsFullReplace(false);
    setForm({
      name: component.name || component.description,
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
      parentComponentId: component.parentComponentId || "",
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingComponent(null);
    setForm(emptyForm);
    setFormErrors({});
    setIsFullReplace(true);
  };

  const updateField = (field: keyof ComponentForm, value: string) => {
    const updatedForm = {
      ...form,
      [field]: value,
    };

    setForm(updatedForm);

    if (field === "machineId" && value) {
      fetchComponents(value);
    }

    const result = componentSchema.safeParse(updatedForm);

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
    if (!form.machineId.trim()) return "Please select a machine";

    if (form.category === "Custom" && !form.customCategory.trim()) {
      return "Please enter custom category name";
    }

    if (!form.name.trim()) return "Component name is required";
    if (!form.serialNumber.trim()) return "Serial number is required";
    if (!form.supplier.trim()) return "Supplier is required";

    const numberFields = [
      ["Install hours", form.installHours],
      ["Current hours", form.currentHours],
      ["Planned life", form.plannedLife],
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

    const finalCategory =
      form.category === "Custom"
        ? form.customCategory.trim()
        : form.category.trim() || "General";

    const payload = {
      name: form.name.trim(),
      category: finalCategory,
      description: form.description.trim() || form.name.trim(),
      serialNumber: form.serialNumber.trim(),
      supplier: form.supplier.trim(),
      installHours: Number(form.installHours),
      currentHours: Number(form.currentHours),
      plannedLife: Number(form.plannedLife),
      replacementCost: Number(form.replacementCost || 0),
      condition: Number(form.condition),
      parentComponentId: form.parentComponentId.trim() || null,
    };

    try {
      setSubmitting(true);

      const targetMachine = machines.find(
        (m) => m.machineId === form.machineId,
      );

      if (editingComponent) {
        const response: any = await componentService.updateComponent(
          editingComponent.id,
          payload,
        );

        if (response?.offline && response?.queued) {
          setComponents((prev) =>
            prev.map((item) =>
              item.id === editingComponent.id
                ? {
                    ...item,
                    ...payload,
                  }
                : item,
            ),
          );

          closeFormModal();
          return;
        }
      } else {
        const response: any = await componentService.createComponent({
          machineId: form.machineId,
          ...payload,
        });

        if (response?.offline && response?.queued) {
          const offlineComponent = {
            id: `offline-${Date.now()}`,
            machineId: form.machineId,
            ...payload,
          };

          setComponents((prev) => [...prev, offlineComponent as any]);

          closeFormModal();
          return;
        }
      }
      closeFormModal();

      if (selectedMachine) {
        await fetchComponents(selectedMachine.id || selectedMachine.machineId);

        if (
          targetMachine &&
          (targetMachine.id || targetMachine.machineId) !==
            (selectedMachine.id || selectedMachine.machineId)
        ) {
          await fetchComponents(targetMachine.id || targetMachine.machineId);
        }
      } else {
        await fetchComponents();
      }
    } catch (error) {
      console.error("Failed to save component:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      const response: any = await componentService.deleteComponent(
        deleteTarget.id,
      );

      if (response?.offline && response?.queued) {
        setComponents((prev) =>
          prev.filter((item) => item.id !== deleteTarget.id),
        );

        setDeleteTarget(null);
        return;
      }

      setDeleteTarget(null);

      await fetchComponents(selectedMachine?.machineId);
    } catch (error) {
      console.error("Failed to delete component:", error);
    } finally {
      setDeleting(false);
    }
  };

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



  const categoryFilterOptions = [
    { label: "All Categories", value: "all" },
    ...categories.map((cat) => ({
      label: cat.name,
      value: cat.name,
    })),
  ];

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
          <div className="relative overflow-hidden border-b border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6">
            {/* Decorative Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              {/* Left Section */}
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  <Gauge size={14} />
                  Fleet Component Control
                </div>

                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Component Management
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Machine-wise component add, edit, delete and health monitoring
                  from connected backend APIs.
                </p>
              </div>

              {/* Action Button */}
              {!readOnly && (
                <button
                  onClick={openAddModal}
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/95 px-5 text-sm font-bold text-[#3730D9] shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white sm:w-fit"
                >
                  <Plus size={18} strokeWidth={2.4} />
                  Add Component
                </button>
              )}
            </div>
          </div>

          <div
            className={`p-5 ${showHealthView ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : ""}`}
          >
            <MetricCard
              title="Total Components"
              value={`${selectedMachineComponents.length}`}
            />
            {showHealthView && (
              <MetricCard title="Avg Health" value={`${averageHealth}%`} />
            )}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {/* 1. Machine Dropdown (Always shows first machine by default) */}
                <div className="relative min-w-[240px] max-w-[340px]">
                  <select
                    value={selectedMachine?.id || selectedMachine?.machineId || "all"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedComponentFilter("all");
                      if (val === "all") {
                        setSelectedMachine(null);
                      } else {
                        const mach = machines.find((m) => m.id === val || m.machineId === val);
                        if (mach) {
                          setSelectedMachine(mach);
                        }
                      }
                    }}
                    className="h-11 w-full truncate rounded-xl border border-slate-300 bg-white px-3.5 pr-8 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white cursor-pointer"
                  >
                    <option value="all">🌐 All Fleet Machines ({machines.length})</option>
                    {machines.map((m) => (
                      <option key={m.id || m.machineId} value={m.id || m.machineId}>
                        🚜 {m.name || m.model} {m.serialNumber ? `(${m.serialNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Component Filter Dropdown */}
                <div className="relative min-w-[190px] max-w-[260px]">
                  <select
                    value={selectedComponentFilter}
                    onChange={(e) => setSelectedComponentFilter(e.target.value)}
                    className="h-11 w-full truncate rounded-xl border border-slate-300 bg-white px-3.5 pr-8 text-xs font-bold text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white cursor-pointer"
                  >
                    {componentDropdownOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        🗂️ {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Search Bar */}
                <div className="relative h-11 min-w-[180px] sm:w-56">
                  <Search
                    className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={2.4}
                  />
                  <input
                    type="text"
                    placeholder="Search components..."
                    value={componentSearchQuery}
                    onChange={(e) => setComponentSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 4. Health View Toggle */}
              <button
                type="button"
                onClick={() => setShowHealthView((prev) => !prev)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all ${
                  showHealthView
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
                }`}
                title="Toggle Health Score View"
              >
                <Activity size={15} />
                {showHealthView ? "Health View: ON" : "Health View: OFF"}
              </button>


              <div className="relative h-11 w-52 shrink-0">
                <Search
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={2.4}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={componentSearchQuery}
                  onChange={(e) => setComponentSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                />
              </div>

              <div className="w-52 shrink-0">
                <AppSelect
                  value={
                    selectedMachine?.id || selectedMachine?.machineId || "all"
                  }
                  options={machineFilterOptions}
                  onChange={(value) => {
                    setSelectedComponentFilter("all");
                    if (value === "all") {
                      setSelectedMachine(null);
                      fetchComponents();
                    } else {
                      const mach = machines.find(
                        (m) => m.id === value || m.machineId === value,
                      );

                      if (mach) {
                        setSelectedMachine(mach);
                        fetchComponents(mach.id || mach.machineId);
                      }
                    }
                  }}
                  placeholder="Select Machine"
                  triggerClassName="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>

              <div className="w-52 shrink-0">
                <AppSelect
                  value={selectedComponentFilter}
                  options={componentDropdownOptions}
                  onChange={setSelectedComponentFilter}
                  placeholder="Select Component"
                  triggerClassName="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>

            </div>
          </div>

          {componentLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={30} />
            </div>
          ) : filteredComponents.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <Gauge size={24} strokeWidth={2.4} />
              </div>

              <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                No components found
              </h3>

              <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {componentSearchQuery.trim()
                  ? "No components found matching your search query. Try searching with a different keyword."
                  : "No components registered yet for the selected machine. Use the 'Add Component' button above to register a new component."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile / tablet card list — avoids horizontal scrolling on small screens */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800 lg:hidden">
                {paginatedComponents.map((component) => {
                  const machine = machines.find(
                    (m) => m.machineId === component.machineId,
                  );

                  const machineName = machine
                    ? machine.name
                    : "Unknown Machine";
                  const machineModel = machine
                    ? machine.model || "No Model"
                    : "N/A";

                  const lifeUsed = getLifeUsedPercent(component);
                  const effectivePlanned =
                    component.plannedLife ||
                    (component.currentHours > 0 ? 18000 : 0);
                  const remainingHours =
                    component.currentHours > 0 && effectivePlanned > 0
                      ? Math.max(
                          0,
                          effectivePlanned -
                            Math.max(
                              0,
                              component.currentHours - component.installHours,
                            ),
                        )
                      : 0;
                  const conditionInfo = getConditionLabel(component.condition);
                  const cIdKey = String(component.id || "").toLowerCase().trim();
                  const cSnKey = String(component.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();
                  const cNameKey = String(component.name || "").toLowerCase().trim();
                  const inspRecord = inspectionMap[cIdKey] || inspectionMap[cSnKey] || inspectionMap[cNameKey] || null;

                  const liveScore = inspRecord && inspRecord.hasData
                    ? inspRecord.healthScore
                    : component.intelligence?.hoursRun !== undefined
                    ? Math.round(100 - (component.intelligence?.lifeUsedPercent || 0))
                    : getHealthPercent(component.condition);

                  const riskStatus = inspRecord && inspRecord.hasData
                    ? inspRecord.status
                    : component.intelligence?.riskStatus ||
                      (liveScore < 50 ? "Critical" : liveScore < 85 ? "Warning" : "Healthy");

                  const riskColorClass =
                    riskStatus.toLowerCase() === "critical"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                      : riskStatus.toLowerCase() === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";

                  return (
                    <div key={component.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                            {cleanMachineName(machineName)}
                          </p>
                          {machine && machine.serialNumber ? (
                            <span className="mt-1 inline-flex w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                              {machine.serialNumber}
                            </span>
                          ) : machineModel && machineModel.toLowerCase() !== machineName.toLowerCase() ? (
                            <span className="mt-1 inline-flex w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                              {machineModel}
                            </span>
                          ) : null}
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${riskColorClass}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              riskStatus.toLowerCase() === "critical"
                                ? "bg-red-500"
                                : riskStatus.toLowerCase() === "warning"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          {riskStatus} {liveScore}%
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                          {component.description || "-"}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {component.serialNumber || "No Serial"} •{" "}
                          {component.supplier || "-"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          📅 {formatDateTime(component.updatedAt || component.createdAt)}
                        </p>
                      </div>

                      <div className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Condition
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${conditionInfo.class}`}
                          >
                            {conditionInfo.text}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedComponent(component)}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white text-xs font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                        >
                          <Eye size={14} strokeWidth={2.4} />
                          View
                        </button>

                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(component)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-white text-xs font-bold text-orange-700 transition hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
                            >
                              <Edit size={14} strokeWidth={2.4} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(component)}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                            >
                              <Trash2 size={14} strokeWidth={2.4} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / large-screen table */}
              <div className="hidden w-full overflow-x-auto hme-hide-scrollbar lg:block">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">

                      <th className="px-4 py-4 text-center font-bold w-14">
                        S.No.
                      </th>
                      <th className="px-6 py-4 font-bold">Machine / Type</th>
                      <th className="px-6 py-4 font-bold">
                        Component Name / Serial

                     <th className="px-4 py-4 text-center font-bold w-14">S.No.</th>
                      <th
                        className="px-6 py-4 font-bold cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => handleSort("machine")}
                      >
                        Machine / Type {sortField === "machine" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </th>
                      <th
                        className="px-6 py-4 font-bold cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => handleSort("name")}
                      >
                        Component Name / Serial {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </th>
                      <th
                        className="px-6 py-4 font-bold cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => handleSort("condition")}
                      >
                        Created Status {sortField === "condition" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </th>
                      <th className="px-6 py-4 font-bold">Updated Status</th>
                      <th
                        className="px-6 py-4 font-bold cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={() => handleSort("updatedAt")}
                      >
                        Date & Time {sortField === "updatedAt" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}

                      </th>
                      <th className="px-6 py-4 text-center font-bold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedComponents.map((component, index) => {
                      const itemIndex = isShowAll
                        ? index + 1
                        : (currentPage - 1) * numericItemsPerPage + index + 1;

                      const machine = machines.find(
                        (m) => m.machineId === component.machineId,
                      );

                      const machineName = machine
                        ? machine.name
                        : "Unknown Machine";
                      const machineModel = machine
                        ? machine.model || "No Model"
                        : "N/A";

                      const lifeUsed = getLifeUsedPercent(component);
                      const conditionInfo = getConditionLabel(
                        component.condition,
                      );

                      return (
                        <tr
                          key={component.id}
                          className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-4 py-4 text-center text-xs font-extrabold text-slate-400 dark:text-slate-500">
                            {itemIndex}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                                {cleanMachineName(machineName)}
                              </span>
                              {machine && machine.serialNumber ? (
                                <span className="mt-1 w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                  {machine.serialNumber}
                                </span>
                              ) : machineModel && machineModel.toLowerCase() !== machineName.toLowerCase() ? (
                                <span className="mt-1 w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                  {machineModel}
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col max-w-[220px]">
                              <span
                                className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white"
                                title={
                                  component.name || component.description || "-"
                                }
                              >
                                {component.name || "-"}
                              </span>
                              <span className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                S/N: {component.serialNumber || "No Serial"}
                              </span>
                            </div>
                          </td>

                          {/* CREATED STATUS */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${conditionInfo.class}`}
                            >
                              {conditionInfo.text}
                            </span>
                          </td>

                          {/* UPDATED STATUS */}
                          <td className="px-6 py-4">
                            {(() => {
                              const cIdKey = String(component.id || "").toLowerCase().trim();
                              const cSnKey = String(component.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();
                              const cNameKey = String(component.name || "").toLowerCase().trim();

                              const inspRecord = inspectionMap[cIdKey] || inspectionMap[cSnKey] || inspectionMap[cNameKey] || null;

                              if (inspRecord && inspRecord.hasData) {
                                const score = inspRecord.healthScore;
                                const isCrit = score < 50 || inspRecord.status === "Critical" || inspRecord.status === "CRITICAL";
                                const isWarn = (!isCrit && score < 85) || inspRecord.status === "Warning" || inspRecord.status === "WARNING";

                                const circleBg = isCrit
                                  ? "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
                                  : isWarn
                                  ? "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
                                  : "bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)]";

                                const textClass = isCrit
                                  ? "text-red-700 dark:text-red-400 font-black"
                                  : isWarn
                                  ? "text-amber-700 dark:text-amber-400 font-black"
                                  : "text-emerald-700 dark:text-emerald-300 font-black";

                                const badgeBg = isCrit
                                  ? "border-red-200 bg-red-50/90 dark:border-red-500/30 dark:bg-red-500/15"
                                  : isWarn
                                  ? "border-amber-200 bg-amber-50/90 dark:border-amber-500/30 dark:bg-amber-500/15"
                                  : "border-emerald-200 bg-emerald-50/90 dark:border-emerald-500/30 dark:bg-emerald-500/15";

                                const label = isCrit ? "CRITICAL" : isWarn ? "WARNING" : "HEALTHY";

                                return (
                                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] ${badgeBg} ${textClass}`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${circleBg}`} />
                                    {label} {score}%
                                  </span>
                                );
                              }

                              return (
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500" title="No inspection parameters entered yet">
                                  <span className="h-2.5 w-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-transparent" />
                                  -
                                </span>
                              );
                            })()}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {formatDateTime(component.updatedAt || component.createdAt)}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedComponent(component)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                                title="View Component Details"
                              >
                                <Eye size={15} strokeWidth={2.4} />
                              </button>

                              {!readOnly && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(component)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-white text-orange-700 transition hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
                                    title="Edit Component"
                                  >
                                    <Edit size={15} strokeWidth={2.4} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(component)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                                    title="Delete Component"
                                  >
                                    <Trash2 size={15} strokeWidth={2.4} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={filteredComponents.length}
                itemsPerPage={itemsPerPage}
                itemLabel="components"
                pageSizeOptions={[5, 10, 25, 50]}
                onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </section>
      </div>

      {selectedComponent && (
        <ComponentDetailsModal
          machine={
            machines.find((m) => m.machineId === selectedComponent.machineId) ||
            selectedMachine
          }
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      {isFormOpen && (
        <ComponentFormModal
          title={editingComponent ? "Edit Component" : "Add Component"}
          form={form}
          formErrors={formErrors}
          categories={categories}
          machines={machines}
          components={components}
          submitting={submitting}
          isEditMode={Boolean(editingComponent)}
          isFullReplace={isFullReplace}
          onToggleFullReplace={setIsFullReplace}
          onChange={updateField}
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
        <div className="flex items-center justify-between rounded-t-2xl border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Component Details
            </h2>

            <p className="mt-1 text-sm font-medium text-blue-100">
              {machine?.name || "Machine"} • {component.machineId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto p-5">
          <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33] sm:flex-row sm:items-center">
            {component.imageUrl ? (
              <img
                src={component.imageUrl}
                alt={component.category}
                className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm dark:border-slate-700"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <Gauge size={24} strokeWidth={2.4} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                {component.name || component.description || "Component"}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                S/N: {component.serialNumber || "-"}
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

            <DetailItem
              label="Component Name"
              value={component.name || component.description || "-"}
            />

            <DetailItem label="Component Name" value={component.name || component.description || "-"} />
            <DetailItem label="Category" value={component.category || "General"} />

            <DetailItem
              label="Full Description / Spec Notes"
              value={component.description || "-"}
            />
            <DetailItem
              label="Serial Number"
              value={component.serialNumber || "-"}
            />
            <DetailItem label="Supplier" value={component.supplier || "-"} />
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

function ComponentFormModal({
  title,
  form,
  formErrors,
  categories,
  machines,
  components = [],
  submitting,
  isEditMode,
  isFullReplace,
  onToggleFullReplace,
  onChange,
  onSubmit,
  onClose,
}: {
  title: string;
  form: ComponentForm;
  formErrors: FormErrors;
  categories: Category[];
  machines: Machine[];
  components?: MachineComponent[];
  submitting: boolean;
  isEditMode: boolean;
  isFullReplace: boolean;
  onToggleFullReplace: (value: boolean) => void;
  onChange: (key: keyof ComponentForm, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  // In edit mode, locked fields stay disabled until "Replace Component" is
  // switched on. In add mode every field is always editable.
  const isFieldLocked = (field: keyof ComponentForm) =>
    isEditMode && !isFullReplace && LOCKED_ON_EDIT_FIELDS.includes(field);

  const machineOptions = machines.map((mach) => ({
    label: `${mach.name} (${mach.model || "No Model"})`,
    value: mach.machineId,
  }));

  const selectedMach = machines.find(
    (m) => m.machineId === form.machineId || m.id === form.machineId,
  );
  const matchMachineIds = new Set(
    [form.machineId, selectedMach?.machineId, selectedMach?.id].filter(Boolean),
  );

  const parentComponentOptions = [
    { label: "None (Main Component)", value: "" },
    ...components
      .filter((c) => {
        if (c.parentComponentId) return false;
        if (matchMachineIds.has(c.machineId)) return true;
        if (
          selectedMach &&
          (c.machineId?.toLowerCase() === selectedMach.name?.toLowerCase() ||
            c.machineId?.toLowerCase() === selectedMach.model?.toLowerCase())
        ) {
          return true;
        }
        return false;
      })
      .map((c) => ({
        label: `${c.name || c.description || "Component"} (${c.serialNumber || "No S/N"})`,
        value: c.id,
      })),
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-4">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728] lg:max-w-4xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-4 shadow-sm sm:p-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
              {title}
            </h2>

            <p className="mt-1 text-xs font-medium text-blue-100 sm:text-sm">
              Fill component spec details and register.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        {isEditMode && (
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#101f33] sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    isFullReplace
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-[#0b1728] dark:text-slate-400"
                  }`}
                >
                  {isFullReplace ? (
                    <RefreshCcw size={15} strokeWidth={2.4} />
                  ) : (
                    <Lock size={15} strokeWidth={2.4} />
                  )}
                </div>

                <div>
                  <p className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                    {isFullReplace ? "Replace Component" : "Update Component"}
                  </p>
                  <p className="mt-0.5 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    {isFullReplace
                      ? "All fields are editable — spec details will be fully overwritten."
                      : "Only current hours, condition and description can be edited. Serial number, supplier, install hours, planned life and cost stay fixed."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleFullReplace(!isFullReplace)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase tracking-wide transition sm:self-center ${
                  isFullReplace
                    ? "border-blue-300 bg-blue-600 text-white hover:bg-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#0b1728] dark:text-slate-200 dark:hover:bg-[#12243b]"
                }`}
              >
                {isFullReplace ? (
                  <>
                    <Lock size={13} strokeWidth={2.4} />
                    Lock Fields
                  </>
                ) : (
                  <>
                    <RefreshCcw size={13} strokeWidth={2.4} />
                    Replace Entirely
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Machine
                {isFieldLocked("machineId") && (
                  <Lock size={11} strokeWidth={2.6} />
                )}
              </span>

              <AppSelect
                value={form.machineId}
                options={machineOptions}
                disabled={isFieldLocked("machineId")}
                onChange={(value) => onChange("machineId", value)}
                placeholder="Select Machine"
                triggerClassName="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </label>

            <FormInput
              label="Component Name *"
              value={form.name}
              error={formErrors.name}
              disabled={isFieldLocked("name")}
              onChange={(value) => onChange("name", value)}
              placeholder="e.g. Front Left Tyre"
            />

            <FormInput
              label="Serial Number *"
              value={form.serialNumber}
              error={formErrors.serialNumber}
              disabled={isFieldLocked("serialNumber")}
              onChange={(value) => onChange("serialNumber", value)}
              placeholder="TY-990-001"
            />

            <div className="sm:col-span-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Description / Spec Notes (Optional)
                </span>

                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  placeholder="e.g. Heavy duty radial tyre fitted on front left axle"
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition resize-none placeholder:text-slate-400 dark:bg-[#101f33] dark:text-white ${
                    formErrors.description
                      ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700"
                  }`}
                />

                <div className="mt-1 min-h-[20px]">
                  {formErrors.description && (
                    <p className="text-xs font-medium text-red-500">
                      {formErrors.description}
                    </p>
                  )}
                </div>
              </label>
            </div>

            <FormInput
              label="Supplier"
              value={form.supplier}
              disabled={isFieldLocked("supplier")}
              onChange={(value) => onChange("supplier", value)}
              placeholder="CK & IJ Group"
              error={formErrors.supplier}
            />

            <FormInput
              label="Install Hours"
              type="number"
              value={form.installHours}
              disabled={isFieldLocked("installHours")}
              onChange={(value) => onChange("installHours", value)}
              placeholder="800"
              error={formErrors.installHours}
            />

            <FormInput
              label="Current Hours"
              type="number"
              value={form.currentHours}
              onChange={(value) => onChange("currentHours", value)}
              placeholder="4900"
              error={formErrors.currentHours}
            />

            <FormInput
              label="Planned Life"
              type="number"
              value={form.plannedLife}
              disabled={isFieldLocked("plannedLife")}
              onChange={(value) => onChange("plannedLife", value)}
              placeholder="8000"
              error={formErrors.plannedLife}
            />

            <FormSelect
              label="Condition"
              value={form.condition}
              onChange={(value) => onChange("condition", value)}
              options={["1", "2", "3", "4", "5"]}
              error={formErrors.condition}
            />

            <div className="sm:col-span-2">
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Component Image (Photo)
              </label>
              <div className="flex items-center gap-4">
                {form.imageUrl ? (
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <img
                      src={form.imageUrl}
                      alt="Component Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onChange("imageUrl", "")}
                      className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <Plus size={16} />
                      <span>Upload Custom Component Photo</span>
                    </div>
                    <span className="mt-0.5 text-[11px] text-slate-400">
                      Select PNG, JPG, or WebP photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            onChange("imageUrl", reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 className="animate-spin" size={16} />}
            {isEditMode && isFullReplace
              ? "Replace Component"
              : "Save Component"}
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-6 shadow-2xl dark:bg-[#0b1728]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <Trash2 size={24} strokeWidth={2.4} />
        </div>

        <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Delete Component?
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          Are you sure you want to delete{" "}
          <span className="font-extrabold text-slate-900 dark:text-white">
            {component.category}
          </span>{" "}
          component? This action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
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
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
        {disabled && <Lock size={11} strokeWidth={2.6} />}
      </span>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:bg-[#101f33] dark:text-white dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-500 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
            : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700"
        }`}
      />

      <div className="mt-1 min-h-[20px]">
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  const selectOptions = options.map((option) => ({
    label: label === "Condition" ? `${option} / 5` : option,
    value: option,
  }));

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
        {disabled && <Lock size={11} strokeWidth={2.6} />}
      </span>

      <AppSelect
        value={value}
        options={selectOptions}
        disabled={disabled}
        onChange={onChange}
        placeholder={`Select ${label}`}
        triggerClassName="
    h-11
    w-full
    rounded-lg
    border
    border-slate-300
    bg-white
    px-4
    text-sm
    font-semibold
    text-slate-700
    dark:border-slate-700
    dark:bg-[#101f33]
    dark:text-white
  "
      />

      <div className="mt-1 min-h-[20px]">
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    </label>
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

export default ComponentManagement;
