import { useMemo, useState, useEffect, useCallback } from "react";
import { z } from "zod";

import AppSelect from "../../components/ui/dropdown/AppSelect";
import Pagination from "../../components/common/Pagination";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import {
  supervisorTaskService,
  type DynamicOperator,
  type DynamicEngineer,
  type DynamicMachine,
  type ShiftType,
  type OperatorStatus,
} from "../../services/Task/supervisorTaskService";

import {
  Search,
  UsersRound,
  UserCog,
  Cpu,
  Phone,
  Mail,
  Plus,
  Pencil,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  Loader2,
  RefreshCw,
  Trash2,
  Clock,
  Layers,
} from "lucide-react";

type TaskForm = {
  operatorId: string;
  machine: string;
  engineer: string;
  shift: string;
};

type FormErrors = Partial<Record<keyof TaskForm, string>>;

const taskSchema = z.object({
  operatorId: z.string().min(1, "Please select an operator."),
  machine: z.string().min(1, "Please select a machine."),
  engineer: z.string().optional(),
  shift: z.string().optional(),
});

const shiftOptions = [
  { label: "Morning Shift (06:00 - 14:00)", value: "Morning" },
  { label: "Evening Shift (14:00 - 22:00)", value: "Evening" },
  { label: "Night Shift (22:00 - 06:00)", value: "Night" },
];

const getStatusClass = (status: OperatorStatus) => {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50";
    case "On Leave":
      return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50";
    default:
      return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50";
  }
};

