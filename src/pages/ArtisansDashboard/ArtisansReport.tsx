import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Search,
  Send,
  Settings,
  Wrench,
  X,
} from "lucide-react";

import AppSelect from "../../components/ui/dropdown/AppSelect";

/* ============================================================
   TYPES
   ============================================================ */
type ReportStatus = "Pending Review" | "Acknowledged" | "Resolved";
type IssuePriority = "Low" | "Medium" | "High" | "Critical";
type ReportTarget = "Supervisor" | "Admin";

type AssignedMachine = {
  id: string;
  name: string;
  vehicleNo: string;
  model: string;
};

type ArtisansReport = {
  id: string;
  machineId: string;
  machineName: string;
  vehicleNo: string;
  issueTitle: string;
  priority: IssuePriority;
  status: ReportStatus;
  description: string;
  actionTaken: string;
  sendTo: ReportTarget[];
  createdAt: string;
  images: string[];
  videos: string[];
};

type NewReportInput = {
  machineId: string;
  machineName: string;
  vehicleNo: string;
  issueTitle: string;
  priority: IssuePriority;
  description: string;
  actionTaken: string;
  sendTo: ReportTarget[];
  images: File[];
  videos: File[];
};

const reportSchema = z.object({
  selectedMachineId: z
    .string()
    .trim()
    .min(1, "Please select the related machine."),

  issueTitle: z
    .string()
    .trim()
    .min(1, "Report is required.")
    .max(100, "Report title cannot exceed 100 characters."),

  priority: z.enum(["Low", "Medium", "High", "Critical"]),

  description: z
    .string()
    .trim()
    .min(1, "Issue description is required.")
    .max(500, "Issue description cannot exceed 500 characters."),

  actionTaken: z
    .string()
    .trim()
    .min(1, "Action taken is required.")
    .max(500, "Action taken cannot exceed 500 characters."),

  sendTo: z.array(z.enum(["Supervisor", "Admin"])),

  images: z.array(z.instanceof(File)).max(5, "Maximum 5 images allowed."),
  videos: z.array(z.instanceof(File)).max(2, "Maximum 2 videos allowed."),
});

type FormErrors = Partial<{
  selectedMachineId: string;
  issueTitle: string;
  priority: string;
  description: string;
  actionTaken: string;
  sendTo: string;
  images: string;
  videos: string;
  media: string;
  submit: string;
}>;
/* ============================================================
   MOCK DATA
   ============================================================ */

const ASSIGNED_MACHINES: AssignedMachine[] = [
  {
    id: "MCH-204",
    name: "CAT 797F Dump Truck",
    vehicleNo: "HME-DT-204",
    model: "CAT 797F",
  },
  {
    id: "MCH-118",
    name: "Komatsu PC2000 Excavator",
    vehicleNo: "HME-EX-118",
    model: "Komatsu PC2000",
  },
  {
    id: "MCH-076",
    name: "Volvo A60H Hauler",
    vehicleNo: "HME-HL-076",
    model: "Volvo A60H",
  },
];

const initialReports: ArtisansReport[] = [
  {
    id: "ENG-2041",
    machineId: "MCH-204",
    machineName: "CAT 797F Dump Truck",
    vehicleNo: "HME-DT-204",
    issueTitle: "Rear axle hydraulic seal replaced",
    priority: "Critical",
    status: "Resolved",
    description:
      "Inspected the rear axle hydraulic line reported by the operator. Found a worn seal causing slow oil leakage near the joint.",
    actionTaken:
      "Replaced the damaged hydraulic seal, refilled hydraulic oil to recommended level, and tested the system under load for 30 minutes with no further leakage.",
    sendTo: ["Supervisor", "Admin"],
    createdAt: "22 May 2026, 02:30 PM",
    images: [],
    videos: [],
  },
  {
    id: "ENG-2038",
    machineId: "MCH-118",
    machineName: "Komatsu PC2000 Excavator",
    vehicleNo: "HME-EX-118",
    issueTitle: "Boom vibration diagnosis",
    priority: "High",
    status: "Acknowledged",
    description:
      "Checked the boom assembly for the abnormal vibration reported during full extension. Likely cause is a loosened mounting bolt set.",
    actionTaken:
      "Tightened mounting bolts to specified torque and scheduled a follow-up inspection after the next 50 operating hours to confirm the fix is holding.",
    sendTo: ["Supervisor"],
    createdAt: "21 May 2026, 06:10 PM",
    images: [],
    videos: [],
  },
  {
    id: "ENG-2035",
    machineId: "MCH-076",
    machineName: "Volvo A60H Hauler",
    vehicleNo: "HME-HL-076",
    issueTitle: "Brake response delay – root cause found",
    priority: "Medium",
    status: "Pending Review",
    description:
      "Investigated the delayed brake response reported on slope operation. Brake fluid level was found below minimum and air was present in the line.",
    actionTaken:
      "Bled the brake lines and topped up brake fluid. Recommending a full brake system inspection during the next scheduled maintenance window.",
    sendTo: ["Admin"],
    createdAt: "20 May 2026, 03:45 PM",
    images: [],
    videos: [],
  },
];

