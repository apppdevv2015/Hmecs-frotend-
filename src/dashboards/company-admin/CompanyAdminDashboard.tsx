import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
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
  Trash2,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
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

import CompanyPlanCard from "./CompanyPlanCard";
import SubscriptionHistoryTable from "./SubscriptionHistoryTable";
import MachineHealthChart from "./MachineHealthChart";
import { userService } from "../../services/userService";
import { componentService } from "../../services/companyadmin/componentService";
import { CompanyAdminNav } from "../../components/company-admin/CompanyAdminNav";

const getArrayData = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.machines)) return response.machines;
  if (Array.isArray(response?.components)) return response.components;
  return [];
};

const normalizeComponent = (item: any) => ({
  id: String(item.id || item.componentId || item.component_id || ""),
  machineId: String(item.machineId || item.machine_id || item.machine?.id || ""),
  category: String(item.category || item.categoryName || item.type || ""),
  description: String(item.description || ""),
  serialNumber: String(item.serialNumber || item.serial_number || ""),
  supplier: String(item.supplier || ""),
  installHours: Number(item.installHours ?? item.install_hours ?? 0),
  currentHours: Number(item.currentHours ?? item.current_hours ?? 0),
  plannedLife: Number(item.plannedLife ?? item.planned_life ?? 0),
  replacementCost: Number(item.replacementCost ?? item.replacement_cost ?? 0),
  condition: Number(item.condition ?? 3),
  createdAt: item.createdAt || item.created_at,
  updatedAt: item.updatedAt || item.updated_at,
  intelligence: item.intelligence,
});

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

  const handleDeleteComponent = async () => {
    if (!deleteTarget) return;

    const toastId = toast.loading("Deleting component...");

    try {
      setDeleting(true);

      await componentService.deleteComponent(deleteTarget.id);

      const componentResponse = await componentService.getComponents();
      const rawComponents = getArrayData<any>(componentResponse);
      setComponents(rawComponents.map(normalizeComponent));

      toast.success("Component deleted successfully", { id: toastId });
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete component", {
        id: toastId,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEdit = (comp: any) => {
    setEditingComponent(comp);
    setEditForm({
      category: comp.cat || "",
      description: comp.description || "",
      serialNumber: comp.serialNumber || "",
      supplier: comp.supplier || "",
      installHours: String(comp.installHours || 0),
      currentHours: String(comp.currentHours || 0),
      plannedLife: String(comp.plannedLife || 0),
      replacementCost: String(comp.replacementCost || 0),
      condition: String(comp.condition || 3),
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [sub, subHistory, machinesList, componentResponse] = await Promise.all([
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
        const mappedComponents = rawComponents.map(normalizeComponent);
        setComponents(mappedComponents);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

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

  const summaryStats = React.useMemo(() => {
    const totalComponents = components.length;

    const criticalCount = components.filter(
      (c) => c.intelligence?.riskStatus === "Critical",
    ).length;

    const warningCount = components.filter(
      (c) => c.intelligence?.riskStatus === "Warning" || c.intelligence?.riskStatus === "Monitor",
    ).length;

    const totalReplacementCost = components.reduce(
      (sum, c) => sum + Number(c.replacementCost || 0),
      0,
    );

    const formattedReplacementCost =
      totalReplacementCost >= 1000000
        ? `R ${(totalReplacementCost / 1000000).toFixed(2)}M`
        : totalReplacementCost >= 1000
          ? `R ${(totalReplacementCost / 1000).toFixed(0)}K`
          : `R ${totalReplacementCost}`;

    return {
      totalComponents,
      criticalCount,
      warningCount,
      formattedReplacementCost,
    };
  }, [components]);

  const categoryData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    const colors: Record<string, string> = {
      Engine: "#f97316",
      Tyre: "#0ea5e9",
      Tyres: "#0ea5e9",
      Transmission: "#a855f7",
      Hydraulics: "#eab308",
      Hydraulic: "#eab308",
      Brakes: "#ec4899",
      Brake: "#ec4899",
      Electrical: "#06b6d4",
      Cooling: "#14b8a6",
      Cabin: "#64748b",
    };

    components.forEach((c) => {
      const cat = c.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(c.replacementCost || 0);
    });

    if (Object.keys(categoryTotals).length === 0) {
      return [
        { name: "Engine", value: 0, color: "#f97316" },
        { name: "Tyre", value: 0, color: "#0ea5e9" },
      ];
    }

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || "#64748b",
    }));
  }, [components]);

  const distributionData = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {};

    const colors: Record<string, string> = {
      Engine: "#ef4444",
      Tyre: "#3b82f6",
      Tyres: "#3b82f6",
      Transmission: "#a855f7",
      Hydraulics: "#eab308",
      Hydraulic: "#eab308",
      Brakes: "#f97316",
      Brake: "#f97316",
      Electrical: "#06b6d4",
      Cooling: "#14b8a6",
      Cabin: "#64748b",
    };

    components.forEach((c) => {
      const cat = c.category || "Other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const total = components.length || 1;

    if (Object.keys(categoryCounts).length === 0) {
      return [
        { name: "Engine", value: 0, color: "#ef4444" },
        { name: "Tyre", value: 0, color: "#3b82f6" },
      ];
    }

    return Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: colors[name] || "#64748b",
    }));
  }, [components]);

  const fleetMachines = React.useMemo(() => {
    if (machines.length === 0) return [];

    return machines.map((m) => {
      const machineComps = components.filter(
        (c) => c.machineId === m.machineId || c.machineId === m.id,
      );

      const compsCount = machineComps.length;

      const critCount = machineComps.filter(
        (c) => c.intelligence?.riskStatus === "Critical",
      ).length;

      const warnCount = machineComps.filter(
        (c) => c.intelligence?.riskStatus === "Warning" || c.intelligence?.riskStatus === "Monitor",
      ).length;

      const totalCost = machineComps.reduce((sum, c) => sum + Number(c.replacementCost || 0), 0);

      const formattedCost =
        totalCost >= 1000000
          ? `R ${(totalCost / 1000000).toFixed(2)}M`
          : totalCost >= 1000
            ? `R ${(totalCost / 1000).toFixed(0)}K`
            : `R ${totalCost}`;

      return {
        id: m.id || m.machineId || m.name,
        machineId: m.machineId || m.id,
        name: m.name || m.machineId || "Unnamed Machine",
        type: m.model || "N/A",
        comps: compsCount,
        crit: critCount,
        warn: warnCount,
        val: formattedCost,
      };
    });
  }, [machines, components]);

  const riskComponentsByMachineId = useMemo(() => {
    const riskMap = new Map<string, any[]>();

    components.forEach((component) => {
      const machineId = String(component.machineId || "");
      if (!machineId) return;

      const riskStatus = component.intelligence?.riskStatus;

      if (riskStatus === "Critical" || riskStatus === "Warning" || riskStatus === "Monitor") {
        const currentItems = riskMap.get(machineId) || [];

        currentItems.push({
          ...component,
          displayRisk: riskStatus === "Critical" ? "Critical" : riskStatus || "Warning",
        });

        riskMap.set(machineId, currentItems);
      }
    });

    riskMap.forEach((items, machineId) => {
      const sortedItems = items
        .sort((a, b) => {
          const aCritical =
            a.displayRisk === "Critical" || a.intelligence?.riskStatus === "Critical";

          const bCritical =
            b.displayRisk === "Critical" || b.intelligence?.riskStatus === "Critical";

          if (aCritical && !bCritical) return -1;
          if (!aCritical && bCritical) return 1;
          return 0;
        })
        .slice(0, 5);

      riskMap.set(machineId, sortedItems);
    });

    return riskMap;
  }, [components]);

  const handleSaveEdit = async () => {
    if (!editingComponent) return;

    const toastId = toast.loading("Updating component...");

    try {
      setSavingEdit(true);

      const payload = {
        category: editForm.category,
        description: editForm.description,
        serialNumber: editForm.serialNumber,
        supplier: editForm.supplier,
        installHours: Number(editForm.installHours || 0),
        currentHours: Number(editForm.currentHours || 0),
        plannedLife: Number(editForm.plannedLife || 0),
        replacementCost: Number(editForm.replacementCost || 0),
        condition: Number(editForm.condition || 3),
      };

      await componentService.updateComponent(editingComponent.id, payload);

      const componentResponse = await componentService.getComponents();
      const rawComponents = getArrayData<any>(componentResponse);
      setComponents(rawComponents.map(normalizeComponent));

      toast.success("Component updated successfully", { id: toastId });
      setEditingComponent(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update component", {
        id: toastId,
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const highRiskComponents = React.useMemo(() => {
    return components
      .filter(
        (c) =>
          c.intelligence?.riskStatus === "Critical" ||
          c.intelligence?.riskStatus === "Warning" ||
          c.intelligence?.riskStatus === "Monitor",
      )
      .map((c) => {
        const machine = machines.find((m) => m.machineId === c.machineId || m.id === c.machineId);

        const machineLabel = machine ? machine.name : c.machineId || "N/A";

        const lifeUsed = c.plannedLife
          ? Math.min(100, Math.round((c.currentHours / c.plannedLife) * 100))
          : 0;

        const remainingLifePercent = 100 - lifeUsed;

        return {
          id: c.id,
          machineId: c.machineId,
          machineLabel,
          cat: c.category,
          description: c.description,
          serialNumber: c.serialNumber,
          supplier: c.supplier,
          installHours: c.installHours,
          currentHours: c.currentHours,
          plannedLife: c.plannedLife,
          replacementCost: c.replacementCost,
          condition: c.condition,
          cond:
            c.condition >= 5
              ? "Critical"
              : c.condition >= 4
                ? "Warning"
                : c.condition >= 3
                  ? "Monitor"
                  : "Good",
          life: remainingLifePercent,
          risk: c.intelligence?.riskStatus || "Healthy",
          driver: c.intelligence?.riskDriver || "Normal",
          costPerHour: `Rs ${
            c.plannedLife > 0 ? (Number(c.replacementCost) / c.plannedLife).toFixed(2) : "0.00"
          }/hr`,
        };
      })
      .filter((c) => {
        const query = riskSearch.toLowerCase();

        if (!query) return true;

        return (
          c.machineLabel.toLowerCase().includes(query) ||
          c.cat.toLowerCase().includes(query) ||
          c.serialNumber?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
        );
      })
      .filter((c) => {
        if (riskStatusFilter === "all") return true;
        return c.risk.toLowerCase() === riskStatusFilter.toLowerCase();
      })
      .sort((a, b) => {
        const score = { Critical: 3, Warning: 2, Monitor: 1, Healthy: 0 };
        return (
          (score[b.risk as keyof typeof score] || 0) - (score[a.risk as keyof typeof score] || 0)
        );
      });
  }, [components, machines, riskSearch, riskStatusFilter]);

  const fleetScrollRef = React.useRef<HTMLDivElement | null>(null);

  const riskLogicScrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollFleetCards = (direction: "left" | "right") => {
    const container = fleetScrollRef.current;
    if (!container) return;

    const card = container.querySelector("[data-fleet-card]") as HTMLElement | null;
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

    const card = container.querySelector("[data-risk-logic-card]") as HTMLElement | null;

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
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const isExpired = subscription?.status === "expired";

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

      <div className="mx-auto mb-7 max-w-7xl">
        <CompanyAdminNav />
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-indigo-300/20 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 sm:p-8 shadow-xl  mb-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              Fleet Component Intelligence
            </div>

            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-[44px]">
              Component <span className="text-blue-200">Lifecycle</span>
              <br />
              Dashboard
            </h1>

            <div className="flex items-center gap-3 pt-1">
              <div className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />

              <p className="text-xs font-semibold text-blue-100">
                Real-time fleet health, lifecycle tracking and replacement cost insights
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:max-w-[720px]">
            {[
              {
                label: "Total Components",
                value: String(summaryStats.totalComponents),
                color: "text-white",
              },
              {
                label: "Critical",
                value: String(summaryStats.criticalCount),
                color: "text-red-300",
              },
              {
                label: "Warning",
                value: String(summaryStats.warningCount),
                color: "text-amber-300",
              },
              {
                label: "Replacement Value",
                value: summaryStats.formattedReplacementCost,
                color: "text-white",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="min-h-[110px] sm:min-h-[116px] rounded-[1.6rem] border border-white/15 bg-white/10 p-4 sm:p-5 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-white/15"
              >
                <p className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-blue-100">
                  {stat.label}
                </p>

                <p
                  className={`mt-3 text-2xl font-extrabold tracking-tight sm:text-[28px] ${stat.color}`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
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
                  {machines.length} machines • {components.length} components connected with live
                  component data
                </p>
              </div>
            </div>

            {fleetMachines.length > 1 && (
              <div className="hidden sm:flex items-center gap-2">
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
              No machines found. Please register a machine under the Component Management page.
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
                    riskComponentsByMachineId.get(String(m.machineId || m.id)) || [];

                  const riskLevel = m.crit > 0 ? "Critical" : m.warn > 0 ? "Warning" : "Healthy";

                  const cardClass =
                    riskLevel === "Critical"
                      ? "border-red-200/90 bg-gradient-to-br from-red-50/90 via-slate-50 to-red-100/60 hover:border-red-300 hover:shadow-[0_18px_42px_rgba(220,38,38,0.14)] dark:border-red-500/25 dark:from-red-950/30 dark:via-slate-900 dark:to-slate-900 dark:hover:border-red-500/45"
                      : riskLevel === "Warning"
                        ? "border-orange-200/90 bg-gradient-to-br from-orange-50/90 via-slate-50 to-orange-100/60 hover:border-orange-300 hover:shadow-[0_18px_42px_rgba(249,115,22,0.14)] dark:border-orange-500/25 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900 dark:hover:border-orange-500/45"
                        : "border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-slate-50 to-emerald-50/60 hover:border-blue-300 hover:shadow-[0_18px_42px_rgba(37,99,235,0.12)] dark:border-blue-500/25 dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900 dark:hover:border-blue-500/45";

                  const innerBoxClass =
                    riskLevel === "Critical"
                      ? "border-red-200/80 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10"
                      : riskLevel === "Warning"
                        ? "border-orange-200/80 bg-orange-50/70 dark:border-orange-500/20 dark:bg-orange-500/10"
                        : "border-blue-200/80 bg-blue-50/70 dark:border-blue-500/20 dark:bg-blue-500/10";

                  const riskBadgeClass =
                    riskLevel === "Critical"
                      ? "border-red-200 bg-red-100 text-red-700 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300"
                      : riskLevel === "Warning"
                        ? "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/15 dark:text-orange-300"
                        : "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300";

                  const dotClass =
                    riskLevel === "Critical"
                      ? "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.13)]"
                      : riskLevel === "Warning"
                        ? "bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.13)]"
                        : "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.13)]";

                  const typeBadgeClass =
                    riskLevel === "Critical"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                      : riskLevel === "Warning"
                        ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
                        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";

                  const actionButtonClass =
                    riskLevel === "Critical"
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      : riskLevel === "Warning"
                        ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20";

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
                      className={`group relative flex min-h-[430px] min-w-[280px] snap-start flex-col overflow-hidden rounded-[1.65rem] border p-5 shadow-[0_10px_28px_rgba(15,23,42,0.055)] transition-all duration-300 hover:-translate-y-0.5 dark:hover:shadow-slate-950/30 sm:min-w-[300px] lg:min-w-[300px] xl:min-w-[calc((100%-48px)/4)] ${cardClass}`}
                    >
                      <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-white/30 blur-3xl transition-all group-hover:bg-white/40 dark:bg-white/5" />
                      <div className="pointer-events-none absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-slate-400/10 blur-3xl dark:bg-white/5" />

                      <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dotClass}`} />

                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                              Machine Asset
                            </p>
                          </div>

                          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950 dark:text-white">
                            {m.name}
                          </h3>

                          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {statusText}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-xl border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide ${typeBadgeClass}`}
                        >
                          {m.type}
                        </span>
                      </div>

                      <div
                        className={`relative z-10 rounded-2xl border p-4 shadow-sm ${innerBoxClass}`}
                      >
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                              {m.comps}
                            </p>

                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Components
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${riskBadgeClass}`}
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

                          <div className="rounded-xl border border-orange-200/80 bg-orange-50/80 px-3 py-2 dark:border-orange-500/20 dark:bg-orange-500/10">
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                              {m.warn}
                            </p>

                            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Warning
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 mt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Component Alert
                          </p>

                          {machineRiskComponents.length > 1 && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              Auto Rotate
                            </span>
                          )}
                        </div>

                        {machineRiskComponents.length > 0 ? (
                          <div className="relative h-[78px] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                            {machineRiskComponents.map((item, index) => {
                              const isCritical =
                                item.displayRisk === "Critical" ||
                                item.intelligence?.riskStatus === "Critical";

                              return (
                                <div
                                  key={item.id}
                                  className={`absolute inset-0 px-3 py-3 ${
                                    machineRiskComponents.length > 1
                                      ? "risk-alert-card"
                                      : "opacity-100"
                                  } ${
                                    isCritical
                                      ? "bg-red-50/90 dark:bg-red-500/10"
                                      : "bg-orange-50/90 dark:bg-orange-500/10"
                                  }`}
                                  style={{
                                    animationDuration: alertDuration,
                                    animationDelay: `${index * 3}s`,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p
                                      className={`truncate text-[12px] font-bold ${
                                        isCritical
                                          ? "text-red-700 dark:text-red-300"
                                          : "text-orange-700 dark:text-orange-300"
                                      }`}
                                    >
                                      {item.description || item.category || "Risk Component"}
                                    </p>

                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${
                                        isCritical
                                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                                          : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                                      }`}
                                    >
                                      {item.displayRisk}
                                    </span>
                                  </div>

                                  <p
                                    className={`mt-1 truncate text-[10px] font-medium ${
                                      isCritical
                                        ? "text-red-600/80 dark:text-red-300/80"
                                        : "text-orange-600/80 dark:text-orange-300/80"
                                    }`}
                                  >
                                    {item.category || "Component"} • Serial:{" "}
                                    {item.serialNumber || "N/A"}
                                  </p>

                                  <p
                                    className={`mt-1 truncate text-[10px] font-medium ${
                                      isCritical
                                        ? "text-red-500/80 dark:text-red-300/70"
                                        : "text-orange-500/80 dark:text-orange-300/70"
                                    }`}
                                  >
                                    {item.intelligence?.riskDriver ||
                                      "Component requires inspection"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-[78px] rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-3 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                            <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                              No critical or warning component found
                            </p>

                            <p className="mt-1 text-[10px] font-medium text-emerald-600/80 dark:text-emerald-300/80">
                              Current machine health looks stable.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-300/60 pt-4 dark:border-slate-700/70">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Replacement Value
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                            {m.val}
                          </p>
                        </div>

                        <button
                          type="button"
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 ${actionButtonClass}`}
                        >
                          <ChevronRight size={17} />
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
                      <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e5e7eb" />

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
                          Number(value) >= 1000 ? `${Number(value) / 1000}k` : `${value}`
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
                        formatter={(value: any) => [`${value}%`, "Distribution"]}
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

                <div className="space-y-3">
                  {distributionData.slice(0, 8).map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />

                          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {item.name}
                          </p>
                        </div>

                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.value}%
                        </p>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.value}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
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
                      Artisans priority view based on remaining life, condition rating, cost
                      exposure and live risk intelligence signals.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-red-500">
                      Critical
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-red-700 dark:text-red-400">
                      {highRiskComponents.filter((item) => item.risk === "Critical").length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 dark:border-orange-500/20 dark:bg-orange-500/10">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-orange-500">
                      Warning
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-orange-700 dark:text-orange-400">
                      {highRiskComponents.filter((item) => item.risk === "Warning").length}
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
                  <select
                    value={riskStatusFilter}
                    onChange={(e) => setRiskStatusFilter(e.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-700 shadow-sm outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500/40"
                  >
                    <option value="all">All Risks</option>
                    <option value="critical">Critical Only</option>
                    <option value="warning">Warning Only</option>
                    <option value="monitor">Monitor Only</option>
                  </select>

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
                      Cost / Hour
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
                    <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
                  {highRiskComponents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-14">
                        <div className="mx-auto max-w-md text-center">
                          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckLineIcon size={24} />
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            All components are operating within safe limits
                          </h4>

                          <p className="mt-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                            No critical, warning or monitor level component is available for the
                            current filter.
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
                              className={`h-10 w-1 rounded-full ${
                                item.risk === "Critical"
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
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                              item.cond === "Critical"
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
                                className={`h-full rounded-full ${
                                  item.life < 15
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
                          <p className="text-sm font-extrabold text-slate-950 dark:text-white">
                            {item.costPerHour}
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            Operating cost
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                              item.risk === "Critical"
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
                            className={`inline-flex max-w-[190px] rounded-xl border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${
                              item.risk === "Critical"
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
                              className={`h-2.5 w-2.5 rounded-full ${
                                item.risk === "Critical"
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

                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              title="Edit Component"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              title="Delete Component"
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
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
                      Live verification view generated from component API records, remaining life,
                      condition rating, risk driver and alert output.
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
                        {highRiskComponents.filter((item) => item.risk === "Critical").length}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
                        Warning
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-orange-700 dark:text-orange-400">
                        {highRiskComponents.filter((item) => item.risk === "Warning").length}
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
                    Data will appear here when component API returns warning, monitor or critical
                    risk records.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {highRiskComponents.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => scrollRiskLogicCards("left")}
                        className="absolute left-2 top-1/2 z-30 hidden sm:flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:-translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                        aria-label="Scroll risk logic left"
                      >
                        <ChevronRight size={20} className="rotate-180" />
                      </button>

                      <button
                        type="button"
                        onClick={() => scrollRiskLogicCards("right")}
                        className="absolute right-2 top-1/2 z-30 hidden sm:flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition-all hover:translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                        aria-label="Scroll risk logic right"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}

                  <div
                    ref={riskLogicScrollRef}
                    className="risk-logic-scroll flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 sm:px-12 pb-3"
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
                          <div className={`absolute inset-x-0 top-0 h-1 ${barClass}`} />

                          <div className="mb-5 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                                {item.machineLabel || "N/A"}
                              </p>

                              <p className="mt-1 min-h-[34px] text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                                {item.description || item.cat || "Component risk record"}
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
                                className={`max-w-[135px] truncate rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                                  item.risk === "Critical"
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

          <div className="rounded-[2rem] sm:rounded-[3rem] bg-slate-900 p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <Shield size={120} className="text-white/5" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold tracking-tight">Enterprise Access</h3>

                <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                  Your organization is currently on the{" "}
                  <span className="font-extrabold text-orange-400">Premium</span> tier. You have
                  full access to predictive analytics, GPS telemetry, and executive reporting.
                </p>
              </div>

              <button
                onClick={() => navigate("/plans")}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 text-center"
              >
                Manage Subscription
              </button>
            </div>
          </div>

          <div className="pt-10 sm:pt-20 border-t border-slate-200">
            <div className="mb-10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                <History size={20} />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Billing & Enterprise Control
              </h2>
            </div>

            <CompanyPlanCard subscription={subscription} machineCount={machines.length} />

            <div className="mt-10">
              <SubscriptionHistoryTable history={history} />
            </div>
          </div>
        </div>
      </div>

      {isExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="max-w-md rounded-[3rem] bg-white p-12 text-center shadow-2xl dark:bg-slate-800">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-red-50 text-red-500">
              <Lock size={40} />
            </div>

            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              System Access Locked
            </h2>

            <p className="mb-10 text-slate-500 leading-relaxed text-lg">
              Your enterprise subscription has expired. Access to fleet intelligence is restricted
              until payment is resolved.
            </p>

            <button
              onClick={() => navigate("/plans")}
              className="w-full rounded-[1.5rem] bg-orange-500 py-5 text-lg font-black text-white shadow-2xl shadow-orange-500/40 transition-all hover:bg-orange-600 hover:scale-105 active:scale-95"
            >
              Renew Access Now
            </button>
          </div>
        </div>
      )}

      {editingComponent && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setEditingComponent(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5 border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                  Component Maintenance
                </p>

                <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Edit High-Risk Component
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Update component lifecycle details without changing the dashboard data flow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingComponent(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      Machine
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                      {editingComponent.machineLabel || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      Current Risk
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-red-600 dark:text-red-400">
                      {editingComponent.risk || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      Serial Number
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                      {editingComponent.serialNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={editForm.serialNumber}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        serialNumber: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={editForm.supplier}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        supplier: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Condition Rating
                  </label>
                  <select
                    value={editForm.condition}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        condition: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="1">1 - Excellent</option>
                    <option value="2">2 - Good</option>
                    <option value="3">3 - Monitor</option>
                    <option value="4">4 - Warning</option>
                    <option value="5">5 - Critical</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Install Hours
                  </label>
                  <input
                    type="number"
                    value={editForm.installHours}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        installHours: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Current Hours
                  </label>
                  <input
                    type="number"
                    value={editForm.currentHours}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        currentHours: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Planned Life
                  </label>
                  <input
                    type="number"
                    value={editForm.plannedLife}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        plannedLife: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Replacement Cost
                  </label>
                  <input
                    type="number"
                    value={editForm.replacementCost}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        replacementCost: e.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingComponent(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="rounded-2xl bg-blue-600 px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Trash2 size={26} />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Delete Component
              </h3>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this component? This action cannot be undone.
              </p>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-900/50">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  Component
                </p>

                <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                  {deleteTarget.description || deleteTarget.cat || "Selected Component"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Serial: {deleteTarget.serialNumber || "N/A"}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteComponent}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
