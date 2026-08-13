import React, { useEffect, useState, useMemo } from "react";
import { CompanyAdminNav } from "../../components/company-admin/CompanyAdminNav";
import {
  jobCardService,
  JobCard,
  JobCardStatus,
  MaintenanceType,
  PriorityLevel,
  ReliabilityMetrics,
} from "../../services/Artisans/jobCardService";
import { machineService } from "../../services/companyadmin/machineService";
import { componentService } from "../../services/companyadmin/componentService";
import {
  auditTrailService,
  AuditLogEntry,
  AudioVoiceNote,
} from "../../services/SuperAdmin/auditTrailService";
import { audioAlertService } from "../../services/audioAlertService";
import { AudioNoteRecorder } from "../../components/company-admin/AudioNoteRecorder";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  User,
  Calendar,
  Layers,
  ChevronRight,
  Play,
  Pause,
  Upload,
  Printer,
  ShieldCheck,
  TrendingUp,
  X,
  Package,
  Activity,
  Check,
  Volume2,
  VolumeX,
  FileClock,
  Mic,
  Radio,
  History,
  Sparkles,
  ArrowRight,
  Shield,
  Volume1,
  MessageSquare,
} from "lucide-react";

export default function JobCardManagement() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"kanban" | "table">("kanban");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [metrics, setMetrics] = useState<ReliabilityMetrics | null>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);

  // Audio Alerts & Audit Stream states
  const [isAudioAlertsOn, setIsAudioAlertsOn] = useState<boolean>(
    audioAlertService.isAudioEnabled()
  );
  const [isGlobalAuditDrawerOpen, setIsGlobalAuditDrawerOpen] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const [globalAuditLogs, setGlobalAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [drawerTab, setDrawerTab] = useState<
    | "overview"
    | "labor"
    | "parts"
    | "findings"
    | "photos"
    | "approvals"
    | "audit"
    | "audio"
  >("overview");

  // Create Form State
  const [newJob, setNewJob] = useState({
    title: "",
    machineId: "",
    componentId: "",
    maintenanceType: "PREVENTIVE" as MaintenanceType,
    priority: "MEDIUM" as PriorityLevel,
    description: "",
    plannedStartDate: "",
    plannedFinishDate: "",
    assignedTechnicianName: "",
    assignedSupervisorName: "",
    assignedPlannerName: "",
    allocatedLaborHours: "2.0",
    requiredTools: "",
  });

  // Dynamic Item Inputs for Selected Job Card
  const [newPart, setNewPart] = useState({
    partName: "",
    partNumber: "",
    quantity: 1,
    unitCost: 0,
  });
  const [newFinding, setNewFinding] = useState({
    parameterName: "",
    measuredValue: "",
    unit: "",
    standardSpec: "",
    status: "PASS" as "PASS" | "FAIL" | "WARNING" | "ATTENTION",
    remarks: "",
  });
  const [newPhoto, setNewPhoto] = useState({
    fileType: "PHOTO_BEFORE" as const,
    fileName: "",
    fileUrl: "",
  });
  const [signOffData, setSignOffData] = useState({
    rootCause: "",
    correctiveAction: "",
    postRepairCondition: "Optimal",
    notes: "",
  });

  // Refresh Audit & Audio summaries
  const refreshAuditAndAudioData = () => {
    setGlobalAuditLogs(auditTrailService.getAllRecentLogs(60));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsRes, metricsRes, machinesRes, compsRes] = await Promise.allSettled([
        jobCardService.getJobCards({ limit: 100 }),
        jobCardService.getReliabilityMetrics(),
        machineService.getMachines(),
        componentService.getComponents
          ? componentService.getComponents()
          : Promise.resolve({ data: [] }),
      ]);

      if (cardsRes.status === "fulfilled" && cardsRes.value?.data?.items) {
        const items = cardsRes.value.data.items;
        setJobCards(items);
        // Seed initial audit trail logs if fresh
        auditTrailService.seedInitialLogsIfEmpty(items);
        refreshAuditAndAudioData();
      }
      if (metricsRes.status === "fulfilled" && metricsRes.value?.data) {
        setMetrics(metricsRes.value.data);
      }
      if (machinesRes.status === "fulfilled") {
        const mList =
          (machinesRes.value as any)?.data ||
          (machinesRes.value as any)?.items ||
          [];
        setMachines(Array.isArray(mList) ? mList : []);
      }
      if (compsRes.status === "fulfilled") {
        const cList =
          (compsRes.value as any)?.data ||
          (compsRes.value as any)?.items ||
          [];
        setComponents(Array.isArray(cList) ? cList : []);
      }
    } catch (err: any) {
      console.error("Failed to load job cards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = auditTrailService.subscribe(() => {
      refreshAuditAndAudioData();
    });
    return () => unsubscribe();
  }, []);

  // Sync with PostgreSQL database tables when job card is opened
  useEffect(() => {
    if (selectedJobCard?.id) {
      auditTrailService.syncJobCardLogsFromDb(selectedJobCard.id);
      auditTrailService.syncVoiceNotesFromDb(selectedJobCard.id);
    }
  }, [selectedJobCard?.id]);

  // Filtered Job Cards

  const filteredCards = useMemo(() => {
    return jobCards.filter((card) => {
      if (statusFilter !== "ALL" && card.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && card.maintenanceType !== typeFilter) return false;
      if (priorityFilter !== "ALL" && card.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = card.jobCardNumber?.toLowerCase() || "";
        const title = card.title?.toLowerCase() || "";
        const machine = card.machine?.name?.toLowerCase() || "";
        const serial = card.machine?.serialNumber?.toLowerCase() || "";
        if (
          !num.includes(q) &&
          !title.includes(q) &&
          !machine.includes(q) &&
          !serial.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [jobCards, statusFilter, typeFilter, priorityFilter, searchQuery]);

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_PARTS: 0,
      WAITING_FOR_APPROVAL: 0,
      COMPLETED: 0,
      CLOSED: 0,
    };
    jobCards.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });
    return counts;
  }, [jobCards]);

  // Toggle master audio alerts
  const handleToggleAudio = () => {
    const newState = audioAlertService.toggleAudio();
    setIsAudioAlertsOn(newState);
    if (newState) {
      showSuccessToast("Real-time audio alerts enabled 🔊");
    } else {
      showSuccessToast("Audio alerts muted 🔇");
    }
  };

  // Test sound chime
  const handleTestAudioChime = () => {
    audioAlertService.playTone("ALERT");
    showSuccessToast("Sound chime tested.");
  };

  // Create Job Card with Audit Log & Audio Chime
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.machineId) {
      showErrorToast("Please enter a job title and select an asset (machine).");
      return;
    }

    try {
      const res = await jobCardService.createJobCard({
        ...newJob,
        allocatedLaborHours: parseFloat(newJob.allocatedLaborHours) || 0,
      });
      const createdCard = res.data;

      // Real-Time Audit Log Entry
      auditTrailService.logAction(createdCard.id, createdCard.jobCardNumber, {
        action: "CREATED",
        title: "Work Order Created & Scheduled",
        description: `New work order registered for machine ID ${newJob.machineId} with priority "${newJob.priority}". Maintenance: ${newJob.maintenanceType}.`,
        newValue: "OPEN",
        badgeColor:
          "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
      });

      // Audio Alert Chime & Voice Speech
      audioAlertService.playTone(
        newJob.priority === "CRITICAL" || newJob.priority === "HIGH"
          ? "ALERT"
          : "SUCCESS"
      );
      audioAlertService.speak(
        `Work order ${createdCard.jobCardNumber} created.`
      );

      showSuccessToast(
        `Job Card ${createdCard.jobCardNumber} created successfully!`
      );
      setIsCreateModalOpen(false);
      setNewJob({
        title: "",
        machineId: "",
        componentId: "",
        maintenanceType: "PREVENTIVE",
        priority: "MEDIUM",
        description: "",
        plannedStartDate: "",
        plannedFinishDate: "",
        assignedTechnicianName: "",
        assignedSupervisorName: "",
        assignedPlannerName: "",
        allocatedLaborHours: "2.0",
        requiredTools: "",
      });
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to create Job Card.");
    }
  };

  // Timer Toggle Action with Audit Log & Audio Tone
  const handleTimerAction = async (
    actionType: "START" | "PAUSE" | "RESUME" | "FINISH"
  ) => {
    if (!selectedJobCard) return;
    try {
      const res = await jobCardService.logLaborTimer(selectedJobCard.id, {
        actionType,
        artisanName:
          selectedJobCard.assignedTechnicianName || "Lead Technician",
        notes: `Timer action: ${actionType}`,
      });
      const updated = res.data;
      setSelectedJobCard(updated);

      // Real-Time Audit Log Entry
      const actionCode =
        actionType === "START"
          ? "TIMER_START"
          : actionType === "PAUSE"
          ? "TIMER_PAUSE"
          : "TIMER_FINISH";

      auditTrailService.logAction(
        selectedJobCard.id,
        selectedJobCard.jobCardNumber,
        {
          action: actionCode,
          title: `Labor Timer ${actionType}`,
          description: `Artisan clocked ${actionType}. Status transition: ${selectedJobCard.status} ➔ ${updated.status}. Actual labor: ${updated.actualLaborHours || "0.0"} hrs.`,
          oldValue: selectedJobCard.status,
          newValue: updated.status,
        }
      );

      // Audio Tone & Speech
      audioAlertService.playTone("TIMER");
      if (actionType === "START") {
        audioAlertService.speak(
          `Work started on ${selectedJobCard.jobCardNumber}`
        );
      }

      showSuccessToast(`Work timer: ${actionType} recorded.`);
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to update timer.");
    }
  };

  // Add Part with Audit Log & Sound
  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCard || !newPart.partName) return;
    try {
      await jobCardService.addPart(selectedJobCard.id, newPart);
      const updated = await jobCardService.getJobCardById(selectedJobCard.id);
      setSelectedJobCard(updated.data);

      // Real-Time Audit Log
      auditTrailService.logAction(
        selectedJobCard.id,
        selectedJobCard.jobCardNumber,
        {
          action: "PART_ADDED",
          title: `Spare Part Allocated: ${newPart.partName}`,
          description: `Allocated ${newPart.quantity} unit(s) of "${newPart.partName}" (PN: ${newPart.partNumber || "N/A"}) at $${newPart.unitCost}/unit.`,
          newValue: `${newPart.quantity}x ${newPart.partName}`,
        }
      );

      audioAlertService.playTone("SUCCESS");
      setNewPart({ partName: "", partNumber: "", quantity: 1, unitCost: 0 });
      showSuccessToast("Spare part recorded.");
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to add part.");
    }
  };

  // Add Finding with Audit Log & Sound
  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCard || !newFinding.parameterName) return;
    try {
      await jobCardService.addInspectionFinding(selectedJobCard.id, newFinding);
      const updated = await jobCardService.getJobCardById(selectedJobCard.id);
      setSelectedJobCard(updated.data);

      // Real-Time Audit Log
      auditTrailService.logAction(
        selectedJobCard.id,
        selectedJobCard.jobCardNumber,
        {
          action: "FINDING_ADDED",
          title: `Inspection Check: ${newFinding.parameterName}`,
          description: `Recorded measurement "${newFinding.measuredValue} ${newFinding.unit || ""}" — Outcome: ${newFinding.status}. Remarks: ${newFinding.remarks || "Within tolerance"}`,
          newValue: newFinding.status,
        }
      );

      audioAlertService.playTone(
        newFinding.status === "FAIL" ? "ALERT" : "STATUS_CHANGE"
      );
      setNewFinding({
        parameterName: "",
        measuredValue: "",
        unit: "",
        standardSpec: "",
        status: "PASS",
        remarks: "",
      });
      showSuccessToast("Inspection finding saved.");
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to record finding.");
    }
  };

  // Add Photo with Audit Log & Sound
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobCard || !newPhoto.fileUrl) return;
    try {
      await jobCardService.addAttachment(selectedJobCard.id, {
        ...newPhoto,
        fileName: newPhoto.fileName || `${newPhoto.fileType}_attachment.jpg`,
      });
      const updated = await jobCardService.getJobCardById(selectedJobCard.id);
      setSelectedJobCard(updated.data);

      // Real-Time Audit Log
      auditTrailService.logAction(
        selectedJobCard.id,
        selectedJobCard.jobCardNumber,
        {
          action: "PHOTO_ATTACHED",
          title: `Photo Evidence Attached: ${newPhoto.fileType.replace(/_/g, " ")}`,
          description: `Attached photographic proof (${newPhoto.fileName || "photo.jpg"}) to maintenance record.`,
          newValue: newPhoto.fileType,
        }
      );

      audioAlertService.playTone("STATUS_CHANGE");
      setNewPhoto({ fileType: "PHOTO_BEFORE", fileName: "", fileUrl: "" });
      showSuccessToast("Photograph attached to job card.");
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to upload photo.");
    }
  };

  // Handle Approvals with Audit Log & Audio Tone
  const handleApprovalAction = async (role: "supervisor" | "engineer") => {
    if (!selectedJobCard) return;
    try {
      const nextStatus = role === "engineer" ? "CLOSED" : "COMPLETED";
      const res = await jobCardService.approveJobCard(selectedJobCard.id, {
        role,
        approvedBy:
          role === "supervisor"
            ? "Supervisor Reviewer"
            : "Engineering Planner",
        notes: signOffData.notes || `${role} review approval completed.`,
        status: nextStatus,
      });
      setSelectedJobCard(res.data);

      // Real-Time Audit Log
      auditTrailService.logAction(
        selectedJobCard.id,
        selectedJobCard.jobCardNumber,
        {
          action:
            role === "supervisor"
              ? "SUPERVISOR_APPROVED"
              : "ENGINEERING_CLOSED",
          title: `${role === "supervisor" ? "Supervisor Verification" : "Engineering Planner Final Sign-Off"} Complete`,
          description: `Dual-tier compliance sign-off approved. Job card marked as ${nextStatus}. Notes: ${signOffData.notes || "Approved based on inspection results."}`,
          oldValue: selectedJobCard.status,
          newValue: nextStatus,
        }
      );

      audioAlertService.playTone("SUCCESS");
      audioAlertService.speak(
        `Job card ${selectedJobCard.jobCardNumber} approved and marked ${nextStatus}.`
      );

      showSuccessToast(`Job Card approved by ${role}!`);
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to submit approval.");
    }
  };

  // Priority Badge Helper
  const renderPriorityBadge = (priority: PriorityLevel) => {
    const styles: Record<string, string> = {
      CRITICAL:
        "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400",
      HIGH: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50 dark:text-amber-400",
      MEDIUM:
        "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/50 dark:text-blue-400",
      LOW: "bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800 dark:text-slate-400",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
          styles[priority] || styles.MEDIUM
        }`}
      >
        {priority}
      </span>
    );
  };

  // Status Badge Helper
  const renderStatusBadge = (status: JobCardStatus) => {
    const styles: Record<string, string> = {
      OPEN: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
      ASSIGNED:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
      IN_PROGRESS:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
      WAITING_FOR_PARTS:
        "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
      WAITING_FOR_APPROVAL:
        "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
      COMPLETED:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      CLOSED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
          styles[status] || "bg-slate-100 text-slate-700"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  // Get audit logs for currently selected job card
  const selectedJobCardLogs = useMemo(() => {
    if (!selectedJobCard) return [];
    const logs = auditTrailService.getLogsForJobCard(selectedJobCard.id);
    if (auditFilter === "ALL") return logs;
    if (auditFilter === "STATUS")
      return logs.filter((l) => l.action === "STATUS_CHANGE" || l.action === "CREATED");
    if (auditFilter === "TIMER")
      return logs.filter((l) => l.action.startsWith("TIMER_"));
    if (auditFilter === "PARTS")
      return logs.filter((l) => l.action === "PART_ADDED");
    if (auditFilter === "AUDIO")
      return logs.filter((l) => l.action === "AUDIO_NOTE_ADDED");
    if (auditFilter === "APPROVALS")
      return logs.filter(
        (l) =>
          l.action === "SUPERVISOR_APPROVED" ||
          l.action === "ENGINEERING_CLOSED"
      );
    return logs;
  }, [selectedJobCard, auditFilter, globalAuditLogs]);

  // Selected job card voice notes count
  const selectedJobCardVoiceNotesCount = useMemo(() => {
    if (!selectedJobCard) return 0;
    return auditTrailService.getVoiceNotesForJobCard(selectedJobCard.id).length;
  }, [selectedJobCard, globalAuditLogs]);

  const kanbanColumns: {
    key: JobCardStatus[];
    title: string;
    color: string;
  }[] = [
    {
      key: ["OPEN", "ASSIGNED"],
      title: "To Do / Assigned",
      color: "border-blue-500",
    },
    {
      key: ["IN_PROGRESS"],
      title: "In Progress (Live)",
      color: "border-amber-500",
    },
    {
      key: ["WAITING_FOR_PARTS"],
      title: "Waiting for Parts",
      color: "border-purple-500",
    },
    {
      key: ["WAITING_FOR_APPROVAL"],
      title: "Review & Sign-Off",
      color: "border-orange-500",
    },
    {
      key: ["COMPLETED", "CLOSED"],
      title: "Completed & Closed",
      color: "border-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Nav */}
      <CompanyAdminNav />

      {/* Header & KPI Summary Banner */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-black shadow-md shadow-blue-600/30">
              <Wrench size={18} />
            </span>
            <h1 className="text-2xl font-black tracking-tight">
              Digital Job Card & Work Order Engine
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time maintenance workflow, live field audio notes, audit history log, and labor tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Audio Alerts Master Button */}
          <button
            onClick={handleToggleAudio}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition shadow-sm ${
              isAudioAlertsOn
                ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
            }`}
            title="Toggle real-time audio chime alerts for state updates and priority changes"
          >
            {isAudioAlertsOn ? (
              <>
                <Volume2 size={16} className="text-purple-600 dark:text-purple-400 animate-pulse" />
                <span>Audio Alerts: ON</span>
              </>
            ) : (
              <>
                <VolumeX size={16} />
                <span>Audio Alerts: MUTED</span>
              </>
            )}
          </button>

          {/* Test Sound Button */}
          <button
            onClick={handleTestAudioChime}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            title="Test alert tone"
          >
            <Radio size={14} className="text-blue-500" />
            <span>Test Sound</span>
          </button>

          {/* Global Audit Trail Live Stream Button */}
          <button
            onClick={() => setIsGlobalAuditDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <History size={16} />
            <span>Live Audit Feed</span>
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Printer size={16} />
            Print Report
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
          >
            <Plus size={16} />
            Create Job Card
          </button>
        </div>
      </div>

      {/* Reliability & Efficiency KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total Work Orders
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {jobCards.length}
          </div>
          <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            All recorded jobs
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            In Progress (Active)
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {statusCounts.IN_PROGRESS}
          </div>
          <div className="mt-1 text-[11px] text-amber-600 font-medium">
            Technicians on site
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Pending Sign-off
          </div>
          <div className="mt-2 text-2xl font-black text-orange-600 dark:text-orange-400">
            {statusCounts.WAITING_FOR_APPROVAL}
          </div>
          <div className="mt-1 text-[11px] text-orange-600 font-medium">
            Needs supervisor/eng
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            MTTR (Avg Repair)
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {metrics?.mttrHours || "2.4"}h
          </div>
          <div className="mt-1 text-[11px] text-indigo-600 font-medium">
            Mean Time to Repair
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Audit Events Logged
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
            {globalAuditLogs.length}
          </div>
          <div className="mt-1 text-[11px] text-purple-600 font-medium">
            Live change events
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            PM Compliance
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics?.pmCompliancePercent || 94}%
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            On-time scheduled PMs
          </div>
        </div>
      </div>

      {/* Filter & View Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search JC #, Asset, Task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_PARTS">Waiting Parts</option>
            <option value="WAITING_FOR_APPROVAL">Waiting Sign-Off</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical (P1)</option>
            <option value="HIGH">High (P2)</option>
            <option value="MEDIUM">Medium (P3)</option>
            <option value="LOW">Low (P4)</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
          <button
            onClick={() => setActiveView("kanban")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeView === "kanban"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <Kanban size={14} />
            Board View
          </button>
          <button
            onClick={() => setActiveView("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeView === "table"
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <List size={14} />
            Table View
          </button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {activeView === "kanban" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
          {kanbanColumns.map((col) => {
            const cardsInCol = filteredCards.filter((c) =>
              col.key.includes(c.status)
            );
            return (
              <div
                key={col.title}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div
                  className={`mb-3 flex items-center justify-between border-b-2 ${col.color} pb-2.5`}
                >
                  <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {col.title}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {cardsInCol.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
                  {cardsInCol.map((card) => {
                    const voiceNotesCount = auditTrailService.getVoiceNotesForJobCard(
                      card.id
                    ).length;
                    const auditCount = auditTrailService.getLogsForJobCard(
                      card.id
                    ).length;

                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          setSelectedJobCard(card);
                          setDrawerTab("overview");
                        }}
                        className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                            {card.jobCardNumber}
                          </span>
                          {renderPriorityBadge(card.priority)}
                        </div>

                        <h3 className="mt-1.5 text-xs font-bold text-slate-800 line-clamp-2 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {card.title}
                        </h3>

                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <Package size={12} />
                          <span className="font-medium truncate">
                            {card.machine?.name || "Asset"}
                          </span>
                          {card.component?.category && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {card.component.category}
                            </span>
                          )}
                        </div>

                        {/* Audit & Voice Indicators */}
                        <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
                          <span
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold"
                            title="Audit trail events"
                          >
                            <History size={11} />
                            {auditCount} logs
                          </span>

                          {voiceNotesCount > 0 && (
                            <span
                              className="flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                              title="Recorded audio notes"
                            >
                              <Mic size={10} />
                              {voiceNotesCount} voice
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <User size={12} />
                            <span className="truncate max-w-[90px]">
                              {card.assignedTechnicianName || "Unassigned"}
                            </span>
                          </div>

                          {card.status === "IN_PROGRESS" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 animate-pulse">
                              <Clock size={11} />
                              {card.actualLaborHours || "0.0"}h
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {cardsInCol.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 dark:border-slate-800">
                      No jobs in stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {activeView === "table" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Job Card #</th>
                  <th className="px-5 py-3.5">Asset / Component</th>
                  <th className="px-5 py-3.5">Maintenance Type</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Assigned Artisan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Audit & Audio</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCards.map((card) => {
                  const voiceNotes = auditTrailService.getVoiceNotesForJobCard(
                    card.id
                  );
                  const auditLogs = auditTrailService.getLogsForJobCard(
                    card.id
                  );

                  return (
                    <tr
                      key={card.id}
                      onClick={() => {
                        setSelectedJobCard(card);
                        setDrawerTab("overview");
                      }}
                      className="cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {card.jobCardNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {card.machine?.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {card.machine?.serialNumber}{" "}
                          {card.component?.category
                            ? `• ${card.component.category}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {card.maintenanceType.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3.5">
                        {renderPriorityBadge(card.priority)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {card.assignedTechnicianName || "Unassigned"}
                      </td>
                      <td className="px-5 py-3.5">
                        {renderStatusBadge(card.status)}
                      </td>

                      {/* Real-time Audit & Voice Column */}
                      <td
                        className="px-5 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedJobCard(card);
                              setDrawerTab("audit");
                            }}
                            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                            title="View audit trail"
                          >
                            <History size={12} />
                            <span>{auditLogs.length} logs</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedJobCard(card);
                              setDrawerTab("audio");
                            }}
                            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                              voiceNotes.length > 0
                                ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                            title="Record or play field voice notes"
                          >
                            <Mic size={12} />
                            <span>
                              {voiceNotes.length > 0
                                ? `${voiceNotes.length} voice`
                                : "+ Voice"}
                            </span>
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button className="rounded-lg p-1 text-slate-400 hover:text-blue-600">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE JOB CARD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Plus size={16} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Schedule New Work Order
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500-Hour Hydraulic Service & Filter Change"
                  value={newJob.title}
                  onChange={(e) =>
                    setNewJob({ ...newJob, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Asset (Machine) *
                  </label>
                  <select
                    required
                    value={newJob.machineId}
                    onChange={(e) =>
                      setNewJob({ ...newJob, machineId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select Asset...</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Component Subsystem (Optional)
                  </label>
                  <select
                    value={newJob.componentId}
                    onChange={(e) =>
                      setNewJob({ ...newJob, componentId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Whole Machine / General</option>
                    {components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category} - {c.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Maintenance Type
                  </label>
                  <select
                    value={newJob.maintenanceType}
                    onChange={(e) =>
                      setNewJob({
                        ...newJob,
                        maintenanceType: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance (PM)</option>
                    <option value="CORRECTIVE">Corrective Maintenance (CM)</option>
                    <option value="BREAKDOWN">Breakdown Maintenance</option>
                    <option value="INSPECTION">Inspection Check</option>
                    <option value="REBUILD">Component Rebuild</option>
                    <option value="COMPONENT_REPLACEMENT">Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newJob.priority}
                    onChange={(e) =>
                      setNewJob({ ...newJob, priority: e.target.value as any })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="LOW">Low (Routine)</option>
                    <option value="MEDIUM">Medium (Standard)</option>
                    <option value="HIGH">High (Urgent)</option>
                    <option value="CRITICAL">Critical (P1 - Stoppage)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Artisan / Tech
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe (Artisan #4)"
                    value={newJob.assignedTechnicianName}
                    onChange={(e) =>
                      setNewJob({
                        ...newJob,
                        assignedTechnicianName: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supervisor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Michael Smith"
                    value={newJob.assignedSupervisorName}
                    onChange={(e) =>
                      setNewJob({
                        ...newJob,
                        assignedSupervisorName: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Allocated Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newJob.allocatedLaborHours}
                    onChange={(e) =>
                      setNewJob({
                        ...newJob,
                        allocatedLaborHours: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scope of Work & Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail step-by-step procedures, safety guidelines, and required tooling..."
                  value={newJob.description}
                  onChange={(e) =>
                    setNewJob({ ...newJob, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
                >
                  Create Work Order →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOB CARD DETAIL DRAWER / MODAL */}
      {selectedJobCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Drawer Top */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400">
                    {selectedJobCard.jobCardNumber}
                  </span>
                  {renderPriorityBadge(selectedJobCard.priority)}
                  {renderStatusBadge(selectedJobCard.status)}
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {selectedJobCard.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedJobCard(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Live Field Execution Bar */}
            <div className="my-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 p-4 text-white shadow-lg">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-blue-200 font-bold">
                  Field Artisan Live Execution
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Clock size={16} className="text-amber-400 animate-spin" />
                  <span className="text-sm font-black">
                    Actual Labor: {selectedJobCard.actualLaborHours || "0.0"} hrs / Est:{" "}
                    {selectedJobCard.allocatedLaborHours || "2.0"} hrs
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedJobCard.status !== "IN_PROGRESS" ? (
                  <button
                    onClick={() => handleTimerAction("START")}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-600"
                  >
                    <Play size={14} /> Start Timer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleTimerAction("PAUSE")}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-600"
                    >
                      <Pause size={14} /> Pause
                    </button>
                    <button
                      onClick={() => handleTimerAction("FINISH")}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-600"
                    >
                      <Check size={14} /> Finish Work
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Tabs including Audit Trail and Voice Notes */}
            <div className="mb-5 flex flex-wrap border-b border-slate-200 text-xs font-bold dark:border-slate-800">
              {[
                { key: "overview", label: "Overview", icon: <FileText size={14} /> },
                {
                  key: "audit",
                  label: `Audit Trail (${selectedJobCardLogs.length})`,
                  icon: <History size={14} className="text-blue-500" />,
                },
                {
                  key: "audio",
                  label: `Voice Notes (${selectedJobCardVoiceNotesCount})`,
                  icon: <Mic size={14} className="text-purple-500" />,
                },
                { key: "labor", label: "Labor Logs", icon: <Clock size={14} /> },
                { key: "parts", label: "Parts Used", icon: <Package size={14} /> },
                { key: "findings", label: "Inspection Data", icon: <Activity size={14} /> },
                { key: "photos", label: "Photos", icon: <Upload size={14} /> },
                { key: "approvals", label: "Sign-Offs", icon: <ShieldCheck size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDrawerTab(tab.key as any)}
                  className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition ${
                    drawerTab === tab.key
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: Real-Time Audit Trail */}
            {drawerTab === "audit" && (
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-blue-50/50 p-4 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <History size={16} className="text-blue-600" />
                      Real-Time Audit Trail & Change Log
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                      Immutable timeline tracking who, when, and how every action was performed on this job card.
                    </p>
                  </div>

                  {/* Filter chips */}
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="rounded-xl border border-blue-200 bg-white p-2 text-xs font-semibold text-slate-700 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="STATUS">Status & Creation</option>
                    <option value="TIMER">Labor Timers</option>
                    <option value="PARTS">Spare Parts</option>
                    <option value="AUDIO">Voice Notes</option>
                    <option value="APPROVALS">Sign-Offs</option>
                  </select>
                </div>

                {/* Audit Timeline */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {selectedJobCardLogs.map((log) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                        <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      </span>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                log.badgeColor ||
                                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {log.action.replace(/_/g, " ")}
                            </span>
                            <h5 className="font-black text-slate-900 dark:text-white">
                              {log.title}
                            </h5>
                          </div>

                          <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> {log.formattedTime}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 leading-relaxed dark:text-slate-300">
                          {log.description}
                        </p>

                        {/* Diff pill if old & new values exist */}
                        {(log.oldValue || log.newValue) && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-[11px] dark:bg-slate-800/60">
                            <span className="font-bold text-slate-400">Value Transition:</span>
                            {log.oldValue && (
                              <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-slate-700 line-through dark:bg-slate-700 dark:text-slate-300">
                                {log.oldValue}
                              </span>
                            )}
                            {log.oldValue && log.newValue && (
                              <ArrowRight size={12} className="text-slate-400" />
                            )}
                            {log.newValue && (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="flex items-center gap-1.5">
                            <User size={12} className="text-blue-500" />
                            <strong className="text-slate-700 dark:text-slate-300">
                              {log.user.name}
                            </strong>{" "}
                            ({log.user.role || "Technician"})
                          </span>

                          <span className="font-mono text-[10px] text-slate-400">
                            {log.user.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedJobCardLogs.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 dark:border-slate-800">
                      No audit log entries matching filter.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Field Voice Notes */}
            {drawerTab === "audio" && (
              <div className="space-y-4">
                <AudioNoteRecorder
                  jobCardId={selectedJobCard.id}
                  jobCardNumber={selectedJobCard.jobCardNumber}
                  onNoteAdded={() => {
                    refreshAuditAndAudioData();
                  }}
                />
              </div>
            )}

            {/* TAB CONTENT: Overview */}
            {drawerTab === "overview" && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div>
                    <span className="text-slate-400">Machine Asset:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedJobCard.machine?.name} ({selectedJobCard.machine?.serialNumber})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Component:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedJobCard.component?.category || "General Subsystem"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Assigned Technician:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedJobCard.assignedTechnicianName || "Unassigned"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Supervisor:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedJobCard.assignedSupervisorName || "Engineering Head"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Work Description
                  </h4>
                  <p className="rounded-xl bg-slate-50 p-3 text-slate-600 leading-relaxed dark:bg-slate-800/40 dark:text-slate-300">
                    {selectedJobCard.description || "No specific instructions provided."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Labor Logs */}
            {drawerTab === "labor" && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-white">
                  Technician Active Sessions
                </h4>
                <div className="space-y-2">
                  {selectedJobCard.laborLogs?.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {log.artisanName || "Artisan"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {log.notes || "Standard maintenance session"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {log.durationMinutes ? `${log.durationMinutes} mins` : "Active Now"}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(log.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!selectedJobCard.laborLogs || selectedJobCard.laborLogs.length === 0) && (
                    <p className="text-slate-400 italic">No labor timer sessions recorded yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Parts & Consumables */}
            {drawerTab === "parts" && (
              <div className="space-y-4 text-xs">
                <form
                  onSubmit={handleAddPart}
                  className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <input
                    type="text"
                    placeholder="Part Name *"
                    required
                    value={newPart.partName}
                    onChange={(e) => setNewPart({ ...newPart, partName: e.target.value })}
                    className="col-span-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newPart.quantity}
                    onChange={(e) =>
                      setNewPart({ ...newPart, quantity: parseInt(e.target.value, 10) || 1 })
                    }
                    className="rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                  >
                    + Add Part
                  </button>
                </form>

                <div className="space-y-2">
                  {selectedJobCard.parts?.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {part.partName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          PN: {part.partNumber || "N/A"}
                        </p>
                      </div>
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        Qty: {part.quantity}
                      </div>
                    </div>
                  ))}
                  {(!selectedJobCard.parts || selectedJobCard.parts.length === 0) && (
                    <p className="text-slate-400 italic">No parts allocated or consumed yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Findings & Measurements */}
            {drawerTab === "findings" && (
              <div className="space-y-4 text-xs">
                <form
                  onSubmit={handleAddFinding}
                  className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <input
                    type="text"
                    placeholder="Parameter (e.g. Oil Pressure)"
                    required
                    value={newFinding.parameterName}
                    onChange={(e) =>
                      setNewFinding({ ...newFinding, parameterName: e.target.value })
                    }
                    className="col-span-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Measured Value (e.g. 4.2 Bar)"
                    required
                    value={newFinding.measuredValue}
                    onChange={(e) =>
                      setNewFinding({ ...newFinding, measuredValue: e.target.value })
                    }
                    className="rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700"
                  >
                    + Save Check
                  </button>
                </form>

                <div className="space-y-2">
                  {selectedJobCard.findings?.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {f.parameterName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Value: {f.measuredValue} {f.unit || ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        {f.status}
                      </span>
                    </div>
                  ))}
                  {(!selectedJobCard.findings || selectedJobCard.findings.length === 0) && (
                    <p className="text-slate-400 italic">No measurement findings logged yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Photographs */}
            {drawerTab === "photos" && (
              <div className="space-y-4 text-xs">
                <form
                  onSubmit={handleAddPhoto}
                  className="flex gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <select
                    value={newPhoto.fileType}
                    onChange={(e) =>
                      setNewPhoto({ ...newPhoto, fileType: e.target.value as any })
                    }
                    className="rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="PHOTO_BEFORE">Photo Before Repair</option>
                    <option value="PHOTO_AFTER">Photo After Repair</option>
                    <option value="MANUAL">Schematic / Manual</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Image URL or File Link"
                    required
                    value={newPhoto.fileUrl}
                    onChange={(e) => setNewPhoto({ ...newPhoto, fileUrl: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 font-bold text-white hover:bg-blue-700"
                  >
                    Attach Photo
                  </button>
                </form>

                <div className="grid grid-cols-2 gap-4">
                  {selectedJobCard.attachments?.map((att) => (
                    <div
                      key={att.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <img
                        src={att.fileUrl}
                        alt="Inspection Attachment"
                        className="h-36 w-full object-cover"
                      />
                      <div className="p-2.5">
                        <span className="font-bold text-[10px] uppercase text-blue-600">
                          {att.fileType}
                        </span>
                        <p className="text-[11px] text-slate-500 truncate">{att.fileName}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedJobCard.attachments || selectedJobCard.attachments.length === 0) && (
                    <p className="col-span-2 text-slate-400 italic">
                      No photographic evidence attached.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Sign-Offs & Approvals */}
            {drawerTab === "approvals" && (
              <div className="space-y-5 text-xs">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <h4 className="font-bold text-amber-900 dark:text-amber-300">
                    Dual-Tier Engineering Verification
                  </h4>
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                    Supervisor sign-off confirms physical work completion. Engineering Planner approval finalizes the asset record into maintenance history.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h5 className="font-black text-slate-800 dark:text-white">
                      Tier 1: Supervisor Sign-Off
                    </h5>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Status:{" "}
                      {selectedJobCard.supervisorApprovedAt
                        ? `Approved on ${new Date(
                            selectedJobCard.supervisorApprovedAt
                          ).toLocaleDateString()}`
                        : "Pending Verification"}
                    </p>
                    <button
                      onClick={() => handleApprovalAction("supervisor")}
                      className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                    >
                      ✓ Supervisor Approve
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <h5 className="font-black text-slate-800 dark:text-white">
                      Tier 2: Engineering Planner Sign-Off
                    </h5>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Status:{" "}
                      {selectedJobCard.engineeringApprovedAt
                        ? `Approved on ${new Date(
                            selectedJobCard.engineeringApprovedAt
                          ).toLocaleDateString()}`
                        : "Pending Sign-Off"}
                    </p>
                    <button
                      onClick={() => handleApprovalAction("engineer")}
                      className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/20"
                    >
                      ✓ Engineering Close & Archive
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBAL LIVE AUDIT STREAM DRAWER */}
      {isGlobalAuditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white font-black">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Live Audit Trail Stream
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </h3>
                  <p className="text-xs text-slate-400">
                    System-wide real-time activity log across all job cards
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGlobalAuditDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stream Event List */}
            <div className="mt-5 space-y-3">
              {globalAuditLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => {
                    const card = jobCards.find((c) => c.id === log.jobCardId);
                    if (card) {
                      setSelectedJobCard(card);
                      setDrawerTab("audit");
                      setIsGlobalAuditDrawerOpen(false);
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                      {log.jobCardNumber}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {log.formattedTime}
                    </span>
                  </div>

                  <h5 className="mt-1 font-bold text-xs text-slate-900 dark:text-white">
                    {log.title}
                  </h5>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {log.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                      <User size={10} /> {log.user.name} ({log.user.role})
                    </span>

                    <span
                      className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider ${
                        log.badgeColor || "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}

              {globalAuditLogs.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">
                  No activity events recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
