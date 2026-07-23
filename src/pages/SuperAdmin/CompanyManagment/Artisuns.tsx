import React, { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Users,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

type MechanicStatus = "Active" | "Inactive" | "On Duty";
type MechanicShift = "Morning" | "Evening" | "Night";

type Mechanic = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  site: string;
  assignedMachine: string;
  shift: string;
  experience: string;
  status: MechanicStatus;
  joinedDate: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const mechanicsSeedData: Mechanic[] = [
  {
    id: "MC-001",
    name: "Thabo Mokoena",
    email: "thabo.mokoena@example.com",
    phone: "+27 71 456 9081",
    company: "African Mining Ltd",
    site: "Johannesburg Site A",
    assignedMachine: "CAT 777D",
    shift: "Morning",
    experience: "5 Years",
    status: "On Duty",
    joinedDate: "2024-02-12",
  },
  {
    id: "MC-002",
    name: "Sipho Dlamini",
    email: "sipho.dlamini@example.com",
    phone: "+27 72 234 7710",
    company: "Cape Heavy Works",
    site: "Cape Town Yard",
    assignedMachine: "Komatsu HD785",
    shift: "Evening",
    experience: "4 Years",
    status: "Active",
    joinedDate: "2023-11-08",
  },
  {
    id: "MC-003",
    name: "Lerato Khumalo",
    email: "lerato.khumalo@example.com",
    phone: "+27 73 981 2204",
    company: "Durban Earth Movers",
    site: "Durban Port Site",
    assignedMachine: "Volvo A40G",
    shift: "Night",
    experience: "6 Years",
    status: "Inactive",
    joinedDate: "2022-07-19",
  },
  {
    id: "MC-004",
    name: "Mandla Ndlovu",
    email: "mandla.ndlovu@example.com",
    phone: "+27 74 112 6655",
    company: "African Mining Ltd",
    site: "Johannesburg Site B",
    assignedMachine: "Liebherr T 264",
    shift: "Morning",
    experience: "7 Years",
    status: "On Duty",
    joinedDate: "2021-09-25",
  },
  {
    id: "MC-005",
    name: "Naledi Jacobs",
    email: "naledi.jacobs@example.com",
    phone: "+27 76 884 3190",
    company: "Northern Fleet Group",
    site: "Pretoria Mine",
    assignedMachine: "CAT 740B",
    shift: "Evening",
    experience: "3 Years",
    status: "Active",
    joinedDate: "2024-05-03",
  },
  {
    id: "MC-006",
    name: "Johan Botha",
    email: "johan.botha@example.com",
    phone: "+27 78 331 4209",
    company: "Cape Heavy Works",
    site: "Cape Town Site C",
    assignedMachine: "Bell B50E",
    shift: "Morning",
    experience: "8 Years",
    status: "Active",
    joinedDate: "2020-03-14",
  },
];

const statusStyle: Record<MechanicStatus, string> = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "On Duty": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const statusIcon: Record<MechanicStatus, React.ReactElement> = {
  Active: <CheckCircle className="h-4 w-4" />,
  Inactive: <AlertCircle className="h-4 w-4" />,
  "On Duty": <Clock className="h-4 w-4" />,
};

const shiftOptions: MechanicShift[] = ["Morning", "Evening", "Night"];
const statusOptions: MechanicStatus[] = ["Active", "Inactive", "On Duty"];

const countryCodes = [
  { code: "+27", label: "South Africa" },
  { code: "+91", label: "India" },
  { code: "+1", label: "USA / Canada" },
  { code: "+44", label: "United Kingdom" },
  { code: "+61", label: "Australia" },
  { code: "+971", label: "UAE" },
  { code: "+254", label: "Kenya" },
  { code: "+263", label: "Zimbabwe" },
];

/* -------------------------------------------------------------------------- */
/* Zod validation schema                                                      */
/* -------------------------------------------------------------------------- */

const mechanicFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be under 60 characters"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
  countryCode: z.string().min(1, "Country code is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  company: z.string().trim().min(1, "Company is required"),
  site: z.string().trim().min(1, "Site is required"),
  assignedMachine: z.string().trim().min(1, "Assigned machine is required"),
  shift: z.enum(["Morning", "Evening", "Night"], {
    message: "Shift is required",
  }),

  experience: z
    .string()
    .trim()
    .min(1, "Experience is required")
    .max(20, "Keep this under 20 characters"),

  status: z.enum(["Active", "Inactive", "On Duty"], {
    message: "Status is required",
  }),
});

