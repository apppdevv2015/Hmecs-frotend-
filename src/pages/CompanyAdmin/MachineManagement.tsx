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
} from "lucide-react";

import {
  machineService,
  type MachinePayload,
} from "../../services/companyadmin/machineService";
import AppSelect from "../../components/ui/dropdown/AppSelect";

type Machine = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  imageUrl?: string;
  companyId?: string;
  site?: string;
  status?: string;
};

type MachineFormData = {
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
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
  model: "",
  serialNumber: "",
  equipmentType: "",
  imageUrl: "",
};

const equipmentTypeOptions = ["Excavator", "Truck", "Dozer", "Grader"];

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

  imageUrl: z.string().optional(),
});

const normalizeMachine = (item: any, index: number): Machine => {
  return {
    id: String(item?.id ?? item?._id ?? item?.machineId ?? index + 1),
    name: String(
      item?.name ?? item?.machineName ?? item?.machine_name ?? "N/A",
    ),
    model: String(
      item?.model ?? item?.machineModel ?? item?.machine_model ?? "N/A",
    ),
    serialNumber: String(
      item?.serialNumber ?? item?.serial_number ?? item?.serialNo ?? "N/A",
    ),
    equipmentType: String(
      item?.equipmentType ??
        item?.equipment_type ??
        item?.type ??
        item?.category ??
        "N/A",
    ),
    imageUrl: item?.imageUrl || item?.image || item?.photo || "",
    companyId: item?.companyId ?? item?.company_id,
    site: item?.site || item?.location,
    status: item?.status,
  };
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

const MachineTypesOverviewSection: React.FC<{ machines?: Machine[] }> = ({
  machines = [],
}) => {
  const safeList = Array.isArray(machines) ? machines : [];

  const truckList = safeList.filter((m) => {
    const eqType = String(m?.equipmentType ?? "").toLowerCase();
    const model = String(m?.model ?? "").toLowerCase();
    const name = String(m?.name ?? "").toLowerCase();
    return (
      eqType.includes("truck") ||
      model.includes("cat 7") ||
      name.includes("dt") ||
      name.includes("cat-777")
    );
  });

  const excavatorList = safeList.filter((m) => {
    const eqType = String(m?.equipmentType ?? "").toLowerCase();
    const name = String(m?.name ?? "").toLowerCase();
    return (
      eqType.includes("excavator") ||
      eqType.includes("jcb") ||
      name.includes("ex")
    );
  });

  const dozerList = safeList.filter((m) => {
    const eqType = String(m?.equipmentType ?? "").toLowerCase();
    const name = String(m?.name ?? "").toLowerCase();
    return eqType.includes("dozer") || name.includes("dz");
  });

  const loaderList = safeList.filter(
    (m) =>
      !truckList.includes(m) &&
      !excavatorList.includes(m) &&
      !dozerList.includes(m),
  );

  const getModelsText = (list: any[], fallback: string) => {
    if (!list || list.length === 0) return fallback;
    const models = Array.from(
      new Set(
        list.map((m) => m.model || m.name || m.machineId).filter(Boolean),
      ),
    );
    return models.length > 0 ? models.slice(0, 3).join(", ") : fallback;
  };

  const truckCount = truckList.length;
  const excavatorCount = excavatorList.length;
  const dozerCount = dozerList.length;
  const loaderCount = loaderList.length || Math.max(1, safeList.length - (truckCount + excavatorCount + dozerCount));

  const categories = [
    {
      title: "Dump Truck",
      category: "Heavy Haulage Fleet",
      count: truckCount || 3,
      models: getModelsText(truckList, "CAT 777G, CAT 797F, Hitachi EH5000"),
      badge: "Dump Truck",
      badgeColor:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      borderColor: "border-blue-200 dark:border-blue-900/50",
      image: dumpTruckImg,
      icon: Truck,
    },
    {
      title: "Excavator (JCB)",
      category: "Mining & Digging Fleet",
      count: excavatorCount || 2,
      models: getModelsText(excavatorList, "CAT 6060, Liebherr R9800"),
      badge: "Excavator / JCB",
      badgeColor:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
      borderColor: "border-amber-200 dark:border-amber-900/50",
      image: excavatorImg,
      icon: Wrench,
    },
    {
      title: "Dozer (Bulldozer)",
      category: "Earthmoving & Leveling",
      count: dozerCount || 1,
      models: getModelsText(dozerList, "Komatsu D475A"),
      badge: "Bulldozer",
      badgeColor:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
      borderColor: "border-purple-200 dark:border-purple-900/50",
      image: dozerImg,
      icon: ShieldCheck,
    },
    {
      title: "Wheel Loader / Grader",
      category: "Material Loading Fleet",
      count: loaderCount,
      models: getModelsText(loaderList, "CAT 994K Wheel Loader"),
      badge: "Loader / Grader",
      badgeColor:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
      borderColor: "border-emerald-200 dark:border-emerald-900/50",
      image: loaderImg,
      icon: Activity,
    },
  ];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
            <Truck size={12} />
            Equipment Categories
          </div>

          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Fleet Equipment Overview
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Overview of machine logos and heavy equipment categories in your fleet
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {safeList.length} Total Machines Registered
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((cat) => {
          const IconComp = cat.icon;
          return (
            <div
              key={cat.title}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 ${cat.borderColor}`}
            >
              {/* Top Header Badge & Action Icon */}
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

                {/* 50% Image / Preview Area */}
                {cat.image ? (
                  <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-100/90 p-3 shadow-inner dark:border-slate-800/80 dark:from-slate-800/40 dark:to-slate-800/80">
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="h-full w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="relative flex h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-slate-100/90 p-4 shadow-inner dark:border-slate-800/80 dark:from-slate-800/40 dark:to-slate-800/80">
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

                {/* 50% Data Details */}
                <div className="mt-4">
                  <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {cat.title}
                  </h4>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {cat.category}
                  </p>
                </div>
              </div>

              {/* Footer Data Metrics */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {cat.count}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {cat.count === 1 ? "Machine" : "Machines"}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                  Models: {cat.models}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MachineManagement: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(() => {
    fetchMachines();
  }, []);

  const filteredMachines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return machines;

    return machines.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.model.toLowerCase().includes(query) ||
        machine.serialNumber.toLowerCase().includes(query) ||
        machine.equipmentType.toLowerCase().includes(query)
      );
    });
  }, [machines, searchQuery]);

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

  const totalPages = Math.ceil(filteredMachines.length / ROWS_PER_PAGE);

  const startItem =
    filteredMachines.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;

  const endItem = Math.min(
    currentPage * ROWS_PER_PAGE,
    filteredMachines.length,
  );

  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredMachines.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredMachines, currentPage]);

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
      model: machine.model === "N/A" ? "" : machine.model,
      serialNumber: machine.serialNumber === "N/A" ? "" : machine.serialNumber,
      equipmentType:
        machine.equipmentType === "N/A" ? "" : machine.equipmentType,
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

    if (result.success) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));

      return;
    }

    const issue = result.error.issues.find((err) => err.path[0] === field);

    setFormErrors((prev) => ({
      ...prev,
      [field]: issue?.message,
    }));
  };

  const buildPayload = (): any => {
    return {
      name: formData.name.trim(),
      model: formData.model.trim(),
      serialNumber: formData.serialNumber.trim(),
      equipmentType: formData.equipmentType.trim(),
      imageUrl: formData.imageUrl || undefined,
    };
  };

  const validateForm = () => {
    const result = machineSchema.safeParse(formData);

    if (result.success) {
      setFormErrors({});
      return true;
    }

    const errors: FormErrors = {};

    result.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof MachineFormData;

      errors[key] = issue.message;
    });

    setFormErrors(errors);

    return false;
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

  const equipmentOptions = equipmentTypeOptions.map((type) => ({
    label: type,
    value: type,
  }));

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
              value={`${uniqueEquipmentTypes}`}
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

          <div className="w-full overflow-x-auto hme-hide-scrollbar">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                  <th className="w-20 px-6 py-4 font-bold">#</th>
                  <th className="px-6 py-4 font-bold">Machine</th>
                  <th className="px-6 py-4 font-bold">Model</th>
                  <th className="px-6 py-4 font-bold">Serial Number</th>
                  <th className="px-6 py-4 font-bold">Equipment Type</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
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
                          {machine.imageUrl ? (
                            <img
                              src={machine.imageUrl}
                              alt={machine.name}
                              className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                              <MachineTypeIcon equipmentType={machine.equipmentType} />
                            </div>
                          )}

                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                              {machine.name}
                            </span>

                            <span className="mt-0.5 w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                              {machine.equipmentType || "Machine Record"}
                            </span>
                          </div>
                        </div>
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
                    <td colSpan={6} className="px-6 py-16 text-center">
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
            onPrev={handlePrevPage}
            onNext={handleNextPage}
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
                  onChange={(value) => updateField("name", value)}
                  placeholder="e.g. CKIJ-990-020"
                />

                <FormInput
                  label="Model"
                  name="model"
                  value={formData.model}
                  error={formErrors.model}
                  onChange={(value) => updateField("model", value)}
                  placeholder="e.g. 990H"
                />

                <FormInput
                  label="Serial Number"
                  name="serialNumber"
                  value={formData.serialNumber}
                  error={formErrors.serialNumber}
                  onChange={(value) => updateField("serialNumber", value)}
                  placeholder="e.g. SN-12345"
                />

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Equipment Type
                  </label>

                  <AppSelect
                    value={formData.equipmentType}
                    options={equipmentOptions}
                    onChange={(value) => updateField("equipmentType", value)}
                    placeholder="Select Equipment Type"
                    triggerClassName={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 dark:bg-[#101f33] dark:text-white ${
                      formErrors.equipmentType
                        ? "border-red-500"
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

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Machine Image (Photo)
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.imageUrl ? (
                      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                        <img
                          src={formData.imageUrl}
                          alt="Machine Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                          className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <Plus size={16} />
                          <span>Upload Custom Machine Image</span>
                        </div>
                        <span className="mt-0.5 text-[11px] text-slate-400">Select PNG, JPG, or WebP photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
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
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Machine Details
            </h2>

            <p className="mt-1 text-sm font-medium text-blue-100">
              Complete machine record and equipment identification.
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
            {machine.imageUrl ? (
              <img
                src={machine.imageUrl}
                alt={machine.name}
                className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm dark:border-slate-700"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <span className="text-lg font-extrabold">
                  {machine.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                {machine.name}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {machine.model} • {machine.serialNumber}
              </p>
            </div>

            <span className="inline-flex w-fit shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              {machine.equipmentType}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Machine Name" value={machine.name} />
            <DetailItem label="Model" value={machine.model} />
            <DetailItem label="Serial Number" value={machine.serialNumber} />
            <DetailItem label="Equipment Type" value={machine.equipmentType} />
            {machine.site && (
              <DetailItem label="Site / Location" value={machine.site} />
            )}
            {machine.status && (
              <DetailItem label="Status" value={machine.status.toUpperCase()} />
            )}
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
  onChange: (value: string) => void;
};

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  value,
  error,
  placeholder,
  type = "text",
  onChange,
}) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-[#101f33] dark:text-white
${
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
