import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  Truck,
  Cpu,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  History,
  ShieldCheck,
  RefreshCw,
  Save,
  Gauge,
  Sliders,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Info,
  User,
  Calendar,
  Layers,
  Globe,
  Filter,
  Tag,
  Building,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  Loader2,
  Eye,
  Edit3,
  ExternalLink,
  FileText,
  CheckCircle,
  X,
  Building2,
  Plus,
  PlusCircle,
  Trash2,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { machineService } from "../../services/companyadmin/machineService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import { isReadOnlyRole } from "../../components/common/permissions";

import PageMeta from "../../components/common/PageMeta";
import { apiRequest } from "../../services/api";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

interface Machine {
  id: string;
  machineId?: string;
  name?: string;
  manufacturer?: string;
  brand?: string;
  category?: string;
  model?: string;
  modelName?: string;
  serialNumber?: string;
  equipmentType?: string;
  equipment_type?: string;
  status?: string;
  healthScore?: number;
  sourceCatalog?: string;
  companyId?: string;
  companyName?: string;
   components?: any[]; 
}

interface SpecParameter {
  name: string;
  unit: string;
  safeMin: number;
  safeMax: number;
  defaultVal: number;
  currentVal?: string | number;
  description?: string;
}


interface SpecComponent {
  name: string;
  category: string;
  parameters: SpecParameter[];
}

interface HistoryLog {
  id: string;
  actionType?: string;
  companyId?: string | null;
  companyName?: string | null;
  userId?: string | null;
  userName?: string;
  userRole?: string;
  userEmail?: string | null;
  machineId?: string;
  machineName?: string | null;
  serialNumber?: string | null;
  brand?: string | null;
  category?: string | null;
  modelName?: string | null;
  componentName: string;
  submittedBy?: string;
  parameters?: any;
  previousParameters?: any;
  currentParameters?: any;
  parameterChanges?: any;
  componentHealth?: number;
  componentHealthScore?: number;
  overallMachineHealth?: number;
  machineStatus?: string;
  status?: string;
  issues?: string[];
  createdAt: string;
}

// Helpers for persistent company custom components per machine (Company-Scoped & Multi-Tenant Isolated)
const memoryCustomComponents = new Map<string, SpecComponent[]>();

const getCustomComponentsForMachine = (m: Machine | null): SpecComponent[] => {
  if (!m) return [];
    const machineKey = m.id || m.serialNumber || m.machineId || m.name || m.model || "unknown";
  return memoryCustomComponents.get(machineKey) || [];
};


const saveCustomComponentForMachine = (m: Machine, comp: SpecComponent) => {
  try {
        apiRequest("/machines/custom-components", {
      method: "POST",
      body: JSON.stringify({
        machineId: m.id,
        name: comp.name,
        category: comp.category,
        parameters: comp.parameters,
      }),
    }).catch(() => null);

       const machineKey = m.id || m.serialNumber || m.machineId || m.name || m.model || "unknown";
    const existing = memoryCustomComponents.get(machineKey) || [];
    const updated = [...existing.filter((c) => c.name.toLowerCase() !== comp.name.toLowerCase()), comp];
    memoryCustomComponents.set(machineKey, updated);
  } catch (e) {
    console.error("Error saving custom component:", e);
  }
};

