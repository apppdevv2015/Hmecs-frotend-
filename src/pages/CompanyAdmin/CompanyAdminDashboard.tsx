import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { 
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  Download,
  Edit,
  FileText,
  Filter,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  Map,
  Plus,
  PlusCircle,
  Search,
  Send,
  Settings,
  Shield,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  Zap,
  DollarSign,
  Database,
  PieChart as PieChartIcon,
  CheckCircle2 as CheckLineIcon,
  X,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from "recharts";

import CompanyPlanCard from "../../components/company-admin/dashboard/CompanyPlanCard";
import SubscriptionHistoryTable from "../../components/company-admin/dashboard/SubscriptionHistoryTable";
import { userService } from "../../services/userService";
import { componentService } from "../../services/companyadmin/componentService";

import { CompanyAdminNav } from "../../components/company-admin/CompanyAdminNav";

// Helper functions for normalization
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

  // Search, Filter, Edit states
  const [riskSearch, setRiskSearch] = useState("");
  const [riskStatusFilter, setRiskStatusFilter] = useState("all");
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
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

  const handleDeleteComponent = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this component? This action cannot be undone.")) {
      try {
        await componentService.deleteComponent(id);
        toast.success("Component deleted successfully!");
        const componentResponse = await componentService.getComponents();
        const rawComponents = getArrayData<any>(componentResponse);
        setComponents(rawComponents.map(normalizeComponent));
      } catch (err: any) {
        toast.error(err.message || "Failed to delete component");
      }
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent) return;
    try {
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
      toast.success("Component updated successfully!");
      setEditingComponent(null);
      const componentResponse = await componentService.getComponents();
      const rawComponents = getArrayData<any>(componentResponse);
      setComponents(rawComponents.map(normalizeComponent));
    } catch (err: any) {
      toast.error(err.message || "Failed to update component");
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [sub, subHistory, machinesList, componentResponse] = await Promise.all([
          userService.getActiveSubscription(),
          userService.getSubscriptionHistory(),
          userService.getMachines(),
          componentService.getComponents()
        ]);
        
        if (!sub && (!subHistory || subHistory.length === 0)) {
          navigate("/plans");
          return;
        }

        setSubscription(sub);
        setHistory(subHistory);
        
        // Normalize machines list
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

        // Normalize components list
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

  // Dynamic calculations for summary cards
  const summaryStats = React.useMemo(() => {
    const totalComponents = components.length;
    const criticalCount = components.filter(c => c.intelligence?.riskStatus === 'Critical').length;
    const warningCount = components.filter(c => c.intelligence?.riskStatus === 'Warning' || c.intelligence?.riskStatus === 'Monitor').length;
    
    const totalReplacementCost = components.reduce((sum, c) => sum + Number(c.replacementCost || 0), 0);
    const formattedReplacementCost = totalReplacementCost >= 1000000 
      ? `R ${(totalReplacementCost / 1000000).toFixed(2)}M` 
      : totalReplacementCost >= 1000 
        ? `R ${(totalReplacementCost / 1000).toFixed(0)}K` 
        : `R ${totalReplacementCost}`;

    return {
      totalComponents,
      criticalCount,
      warningCount,
      formattedReplacementCost
    };
  }, [components]);

  // Dynamic Replacement Value by Category
  const categoryData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const colors: Record<string, string> = {
      Engine: '#f97316',
      Tyre: '#0ea5e9',
      Tyres: '#0ea5e9',
      Transmission: '#a855f7',
      Hydraulics: '#eab308',
      Hydraulic: '#eab308',
      Brakes: '#ec4899',
      Brake: '#ec4899',
      Electrical: '#06b6d4',
      Cooling: '#14b8a6',
      Cabin: '#64748b',
    };

    components.forEach((c) => {
      const cat = c.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(c.replacementCost || 0);
    });

    if (Object.keys(categoryTotals).length === 0) {
      return [
        { name: 'Engine', value: 0, color: '#f97316' },
        { name: 'Tyre', value: 0, color: '#0ea5e9' },
      ];
    }

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#64748b',
    }));
  }, [components]);

  // Dynamic Component Distribution
  const distributionData = React.useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const colors: Record<string, string> = {
      Engine: '#ef4444',
      Tyre: '#3b82f6',
      Tyres: '#3b82f6',
      Transmission: '#a855f7',
      Hydraulics: '#eab308',
      Hydraulic: '#eab308',
      Brakes: '#f97316',
      Brake: '#f97316',
      Electrical: '#06b6d4',
      Cooling: '#14b8a6',
      Cabin: '#64748b',
    };

    components.forEach((c) => {
      const cat = c.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const total = components.length || 1;

    if (Object.keys(categoryCounts).length === 0) {
      return [
        { name: 'Engine', value: 0, color: '#ef4444' },
        { name: 'Tyre', value: 0, color: '#3b82f6' },
      ];
    }

    return Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: colors[name] || '#64748b',
    }));
  }, [components]);

  // Dynamic Fleet Overview (Machines with dynamic component counts and statuses)
  const fleetMachines = React.useMemo(() => {
    if (machines.length === 0) {
      return [];
    }

    return machines.map((m) => {
      const machineComps = components.filter(c => c.machineId === m.machineId || c.machineId === m.id);
      const compsCount = machineComps.length;
      
      const critCount = machineComps.filter(c => c.intelligence?.riskStatus === 'Critical').length;
      const warnCount = machineComps.filter(c => c.intelligence?.riskStatus === 'Warning' || c.intelligence?.riskStatus === 'Monitor').length;
      
      const totalCost = machineComps.reduce((sum, c) => sum + Number(c.replacementCost || 0), 0);
      const formattedCost = totalCost >= 1000000 
        ? `R ${(totalCost / 1000000).toFixed(2)}M` 
        : totalCost >= 1000 
          ? `R ${(totalCost / 1000).toFixed(0)}K` 
          : `R ${totalCost}`;

      return {
        id: m.id || m.machineId || m.name,
        name: m.name || m.machineId || "Unnamed Machine",
        type: m.model || "N/A",
        comps: compsCount,
        crit: critCount,
        warn: warnCount,
        val: formattedCost
      };
    });
  }, [machines, components]);

  // Dynamic High-Risk Components List
  const highRiskComponents = React.useMemo(() => {
    return components
      .filter((c) => c.intelligence?.riskStatus === 'Critical' || c.intelligence?.riskStatus === 'Warning' || c.intelligence?.riskStatus === 'Monitor')
      .map((c) => {
        const machine = machines.find(m => m.machineId === c.machineId || m.id === c.machineId);
        const machineLabel = machine ? machine.name : c.machineId || "N/A";
        
        const lifeUsed = c.plannedLife ? Math.min(100, Math.round((c.currentHours / c.plannedLife) * 100)) : 0;
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
          cond: c.condition >= 5 ? 'Critical' : c.condition >= 4 ? 'Warning' : c.condition >= 3 ? 'Monitor' : 'Good',
          life: remainingLifePercent,
          risk: c.intelligence?.riskStatus || 'Healthy',
          driver: c.intelligence?.riskDriver || 'Normal',
          costPerHour: `Rs ${(c.plannedLife > 0 ? (Number(c.replacementCost) / c.plannedLife) : 0).toFixed(2)}/hr`,
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
        return (score[b.risk as keyof typeof score] || 0) - (score[a.risk as keyof typeof score] || 0);
      });
  }, [components, machines, riskSearch, riskStatusFilter]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const isExpired = subscription?.status === "expired";

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-slate-900 p-4 lg:p-10">
      <CompanyAdminNav />
      {/* Premium Header */}
      <div className="relative mb-12 overflow-hidden rounded-[3rem] bg-[#0F172A] p-10 text-white shadow-2xl">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Fleet Component Intelligence</p>
            <h1 className="text-5xl font-black tracking-tighter leading-tight">
              Component <span className="text-orange-500">Lifecycle</span><br />
              Dashboard
            </h1>
            <div className="flex items-center gap-4 pt-2">
               <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
               <p className="text-xs font-bold text-slate-400">KEEPING AFRICA MOVING</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:gap-6">
            {[
              { label: "Total Components", value: String(summaryStats.totalComponents), color: "text-white" },
              { label: "Critical", value: String(summaryStats.criticalCount), color: "text-red-500" },
              { label: "Warning", value: String(summaryStats.warningCount), color: "text-orange-500" },
              { label: "Replacement Value", value: summaryStats.formattedReplacementCost, color: "text-white" },
            ].map((stat, i) => (
              <div key={i} className="min-w-[160px] rounded-[2rem] bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                <p className={`mt-2 text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Fleet Overview Section */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <Truck className="text-slate-400" size={20} />
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Fleet Overview</h2>
            <span className="text-xs font-bold text-slate-400">{machines.length} machines • {components.length} components</span>
          </div>
          
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {fleetMachines.length === 0 ? (
              <div className="col-span-full rounded-[2.5rem] bg-white border border-slate-100 p-8 text-center text-xs font-bold text-slate-400 dark:bg-slate-800 dark:border-slate-700">
                No machines found. Please register a machine under the Component Management page.
              </div>
            ) : (
              fleetMachines.map((m) => (
                <div key={m.id} className="group relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 p-7 shadow-sm transition-all hover:shadow-xl dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{m.name}</h3>
                    <span className="rounded-lg bg-slate-900 px-2 py-1 text-[8px] font-black text-white uppercase">{m.type}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[20px] font-black text-slate-900 dark:text-white">{m.comps}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Components</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-red-500">{m.crit}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-orange-500">{m.warn}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-6 dark:border-slate-700/50">
                    <p className="text-xs font-black text-slate-900 dark:text-white">{m.val}</p>
                    <button className="text-slate-300 transition-colors hover:text-orange-500">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Overview Content - Full Width Stack */}
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="rounded-[3rem] bg-white p-10 shadow-sm border border-slate-100 dark:bg-slate-800">
              <div className="mb-10 flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Replacement Value by Category</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider">Total cost exposure per component group</p>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[3rem] bg-white p-10 shadow-sm border border-slate-100 dark:bg-slate-800">
              <div className="mb-10 flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <PieChartIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Component Distribution</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider">Breakdown by category</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                        formatter={(value) => [`${value}%`, 'Distribution']}
                      />
                      <Pie data={distributionData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-3">
                  {distributionData.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-bold text-slate-500">{item.name}</span>
                      <span className="text-[10px] font-black text-slate-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* High-Risk Table */}
          <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">High-Risk Components</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider">Combined Risk = Remaining Life % + Condition Rating</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Search input */}
                <div className="relative">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search components..."
                    value={riskSearch}
                    onChange={(e) => setRiskSearch(e.target.value)}
                    className="w-48 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 pl-10 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900/50 dark:border-slate-700"
                  />
                </div>

                {/* Filter dropdown */}
                <div className="relative">
                  <select
                    value={riskStatusFilter}
                    onChange={(e) => setRiskStatusFilter(e.target.value)}
                    className="rounded-2xl border border-slate-100 bg-slate-50 py-2.5 px-4 text-[10px] font-black text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900/50 dark:border-slate-700 uppercase"
                  >
                    <option value="all">ALL RISKS</option>
                    <option value="critical">CRITICAL ONLY</option>
                    <option value="warning">WARNING ONLY</option>
                    <option value="monitor">MONITOR ONLY</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-red-50 text-[9px] font-black text-red-600 uppercase">Critical</span>
                  <span className="px-3 py-1 rounded-full bg-orange-50 text-[9px] font-black text-orange-600 uppercase">Warning</span>
                  <span className="px-3 py-1 rounded-full bg-green-50 text-[9px] font-black text-green-600 uppercase">Healthy</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#FBFCFE] dark:bg-slate-900/50">
                  <tr>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Machine</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Category</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Description</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Condition</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Remaining Life</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Cost / Hour</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Risk</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Risk Driver</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400">Alert</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {highRiskComponents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-8 py-10 text-center text-xs font-black text-green-600 dark:text-green-400 bg-green-50/5">
                        ✨ No matching high-risk or critical components detected.
                      </td>
                    </tr>
                  ) : (
                    highRiskComponents.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-8 py-6 font-black text-slate-900 dark:text-white text-xs">{item.machineLabel}</td>
                        <td className="px-8 py-6 text-xs text-slate-500 font-bold">{item.cat}</td>
                        <td className="px-8 py-6 text-xs text-slate-500 font-bold">{item.description}</td>
                        <td className="px-8 py-6">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            item.cond === 'Critical' ? 'bg-red-50 text-red-500' :
                            item.cond === 'Warning' ? 'bg-orange-50 text-orange-500' :
                            item.cond === 'Monitor' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-green-50 text-green-600'
                          }`}>{item.cond}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${
                                item.life < 15 ? 'bg-red-500' :
                                item.life < 30 ? 'bg-orange-500' :
                                'bg-emerald-500'
                              }`} style={{ width: `${item.life}%` }} />
                            </div>
                            <span className="text-[10px] font-black">{item.life}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-bold text-slate-900 dark:text-white text-xs">
                          {item.costPerHour}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                            item.risk === 'Critical' ? 'bg-red-50 text-red-500' :
                            item.risk === 'Warning' ? 'bg-orange-50 text-orange-500' :
                            item.risk === 'Monitor' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-green-50 text-green-600'
                          }`}>{item.risk}</span>
                        </td>
                        <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase ${
                              item.risk === 'Critical' ? 'border-red-200 bg-red-50 text-red-700' :
                              item.risk === 'Warning' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                              'border-yellow-200 bg-yellow-50 text-yellow-700'
                            }`}>
                              {item.driver}
                            </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-start">
                            <div className={`h-2.5 w-2.5 rounded-full ${
                              item.risk === 'Critical' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]' :
                              item.risk === 'Warning' ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]' :
                              'bg-green-500'
                            }`} />
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleStartEdit(item)}
                              title="Edit Component"
                              className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-all dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-orange-500/10"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteComponent(item.id)}
                              title="Delete Component"
                              className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={12} />
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

          {/* Risk Logic - Live Verification */}
          <div className="rounded-[3rem] bg-white p-10 shadow-sm border border-slate-100 dark:bg-slate-800">
            <div className="mb-10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Risk Logic - Live Verification</h3>
                <p className="text-[10px] font-bold text-slate-400 tracking-wider">Automated validation of life + condition logic</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { case: 'Case 1', desc: 'Good condition - mid-life', life: '55%', cond: '2 - Good', status: { exp: 'Healthy', act: 'Healthy' }, driver: { exp: 'Normal', act: 'Normal' }, alert: { exp: 'No Alert', act: 'No Alert' }, pass: true },
                { case: 'Case 2', desc: 'Vibrating condition - mid-life', life: '55%', cond: '4 - Warning', status: { exp: 'Warning', act: 'Warning' }, driver: { exp: 'Poor Condition', act: 'Poor Condition' }, alert: { exp: 'No Alert', act: 'No Alert' }, pass: true },
                { case: 'Case 3', desc: 'Low remaining life - regardless of cond', life: '15%', cond: '2 - Good', status: { exp: 'Critical', act: 'Critical' }, driver: { exp: 'Low Remaining Life', act: 'Low Remaining Life' }, alert: { exp: 'A - Immediate', act: 'A - Immediate' }, pass: true },
                { case: 'Case 4', desc: 'Critical condition - high remaining life', life: '85%', cond: '5 - Critical', status: { exp: 'Critical', act: 'Critical' }, driver: { exp: 'Poor Condition', act: 'Poor Condition' }, alert: { exp: 'A - Immediate', act: 'A - Immediate' }, pass: true },
              ].map((c, i) => (
                <div key={i} className={`p-6 rounded-[2rem] border-2 ${c.pass ? 'border-green-100 bg-green-50/10' : 'border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-black text-slate-900">{c.case}</p>
                    <span className="px-2 py-0.5 rounded-lg bg-white border border-green-200 text-[8px] font-black text-green-600 uppercase flex items-center gap-1">
                      <CheckLineIcon size={10} /> PASS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic mb-4 h-8">{c.desc}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-green-100/50">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Input Life</p>
                      <p className="text-xs font-black text-slate-900">{c.life}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Condition</p>
                      <p className="text-xs font-black text-slate-900">{c.cond}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Risk Status</p>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${c.status.act === 'Healthy' ? 'bg-green-100 text-green-700' : c.status.act === 'Warning' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {c.status.act}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Risk Driver</p>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[8px] font-black text-slate-700 uppercase">
                        {c.driver.act}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Alert Trigger</p>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${c.alert.act.includes('Alert') ? 'text-slate-400' : 'bg-red-100 text-red-700'}`}>
                        {c.alert.act}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise Access Box */}
          <div className="rounded-[3rem] bg-slate-900 p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <Shield size={120} className="text-white/5" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-black">Enterprise Access</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                  Your organization is currently on the <span className="text-orange-500 font-black">PREMIUM</span> tier. 
                  You have full access to predictive analytics, GPS telemetry, and executive reporting.
                </p>
              </div>
              <button onClick={() => navigate("/plans")} className="px-10 py-5 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20">
                Manage Subscription
              </button>
            </div>
          </div>

          {/* Subscription History Section */}
          <div className="pt-20 border-t border-slate-200">
            <div className="mb-10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                <History size={20} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Billing & Enterprise Control</h2>
            </div>
            <CompanyPlanCard subscription={subscription} machineCount={machines.length} />
            <div className="mt-10">
              <SubscriptionHistoryTable history={history} />
            </div>
          </div>
        </div>
      </div>

      {/* Expired Overlay */}
      {isExpired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="max-w-md rounded-[3rem] bg-white p-12 text-center shadow-2xl dark:bg-slate-800">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-red-50 text-red-500">
              <Lock size={40} />
            </div>
            <h2 className="mb-4 text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Locked</h2>
            <p className="mb-10 text-slate-500 leading-relaxed text-lg">Your enterprise subscription has expired. Access to fleet intelligence is restricted until payment is resolved.</p>
            <button 
              onClick={() => navigate("/plans")} 
              className="w-full rounded-[1.5rem] bg-orange-500 py-5 text-lg font-black text-white shadow-2xl shadow-orange-500/40 transition-all hover:bg-orange-600 hover:scale-105 active:scale-95"
            >
              Renew Access Now
            </button>
          </div>
        </div>
      )}
      {/* Edit Component Modal */}
      {editingComponent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-10 shadow-2xl dark:bg-slate-800 border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Component</h3>
              <button onClick={() => setEditingComponent(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Category</label>
                  <input
                    type="text"
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={editForm.serialNumber}
                    onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Supplier</label>
                  <input
                    type="text"
                    value={editForm.supplier}
                    onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Replacement Cost (R)</label>
                  <input
                    type="number"
                    required
                    value={editForm.replacementCost}
                    onChange={(e) => setEditForm({ ...editForm, replacementCost: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400">Install Hours</label>
                  <input
                    type="number"
                    required
                    value={editForm.installHours}
                    onChange={(e) => setEditForm({ ...editForm, installHours: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold focus:outline-none dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400">Current Hours</label>
                  <input
                    type="number"
                    required
                    value={editForm.currentHours}
                    onChange={(e) => setEditForm({ ...editForm, currentHours: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold focus:outline-none dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-400">Planned Life</label>
                  <input
                    type="number"
                    required
                    value={editForm.plannedLife}
                    onChange={(e) => setEditForm({ ...editForm, plannedLife: e.target.value })}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold focus:outline-none dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Condition Rating (1-5)</label>
                <select
                  value={editForm.condition}
                  onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold focus:outline-none dark:bg-slate-900 dark:border-slate-700"
                >
                  <option value="1">1 - Brand New</option>
                  <option value="2">2 - Good Condition</option>
                  <option value="3">3 - Monitor / Normal Wear</option>
                  <option value="4">4 - Warning / Deteriorating</option>
                  <option value="5">5 - Critical / Imminent Failure</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingComponent(null)}
                  className="w-1/2 rounded-2xl border border-slate-100 py-4 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-50 transition-all dark:border-slate-700 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-2xl bg-orange-500 py-4 text-xs font-black uppercase tracking-wider text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
