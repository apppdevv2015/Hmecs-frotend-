import { useMemo, useState, useEffect, useCallback, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  Eye,
  Truck,
  Wrench,
  CheckCircle2,
  X,
  Search,
  Filter,
  PlayCircle,
  CheckCircle,
  Info,
  Activity,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Calendar,
  RefreshCw,
  User,
  ChevronRight,
  FileText,
  History as HistoryIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { fleetService } from "../../services/Fleet/fleetService";
import { machineAssignmentService } from "../../services/Task/machineAssignmentService";
import { maintenanceService } from "../../services/companyadmin/maintenanceService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { apiCall } from "../../services/apiHandler";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

type TaskStatus = "Pending" | "In Progress" | "Completed";
type Priority = "High" | "Medium" | "Low";
type AlertSeverity = "Critical" | "Warning";
type ModalType = "tasks" | "alerts" | "maintenance" | "machines" | null;

type Task = {
  id: string;
  realId?: string;
  machine: string;
  issue: string;
  priority: Priority;
  status: TaskStatus;
  assignedDate: string;
  dueDate: string;
  location: string;
  description: string;
};

type AlertItem = {
  id: string;
  machine: string;
  issue: string;
  severity: AlertSeverity;
  time: string;
  location: string;
  recommendation: string;
};

type MachineHealth = {
  id: string;
  machine: string;
  health: number;
  location: string;
  runtime: string;
  engineTemp: string;
  hydraulicPressure: string;
};

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

const priorityClass = (priority: Priority) => {
  if (priority === "High") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }
  if (priority === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
};

const statusClass = (status: TaskStatus) => {
  if (status === "Pending") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (status === "In Progress") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
};

export default function ArtisansDashboard() {
  const navigate = useNavigate();

  // User details
  const storedUser =
    StorageService.get<any>(STORAGE_KEYS.USER) ||
    StorageService.get<any>("user") ||
    {};
  const userName = storedUser?.name || storedUser?.fullName || "Artisan Technician";
  const userRole = storedUser?.role || "ARTISAN";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [alertsState, setAlertsState] = useState<AlertItem[]>([]);
  const [machineHealthState, setMachineHealthState] = useState<MachineHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineHealth | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "All">("All");

  const [fleetMachines, setFleetMachines] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const [fleetStats, setFleetStats] = useState({
    totalMachines: 0,
    healthy: 0,
    Warning: 0,
    critical: 0,
  });
  const [chartOption, setChartOption] = useState<any>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      const userCompanyId = StorageService.getCompanyId() || "";
      const currentUserId = String(storedUser?.id || storedUser?.userId || "").toLowerCase().trim();

      // 1. Fetch Fleet Machines & Assignments directly from PostgreSQL
      let rawMachines: any[] = [];
      try {
        const fleetRes = await fleetService.getFleetMachines();
        if (Array.isArray(fleetRes)) rawMachines = fleetRes;
        else if (Array.isArray(fleetRes?.data)) rawMachines = fleetRes.data;
        else if (Array.isArray(fleetRes?.machines)) rawMachines = fleetRes.machines;
      } catch {
        rawMachines = [];
      }

      // Filter for this company
      const companyMachines = rawMachines.filter((m: any) => {
        if (!m) return false;
        if (userCompanyId && m.companyId && String(m.companyId) !== userCompanyId) return false;
        return true;
      });

      const matchedMachines = companyMachines.map((m: any) => {
        const rawHours =
          m.currentHours ??
          m.totalHours ??
          m.hoursRun ??
          m.operatingHours ??
          m.installHours ??
          0;

        const health = m.healthPercent ?? m.healthScore ?? 95;
        const status = health >= 80 ? "Healthy" : health >= 60 ? "Warning" : "Critical";

        return {
          id: m.machineId || m.id,
          machineId: m.machineId || m.id,
          name: cleanMachineName(m.machineName || m.name),
          machineName: cleanMachineName(m.machineName || m.name),
          serialNumber: String(m.serialNumber || m.fleetId || "SN-HME-1001").replace(/^DEMO-/i, ""),
          category: m.equipmentType || m.category || "Heavy Machinery",
          location: m.location || m.site || "Mining Pit A",
          hoursRun: Number(rawHours || 0),
          healthPercent: health,
          healthScore: health,
          status,
          assignedSupervisorName: m.assignedSupervisorName || "Supervisor User",
          assignedArtisanName: m.assignedArtisanName || userName,
        };
      });

      setFleetMachines(matchedMachines);

      // Machine Health State
      const machineHealth: MachineHealth[] = matchedMachines.map((m) => ({
        id: m.id,
        machine: m.name,
        health: m.healthPercent,
        location: m.location,
        runtime: `${m.hoursRun > 0 ? m.hoursRun.toLocaleString() : "0"} hrs`,
        engineTemp: `${Math.min(m.healthPercent + 3, 100)}%`,
        hydraulicPressure: `${Math.min(m.healthPercent + 2, 100)}%`,
      }));

      setMachineHealthState(machineHealth);

      const healthyCount = matchedMachines.filter((m) => m.status === "Healthy").length;
      const warnCount = matchedMachines.filter((m) => m.status === "Warning").length;
      const critCount = matchedMachines.filter((m) => m.status === "Critical").length;

      setFleetStats({
        totalMachines: matchedMachines.length,
        healthy: healthyCount,
        Warning: warnCount,
        critical: critCount,
      });

      // 2. Fetch Tasks & Maintenance Logs from Database
      try {
        const logsRes = await maintenanceService.getLogs();
        const dbLogs = Array.isArray(logsRes)
          ? logsRes
          : logsRes?.data || logsRes?.logs || [];

        const mappedTasks: Task[] = dbLogs.map((log: any, idx: number) => {
          let priority: Priority = "Medium";
          if (log.component) {
            if (log.component.condition >= 4) priority = "High";
            else if (log.component.condition <= 2) priority = "Low";
          } else if (log.priority) {
            priority = log.priority;
          }

          let status: TaskStatus = "Pending";
          if (log.status === "Closed" || log.status === "Completed") status = "Completed";
          else if (log.status === "In Progress" || log.status === "Active") status = "In Progress";

          const rawDueDate = log.downtime || log.date || log.createdAt || new Date().toISOString();
          const rawAssignedDate = log.date || log.createdAt || new Date().toISOString();

          return {
            id: `TSK-${String(log.id || idx + 1).slice(0, 5).toUpperCase()}`,
            realId: log.id,
            machine: cleanMachineName(log.machine?.name || log.machineName || matchedMachines[0]?.name || "Mining Unit"),
            issue: log.work || log.description || "Diagnostic & Component Verification",
            priority,
            status,
            assignedDate: formatDate(rawAssignedDate),
            dueDate: formatDate(rawDueDate),
            location: log.machine?.site || log.location || "Site A - Workshop Bay",
            description: log.work || log.description || "Routine maintenance inspection & component testing.",
          };
        });

        if (mappedTasks.length > 0) {
          setTasks(mappedTasks);
        } else {
          // Default contextual task if new account
          setTasks([
            {
              id: "TSK-001",
              machine: matchedMachines[0]?.name || "Hitachi ATC-604 All Terrain Crane",
              issue: "Hydraulic Pump Calibration & Pressure Check",
              priority: "High",
              status: "In Progress",
              assignedDate: formatDate(new Date().toISOString()),
              dueDate: formatDate(new Date(Date.now() + 86400000).toISOString()),
              location: "Workshop Bay 2",
              description: "Perform hydraulic valve calibration, filter check, and test line pressure.",
            },
            {
              id: "TSK-002",
              machine: matchedMachines[0]?.name || "Hitachi ATC-604 All Terrain Crane",
              issue: "Engine Oil Sampling & Diagnostic Telemetry",
              priority: "Medium",
              status: "Pending",
              assignedDate: formatDate(new Date().toISOString()),
              dueDate: formatDate(new Date(Date.now() + 172800000).toISOString()),
              location: "Pit A - Field Station",
              description: "Extract oil sample for wear metal analysis and sign off telemetry log.",
            },
          ]);
        }
      } catch (err) {
        console.warn("Could not load maintenance logs:", err);
      }

      // 3. Fetch Alerts from Telemetry & Audit Logs
      try {
        const queryParam = userCompanyId ? `?companyId=${encodeURIComponent(userCompanyId)}` : "";
        const historyRes: any = await apiCall(`/machines/inspection-history${queryParam}`, { method: "GET" }, { showError: false })
          .catch(() => null);

        let logs: any[] = [];
        if (Array.isArray(historyRes?.data?.historyLogs)) logs = historyRes.data.historyLogs;
        else if (Array.isArray(historyRes?.data)) logs = historyRes.data;
        else if (Array.isArray(historyRes)) logs = historyRes;

        setHistoryLogs(logs.slice(0, 10));

        const alerts: AlertItem[] = [];
        logs.forEach((log: any, idx: number) => {
          const score = log.overallMachineHealth ?? 100;
          if (score < 85 || log.status === "Warning" || log.status === "Critical") {
            alerts.push({
              id: `ALT-${log.id || idx + 1}`,
              machine: cleanMachineName(log.machineName || "Mining Machine"),
              issue: log.componentName ? `${log.componentName} wear observed` : "Component anomaly detected",
              severity: score < 60 || log.status === "Critical" ? "Critical" : "Warning",
              time: formatDate(log.createdAt),
              location: "Active Pit Site",
              recommendation: score < 60 ? "Immediate component replacement required" : "Detailed artisan inspection recommended",
            });
          }
        });

        if (alerts.length > 0) {
          setAlertsState(alerts);
        } else {
          setAlertsState([
            {
              id: "ALT-01",
              machine: matchedMachines[0]?.name || "Hitachi ATC-604 All Terrain Crane",
              issue: "Hydraulic System Filter Replacement Cycle Due",
              severity: "Warning",
              time: "Today",
              location: "Site A - Workshop",
              recommendation: "Inspect hydraulic filter element and verify flow rate during shift.",
            },
          ]);
        }
      } catch {
        // Keep resilient
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [storedUser?.id, userName]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ECharts Config
  useEffect(() => {
    const defaultOption: EChartsOption = {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} Machines ({d}%)",
      },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "category",
        data: ["Healthy", "Warning", "Critical"],
        axisLine: { lineStyle: { color: "#94a3b8" } },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      series: [
        {
          name: "Fleet Health",
          type: "bar",
          barWidth: "40%",
          data: [
            { value: fleetStats.healthy, itemStyle: { color: "#10b981", borderRadius: [8, 8, 0, 0] } },
            { value: fleetStats.Warning, itemStyle: { color: "#f59e0b", borderRadius: [8, 8, 0, 0] } },
            { value: fleetStats.critical, itemStyle: { color: "#ef4444", borderRadius: [8, 8, 0, 0] } },
          ],
        },
      ],
    };

    setChartOption(defaultOption);
  }, [fleetStats]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        task.id.toLowerCase().includes(query) ||
        task.machine.toLowerCase().includes(query) ||
        task.issue.toLowerCase().includes(query) ||
        task.location.toLowerCase().includes(query);

      const matchesStatus = taskStatusFilter === "All" || task.status === taskStatusFilter;
      const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, taskStatusFilter, priorityFilter]);

  const confirmTaskStatusChange = async () => {
    if (!confirmTask) return;
    const nextStatus: TaskStatus = confirmTask.status === "Pending" ? "In Progress" : "Completed";
    const dbStatus = nextStatus === "Completed" ? "Closed" : nextStatus;

    try {
      setIsLoading(true);
      if (confirmTask.realId) {
        await maintenanceService.updateLog(confirmTask.realId, { status: dbStatus });
      }
      toast.success(confirmTask.status === "Pending" ? "Task started successfully" : "Task completed successfully");
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setIsLoading(false);
      setConfirmTask(null);
    }
  };

  const avgFleetHealth = fleetMachines.length > 0
    ? Math.round(fleetMachines.reduce((acc, m) => acc + m.healthPercent, 0) / fleetMachines.length)
    : 92;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-sans text-slate-900 antialiased dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8 space-y-6">
      {/* ── HERO HEADER: ARTISAN WORKSPACE ── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-[#312e81] via-[#2563eb] to-[#1e40af] p-6 text-white shadow-xl shadow-blue-500/10 sm:p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-400/20 blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Artisan & Mechanical Engineering Hub
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-white">
              Welcome, {userName}
            </h1>

            <p className="max-w-2xl text-xs font-semibold leading-relaxed text-blue-100 sm:text-sm">
              Manage equipment maintenance work orders, execute component diagnostics, monitor real-time telemetry, and authorize inspection logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                loadDashboardData();
                showSuccessToast("Refreshed maintenance & fleet telemetry from database!");
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 cursor-pointer"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
              Refresh Telemetry
            </button>

            <Link
              to="/artisans/work-order-capture"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 cursor-pointer"
            >
              <Wrench size={16} />
              Create Maintenance Report
            </Link>
          </div>
        </div>

        {/* Quick Nav Workflows */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
          <Link
            to="/artisans/pre-start-inspection"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300">
              <CheckCircle2 size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Pre-Start Inspection</p>
              <p className="text-[10px] text-blue-200">Artisan Inspection Scope</p>
            </div>
          </Link>

          <Link
            to="/artisans/tasks"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-blue-300">
              <ClipboardList size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Artisans Tasks</p>
              <p className="text-[10px] text-blue-200">Work Orders & Jobs</p>
            </div>
          </Link>

          <Link
            to="/artisans/service-logs"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/30 text-purple-300">
              <HistoryIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Service Logs</p>
              <p className="text-[10px] text-blue-200">Database History & Audit</p>
            </div>
          </Link>

          <Link
            to="/artisans/alerts"
            className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition hover:bg-white/20"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/30 text-rose-300">
              <AlertTriangle size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">Alerts & Hazards</p>
              <p className="text-[10px] text-blue-200">Predictive Diagnostics</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4 KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Today's Tasks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Tasks
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ClipboardList size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {tasks.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {tasks.filter((t) => t.status === "In Progress").length} In Progress • {tasks.filter((t) => t.status === "Pending").length} Pending
          </p>
        </div>

        {/* Assigned Machines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Fleet
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Truck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {fleetMachines.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {fleetStats.healthy} Healthy • {fleetStats.Warning} Warning
          </p>
        </div>

        {/* Telemetry Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Alerts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400 sm:text-3xl">
            {alertsState.length}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Component Telemetry Warnings
          </p>
        </div>

        {/* Average Fleet Health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fleet Health Score
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Activity size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-indigo-600 dark:text-indigo-400 sm:text-3xl">
            {avgFleetHealth}%
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Diagnostic Operational Average
          </p>
        </div>
      </div>

      {/* ── FLEET HEALTH & PREDICTIVE ANALYTICS CHART ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Fleet Condition & Maintenance Overview
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Machine distribution by operating health status.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                ● {fleetStats.healthy} Healthy
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                ● {fleetStats.Warning} Warning
              </span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                ● {fleetStats.critical} Critical
              </span>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {chartOption && <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />}
          </div>
        </div>

        {/* Predictive Maintenance Alerts Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Priority Alerts ({alertsState.length})
              </h3>
              <Link to="/artisans/alerts" className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400">
                View All
              </Link>
            </div>

            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
              {alertsState.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAlert(a)}
                  className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 transition hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">{a.machine}</span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      {a.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{a.issue}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">📍 {a.location} • {a.time}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/artisans/tasks"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-700"
          >
            <ClipboardList size={14} />
            Manage Maintenance Jobs
          </Link>
        </div>
      </div>

      {/* ── ACTIVE TASKS & WORK ORDERS TABLE ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Active Maintenance Tasks & Work Orders ({tasks.length})
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Scheduled mechanical interventions and component repairs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative h-10 w-64">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search machine, issue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#101f33]">
                {(["All", "Pending", "In Progress", "Completed"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTaskStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      taskStatusFilter === st
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                <th className="px-6 py-4 font-bold">Task ID</th>
                <th className="px-6 py-4 font-bold">Machine Equipment</th>
                <th className="px-6 py-4 font-bold">Issue / Scope</th>
                <th className="px-6 py-4 font-bold">Priority</th>
                <th className="px-6 py-4 font-bold">Due Date</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    No maintenance tasks found matching filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                      {t.id}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{t.machine}</span>
                        <span className="text-[10px] text-slate-400">📍 {t.location}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="max-w-xs truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t.issue}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide border ${priorityClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.dueDate}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide border ${statusClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {t.status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() => setConfirmTask(t)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-emerald-700 cursor-pointer"
                          >
                            {t.status === "Pending" ? <PlayCircle size={13} /> : <CheckCircle size={13} />}
                            {t.status === "Pending" ? "Start" : "Complete"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedTask(t)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 cursor-pointer"
                        >
                          <Eye size={13} />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ASSIGNED FLEET MACHINES GRID ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Assigned Fleet Equipment ({fleetMachines.length})
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Operating units assigned to this engineering team.
              </p>
            </div>

            <Link
              to="/artisans/pre-start-inspection"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow transition hover:bg-blue-700"
            >
              <CheckCircle2 size={14} />
              Perform Inspection
            </Link>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fleetMachines.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-blue-300 hover:bg-white dark:border-slate-800 dark:bg-[#101f33]/60 dark:hover:border-blue-700"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-[#0b1728] dark:border-slate-700 dark:text-blue-300">
                    {m.serialNumber}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                    m.status === "Healthy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}>
                    ● {m.status}
                  </span>
                </div>

                <h4 className="mt-3 text-base font-black text-slate-900 dark:text-white truncate">
                  {m.name}
                </h4>
                <p className="text-xs font-semibold text-slate-400">📍 {m.location}</p>

                <div className="mt-4 space-y-2 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Operating Meter:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {m.hoursRun > 0 ? `${m.hoursRun.toLocaleString()} hrs` : "0 hrs"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Health Index:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {m.healthPercent}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Supervisor:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      🛡️ {m.assignedSupervisorName}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to="/artisans/pre-start-inspection"
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                  >
                    <CheckCircle2 size={13} />
                    Inspect
                  </Link>

                  <Link
                    to="/artisans/work-order-capture"
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0b1728] dark:text-slate-200"
                  >
                    <Wrench size={13} />
                    Work Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {confirmTask.status === "Pending" ? "Start Maintenance Task?" : "Complete Task?"}
            </h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to mark <strong>{confirmTask.id}</strong> ({confirmTask.issue}) as{" "}
              <strong>{confirmTask.status === "Pending" ? "In Progress" : "Completed"}</strong>?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTask(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTaskStatusChange}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-700"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Task #{selectedTask.id} Details
              </h4>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400">Equipment:</span>
                <p className="font-black text-slate-900 dark:text-white">{selectedTask.machine}</p>
              </div>
              <div>
                <span className="text-slate-400">Issue / Scope:</span>
                <p className="font-bold text-blue-600 dark:text-blue-400">{selectedTask.issue}</p>
              </div>
              <div>
                <span className="text-slate-400">Description:</span>
                <p className="font-medium leading-relaxed">{selectedTask.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">Location:</span>
                  <p className="font-bold">{selectedTask.location}</p>
                </div>
                <div>
                  <span className="text-slate-400">Due Date:</span>
                  <p className="font-bold">{selectedTask.dueDate}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
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
