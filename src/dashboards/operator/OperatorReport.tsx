import { useEffect, useMemo, useRef, useState } from "react";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import { z } from "zod";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Search,
  Send,
  Truck,
  Wrench,
  X,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

type ReportStatus = "Pending Review" | "Assigned to Engineer" | "Resolved";
type IssuePriority = "Low" | "Medium" | "High" | "Critical";
type ReportTarget = "Supervisor" | "Engineer" | "Admin";

type AssignedMachine = {
  id: string;
  name: string;
  vehicleNo: string;
  model: string;
  assignedSince: string;
};

type IssueReport = {
  id: string;
  machineId: string;
  machineName: string;
  vehicleNo: string;
  issueTitle: string;
  priority: IssuePriority;
  status: ReportStatus;
  description: string;
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
  sendTo: ReportTarget[];
  images: File[];
  videos: File[];
};

const reportSchema = z.object({
  issueTitle: z
    .string()
    .trim()
    .min(1, "Issue title is required.")
    .max(100, "Issue title cannot exceed 100 characters."),

  priority: z.enum(["Low", "Medium", "High", "Critical"]),

  description: z
    .string()
    .trim()
    .min(1, "Description  is required.")
    .max(500, "Description cannot exceed 500 characters."),

  sendTo: z
    .array(z.enum(["Supervisor", "Engineer", "Admin"]))
    .min(1, "Select at least one person."),

  images: z.array(z.instanceof(File)).max(5, "Maximum 5 images allowed."),

  videos: z.array(z.instanceof(File)).max(2, "Maximum 2 videos allowed."),
});

type FormErrors = Partial<{
  issueTitle: string;
  priority: string;
  description: string;
  sendTo: string;
  images: string;
  videos: string;
  media: string;
  submit: string;
}>;

/* ============================================================
   MOCK DATA
   ============================================================ */

const ASSIGNED_MACHINE: AssignedMachine = {
  id: "MCH-204",
  name: "CAT 797F Dump Truck",
  vehicleNo: "HME-DT-204",
  model: "CAT 797F",
  assignedSince: "01 Apr 2026",
};

const initialReports: IssueReport[] = [
  {
    id: "RPT-1003",
    machineId: "MCH-204",
    machineName: "CAT 797F Dump Truck",
    vehicleNo: "HME-DT-204",
    issueTitle: "Hydraulic oil leakage near rear axle",
    priority: "Critical",
    status: "Pending Review",
    description:
      "Oil leakage found during pre-shift inspection. Machine should be checked before next loading cycle. Leakage is increasing slowly near the rear axle joint.",
    sendTo: ["Engineer", "Supervisor"],
    createdAt: "22 May 2026, 09:14 AM",
    images: [],
    videos: [],
  },
  {
    id: "RPT-1002",
    machineId: "MCH-204",
    machineName: "CAT 797F Dump Truck",
    vehicleNo: "HME-DT-204",
    issueTitle: "Abnormal vibration during bucket movement",
    priority: "High",
    status: "Assigned to Engineer",
    description:
      "Bucket movement is not smooth and vibration is visible while operating the boom section, especially at full extension.",
    sendTo: ["Engineer"],
    createdAt: "21 May 2026, 04:42 PM",
    images: [],
    videos: [],
  },
  {
    id: "RPT-1001",
    machineId: "MCH-204",
    machineName: "CAT 797F Dump Truck",
    vehicleNo: "HME-DT-204",
    issueTitle: "Brake response delay on slope",
    priority: "Medium",
    status: "Resolved",
    description:
      "Brake response was delayed while moving down a slope. Engineer inspected the brake assembly and marked the machine safe to operate.",
    sendTo: ["Supervisor"],
    createdAt: "20 May 2026, 11:05 AM",
    images: [],
    videos: [],
  },
];

/* ============================================================
   SERVICE LAYER
   ============================================================ */

