import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Cpu,
  Eye,
  Loader2,
  MapPin,
  PackageSearch,
  Pause,
  Play,
  RefreshCw,
  Search,
  Square,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";

import { showErrorToast } from "../../utils/toastUtils";
import { machineService } from "../../services/Operator/machineService";
import ImagePreviewModal from "../../components/common/ImagePreviewModal";
import {
  jobCardService,
  resolveJobCardFileUrl,
  type JobCard,
  type JobCardAttachmentType,
  type JobCardPriority,
  type JobCardStatus,
  type LaborTimerAction,
} from "../../services/Job card/jobCardService";

/* ============================================================================
 * CONFIG
 * ==========================================================================*/

const FETCH_LIMIT = 200;

const CARD_HEIGHT = 430;
const GRID_GAP = 16;
const SCROLL_MAX_HEIGHT = CARD_HEIGHT * 2 + GRID_GAP;

const TIMER_STATUSES: JobCardStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
];

type TabKey = "ACTIVE" | "SUBMITTED" | "CLOSED" | "ALL";

const TABS: { key: TabKey; label: string; statuses: JobCardStatus[] | null }[] =
  [
    { key: "ACTIVE", label: "Active", statuses: TIMER_STATUSES },
    {
      key: "SUBMITTED",
      label: "Awaiting approval",
      statuses: ["WAITING_FOR_APPROVAL"],
    },
    { key: "CLOSED", label: "Closed", statuses: ["COMPLETED", "CLOSED"] },
    { key: "ALL", label: "All", statuses: null },
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
  { label: string; badge: string; bar: string; dot: string }
> = {
  LOW: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    bar: "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500",
    dot: "bg-slate-400",
  },
  MEDIUM: {
    label: "Medium",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    bar: "from-amber-300 to-amber-500",
    dot: "bg-amber-500",
  },
  HIGH: {
    label: "High",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    bar: "from-orange-400 to-orange-600",
    dot: "bg-orange-500",
  },
  CRITICAL: {
    label: "Critical",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    bar: "from-red-500 to-rose-600",
    dot: "bg-red-500",
  },
};

const ATTACHMENT_LABEL: Record<JobCardAttachmentType, string> = {
  PHOTO_BEFORE: "Photo before",
  PHOTO_AFTER: "Photo after",
  MANUAL: "Manual",
  DRAWING: "Drawing",
};

const STATUS_RANK: Record<JobCardStatus, number> = {
  IN_PROGRESS: 0,
  ASSIGNED: 1,
  WAITING_FOR_PARTS: 2,
  WAITING_FOR_APPROVAL: 3,
  OPEN: 4,
  DRAFT: 5,
  COMPLETED: 6,
  CLOSED: 7,
  CANCELLED: 8,
};

const PRIORITY_RANK: Record<JobCardPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/* ============================================================================
 * HELPERS
 * ==========================================================================*/

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getRunningLog = (jc: JobCard) =>
  jc.laborLogs.find((log) => !log.endTime) ?? null;

/** Closed logs use the backend's durationMinutes; a running log counts live. */
const getLoggedMinutes = (jc: JobCard, nowMs: number): number =>
  jc.laborLogs.reduce((sum, log) => {
    if (log.endTime) return sum + (log.durationMinutes ?? 0);
    const started = new Date(log.startTime).getTime();
    return sum + Math.max(0, (nowMs - started) / 60000);
  }, 0);

