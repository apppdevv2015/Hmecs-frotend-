import { useMemo, useState } from "react";
import { Search, Truck, Activity, AlertTriangle } from "lucide-react";

type Machine = {
  id: string;
  name: string;
  code: string;
  operator: string;
  location: string;
  health: number;
  status: "Running" | "Idle" | "Maintenance" | "Critical";
};

const machines: Machine[] = [
  {
    id: "1",
    name: "Excavator",
    code: "EX-204",
    operator: "Rahul Sharma",
    location: "Site A",
    health: 86,
    status: "Running",
  },
  {
    id: "2",
    name: "Loader",
    code: "LD-110",
    operator: "Amit Kumar",
    location: "Site B",
    health: 64,
    status: "Maintenance",
  },
  {
    id: "3",
    name: "Bulldozer",
    code: "BD-301",
    operator: "Vikas Singh",
    location: "Site C",
    health: 42,
    status: "Critical",
  },
  {
    id: "4",
    name: "Crane",
    code: "CR-502",
    operator: "Sandeep Verma",
    location: "Site A",
    health: 91,
    status: "Running",
  },
  {
    id: "5",
    name: "Dump Truck",
    code: "DT-801",
    operator: "Manoj Tyagi",
    location: "Site D",
    health: 73,
    status: "Idle",
  },
];

const PAGE_SIZE = 5;

const getStatusClass = (status: Machine["status"]) => {
  if (status === "Running") {
    return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400";
  }

  if (status === "Maintenance") {
    return "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400";
  }

  if (status === "Critical") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

export default function SupervisorMachines() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMachines = useMemo(() => {
    const value = search.toLowerCase().trim();

    return machines.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(value) ||
        machine.code.toLowerCase().includes(value) ||
        machine.operator.toLowerCase().includes(value) ||
        machine.location.toLowerCase().includes(value) ||
        machine.status.toLowerCase().includes(value)
      );
    });
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedMachines = filteredMachines.slice(startIndex, startIndex + PAGE_SIZE);

  const startItem = filteredMachines.length === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + PAGE_SIZE, filteredMachines.length);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

        <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Content */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Truck size={14} />
              Machine Monitoring
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">Assigned Machines</h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              View machine health, operator assignments, machine status, location tracking and
              operational performance from a centralized monitoring dashboard.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search machines..."
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
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Machine
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Operator
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Location
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Health
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedMachines.map((machine) => (
                <tr
                  key={machine.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-950/60"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {machine.name}
                        </p>
                        <p className="text-xs text-slate-500">{machine.code}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {machine.operator}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {machine.location}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {machine.health}%
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                        machine.status,
                      )}`}
                    >
                      {machine.status}
                    </span>
                  </td>
                </tr>
              ))}

              {paginatedMachines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                    <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                    No machines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing {startItem}-{endItem} of {filteredMachines.length}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              Prev
            </button>

            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
