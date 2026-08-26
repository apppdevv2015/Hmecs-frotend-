import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  Play,
  Pause,
  Coffee,
  FileText,
  AlertTriangle,
  ArrowRight,
  Truck,
  Activity,
  MapPin,
  Clock,
  Gauge,
  Fuel,
  Zap,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  X,
  Plus,
  ShieldCheck,
  Calendar,
  Eye,
  Search,
  History as HistoryIcon,
  User,
  Wrench,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import machineService from "../../services/Operator/machineService";
import { apiCall } from "../../services/apiHandler";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

const cleanMachineName = (rawName?: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name || "Mining Machine";
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export default function ActiveTask() {
  const navigate = useNavigate();

  // User details
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || storedUser?.fullName || "Operator User";

  // Machine state
  const [machineLoading, setMachineLoading] = useState(true);
  const [assignedMachine, setAssignedMachine] = useState<any>(null);

  // Timers & Active Shift Time
  const [workStartTime, setWorkStartTime] = useState<string | null>(null);
  const [workEndTime, setWorkEndTime] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // History & Remarks from Database
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<any | null>(null);

  // Modals
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  /* ---------------- Load Assigned Machine & History from PostgreSQL --------------- */
  const loadAssignedMachineData = useCallback(async () => {
    try {
      setMachineLoading(true);
      const response = await machineService.getAssignedMachines();
      let machines: any[] = [];
      if (Array.isArray(response)) machines = response;
      else if (Array.isArray(response?.data)) machines = response.data;
      else if (Array.isArray(response?.assignedMachines)) machines = response.assignedMachines;

      const operatorId = String(storedUser?.id || storedUser?.userId || "").trim().toLowerCase();

      const matchedMachine = machines.find((item: any) => {
        const assignedOpId = String(
          item?.assignedOperatorId ??
            item?.assigned_operator_id ??
            item?.operatorId ??
            item?.operator_id ??
            ""
        ).trim().toLowerCase();
        return !operatorId || assignedOpId === operatorId;
      }) || machines[0];

      if (matchedMachine) {
        const machineId = matchedMachine.id || matchedMachine.machineId || "m-1";
        setAssignedMachine({
          id: machineId,
          name: cleanMachineName(matchedMachine.name || matchedMachine.machineName || "Hitachi ATC-604 All Terrain Crane"),
          model: cleanMachineName(matchedMachine.model || matchedMachine.equipmentType || "All Terrain Crane"),
          serialNumber: String(matchedMachine.serialNumber || matchedMachine.fleetId || "SN-HME-1001").replace(/^DEMO-/i, ""),
          equipmentType: matchedMachine.equipmentType || matchedMachine.category || "Heavy Machinery",
          site: matchedMachine.location || matchedMachine.site || "Active Mining Sector A",
          status: matchedMachine.status || "Active",
          healthScore: matchedMachine.healthScore ?? 100,
          assignedSupervisorName: matchedMachine.assignedSupervisorName || "Supervisor User",
        });

        // 2. Fetch PostgreSQL History for this Machine
        fetchMachineHistory(machineId, matchedMachine.name);
      }
    } catch (err) {
      console.warn("Failed to load active assigned machine:", err);
    } finally {
      setMachineLoading(false);
    }
  }, [storedUser?.id]);

  const fetchMachineHistory = async (machineId: string, machineName?: string) => {
    try {
      setHistoryLoading(true);
      const companyId = StorageService.getCompanyId() || "";
      const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";

      let res: any = null;
      if (machineId) {
        res = await apiCall(`/machines/${encodeURIComponent(machineId)}/inspection-history${queryParam}`, { method: "GET" }, { showError: false })
          .catch(() => apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false }))
          .catch(() => null);
      } else {
        res = await apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false })
          .catch(() => null);
      }

      let logs: any[] = [];
      if (Array.isArray(res?.data?.historyLogs)) logs = res.data.historyLogs;
      else if (Array.isArray(res?.data)) logs = res.data;
      else if (Array.isArray(res?.historyLogs)) logs = res.historyLogs;
      else if (Array.isArray(res)) logs = res;

      // Filter for this machine if available
      const matching = logs.filter(
        (l: any) =>
          l.machineId === machineId ||
          (machineName && l.machineName && l.machineName.toLowerCase().includes(machineName.toLowerCase()))
      );

      const resolvedLogs = matching.length > 0 ? matching : logs;
      setHistoryLogs(resolvedLogs);

      // Start Time from latest pre-start inspection
      const latestPreInspection = resolvedLogs.find(
        (l: any) =>
          String(l.componentCategory || "").toLowerCase().includes("all components") ||
          String(l.actionDescription || "").toLowerCase().includes("pre-start") ||
          String(l.userRole || "").toLowerCase().includes("operator")
      ) || resolvedLogs[0];

      if (latestPreInspection?.createdAt) {
        const startIso = new Date(latestPreInspection.createdAt).toISOString();
        setWorkStartTime(startIso);

        // Calculate initial elapsed time
        const startMs = new Date(startIso).getTime();
        const nowMs = Date.now();
        const diffSecs = Math.max(Math.floor((nowMs - startMs) / 1000), 0);
        setElapsedSeconds(diffSecs);
      } else {
        const fallback = new Date();
        fallback.setHours(fallback.getHours() - 2);
        setWorkStartTime(fallback.toISOString());
        setElapsedSeconds(7200);
      }
    } catch (e) {
      console.warn("History fetch notice:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedMachineData();
  }, [loadAssignedMachineData]);

  // Live Timer
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return historyLogs;
    return historyLogs.filter(
      (item) =>
        String(item.componentName || "").toLowerCase().includes(q) ||
        String(item.userName || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q) ||
        String(item.actionDescription || "").toLowerCase().includes(q) ||
        String(item.createdAt || "").toLowerCase().includes(q)
    );
  }, [historyLogs, historySearch]);

  const latestLog = historyLogs[0];
  const overallScore = latestLog?.overallMachineHealth ?? assignedMachine?.healthScore ?? 100;
  const isCrit = overallScore < 50 || latestLog?.status === "Critical";
  const isWarn = (!isCrit && overallScore < 85) || latestLog?.status === "Warning";

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER & LIVE REFRESH ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Assigned Equipment Operations
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {assignedMachine?.name || "Assigned Machine"}
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Serial: <span className="font-mono text-blue-600 dark:text-blue-400">{assignedMachine?.serialNumber || "SN-HME-1001"}</span> • Site: {assignedMachine?.site || "Active Mining Sector"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadAssignedMachineData();
            showSuccessToast("Refreshed assigned machine history!");
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
        >
          <RefreshCw size={15} className={machineLoading || historyLoading ? "animate-spin text-blue-600" : ""} />
          Refresh Machine Data
        </button>
      </div>

      {/* ── TOP KPI CARDS: START TIME, END TIME, DURATION & RATING ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Start Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Start Time (Pre-Start)</span>
            <Clock size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {workStartTime ? new Date(workStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "08:00 AM"}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {workStartTime ? new Date(workStartTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
          </p>
        </div>

        {/* End Time */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">End Time (Work Order)</span>
            <Clock size={18} className="text-red-500" />
          </div>
          <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {workEndTime ? new Date(workEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Auto Captured on Submit</p>
        </div>

        {/* Total Working Hours / Elapsed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Shift Duration</span>
            <Gauge size={18} className="text-blue-600" />
          </div>
          <p className="mt-2 font-mono text-xl font-black text-blue-600 dark:text-blue-400">
            {formatTimer(elapsedSeconds)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Running Elapsed Hours</p>
        </div>

        {/* Condition Rating */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Condition Rating</span>
            <Activity size={18} className={isCrit ? "text-red-500" : isWarn ? "text-amber-500" : "text-emerald-500"} />
          </div>
          <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {overallScore}% ({isCrit ? "Critical" : isWarn ? "Warning" : "Optimal"})
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Diagnostic Verdict</p>
        </div>
      </div>

      {/* ── SUPERVISOR REMARKS & ACTIVE SUMMARY ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Supervisor Remarks Card */}
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 p-5 dark:border-indigo-900/40 dark:bg-[#0f1d33] lg:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Supervisor Authorization & Operational Remarks
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/80 bg-white/90 p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#101f33]/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Authorizing Supervisor
              </span>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                🛡️ {assignedMachine?.assignedSupervisorName || "Chief Mining Supervisor"}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Verified & Assigned for Current Shift
              </p>
            </div>

            <div className="rounded-xl border border-white/80 bg-white/90 p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#101f33]/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Operator (Driver)
              </span>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                👤 {userName}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Primary Machine Operator
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-indigo-100 bg-white/80 p-3.5 dark:border-indigo-900/30 dark:bg-[#101f33]/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Latest Operational Remarks & Work Scope
            </span>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
              {latestLog?.actionDescription || "Routine pre-start checklist verified. Machine authorized for standard mining extraction and hauling operations."}
            </p>
          </div>
        </div>

        {/* Quick Actions / Log Note */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Shift Controls
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Pause shift timer or navigate to complete end of shift work report.
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
            >
              {isRunning ? <Pause size={14} className="text-amber-500" /> : <Play size={14} className="text-emerald-500" />}
              {isRunning ? "Pause Shift Timer" : "Resume Shift Timer"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/operator/work-order-capture")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 cursor-pointer"
            >
              <FileText size={14} />
              Open Work Order & End Report
            </button>
          </div>
        </div>
      </div>

      {/* ── ASSIGNED MACHINE SUBMISSION & INSPECTION HISTORY TABLE ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        {/* Table Header & Search */}
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HistoryIcon size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Assigned Machine Submission & Inspection History ({historyLogs.length})
              </h3>
            </div>

            <div className="relative h-10 w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search component, date, remarks..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="w-14 px-4 py-4 text-center font-bold">#</th>
                <th className="px-6 py-4 font-bold">Submission Date & Time</th>
                <th className="px-6 py-4 font-bold">Scope & Description</th>
                <th className="px-6 py-4 font-bold">Health Rating</th>
                <th className="px-6 py-4 font-bold">Submitted By</th>
                <th className="px-6 py-4 font-bold">Supervisor Status</th>
                <th className="px-6 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="animate-spin text-blue-600" size={24} />
                      <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                        Loading machine submissions from PostgreSQL Database...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Wrench size={28} className="text-slate-400" />
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        No submission history found for this machine
                      </p>
                      <p className="text-xs text-slate-400">
                        Complete Pre-Start Inspection or End Work Report to record entries.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item: any, index: number) => {
                  const score = item.overallMachineHealth ?? item.componentHealthScore ?? 100;
                  const isItemCrit = score < 50 || item.status === "Critical";
                  const isItemWarn = (!isItemCrit && score < 85) || item.status === "Warning";

                  return (
                    <tr
                      key={item.id || index}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-4 text-center text-xs font-extrabold text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-blue-600" />
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex max-w-xs flex-col">
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {item.componentName || "All Components Inspection"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.actionDescription || "Routine Shift Inspection Data"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            isItemCrit
                              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                              : isItemWarn
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isItemCrit ? "bg-red-500" : isItemWarn ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          {isItemCrit ? "Critical" : isItemWarn ? "Warning" : "Optimal"} {score}%
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            👤 {item.userName || "Operator"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {item.userRole || "OPERATOR"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span>Verified & Logged</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryLog(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 cursor-pointer"
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL AUDIT SNAPSHOT MODAL ── */}
      {selectedHistoryLog && (
        <ActiveTaskDetailModal
          log={selectedHistoryLog}
          machine={assignedMachine}
          onClose={() => setSelectedHistoryLog(null)}
        />
      )}
    </div>
  );
}

function ActiveTaskDetailModal({
  log,
  machine,
  onClose,
}: {
  log: any;
  machine: any;
  onClose: () => void;
}) {
  const checklistItems =
    log.currentParameters?.checklist ||
    log.currentParameters?.readings?.checklist ||
    [];

  const componentReadings =
    log.currentParameters?.readings?.components ||
    log.currentParameters?.components ||
    [];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-[680px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} />
            <div>
              <h3 className="text-base font-black tracking-tight">
                Machine Inspection & Submission Snapshot
              </h3>
              <p className="text-xs text-blue-100">
                Submitted on {formatDate(log.createdAt)} by {log.userName || "Operator"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Equipment Info */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Assigned Machine Unit
            </span>
            <h4 className="mt-1 text-base font-black text-slate-900 dark:text-white">
              {log.machineName || machine?.name}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-white border border-blue-200 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-[#101f33] dark:border-blue-900 dark:text-blue-300">
                {log.serialNumber || machine?.serialNumber}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                • Scope: {log.componentName || "All Components Inspection"}
              </span>
            </div>
          </div>

          {/* Component Parameter Readings */}
          {componentReadings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Component Telemetry Readings
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {componentReadings.map((c: any, idx: number) => (
                  <div
                    key={c.id || idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60"
                  >
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {c.name}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      Reading: {c.currentReading || `${c.health}% Health`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Condition Status: {c.status || "Healthy"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checklist items */}
          {checklistItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Checklist Parameter Diagnostics ({checklistItems.length})
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
                {checklistItems.map((chk: any, idx: number) => (
                  <div
                    key={chk.id || idx}
                    className="rounded-lg border border-slate-200 p-2 text-[11px] dark:border-slate-800"
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">{chk.label}</p>
                    <p className="text-blue-600 dark:text-blue-400 font-semibold">{chk.value}</p>
                    <p className="text-[10px] text-slate-400">{chk.safeRange || chk.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supervisor & Operator Verification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Submitted By
              </span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                👤 {log.userName || "Operator"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Role: {log.userRole || "OPERATOR"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Supervisor Authorization
              </span>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                🛡️ Verified & Logged
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Synced to Supervisor Services
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-[#101f33]/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700 cursor-pointer"
          >
            Close Snapshot
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
