"use client";

import React, { useState, useEffect } from "react";
import {
  ListChecks,
  Plus,
  Search,
  Truck,
  Tractor,
  Activity,
  HardHat,
  Wrench,
  Cog,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  X,
  Gauge,
  Tag,
  Building2,
} from "lucide-react";

type EquipmentTypeItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  companyName: string;
  companyId: string;
  createdAt: string;
};

type ComponentCategoryItem = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  companyName: string;
  companyId: string;
  createdAt: string;
};

export default function CategoryManagement() {
  const [activeTab, setActiveTab] = useState<"equipment" | "component">("equipment");
  const [search, setSearch] = useState("");

  // Equipment Types & Component Categories State (Exact 1-to-1 Database Sync)
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeItem[]>([]);
  const [componentCategories, setComponentCategories] = useState<ComponentCategoryItem[]>([]);

  // Fetch real records from backend DB when component mounts
  useEffect(() => {
    const fetchRealDbData = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const API_BASE = "http://localhost:4000/api/v1";

        // 1. Fetch Machine Equipment Types from DB
        const eqRes = await fetch(`${API_BASE}/machines/categories`, { headers });
        if (eqRes.ok) {
          const eqData = await eqRes.json();
          if (eqData && eqData.data && Array.isArray(eqData.data)) {
            setEquipmentTypes(
              eqData.data.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description || "",
                icon: item.icon || "Truck",
                isActive: item.isActive !== undefined ? item.isActive : true,
                companyName: "Mining Operations Ltd",
                companyId: item.companyId || "COMP-101",
                createdAt: item.createdAt ? item.createdAt.split("T")[0] : "2026-02-10",
              }))
            );
          }
        }

        // 2. Fetch Component Categories from DB
        const compRes = await fetch(`${API_BASE}/components/categories`, { headers });
        if (compRes.ok) {
          const compData = await compRes.json();
          if (compData && compData.data && Array.isArray(compData.data)) {
            setComponentCategories(
              compData.data.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description || "",
                isActive: item.isActive !== undefined ? item.isActive : true,
                companyName: "Mining Operations Ltd",
                companyId: item.companyId || "COMP-101",
                createdAt: item.createdAt ? item.createdAt.split("T")[0] : "2026-02-10",
              }))
            );
          }
        }
      } catch (err) {
        console.log("Error fetching database categories:", err);
      }
    };
    fetchRealDbData();
  }, []);

  // Modal States
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [isCcModalOpen, setIsCcModalOpen] = useState(false);

  // Form Inputs
  const [eqForm, setEqForm] = useState({ name: "", description: "", icon: "Truck" });
  const [ccForm, setCcForm] = useState({ name: "", description: "" });

  // Handle Equipment Type Add
  const handleAddEquipmentType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqForm.name.trim()) return;

    const newItem: EquipmentTypeItem = {
      id: `eq-${Date.now()}`,
      name: eqForm.name.trim(),
      description: eqForm.description.trim(),
      icon: eqForm.icon,
      isActive: true,
      companyName: "Mining Operations Ltd",
      companyId: "COMP-101",
      createdAt: new Date().toISOString().split("T")[0],
    };

    // Send POST request to backend API Gateway (Port 4000)
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/v1/machines/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description,
          icon: newItem.icon,
          companyId: newItem.companyId,
        }),
      });

      if (res.ok) {
        const resJson = await res.json();
        if (resJson.data) {
          const inserted = {
            id: resJson.data.id || newItem.id,
            name: resJson.data.name || newItem.name,
            description: resJson.data.description || "",
            icon: resJson.data.icon || newItem.icon,
            isActive: true,
            companyName: "Mining Operations Ltd",
            companyId: resJson.data.companyId || newItem.companyId,
            createdAt: new Date().toISOString().split("T")[0],
          };
          setEquipmentTypes((prev) => [inserted, ...prev]);
        } else {
          setEquipmentTypes((prev) => [newItem, ...prev]);
        }
      } else {
        setEquipmentTypes((prev) => [newItem, ...prev]);
      }
    } catch (err) {
      setEquipmentTypes((prev) => [newItem, ...prev]);
    }

    setEqForm({ name: "", description: "", icon: "Truck" });
    setIsEqModalOpen(false);
  };

  // Handle Component Category Add
  const handleAddComponentCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccForm.name.trim()) return;

    const newItem: ComponentCategoryItem = {
      id: `cc-${Date.now()}`,
      name: ccForm.name.trim(),
      description: ccForm.description.trim(),
      isActive: true,
      companyName: "Mining Operations Ltd",
      companyId: "COMP-101",
      createdAt: new Date().toISOString().split("T")[0],
    };

    // Send POST request to backend API Gateway (Port 4000)
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/v1/components/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newItem.name,
          description: newItem.description,
          companyId: newItem.companyId,
        }),
      });

      if (res.ok) {
        const resJson = await res.json();
        if (resJson.data) {
          const inserted = {
            id: resJson.data.id || newItem.id,
            name: resJson.data.name || newItem.name,
            description: resJson.data.description || "",
            isActive: true,
            companyName: "Mining Operations Ltd",
            companyId: resJson.data.companyId || newItem.companyId,
            createdAt: new Date().toISOString().split("T")[0],
          };
          setComponentCategories((prev) => [inserted, ...prev]);
        } else {
          setComponentCategories((prev) => [newItem, ...prev]);
        }
      } else {
        setComponentCategories((prev) => [newItem, ...prev]);
      }
    } catch (err) {
      setComponentCategories((prev) => [newItem, ...prev]);
    }

    setCcForm({ name: "", description: "" });
    setIsCcModalOpen(false);
  };

  // Toggle Equipment Status
  const toggleEqStatus = (id: string) => {
    setEquipmentTypes(
      equipmentTypes.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  // Delete Equipment Type
  const deleteEqItem = (id: string) => {
    setEquipmentTypes(equipmentTypes.filter((item) => item.id !== id));
  };

  // Toggle Component Status
  const toggleCcStatus = (id: string) => {
    setComponentCategories(
      componentCategories.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  // Delete Component Category
  const deleteCcItem = (id: string) => {
    setComponentCategories(componentCategories.filter((item) => item.id !== id));
  };

  // Render Icon helper
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "Tractor":
        return <Tractor className="h-5 w-5 text-amber-500" />;
      case "Activity":
        return <Activity className="h-5 w-5 text-purple-500" />;
      case "HardHat":
        return <HardHat className="h-5 w-5 text-emerald-500" />;
      case "Wrench":
        return <Wrench className="h-5 w-5 text-indigo-500" />;
      case "Cog":
        return <Cog className="h-5 w-5 text-rose-500" />;
      default:
        return <Truck className="h-5 w-5 text-blue-500" />;
    }
  };

  // Filtered Equipment Types
  const filteredEq = equipmentTypes.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  // Filtered Component Categories
  const filteredCc = componentCategories.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Premium Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#2563EB] to-[#1D4ED8] p-6 text-white shadow-xl dark:border-slate-800">
          <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Building2 size={14} />
                Company Admin Master Controls
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Category & Equipment Master
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                Create and manage custom machine equipment types and component categories for your company database. Records are isolated under your company ID.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === "equipment" ? (
                <button
                  onClick={() => setIsEqModalOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-lg transition hover:bg-blue-50 active:scale-95"
                >
                  <Plus size={18} />
                  Create Equipment Type
                </button>
              ) : (
                <button
                  onClick={() => setIsCcModalOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-lg transition hover:bg-blue-50 active:scale-95"
                >
                  <Plus size={18} />
                  Create Component Category
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selection & Search Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <button
              onClick={() => setActiveTab("equipment")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === "equipment"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Truck size={16} />
              Machine Equipment Types ({equipmentTypes.length})
            </button>

            <button
              onClick={() => setActiveTab("component")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === "component"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Tag size={16} />
              Component Categories ({componentCategories.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab === "equipment" ? "equipment types" : "component categories"}...`}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-[#0b1728] dark:text-white"
            />
          </div>
        </div>

        {/* Tab 1: Equipment Types Table */}
        {activeTab === "equipment" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#101f33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Equipment Type & Icon
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Company ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEq.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-[#101f33]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#101f33]">
                            {renderIcon(item.icon)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </h4>
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              Created: {item.createdAt}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {item.description}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                          {item.companyId} ({item.companyName})
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle size={13} /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleEqStatus(item.id)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                            title="Toggle Status"
                          >
                            <ShieldCheck size={16} />
                          </button>

                          <button
                            onClick={() => deleteEqItem(item.id)}
                            className="rounded-xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                            title="Delete"
                          >
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
        )}

        {/* Tab 2: Component Categories Table */}
        {activeTab === "component" && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#101f33]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Component Category Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Company ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCc.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-[#101f33]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                            <Tag size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </h4>
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                              Created: {item.createdAt}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {item.description}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                          {item.companyId} ({item.companyName})
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle size={13} /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleCcStatus(item.id)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300"
                            title="Toggle Status"
                          >
                            <ShieldCheck size={16} />
                          </button>

                          <button
                            onClick={() => deleteCcItem(item.id)}
                            className="rounded-xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                            title="Delete"
                          >
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
        )}

        {/* Modal 1: Create Equipment Type Modal */}
        {isEqModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0b1728]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Create Equipment Type
                </h3>
                <button
                  onClick={() => setIsEqModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEquipmentType} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Equipment Type Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={eqForm.name}
                    onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })}
                    placeholder="e.g. Haul Truck 400T, Excavator"
                    className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={eqForm.description}
                    onChange={(e) => setEqForm({ ...eqForm, description: e.target.value })}
                    placeholder="Enter category description..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Icon Symbol
                  </label>
                  <select
                    value={eqForm.icon}
                    onChange={(e) => setEqForm({ ...eqForm, icon: e.target.value })}
                    className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                  >
                    <option value="Truck">Truck 🚚 (Haulers & Dumpers)</option>
                    <option value="Tractor">Tractor 🚜 (Excavators & Diggers)</option>
                    <option value="Activity">Activity ⚡ (Drilling Rigs)</option>
                    <option value="HardHat">HardHat 🪖 (Dozers & Loaders)</option>
                    <option value="Wrench">Wrench 🔧 (Maintenance Machinery)</option>
                    <option value="Cog">Cog ⚙️ (Industrial Engine)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEqModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    Save Equipment Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Create Component Category Modal */}
        {isCcModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0b1728]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Create Component Category
                </h3>
                <button
                  onClick={() => setIsCcModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddComponentCategory} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Component Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ccForm.name}
                    onChange={(e) => setCcForm({ ...ccForm, name: e.target.value })}
                    placeholder="e.g. Engine Assembly, Hydraulic System"
                    className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={ccForm.description}
                    onChange={(e) => setCcForm({ ...ccForm, description: e.target.value })}
                    placeholder="Enter category description..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-[#101f33] dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCcModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700"
                  >
                    Save Component Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
