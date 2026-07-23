import { useMemo, useState, useEffect } from "react";
import { z } from "zod";

import AppSelect from "../../components/ui/dropdown/AppSelect";

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
} from "lucide-react";

type OperatorStatus = "Active" | "Inactive" | "On Leave";

type ShiftType = "Morning" | "Evening" | "Night";

type Operator = {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedMachine: string;
  assignedEngineer: string;
  assignedAt?: string;
  shift: ShiftType;
  status: OperatorStatus;
};

type Engineer = {
  id: string;
  name: string;
  specialization: string;
};

type Machine = {
  id: string;
  machineName: string;
};

type TaskForm = {
  operatorId: string;
  machine: string;
  engineer: string;
};

type FormErrors = Partial<Record<keyof TaskForm, string>>;

const engineers: Engineer[] = [
  {
    id: "ENG-101",
    name: "Rajesh Kumar",
    specialization: "Hydraulic Systems",
  },
  {
    id: "ENG-102",
    name: "Aman Verma",
    specialization: "Heavy Equipment",
  },
  {
    id: "ENG-103",
    name: "Vikram Singh",
    specialization: "Engine Maintenance",
  },
];

const machines: Machine[] = [
  {
    id: "M-101",
    machineName: "Excavator EX-204",
  },
  {
    id: "M-102",
    machineName: "Loader LD-110",
  },
  {
    id: "M-103",
    machineName: "Bulldozer BD-301",
  },
  {
    id: "M-104",
    machineName: "Crane CR-502",
  },
  {
    id: "M-105",
    machineName: "Grader GD-220",
  },
  {
    id: "M-106",
    machineName: "Forklift FL-410",
  },
];

const initialOperators: Operator[] = [
  {
    id: "OP-101",
    name: "Rahul Sharma",
    email: "rahul@hme.com",
    phone: "+91 9876543210",
    assignedMachine: "Excavator EX-204",
    assignedEngineer: "Rajesh Kumar",
    shift: "Morning",
    status: "Active",
  },
  {
    id: "OP-102",
    name: "Rahul Sharma",
    email: "rahul02@hme.com",
    phone: "+91 9876543219",
    assignedMachine: "",
    assignedEngineer: "",
    shift: "Evening",
    status: "Active",
  },
  {
    id: "OP-103",
    name: "Amit Kumar",
    email: "amit@hme.com",
    phone: "+91 9876543211",
    assignedMachine: "Loader LD-110",
    assignedEngineer: "Aman Verma",
    shift: "Evening",
    status: "Active",
  },
  {
    id: "OP-104",
    name: "Vikas Singh",
    email: "vikas@hme.com",
    phone: "+91 9876543212",
    assignedMachine: "",
    assignedEngineer: "",
    shift: "Night",
    status: "Inactive",
  },
  {
    id: "OP-105",
    name: "Sandeep Verma",
    email: "sandeep@hme.com",
    phone: "+91 9876543213",
    assignedMachine: "Crane CR-502",
    assignedEngineer: "Vikram Singh",
    shift: "Morning",
    status: "On Leave",
  },
];

const PAGE_SIZE = 5;

const taskSchema = z.object({
  operatorId: z.string().min(1, "Please select an operator."),

  machine: z.string().min(1, "Please select a machine."),

  engineer: z.string().min(1, "Please select an engineer."),
});

const getStatusClass = (status: OperatorStatus) => {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";

    case "On Leave":
      return "bg-amber-50 text-amber-700 border border-amber-200";

    default:
      return "bg-red-50 text-red-700 border border-red-200";
  }
};

