import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";

import {
  CardSkeleton,
  FleetSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "../../components/common/Skeleton";

import AppSelect from "../../components/ui/dropdown/AppSelect";

import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Database,
  Edit,
  History,
  Lock,
  PieChart as PieChartIcon,
  CheckCircle2 as CheckLineIcon,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Truck,
  X,
  ArrowRight,
} from "lucide-react";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import CompanyPlanCard from "../../components/company-admin/dashboard/CompanyPlanCard";
import SubscriptionHistoryTable from "../../components/company-admin/dashboard/SubscriptionHistoryTable";
import MachineHealthChart from "../../components/company-admin/dashboard/MachineHealthChart";
import { userService } from "../../services/Auth/userService";
import { componentService } from "../../services/companyadmin/componentService";
import { machineService } from "../../services/companyadmin/machineService";
import { CompanyAdminNav } from "../../components/company-admin/CompanyAdminNav";
import socketService from "../../services/socketService";

const getArrayData = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.components)) return response.components;
  return [];
};

const cleanMachineName = (rawName: string): string => {
  let name = String(rawName || "").trim();
  const words = name.split(/\s+/);
  if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    words.shift();
    name = words.join(" ");
  }
  return name;
};

const normalizeComponent = (item: any) => {
  const rawScore = item.healthScore ?? item.health_score ?? item.healthScorePercent ?? null;
  const score = rawScore !== null && rawScore !== undefined ? Number(rawScore) : null;

  return {
    id: String(item.id || item.componentId || item.component_id || ""),
    machineId: String(
      item.machineId || item.machine_id || item.machine?.id || "",
    ),
    companyId: String(
      item.companyId ||
      item.company_id ||
      item.machine?.companyId ||
      item.machine?.company_id ||
      "",
    ),
    companyCode: String(
      item.companyCode ||
      item.company_code ||
      item.machine?.companyCode ||
      item.machine?.company_code ||
      item.company?.companyCode ||
      item.company?.company_code ||
      "",
    ),
    companyName: String(
      item.companyName ||
      item.company_name ||
      item.machine?.companyName ||
      item.machine?.company_name ||
      item.company?.name ||
      "",
    ),
    company: item.company || item.machine?.company,
    machine: item.machine,
    category: String(item.category || item.categoryName || item.componentType || item.component_type || ""),
    description: String(item.description || ""),
    serialNumber: String(item.serialNumber || item.serial_number || ""),
    supplier: String(item.supplier || ""),
    installHours: Number(item.installHours ?? item.install_hours ?? 0),
    currentHours: Number(item.currentHours ?? item.current_hours ?? 0),
    plannedLife: Number(item.plannedLife ?? item.planned_life ?? 0),
    replacementCost: Number(item.replacementCost ?? item.replacement_cost ?? item.purchasePrice ?? item.purchase_price ?? 0),
    condition: Number(item.condition ?? 3),
    status: item.status || (score !== null ? (score < 50 ? "Critical" : score < 85 ? "Warning" : "Healthy") : "Healthy"),
    healthScore: score !== null ? score : 100,
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
    intelligence: item.intelligence,
  };
};

