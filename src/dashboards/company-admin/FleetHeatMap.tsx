import React, { useState } from "react";
import {
  LayoutGrid,
  Truck,
  Zap,
  Settings2,
  Layers,
  ChevronRight,
  Circle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

const CATEGORIES = [
  { name: "All Equipment", count: null, active: true },
  { name: "Dozers", count: 2, active: false },
  { name: "Drills", count: 1, active: false },
  { name: "Excavators / Shovels / FEL", count: 2, active: false },
  { name: "Trucks", count: 2, active: false },
  { name: "Graders", count: 1, active: false },
];

const SUMMARY_CARDS = [
  {
    type: "DOZER",
    name: "Dozers",
    total: 2,
    crit: 1,
    warn: 1,
    ok: 0,
    color: "text-orange-500",
    bg: "bg-orange-50/50",
  },
  {
    type: "DRILL",
    name: "Drills",
    total: 1,
    crit: 0,
    warn: 1,
    ok: 0,
    color: "text-blue-500",
    bg: "bg-blue-50/50",
  },
  {
    type: "EXCAVATOR",
    name: "Excavators / Shovels / FEL",
    total: 2,
    crit: 1,
    warn: 1,
    ok: 0,
    color: "text-orange-400",
    bg: "bg-orange-50/30",
  },
  {
    type: "HT",
    name: "Haul Trucks",
    total: 2,
    crit: 2,
    warn: 0,
    ok: 0,
    color: "text-red-500",
    bg: "bg-red-50/50",
  },
  {
    type: "GRADER",
    name: "Graders",
    total: 1,
    crit: 1,
    warn: 0,
    ok: 0,
    color: "text-teal-500",
    bg: "bg-teal-50/50",
  },
];

const FLEET_DATA = [
  {
    id: "CK&IJ-785-011",
    location: "Limpopo Operations",
    fleet: "PLT-032",
    type: "HT",
    tyre: { status: "crit", label: "LEFT REAR TYRE", life: "13% life left" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "77% life left" },
    hydraulic: { status: "warn", label: "STEERING HYDR...", life: "65% life left" },
    transmission: { status: "none", label: "TRANSMISSION", life: "No data" },
    risk: "Critical",
  },
  {
    id: "CK&IJ-GD-007",
    location: "Limpopo Operations",
    fleet: "PLT-034",
    type: "Grader",
    tyre: { status: "crit", label: "FRONT TYRE LH", life: "77% life left" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "78% life left" },
    hydraulic: { status: "crit", label: "CIRCLE DRIVE ...", life: "84% life left" },
    transmission: { status: "none", label: "TRANSMISSION", life: "No data" },
    risk: "Critical",
  },
  {
    id: "CK&IJ-990-020",
    location: "Tshwane North Mine",
    fleet: "PLT-021",
    type: "FEL",
    tyre: { status: "crit", label: "FRONT LEFT TY...", life: "48% life left" },
    engine: { status: "warn", label: "TURBOCHARGER", life: "55% life left" },
    hydraulic: { status: "ok", label: "HYDRAULIC PUMP", life: "48% life left" },
    transmission: { status: "ok", label: "TRANSMISSION", life: "72% life left" },
    risk: "Critical",
  },
  {
    id: "CK&IJ-785-042",
    location: "Gauteng East Pit",
    fleet: "PLT-027",
    type: "HT",
    tyre: { status: "crit", label: "LEFT FRONT TY...", life: "87% life left" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "83% life left" },
    hydraulic: { status: "ok", label: "HOIST HYDRAUL...", life: "68% life left" },
    transmission: { status: "ok", label: "TRANSMISSION", life: "70% life left" },
    risk: "Critical",
  },
  {
    id: "CK&IJ-D8T-055",
    location: "Limpopo Operations",
    fleet: "PLT-036",
    type: "Dozer",
    tyre: { status: "crit", label: "TRACK CHAIN LH", life: "18% life left" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "62% life left" },
    hydraulic: { status: "ok", label: "BLADE TILT CY...", life: "83% life left" },
    transmission: { status: "warn", label: "POWER SHIFT T...", life: "85% life left" },
    risk: "Critical",
  },
  {
    id: "CK&IJ-EX300-015",
    location: "Gauteng East Pit",
    fleet: "PLT-028",
    type: "Excavator",
    tyre: { status: "none", label: "TYRE", life: "No data" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "77% life left" },
    hydraulic: { status: "ok", label: "MAIN HYDRAULI...", life: "85% life left" },
    transmission: { status: "ok", label: "TRANSMISSION", life: "78% life left" },
    risk: "Warning",
  },
  {
    id: "CK&IJ-D10-003",
    location: "Tshwane North Mine",
    fleet: "PLT-033",
    type: "Dozer",
    tyre: { status: "none", label: "TYRE", life: "No data" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "84% life left" },
    hydraulic: { status: "ok", label: "BLADE HYDRAUL...", life: "75% life left" },
    transmission: { status: "none", label: "TRANSMISSION", life: "No data" },
    risk: "Warning",
  },
  {
    id: "CK&IJ-DR680-031",
    location: "Tshwane North Mine",
    fleet: "PLT-038",
    type: "Drill",
    tyre: { status: "ok", label: "CARRIER TYRE ...", life: "77% life left" },
    engine: { status: "ok", label: "ENGINE ASSEMB...", life: "78% life left" },
    hydraulic: { status: "ok", label: "FEED HYDRAULI...", life: "87% life left" },
    transmission: { status: "warn", label: "ROTARY DRIVE...", life: "88% life left" },
    risk: "Warning",
  },
];

export default function FleetHeatMap() {
  const [activeTab, setActiveTab] = useState("All Equipment");

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "crit")
      return (
        <div className="h-8 w-8 rounded-lg bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
          <AlertCircle size={16} fill="currentColor" className="text-red-200" />
        </div>
      );
    if (status === "warn")
      return (
        <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
          <Circle size={14} fill="currentColor" />
        </div>
      );
    if (status === "ok")
      return (
        <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30">
          <CheckCircle2 size={16} fill="currentColor" className="text-green-200" />
        </div>
      );
    return (
      <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400">
        <HelpCircle size={16} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-slate-900 p-4 lg:p-10">
      <div className="mx-auto max-w-[1600px] space-y-8">
        {/* Header & Main Stats Bar */}
        <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                <LayoutGrid size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Fleet Health Heat Map
                </h1>
                <p className="text-xs font-bold text-slate-400 tracking-wider">
                  Visual fleet status by equipment type
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-4 border-r border-slate-100 pr-8 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-red-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-orange-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-green-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Healthy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm bg-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">No Data</span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[18px] font-black text-slate-900 dark:text-white">8</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Machines
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-black text-red-500">5</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Critical
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-black text-orange-500">3</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Warning
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-black text-green-500">0</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Healthy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveTab(cat.name)}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === cat.name
                  ? "bg-white text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/10"
                  : "bg-white text-slate-400 border-2 border-transparent hover:border-slate-100"
              }`}
            >
              {cat.name}{" "}
              {cat.count && (
                <span
                  className={`ml-1 h-5 w-5 rounded-full flex items-center justify-center text-[9px] ${activeTab === cat.name ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="flex flex-wrap gap-6">
          {SUMMARY_CARDS.filter(
            (card) =>
              activeTab === "All Equipment" ||
              activeTab.toLowerCase().includes(card.name.toLowerCase().split(" ")[0]),
          ).map((card) => (
            <div
              key={card.type}
              className={`rounded-[2.5rem] bg-white p-6 border-2 transition-all shadow-sm min-w-[320px] ${activeTab !== "All Equipment" ? "border-red-500/50 ring-4 ring-red-500/5" : "border-transparent"}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${card.color}`}>
                    {card.type}
                  </p>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">{card.name}</h4>
                </div>
                <div
                  className={`h-10 w-10 rounded-2xl ${card.bg} flex items-center justify-center ${card.color}`}
                >
                  <Settings2 size={18} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-sm font-black text-slate-900">{card.total}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-red-500">{card.crit}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase">Crit</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-orange-500">{card.warn}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase">Warn</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-green-500">{card.ok}</p>
                  <p className="text-[7px] font-black text-slate-400 uppercase">OK</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Heat Map Table */}
        <div className="rounded-[3rem] bg-white shadow-sm overflow-hidden border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#FBFCFE] border-b border-slate-50 dark:bg-slate-900/50 dark:border-slate-700/50">
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Machine ID
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Type
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Tyre
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Engine
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Hydraulic
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Transmission
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                    Overall Risk
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {FLEET_DATA.filter((row) => {
                  if (activeTab === "All Equipment") return true;
                  const tabLower = activeTab.toLowerCase();
                  const typeLower = row.type.toLowerCase();

                  // Special mappings
                  if (tabLower.includes("truck") && typeLower === "ht") return true;
                  if (tabLower.includes("fel") && typeLower === "fel") return true;

                  return tabLower.includes(typeLower) || typeLower.includes(tabLower.split(" ")[0]);
                }).map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 transition-all group dark:hover:bg-slate-900/30"
                  >
                    <td className="px-10 py-8">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{row.id}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {row.location}
                      </p>
                      <p className="text-[8px] font-black text-orange-500/70 mt-1 italic">
                        Fleet #: {row.fleet}
                      </p>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-500 text-[8px] font-black uppercase border border-blue-100">
                        {row.type}
                      </span>
                    </td>
                    {[row.tyre, row.engine, row.hydraulic, row.transmission].map((comp, idx) => (
                      <td key={idx} className="px-10 py-8">
                        <div className="flex flex-col items-center gap-2">
                          <StatusIcon status={comp.status} />
                          <div className="text-center">
                            <p className="text-[7px] font-black text-slate-500 uppercase truncate max-w-[80px] dark:text-slate-400">
                              {comp.label}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                              {comp.life}
                            </p>
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="px-10 py-8 text-center">
                      <div className="flex justify-center">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-2 border-2 ${
                            row.risk === "Critical"
                              ? "bg-red-50 text-red-500 border-red-100"
                              : "bg-orange-50 text-orange-500 border-orange-100"
                          }`}
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full animate-pulse ${row.risk === "Critical" ? "bg-red-500" : "bg-orange-500"}`}
                          />
                          {row.risk}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
