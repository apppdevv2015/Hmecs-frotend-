import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { machineService } from "../../services/companyadmin/machineService";

type Machine = {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  assignedArtisanId?: string;
  assignedArtisanName?: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  assignedAt?: string;
  companyId?: string;
  status?: string;
  runningHours?: string | number;
  healthScore?: number;
  lastUpdated?: string;
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
};

const ROWS_PER_PAGE = 5;

const normalizeMachine = (item: any, index: number): Machine => {
  const healthScore = Number(
    item?.healthScore ??
      item?.health_score ??
      item?.health ??
      item?.conditionScore ??
      item?.condition_score ??
      0,
  );

  return {
    id: String(item?.id ?? item?._id ?? item?.machineId ?? index + 1),
    name: String(
      item?.name ?? item?.machineName ?? item?.machine_name ?? "N/A",
    ),
    model: String(
      item?.model ?? item?.machineModel ?? item?.machine_model ?? "N/A",
    ),
    serialNumber: String(
      item?.serialNumber ?? item?.serial_number ?? item?.serialNo ?? "N/A",
    ),
    equipmentType: String(
      item?.equipmentType ??
        item?.equipment_type ??
        item?.type ??
        item?.category ??
        "N/A",
    ),
    assignedOperatorId: item?.assignedOperatorId || item?.assigned_operator_id || "",
    assignedOperatorName: item?.assignedOperatorName || item?.assigned_operator_name || item?.operatorName || item?.operator_name || "",
    assignedArtisanId: item?.assignedArtisanId || item?.assigned_artisan_id || "",
    assignedArtisanName: item?.assignedArtisanName || item?.assigned_artisan_name || item?.artisanName || item?.artisan_name || "",
    assignedSupervisorId: item?.assignedSupervisorId || item?.assigned_supervisor_id || "",
    assignedSupervisorName: item?.assignedSupervisorName || item?.assigned_supervisor_name || item?.supervisorName || item?.supervisor_name || "",
    assignedAt: item?.assignedAt || item?.assigned_at || item?.createdAt || item?.created_at || "",
    companyId: item?.companyId ?? item?.company_id,
    status: String(item?.status ?? item?.machineStatus ?? "Active"),
    runningHours:
      item?.runningHours ??
      item?.running_hours ??
      item?.currentHours ??
      item?.current_hours ??
      "N/A",
    healthScore:
      Number.isFinite(healthScore) && healthScore > 0 ? healthScore : 0,
    lastUpdated: String(
      item?.lastUpdated ??
        item?.last_updated ??
        item?.updatedAt ??
        item?.updated_at ??
        "N/A",
    ),
  };
};

const getMachineArrayFromResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.data?.machines)) return response.data.machines;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.result)) return response.result;

  return [];
};

const getHealthColor = (score?: number) => {
  if (!score || score <= 0) return "bg-slate-400";
  if (score >= 75) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
};

