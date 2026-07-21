import React from "react";
import {
  Bell,
  Send,
  UserPlus,
  Settings2,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  Edit3,
  Plus,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Zap,
  LayoutGrid,
  Database,
} from "lucide-react";

const ACTIVE_ALERTS = [
  {
    id: 1,
    machine: "CK&IJ-990-020",
    component: "Turbocharger",
    category: "Engine",
    type: "FEL",
    serial: "CK-01-002",
    rule: "Engine Condition Alert",
    life: "55.0%",
    hours: "4 400 hrs",
    condition: "Warning",
    cost: "R 200K",
  },
  {
    id: 2,
    machine: "CK&IJ-785-011",
    component: "Front Left Tyre",
    category: "Tyre",
    type: "Truck",
    serial: "TY-01-099",
    rule: "Critical Tyre Alert",
    life: "8.0%",
    hours: "12 800 hrs",
    condition: "Critical",
    cost: "R 450K",
  },
  {
    id: 3,
    machine: "CK&IJ-EX300-015",
    component: "Bucket Teeth Set",
    category: "Ground Engaging",
    type: "Excavator",
    serial: "GET-05-22",
    rule: "Wear Threshold Alert",
    life: "32.0%",
    hours: "850 hrs",
    condition: "Warning",
    cost: "R 45K",
  },
];

const NOTIFICATION_HISTORY = [
  // ... existing code ...
  {
    date: "2026/05/10 15:35",
    recipient: "Thabo Dlamini",
    machine: "CK&IJ-990-020",
    component: "Front Left Tyre",
    severity: "Critical",
    channel: ["Email", "WhatsApp"],
    status: "Delivered",
  },
  {
    date: "2026/05/11 15:35",
    recipient: "Sipho Mokoena",
    machine: "CK&IJ-785-011",
    component: "Left Rear Tyre",
    severity: "Critical",
    channel: ["Email"],
    status: "Delivered",
  },
  {
    date: "2026/05/12 15:35",
    recipient: "Nompumelelo Zulu",
    machine: "CK&IJ-GD-007",
    component: "Front Tyre LH",
    severity: "Critical",
    channel: ["Email", "SMS"],
    status: "Delivered",
  },
  {
    date: "2026/05/13 10:35",
    recipient: "Pieter Khumalo",
    machine: "CK&IJ-EX300-015",
    component: "Bucket Teeth Set",
    severity: "Warning",
    channel: ["Email"],
    status: "Delivered",
  },
  {
    date: "2026/05/13 13:35",
    recipient: "Thabo Dlamini",
    machine: "CK&IJ-990-020",
    component: "Turbocharger",
    severity: "Warning",
    channel: ["Email", "WhatsApp"],
    status: "Delivered",
  },
];

const CONTACTS = [
  {
    name: "Thabo Dlamini",
    role: "Fleet Manager",
    channels: ["Email", "SMS", "WhatsApp"],
    initial: "TD",
    color: "bg-orange-500",
  },
  {
    name: "Sipho Mokoena",
    role: "Workshop Supervisor",
    channels: ["Email", "SMS", "WhatsApp"],
    initial: "SM",
    color: "bg-blue-500",
  },
  {
    name: "Nompumelelo Zulu",
    role: "Safety Officer",
    channels: ["Email", "SMS", "WhatsApp"],
    initial: "NZ",
    color: "bg-purple-500",
  },
  {
    name: "Pieter Khumalo",
    role: "Maintenance Planner",
    channels: ["Email", "SMS", "WhatsApp"],
    initial: "PK",
    color: "bg-green-500",
  },
  {
    name: "CK&IJ Operations",
    role: "Group Email Alias",
    channels: ["Email", "SMS", "WhatsApp"],
    initial: "CO",
    color: "bg-yellow-600",
  },
];

