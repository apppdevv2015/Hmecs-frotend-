import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { machineService } from "../../services/companyadmin/machineService";
// import { fleetService } from "../../services/Fleet/fleetService";

import tyreImg from "../../assets/images/landingpageimages/FleetLogo/TyreLogo.png";
import engineImg from "../../assets/images/landingpageimages/FleetLogo/Engine.png";
import hydraulicImg from "../../assets/images/landingpageimages/FleetLogo/hydraulic.png";
import suspensionImg from "../../assets/images/landingpageimages/FleetLogo/suspension.png";

import ReactECharts from "echarts-for-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Truck,
  Search,
  RefreshCcw,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  Download,
  Eye,
  X,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  MapPin,
  Clock,
  User,
  Activity,
  Filter,
  ChevronDown,
  BarChart2,
  Building2,
} from "lucide-react";

/* ==========================================================
   TYPES
========================================================== */

type FleetStatus = "Healthy" | "Warning" | "Critical";

type FleetStats = {
  totalMachines: number;
  healthy: number;
  maintenance: number;
  critical: number;
};

type ComponentStatus = "ok" | "warn" | "crit" | "none";

type SubMetric = {
  label: string;
  value: string;
};
type InspectionParameter = {
  name: string;
  unit: string;
  safeMax: number;
  safeMin: number;
  defaultVal: number;
  description: string;
};

type MachineComponent = {
  id: string;
  name: string;
  category: string;
  healthScore: number;
  condition: number;
  serialNumber: string;
  inspectionParameters: InspectionParameter[];
};

type FleetMachine = {
  id: string;
  machine: string;
  company: string;
  companyId: string;
  fleet: string;
  operator: string;
  location: string;
  type: string;
  healthPercent: number;
  status: FleetStatus;
  components: MachineComponent[];
};

type Company = {
  id: string;
  companyName: string;
  companyCode: string;
};

/* ==========================================================
   HEATMAP TYPES
========================================================== */

type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

interface HeatmapDataPoint {
  fleetIndex: number;
  componentIndex: number;
  healthScore: number;
}

const COMPONENT_ICON_MAP: Record<string, any> = {
  TYRE: tyreImg,
  ENGINE: engineImg,
  HYDRAULIC: hydraulicImg,
  HYDRAULICS: hydraulicImg,
  SUSPENSION: suspensionImg,
};

/* ==========================================================
   CATEGORY TABS
========================================================== */

const CATEGORY_TABS = [
  "All Equipment",
  "Excavators",
  "Trucks",
  "Dozers",
  "Graders",
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number];

/* ==========================================================
   HEATMAP HELPERS
========================================================== */

const HEALTH_THRESHOLDS = { HEALTHY: 70, WARNING: 40 } as const;

function getHealthStatus(score: number): HealthStatus {
  if (score >= HEALTH_THRESHOLDS.HEALTHY) return "HEALTHY";
  if (score >= HEALTH_THRESHOLDS.WARNING) return "WARNING";
  return "CRITICAL";
}

interface PaletteStop {
  fill: string;
  badgeBg: string;
  badgeText: string;
}

const PALETTE: Record<HealthStatus, { light: PaletteStop; dark: PaletteStop }> =
  {
    HEALTHY: {
      light: { fill: "#3b6d11", badgeBg: "#eaf3de", badgeText: "#3b6d11" },
      dark: { fill: "#2d6a4f", badgeBg: "#0a2e1f", badgeText: "#5dcaa5" },
    },
    WARNING: {
      light: { fill: "#854f0b", badgeBg: "#faeeda", badgeText: "#854f0b" },
      dark: { fill: "#7a4a00", badgeBg: "#2e1e00", badgeText: "#ef9f27" },
    },
    CRITICAL: {
      light: { fill: "#a32d2d", badgeBg: "#fcebeb", badgeText: "#a32d2d" },
      dark: { fill: "#7a1f1f", badgeBg: "#2e0a0a", badgeText: "#f09595" },
    },
  };

function resolvePalette(score: number, isDark: boolean): PaletteStop {
  const status = getHealthStatus(score);
  return isDark ? PALETTE[status].dark : PALETTE[status].light;
}

