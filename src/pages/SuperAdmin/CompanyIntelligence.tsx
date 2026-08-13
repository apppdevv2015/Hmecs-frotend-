import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  Download,
  Edit2,
  Filter,
  LayoutDashboard,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
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

import { intelligenceService } from "../../services/SuperAdmin/intelligenceService";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";

const CATEGORY_COLORS: Record<string, string> = {
  Engine: "#f97316",
  Tyre: "#06b6d4",
  Transmission: "#8b5cf6",
  Structural: "#10b981",
  Hydraulic: "#3b82f6",
  Brake: "#ec4899",
  Cooling: "#eab308",
  Electrical: "#6366f1",
  Cabin: "#94a3b8",
};

const FleetIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const [componentsList, setComponentsList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalComponents: 0,
    critical: 0,
    warning: 0,
    healthy: 0,
    replacementValue: "R 0.00M",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);

  // 1. Fetch Companies list
  useEffect(() => {
    let isMounted = true;
    const fetchCompanies = async () => {
      try {
        const res = await superAdminMachineService.getCompanies();
        if (!isMounted) return;

        const val: any = res;
        const rawList = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.companies)
              ? val.companies
              : [];

        const formatted = rawList.map((c: any) => ({
          id: String(c.id),
          name: c.name || c.company_name || c.companyName || "Company",
        }));

        setCompanies(formatted);
        const searchParams = new URLSearchParams(window.location.search);
        const queryCompanyId = searchParams.get("companyId");

        if (queryCompanyId && formatted.some((c: any) => c.id === queryCompanyId)) {
          setSelectedCompanyId(queryCompanyId);
        } else if (formatted.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(formatted[0].id);
        }
      } catch (err) {
        console.error("Failed to load intelligence companies:", err);
      }
    };

    fetchCompanies();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Intelligence Data for selected company
  const loadIntelligenceData = async (companyId: string) => {
    try {
      setLoading(true);

      const [statsRes, registerRes] = await Promise.allSettled([
        intelligenceService.getDashboardStats(),
        intelligenceService.getRegister(),
      ]);

      let regData: any[] = [];
      if (registerRes.status === "fulfilled" && registerRes.value) {
        const val: any = registerRes.value;
        regData = Array.isArray(val) ? val : val?.data || [];
      }

      setComponentsList(regData);

      let statsObj: any = null;
      if (statsRes.status === "fulfilled" && statsRes.value) {
        statsObj = statsRes.value;
      }

      if (statsObj) {
        const costMillions = (Number(statsObj.totalReplacementCost || 0) / 1000000).toFixed(2);
        setStats({
          totalComponents: statsObj.totalComponents || regData.length,
          critical: statsObj.critical || regData.filter((c: any) => c.intelligence?.riskStatus === "Critical").length,
          warning: statsObj.warning || regData.filter((c: any) => c.intelligence?.riskStatus === "Warning").length,
          healthy: statsObj.healthy || regData.filter((c: any) => c.intelligence?.riskStatus === "Healthy").length,
          replacementValue: `R ${costMillions}M`,
        });
      } else {
        const crit = regData.filter((c: any) => c.intelligence?.riskStatus === "Critical").length;
        const warn = regData.filter((c: any) => c.intelligence?.riskStatus === "Warning").length;
        const hlth = regData.filter((c: any) => c.intelligence?.riskStatus === "Healthy").length;
        const totalCost = regData.reduce((acc: number, c: any) => acc + (Number(c.replacementCost) || 0), 0);
        const costMillions = (totalCost / 1000000).toFixed(2);

        setStats({
          totalComponents: regData.length,
          critical: crit,
          warning: warn,
          healthy: hlth,
          replacementValue: `R ${costMillions}M`,
        });
      }
    } catch (err) {
      console.error("Failed to load intelligence data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      loadIntelligenceData(selectedCompanyId);
    } else {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  // Compute dynamic category replacement value chart data
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    componentsList.forEach((c: any) => {
      const cat = c.category || "Other";
      const cost = Number(c.replacementCost || 0) / 1000; // in K
      map[cat] = (map[cat] || 0) + cost;
    });

    return Object.entries(map).map(([name, val]) => ({
      name,
      value: Math.round(val),
      color: CATEGORY_COLORS[name] || "#3b82f6",
    }));
  }, [componentsList]);

  // Compute dynamic distribution chart data
  const distributionChartData = useMemo(() => {
    const map: Record<string, number> = {};
    componentsList.forEach((c: any) => {
      const cat = c.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });

    return Object.entries(map).map(([name, val]) => ({
      name,
      value: val,
      color: CATEGORY_COLORS[name] || "#3b82f6",
    }));
  }, [componentsList]);

  // Dynamic High-Risk components (Critical / Warning)
  const highRiskComponents = useMemo(() => {
    return componentsList.filter(
      (c: any) =>
        c.intelligence?.riskStatus === "Critical" ||
        c.intelligence?.riskStatus === "Warning"
    );
  }, [componentsList]);

  const metricsData = [
    { label: "Total Components", value: String(stats.totalComponents), color: "blue" },
    { label: "Critical", value: String(stats.critical), color: "red" },
    { label: "Warning", value: String(stats.warning), color: "orange" },
    { label: "Replacement Value", value: stats.replacementValue, color: "purple" },
  ];

  const handleEdit = (component: any) => {
    setEditingComponent(component);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Component updated successfully!`, {
      style: {
        borderRadius: "20px",
        background: "#1e293b",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "bold",
      },
      iconTheme: {
        primary: "#10b981",
        secondary: "#fff",
      },
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 text-slate-900 dark:bg-[#020617] dark:text-white md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldAlert size={20} />
            <span className="text-xs font-black uppercase tracking-widest">
              Fleet Component Intelligence
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center gap-1.5 ml-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live DB
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Component <span className="text-orange-500">Lifecycle</span> Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Track component life • Monitor condition • Surface high-risk items • Control replacement costs across your fleet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {companies.length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Building2 size={16} className="text-slate-400" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => loadIntelligenceData(selectedCompanyId)}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 dark:bg-white dark:text-slate-900"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricsData.map((metric, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div
              className={`absolute top-0 left-0 h-1.5 w-full ${
                metric.color === "red"
                  ? "bg-red-500"
                  : metric.color === "orange"
                    ? "bg-orange-500"
                    : metric.color === "blue"
                      ? "bg-blue-500"
                      : "bg-purple-500"
              }`}
            />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {metric.label}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : metric.value}
            </h2>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <TrendingUp size={12} className="text-green-500" />
              <span>Real DB Metrics</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
        {["Dashboard", "Component Register"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black transition-all ${
              activeTab === tab
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400"
            }`}
          >
            {tab === "Dashboard" && <LayoutDashboard size={18} />}
            {tab === "Component Register" && <ClipboardList size={18} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Dashboard" && (
        <div className="space-y-8">
          {/* Analytics Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Replacement Value by Category */}
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Replacement Value by Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total cost exposure per component group
                  </p>
                </div>
                <div className="rounded-xl bg-orange-50 p-2 text-orange-600 dark:bg-orange-500/10">
                  <BarChart3 size={20} />
                </div>
              </div>

              <div className="h-[300px] w-full">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                        tickFormatter={(value) => `R ${value}K`}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{
                          borderRadius: "20px",
                          border: "none",
                          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                    No component category data available in database
                  </div>
                )}
              </div>
            </div>

            {/* Component Distribution */}
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Component Distribution
                  </h3>
                  <p className="text-xs text-slate-500">Breakdown by category</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-500/10">
                  <PieChartIcon size={20} />
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 md:flex-row">
                <div className="h-[250px] w-[250px]">
                  {distributionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionChartData}
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {distributionChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                      No components registered
                    </div>
                  )}
                </div>

                <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
                  {distributionChartData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-black text-slate-900 dark:text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* High-Risk Components Table */}
          <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden">
            <div className="border-b border-slate-100 p-8 dark:border-slate-800">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={24} />
                    High-Risk Components
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Combined Risk = Remaining Life % + Condition. Critical shown first.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-lg bg-red-100 px-3 py-1 text-[10px] font-black uppercase text-red-700 dark:bg-red-500/20">
                    {stats.critical} Critical
                  </span>
                  <span className="rounded-lg bg-orange-100 px-3 py-1 text-[10px] font-black uppercase text-orange-700 dark:bg-orange-500/20">
                    {stats.warning} Warning
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4">Machine</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Serial Number</th>
                    <th className="px-6 py-4">Risk Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {highRiskComponents.length > 0 ? (
                    highRiskComponents.map((comp: any) => (
                      <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          {comp.machineId || comp.machine || "-"}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                          {comp.category}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          {comp.description}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {comp.serialNumber || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              comp.intelligence?.riskStatus === "Critical"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                            }`}
                          >
                            ● {comp.intelligence?.riskStatus || "Warning"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEdit(comp)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm font-semibold text-slate-400">
                        No high-risk components detected in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Component Register" && (
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Component Register</h3>
            <span className="text-sm font-bold text-slate-400">{componentsList.length} Total Components</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4">Machine ID</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Serial Number</th>
                  <th className="px-6 py-4">Current Hours</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {componentsList.length > 0 ? (
                  componentsList.map((comp: any) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {comp.machineId || comp.machine || "-"}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                        {comp.category}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {comp.description}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {comp.serialNumber || "-"}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                        {comp.currentHours || 0} hrs
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            comp.intelligence?.riskStatus === "Critical"
                              ? "bg-red-100 text-red-700 dark:bg-red-500/20"
                              : comp.intelligence?.riskStatus === "Warning"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20"
                          }`}
                        >
                          ● {comp.intelligence?.riskStatus || "Healthy"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm font-semibold text-slate-400">
                      No components registered in database for this company.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetIntelligence;
