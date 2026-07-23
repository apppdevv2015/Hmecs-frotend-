import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  X,
  FileWarning,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ticketService,
  type Ticket,
  type TicketStatus,
  type TicketPriority,
} from "../../services/ticketService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

const STATUS_STAGES: TicketStatus[] = [
  "Open",
  "Assigned",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];

const STATUS_BADGES: Record<TicketStatus, string> = {
  Open: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40",
  Assigned: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/40",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40",
  "Waiting for Customer": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/40",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
  Closed: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Urgent: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold",
};

export default function SupportTicketCenter() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatusQuery = searchParams.get("status") || "all";
  const isAssignedToMe = searchParams.get("assigned") === "me";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(searchParams.get("action") === "new");

  // Create Form State
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
        status: activeStatusQuery !== "all" ? activeStatusQuery : undefined,
        priority: selectedPriority !== "all" ? selectedPriority : undefined,
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
  }, [activeStatusQuery, selectedPriority, isAssignedToMe]);

  const safeTickets = Array.isArray(tickets) ? tickets : [];

  // Filter My Assigned if requested
  const filteredTickets = isAssignedToMe
    ? safeTickets.filter(
        (t) => t?.assignedToId === currentUser?.id || t?.assignedTo?.email === currentUser?.email
      )
    : safeTickets;

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

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              Ticket Control Center
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            {isAssignedToMe ? "My Assigned Tickets" : "Ticket Management Table"}
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Search, filter by status lifecycle, inspect ticket history, and respond.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
          >
            <Plus size={18} />
            Create Ticket
          </button>
        </div>
      </div>

      {/* Sub-menu Tabs for Status Filtering */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        {[
          { label: "All Tickets", value: "all", assigned: false },
          { label: "My Assigned", value: "all", assigned: true },
          { label: "Open", value: "Open", assigned: false },
          { label: "In Progress", value: "In Progress", assigned: false },
          { label: "Waiting", value: "Waiting for Customer", assigned: false },
          { label: "Resolved", value: "Resolved", assigned: false },
          { label: "Closed", value: "Closed", assigned: false },
        ].map((tab) => {
          const isActive =
            tab.assigned
              ? isAssignedToMe
              : !isAssignedToMe && activeStatusQuery === tab.value;

          return (
            <button
              key={tab.label}
              onClick={() => {
                if (tab.assigned) {
                  setSearchParams({ assigned: "me" });
                } else {
                  setSearchParams(tab.value !== "all" ? { status: tab.value } : {});
                }
              }}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, subject, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
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

      {/* Main Ticket Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Ticket #</th>
                <th className="px-6 py-4">Subject</th>
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
                    Loading tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm font-medium text-slate-400">
                    No tickets found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {t.ticketNumber}
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1 dark:text-white">
                        {t.subject}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                        {t.description}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {t.company?.name || "HME Systems"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {t.category || "General"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGES[t.status]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {t.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium">
                      {t.assignedTo ? (
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {t.assignedTo.firstName} {t.assignedTo.lastName || ""}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/support/tickets/${t.id}`)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        View & Manage →
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
                  placeholder="Brief summary of issue..."
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
                  placeholder="Provide full description of problem..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
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
    </div>
  );
}