const getShiftBadgeClass = (shift: ShiftType) => {
  switch (shift) {
    case "Morning":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50";
    case "Evening":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50";
    case "Night":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/50";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  }
};

export default function SupervisorTaskPage() {
  const [operators, setOperators] = useState<DynamicOperator[]>([]);
  const [engineers, setEngineers] = useState<DynamicEngineer[]>([]);
  const [machines, setMachines] = useState<DynamicMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [engineerViewOpen, setEngineerViewOpen] = useState(false);
  const [selectedEngineerView, setSelectedEngineerView] = useState<string>("");

  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [selectedShift, setSelectedShift] = useState<ShiftType>("Morning");
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Load live data from API and stored assignments
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const data = await supervisorTaskService.getSupervisorTaskData();
      setOperators(data.operators);
      setEngineers(data.engineers);
      setMachines(data.machines);
    } catch (err: any) {
      console.error("Failed to load supervisor tasks:", err);
      showErrorToast(err?.message || "Failed to load task assignments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered operators based on search
  const [operatorFilter, setOperatorFilter] = useState<string>("All");

  const operatorFilterOptions = useMemo(() => {
    return [
      { label: "All Fleet Operators", value: "All" },
      ...operators.map((op) => ({
        label: `${op.name} (${op.assignedMachine ? `Machine: ${op.assignedMachine}` : "Unassigned"})`,
        value: op.userId || op.id,
      })),
    ];
  }, [operators]);

  const filteredOperators = useMemo(() => {
    const value = search.toLowerCase().trim();

    return operators.filter((operator) => {
      const matchesSearch =
        value.length === 0 ||
        operator.name.toLowerCase().includes(value) ||
        operator.id.toLowerCase().includes(value) ||
        operator.userId.toLowerCase().includes(value) ||
        operator.email.toLowerCase().includes(value) ||
        operator.phone.toLowerCase().includes(value) ||
        operator.assignedMachine.toLowerCase().includes(value) ||
        operator.assignedEngineer.toLowerCase().includes(value) ||
        operator.shift.toLowerCase().includes(value);

      const matchesOperatorFilter =
        operatorFilter === "All" ||
        operator.userId === operatorFilter ||
        operator.id === operatorFilter;

      return matchesSearch && matchesOperatorFilter;
    });
  }, [operators, search, operatorFilter]);

  const assignedOperators = useMemo(
    () => operators.filter((op) => Boolean(op.assignedMachine)).length,
    [operators]
  );

  const unassignedOperators = useMemo(
    () => operators.filter((op) => !op.assignedMachine).length,
    [operators]
  );

  // Filter dropdown options for Task Assignment modal
  const availableOperators = useMemo(() => {
    return operators.filter((operator) =>
      editingOperatorId
        ? operator.userId === editingOperatorId ||
          operator.id === editingOperatorId ||
          !operator.assignedMachine
        : !operator.assignedMachine
    );
  }, [operators, editingOperatorId]);

  const availableMachines = useMemo(() => {
    return machines.filter((machine) => {
      if (editingOperatorId) {
        return (
          machine.machineName === selectedMachine ||
          machine.id === selectedMachine ||
          !operators.some(
            (op) =>
              (op.userId !== editingOperatorId && op.id !== editingOperatorId) &&
              (op.assignedMachine === machine.machineName ||
                op.assignedMachineId === machine.id)
          )
        );
      }
      return !operators.some(
        (op) =>
          op.assignedMachine === machine.machineName ||
          op.assignedMachineId === machine.id
      );
    });
  }, [machines, operators, editingOperatorId, selectedMachine]);

  const operatorOptions = useMemo(
    () =>
      availableOperators.map((operator) => ({
        label: `${operator.name} (${operator.id})`,
        value: operator.userId || operator.id,
      })),
    [availableOperators]
  );

  const machineOptions = useMemo(
    () =>
      availableMachines.map((machine) => ({
        label: machine.machineName,
        value: machine.id,
      })),
    [availableMachines]
  );

  const engineerOptions = useMemo(
    () =>
      engineers.map((engineer) => ({
        label: `${engineer.name} (${engineer.specialization || "Engineer"})`,
        value: engineer.id,
      })),
    [engineers]
  );

  // Pagination calculation
  const effectivePageSize = itemsPerPage === "all" ? filteredOperators.length || 1 : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(filteredOperators.length / effectivePageSize));

  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedOperators = useMemo(() => {
    if (itemsPerPage === "all") return filteredOperators;
    return filteredOperators.slice(startIndex, startIndex + effectivePageSize);
  }, [filteredOperators, startIndex, effectivePageSize, itemsPerPage]);

  const startItem = filteredOperators.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + effectivePageSize, filteredOperators.length);

  const openCreateModal = () => {
    setEditingOperatorId(null);
    setSelectedOperatorId("");
    setSelectedMachine("");
    setSelectedEngineer("");
    setSelectedShift("Morning");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (operator: DynamicOperator) => {
    const targetUserId = operator.userId || operator.id;
    setEditingOperatorId(targetUserId);
    setSelectedOperatorId(targetUserId);

    // Find machine ID if available
    const matchedMachine = machines.find(
      (m) =>
        m.id === operator.assignedMachineId ||
        m.machineName === operator.assignedMachine
    );
    setSelectedMachine(matchedMachine ? matchedMachine.id : operator.assignedMachineId || operator.assignedMachine);

    // Find engineer ID if available
    const matchedEngineer = engineers.find(
      (e) =>
        e.id === operator.assignedEngineerId ||
        e.name === operator.assignedEngineer
    );
    setSelectedEngineer(matchedEngineer ? matchedEngineer.id : operator.assignedEngineerId || operator.assignedEngineer);

    setSelectedShift(operator.shift || "Morning");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEngineerView = (operatorIdOrUserId: string) => {
    setSelectedEngineerView(operatorIdOrUserId);
    setEngineerViewOpen(true);
  };

  const updateField = (field: keyof TaskForm, value: string) => {
    if (field === "operatorId") setSelectedOperatorId(value);
    if (field === "machine") setSelectedMachine(value);
    if (field === "engineer") setSelectedEngineer(value);
    if (field === "shift") setSelectedShift(value as ShiftType);

    const updated = {
      operatorId: field === "operatorId" ? value : selectedOperatorId,
      machine: field === "machine" ? value : selectedMachine,
      engineer: field === "engineer" ? value : selectedEngineer,
      shift: field === "shift" ? value : selectedShift,
    };

    const result = taskSchema.safeParse(updated);

    if (result.success) {
      setFormErrors({});
      return;
    }

    const errors: FormErrors = {};
    result.error.issues.forEach((issue) => {
      errors[issue.path[0] as keyof TaskForm] = issue.message;
    });

    setFormErrors((prev) => ({
      ...prev,
      ...errors,
      [field]: errors[field],
    }));
  };

  const validateForm = () => {
    const result = taskSchema.safeParse({
      operatorId: selectedOperatorId,
      machine: selectedMachine,
      engineer: selectedEngineer,
      shift: selectedShift,
    });

    if (result.success) {
      setFormErrors({});
      return true;
    }

    const errors: FormErrors = {};
    result.error.issues.forEach((issue) => {
      errors[issue.path[0] as keyof TaskForm] = issue.message;
    });

    setFormErrors(errors);
    return false;
  };

  const handleAssignTask = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const targetOpId = editingOperatorId ?? selectedOperatorId;
      // Find Operator Object
      const opObj = operators.find((o) => o.userId === targetOpId || o.id === targetOpId || (o as any).code === targetOpId);
      let opName = opObj?.name || "";
      if (!opName && targetOpId) {
        const foundOpt = operatorOptions.find((opt) => opt.value === targetOpId);
        if (foundOpt) {
          opName = foundOpt.label.split(" (")[0].trim();
        }
      }

      // Find Machine Object
      const machineObj = machines.find((m) => m.id === selectedMachine || m.machineName === selectedMachine);
      const rawMachineName = machineObj?.machineName || selectedMachine;
      const machineName = rawMachineName.split(" (")[0].trim();
      const machineId = machineObj?.id || selectedMachine;

      // Find Engineer Object
      const engineerObj = engineers.find((e) => e.id === selectedEngineer || e.name === selectedEngineer);
      const engineerName = engineerObj?.name || "";
      const engineerId = engineerObj?.id || selectedEngineer;

      const success = await supervisorTaskService.assignTask({
        operatorId: targetOpId,
        operatorName: opName,
        operatorEmail: opObj?.email || "",
        machineId,
        machineName,
        engineerId,
        engineerName,
        shift: selectedShift,
      });

      if (success) {
        showSuccessToast(
          editingOperatorId
            ? "Operator task reassigned successfully"
            : "Task assigned to operator successfully"
        );
        setIsModalOpen(false);
        setSelectedOperatorId("");
        setSelectedMachine("");
        setSelectedEngineer("");
        setSelectedShift("Morning");
        setEditingOperatorId(null);
        setFormErrors({});
        await loadData(true);
      } else {
        showErrorToast("Failed to save task assignment");
      }
    } catch (err: any) {
      console.error("Assign task error:", err);
      showErrorToast(err?.message || "Failed to assign task");
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignTask = async (targetOpId: string) => {
    try {
      setSaving(true);
      const success = await supervisorTaskService.unassignTask(targetOpId);
      if (success) {
        showSuccessToast("Task unassigned successfully");
        setIsModalOpen(false);
        setEditingOperatorId(null);
        await loadData(true);
      } else {
        showErrorToast("Failed to unassign task");
      }
    } catch (err: any) {
      console.error("Unassign error:", err);
      showErrorToast(err?.message || "Failed to unassign task");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const isAnyModalOpen = isModalOpen || engineerViewOpen;
    const sidebar = document.getElementById("app-sidebar");
    const header = document.getElementById("app-header");

    document.body.style.overflow = isAnyModalOpen ? "hidden" : "";
    sidebar?.classList.toggle("hidden", isAnyModalOpen);
    header?.classList.toggle("hidden", isAnyModalOpen);

    return () => {
      document.body.style.overflow = "";
      sidebar?.classList.remove("hidden");
      header?.classList.remove("hidden");
    };
  }, [isModalOpen, engineerViewOpen]);

  return (
    <div className="min-h-screen max-w-[1450px] space-y-4 bg-slate-50 px-4 py-4 xl:mx-auto dark:bg-slate-950">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-7 py-7 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        {/* Glowing Ambient Backgrounds */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          {/* Left Content */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <ClipboardCheck size={14} />
              Supervisor Control
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Task Assignment Center
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Assign machines, manage engineers, monitor operator allocations
              and track workforce responsibilities from a centralized task
              management dashboard.
            </p>
          </div>

          {/* Right Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Bar */}
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search operator, ID, machine..."
                className="h-12 w-full rounded-xl border border-white/15 bg-white/10 pl-12 pr-4 text-sm font-medium text-white backdrop-blur-md outline-none transition-all duration-300 placeholder:text-white/50 focus:border-white/30 focus:bg-white/15 focus:ring-4 focus:ring-white/10"
              />
            </div>

            {/* Operator Filter Dropdown */}
            <div className="w-full sm:w-[220px]">
              <AppSelect
                value={operatorFilter}
                options={operatorFilterOptions}
                onChange={(val) => {
                  setOperatorFilter(val);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              title="Refresh task assignments"
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            {/* + Task Button */}
            <button
              onClick={openCreateModal}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-white px-5 text-sm font-bold text-[#3730D9] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-5 w-5" />
              Task
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {/* Total Operators */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Operators
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                ) : (
                  operators.length
                )}
              </h2>
            </div>
            <div className="rounded-2xl bg-blue-100 p-4 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <UsersRound className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Assigned Operators */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Assigned Operators
              </p>
              <h2 className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                ) : (
                  assignedOperators
                )}
              </h2>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Unassigned Operators */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Unassigned Operators
              </p>
              <h2 className="mt-2 text-3xl font-black text-amber-500 dark:text-amber-400">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                ) : (
                  unassignedOperators
                )}
              </h2>
            </div>
            <div className="rounded-2xl bg-amber-100 p-4 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Assigned Machines */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Assigned Machines
              </p>
              <h2 className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                ) : (
                  assignedOperators
                )}
              </h2>
            </div>
            <div className="rounded-2xl bg-indigo-100 p-4 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Dedicated Unassigned Machines Card */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Unassigned Machines
              </p>
              <h2 className="mt-2 text-3xl font-black text-orange-500 dark:text-orange-400">
                {loading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
                ) : (
                  Math.max(0, machines.length - assignedOperators)
                )}
              </h2>
            </div>
            <div className="rounded-2xl bg-orange-100 p-4 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[650px] overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Operator
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contact
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Machine
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Shift
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assignment
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Loading task assignments...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedOperators.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <Layers className="h-7 w-7" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                        {search ? "No matching operators found" : "No operators found"}
                      </h4>
                      <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                        {search
                          ? "Try adjusting your search criteria or clear the search input."
                          : "Operators created under your company will appear here for task assignment."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOperators.map((operator) => {
                  const isAssigned = Boolean(operator.assignedMachine);

                  return (
                    <tr
                      key={operator.userId || operator.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      {/* Operator Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20">
                            <UsersRound className="h-5 w-5" />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {operator.name}
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {operator.id}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  isAssigned
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400"
                                }`}
                              >
                                {isAssigned ? "Assigned" : "Unassigned"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 text-xs">
                          <p className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {operator.email}
                          </p>

                          <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            {operator.phone}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Machine */}
                      <td className="px-6 py-4">
                        {operator.assignedMachine ? (
                          <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
                            <Cpu className="h-3.5 w-3.5 text-blue-500" />
                            {operator.assignedMachine}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            Not Assigned
                          </span>
                        )}
                      </td>

                      {/* Shift */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getShiftBadgeClass(
                            operator.shift
                          )}`}
                        >
                          <Clock className="h-3 w-3" />
                          {operator.shift}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            operator.status
                          )}`}
                        >
                          {operator.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(operator)}
                            title={isAssigned ? "Reassign Operator" : "Assign Operator"}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {isAssigned && (
                            <button
                              onClick={() => openEngineerView(operator.userId || operator.id)}
                              title="View Details"
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={filteredOperators.length}
          itemsPerPage={itemsPerPage}
          itemLabel="operators"
          onPrev={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Operator View Modal */}
      {engineerViewOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Operator Assignment Details
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Detailed view of operator equipment and engineer linkage.
                </p>
              </div>

              <button
                onClick={() => setEngineerViewOpen(false)}
                className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const selectedOperator = operators.find(
                (op) =>
                  op.userId === selectedEngineerView ||
                  op.id === selectedEngineerView
              );

              if (!selectedOperator) return null;

              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Operator Header Card */}
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950 md:col-span-2">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
                        <UsersRound className="h-7 w-7" />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {selectedOperator.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Operator ID: {selectedOperator.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Machine */}
                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assigned Machine
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-blue-600 dark:text-blue-400">
                        {selectedOperator.assignedMachine || "Not Assigned"}
                      </h4>
                    </div>
                  </div>

                  {/* Assigned Artisan */}
                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assigned Artisan
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                        <UserCog className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-violet-600 dark:text-violet-400">
                        {selectedOperator.assignedEngineer || "Not Assigned"}
                      </h4>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Contact Information
                    </p>
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {selectedOperator.email}
                      </p>
                      <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {selectedOperator.phone}
                      </p>
                    </div>
                  </div>

                  {/* Assignment Info */}
                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assignment Metadata
                    </p>
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Shift:{" "}
                        </span>
                        {selectedOperator.shift}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Assigned Date:{" "}
                        </span>
                        {selectedOperator.assignedAt || "Recently Assigned"}
                      </p>
                      {selectedOperator.supervisorName && (
                        <p className="text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Supervisor:{" "}
                          </span>
                          {selectedOperator.supervisorName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end md:col-span-2">
                    <button
                      onClick={() => setEngineerViewOpen(false)}
                      className="rounded-2xl border border-slate-200 px-6 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Assign / Reassign Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-[95vw] rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-xl md:max-w-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {editingOperatorId ? "Reassign Operator Task" : "Assign New Task"}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select operator, machine, engineer, and work shift allocation.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Operator Dropdown */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Operator <span className="text-red-500">*</span>
                </label>
                <AppSelect
                  value={selectedOperatorId}
                  options={operatorOptions}
                  placeholder={
                    operatorOptions.length > 0
                      ? "Choose an Operator"
                      : "No unassigned operators"
                  }
                  searchable
                  disabled={Boolean(editingOperatorId)}
                  onChange={(value) => updateField("operatorId", value)}
                />
                <div className="mt-1 min-h-[18px]">
                  {formErrors.operatorId && (
                    <p className="text-xs font-medium text-red-500">
                      {formErrors.operatorId}
                    </p>
                  )}
                </div>
              </div>

              {/* Machine Dropdown */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Machine <span className="text-red-500">*</span>
                </label>
                <AppSelect
                  value={selectedMachine}
                  options={machineOptions}
                  placeholder={
                    machineOptions.length > 0
                      ? "Choose Machine"
                      : "No machines available"
                  }
                  searchable
                  onChange={(value) => updateField("machine", value)}
                />
                <div className="mt-1 min-h-[18px]">
                  {formErrors.machine && (
                    <p className="text-xs font-medium text-red-500">
                      {formErrors.machine}
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
              {editingOperatorId ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleUnassignTask(editingOperatorId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50 sm:w-auto dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="h-4 w-4" />
                  Unassign Task
                </button>
              ) : (
                <div />
              )}

              <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedOperatorId("");
                    setSelectedMachine("");
                    setSelectedEngineer("");
                    setSelectedShift("Morning");
                    setEditingOperatorId(null);
                    setFormErrors({});
                  }}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAssignTask}
                  disabled={
                    saving ||
                    !selectedOperatorId ||
                    !selectedMachine
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {editingOperatorId ? "Update Assignment" : "Assign Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
