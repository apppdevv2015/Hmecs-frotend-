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
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { fleetService } from "../../services/Fleet/fleetService";
import { componentService } from "../../services/companyadmin/componentService";
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

const taskTrendData = [
  { day: "Mon", completed: 8, pending: 4 },
  { day: "Tue", completed: 10, pending: 5 },
  { day: "Wed", completed: 13, pending: 3 },
  { day: "Thu", completed: 11, pending: 6 },
  { day: "Fri", completed: 15, pending: 4 },
  { day: "Sat", completed: 17, pending: 3 },
  { day: "Sun", completed: 14, pending: 2 },
];

const recentActivities: ActivityItem[] = [
  {
    title: "Operator assigned",
    description: "Operator assigned to Excavator EX-204 for daily operation.",
    time: "08:45 AM",
    icon: HardHat,
    tone: "blue",
  },
  {
    title: "Alert reviewed",
    description: "Hydraulic pressure warning was reviewed and marked for action.",
    time: "09:20 AM",
    icon: AlertTriangle,
    tone: "red",
  },
  {
    title: "Task updated",
    description: "Maintenance task moved from Pending to In Progress.",
    time: "10:10 AM",
    icon: Wrench,
    tone: "amber",
  },
  {
    title: "Inspection submitted",
    description: "Daily machine inspection checklist submitted successfully.",
    time: "11:05 AM",
    icon: ClipboardCheck,
    tone: "green",
  },
];

const alertColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

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
  if (health >= 85) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    };
  }
  if (health >= 70) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
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
        <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
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
            <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
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
          <Icon className={`h-4.5 w-4.5 ${iconClass}`} style={{ width: 18, height: 18 }} />
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        {subtitle && (
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupervisorDashboard() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const [loading, setLoading] = useState(false);

  const [fleetMachines, setFleetMachines] = useState<any[]>([]);

  const [components, setComponents] = useState<any[]>([]);

  const dispatch = useDispatch<AppDispatch>();

  const { machines, loading: machineLoading } = useSelector((state: RootState) => state.machine);

  const componentData = Array.isArray(components) ? components : [];

  const stats: StatCard[] = [
    {
      title: "Assigned Machines",

      value: machines?.length?.toString() || "0",

      description: "Machines currently under supervisor monitoring.",

      icon: Truck,

      badge: `${machines.length} Assigned`,

      tone: "blue",
    },

    {
      title: "Active Operators",

      value: fleetMachines?.filter((machine) => machine?.operator?.name)?.length?.toString() || "0",

      description: "Operators actively assigned to field machines.",

      icon: UsersRound,

      badge: "Live",

      tone: "green",
    },

    {
      title: "Pending Tasks",

      value: componentData.filter((component) => component?.condition < 70).length.toString(),

      description: "Maintenance tasks waiting for supervisor action.",

      icon: Clock,

      badge: "Needs review",

      tone: "amber",
    },

    {
      title: "Critical Alerts",

      value:
        fleetMachines?.filter((machine) => machine?.status === "Critical")?.length?.toString() ||
        "0",

      description: "High-priority alerts requiring immediate attention.",

      icon: AlertTriangle,

      badge: "Urgent",

      tone: "red",
    },
  ];

  const machineHealth: MachineHealthItem[] = machines.map((machine: any) => {
    const fleetMachine = fleetMachines.find(
      (fleet: any) => fleet.machineName === machine.name || fleet.machineId === machine.machineId,
    );

    const components = machine.components || [];

    let health = 0;

    if (components.length > 0) {
      const totalHealth = components.reduce((sum: number, component: any) => {
        const condition = Number(component?.condition ?? 3);

        const safeCondition = Math.max(1, Math.min(5, condition));

        // 1–5 ko 20–100 me convert
        return sum + safeCondition * 20;
      }, 0);

      health = Math.round(totalHealth / components.length);
    }

    return {
      machine: machine.name || "Unknown Machine",

      status:
        fleetMachine?.status || (health >= 85 ? "Healthy" : health >= 70 ? "Warning" : "Critical"),

      health,

      operator: fleetMachine?.operator?.name || "Unassigned",
    };
  });

  const [machinePage, setMachinePage] = useState(1);

  const ITEMS_PER_PAGE = 5;

  const totalItems = machineHealth.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const startIndex = (machinePage - 1) * ITEMS_PER_PAGE;

  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedMachineHealth = machineHealth.slice(startIndex, endIndex);

  const startItem = totalItems === 0 ? 0 : (machinePage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(machinePage * ITEMS_PER_PAGE, totalItems);

  useEffect(() => {
    if (machinePage < 1) {
      setMachinePage(1);
    }

    if (machinePage > totalPages) {
      setMachinePage(totalPages);
    }
  }, [machinePage, totalPages]);

  const machinePerformanceData = fleetMachines.map((machine: any) => ({
    name: machine.machineName || "Unknown",

    health: machine.healthPercent || 0,
  }));

  const alertPriorityData = [
    {
      name: "Healthy",

      value: fleetMachines.filter((machine: any) => machine.status === "Healthy").length,
    },

    {
      name: "Warning",

      value: fleetMachines.filter((machine: any) => machine.status === "Warning").length,
    },

    {
      name: "Critical",

      value: fleetMachines.filter((machine: any) => machine.status === "Critical").length,
    },
  ];

  const maintenanceSummary: MaintenanceItem[] = [
    {
      label: "Pending",

      value: componentData.filter((component: any) => component.condition < 50).length,

      icon: Clock,

      percentage:
        components.length > 0
          ? Math.round(
              (componentData.filter((component: any) => component.condition < 50).length /
                components.length) *
                100,
            )
          : 0,
    },

    {
      label: "In Progress",

      value: componentData.filter(
        (component: any) => component.condition >= 50 && component.condition < 80,
      ).length,

      icon: Wrench,

      percentage:
        components.length > 0
          ? Math.round(
              (componentData.filter(
                (component: any) => component.condition >= 50 && component.condition < 80,
              ).length /
                components.length) *
                100,
            )
          : 0,
    },

    {
      label: "Completed",

      value: componentData.filter((component: any) => component.condition >= 80).length,

      icon: CheckCircle2,

      percentage:
        components.length > 0
          ? Math.round(
              (componentData.filter((component: any) => component.condition >= 80).length /
                components.length) *
                100,
            )
          : 0,
    },
  ];

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Redux machine API
      dispatch(fetchMachines());

      // Other APIs
      const [fleetRes, componentsRes] = await Promise.all([
        fleetService.getFleetMachines("company_admin"),

        componentService.getComponents(),
      ]);

      console.log("Fleet:", fleetRes);

      console.log("Components:", componentsRes);

      setFleetMachines(Array.isArray(fleetRes) ? fleetRes : []);

      const response: any = componentsRes;

      let componentList: any[] = [];

      if (Array.isArray(response)) {
        componentList = response;
      } else if (Array.isArray(response?.data)) {
        componentList = response.data;
      } else if (Array.isArray(response?.components)) {
        componentList = response.components;
      }

      setComponents(componentList);

      setComponents(componentList);
    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const axisTickStyle = {
    fontSize: 11,
    fill: dark ? "#94a3b8" : "#64748b",
    fontFamily: "Inter, sans-serif",
  };

  const gridStroke = dark ? "#1e293b" : "#f1f5f9";

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] dark:bg-[#0a0f1e]">
      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
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

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Supervisor Dashboard
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Monitor assigned machines, operator activity, task progress, machine health, and
                  critical alerts from one centralized operations control center.
                </p>
              </div>

              {/* Right Metrics */}
              <div className="grid grid-cols-2 gap-4 sm:min-w-[360px]">
                {[
                  {
                    icon: Gauge,
                    label: "Overall Health",
                    value: "84%",
                    sub: "Fleet condition score",
                    iconColor: "text-blue-300",
                  },
                  {
                    icon: BatteryCharging,
                    label: "Uptime",
                    value: "96.8%",
                    sub: "Operational availability",
                    iconColor: "text-emerald-300",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="
              rounded-2xl
              border
              border-white/15
              bg-white/10
              p-4
              backdrop-blur-md
              transition-all
              duration-300
              hover:-translate-y-1
              hover:bg-white/15
              hover:shadow-xl
            "
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                      <m.icon className={`h-4 w-4 ${m.iconColor}`} />
                      {m.label}
                    </div>

                    <p className="mt-3 text-3xl font-black tracking-tight text-white">{m.value}</p>

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
                          ? "72%"
                          : item.tone === "green"
                            ? "80%"
                            : item.tone === "amber"
                              ? "22%"
                              : "12%",
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
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={taskTrendData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
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
                  <CartesianGrid strokeDasharray="2 4" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axisTickStyle} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTickStyle} />
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
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">{l.label}</span>
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
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
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
                        backgroundColor: alertColors[index % alertColors.length],
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
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={machinePerformanceData}
                  margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                  barSize={32}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={axisTickStyle} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTickStyle} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="health" name="Health %" radius={[6, 6, 0, 0]}>
                    {machinePerformanceData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.health >= 85
                            ? "#10b981"
                            : entry.health >= 70
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

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Machine Status List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424]">
            <SectionHeader
              icon={Truck}
              title="Assigned Machine Status"
              subtitle="Machine-wise health and assigned operator details"
            />
            <div className="space-y-3">
              {paginatedMachineHealth.map((item, index) => {
                const style = getHealthStyle(item.health);
                return (
                  <div
                    key={`${item.machine}-${index}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                          {item.machine}
                        </h4>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Operator: {item.operator}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}
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
                        className={`min-w-[38px] text-right text-[12px] font-semibold ${style.text}`}
                      >
                        {item.health}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              currentPage={machinePage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={totalItems}
              onPrev={() => setMachinePage((prev) => Math.max(prev - 1, 1))}
              onNext={() => setMachinePage((prev) => Math.min(prev + 1, totalPages))}
            />
          </div>

          {/* Activity Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1424]">
            <SectionHeader icon={Activity} title="Recent Supervisor Activity" />
            <div className="relative space-y-3">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                const tone = toneConfig[activity.tone];
                return (
                  <div key={activity.title} className="relative flex gap-3">
                    {index !== recentActivities.length - 1 && (
                      <div className="absolute left-[15px] top-9 h-full w-px bg-slate-100 dark:bg-slate-800" />
                    )}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[12px] font-semibold text-slate-900 dark:text-white">
                          {activity.title}
                        </h4>
                        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                          {activity.time}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Bottom Quick Action Cards ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: Settings2,
              label: "Operational Control",
              desc: "Track machines, operators, and daily field performance.",
              bg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
            },
            {
              icon: CheckCircle2,
              label: "Task Verification",
              desc: "Review inspections, approvals, and maintenance progress.",
              bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
            },
            {
              icon: CircleDot,
              label: "Alert Monitoring",
              desc: "Identify critical risks before machine downtime happens.",
              bg: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-[#0d1424]"
            >
              <div className={`rounded-xl p-3 ${card.bg}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                  {card.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
