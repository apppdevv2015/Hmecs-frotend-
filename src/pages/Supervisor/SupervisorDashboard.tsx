import type { ElementType } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { fetchMachines } from "../../redux/slices/machineSlice";
import Pagination from "../../components/common/Pagination";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Gauge,
  ShieldCheck,
  Truck,
  UsersRound,
  Wrench,
  ArrowUpRight,
  BatteryCharging,
  CircleDot,
  HardHat,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fleetService } from "../../services/Fleet/fleetService";
import { componentService } from "../../services/companyadmin/componentService";
import { supervisorTaskService } from "../../services/Task/supervisorTaskService";
import { supervisorAlertsService, type AlertItem } from "../../services/Task/supervisorAlertsService";
import { reportApprovalService, type Report, type HistoryEntry } from "../../services/Task/reportApprovalService";
import SupervisorUserDetailModal, { type UserDetailData } from "../../components/supervisor/SupervisorUserDetailModal";
import { userService, normalizeUsersResponse } from "../../services/Auth/userService";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type StatCard = {
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  badge: string;
  tone: "blue" | "green" | "amber" | "red";
};

type MaintenanceItem = {
  label: string;
  value: number;
  icon: ElementType;
  percentage: number;
};

type ActivityItem = {
  title: string;
  description: string;
  time: string;
  icon: ElementType;
  tone: "blue" | "green" | "amber" | "red";
};

type MachineHealthItem = {
  machine: string;
  status: string;
  health: number;
  operator: string;
};

const alertColors = ["#10b981", "#f59e0b", "#ef4444", "#2563eb"];

// ─── Theme Config ─────────────────────────────────────────────────────────────

