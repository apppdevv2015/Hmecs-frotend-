import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import Pagination from "../../components/common/Pagination";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import { userService, normalizeUsersResponse } from "../../services/Auth/userService";
import SupervisorUserDetailModal, { type UserDetailData } from "../../components/supervisor/SupervisorUserDetailModal";


import {
  fetchArtisanAssignments,
  assignArtisanToMachine,
  unassignArtisanFromMachine,
  selectArtisanAssignments,
  selectArtisanAssignmentLoading,
  selectArtisanAssigning,
  selectArtisanUnassigning,
  selectArtisanAssignmentError,
  type ArtisanAssignment,
} from "../../redux/slices/artisanAssignmentSlice";

export type ComponentArtisanAssignment = ArtisanAssignment;

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
  // TODO: swap `useDispatch()` / `useSelector` for your typed
  // `useAppDispatch` / `useAppSelector` hooks if your project has them.
  const dispatch = useDispatch<any>();

  const assignments = useSelector(selectArtisanAssignments);
  const assignmentsLoading = useSelector(selectArtisanAssignmentLoading);
  const assigning = useSelector(selectArtisanAssigning);
  const unassigning = useSelector(selectArtisanUnassigning);
  const assignmentsError = useSelector(selectArtisanAssignmentError);

  const [machines, setMachines] = useState<any[]>([]);
  const [artisans, setArtisans] = useState<any[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
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
  const [modalComponents, setModalComponents] = useState<any[]>([]);
  const [loadingModalComponents, setLoadingModalComponents] = useState(false);
  const [modalArtisanId, setModalArtisanId] = useState("");
  const [modalWorkScope, setModalWorkScope] = useState("");
  const [modalPriority, setModalPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [modalStartDate, setModalStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalDueDate, setModalDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  // Dynamic Component Fetch GET API for Selected Machine
  useEffect(() => {
    const fetchComponentsForModal = async () => {
      if (!modalMachineId) return;
      try {
        setLoadingModalComponents(true);
        const res = await componentService.getComponentsByMachineId(modalMachineId);
        const list = Array.isArray(res) ? res : res?.data || res?.components || [];
        if (list.length > 0) {
          const formatted = list.map((c: any) => ({
            label: c.displayName || c.name || c.category || "Component",
            value: c.displayName || c.name || c.category || "Component",
          }));
          setModalComponents(formatted);
          if (formatted[0]) {
            setModalComponentName(formatted[0].value);
          }
        } else {
          setModalComponents(DEFAULT_COMPONENTS.map((c) => ({ label: c, value: c })));
        }
      } catch (err) {
        console.warn("Failed to fetch machine components:", err);
        setModalComponents(DEFAULT_COMPONENTS.map((c) => ({ label: c, value: c })));
      } finally {
        setLoadingModalComponents(false);
      }
    };

    if (isModalOpen) {
      fetchComponentsForModal();
    }
  }, [modalMachineId, isModalOpen]);

  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailData | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const loading = directoryLoading || assignmentsLoading;

  const getOperatorForMachine = (machineId: string, machineName = "") => {
    const found = machines.find((m) => m.id === machineId || (machineName && m.name && m.name.includes(machineName)));
    return (found as any)?.assignedOperatorName || (found as any)?.operatorName || "Operator Assigned";
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

  // Machines + artisan directory still come straight from their own
  // services (the slice only owns assignment data).
  const loadDirectory = async () => {
    try {
      setDirectoryLoading(true);
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
      const artisanUsers = userList.filter((u: any) => {
  const roleValue =
    typeof u.role === "string"
      ? u.role
      : u.role?.name ??
        u.role?.role ??
        u.role?.value ??
        u.role_name ??
        u.roleName ??
        "";

  const role = String(roleValue).toLowerCase().trim();

  return role === "artisan" || role.includes("artisan");
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

      setMachines(rawMachines);
      setArtisans(normalizedArtisans);
    } catch (err) {
      console.error("Failed to load machine/artisan directory:", err);
    } finally {
      setDirectoryLoading(false);
    }
  };

  const refreshAll = () => {
    loadDirectory();
    dispatch(fetchArtisanAssignments());
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Toggle Task Status (Active -> Completed / Free Component)
  // The backend only exposes assign + unassign, so "completing" a task
  // means unassigning it via the same API the Operator side uses. If you
  // need to keep a history of completed tasks instead of clearing them,
  // the API/slice needs a dedicated "update status" endpoint + thunk.
  const handleToggleTaskStatus = (item: ComponentArtisanAssignment) => {
    if (item.status === "Active") {
      dispatch(unassignArtisanFromMachine({ machineId: item.machineId }));
    } else {
      dispatch(
        assignArtisanToMachine({
          machineId: item.machineId,
          machineName: item.machineName,
          artisanId: item.artisanId,
          artisanName: item.artisanName,
          supervisorId: item.supervisorId,
          supervisorName: item.supervisorName,
          taskId: item.taskId,
          componentId: item.componentId,
          componentName: item.componentName,
          workScope: item.workScope,
          priority: item.priority,
          startDate: item.startDate,
          dueDate: item.dueDate,
        })
      );
    }
  };

  // Submit Modal — goes through the redux assignArtisanToMachine thunk,
  // which is what actually calls the backend assign API.
  const handleSaveAssignment = async () => {
    if (!modalMachineId || !modalArtisanId) return;

    const selectedM = machines.find((m) => m.id === modalMachineId);
    const mName = selectedM?.name || selectedM?.model || "Equipment Unit";
    const selectedArtisan = artisans.find((a) => a.id === modalArtisanId);

    const supervisorName = (() => {
      try {
        const raw = localStorage.getItem("hme_user");
        if (raw) {
          const p = JSON.parse(raw);
          const n = `${p.firstName || p.first_name || ""} ${p.lastName || p.last_name || ""}`.trim() || p.name;
          if (n) return n;
        }
      } catch {}
      return undefined;
    })();

    const supervisorId = (() => {
      try {
        const raw = localStorage.getItem("hme_user");
        if (raw) {
          const p = JSON.parse(raw);
          return p.id || p.userId || p.user_id;
        }
      } catch {}
      return undefined;
    })();

    const generatedTaskId = `TSK-${Math.floor(100000 + Math.random() * 900000)}`;


    const result = await dispatch(
      assignArtisanToMachine({
        machineId: modalMachineId,
        machineName: mName,
        artisanId: modalArtisanId,
        artisanName: selectedArtisan?.name,
        supervisorId,
        supervisorName,
        taskId: generatedTaskId,
        componentId: `comp-${Date.now()}`,
        componentName: modalComponentName || "Full Machine",
        workScope: modalWorkScope || "General machine maintenance inspection & diagnostic.",
        priority: modalPriority,
        startDate: modalStartDate,
        dueDate: modalDueDate,
      })
    );


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
          const user = StorageService.getUser();
          if (user) {
            const n = user.name || user.fullName || `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim();
            if (n) return n;
          }
        } catch {}
        return StorageService.get<string>(STORAGE_KEYS.USER_NAME) || "Supervisor";
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

    if (assignArtisanToMachine.fulfilled.match(result)) {
      setIsModalOpen(false);
      dispatch(fetchArtisanAssignments());
      loadDirectory();
    }
  };

  // Delete Assignment — calls the unassign API through the slice.
  const handleDeleteAssignment = async (item: ComponentArtisanAssignment) => {
    await dispatch(unassignArtisanFromMachine({ machineId: item.machineId }));
    dispatch(fetchArtisanAssignments());
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

  // Master Filtered Assignments Table
  const filteredAssignments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assignments.filter((item) => {
      const matchesSearch =
        !q ||
        item.artisanName.toLowerCase().includes(q) ||
        item.machineName.toLowerCase().includes(q) ||
        (item.workScope || "").toLowerCase().includes(q);

      const matchesMachine = selectedMachineId === "all" || item.machineId === selectedMachineId;
      const matchesArtisan = selectedArtisanFilter === "all" || item.artisanId === selectedArtisanFilter;

      return matchesSearch && matchesMachine && matchesArtisan;
    });
  }, [assignments, search, selectedMachineId, selectedArtisanFilter]);

  type ArtisanSortField = "machine" | "component" | "artisan" | "supervisor" | "priority" | "status";
  const [sortField, setSortField] = useState<ArtisanSortField>("machine");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: ArtisanSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedAssignments = useMemo(() => {
    const list = [...filteredAssignments];
    return list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "machine") {
        valA = (a.machineName || a.machineId || "").toLowerCase();
        valB = (b.machineName || b.machineId || "").toLowerCase();
      } else if (sortField === "component") {
        valA = (a.componentName || "").toLowerCase();
        valB = (b.componentName || "").toLowerCase();
      } else if (sortField === "artisan") {
        valA = (a.artisanName || "").toLowerCase();
        valB = (b.artisanName || "").toLowerCase();
      } else if (sortField === "supervisor") {
        valA = (a.supervisorName || "").toLowerCase();
        valB = (b.supervisorName || "").toLowerCase();
      } else if (sortField === "priority") {
        const orderMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        valA = orderMap[a.priority || "Low"] || 0;
        valB = orderMap[b.priority || "Low"] || 0;
      } else if (sortField === "status") {
        valA = (a.status || "").toLowerCase();
        valB = (b.status || "").toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAssignments, sortField, sortOrder]);

  const isShowAll = itemsPerPage === "all";
  const effectivePageSize = isShowAll ? Math.max(1, sortedAssignments.length) : itemsPerPage;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(sortedAssignments.length / effectivePageSize));
  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedAssignments = isShowAll ? sortedAssignments : sortedAssignments.slice(startIndex, startIndex + effectivePageSize);
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
              Fleet Artisan Allocation Matrix
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Assigned Artisans to Machines
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Select a machine, assign specialized Artisans, and manage fleet maintenance operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-[#3B37E6] shadow-lg shadow-black/10 transition hover:bg-blue-50 active:scale-95"
            >
              <Plus size={16} />
              Assign Artisan to Machine
            </button>

            <button
              type="button"
              onClick={refreshAll}
              disabled={loading}
              title="Refresh Data"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {assignmentsError && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mr-1.5 inline h-4 w-4 -mt-0.5" />
          {assignmentsError}
        </div>
      )}

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
                      📍 {activeAssignment.machineName} ({(activeAssignment.componentName || "").split(" ")[0]})
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

      {/* ── Selection Control Bar: Dropdowns for Machines & Artisans ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Machine Dropdown (Supports "All Fleet Machines") */}
          <div className="space-y-1.5">
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

          {/* Artisan Dropdown (Supports "All Fleet Artisans") */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              2. Filter Artisan (All or Specific)
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
          <div className="space-y-1.5">
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
            Fleet Machine Artisan Assignment Master Log
          </h3>
          <span className="text-xs text-slate-500">
            Total {filteredAssignments.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-[#081226]">
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSort("machine")}
                >
                  Task ID & Machine {sortField === "machine" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSort("artisan")}
                >
                  Assigned Artisan {sortField === "artisan" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSort("supervisor")}
                >
                  Assigned By (Supervisor) {sortField === "supervisor" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSort("priority")}
                >
                  Work Scope & Priority {sortField === "priority" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Schedule (Start ➔ Due)
                </th>
                <th
                  className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer select-none transition hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => handleSort("status")}
                >
                  Status {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
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
                        Loading machine artisan assignments...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No machine artisan assignments found matching your search.
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
                            {artisans.find((a) => a.id === item.artisanId)?.specialization || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Assigned By Supervisor */}
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                        <ShieldCheck size={14} />


                        {item.supervisorName || "—"}

                        {item.supervisorName && item.supervisorName !== "Marcus Supervisor"
                          ? item.supervisorName
                          : (StorageService.getUser()?.name || StorageService.getUser()?.fullName || StorageService.get<string>(STORAGE_KEYS.USER_NAME) || "Supervisor")}


                        {item.supervisorName && item.supervisorName !== "Marcus Supervisor"
                          ? item.supervisorName
                          : (StorageService.getUser()?.name || StorageService.getUser()?.fullName || StorageService.get<string>(STORAGE_KEYS.USER_NAME) || "Supervisor")}

                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {item.workScope}
                        </p>
                        {item.priority && (
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            item.priority === "High"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                            Priority: {item.priority}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{item.assignedAt}</p>
                        {(item.startDate || item.dueDate) && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 px-2 py-1 rounded-lg">
                            <Calendar size={12} />
                            <span>
                              {(() => {
                                const formatNice = (dateStr?: string) => {
                                  if (!dateStr) return "—";
                                  if (dateStr.includes("-")) {
                                    const parts = dateStr.split("-");
                                    if (parts.length === 3) {
                                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                      const m = parseInt(parts[1], 10) - 1;
                                      return `${parseInt(parts[2], 10)} ${months[m] || ""}  ${parts[0]}`;
                                    }
                                  }
                                  return dateStr;
                                };
                                return `${formatNice(item.startDate)} ➔ ${formatNice(item.dueDate)}`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleToggleTaskStatus(item)}
                          disabled={assigning || unassigning}
                          title="Click to toggle Artisan Task Status (Completed / Closed frees component)"
                          className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-bold transition hover:scale-105 disabled:opacity-50 dark:border-slate-800"
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
                          onClick={() => handleDeleteAssignment(item)}
                          disabled={unassigning}
                          title="Remove Assignment"
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:border-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500 dark:hover:bg-red-950/40"
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
                  Assign Artisan to Machine
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select target fleet machine and assign specialized artisan.
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

              {/* Machine Selector */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Machine
                </label>
                <AppSelect
                  value={modalMachineId}
                  options={machines.map((m) => ({
                    label: `${m.name || m.model || `Machine ${m.id}`} (${m.serialNumber || m.site || "Site A"})`,
                    value: m.id,
                  }))}
                  onChange={(val) => setModalMachineId(val)}
                />
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
                disabled={assigning}
                onClick={handleSaveAssignment}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3B37E6] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50"
              >
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
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