/* ============================================================
   SERVICE LAYER
   ============================================================ */

const ArtisansReportService = {
  async getAssignedMachines(): Promise<AssignedMachine[]> {
    // TODO: replace with: return (await fetch("/api/Artisans/assigned-machines")).json();
    await delay(300);
    return ASSIGNED_MACHINES;
  },

  async getReports(): Promise<ArtisansReport[]> {
    // TODO: replace with: return (await fetch("/api/Artisans/reports")).json();
    await delay(300);
    return initialReports;
  },

  async createReport(input: NewReportInput): Promise<ArtisansReport> {
    // TODO: replace with a real multipart/form-data POST to /api/Artisans/reports
    await delay(700);
    return {
      id: `ENG-${Math.floor(2000 + Math.random() * 9000)}`,
      machineId: input.machineId,
      machineName: input.machineName,
      vehicleNo: input.vehicleNo,
      issueTitle: input.issueTitle.trim(),
      priority: input.priority,
      status: "Pending Review",
      description: input.description.trim(),
      actionTaken: input.actionTaken.trim(),
      sendTo: input.sendTo,
      createdAt: new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      images: input.images.map((f) => URL.createObjectURL(f)),
      videos: input.videos.map((f) => URL.createObjectURL(f)),
    };
  },
};

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/* ============================================================
   STYLES
   ============================================================ */

const priorityStyle: Record<IssuePriority, string> = {
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
  Medium:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
  High: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30",
  Critical:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/30",
};

const statusStyle: Record<ReportStatus, string> = {
  "Pending Review":
    "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:ring-orange-500/30",
  Acknowledged:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
  Resolved:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
};