const reportService = {
  async getAssignedMachine(): Promise<AssignedMachine> {
    await delay(300);
    return ASSIGNED_MACHINE;
  },

  async getReports(): Promise<IssueReport[]> {
    await delay(300);
    return initialReports;
  },

  async createReport(input: NewReportInput): Promise<IssueReport> {
    await delay(700);
    return {
      id: `RPT-${Math.floor(1000 + Math.random() * 9000)}`,
      machineId: input.machineId,
      machineName: input.machineName,
      vehicleNo: input.vehicleNo,
      issueTitle: input.issueTitle.trim(),
      priority: input.priority,
      status: "Pending Review",
      description: input.description.trim(),
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
  "Assigned to Engineer":
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/30",
  Resolved:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30",
};

const targetOptions: ReportTarget[] = ["Supervisor", "Engineer", "Admin"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* ============================================================
   CUSTOM SELECT
   ============================================================ */
type SelectOption<T extends string> = { label: string; value: T };

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none transition hover:border-slate-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-blue-500/30"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 opacity-50 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[160px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`px-3 py-2.5 text-sm cursor-pointer rounded-lg transition-colors ${
                opt.value === value
                  ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-semibold"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              onMouseDown={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   COMPONENT
   ============================================================ */

const OperatorTasks = () => {
  const [machine, setMachine] = useState<AssignedMachine | null>(null);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);

  const [issueTitle, setIssueTitle] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("Medium");
  const [description, setDescription] = useState("");
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
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(
    null,
  );

  const itemsPerPage = 5;

  useEffect(() => {
    let active = true;
    (async () => {
      const [m, r] = await Promise.all([
        reportService.getAssignedMachine(),
        reportService.getReports(),
      ]);
      if (!active) return;
      setMachine(m);
      setReports(r);
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
        r.id.toLowerCase().includes(search.toLowerCase());
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
        label: "Assigned",
        value: reports.filter((r) => r.status === "Assigned to Engineer")
          .length,
        icon: Wrench,
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
    setSendTo((prev) =>
      prev.includes(target)
        ? prev.filter((t) => t !== target)
        : [...prev, target],
    );
  };

  const updateField = (field: keyof FormErrors, value: unknown) => {
    const updatedData = {
      issueTitle,
      priority,
      description,
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
      issueTitle,
      priority,
      description,
      sendTo,
      images,
      videos,
    });

    if (!result.success) {
      const nextErrors: FormErrors = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        nextErrors[field] = issue.message;
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
    setFormErrors((prev) => ({
      ...prev,
      media: fileError,
    }));
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
    setSendTo(["Supervisor"]);
    setImages([]);
    setVideos([]);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const newReport = await reportService.createReport({
        machineId: machine.id,
        machineName: machine.name,
        vehicleNo: machine.vehicleNo,
        issueTitle,
        priority,
        description,
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
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-screen-2xl space-y-5 p-3 sm:p-5 lg:p-6">
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] p-6 shadow-[0_20px_60px_-15px_rgba(59,55,230,0.45)] dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
          {/* Premium Glow Effects */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />

          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[110px]" />

          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/10 blur-[130px]" />

          <div className="absolute right-1/3 top-0 h-40 w-40 rounded-full bg-white/5 blur-[90px]" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Content */}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                <Truck size={13} />
                Operator Machine Reporting
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white">
                Machine Issue Report
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                Report machine issues with detailed descriptions, priority
                levels, photos and videos. Reports are automatically routed to
                supervisors, engineers and administrators for investigation and
                resolution.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:min-w-[480px]">
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

        {/* ── SUCCESS BANNER ─────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={17} className="shrink-0" />
            {successMsg}
          </div>
        )}

        {/* ── MAIN GRID ──────────────────────────────────────────── */}
        <div className="grid gap-5 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* ── FORM ─────────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6"
          >
            {/* Assigned machine card */}
            {machine && (
              <div className="mb-6 flex flex-col gap-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-4 sm:flex-row sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Truck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {machine.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                    Vehicle No: {machine.vehicleNo} &middot; Assigned since{" "}
                    {machine.assignedSince}
                  </p>
                </div>
                <span className="shrink-0 self-start rounded-full border border-blue-500/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400 sm:self-auto">
                  Assigned to you
                </span>
              </div>
            )}

            {/* form header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <ClipboardCheck size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Create New Issue Report
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Provide accurate details to help engineers act quickly.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Is{/* Issue Title */}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Issue Title <span className="text-red-400">*</span>
                </label>

                <input
                  value={issueTitle}
                  onChange={(e) => {
                    setIssueTitle(e.target.value);
                    updateField("issueTitle", e.target.value);
                  }}
                  placeholder="Example: Hydraulic oil leakage near rear axle"
                  className={`w-full rounded-[8px ] border px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:ring-2 ${
                    formErrors.issueTitle
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/40"
                  }`}
                />

                <div className="mt-1 min-h-[20px]">
                  <p className="text-xs font-medium text-red-400">
                    {formErrors.issueTitle || ""}
                  </p>
                </div>
              </div>

              {/* Priority + Report To */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Priority
                  </label>
                  <AppSelect
                    value={priority}
                    onChange={(value) => {
                      setPriority(value as IssuePriority);
                      updateField("priority", value);
                    }}
                    options={[
                      { label: "Low", value: "Low" },
                      { label: "Medium", value: "Medium" },
                      { label: "High", value: "High" },
                      { label: "Critical", value: "Critical" },
                    ]}
                    placeholder="Select Priority"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Report To <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
  {targetOptions.map((target) => {
    const active = sendTo.includes(target);
    return (
      <button
        type="button"
        key={target}
        onClick={() => toggleSendTo(target)}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
          active
            ? "border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/20"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        {target}
      </button>
    );
  })}
</div>
                  {formErrors.sendTo && (
                    <p className="mt-1 text-xs font-medium text-red-400">
                      {formErrors.sendTo}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Issue Description <span className="text-red-400">*</span>
                </label>

                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    updateField("description", e.target.value);
                  }}
                  rows={5}
                  placeholder="Describe the issue clearly: location on machine, sound, vibration, leakage, warning signs, or safety risk..."
                  className={`w-full resize-none rounded-xl border px-4 py-3 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:ring-2 ${
                    formErrors.description
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/40"
                  }`}
                />

                <div className="mt-1 flex items-start justify-between gap-3 min-h-[20px]">
                  <p className="text-xs font-medium text-red-400">
                    {formErrors.description || ""}
                  </p>

                  <p className="shrink-0 text-xs text-slate-500">
                    {description.trim().length}/1000
                  </p>
                </div>
              </div>
            </div>

            {/* Media upload */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 text-center transition hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-800">
                <Camera className="mx-auto h-6 w-6 text-blue-400" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Upload Images
                </p>
                <p className="mt-1 text-xs text-slate-500">
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

              <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 text-center transition hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-800">
                <FileVideo className="mx-auto h-6 w-6 text-blue-400" />
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Upload Videos
                </p>
                <p className="mt-1 text-xs text-slate-500">
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
              <p className="mt-2 text-xs font-medium text-red-400">
                {formErrors.media}
              </p>
            )}

            {/* Selected media list */}
            {(images.length > 0 || videos.length > 0) && (
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Selected Media ({images.length + videos.length})
                </p>
                <div className="space-y-2">
                  {images.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-transparent bg-white dark:bg-slate-900 px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <ImageIcon
                          size={15}
                          className="shrink-0 text-blue-400"
                        />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name, "image")}
                        className="ml-2 shrink-0"
                      >
                        <X
                          size={15}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        />
                      </button>
                    </div>
                  ))}
                  {videos.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-transparent bg-white dark:bg-slate-900 px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <FileVideo
                          size={15}
                          className="shrink-0 text-blue-400"
                        />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name, "video")}
                        className="ml-2 shrink-0"
                      >
                        <X
                          size={15}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formErrors.submit && (
              <p className="mt-3 text-sm font-medium text-red-400">
                {formErrors.submit}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Submit Report
                </>
              )}
            </button>
          </form>

          {/* ── HISTORY ──────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {/* history header + filters */}
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Report History
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                All issue reports you have submitted for this machine.
              </p>

              {/* filters */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                {/* search */}
                <div className="relative w-full min-w-0">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by ID or title..."
                    className="w-full rounded-[8px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                {/* status filter */}
                <AppSelect
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as ReportStatus | "All");
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "All Status", value: "All" },
                    { label: "Pending Review", value: "Pending Review" },
                    { label: "Assigned", value: "Assigned to Engineer" },
                    { label: "Resolved", value: "Resolved" },
                  ]}
                />

                {/* priority filter */}
                <AppSelect
                  value={priorityFilter}
                  onChange={(value) => {
                    setPriorityFilter(value as IssuePriority | "All");
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "All Priority", value: "All" },
                    { label: "Low", value: "Low" },
                    { label: "Medium", value: "Medium" },
                    { label: "High", value: "High" },
                    { label: "Critical", value: "Critical" },
                  ]}
                />
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
                <ClipboardCheck
                  size={30}
                  className="text-slate-400 dark:text-slate-700"
                />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No reports found
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-600">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                {/* table */}
                <div className="w-full overflow-x-auto [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_transparent] dark:[scrollbar-color:theme(colors.slate.700)_transparent]">
                  <table className="min-w-[700px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Issue
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Priority
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sent To
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Date
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          View
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReports.map((report) => (
                        <tr
                          key={report.id}
                          className="cursor-pointer border-t border-slate-200 dark:border-slate-800 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          onClick={() => setSelectedReport(report)}
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold leading-snug text-slate-900 dark:text-white">
                              {report.issueTitle}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {report.id}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${priorityStyle[report.priority]}`}
                            >
                              {report.priority}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle[report.status]}`}
                            >
                              {report.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {report.sendTo.join(", ")}
                          </td>
                          <td className="px-5 py-4 text-sm whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {report.createdAt}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Eye size={15} className="inline text-blue-400" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* pagination */}
                <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Showing {paginatedReports.length} of{" "}
                    {filteredReports.length} reports
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>
                    <span className="text-xs text-slate-500">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── DETAIL MODAL ───────────────────────────────────────────── */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <div
           className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* modal header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-400">
                  {selectedReport.id}
                </p>
                <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 dark:text-white">
                  {selectedReport.issueTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            {/* badges */}
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

            {/* detail rows */}
            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Machine
                </p>
                <p className="mt-1 text-slate-900 dark:text-white">
                  {selectedReport.machineName} ({selectedReport.vehicleNo})
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1 leading-6 text-slate-700 dark:text-slate-300">
                  {selectedReport.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reported To
                  </p>
                  <p className="mt-1 text-slate-900 dark:text-white">
                    {selectedReport.sendTo.join(", ")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Submitted On
                  </p>
                  <p className="mt-1 text-slate-900 dark:text-white">
                    {selectedReport.createdAt}
                  </p>
                </div>
              </div>

              {(selectedReport.images.length > 0 ||
                selectedReport.videos.length > 0) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Attachments
                  </p>
                  <div className="grid grid-cols-3 gap-2">
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

export default OperatorTasks;
