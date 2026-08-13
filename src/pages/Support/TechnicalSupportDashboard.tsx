import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileWarning,
  Filter,
  LifeBuoy,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Send,
  X,
  Building2,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  ticketService,
  type Ticket,
  type TicketStatus,
  type TicketPriority,
} from "../../services/Support/ticketService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

const STATUS_STAGES: TicketStatus[] = [
  "Open",
  "Assigned",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  Open: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800/40",
  },
  Assigned: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800/40",
  },
  "In Progress": {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/40",
  },
  "Waiting for Customer": {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/40",
  },
  Resolved: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/40",
  },
  Closed: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
};

const getStatusColor = (status?: string) => {
  if (!status) return STATUS_COLORS.Open;
  return STATUS_COLORS[status as TicketStatus] || STATUS_COLORS.Open;
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Urgent: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold",
};

export default function TechnicalSupportDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const currentUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
  const userRole = StorageService.get<string>(STORAGE_KEYS.ROLE) || "";

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await ticketService.getTickets({
        status: selectedStatus,
        priority: selectedPriority,
        search: searchTerm,
      });
      setTickets(Array.isArray(res?.tickets) ? res.tickets : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedPriority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      await ticketService.addMessage(activeTicket.id, replyMessage.trim());
      toast.success("Reply sent successfully");
      setReplyMessage("");
      // Refresh active ticket
      const updated = await ticketService.getTicket(activeTicket.id);
      setActiveTicket(updated);
      fetchTickets();
    } catch (error: any) {
      toast.error(error?.message || "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!activeTicket) return;
    setIsUpdatingStatus(true);
    try {
      await ticketService.updateStatus(activeTicket.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      const updated = await ticketService.getTicket(activeTicket.id);
      setActiveTicket(updated);
      fetchTickets();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!activeTicket) return;
    try {
      await ticketService.assignTicket(activeTicket.id, currentUser.id);
      toast.success("Ticket assigned to you");
      const updated = await ticketService.getTicket(activeTicket.id);
      setActiveTicket(updated);
      fetchTickets();
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign ticket");
    }
  };

  // Safe Metrics
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const totalCount = safeTickets.length;
  const openCount = safeTickets.filter((t) => t?.status === "Open").length;
  const assignedCount = safeTickets.filter((t) => t?.status === "Assigned").length;
  const inProgressCount = safeTickets.filter((t) => t?.status === "In Progress").length;
  const waitingCount = safeTickets.filter((t) => t?.status === "Waiting for Customer").length;
  const resolvedCount = safeTickets.filter((t) => t?.status === "Resolved" || t?.status === "Closed").length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-6 text-white shadow-xl shadow-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
              Technical Support Command Center
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Support Ticket Management System
          </h1>
          <p className="text-sm font-medium text-blue-100">
            Monitor, assign, and resolve support requests across all registered companies.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchTickets}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Tickets</p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">Open Tickets</p>
          <p className="mt-2 text-2xl font-black text-red-700 dark:text-red-300">{openCount}</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400">Assigned</p>
          <p className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-300">{assignedCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">In Progress</p>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{inProgressCount}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Awaiting Customer</p>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{waitingCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Resolved / Closed</p>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{resolvedCount}</p>
        </div>
      </div>

      {/* Ticket Lifecycle Workflow Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ticket Lifecycle Workflow State Machine
        </h3>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {STATUS_STAGES.map((stage, idx) => (
            <React.Fragment key={stage}>
              <button
                onClick={() => setSelectedStatus(selectedStatus === stage ? "all" : stage)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  selectedStatus === stage
                    ? "ring-2 ring-blue-500 ring-offset-2 " + STATUS_COLORS[stage].bg + " " + STATUS_COLORS[stage].text
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <span>{stage}</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                  {safeTickets.filter((t) => t?.status === stage).length}
                </span>
              </button>

              {idx < STATUS_STAGES.length - 1 && (
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-600" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, subject, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="all">All Statuses</option>
              {STATUS_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Ticket #</th>
                <th className="px-6 py-4">Subject & Details</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned Agent</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm font-medium text-slate-400">
                    Loading support tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm font-medium text-slate-400">
                    No support tickets found matching criteria.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {ticket.ticketNumber}
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1 dark:text-white">
                        {ticket.subject}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                        {ticket.description}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                        <Building2 size={14} className="text-slate-400" />
                        {ticket.company?.name || "HME Systems"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {ticket.category || "General"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                          PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.Medium
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                          getStatusColor(ticket.status).bg
                        } ${getStatusColor(ticket.status).text} ${
                          getStatusColor(ticket.status).border
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {ticket.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium">
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                          <UserCheck size={14} />
                          {ticket.assignedTo.firstName} {ticket.assignedTo.lastName || ""}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setActiveTicket(ticket)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                      >
                        Manage & Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Conversation Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-black text-blue-600 dark:text-blue-400">
                  {activeTicket.ticketNumber}
                </span>
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                    getStatusColor(activeTicket.status).bg
                  } ${getStatusColor(activeTicket.status).text} ${
                    getStatusColor(activeTicket.status).border
                  }`}
                >
                  {activeTicket.status}
                </span>
              </div>

              <button
                onClick={() => setActiveTicket(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
              {/* Ticket Summary */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {activeTicket.subject}
                </h2>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {activeTicket.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="font-bold">Company:</span>{" "}
                    {activeTicket.company?.name || "HME Systems"}
                  </div>
                  <div>
                    <span className="font-bold">Created By:</span>{" "}
                    {activeTicket.createdBy?.email || "User"}
                  </div>
                  <div>
                    <span className="font-bold">Priority:</span>{" "}
                    <span className={`rounded px-2 py-0.5 ${PRIORITY_COLORS[activeTicket.priority]}`}>
                      {activeTicket.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Assignment Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Change Ticket Lifecycle Status:
                  </span>
                  <select
                    value={activeTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    disabled={isUpdatingStatus}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {STATUS_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {!activeTicket.assignedTo ? (
                  <button
                    onClick={handleAssignToMe}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-purple-700"
                  >
                    <UserCheck size={14} />
                    Assign Ticket to Me
                  </button>
                ) : (
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
                    Assigned to: {activeTicket.assignedTo.firstName}{" "}
                    {activeTicket.assignedTo.lastName || ""}
                  </div>
                )}
              </div>

              {/* Conversation Thread */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Conversation & Technical Support History
                </h4>

                <div className="space-y-3">
                  {(activeTicket.messages || []).length === 0 ? (
                    <p className="text-xs italic text-slate-400">No message replies yet.</p>
                  ) : (
                    activeTicket.messages?.map((msg) => {
                      const isSupportSender = msg.sender?.email.includes("support");
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col rounded-2xl p-4 text-sm ${
                            isSupportSender
                              ? "ml-8 border border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/40"
                              : "mr-8 border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {msg.sender?.firstName} {msg.sender?.lastName || ""} (
                              {msg.sender?.email})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-2 text-slate-800 dark:text-slate-200 whitespace-pre-line">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Reply Box */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder="Type support response or update message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyMessage.trim()}
                  className="inline-flex h-auto items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
