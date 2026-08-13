import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  ticketService,
  type Ticket,
  type TicketStatus,
  type TicketPriority,
} from "../../services/Support/ticketService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

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

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Urgent: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold",
};

export default function TicketManagementPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Ticket Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const currentUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
  const companyId = StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) || "";

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await ticketService.getTickets({
        status: selectedStatus,
        priority: selectedPriority,
        search: searchTerm,
      });
      setTickets(res.tickets);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedPriority]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Subject and description are required");
      return;
    }

    setIsSubmittingTicket(true);
    try {
      await ticketService.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        companyId,
      });
      toast.success("Support ticket created successfully!");
      setIsCreateModalOpen(false);
      setSubject("");
      setDescription("");
      fetchTickets();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create ticket");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      await ticketService.addMessage(activeTicket.id, replyMessage.trim());
      toast.success("Reply sent");
      setReplyMessage("");
      const updated = await ticketService.getTicket(activeTicket.id);
      setActiveTicket(updated);
      fetchTickets();
    } catch (error: any) {
      toast.error(error?.message || "Failed to send reply");
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Support Tickets Portal
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Submit issues, track ticket resolution status, and communicate directly with Technical Support.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
          >
            <Plus size={18} />
            Create Support Ticket
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, subject, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Customer">Waiting for Customer</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Ticket #</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned Support Agent</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-medium text-slate-400">
                    Loading your tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm font-medium text-slate-400">
                    No support tickets found. Click "Create Support Ticket" to submit one.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="font-bold text-slate-900 line-clamp-1 dark:text-white">
                        {ticket.subject}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                        {ticket.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {ticket.category || "General"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                          STATUS_COLORS[ticket.status]?.bg
                        } ${STATUS_COLORS[ticket.status]?.text} ${STATUS_COLORS[ticket.status]?.border}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {ticket.assignedTo ? (
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {ticket.assignedTo.firstName} {ticket.assignedTo.lastName || ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setActiveTicket(ticket)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        View & Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Create New Support Ticket
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Billing">Billing</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide full details, machine IDs, or error descriptions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details & Reply Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-black text-blue-600 dark:text-blue-400">
                  {activeTicket.ticketNumber}
                </span>
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                    STATUS_COLORS[activeTicket.status]?.bg
                  } ${STATUS_COLORS[activeTicket.status]?.text}`}
                >
                  {activeTicket.status}
                </span>
              </div>
              <button onClick={() => setActiveTicket(null)} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{activeTicket.subject}</h3>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{activeTicket.description}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">Ticket Conversation</h4>
                {activeTicket.messages?.map((msg) => (
                  <div key={msg.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex justify-between border-b pb-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                      <span>{msg.sender?.firstName} ({msg.sender?.email})</span>
                      <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t p-4 dark:border-slate-800">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder="Type a message or response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 rounded-2xl border bg-white p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyMessage.trim()}
                  className="rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
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
