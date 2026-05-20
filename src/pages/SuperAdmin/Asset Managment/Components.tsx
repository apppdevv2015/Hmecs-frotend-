import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Filter,
  Search,
  Settings,
  Truck,
  Wrench,
} from "lucide-react";

type ComponentStatus = "Healthy" | "Warning" | "Critical";

type MachineComponent = {
  id: string;
  componentName: string;
  machineName: string;
  machineCode: string;
  companyName: string;
  location: string;
  category: string;
  health: number;
  status: ComponentStatus;
  lastService: string;
  nextService: string;
};

const componentsData: MachineComponent[] = [
  {
    id: "CMP-001",
    componentName: "Engine System",
    machineName: "CAT 777D",
    machineCode: "MCH-001",
    companyName: "Cape Mining Ltd",
    location: "Johannesburg Site",
    category: "Engine",
    health: 86,
    status: "Healthy",
    lastService: "2026-05-02",
    nextService: "2026-06-02",
  },
  {
    id: "CMP-002",
    componentName: "Hydraulic Pump",
    machineName: "Komatsu HD785",
    machineCode: "MCH-002",
    companyName: "Durban Heavy Works",
    location: "Durban Yard",
    category: "Hydraulic",
    health: 62,
    status: "Warning",
    lastService: "2026-04-22",
    nextService: "2026-05-25",
  },
  {
    id: "CMP-003",
    componentName: "Front Tyres",
    machineName: "Volvo A40G",
    machineCode: "MCH-003",
    companyName: "Pretoria Infra Group",
    location: "Pretoria Site",
    category: "Tyre",
    health: 48,
    status: "Critical",
    lastService: "2026-04-10",
    nextService: "2026-05-20",
  },
  {
    id: "CMP-004",
    componentName: "Suspension Unit",
    machineName: "Liebherr T 264",
    machineCode: "MCH-004",
    companyName: "Cape Mining Ltd",
    location: "Cape Town Site",
    category: "Suspension",
    health: 74,
    status: "Warning",
    lastService: "2026-05-05",
    nextService: "2026-06-05",
  },
  {
    id: "CMP-005",
    componentName: "Cooling System",
    machineName: "CAT 740B",
    machineCode: "MCH-005",
    companyName: "Durban Heavy Works",
    location: "Richards Bay",
    category: "Cooling",
    health: 91,
    status: "Healthy",
    lastService: "2026-05-08",
    nextService: "2026-06-08",
  },
  {
    id: "CMP-006",
    componentName: "Transmission System",
    machineName: "Bell B45E",
    machineCode: "MCH-006",
    companyName: "Pretoria Infra Group",
    location: "Pretoria Site",
    category: "Transmission",
    health: 57,
    status: "Warning",
    lastService: "2026-04-18",
    nextService: "2026-05-24",
  },
];

const statusStyles: Record<ComponentStatus, string> = {
  Healthy:
    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  Warning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
  Critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const healthBarStyles = (health: number) => {
  if (health >= 80) return "bg-green-500";
  if (health >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

export default function SuperAdminComponents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ComponentStatus>(
    "All"
  );
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const filteredComponents = useMemo(() => {
    return componentsData.filter((item) => {
      const searchableText = `${item.componentName} ${item.machineName} ${item.machineCode} ${item.companyName} ${item.location} ${item.category}`.toLowerCase();

      const matchesSearch = searchableText.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredComponents.length / pageSize);

  const paginatedComponents = filteredComponents.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalComponents = componentsData.length;
  const healthyCount = componentsData.filter(
    (item) => item.status === "Healthy"
  ).length;
  const warningCount = componentsData.filter(
    (item) => item.status === "Warning"
  ).length;
  const criticalCount = componentsData.filter(
    (item) => item.status === "Critical"
  ).length;

  const averageHealth = Math.round(
    componentsData.reduce((total, item) => total + item.health, 0) /
      componentsData.length
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: "All" | ComponentStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Super Admin Monitoring
        </p>

        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          Component Monitoring
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          Monitor all company machines, component health, service dates, and
          critical component status from one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Components
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {totalComponents}
              </h2>
            </div>

            <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <Settings size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Average Health
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {averageHealth}%
              </h2>
            </div>

            <div className="rounded-xl bg-green-100 p-3 text-green-600 dark:bg-green-500/15 dark:text-green-400">
              <Activity size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Warning
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {warningCount}
              </h2>
            </div>

            <div className="rounded-xl bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Critical
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {criticalCount}
              </h2>
            </div>

            <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Components List
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {paginatedComponents.length} of{" "}
              {filteredComponents.length} components
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search component..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:w-72"
              />
            </div>

            <div className="relative">
              <Filter
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(event.target.value as "All" | ComponentStatus)
                }
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:w-44"
              >
                <option value="All">All Status</option>
                <option value="Healthy">Healthy</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              <tr>
                <th className="px-5 py-4 font-semibold">Component</th>
                <th className="px-5 py-4 font-semibold">Machine</th>
                <th className="px-5 py-4 font-semibold">Company</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Health</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Last Service</th>
                <th className="px-5 py-4 font-semibold">Next Service</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedComponents.length > 0 ? (
                paginatedComponents.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-950/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                          <Wrench size={18} />
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {item.componentName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.id} • {item.category}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={17} className="text-gray-400" />

                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {item.machineName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.machineCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.companyName}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.location}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${healthBarStyles(
                              item.health
                            )}`}
                            style={{ width: `${item.health}%` }}
                          />
                        </div>

                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {item.health}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[item.status]
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.lastService}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {item.nextService}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No components found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Previous
            </button>

            <button
              onClick={() =>
                setPage((prev) => Math.min(prev + 1, totalPages || 1))
              }
              disabled={page === totalPages || totalPages === 0}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}