type MechanicFormValues = z.infer<typeof mechanicFormSchema>;
function splitPhone(fullPhone: string): { countryCode: string; phone: string } {
  const match = countryCodes.find((c) => fullPhone.startsWith(c.code));
  if (match) {
    return {
      countryCode: match.code,
      phone: fullPhone.slice(match.code.length).replace(/\D/g, ""),
    };
  }
  return { countryCode: "+27", phone: fullPhone.replace(/\D/g, "") };
}

function nextMechanicId(mechanics: Mechanic[]): string {
  const maxNum = mechanics.reduce((max, m) => {
    const num = parseInt(m.id.replace(/\D/g, ""), 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `MC-${String(maxNum + 1).padStart(3, "0")}`;
}

export default function Mechanics() {
  const [mechanics, setMechanics] = useState<Mechanic[]>(mechanicsSeedData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(
    null,
  );
  const [deleteMechanic, setDeleteMechanic] = useState<Mechanic | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMechanic, setEditMechanic] = useState<Mechanic | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const itemsPerPage = 5;

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setToastVisible(true);

    window.setTimeout(() => {
      setToastVisible(false);
    }, 2600);

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    const isModalOpen =
      !!showAddModal ||
      !!editMechanic ||
      !!deleteMechanic ||
      !!selectedMechanic;

    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showAddModal, editMechanic, deleteMechanic, selectedMechanic]);

  const filteredMechanics = useMemo(() => {
    return mechanics.filter((mechanic) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        mechanic.name.toLowerCase().includes(searchValue) ||
        mechanic.email.toLowerCase().includes(searchValue) ||
        mechanic.company.toLowerCase().includes(searchValue) ||
        mechanic.site.toLowerCase().includes(searchValue) ||
        mechanic.assignedMachine.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" || mechanic.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [mechanics, search, statusFilter]);

  const totalPages = Math.ceil(filteredMechanics.length / itemsPerPage);

  const paginatedMechanics = filteredMechanics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalMechanics = mechanics.length;
  const onDutyMechanics = mechanics.filter(
    (item) => item.status === "On Duty",
  ).length;
  const activeMechanics = mechanics.filter(
    (item) => item.status === "Active",
  ).length;
  const inactiveMechanics = mechanics.filter(
    (item) => item.status === "Inactive",
  ).length;

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleAddMechanic = (values: MechanicFormValues) => {
    try {
      setIsAdding(true);

      // BACKEND TODO: Replace this block with `await createMechanic(payload)`,
      // check `response.success`, then refresh the list from the API response.
      const newMechanic: Mechanic = {
        id: nextMechanicId(mechanics),
        name: values.name,
        email: values.email,
        phone: `${values.countryCode} ${values.phone}`,
        company: values.company,
        site: values.site,
        assignedMachine: values.assignedMachine,
        shift: values.shift,
        experience: values.experience,
        status: values.status,
        joinedDate: new Date().toISOString().slice(0, 10),
      };

      setMechanics((prev) => [newMechanic, ...prev]);
      setShowAddModal(false);
      setCurrentPage(1);
      showToast("success", `${newMechanic.name} was added as a new mechanic.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add mechanic";
      showToast("error", message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateMechanic = (values: MechanicFormValues) => {
    if (!editMechanic) return;

    try {
      setIsUpdating(true);

      // BACKEND TODO: Replace this block with `await updateMechanic(editMechanic.id, payload)`,
      // check `response.success`, then refresh the list from the API response.
      setMechanics((prev) =>
        prev.map((m) =>
          m.id === editMechanic.id
            ? {
                ...m,
                name: values.name,
                email: values.email,
                phone: `${values.countryCode} ${values.phone}`,
                company: values.company,
                site: values.site,
                assignedMachine: values.assignedMachine,
                shift: values.shift,
                experience: values.experience,
                status: values.status,
              }
            : m,
        ),
      );

      setEditMechanic(null);
      showToast("success", `${values.name}'s details were updated.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update mechanic";
      showToast("error", message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteMechanic) return;

    try {
      setIsDeleting(true);

      // BACKEND TODO: Replace this block with `await deleteMechanic(deleteMechanic.id)`,
      // check `response.success`, then refresh the list from the API response.
      setMechanics((prev) => prev.filter((m) => m.id !== deleteMechanic.id));
      showToast("success", `${deleteMechanic.name} was removed.`);
      setDeleteMechanic(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete mechanic";
      showToast("error", message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-[999999] w-[340px] transform rounded-2xl border bg-white p-4 shadow-2xl transition-all duration-300 ease-out dark:bg-slate-900 ${
            toastVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-4 opacity-0"
          } ${
            toast.type === "success"
              ? "border-green-200 dark:border-green-500/30"
              : "border-red-200 dark:border-red-500/30"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${
                toast.type === "success"
                  ? "bg-green-50 text-green-600 dark:bg-green-500/10"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <XCircle size={20} />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {toast.type === "success" ? "Success" : "Error"}
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setToastVisible(false);
                window.setTimeout(() => setToast(null), 300);
              }}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>

          <div
            className={`mt-3 h-1 overflow-hidden rounded-full ${
              toast.type === "success"
                ? "bg-green-100 dark:bg-green-500/20"
                : "bg-red-100 dark:bg-red-500/20"
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-[2600ms] ease-linear ${
                toastVisible ? "w-0" : "w-full"
              } ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
            />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6 shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Content */}
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                Workforce Management
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Mechanic Management
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-medium text-blue-100">
                View, manage, and monitor all company mechanics across machines,
                assignments, and operational sites from one centralized
                location.
              </p>
            </div>

            {/* Right Action */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
            >
              <Users className="h-4 w-4" />
              Add Mechanic
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Mechanics"
            value={totalMechanics}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="On Duty"
            value={onDutyMechanics}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Active"
            value={activeMechanics}
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <StatCard
            title="Inactive"
            value={inactiveMechanics}
            icon={<AlertCircle className="h-5 w-5" />}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search mechanic, company, site, machine..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />

              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="All">All Status</option>
                <option value="On Duty">On Duty</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950">
                  <TableHead>Mechanic</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedMechanics.map((mechanic) => (
                  <tr
                    key={mechanic.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-950/70"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {mechanic.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {mechanic.email}
                        </p>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {mechanic.company}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {mechanic.site}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {mechanic.assignedMachine}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {mechanic.shift}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[mechanic.status]}`}
                      >
                        {statusIcon[mechanic.status]}
                        {mechanic.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          title="View"
                          onClick={() => setSelectedMechanic(mechanic)}
                        >
                          <Eye className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          title="Edit"
                          onClick={() => setEditMechanic(mechanic)}
                        >
                          <Edit className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          title="Delete"
                          danger
                          onClick={() => setDeleteMechanic(mechanic)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedMechanics.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No mechanics found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredMechanics.length}
            itemsPerPage={itemsPerPage}
            onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onNext={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))
            }
          />
        </div>
      </div>

      {selectedMechanic && (
        <DetailsModal
          mechanic={selectedMechanic}
          onClose={() => setSelectedMechanic(null)}
        />
      )}

      {showAddModal && (
        <MechanicFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddMechanic}
          isSubmittingExternally={isAdding}
        />
      )}

      {editMechanic && (
        <MechanicFormModal
          mode="edit"
          initialMechanic={editMechanic}
          onClose={() => setEditMechanic(null)}
          onSubmit={handleUpdateMechanic}
          isSubmittingExternally={isUpdating}
        />
      )}

      {deleteMechanic && (
        <DeleteModal
          name={deleteMechanic.name}
          onClose={() => setDeleteMechanic(null)}
          onConfirm={handleDeleteConfirm}
          deleting={isDeleting}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactElement;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </h3>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 ${
        align === "right" ? "text-right" : "text-left"
      } text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400`}
    >
      {children}
    </th>
  );
}

function ActionButton({
  children,
  title,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg border p-2 transition ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
          : "border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {start} to {end} of {totalItems} records
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage === 1}
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Prev
        </button>

        <span className="text-sm text-gray-600 dark:text-gray-300">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DetailsModal({
  mechanic,
  onClose,
}: {
  mechanic: Mechanic;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Mechanic Details
            </h2>
            <p className="text-sm text-gray-500">{mechanic.id}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoItem icon={<Users />} label="Name" value={mechanic.name} />
          <InfoItem icon={<Mail />} label="Email" value={mechanic.email} />
          <InfoItem icon={<Phone />} label="Phone" value={mechanic.phone} />
          <InfoItem
            icon={<Building2 />}
            label="Company"
            value={mechanic.company}
          />
          <InfoItem icon={<MapPin />} label="Site" value={mechanic.site} />
          <InfoItem
            icon={<Users />}
            label="Assigned Machine"
            value={mechanic.assignedMachine}
          />
          <InfoItem icon={<Clock />} label="Shift" value={mechanic.shift} />
          <InfoItem
            icon={<CheckCircle />}
            label="Experience"
            value={mechanic.experience}
          />
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex gap-3">
        <div className="mt-1 text-blue-600 dark:text-blue-400">
          {React.cloneElement(icon, {
            className: "h-4 w-4",
          } as React.HTMLAttributes<HTMLElement>)}
        </div>

        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add / Edit Mechanic Modal                                                  */
/* -------------------------------------------------------------------------- */

function MechanicFormModal({
  mode,
  initialMechanic,
  onClose,
  onSubmit,
  isSubmittingExternally,
}: {
  mode: "add" | "edit";
  initialMechanic?: Mechanic;
  onClose: () => void;
  onSubmit: (values: MechanicFormValues) => void;
  isSubmittingExternally: boolean;
}) {
  const defaultPhone = initialMechanic
    ? splitPhone(initialMechanic.phone)
    : { countryCode: "+27", phone: "" };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MechanicFormValues>({
    resolver: zodResolver(mechanicFormSchema) as Resolver<MechanicFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: initialMechanic?.name ?? "",
      email: initialMechanic?.email ?? "",
      countryCode: defaultPhone.countryCode,
      phone: defaultPhone.phone,
      company: initialMechanic?.company ?? "",
      site: initialMechanic?.site ?? "",
      assignedMachine: initialMechanic?.assignedMachine ?? "",
      shift: (initialMechanic?.shift as MechanicShift) ?? "Morning",
      experience: initialMechanic?.experience ?? "",
      status: initialMechanic?.status ?? "Active",
    },
  });

  const submitHandler: SubmitHandler<MechanicFormValues> = (values) => {
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-8 backdrop-blur-sm">
      <div className="relative my-6 w-full max-w-xl max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === "add" ? "Add Mechanic" : "Edit Mechanic"}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === "add"
                ? "Fill in the details to onboard a new mechanic."
                : `Editing ${initialMechanic?.id}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmittingExternally}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(submitHandler)}
          className="mt-5 space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full Name" error={errors.name?.message}>
              <input
                {...register("name")}
                type="text"
                placeholder="e.g. Thabo Mokoena"
                className={inputClass(!!errors.name)}
              />
            </FormField>

            <FormField label="Email" error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                placeholder="e.g. name@example.com"
                className={inputClass(!!errors.email)}
              />
            </FormField>
          </div>

          <FormField
            label="Phone Number"
            error={errors.phone?.message ?? errors.countryCode?.message}
          >
            <div className="flex gap-2">
              <select
                {...register("countryCode")}
                className={`${inputClass(!!errors.countryCode)} w-32 shrink-0`}
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.label})
                  </option>
                ))}
              </select>

              <input
                {...register("phone")}
                type="tel"
                name="operator_phone"
                autoComplete="off"
                inputMode="numeric"
              />
            </div>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company" error={errors.company?.message}>
              <input
                {...register("company")}
                type="text"
                placeholder="e.g. African Mining Ltd"
                className={inputClass(!!errors.company)}
              />
            </FormField>

            <FormField label="Site" error={errors.site?.message}>
              <input
                {...register("site")}
                type="text"
                placeholder="e.g. Johannesburg Site A"
                className={inputClass(!!errors.site)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Assigned Machine"
              error={errors.assignedMachine?.message}
            >
              <input
                {...register("assignedMachine")}
                type="text"
                placeholder="e.g. CAT 777D"
                className={inputClass(!!errors.assignedMachine)}
              />
            </FormField>

            <FormField label="Experience" error={errors.experience?.message}>
              <input
                {...register("experience")}
                type="text"
                placeholder="e.g. 5 Years"
                className={inputClass(!!errors.experience)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Shift" error={errors.shift?.message}>
              <div className="relative">
                <select
                  {...register("shift")}
                  className={`${inputClass(!!errors.shift)} appearance-none pr-9`}
                >
                  {shiftOptions.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </FormField>

            <FormField label="Status" error={errors.status?.message}>
              <div className="relative">
                <select
                  {...register("status")}
                  className={`${inputClass(!!errors.status)} appearance-none pr-9`}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </FormField>
          </div>

          <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmittingExternally}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmittingExternally}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "add"
                ? isSubmittingExternally
                  ? "Adding..."
                  : "Add Mechanic"
                : isSubmittingExternally
                  ? "Saving..."
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:ring-2 dark:bg-gray-950 dark:text-gray-200 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-gray-700"
  }`;
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function DeleteModal({
  name,
  onClose,
  onConfirm,
  deleting,
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Delete Mechanic
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {name}
          </span>
          ? This action cannot be undone.
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
