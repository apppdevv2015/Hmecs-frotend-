import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import { fleetService } from "../../services/Fleet/fleetService";
import StorageService from "../../services/storage.service";

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
  ChevronLeft,
  Download,
  Eye,
  X,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  User,
  Filter,
  ChevronDown,
  BarChart2,
  Building2,
  Loader2,
  Cog,
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

type MachineComponent = {
  status: ComponentStatus;
  label: string;
  life: string;
  lifePercent: number;
  overallHealthPercent: number | null;
  subMetrics: SubMetric[];
};

type MaintenanceRecord = {
  date: string;
  type: string;
  technician: string;
  notes: string;
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
  health: string;
  healthPercent: number;
  status: FleetStatus;
  lastSeen: string;
  hoursRun: number;
  fuelLevel: number;
  tyre: MachineComponent;
  engine: MachineComponent;
  hydraulic: MachineComponent;
  transmission: MachineComponent;
  maintenanceHistory: MaintenanceRecord[];
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
   DEFAULT SEED FLEET DATA
========================================================== */

const INITIAL_FLEET_MACHINES: FleetMachine[] = [
  {
    id: "m-101",
    machine: "HT-501",
    company: "Mining Enterprise",
    companyId: "CMP-01",
    fleet: "IN-MT-501-SYS",
    operator: "Assigned Operator, Kasani Mine",
    location: "Kasani Mine",
    type: "CAT 777D Dump Truck",
    health: "85%",
    healthPercent: 85,
    status: "Healthy",
    lastSeen: "2 mins ago",
    hoursRun: 4250,
    fuelLevel: 82,
    tyre: {
      status: "ok",
      label: "TYRE",
      life: "85% life left",
      lifePercent: 85,
      overallHealthPercent: 85,
      subMetrics: [
        { label: "Air Pressure", value: "32 PSI" },
        { label: "Tyre Temperature", value: "65°C" },
      ],
    },
    engine: {
      status: "ok",
      label: "ENGINE",
      life: "88% life left",
      lifePercent: 88,
      overallHealthPercent: 88,
      subMetrics: [
        { label: "Engine Temperature", value: "80°C" },
        { label: "Engine Oil Level", value: "100%" },
        { label: "Coolant Level", value: "100%" },
      ],
    },
    hydraulic: {
      status: "ok",
      label: "HYDRAULIC",
      life: "75% life left",
      lifePercent: 75,
      overallHealthPercent: 75,
      subMetrics: [
        { label: "Oil Level", value: "100%" },
        { label: "Hydraulic Pressure", value: "210 Bar" },
        { label: "Oil Temperature", value: "55°C" },
      ],
    },
    transmission: {
      status: "ok",
      label: "SUSPENSION",
      life: "80% life left",
      lifePercent: 80,
      overallHealthPercent: 80,
      subMetrics: [
        { label: "Fluid Level", value: "80%" },
        { label: "Gear Temperature", value: "72°C" },
      ],
    },
    maintenanceHistory: [
      { date: "2026-07-20", type: "Preventive Service", technician: "Rajesh K.", notes: "Replaced oil filter & inspected hydraulics." },
    ],
  },
  {
    id: "m-102",
    machine: "EX-202",
    company: "Mining Enterprise",
    companyId: "CMP-01",
    fleet: "IN-EX-202-SYS",
    operator: "Assigned Operator, North Pit",
    location: "North Pit",
    type: "Komatsu PC1250",
    health: "62%",
    healthPercent: 62,
    status: "Warning",
    lastSeen: "Just now",
    hoursRun: 5120,
    fuelLevel: 68,
    tyre: {
      status: "ok",
      label: "TYRE",
      life: "78% life left",
      lifePercent: 78,
      overallHealthPercent: 78,
      subMetrics: [{ label: "Air Pressure", value: "34 PSI" }, { label: "Tyre Temperature", value: "60°C" }],
    },
    engine: {
      status: "warn",
      label: "ENGINE",
      life: "58% life left",
      lifePercent: 58,
      overallHealthPercent: 58,
      subMetrics: [{ label: "Engine Temperature", value: "89°C" }, { label: "Engine Oil Level", value: "80%" }, { label: "Coolant Level", value: "85%" }],
    },
    hydraulic: {
      status: "warn",
      label: "HYDRAULIC",
      life: "52% life left",
      lifePercent: 52,
      overallHealthPercent: 52,
      subMetrics: [{ label: "Oil Level", value: "65%" }, { label: "Hydraulic Pressure", value: "195 Bar" }, { label: "Oil Temperature", value: "68°C" }],
    },
    transmission: {
      status: "ok",
      label: "SUSPENSION",
      life: "72% life left",
      lifePercent: 72,
      overallHealthPercent: 72,
      subMetrics: [{ label: "Fluid Level", value: "75%" }, { label: "Gear Temperature", value: "70°C" }],
    },
    maintenanceHistory: [],
  },
  {
    id: "m-103",
    machine: "DT-1023",
    company: "Mining Enterprise",
    companyId: "CMP-01",
    fleet: "IN-DT-1023-SYS",
    operator: "Assigned Operator, East Pit",
    location: "East Pit",
    type: "CAT 789D",
    health: "55%",
    healthPercent: 55,
    status: "Warning",
    lastSeen: "10 mins ago",
    hoursRun: 6200,
    fuelLevel: 45,
    tyre: {
      status: "warn",
      label: "TYRE",
      life: "60% life left",
      lifePercent: 60,
      overallHealthPercent: 60,
      subMetrics: [{ label: "Air Pressure", value: "30 PSI" }, { label: "Tyre Temperature", value: "72°C" }],
    },
    engine: {
      status: "crit",
      label: "ENGINE",
      life: "35% life left",
      lifePercent: 35,
      overallHealthPercent: 35,
      subMetrics: [{ label: "Engine Temperature", value: "95°C" }, { label: "Engine Oil Level", value: "45%" }, { label: "Coolant Level", value: "50%" }],
    },
    hydraulic: {
      status: "ok",
      label: "HYDRAULIC",
      life: "70% life left",
      lifePercent: 70,
      overallHealthPercent: 70,
      subMetrics: [{ label: "Oil Level", value: "85%" }, { label: "Hydraulic Pressure", value: "205 Bar" }, { label: "Oil Temperature", value: "60°C" }],
    },
    transmission: {
      status: "warn",
      label: "SUSPENSION",
      life: "55% life left",
      lifePercent: 55,
      overallHealthPercent: 55,
      subMetrics: [{ label: "Fluid Level", value: "60%" }, { label: "Gear Temperature", value: "82°C" }],
    },
    maintenanceHistory: [],
  },
  {
    id: "m-104",
    machine: "WL-8212",
    company: "Mining Enterprise",
    companyId: "CMP-01",
    fleet: "IN-WL-8212-SYS",
    operator: "Assigned Operator, West Stockpile",
    location: "West Stockpile",
    type: "CAT 992K Wheel Loader",
    health: "68%",
    healthPercent: 68,
    status: "Warning",
    lastSeen: "15 mins ago",
    hoursRun: 3800,
    fuelLevel: 75,
    tyre: {
      status: "ok",
      label: "TYRE",
      life: "82% life left",
      lifePercent: 82,
      overallHealthPercent: 82,
      subMetrics: [{ label: "Air Pressure", value: "35 PSI" }, { label: "Tyre Temperature", value: "58°C" }],
    },
    engine: {
      status: "warn",
      label: "ENGINE",
      life: "58% life left",
      lifePercent: 58,
      overallHealthPercent: 58,
      subMetrics: [{ label: "Engine Temperature", value: "88°C" }, { label: "Engine Oil Level", value: "78%" }, { label: "Coolant Level", value: "82%" }],
    },
    hydraulic: {
      status: "ok",
      label: "HYDRAULIC",
      life: "74% life left",
      lifePercent: 74,
      overallHealthPercent: 74,
      subMetrics: [{ label: "Oil Level", value: "90%" }, { label: "Hydraulic Pressure", value: "215 Bar" }, { label: "Oil Temperature", value: "58°C" }],
    },
    transmission: {
      status: "ok",
      label: "SUSPENSION",
      life: "76% life left",
      lifePercent: 76,
      overallHealthPercent: 76,
      subMetrics: [{ label: "Fluid Level", value: "80%" }, { label: "Gear Temperature", value: "74°C" }],
    },
    maintenanceHistory: [],
  },
  {
    id: "m-105",
    machine: "CAT-777-DEMO",
    company: "Mining Enterprise",
    companyId: "CMP-01",
    fleet: "IN-CAT-777-SYS",
    operator: "Assigned Operator, Kasani Mine",
    location: "Kasani Mine",
    type: "CAT 777F Haul Truck",
    health: "32%",
    healthPercent: 32,
    status: "Critical",
    lastSeen: "5 mins ago",
    hoursRun: 8400,
    fuelLevel: 30,
    tyre: {
      status: "crit",
      label: "TYRE",
      life: "25% life left",
      lifePercent: 25,
      overallHealthPercent: 25,
      subMetrics: [{ label: "Air Pressure", value: "22 PSI" }, { label: "Tyre Temperature", value: "88°C" }],
    },
    engine: {
      status: "crit",
      label: "ENGINE",
      life: "20% life left",
      lifePercent: 20,
      overallHealthPercent: 20,
      subMetrics: [{ label: "Engine Temperature", value: "102°C" }, { label: "Engine Oil Level", value: "30%" }, { label: "Coolant Level", value: "40%" }],
    },
    hydraulic: {
      status: "warn",
      label: "HYDRAULIC",
      life: "45% life left",
      lifePercent: 45,
      overallHealthPercent: 45,
      subMetrics: [{ label: "Oil Level", value: "50%" }, { label: "Hydraulic Pressure", value: "175 Bar" }, { label: "Oil Temperature", value: "78°C" }],
    },
    transmission: {
      status: "crit",
      label: "SUSPENSION",
      life: "38% life left",
      lifePercent: 38,
      overallHealthPercent: 38,
      subMetrics: [{ label: "Fluid Level", value: "40%" }, { label: "Gear Temperature", value: "92°C" }],
    },
    maintenanceHistory: [],
  },
  {
    id: "m-106",
    machine: "D10-101",
    company: "Mining Enterprise",
    companyId: "CMP-01",
    fleet: "IN-DT-101-SYS",
    operator: "Assigned Operator, North Pit",
    location: "North Pit",
    type: "CAT D10T Dozer",
    health: "64%",
    healthPercent: 64,
    status: "Warning",
    lastSeen: "3 mins ago",
    hoursRun: 4900,
    fuelLevel: 62,
    tyre: {
      status: "ok",
      label: "TYRE",
      life: "72% life left",
      lifePercent: 72,
      overallHealthPercent: 72,
      subMetrics: [{ label: "Air Pressure", value: "32 PSI" }, { label: "Tyre Temperature", value: "62°C" }],
    },
    engine: {
      status: "warn",
      label: "ENGINE",
      life: "55% life left",
      lifePercent: 55,
      overallHealthPercent: 55,
      subMetrics: [{ label: "Engine Temperature", value: "87°C" }, { label: "Engine Oil Level", value: "75%" }, { label: "Coolant Level", value: "80%" }],
    },
    hydraulic: {
      status: "ok",
      label: "HYDRAULIC",
      life: "70% life left",
      lifePercent: 70,
      overallHealthPercent: 70,
      subMetrics: [{ label: "Oil Level", value: "85%" }, { label: "Hydraulic Pressure", value: "210 Bar" }, { label: "Oil Temperature", value: "60°C" }],
    },
    transmission: {
      status: "warn",
      label: "SUSPENSION",
      life: "58% life left",
      lifePercent: 58,
      overallHealthPercent: 58,
      subMetrics: [{ label: "Fluid Level", value: "65%" }, { label: "Gear Temperature", value: "76°C" }],
    },
    maintenanceHistory: [],
  },
];

/* ==========================================================
   MAIN COMPANY ADMIN FLEET HEAT MAP COMPONENT
========================================================== */

export default function FleetHeatMap() {
  const [fleetTable, setFleetTable] = useState<FleetMachine[]>(INITIAL_FLEET_MACHINES);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Healthy" | "Warning" | "Critical">("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("All Equipment");
  const [eqCategoriesList, setEqCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res: any = await machineService.getEquipmentCategories();
        let cats: any[] = [];
        if (Array.isArray(res)) cats = res;
        else if (Array.isArray(res?.data)) cats = res.data;
        else if (Array.isArray(res?.data?.data)) cats = res.data.data;
        setEqCategoriesList(cats);
      } catch (e) {
        console.error("Error loading categories:", e);
      }
    };
    loadCategories();
  }, []);

  const dynamicCategoryTabs = useMemo(() => {
    const listFromApi = eqCategoriesList
      .map((c: any) => c.name || c.title || c.equipmentType)
      .filter(Boolean);

    const listFromFleet = fleetTable
      .map((m) => m.type)
      .filter(Boolean);

    const set = new Set(["All Equipment", ...listFromApi, ...listFromFleet]);
    return Array.from(set);
  }, [eqCategoriesList, fleetTable]);

  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>("all");
  const [companies, setCompanies] = useState<Company[]>([
    { id: "CMP-01", companyName: "Tata Mining", companyCode: "TM001" },
    { id: "CMP-02", companyName: "L&T Construction", companyCode: "LT001" },
  ]);

  // Modal State
  const [selectedMachine, setSelectedMachine] = useState<FleetMachine | null>(null);
  const [openModal, setOpenModal] = useState(false);

  // Selected Machine for Component Health Overview cards above the table
  const [overviewMachine, setOverviewMachine] = useState<FleetMachine | null>(INITIAL_FLEET_MACHINES[0]);
  const [overviewComponentsList, setOverviewComponentsList] = useState<any[]>([]);
  const [loadingOverviewComponents, setLoadingOverviewComponents] = useState(false);
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselContainerRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      carouselContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (!overviewMachine?.id) return;

    const deriveCompName = (item: any): string => {
      const directName = item?.name || item?.componentName || item?.component_name;
      if (directName && directName !== "General") return String(directName);
      const desc = String(item?.description || "").trim();
      if (desc) {
        const cleaned = desc.replace(/^Spec Notes:\s*/i, "").trim();
        const parts = cleaned.split(" - ");
        if (parts[0]) return parts[0].trim();
      }
      return directName || "Component";
    };

    const fetchComponentsForOverview = async () => {
      setLoadingOverviewComponents(true);
      try {
        const res: any = await componentService.getComponentsByMachineId(overviewMachine.id);
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.data)) list = res.data;

        const mapped = list.map((c: any) => ({
          ...c,
          displayName: deriveCompName(c),
          serialNumber: String(c.serialNumber || c.serial_number || "").replace(/^DEMO-/i, ""),
        }));

        setOverviewComponentsList(mapped);
      } catch (err) {
        console.error("Error fetching overview components:", err);
        setOverviewComponentsList([]);
      } finally {
        setLoadingOverviewComponents(false);
      }
    };

    fetchComponentsForOverview();
  }, [overviewMachine?.id]);

  useEffect(() => {
    if (selectedMachineFilter !== "all") {
      const found = fleetTable.find(
        (m) => m.id === selectedMachineFilter || m.machine === selectedMachineFilter
      );
      if (found) {
        setOverviewMachine(found);
      }
    }
  }, [selectedMachineFilter, fleetTable]);

  const [modalComponentsList, setModalComponentsList] = useState<any[]>([]);
  const [loadingModalComponents, setLoadingModalComponents] = useState(false);

  useEffect(() => {
    if (!openModal || !selectedMachine?.id) return;

    const deriveCompName = (item: any): string => {
      const directName = item?.name || item?.componentName || item?.component_name;
      if (directName && directName !== "General") return String(directName);
      const desc = String(item?.description || "").trim();
      if (desc) {
        const cleaned = desc.replace(/^Spec Notes:\s*/i, "").trim();
        const parts = cleaned.split(" - ");
        if (parts[0]) return parts[0].trim();
      }
      return directName || "Component";
    };

    const fetchModalComponents = async () => {
      setLoadingModalComponents(true);
      try {
        const res: any = await componentService.getComponentsByMachineId(selectedMachine.id);
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.data)) list = res.data;

        const mapped = list.map((c: any) => ({
          ...c,
          displayName: deriveCompName(c),
          serialNumber: String(c.serialNumber || c.serial_number || "").replace(/^DEMO-/i, ""),
        }));

        setModalComponentsList(mapped);
      } catch (err) {
        console.error("Error fetching modal components:", err);
        setModalComponentsList([]);
      } finally {
        setLoadingModalComponents(false);
      }
    };

    fetchModalComponents();
  }, [openModal, selectedMachine?.id]);

  const chartRef = useRef<any>(null);

  const HEATMAP_COMPONENTS = ["Tyre", "Engine", "Hydraulic", "Suspension"] as const;

  const heatmapFleets = useMemo(
    () => fleetTable.map((m) => m.fleet),
    [fleetTable]
  );

  const heatmapData = useMemo(() => {
    const COMPONENTS = ["tyre", "engine", "hydraulic", "transmission"] as const;
    const points: HeatmapDataPoint[] = [];
    fleetTable.forEach((m, fi) => {
      COMPONENTS.forEach((comp, ci) => {
        points.push({
          fleetIndex: fi,
          componentIndex: ci,
          healthScore: m[comp].lifePercent,
        });
      });
    });
    return points;
  }, [fleetTable]);

  /* ── Dark-mode detection ── */
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Heatmap option ── */
  const heatMapOption = useMemo(
    () =>
      buildHeatmapOption(
        [...HEATMAP_COMPONENTS],
        heatmapFleets,
        heatmapData,
        isDark,
      ),
    [heatmapData, heatmapFleets, isDark]
  );

  /* ── Load Live Data from API ── */
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const liveMachines = await fleetService.getFleetMachines("company_admin");
      const currentUser = StorageService.getUser();
      const userCompanyName = currentUser?.companyName || currentUser?.company?.companyName || "HME Systems";

      if (Array.isArray(liveMachines) && liveMachines.length > 0) {
        const mappedMachines: FleetMachine[] = liveMachines.map((m: any, idx: number) => {
          const healthScore = Number(m.healthPercent ?? 85);
          const statusVal: FleetStatus =
            healthScore >= 75 ? "Healthy" : healthScore >= 50 ? "Warning" : "Critical";

          const getCompStatus = (statusStr: string): ComponentStatus => {
            if (statusStr === "crit" || statusStr === "critical") return "crit";
            if (statusStr === "warn" || statusStr === "warning") return "warn";
            return "ok";
          };

          const rawCompName = m.company?.companyName || m.companyName || m.company_name;
          const resolvedCompany = rawCompName && rawCompName !== "N/A" ? rawCompName : userCompanyName;

          return {
            id: String(m.machineId || m.id || `m-${idx}`),
            machine: String(m.machineName || m.name || m.model || `Machine-${idx + 1}`),
            company: String(resolvedCompany),
            companyId: String(m.company?.companyId || m.companyId || "CMP-01"),
            fleet: String(m.fleetId || m.serialNumber || `SN-${m.machineId}`),
            operator: typeof m.operator === "object" ? (m.operator?.name || "Assigned Operator") : String(m.operator || "Assigned Operator"),
            location: String(m.location || m.site || "North Pit"),
            type: String(m.machineType || m.equipmentType || "Mining Haul Truck"),
            health: `${healthScore}%`,
            healthPercent: healthScore,
            status: statusVal,
            lastSeen: m.lastSeen || "Just now",
            hoursRun: Number(m.hoursRun || 0),
            fuelLevel: Number(m.fuelLevel || 80),
            tyre: {
              status: getCompStatus(m.components?.tyre?.status),
              label: "TYRE",
              life: `${m.components?.tyre?.health ?? 85}% life left`,
              lifePercent: Number(m.components?.tyre?.health ?? 85),
              overallHealthPercent: Number(m.components?.tyre?.health ?? 85),
              subMetrics: [
                { label: "Air Pressure", value: "32 PSI" },
                { label: "Tyre Temperature", value: "65°C" },
              ],
            },
            engine: {
              status: getCompStatus(m.components?.engine?.status),
              label: "ENGINE",
              life: `${m.components?.engine?.health ?? 88}% life left`,
              lifePercent: Number(m.components?.engine?.health ?? 88),
              overallHealthPercent: Number(m.components?.engine?.health ?? 88),
              subMetrics: [
                { label: "Engine Temperature", value: "80°C" },
                { label: "Engine Oil Level", value: "100%" },
                { label: "Coolant Level", value: "100%" },
              ],
            },
            hydraulic: {
              status: getCompStatus(m.components?.hydraulic?.status),
              label: "HYDRAULIC",
              life: `${m.components?.hydraulic?.health ?? 75}% life left`,
              lifePercent: Number(m.components?.hydraulic?.health ?? 75),
              overallHealthPercent: Number(m.components?.hydraulic?.health ?? 75),
              subMetrics: [
                { label: "Oil Level", value: "100%" },
                { label: "Hydraulic Pressure", value: "210 Bar" },
                { label: "Oil Temperature", value: "55°C" },
              ],
            },
            transmission: {
              status: getCompStatus(m.components?.transmission?.status),
              label: "SUSPENSION",
              life: `${m.components?.transmission?.health ?? 80}% life left`,
              lifePercent: Number(m.components?.transmission?.health ?? 80),
              overallHealthPercent: Number(m.components?.transmission?.health ?? 80),
              subMetrics: [
                { label: "Fluid Level", value: "80%" },
                { label: "Gear Temperature", value: "72°C" },
              ],
            },
            maintenanceHistory: Array.isArray(m.maintenanceHistory) ? m.maintenanceHistory : [],
          };
        });
        setFleetTable(mappedMachines);
        if (mappedMachines.length > 0) setOverviewMachine(mappedMachines[0]);
      }
    } catch (err) {
      console.log("Error loading live fleet dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ── Filtered Machines for Fleet Table ── */
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

      let matchesTab = true;
      if (activeTab !== "All Equipment") {
        const typeLower = item.type.toLowerCase();
        const tabLower = activeTab.toLowerCase();
        matchesTab = typeLower.includes(tabLower) || item.machine.toLowerCase().includes(tabLower);
      }

      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [fleetTable, search, statusFilter, activeTab]);

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
    doc.text("Company Fleet Monitoring Report", 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Total Machines: ${machines.length}`, 14, 34);

    const headers = [
      [
        "Machine",
        "Company",
        "Fleet ID",
        "Operator",
        "Tyre",
        "Engine",
        "Hydraulic",
        "Suspension",
        "Health",
      ],
    ];

    const rows = machines.map((m) => [
      m.machine,
      m.company,
      m.fleet,
      m.operator,
      `${m.tyre.lifePercent}%`,
      `${m.engine.lifePercent}%`,
      `${m.hydraulic.lifePercent}%`,
      `${m.transmission.lifePercent}%`,
      m.health,
    ]);

    autoTable(doc, {
      startY: 40,
      head: headers,
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`Company-Fleet-Report-${Date.now()}.pdf`);
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
    let color = "text-green-500 border-green-500 bg-green-50 dark:bg-green-950/40";
    if (comp.status === "warn") {
      color = "text-orange-500 border-orange-500 bg-orange-50 dark:bg-orange-950/40";
    } else if (comp.status === "crit") {
      color = "text-red-500 border-red-500 bg-red-50 dark:bg-red-950/40";
    }

    return (
      <div className="flex flex-col items-center justify-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[11px] font-black ${color}`}
        >
          {comp.lifePercent}%
        </div>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {comp.label}
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
                  Fleet Monitoring Dashboard
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Company Fleet Monitoring
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Monitor all company machines, health status, fleet performance and
                operator activity across every organization from one centralized
                dashboard.
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
              color: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
              trend: null,
            },
            {
              title: "Healthy Machines",
              value: stats.healthy,
              icon: ShieldCheck,
              color: "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
              trend: "Fully operational",
            },
            {
              title: "Maintenance",
              value: stats.maintenance,
              icon: Wrench,
              color: "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
              trend: "Needs attention",
            },
            {
              title: "Critical Alerts",
              value: stats.critical,
              icon: AlertTriangle,
              color: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
              trend: "Immediate action",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${item.color}`}>
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

              {/* Machine Filter Dropdown */}
              <div className="relative">
                <Truck
                  size={16}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedMachineFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMachineFilter(val);
                    if (val !== "all") {
                      const found = fleetTable.find((m) => m.id === val || m.machine === val);
                      if (found) setOverviewMachine(found);
                    }
                  }}
                  className="h-14 min-w-[220px] appearance-none rounded-[20px] border border-slate-200 bg-slate-50 pl-12 pr-10 text-sm font-extrabold text-slate-800 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Machines ({fleetTable.length})</option>
                  {fleetTable.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machine}
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
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Tabs (Fetched Dynamically from API) */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
            {dynamicCategoryTabs.map((tab) => (
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
                Fleet-wise component health monitoring — hover a cell for details.
              </p>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              {[
                { label: "Healthy", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
                { label: "Warning", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
                { label: "Critical", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
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
                <p className="text-sm">No data available for selected company.</p>
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

        {/* ── COMPONENT HEALTH OVERVIEW CARDS (DYNAMIC SLIDER FOR SELECTED MACHINE) ── */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Component Health Overview ({overviewMachine?.machine || "Selected Machine"})
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {overviewMachine
                  ? `Showing all ${overviewComponentsList.length > 0 ? overviewComponentsList.length : "registered"} components for ${overviewMachine.machine}. Use arrows to slide.`
                  : "Select a machine from the table below to see its components."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Slider Navigation Buttons */}
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  title="Slide Left"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  title="Slide Right"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {loadingOverviewComponents ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 size={22} className="mr-2.5 animate-spin text-blue-600" />
              Loading components for selected machine...
            </div>
          ) : overviewComponentsList.length > 0 ? (
            <div
              ref={carouselContainerRef}
              className="flex overflow-x-auto gap-4 pb-2 pt-1 hme-hide-scrollbar scroll-smooth"
            >
              {overviewComponentsList.map((comp) => {
                const name = comp.displayName || comp.name || comp.description || "Component";
                const score = comp.healthScore !== null && comp.healthScore !== undefined
                  ? Number(comp.healthScore)
                  : comp.health_score !== null && comp.health_score !== undefined
                  ? Number(comp.health_score)
                  : null;

                const isCrit = score !== null && score < 50;
                const isWarn = score !== null && score >= 50 && score < 85;

                let badgeBg = "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400";
                let badgeLabel = "HEALTHY";
                let barBg = "bg-emerald-500";

                if (score === null) {
                  badgeBg = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
                  badgeLabel = "UNCALCULATED";
                  barBg = "bg-slate-300";
                } else if (isCrit) {
                  badgeBg = "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400";
                  badgeLabel = "CRITICAL";
                  barBg = "bg-red-500";
                } else if (isWarn) {
                  badgeBg = "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400";
                  badgeLabel = "MONITOR";
                  barBg = "bg-amber-500";
                }

                const upperName = name.toUpperCase();
                const matchedIconKey = Object.keys(COMPONENT_ICON_MAP).find(k => upperName.includes(k));
                const img = matchedIconKey ? COMPONENT_ICON_MAP[matchedIconKey] : null;

                return (
                  <div
                    key={comp.id}
                    className="w-[280px] shrink-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 transition hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeBg}`}>
                          {badgeLabel}
                        </span>
                        {comp.serialNumber && (
                          <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            {comp.serialNumber}
                          </span>
                        )}
                      </div>

                      {/* Component Image Illustration */}
                      <div className="my-4 flex h-20 items-center justify-center">
                        {img ? (
                          <img
                            src={img}
                            alt={name}
                            className="max-h-16 max-w-full object-contain transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800 dark:text-slate-200">
                            <Cog size={28} className="text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate" title={name}>
                        {name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Health</p>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Health Score</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {score !== null ? `${score}%` : "-"}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                          style={{ width: `${score !== null ? score : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Parameters / Life Info */}
                    <div className="mt-4 space-y-1.5 border-t border-slate-200/80 pt-3 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Supplier:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]" title={comp.supplier || "Komatsu"}>{comp.supplier || "Komatsu"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Install Hrs:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{comp.installHours || comp.install_hours || 0} hrs</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : overviewMachine ? (
            <div
              ref={carouselContainerRef}
              className="flex overflow-x-auto gap-4 pb-2 pt-1 hme-hide-scrollbar scroll-smooth"
            >
              {(["tyre", "engine", "hydraulic", "transmission"] as const).map((compKey) => {
                const comp = overviewMachine[compKey];
                const img = COMPONENT_ICON_MAP[comp.label] || tyreImg;
                const isOk = comp.status === "ok";
                const isWarn = comp.status === "warn";
                const isCrit = comp.status === "crit";

                let badgeBg = "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400";
                let badgeLabel = "GOOD";
                let barBg = "bg-green-500";

                if (isWarn) {
                  badgeBg = "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400";
                  badgeLabel = "WARN";
                  barBg = "bg-orange-500";
                } else if (isCrit) {
                  badgeBg = "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400";
                  badgeLabel = "CRITICAL";
                  barBg = "bg-red-500";
                }

                return (
                  <div
                    key={compKey}
                    className="w-[280px] shrink-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 transition hover:bg-slate-50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeBg}`}>
                          {badgeLabel}
                        </span>
                      </div>

                      <div className="my-4 flex h-24 items-center justify-center">
                        <img
                          src={img}
                          alt={comp.label}
                          className="max-h-20 max-w-full object-contain transition-transform duration-300 hover:scale-105"
                        />
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                        {compKey === "transmission" ? "Suspension" : compKey}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-400">Overall Health</p>

                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Health Score</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {comp.lifePercent}%
                        </span>
                      </div>

                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                          style={{ width: `${comp.lifePercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                      {comp.subMetrics.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-500 dark:text-slate-400">{m.label}</span>
                          <span className="font-bold text-slate-900 dark:text-white">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
                All machines across registered companies. Click a row to load it above.
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
                  <th className="px-6 py-4 text-center">Components</th>
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

                        {/* Real Components Column */}
                        <td className="px-6 py-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverviewMachine(row);
                              setSelectedMachine(row);
                              setOpenModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-extrabold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <Cog size={14} className="text-blue-600 dark:text-blue-400" />
                            <span>View Components</span>
                          </button>
                        </td>

                        {/* Overall Health Badge */}
                        <td className="px-6 py-4 text-center align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${getStatusBadge(
                              row.status
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
                    <td colSpan={10} className="py-12 text-center text-sm font-semibold text-slate-400">
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
                    <h3 className="text-lg font-bold">{selectedMachine.machine} ({selectedMachine.fleet})</h3>
                    <p className="text-xs text-blue-200">{selectedMachine.type} • {selectedMachine.location}</p>
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
                    <span className="text-[10px] font-bold uppercase text-slate-400">Company</span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedMachine.company}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Operator</span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedMachine.operator}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Overall Health</span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedMachine.health} ({selectedMachine.status})</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Engine Hours</span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedMachine.hoursRun} hrs</p>
                  </div>
                </div>

                {/* Dynamic Component Health Breakdown (Circular Health Rings) */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Component Health Breakdown ({modalComponentsList.length > 0 ? modalComponentsList.length : "Registered"} Components)
                    </h4>
                  </div>

                  {loadingModalComponents ? (
                    <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                      <Loader2 size={22} className="mr-2 animate-spin text-blue-600" />
                      Loading machine components...
                    </div>
                  ) : modalComponentsList.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[50vh] overflow-y-auto pr-1">
                      {modalComponentsList.map((comp) => {
                        const name = comp.displayName || comp.name || "Component";
                        const score = comp.healthScore !== null && comp.healthScore !== undefined
                          ? Number(comp.healthScore)
                          : comp.health_score !== null && comp.health_score !== undefined
                          ? Number(comp.health_score)
                          : null;

                        const isCrit = score !== null && score < 50;
                        const isWarn = score !== null && score >= 50 && score < 85;

                        let circleStyle = "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400";
                        if (score === null) {
                          circleStyle = "border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500";
                        } else if (isCrit) {
                          circleStyle = "border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950/40 dark:text-red-400";
                        } else if (isWarn) {
                          circleStyle = "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-400";
                        }

                        return (
                          <div
                            key={comp.id}
                            className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-center transition hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                          >
                            {/* Circular Health Percentage Ring */}
                            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-sm font-black shadow-xs ${circleStyle}`}>
                              {score !== null ? `${score}%` : "-"}
                            </div>

                            {/* Component Name */}
                            <h5 className="mt-3 text-xs font-black text-slate-900 dark:text-white line-clamp-2" title={name}>
                              {name}
                            </h5>

                            {/* Serial Number */}
                            {comp.serialNumber && (
                              <span className="mt-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                                {comp.serialNumber}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {(["tyre", "engine", "hydraulic", "transmission"] as const).map((compKey) => {
                        const comp = selectedMachine[compKey];
                        const isCrit = comp.lifePercent < 50;
                        const isWarn = comp.lifePercent >= 50 && comp.lifePercent < 85;
                        let circleStyle = "border-emerald-500 bg-emerald-50 text-emerald-700";
                        if (isCrit) circleStyle = "border-red-500 bg-red-50 text-red-700";
                        else if (isWarn) circleStyle = "border-amber-500 bg-amber-50 text-amber-700";

                        return (
                          <div key={compKey} className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-center">
                            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-sm font-black ${circleStyle}`}>
                              {comp.lifePercent}%
                            </div>
                            <h5 className="mt-3 text-xs font-black capitalize text-slate-900 dark:text-white">
                              {compKey === "transmission" ? "Suspension" : compKey}
                            </h5>
                          </div>
                        );
                      })}
                    </div>
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
