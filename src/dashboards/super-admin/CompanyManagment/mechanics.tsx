import React, { useMemo, useState } from "react";
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
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

type OperatorStatus = "Active" | "Inactive" | "On Duty";

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

const operatorsData: Operator[] = [
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
  Active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "On Duty": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const statusIcon: Record<OperatorStatus, React.ReactElement> = {
  Active: <CheckCircle className="h-4 w-4" />,
  Inactive: <AlertCircle className="h-4 w-4" />,
  "On Duty": <Clock className="h-4 w-4" />,
};

export default function Operators() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [deleteOperator, setDeleteOperator] = useState<Operator | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const filteredOperators = useMemo(() => {
    return operatorsData.filter((operator) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        operator.name.toLowerCase().includes(searchValue) ||
        operator.email.toLowerCase().includes(searchValue) ||
        operator.company.toLowerCase().includes(searchValue) ||
        operator.site.toLowerCase().includes(searchValue) ||
        operator.assignedMachine.toLowerCase().includes(searchValue);

      const matchesStatus = statusFilter === "All" || operator.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredOperators.length / itemsPerPage);

  const paginatedOperators = filteredOperators.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalOperators = operatorsData.length;
  const onDutyOperators = operatorsData.filter((item) => item.status === "On Duty").length;
  const activeOperators = operatorsData.filter((item) => item.status === "Active").length;
  const inactiveOperators = operatorsData.filter((item) => item.status === "Inactive").length;

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Operators Management
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View and manage all company operators across machines and sites.
              </p>
            </div>

            <button className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              <Users className="mr-2 h-4 w-4" />
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
          <StatCard title="On Duty" value={onDutyOperators} icon={<Clock className="h-5 w-5" />} />
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
                        <p className="text-xs text-gray-500">{operator.email}</p>
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
                        <ActionButton title="View" onClick={() => setSelectedOperator(operator)}>
                          <Eye className="h-4 w-4" />
                        </ActionButton>

                        <ActionButton title="Edit">
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
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
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
            onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
          />
        </div>
      </div>

      {selectedOperator && (
        <DetailsModal operator={selectedOperator} onClose={() => setSelectedOperator(null)} />
      )}

      {deleteOperator && (
        <DeleteModal
          name={deleteOperator.name}
          onClose={() => setDeleteOperator(null)}
          onConfirm={() => setDeleteOperator(null)}
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
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
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

function DetailsModal({ operator, onClose }: { operator: Operator; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Operator Details</h2>
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
          <InfoItem icon={<Building2 />} label="Company" value={operator.company} />
          <InfoItem icon={<MapPin />} label="Site" value={operator.site} />
          <InfoItem icon={<Users />} label="Assigned Machine" value={operator.assignedMachine} />
          <InfoItem icon={<Clock />} label="Shift" value={operator.shift} />
          <InfoItem icon={<CheckCircle />} label="Experience" value={operator.experience} />
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
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Operator</h2>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{name}</span>?
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