const getStatusBadgeClass = (status?: string) => {
  const value = status?.toLowerCase() || "";

  if (
    value.includes("issue") ||
    value.includes("critical") ||
    value.includes("down")
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }

  if (value.includes("maintenance") || value.includes("warning")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
};

const OperatorMachines: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);

  const fetchMachines = async () => {
    setLoading(true);

    try {
      const response = await machineService.getMachines();
      const apiMachines = getMachineArrayFromResponse(response);

      setMachines(apiMachines.map(normalizeMachine));
    } catch (error: any) {
      console.error("Failed to fetch operator machines:", error);
      setMachines([]);
      toast.error(error?.message || "Failed to load assigned machines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  useEffect(() => {
    document.body.style.overflow = viewMachine ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [viewMachine]);

  const filteredMachines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return machines;

    return machines.filter((machine) => {
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.model.toLowerCase().includes(query) ||
        machine.serialNumber.toLowerCase().includes(query) ||
        machine.equipmentType.toLowerCase().includes(query) ||
        String(machine.status ?? "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [machines, searchQuery]);

  const activeMachines = useMemo(() => {
    return machines.filter((machine) => {
      const status = machine.status?.toLowerCase() || "";
      return (
        status.includes("active") ||
        status.includes("running") ||
        status.includes("healthy")
      );
    }).length;
  }, [machines]);

  const issueMachines = useMemo(() => {
    return machines.filter((machine) => {
      const status = machine.status?.toLowerCase() || "";
      return (
        status.includes("issue") ||
        status.includes("critical") ||
        status.includes("down") ||
        status.includes("warning")
      );
    }).length;
  }, [machines]);

  const totalPages = Math.ceil(filteredMachines.length / ROWS_PER_PAGE);

  const startItem =
    filteredMachines.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;

  const endItem = Math.min(
    currentPage * ROWS_PER_PAGE,
    filteredMachines.length,
  );

  const paginatedMachines = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredMachines.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredMachines, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <style>{`
        .hme-hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .hme-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            {/* Premium Glow Effects */}
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />

            <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />

            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

            <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

            <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              {/* Left Content */}
              <div>
  <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
    <Truck size={14} />
    Company Machines
  </div>

  <h1 className="text-3xl font-black tracking-tight text-white">
    Company Machines
  </h1>

  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
    Manage and monitor all machines across your company fleet, including
    machine status, operational performance, health, assignments, and
    real-time fleet activity from one centralized dashboard.
  </p>
</div>
              {/* Refresh Button */}
              <button
                onClick={fetchMachines}
                disabled={loading}
                className="
        inline-flex
        h-11
        w-full
        shrink-0
        items-center
        justify-center
        gap-2
        rounded-xl
        border
        border-white/15
        bg-white/10
        px-5
        text-sm
        font-bold
        text-white
        backdrop-blur-md
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:bg-white/20
        disabled:cursor-not-allowed
        disabled:opacity-60
        sm:w-fit
      "
              >
                <RefreshCw
                  size={18}
                  strokeWidth={2.4}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Assigned Machines"
              value={`${machines.length}`}
            />
            <MetricCard title="Active Machines" value={`${activeMachines}`} />
            <MetricCard title="Need Attention" value={`${issueMachines}`} />
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Machine Registry
              </h2>
            </div>

            <div className="relative w-full sm:w-80">
              <Search
                size={17}
                strokeWidth={2.4}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search machine, model, serial..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto hme-hide-scrollbar">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                  <th className="w-20 px-6 py-4 font-bold">#</th>
                  <th className="px-6 py-4 font-bold">Machine</th>
                  <th className="px-6 py-4 font-bold">Model</th>
                  <th className="px-6 py-4 font-bold">Serial Number</th>
                  <th className="px-6 py-4 font-bold">Assigned Operator</th>
                  <th className="px-6 py-4 font-bold">Assigned Artisan</th>
                  <th className="px-6 py-4 font-bold">Assigned By (Supervisor)</th>
                  <th className="px-6 py-4 font-bold">Assigned Date & Time</th>
                  <th className="px-6 py-4 font-bold">Health</th>
                  <th className="px-6 py-4 text-center font-bold">View</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          <Loader2 className="animate-spin" size={24} />
                        </div>

                        <p className="text-sm font-extrabold tracking-tight text-slate-700 dark:text-slate-300">
                          Loading assigned machines...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMachines.length > 0 ? (
                  paginatedMachines.map((machine, index) => (
                    <tr
                      key={machine.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 text-sm font-extrabold text-slate-500 dark:text-slate-400">
                        {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            <Truck size={19} strokeWidth={2.4} />
                          </div>

                          <div className="min-w-0">
                            <span className="block truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                              {machine.name}
                            </span>

                            <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {machine.equipmentType}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {machine.model}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {machine.serialNumber}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {machine.assignedOperatorName ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            {machine.assignedOperatorName}
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {machine.assignedArtisanName ? (
                          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                            {machine.assignedArtisanName}
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {machine.assignedSupervisorName ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {machine.assignedSupervisorName}
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {machine.assignedAt || (machine as any).createdAt ? (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(machine.assignedAt || (machine as any).createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-xs italic text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="w-40">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Score
                            </span>

                            <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                              {machine.healthScore
                                ? `${machine.healthScore}%`
                                : "N/A"}
                            </span>
                          </div>

                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-2 rounded-full ${getHealthColor(
                                machine.healthScore,
                              )}`}
                              style={{
                                width: `${Math.min(
                                  Math.max(machine.healthScore || 0, 0),
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setViewMachine(machine)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                          title="View Machine Details"
                        >
                          <Eye size={15} strokeWidth={2.4} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          <AlertTriangle size={24} strokeWidth={2.4} />
                        </div>

                        <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
                          No machines found
                        </h3>

                        <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                          {searchQuery.trim()
                            ? "Aapke search query ke liye koi assigned machine record nahi mila."
                            : "Abhi API se operator ke liye koi machine record nahi mila."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={filteredMachines.length}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </section>
      </div>

      {viewMachine && (
        <MachineDetailsModal
          machine={viewMachine}
          onClose={() => setViewMachine(null)}
        />
      )}
    </div>
  );
};

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
        {value}
      </h3>
    </div>
  );
}

function MachineDetailsModal({
  machine,
  onClose,
}: {
  machine: Machine;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        <div className="relative flex items-center justify-between overflow-hidden border-b border-blue-600 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2563EB] p-5">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Machine Details
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-300">
              Operator can only view assigned machine information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto p-5">
          <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33] sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <Truck size={25} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                {machine.name}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {machine.model} • {machine.serialNumber}
              </p>
            </div>

            <span
              className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${getStatusBadgeClass(
                machine.status,
              )}`}
            >
              {machine.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
  <DetailItem label="Machine Name" value={machine.name} />
  <DetailItem label="Model" value={machine.model} />
  <DetailItem label="Serial Number" value={machine.serialNumber} />
  <DetailItem label="Equipment Type" value={machine.equipmentType} />

  <DetailItem
    label="Assigned Operator"
    value={machine.assignedOperatorName || "Unassigned"}
  />

  <DetailItem
    label="Assigned Artisan"
    value={machine.assignedArtisanName || "Unassigned"}
  />

  <DetailItem
    label="Assigned By Supervisor"
    value={machine.assignedSupervisorName || "Unassigned"}
  />

  <DetailItem
    label="Status"
    value={machine.status || "N/A"}
  />

  <DetailItem
    label="Running Hours"
    value={String(machine.runningHours ?? "N/A")}
  />

  <DetailItem
    label="Health Score"
    value={machine.healthScore ? `${machine.healthScore}%` : "N/A"}
  />

  <DetailItem
    label="Last Updated"
    value={machine.lastUpdated || "N/A"}
  />
</div>


          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
              View-only access
            </p>

            <p className="mt-1 text-sm font-medium leading-6 text-blue-700/80 dark:text-blue-200/80">
              Operator role can monitor machine records and status only. Machine
              creation, update and deletion actions are restricted.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        Showing {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          disabled={currentPage === 1}
          onClick={onPrev}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#12243b]"
        >
          Previous
        </button>

        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={onNext}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-[#12243b]"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type DetailItemProps = {
  label: string;
  value: string;
};

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
};

export default OperatorMachines;