const ALERT_RULES_DATA = [
  {
    id: 1,
    name: "Critical Life Threshold",
    severity: "Critical",
    trigger: "Remaining Life % ≤ 10% · All categories",
    active: true,
  },
  {
    id: 2,
    name: "Warning Life Threshold",
    severity: "Warning",
    trigger: "Remaining Life % ≤ 25% · All categories",
    active: true,
  },
  {
    id: 3,
    name: "Tyre End-of-Life",
    severity: "Critical",
    trigger: "Remaining Life % ≤ 15% · Category: Tyre",
    active: true,
  },
  {
    id: 4,
    name: "Engine Condition Alert",
    severity: "Warning",
    trigger: "Condition Level ≥ 4 · Category: Engine",
    active: true,
  },
  {
    id: 5,
    name: "Near-Zero Hours Warning",
    severity: "Warning",
    trigger: "Remaining Hours ≤ 200 hrs · All categories",
    active: true,
  },
  {
    id: 6,
    name: "Structural Wear Monitor",
    severity: "Warning",
    trigger: "Remaining Life % ≤ 20% · Category: Structural / Wear",
    active: false,
  },
];

import { Pause } from "lucide-react";

export default function AlertsPage() {
  const [isAddContactModalOpen, setIsAddContactModalOpen] = React.useState(false);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = React.useState(false);
  const [isQuickSendModalOpen, setIsQuickSendModalOpen] = React.useState(false);
  const [alertRules, setAlertRules] = React.useState(ALERT_RULES_DATA);
  const [alertFilter, setAlertFilter] = React.useState("All Alerts");

  const toggleRuleStatus = (id: number) => {
    setAlertRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, active: !rule.active } : rule)),
    );
  };

  const filteredAlerts = ACTIVE_ALERTS.filter((alert) => {
    if (alertFilter === "All Alerts") return true;
    return alert.condition === alertFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-slate-900 p-4 lg:p-10">
      <div className="mx-auto max-w-[1600px] grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Alerts & History */}
        <div className="xl:col-span-8 space-y-10">
          {/* Active Alerts Section */}
          <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Active Component Alerts
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                    Auto-detected from current fleet lifecycle data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <select
                    value={alertFilter}
                    onChange={(e) => setAlertFilter(e.target.value)}
                    className="appearance-none pl-6 pr-12 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black uppercase text-slate-900 focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer hover:bg-slate-100 transition-all"
                  >
                    <option>All Alerts</option>
                    <option>Critical</option>
                    <option>Warning</option>
                    <option>Info</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
                <button className="flex items-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
                  <Send size={14} /> Send All to Contacts
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="relative rounded-[2.5rem] bg-white border-2 border-slate-50 p-8 group hover:border-orange-100 transition-all dark:bg-slate-900/50 dark:border-slate-700/50 overflow-hidden"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${alert.condition === "Critical" ? "bg-red-500" : "bg-orange-500"}`}
                    />
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="flex items-start gap-6">
                        <div
                          className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm ${alert.condition === "Critical" ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"}`}
                        >
                          <History size={28} />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            {alert.component} — {alert.machine}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Settings2 size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {alert.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <LayoutGrid size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {alert.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Database size={12} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                S/N: {alert.serial}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap
                                size={12}
                                className={
                                  alert.condition === "Critical"
                                    ? "text-red-500"
                                    : "text-orange-500"
                                }
                              />
                              <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                Rule: {alert.rule}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <span
                              className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${alert.condition === "Critical" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}
                            >
                              Remaining Life:{" "}
                              <span
                                className={
                                  alert.condition === "Critical"
                                    ? "text-red-700"
                                    : "text-orange-700"
                                }
                              >
                                {alert.life}
                              </span>
                            </span>
                            <span className="px-4 py-1.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-600">
                              Remaining Hours: <span className="text-slate-900">{alert.hours}</span>
                            </span>
                            <span
                              className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${alert.condition === "Critical" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"}`}
                            >
                              Condition:{" "}
                              <span
                                className={
                                  alert.condition === "Critical"
                                    ? "text-red-700"
                                    : "text-yellow-700"
                                }
                              >
                                {alert.condition}
                              </span>
                            </span>
                            <span className="px-4 py-1.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-600">
                              Repl. Cost: <span className="text-slate-900">{alert.cost}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[200px]">
                        <button
                          className={`flex items-center justify-center gap-2 w-full py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${alert.condition === "Critical" ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"}`}
                        >
                          <Bell size={14} /> Notify All
                        </button>
                        <p className="text-[8px] text-center font-bold text-slate-400 uppercase tracking-widest">
                          5 contacts will be notified
                        </p>
                        <button
                          onClick={() => setIsQuickSendModalOpen(true)}
                          className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        >
                          <UserPlus size={14} /> Select Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      No {alertFilter} Alerts
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      Everything is running smoothly
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification History Table */}
          <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Notification History
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider">
                    Log of all sent alerts and notifications
                  </p>
                </div>
              </div>
              <button className="px-6 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:bg-slate-50 transition-all dark:border-slate-700 dark:hover:bg-slate-700">
                Clear History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#FBFCFE] dark:bg-slate-900/50">
                  <tr>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Sent
                    </th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Recipient
                    </th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Machine
                    </th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Component
                    </th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      Severity
                    </th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      Channel
                    </th>
                    <th className="px-10 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {NOTIFICATION_HISTORY.map((log, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/30 transition-all group dark:hover:bg-slate-900/30"
                    >
                      <td className="px-10 py-6 text-[10px] font-bold text-slate-400">
                        {log.date}
                      </td>
                      <td className="px-10 py-6 text-xs font-black text-slate-900 dark:text-white">
                        {log.recipient}
                      </td>
                      <td className="px-10 py-6 text-xs font-bold text-slate-500">{log.machine}</td>
                      <td className="px-10 py-6 text-xs font-bold text-slate-500">
                        {log.component}
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${
                            log.severity === "Critical"
                              ? "bg-red-50 text-red-500"
                              : "bg-orange-50 text-orange-500"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col items-center gap-1">
                          {log.channel.map((ch) => (
                            <span
                              key={ch}
                              className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase"
                            >
                              <div className="h-1 w-1 rounded-full bg-blue-500" /> {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className="px-4 py-1.5 rounded-full bg-green-50 text-[9px] font-black text-green-600 uppercase border border-green-100">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-[#FBFCFE] border-t border-slate-50 dark:bg-slate-900/30 dark:border-slate-700/50 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                5 notifications sent
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Contacts & Rules */}
        <div className="xl:col-span-4 space-y-10">
          {/* Notification Contacts */}
          <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Notification Contacts
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Who receives alerts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddContactModalOpen(true)}
                className="h-10 w-10 rounded-xl border border-orange-100 text-orange-500 flex items-center justify-center hover:bg-orange-50 transition-all shadow-sm shadow-orange-500/10"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {CONTACTS.map((contact) => (
                <div
                  key={contact.name}
                  className="p-5 rounded-[2rem] bg-[#F9FAFB] border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700/50 flex items-center justify-between group hover:border-orange-100 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-2xl ${contact.color} text-white flex items-center justify-center font-black shadow-lg`}
                    >
                      {contact.initial}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {contact.name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400">{contact.role}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {contact.channels.map((ch) => (
                          <span
                            key={ch}
                            className="px-2 py-0.5 rounded-md bg-orange-50 text-[7px] font-black text-orange-600 uppercase border border-orange-100"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg bg-white shadow-sm text-slate-400 hover:text-orange-500 dark:bg-slate-800">
                      <Edit3 size={12} />
                    </button>
                    <button className="p-2 rounded-lg bg-white shadow-sm text-slate-400 hover:text-red-500 dark:bg-slate-800">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Rules */}
          <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Alert Rules</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Automatic trigger thresholds
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddRuleModalOpen(true)}
                className="h-10 w-10 rounded-xl border border-orange-100 text-orange-500 flex items-center justify-center hover:bg-orange-50 transition-all shadow-sm shadow-orange-500/10"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {alertRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-6 rounded-[2.5rem] bg-[#F9FAFB] border border-slate-100 dark:bg-slate-900/50 dark:border-slate-700/50 hover:border-orange-100 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {rule.name}
                    </h4>
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                        rule.severity === "Critical"
                          ? "bg-red-50 text-red-500"
                          : "bg-yellow-50 text-yellow-500"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 italic mb-6">
                    Trigger: {rule.trigger}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleStatus(rule.id)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${
                          rule.active
                            ? "bg-green-50 text-green-600 border border-green-100 hover:bg-green-100"
                            : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {rule.active ? <CheckCircle2 size={14} /> : <Pause size={14} />}
                        {rule.active ? "Active" : "Inactive"}
                      </button>
                      <button className="p-2 rounded-lg bg-white shadow-sm text-slate-400 hover:text-orange-500 dark:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 size={12} />
                      </button>
                      <button className="p-2 rounded-lg bg-white shadow-sm text-slate-400 hover:text-red-500 dark:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Send Alert Card */}
          <div className="rounded-[3rem] bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Quick Send Alert
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Manual custom notification
                </p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                  Recipient *
                </label>
                <div className="relative group">
                  <select className="appearance-none w-full px-6 py-4 rounded-2xl bg-[#F9FAFB] border border-slate-100 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all">
                    {CONTACTS.map((c) => (
                      <option key={c.name}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                  Severity
                </label>
                <div className="relative group">
                  <select className="appearance-none w-full px-6 py-4 rounded-2xl bg-[#F9FAFB] border border-slate-100 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all">
                    <option>Warning</option>
                    <option>Critical</option>
                    <option>Info</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-50 border border-orange-100 text-[9px] font-black text-orange-600 uppercase">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Email
                </button>
                <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-500 uppercase">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> SMS
                </button>
                <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[9px] font-black text-slate-500 uppercase">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> WhatsApp
                </button>
              </div>
              <button className="w-full py-4 bg-orange-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3">
                <Send size={16} /> Send Notification
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsAddContactModalOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 dark:bg-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                  <UserPlus size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Add Contact</h3>
              </div>
              <button
                onClick={() => setIsAddContactModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-all dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    placeholder="Fleet Manager"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="john@ckijgroup.co.za"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Mobile / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+27 82 000 0000"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                  Alert Channels
                </label>
                <div className="flex items-center gap-3">
                  <button className="px-5 py-2.5 rounded-xl bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600 uppercase flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Email
                  </button>
                  <button className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    SMS
                  </button>
                  <button className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    WhatsApp
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                  Receive Alerts For
                </label>
                <div className="flex items-center gap-3">
                  <button className="px-5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-[10px] font-black text-red-600 uppercase flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" /> Critical
                  </button>
                  <button className="px-5 py-2.5 rounded-xl bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600 uppercase flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500" /> Warning
                  </button>
                  <button className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" /> Info
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                  Status
                </label>
                <div className="relative group">
                  <select className="appearance-none w-full px-6 py-4 rounded-2xl bg-[#F9FAFB] border border-slate-100 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6">
                <button
                  onClick={() => setIsAddContactModalOpen(false)}
                  className="px-10 py-4 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button className="px-10 py-4 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20">
                  Save Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Alert Rule Modal */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsAddRuleModalOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 dark:bg-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <Settings2 size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Add Alert Rule
                </h3>
              </div>
              <button
                onClick={() => setIsAddRuleModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-all dark:hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Critical Tyre Alert"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Trigger Type *
                  </label>
                  <div className="relative group">
                    <select className="appearance-none w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                      <option>Remaining Life %</option>
                      <option>Remaining Hours</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Threshold Value *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Comparator
                  </label>
                  <div className="relative group">
                    <select className="appearance-none w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                      <option>&lt; Less than or equal</option>
                      <option>&gt; Greater than or equal</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Category Filter
                  </label>
                  <div className="relative group">
                    <select className="appearance-none w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                      <option>All Categories</option>
                      <option>Tyre</option>
                      <option>Engine</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                    Severity Level
                  </label>
                  <div className="relative group">
                    <select className="appearance-none w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                      <option>Critical</option>
                      <option>Warning</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">
                  Rule Status
                </label>
                <div className="relative group">
                  <select className="appearance-none w-full px-6 py-4 rounded-2xl bg-[#F9FAFB] border border-slate-100 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-all">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6">
                <button
                  onClick={() => setIsAddRuleModalOpen(false)}
                  className="px-10 py-4 rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  Cancel
                </button>
                <button className="px-10 py-4 rounded-2xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20">
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
