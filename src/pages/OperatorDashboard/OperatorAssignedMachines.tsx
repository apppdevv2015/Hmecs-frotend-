import React, { useEffect, useMemo, useState } from "react";
import machineService from "../../services/Operator/machineService";

import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "../../redux/store";

import {
  fetchOperatorAssignments,
} from "../../redux/slices/assignedMachineSlice";
import type { AssignmentHistoryItem } from "../../redux/slices/assignedMachineSlice";

import {
  fetchMachineComponents,
} from "../../redux/slices/machineComponentSlice";
import type { MachineComponent } from "../../redux/slices/machineComponentSlice";

import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Download,
  Eye,
  Fuel,
  Heart,
  Loader2,
  RefreshCw,
  Search,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import AppSelect from "../../components/ui/dropdown/AppSelect";

type AssignmentStatus = "Active" | "Completed";

type AssignmentDetails = AssignmentHistoryItem & {
  serialNumber: string;
  modelYear: string;
  fuelType: string;
  location: string;
};

const getOverallHealth = (components: MachineComponent[]) => {
  if (!components.length) return 0;

  const total = components.reduce((sum, component) => {
    const condition = Number(component.condition || 0);
    return sum + Math.min(Math.max(condition, 0), 5) * 20;
  }, 0);

  return Math.round(total / components.length);
};

// Raw single-assignment API response ko normalize karta hai
// (ye redux se nahi, seedha machineService.getMachineAssignment se aata hai)
const normalizeAssignmentDetails = (item: any): AssignmentDetails => ({
  id: String(item?.id ?? item?.assignmentId ?? item?.assignment_id ?? ""),
  machineName: String(item?.machineName ?? item?.machine_name ?? ""),
  machineId: String(item?.machineId ?? item?.machine_id ?? ""),

  assignedOn: String(
    item?.assignedOn ??
      item?.assignedAt ??
      item?.assigned_on ??
      item?.assigned_at ??
      "",
  ),

  assignedBy: String(
    item?.assignedBy ??
      item?.assignedSupervisorName ??
      item?.assigned_by ??
      item?.assigned_supervisor_name ??
      "",
  ),

  status: item?.status === "Active" ? "Active" : "Completed",
  notes: String(item?.notes ?? ""),

  serialNumber: String(item?.serialNumber ?? item?.serial_number ?? ""),
  modelYear: String(item?.modelYear ?? item?.model_year ?? ""),
  fuelType: String(item?.fuelType ?? item?.fuel_type ?? ""),
  location: String(item?.location ?? ""),
});

const getStatusBadge = (status: AssignmentStatus) =>
  status === "Active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";

