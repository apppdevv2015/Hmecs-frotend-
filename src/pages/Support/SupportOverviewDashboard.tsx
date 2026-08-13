import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileBarChart,
  FileClock,
  FileText,
  FileWarning,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ticketService,
  type Ticket,
  type TicketStatus,
  type TicketPriority,
} from "../../services/Support/ticketService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Urgent: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold",
};

const STATUS_BADGES: Record<TicketStatus, string> = {
  Open: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40",
  Assigned: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40",
  "Waiting for Customer": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
  Closed: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export default function SupportOverviewDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await ticketService.getTickets({ limit: 100 });
      setTickets(Array.isArray(res?.tickets) ? res.tickets : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load dashboard data");
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const safeTickets = Array.isArray(tickets) ? tickets : [];

  // 8 Summary Metrics
  const totalCount = safeTickets.length;
  const openCount = safeTickets.filter((t) => t?.status === "Open").length;
  const assignedCount = safeTickets.filter((t) => t?.status === "Assigned").length;
  const inProgressCount = safeTickets.filter((t) => t?.status === "In Progress").length;
  const waitingCount = safeTickets.filter((t) => t?.status === "Waiting for Customer").length;
  const resolvedCount = safeTickets.filter((t) => t?.status === "Resolved").length;
  const closedCount = safeTickets.filter((t) => t?.status === "Closed").length;

  // Recent 5 Assigned Tickets to Current Agent
  const myAssignedTickets = safeTickets
    .filter((t) => t?.assignedToId === currentUser?.id || t?.assignedTo?.email === currentUser?.email)
    .slice(0, 5);

  // Priority Distribution Ratio
  const lowPriority = safeTickets.filter((t) => t?.priority === "Low").length;
  const mediumPriority = safeTickets.filter((t) => t?.priority === "Medium").length;
  const highPriority = safeTickets.filter((t) => t?.priority === "High").length;
  const urgentPriority = safeTickets.filter((t) => t?.priority === "Urgent").length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-6 text-white shadow-xl shadow-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
              Technical Support Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Welcome Back, {currentUser.name || currentUser.firstName || "Agent"} 👋
          </h1>
          <p className="text-sm font-medium text-blue-100">
            Real-time overview of incoming ticket volume, SLA health, and team performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/support/tickets?action=new")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50 active:scale-95"
          >
            <Plus size={18} />
            Create Ticket
          </button>
          <button
            onClick={() => navigate("/support/tickets")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            <FileWarning size={18} />
            View All Tickets
          </button>
          <button
            onClick={() => navigate("/support/reports")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            <FileBarChart size={18} />
            Generate Report
          </button>
        </div>
      </div>

      {/* 8 Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Tickets</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">Open</p>
          <p className="mt-2 text-2xl font-black text-red-700 dark:text-red-300">{openCount}</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400">Assigned</p>
          <p className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-300">{assignedCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">In Progress</p>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{inProgressCount}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Waiting</p>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{waitingCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Resolved</p>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{resolvedCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Closed</p>
          <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">{closedCount}</p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">SLA Avg Time</p>
          <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300">2.4h</p>
        </div>
      </div>

      {/* Main Visuals Grid: Weekly Trend & Priority Ratio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Ticket Trend Graph */}
        <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Weekly Ticket Volume Trend
              </h3>
              <p className="text-xs text-slate-500">
                Incoming vs Resolved support requests over the last 7 days.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              Live Feed
            </span>
          </div>

          <div className="mt-6 flex h-48 items-end gap-3 sm:gap-6">
            {[
              { day: "Mon", count: 12, resolved: 10 },
              { day: "Tue", count: 18, resolved: 15 },
              { day: "Wed", count: 24, resolved: 20 },
              { day: "Thu", count: 15, resolved: 14 },
              { day: "Fri", count: 28, resolved: 22 },
              { day: "Sat", count: 9, resolved: 9 },
              { day: "Sun", count: 6, resolved: 6 },
            ].map((bar) => (
              <div key={bar.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end justify-center gap-1.5 rounded-2xl bg-slate-50 p-2 dark:bg-slate-900">
                  <div
                    style={{ height: `${(bar.count / 30) * 100}%` }}
                    className="w-1/2 rounded-t-lg bg-blue-500 transition-all duration-500 hover:bg-blue-600"
                    title={`Incoming: ${bar.count}`}
                  />
                  <div
                    style={{ height: `${(bar.resolved / 30) * 100}%` }}
                    className="w-1/2 rounded-t-lg bg-emerald-500 transition-all duration-500 hover:bg-emerald-600"
                    title={`Resolved: ${bar.resolved}`}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 border-t border-slate-100 pt-4 text-xs font-bold dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">Incoming Tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Resolved Tickets</span>
            </div>
          </div>
        </div>

        {/* Priority Ratio Breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Priority Distribution
          </h3>
          <p className="text-xs text-slate-500">Ticket breakdown by urgency level.</p>

          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600 dark:text-rose-400">Urgent</span>
                <span>{urgentPriority} tickets</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  style={{ width: `${totalCount ? (urgentPriority / totalCount) * 100 : 0}%` }}
                  className="h-2 rounded-full bg-rose-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-amber-600 dark:text-amber-400">High</span>
                <span>{highPriority} tickets</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  style={{ width: `${totalCount ? (highPriority / totalCount) * 100 : 0}%` }}
                  className="h-2 rounded-full bg-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-blue-600 dark:text-blue-400">Medium</span>
                <span>{mediumPriority} tickets</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  style={{ width: `${totalCount ? (mediumPriority / totalCount) * 100 : 0}%` }}
                  className="h-2 rounded-full bg-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">Low</span>
                <span>{lowPriority} tickets</span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  style={{ width: `${totalCount ? (lowPriority / totalCount) * 100 : 0}%` }}
                  className="h-2 rounded-full bg-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 text-xs">
              <Zap size={16} />
              SLA Compliance Rate: 98.4%
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              98.4% of urgent tickets responded within 15 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Recent Assigned Tickets & Recent Activity Stream */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Assigned Tickets (Last 5) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Recent Assigned Tickets (My Tasks)
            </h3>
            <Link
              to="/support/tickets?assigned=me"
              className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              View All
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {myAssignedTickets.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-slate-400">
                No tickets currently assigned to you.
              </div>
            ) : (
              myAssignedTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/support/tickets/${t.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-blue-900/50"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {t.ticketNumber}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGES[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-slate-900 dark:text-white">
                      {t.subject}
                    </p>
                  </div>

                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[t.priority]}`}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities Stream */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Recent Support Activities
            </h3>
            <Link
              to="/support/activity"
              className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              View Full Stream
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { time: "10 mins ago", text: "Technical Support assigned ticket TICK-1001 to self", icon: UserCheck, color: "text-purple-500" },
              { time: "25 mins ago", text: "John Operator posted reply on TICK-1001", icon: FileText, color: "text-blue-500" },
              { time: "1 hour ago", text: "Thabo Engineer updated status of TICK-1003 to Waiting for Customer", icon: Activity, color: "text-amber-500" },
              { time: "2 hours ago", text: "Ticket TICK-1004 marked as Resolved by Support Agent", icon: BadgeCheck, color: "text-emerald-500" },
            ].map((act, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/40">
                <act.icon size={16} className={`mt-0.5 shrink-0 ${act.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {act.text}
                  </p>
                  <span className="mt-0.5 text-[10px] text-slate-400">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
