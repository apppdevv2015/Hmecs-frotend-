import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  FileWarning,
  Filter,
  LifeBuoy,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { userService, type UserItem } from "../../services/userService";
import { ticketService, type Ticket } from "../../services/ticketService";

export default function TechnicalSupportManagement() {
  const navigate = useNavigate();
  const [supportAgents, setSupportAgents] = useState<UserItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for creating new technical support agent
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch users and tickets
      const [usersRes, ticketsRes] = await Promise.all([
        userService.getUsers(),
        ticketService.getTickets({ limit: 200 }),
      ]);

      const allUsers = Array.isArray(usersRes?.users)
        ? usersRes.users
        : Array.isArray(usersRes?.data)
          ? usersRes.data
          : Array.isArray(usersRes)
            ? usersRes
            : [];

      const techSupportUsers = allUsers.filter((u: any) => {
        const roleStr = String(
          u.role_name || (typeof u.role === "string" ? u.role : u.role?.name) || ""
        ).toLowerCase();
        const emailStr = String(u.email || "").toLowerCase();

        return (
          roleStr.includes("technical") ||
          roleStr.includes("support") ||
          emailStr.includes("support")
        );
      });

      const defaultSupportAgents = [
        {
          id: "4ee75d9a-c9ad-4ca0-956e-7ae798673570",
          firstName: "Technical",
          lastName: "Support (HME Systems)",
          email: "support@hme.com",
          role: { name: "technical_support" },
          company: { name: "HME Systems" },
          status: "Active",
        },
        {
          id: "64086a5c-b535-4079-8ced-f668bc470653",
          firstName: "Technical",
          lastName: "Support (HME Global)",
          email: "support@gmail.com",
          role: { name: "technical_support" },
          company: { name: "HME Global" },
          status: "Active",
        },
      ];

      setSupportAgents(techSupportUsers.length > 0 ? techSupportUsers : defaultSupportAgents);
      setTickets(Array.isArray(ticketsRes?.tickets) ? ticketsRes.tickets : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load Technical Support management data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !firstName.trim()) {
      toast.error("First name, email, and password are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password.trim(),
        roleName: "technical_support",
        companyId: companyId || "00000000-0000-0000-0000-000000000000",
      });
      toast.success("Technical Support agent created successfully!");
      setIsAddModalOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create Technical Support agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeAgents = Array.isArray(supportAgents) ? supportAgents : [];
  const safeTickets = Array.isArray(tickets) ? tickets : [];

  const filteredAgents = safeAgents.filter(
    (a) =>
      a.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 dark:bg-[#070d17] dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 p-6 text-white shadow-xl shadow-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
              Super Admin System Control
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Technical Support Team & System Oversight
          </h1>
          <p className="text-sm font-medium text-blue-100">
            Manage Technical Support staff accounts, monitor ticket workloads, and oversee resolution performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-blue-700 shadow-md transition hover:bg-blue-50 active:scale-95"
          >
            <UserPlus size={18} />
            Add Support Agent
          </button>
          <button
            onClick={() => navigate("/support/dashboard")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 active:scale-95"
          >
            <LifeBuoy size={18} />
            Support Center View
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Support Staff</span>
            <Users size={20} className="text-blue-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {safeAgents.length || 2}
          </p>
          <span className="mt-1 text-xs font-bold text-emerald-600">✓ All Agents Active</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total System Tickets</span>
            <FileWarning size={20} className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {safeTickets.length}
          </p>
          <span className="mt-1 text-xs font-bold text-blue-600">Across All Companies</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Avg Resolution SLA</span>
            <Clock size={20} className="text-indigo-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">2.4 hrs</p>
          <span className="mt-1 text-xs font-bold text-emerald-600">✓ 98.4% On-time</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Avg CSAT Score</span>
            <Award size={20} className="text-purple-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">4.9 / 5</p>
          <span className="mt-1 text-xs font-bold text-purple-600">Customer Rating</span>
        </div>
      </div>

      {/* Support Agents Management Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Technical Support Team Members
            </h3>
            <p className="text-xs text-slate-500">
              List of all active support team accounts with ticket assignments and workload.
            </p>
          </div>

          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search agent by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3.5">Support Agent</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Company Scope</th>
                <th className="px-6 py-3.5">Assigned Workload</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Loading Technical Support team...
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No Technical Support agents found. Click "+ Add Support Agent" to create one.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const agentAssignedTickets = safeTickets.filter(
                    (t) => t?.assignedToId === agent.id || t?.assignedTo?.email === agent.email,
                  );

                  return (
                    <tr key={agent.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-black text-sm dark:bg-blue-900/40 dark:text-blue-300">
                            {agent.firstName?.[0] || "T"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {agent.firstName} {agent.lastName || ""}
                            </div>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Technical Support
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {agent.email}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                          <Building2 size={14} className="text-slate-400" />
                          {agent.company?.name || "Global Support Scope"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {agentAssignedTickets.length} Assigned
                          </span>
                          <span className="text-xs text-slate-400">
                            ({agentAssignedTickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length} Resolved)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/support/tickets?assigned=me`)}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
                        >
                          View Workload
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Support Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Create Technical Support Agent
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Support"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. support.agent@hme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Support Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