const OperatorAssignedMachines: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { currentMachine, assignmentHistory, loading, error } = useSelector(
    (state: RootState) => state.assignedMachine,
  );

  const { components } = useSelector(
    (state: RootState) => state.machineComponent,
  );

  const [selectedDetails, setSelectedDetails] =
    useState<AssignmentDetails | null>(null);
  const [viewingMachineId, setViewingMachineId] = useState<string | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredHistory = useMemo(() => {
    let result = assignmentHistory;

    if (statusFilter !== "all") {
      result = result.filter(
        (item) => item.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (item) =>
          item.machineName.toLowerCase().includes(query) ||
          item.machineId.toLowerCase().includes(query) ||
          item.assignedBy.toLowerCase().includes(query) ||
          item.notes.toLowerCase().includes(query),
      );
    }

    return result;
  }, [assignmentHistory, statusFilter, searchQuery]);

  const handleViewAssignment = async (machineId: string) => {
    if (!machineId) return;

    try {
      setViewingMachineId(machineId);

      const response = await machineService.getMachineAssignment(machineId);
      const raw = (response as any)?.data ?? response;

      setSelectedDetails(normalizeAssignmentDetails(raw));
    } catch {
      // apiCall centralized error toast already handles this
    } finally {
      setViewingMachineId(null);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchOperatorAssignments());
  };

  // Step 1: current + history dono ek hi call se aate hain
  useEffect(() => {
    dispatch(fetchOperatorAssignments());
  }, [dispatch]);

  // Step 2: current machine mil jaane ke baad uske components fetch karo
  useEffect(() => {
    if (currentMachine?.machineId) {
      dispatch(fetchMachineComponents(currentMachine.machineId));
    }
  }, [dispatch, currentMachine?.machineId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    document.body.style.overflow = selectedDetails ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedDetails]);

  const overallHealth = getOverallHealth(components);

  const totalCurrentHours = components.reduce(
    (sum, component) => sum + Number(component.currentHours || 0),
    0,
  );

  const handleExportReport = () => {
    // BACKEND TODO: GET /api/operator/assigned-machine/export (PDF/CSV)
    toast("Export will be available soon.");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 font-sans text-slate-950 dark:bg-[#07111f] dark:text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <Loader2 className="animate-spin text-blue-600" size={22} />
          <span className="text-sm font-semibold tracking-tight">
            Loading assigned machine...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
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
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
            <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />
            <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />
            <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

            <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-md">
                  <Truck size={14} />
                  My Assignment
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  My Assigned Machine
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/90">
                  View your current machine assignment, health status, and full
                  assignment history.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-fit sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportReport}
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 sm:w-fit"
                >
                  <Download size={18} strokeWidth={2.4} />
                  Export Report
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
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
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Heart size={16} />}
              title="Overall Health"
              value={`${overallHealth}%`}
            />

            <MetricCard
              icon={<Clock size={16} />}
              title="Total Hours"
              value={`${totalCurrentHours.toLocaleString("en-IN")} Hrs`}
            />

            <MetricCard
              icon={<Fuel size={16} />}
              title="Fuel Level"
              value={`${currentMachine?.fuelLevel ?? 0}%`}
            />

            <MetricCard
              icon={<Wrench size={16} />}
              title="Next Service Due"
              value={currentMachine?.nextServiceDue ?? "-"}
            />
          </div>
        </div>

        {/* Currently Assigned Machine */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              Currently Assigned Machine
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Machine currently assigned to you
            </p>
          </div>

          {currentMachine ? (
            <div className="grid grid-cols-1 gap-6 p-5 xl:grid-cols-[1.1fr_1.4fr]">
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33] sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                  <Truck size={24} strokeWidth={2.4} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                      {currentMachine.machineName}
                    </h3>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadge(
                        currentMachine.status,
                      )}`}
                    >
                      {currentMachine.status}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    <DetailItem
                      label="Serial Number"
                      value={currentMachine.serialNumber}
                      stacked
                    />
                    <DetailItem
                      label="Model Year"
                      value={currentMachine.modelYear}
                      stacked
                    />
                    <DetailItem
                      label="Fuel Type"
                      value={currentMachine.fuelType}
                      stacked
                    />
                  </dl>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Assigned On"
                  value={currentMachine.assignedOn}
                  card
                />
                <DetailItem
                  label="Assigned By"
                  value={currentMachine.assignedBy}
                  card
                />
                <DetailItem
                  label="Location"
                  value={currentMachine.location}
                  card
                />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#101f33]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Current Status
                  </p>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadge(
                      currentMachine.status,
                    )}`}
                  >
                    {currentMachine.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                No machine is currently assigned to you.
              </p>
            </div>
          )}
        </section>

        {/* Assignment History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                Assignment History
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Previous and current machines assigned to you
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={2.4}
                />
                <input
                  type="text"
                  placeholder="Search machine, notes..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
              >
                <CalendarDays size={16} />
                01 Aug 2026 - 17 Aug 2026
              </button>

              <AppSelect
                placeholder="All Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "completed", label: "Completed" },
                ]}
                className="w-full sm:w-44"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <AlertTriangle size={24} strokeWidth={2.4} />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                No assignment history found
              </h3>
              <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {searchQuery.trim()
                  ? "No results matched your search. Try a different term."
                  : "No assignment record found for this date range or filter."}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto hme-hide-scrollbar">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                    <th className="px-6 py-4 font-semibold">#</th>
                    <th className="px-6 py-4 font-semibold">Machine Name</th>
                    <th className="px-6 py-4 font-semibold">Assigned On</th>
                    <th className="px-6 py-4 font-semibold">Assigned By</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Notes</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      View
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredHistory.map((item, index) => (
                    <tr
                      key={item.id || `${item.machineId}-${index}`}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 text-sm text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {item.machineName}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {item.assignedOn}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {item.assignedBy}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadge(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {item.notes}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewAssignment(item.machineId)}
                          disabled={viewingMachineId === item.machineId}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                          title="View Assignment Details"
                        >
                          {viewingMachineId === item.machineId ? (
                            <Loader2
                              size={15}
                              strokeWidth={2.4}
                              className="animate-spin"
                            />
                          ) : (
                            <Eye size={15} strokeWidth={2.4} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredHistory.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
              <span>
                Showing 1 to {filteredHistory.length} of{" "}
                {filteredHistory.length} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-400 disabled:opacity-50 dark:border-slate-700"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white"
                >
                  1
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-slate-400 disabled:opacity-50 dark:border-slate-700"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedDetails && (
        <AssignmentDetailsModal
          item={selectedDetails}
          onClose={() => setSelectedDetails(null)}
        />
      )}
    </div>
  );
};

function MetricCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-blue-600 dark:text-blue-400">{icon}</span>
        {title}
      </p>
      <h3 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </h3>
    </div>
  );
}

function DetailItem({
  label,
  value,
  card = false,
  stacked = false,
}: {
  label: string;
  value: string;
  card?: boolean;
  stacked?: boolean;
}) {
  if (card) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#101f33]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    );
  }

  if (stacked) {
    return (
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
          {value}
        </dd>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 text-slate-500 dark:text-slate-400">
      <dt className="shrink-0 font-semibold">{label}:</dt>
      <dd className="font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function AssignmentDetailsModal({
  item,
  onClose,
}: {
  item: AssignmentDetails;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        <div className="relative flex items-center justify-between overflow-hidden border-b border-blue-600 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2563EB] p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Assignment Details
            </h2>

            <p className="mt-1 text-sm font-medium text-blue-100">
              View assignment information and history
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-86px)] overflow-y-auto p-5">
          <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#101f33]">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Status
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadge(
                item.status,
              )}`}
            >
              {item.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Machine Name" value={item.machineName} card />
            <DetailItem
              label="Serial Number"
              value={item.serialNumber || "-"}
              card
            />
            <DetailItem label="Model Year" value={item.modelYear || "-"} card />
            <DetailItem label="Fuel Type" value={item.fuelType || "-"} card />
            <DetailItem label="Location" value={item.location || "-"} card />
            <DetailItem label="Assigned On" value={item.assignedOn} card />
            <DetailItem label="Assigned By" value={item.assignedBy} card />
          </div>

          <div className="mt-3">
            <DetailItem label="Notes" value={item.notes || "-"} card />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperatorAssignedMachines;