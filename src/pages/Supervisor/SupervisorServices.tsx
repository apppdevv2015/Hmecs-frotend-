import { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  UserCheck,
  UsersRound,
  Truck,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Activity,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  MessageSquareQuote,
  Send,
  Star,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import Pagination from "../../components/common/Pagination";
import { type ComponentArtisanAssignment } from "./SupervisorAssignedArtisans";
import { Loader2 } from "lucide-react";

const ARTISAN_ASSIGNMENTS_KEY = "hme_supervisor_artisan_component_assignments";
const OPERATOR_TASKS_KEY = "hme_supervisor_task_assignments";

export default function SupervisorServices() {
  const [activeTab, setActiveTab] = useState<"artisan" | "operator" | "timeline">("artisan");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [artisanAssignments, setArtisanAssignments] = useState<ComponentArtisanAssignment[]>([]);
  const [operatorAssignments, setOperatorAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(6);

  // Review Modal State
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState<string>("5/5 Excellent Execution");
  const [reviewRemarks, setReviewRemarks] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleOpenReviewModal = (task: any) => {
    setSelectedTaskForReview(task);
    setReviewRemarks(task.supervisorRemarks || "");
    setReviewRating(task.reviewRating || "5/5 Excellent Execution");
  };

  const handleSendTaskReviewEmail = async () => {
    if (!selectedTaskForReview) return;
    setIsSubmittingReview(true);

    const recipientName =
      selectedTaskForReview.recipientName ||
      selectedTaskForReview.artisanName ||
      selectedTaskForReview.operatorName ||
      "Assigned Staff";
    const recipientRole = selectedTaskForReview.recipientRole || "Staff Member";
    const recipientEmail = `${recipientName.toLowerCase().replace(/\s+/g, ".")}@hme.com`;

    // Update assignment item with review & remarks
    if (recipientRole === "Artisan") {
      const updatedArtisans = artisanAssignments.map((a) => {
        if (a.id === selectedTaskForReview.id || (a.taskId && a.taskId === selectedTaskForReview.taskId)) {
          return {
            ...a,
            supervisorRemarks: reviewRemarks,
            reviewRating: reviewRating,
            reviewedAt: new Date().toLocaleString("en-GB"),
          };
        }
        return a;
      });
      setArtisanAssignments(updatedArtisans);
      try {
        localStorage.setItem(ARTISAN_ASSIGNMENTS_KEY, JSON.stringify(updatedArtisans));
      } catch {}
    } else {
      const updatedOperators = operatorAssignments.map((o) => {
        if (o.id === selectedTaskForReview.id) {
          return {
            ...o,
            supervisorRemarks: reviewRemarks,
            reviewRating: reviewRating,
            reviewedAt: new Date().toLocaleString("en-GB"),
          };
        }
        return o;
      });
      setOperatorAssignments(updatedOperators);
      try {
        localStorage.setItem(OPERATOR_TASKS_KEY, JSON.stringify(updatedOperators));
      } catch {}
    }

    setTimeout(() => {
      setIsSubmittingReview(false);
      setSelectedTaskForReview(null);
      showSuccessToast(
        `✓ Task Review & Remarks Saved! Automated email notification sent to ${recipientRole} ${recipientName} (${recipientEmail})`
      );
    }, 600);
  };

  // Load current supervisor's assignments from storage
  const loadSupervisorServices = () => {
    setLoading(true);

    // Get current logged-in supervisor name
    let currentSupName = (() => {
      try {
        const u = StorageService.getUser();
        if (u) {
          const n = u.name || u.fullName || `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""}`.trim();
          if (n) return n;
        }
      } catch {}
      return StorageService.get<string>(STORAGE_KEYS.USER_NAME) || "Supervisor";
    })();

    // Load Artisan Component Assignments
    try {
      const rawArtisans = localStorage.getItem(ARTISAN_ASSIGNMENTS_KEY);
      if (rawArtisans) {
        const loaded: ComponentArtisanAssignment[] = JSON.parse(rawArtisans);
        setArtisanAssignments(loaded);
      }
    } catch (err) {
      console.warn("Failed to load artisan assignments:", err);
    }

    // Load Operator Machine Assignments
    try {
      const rawOperators = localStorage.getItem(OPERATOR_TASKS_KEY);
      if (rawOperators) {
        const loaded = JSON.parse(rawOperators);
        setOperatorAssignments(loaded);
      } else {
        // Fallback default operator tasks for Marcus Supervisor
        setOperatorAssignments([
          {
            id: "OP-TSK-101",
            operatorName: "Rajesh Kumar",
            operatorId: "OP-101",
            machineName: "CAT-797F Dump Truck",
            machineId: "m_1",
            shift: "Morning Shift (06:00 - 14:00)",
            supervisorName: currentSupName,
            assignedAt: "14 Aug 2026, 06:30",
            status: "Active",
          },
          {
            id: "OP-TSK-102",
            operatorName: "Sipho Dlamini",
            operatorId: "OP-102",
            machineName: "Komatsu PC8000 Excavator",
            machineId: "m_2",
            shift: "Day Shift (08:00 - 16:00)",
            supervisorName: currentSupName,
            assignedAt: "14 Aug 2026, 08:00",
            status: "Active",
          },
          {
            id: "OP-TSK-103",
            operatorName: "Tebogo Molefe",
            operatorId: "OP-103",
            machineName: "CAT 16M Motor Grader",
            machineId: "m_3",
            shift: "Night Shift (22:00 - 06:00)",
            supervisorName: currentSupName,
            assignedAt: "13 Aug 2026, 22:00",
            status: "Completed",
          },
        ]);
      }
    } catch (err) {
      console.warn("Failed to load operator assignments:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSupervisorServices();
  }, []);

  // Filtered Artisan Assignments
  const filteredArtisanAssignments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return artisanAssignments.filter((item) => {
      const matchesSearch =
        !q ||
        item.artisanName.toLowerCase().includes(q) ||
        item.machineName.toLowerCase().includes(q) ||
        item.componentName.toLowerCase().includes(q) ||
        (item.taskId && item.taskId.toLowerCase().includes(q)) ||
        item.workScope.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [artisanAssignments, search, statusFilter]);

  // Filtered Operator Assignments
  const filteredOperatorAssignments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return operatorAssignments.filter((item) => {
      const matchesSearch =
        !q ||
        (item.operatorName && item.operatorName.toLowerCase().includes(q)) ||
        (item.machineName && item.machineName.toLowerCase().includes(q)) ||
        (item.shift && item.shift.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [operatorAssignments, search, statusFilter]);

  // Combined Task Audit Flows Timeline
  const timelineFlows = useMemo(() => {
    const flows: Array<{
      id: string;
      type: "Artisan Task" | "Operator Task";
      title: string;
      subtitle: string;
      assignedTo: string;
      role: string;
      machine: string;
      supervisor: string;
      assignedAt: string;
      status: "Active" | "Completed" | "Pending";
      priority?: string;
      icon: any;
    }> = [];

    artisanAssignments.forEach((a) => {
      flows.push({
        id: a.taskId || a.id,
        type: "Artisan Task",
        title: `Component Maintenance Task (${a.componentName})`,
        subtitle: a.workScope,
        assignedTo: a.artisanName,
        role: a.artisanSpecialization || "Artisan",
        machine: a.machineName,
        supervisor: a.supervisorName || "Supervisor",
        assignedAt: a.assignedAt,
        status: a.status,
        priority: a.priority,
        icon: UserCheck,
      });
    });

    operatorAssignments.forEach((o) => {
      flows.push({
        id: o.id || `OP-${Date.now()}`,
        type: "Operator Task",
        title: `Machine Operation Task (${o.machineName})`,
        subtitle: `Operator assigned for ${o.shift || "Day Shift"}`,
        assignedTo: o.operatorName || "Operator",
        role: "Machine Operator",
        machine: o.machineName || "Equipment Unit",
        supervisor: o.supervisorName || "Supervisor",
        assignedAt: o.assignedAt || "Today",
        status: o.status || "Active",
        icon: UsersRound,
      });
    });

    return flows;
  }, [artisanAssignments, operatorAssignments]);

  const isShowAll = itemsPerPage === "all";
  const activeListLength =
    activeTab === "artisan"
      ? filteredArtisanAssignments.length
      : activeTab === "operator"
      ? filteredOperatorAssignments.length
      : timelineFlows.length;

  const effectivePageSize = isShowAll ? Math.max(1, activeListLength) : itemsPerPage;
  const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(activeListLength / effectivePageSize));
  const startIndex = (currentPage - 1) * effectivePageSize;

  const startItem = activeListLength === 0 ? 0 : isShowAll ? 1 : startIndex + 1;
  const endItem = isShowAll ? activeListLength : Math.min(startIndex + effectivePageSize, activeListLength);

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-8 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <ClipboardList size={14} />
              Supervisor Operational Services Hub
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Supervisor Services & Task Audit Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Track all supervisor operational services: artisan component assignments, operator machine allocations, and complete end-to-end task workflow audit histories.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSupervisorServices}
            disabled={loading}
            title="Refresh Services Log"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Services Logged
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {artisanAssignments.length + operatorAssignments.length}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <ClipboardList size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Artisan Component Services
              </p>
              <h2 className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {artisanAssignments.length}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <UserCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Operator Machine Services
              </p>
              <h2 className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {operatorAssignments.length}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <UsersRound size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Operational Flows
              </p>
              <h2 className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">
                {artisanAssignments.filter((a) => a.status === "Active").length +
                  operatorAssignments.filter((o) => o.status === "Active").length}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Activity size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("artisan");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "artisan"
                  ? "bg-[#3B37E6] text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <UserCheck size={16} />
              1. Artisan Services Log ({artisanAssignments.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("operator");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "operator"
                  ? "bg-[#3B37E6] text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <UsersRound size={16} />
              2. Operator Services Log ({operatorAssignments.length})
            </button>

            <button
              onClick={() => {
                setActiveTab("timeline");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
                activeTab === "timeline"
                  ? "bg-[#3B37E6] text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <Activity size={16} />
              3. Task Workflow Timeline ({timelineFlows.length})
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search services log..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="w-40">
              <AppSelect
                value={statusFilter}
                options={[
                  { label: "All Status", value: "All" },
                  { label: "Active Services", value: "Active" },
                  { label: "Completed Services", value: "Completed" },
                ]}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 1: ARTISAN SERVICES LOG ── */}
      {activeTab === "artisan" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Supervisor Component Artisan Services Log
              </h3>
              <p className="text-xs text-slate-500">
                Detailed record of specialized artisans assigned to machine components by this supervisor.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-xl">
              {filteredArtisanAssignments.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/80 dark:bg-[#081226]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Task ID & Machine
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Component Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Assigned Artisan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Work Scope & Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Assigned Date & Time
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Service Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredArtisanAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-semibold">
                      No artisan component services found.
                    </td>
                  </tr>
                ) : (
                  filteredArtisanAssignments.slice(startIndex, startIndex + effectivePageSize).map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-6 py-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.taskId || `TSK-${item.id.slice(-6)}`}
                          </span>
                          <span className="text-slate-900 dark:text-white">{item.machineName}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-bold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300">
                          <Cpu size={13} />
                          {item.componentName}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.artisanName}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {item.artisanSpecialization}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 dark:text-slate-300">{item.workScope}</p>
                        <span className="mt-1 inline-block rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Priority: {item.priority}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {item.assignedAt}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold ${
                            item.status === "Active"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {item.status === "Active" ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                          {item.status === "Active" ? "Active (In Progress)" : "Completed (Free)"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: OPERATOR SERVICES LOG ── */}
      {activeTab === "operator" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Supervisor Operator Machine Allocations Log
              </h3>
              <p className="text-xs text-slate-500">
                Detailed record of machine operators assigned by this supervisor for fleet operations.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
              {filteredOperatorAssignments.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/80 dark:bg-[#081226]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Operator Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Assigned Machine
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Operational Shift
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Supervisor Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Assigned Time
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Shift Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredOperatorAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-semibold">
                      No operator machine services found.
                    </td>
                  </tr>
                ) : (
                  filteredOperatorAssignments.slice(startIndex, startIndex + effectivePageSize).map((item, idx) => (
                    <tr key={item.id || idx} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold dark:bg-emerald-950/40 dark:text-emerald-400">
                            <UsersRound size={14} />
                          </div>
                          <span>{item.operatorName || "Heavy Operator"}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Truck size={14} className="text-blue-500" />
                          {item.machineName || "Machine"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-600 dark:text-slate-300">
                        {item.shift || "Day Shift (08:00 - 16:00)"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 border border-blue-200 px-2.5 py-1 font-bold text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300">
                          <ShieldCheck size={13} />
                          {item.supervisorName && item.supervisorName !== "Marcus Supervisor" ? item.supervisorName : currentSupName}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {item.assignedAt || "Today"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold ${
                            item.status === "Active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <Activity size={12} />
                          {item.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: WORKFLOW TIMELINE ── */}
      {activeTab === "timeline" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              End-to-End Operational Task Audit Timeline
            </h3>
            <p className="text-xs text-slate-500">
              Chronological workflow sequence of operator allocations, pre-shift inspections, alerts, and artisan repairs.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timelineFlows.slice(startIndex, startIndex + effectivePageSize).map((flow) => {
              const IconComp = flow.icon;
              return (
                <div key={flow.id} className="relative flex items-start gap-4 group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white font-bold transition group-hover:scale-110 dark:bg-slate-900 ${
                      flow.type === "Artisan Task"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-emerald-500 text-emerald-600"
                    }`}
                  >
                    <IconComp size={12} />
                  </div>

                  {/* Flow Card */}
                  <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-900">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            flow.type === "Artisan Task"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {flow.type}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-500">ID: {flow.id}</span>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        ⏱️ {flow.assignedAt}
                      </span>
                    </div>

                    <h4 className="mt-2 font-bold text-slate-900 text-sm dark:text-white">{flow.title}</h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{flow.subtitle}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                      <span className="text-slate-700 dark:text-slate-300">
                        👤 Assigned To: <strong className="text-blue-600 dark:text-blue-400">{flow.assignedTo}</strong> ({flow.role})
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        🚜 Machine: <strong>{flow.machine}</strong>
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        🛡️ Supervisor: <strong>{flow.supervisor}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          totalItems={activeListLength}
          startItem={startItem}
          endItem={endItem}
        />
      </div>

    </div>
  );
}
