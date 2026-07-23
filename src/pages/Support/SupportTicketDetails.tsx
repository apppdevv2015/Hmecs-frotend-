import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function SupportTicketDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"reply" | "internal">("reply");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const currentUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};

  const fetchTicketDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await ticketService.getTicket(id);
      setTicket(data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const handleSendReply = async () => {
    if (!ticket || !replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      const prefix = activeTab === "internal" ? "[INTERNAL NOTE]: " : "";
      await ticketService.addMessage(ticket.id, prefix + replyMessage.trim());
      toast.success(activeTab === "internal" ? "Internal note added" : "Reply sent to customer");
      setReplyMessage("");
      fetchTicketDetails();
    } catch (error: any) {
      toast.error(error?.message || "Failed to post message");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    setIsUpdatingStatus(true);
    try {
      await ticketService.updateStatus(ticket.id, newStatus);
      toast.success(`Ticket status updated to ${newStatus}`);
      fetchTicketDetails();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!ticket) return;
    try {
      await ticketService.assignTicket(ticket.id, currentUser.id);
      toast.success("Ticket assigned to you");
      fetchTicketDetails();
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign ticket");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-slate-400">
        Loading ticket details...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-4">
        <p className="text-lg font-bold">Ticket Not Found</p>
        <button
          onClick={() => navigate("/support/tickets")}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
        >
          Back to Tickets
        </button>
      </div>
    );
  }

  const currentStatusIdx = STATUS_STAGES.indexOf(ticket.status);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/support/tickets")}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                {ticket.ticketNumber}
              </span>
              <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${STATUS_BADGES[ticket.status]}`}>
                {ticket.status}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              {ticket.subject}
            </h1>
          </div>
        </div>

        {/* Dropdowns for Quick Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              disabled={isUpdatingStatus}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              {STATUS_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {!ticket.assignedTo ? (
            <button
              onClick={handleAssignToMe}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow transition hover:bg-purple-700"
            >
              <UserCheck size={16} />
              Assign to Me
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300">
              <UserCheck size={14} />
              Assigned: {ticket.assignedTo.firstName} {ticket.assignedTo.lastName || ""}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Lifecycle Stepper */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Ticket Progress Timeline
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_STAGES.map((stage, idx) => {
            const isCompleted = idx <= currentStatusIdx;
            const isCurrent = idx === currentStatusIdx;

            return (
              <div
                key={stage}
                className={`flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                  isCurrent
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : isCompleted
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                      : "border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-bold ${
                    isCurrent
                      ? "text-blue-700 dark:text-blue-300"
                      : isCompleted
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Details + Conversation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Conversation Thread & Reply Box */}
        <div className="col-span-2 space-y-6">
          {/* Conversation History */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Ticket Conversation Thread
              </h3>
              <span className="text-xs text-slate-400">
                {(ticket.messages || []).length} Message(s)
              </span>
            </div>

            {/* Original Problem Description */}
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
              <div className="flex items-center justify-between border-b border-blue-200/50 pb-2 dark:border-blue-900/40">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Original Issue Description
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                {ticket.description}
              </p>
            </div>

            {/* Replies */}
            <div className="mt-6 space-y-4">
              {(ticket.messages || []).map((msg) => {
                const isInternal = msg.message.startsWith("[INTERNAL NOTE]:");
                const isSupportSender = msg.sender?.email.includes("support");

                return (
                  <div
                    key={msg.id}
                    className={`rounded-2xl border p-4 text-sm ${
                      isInternal
                        ? "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/30"
                        : isSupportSender
                          ? "ml-6 border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/30"
                          : "mr-6 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {msg.sender?.firstName} {msg.sender?.lastName || ""} ({msg.sender?.email})
                        </span>
                        {isInternal && (
                          <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                            Internal Note
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-800 dark:text-slate-200 whitespace-pre-line">
                      {msg.message.replace("[INTERNAL NOTE]: ", "")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reply Box */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <button
                onClick={() => setActiveTab("reply")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "reply"
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                Customer Reply
              </button>
              <button
                onClick={() => setActiveTab("internal")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  activeTab === "internal"
                    ? "bg-amber-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                Internal Note (Staff Only)
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <textarea
                rows={4}
                placeholder={
                  activeTab === "internal"
                    ? "Add internal notes visible only to Technical Support staff..."
                    : "Type response to customer..."
                }
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toast.success("Attachment option ready")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <Paperclip size={16} />
                  Attach Files
                </button>

                <button
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyMessage.trim()}
                  className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 ${
                    activeTab === "internal" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <Send size={16} />
                  {activeTab === "internal" ? "Post Internal Note" : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Information Sidebar */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
            <h3 className="text-base font-black text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
              Ticket Information
            </h3>

            <div className="mt-4 space-y-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              <div>
                <span className="block text-slate-400 font-bold uppercase text-[10px]">Company</span>
                <div className="mt-1 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Building2 size={16} className="text-blue-500" />
                  {ticket.company?.name || "HME Systems"}
                </div>
              </div>

              <div>
                <span className="block text-slate-400 font-bold uppercase text-[10px]">Created By</span>
                <div className="mt-1 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <User size={16} className="text-slate-400" />
                  {ticket.createdBy?.firstName} {ticket.createdBy?.lastName || ""} ({ticket.createdBy?.email})
                </div>
              </div>

              <div>
                <span className="block text-slate-400 font-bold uppercase text-[10px]">Category</span>
                <span className="mt-1 inline-block rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {ticket.category || "General"}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 font-bold uppercase text-[10px]">Priority</span>
                <span className={`mt-1 inline-block rounded-md px-2.5 py-1 text-xs font-bold ${PRIORITY_COLORS[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 font-bold uppercase text-[10px]">Created Date</span>
                <div className="mt-1 flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                  <Calendar size={14} className="text-slate-400" />
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
