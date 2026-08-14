import { useState, useEffect, useMemo } from "react";
import {
  Wrench,
  UserCheck,
  Search,
  CheckCircle2,
  Cpu,
  Truck,
  Plus,
  ShieldCheck,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  User,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
  Calendar,
} from "lucide-react";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination";
import { machineService } from "../../services/companyadmin/machineService";
import { userService, normalizeUsersResponse } from "../../services/Auth/userService";
import SupervisorUserDetailModal, { type UserDetailData } from "../../components/supervisor/SupervisorUserDetailModal";

export type ComponentArtisanAssignment = {
  id: string;
  taskId?: string;
  machineId: string;
  machineName: string;
  componentId: string;
  componentName: string;
  artisanId: string;
  artisanName: string;
  artisanSpecialization: string;
  supervisorName?: string;
  workScope: string;
  priority: "High" | "Medium" | "Low";
  startDate?: string;
  dueDate?: string;
  assignedAt: string;
  status: "Active" | "Completed" | "Pending";
};

const ARTISAN_ASSIGNMENTS_KEY = "hme_supervisor_artisan_component_assignments";

const DEFAULT_COMPONENTS = [
  "Engine & Turbocharger",
  "Hydraulic Main Pump",
  "Transmission & Gearbox",
  "Brake System & Calipers",
  "Electrical & Battery System",
  "Undercarriage & Track Assembly",
  "Cooling & Radiator Unit",
];