const formatMinutes = (minutes: number): string => {
  const total = Math.floor(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
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

const isOverdue = (jc: JobCard): boolean =>
  TIMER_STATUSES.includes(jc.status) &&
  !!jc.plannedFinishDate &&
  new Date(jc.plannedFinishDate).getTime() < Date.now();

/** Ticks once a second, but only while `enabled`, so idle cards stay static. */
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

/* ---- Machine health (from the machine assignments API, never invented) ---- */

interface MachineHealth {
  healthScore?: number;
  components: any[];
}

const healthTone = (score?: number) => {
  if (score === undefined)
    return {
      label: "No data",
      text: "text-slate-500 dark:text-slate-400",
      stroke: "stroke-slate-300 dark:stroke-slate-600",
    };
  if (score < 40)
    return {
      label: "Critical",
      text: "text-red-600 dark:text-red-400",
      stroke: "stroke-red-500",
    };
  if (score < 70)
    return {
      label: "Warning",
      text: "text-amber-600 dark:text-amber-400",
      stroke: "stroke-amber-500",
    };
  return {
    label: "Healthy",
    text: "text-emerald-600 dark:text-emerald-400",
    stroke: "stroke-emerald-500",
  };
};

const componentLabel = (jc: JobCard): string =>
  jc.component?.description || jc.component?.category || "No component linked";

const findComponentHealth = (
  jc: JobCard,
  health?: MachineHealth,
): number | undefined => {
  if (!health || !jc.componentId) return undefined;
  const match = health.components.find(
    (c: any) => c?.id === jc.componentId || c?.componentId === jc.componentId,
  );
  return typeof match?.healthScore === "number" ? match.healthScore : undefined;
};

/* ============================================================================
 * PAGE
 * ==========================================================================*/

export default function ArtisansTasks() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [healthByMachine, setHealthByMachine] = useState<
    Record<string, MachineHealth>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("ACTIVE");
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Derived from the list so the popup stays live after timer actions.
  const viewing = useMemo(
    () => jobCards.find((j) => j.id === viewingId) ?? null,
    [jobCards, viewingId],
  );
  const ending = useMemo(
    () => jobCards.find((j) => j.id === endingId) ?? null,
    [jobCards, endingId],
  );

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);

    const [cardsRes, healthRes] = await Promise.allSettled([
      jobCardService.getJobCards({ limit: FETCH_LIMIT }),
      machineService.getAssignedMachines(),
    ]);

    if (cardsRes.status === "fulfilled") {
      setJobCards([...cardsRes.value.data.items]);
    } else {
      setLoadError(
        cardsRes.reason instanceof Error
          ? cardsRes.reason.message
          : "Could not load your job cards.",
      );
      if (!silent) setJobCards([]);
    }

    // Health is a nice-to-have: if it fails, cards still work.
    if (healthRes.status === "fulfilled") {
      const raw: any = healthRes.value;
      const list: any[] = Array.isArray(raw)
        ? raw
        : raw?.data || raw?.assignments || [];
      const map: Record<string, MachineHealth> = {};
      list.forEach((item: any) => {
        const id = item?.machineId || item?.id;
        if (!id) return;
        map[id] = {
          healthScore:
            typeof item.healthScore === "number" ? item.healthScore : undefined,
          components: Array.isArray(item.components) ? item.components : [],
        };
      });
      setHealthByMachine(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Pick up changes made elsewhere when the artisan returns to this tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadAll(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadAll]);

  useEffect(() => {
    if (!viewingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !endingId) setViewingId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewingId, endingId]);

  const runTimer = async (jc: JobCard, actionType: LaborTimerAction) => {
    setBusyId(jc.id);
    try {
      const res = await jobCardService.logLaborTimer(jc.id, { actionType });
      // The backend returns the fresh job card, so no full refetch is needed.
      setJobCards((prev) => prev.map((c) => (c.id === jc.id ? res.data : c)));
    } catch (err) {
      showErrorToast(
        err instanceof Error ? err.message : "Could not update the timer",
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmEnd = async () => {
    if (!ending) return;
    const target = ending;
    await runTimer(target, "FINISH");
    setEndingId(null);
  };

  /* ---- derived data ---- */

  const stats = useMemo(
    () => ({
      toStart: jobCards.filter((j) => j.status === "ASSIGNED").length,
      inProgress: jobCards.filter((j) => j.status === "IN_PROGRESS").length,
      waitingParts: jobCards.filter((j) => j.status === "WAITING_FOR_PARTS")
        .length,
      awaitingApproval: jobCards.filter(
        (j) => j.status === "WAITING_FOR_APPROVAL",
      ).length,
      overdue: jobCards.filter(isOverdue).length,
      running: jobCards.filter((j) => !!getRunningLog(j)).length,
    }),
    [jobCards],
  );

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      ACTIVE: 0,
      SUBMITTED: 0,
      CLOSED: 0,
      ALL: jobCards.length,
    };
    TABS.forEach((t) => {
      if (t.statuses)
        counts[t.key] = jobCards.filter((j) =>
          t.statuses!.includes(j.status),
        ).length;
    });
    return counts;
  }, [jobCards]);

  const visibleCards = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab)!;
    const q = search.trim().toLowerCase();

    return jobCards
      .filter(
        (j) => !activeTab.statuses || activeTab.statuses.includes(j.status),
      )
      .filter((j) => {
        if (!q) return true;
        return [
          j.jobCardNumber,
          j.title,
          j.machine?.name,
          j.machine?.serialNumber,
          j.machine?.site,
          j.component?.description,
        ].some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(q),
        );
      })
      .sort((a, b) => {
        const runA = getRunningLog(a) ? 0 : 1;
        const runB = getRunningLog(b) ? 0 : 1;
        if (runA !== runB) return runA - runB;
        if (STATUS_RANK[a.status] !== STATUS_RANK[b.status])
          return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority])
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        const fa = a.plannedFinishDate
          ? new Date(a.plannedFinishDate).getTime()
          : Infinity;
        const fb = b.plannedFinishDate
          ? new Date(b.plannedFinishDate).getTime()
          : Infinity;
        if (fa !== fb) return fa - fb;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [jobCards, tab, search]);

  const urgentUnstarted = useMemo(
    () =>
      jobCards
        .filter((j) => j.priority === "CRITICAL" && j.status === "ASSIGNED")
        .slice(0, 2),
    [jobCards],
  );

  const statCards = [
    {
      label: "Ready to start",
      value: stats.toStart,
      icon: UserCheck,
      tone: "from-blue-500 to-indigo-600",
    },
    {
      label: "In progress",
      value: stats.inProgress,
      icon: Wrench,
      tone: "from-violet-500 to-purple-600",
    },
    {
      label: "Waiting for parts",
      value: stats.waitingParts,
      icon: PackageSearch,
      tone: "from-fuchsia-500 to-pink-600",
    },
    {
      label: "Awaiting approval",
      value: stats.awaitingApproval,
      icon: Clock3,
      tone: "from-amber-400 to-orange-500",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: CalendarClock,
      tone: "from-rose-500 to-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-slate-50 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] shadow-lg">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <ClipboardList size={14} />
                Artisan workspace
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                My tasks
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                Job cards assigned to you. Start the timer when you begin work,
                pause for breaks, and end the session when you are done.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {stats.running > 0 && (
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {stats.running} timer{stats.running > 1 ? "s" : ""} running
                </span>
              )}
              <button
                type="button"
                onClick={() => loadAll()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${tone}`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black leading-none tabular-nums text-slate-900 dark:text-white">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : (
                    value
                  )}
                </p>
                <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
            <span className="flex items-center gap-2">
              <AlertCircle size={16} />
              {loadError}
            </span>
            <button
              type="button"
              onClick={() => loadAll()}
              className="rounded-lg border border-red-300 px-3 py-1 font-bold hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-950/60"
            >
              Try again
            </button>
          </div>
        )}

        {/* Critical jobs not yet started */}
        {urgentUnstarted.map((jc) => (
          <div
            key={jc.id}
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4 dark:border-red-500/30 dark:from-red-500/10 dark:to-orange-500/5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-red-800 dark:text-red-200">
                  Critical job not started
                </p>
                <p className="text-xs font-medium text-red-700/90 dark:text-red-300/90">
                  {jc.jobCardNumber} · {jc.machine?.name ?? "Machine"} —{" "}
                  {jc.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busyId === jc.id}
              onClick={() => runTimer(jc, "START")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition hover:bg-red-700 disabled:opacity-60 sm:shrink-0"
            >
              {busyId === jc.id ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Play size={15} />
              )}
              Start work
            </button>
          </div>
        ))}

        {/* List */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="tablist"
              className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900"
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    tab === t.key
                      ? "bg-white text-slate-900 shadow-sm dark:bg-[#12243b] dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                      tab === t.key
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                        : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                    }`}
                  >
                    {tabCounts[t.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search job card, machine or site"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading your job cards...
              </p>
            </div>
          ) : visibleCards.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-white/[0.03]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
                <ClipboardList size={26} />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">
                {jobCards.length === 0
                  ? "No job cards assigned to you yet"
                  : "No job cards match this view"}
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {jobCards.length === 0
                  ? "When a supervisor assigns you a job card, it will show up here."
                  : "Try another tab or clear the search."}
              </p>
              {jobCards.length > 0 && (search || tab !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTab("ALL");
                  }}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  Show all job cards
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                className="overflow-y-auto pr-2 [scrollbar-width:thin]"
                style={{ maxHeight: SCROLL_MAX_HEIGHT }}
              >
                <div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                  style={{
                    gap: GRID_GAP,
                    gridAutoRows: `${CARD_HEIGHT}px`,
                  }}
                >
                  {visibleCards.map((jc) => (
                    <JobCardTile
                      key={jc.id}
                      jc={jc}
                      health={healthByMachine[jc.machineId]}
                      busy={busyId === jc.id}
                      onTimer={(action) => runTimer(jc, action)}
                      onEnd={() => setEndingId(jc.id)}
                      onView={() => setViewingId(jc.id)}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {visibleCards.length} job card
                {visibleCards.length > 1 ? "s" : ""}
                {visibleCards.length > 6 && " · scroll to see more"}
              </p>
            </>
          )}
        </div>
      </div>

      {viewing && (
        <JobCardModal
          jc={viewing}
          health={healthByMachine[viewing.machineId]}
          busy={busyId === viewing.id}
          onClose={() => setViewingId(null)}
          onTimer={(action) => runTimer(viewing, action)}
          onEnd={() => setEndingId(viewing.id)}
          onPreviewImage={setPreviewImage}
        />
      )}

      {ending && (
        <EndConfirmDialog
          jc={ending}
          busy={busyId === ending.id}
          onCancel={() => setEndingId(null)}
          onConfirm={confirmEnd}
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
 * SHARED PIECES
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

function HealthRing({ score, size = 48 }: { score?: number; size?: number }) {
  const tone = healthTone(score);
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const dash =
    score === undefined
      ? 0
      : (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={
        score === undefined
          ? "Health data not available"
          : `Machine health ${score}% (${tone.label})`
      }
    >
      <svg
        viewBox="0 0 44 44"
        className="-rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className={`${tone.stroke} transition-all duration-700`}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums ${tone.text}`}
      >
        {score === undefined ? "—" : score}
      </span>
    </div>
  );
}

/** Start / Resume when stopped. Pause and End while the timer is running. */
function TimerControls({
  jc,
  busy,
  onTimer,
  onEnd,
  size = "md",
}: {
  jc: JobCard;
  busy: boolean;
  onTimer: (action: LaborTimerAction) => void;
  onEnd: () => void;
  size?: "md" | "lg";
}) {
  const running = getRunningLog(jc);
  const canTimer = TIMER_STATUSES.includes(jc.status);
  if (!running && !canTimer) return null;

  const hasLogs = jc.laborLogs.length > 0;
  const base = `inline-flex ${
    size === "lg" ? "h-11 px-5" : "h-9 px-3"
  } items-center justify-center gap-1.5 rounded-lg text-xs font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60`;

  if (running) {
    return (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={() => onTimer("PAUSE")}
          className={`${base} bg-amber-500 text-white hover:bg-amber-600`}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Pause size={14} />
          )}
          Pause
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onEnd}
          className={`${base} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20`}
        >
          <Square size={13} />
          End
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onTimer(hasLogs ? "RESUME" : "START")}
      className={`${base} bg-blue-600 text-white shadow-blue-600/25 hover:bg-blue-700`}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Play size={14} />
      )}
      {hasLogs ? "Resume" : "Start work"}
    </button>
  );
}

/* ============================================================================
 * JOB CARD TILE
 * ==========================================================================*/

function JobCardTile({
  jc,
  health,
  busy,
  onTimer,
  onEnd,
  onView,
}: {
  jc: JobCard;
  health?: MachineHealth;
  busy: boolean;
  onTimer: (action: LaborTimerAction) => void;
  onEnd: () => void;
  onView: () => void;
}) {
  const running = getRunningLog(jc);
  const now = useTick(!!running);

  const priority = PRIORITY_META[jc.priority];
  const overdue = isOverdue(jc);
  const componentScore = findComponentHealth(jc, health);

  const allocated = toNumber(jc.allocatedLaborHours);
  const loggedMin = getLoggedMinutes(jc, now);
  const progress =
    allocated > 0 ? Math.min(100, (loggedMin / 60 / allocated) * 100) : 0;
  const overBudget = allocated > 0 && loggedMin / 60 > allocated;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-lg dark:bg-[#0d1e34] ${
        running
          ? "border-blue-300 ring-2 ring-blue-200/70 dark:border-blue-500/40 dark:ring-blue-500/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div
        className={`h-1.5 w-full shrink-0 bg-gradient-to-r ${priority.bar}`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {jc.jobCardNumber}
          </span>
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={jc.priority} />
            <StatusBadge status={jc.status} />
          </div>
        </div>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-extrabold leading-snug text-slate-900 dark:text-white">
          {jc.title}
        </h3>

        {/* Machine */}
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-[#12243b] dark:text-slate-300">
            <Cpu size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">
              {jc.machine?.name ?? "Machine"}
            </p>
            <p className="truncate font-mono text-[10px] text-slate-400">
              {jc.machine?.serialNumber}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin size={11} className="shrink-0" />
              {jc.machine?.site || "Site not set"}
            </p>
          </div>
          <HealthRing score={health?.healthScore} />
        </div>

        {/* Time */}
        {running ? (
          <div className="rounded-xl bg-gradient-to-br from-[#3B37E6] to-[#2E2AD9] p-3 text-white shadow-md shadow-blue-600/20">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-100">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Timer running
              </span>
              <span>Total {formatMinutes(loggedMin)}</span>
            </div>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums tracking-tight">
              {formatClock(now - new Date(running.startTime).getTime())}
            </p>
            {allocated > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-full rounded-full ${
                    overBudget ? "bg-red-300" : "bg-white"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Time logged
                </p>
                <p className="font-mono text-xl font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMinutes(loggedMin)}
                </p>
              </div>
              {allocated > 0 && (
                <p
                  className={`text-[11px] font-semibold ${
                    overBudget
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  of {allocated}h allocated
                </p>
              )}
            </div>
            {allocated > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${
                    overBudget ? "bg-red-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] font-semibold">
          <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
            {componentLabel(jc)}
            {componentScore !== undefined && (
              <span className={`ml-1 ${healthTone(componentScore).text}`}>
                · {componentScore}%
              </span>
            )}
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 ${
              overdue
                ? "text-red-600 dark:text-red-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <CalendarClock size={12} />
            {overdue ? "Overdue " : "Due "}
            {formatDate(jc.plannedFinishDate)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-white/[0.02]">
        <TimerControls jc={jc} busy={busy} onTimer={onTimer} onEnd={onEnd} />
        <button
          type="button"
          onClick={onView}
          className="ml-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
        >
          <Eye size={14} />
          View
        </button>
      </div>
    </article>
  );
}

/* ============================================================================
 * DETAILS POPUP
 * ==========================================================================*/

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <h4 className="mb-3 text-xs font-extrabold text-slate-500 dark:text-slate-400">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-right font-bold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-white/[0.04]">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-black tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function JobCardModal({
  jc,
  health,
  busy,
  onClose,
  onTimer,
  onEnd,
  onPreviewImage,
}: {
  jc: JobCard;
  health?: MachineHealth;
  busy: boolean;
  onClose: () => void;
  onTimer: (action: LaborTimerAction) => void;
  onEnd: () => void;
  onPreviewImage: (imageUrl: string) => void;
}) {
  const running = getRunningLog(jc);
  const now = useTick(!!running);
  const loggedMin = getLoggedMinutes(jc, now);
  const allocated = toNumber(jc.allocatedLaborHours);
  const machineTone = healthTone(health?.healthScore);
  const componentScore = findComponentHealth(jc, health);
  const partsCost = jc.parts.reduce((s, p) => s + toNumber(p.totalCost), 0);
  const logs = [...jc.laborLogs].sort((a, b) =>
    b.startTime.localeCompare(a.startTime),
  );
  const hasReport =
    !!jc.rootCause ||
    !!jc.correctiveAction ||
    !!jc.postRepairCondition ||
    toNumber(jc.downtimeHours) > 0;

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
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]"
      >
        {/* Header */}
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
                  {jc.maintenanceType
                    .split("_")
                    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                    .join(" ")}
                </span>
                {running && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/20 px-2.5 py-1 text-[11px] font-bold text-emerald-100">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 motion-reduce:animate-none" />
                    {formatClock(now - new Date(running.startTime).getTime())}
                  </span>
                )}
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

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 [scrollbar-width:thin]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Time logged" value={formatMinutes(loggedMin)} />
            <Kpi
              label="Allocated"
              value={allocated > 0 ? `${allocated}h` : "—"}
            />
            <Kpi label="Parts cost" value={partsCost.toFixed(2)} />
            <Kpi label="Total cost" value={toNumber(jc.totalCost).toFixed(2)} />
          </div>

          {jc.description && (
            <p className="rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {jc.description}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Section title="Machine and component">
              <div className="mb-2 flex items-center gap-3">
                <HealthRing score={health?.healthScore} size={56} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                    {jc.machine?.name ?? "Machine"}
                  </p>
                  <p className={`text-xs font-bold ${machineTone.text}`}>
                    {health?.healthScore !== undefined
                      ? `${machineTone.label} · ${health.healthScore}%`
                      : "Health not available"}
                  </p>
                </div>
              </div>
              <Row
                label="Serial number"
                value={jc.machine?.serialNumber ?? "—"}
              />
              <Row label="Model" value={jc.machine?.model ?? "—"} />
              <Row label="Site" value={jc.machine?.site || "—"} />
              <Row label="Component" value={componentLabel(jc)} />
              {componentScore !== undefined && (
                <Row
                  label="Component health"
                  value={
                    <span className={healthTone(componentScore).text}>
                      {componentScore}%
                    </span>
                  }
                />
              )}
            </Section>

            <Section title="Schedule and people">
              <Row
                label="Planned start"
                value={formatDate(jc.plannedStartDate)}
              />
              <Row
                label="Planned finish"
                value={
                  <span
                    className={
                      isOverdue(jc) ? "text-red-600 dark:text-red-400" : ""
                    }
                  >
                    {formatDate(jc.plannedFinishDate)}
                  </span>
                }
              />
              <Row
                label="Actual start"
                value={formatDate(jc.actualStartDate)}
              />
              <Row
                label="Assigned to"
                value={jc.assignedTechnicianName || "—"}
              />
              <Row
                label="Supervisor"
                value={jc.assignedSupervisorName || "—"}
              />
            </Section>
          </div>

          <Section title={`Time log (${logs.length})`}>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400">No time logged yet.</p>
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
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        log.endTime
                          ? "text-slate-600 dark:text-slate-300"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {log.endTime
                        ? formatMinutes(log.durationMinutes ?? 0)
                        : "Running"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Section title={`Parts (${jc.parts.length})`}>
              {jc.parts.length === 0 ? (
                <p className="text-xs text-slate-400">No parts recorded.</p>
              ) : (
                <>
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
                          {toNumber(p.totalCost).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t border-slate-100 pt-2 text-right text-xs font-extrabold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                    Total {partsCost.toFixed(2)}
                  </p>
                </>
              )}
            </Section>

            <Section title={`Findings (${jc.findings.length})`}>
              {jc.findings.length === 0 ? (
                <p className="text-xs text-slate-400">No findings recorded.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jc.findings.map((f) => (
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
                        className={`inline-flex shrink-0 items-center gap-1 font-bold ${
                          f.status === "PASS"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {f.status === "PASS" ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <AlertCircle size={13} />
                        )}
                        {f.status === "PASS" ? "Pass" : "Fail"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          {jc.attachments.length > 0 && (
            <Section title={`Attachments (${jc.attachments.length})`}>
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
                      onClick={() => onPreviewImage(resolveJobCardFileUrl(a.fileUrl))}
                      className="inline-flex shrink-0 items-center gap-1 font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {hasReport && (
            <Section title="Repair report">
              <Row label="Root cause" value={jc.rootCause || "—"} />
              <Row
                label="Corrective action"
                value={jc.correctiveAction || "—"}
              />
              <Row
                label="Condition after repair"
                value={
                  jc.postRepairCondition ? `${jc.postRepairCondition} / 5` : "—"
                }
              />
              <Row label="Downtime" value={`${toNumber(jc.downtimeHours)}h`} />
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <TimerControls
            jc={jc}
            busy={busy}
            onTimer={onTimer}
            onEnd={onEnd}
            size="lg"
          />
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-white/[0.06]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * END SESSION CONFIRMATION
 * ==========================================================================*/

function EndConfirmDialog({
  jc,
  busy,
  onCancel,
  onConfirm,
}: {
  jc: JobCard;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="End work session"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0b1728]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <Square size={20} />
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
          End this work session?
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          The timer for{" "}
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {jc.jobCardNumber}
          </span>{" "}
          stops and the time is saved. You can start a new session later while
          the job card is still open.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/[0.06]"
          >
            Keep working
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-bold text-white shadow-md shadow-red-600/25 transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            End session
          </button>
        </div>
      </div>
    </div>
  );
}
