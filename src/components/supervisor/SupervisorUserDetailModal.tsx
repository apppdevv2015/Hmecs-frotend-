import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Truck,
  MessageSquare,
  ClipboardList,
  ShieldCheck,
  Phone,
  Mail,
  Building2,
  Calendar,
  Send,
  Activity,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Layers,
  Wrench,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export type UserDetailMachine = {
  id?: string;
  name: string;
  code?: string;
  status?: string;
  health?: number;
  location?: string;
  assignedAt?: string;
  supervisorName?: string;
  components?: Array<{ name: string; condition?: number; status?: string }>;
};

export type UserDetailComment = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
};

export type UserDetailData = {
  id?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  shift?: string;
  experience?: string;
  assignedMachines?: UserDetailMachine[];
  workScope?: string;
  comments?: UserDetailComment[];
};

type SupervisorUserDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userDetail: UserDetailData | null;
  onAddComment?: (userIdOrName: string, comment: UserDetailComment) => void;
};

export const SupervisorUserDetailModal: React.FC<SupervisorUserDetailModalProps> = ({
  isOpen,
  onClose,
  userDetail,
  onAddComment,
}) => {
  const [activeTab, setActiveTab] = useState<"profile" | "machines" | "comments" | "workscope">("profile");
  const [comments, setComments] = useState<UserDetailComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  // Load comments for this user
  useEffect(() => {
    if (!userDetail?.name) return;

    setComments(userDetail.comments || []);
  }, [userDetail]);

  if (!isOpen || !userDetail) return null;

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setAddingComment(true);
    const newComment: UserDetailComment = {
      id: `comment_${Date.now()}`,
      author: "Supervisor",
      text: newCommentText.trim(),
      timestamp: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updated = [newComment, ...comments];
    setComments(updated);

    if (onAddComment) {
      onAddComment(userDetail.id || userDetail.name, newComment);
    }

    setNewCommentText("");
    setAddingComment(false);
  };

  const roleTitle = userDetail.role || "Operator";
  const userStatus = userDetail.status || "Active";
  const assignedMachinesList = userDetail.assignedMachines || [];
  const initials = userDetail.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const getHealthBadge = (health = 85) => {
    if (health >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    if (health >= 60) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Modal Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 text-white dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_45%)]" />
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95"
          >
            <X size={18} />
          </button>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 text-2xl font-black text-white shadow-lg backdrop-blur-md">
                {initials}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {userDetail.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-200 backdrop-blur-sm">
                    <CheckCircle2 size={12} />
                    {userStatus}
                  </span>
                </div>

                <p className="mt-0.5 text-xs font-medium text-blue-100/90 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-200" />
                  {roleTitle} • {userDetail.company || "HME Mining Operations"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-blue-100/80">
                  {userDetail.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {userDetail.email}
                    </span>
                  )}
                  {userDetail.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {userDetail.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Shift: {userDetail.shift || "Day Shift (08:00 - 16:00)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 dark:border-slate-800 dark:bg-slate-900/50">
          {[
            { id: "profile", label: "Profile Details", icon: User },
            {
              id: "machines",
              label: `Assigned Machines (${assignedMachinesList.length})`,
              icon: Truck,
            },
            {
              id: "comments",
              label: `Comments & Remarks (${comments.length})`,
              icon: MessageSquare,
            },
            { id: "workscope", label: "Work Scope & Tasks", icon: ClipboardList },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-4 py-3.5 text-xs font-bold transition-all ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: PROFILE DETAILS */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Full Name
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {userDetail.name}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Role & Title
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {roleTitle}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Company / Site
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {userDetail.company || "HME Mining Operations"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Contact Email
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                    {userDetail.email || `${userDetail.name.toLowerCase().replace(/\s+/g, ".")}@hme.com`}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Phone Number
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {userDetail.phone || "+91 98765 43210"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Current Shift
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {userDetail.shift || "Day Shift A (08:00 - 16:00)"}
                  </p>
                </div>
              </div>

              {/* Machine Summary Overview */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-200">
                  <Truck size={16} className="text-blue-600 dark:text-blue-400" />
                  Assigned Heavy Equipment Overview
                </h4>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                  {assignedMachinesList.length > 0
                    ? `Currently assigned to ${assignedMachinesList.length} active machine(s) in field monitoring.`
                    : "No machines currently assigned."}
                </p>

                {assignedMachinesList.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {assignedMachinesList.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-white bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/50 dark:text-blue-400">
                            <Truck size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {m.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              SN: {m.code || `SN-${100 + i}`}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getHealthBadge(
                            m.health
                          )}`}
                        >
                          Health: {m.health || 85}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNED MACHINES & TELEMETRY */}
          {activeTab === "machines" && (
            <div className="space-y-4">
              {assignedMachinesList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No machines assigned to this user.
                </div>
              ) : (
                assignedMachinesList.map((machine, index) => (
                  <div
                    key={machine.id || index}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30">
                          <Truck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                              {machine.name}
                            </h4>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getHealthBadge(
                                machine.health
                              )}`}
                            >
                              {machine.status || "Healthy"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Serial: <span className="font-semibold">{machine.code || `SN-${100 + index}`}</span> • Site: {machine.location || "Site A - Mine Segment 3"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400 font-medium">Machine Health</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white">
                            {machine.health || 85}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Telemetry Components Health */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Activity size={14} className="text-blue-600" />
                          Machine Component Telemetry Health & Live Sensor Metrics
                        </p>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Live Telemetry
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { name: "Engine & Turbocharger", health: Math.min(100, (machine.health || 85) + 5), param: "Temp: 90°C • Oil: 100%" },
                          { name: "Hydraulic Pump Station", health: machine.health || 85, param: "Pressure: 2100bar • Oil: 100%" },
                          { name: "Tyre & Axle System", health: 100, param: "Air: 32PSI • Temp: 45°C" },
                          { name: "Suspension System", health: 100, param: "Oil: 100% • Temp: 60°C" },
                        ].map((c) => (
                          <div key={c.name} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">{c.health}%</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">{c.param}</p>
                            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className={`h-1.5 rounded-full ${
                                  c.health >= 80 ? "bg-emerald-500" : c.health >= 60 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${c.health}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Visual Component Health Telemetry Graph */}
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-indigo-600 dark:text-indigo-400" />
                            Machine Component Telemetry Graph (Health % vs Sensor Thresholds)
                          </p>
                          <span className="text-[10px] text-slate-400 font-semibold">Real-Time Sensor Graph</span>
                        </div>

                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                { name: "Tyre", health: 100, pressure: 32 },
                                { name: "Engine", health: Math.min(100, (machine.health || 85) + 5), pressure: 75 },
                                { name: "Hydraulic", health: machine.health || 85, pressure: 90 },
                                { name: "Suspension", health: 100, pressure: 85 },
                                { name: "Transmission", health: Math.max(50, (machine.health || 85) - 8), pressure: 65 },
                                { name: "Brakes", health: Math.min(100, (machine.health || 85) + 2), pressure: 95 },
                              ]}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                              <Tooltip
                                contentStyle={{
                                  background: "#0f172a",
                                  borderColor: "#334155",
                                  borderRadius: "12px",
                                  color: "#fff",
                                  fontSize: "11px",
                                }}
                              />
                              <Bar dataKey="health" name="Health %" radius={[6, 6, 0, 0]}>
                                {[100, (machine.health || 85) + 5, machine.health || 85, 100, (machine.health || 85) - 8, (machine.health || 85) + 2].map((val, idx) => (
                                  <Cell
                                    key={idx}
                                    fill={val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444"}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: COMMENTS & REMARKS */}
          {activeTab === "comments" && (
            <div className="space-y-6">
              {/* Add Comment Form */}
              <form onSubmit={handleAddCommentSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-blue-600" />
                  Add Supervisor Comment / Remark for {userDetail.name}
                </label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Enter observation, safety remark, task directive or maintenance note..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim() || addingComment}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 active:scale-95"
                  >
                    <Send size={14} />
                    Add Remark
                  </button>
                </div>
              </form>

              {/* Timeline of Comments */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Supervisor Remarks Timeline ({comments.length})
                </h4>

                {comments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No comments recorded for this user.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            SV
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {c.author}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {c.timestamp}
                        </span>
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: WORK SCOPE & TASKS */}
          {activeTab === "workscope" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <ClipboardList size={16} className="text-blue-600" />
                  Assigned Operational Work Scope
                </h4>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  {userDetail.workScope ||
                    `Conduct daily pre-operational equipment inspections, verify hydraulic pressure levels, execute routine haul route transport, and report any abnormal vibration or thermal telemetry alerts immediately to supervisor.`}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Required Safety & Compliance Verification
                </h4>
                <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Pre-Start Safety Inspection Log Submitted
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Machine Emergency Stop Switch Functionality Verified
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Personal Protective Equipment (PPE) Compliance Check Passed
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">
            Supervisor Operations Intelligence System
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorUserDetailModal;
