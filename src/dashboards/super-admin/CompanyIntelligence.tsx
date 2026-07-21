import React, { useState } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  AlertTriangle,
  TrendingUp,
  LayoutDashboard,
  ClipboardList,
  Settings,
  MoreVertical,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
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
import toast from "react-hot-toast";

// Mock Data based on User Images
const MOCK_METRICS = [
  { label: "Total Components", value: "35", color: "blue" },
  { label: "Critical", value: "4", color: "red" },
  { label: "Warning", value: "9", color: "orange" },
  { label: "Replacement Value", value: "R 9.53M", color: "purple" },
];

const CATEGORY_DATA = [
  { name: "Engine", value: 6000, color: "#f97316" },
  { name: "Tyre", value: 2000, color: "#06b6d4" },
  { name: "Transmission", value: 800, color: "#8b5cf6" },
  { name: "Structural", value: 600, color: "#10b981" },
  { name: "Hydraulic", value: 400, color: "#3b82f6" },
  { name: "Brake", value: 300, color: "#ec4899" },
  { name: "Cooling", value: 200, color: "#eab308" },
  { name: "Electrical", value: 150, color: "#6366f1" },
  { name: "Cabin", value: 100, color: "#94a3b8" },
];

const DISTRIBUTION_DATA = [
  { name: "Engine", value: 7, color: "#f97316" },
  { name: "Tyre", value: 9, color: "#8b5cf6" },
  { name: "Hydraulic", value: 5, color: "#06b6d4" },
  { name: "Structural", value: 5, color: "#ef4444" },
  { name: "Transmission", value: 2, color: "#ec4899" },
  { name: "Brake", value: 2, color: "#10b981" },
  { name: "Cooling", value: 2, color: "#eab308" },
  { name: "Electrical", value: 2, color: "#3b82f6" },
  { name: "Cabin", value: 1, color: "#94a3b8" },
];

const INITIAL_COMPONENTS = [
  {
    id: 1,
    machine: "CK&IJ-990-020",
    type: "FEL",
    category: "Engine",
    desc: "Engine Assembly",
    sn: "CK-01-001",
    hrs: 6800,
    used: 5700,
    rem: 68.3,
    cond: "Good",
    risk: "Healthy",
    driver: "Normal",
    cost: "900K",
  },
  {
    id: 2,
    machine: "CK&IJ-990-020",
    type: "FEL",
    category: "Engine",
    desc: "Turbocharger",
    sn: "CK-01-002",
    hrs: 6800,
    used: 3600,
    rem: 55.0,
    cond: "Warning",
    risk: "Warning",
    driver: "Poor Condition",
    cost: "200K",
  },
  {
    id: 3,
    machine: "CK&IJ-990-020",
    type: "FEL",
    category: "Hydraulic",
    desc: "Hydraulic Pump",
    sn: "CK-01-004",
    hrs: 6800,
    used: 5240,
    rem: 47.6,
    cond: "Monitor",
    risk: "Healthy",
    driver: "Normal",
    cost: "77K",
  },
  {
    id: 4,
    machine: "CK&IJ-990-020",
    type: "FEL",
    category: "Tyre",
    desc: "Front Left Tyre",
    sn: "TY-990-001",
    hrs: 6800,
    used: 2600,
    rem: 18.0,
    cond: "Critical",
    risk: "Critical",
    driver: "Low Remaining Life",
    cost: "250K",
  },
  {
    id: 5,
    machine: "CK&IJ-990-020",
    type: "FEL",
    category: "Tyre",
    desc: "Front Right Tyre",
    sn: "TY-990-002",
    hrs: 6800,
    used: 2600,
    rem: 48.0,
    cond: "Warning",
    risk: "Warning",
    driver: "Poor Condition",
    cost: "250K",
  },
];