const targetOptions: ReportTarget[] = ["Supervisor", "Admin"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* ============================================================
   COMPONENT
   ============================================================ */

const ArtisansTasks = () => {
  const [machines, setMachines] = useState<AssignedMachine[]>([]);
  const [reports, setReports] = useState<ArtisansReport[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);

  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [issueTitle, setIssueTitle] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("Medium");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [sendTo, setSendTo] = useState<ReportTarget[]>(["Supervisor"]);
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  // const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | "All">(
    "All",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ArtisansReport | null>(
    null,
  );

  const itemsPerPage = 5;

  useEffect(() => {
    let active = true;
    (async () => {
      const [m, r] = await Promise.all([
        ArtisansReportService.getAssignedMachines(),
        ArtisansReportService.getReports(),
      ]);
      if (!active) return;
      setMachines(m);
      setReports(r);
      if (m.length > 0) setSelectedMachineId(m[0].id);
      setLoadingPage(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        search.trim() === "" ||
        r.issueTitle.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.machineName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [reports, search, statusFilter, priorityFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / itemsPerPage),
  );
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const stats = useMemo(
    () => [
      { label: "Total Reports", value: reports.length, icon: ClipboardCheck },
      {
        label: "Pending Review",
        value: reports.filter((r) => r.status === "Pending Review").length,
        icon: AlertTriangle,
      },
      {
        label: "Acknowledged",
        value: reports.filter((r) => r.status === "Acknowledged").length,
        icon: Settings,
      },
      {
        label: "Resolved",
        value: reports.filter((r) => r.status === "Resolved").length,
        icon: CheckCircle2,
      },
    ],
    [reports],
  );

  const toggleSendTo = (target: ReportTarget) => {
    const updated = sendTo.includes(target)
      ? sendTo.filter((t) => t !== target)
      : [...sendTo, target];

    setSendTo(updated);
    updateField("sendTo", updated);
  };

  const updateField = (field: keyof FormErrors, value: unknown) => {
    const updatedData = {
      selectedMachineId,
      issueTitle,
      priority,
      description,
      actionTaken,
      sendTo,
      images,
      videos,
      [field]: value,
    };

    const result = reportSchema.safeParse(updatedData);

    if (result.success) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
      return;
    }

    const issue = result.error.issues.find((err) => err.path[0] === field);

    setFormErrors((prev) => ({
      ...prev,
      [field]: issue?.message || "",
    }));
  };

  const validate = () => {
    const result = reportSchema.safeParse({
      selectedMachineId,
      issueTitle,
      priority,
      description,
      actionTaken,
      sendTo,
      images,
      videos,
    });

    if (!result.success) {
      const nextErrors: FormErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;

        if (!nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      });
      setFormErrors(nextErrors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleFileSelect = (
    files: FileList | null,
    type: "image" | "video",
  ) => {
    if (!files) return;
    const accepted: File[] = [];
    let fileError = "";
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (type === "image" && !isImage) {
        fileError = "Only image files are allowed in this field.";
        return;
      }
      if (type === "video" && !isVideo) {
        fileError = "Only video files are allowed in this field.";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        fileError = `"${file.name}" exceeds the 10MB size limit.`;
        return;
      }
      accepted.push(file);
    });
    setFormErrors((prev) => ({ ...prev, media: fileError }));
    if (type === "image") setImages((prev) => [...prev, ...accepted]);
    else setVideos((prev) => [...prev, ...accepted]);
  };

  const removeFile = (name: string, type: "image" | "video") => {
    if (type === "image")
      setImages((prev) => prev.filter((f) => f.name !== name));
    else setVideos((prev) => prev.filter((f) => f.name !== name));
  };

  const resetForm = () => {
    setIssueTitle("");
    setPriority("Medium");
    setDescription("");
    setActionTaken("");
    setSendTo(["Supervisor"]);
    setImages([]);
    setVideos([]);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const machine = machines.find((m) => m.id === selectedMachineId);
    if (!machine) return;
    setSubmitting(true);
    try {
      const newReport = await ArtisansReportService.createReport({
        machineId: machine.id,
        machineName: machine.name,
        vehicleNo: machine.vehicleNo,
        issueTitle,
        priority,
        description,
        actionTaken,
        sendTo,
        images,
        videos,
      });
      setReports((prev) => [newReport, ...prev]);
      setCurrentPage(1);
      setSuccessMsg(
        `Report ${newReport.id} submitted successfully to ${sendTo.join(", ")}.`,
      );
      resetForm();
    } catch {
      setFormErrors((prev) => ({
        ...prev,
        submit: "Failed to submit report. Please try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_40%)]" />

        {/* Top Right Glow */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[120px]" />

        {/* Bottom Left Glow */}
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-500/25 blur-[110px]" />

        {/* Center Glow */}
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

        {/* Premium Highlight */}
        <div className="absolute right-1/3 top-0 h-48 w-48 rounded-full bg-white/5 blur-[100px]" />

        {/* Glass Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_40%,rgba(255,255,255,0.02)_100%)]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <Wrench size={14} />
              Artisans Maintenance Reporting
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
              Maintenance & Inspection Report
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Submit maintenance and inspection reports for review and record
              keeping.
            </p>
          </div>

          {/* Right Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
            {stats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="
              rounded-2xl
              border
              border-white/15
              bg-white/10
              p-4
              backdrop-blur-md
              transition-all
              duration-300
              hover:bg-white/15
              hover:-translate-y-1
            "
                >
                  <Icon className="h-5 w-5 text-white" />

                  <p className="mt-3 text-2xl font-black text-white">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs font-medium text-blue-100">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.1fr_1fr]">
        {/* REPORT FORM */}
        <form
          onSubmit={handleSubmit}
          className="min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Create New Maintenance Report
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Provide accurate details so supervisors and admin can review
                quickly.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Machine selector */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Related Machine <span className="text-red-500">*</span>
              </label>

              <AppSelect
                value={selectedMachineId}
                onChange={(value) => {
                  setSelectedMachineId(value);
                  updateField("selectedMachineId", value);
                }}
                placeholder="Select Machine"
                options={machines.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.vehicleNo})`,
                }))}
              />

              <div className="mt-1 min-h-[20px]">
                <p className="text-xs font-medium text-red-500">
                  {formErrors.selectedMachineId || ""}
                </p>
              </div>
            </div>

            {/* Report Title */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Report Title <span className="text-red-500">*</span>
              </label>

              <input
                value={issueTitle}
                onChange={(e) => {
                  setIssueTitle(e.target.value);
                  updateField("issueTitle", e.target.value);
                }}
                placeholder="Example: Rear axle hydraulic seal replaced"
                className={`w-full h-11 rounded-[8px] border bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none shadow-sm transition ${
                  formErrors.issueTitle
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
              />

              <div className="mt-1 min-h-[20px]">
                <p className="text-xs font-medium text-red-500">
                  {formErrors.issueTitle || ""}
                </p>
              </div>
            </div>
            {/* Priority + Report To */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Priority
                </label>

                <AppSelect
                  value={priority}
                  onChange={(value) => {
                    setPriority(value as IssuePriority);
                    updateField("priority", value as IssuePriority);
                  }}
                  placeholder="Select Priority"
                  options={[
                    { value: "Low", label: "Low" },
                    { value: "Medium", label: "Medium" },
                    { value: "High", label: "High" },
                    { value: "Critical", label: "Critical" },
                  ]}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Report To <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {targetOptions.map((target) => {
                    const active = sendTo.includes(target);
                    return (
                      <button
                        type="button"
                        key={target}
                        onClick={() => toggleSendTo(target)}
                        className={`rounded-[8px] border px-3 py-2 text-xs font-semibold transition ${
                          active
                            ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                      >
                        {target}
                      </button>
                    );
                  })}
                </div>
                {formErrors.sendTo && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {formErrors.sendTo}
                  </p>
                )}
              </div>
            </div>

            {/* Issue / Observation */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Issue / Observation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  updateField("description", e.target.value);
                }}
                rows={4}
                placeholder="Describe what was found during inspection: symptoms reported, root cause identified, parts affected..."
                className={`w-full resize-none rounded-2xl border bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:ring-4 focus:ring-blue-500/10 ${
                  formErrors.description
                    ? "border-red-300 dark:border-red-500/50 focus:border-red-400"
                    : "border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500"
                }`}
              />
              <div className="mt-1 flex items-center justify-between">
                {formErrors.description ? (
                  <p className="text-xs font-medium text-red-500">
                    {formErrors.description}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {description.trim().length} characters
                </p>
              </div>
            </div>

            {/* Action Taken */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Action Taken / Recommendation{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={actionTaken}
                onChange={(e) => {
                  setActionTaken(e.target.value);
                  updateField("actionTaken", e.target.value);
                }}
                rows={4}
                placeholder="Describe the repair carried out, parts replaced, tests performed, or recommendations for the next maintenance window..."
                className={`w-full resize-none rounded-2xl border bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:ring-4 focus:ring-blue-500/10 ${
                  formErrors.actionTaken
                    ? "border-red-300 dark:border-red-500/50 focus:border-red-400"
                    : "border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500"
                }`}
              />
              <div className="mt-1 flex items-center justify-between">
                {formErrors.actionTaken ? (
                  <p className="text-xs font-medium text-red-500">
                    {formErrors.actionTaken}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {actionTaken.trim().length} characters
                </p>
              </div>
            </div>
          </div>

          {/* Media upload */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="cursor-pointer rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-5 text-center transition hover:bg-blue-50 dark:hover:bg-blue-500/15">
              <Camera className="mx-auto h-7 w-7 text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">
                Upload Images
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                JPG, PNG &middot; up to 10MB each
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files, "image")}
              />
            </label>

            <label className="cursor-pointer rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-5 text-center transition hover:bg-blue-50 dark:hover:bg-blue-500/15">
              <FileVideo className="mx-auto h-7 w-7 text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">
                Upload Videos
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                MP4, MOV &middot; up to 10MB each
              </p>
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files, "video")}
              />
            </label>
          </div>

          {formErrors.media && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {formErrors.media}
            </p>
          )}

          {(images.length > 0 || videos.length > 0) && (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">
                Selected Media ({images.length + videos.length})
              </p>
              <div className="space-y-2">
                {images.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-transparent bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate text-slate-600 dark:text-slate-300">
                      <ImageIcon
                        size={16}
                        className="shrink-0 text-blue-500 dark:text-blue-400"
                      />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(file.name, "image")}
                    >
                      <X
                        size={16}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      />
                    </button>
                  </div>
                ))}
                {videos.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-transparent bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 truncate text-slate-600 dark:text-slate-300">
                      <FileVideo
                        size={16}
                        className="shrink-0 text-blue-500 dark:text-blue-400"
                      />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(file.name, "video")}
                    >
                      <X
                        size={16}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formErrors.submit && (
            <p className="mt-3 text-sm font-medium text-red-500">
              {formErrors.submit}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Report
              </>
            )}
          </button>
        </form>

        {/* HISTORY */}
        <div className="flex min-w-0 flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 p-5">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Report History
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              All maintenance and inspection reports you have submitted.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by report ID, title or machine..."
                  className="w-full rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-[11px] pl-9 pr-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AppSelect
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as ReportStatus | "All");
                    setCurrentPage(1);
                  }}
                  placeholder="All Status"
                  options={[
                    {
                      value: "All",
                      label: "All Status",
                    },
                    {
                      value: "Pending Review",
                      label: "Pending Review",
                    },
                    {
                      value: "Acknowledged",
                      label: "Acknowledged",
                    },
                    {
                      value: "Resolved",
                      label: "Resolved",
                    },
                  ]}
                  className="w-full"
                />

                <AppSelect
                  value={priorityFilter}
                  onChange={(value) => {
                    setPriorityFilter(value as IssuePriority | "All");
                    setCurrentPage(1);
                  }}
                  placeholder="All Priority"
                  options={[
                    {
                      value: "All",
                      label: " Priority",
                    },
                    {
                      value: "Low",
                      label: "Low",
                    },
                    {
                      value: "Medium",
                      label: "Medium",
                    },
                    {
                      value: "High",
                      label: "High",
                    },
                    {
                      value: "Critical",
                      label: "Critical",
                    },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
              <ClipboardCheck
                size={32}
                className="text-slate-300 dark:text-slate-700"
              />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-400">
                No reports found
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs uppercase text-slate-500">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-3">Report</th>
                      <th className="px-4 py-3">Machine</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Sent To</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReports.map((report) => (
                      <tr
                        key={report.id}
                        className="cursor-pointer border-t border-slate-100 dark:border-slate-800 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        onClick={() => setSelectedReport(report)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {report.issueTitle}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {report.id}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {report.machineName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {report.vehicleNo}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${priorityStyle[report.priority]}`}
                          >
                            {report.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyle[report.status]}`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {report.sendTo.join(", ")}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {report.createdAt}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Eye
                            size={16}
                            className="inline text-blue-600 dark:text-blue-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {paginatedReports.length} of {filteredReports.length}{" "}
                  reports
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {selectedReport.id}
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {selectedReport.issueTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${priorityStyle[selectedReport.priority]}`}
              >
                {selectedReport.priority} Priority
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyle[selectedReport.status]}`}
              >
                {selectedReport.status}
              </span>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Machine
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {selectedReport.machineName} ({selectedReport.vehicleNo})
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Issue / Observation
                </p>
                <p className="mt-1 leading-6 text-slate-600 dark:text-slate-400">
                  {selectedReport.description}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Action Taken / Recommendation
                </p>
                <p className="mt-1 leading-6 text-slate-600 dark:text-slate-400">
                  {selectedReport.actionTaken}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Reported To
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {selectedReport.sendTo.join(", ")}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Submitted On
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {selectedReport.createdAt}
                </p>
              </div>
              {(selectedReport.images.length > 0 ||
                selectedReport.videos.length > 0) && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Attachments
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {selectedReport.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt="Issue proof"
                        className="h-20 w-full rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                    ))}
                    {selectedReport.videos.map((src, i) => (
                      <video
                        key={i}
                        src={src}
                        className="h-20 w-full rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        controls
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtisansTasks;