const toneConfig = {
  blue: {
    icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    badge:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800/60",
    bar: "bg-blue-600",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60",
    bar: "bg-emerald-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/60",
    bar: "bg-amber-500",
  },
  red: {
    icon: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    badge:
      "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/60",
    bar: "bg-red-500",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHealthStyle(health: number) {
  if (health >= 80) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      badge:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    };
  }
  if (health >= 60) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    };
  }
  return {
    text: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      {label && (
        <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div
            key={item.dataKey || item.name}
            className="flex items-center justify-between gap-6 text-xs"
          >
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: item.color || item.fill || "#2563eb" }}
              />
              {item.name || item.dataKey}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconClass = "text-blue-600 dark:text-blue-400",
  action,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  iconClass?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Icon
            className={`h-4.5 w-4.5 ${iconClass}`}
            style={{ width: 18, height: 18 }}
          />
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>
        {subtitle && (
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [dark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [fleetMachines, setFleetMachines] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { machines } = useSelector((state: RootState) => state.machine);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // Trigger Redux machine fetch
      dispatch(fetchMachines());

      // Fetch live data from all supervisor services concurrently
      const [
        fleetRes,
        componentsRes,
        alertsRes,
        reportsRes,
        historyRes,
        tasksRes,
        usersRes,
      ] = await Promise.allSettled([
        fleetService.getFleetMachines("company_admin"),
        componentService.getComponents(),
        supervisorAlertsService.getAlerts(),
        reportApprovalService.getReports(),
        reportApprovalService.getHistory(),
        supervisorTaskService.getSupervisorTaskData(),
        userService.getUsers({ limit: 100 }),
      ]);

      if (fleetRes.status === "fulfilled" && Array.isArray(fleetRes.value)) {
        setFleetMachines(fleetRes.value);
      }

      if (componentsRes.status === "fulfilled") {
        const res: any = componentsRes.value;
        const list = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.components)
          ? res.components
          : [];
        setComponents(list);
      }

      if (alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value)) {
        setAlerts(alertsRes.value);
      }

      if (reportsRes.status === "fulfilled" && Array.isArray(reportsRes.value)) {
        setReports(reportsRes.value);
      }

      if (historyRes.status === "fulfilled" && Array.isArray(historyRes.value)) {
        setHistory(historyRes.value);
      }

      if (tasksRes.status === "fulfilled") {
        const data: any = tasksRes.value;
        setTaskAssignments(data?.operators || []);
      }

      if (usersRes.status === "fulfilled") {
        setUserList(normalizeUsersResponse(usersRes.value as any));
      }
    } catch (error) {
      console.error("Supervisor Dashboard live fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleOpenOperatorModal = (operatorName: string, machineName?: string) => {
    const cleanOpName = operatorName && operatorName !== "Assigned Operator" ? operatorName : "Ankush walia";
    
    // Find matching user from userList if available
    const matchedUser = userList.find((u: any) => {
      const fn = `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""}`.trim();
      return fn.toLowerCase() === cleanOpName.toLowerCase() || (u.name && u.name.toLowerCase() === cleanOpName.toLowerCase());
    });

    const assignedMachines = activeMachineList
      .filter((m: any) => {
        const mName = m.name || m.machineName || m.model || "";
        const matchTask = taskAssignments.find(
          (t: any) => (t.name === cleanOpName || t.operatorName === cleanOpName) && (t.assignedMachine === mName || t.assignedMachineId === m.id)
        );
        const matchFleet = fleetMachines.find(
          (f: any) => f.operator?.name === cleanOpName && (f.machineName === mName || f.id === m.id)
        );
        return matchTask || matchFleet || (machineName && mName === machineName);
      })
      .map((m: any, idx: number) => ({
        id: m.id || `m_${idx}`,
        name: m.name || m.machineName || m.model || `Machine ${idx + 1}`,
        code: m.serialNumber || m.serial_number || m.code || `SN-${101 + idx}`,
        health: m.healthPercent || (m.status === "Critical" ? 48 : m.status === "Warning" ? 74 : 94),
        status: m.status || "Healthy",
        location: m.site || m.location || "Site A - Mine Segment 3",
        assignedAt: "Today, 08:00 AM",
      }));

    if (assignedMachines.length === 0 && machineName) {
      const matchM = activeMachineList.find(
        (m: any) => (m.name || m.machineName || m.model) === machineName
      );
      assignedMachines.push({
        id: matchM?.id || "m_1",
        name: machineName,
        code: matchM?.serialNumber || "SN-777",
        health: matchM?.healthPercent || 75,
        status: matchM?.status || "Warning",
        location: matchM?.site || "Site A",
        assignedAt: "Today, 08:00 AM",
      });
    }

    const detail: UserDetailData = {
      id: matchedUser?.id || cleanOpName.toLowerCase().replace(/\s+/g, "_"),
      name: cleanOpName,
      role: matchedUser?.role_name || (typeof matchedUser?.role === "string" ? matchedUser.role : matchedUser?.role?.name) || "Equipment Operator",
      email: matchedUser?.email || `${cleanOpName.toLowerCase().replace(/\s+/g, ".")}@hme.com`,
      phone: matchedUser?.mobile_number || matchedUser?.phone || "+91 98765 43210",
      company: matchedUser?.company_name || "HME Mining & Fleet Operations",
      status: "Active",
      shift: "Day Shift (08:00 - 16:00)",
      assignedMachines: assignedMachines.length > 0 ? assignedMachines : [
        {
          id: "m_1",
          name: machineName || "CAT-777-DEMO",
          code: "SN-DEMO-777",
          health: 75,
          status: "Warning",
          location: "Mine Pit 4 - Haul Road",
          assignedAt: "Today, 08:00 AM",
        }
      ],
      workScope: `Operate ${machineName || "assigned heavy machine"}, conduct daily safety checks, monitor thermal and vibration telemetry, and log haul cycles.`,
    };

    setSelectedUserDetail(detail);
    setIsModalOpen(true);
  };

  // Combine machine list: merge Redux machines and fleet machines
  const activeMachineList = useMemo(() => {
    if (machines && machines.length > 0) return machines;
    return fleetMachines;
  }, [machines, fleetMachines]);

  // Active assigned operators count
  const activeOperatorsCount = useMemo(() => {
    const assignedFromTasks = taskAssignments.filter(
      (op: any) => op.status === "assigned" || (op.assignedMachine && op.assignedMachine !== "Unassigned")
    ).length;
    if (assignedFromTasks > 0) return assignedFromTasks;

    const assignedFromFleet = fleetMachines.filter(
      (m: any) => m?.operator?.name && m.operator.name !== "Unassigned"
    ).length;
    return assignedFromFleet > 0 ? assignedFromFleet : taskAssignments.length;
  }, [taskAssignments, fleetMachines]);

  // Pending Tasks count (pending reports + low condition components)
  const pendingTasksCount = useMemo(() => {
    const pendingReports = reports.filter((r) => r.status === "pending").length;
    const criticalComponents = components.filter((c: any) => Number(c?.condition || 1) >= 4).length;
    return pendingReports + criticalComponents;
  }, [reports, components]);

  // Critical Alerts count
  const criticalAlertsCount = useMemo(() => {
    const fromAlerts = alerts.filter(
      (a) => a.severity === "Critical" && a.status !== "Resolved"
    ).length;
    if (fromAlerts > 0) return fromAlerts;

    return fleetMachines.filter((m: any) => m?.status === "Critical").length;
  }, [alerts, fleetMachines]);

  // Overall Health Percentage
  const overallHealthScore = useMemo(() => {
    if (activeMachineList.length === 0) return 100;
    let totalScore = 0;
    activeMachineList.forEach((m: any) => {
      const comps = m.components || [];
      if (comps.length > 0) {
        const avg = comps.reduce((acc: number, c: any) => acc + (5 - Number(c?.condition || 1)) * 25, 0) / comps.length;
        totalScore += avg;
      } else {
        totalScore += m.healthPercent || (m.status === "Critical" ? 45 : m.status === "Warning" ? 72 : 92);
      }
    });
    return Math.round(totalScore / activeMachineList.length) || 100;
  }, [activeMachineList]);

  // Real Operational Uptime Availability %
  const dynamicUptimePercent = useMemo(() => {
    if (activeMachineList.length === 0) return 100;
    const activeCount = activeMachineList.filter(
      (m: any) => m.status !== "Critical" && m.status !== "Maintenance Due"
    ).length;
    return Math.round((activeCount / activeMachineList.length) * 1000) / 10;
  }, [activeMachineList]);

  // Dynamic Top Stat Cards
  const stats: StatCard[] = useMemo(() => [
    {
      title: "Assigned Machines",
      value: activeMachineList.length.toString(),
      description: "Machines currently under supervisor monitoring.",
      icon: Truck,
      badge: `${activeMachineList.length} Assigned`,
      tone: "blue",
    },
    {
      title: "Active Operators",
      value: activeOperatorsCount.toString(),
      description: "Operators actively assigned to field machines.",
      icon: UsersRound,
      badge: "Live",
      tone: "green",
    },
    {
      title: "Pending Tasks",
      value: pendingTasksCount.toString(),
      description: "Maintenance tasks waiting for supervisor action.",
      icon: Clock,
      badge: "Needs review",
      tone: "amber",
    },
    {
      title: "Critical Alerts",
      value: criticalAlertsCount.toString(),
      description: "High-priority alerts requiring immediate attention.",
      icon: AlertTriangle,
      badge: "Urgent",
      tone: "red",
    },
  ], [activeMachineList.length, activeOperatorsCount, pendingTasksCount, criticalAlertsCount]);

  // Dynamic Machine Health List
  const machineHealth: MachineHealthItem[] = useMemo(() => {
    return activeMachineList.map((machine: any, idx: number) => {
      const name = machine.name || machine.machineName || machine.model || `Machine ${idx + 1}`;
      const fleetMachine = fleetMachines.find(
        (f: any) => f.machineName === name || f.id === machine.id || f.machine === name
      );

      // Find assigned operator
      const matchingTask = taskAssignments.find(
        (op: any) => op.assignedMachine === name || op.assignedMachineId === machine.id || op.machine === name
      );
      const rawOperator =
        matchingTask?.name ||
        matchingTask?.operatorName ||
        fleetMachine?.operator ||
        fleetMachine?.operatorName ||
        machine.operatorName ||
        machine.operator;

      const operatorName =
        typeof rawOperator === "object" && rawOperator !== null
          ? rawOperator.name || rawOperator.operatorName || "Unassigned"
          : typeof rawOperator === "string" && rawOperator.trim() !== ""
            ? rawOperator
            : "Unassigned";

      const comps = machine.components || fleetMachine?.components || [];
      let health = machine.healthPercent || fleetMachine?.healthPercent || 0;
      if (comps.length > 0) {
        const total = comps.reduce((sum: number, c: any) => {
          const cHealth = c.overallHealthPercent !== undefined 
            ? c.overallHealthPercent 
            : c.healthPercent !== undefined 
              ? c.healthPercent 
              : Math.max(0, 100 - (c?.intelligence?.lifeUsedPercent ?? 15));
          return sum + cHealth;
        }, 0);
        health = Math.round(total / comps.length);
      } else if (fleetMachine) {
        health = fleetMachine.healthPercent || (fleetMachine.status === "Critical" ? 45 : fleetMachine.status === "Warning" ? 68 : 86);
      } else {
        health = machine.status === "Critical" ? 45 : machine.status === "Warning" ? 68 : 86;
      }

      return {
        machine: name,
        status: health >= 80 ? "Healthy" : health >= 60 ? "Warning" : "Critical",
        health,
        operator: operatorName,
      };
    });
  }, [activeMachineList, fleetMachines, taskAssignments]);

  // Filter strictly to machines with an active assigned operator or artisan
  const assignedMachineHealth = useMemo(() => {
    return machineHealth.filter(
      (m) => m.operator && m.operator !== "Unassigned" && m.operator !== "Unassigned Operator"
    );
  }, [machineHealth]);

  // Machine pagination
  const [machinePage, setMachinePage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalItems = assignedMachineHealth.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (machinePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedMachineHealth = assignedMachineHealth.slice(startIndex, endIndex);
  const startItem = totalItems === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

  // Dynamic Machine Performance Bar Chart data (Filtered strictly to supervisor company machines)
  const machinePerformanceData = useMemo(() => {
    return machineHealth.map((m) => ({
      name: m.machine.length > 12 ? m.machine.slice(0, 12) : m.machine,
      health: m.health,
    }));
  }, [machineHealth]);

  // Dynamic Alert Priority Donut Chart data
  const alertPriorityData = useMemo(() => {
    const healthyCount = machineHealth.filter((m) => m.status === "Healthy").length;
    const warningCount = machineHealth.filter((m) => m.status === "Warning").length;
    const criticalCount = machineHealth.filter((m) => m.status === "Critical").length;

    return [
      { name: "Healthy", value: healthyCount || 1 },
      { name: "Warning", value: warningCount },
      { name: "Critical", value: criticalCount },
    ];
  }, [machineHealth]);

  // Dynamic Maintenance Summary
  const maintenanceSummary: MaintenanceItem[] = useMemo(() => {
    const totalReports = Math.max(1, reports.length);
    const pendingCount = reports.filter((r) => r.status === "pending").length;
    const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
    const approvedCount = reports.filter((r) => r.status === "approved").length;

    return [
      {
        label: "Pending",
        value: pendingCount,
        icon: Clock,
        percentage: Math.round((pendingCount / totalReports) * 100),
      },
      {
        label: "In Progress",
        value: reviewedCount,
        icon: Wrench,
        percentage: Math.round((reviewedCount / totalReports) * 100),
      },
      {
        label: "Completed",
        value: approvedCount,
        icon: CheckCircle2,
        percentage: Math.round((approvedCount / totalReports) * 100),
      },
    ];
  }, [reports]);

  // Dynamic Weekly Task Trend (Calculated from real PostgreSQL database reports & task logs)
  const taskTrendData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCompletedMap = [0, 0, 0, 0, 0, 0, 0];
    const dayPendingMap = [0, 0, 0, 0, 0, 0, 0];

    reports.forEach((r: any) => {
      if (r.createdAt || r.date || r.timestamp || r.updatedAt) {
        const d = new Date(r.createdAt || r.date || r.timestamp || r.updatedAt);
        const dayIdx = (d.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
        if (r.status === "approved" || r.status === "completed" || r.status === "reviewed") {
          dayCompletedMap[dayIdx] += 1;
        } else {
          dayPendingMap[dayIdx] += 1;
        }
      }
    });

    return days.map((day, idx) => ({
      day,
      completed: dayCompletedMap[idx],
      pending: dayPendingMap[idx],
    }));
  }, [reports]);

  // Dynamic Recent Activities Feed
  const recentActivities: ActivityItem[] = useMemo(() => {
    if (history && history.length > 0) {
      return history.slice(0, 4).map((h) => {
        const isApproved = h.action === "approved";
        const isRejected = h.action === "rejected";
        const isReviewed = h.action === "reviewed";

        return {
          title: `Report ${h.action.charAt(0).toUpperCase() + h.action.slice(1)}`,
          description: `"${h.reportTitle}" by ${h.performedBy}`,
          time: h.timestamp || "Just now",
          icon: isApproved ? CheckCircle2 : isRejected ? AlertTriangle : isReviewed ? Wrench : ClipboardCheck,
          tone: isApproved ? "green" : isRejected ? "red" : isReviewed ? "amber" : "blue",
        };
      });
    }

    return [
      {
        title: "Operator Task Synchronized",
        description: "Field machine operator roster synced with task assignment center.",
        time: "Live",
        icon: HardHat,
        tone: "blue",
      },
      {
        title: "Fleet Telemetry Monitored",
        description: "Component health telemetry checks verified across all company machines.",
        time: "10 mins ago",
        icon: Gauge,
        tone: "green",
      },
      {
        title: "Supervisor Audit Log Active",
        description: "Report approval and inspection tracking active.",
        time: "Today",
        icon: ClipboardCheck,
        tone: "amber",
      },
    ];
  }, [history]);

  const axisTickStyle = {
    fontSize: 11,
    fill: dark ? "#94a3b8" : "#64748b",
    fontFamily: "Inter, sans-serif",
  };

  const gridStroke = dark ? "#1e293b" : "#f1f5f9";

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] dark:bg-[#0a0f1e]">
      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        {/* ── Hero Header ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] shadow-xl dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          {/* Decorative Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

          <div className="relative p-6 md:p-7">
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Content */}
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <ShieldCheck size={14} />
                  Supervisor Operations Panel
                </div>

                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    Operations Overview
                  </h1>
                  <button
                    onClick={() => loadDashboardData(true)}
                    disabled={loading || refreshing}
                    title="Refresh live dashboard"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Monitor assigned machines, operator activity, task progress,
                  machine health, and critical alerts from one centralized
                  operations control center.
                </p>
              </div>

              {/* Right Metrics */}
              <div className="grid grid-cols-2 gap-4 sm:min-w-[360px]">
                {[
                  {
                    icon: Gauge,
                    label: "Overall Health",
                    value: `${overallHealthScore}%`,
                    sub: "Average company fleet condition",
                    iconColor: "text-blue-300",
                  },
                  {
                    icon: BatteryCharging,
                    label: "Uptime",
                    value: `${dynamicUptimePercent}%`,
                    sub: "Active operational availability",
                    iconColor: "text-emerald-300",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-xl"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                      <m.icon className={`h-4 w-4 ${m.iconColor}`} />
                      {m.label}
                    </div>

                    <p className="mt-3 text-3xl font-black tracking-tight text-white">
                      {m.value}
                    </p>

                    <p className="mt-1 text-[11px] text-blue-100/80">{m.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stat Cards ────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            const tone = toneConfig[item.tone];
            return (
              <div
                key={item.title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#0d1424]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      {item.title}
                    </p>
                    <h2 className="mt-1.5 text-[30px] font-semibold leading-none tracking-tight text-slate-900 dark:text-white">
                      {item.value}
                    </h2>
                  </div>
                  <div className={`rounded-xl p-2.5 ${tone.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-3 min-h-[32px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>

                {/* mini progress bar */}
                <div className="mt-4 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-1 rounded-full ${tone.bar}`}
                    style={{
                      width:
                        item.tone === "blue"
                          ? "85%"
                          : item.tone === "green"
                            ? "80%"
                            : item.tone === "amber"
                              ? "35%"
                              : "15%",
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                  >
                    {item.badge}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400" />
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Weekly Chart + Alert Priority ─────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Area Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424] xl:col-span-2">
            <SectionHeader
              icon={Activity}
              title="Weekly Task Performance"
              subtitle="Completed vs pending task trend for this week"
              action={
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Last 7 days
                </span>
              }
            />
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart
                  data={taskTrendData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                >
                  <defs>
                    <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke={gridStroke}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTickStyle}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={axisTickStyle}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#gCompleted)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    name="Pending"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fill="url(#gPending)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-5">
              {[
                { label: "Completed", color: "#2563eb" },
                { label: "Pending", color: "#f59e0b" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: l.color }}
                  />
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut / Alert Priority */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424]">
            <SectionHeader
              icon={AlertTriangle}
              title="Alert Priority"
              subtitle="Distribution by priority level"
              iconClass="text-red-500 dark:text-red-400"
            />
            <div className="h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={alertPriorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {alertPriorityData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={alertColors[index % alertColors.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {alertPriorityData.map((item, index) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          alertColors[index % alertColors.length],
                      }}
                    />
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {item.name}
                    </p>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Machine Health Bar Chart + Maintenance Summary ─────────────────── */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Bar Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424] xl:col-span-2">
            <SectionHeader
              icon={Gauge}
              title="Machine Health Overview"
              subtitle="Health score of key machines under supervisor monitoring"
            />
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart
                  data={machinePerformanceData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                  barSize={32}
                >
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke={gridStroke}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={axisTickStyle}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={axisTickStyle}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="health" name="Health %" radius={[6, 6, 0, 0]}>
                    {machinePerformanceData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.health >= 80
                            ? "#10b981"
                            : entry.health >= 60
                              ? "#f59e0b"
                              : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Maintenance Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424]">
            <SectionHeader icon={ClipboardCheck} title="Maintenance Summary" />
            <div className="space-y-3">
              {maintenanceSummary.map((item) => {
                const Icon = item.icon;
                const color =
                  item.label === "Completed"
                    ? {
                        bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
                        bar: "bg-emerald-500",
                      }
                    : item.label === "In Progress"
                      ? {
                          bg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
                          bar: "bg-blue-500",
                        }
                      : {
                          bg: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
                          bar: "bg-amber-500",
                        };

                return (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${color.bg}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.percentage}% of total
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        {item.value}
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-1.5 rounded-full ${color.bar} transition-all duration-500`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Assigned Machine Status & Recent Activity ─────────────────────── */}
        {/* ── Assigned Machine Status (Full Width) ───────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424]">
          <SectionHeader
            icon={Truck}
            title="Assigned Machine Status"
            subtitle="Machine-wise health and assigned operator details"
          />
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
            {paginatedMachineHealth.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No assigned machines found.
              </div>
            ) : (
              paginatedMachineHealth.map((item, index) => {
                const style = getHealthStyle(item.health);
                return (
                  <div
                    key={`${item.machine}-${index}`}
                    onClick={() => handleOpenOperatorModal(item.operator, item.machine)}
                    className="group cursor-pointer rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-blue-500/40 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                          {item.machine}
                        </h4>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Operator: <span className="font-semibold text-slate-800 dark:text-slate-200 underline decoration-slate-300 underline-offset-2 group-hover:text-blue-600">{typeof item.operator === "object" ? ((item.operator as any)?.name || "Unassigned") : String(item.operator || "Unassigned")}</span>
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.badge}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-1.5 rounded-full ${style.bar} transition-all duration-500`}
                          style={{ width: `${item.health}%` }}
                        />
                      </div>
                      <span
                        className={`min-w-[38px] text-right text-[12px] font-bold ${style.text}`}
                      >
                        {item.health}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {totalItems > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                currentPage={machinePage}
                totalPages={totalPages}
                startItem={startItem}
                endItem={endItem}
                totalItems={totalItems}
                onPrev={() => setMachinePage((prev) => Math.max(prev - 1, 1))}
                onNext={() =>
                  setMachinePage((prev) => Math.min(prev + 1, totalPages))
                }
              />
            </div>
          )}
        </section>

        {/* ── Parallel Section: Recent Activity + Operational Control Cards ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Recent Supervisor Activity (2 Columns) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424] lg:col-span-2">
            <SectionHeader
              icon={Activity}
              title="Recent Supervisor Activity"
              subtitle="Real-time log of supervisor inspection reviews and report approvals"
            />
            <div className="space-y-3">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                const tone = toneConfig[activity.tone];
                return (
                  <div
                    key={`${activity.title}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {activity.title}
                        </h4>
                        <span className="shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {activity.time}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Control Action Cards (1 Column, Stacked Parallel) */}
          <div className="flex flex-col gap-3.5">
            {[
              {
                icon: Settings2,
                label: "Operational Control",
                metric: `${activeMachineList.length} Machines • ${activeOperatorsCount} Operators`,
                desc: "Track field machines, active operators, and daily fleet performance.",
                link: "/supervisor/operators",
                bg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
              },
              {
                icon: CheckCircle2,
                label: "Task Verification",
                metric: `${pendingTasksCount} Pending Reviews`,
                desc: "Review inspection logs, approvals, and maintenance progress.",
                link: "/supervisor/reports",
                bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
              },
              {
                icon: CircleDot,
                label: "Alert Monitoring",
                metric: `${criticalAlertsCount} Critical Risks`,
                desc: "Identify critical risks & telemetry alerts before machine downtime.",
                link: "/supervisor/alerts",
                bg: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
              },
            ].map((card) => (
              <div
                key={card.label}
                onClick={() => navigate(card.link)}
                className="group cursor-pointer flex flex-1 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4.5 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-[#0d1424] dark:hover:border-blue-500/40"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`rounded-xl p-3 ${card.bg}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {card.label}
                      </p>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {card.metric}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      {card.desc}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <SupervisorUserDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userDetail={selectedUserDetail}
      />
    </div>
  );
}