const TEST_CASES = [
  {
    id: 1,
    title: "Good condition - mid-life",
    life: "55%",
    condition: "2 - Good",
    status: "Healthy",
    driver: "Normal",
    alert: "No Alert",
  },
  {
    id: 3,
    title: "Low remaining life - regardless of condition",
    life: "15%",
    condition: "2 - Good",
    status: "Critical",
    driver: "Low Remaining Life",
    alert: "Immediate Attention",
  },
  {
    id: 4,
    title: "Critical condition - high remaining life",
    life: "60%",
    condition: "5 - Critical",
    status: "Critical",
    driver: "Poor Condition",
    alert: "Immediate Attention",
  },
];

const FleetIntelligence: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleEdit = (component: any) => {
    setEditingComponent(component);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`"${editingComponent.desc}" updated successfully!`, {
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
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Component <span className="text-orange-500">Lifecycle</span> Dashboard
          </h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Track component life • Monitor condition • Surface high-risk items • Control replacement
            costs across your entire fleet.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95 dark:bg-white dark:text-slate-900">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOCK_METRICS.map((metric, i) => (
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
              {metric.value}
            </h2>
            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              <TrendingUp size={12} className="text-green-500" />
              <span>Keeping Africa Moving</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
        {["Dashboard", "Component Register", "Maintenance Log"].map((tab) => (
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
            {tab === "Maintenance Log" && <Settings size={18} />}
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
                  <p className="text-xs text-slate-500">Total cost exposure per component group</p>
                </div>
                <div className="rounded-xl bg-orange-50 p-2 text-orange-600 dark:bg-orange-500/10">
                  <BarChart3 size={20} />
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={CATEGORY_DATA}
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
                      {CATEGORY_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={DISTRIBUTION_DATA}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {DISTRIBUTION_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
                  {DISTRIBUTION_DATA.map((item, i) => (
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
                    4 Critical
                  </span>
                  <span className="rounded-lg bg-orange-100 px-3 py-1 text-[10px] font-black uppercase text-orange-700 dark:bg-orange-500/20">
                    9 Warning
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Critical: Life &le; 20% OR Condition &ge; 5
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  Warning: Life &le; 40% OR Condition = 4
                </div>
              </div>
            </div>

            <div className="overflow-x-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-800/50">
                    <th className="px-8 py-5">Machine & Type</th>
                    <th className="px-8 py-5">Category & Desc</th>
                    <th className="px-8 py-5 text-center">Condition</th>
                    <th className="px-8 py-5">Remaining Life</th>
                    <th className="px-8 py-5 text-center">Risk Driver</th>
                    <th className="px-8 py-5 text-right">Cost / Hour</th>
                    <th className="px-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {INITIAL_COMPONENTS.filter(
                    (item) => item.rem <= 20 || item.cond === "Critical" || item.cond === "Warning",
                  ).map((item, i) => (
                    <tr
                      key={i}
                      className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black text-slate-900 dark:text-white uppercase">
                            {item.machine}
                          </span>
                          <span className="w-fit rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-white dark:bg-slate-700">
                            {item.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {item.desc}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span
                          className={`inline-flex rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                            item.cond === "Critical"
                              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                              : item.cond === "Warning"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                          }`}
                        >
                          {item.cond}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex w-32 flex-col gap-2">
                          <div className="flex items-center justify-between text-[10px] font-black">
                            <span
                              className={
                                item.rem <= 20
                                  ? "text-red-500"
                                  : item.rem <= 40
                                    ? "text-orange-500"
                                    : "text-blue-500"
                              }
                            >
                              {item.rem}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                item.rem <= 20
                                  ? "bg-red-500"
                                  : item.rem <= 40
                                    ? "bg-orange-500"
                                    : "bg-blue-500"
                              }`}
                              style={{ width: `${item.rem}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${item.driver === "Normal" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}
                          />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                            {item.driver}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            <span className="text-slate-400 font-bold mr-1 italic">R</span>
                            {item.cost}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Cost Exposure
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-white/5"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button className="rounded-xl border border-slate-200 p-2 text-red-600 hover:bg-red-50 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-500/10">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Logic Test Cases Section */}
          <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" size={24} />
                  Risk Logic — Live Test Cases
                </h3>
                <p className="text-xs text-slate-500 italic">
                  Automated verification that the combined Remaining Life + Condition logic is
                  working correctly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {TEST_CASES.map((t) => (
                <div
                  key={t.id}
                  className="relative rounded-3xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-800/30"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-black text-white">
                    <CheckCircle2 size={10} />
                    PASS
                  </div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Case {t.id}
                  </h4>
                  <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400 italic mb-4">
                    {t.title}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        Remaining Life
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {t.life}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        Condition
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {t.condition}
                      </span>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        Risk Status
                      </span>
                      <span
                        className={`text-sm font-black ${t.status === "Healthy" ? "text-green-500" : "text-red-500"}`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        Risk Driver
                      </span>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                        {t.driver}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Component Register" && (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="text-blue-500" size={24} />
                  Component Register
                </h3>
                <p className="text-sm text-slate-500 mt-1 italic">
                  Full inventory — search, filter and manage all fleet components.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
              >
                + Add Component
              </button>
            </div>

            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search machine, component, category, serial..."
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-800/50"
                />
              </div>
              <div className="flex gap-2">
                <select className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-800/50">
                  <option>All Machines</option>
                </select>
                <select className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 outline-none dark:border-slate-800 dark:bg-slate-800/50">
                  <option>All Categories</option>
                </select>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-800/50">
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Description / Serial</th>
                    <th className="px-6 py-4 text-center">Current Hrs</th>
                    <th className="px-6 py-4 text-center">Life Used</th>
                    <th className="px-6 py-4">Remaining</th>
                    <th className="px-6 py-4 text-center">Condition</th>
                    <th className="px-6 py-4 text-center">Risk</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {INITIAL_COMPONENTS.map((item, i) => (
                    <tr
                      key={i}
                      className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-5 text-sm font-black text-slate-400 uppercase tracking-tighter">
                        {item.category}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {item.desc}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{item.sn}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {item.hrs} h
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-500">
                        {item.used} h
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex w-32 flex-col gap-1.5">
                          <span
                            className={`text-[10px] font-black ${item.rem <= 20 ? "text-red-500" : item.rem <= 40 ? "text-orange-500" : "text-green-500"}`}
                          >
                            {item.rem}%
                          </span>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${item.rem <= 20 ? "bg-red-500" : item.rem <= 40 ? "bg-orange-500" : "bg-green-500"}`}
                              style={{ width: `${item.rem}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            item.cond === "Critical"
                              ? "bg-red-100 text-red-600"
                              : item.cond === "Warning"
                                ? "bg-orange-100 text-orange-600"
                                : item.cond === "Monitor"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-green-100 text-green-600"
                          }`}
                        >
                          {item.cond}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            item.risk === "Critical"
                              ? "bg-red-100 text-red-700"
                              : item.risk === "Warning"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.risk}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-white/5"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button className="rounded-xl border border-slate-200 p-2 text-red-600 hover:bg-red-50 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-500/10">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Maintenance Log" && (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="text-orange-500" size={24} />
                Maintenance Log
              </h3>
              <p className="text-sm text-slate-500 mt-1 italic">
                Full service event history across the fleet.
              </p>
            </div>

            <div className="overflow-x-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:bg-slate-800/50">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Machine</th>
                    <th className="px-6 py-4">Component</th>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Work Performed</th>
                    <th className="px-6 py-4 text-right">Cost</th>
                    <th className="px-6 py-4 text-center">Downtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    {
                      date: "2025-03-10",
                      machine: "CK&IJ-990-020",
                      comp: "Turbocharger",
                      tech: "T. Dlamini",
                      work: "Replaced turbo seals, re-torqued manifold",
                      cost: "R 8 500",
                      down: "6 hrs",
                    },
                    {
                      date: "2025-03-18",
                      machine: "CK&IJ-785-011",
                      comp: "Left Rear Tyre",
                      tech: "S. Mokoena",
                      work: "Tyre swap — beyond wear limit",
                      cost: "R 320 000",
                      down: "4 hrs",
                    },
                    {
                      date: "2025-03-22",
                      machine: "CK&IJ-D10-003",
                      comp: "Ripper Tips",
                      tech: "P. Khumalo",
                      work: "Full ripper tip replacement set",
                      cost: "R 28 000",
                      down: "2 hrs",
                    },
                    {
                      date: "2025-03-28",
                      machine: "CK&IJ-GD-007",
                      comp: "Front Tyre LH",
                      tech: "T. Dlamini",
                      work: "Pre-replacement inspection — flagged critical",
                      cost: "R 1 200",
                      down: "1 hr",
                    },
                    {
                      date: "2025-04-01",
                      machine: "CK&IJ-990-020",
                      comp: "Front Left Tyre",
                      tech: "S. Mokoena",
                      work: "Emergency replacement — tread separation",
                      cost: "R 250 000",
                      down: "3 hrs",
                    },
                  ].map((item, i) => (
                    <tr
                      key={i}
                      className="group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-5 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="px-6 py-5 text-sm font-black text-slate-500 uppercase">
                        {item.machine}
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-700 dark:text-slate-300">
                        {item.comp}
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-slate-500">{item.tech}</td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xs">
                        {item.work}
                      </td>
                      <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white">
                        {item.cost}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-black text-blue-600 dark:bg-blue-500/10">
                          {item.down}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Component Modal */}
      {(isEditModalOpen || isAddModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-50 p-8 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10">
                  {isEditModalOpen ? <Edit2 size={24} /> : <ClipboardList size={24} />}
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {isEditModalOpen ? "Edit Component" : "Add New Component"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsAddModalOpen(false);
                }}
                className="rounded-full bg-slate-50 p-2 text-slate-400 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="p-8 overflow-y-auto max-h-[70vh] [scrollbar-width:none]"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="col-span-1 md:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Machine ID *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CK&IJ-990-020"
                    defaultValue={editingComponent?.machine || ""}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none dark:border-slate-800 dark:bg-slate-800/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Equipment Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FEL"
                    defaultValue={editingComponent?.type || ""}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-bold outline-none dark:border-slate-800 dark:bg-slate-800/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Category *
                  </label>
                  <select className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900">
                    <option>{editingComponent?.category || "Select Category"}</option>
                    <option>Engine</option>
                    <option>Tyre</option>
                    <option>Hydraulic</option>
                    <option>Brake</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Description *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engine Assembly"
                    defaultValue={editingComponent?.desc || ""}
                    className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CK-01-001"
                    defaultValue={editingComponent?.sn || ""}
                    className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Supplier
                  </label>
                  <input
                    type="text"
                    defaultValue="CK & IJ Group"
                    className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Install Hours
                    </label>
                    <input
                      type="number"
                      defaultValue="1100"
                      className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Current Hours
                    </label>
                    <input
                      type="number"
                      defaultValue={editingComponent?.hrs || ""}
                      className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Planned Life (hrs)
                  </label>
                  <input
                    type="number"
                    defaultValue="18000"
                    className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Replacement Cost (R)
                  </label>
                  <input
                    type="number"
                    defaultValue="900000"
                    className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Condition
                  </label>
                  <select className="w-full rounded-2xl border border-slate-100 bg-white px-5 py-3.5 text-sm font-bold outline-none ring-blue-500/10 focus:ring-4 dark:border-slate-800 dark:bg-slate-900">
                    <option value="1">1 - New</option>
                    <option value="2" selected>
                      2 - Good
                    </option>
                    <option value="3">3 - Monitor</option>
                    <option value="4">4 - Warning</option>
                    <option value="5">5 - Critical</option>
                  </select>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsAddModalOpen(false);
                  }}
                  className="flex-1 rounded-2xl border border-slate-100 py-4 text-sm font-black text-slate-500 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-orange-500 py-4 text-sm font-black text-white shadow-xl shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  {isEditModalOpen ? "Update Component" : "Add Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetIntelligence;
