import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  ShieldCheck,
  Truck,
  Wrench,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  machineService,
  type MachinePayload,
} from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import AppSelect from "../../components/ui/dropdown/AppSelect";

type Machine = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  condition?: string;
  componentsCount?: number;
  imageUrl?: string;
  companyId?: string;
  site?: string;
  status?: string;
  healthScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type MachineFormData = {
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  condition?: string;
  imageUrl?: string;
};

type FormErrors = Partial<Record<keyof MachineFormData, string>>;

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
};

const ROWS_PER_PAGE = 100;

const emptyForm: MachineFormData = {
  name: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  equipmentType: "",
  condition: "",
  imageUrl: "",
};

const equipmentTypeOptions = ["Excavator", "Truck", "Dozer", "Grader"];

import { validateMachineForm } from "../../validations";
import { getPresetMachineImage } from "../../assets/machine_images";

const resolveImageUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const url = rawUrl.trim();
  if (!url) return "";

  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) {
    return url.startsWith("/") ? url : `/${url}`;
  }
  return url;
};

const getMachineHealthScore = (m: any): number | null => {
  const val = m?.healthScore ?? m?.health_score ?? m?.intelligence?.healthScore ?? m?.health?.healthScore ?? m?.score;
  if (val !== undefined && val !== null && !isNaN(Number(val))) {
    return Math.max(0, Math.min(100, Math.round(Number(val))));
  }
  return null;
};

const getConditionBadge = (rawCondition?: string | number) => {
  if (!rawCondition || rawCondition === "N/A") {
    return (
      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
        -
      </span>
    );
  }

  const condStr = String(rawCondition || "").toLowerCase().trim();
  if (!condStr) {
    return (
      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
        -
      </span>
    );
  }

  if (condStr.includes("5") || condStr.includes("critical") || condStr.includes("poor") || condStr.includes("grade d")) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        CRITICAL
      </span>
    );
  }
  if (condStr.includes("4") || condStr.includes("warning")) {
    return (
      <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
        WARNING
      </span>
    );
  }
  if (condStr.includes("3") || condStr.includes("monitor") || condStr.includes("fair") || condStr.includes("grade c")) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        MONITOR
      </span>
    );
  }
  if (condStr.includes("2") || condStr.includes("good") || condStr.includes("grade b")) {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        GOOD
      </span>
    );
  }
  if (condStr.includes("1") || condStr.includes("new") || condStr.includes("grade a")) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        NEW
      </span>
    );
  }

  return (
    <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
      -
    </span>
  );
};

const normalizeMachine = (item: any, index: number): Machine => {
  const compCount = Array.isArray(item?.components)
    ? item.components.length
    : typeof item?.componentsCount === "number"
    ? item.componentsCount
    : typeof item?.componentCount === "number"
    ? item.componentCount
    : typeof item?.totalComponents === "number"
    ? item.totalComponents
    : 0;

  return {
    id: String(item?.id ?? item?._id ?? item?.machineId ?? index + 1),
    name: String(
      item?.name ?? item?.machineName ?? item?.machine_name ?? "N/A",
    ),
    manufacturer: String(
      item?.manufacturer ?? item?.make ?? item?.brand ?? "N/A",
    ),
    model: String(
      item?.model ?? item?.machineModel ?? item?.machine_model ?? "N/A",
    ),
    serialNumber: String(
      item?.serialNumber ?? item?.serial_number ?? item?.serialNo ?? "N/A",
    ).replace(/^DEMO-/i, ""),
    equipmentType: String(
      item?.equipmentType ??
        item?.equipment_type ??
        item?.type ??
        item?.category ??
        "N/A",
    ),
    condition: item?.condition || item?.grade ? String(item?.condition || item?.grade) : "",
    componentsCount: compCount,
    imageUrl: resolveImageUrl(item?.imageUrl || item?.image_url || item?.image || item?.photo || ""),
    companyId: item?.companyId ?? item?.company_id,
    site: item?.site || item?.location,
    status: item?.status,
    healthScore: getMachineHealthScore(item),
    createdAt: item?.createdAt || item?.created_at || "",
    updatedAt: item?.updatedAt || item?.updated_at || "",
  };
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

const getMachineArrayFromResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.data?.machines)) return response.data.machines;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.result)) return response.result;

  return [];
};

import dumpTruckImg from "../../assets/images/dump_truck_icon.png";
import excavatorImg from "../../assets/images/excavator_icon.png";
import dozerImg from "../../assets/images/dozer_icon.png";
import loaderImg from "../../assets/images/wheel_loader_icon.png";