// Preset templates for instant 1-click addition of standard heavy equipment systems
const PRESET_COMPONENT_TEMPLATES: Array<{
  name: string;
  category: string;
  icon: string;
  description: string;
  parameters: SpecParameter[];
}> = [
  {
    name: "Telescopic Boom & Hoist System",
    category: "Crane Hydraulics",
    icon: "🏗️",
    description: "Main boom telescoping cylinder and high-tension hoist winch hydraulics",
    parameters: [
      { name: "Boom Extension Pressure", unit: "Bar", safeMin: 150, safeMax: 300, defaultVal: 220, description: "Boom cylinder extension pressure" },
      { name: "Hoist Winch Pressure", unit: "Bar", safeMin: 160, safeMax: 300, defaultVal: 230, description: "Main hoisting winch hydraulic pressure" },
      { name: "Boom Angle Elevation", unit: "Deg", safeMin: 0, safeMax: 85, defaultVal: 45, description: "Boom operating elevation angle" },
    ],
  },
  {
    name: "Outrigger Stabilization System",
    category: "Crane Hydraulics",
    icon: "🚧",
    description: "Hydraulic outrigger vertical jacks and horizontal beam extension",
    parameters: [
      { name: "Outrigger Jack Pressure", unit: "Bar", safeMin: 140, safeMax: 280, defaultVal: 210, description: "Vertical load-bearing jack pressure" },
      { name: "Leveling Pitch Deviation", unit: "Deg", safeMin: 0, safeMax: 5, defaultVal: 1.2, description: "Base chassis horizontal tilt angle" },
    ],
  },
  {
    name: "Pneumatic Air Brake & Steering",
    category: "Brakes & Steering",
    icon: "🛑",
    description: "Dual-circuit pneumatic service brakes and all-wheel carrier steering",
    parameters: [
      { name: "Pneumatic Air Pressure", unit: "Bar", safeMin: 6.5, safeMax: 9.5, defaultVal: 8.2, description: "Air reservoir holding pressure" },
      { name: "Steering Assist Pressure", unit: "Bar", safeMin: 120, safeMax: 200, defaultVal: 155, description: "Carrier hydraulic steering line" },
    ],
  },
  {
    name: "24V Electrical & Safety Telemetry",
    category: "Electrical",
    icon: "⚡",
    description: "Alternator charging, dual battery bank, and A2B safety limit switches",
    parameters: [
      { name: "Battery System Voltage", unit: "V", safeMin: 24.0, safeMax: 28.5, defaultVal: 26.4, description: "DC alternator charging potential" },
      { name: "A2B Anti-Two-Block Sensor", unit: "%", safeMin: 80, safeMax: 100, defaultVal: 100, description: "Crane over-hoist limit switch status" },
    ],
  },
  {
    name: "Auxiliary Radiator Cooling Unit",
    category: "Cooling System",
    icon: "❄️",
    description: "Secondary high-flow cooling pack and hydraulic oil cooler fan",
    parameters: [
      { name: "Coolant Loop Pressure", unit: "PSI", safeMin: 15, safeMax: 25, defaultVal: 18, description: "Pressurized radiator cap line" },
      { name: "Cooling Fan RPM", unit: "RPM", safeMin: 800, safeMax: 2200, defaultVal: 1400, description: "Hydraulic variable speed fan" },
    ],
  },
  {
    name: "Hydraulic Slew & Swing Motor",
    category: "Hydraulics",
    icon: "🛢️",
    description: "360-degree superstructure swing drive and slew ring holding brake",
    parameters: [
      { name: "Slew Motor Pressure", unit: "Bar", safeMin: 140, safeMax: 260, defaultVal: 190, description: "Superstructure rotation line pressure" },
      { name: "Swing Brake Holding Pressure", unit: "Bar", safeMin: 120, safeMax: 220, defaultVal: 180, description: "Slew lock release pressure" },
    ],
  },
];


 
export default function InspectionDataEntry() {
  const inspectionSectionRef = useRef<HTMLDivElement>(null);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSpecs, setLoadingSpecs] = useState<boolean>(false);

  // Global Quick Machine Search State (Direct search across 9,742+ machines)
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState<boolean>(false);

  // 3-Tier Cascading Filter State: Category -> Brand -> Machine Model
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [readingsState, setReadingsState] = useState<Record<string, Record<string, string>>>({});
  const [checklistState, setChecklistState] = useState<Record<string, Record<string, string>>>({});
  const [customFieldsState, setCustomFieldsState] = useState<Record<string, Array<{ id: string; name: string; value: string }>>>({});
  const [componentHealthMap, setComponentHealthMap] = useState<Record<string, { healthScore: number; status: string }>>({});
  const [activeComponentTab, setActiveComponentTab] = useState<string>("Engine Assembly");
  

  // Dropdown Open States
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState<boolean>(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState<boolean>(false);
  const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState<boolean>(false);

  // Search filter inside dropdowns
  const [catSearch, setCatSearch] = useState<string>("");
  const [brandSearch, setBrandSearch] = useState<string>("");
  const [machineSearch, setMachineSearch] = useState<string>("");

  // Inspection & Spec Components State
  const [specComponents, setSpecComponents] = useState<SpecComponent[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [paramInputs, setParamInputs] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [healthResult, setHealthResult] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Company Fleet Management State (Assign from Master Catalog to Company Fleet)
  const [fleetMode, setFleetMode] = useState<"CATALOG" | "COMPANY_FLEET">("CATALOG");
  const [companyFleet, setCompanyFleet] = useState<Machine[]>([]);
  const [addingToFleet, setAddingToFleet] = useState<boolean>(false);
  const [fleetCurrentPage, setFleetCurrentPage] = useState<number>(1);
  const [fleetPageSize, setFleetPageSize] = useState<number>(5);
  const [fleetTableSearch, setFleetTableSearch] = useState<string>("");

  // Audit Trail History Pagination State
  const [auditCurrentPage, setAuditCurrentPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(5);

  // Floating Toast State
  const [toast, setToast] = useState<{ message: string; type: "warning" | "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "warning" | "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };


  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Clean Model Name Formatter helper (Avoids "Ammann Ammann ADT-244")
  const formatCleanModelName = (m: Machine | null | undefined) => {
    if (!m) return "";
    const brand = (m.brand || m.manufacturer || "").trim();
    let raw = (m.model || m.modelName || m.name || "").trim();
    if (brand && raw.toLowerCase().startsWith(`${brand.toLowerCase()} ${brand.toLowerCase()}`)) {
      raw = raw.substring(brand.length).trim();
    }
    const cat = (m.category || m.equipmentType || "").trim();
    if (cat && raw.toLowerCase().endsWith(` ${cat.toLowerCase()}`) && raw.length > cat.length + 5) {
      raw = raw.substring(0, raw.length - cat.length).trim();
    }
    return raw;
  };

  // Add Custom Component Modal State
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState<boolean>(false);
  const [newCompName, setNewCompName] = useState<string>("");
  const [newCompCategory, setNewCompCategory] = useState<string>("Crane Hydraulics");
  const [newCompParams, setNewCompParams] = useState<
    Array<{ name: string; unit: string; safeMin: number; safeMax: number; defaultVal: number; description?: string }>
  >([
    { name: "Operating Pressure", unit: "Bar", safeMin: 150, safeMax: 300, defaultVal: 220, description: "Main hydraulic line pressure" },
  ]);
  const [compFormError, setCompFormError] = useState<string>("");

  // Audit History State
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [auditViewScope, setAuditViewScope] = useState<"ALL" | "SELECTED">("ALL");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [viewingDetailLog, setViewingDetailLog] = useState<HistoryLog | null>(null);
  const [deletingLogTarget, setDeletingLogTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState<boolean>(false);

  // Get Dynamic Logged-In User & Company Info from active session
  const currentUser = useMemo(() => {
    try {
      const storedUser: any = StorageService.get(STORAGE_KEYS.USER) || {};
      const storedRole = StorageService.get<string>(STORAGE_KEYS.ROLE) || storedUser?.role || "COMPANY_ADMIN";
      const storedName = StorageService.get<string>(STORAGE_KEYS.NAME) || storedUser?.name || `${storedUser?.firstName || ''} ${storedUser?.lastName || ''}`.trim() || "Company Admin";
      const storedEmail = StorageService.get<string>(STORAGE_KEYS.EMAIL) || storedUser?.email;
      const storedCompanyId = StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) || storedUser?.companyId || storedUser?.company?.id || "";
      const storedCompanyName = storedUser?.company?.name || storedUser?.companyName || "Company Equipment Fleet";

      return {
        id: storedUser?.id || null,
        name: storedName,
        role: storedRole,
        email: storedEmail || null,
        companyId: storedCompanyId,
        companyName: storedCompanyName,
        isSuperAdmin: false,
      };
    } catch (e) {
      return {
        id: null,
        name: "Company Admin",
        role: "COMPANY_ADMIN",
        email: null,
        companyId: "",
        companyName: "Company Equipment Fleet",
        isSuperAdmin: false,
      };
    }
  }, []);

  // Cleanup old loose un-scoped localStorage keys once on mount
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("custom_components_") && !k.includes("_c123") && !k.includes("_c111") && !k.includes("-")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }, []);

  const deriveComponentName = (item: any): string => {
    const directName =
      item?.name || item?.componentName || item?.component_name;
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
  }

  const fetchCompanyFleet = async () => {
    try {
      const user = StorageService.getUser();
      const compId = user?.companyId || user?.company_id || currentUser.companyId;
      if (!compId) return;
      const res: any = await apiRequest(`/machines/company-fleet?companyId=${encodeURIComponent(compId)}`);
      const fleetData = res?.data || res || [];
      if (Array.isArray(fleetData)) {
        const mappedFleet: Machine[] = fleetData.map((m: any) => ({
          id: m.id || m.serialNumber,
          name: m.name || m.model,
          model: m.model || m.name,
          brand: m.manufacturer || m.brand || "Fleet Equipment",
          category: m.equipmentType || m.category || "Heavy Equipment",
          equipmentType: m.equipmentType || m.category || "Heavy Equipment",
          serialNumber: m.serialNumber || `SN-${m.id?.substring(0, 6)}`,
          status: m.status || "Healthy",
          healthScore: m.healthScore ?? 100,
          condition: m.condition ?? 5,
          sourceCatalog: "Company Registered Fleet",
          site: m.site || "Main Mining Site",
          components: m.components || [],
        }));
        setCompanyFleet(mappedFleet);
      }
    } catch (e) {
      console.warn("Notice: Fetch company fleet:", e);
    }
  };

  // 1-Click Add Machine to Company Fleet Action
  const handleAddToCompanyFleet = async (m: Machine) => {
    if (!m) return;
    setAddingToFleet(true);
    try {
      const user = StorageService.getUser();
      const compId = user?.companyId || user?.company_id || currentUser.companyId;
            await apiRequest('/machines/assign-to-company', {
        method: 'POST',
        body: JSON.stringify({
          companyId: compId,
          modelName: m.model || m.name,
          brand: m.brand || m.manufacturer,
          category: m.equipmentType || m.category,
          name: m.name || m.model,
          serialNumber: m.serialNumber,
        }),
      });
      await fetchCompanyFleet();
      setSuccessMsg(`✓ "${m.name || m.model}" successfully added to your Company Fleet! Now assigned and available to your Supervisors, Artisans, and Operators.`);
    } catch (err: any) {
      console.error("Failed to add machine to fleet:", err);
    } finally {
      setAddingToFleet(false);
    }
  };

  // 1-Click Remove / Unassign Machine from Company Fleet
  const handleRemoveFromCompanyFleet = async (mId: string, mName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${mName}" from your Company Fleet?`)) {
      return;
    }
    try {
      const user = StorageService.getUser();
      const compId = user?.companyId || user?.company_id || currentUser.companyId;
      await apiRequest(`/machines/assign-to-company/${encodeURIComponent(mId)}?companyId=${encodeURIComponent(compId)}`, {
        method: 'DELETE',
      });
      await fetchCompanyFleet();
      setSuccessMsg(`✓ "${mName}" has been removed from your Company Fleet.`);
    } catch (err: any) {
      console.error("Failed to remove machine from fleet:", err);
    }

  };

  // Fetch Master Equipment Catalog and Company Fleet on Mount
  useEffect(() => {
    const fetchMasterCatalog = async () => {
      setLoading(true);
      try {
        const res: any = await apiRequest("/machines/master-catalog?limit=all");
        const catalogData = res?.data?.catalog || res?.catalog || [];

        if (Array.isArray(catalogData) && catalogData.length > 0) {
          const mappedMachines: Machine[] = catalogData.map((item: any) => {
            const rawModel = item.modelName || item.model || item.name || "Equipment";
            const brandStr = item.brand || item.manufacturer || "";
            let cleanTitle = rawModel;
            if (brandStr && !cleanTitle.toLowerCase().startsWith(brandStr.toLowerCase())) {
              cleanTitle = `${brandStr} ${cleanTitle}`.trim();
            }

            return {
              id: item.id || `m-${item.slug || item.modelName}`,
              name: cleanTitle,
              model: item.modelName || cleanTitle,
              brand: item.brand,
              category: item.category,
              equipmentType: item.category,
              status: "Healthy",
              condition: 5,
              healthScore: 100,
              imageUrl: null,
              operatingWeight: item.operatingWeight || "N/A",
              enginePower: item.enginePower || "N/A",
              serialNumber: `SN-${(item.brand || 'HME').substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
              totalSpecsCount: item.totalSpecsCount || 12,
              sourceCatalog: "PostgreSQL DB (" + item.brand + ")",
              components: item.components || [],
            };
          });

          setMachines(mappedMachines);


          if (mappedMachines.length > 0) {
            handleSelectMachine(mappedMachines[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load catalog:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMasterCatalog();
    fetchCompanyFleet();
  }, []);

  const activeSourceMachines = useMemo(() => {
    if (fleetMode === "COMPANY_FLEET") {
      return companyFleet;
    }
    return machines;
  }, [fleetMode, companyFleet, machines]);

  // Computed Distinct Categories with Machine Counts
  const categoriesList = useMemo(() => {
    const map = new Map<string, number>();
    activeSourceMachines.forEach((m) => {
      const cat = m.equipmentType || m.equipment_type || m.category || "General";
      map.set(cat, (map.get(cat) || 0) + 1);
    });

    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return list;
  }, [activeSourceMachines]);

  // Filter Categories by search
  const filteredCategoryOptions = useMemo(() => {
    if (!catSearch.trim()) return categoriesList;
    return categoriesList.filter((c) =>
      c.name.toLowerCase().includes(catSearch.toLowerCase())
    );
  }, [categoriesList, catSearch]);

  // Computed Distinct Brands filtered by Selected Category
  const brandsList = useMemo(() => {
    let source = activeSourceMachines;
    if (selectedCategory !== "ALL") {
      source = activeSourceMachines.filter(
        (m) =>
          (m.equipmentType || m.equipment_type || m.category || "").toLowerCase() ===
          selectedCategory.toLowerCase()
      );
    }

    const map = new Map<string, number>();
    source.forEach((m) => {
      const b = m.brand || m.manufacturer || "Caterpillar";
      map.set(b, (map.get(b) || 0) + 1);
    });

    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return list;
  }, [activeSourceMachines, selectedCategory]);

  // Filter Brands by search
  const filteredBrandOptions = useMemo(() => {
    if (!brandSearch.trim()) return brandsList;
    return brandsList.filter((b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brandsList, brandSearch]);

  // Filtered Machines based on Category, Brand and Search
  const filteredMachines = useMemo(() => {
    return activeSourceMachines.filter((m) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        (m.equipmentType || m.equipment_type || m.category || "").toLowerCase() ===
          selectedCategory.toLowerCase();

      const matchesBrand =
        selectedBrand === "ALL" ||
        (m.brand || m.manufacturer || "").toLowerCase() === selectedBrand.toLowerCase();

      const matchesSearch =
        machineSearch === "" ||
        (m.name && m.name.toLowerCase().includes(machineSearch.toLowerCase())) ||
        (m.model && m.model.toLowerCase().includes(machineSearch.toLowerCase())) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(machineSearch.toLowerCase()));

      return matchesCategory && matchesBrand && matchesSearch;
    });
  }, [activeSourceMachines, selectedCategory, selectedBrand, machineSearch]);

  // Filtered & Paginated Company Fleet List
  const filteredFleetList = useMemo(() => {
    if (!fleetTableSearch.trim()) return companyFleet;
    const q = fleetTableSearch.toLowerCase().trim();
    return companyFleet.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.model && m.model.toLowerCase().includes(q)) ||
        (m.brand && m.brand.toLowerCase().includes(q)) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.equipmentType && m.equipmentType.toLowerCase().includes(q))
    );
  }, [companyFleet, fleetTableSearch]);

  const totalFleetPages = Math.max(1, Math.ceil(filteredFleetList.length / fleetPageSize));

  // Build map of latest health per component for the selected machine
  const compHealthMap = useMemo(() => {
    const map: Record<string, { healthScore: number; status: string }> = {};
    if (selectedMachine?.components && Array.isArray(selectedMachine.components)) {
      selectedMachine.components.forEach((c: any) => {
        if (c && c.name) {
          map[c.name] = {
            healthScore: c.healthScore ?? 100,
            status: c.status || "Healthy"
          };
        }
      });
    }
    const machineLogs = historyLogs.filter((l) => {
      return (
        (selectedMachine?.serialNumber && l.serialNumber === selectedMachine.serialNumber) ||
        (selectedMachine?.id && (l.machineId === selectedMachine.id || l.id === selectedMachine.id)) ||
        (selectedMachine?.model && l.machineName && l.machineName.toLowerCase().includes(selectedMachine.model.toLowerCase()))
      );
    });
    machineLogs.forEach((l) => {
      if (l.componentName && !map[l.componentName]) {
        map[l.componentName] = {
          healthScore: l.componentHealthScore ?? l.componentHealth ?? 100,
          status: l.status || "Healthy"
        };
      }
    });

    return map;
  }, []);

  // Helper to determine component-specific manual reading fields
  const getComponentMetricFields = (tabName: string) => {
    const name = tabName.toLowerCase();
    if (name.includes("battery")) {
      return [
        {
          key: "batteryVoltage",
          label: "Operating Voltage (V)",
          type: "number",
          placeholder: "e.g. 24.5",
        },
        {
          key: "batteryTemp",
          label: "Operating Temperature (°C)",
          type: "number",
          placeholder: "e.g. 35",
        },
        {
          key: "chargeState",
          label: "Battery Charge Level (%)",
          type: "number",
          placeholder: "e.g. 98",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Fault Codes (DTCs)",
          type: "text",
          placeholder: "None or DTC-B001",
        },
      ];
    }
    if (name.includes("engine") || name.includes("diesel")) {
      return [
        {
          key: "coolantTemp",
          label: "Coolant Temperature (°C)",
          type: "number",
          placeholder: "e.g. 85",
        },
        {
          key: "engineOilPressure",
          label: "Engine Oil Pressure (bar)",
          type: "number",
          placeholder: "e.g. 4.2",
        },
        {
          key: "operatingRpm",
          label: "Operating RPM",
          type: "number",
          placeholder: "e.g. 1800",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Fault Codes (DTCs)",
          type: "text",
          placeholder: "None",
        },
      ];
    }
    if (name.includes("brake")) {
      return [
        {
          key: "brakePressure",
          label: "Brake Hydraulic Pressure (bar)",
          type: "number",
          placeholder: "e.g. 150",
        },
        {
          key: "operatingTemp",
          label: "Brake Temperature (°C)",
          type: "number",
          placeholder: "e.g. 70",
        },
        {
          key: "fluidPressure",
          label: "Brake Fluid Line Pressure (bar)",
          type: "number",
          placeholder: "e.g. 120",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Fault Codes (DTCs)",
          type: "text",
          placeholder: "None",
        },
      ];
    }
    if (name.includes("hydraulic") || name.includes("pump")) {
      return [
        {
          key: "systemPressure",
          label: "Main System Pressure (bar)",
          type: "number",
          placeholder: "e.g. 280",
        },
        {
          key: "operatingTemp",
          label: "Hydraulic Oil Temp (°C)",
          type: "number",
          placeholder: "e.g. 65",
        },
        {
          key: "returnPressure",
          label: "Return Line Pressure (bar)",
          type: "number",
          placeholder: "e.g. 12",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Fault Codes (DTCs)",
          type: "text",
          placeholder: "None",
        },
      ];
    }
    if (name.includes("transmission") || name.includes("swing")) {
      return [
        {
          key: "transPressure",
          label: "Transmission Oil Pressure (bar)",
          type: "number",
          placeholder: "e.g. 22",
        },
        {
          key: "transTemp",
          label: "Transmission Temp (°C)",
          type: "number",
          placeholder: "e.g. 80",
        },
        {
          key: "converterPressure",
          label: "Torque Converter Pressure (bar)",
          type: "number",
          placeholder: "e.g. 15",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Fault Codes (DTCs)",
          type: "text",
          placeholder: "None",
        },
      ];
    }
    if (name.includes("tyre") || name.includes("tire")) {
      return [
        {
          key: "tyreInflation",
          label: "Tyre Inflation Pressure (PSI)",
          type: "number",
          placeholder: "e.g. 105",
        },
        {
          key: "operatingTemp",
          label: "Tyre Surface Temp (°C)",
          type: "number",
          placeholder: "e.g. 45",
        },
        {
          key: "treadDepth",
          label: "Tread Depth (mm)",
          type: "number",
          placeholder: "e.g. 42",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Notes & Code",
          type: "text",
          placeholder: "Normal",
        },
      ];
    }
    if (name.includes("fuel") || name.includes("delivery")) {
      return [
        {
          key: "fuelPressure",
          label: "Fuel Injection Pressure (bar)",
          type: "number",
          placeholder: "e.g. 1600",
        },
        {
          key: "fuelTemp",
          label: "Fuel Temperature (°C)",
          type: "number",
          placeholder: "e.g. 40",
        },
        {
          key: "flowRate",
          label: "Fuel Flow Rate (L/min)",
          type: "number",
          placeholder: "e.g. 45",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Fault Codes (DTCs)",
          type: "text",
          placeholder: "None",
        },
      ];
    }
    if (
      name.includes("tank") ||
      name.includes("nozzle") ||
      name.includes("axle")
    ) {
      return [
        {
          key: "tankLevel",
          label: "Operating Capacity / Level (%)",
          type: "number",
          placeholder: "e.g. 95",
        },
        {
          key: "operatingPressure",
          label: "Operating Pressure (bar)",
          type: "number",
          placeholder: "e.g. 8.5",
        },
        {
          key: "operatingTemp",
          label: "Operating Temperature (°C)",
          type: "number",
          placeholder: "e.g. 50",
        },
        {
          key: "faultCodes",
          label: "Diagnostic Notes / Codes",
          type: "text",
          placeholder: "None",
        },
      ];
    }

    return [
      {
        key: "operatingPressure",
        label: "Operating Pressure (bar)",
        type: "number",
        placeholder: "e.g. 10",
      },
      {
        key: "operatingTemp",
        label: "Operating Temperature (°C)",
        type: "number",
        placeholder: "e.g. 60",
      },
      {
        key: "coolantTemp",
        label: "Coolant / System Temp (°C)",
        type: "number",
        placeholder: "e.g. 75",
      },
      {
        key: "faultCodes",
        label: "Diagnostic Fault Codes (DTCs)",
        type: "text",
        placeholder: "None",
      },
    ];
  };

  const paginatedFleetMachines = useMemo(() => {
    const startIndex = (fleetCurrentPage - 1) * fleetPageSize;
    return filteredFleetList.slice(startIndex, startIndex + fleetPageSize);
  }, [filteredFleetList, fleetCurrentPage, fleetPageSize]);

  // Global Quick Search Results across active dataset
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase().trim();
    return activeSourceMachines
      .filter((m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.model && m.model.toLowerCase().includes(q)) ||
        (m.modelName && m.modelName.toLowerCase().includes(q)) ||
        (m.brand && m.brand.toLowerCase().includes(q)) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.equipmentType && m.equipmentType.toLowerCase().includes(q)) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(q))
      )
      .slice(0, 25);
  }, [activeSourceMachines, globalSearch]);

  const handleSelectFromGlobalSearch = (m: Machine) => {
    if (m.category || m.equipmentType) {
      setSelectedCategory(m.category || m.equipmentType || "ALL");
    }
    if (m.brand || m.manufacturer) {
      setSelectedBrand(m.brand || m.manufacturer || "ALL");
    }
    handleSelectMachine(m);
    setGlobalSearch("");
    setIsGlobalSearchFocused(false);
  };

  // Handle Category Change
  const handleCategoryChange = (catName: string) => {
    setSelectedCategory(catName);
    setSelectedBrand("ALL");
    setIsCatDropdownOpen(false);
    setCatSearch("");

    let matchedList = machines;
    if (catName !== "ALL") {
      matchedList = machines.filter(
        (m) => (m.equipmentType || m.equipment_type || m.category || "").toLowerCase() === catName.toLowerCase()
      );
    }
    if (matchedList.length > 0) {
      handleSelectMachine(matchedList[0]);
    }
  };

  // Handle Brand Change
  const handleBrandChange = (brandName: string) => {
    setSelectedBrand(brandName);
    setIsBrandDropdownOpen(false);
    setBrandSearch("");

    let matchedList = machines;
    if (selectedCategory !== "ALL") {
      matchedList = matchedList.filter(
        (m) => (m.equipmentType || m.equipment_type || m.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (brandName !== "ALL") {
      matchedList = matchedList.filter(
        (m) => (m.brand || m.manufacturer || "").toLowerCase() === brandName.toLowerCase()
      );
    }
    if (matchedList.length > 0) {
      handleSelectMachine(matchedList[0]);
    }
  };

  // Handle Machine Selection with Loading Spinner
  const handleSelectMachine = async (m: Machine) => {
    setSelectedMachine(m);
    setIsMachineDropdownOpen(false);
    setMachineSearch("");
    setHealthResult(null);
    setSuccessMsg("");
    setLoadingSpecs(true);

    const user = StorageService.getUser();
    const companyId = user?.companyId || user?.company_id || m.companyId || "";
    const typeStr = m.equipmentType || m.equipment_type || m.category || m.model || "Truck";

    try {
      // Call backend API with companyId and machineId so backend automatically returns OEM components + company's custom components
      const res: any = await apiRequest(
        `/machines/spec-template?equipmentType=${encodeURIComponent(typeStr)}&modelName=${encodeURIComponent(m.model || m.modelName || "")}&companyId=${encodeURIComponent(companyId)}&machineId=${encodeURIComponent(m.id || m.serialNumber || "")}`
      );
      const templateData = res?.data || res;
      const rawTemplateComponents: SpecComponent[] = templateData?.components || [];

      // Merge standard factory components with company-added custom components (strictly company scoped)
      const customComps = getCustomComponentsForMachine(m);
      const mergedComponents: SpecComponent[] = [
        ...rawTemplateComponents,
        ...customComps.filter(
          (c) => !rawTemplateComponents.some((tc) => tc.name.toLowerCase() === c.name.toLowerCase())
        ),

      ];

      if (mergedComponents.length > 0) {
        setSpecComponents(mergedComponents);
        setActiveTab(mergedComponents[0]?.name || "");

        const initialInputs: Record<string, Record<string, string>> = {};
        mergedComponents.forEach((comp: SpecComponent) => {
          initialInputs[comp.name] = {};
          comp.parameters?.forEach((param: SpecParameter) => {
            initialInputs[comp.name][param.name] = String(param.defaultVal);
          });
        });
        setParamInputs(initialInputs);
      }
    } catch (err) {
      console.error("Failed to fetch spec template:", err);
    } finally {
      setLoadingSpecs(false);
    }


    return [
      {
        key: "operatingPressure",
        label: "Operating Pressure (bar)",
        type: "number",
        placeholder: "e.g. 10",
      },
      {
        key: "operatingTemp",
        label: "Operating Temperature (°C)",
        type: "number",
        placeholder: "e.g. 60",
      },
      {
        key: "coolantTemp",
        label: "Coolant / System Temp (°C)",
        type: "number",
        placeholder: "e.g. 75",
      },
      {
        key: "faultCodes",
        label: "Diagnostic Fault Codes (DTCs)",
        type: "text",
        placeholder: "None",
      },
    ];
  };

  // Helper to determine component-specific checklist fields
  const getComponentChecklistFields = (tabName: string) => {
    const name = tabName.toLowerCase();
    if (name.includes("battery")) {
      return [
        {
          key: "electrolyteLevel",
          label: "Electrolyte Fluid Level",
          options: ["Normal", "Low", "Critical Low"],
        },
        {
          key: "terminalCorrosion",
          label: "Terminal & Cable Corrosion",
          options: ["Pass", "Minor Corrosion", "Severe Corrosion"],
        },
        {
          key: "casingCondition",
          label: "Mechanical Casing & Seals",
          options: ["Normal", "Cracked/Sweating", "Damaged"],
        },
      ];
    }
    if (name.includes("engine") || name.includes("diesel")) {
      return [
        {
          key: "engineOilLevel",
          label: "Engine Oil & Fluid Level",
          options: ["Normal", "Low", "Critical Low"],
        },
        {
          key: "engineOilLeak",
          label: "Oil & Coolant Leakage",
          options: ["Pass", "Minor Seepage", "Severe Leak"],
        },
        {
          key: "exhaustBlowby",
          label: "Exhaust & Crankcase Blowby",
          options: ["Normal", "Black Smoke", "Severe Blowby"],
        },
      ];
    }
    if (name.includes("brake")) {
      return [
        {
          key: "padWear",
          label: "Brake Lining / Pad Wear",
          options: [
            "Normal (80%+)",
            "Moderate (40-70%)",
            "Critical Wear (<20%)",
          ],
        },
        {
          key: "fluidLevel",
          label: "Brake Fluid Level",
          options: ["Normal", "Low", "Critical Low"],
        },
        {
          key: "leakageInspection",
          label: "Hydraulic Line Leakage",
          options: ["Pass", "Minor Seepage", "Severe Leak"],
        },
      ];
    }
    if (name.includes("hydraulic") || name.includes("pump")) {
      return [
        {
          key: "fluidLevel",
          label: "Hydraulic Fluid Level",
          options: ["Normal", "Low", "Critical Low"],
        },
        {
          key: "hoseInspection",
          label: "Hose & Fitting Inspection",
          options: ["Pass", "Minor Sweating", "Severe Leak/Burst"],
        },
        {
          key: "valveOperation",
          label: "Control Valve Operation",
          options: ["Normal", "Sluggish", "Failed/Stuck"],
        },
      ];
    }
    if (name.includes("tyre") || name.includes("tire")) {
      return [
        {
          key: "treadWear",
          label: "Tread Wear Condition",
          options: ["Normal", "Uneven Wear", "Severe Wear/Smooth"],
        },
        {
          key: "sidewallCut",
          label: "Sidewall & Bead Damage",
          options: ["Pass", "Minor Cut/Bulge", "Severe Cut/Damage"],
        },
        {
          key: "rimTorque",
          label: "Rim & Wheel Nut Torque",
          options: ["Normal", "Loose Nuts", "Rim Damage"],
        },
      ];
    }

    return [
      {
        key: "fluidLevel",
        label: "Fluid & Oil Level",
        options: ["Normal", "Low", "Critical Low"],
      },
      {
        key: "leakageInspection",
        label: "Leakage Inspection",
        options: ["Pass", "Minor", "Severe"],
      },
      {
        key: "mechanicalCondition",
        label: "Mechanical Condition",
        options: ["Normal", "Warning", "Failed"],
      },
    ];
  };

  // Field change handler for dynamic readings
  const handleReadingChange = (
    tabName: string,
    fieldKey: string,
    value: string,
  ) => {
    setReadingsState((prev) => ({
      ...prev,
      [tabName]: {
        ...(prev[tabName] || {}),
        [fieldKey]: value,
      },
    }));
  };

  // Preset Template Quick Loader
  const handleApplyPresetTemplate = (preset: typeof PRESET_COMPONENT_TEMPLATES[0]) => {
    setNewCompName(preset.name);
    setNewCompCategory(preset.category);
    setNewCompParams(
      preset.parameters.map((p) => ({
        name: p.name,
        unit: p.unit,
        safeMin: p.safeMin,
        safeMax: p.safeMax,
        defaultVal: p.defaultVal,
        description: p.description || "",
      }))
    );
    setCompFormError("");
  };

  // Add custom parameter row
  const handleAddParamRow = () => {
    setNewCompParams((prev) => [
      ...prev,
      {
        name: "",
        unit: "Bar",
        safeMin: 100,
        safeMax: 300,
        defaultVal: 200,
        description: "",
      },
    ]);
  };

  // Remove parameter row
  const handleRemoveParamRow = (index: number) => {
    setNewCompParams((prev) => prev.filter((_, i) => i !== index));
  };

  // Update parameter row field
  const handleUpdateParamField = (index: number, field: string, value: any) => {
    setNewCompParams((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  // Save new custom component to selected machine
  const handleSaveNewComponent = async () => {
    if (!selectedMachine) {
      setCompFormError("Please select a machine first.");
      return;
    }

    // Check if machine is marked as owned by company
    const isAssigned = companyFleet.some(
      (fm) =>
        (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
        (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
        (fm.id && fm.id === selectedMachine?.id)
    );

    if (!isAssigned) {
      setCompFormError(`⚠️ Machine is not marked as owned yet! Please click "⭐ Mark as Owned" on the machine header before adding custom components.`);
      return;
    }

    // Auto-fallback: if user didn't type component name, use first parameter name or 'Custom Component'
    const effectiveCompName = newCompName.trim() || newCompParams[0]?.name.trim() || "Custom Component";

    if (newCompParams.length === 0) {
      setCompFormError("Please add at least 1 inspection parameter.");
      return;
    }

    for (const p of newCompParams) {
      if (!p.name.trim()) {
        setCompFormError("All parameter rows must have a valid parameter name.");
        return;
      }
      if (Number(p.safeMin) >= Number(p.safeMax)) {
        setCompFormError(`For parameter '${p.name}', Safe Min (${p.safeMin}) must be strictly less than Safe Max (${p.safeMax}).`);
        return;
      }
    }

    const newComponent: SpecComponent = {
      name: effectiveCompName,
      category: "Equipment Component",
      parameters: newCompParams.map((p) => ({
        name: p.name.trim(),
        unit: p.unit.trim() || "Units",
        safeMin: Number(p.safeMin),
        safeMax: Number(p.safeMax),
        defaultVal: Number(p.defaultVal ?? p.safeMin),
        description: p.description || "",
      })),
    };

    // 1. Save to Backend Database API for this company & machine
    try {
      const user = StorageService.getUser();
      const companyId = user?.companyId || user?.company_id || selectedMachine.companyId || "";
          await apiRequest('/machines/custom-components', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          machineId: selectedMachine.id || selectedMachine.serialNumber,
          modelName: selectedMachine.model || selectedMachine.name,
          equipmentType: selectedMachine.category || selectedMachine.equipmentType,
          name: effectiveCompName,
          category: "Equipment Component",
          parameters: newComponent.parameters,
        }),
      });
    } catch (apiErr) {
      console.warn("Notice: Custom component backend sync:", apiErr);
    }

    // 2. Save to machine-specific company local storage
    saveCustomComponentForMachine(selectedMachine, newComponent);

    // 3. Update active component list
    setSpecComponents((prev) => {
      const exists = prev.some((c) => c.name.toLowerCase() === newComponent.name.toLowerCase());
      if (exists) {
        return prev.map((c) => (c.name.toLowerCase() === newComponent.name.toLowerCase() ? newComponent : c));
      }
      return [...prev, newComponent];
    });

    // 4. Initialize parameter values
    setParamInputs((prev) => ({

      ...prev,
      [newComponent.name]: newComponent.parameters.reduce((acc, p) => {
        acc[p.name] = String(p.defaultVal);
        return acc;
      }, {} as Record<string, string>),
    }));

    setActiveTab(newComponent.name);
    setIsAddComponentModalOpen(false);
    setNewCompName("");
    setCompFormError("");
    setSuccessMsg(`✓ Added component "${newComponent.name}" to ${selectedMachine.name || selectedMachine.model}! You can now inspect and record daily parameters.`);
  };


  // Field change handler for dynamic checklist
  const handleChecklistChange = (
    tabName: string,
    fieldKey: string,
    value: string,
  ) => {
    setChecklistState((prev) => ({
      ...prev,
      [tabName]: {
        ...(prev[tabName] || {}),
        [fieldKey]: value,
      },
    }));

  }

  const fetchMachineExistingData = async (mId: string) => {
    if (!mId) return;
    try {
      const res: any = await apiRequest(`/machines/${mId}/manual-data`);
      const payload = res?.data || res;
      if (payload?.machine) {
        setSelectedMachine((prev) => prev ? {
          ...prev,
          healthScore: payload.machine.healthScore,
          status: payload.machine.status
        } : prev);

        // Instantly update Company Fleet Registry table state without manual refresh
        setCompanyFleet((prevFleet) =>
          prevFleet.map((fm) =>
            fm.id === mId || (fm.serialNumber && payload.machine.serialNumber && fm.serialNumber === payload.machine.serialNumber) || (fm.model && payload.machine.model && fm.model.toLowerCase() === payload.machine.model.toLowerCase())
              ? {
                  ...fm,
                  healthScore: payload.machine.healthScore,
                  status: payload.machine.status
                }
              : fm
          )
        );

        // Also update machines catalog list state
        setMachines((prevMachines) =>
          prevMachines.map((m) =>
            m.id === mId || (m.serialNumber && payload.machine.serialNumber && m.serialNumber === payload.machine.serialNumber)
              ? {
                  ...m,
                  healthScore: payload.machine.healthScore,
                  status: payload.machine.status
                }
              : m
          )
        );
      }
      fetchAllHistoryLogs();
      fetchCompanyFleet();
    } catch (err) {
      console.error("Error fetching machine inspection data:", err);
    }

  };

  const fetchAllHistoryLogs = async () => {
    setLoadingHistory(true);
    try {
      const compId = currentUser?.companyId || StorageService.getCompanyId() || "";
      const res: any = await apiRequest(`/machines/all/inspection-history?companyId=${encodeURIComponent(compId)}`);
      const payload = res?.data || res;
      if (payload && payload.historyLogs) {
        // Enforce company boundary & STRICT SUPER ADMIN EXCLUSION:
        // Company Admin must NEVER see Super Admin records
        const filtered = payload.historyLogs.filter((l: HistoryLog) => {
          const role = String(l.userRole || "").toLowerCase();
          if (role.includes("super")) return false;
          if (compId && l.companyId && l.companyId !== compId) return false;
          return true;
        });
        setHistoryLogs(filtered);
      }
    } catch (err) {
      console.error("Error fetching company history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };


  const updateCustomFieldName = (tabName: string, id: string, name: string) => {
    setCustomFieldsState((prev) => ({
      ...prev,
      [tabName]: (prev[tabName] || []).map((f) =>
        f.id === id ? { ...f, name } : f,
      ),
    }));
  };

  const updateCustomFieldValue = (
    tabName: string,
    id: string,
    value: string,
  ) => {
    setCustomFieldsState((prev) => ({
      ...prev,
      [tabName]: (prev[tabName] || []).map((f) =>
        f.id === id ? { ...f, value } : f,
      ),
    }));
  }

  const fetchHistoryLogs = async (mId: string) => {
    fetchAllHistoryLogs();
  };

  const handleDeleteHistoryLog = (logId: string, logCompName: string) => {
    setDeletingLogTarget({ id: logId, name: logCompName });

  };

  const confirmDeleteHistoryLog = async () => {
    if (!deletingLogTarget) return;
    setIsDeletingLog(true);
    try {
      await apiRequest(`/machines/inspection-history/${encodeURIComponent(deletingLogTarget.id)}`, {
        method: "DELETE",
      });
      showToast(`✓ Inspection record for "${deletingLogTarget.name}" deleted successfully.`, "info");
      setDeletingLogTarget(null);
      fetchAllHistoryLogs();
    } catch (err: any) {
      console.error("Failed to delete audit log:", err);
      showToast(err?.message || "Failed to delete inspection log", "error");
    } finally {
      setIsDeletingLog(false);
    }
  };

  const handleInputChange = (compName: string, paramName: string, value: string) => {
    setParamInputs((prev) => ({
      ...prev,
      [compName]: {
        ...(prev[compName] || {}),
        [paramName]: value,
      },
    }));
  };


  // Get current reading value for field
  const getReadingValue = (
    tabName: string,
    fieldKey: string,
    defaultVal: string,
  ) => {
    return readingsState[tabName]?.[fieldKey] !== undefined
      ? readingsState[tabName][fieldKey]
      : defaultVal;
  };

  // Get current checklist value for field
  const getChecklistValue = (
    tabName: string,
    fieldKey: string,
    defaultVal: string,
  ) => {
    return checklistState[tabName]?.[fieldKey] !== undefined
      ? checklistState[tabName][fieldKey]
      : defaultVal;

  }


  const getParamValidationStatus = (param: SpecParameter, rawVal: string | undefined) => {
    if (rawVal === undefined || rawVal === "") return { status: "normal", msg: "Default standard" };
    const num = parseFloat(rawVal);
    if (isNaN(num)) return { status: "invalid", msg: "Invalid number format" };

    if (num < param.safeMin) {
      const delta = param.safeMin - num;
      const span = param.safeMax - param.safeMin || 1;
      if (delta / span > 0.25 || num <= 0) {
        return { status: "critical-low", msg: `🔴 Critical Low (Below ${param.safeMin} ${param.unit})` };
      }
      return { status: "warning-low", msg: `🟡 Low (Safe: ${param.safeMin} - ${param.safeMax})` };
    }

    if (num > param.safeMax) {
      const delta = num - param.safeMax;
      const span = param.safeMax - param.safeMin || 1;
      if (delta / span > 0.25) {
        return { status: "critical-high", msg: `🔴 Critical High (Exceeds ${param.safeMax} ${param.unit})` };
      }
      return { status: "warning-high", msg: `🟡 High (Safe: ${param.safeMin} - ${param.safeMax})` };
    }

    return { status: "healthy", msg: `🟢 In Safe Range (${param.safeMin} - ${param.safeMax} ${param.unit})` };

  };

  // Action: Load Historical Log into Form for Editing
  const handleEditFromHistory = async (log: HistoryLog) => {
    const targetMachine = machines.find(
      (m) =>
        m.id === log.machineId ||
        m.machineId === log.machineId ||
        (log.modelName && m.model && m.model.toLowerCase() === log.modelName.toLowerCase()) ||
        (log.machineName && m.name && m.name.toLowerCase().includes(log.machineName.toLowerCase()))
    );

    if (targetMachine) {
      setSelectedMachine(targetMachine);
      if (targetMachine.category || targetMachine.equipmentType) {
        setSelectedCategory(targetMachine.category || targetMachine.equipmentType || "ALL");
      }
      if (targetMachine.brand || targetMachine.manufacturer) {
        setSelectedBrand(targetMachine.brand || targetMachine.manufacturer || "ALL");
      }

      setLoadingSpecs(true);
      const typeStr = targetMachine.equipmentType || targetMachine.category || targetMachine.model || "Truck";
      const user = StorageService.getUser();
      const companyId = user?.companyId || user?.company_id || targetMachine.companyId || "";
      try {
        const res: any = await apiRequest(
          `/machines/spec-template?equipmentType=${encodeURIComponent(typeStr)}&modelName=${encodeURIComponent(targetMachine.model || "")}&companyId=${encodeURIComponent(companyId)}&machineId=${encodeURIComponent(targetMachine.id || targetMachine.serialNumber || "")}`
        );
        const templateData = res?.data || res;
        if (templateData && templateData.components) {
          setSpecComponents(templateData.components);
        }
      } catch (err) {
        console.error("Failed to load template on edit:", err);
      } finally {
        setLoadingSpecs(false);
      }
    }

    if (log.componentName) {
      setActiveTab(log.componentName);
    }

    let fields: any[] = [];
    if (Array.isArray(log.currentParameters)) fields = log.currentParameters;
    else if (Array.isArray(log.parameters)) fields = log.parameters;
    else if (log.parameters?.customFields) fields = log.parameters.customFields;

    if (fields.length > 0) {
      setParamInputs((prev) => {
        const next = { ...prev };
        next[log.componentName] = { ...(next[log.componentName] || {}) };
        fields.forEach((f: any) => {
          if (f && f.name) {
            next[log.componentName][f.name] = String(f.value !== undefined ? f.value : "");
          }
        });
        return next;
      });
    }

    setSuccessMsg(`✏️ Loaded inspection record for ${log.componentName} (${log.machineName || log.modelName}) into form. You can now modify values and recalculate health.`);

    if (inspectionSectionRef.current) {
      inspectionSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 400, behavior: "smooth" });
    }
  };

  // Handle Save Inspection
  const handleSaveInspection = async () => {
    if (!selectedMachine || !activeTab) return;

    // Verify company ownership before saving inspection record
    const isAssigned = companyFleet.some(
      (fm) =>
        (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
        (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
        (fm.id && fm.id === selectedMachine?.id)
    );

    if (!isAssigned) {
      showToast(`Please mark "${formatCleanModelName(selectedMachine)}" as owned ("⭐ Mark as Owned") first before saving inspection logs.`, "warning");
      return;
    }

    setSubmitting(true);
    setSuccessMsg("");

    const currentTabInputs = paramInputs[activeTab] || {};
    const activeSpec = specComponents.find((c) => c.name === activeTab);

    const customFields = Object.entries(currentTabInputs).map(([name, value]) => {
      const paramMeta = activeSpec?.parameters.find((p) => p.name === name);
      return {
        name,
        value,
        safeMin: paramMeta?.safeMin,
        safeMax: paramMeta?.safeMax,
        unit: paramMeta?.unit || "",
        description: paramMeta?.description || "",
      };
    });

    try {
      const payload = {
        componentCategory: activeTab,
        componentName: activeTab,
        customFields,
        brand: selectedMachine.brand || selectedMachine.manufacturer || "",
        category: selectedMachine.equipmentType || selectedMachine.category || "",
        modelName: selectedMachine.model || selectedMachine.modelName || "",
        serialNumber: selectedMachine.serialNumber || "",
        machineName: selectedMachine.name || selectedMachine.model || "",
        companyId: currentUser.companyId,
        companyName: currentUser.companyName,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        userEmail: currentUser.email,
      };

      const targetId = selectedMachine.id || selectedMachine.machineId;
      if (!targetId) {
        throw new Error("Selected machine ID is required");
      }

      const response: any = await machineService.saveManualInspectionData(
        targetId,
        payload,
      );
      const data = response?.data || response;
      const componentHealth = data?.componentHealth || data?.component || null;
      const machineHealth = data?.machineHealth || data?.machine || null;
      const healthScore = componentHealth?.healthScore ?? null;
      const machineScore = machineHealth?.overallMachineHealth ?? machineHealth?.healthScore ?? null;
      const machineStatus = machineHealth?.machineStatus ?? machineHealth?.status ?? null;

      if (healthScore !== null) {
        setComponentHealthMap((prev) => ({
          ...prev,
          [activeComponentTab]: {
            healthScore,
            status: componentHealth?.status || "",
          },
        }));
      }

      setHealthResult(data);

      if (machineScore !== null || machineStatus) {
        setSelectedMachine((prev) =>
          prev
            ? { ...prev, healthScore: machineScore ?? prev.healthScore, status: machineStatus ?? prev.status }
            : prev,
        );
        setCompanyFleet((prevFleet) =>
          prevFleet.map((fleetMachine) =>
            fleetMachine.id === targetId
              ? { ...fleetMachine, healthScore: machineScore ?? fleetMachine.healthScore, status: machineStatus ?? fleetMachine.status }
              : fleetMachine,
          ),
        );
      }

      setSuccessMsg(response?.message || "Inspection data saved successfully.");
      await fetchMachineExistingData(targetId);
      await fetchCompanyFleet();
    } catch (err: any) {
      console.error("Failed to save inspection:", err);
      showErrorToast(err?.message || "Failed to save inspection readings");
    } finally {
      setSubmitting(false);
    }
  };


  // Handle Save All Components in ONE single consolidated inspection call
  const handleSaveAllComponents = async () => {
    if (!selectedMachine || specComponents.length === 0) return;

    const isAssigned = companyFleet.some(
      (fm) =>
        (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
        (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
        (fm.id && fm.id === selectedMachine?.id)
    );

    if (!isAssigned) {
      showToast(`Please mark "${formatCleanModelName(selectedMachine)}" as owned ("⭐ Mark as Owned") first before saving inspection logs.`, "warning");
      return;
    }

    setSubmitting(true);
    setSuccessMsg("");

    try {
      const targetId = selectedMachine.id || selectedMachine.machineId || "heh-cat-777";

      const componentsPayload = specComponents.map((comp) => {
        const compInputs = paramInputs[comp.name] || {};
        const customFields = comp.parameters.map((param) => {
          const val = compInputs[param.name] !== undefined ? compInputs[param.name] : String(param.defaultVal);
          return {
            name: param.name,
            value: val,
            safeMin: param.safeMin,
            safeMax: param.safeMax,
            unit: param.unit || "",
            description: param.description || "",
          };
        });

        return {
          componentCategory: comp.category || comp.name,
          componentName: comp.name,
          customFields,
        };
      });

      const payload = {
        components: componentsPayload,
        brand: selectedMachine.brand || selectedBrand || "Caterpillar",
        category: selectedMachine.equipmentType || selectedCategory || "General",
        modelName: selectedMachine.model || selectedMachine.modelName || selectedMachine.name || "",
        serialNumber: selectedMachine.serialNumber || "SN-AUTO-001",
        machineName: selectedMachine.name || selectedMachine.model || "",
        companyId: currentUser?.companyId || StorageService.getCompanyId() || "",
        companyName: currentUser?.companyName || "HME Mining Corp",
        userId: currentUser?.id || null,
        userName: currentUser?.name || "Company Admin",
        userRole: currentUser?.role || "COMPANY_ADMIN",
        userEmail: currentUser?.email || "admin@hmemining.com",
      };

      const res: any = await apiRequest(`/machines/${targetId}/manual-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = res?.data || res;

      const overallHealth = data?.machineHealth?.overallMachineHealth ?? null;
      const machineStatus = data?.machineHealth?.machineStatus ?? null;

      if (overallHealth !== null && machineStatus !== null) {
        setSelectedMachine((prev) => prev ? {
          ...prev,
          healthScore: overallHealth,
          status: machineStatus
        } : prev);

        setCompanyFleet((prevFleet) =>
          prevFleet.map((fm) =>
            fm.id === targetId || (selectedMachine?.serialNumber && fm.serialNumber === selectedMachine.serialNumber)
              ? {
                  ...fm,
                  healthScore: overallHealth,
                  status: machineStatus
                }
              : fm
          )

        );
      }

      setSuccessMsg(
        ` Saved all ${specComponents.length} components in 1 single consolidated inspection log! Overall Machine Health: ${overallHealth}% (${machineStatus}).`
      );
      
      fetchMachineExistingData(targetId);
      fetchCompanyFleet();
    } catch (err: any) {

      console.error("Error submitting manual data:", err);
      showErrorToast(
        `Error submitting inspection: ${err?.message || "Server Communication Error"}`,
      );

      console.error("Failed to save all components:", err);
      alert(err?.message || "Failed to save all inspection readings");

    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (statusStr: string, score: number | null) => {
    if (score === null || statusStr === "Not Inspected") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Clock size={13} />
          Not Inspected
        </span>
      );
    }

    const s = String(statusStr || "").toLowerCase();
    if (s.includes("crit") || (score !== null && score < 50)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3.5 py-1 text-xs font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          <XCircle size={13} />
          {score}% Critical
        </span>
      );
    }
    if (s.includes("warn") || (score !== null && score < 85)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300">
          <AlertTriangle size={13} />
          {score}% Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 size={13} />
        {score}% Healthy
      </span>
    );
  };

  const activeCompSpec = specComponents.find((c) => c.name === activeTab);

   if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageMeta title="Inspection Data Entry" description="Manual component inspection data entry" />
      <h1 className="text-2xl font-bold mb-4">Inspection Data Entry</h1>
      <p className="text-slate-500">
        Selected Machine: {selectedMachine ? formatCleanModelName(selectedMachine) : "None selected"}
      </p>
    </div>
  );
}
