import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Cpu,
  ExternalLink,
  Eye,
  History as HistoryIcon,
  ImageMinus,
  ImagePlus,
  ImageUp,
  Link2,
  ListChecks,
  Loader2,
  MapPin,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Send,
  Timer,
  Wrench,
  X,
  XCircle,
} from "lucide-react";

import ImagePreviewModal from "../../components/common/ImagePreviewModal";
import { showErrorToast } from "../../utils/toastUtils";

import {
  jobCardService,
  resolveJobCardFileUrl,
  type InspectionFindingStatus,
  type JobCard,
  type JobCardAttachmentType,
  type JobCardPriority,
  type JobCardStatus,
} from "../../services/Job card/jobCardService";

/* ============================================================================
 * CONFIG
 * ==========================================================================*/

const FETCH_LIMIT = 200;
const HISTORY_PAGE_SIZE = 10;

const WORKABLE_STATUSES: JobCardStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
];

const STATUS_META: Record<JobCardStatus, { label: string; badge: string }> = {
  DRAFT: {
    label: "Draft",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  OPEN: {
    label: "Open",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  ASSIGNED: {
    label: "Assigned",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  IN_PROGRESS: {
    label: "In progress",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
  WAITING_FOR_PARTS: {
    label: "Waiting for parts",
    badge:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  },
  WAITING_FOR_APPROVAL: {
    label: "Awaiting approval",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  COMPLETED: {
    label: "Completed",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  CLOSED: {
    label: "Closed",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300",
  },
};

const PRIORITY_META: Record<
  JobCardPriority,
  { label: string; badge: string; dot: string }
> = {
  LOW: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  MEDIUM: {
    label: "Medium",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  HIGH: {
    label: "High",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  CRITICAL: {
    label: "Critical",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    dot: "bg-red-500",
  },
};

const PRIORITY_RANK: Record<JobCardPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const ATTACHMENT_OPTIONS: { value: JobCardAttachmentType; label: string }[] = [
  { value: "PHOTO_BEFORE", label: "Photo before repair" },
  { value: "PHOTO_AFTER", label: "Photo after repair" },
];

const ATTACHMENT_LABEL: Record<JobCardAttachmentType, string> = {
  PHOTO_BEFORE: "Photo before",
  PHOTO_AFTER: "Photo after",
  MANUAL: "Manual",
  DRAWING: "Drawing",
};

const INPUT_CLS =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-[#101f33] dark:text-white";
const TEXTAREA_CLS =
  "w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-[#101f33] dark:text-white";

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getRunningLog = (jc: JobCard) =>
  jc.laborLogs.find((log) => !log.endTime) ?? null;

const getLoggedMinutes = (jc: JobCard, nowMs: number): number =>
  jc.laborLogs.reduce((sum, log) => {
    if (log.endTime) return sum + (log.durationMinutes ?? 0);
    const started = new Date(log.startTime).getTime();
    return sum + Math.max(0, (nowMs - started) / 60000);
  }, 0);

const formatMinutes = (minutes: number): string => {
  const total = Math.floor(minutes);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
};

const formatClock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (value: unknown): string => toNumber(value).toFixed(2);

const partsCostOf = (jc: JobCard): number =>
  jc.parts.reduce((sum, p) => sum + toNumber(p.totalCost), 0);

const componentLabel = (jc: JobCard): string =>
  jc.component?.description || jc.component?.category || "No component linked";

function useTick(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return now;
}

/* ============================================================================
 * SMALL UI PIECES
 * ==========================================================================*/

function StatusBadge({ status }: { status: JobCardStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: JobCardPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
      <AlertCircle size={13} className="shrink-0" />
      {message}
    </p>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400 dark:border-slate-700">
      {children}
    </p>
  );
}

function PrimaryButton({
  busy,
  disabled,
  children,
  ...rest
}: {
  busy?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      {...rest}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

/* ============================================================================
 * PAGE
 * ==========================================================================*/

export default function ArtisanWorkOrderCapture() {
  const [searchParams] = useSearchParams();
  const preferredId = searchParams.get("jobCard");

  const [cards, setCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(preferredId);
  const [waitingBusy, setWaitingBusy] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadCards = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await jobCardService.getJobCards({ limit: FETCH_LIMIT });
      setCards([...res.data.items]);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load your job cards.",
      );
      if (!silent) setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadCards(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadCards]);

  const refreshCard = useCallback(async (id: string) => {
    try {
      const res = await jobCardService.getJobCardById(id);
      setCards((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not refresh the job card",
      );
    }
  }, []);

  const workable = useMemo(
    () =>
      cards
        .filter((c) => WORKABLE_STATUSES.includes(c.status))
        .sort((a, b) => {
          const runA = getRunningLog(a) ? 0 : 1;
          const runB = getRunningLog(b) ? 0 : 1;
          if (runA !== runB) return runA - runB;
          const inA = a.status === "IN_PROGRESS" ? 0 : 1;
          const inB = b.status === "IN_PROGRESS" ? 0 : 1;
          if (inA !== inB) return inA - inB;
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        }),
    [cards],
  );

  const selected = useMemo(
    () => workable.find((c) => c.id === selectedId) ?? workable[0] ?? null,
    [workable, selectedId],
  );

  const historyCards = useMemo(
    () =>
      cards
        .filter((c) => !WORKABLE_STATUSES.includes(c.status))
        .sort((a, b) =>
          (b.actualFinishDate ?? b.updatedAt).localeCompare(
            a.actualFinishDate ?? a.updatedAt,
          ),
        ),
    [cards],
  );

  const historyView = useMemo(
    () => cards.find((c) => c.id === historyId) ?? null,
    [cards, historyId],
  );

  /** IN_PROGRESS is the only status the backend lets move to WAITING_FOR_APPROVAL/PARTS. */
  const markWaitingForParts = async (jc: JobCard) => {
    setWaitingBusy(true);
    try {
      const fresh = (await jobCardService.getJobCardById(jc.id)).data;
      if (getRunningLog(fresh)) {
        await jobCardService.logLaborTimer(jc.id, { actionType: "PAUSE" });
      }
      await jobCardService.updateJobCardStatus(jc.id, {
        status: "WAITING_FOR_PARTS",
      });
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not update the status",
      );
    } finally {
      await refreshCard(jc.id);
      setWaitingBusy(false);
    }
  };

  const submitReport = async (
    jc: JobCard,
    report: {
      rootCause: string;
      correctiveAction: string;
      postRepairCondition?: number;
      downtimeHours?: number;
    },
  ) => {
    try {
      const fresh = (await jobCardService.getJobCardById(jc.id)).data;
      if (getRunningLog(fresh)) {
        await jobCardService.logLaborTimer(jc.id, { actionType: "FINISH" });
      }
      await jobCardService.updateJobCardStatus(jc.id, {
        status: "WAITING_FOR_APPROVAL",
        ...report,
      });
      await loadCards(true);
      return true;
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not submit the report",
      );
      await refreshCard(jc.id);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] shadow-lg">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <ListChecks size={14} />
                Artisan workspace
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Work capture
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Record what you found, the parts you used and the repair report
                for the job you are working on. Your past jobs are listed below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadCards()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
            <span className="flex items-center gap-2">
              <AlertCircle size={16} />
              {loadError}
            </span>
            <button
              type="button"
              onClick={() => loadCards()}
              className="rounded-lg border border-red-300 px-3 py-1 font-bold hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-950/60"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b1728]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading your job cards...
            </p>
          </div>
        ) : !selected ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0b1728]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <ClipboardList size={26} />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">
              No active job to capture
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              When a supervisor assigns you a job card, it will appear here.
              Start its timer from My tasks and come back to record your work.
            </p>
          </div>
        ) : (
          <>
            <JobBanner
              jc={selected}
              options={workable}
              onSelect={setSelectedId}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <FindingsPanel
                  key={`f-${selected.id}`}
                  jc={selected}
                  onChanged={() => refreshCard(selected.id)}
                />
                <PartsPanel
                  key={`p-${selected.id}`}
                  jc={selected}
                  waitingBusy={waitingBusy}
                  onWaitingForParts={() => markWaitingForParts(selected)}
                  onChanged={() => refreshCard(selected.id)}
                />
                <AttachmentsPanel
                  key={`a-${selected.id}`}
                  jc={selected}
                  onChanged={() => refreshCard(selected.id)}
                  onPreviewImage={setPreviewImage}
                />
              </div>

              <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                <CostPanel jc={selected} />
                <ReportPanel
                  key={`r-${selected.id}`}
                  jc={selected}
                  onSubmit={(report) => submitReport(selected, report)}
                />
              </div>
            </div>
          </>
        )}

        {!loading && (
          <HistoryPanel cards={historyCards} onView={setHistoryId} />
        )}
      </div>

      {historyView && (
        <HistoryModal
          jc={historyView}
          onClose={() => setHistoryId(null)}
          onPreviewImage={setPreviewImage}
        />
      )}

      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * JOB BANNER
 * ==========================================================================*/

function JobBanner({
  jc,
  options,
  onSelect,
}: {
  jc: JobCard;
  options: JobCard[];
  onSelect: (id: string) => void;
}) {
  const running = getRunningLog(jc);
  const now = useTick(!!running);
  const logged = getLoggedMinutes(jc, now);
  const allocated = toNumber(jc.allocatedLaborHours);

  const hint =
    jc.status === "ASSIGNED"
      ? "Start the timer from My tasks to begin the job. You can already record findings and parts."
      : jc.status === "WAITING_FOR_PARTS"
        ? "This job is waiting for parts. Resume the timer from My tasks when the parts arrive."
        : running
          ? "Timer is running. It stops automatically when you submit the report."
          : "Timer is stopped. Resume it from My tasks if you are still working.";

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {jc.jobCardNumber}
            </span>
            <StatusBadge status={jc.status} />
            <PriorityBadge priority={jc.priority} />
          </div>
          <h2 className="text-xl font-black leading-snug text-slate-900 dark:text-white">
            {jc.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Cpu size={13} />
              {jc.machine?.name ?? "Machine"}
              <span className="font-mono font-normal text-slate-400">
                {jc.machine?.serialNumber}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} />
              {jc.machine?.site || "Site not set"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wrench size={13} />
              {componentLabel(jc)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={13} />
              Due {formatDate(jc.plannedFinishDate)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <div
            className={`min-w-[190px] rounded-2xl p-4 ${
              running
                ? "bg-gradient-to-br from-[#3B37E6] to-[#2E2AD9] text-white shadow-lg shadow-blue-600/25"
                : "border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.04]"
            }`}
          >
            <p
              className={`flex items-center gap-1.5 text-[11px] font-bold ${
                running ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Timer size={13} />
              {running ? "Timer running" : "Timer stopped"}
            </p>
            <p
              className={`mt-1 font-mono text-2xl font-black tabular-nums ${
                running ? "text-white" : "text-slate-900 dark:text-white"
              }`}
            >
              {running
                ? formatClock(now - new Date(running.startTime).getTime())
                : formatMinutes(logged)}
            </p>
            <p
              className={`mt-0.5 text-[11px] font-semibold ${
                running ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Total {formatMinutes(logged)}
              {allocated > 0 ? ` of ${allocated}h` : ""}
            </p>
          </div>

          {options.length > 1 && (
            <div className="min-w-[220px]">
              <Label>Switch job card</Label>
              <select
                value={jc.id}
                onChange={(e) => onSelect(e.target.value)}
                className={INPUT_CLS}
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.jobCardNumber} · {o.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * FINDINGS
 * ==========================================================================*/

function FindingsPanel({
  jc,
  onChanged,
}: {
  jc: JobCard;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    parameterName: "",
    measuredValue: "",
    unit: "",
    standardSpec: "",
    status: "PASS" as InspectionFindingStatus,
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findings = useMemo(
    () =>
      [...jc.findings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jc.findings],
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const add = async () => {
    if (!form.parameterName.trim()) {
      setError("Enter what you checked, for example Hydraulic pressure.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await jobCardService.addInspectionFinding(jc.id, {
        parameterName: form.parameterName.trim(),
        status: form.status,
        ...(form.measuredValue.trim()
          ? { measuredValue: form.measuredValue.trim() }
          : {}),
        ...(form.unit.trim() ? { unit: form.unit.trim() } : {}),
        ...(form.standardSpec.trim()
          ? { standardSpec: form.standardSpec.trim() }
          : {}),
        ...(form.remarks.trim() ? { remarks: form.remarks.trim() } : {}),
      });
      await onChanged();
      setForm({
        parameterName: "",
        measuredValue: "",
        unit: "",
        standardSpec: "",
        status: "PASS",
        remarks: "",
      });
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not save the finding",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="What you found"
      subtitle="Record each check you made: what you measured and whether it passed."
      icon={<ListChecks size={18} />}
      right={
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {findings.length}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Label required>Checked item</Label>
          <input
            value={form.parameterName}
            onChange={(e) => set("parameterName", e.target.value)}
            placeholder="e.g. Hydraulic pressure"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Measured value</Label>
          <input
            value={form.measuredValue}
            onChange={(e) => set("measuredValue", e.target.value)}
            placeholder="e.g. 180"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <Label>Unit</Label>
          <input
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="bar"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-3">
          <Label>Standard / spec</Label>
          <input
            value={form.standardSpec}
            onChange={(e) => set("standardSpec", e.target.value)}
            placeholder="e.g. 200–220 bar"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-3">
          <Label>Result</Label>
          <div className="grid h-10 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {(["PASS", "FAIL"] as InspectionFindingStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("status", s)}
                className={`rounded-lg text-xs font-bold transition ${
                  form.status === s
                    ? s === "PASS"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-red-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {s === "PASS" ? "Pass" : "Fail"}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-6">
          <Label>Remarks</Label>
          <input
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Anything worth noting"
            className={INPUT_CLS}
          />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <FormError message={error} />
        <div className="flex justify-end">
          <PrimaryButton busy={saving} onClick={add}>
            {!saving && <Plus size={14} />}
            Add finding
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-5">
        {findings.length === 0 ? (
          <EmptyLine>No findings recorded yet.</EmptyLine>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {findings.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    {f.parameterName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {f.measuredValue
                      ? `Measured ${f.measuredValue}${f.unit ? ` ${f.unit}` : ""}`
                      : "No value recorded"}
                    {f.standardSpec ? ` · Spec ${f.standardSpec}` : ""}
                  </p>
                  {f.remarks && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {f.remarks}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                    f.status === "PASS"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  }`}
                >
                  {f.status === "PASS" ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {f.status === "PASS" ? "Pass" : "Fail"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/* ============================================================================
 * PARTS
 * ==========================================================================*/

function PartsPanel({
  jc,
  waitingBusy,
  onWaitingForParts,
  onChanged,
}: {
  jc: JobCard;
  waitingBusy: boolean;
  onWaitingForParts: () => void;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    partName: "",
    partNumber: "",
    quantity: "1",
    unitCost: "",
    isConsumed: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parts = useMemo(
    () => [...jc.parts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jc.parts],
  );
  const total = partsCostOf(jc);

  const qty = parseInt(form.quantity, 10);
  const unit = form.unitCost.trim() === "" ? 0 : Number(form.unitCost);
  const linePreview = qty > 0 && unit >= 0 ? qty * unit : 0;

  const add = async () => {
    if (!form.partName.trim()) {
      setError("Enter the part name.");
      return;
    }
    if (!(qty > 0)) {
      setError("Quantity must be at least 1.");
      return;
    }
    if (form.unitCost.trim() !== "" && !(unit >= 0)) {
      setError("Unit cost cannot be negative.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await jobCardService.addPart(jc.id, {
        partName: form.partName.trim(),
        quantity: qty,
        isConsumed: form.isConsumed,
        ...(form.partNumber.trim()
          ? { partNumber: form.partNumber.trim() }
          : {}),
        ...(form.unitCost.trim() !== "" ? { unitCost: unit } : {}),
      });
      await onChanged();
      setForm({
        partName: "",
        partNumber: "",
        quantity: "1",
        unitCost: "",
        isConsumed: true,
      });
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not save the part",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Parts used"
      subtitle="Add every part you replaced or consumed, with its cost."
      icon={<PackageSearch size={18} />}
      right={
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {parts.length}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <Label required>Part name</Label>
          <input
            value={form.partName}
            onChange={(e) =>
              setForm((p) => ({ ...p, partName: e.target.value }))
            }
            placeholder="e.g. Hydraulic hose"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-3">
          <Label>Part number</Label>
          <input
            value={form.partNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, partNumber: e.target.value }))
            }
            placeholder="Optional"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <Label required>Quantity</Label>
          <input
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(e) =>
              setForm((p) => ({ ...p, quantity: e.target.value }))
            }
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Unit cost</Label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.unitCost}
            onChange={(e) =>
              setForm((p) => ({ ...p, unitCost: e.target.value }))
            }
            placeholder="0.00"
            className={INPUT_CLS}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Line total</Label>
          <div className="flex h-10 items-center rounded-xl bg-slate-50 px-3 font-mono text-xs font-black tabular-nums text-slate-800 dark:bg-white/[0.04] dark:text-slate-100">
            {linePreview.toFixed(2)}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-6">
          <input
            type="checkbox"
            checked={form.isConsumed}
            onChange={(e) =>
              setForm((p) => ({ ...p, isConsumed: e.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          This part was used up (consumed)
        </label>
      </div>

      <div className="mt-3 space-y-3">
        <FormError message={error} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {jc.status === "IN_PROGRESS" ? (
            <button
              type="button"
              onClick={onWaitingForParts}
              disabled={waitingBusy}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-60 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/20"
            >
              {waitingBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <PackageSearch size={14} />
              )}
              Waiting for parts
            </button>
          ) : (
            <span />
          )}
          <PrimaryButton busy={saving} onClick={add}>
            {!saving && <Plus size={14} />}
            Add part
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-5">
        {parts.length === 0 ? (
          <EmptyLine>No parts recorded yet.</EmptyLine>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Part</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Unit cost</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100">
                        {p.partName}
                      </p>
                      {p.partNumber && (
                        <p className="font-mono text-[10px] text-slate-400">
                          {p.partNumber}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {p.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {money(p.unitCost)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {money(p.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-white/[0.04]">
                  <td
                    colSpan={3}
                    className="px-4 py-2.5 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400"
                  >
                    Parts total
                  </td>
                  <td className="px-4 py-2.5 text-right font-black tabular-nums text-slate-900 dark:text-white">
                    {total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ============================================================================
 * ATTACHMENTS
 * ==========================================================================*/

function AttachmentsPanel({
  jc,
  onChanged,
  onPreviewImage,
}: {
  jc: JobCard;
  onChanged: () => Promise<void>;
  onPreviewImage: (imageUrl: string) => void;
}) {
  const [fileType, setFileType] =
    useState<JobCardAttachmentType>("PHOTO_BEFORE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const attachments = useMemo(
    () =>
      [...jc.attachments].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [jc.attachments],
  );

  const add = async () => {
    if (!selectedFile) {
      setError("Choose a photo or file to upload.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await jobCardService.addAttachment(jc.id, {
        file: selectedFile,
        fileType,
      });
      await onChanged();
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not upload the file",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      await jobCardService.deleteAttachment(jc.id, attachmentId);
      await onChanged();
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not delete the file",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Panel
      title="Photos and files"
      subtitle="Attach before and after photos (JPG, PNG or WEBP, max 10 MB)."
      icon={<Link2 size={18} />}
      right={
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {attachments.length}
        </span>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Type</Label>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
            {ATTACHMENT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setFileType(o.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                  fileType === o.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {o.value === "PHOTO_BEFORE" ? (
                  <ImageMinus size={14} />
                ) : (
                  <ImagePlus size={14} />
                )}
                {o.value === "PHOTO_BEFORE" ? "Before" : "After"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label required>File</Label>
          <label
            htmlFor="attachment-file-input"
            className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/5"
          >
            {selectedFile ? (
              <>
                <ImageUp
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />
                <span className="max-w-full truncate px-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {selectedFile.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(0)} KB · Click to change
                </span>
              </>
            ) : (
              <>
                <ImageUp size={20} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Click to choose a photo
                </span>
                <span className="text-[10px] text-slate-400">
                  JPG, PNG or WEBP · max 10 MB
                </span>
              </>
            )}
          </label>
          <input
            ref={inputRef}
            id="attachment-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <FormError message={error} />
        <div className="flex justify-end">
          <PrimaryButton busy={saving} onClick={add}>
            {!saving && <Plus size={14} />}
            Upload file
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-5">
        {attachments.length === 0 ? (
          <EmptyLine>No files attached yet.</EmptyLine>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800 dark:text-slate-100">
                    {a.fileName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {ATTACHMENT_LABEL[a.fileType] ?? a.fileType} ·{" "}
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onPreviewImage(resolveJobCardFileUrl(a.fileUrl))
                    }
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    disabled={deletingId === a.id}
                    className="text-red-500 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {deletingId === a.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <XCircle size={14} />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

/* ============================================================================
 * COST SUMMARY
 * ==========================================================================*/

function CostPanel({ jc }: { jc: JobCard }) {
  const running = getRunningLog(jc);
  const partsCost = partsCostOf(jc);
  const labour = toNumber(jc.laborCost);
  const rate = toNumber(jc.laborRate);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="bg-gradient-to-br from-[#3B37E6] to-[#2E2AD9] p-5 text-white">
        <p className="text-[11px] font-bold text-blue-100">Cost so far</p>
        <p className="mt-1 font-mono text-3xl font-black tabular-nums">
          {money(jc.totalCost)}
        </p>
      </div>
      <div className="space-y-2 p-5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Parts</span>
          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {partsCost.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            Labour ({toNumber(jc.actualLaborHours)}h saved)
          </span>
          <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {labour.toFixed(2)}
          </span>
        </div>
        {rate === 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            No labour rate is set on this job card, so labour cost stays at 0.
          </p>
        )}
        {running && (
          <p className="text-[11px] text-slate-400">
            Labour updates when the timer stops.
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * REPORT + SUBMIT
 * ==========================================================================*/

function ReportPanel({
  jc,
  onSubmit,
}: {
  jc: JobCard;
  onSubmit: (report: {
    rootCause: string;
    correctiveAction: string;
    postRepairCondition?: number;
    downtimeHours?: number;
  }) => Promise<boolean>;
}) {
  const [rootCause, setRootCause] = useState(jc.rootCause ?? "");
  const [correctiveAction, setCorrectiveAction] = useState(
    jc.correctiveAction ?? "",
  );
  const [condition, setCondition] = useState(jc.postRepairCondition ?? "");
  const [downtime, setDowntime] = useState(
    toNumber(jc.downtimeHours) > 0 ? String(toNumber(jc.downtimeHours)) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = jc.status === "IN_PROGRESS";
  const blockedReason =
    jc.status === "ASSIGNED"
      ? "Start the timer from My tasks before you submit the report."
      : jc.status === "WAITING_FOR_PARTS"
        ? "Resume the timer from My tasks before you submit the report."
        : null;

  const validate = () => {
    if (!rootCause.trim()) return "Describe the root cause.";
    if (!correctiveAction.trim()) return "Describe the corrective action.";
    if (condition !== "") {
      const c = parseInt(condition, 10);
      if (!(c >= 1 && c <= 5)) return "Condition must be between 1 and 5.";
    }
    if (downtime.trim() !== "" && !(Number(downtime) >= 0))
      return "Downtime must be 0 or more.";
    return null;
  };

  const openConfirm = () => {
    const problem = validate();
    setError(problem);
    if (!problem) setConfirmOpen(true);
  };

  const confirm = async () => {
    setSubmitting(true);
    const ok = await onSubmit({
      rootCause: rootCause.trim(),
      correctiveAction: correctiveAction.trim(),
      ...(condition !== ""
        ? { postRepairCondition: parseInt(condition, 10) }
        : {}),
      ...(downtime.trim() !== "" ? { downtimeHours: Number(downtime) } : {}),
    });
    setSubmitting(false);
    if (ok) setConfirmOpen(false);
    else setConfirmOpen(false);
  };

  return (
    <>
      <Panel
        title="Repair report"
        subtitle="Fill this in when the work is finished."
        icon={<Send size={18} />}
      >
        <div className="space-y-3">
          <div>
            <Label required>Root cause</Label>
            <textarea
              rows={3}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Why did the fault happen?"
              className={TEXTAREA_CLS}
            />
          </div>
          <div>
            <Label required>Corrective action</Label>
            <textarea
              rows={3}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="What did you do to fix it?"
              className={TEXTAREA_CLS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Condition after repair</Label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Downtime (hours)</Label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={downtime}
                onChange={(e) => setDowntime(e.target.value)}
                placeholder="0"
                className={INPUT_CLS}
              />
            </div>
          </div>

          <FormError message={error} />
          {blockedReason && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {blockedReason}
            </p>
          )}

          <button
            type="button"
            onClick={openConfirm}
            disabled={!canSubmit}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3B37E6] text-xs font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={14} />
            Submit report
          </button>
        </div>
      </Panel>

      {confirmOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Submit report"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Send size={20} />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              Submit this report?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              The timer for{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {jc.jobCardNumber}
              </span>{" "}
              stops if it is running, and the job card goes to your supervisor
              for approval. You will not be able to add more parts, findings or
              files after this.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                Go back
              </button>
              <PrimaryButton busy={submitting} onClick={confirm}>
                Submit report
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================================
 * HISTORY
 * ==========================================================================*/

function HistoryPanel({
  cards,
  onView,
}: {
  cards: JobCard[];
  onView: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(HISTORY_PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      [c.jobCardNumber, c.title, c.machine?.name, c.machine?.serialNumber].some(
        (v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(q),
      ),
    );
  }, [cards, search]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <HistoryIcon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              My work history
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Jobs you have submitted, with time, parts and cost.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(HISTORY_PAGE_SIZE);
            }}
            placeholder="Search job card or machine"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center text-xs text-slate-400">
          {cards.length === 0
            ? "You have not submitted any job yet."
            : "No jobs match your search."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">Job card</th>
                  <th className="px-5 py-3">Machine</th>
                  <th className="px-5 py-3">Finished</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Time</th>
                  <th className="px-5 py-3 text-right">Parts</th>
                  <th className="px-5 py-3 text-right">Total cost</th>
                  <th className="px-5 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.slice(0, visible).map((c) => (
                  <tr
                    key={c.id}
                    className="transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <td className="max-w-[260px] px-5 py-3">
                      <p className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {c.jobCardNumber}
                      </p>
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                        {c.title}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {c.machine?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatDate(c.actualFinishDate ?? c.updatedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {toNumber(c.actualLaborHours).toFixed(1)}h
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {partsCostOf(c).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-black tabular-nums text-slate-900 dark:text-white">
                      {money(c.totalCost)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onView(c.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs dark:border-slate-800">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Showing {Math.min(visible, filtered.length)} of {filtered.length}
            </span>
            {visible < filtered.length && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + HISTORY_PAGE_SIZE)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.04]"
              >
                Show more
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function HistoryModal({
  jc,
  onClose,
  onPreviewImage,
}: {
  jc: JobCard;
  onClose: () => void;
  onPreviewImage: (imageUrl: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const logs = [...jc.laborLogs].sort((a, b) =>
    b.startTime.localeCompare(a.startTime),
  );
  const findings = [...jc.findings].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-white/[0.04]">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-black tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );

  const Block = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <h4 className="mb-3 text-xs font-extrabold text-slate-500 dark:text-slate-400">
        {title}
      </h4>
      {children}
    </section>
  );

  const Line = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-right font-bold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Job card ${jc.jobCardNumber}`}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]"
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-5">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold text-blue-200">
                {jc.jobCardNumber}
              </p>
              <h2 className="mt-1 text-xl font-black leading-snug text-white">
                {jc.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={jc.status} />
                <PriorityBadge priority={jc.priority} />
                <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                  {jc.machine?.name ?? "Machine"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 [scrollbar-width:thin]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              label="Labour time"
              value={`${toNumber(jc.actualLaborHours).toFixed(1)}h`}
            />
            <Kpi label="Downtime" value={`${toNumber(jc.downtimeHours)}h`} />
            <Kpi label="Parts cost" value={partsCostOf(jc).toFixed(2)} />
            <Kpi label="Total cost" value={money(jc.totalCost)} />
          </div>

          <Block title="Repair report">
            <Line label="Root cause" value={jc.rootCause || "—"} />
            <Line
              label="Corrective action"
              value={jc.correctiveAction || "—"}
            />
            <Line
              label="Condition after repair"
              value={
                jc.postRepairCondition ? `${jc.postRepairCondition} / 5` : "—"
              }
            />
            <Line label="Component" value={componentLabel(jc)} />
            <Line label="Started" value={formatDateTime(jc.actualStartDate)} />
            <Line
              label="Finished"
              value={formatDateTime(jc.actualFinishDate)}
            />
            {jc.supervisorNotes && (
              <Line label="Supervisor notes" value={jc.supervisorNotes} />
            )}
          </Block>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Block title={`Parts (${jc.parts.length})`}>
              {jc.parts.length === 0 ? (
                <p className="text-xs text-slate-400">No parts recorded.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jc.parts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                        {p.partName}
                        <span className="font-normal text-slate-400">
                          {" "}
                          × {p.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-slate-700 dark:text-slate-200">
                        {money(p.totalCost)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>

            <Block title={`Findings (${findings.length})`}>
              {findings.length === 0 ? (
                <p className="text-xs text-slate-400">No findings recorded.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {findings.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                        {f.parameterName}
                        {f.measuredValue && (
                          <span className="font-normal text-slate-400">
                            {" "}
                            · {f.measuredValue}
                            {f.unit ? ` ${f.unit}` : ""}
                          </span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 font-bold ${
                          f.status === "PASS"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {f.status === "PASS" ? "Pass" : "Fail"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </div>

          <Block title={`Time log (${logs.length})`}>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400">No time logged.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatDateTime(log.startTime)}
                      {log.endTime && (
                        <span className="font-normal text-slate-400">
                          {" "}
                          → {formatDateTime(log.endTime)}
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-600 dark:text-slate-300">
                      {log.endTime
                        ? formatMinutes(log.durationMinutes ?? 0)
                        : "Running"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {jc.attachments.length > 0 && (
            <Block title={`Files (${jc.attachments.length})`}>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {jc.attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                      {a.fileName}
                      <span className="font-normal text-slate-400">
                        {" "}
                        · {ATTACHMENT_LABEL[a.fileType] ?? a.fileType}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewImage(resolveJobCardFileUrl(a.fileUrl))
                      }
                      className="inline-flex shrink-0 items-center gap-1 font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-white/[0.06]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
