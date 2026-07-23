import { fleetService } from "../../services/Fleet/fleetService";
import { machineAssignmentService } from "../../services/Task/machineAssignmentService";

import { useMemo, useState, useEffect, type ReactNode } from "react";
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
  Loader2,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { maintenanceService } from "../../services/companyadmin/maintenanceService";
import { userService } from "../../services/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

type TaskStatus = "Pending" | "In Progress" | "Completed";
type Priority = "High" | "Medium" | "Low";
type AlertSeverity = "Critical" | "Warning";
type ModalType = "tasks" | "alerts" | "maintenance" | "machines" | null;

type Task = {
  id: string;
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

const healthColor = (value: number) => {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const healthTextColor = (value: number) => {
  if (value >= 80) return "text-emerald-600 dark:text-emerald-300";
  if (value >= 60) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
};

const getTaskActionLabel = (status: TaskStatus) => {
  if (status === "Pending") return "Start Task";
  if (status === "In Progress") return "Complete Task";
  return "Completed";
};

export default function ArtisansDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alertsState, setAlertsState] = useState<AlertItem[]>([]);
  const [machineHealthState, setMachineHealthState] = useState<MachineHealth[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineHealth | null>(
    null,
  );
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | "All">(
    "All",
  );
  const [priorityFilter, setPriorityFilter] = useState<Priority | "All">("All");

  const [fleetMachines, setFleetMachines] = useState<any[]>([]);

  const [fleetStats, setFleetStats] = useState({
    totalMachines: 0,
    healthy: 0,
    Warning: 0,
    critical: 0,
  });
  const [chartOption, setChartOption] = useState<any>(null);

  const loadDashboardData = async () => {
    /* ==========================
   LOAD FLEET DATA
========================== */

    const currentUser = {
      id: "eng_1",
      role: "Artisans",
    };

    const currentRole = "Artisans";

    const machines = await fleetService.getFleetMachines();

    let filteredMachines = machines;

    if (currentRole === "Artisans" && currentUser?.id) {
      const assignedMachineIds =
        await machineAssignmentService.getAssignedMachines(currentUser.id);

      filteredMachines = machines.filter((machine) =>
        assignedMachineIds.includes(machine.machineId),
      );
    }

    setFleetMachines(filteredMachines);

    const machineHealth = filteredMachines.map((machine) => ({
      id: machine.machineId,

      machine: machine.machineName,

      health: machine.healthPercent,

      location: machine.location,

      runtime: `${machine.hoursRun} hrs`,

      engineTemp: `${machine.components.engine.health}%`,

      hydraulicPressure: `${machine.components.hydraulic.health}%`,
    }));

    setMachineHealthState(machineHealth);

    setFleetStats({
      totalMachines: filteredMachines.length,

      healthy: filteredMachines.filter((m) => m.status === "Healthy").length,

      Warning: filteredMachines.filter((m) => m.status === "Warning").length,

      critical: filteredMachines.filter((m) => m.status === "Critical").length,
    });
    try {
      setIsLoading(true);

      const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
      if (!token) return;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userEmail = (payload.email || "").toLowerCase().trim();

      // 1. Fetch maintenance logs
      const logsRes = await maintenanceService.getLogs();
      const dbLogs = Array.isArray(logsRes)
        ? logsRes
        : logsRes.data || logsRes.logs || [];

      // 2. Get user profile
      let fullName = "";
      try {
        const userProfile = await userService.getUserById(payload.id);
        const firstName = userProfile.firstName || userProfile.first_name || "";
        const lastName = userProfile.lastName || userProfile.last_name || "";
        fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      } catch (profileErr) {
        console.error("Failed to load user profile", profileErr);
      }

      const assignedLogs = dbLogs.filter((log: any) => {
        if (!log.technician) return false;
        const techName = log.technician.toLowerCase().trim();
        if (fullName && techName === fullName) return true;
        if (
          userEmail === "sefserferg@gmail.com" &&
          (techName.includes("priya") || techName.includes("kumari"))
        )
          return true;
        if (
          userEmail === "shdbha@gmail.com" &&
          (techName.includes("rt45t45") || techName.includes("54t45t45"))
        )
          return true;
        return false;
      });

      const mappedTasks = assignedLogs.map((log: any) => {
        let priority: Priority = "Medium";
        if (log.component) {
          if (log.component.condition >= 4) priority = "High";
          else if (log.component.condition <= 2) priority = "Low";
        }

        let status: TaskStatus = "Pending";
        if (log.status === "Closed" || log.status === "Completed")
          status = "Completed";
        else if (log.status === "In Progress") status = "In Progress";

        const isDowntimeDate =
          log.downtime &&
          log.downtime.includes("-") &&
          !isNaN(Date.parse(log.downtime));
        const rawDueDate = isDowntimeDate
          ? log.downtime
          : log.date || log.createdAt;

        const formattedDueDate = new Date(rawDueDate).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          },
        );

        const formattedAssignedDate = new Date(
          log.date || log.createdAt,
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return {
          id: `TSK-${log.id.slice(0, 4).toUpperCase()}`,
          realId: log.id,
          machine: log.machine?.name || "Unknown Machine",
          issue: log.work || "Routine Check",
          priority,
          status,
          assignedDate: formattedAssignedDate,
          dueDate: formattedDueDate,
          location: log.machine?.site || "Site A",
          description: log.work || "",
        };
      });

      setTasks(mappedTasks);

      // 3. Load dynamic machine health & alerts

      const mappedAlerts: AlertItem[] = [];

      filteredMachines.forEach((machine) => {
        const components = machine.components;

        Object.entries(components).forEach(([key, component]) => {
          if (component.status === "critical" || component.status === "warn") {
            mappedAlerts.push({
              id: `ALT-${machine.machineId}-${key}`,

              machine: machine.machineName,

              issue: `${key.toUpperCase()} issue detected`,

              severity:
                component.status === "critical" ? "Critical" : "Warning",

              time: "10 min ago",

              location: machine.location,

              recommendation:
                component.status === "critical"
                  ? "Immediate maintenance required"
                  : "Inspection recommended",
            });
          }
        });
      });

      setAlertsState(mappedAlerts);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const defaultOption = {
      xAxis: {
        data: ["Healthy", "Warning", "Critical"],
      },

      yAxis: {},

      dataGroupId: "",

      animationDurationUpdate: 500,

      series: {
        type: "bar",
        id: "sales",

        data: [
          {
            value: fleetStats.healthy,
            groupId: "healthy",
          },
          {
            value: fleetStats.Warning,
            groupId: "Warning",
          },
          {
            value: fleetStats.critical,
            groupId: "critical",
          },
        ],

        universalTransition: {
          enabled: true,
          divideShape: "clone",
        },
      },
    };

    const drilldownData = [
      {
        dataGroupId: "healthy",
        data: machineHealthState
          .filter((m) => m.health >= 80)
          .map((m) => [m.machine, m.health]),
      },

      {
        dataGroupId: "Warning",
        data: machineHealthState
          .filter((m) => m.health >= 60 && m.health < 80)
          .map((m) => [m.machine, m.health]),
      },

      {
        dataGroupId: "critical",
        data: machineHealthState
          .filter((m) => m.health < 60)
          .map((m) => [m.machine, m.health]),
      },
    ];

    setChartOption(defaultOption);

    (window as any).chartClickHandler = (params: any, chart: any) => {
      if (!params.data) return;

      const subData = drilldownData.find(
        (d) => d.dataGroupId === params.data.groupId,
      );

      if (!subData) return;

      chart.setOption({
        xAxis: {
          data: subData.data.map((item) => item[0]),
        },

        series: {
          type: "bar",
          id: "sales",
          dataGroupId: subData.dataGroupId,

          data: subData.data.map((item) => item[1]),

          universalTransition: {
            enabled: true,
            divideShape: "clone",
          },
        },

        graphic: [
          {
            type: "group",
            left: 14,
            top: 14,
            z: 100,
            cursor: "pointer",

            onclick: () => {
              chart.setOption(defaultOption, true);
            },

            children: [
              // Button Background
              {
                type: "rect",
                shape: {
                  width: 92,
                  height: 34,
                  r: 10,
                },
                style: {
                  fill: "#ffffff",
                  stroke: "#e2e8f0",
                  lineWidth: 1,
                  shadowBlur: 8,
                  shadowColor: "rgba(15,23,42,0.08)",
                  shadowOffsetY: 2,
                },
              },

              // Arrow
              {
                type: "text",
                left: 12,
                top: 9,
                style: {
                  text: "←",
                  fontSize: 15,
                  fontWeight: 700,
                  fill: "#2563eb",
                },
              },

              // Text
              {
                type: "text",
                left: 30,
                top: 10,
                style: {
                  text: "Back",
                  fontSize: 12,
                  fontWeight: 600,
                  fill: "#334155",
                },
              },
            ],
          },
        ],
      });
    };
  }, [fleetStats, machineHealthState]);

  const stats = useMemo(
    () => [
      {
        title: "Today's Tasks",
        value: String(tasks.length),
        icon: <ClipboardList size={24} strokeWidth={2.4} />,
        color:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
        type: "tasks" as ModalType,
      },

      {
        title: "Assigned Machines",
        value: String(fleetStats.totalMachines),
        icon: <Truck size={24} strokeWidth={2.4} />,
        color:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
        type: "machines" as ModalType,
      },

      {
        title: "Maintenance",
        value: String(fleetStats.Warning),
        icon: <Wrench size={24} strokeWidth={2.4} />,
        color:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
        type: "machines" as ModalType,
      },
    ],
    [tasks, alertsState, machineHealthState, fleetStats],
  );

  const maintenance = useMemo(
    () => [
      {
        title: "Pending" as TaskStatus,
        value: String(tasks.filter((task) => task.status === "Pending").length),
        icon: <Clock size={22} strokeWidth={2.4} />,
        color:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
      },
      {
        title: "In Progress" as TaskStatus,
        value: String(
          tasks.filter((task) => task.status === "In Progress").length,
        ),
        icon: <Wrench size={22} strokeWidth={2.4} />,
        color:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
      },
      {
        title: "Completed" as TaskStatus,
        value: String(
          tasks.filter((task) => task.status === "Completed").length,
        ),
        icon: <CheckCircle2 size={22} strokeWidth={2.4} />,
        color:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      },
    ],
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !query ||
        task.id.toLowerCase().includes(query) ||
        task.machine.toLowerCase().includes(query) ||
        task.issue.toLowerCase().includes(query) ||
        task.location.toLowerCase().includes(query);

      const matchesStatus =
        taskStatusFilter === "All" || task.status === taskStatusFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, taskStatusFilter, priorityFilter]);

  const closeAllModals = () => {
    setActiveModal(null);
    setSelectedTask(null);
    setSelectedAlert(null);
    setSelectedMachine(null);
    setConfirmTask(null);
  };

  const openListModal = (type: ModalType) => {
    setActiveModal(type);
    setSelectedTask(null);
    setSelectedAlert(null);
    setSelectedMachine(null);
    setConfirmTask(null);
  };

  const handleTaskPrimaryAction = (task: Task) => {
    if (task.status === "Completed") return;
    setConfirmTask(task);
  };

  const confirmTaskStatusChange = async () => {
    if (!confirmTask) return;

    const nextStatus: TaskStatus =
      confirmTask.status === "Pending" ? "In Progress" : "Completed";

    const dbStatus = nextStatus === "Completed" ? "Closed" : nextStatus;

    try {
      setIsLoading(true);
      await maintenanceService.updateLog(
        (confirmTask as any).realId || confirmTask.id,
        {
          status: dbStatus,
        },
      );
      toast.success(
        confirmTask.status === "Pending"
          ? "Task started successfully"
          : "Task completed successfully",
      );
      await loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setIsLoading(false);
      setConfirmTask(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] sm:p-6 lg:p-8">
      <div className="w-full max-w-none space-y-6 px-2 sm:px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

            {/* Top Right Glow */}
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

            {/* Bottom Left Glow */}
            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

            {/* Center Glow */}
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

            {/* Premium Highlight */}
            <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

            <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <Activity size={14} />
                  Predictive Maintenance Control
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Artisans Operations Dashboard
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Monitor live maintenance tasks, machine health predictions,
                  component risk analysis, maintenance schedules and operational
                  response activities from a centralized Artisans Operations
                  dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
            {stats.map((item) => (
              <button
                type="button"
                key={item.title}
                onClick={() => openListModal(item.type)}
                className="
                 group
                 flex
                 h-[150px]
                 w-full
                 items-center
                 justify-between
                 rounded-2xl
                 border
                 border-slate-200
                 bg-slate-50
                 px-6
                 py-5
                 text-left
                 transition-all
                 duration-300
                hover:-translate-y-1
                 hover:border-blue-300
                hover:bg-white
               hover:shadow-lg
               dark:border-slate-800
                dark:bg-[#101f33]
               dark:hover:border-blue-500/50
                   dark:hover:bg-[#12243b]
                 "
              >
                {/* Left Icon */}
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${item.color}`}
                >
                  {item.icon}
                </div>

                {/* Right Content */}
                <div className="flex flex-col items-end text-right">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {item.title}
                  </p>

                  <h2 className="mt-3 text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                    {item.value}
                  </h2>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full pb-6">
          <div className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101f33]">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              {/* Title */}
              <div className="max-w-xl">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Machine Health Summary
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Real-time health analytics of assigned machines
                </p>
              </div>

              {/* Stats */}
              <div className="grid w-full grid-cols-3 gap-3 lg:max-w-[480px]">
                <div className="rounded-2xl border border-green-200 bg-green-50 px-3 py-3 text-center dark:border-green-500/30 dark:bg-green-500/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600 whitespace-nowrap">
                    healthy
                  </p>

                  <h3 className="mt-1 text-2xl font-extrabold leading-none text-green-700 dark:text-green-300">
                    {fleetStats.healthy}
                  </h3>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600">
                    Warning
                  </p>

                  <h3 className="mt-1 text-2xl font-extrabold leading-none text-amber-700 dark:text-amber-300">
                    {fleetStats.Warning}
                  </h3>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-center dark:border-red-500/30 dark:bg-red-500/10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-600">
                    Critical
                  </p>

                  <h3 className="mt-1 text-2xl font-extrabold leading-none text-red-700 dark:text-red-300">
                    {fleetStats.critical}
                  </h3>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="w-full overflow-hidden rounded-2xl">
              {chartOption && (
                <ReactECharts
                  option={chartOption}
                  style={{
                    height: "380px",
                    width: "100%",
                  }}
                  onChartReady={(chart) => {
                    chart.off("click");

                    chart.on("click", (params) => {
                      (window as any).chartClickHandler(params, chart);
                    });
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {tasks.filter((t) => t.status !== "Completed").length > 0 &&
          (() => {
            const openTasks = tasks.filter((t) => t.status !== "Completed");
            const tasksWithDays = openTasks
              .map((t) => {
                const dueTime = new Date(t.dueDate).getTime();
                const todayTime = new Date().setHours(0, 0, 0, 0);
                const diffDays = Math.ceil(
                  (dueTime - todayTime) / (1000 * 60 * 60 * 24),
                );
                return { ...t, daysRemaining: diffDays };
              })
              .sort((a, b) => a.daysRemaining - b.daysRemaining);

            const nearestTask = tasksWithDays[0];
            if (!nearestTask) return null;

            const isOverdue = nearestTask.daysRemaining < 0;
            const isDueToday = nearestTask.daysRemaining === 0;

            return (
              <div
                className={`overflow-hidden rounded-2xl border p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all hover:shadow-md ${
                  isOverdue
                    ? "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                    : isDueToday
                      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      isOverdue
                        ? "bg-red-500/20 text-red-600 dark:text-red-300"
                        : isDueToday
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                          : "bg-blue-500/20 text-blue-600 dark:text-blue-300"
                    }`}
                  >
                    <Clock size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wider">
                      Urgent Task Deadline Tracker
                    </h4>
                    <p className="text-xs font-semibold mt-1 opacity-90">
                      Task <span className="font-bold">{nearestTask.id}</span> (
                      {nearestTask.machine} - {nearestTask.issue}) is
                      {isOverdue
                        ? ` Overdue by ${Math.abs(nearestTask.daysRemaining)} days!`
                        : isDueToday
                          ? " Due Today!"
                          : ` due in ${nearestTask.daysRemaining} days (${nearestTask.dueDate}).`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest border ${
                      isOverdue
                        ? "border-red-500/30 bg-red-500/15"
                        : isDueToday
                          ? "border-amber-500/30 bg-amber-500/15"
                          : "border-blue-500/30 bg-blue-500/15"
                    }`}
                  >
                    {isOverdue
                      ? "Overdue"
                      : isDueToday
                        ? "Due Today"
                        : `${nearestTask.daysRemaining} Days Left`}
                  </span>
                </div>
              </div>
            );
          })()}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel className="xl:col-span-7">
            <PanelHeader
              title="Today’s Tasks"
              actionLabel="View All"
              onAction={() => openListModal("tasks")}
            />

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800">
                    <th className="px-3 py-3 font-bold">Machine</th>
                    <th className="px-3 py-3 font-bold">Issue</th>
                    <th className="px-3 py-3 font-bold">Assigned</th>
                    <th className="px-3 py-3 font-bold">Due Date</th>
                    <th className="px-3 py-3 font-bold">Priority</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-3 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-12 text-center">
                        <Loader2
                          size={36}
                          className="animate-spin mx-auto text-blue-500"
                        />
                        <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                          Loading assigned tasks...
                        </p>
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400"
                      >
                        No assigned tasks found.
                      </td>
                    </tr>
                  ) : (
                    tasks.slice(0, 3).map((task) => (
                      <tr
                        key={task.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-4 text-sm font-extrabold text-slate-950 dark:text-white">
                          {task.machine}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                          {task.issue}
                        </td>
                        <td className="px-3 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                          {task.assignedDate}
                        </td>
                        <td className="px-3 py-4 text-sm font-extrabold text-orange-600 dark:text-orange-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={14} className="text-orange-500" />
                            {task.dueDate}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <Badge className={priorityClass(task.priority)}>
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="px-3 py-4">
                          <Badge className={statusClass(task.status)}>
                            {task.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTask(task)}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                          >
                            View <Eye size={14} strokeWidth={2.4} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2
                    size={36}
                    className="animate-spin mx-auto text-blue-500"
                  />
                  <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    Loading assigned tasks...
                  </p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                  No assigned tasks found.
                </div>
              ) : (
                tasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-slate-950 dark:text-white">
                          {task.machine}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {task.issue}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className="h-fit rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:text-blue-300"
                      >
                        View
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className={priorityClass(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={statusClass(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel className="xl:col-span-5">
            <PanelHeader
              title="Critical Alerts"
              actionLabel="View All"
              onAction={() => openListModal("alerts")}
            />

            <div className="space-y-3">
              {alertsState.slice(0, 3).map((alert) => (
                <button
                  type="button"
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-red-300 hover:bg-red-50/60 dark:border-slate-800 dark:bg-white/[0.03] dark:hover:border-red-500/40 dark:hover:bg-red-500/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-lg border ${
                        alert.severity === "Critical"
                          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                          : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      }`}
                    >
                      <AlertTriangle size={22} strokeWidth={2.4} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
                        {alert.machine}
                      </h3>
                      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {alert.issue}
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-xs font-bold text-slate-400">
                    {alert.time}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="xl:col-span-6">
            <PanelHeader
              title="Maintenance Status"
              actionLabel="View All"
              onAction={() => openListModal("maintenance")}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {maintenance.map((item) => (
                <button
                  type="button"
                  key={item.title}
                  onClick={() => {
                    setTaskStatusFilter(item.title);
                    openListModal("maintenance");
                  }}
                  className={`rounded-xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${item.color}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em]">
                        {item.title}
                      </p>
                      <h3 className="mt-3 text-3xl font-extrabold tracking-tight">
                        {item.value}
                      </h3>
                    </div>
                    {item.icon}
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="xl:col-span-6">
            <PanelHeader
              title="Machine Health Summary"
              actionLabel="View All"
              onAction={() => openListModal("machines")}
            />

            <div className="space-y-4">
              {machineHealthState.map((item) => (
                <button
                  type="button"
                  key={item.machine}
                  onClick={() => setSelectedMachine(item)}
                  className="w-full rounded-xl border border-transparent p-3 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-white/[0.03]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {item.machine}
                    </p>
                    <p
                      className={`text-sm font-extrabold ${healthTextColor(
                        item.health,
                      )}`}
                    >
                      {item.health}%
                    </p>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${healthColor(
                        item.health,
                      )}`}
                      style={{ width: `${item.health}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {activeModal && (
        <PortalModal>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 p-5 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    {activeModal === "tasks" && "All Artisans Tasks"}
                    {activeModal === "alerts" && "All Critical Alerts"}
                    {activeModal === "maintenance" && "Maintenance Tasks"}
                    {activeModal === "machines" && "Assigned Machines"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Click any item to view complete details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeAllModals}
                  className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>

              {(activeModal === "tasks" || activeModal === "maintenance") && (
                <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="relative">
                      <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search task, machine, location..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      />
                    </div>

                    <div className="relative">
                      <Filter
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        value={taskStatusFilter}
                        onChange={(event) =>
                          setTaskStatusFilter(
                            event.target.value as TaskStatus | "All",
                          )
                        }
                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="relative">
                      <Filter
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <select
                        value={priorityFilter}
                        onChange={(event) =>
                          setPriorityFilter(
                            event.target.value as Priority | "All",
                          )
                        }
                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
                      >
                        <option value="All">All Priority</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-[62vh] overflow-y-auto p-5">
                {(activeModal === "tasks" || activeModal === "maintenance") && (
                  <div className="space-y-3">
                    {filteredTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <Info className="mx-auto text-slate-400" size={34} />
                        <h3 className="mt-3 font-extrabold text-slate-950 dark:text-white">
                          No tasks found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Try changing your search or filter.
                        </p>
                      </div>
                    ) : (
                      filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]"
                        >
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-extrabold text-slate-950 dark:text-white">
                                  {task.machine}
                                </h3>
                                <Badge className={priorityClass(task.priority)}>
                                  {task.priority}
                                </Badge>
                                <Badge className={statusClass(task.status)}>
                                  {task.status}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {task.issue}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {task.id} • {task.location} • Due:{" "}
                                {task.dueDate}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedTask(task)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                              >
                                <Eye size={15} />
                                View
                              </button>

                              <button
                                type="button"
                                disabled={task.status === "Completed"}
                                onClick={() => handleTaskPrimaryAction(task)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                              >
                                {task.status === "Pending" && (
                                  <PlayCircle size={15} />
                                )}
                                {task.status === "In Progress" && (
                                  <CheckCircle size={15} />
                                )}
                                {getTaskActionLabel(task.status)}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeModal === "alerts" && (
                  <div className="space-y-3">
                    {alertsState.map((alert) => (
                      <button
                        type="button"
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-red-300 hover:bg-red-50/60 dark:border-slate-800 dark:bg-white/[0.03] dark:hover:bg-red-500/10"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <h3 className="font-extrabold text-slate-950 dark:text-white">
                              {alert.machine}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {alert.issue}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {alert.id} • {alert.location}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge
                              className={
                                alert.severity === "Critical"
                                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                              }
                            >
                              {alert.severity}
                            </Badge>
                            <span className="text-xs font-bold text-slate-400">
                              {alert.time}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "machines" && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {machineHealthState.map((machine) => (
                      <button
                        type="button"
                        key={machine.id}
                        onClick={() => setSelectedMachine(machine)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-white/[0.03] dark:hover:bg-blue-500/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-extrabold text-slate-950 dark:text-white">
                              {machine.machine}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {machine.location}
                            </p>
                          </div>

                          <span
                            className={`text-xl font-extrabold ${healthTextColor(
                              machine.health,
                            )}`}
                          >
                            {machine.health}%
                          </span>
                        </div>

                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${healthColor(
                              machine.health,
                            )}`}
                            style={{ width: `${machine.health}%` }}
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                          <SmallMetric
                            label="Runtime"
                            value={machine.runtime}
                          />
                          <SmallMetric
                            label="Engine"
                            value={machine.engineTemp}
                          />
                          <SmallMetric
                            label="Hydraulic"
                            value={machine.hydraulicPressure}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </PortalModal>
      )}

      {selectedTask && (
        <PortalModal>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
              <ModalTitle
                title="Task Details"
                subtitle={selectedTask.id}
                onClose={() => setSelectedTask(null)}
              />

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
                  <h3 className="font-extrabold text-slate-950 dark:text-white">
                    {selectedTask.machine}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedTask.issue}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={priorityClass(selectedTask.priority)}>
                      {selectedTask.priority}
                    </Badge>
                    <Badge className={statusClass(selectedTask.status)}>
                      {selectedTask.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoCard label="Location" value={selectedTask.location} />
                  <InfoCard
                    label="Assigned Date"
                    value={selectedTask.assignedDate}
                  />
                  <InfoCard label="Due Date" value={selectedTask.dueDate} />
                  <InfoCard
                    label="Current Status"
                    value={selectedTask.status}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Description
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    disabled={selectedTask.status === "Completed"}
                    onClick={() => handleTaskPrimaryAction(selectedTask)}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  >
                    {getTaskActionLabel(selectedTask.status)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PortalModal>
      )}

      {selectedAlert && (
        <PortalModal>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
              <ModalTitle
                title="Alert Details"
                subtitle={selectedAlert.id}
                onClose={() => setSelectedAlert(null)}
              />

              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={24} strokeWidth={2.4} />
                  <div>
                    <h3 className="font-extrabold">{selectedAlert.machine}</h3>
                    <p className="text-sm font-semibold">
                      {selectedAlert.issue}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard label="Severity" value={selectedAlert.severity} />
                <InfoCard label="Time" value={selectedAlert.time} />
                <InfoCard label="Location" value={selectedAlert.location} />
                <InfoCard label="Machine" value={selectedAlert.machine} />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                  Recommendation
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {selectedAlert.recommendation}
                </p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        </PortalModal>
      )}

      {selectedMachine && (
        <PortalModal>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
              <ModalTitle
                title="Machine Health Details"
                subtitle={selectedMachine.id}
                onClose={() => setSelectedMachine(null)}
              />

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-white/[0.03]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                      {selectedMachine.machine}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {selectedMachine.location}
                    </p>
                  </div>

                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-slate-200 bg-white dark:border-slate-800 dark:bg-[#101f33]">
                    <span
                      className={`text-xl font-extrabold ${healthTextColor(
                        selectedMachine.health,
                      )}`}
                    >
                      {selectedMachine.health}%
                    </span>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${healthColor(
                      selectedMachine.health,
                    )}`}
                    style={{ width: `${selectedMachine.health}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricCard
                  icon={<Clock size={20} />}
                  label="Runtime"
                  value={selectedMachine.runtime}
                />
                <MetricCard
                  icon={<Gauge size={20} />}
                  label="Engine Temp"
                  value={selectedMachine.engineTemp}
                />
                <MetricCard
                  icon={<Activity size={20} />}
                  label="Hydraulic"
                  value={selectedMachine.hydraulicPressure}
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMachine(null)}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </PortalModal>
      )}

      {confirmTask && (
        <PortalModal>
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                {confirmTask.status === "Pending" ? (
                  <PlayCircle size={28} />
                ) : (
                  <CheckCircle size={28} />
                )}
              </div>

              <h2 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">
                {confirmTask.status === "Pending"
                  ? "Start this task?"
                  : "Complete this task?"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Are you sure you want to update{" "}
                <span className="font-extrabold text-slate-950 dark:text-white">
                  {confirmTask.machine}
                </span>{" "}
                task status?
              </p>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmTask(null)}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmTaskStatusChange}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  Yes, Confirm
                </button>
              </div>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

function PortalModal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] ${className}`}
    >
      {children}
    </div>
  );
}

function PanelHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-base font-extrabold uppercase tracking-[0.12em] text-slate-900 dark:text-white">
        {title}
      </h2>
      <button
        type="button"
        onClick={onAction}
        className="text-sm font-bold text-blue-700 hover:text-blue-800 dark:text-blue-300"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function ModalTitle({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          {icon}
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-sm font-extrabold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#101f33]">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-extrabold text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