/* ==========================================================
   HEATMAP OPTION BUILDER
========================================================== */

function buildHeatmapOption(
  components: string[],
  fleets: string[],
  data: HeatmapDataPoint[],
  isDark: boolean,
) {
  const seriesData = data.map(
    ({ fleetIndex, componentIndex, healthScore }) =>
      [componentIndex, fleetIndex, healthScore] as [number, number, number],
  );

  const bg = isDark ? "#0f1117" : "#ffffff";
  const textPrimary = isDark ? "#e8e6e1" : "#1e1e1e";
  const textMuted = isDark ? "#6b6b72" : "#888780";
  const borderLine = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cellBorder = isDark ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)";
  const monoStack =
    "'ui-monospace','SF Mono','Cascadia Code','JetBrains Mono',monospace";
  const sansStack = "'Inter','Segoe UI',system-ui,sans-serif";

  const tooltipFormatter = (params: {
    value: [number, number, number];
  }): string => {
    const [cIdx, fIdx, score] = params.value;
    const fleetName = fleets[fIdx] ?? "Unknown Fleet";
    const compName = (components[cIdx] ?? "COMP").toUpperCase();
    const status = getHealthStatus(score);
    const palette = resolvePalette(score, isDark);

    return `
      <div style="
        font-family: ${sansStack};
        padding: 10px 14px;
        background: ${bg};
        border: 1px solid ${borderLine};
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
        min-width: 170px;
      ">
        <div style="
          font-family: ${monoStack};
          font-size: 13px;
          font-weight: 700;
          color: ${textPrimary};
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        ">
          ${fleetName} &bull; ${compName}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <span style="
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 999px;
            background: ${palette.badgeBg};
            color: ${palette.badgeText};
            letter-spacing: 0.06em;
          ">
            ${status}
          </span>
          <span style="
            font-family: ${monoStack};
            font-size: 15px;
            font-weight: 700;
            color: ${palette.fill};
          ">
            ${score}%
          </span>
        </div>
      </div>
    `;
  };

  return {
    backgroundColor: bg,
    animation: true,
    animationDuration: 600,

    grid: {
      top: 16,
      bottom: 40,
      left: 100,
      right: 56,
      containLabel: false,
    },

    tooltip: {
      trigger: "item",
      padding: 0,
      borderWidth: 0,
      backgroundColor: "transparent",
      shadowBlur: 0,
      formatter: tooltipFormatter,
    },

    xAxis: {
      type: "category",
      data: components,
      position: "bottom",
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontFamily: monoStack,
        fontSize: 10,
        fontWeight: 600,
        color: textMuted,
        margin: 12,
      },
    },

    yAxis: {
      type: "category",
      data: fleets,
      inverse: true,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontFamily: monoStack,
        fontSize: 10,
        fontWeight: 600,
        color: textMuted,
        margin: 14,
      },
    },

    visualMap: {
      type: "continuous",
      min: 0,
      max: 100,
      calculable: false,
      show: true,
      right: 10,
      top: "center",
      itemHeight: 140,
      itemWidth: 10,
      inRange: {
        color: ["#a32d2d", "#854f0b", "#3b6d11"],
      },
      text: ["100%", "0%"],
      textStyle: {
        fontFamily: monoStack,
        fontSize: 9,
        color: textMuted,
      },
    },

    series: [
      {
        name: "Component Health",
        type: "heatmap",
        data: seriesData,
        label: {
          show: true,
          fontFamily: monoStack,
          fontSize: 9,
          fontWeight: 700,
          color: "rgba(255,255,255,0.85)",
          formatter: (p: { value: [number, number, number] }) =>
            `${p.value[2]}%`,
        },
        itemStyle: {
          borderRadius: 5,
          borderWidth: 3,
          borderColor: cellBorder,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.35)",
            borderWidth: 2,
            borderColor: isDark ? "#ffffff" : "#1e1e1e",
          },
        },
      },
    ],
  };
}

/* ==========================================================
   MAIN ARTISANS FLEET COMPONENT MONITORING DASHBOARD
========================================================== */

