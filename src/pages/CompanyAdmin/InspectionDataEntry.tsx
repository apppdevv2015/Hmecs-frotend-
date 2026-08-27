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
  const machineKey = m.id || m.serialNumber || m.machineId || m.name || m.model;
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
        description: comp.description,
      }),
    }, { showError: false }).catch(() => null);

    const machineKey = m.id || m.serialNumber || m.machineId || m.name || m.model;
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

  // Fetch Company Registered Fleet
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
        data: {
          companyId: compId,
          modelName: m.model || m.name,
          brand: m.brand || m.manufacturer,
          category: m.equipmentType || m.category,
          name: m.name || m.model,
          serialNumber: m.serialNumber,
        },
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

  // Active Source Machines depending on Fleet Mode
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
  }, [selectedMachine, historyLogs]);

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

    fetchMachineExistingData(m.id || m.machineId || "heh-cat-777");
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
        data: {
          companyId,
          machineId: selectedMachine.id || selectedMachine.serialNumber,
          modelName: selectedMachine.model || selectedMachine.name,
          equipmentType: selectedMachine.category || selectedMachine.equipmentType,
          name: effectiveCompName,
          category: "Equipment Component",
          parameters: newComponent.parameters,
        },
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

  // Evaluate parameter status live for the UI card
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

      const targetId = selectedMachine.id || selectedMachine.machineId || "heh-cat-777";
      const res: any = await apiRequest(`/machines/${targetId}/manual-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = res?.data || res;

      setHealthResult(data?.componentHealth || data?.health || data);
      
      const compScore = data?.componentHealth?.healthScore ?? data?.component?.healthScore ?? 100;
      const compStatus = data?.componentHealth?.status || "Healthy";
      const overallHealth = data?.machineHealth?.overallMachineHealth ?? data?.machine?.healthScore ?? null;
      const machineStatus = data?.machineHealth?.machineStatus ?? data?.machine?.status ?? null;
      const actionType = data?.actionType === "INITIAL_INSPECTION" ? "New Entry Created" : "Routine Update Logged";

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
        `✅ ${actionType} for ${activeTab}! Status: ${compStatus} (${compScore}%). Saved to PostgreSQL Audit Log & Component Health Database.`
      );
      
      fetchMachineExistingData(targetId);
      fetchCompanyFleet();
    } catch (err: any) {
      console.error("Failed to save inspection:", err);
      alert(err?.message || "Failed to save inspection readings");
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
        `✅ Saved all ${specComponents.length} components in 1 single consolidated inspection log! Overall Machine Health: ${overallHealth}% (${machineStatus}).`
      );
      
      fetchMachineExistingData(targetId);
      fetchCompanyFleet();
    } catch (err: any) {
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
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin dark:border-blue-950 dark:border-t-blue-400" />
          <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Truck size={24} className="animate-pulse" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Loading Company Equipment Database...
          </h3>
          <p className="text-xs font-medium text-slate-500 max-w-sm">
            Fetching 9,742+ Machines, 55 Categories &amp; 91 Brands from PostgreSQL Master Equipment Catalog
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Company Equipment Machine Health & Inspection Audit Log | Company Admin"
        description="Company Equipment Specs Database & Health Center"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header Title Banner */}
        <div className="flex flex-col gap-4 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <Building2 size={13} />
                {currentUser?.companyName || "HME Mining Operations"} ({machines.length} Total Machines)
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Machine Health &amp; Inspection Audit Trail
            </h1>
            <p className="text-sm font-medium text-slate-300 max-w-2xl">
              Select Category, Brand and Model to inspect components. Every save/update permanently creates a timestamped Audit Log in PostgreSQL with company, user, parameter changes &amp; health scores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectedMachine) {
                  fetchHistoryLogs(selectedMachine.id || selectedMachine.machineId || "heh-cat-777");
                  setIsHistoryModalOpen(true);
                }
              }}
              disabled={!selectedMachine}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md border border-white/20 transition hover:bg-white/20 disabled:opacity-50"
            >
              <History size={16} />
              View Full Audit History ({historyLogs.length})
            </button>
          </div>
        </div>

        {/* 3-Tier Cascading Category, Brand & Machine Downward Selection Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] space-y-5">
          
          {/* DIRECT GLOBAL EQUIPMENT SEARCH BAR */}
          <div className="relative space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Search size={14} className="text-blue-500" />
                Quick Search Equipment (9,742+ Machines in Database):
              </label>
              {globalSearch && (
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {globalSearchResults.length} matching results
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setIsGlobalSearchFocused(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsGlobalSearchFocused(true);
                }}
                placeholder="Type machine name, model, brand, or serial number (e.g. Caterpillar 777, Komatsu PC8000, SN-CAT-101)..."
                className="w-full rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 pl-11 pr-10 py-3 text-sm font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-blue-600/40 dark:bg-[#10223b]/60 dark:text-white dark:focus:bg-[#0a1628]"
              />
              <Search size={18} className="absolute left-4 top-3.5 text-blue-500" />

              {globalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch("");
                    setIsGlobalSearchFocused(false);
                  }}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              )}

              {/* Instant Search Results Dropdown */}
              {isGlobalSearchFocused && globalSearch.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[99999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[380px] overflow-y-auto space-y-1.5">
                  <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-extrabold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <span>Search Results ({globalSearchResults.length})</span>
                    <button
                      type="button"
                      onClick={() => setIsGlobalSearchFocused(false)}
                      className="text-blue-500 hover:underline"
                    >
                      Close
                    </button>
                  </div>

                  {globalSearchResults.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-slate-400">
                      No machines found matching &quot;{globalSearch}&quot;
                    </div>
                  ) : (
                    globalSearchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectFromGlobalSearch(m)}
                        className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs font-extrabold transition ${
                          selectedMachine?.id === m.id
                            ? "bg-blue-600 text-white"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold truncate text-sm">
                              {m.name || m.model}
                            </span>
                            <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {m.brand}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-70 font-medium mt-0.5">
                            Category: {m.equipmentType || m.category} • Serial: {m.serialNumber}
                          </p>
                        </div>

                        <ChevronRight size={16} className={selectedMachine?.id === m.id ? "text-white" : "text-slate-400"} />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="flex-shrink mx-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Or Filter By Hierarchy
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-3">
            
            {/* STEP 1: Category Dropdown */}
            <div className="relative space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Filter size={14} />
                STEP 1: Select Category ({categoriesList.length}):
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsCatDropdownOpen(!isCatDropdownOpen);
                  setIsBrandDropdownOpen(false);
                  setIsMachineDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border-2 border-blue-500/50 bg-blue-50/60 px-4 py-3 text-left text-sm font-black text-slate-900 shadow-sm transition hover:border-blue-600 focus:outline-none dark:border-blue-600/50 dark:bg-[#10223b] dark:text-white"
              >
                <span className="truncate">
                  {selectedCategory === "ALL"
                    ? `🌐 All Categories (${machines.length})`
                    : `🚜 ${selectedCategory}`}
                </span>
                <ChevronDown size={18} className={`text-blue-600 dark:text-blue-400 transition-transform ${isCatDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* ALWAYS DOWNWARD Expanding Menu */}
              {isCatDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[99999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[380px] overflow-y-auto space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search 55 categories..."
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => handleCategoryChange("ALL")}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                        selectedCategory === "ALL"
                          ? "bg-blue-600 text-white"
                          : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>🌐 All Categories</span>
                      <span className="text-[10px] font-bold opacity-80">{machines.length}</span>
                    </button>

                    {filteredCategoryOptions.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => handleCategoryChange(cat.name)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                          selectedCategory.toLowerCase() === cat.name.toLowerCase()
                            ? "bg-blue-600 text-white"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="truncate">🚜 {cat.name}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300 ml-2">
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Custom Brand Dropdown */}
            <div className="relative space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Tag size={14} />
                STEP 2: Select Brand ({brandsList.length} Brands):
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsBrandDropdownOpen(!isBrandDropdownOpen);
                  setIsCatDropdownOpen(false);
                  setIsMachineDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border-2 border-indigo-500/40 bg-indigo-50/50 px-4 py-3 text-left text-sm font-extrabold text-slate-900 shadow-sm transition hover:border-indigo-600 focus:outline-none dark:border-indigo-600/40 dark:bg-[#151b36] dark:text-white"
              >
                <span className="truncate">
                  {selectedBrand === "ALL"
                    ? `🏷️ All Brands (${brandsList.length})`
                    : `🏷️ ${selectedBrand}`}
                </span>
                <ChevronDown size={18} className={`text-indigo-600 dark:text-indigo-400 transition-transform ${isBrandDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* ALWAYS DOWNWARD Expanding Menu */}
              {isBrandDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[99999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[380px] overflow-y-auto space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search brands (Caterpillar, Komatsu...)"
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      onClick={() => handleBrandChange("ALL")}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                        selectedBrand === "ALL"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>🏷️ All Brands</span>
                      <span className="text-[10px] font-bold opacity-80">{machines.length}</span>
                    </button>

                    {filteredBrandOptions.map((brand) => (
                      <button
                        key={brand.name}
                        onClick={() => handleBrandChange(brand.name)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                          selectedBrand.toLowerCase() === brand.name.toLowerCase()
                            ? "bg-indigo-600 text-white"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="truncate">🏷️ {brand.name}</span>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 ml-2">
                          {brand.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: Machine Model Dropdown */}
            <div className="relative space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Truck size={14} />
                STEP 3: Select Model ({filteredMachines.length} Models):
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsMachineDropdownOpen(!isMachineDropdownOpen);
                  setIsCatDropdownOpen(false);
                  setIsBrandDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-extrabold text-slate-900 shadow-sm transition hover:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                <span className="truncate">
                  {selectedMachine ? `🛠️ ${selectedMachine.name || selectedMachine.model}` : "Select a Machine Model"}
                </span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${isMachineDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* ALWAYS DOWNWARD Expanding Menu */}
              {isMachineDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[99999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[380px] overflow-y-auto space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search machine model, serial number..."
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="space-y-1 pt-1">
                    {filteredMachines.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMachine(m)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                          selectedMachine?.id === m.id
                            ? "bg-blue-600 text-white"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-extrabold truncate">{m.name || m.model}</p>
                          <p className="text-[10px] opacity-70 font-medium">{m.equipmentType || m.category} • {m.serialNumber}</p>
                        </div>
                        <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200 ml-2">
                          {m.brand}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Selection Details Strip */}
          {selectedMachine && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs dark:border-blue-900/40 dark:bg-[#0c1a2e]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2 text-white shadow-md">
                  <Truck size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {selectedMachine.name || selectedMachine.model}
                    </span>
                    <span className="rounded-md bg-blue-200/80 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                      Category: {selectedMachine.equipmentType || selectedMachine.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Source: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedMachine.sourceCatalog}</span> • Model: {selectedMachine.model} • Serial: {selectedMachine.serialNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* 1-Click Fleet Assignment Button / Status Badge */}
                {(() => {
                  const isAssigned = companyFleet.some(
                    (fm) =>
                      (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
                      (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
                      (fm.id && fm.id === selectedMachine?.id)
                  );

                  if (isAssigned) {
                    return (
                      <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <CheckCircle2 size={15} />
                        <span>✓ Owned by Company</span>
                        <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] uppercase font-black text-emerald-800 dark:text-emerald-300 ml-1">Assigned</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => handleAddToCompanyFleet(selectedMachine)}
                      disabled={addingToFleet}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      <Building2 size={15} />
                      <span>{addingToFleet ? "Marking..." : "⭐ Mark as Owned"}</span>
                    </button>
                  );
                })()}

                <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">
                    Overall Health
                  </span>
                  <div>
                    {getStatusBadge(selectedMachine.status || "Not Inspected", selectedMachine.healthScore ?? null)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Components Inspection & Diagnostics Matrix */}
        {selectedMachine && (
          <div ref={inspectionSectionRef} className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            
            {/* Left Sidebar: Components Navigation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] space-y-3 lg:col-span-1">
              <div className="px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} />
                  Installed Components ({specComponents.length})
                </span>
              </div>

              {loadingSpecs ? (
                <div className="space-y-2 p-2">
                  <div className="h-10 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
                  <div className="h-10 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
                  <div className="h-10 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {specComponents.map((comp) => {
                    const isActive = activeTab === comp.name;
                    const healthInfo = compHealthMap[comp.name];

                    return (
                      <button
                        key={comp.name}
                        onClick={() => {
                          setActiveTab(comp.name);
                          setSuccessMsg("");
                          setHealthResult(null);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-extrabold transition ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="truncate flex-1">
                          <p className="truncate font-bold">{comp.name}</p>
                          <span className={`text-[10px] font-bold ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                            {comp.category} • {comp.parameters?.length || 0} params
                          </span>
                        </div>

                        {healthInfo ? (
                          <span className={`ml-2 shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black shadow-sm ${
                            isActive
                              ? "bg-white/20 text-white"
                              : healthInfo.healthScore < 50
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                              : healthInfo.healthScore < 85
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}>
                            {healthInfo.healthScore}%
                          </span>
                        ) : (
                          <ChevronRight size={14} className={isActive ? "text-white" : "text-slate-400 shrink-0"} />
                        )}
                      </button>
                    );
                  })}

                  {/* Add Component Dotted Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const isAssigned = companyFleet.some(
                        (fm) =>
                          (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
                          (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
                          (fm.id && fm.id === selectedMachine?.id)
                      );

                      if (!isAssigned) {
                        showToast(`Machine is not marked as owned yet! Please click "⭐ Mark as Owned" above to assign to your company fleet.`, "warning");
                        return;
                      }

                      setCompFormError("");
                      setIsAddComponentModalOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 p-2.5 text-xs font-extrabold text-blue-600 hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-blue-950/20 transition mt-2"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    + Add Custom Component
                  </button>
                </div>
              )}
            </div>

            {/* Right Pane: Component Parameters Inspection Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] lg:col-span-3 space-y-6">
              {loadingSpecs ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center space-y-3">
                  <Loader2 size={32} className="text-blue-600 animate-spin dark:text-blue-400" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Loading Factory Specifications &amp; Parameters for {selectedMachine.model || selectedMachine.name}...
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                    <div>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {activeCompSpec?.category || "Component"}
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {activeTab} Inspection Parameters
                      </h3>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        📋 Heavy Equipment Hub Factory Standard Specs Pre-Loaded
                      </span>
                    </div>
                  </div>

                  {/* Success Banner */}
                  {successMsg && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span>{successMsg}</span>
                      <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:underline">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Pre-populated Parameter Input Fields with Live Range Validation */}
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {activeCompSpec?.parameters.map((param) => {
                      const currentValue = paramInputs[activeTab]?.[param.name] ?? String(param.defaultVal);
                      const validation = getParamValidationStatus(param, currentValue);

                      const isCrit = validation.status.includes("critical");
                      const isWarn = validation.status.includes("warning");

                      return (
                        <div
                          key={param.name}
                          className={`rounded-xl border p-4 transition ${
                            isCrit
                              ? "border-red-400 bg-red-50/50 dark:border-red-800/80 dark:bg-red-950/30"
                              : isWarn
                              ? "border-amber-400 bg-amber-50/50 dark:border-amber-800/80 dark:bg-amber-950/30"
                              : "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-[#101f33]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                              {param.name}
                            </label>
                            <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                              Unit: {param.unit}
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {param.description}
                          </p>

                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => handleInputChange(activeTab, param.name, e.target.value)}
                              className={`w-full rounded-xl border px-3.5 py-2 text-sm font-black shadow-sm focus:outline-none ${
                                isCrit
                                  ? "border-red-500 bg-white text-red-900 focus:ring-2 focus:ring-red-500/30 dark:bg-[#150a0a] dark:text-red-200"
                                  : isWarn
                                  ? "border-amber-500 bg-white text-amber-900 focus:ring-2 focus:ring-amber-500/30 dark:bg-[#1a1205] dark:text-amber-200"
                                  : "border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-[#081324] dark:text-white"
                              }`}
                            />
                          </div>

                          {/* Live Range Feedback */}
                          <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-500">
                              Safe: <strong className="text-indigo-600 dark:text-indigo-400">{param.safeMin} – {param.safeMax} {param.unit}</strong>
                            </span>
                            <span className={isCrit ? "text-red-600 font-extrabold" : isWarn ? "text-amber-600 font-extrabold" : "text-emerald-600"}>
                              {validation.msg}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save & Calculate Action */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                    {(() => {
                      const isAssigned = companyFleet.some(
                        (fm) =>
                          (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
                          (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
                          (fm.id && fm.id === selectedMachine?.id)
                      );

                      if (!isAssigned) {
                        return (
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={15} />
                            <span>Preview Mode: Click &quot;⭐ Mark as Owned&quot; above to save inspections &amp; evaluate health.</span>
                          </div>
                        );
                      }

                      return <div />;
                    })()}

                    {(() => {
                      const isAssigned = companyFleet.some(
                        (fm) =>
                          (fm.serialNumber && fm.serialNumber === selectedMachine?.serialNumber) ||
                          (fm.model && selectedMachine?.model && fm.model.toLowerCase() === selectedMachine.model.toLowerCase()) ||
                          (fm.id && fm.id === selectedMachine?.id)
                      );

                      return (
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Button 1: Save Active Component */}
                          <button
                            type="button"
                            onClick={handleSaveInspection}
                            disabled={submitting || !isAssigned}
                            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold shadow-md transition ${
                              !isAssigned
                                ? "bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                                : "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-500 disabled:opacity-50"
                            }`}
                          >
                            {submitting ? (
                              <>
                                <Loader2 size={15} className="animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save size={15} />
                                💾 Save &amp; Calculate &quot;{activeTab}&quot;
                              </>
                            )}
                          </button>

                          {/* Button 2: Save All Components at Once */}
                          {specComponents.length > 1 && (
                            <button
                              type="button"
                              onClick={handleSaveAllComponents}
                              disabled={submitting || !isAssigned}
                              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 py-3 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
                            >
                              <Zap size={15} className="text-amber-300" />
                              ⚡ Save All ({specComponents.length}) Components &amp; Compute Full Machine Health
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Calculated Health Result Panel */}
                  {healthResult && (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#081324] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <Gauge size={16} className="text-blue-500" />
                          Inspection Evaluation &amp; Diagnostic Result
                        </h4>
                        {getStatusBadge(healthResult.status || "Healthy", healthResult.healthScore ?? healthResult.overallMachineHealth)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                          <span className="text-slate-400">Component Health</span>
                          <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                            {healthResult.healthScore ?? healthResult.overallMachineHealth}%
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                          <span className="text-slate-400">Overall Machine Health</span>
                          <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                            {selectedMachine.healthScore ?? healthResult.healthScore}%
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                          <span className="text-slate-400">Machine Status</span>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {healthResult.machineStatus || healthResult.status}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
                          <span className="text-slate-400">PostgreSQL Database</span>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ Snapshot Stored
                          </p>
                        </div>
                      </div>

                      {/* Flagged Issues List */}
                      {healthResult.issues && healthResult.issues.length > 0 && (
                        <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-medium text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-red-800 dark:text-red-300">
                            <AlertOctagon size={14} />
                            Identified Warnings &amp; Issues:
                          </p>
                          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                            {healthResult.issues.map((iss: string, idx: number) => (
                              <li key={idx}>{iss}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPANY OWNED & ASSIGNED FLEET EQUIPMENT TABLE WITH PAGINATION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <Building2 size={12} />
                  Company Fleet Registry
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {companyFleet.length} Machines Owned &amp; Assigned
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Truck size={18} className="text-emerald-500" />
                Company Owned Equipment Fleet
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Machines marked as owned by <span className="font-bold text-slate-700 dark:text-slate-300">{currentUser.companyName}</span>. These machines are assigned and visible to your Supervisors and Operators for daily operations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {companyFleet.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={fleetTableSearch}
                    onChange={(e) => {
                      setFleetTableSearch(e.target.value);
                      setFleetCurrentPage(1);
                    }}
                    placeholder="Search in fleet..."
                    className="w-48 rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  {fleetTableSearch && (
                    <button
                      type="button"
                      onClick={() => setFleetTableSearch("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={fetchCompanyFleet}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
              >
                <RefreshCw size={13} />
                Refresh Fleet
              </button>
            </div>
          </div>

          {companyFleet.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-400 dark:border-slate-700 space-y-2">
              <Truck size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p>No machines marked as owned yet by your company.</p>
              <p className="text-[11px] font-normal text-slate-500">
                Select any equipment from the catalog above and click <strong>&quot;⭐ Mark as Owned&quot;</strong> to assign it to your company!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 dark:border-slate-800 dark:bg-[#07111f] dark:text-slate-400">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Equipment / Model</th>
                      <th className="p-3">Serial Number</th>
                      <th className="p-3">Category &amp; Brand</th>
                      <th className="p-3">Health Status</th>
                      <th className="p-3">Ownership Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {paginatedFleetMachines.map((fm, idx) => {
                      const isSelected = selectedMachine && (selectedMachine.id === fm.id || selectedMachine.serialNumber === fm.serialNumber || selectedMachine.model === fm.model);
                      const serialIndex = (fleetCurrentPage - 1) * fleetPageSize + idx + 1;
                      return (
                        <tr
                          key={fm.id}
                          className={`transition ${isSelected ? "bg-blue-50/70 dark:bg-blue-950/30" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}`}
                        >
                          <td className="p-3 text-center font-mono font-black text-xs text-slate-400">
                            {serialIndex}
                          </td>
                          <td className="p-3 font-black text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                                <Truck size={14} />
                              </div>
                              <div>
                                <p className="font-extrabold truncate max-w-[240px] text-xs">{fm.name || fm.model}</p>
                                {fm.name && fm.model && fm.name.toLowerCase() !== fm.model.toLowerCase() && (
                                  <p className="text-[10px] text-slate-400 font-medium">{fm.model}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 px-2.5 py-1 font-mono text-xs font-black text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm">
                              {fm.serialNumber || "SN-AUTO"}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {fm.brand}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {fm.category || fm.equipmentType}
                              </span>
                            </div>
                          </td>

                          <td className="p-3">
                            {getStatusBadge(fm.status || "Healthy", fm.healthScore ?? 100)}
                          </td>

                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 size={11} />
                              Company Owned
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectMachine(fm);
                                  inspectionSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow"
                                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-slate-700"
                                }`}
                              >
                                {isSelected ? "Currently Inspecting" : "Inspect Equipment"}
                              </button>

                              <button
                                type="button"
                                title="Remove from Company Fleet"
                                onClick={() => handleRemoveFromCompanyFleet(fm.id, fm.name || fm.model)}
                                className="rounded-xl border border-red-200 bg-red-50/50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* FLEET TABLE PAGINATION CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                  <span>
                    Showing {filteredFleetList.length > 0 ? (fleetCurrentPage - 1) * fleetPageSize + 1 : 0} to{" "}
                    {Math.min(fleetCurrentPage * fleetPageSize, filteredFleetList.length)} of {filteredFleetList.length} machines
                  </span>
                  
                  <div className="flex items-center gap-1 ml-3">
                    <span className="text-[11px]">Show:</span>
                    <select
                      value={fleetPageSize}
                      onChange={(e) => {
                        setFleetPageSize(Number(e.target.value));
                        setFleetCurrentPage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFleetCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={fleetCurrentPage === 1}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalFleetPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setFleetCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-xl text-xs font-black transition ${
                          fleetCurrentPage === pageNum
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setFleetCurrentPage((p) => Math.min(totalFleetPages, p + 1))}
                    disabled={fleetCurrentPage === totalFleetPages}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DIRECT ON-PAGE AUDIT LOG TIMELINE & PARAMETER CHANGES TABLE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  PostgreSQL Persistent Log
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Total Entries: {historyLogs.length}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <History size={18} className="text-blue-500" />
                Equipment Inspection Audit Trail &amp; Health History
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive chronological log of component inspections, parameter updates, diagnostic alerts, and calculated health scores.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#101f33]">
                <button
                  type="button"
                  onClick={() => setAuditViewScope("ALL")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                    auditViewScope === "ALL"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  🌐 All Fleet Records ({historyLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditViewScope("SELECTED")}
                  disabled={!selectedMachine}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition disabled:opacity-40 ${
                    auditViewScope === "SELECTED"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  🚜 {selectedMachine?.model || "Selected Machine"}
                </button>
              </div>

              <button
                onClick={fetchAllHistoryLogs}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
              >
                <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} />
                Refresh Logs
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center p-8 text-center space-y-2">
              <Loader2 size={26} className="text-blue-600 animate-spin dark:text-blue-400" />
              <p className="text-xs font-bold text-slate-500">Loading audit history logs from PostgreSQL database...</p>
            </div>
          ) : (() => {
            const baseLogs = historyLogs.filter((l: HistoryLog) => !String(l.userRole || "").toLowerCase().includes("super"));
            const displayed = auditViewScope === "SELECTED" && selectedMachine
              ? baseLogs.filter(l => l.machineId === selectedMachine.id || l.machineId === selectedMachine.machineId || l.modelName === selectedMachine.model || l.serialNumber === selectedMachine.serialNumber)
              : baseLogs;

            if (displayed.length === 0) {
              return (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-400 dark:border-slate-700">
                  {auditViewScope === "SELECTED"
                    ? `No inspection entries logged yet for ${selectedMachine?.name || selectedMachine?.model} by your company. Click "Save & Calculate Health Score" above to log the first entry!`
                    : "No inspection audit entries recorded yet for your company. Select a machine and click \"Save & Calculate Health Score\" to create your company's first record!"}
                </div>
              );
            }

            const totalAuditPages = Math.max(1, Math.ceil(displayed.length / auditPageSize));
            const paginatedAuditLogs = displayed.slice(
              (auditCurrentPage - 1) * auditPageSize,
              auditCurrentPage * auditPageSize
            );

            return (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 dark:border-slate-800 dark:bg-[#07111f] dark:text-slate-400">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Equipment / Model</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Inspector (User)</th>
                        <th className="p-3">Component</th>
                        <th className="p-3">Parameter Changes (Old &rarr; New)</th>
                        <th className="p-3">Scores (Comp / Overall)</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {paginatedAuditLogs.map((log, idx) => {
                        const isNewEntry = log.actionType === "INITIAL_INSPECTION";
                        const changes = Array.isArray(log.parameterChanges) ? log.parameterChanges : [];
                        const serialNum = (auditCurrentPage - 1) * auditPageSize + idx + 1;

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 text-center font-mono font-black text-xs text-slate-400">
                              {serialNum}
                            </td>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                <Calendar size={13} className="text-blue-500" />
                                {new Date(log.createdAt).toLocaleDateString()}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.createdAt).toLocaleTimeString()}
                              </span>
                            </td>

                            <td className="p-3 text-slate-900 dark:text-white">
                              <p className="font-black text-xs truncate max-w-[220px]">
                                {log.machineName || log.modelName || "Mining Machine"}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {log.brand && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    {log.brand}
                                  </span>
                                )}
                                {log.category && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                    {log.category}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5">
                                <span className="inline-block rounded-md bg-blue-50 border border-blue-200/80 font-mono text-[10px] font-black text-blue-700 dark:bg-blue-950/60 dark:border-blue-900/50 dark:text-blue-300 px-2 py-0.5 shadow-sm">
                                  {log.serialNumber || (selectedMachine?.serialNumber ?? "SN-RECORDED")}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {isNewEntry ? (
                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  Initial Entry
                                </span>
                              ) : (
                                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  Routine Update
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              <div className="font-extrabold flex items-center gap-1.5">
                                <User size={13} className="text-blue-500" />
                                {log.userName || log.submittedBy || "Company Admin"}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Role: {log.userRole || "COMPANY_ADMIN"}
                              </span>
                            </td>

                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {log.componentName}
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {(() => {
                                let fields: any[] = [];
                                if (Array.isArray(log.currentParameters)) fields = log.currentParameters;
                                else if (Array.isArray(log.parameters)) fields = log.parameters;

                                const hasChanges = changes && changes.length > 0;

                                return hasChanges ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-300">
                                    <Sliders size={12} className="text-blue-600 dark:text-blue-400" />
                                    <span>{changes.length} Change{changes.length > 1 ? "s" : ""} Recorded</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                    <Layers size={12} className="text-slate-500" />
                                    <span>{fields.length || 4} Parameters (Initial)</span>
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="p-3 whitespace-nowrap space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-bold">Comp:</span>
                                {getStatusBadge(
                                  log.status || log.machineStatus || "Healthy",
                                  log.componentHealthScore ?? log.componentHealth ?? 100
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="text-slate-400 font-bold">Overall:</span>
                                <span className="font-black text-slate-700 dark:text-slate-200">
                                  {log.overallMachineHealth ?? log.componentHealthScore ?? 100}%
                                </span>
                              </div>
                            </td>

                            {/* ACTIONS COLUMN: VIEW DETAILS & EDIT (ICON ONLY) */}
                            <td className="p-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  title="View Details Snapshot"
                                  onClick={() => setViewingDetailLog(log)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
                                >
                                  <Eye size={15} />
                                </button>

                                <button
                                  type="button"
                                  title="Load Data into Form for Editing"
                                  onClick={() => handleEditFromHistory(log)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
                                >
                                  <Edit3 size={14} />
                                </button>

                                <button
                                  type="button"
                                  title="Delete Inspection Record"
                                  onClick={() => handleDeleteHistoryLog(log.id, log.componentName || "Component")}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 shadow-sm transition hover:border-red-400 hover:bg-red-100 hover:text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* AUDIT LOG PAGINATION CONTROLS */}
                {displayed.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Showing {(auditCurrentPage - 1) * auditPageSize + 1} to{" "}
                        {Math.min(auditCurrentPage * auditPageSize, displayed.length)} of {displayed.length} audit logs
                      </span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span>Show</span>
                        <select
                          value={auditPageSize}
                          onChange={(e) => {
                            setAuditPageSize(Number(e.target.value));
                            setAuditCurrentPage(1);
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-extrabold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span>per page</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAuditCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={auditCurrentPage === 1}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                      >
                        <ChevronLeft size={14} />
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalAuditPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setAuditCurrentPage(pageNum)}
                            className={`h-8 w-8 rounded-xl text-xs font-black transition ${
                              auditCurrentPage === pageNum
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setAuditCurrentPage((p) => Math.min(totalAuditPages, p + 1))}
                        disabled={auditCurrentPage === totalAuditPages}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* VIEW DETAILS MODAL */}
        {viewingDetailLog && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#07111f]">
              <div className="flex items-center justify-between border-b border-blue-500/30 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4 text-white">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <FileText size={18} className="text-blue-400" />
                    Inspection Record Snapshot
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Equipment: <span className="font-bold text-white">{viewingDetailLog.machineName || viewingDetailLog.modelName}</span> {viewingDetailLog.serialNumber ? `(${viewingDetailLog.serialNumber})` : ''}
                  </p>
                </div>

                <button
                  onClick={() => setViewingDetailLog(null)}
                  className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-xs">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0c1626]">
                  <div>
                    <span className="text-slate-400 font-bold">Equipment</span>
                    <p className="font-black text-slate-900 dark:text-white mt-0.5">
                      {viewingDetailLog.machineName || viewingDetailLog.modelName}
                    </p>
                    <p className="text-[10px] text-slate-400">{viewingDetailLog.brand} • {viewingDetailLog.category}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Component</span>
                    <p className="font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      {viewingDetailLog.componentName}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Inspector</span>
                    <p className="font-black text-slate-900 dark:text-white mt-0.5">
                      {viewingDetailLog.userName || viewingDetailLog.submittedBy}
                    </p>
                    <p className="text-[10px] text-slate-400">Role: {viewingDetailLog.userRole}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Date &amp; Time</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {new Date(viewingDetailLog.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Component Health</span>
                    <div className="mt-0.5">
                      {getStatusBadge(
                        viewingDetailLog.status || "Healthy",
                        viewingDetailLog.componentHealthScore ?? viewingDetailLog.componentHealth ?? 100
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Overall Machine Health</span>
                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {viewingDetailLog.overallMachineHealth ?? viewingDetailLog.componentHealthScore ?? 100}%
                    </p>
                  </div>
                </div>

                {/* Parameters Snapshot Table */}
                <div className="space-y-3">
                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Recorded Parameters &amp; Measured Values:
                  </h4>

                  {(() => {
                    let list: any[] = [];
                    if (Array.isArray(viewingDetailLog.currentParameters)) list = viewingDetailLog.currentParameters;
                    else if (Array.isArray(viewingDetailLog.parameters)) list = viewingDetailLog.parameters;

                    if (list.length === 0) {
                      return (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-[#0c1626]">
                          No parameter breakdown recorded for this snapshot.
                        </div>
                      );
                    }

                    // Check if this log contains multi-component grouped data
                    const isMultiComp = list.length > 0 && list[0].componentName && Array.isArray(list[0].parameters);

                    if (isMultiComp) {
                      return (
                        <div className="space-y-4">
                          {list.map((compGroup: any, cIdx: number) => {
                            return (
                              <div key={cIdx} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-[#0c1626]">
                                <div className="flex items-center justify-between bg-slate-100/80 dark:bg-[#101f33] px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Layers size={14} className="text-blue-500" />
                                    {compGroup.componentName}
                                    <span className="text-[10px] text-slate-500 font-medium">({compGroup.componentCategory || 'Component'})</span>
                                  </span>
                                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black shadow-sm ${
                                    compGroup.healthScore < 50
                                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                      : compGroup.healthScore < 85
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  }`}>
                                    {compGroup.healthScore}% {compGroup.status}
                                  </span>
                                </div>

                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-[#0c1626] dark:text-slate-400">
                                      <th className="p-3">Parameter Name</th>
                                      <th className="p-3">Old Value (Previous)</th>
                                      <th className="p-3">New Value (Recorded)</th>
                                      <th className="p-3">OEM Safe Operating Range</th>
                                      <th className="p-3 text-center">Diagnostic Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {compGroup.parameters.map((param: any, pIdx: number) => {
                                      const prevP = Array.isArray(compGroup.previousParameters)
                                        ? compGroup.previousParameters.find((p: any) => String(p.name).toLowerCase().trim() === String(param.name).toLowerCase().trim())
                                        : null;
                                      const oldVal = prevP ? prevP.value : null;
                                      const newVal = param.value;
                                      const hasOld = oldVal !== null && oldVal !== undefined && oldVal !== '';
                                      const delta = (hasOld && !isNaN(parseFloat(newVal)) && !isNaN(parseFloat(oldVal)))
                                        ? Math.round((parseFloat(newVal) - parseFloat(oldVal)) * 100) / 100
                                        : null;

                                      const num = parseFloat(newVal);
                                      const hasRange = param.safeMin !== undefined && param.safeMax !== undefined && !isNaN(Number(param.safeMin));
                                      let isCritical = false;
                                      let isWarning = false;

                                      if (!isNaN(num) && hasRange) {
                                        const min = Number(param.safeMin);
                                        const max = Number(param.safeMax);
                                        const span = Math.max(1, max - min);
                                        if (num < min) {
                                          const deltaMin = min - num;
                                          if (deltaMin / span > 0.25 || num <= 0) isCritical = true;
                                          else isWarning = true;
                                        } else if (num > max) {
                                          const deltaMax = num - max;
                                          if (deltaMax / span > 0.25) isCritical = true;
                                          else isWarning = true;
                                        }
                                      }

                                      return (
                                        <tr key={pIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                                          <td className="p-3">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{param.name}</span>
                                            {param.description && <p className="text-[10px] text-slate-400 mt-0.5">{param.description}</p>}
                                          </td>
                                          <td className="p-3">
                                            {hasOld ? (
                                              <span className="inline-flex items-center font-mono text-xs text-slate-500 line-through bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                                                {oldVal} {param.unit || ''}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 text-[11px] italic">Initial (—)</span>
                                            )}
                                          </td>
                                          <td className="p-3">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                                                {newVal} {param.unit || ''}
                                              </span>
                                              {delta !== null && delta !== 0 && (
                                                <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                                  delta < 0
                                                    ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                                                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                                                }`}>
                                                  {delta > 0 ? `+${delta}` : delta}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold">
                                            {hasRange ? (
                                              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                {param.safeMin} – {param.safeMax} {param.unit || ''}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">Standard OEM Limits</span>
                                            )}
                                          </td>
                                          <td className="p-3 text-center">
                                            {isCritical ? (
                                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950 dark:text-red-300">
                                                <AlertOctagon size={11} /> Critical Reading
                                              </span>
                                            ) : isWarning ? (
                                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                <AlertTriangle size={11} /> Warning Range
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                                <CheckCircle2 size={11} /> Normal / Safe
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // Single Component Flat Table
                    const prevMap = new Map<string, any>();
                    if (Array.isArray(viewingDetailLog.previousParameters)) {
                      viewingDetailLog.previousParameters.forEach((p: any) => {
                        if (p && p.name) prevMap.set(String(p.name).toLowerCase().trim(), p.value);
                      });
                    }
                    if (Array.isArray(viewingDetailLog.parameterChanges)) {
                      viewingDetailLog.parameterChanges.forEach((ch: any) => {
                        if (ch && ch.parameterName) {
                          prevMap.set(String(ch.parameterName).toLowerCase().trim(), ch.previousValue);
                        }
                      });
                    }

                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-[#0c1626]">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-black uppercase text-slate-600 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-300">
                              <th className="p-3">Parameter Name</th>
                              <th className="p-3">Old Value (Previous)</th>
                              <th className="p-3">New Value (Recorded)</th>
                              <th className="p-3">OEM Safe Operating Range</th>
                              <th className="p-3 text-center">Diagnostic Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {list.map((param: any, idx: number) => {
                              const pNameKey = String(param.name || "").toLowerCase().trim();
                              const oldVal = prevMap.get(pNameKey);
                              const newVal = param.value;
                              const oldNum = parseFloat(oldVal);
                              const newNum = parseFloat(newVal);
                              const hasOld = oldVal !== undefined && oldVal !== null && oldVal !== "";
                              const delta = (hasOld && !isNaN(oldNum) && !isNaN(newNum)) ? Math.round((newNum - oldNum) * 100) / 100 : null;

                              const num = parseFloat(newVal);
                              const hasRange = param.safeMin !== undefined && param.safeMax !== undefined && !isNaN(Number(param.safeMin));
                              let isCritical = false;
                              let isWarning = false;

                              if (!isNaN(num) && hasRange) {
                                const min = Number(param.safeMin);
                                const max = Number(param.safeMax);
                                const span = Math.max(1, max - min);
                                if (num < min) {
                                  const deltaMin = min - num;
                                  if (deltaMin / span > 0.25 || num <= 0) isCritical = true;
                                  else isWarning = true;
                                } else if (num > max) {
                                  const deltaMax = num - max;
                                  if (deltaMax / span > 0.25) isCritical = true;
                                  else isWarning = true;
                                }
                              }

                              return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                                  <td className="p-3">
                                    <span className="font-black text-slate-800 dark:text-slate-200">
                                      {param.name}
                                    </span>
                                    {param.description && (
                                      <p className="text-[10px] text-slate-400 mt-0.5">{param.description}</p>
                                    )}
                                  </td>

                                  {/* OLD VALUE */}
                                  <td className="p-3">
                                    {hasOld ? (
                                      <span className="inline-flex items-center font-mono text-xs text-slate-500 line-through bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                                        {oldVal} {param.unit || ''}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px] italic">
                                        Initial (—)
                                      </span>
                                    )}
                                  </td>

                                  {/* NEW VALUE */}
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                                        {newVal} {param.unit || ''}
                                      </span>
                                      {delta !== null && delta !== 0 && (
                                        <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                                          delta < 0
                                            ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        }`}>
                                          {delta > 0 ? `+${delta}` : delta}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold">
                                    {hasRange ? (
                                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                        {param.safeMin} – {param.safeMax} {param.unit || ''}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Standard OEM Limits</span>
                                    )}
                                  </td>

                                  <td className="p-3 text-center">
                                    {isCritical ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950 dark:text-red-300">
                                        <AlertOctagon size={11} /> Critical Reading
                                      </span>
                                    ) : isWarning ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        <AlertTriangle size={11} /> Warning Range
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                        <CheckCircle2 size={11} /> Normal / Safe
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Diagnostic Issues if any */}
                {viewingDetailLog.issues && viewingDetailLog.issues.length > 0 && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 space-y-2">
                    <p className="font-extrabold flex items-center gap-1.5 text-red-800 dark:text-red-300">
                      <AlertOctagon size={15} />
                      Flagged Diagnostics &amp; Issues:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-[11px]">
                      {viewingDetailLog.issues.map((iss: string, idx: number) => (
                        <li key={idx}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Action Button to Edit this record */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const l = viewingDetailLog;
                      setViewingDetailLog(null);
                      handleEditFromHistory(l);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-blue-500"
                  >
                    <Edit3 size={14} />
                    Load this Data into Editor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit History Timeline Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#07111f]">
              <div className="flex items-center justify-between border-b border-blue-500/30 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4 text-white">
                <div>
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <History size={20} className="text-blue-400" />
                    Inspection Audit Trail &amp; Health History
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Machine: <span className="font-bold text-white">{selectedMachine?.name || selectedMachine?.model}</span> (SN: {selectedMachine?.serialNumber})
                  </p>
                </div>

                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
                {loadingHistory ? (
                  <div className="flex min-h-[120px] flex-col items-center justify-center p-8 text-center space-y-2">
                    <Loader2 size={24} className="text-blue-400 animate-spin" />
                    <p className="text-xs text-slate-300">Loading audit history...</p>
                  </div>
                ) : historyLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-slate-400">
                    No inspection history logs recorded yet for this machine.
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {historyLogs.map((log) => (
                      <div key={log.id} className="relative pl-9">
                        <div className="absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 border-blue-500 bg-white dark:bg-[#07111f]" />

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0c1626] space-y-2">
                          <div className="flex items-center justify-between text-xs font-extrabold">
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                              <User size={13} />
                              {log.userName || log.submittedBy} ({log.userRole || "COMPANY_ADMIN"})
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Component: {log.componentName}
                            </span>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(log.status || log.machineStatus || "Healthy", log.componentHealthScore ?? log.componentHealth ?? 100)}
                              <button
                                type="button"
                                title="Load Data into Form for Editing"
                                onClick={() => {
                                  setIsHistoryModalOpen(false);
                                  handleEditFromHistory(log);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-500"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ADD CUSTOM COMPONENT MODAL */}
        {isAddComponentModalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728] overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shadow-inner">
                    <PlusCircle size={22} className="text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                      Add Custom Component to Equipment
                    </h2>
                    <p className="text-xs text-blue-200">
                      Machine: <span className="font-bold text-white">{formatCleanModelName(selectedMachine)}</span> ({selectedMachine?.equipmentType || selectedMachine?.category})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsAddComponentModalOpen(false);
                    setCompFormError("");
                  }}
                  className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Error Banner */}
                {compFormError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{compFormError}</span>
                  </div>
                )}

                {/* Monitored Parameters List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sliders size={14} className="text-blue-500" />
                      Monitored Parameters &amp; Safe Limits ({newCompParams.length})
                    </label>

                    <button
                      type="button"
                      onClick={handleAddParamRow}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      Add Parameter
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {newCompParams.map((param, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#101f33]"
                      >
                        {/* Parameter Name */}
                        <div className="min-w-[160px] flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Parameter Name</span>
                          <input
                            type="text"
                            placeholder="e.g. Oil Pressure"
                            value={param.name}
                            onChange={(e) => handleUpdateParamField(idx, "name", e.target.value)}
                            className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                          />
                        </div>

                        {/* Unit */}
                        <div className="w-20">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Unit</span>
                          <select
                            value={param.unit}
                            onChange={(e) => handleUpdateParamField(idx, "unit", e.target.value)}
                            className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-1 text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                          >
                            <option value="Bar">Bar</option>
                            <option value="PSI">PSI</option>
                            <option value="°C">°C</option>
                            <option value="RPM">RPM</option>
                            <option value="%">%</option>
                            <option value="V">V</option>
                            <option value="Deg">Deg</option>
                            <option value="Tons">Tons</option>
                            <option value="mm">mm</option>
                            <option value="kPa">kPa</option>
                          </select>
                        </div>

                        {/* Safe Min */}
                        <div className="w-20">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Safe Min</span>
                          <input
                            type="number"
                            value={param.safeMin}
                            onChange={(e) => handleUpdateParamField(idx, "safeMin", parseFloat(e.target.value) || 0)}
                            className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                          />
                        </div>

                        {/* Safe Max */}
                        <div className="w-20">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Safe Max</span>
                          <input
                            type="number"
                            value={param.safeMax}
                            onChange={(e) => handleUpdateParamField(idx, "safeMax", parseFloat(e.target.value) || 0)}
                            className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                          />
                        </div>

                        {/* Default / Baseline */}
                        <div className="w-20">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Default</span>
                          <input
                            type="number"
                            value={param.defaultVal}
                            onChange={(e) => handleUpdateParamField(idx, "defaultVal", parseFloat(e.target.value) || 0)}
                            className="mt-0.5 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-extrabold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#07111f] dark:text-white"
                          />
                        </div>

                        {/* Delete row */}
                        {newCompParams.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParamRow(idx)}
                            className="mt-4 flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400"
                            title="Remove parameter"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#0c1626]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddComponentModalOpen(false);
                    setCompFormError("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveNewComponent}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition"
                >
                  <CheckCircle size={15} />
                  Save Component to Machine
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999999] flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 dark:border-slate-700 dark:bg-[#0c192c]/95">
          <div
            className={`rounded-xl p-2 text-white shadow ${
              toast.type === "warning"
                ? "bg-amber-500"
                : toast.type === "error"
                ? "bg-red-500"
                : toast.type === "success"
                ? "bg-emerald-500"
                : "bg-blue-600"
            }`}
          >
            {toast.type === "warning" ? (
              <AlertTriangle size={18} />
            ) : toast.type === "error" ? (
              <XCircle size={18} />
            ) : toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <Info size={18} />
            )}
          </div>

          <div className="flex-1 text-xs font-bold text-slate-800 dark:text-slate-200">
            {toast.message}
          </div>

          <button
            onClick={() => setToast(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deletingLogTarget && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-500/30 bg-white p-6 shadow-2xl dark:bg-[#0c1626]">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Delete Inspection Record?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audit Trail Permanent Deletion
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
              Are you sure you want to permanently delete the audit record for <strong className="text-red-500 dark:text-red-400 font-bold">"{deletingLogTarget.name}"</strong>? This action cannot be undone.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingLog}
                onClick={() => setDeletingLogTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLog}
                onClick={confirmDeleteHistoryLog}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition hover:from-red-500 hover:to-rose-500 disabled:opacity-50"
              >
                {isDeletingLog ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {isDeletingLog ? "Deleting..." : "Yes, Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