export default function CompanyAdminDashboard() {
  const [subscription, setSubscription] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [riskSearch, setRiskSearch] = useState("");
  const [riskStatusFilter, setRiskStatusFilter] = useState("all");
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
  const [selectedFleetMachineModal, setSelectedFleetMachineModal] = useState<any | null>(null);
  const [selectedParamComponentModal, setSelectedParamComponentModal] = useState<any | null>(null);
  const [selectedCategoryHealthModal, setSelectedCategoryHealthModal] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editForm, setEditForm] = useState({
    category: "",
    description: "",
    serialNumber: "",
    supplier: "",
    installHours: "",
    currentHours: "",
    plannedLife: "",
    replacementCost: "",
    condition: "3",
  });

  const riskOptions = [
    { label: "All Risks", value: "all" },
    { label: "Critical Only", value: "critical" },
    { label: "Warning Only", value: "warning" },
    { label: "Monitor Only", value: "monitor" },
  ];

  const deletedComponentKeysRef = React.useRef<Set<string>>(new Set());

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);

      const [sub, subHistory, machinesList, componentResponse] =
        await Promise.all([
          userService.getActiveSubscription(),
          userService.getSubscriptionHistory(),
          userService.getMachines(),
          componentService.getComponents(),
        ]);

      if (!sub && (!subHistory || subHistory.length === 0)) {
        navigate("/plans");
        return;
      }

      setSubscription(sub);
      setHistory(subHistory);

      const rawMachines = getArrayData<any>(machinesList);
      const normalizedMachines = rawMachines.map((m: any) => ({
        id: String(m.id || m.machineId || m.machine_id || ""),
        name: String(m.name || m.machineName || m.model || "Unnamed Machine"),
        machineId: String(m.machineId || m.machine_id || m.id || ""),
        serialNumber: m.serialNumber || m.serial_number || "",
        model: m.model || m.equipmentType || m.equipment_type || "",
        site: m.site || m.location || "",
        location: m.location || m.site || "",
        status: m.status || "active",
      }));

      setMachines(normalizedMachines);

      const rawComponents = getArrayData<any>(componentResponse);
      const mappedComponents = rawComponents
        .map(normalizeComponent)
        .filter((c: any) => {
          const cId = String(c.id || "").toLowerCase().trim();
          const cSn = String(c.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();
          if (deletedComponentKeysRef.current.has(cId) || (cSn && deletedComponentKeysRef.current.has(cSn))) {
            return false;
          }
          return true;
        });

      // Fetch DB Manual Inspection records per valid machine ID
      const inspectionResults = await Promise.all(
        normalizedMachines.map(async (m: any) => {
          if (!m.id) return [];
          try {
            const res: any = await machineService.getManualInspectionData(m.id);
            if (res?.data?.records && Array.isArray(res.data.records)) return res.data.records;
            if (res?.records && Array.isArray(res.records)) return res.records;
            if (Array.isArray(res)) return res;
          } catch (err) {}
          return [];
        })
      );
      const rawInspections = inspectionResults.flat();
      if (rawInspections && rawInspections.length > 0) {
        const processInspection = (insp: any, targetMachId?: string) => {
          if (Array.isArray(insp.components) && insp.components.length > 0) {
            insp.components.forEach((subComp: any) => {
              processInspection(subComp, targetMachId || insp.machineId);
            });
            return;
          }

          const inspSn = String(insp.serialNumber || insp.serial_number || "").replace(/^DEMO-/i, "").toLowerCase().trim();
          const inspCompName = String(insp.componentName || insp.component_name || insp.name || "").toLowerCase().trim();
          const inspMachId = String(targetMachId || insp.machineId || insp.machine_id || "").toLowerCase().trim();
          const inspCompId = String(insp.componentId || insp.component_id || insp.id || "").toLowerCase().trim();

          // Skip if marked deleted
          if (deletedComponentKeysRef.current.has(inspCompId) || (inspSn && deletedComponentKeysRef.current.has(inspSn))) {
            return;
          }

          let found = mappedComponents.find((c: any) => {
            const cId = String(c.id || "").toLowerCase().trim();
            const cSn = String(c.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();
            const cMachId = String(c.machineId || "").toLowerCase().trim();
            const cName = String(c.displayName || c.name || c.description || c.category || "").toLowerCase().trim();

            if (inspCompId && cId && inspCompId === cId) return true;
            if (inspSn && cSn && inspSn === cSn) return true;
            if (inspMachId && cMachId && (inspMachId === cMachId || cMachId.includes(inspMachId) || inspMachId.includes(cMachId))) {
              if (inspCompName && cName && (inspCompName === cName || inspCompName.includes(cName) || cName.includes(inspCompName))) return true;
            }
            return false;
          });

          const inspScore = Number(insp.healthScore ?? insp.health_score ?? insp.score ?? 100);
          const isCrit = inspScore < 50 || String(insp.status).toUpperCase().includes("CRIT");
          const isWarn = (!isCrit && inspScore < 85) || String(insp.status).toUpperCase().includes("WARN");
          const inspStatus = isCrit ? "CRITICAL" : isWarn ? "WARNING" : "HEALTHY";
          const riskLabel = isCrit ? "Critical" : isWarn ? "Warning" : "Healthy";

          const rawParams = Array.isArray(insp.parameters) ? insp.parameters : (insp.parameters?.customFields || []);
          const paramsText = rawParams.length > 0
            ? rawParams.map((p: any) => `${p.name}: ${p.value}`).join(", ")
            : "Diagnostic Variance";

          if (found) {
            found.status = inspStatus;
            found.healthScore = inspScore;
            found.condition = isCrit ? 5 : isWarn ? 4 : 2;
            found.intelligence = {
              riskStatus: riskLabel,
              riskDriver: paramsText,
            };
          } else if (inspCompName && !inspCompName.startsWith("all components")) {
            mappedComponents.push({
              id: insp.id || `insp_${mappedComponents.length}`,
              machineId: targetMachId || insp.machineId,
              name: insp.componentName || insp.name || "Machine Component",
              category: insp.category || "General",
              description: insp.description || `${insp.componentName || "Component"} (Inspected)`,
              serialNumber: inspSn || `SN-COMP-${mappedComponents.length}`,
              supplier: "OEM Standard",
              status: inspStatus,
              healthScore: inspScore,
              condition: isCrit ? 5 : isWarn ? 4 : 2,
              installHours: 0,
              currentHours: (100 - inspScore) * 150,
              plannedLife: 15000,
              replacementCost: 35000,
              intelligence: {
                riskStatus: riskLabel,
                riskDriver: paramsText,
              },
            });
          }
        };

        rawInspections.forEach((insp: any) => processInspection(insp));
      }

      setComponents([...mappedComponents]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleDeleteComponent = async () => {
    if (!deleteTarget) return;

    if (isExpired) {
      showErrorToast(
        "Action Denied: You cannot delete components because your subscription plan has expired. Please renew your plan.",
      );
      setDeleteTarget(null);
      return;
    }

    const targetId = String(deleteTarget.id || "").toLowerCase().trim();
    const targetSn = String(deleteTarget.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();

    try {
      setDeleting(true);

      // Instantly remove from local list
      setComponents((prev) =>
        prev.filter((c) => {
          const cId = String(c.id || "").toLowerCase().trim();
          const cSn = String(c.serialNumber || "").replace(/^DEMO-/i, "").toLowerCase().trim();
          if (targetId && cId === targetId) return false;
          if (targetSn && cSn === targetSn) return false;
          return true;
        }),
      );

      if (targetId) deletedComponentKeysRef.current.add(targetId);
      if (targetSn) deletedComponentKeysRef.current.add(targetSn);

      await componentService.deleteComponent(deleteTarget.id);
      showSuccessToast("Component deleted successfully");

      setDeleteTarget(null);
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      showErrorToast(err?.message || "Failed to delete component");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 📡 Real-Time WebSocket Listener & Auto-Sync for Live Alerts & Subscription Changes
  useEffect(() => {
    const unsubscribe = socketService.onMessage(async (data: any) => {
      try {
        const payload = data?.data || data;
        const category = (payload?.category || "").toLowerCase();
        const title = (payload?.title || "").toLowerCase();
        const message = (payload?.message || "").toLowerCase();

        if (
          category.includes("sub") ||
          category.includes("plan") ||
          title.includes("plan") ||
          title.includes("subscription") ||
          message.includes("plan") ||
          message.includes("expired")
        ) {
          const [sub, subHistory] = await Promise.all([
            userService.getActiveSubscription(),
            userService.getSubscriptionHistory(),
          ]);
          setSubscription(sub);
          setHistory(subHistory);
        }
      } catch (err) {
        console.error("WS subscription sync error:", err);
      }
    });

    // Background 30s live subscription health check
    const interval = setInterval(async () => {
      try {
        const sub = await userService.getActiveSubscription();
        setSubscription(sub);
      } catch (e) { }
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (editingComponent || deleteTarget) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [editingComponent, deleteTarget]);



  const getComponentCategory = React.useCallback((c: any): string => {
    const rawCat = c.category || c.categoryName || c.componentType || c.type || (c.category && typeof c.category === "object" ? c.category.name : null);
    if (rawCat && typeof rawCat === "string" && rawCat.trim() && rawCat !== "General" && rawCat !== "Uncategorized" && rawCat !== "Other") {
      return rawCat.trim();
    }

    const text = String(c.displayName || c.name || c.description || c.title || c.serialNumber || "").toLowerCase();
    if (text.includes("tyre") || text.includes("wheel") || text.includes("tire")) return "Tyre";
    if (text.includes("engine") || text.includes("diesel") || text.includes("motor")) return "Engine";
    if (text.includes("hydraul") || text.includes("pump") || text.includes("valve") || text.includes("cylinder")) return "Hydraulics";
    if (text.includes("transmiss") || text.includes("gear") || text.includes("clutch") || text.includes("drivetrain")) return "Transmission";
    if (text.includes("brake") || text.includes("suspen") || text.includes("axle") || text.includes("chassis") || text.includes("shock")) return "Brakes & Suspension";
    if (text.includes("electr") || text.includes("sensor") || text.includes("battery") || text.includes("alternator") || text.includes("control")) return "Electrical";
    if (text.includes("cooling") || text.includes("radiator") || text.includes("fan")) return "Cooling System";

    if (c.displayName || c.name) {
      const rawName = String(c.displayName || c.name).trim();
      return rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }

    return "Powertrain & Parts";
  }, []);

  const categoryData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    const colors: Record<string, string> = {
      Tyre: "#3b82f6",
      Engine: "#ef4444",
      Hydraulics: "#eab308",
      Transmission: "#a855f7",
      "Brakes & Suspension": "#ec4899",
      Electrical: "#06b6d4",
      "Cooling System": "#14b8a6",
      "Powertrain & Parts": "#10b981",
    };

    components.forEach((c: any) => {
      const cat = getComponentCategory(c);
      const cost = Number(c.replacementCost || 0);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (cost > 0 ? cost : 25000);
    });

    if (Object.keys(categoryTotals).length === 0) {
      return [];
    }

    const palette = ["#3b82f6", "#ef4444", "#eab308", "#a855f7", "#ec4899", "#06b6d4", "#10b981", "#6366f1", "#f97316", "#84cc16", "#d946ef", "#0284c7"];

    return Object.entries(categoryTotals).map(([name, value], index) => ({
      name,
      value,
      color: colors[name] || palette[index % palette.length],
    }));
  }, [components, getComponentCategory]);

  const distributionData = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {};

    const colors: Record<string, string> = {
      Tyre: "#3b82f6",
      Engine: "#ef4444",
      Hydraulics: "#eab308",
      Transmission: "#a855f7",
      "Brakes & Suspension": "#ec4899",
      Electrical: "#06b6d4",
      "Cooling System": "#14b8a6",
      "Powertrain & Parts": "#10b981",
    };

    components.forEach((c: any) => {
      const cat = getComponentCategory(c);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const total = components.length || 1;

    if (Object.keys(categoryCounts).length === 0) {
      return [];
    }

    const palette = ["#3b82f6", "#ef4444", "#eab308", "#a855f7", "#ec4899", "#06b6d4", "#10b981", "#6366f1", "#f97316", "#84cc16", "#d946ef", "#0284c7"];

    return Object.entries(categoryCounts).map(([name, count], index) => ({
      name,
      count,
      value: Math.round((count / total) * 100),
      color: colors[name] || palette[index % palette.length],
    }));
  }, [components, getComponentCategory]);

  const categoryHealthMap = useMemo(() => {
    const map: Record<string, { total: number; healthy: number; warning: number; critical: number; avgHealth: number }> = {};

    components.forEach((c: any) => {
      const cat = getComponentCategory(c) || c.category || "General";
      const score = typeof c.healthScore === "number" ? c.healthScore : 100;
      const isCrit = score < 50 || c.status === "Critical" || c.status === "CRITICAL";
      const isWarn = (!isCrit && score < 85) || c.status === "Warning" || c.status === "WARNING";

      if (!map[cat]) {
        map[cat] = { total: 0, healthy: 0, warning: 0, critical: 0, avgHealth: 0 };
      }

      map[cat].total += 1;
      if (isCrit) map[cat].critical += 1;
      else if (isWarn) map[cat].warning += 1;
      else map[cat].healthy += 1;

      map[cat].avgHealth += score;
    });

    Object.keys(map).forEach((cat) => {
      if (map[cat].total > 0) {
        map[cat].avgHealth = Math.round(map[cat].avgHealth / map[cat].total);
      }
    });

    return map;
  }, [components, getComponentCategory]);

  const getComponentRiskStatus = React.useCallback((c: any): "Critical" | "Warning" | "Monitor" | "Healthy" => {
    // 1. Primary Source of Truth: Direct Diagnostic Health Score
    const score = typeof c.healthScore === "number" ? Number(c.healthScore) : null;
    if (score !== null) {
      if (score < 50) return "Critical";
      if (score < 85) return "Warning";
      return "Healthy";
    }

    // 2. Direct Telemetry Inspection Status
    const statusStr = String(c.status || "").toUpperCase();
    if (statusStr.includes("CRIT")) return "Critical";
    if (statusStr.includes("WARN")) return "Warning";
    if (statusStr.includes("MONIT")) return "Monitor";
    if (statusStr.includes("HEALTH") || statusStr.includes("OPTIM")) return "Healthy";

    // 3. Computed Intelligence Risk Status
    if (c.intelligence?.riskStatus) {
      const r = String(c.intelligence.riskStatus).toLowerCase();
      if (r === "critical") return "Critical";
      if (r === "warning") return "Warning";
      if (r === "monitor") return "Monitor";
    }

    return "Healthy";
  }, []);

  const summaryStats = React.useMemo(() => {
    const totalMachines = machines.length;
    const totalComponents = components.length;

    const criticalCount = components.filter(
      (c) => getComponentRiskStatus(c) === "Critical",
    ).length;

    const warningCount = components.filter(
      (c) =>
        getComponentRiskStatus(c) === "Warning" ||
        getComponentRiskStatus(c) === "Monitor",
    ).length;

    const healthyCount = totalComponents - criticalCount - warningCount;

    const totalReplacementCost = components.reduce(
      (sum, c) => sum + Number(c.replacementCost || 0),
      0,
    );

    const formattedReplacementCost =
      totalReplacementCost >= 1000000
        ? `R ${(totalReplacementCost / 1000000).toFixed(2)}M`
        : totalReplacementCost >= 1000
          ? `R ${(totalReplacementCost / 1000).toFixed(0)}K`
          : totalReplacementCost > 0
            ? `R ${totalReplacementCost}`
            : "Active Fleet";

    return {
      totalMachines,
      totalComponents,
      criticalCount,
      warningCount,
      healthyCount,
      formattedReplacementCost,
    };
  }, [machines, components, getComponentRiskStatus]);

  const fleetMachines = React.useMemo(() => {
    if (machines.length === 0) return [];

    return machines.map((m) => {
      const mId = String(m.id || m.machineId || m.machine_id || "");
      const machineComps = components.filter((c) => {
        const cMachId = String(c.machineId || c.machine_id || c.machine?.id || c.machine?.machineId || "");
        return cMachId && mId && (cMachId === mId || cMachId.toLowerCase() === mId.toLowerCase());
      });

      const compsCount = machineComps.length;

      const critCount = machineComps.filter(
        (c) => getComponentRiskStatus(c) === "Critical",
      ).length;

      const warnCount = machineComps.filter(
        (c) =>
          getComponentRiskStatus(c) === "Warning" ||
          getComponentRiskStatus(c) === "Monitor",
      ).length;

      return {
        id: m.id || m.machineId || m.name,
        machineId: m.machineId || m.id,
        name: m.name || m.machineId || "Unnamed Machine",
        type: m.equipmentType || m.model || "Mining Asset",
        comps: compsCount,
        crit: critCount,
        warn: warnCount,
      };
    });
  }, [machines, components, getComponentRiskStatus]);

  const riskComponentsByMachineId = useMemo(() => {
    const riskMap = new Map<string, any[]>();

    components.forEach((component) => {
      const machineId = String(component.machineId || component.machine_id || "");
      if (!machineId) return;

      const riskStatus = getComponentRiskStatus(component);

      if (
        riskStatus === "Critical" ||
        riskStatus === "Warning" ||
        riskStatus === "Monitor"
      ) {
        const currentItems = riskMap.get(machineId) || [];

        currentItems.push({
          ...component,
          displayRisk: riskStatus,
        });

        riskMap.set(machineId, currentItems);
      }
    });

    riskMap.forEach((items, machineId) => {
      const sortedItems = items
        .sort((a, b) => {
          const aCritical = a.displayRisk === "Critical";
          const bCritical = b.displayRisk === "Critical";

          if (aCritical && !bCritical) return -1;
          if (!aCritical && bCritical) return 1;
          return 0;
        })
        .slice(0, 5);

      riskMap.set(machineId, sortedItems);
    });

    return riskMap;
  }, [components, getComponentRiskStatus]);

  const highRiskComponents = React.useMemo(() => {
    const mapped = components.map((c) => {
      const risk = getComponentRiskStatus(c);
      const cMachId = String(c.machineId || c.machine_id || c.machine?.id || "");
      const machine = machines.find(
        (m) => String(m.machineId || m.id).toLowerCase() === cMachId.toLowerCase(),
      );

      const machineLabel = cleanMachineName(machine ? (machine.name || machine.machineId) : (c.machineName || c.machineId || "Fleet Asset"));
      const categoryLabel = getComponentCategory(c);

      const lifeUsed = c.plannedLife
        ? Math.min(100, Math.round((c.currentHours / c.plannedLife) * 100))
        : 0;

      const remainingLifePercent = c.healthScore !== undefined && c.healthScore !== null ? Number(c.healthScore) : (100 - lifeUsed);

      return {
        id: c.id,
        machineId: cMachId,
        machineLabel,
        cat: categoryLabel,
        description: String(c.description || c.displayName || c.name || ""),
        serialNumber: String(c.serialNumber || c.serial_number || ""),
        supplier: String(c.supplier || ""),
        installHours: Number(c.installHours ?? c.install_hours ?? 0),
        currentHours: Number(c.currentHours ?? c.current_hours ?? 0),
        plannedLife: Number(c.plannedLife ?? c.planned_life ?? 0),
        replacementCost: Number(c.replacementCost ?? c.replacement_cost ?? 0),
        condition: Number(c.condition ?? 1),
        cond: risk,
        life: remainingLifePercent,
        risk: risk,
        driver: String(c.intelligence?.riskDriver || (risk === "Healthy" ? "Safe Operational Parameters" : "")),
      };
    });

    const searched = mapped.filter((c) => {
      const query = riskSearch.toLowerCase();
      if (!query) return true;
      return (
        c.machineLabel.toLowerCase().includes(query) ||
        c.cat.toLowerCase().includes(query) ||
        c.serialNumber?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    });

    const highRiskOnly = searched.filter(
      (c) => c.risk === "Critical" || c.risk === "Warning" || c.risk === "Monitor",
    );

    const result = highRiskOnly.length > 0 ? highRiskOnly : searched;

    return result.sort((a, b) => {
      const aCritical = a.risk === "Critical";
      const bCritical = b.risk === "Critical";
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      return 0;
    });
  }, [components, machines, riskSearch, getComponentCategory, getComponentRiskStatus]);

  const fleetScrollRef = React.useRef<HTMLDivElement | null>(null);

  const riskLogicScrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollFleetCards = (direction: "left" | "right") => {
    const container = fleetScrollRef.current;
    if (!container) return;

    const card = container.querySelector(
      "[data-fleet-card]",
    ) as HTMLElement | null;
    const gap = 16;
    const cardsToScroll = 4;

    const scrollAmount = card
      ? card.offsetWidth * cardsToScroll + gap * (cardsToScroll - 1)
      : container.clientWidth;

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollRiskLogicCards = (direction: "left" | "right") => {
    const container = riskLogicScrollRef.current;
    if (!container) return;

    const card = container.querySelector(
      "[data-risk-logic-card]",
    ) as HTMLElement | null;

    const gap = 20;
    const cardsToScroll = 4;

    const scrollAmount = card
      ? card.offsetWidth * cardsToScroll + gap * (cardsToScroll - 1)
      : container.clientWidth;

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <CardSkeleton />

        <ChartSkeleton />

        <FleetSkeleton />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>

        <TableSkeleton rows={8} />

        <TableSkeleton rows={5} />
      </div>
    );
  }

  const isExpired =
    subscription?.status === "expired" ||
    (subscription?.subscriptionEndDate &&
      new Date(subscription.subscriptionEndDate).getTime() < Date.now()) ||
    (subscription?.subscription_end_date &&
      new Date(subscription.subscription_end_date).getTime() < Date.now());

  const machineLimit =
    subscription?.plan?.machineLimit ||
    subscription?.plan?.machine_limit ||
    subscription?.machine_limit ||
    50;
  const isMachineLimitReached = machines.length >= machineLimit;

  return (
    <div className="hme-dashboard-pro min-h-screen bg-[#F8F9FC] px-4 py-5 font-sans text-slate-900 antialiased dark:bg-slate-900 dark:text-white sm:px-6 lg:px-8 lg:py-7">
      <style>{`
        .hme-dashboard-pro {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .hme-dashboard-pro .font-black {
          font-weight: 700 !important;
        }

        .hme-dashboard-pro h1,
        .hme-dashboard-pro h2,
        .hme-dashboard-pro h3 {
          letter-spacing: -0.025em;
        }

        .hme-dashboard-pro table th {
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
        }

        .hme-dashboard-pro table td {
          font-size: 13px;
          line-height: 1.55;
        }

        .hme-dashboard-pro input,
        .hme-dashboard-pro select,
        .hme-dashboard-pro button {
          font-family: inherit;
        }
      `}</style>

      {/* ⚠️ PLAN EXPIRED ALERT BANNER (NON-BLOCKING) */}
      {isExpired && (
        <div className="mx-auto mb-6 max-w-7xl overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-200">
                  Plan Expired – Dashboard in Read-Only Mode
                </h4>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300/90">
                  Your subscription plan has expired. Creating, updating, or deleting machines and staff is currently restricted. Please renew your plan to restore full operations.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/plans")}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-amber-700"
            >
              Renew Plan Now ➔
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ MACHINE LIMIT REACHED ALERT BANNER */}
      {!isExpired && isMachineLimitReached && (
        <div className="mx-auto mb-6 max-w-7xl overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-sm dark:border-blue-500/30 dark:bg-blue-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-blue-950 dark:text-blue-200">
                  Machine Capacity Limit Reached ({machines.length} / {machineLimit} Machines)
                </h4>
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300/90">
                  You have reached the maximum machine limit allowed for your current plan. Upgrade your plan to connect more fleet machines.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/plans")}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700"
            >
              Upgrade Plan ➔
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto mb-7 max-w-7xl">
        <CompanyAdminNav />
      </div>

      <div className="mx-auto mb-8 max-w-7xl">
        <div className="relative overflow-hidden rounded-[28px] border border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 lg:p-8 shadow-xl">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
          <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 translate-x-10 -translate-y-10 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            {/* Left Section */}
            <div className="max-w-md">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                Fleet Component Intelligence
              </div>

              <h1 className="mt-4 text-[30px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[36px] lg:text-[40px]">
                Component <span className="text-blue-200">Lifecycle</span>
                <br />
                Dashboard
              </h1>

              <div className="mt-4 flex items-start gap-3">
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />

                <p className="max-w-[340px] text-[13px] leading-5 font-medium text-blue-100">
                  Real-time fleet health, lifecycle tracking and live diagnostic insights.
                </p>
              </div>
            </div>

            {/* Right Stats */}
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:max-w-[720px]">
              {[
                {
                  label: "Total Machines",
                  value: String(summaryStats.totalMachines),
                  color: "text-white",
                },
                {
                  label: "Total Components",
                  value: String(summaryStats.totalComponents),
                  color: "text-white",
                },
                {
                  label: "Healthy",
                  value: String(summaryStats.healthyCount),
                  color: "text-emerald-300",
                },
                {
                  label: "Warning",
                  value: String(summaryStats.warningCount),
                  color: "text-amber-300",
                },
                {
                  label: "Critical",
                  value: String(summaryStats.criticalCount),
                  color: "text-red-300",
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/15"
                >
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-100 truncate">
                    {stat.label}
                  </p>

                  <p
                    className={`mt-2 text-[22px] sm:text-[26px] lg:text-[28px] font-extrabold leading-none tracking-tight ${stat.color}`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10">
        <MachineHealthChart machines={machines} components={components} />

        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-blue-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
                <Truck size={19} />
              </div>

              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                  Fleet Overview
                </h2>

                <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                  {machines.length} machines • {components.length} components
                  connected with live component data
                </p>
              </div>
            </div>

            {fleetMachines.length > 4 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollFleetCards("left")}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                  aria-label="Scroll fleet left"
                >
                  <ChevronRight size={18} className="rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollFleetCards("right")}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                  aria-label="Scroll fleet right"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {fleetMachines.length === 0 ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-blue-50/60 to-orange-50/50 p-8 text-center text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-slate-400">
              No machines found. Please register a machine under the Component
              Management page.
            </div>
          ) : (
            <div className="relative overflow-visible rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-100 via-blue-50/70 to-orange-50/50 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

              <div
                ref={fleetScrollRef}
                className="fleet-scroll relative z-10 flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden scroll-smooth px-1 py-2"
              >
                {fleetMachines.map((m) => {
                  const machineRiskComponents =
                    riskComponentsByMachineId.get(
                      String(m.machineId || m.id),
                    ) || [];

                  const riskLevel =
                    m.crit > 0
                      ? "Critical"
                      : m.warn > 0
                        ? "Warning"
                        : "Healthy";

                  const cardClass =
                    riskLevel === "Critical"
                      ? "border-red-200/90 bg-gradient-to-br from-red-50/90 via-slate-50 to-red-100/60 hover:border-red-300 hover:shadow-[0_18px_42px_rgba(220,38,38,0.14)] dark:border-red-500/25 dark:from-red-950/30 dark:via-slate-900 dark:to-slate-900 dark:hover:border-red-500/45"
                      : riskLevel === "Warning"
                        ? "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-slate-50 to-amber-100/60 hover:border-amber-300 hover:shadow-[0_18px_42px_rgba(245,158,11,0.14)] dark:border-amber-500/25 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 dark:hover:border-amber-500/45"
                        : "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-slate-50 to-emerald-100/60 hover:border-emerald-300 hover:shadow-[0_18px_42px_rgba(16,185,129,0.12)] dark:border-emerald-500/25 dark:from-emerald-950/25 dark:via-slate-900 dark:to-slate-900 dark:hover:border-emerald-500/45";

                  const innerBoxClass =
                    riskLevel === "Critical"
                      ? "border-red-200/80 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10"
                      : riskLevel === "Warning"
                        ? "border-amber-200/80 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10"
                        : "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10";

                  const riskBadgeClass =
                    riskLevel === "Critical"
                      ? "border-red-200 bg-red-100 text-red-700 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300"
                      : riskLevel === "Warning"
                        ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300"
                        : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300";

                  const dotClass =
                    riskLevel === "Critical"
                      ? "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.13)]"
                      : riskLevel === "Warning"
                        ? "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.13)]"
                        : "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.13)]";

                  const typeBadgeClass =
                    riskLevel === "Critical"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                      : riskLevel === "Warning"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

                  const actionButtonClass =
                    riskLevel === "Critical"
                      ? "border-red-200 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
                      : riskLevel === "Warning"
                        ? "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                        : "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25";

                  const statusText =
                    riskLevel === "Critical"
                      ? "Immediate attention required"
                      : riskLevel === "Warning"
                        ? "Needs close monitoring"
                        : "Operating within safe range";

                  const alertDuration = `${Math.max(machineRiskComponents.length * 3, 3)}s`;

                  return (
                    <div
                      key={m.id}
                      data-fleet-card
                      className={`group relative flex min-h-[410px] min-w-[280px] snap-start flex-col overflow-hidden rounded-[1.65rem] border p-5 shadow-[0_10px_28px_rgba(15,23,42,0.055)] transition-all duration-300 hover:-translate-y-0.5 dark:hover:shadow-slate-950/30 sm:min-w-[300px] lg:min-w-[calc((100%-48px)/4)] ${cardClass}`}
                    >
                      <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-white/30 blur-3xl transition-all group-hover:bg-white/40 dark:bg-white/5" />
                      <div className="pointer-events-none absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-slate-400/10 blur-3xl dark:bg-white/5" />

                      {/* Header */}
                      <div className="relative z-10 mb-4 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
                            />
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Machine Asset
                            </p>
                          </div>

                          <h3
                            className="line-clamp-1 text-sm font-extrabold leading-tight text-slate-950 dark:text-white"
                            title={cleanMachineName(m.name)}
                          >
                            {cleanMachineName(m.name)}
                          </h3>

                          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            {statusText}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 max-w-[120px] truncate rounded-lg border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${typeBadgeClass}`}
                          title={m.type}
                        >
                          {m.type}
                        </span>
                      </div>

                      {/* Middle Counter Box */}
                      <div
                        className={`relative z-10 rounded-2xl border p-4 shadow-sm ${innerBoxClass}`}
                      >
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                              {m.comps}
                            </p>

                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Components
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${riskBadgeClass}`}
                          >
                            {riskLevel}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 dark:border-red-500/20 dark:bg-red-500/10">
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">
                              {m.crit}
                            </p>

                            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Critical
                            </p>
                          </div>

                          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                              {m.warn}
                            </p>

                            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Warning
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Machine Health Metric Bar */}
                      <div className="relative z-10 mt-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <span>Fleet Readiness</span>
                          <span
                            className={
                              riskLevel === "Critical"
                                ? "text-red-600 dark:text-red-400 font-black"
                                : riskLevel === "Warning"
                                ? "text-amber-600 dark:text-amber-400 font-black"
                                : "text-emerald-600 dark:text-emerald-400 font-black"
                            }
                          >
                            {riskLevel === "Critical"
                              ? "Action Needed"
                              : riskLevel === "Warning"
                              ? "Attention Required"
                              : "100% Operational"}
                          </span>
                        </div>

                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              riskLevel === "Critical"
                                ? "bg-red-500 w-2/5"
                                : riskLevel === "Warning"
                                ? "bg-amber-500 w-3/4"
                                : "bg-emerald-500 w-full"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Clean Footer with Modal Open Button */}
                      <div className="relative z-10 mt-auto flex items-center justify-between border-t border-slate-200/80 pt-3.5 dark:border-slate-700/70">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Fleet Status
                          </p>

                          <p
                            className={`mt-0.5 text-xs font-black tracking-tight ${
                              riskLevel === "Critical"
                                ? "text-red-700 dark:text-red-400"
                                : riskLevel === "Warning"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            {riskLevel}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedFleetMachineModal(m)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${actionButtonClass}`}
                          title={`View components for ${cleanMachineName(m.name)}`}
                        >
                          <span>Inspect Components</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pointer-events-none absolute bottom-4 right-0 top-4 w-16 bg-gradient-to-l from-slate-100 via-blue-50/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" />
              <div className="pointer-events-none absolute bottom-4 left-0 top-4 w-10 bg-gradient-to-r from-slate-100 via-blue-50/80 to-transparent dark:from-slate-900 dark:via-slate-900/80" />

              <style>{`
       .fleet-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  scroll-padding-inline: 12px;
  transform: translateZ(0);
  will-change: scroll-position;
  contain: layout paint;
}

        .fleet-scroll::-webkit-scrollbar {
          display: none;
        }

        .risk-alert-card {
  opacity: 0;
  animation-name: risk-alert-swap;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  backface-visibility: hidden;
}

@keyframes risk-alert-swap {
  0% {
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  36% {
    opacity: 1;
  }
  44% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}
      `}</style>
            </div>
          )}
        </section>

        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Replacement Value by Category */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-700">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <BarChart3 size={20} />
                    </div>

                    <div>
                      <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                        Replacement Value by Category
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Cost exposure grouped by component category
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Total Value
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {summaryStats.formattedReplacementCost}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Categories
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {categoryData.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Components
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {components.length}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Critical
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {summaryStats.criticalCount}
                    </p>
                  </div>
                </div>

                <div className="h-[310px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryData}
                      margin={{ top: 12, right: 12, left: -14, bottom: 4 }}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        vertical={false}
                        stroke="#e5e7eb"
                      />

                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tickMargin={12}
                        tick={{
                          fontSize: 11,
                          fontWeight: 600,
                          fill: "#64748b",
                        }}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        tickFormatter={(value) =>
                          Number(value) >= 1000
                            ? `${Number(value) / 1000}k`
                            : `${value}`
                        }
                        tick={{
                          fontSize: 11,
                          fontWeight: 600,
                          fill: "#94a3b8",
                        }}
                      />

                      <Tooltip
                        cursor={{ fill: "rgba(15,23,42,0.04)" }}
                        formatter={(value: any) => [
                          `R ${Number(value || 0).toLocaleString()}`,
                          "Replacement Value",
                        ]}
                        labelStyle={{
                          color: "#0f172a",
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
                          padding: "10px 12px",
                          fontSize: "12px",
                        }}
                      />

                      <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                        barSize={38}
                        animationDuration={700}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Component Distribution */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-700">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <PieChartIcon size={20} />
                    </div>

                    <div>
                      <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                        Component Distribution
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Category-wise component allocation across fleet
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Total Components
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {components.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-[260px_1fr] lg:items-center">
                <div className="relative h-[260px]">
                  <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
                    <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {components.length}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Total
                    </p>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value: any) => [
                          `${value}%`,
                          "Distribution",
                        ]}
                        labelStyle={{
                          color: "#0f172a",
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
                          padding: "10px 12px",
                          fontSize: "12px",
                        }}
                      />

                      <Pie
                        data={distributionData}
                        innerRadius={72}
                        outerRadius={104}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={3}
                        animationDuration={700}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 hme-hide-scrollbar">
                  {distributionData.slice(0, 8).map((item, i) => {
                    const healthStats = categoryHealthMap[item.name] || { healthy: 0, warning: 0, critical: 0, avgHealth: 100 };

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedCategoryHealthModal(item.name)}
                        title={`Click to view all components in ${item.name} and their health scores`}
                        className="group cursor-pointer rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 transition-all hover:border-blue-300 hover:bg-white hover:shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-blue-500/40 dark:hover:bg-slate-900"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full shadow-xs"
                              style={{ backgroundColor: item.color }}
                            />

                            <p className="truncate text-xs font-black text-slate-800 transition group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">
                              {item.name}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${
                                healthStats.avgHealth < 50
                                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                                  : healthStats.avgHealth < 85
                                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                              }`}
                            >
                              {healthStats.avgHealth}% Health
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {item.count} {item.count === 1 ? "unit" : "units"}
                            </span>
                          </div>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(item.value, 6)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-6 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 lg:px-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle size={21} />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                        High-Risk Components
                      </h3>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        {highRiskComponents.length} Active Records
                      </span>
                    </div>

                    <p className="mt-1.5 max-w-2xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                      Artisans priority view based on remaining life, condition
                      rating, cost exposure and live risk intelligence signals.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-500">
                      Critical
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-red-700 dark:text-red-400">
                      {
                        highRiskComponents.filter(
                          (item) => String(item.risk || item.cond || "").toLowerCase().includes("crit"),
                        ).length
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 dark:border-orange-500/20 dark:bg-orange-500/10">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-orange-500">
                      Warning
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-orange-700 dark:text-orange-400">
                      {
                        highRiskComponents.filter(
                          (item) => String(item.risk || item.cond || "").toLowerCase().includes("warn"),
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-sm">
                  <Search
                    size={15}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    placeholder="Search by machine, category, serial or description..."
                    value={riskSearch}
                    onChange={(e) => setRiskSearch(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pl-10 text-xs font-semibold text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500/40"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Critical
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      Warning
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Healthy
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Machine
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Component
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Description
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Condition
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Remaining Life
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Risk Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Risk Driver
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Alert
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                  {highRiskComponents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-14">
                        <div className="mx-auto max-w-md text-center">
                          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckLineIcon size={24} />
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            All components are operating within safe limits
                          </h4>

                          <p className="mt-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                            No critical, warning or monitor level component is
                            available for the current filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    highRiskComponents.map((item, i) => (
                      <tr
                        key={i}
                        className="group bg-white transition-all hover:bg-slate-50/80 dark:bg-slate-800 dark:hover:bg-slate-700/40"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-10 w-1 rounded-full ${item.risk === "Critical"
                                  ? "bg-red-500"
                                  : item.risk === "Warning"
                                    ? "bg-orange-500"
                                    : item.risk === "Monitor"
                                      ? "bg-yellow-500"
                                      : "bg-emerald-500"
                                }`}
                            />

                            <div>
                              <p className="max-w-[160px] truncate text-sm font-extrabold text-slate-950 dark:text-white">
                                {item.machineLabel}
                              </p>

                              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Machine Asset
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            {item.cat || "N/A"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div>
                            <p className="max-w-[220px] truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                              {item.description || "N/A"}
                            </p>

                            <p className="mt-1 text-[10px] font-semibold text-slate-400">
                              Serial: {item.serialNumber || "N/A"}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${item.cond === "Critical"
                                ? "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                                : item.cond === "Warning"
                                  ? "bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20"
                                  : item.cond === "Monitor"
                                    ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400 dark:ring-yellow-500/20"
                                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                              }`}
                          >
                            {item.cond}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="w-36">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Life Left
                              </span>

                              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {item.life}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className={`h-full rounded-full ${item.life < 15
                                    ? "bg-red-500"
                                    : item.life < 30
                                      ? "bg-orange-500"
                                      : "bg-emerald-500"
                                  }`}
                                style={{ width: `${item.life}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${item.risk === "Critical"
                                ? "bg-red-600 text-white shadow-sm shadow-red-500/20"
                                : item.risk === "Warning"
                                  ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                                  : item.risk === "Monitor"
                                    ? "bg-yellow-500 text-white shadow-sm shadow-yellow-500/20"
                                    : "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                              }`}
                          >
                            {item.risk}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex max-w-[190px] rounded-xl border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${item.risk === "Critical"
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                                : item.risk === "Warning"
                                  ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                                  : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400"
                              }`}
                          >
                            <span className="truncate">{item.driver}</span>
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${item.risk === "Critical"
                                  ? "bg-red-500 shadow-[0_0_0_5px_rgba(239,68,68,0.12)]"
                                  : item.risk === "Warning"
                                    ? "bg-orange-500 shadow-[0_0_0_5px_rgba(249,115,22,0.12)]"
                                    : "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]"
                                }`}
                            />

                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {item.risk === "Critical"
                                ? "Immediate Review"
                                : item.risk === "Warning"
                                  ? "Monitor Closely"
                                  : "Stable"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800">
            <div className="relative border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/60 px-6 py-6 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 lg:px-7">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <Database size={21} />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                        Risk Logic Verification
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">
                        Live API Data
                      </span>
                    </div>

                    <p className="mt-1.5 max-w-2xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                      Live verification view generated from component API
                      records, remaining life, condition rating, risk driver and
                      alert output.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="grid grid-cols-3 gap-3 sm:min-w-[390px]">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                        Records
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">
                        {highRiskComponents.length}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-600 dark:text-red-400">
                        Critical
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-red-700 dark:text-red-400">
                        {
                          highRiskComponents.filter(
                            (item) => item.risk === "Critical",
                          ).length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
                        Warning
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-orange-700 dark:text-orange-400">
                        {
                          highRiskComponents.filter(
                            (item) => item.risk === "Warning",
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-7">
              {highRiskComponents.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckLineIcon size={24} />
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    No risk verification records found
                  </h4>

                  <p className="mt-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    Data will appear here when component API returns warning,
                    monitor or critical risk records.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {highRiskComponents.length > 4 && (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollRiskLogicCards("left")}
                        className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:-translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                        aria-label="Scroll risk logic left"
                      >
                        <ChevronRight size={20} className="rotate-180" />
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollRiskLogicCards("right")}
                        className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                        aria-label="Scroll risk logic right"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}

                  <div
                    ref={riskLogicScrollRef}
                    className="risk-logic-scroll flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-12 pb-3"
                  >
                    {highRiskComponents.map((item, i) => {
                      const statusClass =
                        item.risk === "Critical"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                          : item.risk === "Warning"
                            ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                            : item.risk === "Monitor"
                              ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";

                      const barClass =
                        item.risk === "Critical"
                          ? "bg-red-500"
                          : item.risk === "Warning"
                            ? "bg-orange-500"
                            : item.risk === "Monitor"
                              ? "bg-yellow-500"
                              : "bg-emerald-500";

                      const alertLabel =
                        item.risk === "Critical"
                          ? "Immediate Review"
                          : item.risk === "Warning"
                            ? "Monitor Closely"
                            : item.risk === "Monitor"
                              ? "Observation Required"
                              : "Stable";

                      return (
                        <div
                          key={item.id || i}
                          data-risk-logic-card
                          className="group relative min-w-[280px] snap-start overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/30 dark:hover:shadow-slate-950/30 sm:min-w-[300px] xl:min-w-[calc((100%-60px)/4)]"
                        >
                          <div
                            className={`absolute inset-x-0 top-0 h-1 ${barClass}`}
                          />

                          <div className="mb-5 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                                {item.machineLabel || "N/A"}
                              </p>

                              <p className="mt-1 min-h-[34px] text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                                {item.description ||
                                  item.cat ||
                                  "Component risk record"}
                              </p>
                            </div>

                            <span
                              className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${statusClass}`}
                            >
                              {item.risk}
                            </span>
                          </div>

                          <div className="mb-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Life Left
                              </p>

                              <p className="mt-1 text-base font-extrabold text-slate-950 dark:text-white">
                                {item.life}%
                              </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Condition
                              </p>

                              <p className="mt-1 truncate text-base font-extrabold text-slate-950 dark:text-white">
                                {item.cond || item.condition || "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Component
                              </p>

                              <span className="max-w-[135px] truncate rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                {item.cat || "N/A"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Risk Driver
                              </p>

                              <span className="max-w-[135px] truncate rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                {item.driver || "Normal"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                                Alert Output
                              </p>

                              <span
                                className={`max-w-[135px] truncate rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${item.risk === "Critical"
                                    ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                                    : item.risk === "Warning"
                                      ? "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                                      : "border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                                  }`}
                              >
                                {alertLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pointer-events-none absolute bottom-3 right-0 top-0 w-16 bg-gradient-to-l from-white to-transparent dark:from-slate-800" />
                  <div className="pointer-events-none absolute bottom-3 left-0 top-0 w-10 bg-gradient-to-r from-white to-transparent dark:from-slate-800" />

                  <style>{`
                  .risk-logic-scroll {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    overscroll-behavior-x: contain;
                    -webkit-overflow-scrolling: touch;
                  }

                  .risk-logic-scroll::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                </div>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-indigo-200/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-8 shadow-2xl">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

            {/* Icon */}
            <div className="absolute right-6 top-6 opacity-10">
              <Shield size={110} className="text-white" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Left */}
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-sm">
                  {subscription?.plan?.planName
                    ? `${subscription.plan.planName.toUpperCase()} PLAN`
                    : "ACTIVE SUBSCRIPTION"}
                </div>

                <h3 className="mt-4 text-3xl font-extrabold tracking-tight text-white capitalize">
                  {subscription?.plan?.planName || "Enterprise"} Access
                </h3>

                <p className="mt-3 text-[15px] leading-7 text-blue-100">
                  Your organization is currently on the{" "}
                  <span className="font-bold text-amber-300 uppercase">
                    {subscription?.plan?.planName ||
                      subscription?.name ||
                      "Active"}
                  </span>{" "}
                  plan with complete access to predictive analytics, GPS telemetry,
                  AI-powered insights, and executive reporting across your
                  fleet.
                </p>
              </div>

              {/* Right */}
              <button
                onClick={() => navigate("/company-admin/subscriptions")}
                className="group inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-bold text-[#3730D9] shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-blue-50 hover:shadow-2xl"
              >
                Manage Subscription
                <ArrowRight
                  size={18}
                  className="ml-3 transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>
            </div>
          </div>

          <div className="pt-20 border-t border-slate-200">
            <div className="mb-10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                <History size={20} />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Billing & Enterprise Control
              </h2>
            </div>

            <CompanyPlanCard
              subscription={subscription}
              machineCount={machines.length}
            />

            <div className="mt-10">
              <SubscriptionHistoryTable history={history} activeSubscription={subscription} />
            </div>
          </div>
        </div>
      </div>

      {/* ── ALL MACHINE COMPONENTS MODAL ── */}
      {selectedFleetMachineModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setSelectedFleetMachineModal(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <Truck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {selectedFleetMachineModal.name} ({selectedFleetMachineModal.type || "Machine Asset"})
                  </h3>
                  <p className="text-xs font-semibold text-blue-200">
                    All registered components and live health status records
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFleetMachineModal(null)}
                className="rounded-xl p-2 text-blue-200 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: List of Components */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const targetMachId = String(
                  selectedFleetMachineModal.id ||
                    selectedFleetMachineModal.machineId ||
                    "",
                ).toLowerCase();
                const targetMachName = String(
                  selectedFleetMachineModal.name || "",
                ).toLowerCase();

                const machComps = components.filter((c: any) => {
                  const cId = String(
                    c.machineId || c.machine_id || c.machine?.id || "",
                  ).toLowerCase();
                  const cName = String(
                    c.machineName || c.machine?.name || "",
                  ).toLowerCase();
                  return (
                    (cId && targetMachId && cId === targetMachId) ||
                    (cName && targetMachName && cName === targetMachName)
                  );
                });

                if (machComps.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Truck size={40} className="mb-3 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        No registered components found for {selectedFleetMachineModal.name}.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {machComps.map((comp: any) => {
                      const name =
                        comp.displayName ||
                        comp.name ||
                        comp.description ||
                        comp.category ||
                        "Component";
                      const score =
                        typeof comp.healthScore === "number"
                          ? comp.healthScore
                          : null;
                      const isCrit =
                        (score !== null && score < 50) ||
                        comp.status === "Critical" ||
                        comp.status === "CRITICAL";
                      const isWarn =
                        (score !== null && score >= 50 && score < 85) ||
                        comp.status === "Warning" ||
                        comp.status === "WARNING" ||
                        comp.status === "Monitor";

                      const statusBadgeClass = isCrit
                        ? "border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300"
                        : isWarn
                          ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300"
                          : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300";

                      const statusLabel = isCrit
                        ? "CRITICAL"
                        : isWarn
                          ? "WARNING"
                          : "HEALTHY";

                      return (
                        <div
                          key={comp.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadgeClass}`}
                              >
                                {statusLabel}
                              </span>
                              {comp.serialNumber && (
                                <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                  {comp.serialNumber}
                                </span>
                              )}
                            </div>

                            <h4
                              className="mt-3 truncate text-sm font-extrabold text-slate-900 dark:text-white"
                              title={name}
                            >
                              {name}
                            </h4>

                            <div className="mt-3 flex items-baseline justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Health Score
                              </span>
                              <span className="text-xl font-black text-slate-900 dark:text-white">
                                {score !== null ? `${score}%` : "100%"}
                              </span>
                            </div>

                            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCrit
                                    ? "bg-red-500"
                                    : isWarn
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${score !== null ? score : 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          {comp.intelligence?.riskDriver && (
                            <div className="mt-3 border-t border-slate-200/60 pt-2 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Issue Driver:{" "}
                              </span>
                              {comp.intelligence.riskDriver}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Click X or close button to return to dashboard
              </span>
              <button
                type="button"
                onClick={() => setSelectedFleetMachineModal(null)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPONENT PARAMETERS MODAL ── */}
      {selectedParamComponentModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setSelectedParamComponentModal(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedParamComponentModal.displayName || selectedParamComponentModal.description || selectedParamComponentModal.name || "Component Details"}
                  </h3>
                  <p className="text-xs font-semibold text-blue-200">
                    S/N: {selectedParamComponentModal.serialNumber || "N/A"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedParamComponentModal(null)}
                className="rounded-xl p-2 text-blue-200 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body: Inspected Parameter Values */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Updated Health Status
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {selectedParamComponentModal.status || selectedParamComponentModal.intelligence?.riskStatus || "Healthy"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Calculated Score
                  </p>
                  <p className="mt-1 text-xl font-black text-blue-600 dark:text-blue-400">
                    {selectedParamComponentModal.healthScore !== undefined ? `${selectedParamComponentModal.healthScore}%` : "100%"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  Inspected Parameters & Live Values
                </h4>

                {(() => {
                  const driver = selectedParamComponentModal.intelligence?.riskDriver || "";
                  const paramPairs = driver && driver !== "Parameter Variance" && driver !== "Component requires inspection"
                    ? driver.split(", ").map((str: string) => {
                        const parts = str.split(": ");
                        return { name: parts[0], value: parts[1] || "-" };
                      })
                    : [];

                  if (paramPairs.length === 0) {
                    return (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Standard operational metric checks within normal limits.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {paramPairs.map((param: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                            {param.name}
                          </span>
                          <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            {param.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedParamComponentModal(null)}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY COMPONENT HEALTH MODAL ── */}
      {selectedCategoryHealthModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setSelectedCategoryHealthModal(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <PieChartIcon size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedCategoryHealthModal} Components
                  </h3>
                  <p className="text-xs font-semibold text-blue-200">
                    Live calculated health scores & status breakdown for {selectedCategoryHealthModal}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCategoryHealthModal(null)}
                className="rounded-xl p-2 text-blue-200 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const catComps = components.filter((c: any) => {
                  const cat = getComponentCategory(c) || c.category || "General";
                  return cat.toLowerCase() === selectedCategoryHealthModal.toLowerCase();
                });

                const stats = categoryHealthMap[selectedCategoryHealthModal] || { healthy: 0, warning: 0, critical: 0, avgHealth: 100 };

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 text-center dark:border-blue-500/20 dark:bg-blue-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Category Health</p>
                        <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{stats.avgHealth}%</p>
                      </div>

                      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Healthy</p>
                        <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.healthy}</p>
                      </div>

                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Warning</p>
                        <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{stats.warning}</p>
                      </div>

                      <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Critical</p>
                        <p className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">{stats.critical}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {catComps.map((comp: any) => {
                        const name = comp.displayName || comp.name || comp.description || comp.category || "Component";
                        const score = typeof comp.healthScore === "number" ? comp.healthScore : 100;
                        const isCrit = score < 50 || comp.status === "Critical" || comp.status === "CRITICAL";
                        const isWarn = (!isCrit && score < 85) || comp.status === "Warning" || comp.status === "WARNING";

                        const statusBadgeClass = isCrit
                          ? "border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300"
                          : isWarn
                          ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300"
                          : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300";

                        const statusLabel = isCrit ? "CRITICAL" : isWarn ? "WARNING" : "HEALTHY";

                        return (
                          <div
                            key={comp.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadgeClass}`}>
                                  {statusLabel}
                                </span>
                                {comp.serialNumber && (
                                  <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                    {comp.serialNumber}
                                  </span>
                                )}
                              </div>

                              <h4 className="mt-3 truncate text-sm font-extrabold text-slate-900 dark:text-white" title={name}>
                                {name}
                              </h4>

                              <div className="mt-3 flex items-baseline justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Calculated Health</span>
                                <span className="text-xl font-black text-slate-900 dark:text-white">{score}%</span>
                              </div>

                              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>

                            {comp.intelligence?.riskDriver && (
                              <div className="mt-3 border-t border-slate-200/60 pt-2 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Live Values: </span>
                                {comp.intelligence.riskDriver}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedCategoryHealthModal(null)}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MACHINE COMPONENT HEALTH INSPECTOR MODAL ── */}
      {selectedFleetMachineModal && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setSelectedFleetMachineModal(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {cleanMachineName(selectedFleetMachineModal.name)}
                  </h3>
                  <p className="text-xs font-semibold text-blue-200">
                    {selectedFleetMachineModal.type} • Live Machine Diagnostic Components
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFleetMachineModal(null)}
                className="rounded-xl p-2 text-blue-200 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {(() => {
                const targetId = String(
                  selectedFleetMachineModal.machineId || selectedFleetMachineModal.id || "",
                ).toLowerCase().trim();

                const machComps = components.filter((c: any) => {
                  const cMachId = String(
                    c.machineId || c.machine_id || c.machine?.id || c.machine?.machineId || "",
                  ).toLowerCase().trim();
                  return cMachId && targetId && (cMachId === targetId || targetId.includes(cMachId) || cMachId.includes(targetId));
                });

                const critCount = machComps.filter(
                  (c) => getComponentRiskStatus(c) === "Critical",
                ).length;
                const warnCount = machComps.filter(
                  (c) => getComponentRiskStatus(c) === "Warning" || getComponentRiskStatus(c) === "Monitor",
                ).length;
                const healthyCount = machComps.length - critCount - warnCount;

                const overallScore = machComps.length > 0
                  ? Math.round(
                      machComps.reduce(
                        (sum, c) => sum + (typeof c.healthScore === "number" ? c.healthScore : 100),
                        0,
                      ) / machComps.length,
                    )
                  : 100;

                return (
                  <>
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/80 p-4 text-center dark:border-blue-500/20 dark:bg-blue-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Components</p>
                        <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{machComps.length}</p>
                      </div>

                      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Healthy</p>
                        <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{healthyCount}</p>
                      </div>

                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Warning</p>
                        <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{warnCount}</p>
                      </div>

                      <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Critical</p>
                        <p className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">{critCount}</p>
                      </div>
                    </div>

                    {/* Components List */}
                    {machComps.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-semibold text-slate-400 dark:border-slate-800">
                        No registered components found for this machine.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {machComps.map((comp: any) => {
                          const name = comp.displayName || comp.name || comp.description || comp.category || "Component";
                          const score = typeof comp.healthScore === "number" ? comp.healthScore : 100;
                          const risk = getComponentRiskStatus(comp);

                          const isCrit = risk === "Critical";
                          const isWarn = risk === "Warning" || risk === "Monitor";

                          const statusBadgeClass = isCrit
                            ? "border-red-200 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300"
                            : isWarn
                            ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300"
                            : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300";

                          const statusLabel = isCrit ? "CRITICAL" : isWarn ? "WARNING" : "HEALTHY";

                          return (
                            <div
                              key={comp.id}
                              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-950"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadgeClass}`}>
                                    {statusLabel}
                                  </span>
                                  {comp.serialNumber && (
                                    <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                      {comp.serialNumber}
                                    </span>
                                  )}
                                </div>

                                <h4 className="mt-3 truncate text-sm font-extrabold text-slate-950 dark:text-white" title={name}>
                                  {name}
                                </h4>

                                <div className="mt-3 flex items-baseline justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Health Score</span>
                                  <span className="text-xl font-black text-slate-900 dark:text-white">{score}%</span>
                                </div>

                                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isCrit ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>

                              {comp.intelligence?.riskDriver && isCrit && (
                                <div className="mt-3 border-t border-slate-200/60 pt-2 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                  <span className="font-bold text-red-600 dark:text-red-400">Live Values: </span>
                                  {comp.intelligence.riskDriver}
                                </div>
                              )}
                              {comp.intelligence?.riskDriver && isWarn && (
                                <div className="mt-3 border-t border-slate-200/60 pt-2 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                  <span className="font-bold text-amber-600 dark:text-amber-400">Live Values: </span>
                                  {comp.intelligence.riskDriver}
                                </div>
                              )}
                              {!isCrit && !isWarn && (
                                <div className="mt-3 border-t border-slate-200/60 pt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ Safe Operational Parameters
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedFleetMachineModal(null)}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700"
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
