import React, { useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

type OperatorStatus = "Active" | "Inactive" | "On Duty";
type OperatorShift = "Morning" | "Evening" | "Night";

type Operator = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  site: string;
  assignedMachine: string;
  shift: string;
  experience: string;
  status: OperatorStatus;
  joinedDate: string;
};

const operatorsSeedData: Operator[] = [
  {
    id: "OP-001",
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
    id: "OP-002",
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
    id: "OP-003",
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
    id: "OP-004",
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
    id: "OP-005",
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
    id: "OP-006",
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

const statusStyle: Record<OperatorStatus, string> = {
  Active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "On Duty": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const statusIcon: Record<OperatorStatus, React.ReactElement> = {
  Active: <CheckCircle className="h-4 w-4" />,
  Inactive: <AlertCircle className="h-4 w-4" />,
  "On Duty": <Clock className="h-4 w-4" />,
};

const shiftOptions: OperatorShift[] = ["Morning", "Evening", "Night"];
const statusOptions: OperatorStatus[] = ["Active", "Inactive", "On Duty"];

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

const operatorFormSchema = z.object({
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

type OperatorFormValues = z.infer<typeof operatorFormSchema>;

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

function nextOperatorId(operators: Operator[]): string {
  const maxNum = operators.reduce((max, op) => {
    const num = parseInt(op.id.replace(/\D/g, ""), 10);
    return Number.isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `OP-${String(maxNum + 1).padStart(3, "0")}`;
}

export default function Operators() {
  const [operators, setOperators] = useState<Operator[]>(operatorsSeedData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(
    null,
  );
  const [deleteOperator, setDeleteOperator] = useState<Operator | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editOperator, setEditOperator] = useState<Operator | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const filteredOperators = useMemo(() => {
    return operators.filter((operator) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        operator.name.toLowerCase().includes(searchValue) ||
        operator.email.toLowerCase().includes(searchValue) ||
        operator.company.toLowerCase().includes(searchValue) ||
        operator.site.toLowerCase().includes(searchValue) ||
        operator.assignedMachine.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" || operator.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [operators, search, statusFilter]);

  const totalPages = Math.ceil(filteredOperators.length / itemsPerPage);

  const paginatedOperators = filteredOperators.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalOperators = operators.length;
  const onDutyOperators = operators.filter(
    (item) => item.status === "On Duty",
  ).length;
  const activeOperators = operators.filter(
    (item) => item.status === "Active",
  ).length;
  const inactiveOperators = operators.filter(
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

  const handleAddOperator = (values: OperatorFormValues) => {
    // BACKEND TODO: Replace with POST /api/operators call, then refresh list from response
    const newOperator: Operator = {
      id: nextOperatorId(operators),
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

    setOperators((prev) => [newOperator, ...prev]);
    setShowAddModal(false);
    setCurrentPage(1);
  };

  const handleUpdateOperator = (values: OperatorFormValues) => {
    if (!editOperator) return;

    // BACKEND TODO: Replace with PATCH /api/operators/:id call, then refresh list from response
    setOperators((prev) =>
      prev.map((op) =>
        op.id === editOperator.id
          ? {
              ...op,
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
          : op,
      ),
    );
    setEditOperator(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteOperator) return;

    // BACKEND TODO: Replace with DELETE /api/operators/:id call
    setOperators((prev) => prev.filter((op) => op.id !== deleteOperator.id));
    setDeleteOperator(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6 shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Content */}
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                Workforce Management
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Operators Management
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-medium text-blue-100">
                View, manage, and monitor all company operators across machines,
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
              Add Operator
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Operators"
            value={totalOperators}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="On Duty"
            value={onDutyOperators}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Active"
            value={activeOperators}
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <StatCard
            title="Inactive"
            value={inactiveOperators}
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
                placeholder="Search operator, company, site, machine..."
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
                  <TableHead>Operator</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedOperators.map((operator) => (
                  <tr
                    key={operator.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-950/70"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {operator.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {operator.email}
                        </p>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {operator.company}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {operator.site}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {operator.assignedMachine}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {operator.shift}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[operator.status]}`}
                      >
                        {statusIcon[operator.status]}
                        {operator.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          title="View"
                          onClick={() => setSelectedOperator(operator)}
                        >
                          <Eye className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          title="Edit"
                          onClick={() => setEditOperator(operator)}
                        >
                          <Edit className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton
                          title="Delete"
                          danger
                          onClick={() => setDeleteOperator(operator)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedOperators.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No operators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOperators.length}
            itemsPerPage={itemsPerPage}
            onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onNext={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))
            }
          />
        </div>
      </div>

      {selectedOperator && (
        <DetailsModal
          operator={selectedOperator}
          onClose={() => setSelectedOperator(null)}
        />
      )}

      {showAddModal && (
        <OperatorFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddOperator}
        />
      )}

      {editOperator && (
        <OperatorFormModal
          mode="edit"
          initialOperator={editOperator}
          onClose={() => setEditOperator(null)}
          onSubmit={handleUpdateOperator}
        />
      )}

      {deleteOperator && (
        <DeleteModal
          name={deleteOperator.name}
          onClose={() => setDeleteOperator(null)}
          onConfirm={handleDeleteConfirm}
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
  operator,
  onClose,
}: {
  operator: Operator;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999990] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Operator Details
            </h2>
            <p className="text-sm text-gray-500">{operator.id}</p>
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
          <InfoItem icon={<Users />} label="Name" value={operator.name} />
          <InfoItem icon={<Mail />} label="Email" value={operator.email} />
          <InfoItem icon={<Phone />} label="Phone" value={operator.phone} />
          <InfoItem
            icon={<Building2 />}
            label="Company"
            value={operator.company}
          />
          <InfoItem icon={<MapPin />} label="Site" value={operator.site} />
          <InfoItem
            icon={<Users />}
            label="Assigned Machine"
            value={operator.assignedMachine}
          />
          <InfoItem icon={<Clock />} label="Shift" value={operator.shift} />
          <InfoItem
            icon={<CheckCircle />}
            label="Experience"
            value={operator.experience}
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
/* Add / Edit Operator Modal                                                  */
/* -------------------------------------------------------------------------- */

function OperatorFormModal({
  mode,
  initialOperator,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  initialOperator?: Operator;
  onClose: () => void;
  onSubmit: (values: OperatorFormValues) => void;
}) {
  const defaultPhone = initialOperator
    ? splitPhone(initialOperator.phone)
    : { countryCode: "+27", phone: "" };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OperatorFormValues>({
    resolver: zodResolver(operatorFormSchema) as Resolver<OperatorFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: initialOperator?.name ?? "",
      email: initialOperator?.email ?? "",
      countryCode: defaultPhone.countryCode,
      phone: defaultPhone.phone,
      company: initialOperator?.company ?? "",
      site: initialOperator?.site ?? "",
      assignedMachine: initialOperator?.assignedMachine ?? "",
      shift: (initialOperator?.shift as OperatorShift) ?? "Morning",
      experience: initialOperator?.experience ?? "",
      status: initialOperator?.status ?? "Active",
    },
  });

  const submitHandler: SubmitHandler<OperatorFormValues> = (values) => {
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0  flex items-center justify-center bg-black/60 pt-9 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === "add" ? "Add Operator" : "Edit Operator"}
            </h2>
            <p className="text-sm text-gray-500">
              {mode === "add"
                ? "Fill in the details to onboard a new operator."
                : `Editing ${initialOperator?.id}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                type="text"
                inputMode="numeric"
                placeholder="e.g. 714569081"
                className={`${inputClass(!!errors.phone)} flex-1`}
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
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "add" ? "Add Operator" : "Save Changes"}
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
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Delete Operator
        </h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {name}
          </span>
          ?
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
