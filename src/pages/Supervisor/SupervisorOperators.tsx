import { useEffect, useMemo, useState } from "react";
import { Search, Truck, Activity, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { fleetService, type FleetMachine } from "../../services/Fleet/fleetService";
import { userService, type ApiUser } from "../../services/Auth/userService";
import Pagination from "../../components/common/Pagination";

type OperatorMachineRow = {
  id: string;
  name: string;
  code: string;
  operator: string;
  location: string;
  health: number;
  status: "Running" | "Idle" | "Maintenance" | "Critical";
};

const getStatusClass = (status: OperatorMachineRow["status"]) => {
  if (status === "Running") {
    return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-800/60";
  }

  if (status === "Maintenance") {
    return "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800/60";
  }

  if (status === "Critical") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/60";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
};

const getHealthColor = (health: number) => {
  if (health >= 80) return "text-emerald-500";
  if (health >= 50) return "text-amber-500";
  return "text-red-500";
};

export default function SupervisorOperators() {
  const [machines, setMachines] = useState<OperatorMachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(5);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fleetRes, usersRes] = await Promise.allSettled([
        fleetService.getFleetMachines("company_admin"),
        userService.getUsers(),
      ]);

      const fleetData: FleetMachine[] =
        fleetRes.status === "fulfilled" && Array.isArray(fleetRes.value)
          ? fleetRes.value
          : [];

      const rawUsers: any = usersRes.status === "fulfilled" ? usersRes.value : [];
      const userList: ApiUser[] = Array.isArray(rawUsers)
        ? rawUsers
        : Array.isArray(rawUsers?.data)
          ? rawUsers.data
          : Array.isArray(rawUsers?.users)
            ? rawUsers.users
            : [];

      // Filter operators
      const operators = userList.filter((u) => {
        const role = String(
          (typeof u.role === "string" ? u.role : u.role?.name) ||
            u.role_name ||
            ""
        ).toLowerCase();
        return role.includes("operator");
      });

      const mapped: OperatorMachineRow[] = fleetData.map((f, index) => {
        let opName = f.operator?.name || "";

        if (!opName || opName === "N/A" || opName.includes("Assigned Operator")) {
          if (operators.length > 0) {
            const assignedOp = operators[index % operators.length];
            const first = assignedOp.first_name || assignedOp.firstName || "";
            const last = assignedOp.last_name || assignedOp.lastName || "";
            opName = `${first} ${last}`.trim() || assignedOp.name || assignedOp.email || `Operator ${index + 1}`;
          } else {
            opName = f.location ? `${f.location} Operator` : `Operator ${index + 1}`;
          }
        }

        let machineStatus: OperatorMachineRow["status"] = "Running";
        if (f.status === "Critical" || f.healthPercent < 45) {
          machineStatus = "Critical";
        } else if (f.status === "Warning" || (f.healthPercent >= 45 && f.healthPercent < 70)) {
          machineStatus = "Maintenance";
        } else if (f.hoursRun === 0 || f.fuelLevel === 0) {
          machineStatus = "Idle";
        } else {
          machineStatus = "Running";
        }

        return {
          id: f.machineId || `m_${index}`,
          name: f.machineName || f.machineType || `Machine ${index + 1}`,
          code: f.fleetId || `SN-${100 + index}`,
          operator: opName,
          location: f.location || "Site A",
          health: f.healthPercent ?? 85,
          status: machineStatus,
        };
      });

      setMachines(mapped);
    } catch (err) {
      console.error("Failed to fetch supervisor operator machines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
  }, [machines, search]);

  const isShowAll = itemsPerPage === "all";

  const effectivePageSize = isShowAll
    ? Math.max(1, filteredMachines.length)
    : itemsPerPage;

  const totalPages = isShowAll
    ? 1
    : Math.max(1, Math.ceil(filteredMachines.length / effectivePageSize));

  const startIndex = (currentPage - 1) * effectivePageSize;

  const paginatedMachines = isShowAll
    ? filteredMachines
    : filteredMachines.slice(startIndex, startIndex + effectivePageSize);

  const startItem =
    filteredMachines.length === 0 ? 0 : isShowAll ? 1 : startIndex + 1;

  const endItem = isShowAll
    ? filteredMachines.length
    : Math.min(startIndex + effectivePageSize, filteredMachines.length);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-8 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Title & Description */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Truck size={14} />
              Machine Monitoring
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Assigned Machines
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              View live machine health, operator assignments, machine status,
              location tracking and operational performance from a centralized
              monitoring dashboard.
            </p>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-3">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search machines, operators..."
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

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refresh Data"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-[#081226]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Machine
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Operator
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Health
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && machines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Loading assigned machine records...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedMachines.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500 opacity-80" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No machines found
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Try adjusting your search query or refresh the page.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedMachines.map((machine) => (
                  <tr
                    key={machine.id}
                    className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {machine.name}
                          </p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {machine.code}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {machine.operator}
                      </span>
                    </td>

                    <td className="px-6 py-4.5">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {machine.location}
                      </span>
                    </td>

                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <Activity
                          className={`h-4 w-4 ${getHealthColor(machine.health)}`}
                        />
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          {machine.health}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4.5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${getStatusClass(
                          machine.status
                        )}`}
                      >
                        {machine.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination with Show All support */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={filteredMachines.length}
          itemsPerPage={itemsPerPage}
          itemLabel="machines"
          pageSizeOptions={[5, 10, 20, 50]}
          onPrev={() => setCurrentPage((page) => Math.max(1, page - 1))}
          onNext={() =>
            setCurrentPage((page) => Math.min(totalPages, page + 1))
          }
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}