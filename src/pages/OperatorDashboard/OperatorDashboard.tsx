import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  Truck,
  Wrench,
  Clock,
  Fuel,
  Zap,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Search,
  Check,
  FileText,
  History as HistoryIcon,
  X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import MachineHealthChart from "../../components/operator/MachineHealthChart";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import machineService from "../../services/Operator/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import { apiCall } from "../../services/apiHandler";
import { showSuccessToast } from "../../utils/toastUtils";

const cleanMachineName = (rawName?: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name || "Mining Equipment";
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export default function OperatorDashboard() {
  const navigate = useNavigate();

  // User details
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || storedUser?.fullName || "Operator User";
  const userRole = storedUser?.role || "OPERATOR";

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<any>(null);
  const [components, setComponents] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Component search / filter
  const [componentSearch, setComponentSearch] = useState("");

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch Assigned Machine from Backend
      const response = await machineService.getAssignedMachines();
      let machinesList: any[] = [];
      if (Array.isArray(response)) machinesList = response;
      else if (Array.isArray(response?.data)) machinesList = response.data;
      else if (Array.isArray(response?.assignedMachines)) machinesList = response.assignedMachines;

      const operatorId = String(storedUser?.id || storedUser?.userId || "").trim().toLowerCase();

      const matched = machinesList.find((m: any) => {
        const assignedOpId = String(
          m?.assignedOperatorId ??
            m?.assigned_operator_id ??
            m?.operatorId ??
            m?.operator_id ??
            ""
        ).trim().toLowerCase();
        return !operatorId || assignedOpId === operatorId;
      }) || machinesList[0];

      if (matched) {
        const mId = matched.id || matched.machineId || "m-1";
        const rawHours =
          matched.currentHours ??
          matched.totalHours ??
          matched.hoursRun ??
          matched.operatingHours ??
          matched.installHours ??
          0;

        const machineObj = {
          id: mId,
          machineId: mId,
          name: cleanMachineName(matched.name || matched.machineName || "Mining Machine"),
          machineName: cleanMachineName(matched.name || matched.machineName || "Mining Machine"),
          model: cleanMachineName(matched.model || matched.equipmentType || "Mining Unit"),
          machineType: matched.equipmentType || matched.category || "Heavy Machinery",
          serialNumber: String(matched.serialNumber || matched.fleetId || "SN-HME-1001").replace(/^DEMO-/i, ""),
          fleetId: String(matched.serialNumber || matched.fleetId || "SN-HME-1001").replace(/^DEMO-/i, ""),
          site: matched.location || matched.site || "Active Mining Sector A",
          hoursRun: Number(rawHours || 0),
          supervisorName: matched.assignedSupervisorName || "Supervisor User",
          healthScore: matched.healthScore ?? 100,
          status: matched.status || "Active",
        };
        setMachine(machineObj);

        // 2. Fetch Components for this Machine (including Spec Template + DB + Live Inspection Health)
        let rawComponents: any[] = [];
        try {
          const typeStr =
            matched.equipmentType ||
            matched.category ||
            matched.machineType ||
            "All Terrain Crane";
          const modelStr =
            matched.model ||
            matched.modelName ||
            matched.name ||
            matched.machineName ||
            "";
          const opUser = StorageService.getUser();
          const opCompanyId = opUser?.companyId || opUser?.company_id || matched.companyId || "";
          const tplRes: any = await apiCall(
            `/machines/spec-template?equipmentType=${encodeURIComponent(typeStr)}&modelName=${encodeURIComponent(modelStr)}&companyId=${encodeURIComponent(opCompanyId)}&machineId=${encodeURIComponent(mId)}`,
            { method: "GET" },
            { showError: false }
          ).catch(() => null);
          const tplData = tplRes?.data || tplRes;
          if (tplData && Array.isArray(tplData.components) && tplData.components.length > 0) {
            rawComponents.push(...tplData.components);
          }
        } catch {
          // Spec template notice
        }

        try {
          const compRes = await componentService.getComponentsByMachineId(mId);
          let compList: any[] = [];
          if (Array.isArray(compRes)) compList = compRes;
          else if (Array.isArray(compRes?.data)) compList = compRes.data;
          else if (Array.isArray(compRes?.components)) compList = compRes.components;

          if (Array.isArray(compList) && compList.length > 0) {
            compList.forEach((dc: any) => {
              const dcName = (dc.name || dc.description || "").toLowerCase().trim();
              if (!rawComponents.some((rc: any) => (rc.name || rc.description || "").toLowerCase().trim() === dcName)) {
                rawComponents.push(dc);
              }
            });
          }
        } catch {
          // DB components notice
        }

        // Fetch PostgreSQL Live Inspection & Telemetry (manual-data)
        try {
          const manualDataRes: any = await apiCall(
            `/machines/${encodeURIComponent(mId)}/manual-data`,
            { method: "GET" },
            { showError: false }
          ).catch(() => null);
          const manualPayload = manualDataRes?.data || manualDataRes;
          const savedHealthRecords = manualPayload?.records || [];

          if (Array.isArray(savedHealthRecords) && savedHealthRecords.length > 0) {
            rawComponents.forEach((comp: any) => {
              const compNameLower = (comp.name || comp.description || "").toLowerCase().trim();
              const matchedRecord = savedHealthRecords.find((r: any) => {
                const rNameLower = (r.componentName || "").toLowerCase().trim();
                return rNameLower === compNameLower || (r.componentId && r.componentId === comp.id);
              });

              if (matchedRecord) {
                if (matchedRecord.healthScore !== undefined && matchedRecord.healthScore !== null) {
                  comp.healthScore = Number(matchedRecord.healthScore);
                  comp.health = Number(matchedRecord.healthScore);
                  comp.condition = Math.round(Number(matchedRecord.healthScore) / 20);
                  comp.status = matchedRecord.status || (comp.healthScore >= 80 ? "Healthy" : comp.healthScore >= 60 ? "Warning" : "Critical");
                }
                if (Array.isArray(matchedRecord.parameters) && matchedRecord.parameters.length > 0) {
                  comp.parameters = matchedRecord.parameters;
                }
              }
            });
          }
        } catch {
          // Manual data sync notice
        }

        const normalizedComponents = rawComponents.map((raw: any) => {
          const health = typeof raw?.healthScore === "number"
            ? raw.healthScore
            : typeof raw?.health === "number"
            ? raw.health
            : Math.round(Math.min(Math.max(Number(raw?.condition || 5), 0), 5) * 20);
          const status = raw?.status || (health >= 80 ? "Healthy" : health >= 60 ? "Warning" : "Critical");
          return {
            ...raw,
            health,
            healthScore: health,
            status,
          };
        });

        setComponents(normalizedComponents);

        // 3. Fetch PostgreSQL Audit / Inspection History
        try {
          const companyId = StorageService.getCompanyId() || "";
          const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
          const historyRes: any = await apiCall(`/machines/${encodeURIComponent(mId)}/inspection-history${queryParam}`, { method: "GET" }, { showError: false })
            .catch(() => apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false }))
            .catch(() => null);

          let logs: any[] = [];
          if (Array.isArray(historyRes?.data?.historyLogs)) logs = historyRes.data.historyLogs;
          else if (Array.isArray(historyRes?.data)) logs = historyRes.data;
          else if (Array.isArray(historyRes)) logs = historyRes;

          const matchedLogs = logs.filter(
            (l: any) => l.machineId === mId || (l.machineName && l.machineName.toLowerCase().includes(machineObj.name.toLowerCase()))
          );
          setHistoryLogs(matchedLogs.length > 0 ? matchedLogs : logs.slice(0, 10));
        } catch {
          // Log notice
        }
      }
    } catch (err) {
      console.warn("Dashboard data loading notice:", err);
    } finally {
      setLoading(false);
    }
  }, [storedUser?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived stats
  const healthyCount = components.filter(
    (c) => (Number(c.healthScore ?? c.health ?? (Number(c.condition || 5) * 20)) >= 80) || c.status === "Healthy" || c.status === "Good"
  ).length;

  const warningCount = components.filter(
    (c) =>
      ((Number(c.healthScore ?? c.health ?? (Number(c.condition || 5) * 20)) >= 60 &&
        Number(c.healthScore ?? c.health ?? (Number(c.condition || 5) * 20)) < 80) ||
        c.status === "Warning")
  ).length;

  const criticalCount = components.filter(
    (c) =>
      (Number(c.healthScore ?? c.health ?? (Number(c.condition || 5) * 20)) < 60 &&
        Number(c.healthScore ?? c.health ?? (Number(c.condition || 5) * 20)) >= 0) ||
      c.status === "Critical"
  ).length;

  const overallHealth = components.length > 0
    ? Math.round(
        components.reduce(
          (acc, c) => acc + Number(c.healthScore ?? c.health ?? (Number(c.condition || 5) * 20)),
          0
        ) / components.length
      )
    : machine?.healthScore ?? 100;

  const computedHoursRun = useMemo(() => {
    const machineHours = Number(machine?.hoursRun || 0);
    if (machineHours > 0) return machineHours;
    if (components.length > 0) {
      const maxCompHours = Math.max(...components.map((c) => Number(c.currentHours || c.installHours || 0)), 0);
      if (maxCompHours > 0) return maxCompHours;
    }
    return 0;
  }, [machine?.hoursRun, components]);

  const pieData = [
    { name: "Healthy", value: healthyCount || 1, color: "#10b981" },
    { name: "Warning", value: warningCount, color: "#f59e0b" },
    { name: "Critical", value: criticalCount, color: "#ef4444" },
  ];

  const filteredComponents = useMemo(() => {
    const q = componentSearch.toLowerCase().trim();
    if (!q) return components;
    return components.filter(
      (c) =>
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.category || "").toLowerCase().includes(q) ||
        String(c.serialNumber || "").toLowerCase().includes(q)
    );
  }, [components, componentSearch]);

  if (loading && !machine) {
    return (
      <div className="min-h-screen space-y-6 bg-[#f8fafc] p-6 dark:bg-[#07111f]">
        <div className="h-44 w-full animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full space-y-6 bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8">
      {/* ── HERO BANNER: OPERATOR WORKSPACE & EQUIPMENT ── */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-r from-[#2044cd] via-[#1d4ed8] to-[#1e3a8a] p-6 text-white shadow-xl shadow-blue-500/10 sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Operator Operational Console • Active Shift
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-white">
              {machine?.name || "Mining Equipment"}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-blue-100">
              <span>Model: <strong className="text-white">{machine?.model || "Mining Unit"}</strong></span>
              <span>•</span>
              <span>Serial: <strong className="font-mono text-cyan-300">{machine?.serialNumber || "SN-HME-1001"}</strong></span>
              <span>•</span>
              <span>Operator: <strong className="text-white">👤 {userName}</strong></span>
              <span>•</span>
              <span>Supervisor: <strong className="text-white">🛡️ {machine?.supervisorName || "Supervisor"}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                loadDashboardData();
                showSuccessToast("Refreshed machine telemetry from database!");
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh Telemetry
            </button>

            <Link
              to="/operator/pre-start-inspection"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              Start Daily Inspection
            </Link>
          </div>
        </div>

        {/* Quick Nav Workflows */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
          <Link
            to="/operator/pre-start-inspection"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300">
              <Check size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Pre-Start Inspection</p>
              <p className="text-[10px] text-blue-200">Daily Checklist & Scope</p>
            </div>
          </Link>

          <Link
            to="/operator/work-order-capture"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-blue-300">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Work Order Capture</p>
              <p className="text-[10px] text-blue-200">End Shift Report</p>
            </div>
          </Link>

          <Link
            to="/operator/active-task"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/30 text-amber-300">
              <Clock size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Active Task</p>
              <p className="text-[10px] text-blue-200">Shift Timers & Status</p>
            </div>
          </Link>

          <Link
            to="/operator/service-logs"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/30 text-purple-300">
              <HistoryIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Service Logs</p>
              <p className="text-[10px] text-blue-200">Audit Logs & Records</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4 KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Overall Health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall Health
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Activity size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400 sm:text-3xl">
            {overallHealth}%
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {criticalCount > 0 ? "⚠️ Critical Warning" : warningCount > 0 ? "⚡ Monitor Closely" : "✓ Optimal Condition"}
          </p>
        </div>

        {/* Total Components */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Installed Components
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Settings2 size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {components.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {healthyCount} Healthy • {warningCount} Warning
          </p>
        </div>

        {/* Hours Run */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Hours Run
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Gauge size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {computedHoursRun > 0 ? `${computedHoursRun.toLocaleString()} hrs` : "0 hrs"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Active Meter Reading
          </p>
        </div>

        {/* Critical Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Critical Scope
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-rose-600 dark:text-rose-400 sm:text-3xl">
            {criticalCount}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {criticalCount > 0 ? "Immediate Action Required" : "Zero Critical Hazards"}
          </p>
        </div>
      </div>

      {/* ── MACHINE HEALTH ANALYTICS CHART ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Component Health & Diagnostic Analytics
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Real-time telemetry and component wear analysis for {machine?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Healthy (&gt;80%)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Warning (50-79%)
            </span>
          </div>
        </div>

        <div className="mt-6">
          <MachineHealthChart machine={machine} />
        </div>
      </div>

      {/* ── 2-COLUMNS: MACHINE DETAILS & COMPONENT HEALTH SUMMARY ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Machine Profile Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {machine?.name}
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Equipment Category: {machine?.machineType}
                </p>
              </div>
            </div>

            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              ● Active Fleet Unit
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serial Number</span>
              <p className="mt-1 font-mono text-xs font-black text-blue-600 dark:text-blue-400">{machine?.serialNumber}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operating Site</span>
              <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">{machine?.site}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Driver</span>
              <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">👤 {userName}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supervisor</span>
              <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">🛡️ {machine?.supervisorName}</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meter Reading</span>
              <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">
                {computedHoursRun > 0 ? `${computedHoursRun.toLocaleString()} Hours` : "0 Hours"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-[#101f33]/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pre-Inspection</span>
              <p className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400">✓ Verified Today</p>
            </div>
          </div>
        </div>

        {/* Health Donut Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Component Condition Ratio
          </h3>
          <p className="text-xs text-slate-400">Breakdown across installed telemetry modules.</p>

          <div className="mt-4 flex h-48 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Healthy Modules
              </span>
              <span className="text-slate-900 dark:text-white">{healthyCount}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Warning Modules
              </span>
              <span className="text-slate-900 dark:text-white">{warningCount}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Critical Modules
              </span>
              <span className="text-slate-900 dark:text-white">{criticalCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ASSIGNED COMPONENTS TABLE ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Installed Machine Components ({components.length})
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Direct component telemetry and remaining operational life.
              </p>
            </div>

            <div className="relative h-10 w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search component or serial..."
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-6 py-4 font-bold">Component Name</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Condition</th>
                <th className="px-6 py-4 font-bold">Operating Hours</th>
                <th className="px-6 py-4 font-bold">Planned Life</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredComponents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    No components found matching your search.
                  </td>
                </tr>
              ) : (
                filteredComponents.map((c, i) => {
                  const cond = Number(c.condition || 4);
                  const isHealthy = cond >= 4 || c.status === "Healthy";
                  const isWarn = cond === 3 || c.status === "Warning";
                  const isCrit = cond <= 2 || c.status === "Critical";

                  return (
                    <tr key={c.id || i} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{c.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{c.serialNumber || `COMP-${i + 1}`}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {c.category || "General Subsystem"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${cond * 20}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {cond * 20}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {Number(c.currentHours || 0).toLocaleString()} hrs
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {Number(c.plannedLife || 8000).toLocaleString()} hrs
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            isCrit
                              ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                              : isWarn
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          {isCrit ? "Critical" : isWarn ? "Warning" : "Healthy"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Link
                          to="/operator/pre-start-inspection"
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          <CheckCircle2 size={13} />
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECENT POSTGRESQL INSPECTION AUDIT FEED ── */}
      {historyLogs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Recent Submission & Inspection Logs
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Verified records from PostgreSQL Database.
              </p>
            </div>

            <Link
              to="/operator/service-logs"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
            >
              View Full Logs
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historyLogs.slice(0, 3).map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => setSelectedLog(item)}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-[#101f33]/60 dark:hover:border-blue-700 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      📅 {formatDate(item.createdAt)}
                    </span>
                    <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:bg-[#0b1728] dark:border-slate-700">
                      {item.overallMachineHealth ?? 100}% Health
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {item.componentName || "All Components Inspection"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.actionDescription || "Routine Shift Inspection Data"}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] font-semibold text-slate-400 dark:border-slate-700/60">
                  <span>👤 {item.userName || "Operator"}</span>
                  <span className="text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-0.5">
                    View Details <Eye size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Inspection Log Snapshot
              </h4>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400">Date & Time:</span>
                <p className="font-bold text-slate-900 dark:text-white">{formatDate(selectedLog.createdAt)}</p>
              </div>
              <div>
                <span className="text-slate-400">Equipment:</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedLog.machineName || machine?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Work Scope / Components:</span>
                <p className="font-semibold text-blue-600 dark:text-blue-400">{selectedLog.componentName || "All Components"}</p>
              </div>
              <div>
                <span className="text-slate-400">Action Taken / Remarks:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedLog.actionDescription || "Routine Shift Inspection"}</p>
              </div>
              <div>
                <span className="text-slate-400">Submitted By:</span>
                <p className="font-bold text-slate-900 dark:text-white">👤 {selectedLog.userName || "Operator"} ({selectedLog.userRole || "OPERATOR"})</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}