export default function SupervisorAssignedArtisans() {
  const [machines, setMachines] = useState<any[]>([]);
  const [artisans, setArtisans] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<ComponentArtisanAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Machine, Component & Artisan Selection Filters (Default to "all" for all!)
  const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
  const [selectedComponentFilter, setSelectedComponentFilter] = useState<string>("all");
  const [selectedArtisanFilter, setSelectedArtisanFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(5);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMachineId, setModalMachineId] = useState("");
  const [modalComponentName, setModalComponentName] = useState("");
  const [modalArtisanId, setModalArtisanId] = useState("");
  const [modalWorkScope, setModalWorkScope] = useState("");
  const [modalPriority, setModalPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [modalStartDate, setModalStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalDueDate, setModalDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailData | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const getOperatorForMachine = (machineId: string, machineName = "") => {
    try {
      const storedTasks = JSON.parse(localStorage.getItem("hme_supervisor_task_assignments") || "[]");
      const found = storedTasks.find((t: any) => {
        if (!t) return false;
        if (t.machineId && t.machineId === machineId) return true;
        if (t.machineName && machineName && (t.machineName.includes(machineName) || machineName.includes(t.machineName.split(" (")[0]))) return true;
        return false;
      });
      if (found?.operatorName) return found.operatorName;
    } catch {}
    return "Operator Assigned";
  };

  const getTaskDurationText = (assignedAt: string) => {
    try {
      const assignedDate = new Date(assignedAt);
      if (isNaN(assignedDate.getTime())) return "Active Today";
      const now = new Date();
      const diffMs = now.getTime() - assignedDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffDays <= 0) {
        if (diffHours <= 1) return "Just Started";
        return `${diffHours} Hours Active`;
      }
      if (diffDays === 1) return "1 Day Active";
      return `${diffDays} Days Active`;
    } catch {
      return "Active";
    }
  };

  const handleOpenArtisanModal = (artisanName: string, specialization = "", machineName = "", workScope = "") => {
    const detail: UserDetailData = {
      id: artisanName.toLowerCase().replace(/\s+/g, "_"),
      name: artisanName,
      role: specialization || "Artisan & Maintenance Specialist",
      email: `${artisanName.toLowerCase().replace(/\s+/g, ".")}@hme.com`,
      phone: "+91 98765 43210",
      company: "HME Mining Operations",
      status: "Active",
      shift: "Day Shift (08:00 - 16:00)",
      assignedMachines: [
        {
          name: machineName || "Heavy Fleet Equipment Unit",
          health: 88,
          status: "Healthy",
          location: "Site A - Workshop",
          assignedAt: "Today",
        },
      ],
      workScope: workScope || "Specialized mechanical & component maintenance inspection, pressure testing, and component overhaul.",
    };
    setSelectedUserDetail(detail);
    setIsUserModalOpen(true);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [machinesRes, usersRes] = await Promise.allSettled([
        machineService.getCompanyMachines(),
        userService.getUsers({ limit: 100 }),
      ]);

      let rawMachines: any[] = [];
      if (machinesRes.status === "fulfilled") {
        const val: any = machinesRes.value;
        rawMachines = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.machines)
              ? val.machines
              : [];
      }

      let userList: any[] = [];
      if (usersRes.status === "fulfilled") {
        userList = normalizeUsersResponse(usersRes.value as any);
      }

      // Filter Artisans / Engineers
      const artisanUsers = userList.filter((u) => {
        const r = String(
          (typeof u.role === "string" ? u.role : u.role?.name) || u.role_name || ""
        ).toLowerCase();
        const full = `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""} ${u.name || ""}`.toLowerCase();

        // Strict Exclusion: Filter out any DB user with "engineer" in name or role!
        if (full.includes("engineer") || r.includes("engineer")) {
          return false;
        }

        return (
          r.includes("artisan") ||
          r.includes("mechanic") ||
          r.includes("technician")
        );
      });

      // Normalize Artisans
      const normalizedArtisans = artisanUsers
        .map((u, idx) => {
          const first = u.firstName || u.first_name || "";
          const last = u.lastName || u.last_name || "";
          const name = `${first} ${last}`.trim() || u.name || `Artisan ${idx + 1}`;
          const rawSpec =
            (typeof u.role === "string" ? u.role : u.role?.name) ||
            "Equipment Maintenance Specialist";
          const spec = String(rawSpec)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          return {
            id: u.id || `ART-${idx + 1}`,
            name,
            specialization: spec,
          };
        })
        .filter((a) => !a.name.toLowerCase().includes("engineer") && !a.specialization.toLowerCase().includes("engineer"));

      const finalArtisans =
        normalizedArtisans.length > 0
          ? normalizedArtisans
          : [
              { id: "ART-101", name: "David Miller", specialization: "Senior Hydraulics Artisan" },
              { id: "ART-102", name: "Alex Vance", specialization: "Diesel Engine Specialist" },
              { id: "ART-103", name: "Suresh Patil", specialization: "Electrical Auto Tech" },
              { id: "ART-104", name: "Rahul Sharma", specialization: "Undercarriage Specialist" },
            ];

      setMachines(rawMachines);
      setArtisans(finalArtisans);

      // Load stored assignments & permanently delete old Thabo / ckevin / Engineer entries
      try {
        const storedJson = localStorage.getItem(ARTISAN_ASSIGNMENTS_KEY);
        if (storedJson) {
          const loaded: ComponentArtisanAssignment[] = JSON.parse(storedJson);
          const cleanLoaded = loaded.filter(
            (a) =>
              !a.artisanName?.toLowerCase().includes("engineer") &&
              !a.artisanSpecialization?.toLowerCase().includes("engineer") &&
              !a.artisanName?.toLowerCase().includes("thabo") &&
              !a.artisanName?.toLowerCase().includes("ckevin")
          ).map((item) => {
            const startDate = item.startDate || (item.assignedAt ? "2026-08-14" : new Date().toISOString().split("T")[0]);
            const dueDate = item.dueDate || "2026-08-21";
            return {
              ...item,
              startDate,
              dueDate,
            };
          });
          setAssignments(cleanLoaded);
          localStorage.setItem(ARTISAN_ASSIGNMENTS_KEY, JSON.stringify(cleanLoaded));
        } else {
          // Generate sample assignments if none exist
          const sampleAssignments: ComponentArtisanAssignment[] = rawMachines.slice(0, 3).flatMap((m, mIdx) => {
            const mName = m.name || m.model || `Machine ${m.id}`;
            return [
              {
                id: `ASGN-${mIdx}-1`,
                taskId: `TSK-${849200 + mIdx * 2 + 1}`,
                machineId: m.id || `m_${mIdx}`,
                machineName: mName,
                componentId: `comp-${mIdx}-1`,
                componentName: "Hydraulic Main Pump",
                artisanId: finalArtisans[0]?.id || "ART-101",
                artisanName: finalArtisans[0]?.name || "David Miller",
                artisanSpecialization: finalArtisans[0]?.specialization || "Senior Hydraulics Artisan",
                supervisorName: "Marcus Supervisor",
                workScope: "Pressure test relief valves, inspect main line seals, and recalibrate fluid flow.",
                priority: "High",
                startDate: "2026-08-14",
                dueDate: "2026-08-21",
                assignedAt: new Date().toLocaleDateString("en-GB"),
                status: "Active",
              },
              {
                id: `ASGN-${mIdx}-2`,
                taskId: `TSK-${849200 + mIdx * 2 + 2}`,
                machineId: m.id || `m_${mIdx}`,
                machineName: mName,
                componentId: `comp-${mIdx}-2`,
                componentName: "Engine & Turbocharger",
                artisanId: finalArtisans[1]?.id || "ART-102",
                artisanName: finalArtisans[1]?.name || "Alex Vance",
                artisanSpecialization: finalArtisans[1]?.specialization || "Diesel Engine Specialist",
                supervisorName: "Marcus Supervisor",
                workScope: "Inspect turbo manifold clamps, replace air intake filters, and log boost pressure.",
                priority: "Medium",
                startDate: "2026-08-14",
                dueDate: "2026-08-21",
                assignedAt: new Date().toLocaleDateString("en-GB"),
                status: "Active",
              },
            ];
          });
          setAssignments(sampleAssignments);
          persistAssignments(sampleAssignments);
        }
      } catch (err) {
        console.error("Failed to parse stored assignments:", err);
      }
    } catch (err) {
      console.error("Failed to load assigned artisans data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save stored assignments
  const persistAssignments = (newAssignments: ComponentArtisanAssignment[]) => {
    setAssignments(newAssignments);
    try {
      localStorage.setItem(ARTISAN_ASSIGNMENTS_KEY, JSON.stringify(newAssignments));
    } catch (err) {
      console.warn("Failed to persist artisan assignments:", err);
    }
  };

  // Open Modal for a specific Machine & Component
  const handleOpenModal = (machineId = "", componentName = "") => {
    const targetMachineId = machineId || (selectedMachineId !== "all" ? selectedMachineId : machines[0]?.id) || "";
    setModalMachineId(targetMachineId);
    setModalComponentName(componentName || DEFAULT_COMPONENTS[0]);
    setModalArtisanId(artisans[0]?.id || "");
    setModalWorkScope("");
    setModalPriority("Medium");
    setModalStartDate(new Date().toISOString().split("T")[0]);
    setModalDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setIsModalOpen(true);
  };

  // Conflict Check for Selected Machine & Component in Modal
  const existingAssignmentForModal = useMemo(() => {
    if (!modalMachineId || !modalComponentName) return null;
    return assignments.find(
      (a) => a.machineId === modalMachineId && a.componentName === modalComponentName
    );
  }, [modalMachineId, modalComponentName, assignments]);

  // Active Task Check for Selected Artisan in Modal (Artisan Availability)
  const activeTaskForSelectedArtisan = useMemo(() => {
    if (!modalArtisanId) return null;
    return assignments.find(
      (a) => a.artisanId === modalArtisanId && a.status === "Active"
    );
  }, [modalArtisanId, assignments]);

  // Toggle Task Status (Active <-> Completed / Free Artisan)
  const handleToggleTaskStatus = (id: string) => {
    const updated = assignments.map((a) => {
      if (a.id === id) {
        const nextStatus: "Active" | "Completed" | "Pending" =
          a.status === "Active" ? "Completed" : "Active";
        return { ...a, status: nextStatus };
      }
      return a;
    });
    persistAssignments(updated);
  };

  // Submit Modal
  const handleSaveAssignment = () => {
    if (!modalMachineId || !modalComponentName || !modalArtisanId) return;

    setSaving(true);

    const selectedM = machines.find((m) => m.id === modalMachineId);
    const mName = selectedM?.name || selectedM?.model || "Equipment Unit";
    const selectedArtisan = artisans.find((a) => a.id === modalArtisanId);

    const generatedTaskId = `TSK-${Math.floor(100000 + Math.random() * 900000)}`;

    const newEntry: ComponentArtisanAssignment = {
      id: `ASGN-${Date.now()}`,
      taskId: generatedTaskId,
      machineId: modalMachineId,
      machineName: mName,
      componentId: `comp-${Date.now()}`,
      componentName: modalComponentName,
      artisanId: modalArtisanId,
      artisanName: selectedArtisan?.name || "Assigned Artisan",
      artisanSpecialization: selectedArtisan?.specialization || "Maintenance Specialist",
      supervisorName: (() => {
        try {
          const raw = localStorage.getItem("hme_user");
          if (raw) {
            const p = JSON.parse(raw);
            const n = `${p.firstName || p.first_name || ""} ${p.lastName || p.last_name || ""}`.trim() || p.name;
            if (n) return n;
          }
        } catch {}
        return "Marcus Supervisor";
      })(),
      workScope: modalWorkScope || "General component maintenance inspection & diagnostic.",
      priority: modalPriority,
      startDate: modalStartDate,
      dueDate: modalDueDate,
      assignedAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Active",
    };

    const existingIndex = assignments.findIndex(
      (a) => a.machineId === modalMachineId && a.componentName === modalComponentName
    );

    let updatedList: ComponentArtisanAssignment[];
    if (existingIndex !== -1) {
      updatedList = [...assignments];
      updatedList[existingIndex] = newEntry;
    } else {
      updatedList = [newEntry, ...assignments];
    }

    persistAssignments(updatedList);
    setSaving(false);
    setIsModalOpen(false);
  };

  // Delete Assignment
  const handleDeleteAssignment = (id: string) => {
    const updated = assignments.filter((a) => a.id !== id);
    persistAssignments(updated);
  };

  // Machine Options for Dropdown (Includes "All Fleet Machines")
  const machineDropdownOptions = useMemo(() => {
    return [
      { label: "All Fleet Machines", value: "all" },
      ...machines.map((m) => ({
        label: `${m.name || m.model || `Machine ${m.id}`} (${m.serialNumber || m.site || "Site A"})`,
        value: m.id,
      })),
    ];
  }, [machines]);

  // Component Options for Dropdown (Includes "All Machine Components")
  const componentDropdownOptions = useMemo(() => {
    return [
      { label: "All Machine Components", value: "all" },
      ...DEFAULT_COMPONENTS.map((c) => ({
        label: c,
        value: c,
      })),
    ];
  }, []);

  // Artisan Options for Dropdown (Includes "All Fleet Artisans")
  const artisanDropdownOptions = useMemo(() => {
    return [
      { label: "All Fleet Artisans", value: "all" },
      ...artisans.map((a) => ({
        label: `${a.name} (${a.specialization})`,
        value: a.id,
      })),
    ];
  }, [artisans]);

  // Filtered Component Breakdown Cards for selected machines & components
  const displayComponentCards = useMemo(() => {
    let targetMachines = machines;
    if (selectedMachineId && selectedMachineId !== "all") {
      targetMachines = machines.filter((m) => m.id === selectedMachineId);
    }

    let componentsList = DEFAULT_COMPONENTS;
    if (selectedComponentFilter !== "all") {
      componentsList = componentsList.filter((c) => c === selectedComponentFilter);
    }

    const cards: Array<{
      key: string;
      machineId: string;
      machineName: string;
      componentName: string;
      assignment?: ComponentArtisanAssignment;
    }> = [];

    const q = search.toLowerCase().trim();

    targetMachines.forEach((m) => {
      const mName = m.name || m.model || "Equipment Unit";
      componentsList.forEach((compName) => {
        const assignment = assignments.find(
          (a) => a.machineId === m.id && a.componentName === compName
        );

        if (q) {
          const matches =
            mName.toLowerCase().includes(q) ||
            compName.toLowerCase().includes(q) ||
            (assignment &&
              (assignment.artisanName.toLowerCase().includes(q) ||
                assignment.workScope.toLowerCase().includes(q)));
          if (!matches) return;
        }

        cards.push({
          key: `${m.id}-${compName}`,
          machineId: m.id,
          machineName: mName,
          componentName: compName,
          assignment,
        });
      });
    });

    return cards;
  }, [machines, selectedMachineId, selectedComponentFilter, assignments, search]);

  // Master Filtered Assignments Table
  const filteredAssignments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assignments.filter((item) => {
      const matchesSearch =
        !q ||
        item.artisanName.toLowerCase().includes(q) ||
        item.machineName.toLowerCase().includes(q) ||
        item.componentName.toLowerCase().includes(q) ||
        item.workScope.toLowerCase().includes(q);

      const matchesMachine = selectedMachineId === "all" || item.machineId === selectedMachineId;
      const matchesComponent = selectedComponentFilter === "all" || item.componentName === selectedComponentFilter;
      const matchesArtisan = selectedArtisanFilter === "all" || item.artisanId === selectedArtisanFilter;

      return matchesSearch && matchesMachine && matchesComponent && matchesArtisan;
    });
  }, [assignments, search, selectedMachineId, selectedComponentFilter, selectedArtisanFilter]);

  const isShowAll = itemsPerPage === "all";
  const effectivePageSize = isShowAll ? Math.max(1, filteredAssignments.length) : itemsPerPage;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(filteredAssignments.length / effectivePageSize));
  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedAssignments = isShowAll ? filteredAssignments : filteredAssignments.slice(startIndex, startIndex + effectivePageSize);
  const startItem = filteredAssignments.length === 0 ? 0 : isShowAll ? 1 : startIndex + 1;
  const endItem = isShowAll ? filteredAssignments.length : Math.min(startIndex + effectivePageSize, filteredAssignments.length);

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-8 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Layers size={14} />
              Fleet & Component Artisan Matrix
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Assigned Artisans to Machine Components
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Select "All Fleet Machines" or a specific machine, choose "All Components" or a specific component type, and view assigned specialized Artisans.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-[#3B37E6] shadow-lg shadow-black/10 transition hover:bg-blue-50 active:scale-95"
            >
              <Plus size={16} />
              Assign Artisan to Component
            </button>

            <button
              type="button"
              onClick={loadInitialData}
              disabled={loading}
              title="Refresh Data"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Registered Artisans Directory & Status Roster ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                All Specialized Fleet Artisans ({artisans.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live artisan directory, specialization roster, and real-time availability.
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300">
            {artisans.filter((a) => !assignments.some((as) => as.artisanId === a.id && as.status === "Active")).length} Free / Available
          </span>
        </div>

        {/* Artisans Grid Roster Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {artisans.map((artisan) => {
            const activeAssignment = assignments.find(
              (a) => a.artisanId === artisan.id && a.status === "Active"
            );
            const isBusy = Boolean(activeAssignment);

            return (
              <div
                key={artisan.id}
                onClick={() =>
                  handleOpenArtisanModal(
                    artisan.name,
                    artisan.specialization,
                    activeAssignment?.machineName,
                    activeAssignment?.workScope
                  )
                }
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-indigo-500/50 dark:hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-sm">
                      {artisan.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs dark:text-white group-hover:text-indigo-600">
                        {artisan.name}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-1">
                        {artisan.specialization}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isBusy
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    }`}
                  >
                    {isBusy ? "Busy" : "Free"}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                  {activeAssignment ? (
                    <span className="text-amber-700 dark:text-amber-300 font-semibold line-clamp-1 text-[10px]">
                      📍 {activeAssignment.machineName} ({activeAssignment.componentName.split(" ")[0]})
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      ✓ Available
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalArtisanId(artisan.id);
                      handleOpenModal();
                    }}
                    className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white transition"
                  >
                    + Assign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Selection Control Bar: Dropdowns for All Machines & All Components ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Machine Dropdown (Supports "All Fleet Machines") */}
          <div className="flex-1 space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Truck size={16} className="text-blue-600 dark:text-blue-400" />
              1. Select Machine (All or Specific)
            </label>
            <AppSelect
              value={selectedMachineId}
              options={machineDropdownOptions}
              onChange={(val) => {
                setSelectedMachineId(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Component Dropdown (Supports "All Machine Components") */}
          <div className="flex-1 space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Cpu size={16} className="text-indigo-600 dark:text-indigo-400" />
              2. Filter Component (All or Specific)
            </label>
            <AppSelect
              value={selectedComponentFilter}
              options={componentDropdownOptions}
              onChange={(val) => {
                setSelectedComponentFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Artisan Dropdown (Supports "All Fleet Artisans") */}
          <div className="flex-1 space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              3. Filter Artisan (All or Specific)
            </label>
            <AppSelect
              value={selectedArtisanFilter}
              options={artisanDropdownOptions}
              onChange={(val) => {
                setSelectedArtisanFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Search Input */}
          <div className="flex-1 space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Search size={16} className="text-slate-400" />
              Search Artisan / Work Scope
            </label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Type artisan name or scope..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* ── Master Assignments Table View ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Fleet Component Artisan Assignment Master Log
          </h3>
          <span className="text-xs text-slate-500">
            Total {filteredAssignments.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-[#081226]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Task ID & Machine
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Component Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assigned Artisan
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assigned By (Supervisor)
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Work Scope & Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Schedule (Start ➔ Due)
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading && assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Loading component artisan assignments...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No component artisan assignments found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedAssignments.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/40 dark:text-blue-400">
                          <Truck size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {item.taskId || `TSK-${item.id.slice(-6)}`}
                            </span>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.machineName}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <User size={12} />
                            Operator: {getOperatorForMachine(item.machineId, item.machineName)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <Cpu size={14} />
                        {item.componentName}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
                          <UserCheck size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs dark:text-white">
                            {item.artisanName}
                          </p>
                          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            {item.artisanSpecialization}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Assigned By Supervisor */}
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                        <ShieldCheck size={14} />
                        {item.supervisorName || "Marcus Supervisor"}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {item.workScope}
                        </p>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          item.priority === "High"
                            ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}>
                          Priority: {item.priority}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{item.assignedAt}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 px-2 py-1 rounded-lg">
                          <Calendar size={12} />
                          <span>
                            {(() => {
                              const s = item.startDate || "2026-08-14";
                              const d = item.dueDate || "2026-08-21";
                              const formatNice = (dateStr: string) => {
                                if (!dateStr) return "14 Aug 2026";
                                if (dateStr.includes("-")) {
                                  const parts = dateStr.split("-");
                                  if (parts.length === 3) {
                                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    const m = parseInt(parts[1], 10) - 1;
                                    return `${parseInt(parts[2], 10)} ${months[m] || "Aug"} ${parts[0]}`;
                                  }
                                }
                                return dateStr;
                              };
                              return `${formatNice(s)} ➔ ${formatNice(d)}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleTaskStatus(item.id)}
                          title="Click to toggle Artisan Task Status (Completed / Closed frees component)"
                          className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-bold transition hover:scale-105 dark:border-slate-800"
                        >
                          {item.status === "Active" ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                              <Clock size={12} className="animate-pulse" />
                              Active (Busy)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 size={12} />
                              Completed (Free)
                            </span>
                          )}
                        </button>
                        {item.status === "Active" && (
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            ⏱️ {getTaskDurationText(item.assignedAt)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(item.machineId, item.componentName)}
                          title="Edit Component Artisan Assignment"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/40"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(item.id)}
                          title="Remove Assignment"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500 dark:hover:bg-red-950/40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
            totalItems={filteredAssignments.length}
            startItem={startItem}
            endItem={endItem}
          />
        </div>
      </div>

      {/* Assign Artisan to Component Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Assign Artisan to Component
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select machine component and assign specialized artisan.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
              {/* Component Conflict / Status Warning Banner */}
              {existingAssignmentForModal && (
                existingAssignmentForModal.status === "Active" ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-950/40">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                          ⚠️ COMPONENT LOCKED — ACTIVE TASK ({existingAssignmentForModal.taskId || "TSK-ACTIVE"})
                        </h4>
                        <p className="mt-0.5 text-[11px] leading-tight text-amber-800 dark:text-amber-300">
                          Component <strong>"{modalComponentName}"</strong> on <strong>{existingAssignmentForModal.machineName}</strong> is ASSIGNED to <strong>{existingAssignmentForModal.artisanName}</strong> by <strong>{existingAssignmentForModal.supervisorName || "Supervisor"}</strong> (<strong>{getTaskDurationText(existingAssignmentForModal.assignedAt)}</strong>).
                          Cannot re-assign until marked <em>Completed / Closed</em>.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-950/40">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                          ✓ COMPONENT FREE FOR ASSIGNMENT
                        </h4>
                        <p className="mt-0.5 text-[11px] leading-tight text-emerald-800 dark:text-emerald-300">
                          Previous task (<strong>{existingAssignmentForModal.taskId || "TSK-CLOSED"}</strong>) for component <strong>"{modalComponentName}"</strong> was marked <strong>COMPLETED</strong>. Ready for new assignment!
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Artisan Busy Active Task Warning Banner */}
              {activeTaskForSelectedArtisan && (
                <div className="rounded-2xl border border-orange-300 bg-orange-50 p-3 dark:border-orange-500/40 dark:bg-orange-950/40">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-900 dark:text-orange-200">
                        ⚠️ Artisan Currently Busy Alert
                      </h4>
                      <p className="mt-0.5 text-[11px] leading-tight text-orange-800 dark:text-orange-300">
                        Artisan <strong>{activeTaskForSelectedArtisan.artisanName}</strong> has an <strong>ACTIVE TASK</strong> on <strong>{activeTaskForSelectedArtisan.machineName}</strong> ({activeTaskForSelectedArtisan.componentName}).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2-Column Machine & Component Selectors */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select Machine
                  </label>
                  <AppSelect
                    value={modalMachineId}
                    options={machines.map((m) => ({
                      label: m.name || m.model || `Machine ${m.id}`,
                      value: m.id,
                    }))}
                    onChange={(val) => setModalMachineId(val)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Machine Component
                  </label>
                  <AppSelect
                    value={modalComponentName}
                    options={DEFAULT_COMPONENTS.map((c) => ({
                      label: c,
                      value: c,
                    }))}
                    onChange={(val) => setModalComponentName(val)}
                  />
                </div>
              </div>

              {/* 2-Column Artisan & Priority Selectors */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select Specialized Artisan
                  </label>
                  <AppSelect
                    value={modalArtisanId}
                    options={artisans.map((a) => ({
                      label: `${a.name} (${a.specialization})`,
                      value: a.id,
                    }))}
                    onChange={(val) => setModalArtisanId(val)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Maintenance Priority
                  </label>
                  <AppSelect
                    value={modalPriority}
                    options={[
                      { label: "High Priority", value: "High" },
                      { label: "Medium Priority", value: "Medium" },
                      { label: "Low Priority", value: "Low" },
                    ]}
                    onChange={(val: any) => setModalPriority(val)}
                  />
                </div>
              </div>

              {/* 2-Column Calendar Start Date & Target Due Date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Calendar size={13} className="text-blue-500" />
                    Start Date (Calendar)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={modalStartDate}
                      onChange={(e) => setModalStartDate(e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 pr-9 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        input?.showPicker?.() || input?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Calendar size={15} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Calendar size={13} className="text-blue-500" />
                    Target Due Date (Calendar)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={modalDueDate}
                      onChange={(e) => setModalDueDate(e.target.value)}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 pr-9 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        input?.showPicker?.() || input?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <Calendar size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Work Scope & Maintenance Instructions
                </label>
                <textarea
                  rows={2}
                  value={modalWorkScope}
                  onChange={(e) => setModalWorkScope(e.target.value)}
                  placeholder="Enter specific maintenance instructions for this component..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAssignment}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3B37E6] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      <SupervisorUserDetailModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userDetail={selectedUserDetail}
      />
    </div>
  );
}