export default function SupervisorTaskPage() {
  const [operators, setOperators] = useState<Operator[]>(initialOperators);

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [engineerViewOpen, setEngineerViewOpen] = useState(false);

  const [selectedEngineerView, setSelectedEngineerView] = useState("");

  const [selectedOperatorId, setSelectedOperatorId] = useState("");

  const [selectedMachine, setSelectedMachine] = useState("");

  const [selectedEngineer, setSelectedEngineer] = useState("");

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(
    null,
  );

  const filteredOperators = useMemo(() => {
    const value = search.toLowerCase();

    return operators.filter(
      (operator) =>
        operator.name.toLowerCase().includes(value) ||
        operator.id.toLowerCase().includes(value) ||
        operator.email.toLowerCase().includes(value) ||
        operator.assignedMachine.toLowerCase().includes(value) ||
        operator.assignedEngineer.toLowerCase().includes(value),
    );
  }, [operators, search]);

  const assignedOperators = operators.filter((op) => op.assignedMachine).length;

  const unassignedOperators = operators.filter(
    (op) => !op.assignedMachine,
  ).length;

  const availableOperators = operators.filter((operator) =>
    editingOperatorId
      ? operator.id === editingOperatorId || !operator.assignedMachine
      : !operator.assignedMachine,
  );

  const availableMachines = machines.filter((machine) =>
    editingOperatorId
      ? machine.machineName === selectedMachine ||
        !operators.some((op) => op.assignedMachine === machine.machineName)
      : !operators.some((op) => op.assignedMachine === machine.machineName),
  );

  const machineOptions = availableMachines.map((machine) => ({
    value: machine.machineName,
    label: machine.machineName,
  }));

  const operatorOptions = availableOperators.map((operator) => ({
    label: `${operator.name} (${operator.id})`,
    value: operator.id,
  }));

  const engineerOptions = engineers.map((engineer) => ({
    label: engineer.name,
    value: engineer.name,
  }));

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOperators.length / PAGE_SIZE),
  );

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedOperators = filteredOperators.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const startItem = filteredOperators.length === 0 ? 0 : startIndex + 1;

  const endItem = Math.min(startIndex + PAGE_SIZE, filteredOperators.length);

  const openCreateModal = () => {
    setEditingOperatorId(null);
    setSelectedOperatorId("");
    setSelectedMachine("");
    setSelectedEngineer("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (operator: Operator) => {
    setEditingOperatorId(operator.id);

    setSelectedOperatorId(operator.id);

    setSelectedMachine(operator.assignedMachine);

    setSelectedEngineer(operator.assignedEngineer);

    setFormErrors({});

    setIsModalOpen(true);
  };

  const openEngineerView = (operatorId: string) => {
    setSelectedEngineerView(operatorId);

    setEngineerViewOpen(true);
  };

  const updateField = (field: keyof TaskForm, value: string) => {
    const updated = {
      operatorId: field === "operatorId" ? value : selectedOperatorId,

      machine: field === "machine" ? value : selectedMachine,

      engineer: field === "engineer" ? value : selectedEngineer,
    };

    if (field === "operatorId") setSelectedOperatorId(value);
    if (field === "machine") setSelectedMachine(value);
    if (field === "engineer") setSelectedEngineer(value);

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

  const handleAssignTask = () => {
    if (!validateForm()) return;

    setOperators((prev) =>
      prev.map((op) =>
        op.id === (editingOperatorId ?? selectedOperatorId)
          ? {
              ...op,
              assignedMachine: selectedMachine,
              assignedEngineer: selectedEngineer,
              assignedAt: new Date().toLocaleString(),
            }
          : op,
      ),
    );

    setIsModalOpen(false);
    setSelectedOperatorId("");
    setSelectedMachine("");
    setSelectedEngineer("");
    setEditingOperatorId(null);
    setFormErrors({});
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
      {/* Header */}
      <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-7 py-7 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

        {/* Top Right Glow */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

        {/* Bottom Left Glow */}
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        {/* Center Glow */}
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

        {/* Premium Highlight */}
        <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

        {/* Glass Overlay */}
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
          <div className="flex flex-col gap-3 md:flex-row">
            {/* Search */}
            <div className="relative w-full md:w-[350px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search operator, ID, machine..."
                className="
            h-12
            w-full
            rounded-xl
            border
            border-white/15
            bg-white/10
            pl-12
            pr-4
            text-sm
            font-medium
            text-white
            backdrop-blur-md
            outline-none
            transition-all
            duration-300
            placeholder:text-white/50
            focus:border-white/30
            focus:bg-white/15
            focus:ring-4
            focus:ring-white/10
          "
              />
            </div>

            {/* Assign Task */}
            <button
              onClick={openCreateModal}
              className="
          inline-flex
          h-12
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-blue-300/30
          bg-white
          px-5
          text-sm
          font-bold
          text-[#3730D9]
          shadow-lg
          shadow-black/10
          transition-all
          duration-300
          hover:-translate-y-1
          hover:bg-slate-50
          hover:shadow-xl
          dark:border-slate-600
          dark:bg-slate-900
          dark:text-blue-300
          dark:hover:bg-slate-800
        "
            >
              <Plus className="h-5 w-5" />
              Task
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Operators</p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {operators.length}
              </h2>
            </div>

            <div className="rounded-2xl bg-blue-100 p-4 text-blue-600">
              <UsersRound className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Assigned</p>

              <h2 className="mt-2 text-3xl font-bold text-emerald-600">
                {assignedOperators}
              </h2>
            </div>

            <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Unassigned</p>

              <h2 className="mt-2 text-3xl font-bold text-orange-500">
                {unassignedOperators}
              </h2>
            </div>

            <div className="rounded-2xl bg-orange-100 p-4 text-orange-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Engineers</p>

              <h2 className="mt-2 text-3xl font-bold text-violet-600">
                {engineers.length}
              </h2>
            </div>

            <div className="rounded-2xl bg-violet-100 p-4 text-violet-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm [zoom:0.88] origin-top dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[650px] overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Operator
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Contact
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Machine
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Engineer
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Shift
                </th>

                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Assignment
                </th>

                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedOperators.map((operator) => {
                const isAssigned = !!operator.assignedMachine;

                return (
                  <tr
                    key={operator.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
                  >
                    {/* Operator */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
                          <UsersRound className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {operator.name}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {operator.id}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isAssigned
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {isAssigned ? "Assigned" : "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-5">
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {operator.email}
                        </p>

                        <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {operator.phone}
                        </p>
                      </div>
                    </td>

                    {/* Machine */}
                    <td className="px-6 py-5">
                      {operator.assignedMachine ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-1.5 font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                          <Cpu className="h-4 w-4" />
                          {operator.assignedMachine}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Not Assigned
                        </span>
                      )}
                    </td>

                    {/* Engineer */}
                    <td className="px-6 py-5">
                      {operator.assignedEngineer ? (
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 font-medium text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                          <UserCog className="h-4 w-4" />
                          {operator.assignedEngineer}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">
                          Not Assigned
                        </span>
                      )}
                    </td>

                    {/* Shift */}
                    <td className="px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {operator.shift}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-4 py-2 text-xs font-semibold ${getStatusClass(
                          operator.status,
                        )}`}
                      >
                        {operator.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditModal(operator)}
                          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          <Pencil className="h-4 w-4" />
                          Reassign
                        </button>

                        {operator.assignedEngineer && (
                          <button
                            onClick={() => openEngineerView(operator.id)}
                            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-slate-700"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {startItem}-{endItem} of {filteredOperators.length}{" "}
            operators
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Prev
            </button>

            <div className="rounded-2xl bg-slate-100 px-5 py-2 text-sm font-semibold dark:bg-slate-800">
              {currentPage} / {totalPages}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Operator View Modal */}
      {engineerViewOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm ">
          <div className="w-full max-w-4xl rounded-[28px] bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Operator Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Complete assignment details.
                </p>
              </div>

              <button
                onClick={() => setEngineerViewOpen(false)}
                className="rounded-2xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {(() => {
              const selectedOperator = operators.find(
                (op) => op.id === selectedEngineerView,
              );

              if (!selectedOperator) return null;

              const operatorOptions = availableOperators.map((operator) => ({
                value: operator.id,
                label: `${operator.name} (${operator.id})`,
              }));

              const machineOptions = availableMachines.map((machine) => ({
                value: machine.machineName,
                label: machine.machineName,
              }));

              const engineerOptions = engineers.map((engineer) => ({
                value: engineer.name,
                label: engineer.name,
              }));

              return (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950 md:col-span-2">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                        <UsersRound className="h-7 w-7" />
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                          {selectedOperator.name}
                        </h3>

                        <p className="text-sm text-slate-500">
                          Operator ID: {selectedOperator.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Assigned Machine
                    </p>

                    <h4 className="mt-2 font-semibold text-blue-600">
                      {selectedOperator.assignedMachine || "Not Assigned"}
                    </h4>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Engineer
                    </p>

                    <h4 className="mt-2 font-semibold text-violet-600">
                      {selectedOperator.assignedEngineer || "Not Assigned"}
                    </h4>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Contact Details
                    </p>

                    <div className="mt-3 space-y-2 text-sm">
                      <p>Email: {selectedOperator.email}</p>

                      <p>Phone: {selectedOperator.phone}</p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 p-5 dark:border-slate-700">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Assignment Info
                    </p>

                    <div className="mt-3 space-y-2 text-sm">
                      <p>Shift: {selectedOperator.shift}</p>

                      <p>Assigned At: {selectedOperator.assignedAt || "-"}</p>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          selectedOperator.status,
                        )}`}
                      >
                        {selectedOperator.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl dark:bg-slate-900">
            <div className="mb-7 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {editingOperatorId ? "Reassign Operator" : "Assign Task"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Only unassigned operators and machines are shown.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Operator Dropdown */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Operator
                </label>

                <div className="relative w-full">
                  <AppSelect
                    value={selectedOperatorId}
                    options={operatorOptions}
                    placeholder="Select Operator"
                    searchable
                    onChange={(value) => updateField("operatorId", value)}
                  />
                  <div className="mt-1 min-h-[20px]">
                    {formErrors.operatorId && (
                      <p className="text-xs font-medium text-red-500">
                        {formErrors.operatorId}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Machine Dropdown */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Machine
                </label>

                <AppSelect
                  value={selectedMachine}
                  options={machineOptions}
                  placeholder="Select Machine"
                  searchable
                  onChange={(value) => updateField("machine", value)}
                />
                <div className="mt-1 min-h-[20px]">
                  {formErrors.machine && (
                    <p className="text-xs font-medium text-red-500">
                      {formErrors.machine}
                    </p>
                  )}
                </div>
              </div>
              {/* Engineer */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Assign Engineer
                </label>
                <AppSelect
                  value={selectedEngineer}
                  options={engineerOptions}
                  placeholder="Select Engineer"
                  searchable
                  onChange={(value) => updateField("engineer", value)}
                />

                <div className="mt-1 min-h-[20px]">
                  {formErrors.engineer && (
                    <p className="text-xs font-medium text-red-500">
                      {formErrors.engineer}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOperatorId("");
                  setSelectedMachine("");
                  setSelectedEngineer("");
                  setEditingOperatorId(null);
                  setFormErrors({});
                }}
                className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={handleAssignTask}
                disabled={
                  !selectedOperatorId || !selectedMachine || !selectedEngineer
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-5 w-5" />
                {editingOperatorId ? "Update" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
