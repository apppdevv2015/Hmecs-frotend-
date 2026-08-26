import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Truck,
  Filter,
  Tag,
  Globe,
  Layers,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Weight,
  Zap,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { apiRequest } from "../../services/api";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

interface MasterMachine {
  id: string;
  slug?: string;
  brand: string;
  category: string;
  modelName: string;
  operatingWeight?: string | null;
  enginePower?: string | null;
  components?: any[];
  totalSpecsCount?: number;
  serialNumber?: string;
}

export default function SupervisorMachines() {
  const [machines, setMachines] = useState<MasterMachine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedModelId, setSelectedModelId] = useState<string>("ALL");

  // Custom Downward Dropdown Open/Search States
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState<boolean>(false);
  const [catSearch, setCatSearch] = useState<string>("");

  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState<boolean>(false);
  const [brandSearch, setBrandSearch] = useState<string>("");

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [modelSearch, setModelSearch] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | "ALL">(25);

  // Detail Modal State
  const [selectedMachineDetail, setSelectedMachineDetail] = useState<MasterMachine | null>(null);
  const [loadingSpecs, setLoadingSpecs] = useState<boolean>(false);

  // Close dropdowns on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
        setIsBrandDropdownOpen(false);
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Company Fleet Machines (Only machines registered to this company)
  const loadCompanyFleet = async () => {
    try {
      setRefreshing(true);
      const user = StorageService.getUser();
      const companyId = user?.companyId || user?.company_id || StorageService.getCompanyId() || "";

      const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const res: any = await apiRequest(`/machines/company-fleet${queryParam}`);
      const fleetData = res?.data || res || [];

      if (Array.isArray(fleetData)) {
        const mapped: MasterMachine[] = fleetData.map((m: any) => ({
          id: m.id || m.serialNumber,
          slug: m.id,
          brand: m.manufacturer || m.brand || "Fleet Equipment",
          category: m.equipmentType || m.category || "Heavy Equipment",
          modelName: m.model || m.name || "Equipment Model",
          operatingWeight: m.operatingWeight || "Standard Spec",
          enginePower: m.enginePower || "Standard Spec",
          components: Array.isArray(m.components) ? m.components : [],
          totalSpecsCount: Array.isArray(m.components)
            ? m.components.reduce(
                (s: number, c: any) =>
                  s + (c.inspectionParameters?.length || c.parameters?.length || 0),
                0
              )
            : 12,
          serialNumber: m.serialNumber || `SN-${m.id?.substring(0, 6)}`,
        }));
        setMachines(mapped);
      }
    } catch (err) {
      console.error("Failed to load company fleet machines for supervisor:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCompanyFleet();
  }, []);

  // Compute Distinct Categories with Counts
  const categoriesList = useMemo(() => {
    const map = new Map<string, number>();
    machines.forEach((m) => {
      const cat = m.category || "General";
      map.set(cat, (map.get(cat) || 0) + 1);
    });

    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return list;
  }, [machines]);

  const filteredCategoryOptions = useMemo(() => {
    if (!catSearch.trim()) return categoriesList;
    return categoriesList.filter((c) =>
      c.name.toLowerCase().includes(catSearch.toLowerCase())
    );
  }, [categoriesList, catSearch]);

  // Compute Distinct Brands with Counts (Cascading based on selected category)
  const brandsList = useMemo(() => {
    let source = machines;
    if (selectedCategory !== "ALL") {
      source = machines.filter(
        (m) => (m.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    const map = new Map<string, number>();
    source.forEach((m) => {
      const b = m.brand || "Caterpillar";
      map.set(b, (map.get(b) || 0) + 1);
    });

    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count }));
    list.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return list;
  }, [machines, selectedCategory]);

  const filteredBrandOptions = useMemo(() => {
    if (!brandSearch.trim()) return brandsList;
    return brandsList.filter((b) =>
      b.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [brandsList, brandSearch]);

  // Machines available for Step 3 Quick Picker (scoped to Category & Brand)
  const pickerMachinesList = useMemo(() => {
    return machines.filter((m) => {
      const matchesCat =
        selectedCategory === "ALL" ||
        (m.category || "").toLowerCase() === selectedCategory.toLowerCase();

      const matchesBrand =
        selectedBrand === "ALL" ||
        (m.brand || "").toLowerCase() === selectedBrand.toLowerCase();

      return matchesCat && matchesBrand;
    });
  }, [machines, selectedCategory, selectedBrand]);

  const filteredPickerMachines = useMemo(() => {
    if (!modelSearch.trim()) return pickerMachinesList;
    const q = modelSearch.toLowerCase().trim();
    return pickerMachinesList.filter(
      (m) =>
        m.modelName.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [pickerMachinesList, modelSearch]);

  // Main Filtered Machines for Table Display
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      const matchesCat =
        selectedCategory === "ALL" ||
        (m.category || "").toLowerCase() === selectedCategory.toLowerCase();

      const matchesBrand =
        selectedBrand === "ALL" ||
        (m.brand || "").toLowerCase() === selectedBrand.toLowerCase();

      const matchesModel =
        selectedModelId === "ALL" ||
        m.id === selectedModelId;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (m.modelName && m.modelName.toLowerCase().includes(q)) ||
        (m.brand && m.brand.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.serialNumber && m.serialNumber.toLowerCase().includes(q)) ||
        (m.operatingWeight && m.operatingWeight.toLowerCase().includes(q)) ||
        (m.enginePower && m.enginePower.toLowerCase().includes(q));

      return matchesCat && matchesBrand && matchesModel && matchesSearch;
    });
  }, [machines, selectedCategory, selectedBrand, selectedModelId, searchQuery]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBrand, selectedCategory, selectedModelId, pageSize]);

  // Pagination calculation
  const totalItems = filteredMachines.length;
  const isAll = pageSize === "ALL";
  const effectivePageSize = isAll ? totalItems : (pageSize as number);
  const totalPages = isAll || totalItems === 0 ? 1 : Math.ceil(totalItems / effectivePageSize);

  const paginatedMachines = useMemo(() => {
    if (isAll) return filteredMachines;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredMachines.slice(start, start + effectivePageSize);
  }, [filteredMachines, currentPage, effectivePageSize, isAll]);

  const handleOpenSpecsModal = async (machine: MasterMachine) => {
    setSelectedMachineDetail(machine);
    if (!machine.components || machine.components.length === 0) {
      try {
        setLoadingSpecs(true);
        const supUser = StorageService.getUser();
        const supCompanyId = supUser?.companyId || supUser?.company_id || (machine as any)?.companyId || "";
        const supMachineId = machine.id || (machine as any)?.machineId || "";
        const res: any = await apiRequest(
          `/machines/spec-template?equipmentType=${encodeURIComponent(machine.category)}&modelName=${encodeURIComponent(machine.modelName)}&companyId=${encodeURIComponent(supCompanyId)}&machineId=${encodeURIComponent(supMachineId)}`
        );
        const comps = res?.data?.components || res?.components || [];
        if (comps.length > 0) {
          setSelectedMachineDetail((prev) => (prev ? { ...prev, components: comps } : prev));
        }
      } catch (e) {
        console.warn("Spec template fetch error:", e);
      } finally {
        setLoadingSpecs(false);
      }
    }
  };

  // Pagination Quick Jump range calculation
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

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
            Loading Master Heavy Equipment Database...
          </h3>
          <p className="text-xs font-medium text-slate-500 max-w-sm">
            55 Categories &amp; 47 Brands from PostgreSQL Master Catalog
          </p>
        </div>
      </div>
    );
  }

  const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endRecord = isAll ? totalItems : Math.min(currentPage * effectivePageSize, totalItems);

  return (
    <>
      <PageMeta
        title="Supervisor Company Equipment Fleet | Supervisor Hub"
        description="Manage and monitor your company's registered machinery fleet"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header Title Banner */}
        <div className="flex flex-col gap-4 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <Globe size={13} />
                Company Fleet Registry ({machines.length} Machines Assigned)
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Supervisor Equipment &amp; Machine Fleet
            </h1>
            <p className="text-sm font-medium text-slate-300 max-w-2xl">
              Inspect, monitor, and assign active company machinery marked and assigned by your Company Admin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadCompanyFleet}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md border border-white/20 transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh Fleet
            </button>
          </div>
        </div>

        {/* Search & Downward Cascading Filter Controls Card */}
        <div ref={dropdownRef} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] space-y-5">
          
          {/* GLOBAL SEARCH BAR */}
          <div className="relative space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Search size={14} className="text-blue-500" />
                Quick Search Equipment (Name, Model, Serial, Brand, Category, Power):
              </label>
              {searchQuery && (
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {filteredMachines.length.toLocaleString()} matching results
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all 9,735+ machines (e.g. Caterpillar 777, Komatsu PC8000, Sandvik, Excavator)..."
                className="w-full rounded-2xl border-2 border-blue-500/40 bg-blue-50/40 pl-11 pr-10 py-3 text-sm font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-blue-600/40 dark:bg-[#10223b]/60 dark:text-white dark:focus:bg-[#0a1628]"
              />
              <Search size={18} className="absolute left-4 top-3.5 text-blue-500" />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* THREE-STEP CASCADING DOWNWARD FILTER ROW */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            
            {/* STEP 1: Category Filter (Always Downward) */}
            <div className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Filter size={14} />
                  Step 1: Category ({categoriesList.length}):
                </label>
                {selectedCategory !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("ALL");
                      setSelectedBrand("ALL");
                      setSelectedModelId("ALL");
                    }}
                    className="text-[11px] font-bold text-blue-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsCatDropdownOpen(!isCatDropdownOpen);
                  setIsBrandDropdownOpen(false);
                  setIsModelDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border-2 border-blue-500/40 bg-blue-50/50 px-3.5 py-2.5 text-left text-xs font-black text-slate-900 shadow-sm transition hover:border-blue-600 focus:outline-none dark:border-blue-600/40 dark:bg-[#10223b] dark:text-white"
              >
                <span className="truncate">
                  {selectedCategory === "ALL"
                    ? `🌐 All Categories (${machines.length.toLocaleString()})`
                    : `🚜 ${selectedCategory}`}
                </span>
                <ChevronDown size={16} className={`text-blue-500 transition-transform ${isCatDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* ALWAYS DOWNWARD Expanding Category Menu */}
              {isCatDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[360px] overflow-y-auto space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("ALL");
                        setSelectedBrand("ALL");
                        setSelectedModelId("ALL");
                        setIsCatDropdownOpen(false);
                        setCatSearch("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                        selectedCategory === "ALL"
                          ? "bg-blue-600 text-white"
                          : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>🌐 All Categories</span>
                      <span className="text-[10px] font-bold opacity-80">{machines.length.toLocaleString()}</span>
                    </button>

                    {filteredCategoryOptions.map((cat) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSelectedBrand("ALL");
                          setSelectedModelId("ALL");
                          setIsCatDropdownOpen(false);
                          setCatSearch("");
                        }}
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

            {/* STEP 2: Brand Filter (Always Downward) */}
            <div className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Tag size={14} />
                  Step 2: Brand ({brandsList.length}):
                </label>
                {selectedBrand !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand("ALL");
                      setSelectedModelId("ALL");
                    }}
                    className="text-[11px] font-bold text-indigo-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBrandDropdownOpen(!isBrandDropdownOpen);
                  setIsCatDropdownOpen(false);
                  setIsModelDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border-2 border-indigo-500/40 bg-indigo-50/50 px-3.5 py-2.5 text-left text-xs font-black text-slate-900 shadow-sm focus:outline-none dark:border-indigo-600/40 dark:bg-[#151b36] dark:text-white"
              >
                <span className="truncate">
                  {selectedBrand === "ALL"
                    ? `🏷️ All Brands (${brandsList.length})`
                    : `🏷️ ${selectedBrand}`}
                </span>
                <ChevronDown size={16} className={`text-indigo-500 transition-transform ${isBrandDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* ALWAYS DOWNWARD Expanding Brand Menu */}
              {isBrandDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[360px] overflow-y-auto space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search brands..."
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand("ALL");
                        setSelectedModelId("ALL");
                        setIsBrandDropdownOpen(false);
                        setBrandSearch("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                        selectedBrand === "ALL"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>🏷️ All Brands</span>
                      <span className="text-[10px] font-bold opacity-80">{brandsList.length}</span>
                    </button>

                    {filteredBrandOptions.map((brand) => (
                      <button
                        key={brand.name}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(brand.name);
                          setSelectedModelId("ALL");
                          setIsBrandDropdownOpen(false);
                          setBrandSearch("");
                        }}
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

            {/* STEP 3: All Machines / Model Selector (Always Downward) */}
            <div className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Truck size={14} />
                  Step 3: All Machines ({pickerMachinesList.length.toLocaleString()}):
                </label>
                {selectedModelId !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedModelId("ALL")}
                    className="text-[11px] font-bold text-emerald-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsModelDropdownOpen(!isModelDropdownOpen);
                  setIsCatDropdownOpen(false);
                  setIsBrandDropdownOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 px-3.5 py-2.5 text-left text-xs font-black text-slate-900 shadow-sm focus:outline-none dark:border-emerald-600/40 dark:bg-[#0c2419] dark:text-white"
              >
                <span className="truncate">
                  {selectedModelId === "ALL"
                    ? `🚚 All Machines (${pickerMachinesList.length.toLocaleString()} Models)`
                    : `⚙️ ${machines.find((m) => m.id === selectedModelId)?.brand} ${machines.find((m) => m.id === selectedModelId)?.modelName}`}
                </span>
                <ChevronDown size={16} className={`text-emerald-500 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* ALWAYS DOWNWARD Expanding Machine Picker Menu */}
              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-[#0c192c] max-h-[360px] overflow-y-auto space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type model name, brand..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                    />
                    <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModelId("ALL");
                        setIsModelDropdownOpen(false);
                        setModelSearch("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                        selectedModelId === "ALL"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>🚚 All Machines</span>
                      <span className="text-[10px] font-bold opacity-80">{pickerMachinesList.length.toLocaleString()}</span>
                    </button>

                    {filteredPickerMachines.slice(0, 80).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModelId(m.id);
                          setIsModelDropdownOpen(false);
                          setModelSearch("");
                          handleOpenSpecsModal(m);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                          selectedModelId === m.id
                            ? "bg-emerald-600 text-white"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-extrabold truncate">
                            ⚙️ {m.brand} {m.modelName}
                          </p>
                          <p className="text-[10px] opacity-70 font-medium mt-0.5">
                            {m.category} • {m.serialNumber}
                          </p>
                        </div>
                        <Eye size={13} className="ml-2 opacity-80 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Chips Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-medium">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-bold text-[11px] uppercase">Active Scope:</span>
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Category: {selectedCategory === "ALL" ? "All Categories" : selectedCategory}
              </span>
              <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-extrabold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Brand: {selectedBrand === "ALL" ? "All Brands" : selectedBrand}
              </span>
              {selectedModelId !== "ALL" && (
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Model: {machines.find((m) => m.id === selectedModelId)?.modelName || selectedModelId}
                </span>
              )}
              {searchQuery && (
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Search: &quot;{searchQuery}&quot;
                </span>
              )}
            </div>

            <div className="text-slate-500 dark:text-slate-400 font-bold">
              Showing <strong className="text-slate-900 dark:text-white">{startRecord}–{endRecord}</strong> of {totalItems.toLocaleString()} matching machines
            </div>
          </div>
        </div>

        {/* Master Machines Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1626] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck size={19} className="text-blue-500" />
                Company Owned Machinery Fleet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Machines owned and registered by your company. Supervisors can inspect telemetry and assign tasks.
              </p>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Show per page:</span>
              <select
                value={String(pageSize)}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === "ALL" ? "ALL" : parseInt(val, 10));
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="ALL">All ({filteredMachines.length.toLocaleString()})</option>
              </select>
            </div>
          </div>

          {filteredMachines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs font-bold text-slate-400 dark:border-slate-700">
              No equipment machines found matching the selected filters or search query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 dark:border-slate-800 dark:bg-[#07111f] dark:text-slate-400">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Machine &amp; Model</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Category / Type</th>
                    <th className="p-3">Serial Number</th>
                    <th className="p-3">Operating Specs</th>
                    <th className="p-3 text-center">Components</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {paginatedMachines.map((m, idx) => {
                    const rowNumber = isAll ? idx + 1 : (currentPage - 1) * (pageSize as number) + idx + 1;

                    return (
                      <tr key={m.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 text-center font-bold text-slate-400">
                          {rowNumber}
                        </td>

                        <td className="p-3 text-slate-900 dark:text-white">
                          <p className="font-black text-xs text-slate-900 dark:text-white">
                            {m.brand} {m.modelName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            ID: <code className="font-mono">{m.id}</code>
                          </p>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {m.brand}
                          </span>
                        </td>

                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-bold">
                          🚜 {m.category}
                        </td>

                        <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono text-[11px]">
                          {m.serialNumber}
                        </td>

                        <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          <div>
                            {m.operatingWeight && m.operatingWeight !== "Standard Spec" ? (
                              <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                                <Weight size={12} className="text-blue-500" />
                                {m.operatingWeight}
                              </span>
                            ) : (
                              <span className="text-slate-400">Weight: Standard</span>
                            )}
                          </div>
                          <div className="mt-0.5">
                            {m.enginePower && m.enginePower !== "Standard Spec" ? (
                              <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                                <Zap size={12} />
                                {m.enginePower}
                              </span>
                            ) : (
                              <span className="text-slate-400">Power: Factory Spec</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {m.components?.length || 4} Components • {m.totalSpecsCount || 15} Specs
                          </span>
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            title="View Full Machine Specs & Components"
                            onClick={() => handleOpenSpecsModal(m)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-blue-950/60 dark:hover:text-blue-300"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!isAll && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages} ({totalItems.toLocaleString()} matching machines)
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {/* Page Quick Numbers with Ellipsis */}
                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === "...") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold text-xs">
                          ...
                        </span>
                      );
                    }
                    const num = Number(pageNum);
                    const isActive = currentPage === num;

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCurrentPage(num)}
                        className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-black transition ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Machine Full Specs & Components Detail Modal */}
        {selectedMachineDetail && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#07111f]">
              <div className="flex items-center justify-between border-b border-blue-500/30 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4 text-white">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Truck size={18} className="text-blue-400" />
                    {selectedMachineDetail.brand} {selectedMachineDetail.modelName}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Category: {selectedMachineDetail.category} • Serial: {selectedMachineDetail.serialNumber}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedMachineDetail(null)}
                  className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-xs">
                {/* Specs Summary Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0c1626]">
                  <div>
                    <span className="text-slate-400 font-bold">Brand</span>
                    <p className="font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedMachineDetail.brand}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Model</span>
                    <p className="font-black text-blue-600 dark:text-blue-400 mt-0.5">
                      {selectedMachineDetail.modelName}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Category</span>
                    <p className="font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedMachineDetail.category}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Operating Weight</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedMachineDetail.operatingWeight || "Standard Spec"}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold">Engine Power</span>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {selectedMachineDetail.enginePower || "Factory Spec"}
                    </p>
                  </div>
                </div>

                {/* Machine Components & Parameter Specs Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-blue-500" />
                    Standard Factory Components &amp; Parameters:
                  </h4>

                  {loadingSpecs ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-[#0c1626] flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-blue-500" />
                      Loading engineering parameters &amp; safe bounds...
                    </div>
                  ) : selectedMachineDetail.components && selectedMachineDetail.components.length > 0 ? (
                    <div className="space-y-3">
                      {selectedMachineDetail.components.map((comp: any, idx: number) => (
                        <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0c1626] space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                            <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">
                              ⚙️ {comp.name || `Component ${idx + 1}`}
                            </h5>
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {comp.category || "General"}
                            </span>
                          </div>

                          {comp.parameters && comp.parameters.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                              {comp.parameters.map((param: any, pIdx: number) => (
                                <div key={pIdx} className="rounded-lg bg-slate-50 p-2.5 dark:bg-[#101f33] text-[11px]">
                                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                    <span>{param.name}</span>
                                    <span className="text-blue-600 dark:text-blue-400">{param.unit}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Safe Range: {param.safeMin} – {param.safeMax} {param.unit} (Default: {param.defaultVal})
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0c1626]">
                      Standard mining component packages (Industrial Engine Assembly, Main Hydraulic System, Powertrain Transmission, Electrical Systems) are mapped to this model.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMachineDetail(null)}
                    className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