export default function ArtisansFleetHeat() {
  const [fleetTable, setFleetTable] = useState<FleetMachine[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Healthy" | "Warning" | "Critical"
  >("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>("All Equipment");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  const companies: Company[] = useMemo(() => {
    const map = new Map<string, Company>();
    fleetTable.forEach((m) => {
      if (m.companyId && !map.has(m.companyId)) {
        map.set(m.companyId, {
          id: m.companyId,
          companyName: m.company,
          companyCode: "",
        });
      }
    });
    return Array.from(map.values());
  }, [fleetTable]);

  // Modal State
  const [selectedMachine, setSelectedMachine] = useState<FleetMachine | null>(
    null,
  );
  const [openModal, setOpenModal] = useState(false);

  // Selected Machine for Component Health Overview cards above the table
  const [overviewMachine, setOverviewMachine] = useState<FleetMachine | null>(null);

  const chartRef = useRef<any>(null);
  const heatmapFleets = useMemo(
    () => fleetTable.map((m) => m.fleet),
    [fleetTable],
  );

  // Real component categories jo bhi backend se aayein, unhi ko x-axis banao
  const heatmapComponentNames = useMemo(() => {
    const names = new Set<string>();
    fleetTable.forEach((m) =>
      m.components.forEach((c) => names.add(c.category)),
    );
    return Array.from(names);
  }, [fleetTable]);

  const heatmapData = useMemo(() => {
    const points: HeatmapDataPoint[] = [];
    fleetTable.forEach((m, fi) => {
      m.components.forEach((c) => {
        const ci = heatmapComponentNames.indexOf(c.category);
        if (ci === -1) return;
        points.push({
          fleetIndex: fi,
          componentIndex: ci,
          healthScore: c.healthScore,
        });
      });
    });
    return points;
  }, [fleetTable, heatmapComponentNames]);

  /* ── Dark-mode detection ── */
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const heatMapOption = useMemo(
    () =>
      buildHeatmapOption(
        heatmapComponentNames,
        heatmapFleets,
        heatmapData,
        isDark,
      ),
    [heatmapData, heatmapFleets, heatmapComponentNames, isDark],
  );

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await machineService.getAllAssignedMachines();
      const rawMachines: any[] = Array.isArray(res) ? res : res?.data || [];

      const mappedMachines: FleetMachine[] = rawMachines.map((m: any) => {
        const healthScore = m.healthScore ?? 0;
        const statusVal: FleetStatus =
          m.status === "Critical"
            ? "Critical"
            : m.status === "Warning"
              ? "Warning"
              : "Healthy";

        const components: MachineComponent[] = Array.isArray(m.components)
          ? m.components.map((c: any) => ({
              id: c.id,
              name: c.name || c.category || "Component",
              category: c.category || c.componentType || "Other",
              healthScore: c.healthScore ?? 0,
              condition: c.condition ?? 0,
              serialNumber: c.serialNumber || "",
              inspectionParameters: Array.isArray(c.inspectionParameters)
                ? c.inspectionParameters
                : [],
            }))
          : [];

        return {
          id: m.machineId,
          machine: m.machineName || m.model || "—",
          company: m.companyName || "—",
          companyId: m.companyId || "",
          fleet: m.serialNumber || "—",
          operator: m.assignedOperatorName || "Unassigned",
          location: m.site || "—",
          type: m.equipmentType || "—",
          healthPercent: healthScore,
          status: statusVal,
          components,
        };
      });

      setFleetTable(mappedMachines);
      setOverviewMachine(mappedMachines.length > 0 ? mappedMachines[0] : null);
    } catch (err) {
      console.error("Unable to load assigned fleet machines.", err);
      setFleetTable([]);
      setOverviewMachine(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ── Filtered Machines ── */
  const filteredFleet = useMemo(() => {
    return fleetTable.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.machine.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.fleet.toLowerCase().includes(q) ||
        item.operator.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesCompany =
        selectedCompanyId === "all" || item.companyId === selectedCompanyId;

      let matchesTab = true;
      if (activeTab !== "All Equipment") {
        const typeLower = item.type.toLowerCase();
        if (activeTab === "Excavators")
          matchesTab =
            typeLower.includes("excavator") || typeLower.includes("pc");
        else if (activeTab === "Trucks")
          matchesTab =
            typeLower.includes("truck") || typeLower.includes("haul");
        else if (activeTab === "Dozers")
          matchesTab = typeLower.includes("dozer") || typeLower.includes("d10");
        else if (activeTab === "Graders")
          matchesTab = typeLower.includes("grader");
      }

      return matchesSearch && matchesStatus && matchesCompany && matchesTab;
    });
  }, [fleetTable, search, statusFilter, selectedCompanyId, activeTab]);

  /* ── Summary Stats ── */
  const stats: FleetStats = useMemo(() => {
    const totalMachines = fleetTable.length;
    const healthy = fleetTable.filter((m) => m.status === "Healthy").length;
    const maintenance = fleetTable.filter((m) => m.status === "Warning").length;
    const critical = fleetTable.filter((m) => m.status === "Critical").length;
    return { totalMachines, healthy, maintenance, critical };
  }, [fleetTable]);

  /* ── PDF Export ── */
  const exportFleetReport = (machines: FleetMachine[]) => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(18);
    doc.text("Artisan Fleet Monitoring Report", 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Machines: ${machines.length}`, 14, 34);

    const headers = [
      ["Machine", "Company", "Fleet ID", "Operator", "Components", "Health"],
    ];

    const rows = machines.map((m) => [
      m.machine,
      m.company,
      m.fleet,
      m.operator,
      m.components.map((c) => `${c.category}: ${c.healthScore}%`).join(", "),
      `${m.healthPercent}%`,
    ]);

    autoTable(doc, {
      startY: 40,
      head: headers,
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`Artisan-Fleet-Report-${Date.now()}.pdf`);
  };

  /* ── Chart Export ── */
  const exportChart = () => {
    if (!chartRef.current) return;
    const echartsInstance = chartRef.current.getEchartsInstance();
    const dataUrl = echartsInstance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: isDark ? "#0f1117" : "#ffffff",
    });

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `Fleet-Health-Heatmap-${Date.now()}.png`;
    link.click();
  };

  const getStatusBadge = (status: FleetStatus) => {
    if (status === "Healthy") {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
    if (status === "Warning") {
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    }
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const renderComponentRing = (comp: MachineComponent) => {
    let color =
      "text-green-500 border-green-500 bg-green-50 dark:bg-green-950/40";
    if (comp.healthScore < 40) {
      color = "text-red-500 border-red-500 bg-red-50 dark:bg-red-950/40";
    } else if (comp.healthScore < 70) {
      color =
        "text-orange-500 border-orange-500 bg-orange-50 dark:bg-orange-950/40";
    }

    return (
      <div className="flex flex-col items-center justify-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[11px] font-black ${color}`}
        >
          {comp.healthScore}%
        </div>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {comp.category}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── HEADER ── */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 shadow-xl">
          <div className="flex flex-col gap-6 px-8 py-7 xl:flex-row xl:items-center xl:justify-between">
            {/* Left Content */}
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                <Truck size={15} className="text-cyan-300" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                  Artisan Fleet Monitoring
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Company Fleet Monitoring
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Monitor all company machines, health status, fleet performance
                and operator activity across every organization from one
                centralized dashboard.
              </p>
            </div>

            {/* Right Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => exportFleetReport(filteredFleet)}
                className="group inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg"
              >
                <Download
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span>Export PDF</span>
              </button>

              <button
                onClick={exportChart}
                className="group inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg"
              >
                <BarChart2
                  size={16}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span>Export Chart</span>
              </button>

              <button
                onClick={fetchDashboard}
                disabled={loading}
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  size={16}
                  className={`${loading ? "animate-spin" : ""} transition-transform duration-300 group-hover:rotate-180`}
                />
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── STATS (4 CARDS) ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Machines",
              value: stats.totalMachines,
              icon: Truck,
              color:
                "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
              trend: null,
            },
            {
              title: "Healthy Machines",
              value: stats.healthy,
              icon: ShieldCheck,
              color:
                "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
              trend: "Fully operational",
            },
            {
              title: "Maintenance",
              value: stats.maintenance,
              icon: Wrench,
              color:
                "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
              trend: "Needs attention",
            },
            {
              title: "Critical Alerts",
              value: stats.critical,
              icon: AlertTriangle,
              color:
                "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
              trend: "Immediate action",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${item.color}`}
                >
                  <Icon size={24} />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {item.title}
                </p>
                <h3 className="mt-1 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  {loading ? (
                    <span className="inline-block h-10 w-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    item.value
                  )}
                </h3>
                {item.trend && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                    <BarChart2 size={11} />
                    {item.trend}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── FLEET CONTROLS BAR ── */}
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Fleet Controls
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Search, filter and manage machines across all companies.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search machine, operator, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 rounded-[20px] border border-slate-200 bg-slate-50 pl-14 pr-5 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 md:w-[320px]"
                />
              </div>

              {/* Company Filter Dropdown */}
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="h-14 min-w-[220px] appearance-none rounded-[20px] border border-slate-200 bg-slate-50 pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown((v) => !v)}
                  className="flex h-14 items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Filter size={16} />
                  {statusFilter === "All" ? "All Status" : statusFilter}
                  <ChevronDown size={14} />
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 top-16 z-50 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {(["All", "Healthy", "Warning", "Critical"] as const).map(
                      (option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setStatusFilter(option);
                            setShowFilterDropdown(false);
                          }}
                          className={`w-full px-5 py-3 text-left text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
                            statusFilter === option
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {option}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── FLEET COMPONENT HEALTH MAP (HEATMAP MATRIX) ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Fleet Component Health Map
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Fleet-wise component health monitoring — hover a cell for
                details.
              </p>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              {[
                {
                  label: "Healthy",
                  bg: "bg-green-100 dark:bg-green-900/30",
                  text: "text-green-700 dark:text-green-400",
                },
                {
                  label: "Warning",
                  bg: "bg-orange-100 dark:bg-orange-900/30",
                  text: "text-orange-700 dark:text-orange-400",
                },
                {
                  label: "Critical",
                  bg: "bg-red-100 dark:bg-red-900/30",
                  text: "text-red-700 dark:text-red-400",
                },
              ].map(({ label, bg, text }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${bg} ${text}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex h-[340px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <RefreshCcw size={24} className="animate-spin" />
                <p className="text-sm">Loading health data…</p>
              </div>
            </div>
          ) : heatmapData.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <BarChart2 size={32} />
                <p className="text-sm">
                  No data available for selected company.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ReactECharts
                ref={chartRef}
                option={heatMapOption}
                style={{ height: "100%", width: "100%" }}
                notMerge
              />
            </div>
          )}
        </div>

        {/* ── COMPONENT HEALTH OVERVIEW CARDS (4 LIVE CARDS FOR SELECTED MACHINE) ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Component Health Overview
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {overviewMachine
                  ? `Showing live component health for ${overviewMachine.machine} (${overviewMachine.company})`
                  : "Select a machine from the table below to see its component health."}
              </p>
            </div>
            {overviewMachine && (
              <button
                onClick={() => {
                  setSelectedMachine(overviewMachine);
                  setOpenModal(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
              >
                <span>View Detailed Analytics</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {overviewMachine ? (
            overviewMachine.components.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {overviewMachine.components.map((comp) => {
                  const img =
                    COMPONENT_ICON_MAP[comp.category.toUpperCase()] || tyreImg;
                  const isWarn =
                    comp.healthScore < 70 && comp.healthScore >= 40;
                  const isCrit = comp.healthScore < 40;

                  let badgeBg =
                    "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400";
                  let badgeLabel = "GOOD";
                  let barBg = "bg-green-500";

                  if (isWarn) {
                    badgeBg =
                      "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400";
                    badgeLabel = "WARN";
                    barBg = "bg-orange-500";
                  } else if (isCrit) {
                    badgeBg =
                      "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400";
                    badgeLabel = "CRITICAL";
                    barBg = "bg-red-500";
                  }

                  return (
                    <div
                      key={comp.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 transition hover:bg-slate-50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeBg}`}
                          >
                            {badgeLabel}
                          </span>
                        </div>

                        <div className="my-4 flex h-24 items-center justify-center">
                          <img
                            src={img}
                            alt={comp.category}
                            className="max-h-20 max-w-full object-contain transition-transform duration-300 hover:scale-105"
                          />
                        </div>

                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {comp.name}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {comp.category}
                        </p>

                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Health Score
                          </span>
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {comp.healthScore}%
                          </span>
                        </div>

                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                            style={{ width: `${comp.healthScore}%` }}
                          />
                        </div>
                      </div>

                      {comp.inspectionParameters.length > 0 && (
                        <div className="mt-5 space-y-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                          {comp.inspectionParameters.map((p, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-slate-500 dark:text-slate-400">
                                {p.name}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {p.defaultVal} {p.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">
                No components recorded for this machine.
              </div>
            )
          ) : (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">
              No machine selected.
            </div>
          )}
        </div>

        {/* ── COMPANY FLEET TABLE (ALL MACHINES LIST) ── */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-blue-900 px-6 py-4 text-white dark:border-slate-800">
            <div>
              <h3 className="text-lg font-black">Company Fleet</h3>
              <p className="text-xs text-blue-200">
                All machines across registered companies. Click a row to load it
                above.
              </p>
            </div>
            <span className="rounded-full bg-blue-800 px-3 py-1 text-xs font-bold">
              {filteredFleet.length} Machines
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <th className="px-6 py-4">Machine</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Fleet ID</th>
                  <th className="px-6 py-4">Operator</th>

                  <th className="px-4 py-4 text-center">Components</th>

                  <th className="px-6 py-4 text-center">Health</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredFleet.length > 0 ? (
                  filteredFleet.map((row) => {
                    const isSelected = overviewMachine?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setOverviewMachine(row)}
                        className={`cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-slate-800/40 ${
                          isSelected ? "bg-blue-50/80 dark:bg-slate-800/60" : ""
                        }`}
                      >
                        {/* Machine */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                              <Truck size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white">
                                {row.machine}
                              </div>
                              <div className="text-[11px] font-medium text-slate-400">
                                {row.location}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Building2 size={14} className="text-slate-400" />
                            <span>{row.company}</span>
                          </div>
                        </td>

                        {/* Fleet ID */}
                        <td className="px-6 py-4 align-middle">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {row.fleet}
                          </span>
                        </td>

                        {/* Operator */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <User size={13} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {row.operator}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Component Rings — dynamic, jitne bhi is machine ke components hain */}
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center justify-center gap-3">
                            {row.components.length > 0 ? (
                              row.components.map((comp) => (
                                <div key={comp.id}>
                                  {renderComponentRing(comp)}
                                </div>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                No data
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Overall Health Badge */}
                        <td className="px-6 py-4 text-center align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${getStatusBadge(
                              row.status,
                            )}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {row.status}
                          </span>
                        </td>

                        {/* Action Button */}
                        <td className="px-6 py-4 text-center align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverviewMachine(row);
                              setSelectedMachine(row);
                              setOpenModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-sm font-semibold text-slate-400"
                    >
                      No machines found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── MACHINE INSPECTION MODAL ── */}
        {openModal && selectedMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-blue-900 px-6 py-5 text-white dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {selectedMachine.machine} ({selectedMachine.fleet})
                    </h3>
                    <p className="text-xs text-blue-200">
                      {selectedMachine.type} • {selectedMachine.location}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpenModal(false)}
                  className="rounded-xl p-1.5 text-blue-200 hover:bg-blue-800 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
                {/* General Info Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Overall Health
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {selectedMachine.healthPercent}% ({selectedMachine.status}
                      )
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Total Components
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {selectedMachine.components.length}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Component Health Breakdown
                  </h4>
                  {selectedMachine.components.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {selectedMachine.components.map((comp) => (
                        <div
                          key={comp.id}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {comp.name}
                            </span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {comp.healthScore}%
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            {comp.inspectionParameters.map((p, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs text-slate-500"
                              >
                                <span>{p.name}:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {p.defaultVal} {p.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-slate-400">
                      No components recorded.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
                <button
                  onClick={() => setOpenModal(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