const MachineTypeIcon = ({ equipmentType }: { equipmentType: string }) => {
  const type = equipmentType?.toLowerCase() || "";
  if (type.includes("truck")) return <Truck size={20} />;
  if (type.includes("excavator") || type.includes("jcb"))
    return <Wrench size={20} />;
  if (type.includes("dozer") || type.includes("bulldozer"))
    return <ShieldCheck size={20} />;
  return <Activity size={20} />;
};

const MachineAvatar = ({ machine }: { machine: Machine }) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [machine.imageUrl]);

  if (machine.imageUrl && !imgError) {
    return (
      <img
        src={machine.imageUrl}
        alt={machine.name}
        onError={() => setImgError(true)}
        className="h-11 w-11 shrink-0 rounded-full border-2 border-blue-500/20 object-cover shadow-sm dark:border-blue-400/30"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-inner dark:border-blue-500/30 dark:from-blue-900/30 dark:to-indigo-900/40 dark:text-blue-300">
      <MachineTypeIcon equipmentType={machine.equipmentType} />
    </div>
  );
};

const MachineTypesOverviewSection: React.FC<{ machines?: Machine[] }> = ({
  machines = [],
}) => {
  const safeList = Array.isArray(machines) ? machines : [];
  const [eqCategories, setEqCategories] = React.useState<any[]>([]);
  const [loadingCats, setLoadingCats] = React.useState(false);
  const [slideIndex, setSlideIndex] = React.useState(0);

  const CARDS_PER_VIEW = 4;

  // Fetch all Equipment Types created in Category Master from API
  React.useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCats(true);
      try {
        const res: any = await machineService.getEquipmentCategories();
        if (res && res.data && Array.isArray(res.data)) {
          setEqCategories(res.data);
        }
      } catch (err) {
        console.error("Error fetching equipment categories:", err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  // Merge created Equipment Types with any unique equipmentType from machines array
  const allCategoryCards = React.useMemo(() => {
    const map = new Map<string, { name: string; icon?: string; description?: string }>();

    eqCategories.forEach((cat) => {
      if (cat.name) {
        map.set(cat.name.trim(), {
          name: cat.name.trim(),
          icon: cat.icon || "Truck",
          description: cat.description || "",
        });
      }
    });

    safeList.forEach((m) => {
      const typeName = (m.equipmentType || (m as any).equipment_type || m.category || "").trim();
      if (typeName && !map.has(typeName)) {
        map.set(typeName, { name: typeName, icon: "Truck" });
      }
    });

    if (map.size === 0) {
      ["Dump Truck", "Excavator (JCB)", "Dozer (Bulldozer)", "Wheel Loader / Grader"].forEach((name) => {
        map.set(name, { name, icon: "Truck" });
      });
    }

    return Array.from(map.values()).map((catObj) => {
      const typeName = catObj.name;
      const lower = typeName.toLowerCase();

      const matchingMachines = safeList.filter((m) => {
        const mType = String(m.equipmentType || (m as any).equipment_type || m.category || "").toLowerCase();
        const mName = String(m.name || "").toLowerCase();
        return mType.includes(lower) || lower.includes(mType) || (mType === "" && mName.includes(lower));
      });

      let img = null;
      let iconComp = Activity;
      let badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      let borderColor = "border-blue-200 dark:border-blue-900/50";

      if (lower.includes("truck") || lower.includes("dump") || lower.includes("haul")) {
        img = dumpTruckImg;
        iconComp = Truck;
        badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
        borderColor = "border-blue-200 dark:border-blue-900/50";
      } else if (lower.includes("excavator") || lower.includes("jcb") || lower.includes("dig")) {
        img = excavatorImg;
        iconComp = Wrench;
        badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
        borderColor = "border-amber-200 dark:border-amber-900/50";
      } else if (lower.includes("dozer") || lower.includes("bulldozer") || lower.includes("tractor")) {
        img = dozerImg;
        iconComp = ShieldCheck;
        badgeColor = "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
        borderColor = "border-purple-200 dark:border-purple-900/50";
      } else if (lower.includes("loader") || lower.includes("grader")) {
        img = loaderImg;
        iconComp = Activity;
        badgeColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
        borderColor = "border-emerald-200 dark:border-emerald-900/50";
      }

      const uniqueModels = Array.from(
        new Set(matchingMachines.map((m) => m.model || m.name || m.serialNumber).filter(Boolean))
      );
      const modelsText = uniqueModels.length > 0 ? uniqueModels.join(", ") : "No machines registered yet";

      return {
        title: typeName,
        count: matchingMachines.length,
        models: modelsText,
        badge: typeName,
        badgeColor,
        borderColor,
        image: img,
        icon: iconComp,
      };
    });
  }, [safeList, eqCategories]);

  const totalSlides = Math.ceil(allCategoryCards.length / CARDS_PER_VIEW);

  const handlePrevSlide = () => {
    setSlideIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, totalSlides - 1)));
  };

  const handleNextSlide = () => {
    setSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  // Slice visible 4 cards for current slide
  const visibleCards = allCategoryCards.slice(
    slideIndex * CARDS_PER_VIEW,
    (slideIndex + 1) * CARDS_PER_VIEW
  );

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
            <Truck size={12} />
            Fleet Equipment Overview (Live API Data)
          </div>

          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Fleet Equipment Categories
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            All equipment types created in Category Master with real-time fleet machine counts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-blue-50 px-3.5 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            🏷️ {allCategoryCards.length} Equipment Types
          </div>
          <div className="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            🚚 {safeList.length} Total Machines Registered
          </div>

          {/* Slider Navigation Controls */}
          {totalSlides > 1 && (
            <div className="ml-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Previous 4 Equipment Types"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-1 text-[11px] font-extrabold text-slate-500">
                {slideIndex + 1} / {totalSlides}
              </span>
              <button
                type="button"
                onClick={handleNextSlide}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title="Next 4 Equipment Types"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {loadingCats ? (
        <div className="flex items-center justify-center py-8 text-sm font-bold text-slate-500">
          <Loader2 size={16} className="mr-2 animate-spin" /> Loading Equipment Categories from API...
        </div>
      ) : (
        <div>
          {/* Exactly 4 Cards Grid Layout in single horizontal row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visibleCards.map((cat) => {
              const IconComp = cat.icon;
              return (
                <div
                  key={cat.title}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 ${cat.borderColor}`}
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${cat.badgeColor}`}
                      >
                        {cat.badge}
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow-inner transition-transform group-hover:scale-110 dark:bg-slate-800 dark:text-slate-200">
                        <IconComp size={18} strokeWidth={2.2} />
                      </div>
                    </div>

                    {/* Full Image Preview Area */}
                    {cat.image ? (
                      <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-100/90 p-3 shadow-inner dark:border-slate-800/80 dark:from-slate-800/40 dark:to-slate-800/80">
                        <img
                          src={cat.image}
                          alt={cat.title}
                          className="h-full w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="relative flex h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-100/90 p-4 shadow-inner dark:border-slate-800/80 dark:from-slate-800/40 dark:to-slate-800/80">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md dark:bg-slate-800">
                          <IconComp
                            size={36}
                            className="text-slate-700 dark:text-slate-200"
                            strokeWidth={2}
                          />
                        </div>
                        <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
                          {cat.title}
                        </span>
                      </div>
                    )}

                    <div className="mt-4">
                      <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        {cat.title}
                      </h4>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        Category Master Type
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {cat.count}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {cat.count === 1 ? "Machine" : "Machines"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-slate-400" title={cat.models}>
                      Models: {cat.models}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel Slide Indicator Dots */}
          {totalSlides > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    slideIndex === idx
                      ? "w-6 bg-blue-600 dark:bg-blue-500"
                      : "w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
                  }`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MachineManagement: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEqFilter, setSelectedEqFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">("all");
  const [selectedOverviewMachine, setSelectedOverviewMachine] =
    useState<string>("CAT-777-DEMO");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [deleteMachine, setDeleteMachine] = useState<Machine | null>(null);

  const [formData, setFormData] = useState<MachineFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const isAnyModalOpen =
    isAddModalOpen || !!viewMachine || !!deleteMachine || !!editMachine;

  useEffect(() => {
    document.body.style.overflow = isAnyModalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const [eqCategoriesCount, setEqCategoriesCount] = useState<number>(0);
  const [eqCategoriesList, setEqCategoriesList] = useState<any[]>([]);

  const fetchMachines = async () => {
    setLoading(true);

    try {
      const response = await machineService.getMachines();
      const apiMachines = getMachineArrayFromResponse(response);

      setMachines(apiMachines.map(normalizeMachine));
    } catch (error: any) {
      console.error("Failed to fetch machines:", error);
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipmentCategories = async () => {
    try {
      const res: any = await machineService.getEquipmentCategories();
      let cats: any[] = [];
      if (Array.isArray(res)) cats = res;
      else if (Array.isArray(res?.data)) cats = res.data;
      else if (Array.isArray(res?.data?.data)) cats = res.data.data;
      else if (Array.isArray(res?.categories)) cats = res.categories;
      else if (Array.isArray(res?.result)) cats = res.result;

      setEqCategoriesList(cats);
      setEqCategoriesCount(cats.length);
    } catch (e) {
      console.error("Error fetching equipment categories:", e);
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchEquipmentCategories();
  }, []);

  const dynamicEquipmentTypes = useMemo(() => {
    const listFromApi = eqCategoriesList
      .map((c: any) => c.name || c.title || c.equipmentType)
      .filter(Boolean);

    const listFromMachines = machines
      .map((m) => m.equipmentType)
      .filter(Boolean);

    const set = new Set([...listFromApi, ...listFromMachines]);
    return Array.from(set);
  }, [eqCategoriesList, machines]);

  const filteredMachines = useMemo(() => {
    let result = machines;

    if (selectedEqFilter && selectedEqFilter !== "All") {
      result = result.filter(
        (m) =>
          m.equipmentType?.toLowerCase().includes(selectedEqFilter.toLowerCase()) ||
          m.name?.toLowerCase().includes(selectedEqFilter.toLowerCase())
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;

    return result.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.manufacturer.toLowerCase().includes(query) ||
        machine.model.toLowerCase().includes(query) ||
        machine.serialNumber.toLowerCase().includes(query) ||
        machine.equipmentType.toLowerCase().includes(query)
      );
    });
  }, [machines, searchQuery, selectedEqFilter]);

  const uniqueEquipmentTypes = useMemo(() => {
    return new Set(
      machines
        .map((machine) => machine.equipmentType)
        .filter((type) => type && type !== "N/A"),
    ).size;
  }, [machines]);

  const uniqueModels = useMemo(() => {
    return new Set(
      machines
        .map((machine) => machine.model)
        .filter((model) => model && model !== "N/A"),
    ).size;
  }, [machines]);

  const isShowAll = rowsPerPage === "all";

  const numericRowsPerPage = typeof rowsPerPage === "number" ? rowsPerPage : filteredMachines.length || 1;

  const totalPages = isShowAll ? 1 : Math.ceil(filteredMachines.length / numericRowsPerPage);

  const startItem = filteredMachines.length === 0 ? 0 : isShowAll ? 1 : (currentPage - 1) * numericRowsPerPage + 1;

  const endItem = isShowAll ? filteredMachines.length : Math.min(currentPage * numericRowsPerPage, filteredMachines.length);

  const paginatedMachines = useMemo(() => {
    if (isShowAll) return filteredMachines;
    const startIndex = (currentPage - 1) * numericRowsPerPage;
    return filteredMachines.slice(startIndex, startIndex + numericRowsPerPage);
  }, [filteredMachines, currentPage, isShowAll, numericRowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const openAddModal = () => {
    setFormErrors({});
    setFormData(emptyForm);
    setEditMachine(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (machine: Machine) => {
    setEditMachine(machine);
    setFormData({
      name: machine.name === "N/A" ? "" : machine.name,
      manufacturer: machine.manufacturer === "N/A" ? "" : machine.manufacturer,
      model: machine.model === "N/A" ? "" : machine.model,
      serialNumber: machine.serialNumber === "N/A" ? "" : machine.serialNumber,
      equipmentType:
        machine.equipmentType === "N/A" ? "" : machine.equipmentType,
      condition: machine.condition || "",
      imageUrl: machine.imageUrl || "",
    });
    setIsAddModalOpen(true);
  };

  const closeMachineFormModal = () => {
    setIsAddModalOpen(false);
    setEditMachine(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const updateField = (field: keyof MachineFormData, value: string) => {
    const updatedData = {
      ...formData,
      [field]: value,
    };

    setFormData(updatedData);

    const result = machineSchema.safeParse(updatedData);
    const newErrors: FormErrors = {};

    if (!result.success) {
      result.error.issues.forEach((err) => {
        const key = err.path[0] as keyof MachineFormData;
        if (!newErrors[key]) {
          newErrors[key] = err.message;
        }
      });
    }

    // Duplicate Serial Number Validation check within company fleet
    if (updatedData.serialNumber.trim()) {
      const trimmedSerial = updatedData.serialNumber.trim().toLowerCase();
      const isDuplicate = machines.some(
        (m) =>
          m.serialNumber.toLowerCase() === trimmedSerial &&
          (!editMachine || m.id !== editMachine.id)
      );
      if (isDuplicate) {
        newErrors.serialNumber = "Serial number already exists in your fleet.";
      }
    }

    setFormErrors(newErrors);
  };

  const buildPayload = (): any => {
    return {
      name: formData.name.trim(),
      manufacturer: formData.manufacturer?.trim() || "Komatsu",
      model: formData.model.trim(),
      serialNumber: formData.serialNumber.trim(),
      equipmentType: formData.equipmentType.trim(),
      imageUrl: formData.imageUrl && formData.imageUrl.trim() ? formData.imageUrl : null,
    };
  };

  const validateForm = () => {
    const { isValid, errors } = validateMachineForm(formData, machines, editMachine?.id);
    setFormErrors(errors as FormErrors);
    return isValid;
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = buildPayload();

      if (editMachine) {
        const response: any = await machineService.updateMachine(
          editMachine.id,
          payload,
        );

        if (response?.offline && response?.queued) {
          setMachines((prev) =>
            prev.map((machine) =>
              machine.id === editMachine.id
                ? {
                    ...machine,
                    ...payload,
                  }
                : machine,
            ),
          );
          closeMachineFormModal();
          return;
        }
      } else {
        const response: any = await machineService.createMachine(payload);

        if (response?.offline && response?.queued) {
          setMachines((prev) => [
            {
              id: `offline-${Date.now()}`,
              name: payload.name,
              model: payload.model,
              serialNumber: payload.serialNumber,
              equipmentType: payload.equipmentType || "N/A",
              companyId: "",
            },
            ...prev,
          ]);

          closeMachineFormModal();
          return;
        }
      }

      closeMachineFormModal();
      await fetchMachines();
    } catch (error: any) {
      console.error("Machine submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMachine = async () => {
    if (!deleteMachine) return;

    setIsDeleting(true);

    try {
      const response: any = await machineService.deleteMachine(
        deleteMachine.id,
      );

      // Offline delete
      if (response?.offline && response?.queued) {
        setMachines((prev) =>
          prev.filter((machine) => machine.id !== deleteMachine.id),
        );

        setDeleteMachine(null);
        return;
      }

      setDeleteMachine(null);

      await fetchMachines();
    } catch (error: any) {
      console.error("Machine delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const equipmentOptions = useMemo(() => {
    const list = eqCategoriesList
      .map((cat: any) => (cat?.name || cat?.title || cat?.equipmentType || String(cat || "")).trim())
      .filter(Boolean);

    const uniqueList = Array.from(new Set(list));

    return uniqueList.map((type) => ({
      label: type,
      value: type,
    }));
  }, [eqCategoriesList]);

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
              {/* Left */}
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                  <ShieldCheck size={14} />
                  Fleet Machine Control
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Machine Management
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Manage company machines, equipment model records, serial
                  numbers and machine type information from connected backend
                  APIs.
                </p>
              </div>

              {/* Action */}
              <button
                onClick={openAddModal}
                className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/95 px-5 text-sm font-bold text-[#3730D9] shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white sm:w-fit"
              >
                <Plus size={18} strokeWidth={2.4} />
                Add Machine
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="Total Machines" value={`${machines.length}`} />
            <MetricCard
              title="Equipment Types"
              value={`${eqCategoriesCount || uniqueEquipmentTypes || 0}`}
            />
            <MetricCard
              title="Models Registered"
              value={`${uniqueModels}`}
            />
          </div>
        </div>

        <MachineTypesOverviewSection machines={machines} />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Side */}
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
                <ShieldCheck size={13} />
                Fleet Registry
              </div>

              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Fleet Machine Registry
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Search, review and maintain all machine records without changing
                the existing API flow.
              </p>
            </div>

            {/* Right Side */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative w-full sm:w-80">
                <Search
                  size={17}
                  strokeWidth={2.4}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search name, model, serial..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>

              <button
                onClick={fetchMachines}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b] sm:w-fit"
              >
                <RefreshCw
                  size={17}
                  strokeWidth={2.4}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Dynamic Equipment Types Filter Bar (Fetched from API & Fleet) */}
          <div className="flex overflow-x-auto items-center gap-2 border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-[#0b1728]/80 hme-hide-scrollbar">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Equipment Filter:
            </span>

            <button
              type="button"
              onClick={() => setSelectedEqFilter("All")}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                selectedEqFilter === "All"
                  ? "bg-blue-600 text-white shadow-md"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#15273f]"
              }`}
            >
              All Equipment ({machines.length})
            </button>

            {dynamicEquipmentTypes.map((type) => {
              const count = machines.filter(
                (m) =>
                  m.equipmentType?.toLowerCase().includes(type.toLowerCase()) ||
                  m.name?.toLowerCase().includes(type.toLowerCase())
              ).length;
              const isActive = selectedEqFilter.toLowerCase() === type.toLowerCase();

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedEqFilter(type)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#15273f]"
                  }`}
                >
                  {type} ({count})
                </button>
              );
            })}
          </div>

          <div className="w-full overflow-x-auto hme-hide-scrollbar">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                  <th className="w-20 px-6 py-4 font-bold">#</th>
                  <th className="px-6 py-4 font-bold">Machine</th>
                  <th className="px-6 py-4 font-bold">Manufacturer</th>
                  <th className="px-6 py-4 font-bold">Model</th>
                  <th className="px-6 py-4 font-bold">Serial Number</th>
                  <th className="px-6 py-4 font-bold">Equipment Type</th>
                  <th className="px-6 py-4 font-bold">Condition</th>
                  <th className="px-6 py-4 font-bold">Health Status</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          <Loader2 className="animate-spin" size={24} />
                        </div>

                        <p className="text-sm font-extrabold tracking-tight text-slate-700 dark:text-slate-300">
                          Loading machines...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMachines.length > 0 ? (
                  paginatedMachines.map((machine, index) => (
                    <tr
                      key={machine.id}
                      onClick={() => setSelectedOverviewMachine(machine.name)}
                      className={`cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/[0.03] ${
                        selectedOverviewMachine === machine.name
                          ? "bg-blue-50/60 dark:bg-blue-900/10"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-extrabold text-slate-500 dark:text-slate-400">
                        {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                      </td>

                      <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <MachineAvatar machine={machine} />

                            <div className="flex min-w-0 flex-col gap-1">
                              <span className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                                {machine.name}
                              </span>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                  {machine.equipmentType || "Machine Record"}
                                </span>

                                <span className="w-fit rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                  {machine.componentsCount ?? 0} {machine.componentsCount === 1 ? "Component" : "Components"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {machine.manufacturer || "Komatsu"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {machine.model}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {machine.serialNumber}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            {machine.equipmentType}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {getConditionBadge(machine.condition)}
                        </td>

                        <td className="px-6 py-4">
                          {(() => {
                            const score = machine.healthScore !== undefined ? machine.healthScore : getMachineHealthScore(machine);

                            if (score === null || score === undefined) {
                              return (
                                <div className="flex flex-col gap-1.5 min-w-[130px] max-w-[150px]">
                                  <div className="flex items-center justify-between text-xs font-black">
                                    <span className="text-slate-400 dark:text-slate-500">Uncalculated</span>
                                    <span className="text-[11px] font-bold text-slate-400">0%</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                    <div className="h-full rounded-full bg-slate-300 dark:bg-slate-700 w-0" />
                                  </div>
                                </div>
                              );
                            }

                            const isCritical = score < 50 || machine.status === "Critical";
                            const isWarning = (score >= 50 && score < 85) || machine.status === "Warning";
                            const barColor = isCritical
                              ? "bg-red-500"
                              : isWarning
                              ? "bg-amber-500"
                              : "bg-emerald-500";
                            const textColor = isCritical
                              ? "text-red-700 dark:text-red-400"
                              : isWarning
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-emerald-700 dark:text-emerald-400";
                            const label = isCritical ? "Critical" : isWarning ? "Warning" : "Optimal";

                            return (
                              <div className="flex flex-col gap-1.5 min-w-[130px] max-w-[150px]">
                                <div className="flex items-center justify-between text-xs font-black">
                                  <span className={textColor}>{label}</span>
                                  <span className="text-[11px] font-bold text-slate-500">{score}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewMachine(machine)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                            title="View Machine Details"
                          >
                            <Eye size={15} strokeWidth={2.4} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(machine)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-white text-orange-700 transition hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
                            title="Edit Machine"
                          >
                            <Pencil size={15} strokeWidth={2.4} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteMachine(machine)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                            title="Delete Machine"
                          >
                            <Trash2 size={15} strokeWidth={2.4} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          <AlertTriangle size={24} strokeWidth={2.4} />
                        </div>

                        <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                          No machines found
                        </h3>

                        <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                          {searchQuery.trim()
                            ? "Aapke search query ke liye koi machine record nahi mila. Dusra search term try karein."
                            : "Abhi machine API se koi data nahi mila. Add Machine button se new machine create kar sakte hain."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={filteredMachines.length}
            itemsPerPage={rowsPerPage}
            itemLabel="machines"
            pageSizeOptions={[5, 10, 25, 50]}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setRowsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </section>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]"
          >
            <div className="flex items-center justify-between rounded-t-2xl border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-5 shadow-sm">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  {editMachine ? "Edit Machine" : "Add New Machine"}
                </h2>

                <p className="mt-1 text-sm font-medium text-blue-100">
                  Machine API body: name, model, serialNumber and equipmentType.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMachineFormModal}
                className="rounded-lg p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} strokeWidth={2.4} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-170px)] overflow-y-auto">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FormInput
                  label="Machine Name"
                  name="name"
                  value={formData.name}
                  error={formErrors.name}
                  maxLength={50}
                  onChange={(value) => updateField("name", value)}
                  placeholder="e.g. Haul Truck 01"
                />

                <FormInput
                  label="Manufacturer"
                  name="manufacturer"
                  value={formData.manufacturer}
                  error={formErrors.manufacturer}
                  maxLength={50}
                  onChange={(value) => updateField("manufacturer", value)}
                  placeholder="e.g. Komatsu"
                />

                <FormInput
                  label="Model"
                  name="model"
                  value={formData.model}
                  error={formErrors.model}
                  maxLength={30}
                  onChange={(value) => updateField("model", value)}
                  placeholder="e.g. 980E-5"
                />

                <FormInput
                  label="Serial Number"
                  name="serialNumber"
                  value={formData.serialNumber}
                  error={formErrors.serialNumber}
                  maxLength={50}
                  onChange={(value) => updateField("serialNumber", value)}
                  placeholder="e.g. HT-400T-01"
                />

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Equipment Type *
                    </span>
                  </div>

                  <AppSelect
                    value={formData.equipmentType}
                    options={equipmentOptions}
                    onChange={(value) => updateField("equipmentType", value)}
                    placeholder="Select Equipment Type"
                    triggerClassName={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 dark:bg-[#101f33] dark:text-white ${
                      formErrors.equipmentType
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  />

                  <div className="mt-1 min-h-[20px]">
                    {formErrors.equipmentType && (
                      <p className="text-xs font-medium text-red-500">
                        {formErrors.equipmentType}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Machine Condition (Grade)
                    </span>
                  </div>

                  <select
                    value={formData.condition || ""}
                    onChange={(e) => updateField("condition", e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                  >
                    <option value="">Select Condition Grade (Optional)</option>
                    <option value="1 - NEW">1 - NEW (Pristine / Brand New)</option>
                    <option value="2 - GOOD">2 - GOOD (Normal Operational)</option>
                    <option value="3 - MONITOR">3 - MONITOR (Fair / Minor Wear)</option>
                    <option value="4 - WARNING">4 - WARNING (High Wear / Service Needed)</option>
                    <option value="5 - CRITICAL">5 - CRITICAL (Major Damage / Immediate Repair)</option>
                  </select>

                  <div className="mt-1 min-h-[20px]" />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Machine Image (Photo)
                  </label>
                  <div className="flex items-center gap-5">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-900">
                      {formData.imageUrl ? (
                        <>
                          <img
                            src={formData.imageUrl}
                            alt="Uploaded Custom Photo"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                            className="absolute bottom-1 right-1 rounded-full bg-red-600 p-1 text-white shadow transition hover:bg-red-700"
                            title="Remove uploaded image"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                          <MachineTypeIcon equipmentType={formData.equipmentType || "Machine"} />
                          <span className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">No Image</span>
                        </div>
                      )}
                    </div>

                    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40">
                      <Plus size={16} />
                      <span>{formData.imageUrl ? "Change Custom Photo" : "Upload Custom Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressedDataUrl = await compressImageFile(file);
                              if (compressedDataUrl) {
                                updateField("imageUrl", compressedDataUrl);
                              }
                            } catch (err) {
                              console.error("Image compression error:", err);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeMachineFormModal}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                {editMachine ? "Update Machine" : "Add Machine"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewMachine && (
        <MachineDetailsModal
          machine={viewMachine}
          onClose={() => setViewMachine(null)}
        />
      )}

      {deleteMachine && (
        <DeleteModal
          machine={deleteMachine}
          deleting={isDeleting}
          onCancel={() => setDeleteMachine(null)}
          onConfirm={handleDeleteMachine}
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

function MachineDetailsModal({
  machine,
  onClose,
}: {
  machine: Machine;
  onClose: () => void;
}) {
  const [components, setComponents] = useState<any[]>([]);
  const [loadingComps, setLoadingComps] = useState<boolean>(true);

  useEffect(() => {
    const fetchMachineComponents = async () => {
      try {
        setLoadingComps(true);
        const res: any = await componentService.getComponentsByMachineId(machine.id);
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res && Array.isArray(res.data)) list = res.data;

        setComponents(list);
      } catch (err) {
        console.error("Failed to load components for view modal:", err);
      } finally {
        setLoadingComps(false);
      }
    };
    if (machine?.id) {
      fetchMachineComponents();
    }
  }, [machine.id]);

  const score = machine.healthScore !== undefined && machine.healthScore !== null ? Number(machine.healthScore) : null;
  const isCritical = (score !== null && score < 50) || machine.status === "Critical";
  const isWarning = (score !== null && score >= 50 && score < 85) || machine.status === "Warning";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-blue-700/30 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-5 text-white">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Machine Health & Component Inspector
            </h2>
            <p className="mt-0.5 text-xs font-medium text-blue-100">
              Live components health metrics & operational summary for {machine.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[calc(92vh-90px)] overflow-y-auto p-6 space-y-6">
          {/* Top Banner: Machine Info + Health Score Bar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                  <Truck size={13} /> {machine.equipmentType}
                </span>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {machine.name}
                </h3>
                <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {machine.manufacturer || "Komatsu"} • Model: {machine.model} • S/N: {machine.serialNumber}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Overall Fleet Health Status
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      isCritical
                        ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                        : isWarning
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                    }`}
                  >
                    {isCritical ? "Critical" : isWarning ? "Warning" : "Optimal"}
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {score !== null ? `${score}%` : "100%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Component Health Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Assigned Machine Components ({components.length})
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live calculated health score for each component belonging to {machine.name}.
                </p>
              </div>
            </div>

            {loadingComps ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 size={20} className="mr-2 animate-spin text-blue-600" />
                Fetching live component health data...
              </div>
            ) : components.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500">No components registered to this machine yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {components.map((comp) => {
                  const compName = comp.name || (comp.description ? comp.description.split(" - ")[0] : "Component");
                  const currentHours = Number(comp.currentHours || 0);
                  const installHours = Number(comp.installHours || 0);
                  const plannedLife = Number(comp.plannedLife || 8000) <= 0 ? 8000 : Number(comp.plannedLife);
                  const hoursRun = Math.max(0, currentHours - installHours);
                  const lifeUsed = Math.min(100, Math.round((hoursRun / plannedLife) * 100));
                  const healthPercent = Math.max(0, 100 - lifeUsed);
                  const cond = Number(comp.condition || 3);

                  const isCompCrit = cond >= 5 || lifeUsed >= 95;
                  const isCompWarn = cond >= 4 || lifeUsed >= 85;
                  const isCompMon = cond >= 3 || lifeUsed >= 70;

                  const statusLabel = isCompCrit ? "Critical" : isCompWarn ? "Warning" : isCompMon ? "Monitor" : "Healthy";
                  const badgeColor = isCompCrit
                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    : isCompWarn
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                    : isCompMon
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";

                  const barColor = isCompCrit ? "bg-red-500" : isCompWarn ? "bg-amber-500" : isCompMon ? "bg-yellow-500" : "bg-emerald-500";

                  return (
                    <div
                      key={comp.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-400 dark:border-slate-800 dark:bg-[#101f33]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="max-w-[70%]">
                          <h5 className="truncate text-sm font-extrabold text-slate-900 dark:text-white" title={compName}>
                            {compName}
                          </h5>
                          <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                            S/N: {comp.serialNumber || "N/A"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Health Score</span>
                          <span className="text-slate-900 dark:text-white">{healthPercent}%</span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${healthPercent}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                          <span>Run: {hoursRun.toLocaleString()} hrs</span>
                          <span>Life: {plannedLife.toLocaleString()} hrs</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white transition hover:bg-blue-700"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  machine,
  deleting,
  onCancel,
  onConfirm,
}: {
  machine: Machine;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        <div className="rounded-t-2xl border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-blue-100">
              <Trash2 size={22} strokeWidth={2.4} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Delete Machine?
              </h2>

              <p className="mt-1 text-sm font-medium text-blue-100">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-extrabold text-slate-950 dark:text-white">
              {machine.name}
            </span>
            ? This will remove the selected machine record.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting && <Loader2 size={17} className="animate-spin" />}
              Delete Machine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FormInputProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  onChange: (value: string) => void;
};

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value = "",
  error,
  placeholder,
  type = "text",
  maxLength,
  onChange,
}) => {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {label} *
        </span>
        {maxLength && (
          <span
            className={`text-[11px] font-semibold ${
              value.length > maxLength
                ? "text-red-500 font-bold"
                : value.length === maxLength
                ? "text-amber-500 font-bold"
                : "text-slate-400"
            }`}
          >
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      <input
        type={type}
        name={name}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-[#101f33] dark:text-white ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700"
        }`}
      />

      <div className="mt-1 min-h-[20px]">
        {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      </div>
    </label>
  );
};

function Pagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        Showing {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          disabled={currentPage === 1}
          onClick={onPrev}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#12243b]"
        >
          Previous
        </button>

        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={onNext}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#12243b]"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type DetailItemProps = {
  label: string;
  value: string;
};

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
};

export default MachineManagement;
