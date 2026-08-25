import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { createPortal } from "react-dom";

/* ============================================================================
 * 1. TYPES — must match the real API contract. Extend, don't loosen.
 * ==========================================================================*/

export type InquiryStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface CompanyDetails {
  readonly companyId: string;
  readonly companyName: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly siteLocation: string;
  // NOTE: password is intentionally NOT part of this type. If the
  // backend ever includes password-related fields on this payload,
  // they must never be added here and never rendered (see `omit`
  // usage in QuotationInquiryView).
}

export interface QuotationAttachment {
  readonly fileName: string;
  readonly fileType: string;
  readonly fileSizeBytes?: number;
  readonly viewUrl: string;
  readonly downloadUrl: string;
}

export interface QuotationRequirements {
  readonly quotationType: string;
  readonly numberOfSites: number;
  readonly siteNames: readonly string[];
  readonly activeMachines: number;
  readonly equipmentTypes: readonly string[];
  readonly contractDuration: string;
  readonly implementationRequirements: string | null;
  readonly additionalRequirements: string | null;
  readonly attachment: QuotationAttachment | null;
}

export interface QuotationInquiry {
  readonly inquiryId: string;
  readonly status: InquiryStatus;
  readonly requestedAt: string; // ISO timestamp
  readonly company: CompanyDetails;
  readonly requirements: QuotationRequirements;
}

export interface QuotationInquirySummary {
  readonly pendingInquiries: number;
  readonly todaysInquiries: number;
  readonly accepted: number;
  readonly rejected?: number;
}

export interface Pagination {
  readonly page: number;
  readonly limit: number;
  readonly totalRecords: number;
  readonly totalPages: number;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly message?: string;
  readonly pagination?: Pagination;
  readonly summary?: QuotationInquirySummary;
}

export interface ApiErrorShape {
  readonly response?: {
    readonly data?: {
      readonly message?: string;
      readonly errors?: readonly { field?: string; message: string }[];
    };
  };
  readonly message?: string;
}

export interface QuotationInquiryListParams {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly status?: InquiryStatus;
  readonly quotationType?: string;
  readonly contractDuration?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

/* ============================================================================
 * 2. MOCK SERVICE LAYER (UI-TESTING ONLY)
 *    Simulates a real backend: async, network delay, server-side
 *    search/filter/pagination, and real status mutation on
 *    accept/reject. Swap this whole section for the real
 *    `apiRequest`/`fetch` version (see production file) when wiring
 *    up the actual backend.
 * ==========================================================================*/

const NETWORK_DELAY_MS = 700;
/** Set > 0 (e.g. 0.15) to occasionally exercise the error + retry state. */
const SIMULATE_ERROR_RATE = 0;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function makeAttachment(seed: number): QuotationAttachment | null {
  if (seed % 3 !== 0) return null;
  return {
    fileName: `site-survey-report-${seed}.pdf`,
    fileType: "application/pdf",
    fileSizeBytes: 240_000 + seed * 15_000,
    viewUrl: "#",
    downloadUrl: "#",
  };
}

const MOCK_COMPANIES: readonly Omit<CompanyDetails, "companyId">[] = [
  { companyName: "ABC Mining Pvt Ltd", contactPerson: "John Doe", email: "john.doe@abcmining.com", phone: "+91 98765 43210", siteLocation: "Nagpur, Maharashtra" },
  { companyName: "XYZ Resources Ltd", contactPerson: "David Miller", email: "david.miller@xyzresources.com", phone: "+91 91234 56780", siteLocation: "Bhubaneswar, Odisha" },
  { companyName: "Iron Valley Corp", contactPerson: "Sarah Johnson", email: "sarah.j@ironvalley.com", phone: "+91 99887 76655", siteLocation: "Jamshedpur, Jharkhand" },
  { companyName: "Global Mining Co.", contactPerson: "Michael Brown", email: "michael.brown@globalmining.com", phone: "+91 90000 11223", siteLocation: "Bellary, Karnataka" },
  { companyName: "Peak Mining Ltd", contactPerson: "Robert Wilson", email: "robert.wilson@peakmining.com", phone: "+91 97654 32109", siteLocation: "Raipur, Chhattisgarh" },
  { companyName: "Terra Mines Pvt Ltd", contactPerson: "Emily Davis", email: "emily.davis@terramines.com", phone: "+91 93456 78901", siteLocation: "Udaipur, Rajasthan" },
  { companyName: "Deccan Ores Ltd", contactPerson: "Priya Sharma", email: "priya.sharma@deccanores.com", phone: "+91 98123 45678", siteLocation: "Hospet, Karnataka" },
  { companyName: "Coastal Minerals Inc", contactPerson: "Arjun Mehta", email: "arjun.mehta@coastalminerals.com", phone: "+91 99001 22334", siteLocation: "Goa" },
];

const QUOTATION_TYPES = ["Fleet Management", "Predictive Maintenance", "Asset Monitoring"] as const;
const CONTRACT_DURATIONS = ["6 Months", "12 Months", "18 Months", "24 Months"] as const;
const EQUIPMENT_TYPE_POOL = ["Excavator", "Dump Truck", "Dozer", "Drill Rig", "Loader", "Grader"] as const;

function buildMockInquiry(index: number): QuotationInquiry {
  const company = MOCK_COMPANIES[index % MOCK_COMPANIES.length];
  const quotationType = QUOTATION_TYPES[index % QUOTATION_TYPES.length];
  const contractDuration = CONTRACT_DURATIONS[index % CONTRACT_DURATIONS.length];
  const numberOfSites = 1 + (index % 5);
  const equipmentTypes = EQUIPMENT_TYPE_POOL.filter((_, i) => (i + index) % 2 === 0).slice(0, 3);
  const daysAgo = index; // spreads requests across recent days, most-recent first
  const requestedAt = new Date(Date.now() - daysAgo * 86_400_000 - index * 3_600_000).toISOString();

  return {
    inquiryId: `QIN-${String(90 - index).padStart(5, "0")}`,
    status: index % 7 === 0 ? "ACCEPTED" : index % 11 === 0 ? "REJECTED" : "PENDING",
    requestedAt,
    company: { companyId: `CMP-${index}`, ...company },
    requirements: {
      quotationType,
      numberOfSites,
      siteNames: Array.from({ length: numberOfSites }, (_, i) => `${company.siteLocation.split(",")[0]} Site ${i + 1}`),
      activeMachines: 20 + index * 8,
      equipmentTypes,
      contractDuration,
      implementationRequirements:
        index % 4 === 0
          ? null
          : "Deploy telematics units across all active machines within 2 weeks of contract signing. Integrate with existing SCADA system for real-time fuel and idle-time reporting. On-site training required for 3 operations staff per site.",
      additionalRequirements:
        index % 3 === 0
          ? null
          : "Please share references from at least two existing mining-sector clients using a similar fleet size.",
      attachment: makeAttachment(index),
    },
  };
}

/** In-memory "database" — 24 mock inquiries, mutated by accept/reject. */
const mockDatabase: QuotationInquiry[] = Array.from({ length: 24 }, (_, i) => buildMockInquiry(i));

function maybeThrowSimulatedError(): void {
  if (SIMULATE_ERROR_RATE > 0 && Math.random() < SIMULATE_ERROR_RATE) {
    const err: ApiErrorShape = {
      response: { data: { message: "The inquiry service is temporarily unavailable. Please try again." } },
    };
    throw err;
  }
}

const quotationInquiryService = {
  async getQuotationInquiries(
    params: QuotationInquiryListParams,
  ): Promise<ApiResponse<QuotationInquiry[]>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();

    let rows = mockDatabase.filter((inq) => inq.status === "PENDING");

    if (params.status) {
      rows = mockDatabase.filter((inq) => inq.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter(
        (inq) =>
          inq.inquiryId.toLowerCase().includes(q) ||
          inq.company.companyName.toLowerCase().includes(q) ||
          inq.company.contactPerson.toLowerCase().includes(q) ||
          inq.company.email.toLowerCase().includes(q),
      );
    }
    if (params.quotationType) {
      const q = params.quotationType.toLowerCase();
      rows = rows.filter((inq) => inq.requirements.quotationType.toLowerCase().includes(q));
    }
    if (params.contractDuration) {
      const q = params.contractDuration.toLowerCase();
      rows = rows.filter((inq) => inq.requirements.contractDuration.toLowerCase().includes(q));
    }

    rows = [...rows].sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));

    const totalRecords = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / params.limit));
    const start = (params.page - 1) * params.limit;
    const pageRows = rows.slice(start, start + params.limit);

    const allPending = mockDatabase.filter((i) => i.status === "PENDING");
    const todaysCount = allPending.filter(
      (i) => new Date(i.requestedAt).toDateString() === new Date().toDateString(),
    ).length;

    return {
      data: pageRows,
      pagination: { page: params.page, limit: params.limit, totalRecords, totalPages },
      summary: {
        pendingInquiries: allPending.length,
        todaysInquiries: todaysCount,
        accepted: mockDatabase.filter((i) => i.status === "ACCEPTED").length,
        rejected: mockDatabase.filter((i) => i.status === "REJECTED").length,
      },
    };
  },

  async getQuotationInquiryById(id: string): Promise<ApiResponse<QuotationInquiry>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();
    const found = mockDatabase.find((i) => i.inquiryId === id);
    if (!found) {
      const err: ApiErrorShape = { response: { data: { message: `Inquiry ${id} was not found.` } } };
      throw err;
    }
    return { data: found };
  },

  async acceptQuotationInquiry(id: string): Promise<ApiResponse<QuotationInquiry>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();
    const idx = mockDatabase.findIndex((i) => i.inquiryId === id);
    if (idx === -1) {
      const err: ApiErrorShape = { response: { data: { message: `Inquiry ${id} was not found.` } } };
      throw err;
    }
    mockDatabase[idx] = { ...mockDatabase[idx], status: "ACCEPTED" };
    return {
      data: mockDatabase[idx],
      message: `Inquiry ${id} has been accepted and moved to Send Quotation.`,
    };
  },

  async rejectQuotationInquiry(id: string): Promise<ApiResponse<QuotationInquiry>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();
    const idx = mockDatabase.findIndex((i) => i.inquiryId === id);
    if (idx === -1) {
      const err: ApiErrorShape = { response: { data: { message: `Inquiry ${id} was not found.` } } };
      throw err;
    }
    mockDatabase[idx] = { ...mockDatabase[idx], status: "REJECTED" };
    return {
      data: mockDatabase[idx],
      message: `Inquiry ${id} has been rejected.`,
    };
  },
};

/** Reads the backend's own error message. Never invents one. */
function getApiErrorMessage(error: unknown, fallback: string): string {
  const shaped = error as ApiErrorShape | undefined;
  const backendMessage = shaped?.response?.data?.message ?? shaped?.message;
  return backendMessage && backendMessage.trim().length > 0
    ? backendMessage
    : fallback;
}

/* ============================================================================
 * 3. REQUEST-STATE MODEL
 *    Loading / Success+data / Success+empty / Error are mutually
 *    exclusive states — never derived from `data ?? []`.
 * ==========================================================================*/

type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T; pagination?: Pagination; summary?: QuotationInquirySummary }
  | { status: "error"; message: string };

/* ============================================================================
 * 4. MINIMAL TOAST SYSTEM
 *    Replace with the project's existing toast system if one exists.
 * ==========================================================================*/

interface ToastItem {
  readonly id: number;
  readonly kind: "success" | "error";
  readonly message: string;
}

function useToastState() {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => push("success", message), [push]);
  const error = useCallback((message: string) => push("error", message), [push]);

  // Memoized so consumers that depend on `toast` don't re-run on every
  // unrelated render — only when the toast list itself actually changes.
  return useMemo(
    () => ({ toasts, success, error, dismiss }),
    [toasts, success, error, dismiss],
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  readonly toasts: readonly ToastItem[];
  readonly onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <Portal>
    <div
      className="fixed bottom-4 right-4 z-[120] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            t.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-0.5 text-current/70 hover:text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
    </Portal>
  );
}

/* ============================================================================
 * 4b. PORTAL
 *     Renders overlay content (drawer / dialog / toasts) directly onto
 *     `document.body`, escaping any ancestor with `transform`, `filter`
 *     or `will-change` set — the usual reason a `fixed` overlay ends up
 *     trapped inside the app shell with the sidebar/navbar still
 *     showing on top of it. `mounted` guard avoids an SSR mismatch.
 * ==========================================================================*/

function Portal({ children }: { readonly children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/* ============================================================================
 * 5. ICONS (inline SVG — no icon library dependency)
 * ==========================================================================*/

function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function IconFilter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M4 5h16M7 12h10M10 19h4" strokeLinecap="round" />
    </svg>
  );
}
function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconX(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFile(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpinner(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${props.className ?? ""}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconInbox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.4 5.6 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.4A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.6Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function IconBadgeCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

/* ============================================================================
 * 6. SMALL PRESENTATIONAL PRIMITIVES
 * ==========================================================================*/

function Chip({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { readonly status: InquiryStatus }) {
  const styles: Record<InquiryStatus, string> = {
    PENDING:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    ACCEPTED:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    REJECTED:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly tone: "neutral" | "success" | "danger";
  readonly children: ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    neutral:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
    success:
      "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950",
    danger:
      "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses[tone]}`}
    >
      {children}
    </button>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes?: number): string | null {
  if (bytes === undefined || bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ============================================================================
 * 7. SUMMARY STATISTICS
 * ==========================================================================*/

function QuotationInquirySummaryCards({
  summary,
}: {
  readonly summary: QuotationInquirySummary | undefined;
}) {
  // Only render cards for values the backend actually provided.
  const cards: { key: string; label: string; sub: string; value: number; icon: ReactNode; tint: string }[] = [];

  if (summary?.pendingInquiries !== undefined) {
    cards.push({
      key: "pending",
      label: "Pending Inquiries",
      sub: "Awaiting your action",
      value: summary.pendingInquiries,
      icon: <IconInbox className="h-5 w-5" />,
      tint: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    });
  }
  if (summary?.todaysInquiries !== undefined) {
    cards.push({
      key: "today",
      label: "Today's Inquiries",
      sub: "Received today",
      value: summary.todaysInquiries,
      icon: <IconCalendar className="h-5 w-5" />,
      tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    });
  }
  if (summary?.accepted !== undefined) {
    cards.push({
      key: "accepted",
      label: "Accepted",
      sub: "This month",
      value: summary.accepted,
      icon: <IconBadgeCheck className="h-5 w-5" />,
      tint: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.key}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${c.tint}`}>
              {c.icon}
            </span>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{c.label}</p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {c.value}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 8. FILTERS / TOOLBAR
 * ==========================================================================*/

interface FilterState {
  readonly search: string;
  readonly status: InquiryStatus | "";
  readonly quotationType: string;
  readonly contractDuration: string;
}

const emptyFilters: FilterState = {
  search: "",
  status: "",
  quotationType: "",
  contractDuration: "",
};

function QuotationInquiryFilters({
  filters,
  onChange,
}: {
  readonly filters: FilterState;
  readonly onChange: (next: FilterState) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by company name, contact person or inquiry ID..."
          aria-label="Search inquiries"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        aria-expanded={panelOpen}
        aria-controls="quotation-inquiry-filter-panel"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <IconFilter className="h-4 w-4" />
        Filter
      </button>

      {panelOpen && (
        <div
          id="quotation-inquiry-filter-panel"
          className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:absolute sm:right-4 sm:top-16 sm:z-10 sm:w-72 sm:grid-cols-1 sm:rounded-lg sm:border sm:bg-white sm:p-4 sm:shadow-lg sm:dark:border-slate-700 sm:dark:bg-slate-900"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Status
            <select
              value={filters.status}
              onChange={(e) =>
                onChange({ ...filters, status: e.target.value as FilterState["status"] })
              }
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Quotation Type
            <input
              type="text"
              value={filters.quotationType}
              onChange={(e) => onChange({ ...filters, quotationType: e.target.value })}
              placeholder="e.g. Fleet Management"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Contract Duration
            <input
              type="text"
              value={filters.contractDuration}
              onChange={(e) => onChange({ ...filters, contractDuration: e.target.value })}
              placeholder="e.g. 12 Months"
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </label>

          <button
            type="button"
            onClick={() => onChange(emptyFilters)}
            className="mt-1 text-left text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 9. SKELETON TABLE
 * ==========================================================================*/

function QuotationInquirySkeleton({ rows = 6 }: { readonly rows?: number }) {
  return (
    <div className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800" role="status" aria-label="Loading inquiries">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-4 px-4 py-4">
          <div className="col-span-2 h-3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="col-span-2 h-3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="col-span-2 h-3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="col-span-2 h-3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="col-span-2 h-3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="col-span-2 h-3 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 10. TABLE
 * ==========================================================================*/

interface QuotationInquiryTableProps {
  readonly inquiries: readonly QuotationInquiry[];
  readonly actionInFlightId: string | null;
  readonly actionKind: "accept" | "reject" | null;
  readonly onView: (inquiry: QuotationInquiry) => void;
  readonly onAccept: (inquiry: QuotationInquiry) => void;
  readonly onReject: (inquiry: QuotationInquiry) => void;
}

function QuotationInquiryTable({
  inquiries,
  actionInFlightId,
  actionKind,
  onView,
  onAccept,
  onReject,
}: QuotationInquiryTableProps) {
  return (
    <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-800">
      <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Inquiry ID</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Company</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Contact Person</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Contact</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Site / Location</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Quotation Type</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Sites</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Active Machines</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Equipment Types</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Contract Duration</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">Requested On</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {inquiries.map((inquiry) => {
            const isThisAccepting =
              actionInFlightId === inquiry.inquiryId && actionKind === "accept";
            const isThisRejecting =
              actionInFlightId === inquiry.inquiryId && actionKind === "reject";
            const anyActionInFlight = actionInFlightId === inquiry.inquiryId;

            return (
              <tr key={inquiry.inquiryId} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                  {inquiry.inquiryId}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                  {inquiry.company.companyName}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {inquiry.company.contactPerson}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  <div className="flex flex-col">
                    <span>{inquiry.company.email}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{inquiry.company.phone}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {inquiry.company.siteLocation}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <Chip>{inquiry.requirements.quotationType}</Chip>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {inquiry.requirements.numberOfSites}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {inquiry.requirements.activeMachines}
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {inquiry.requirements.equipmentTypes.map((eq) => (
                      <Chip key={eq}>{eq}</Chip>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {inquiry.requirements.contractDuration}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                  {formatDateTime(inquiry.requestedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton label="View inquiry" tone="neutral" onClick={() => onView(inquiry)} disabled={anyActionInFlight}>
                      <IconEye className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Accept inquiry" tone="success" onClick={() => onAccept(inquiry)} disabled={anyActionInFlight}>
                      {isThisAccepting ? <IconSpinner className="h-4 w-4" /> : <IconCheck className="h-4 w-4" />}
                    </IconButton>
                    <IconButton label="Reject inquiry" tone="danger" onClick={() => onReject(inquiry)} disabled={anyActionInFlight}>
                      {isThisRejecting ? <IconSpinner className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * 11. VIEW DRAWER
 * ==========================================================================*/

function QuotationInquiryView({
  inquiry,
  onClose,
  onAccept,
  onReject,
  actionKind,
  actionInFlight,
}: {
  readonly inquiry: QuotationInquiry;
  readonly onClose: () => void;
  readonly onAccept: () => void;
  readonly onReject: () => void;
  readonly actionKind: "accept" | "reject" | null;
  readonly actionInFlight: boolean;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    drawerRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const { company, requirements } = inquiry;
  const sizeLabel = formatBytes(requirements.attachment?.fileSizeBytes ?? undefined);

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close popup overlay"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
      />
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quotation-inquiry-drawer-title"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 id="quotation-inquiry-drawer-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Quotation Inquiry
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{inquiry.inquiryId}</span>
              <StatusBadge status={inquiry.status} />
              <span className="inline-flex items-center gap-1 text-xs">
                <IconClock className="h-3.5 w-3.5" />
                {formatDateTime(inquiry.requestedAt)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <section aria-labelledby="company-details-heading">
            <h3 id="company-details-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
              Company Details
            </h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-400">Company Name</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{company.companyName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Contact Person</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{company.contactPerson}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Email Address</dt>
                <dd className="mt-0.5 break-all text-slate-800 dark:text-slate-200">{company.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Phone Number</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{company.phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-400">Site / Location</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{company.siteLocation}</dd>
              </div>
            </dl>
          </section>

          <hr className="my-5 border-slate-100 dark:border-slate-800" />

          <section aria-labelledby="quotation-requirements-heading">
            <h3 id="quotation-requirements-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
              Quotation Requirements
            </h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-400">Quotation Type</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{requirements.quotationType}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Number of Sites</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{requirements.numberOfSites}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Number of Active Machines</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{requirements.activeMachines}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Preferred Contract Duration</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{requirements.contractDuration}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-400">Site Name(s)</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {requirements.siteNames.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-400">Fleet / Equipment Types</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {requirements.equipmentTypes.map((e) => (
                    <Chip key={e}>{e}</Chip>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <hr className="my-5 border-slate-100 dark:border-slate-800" />

          <section aria-labelledby="implementation-requirements-heading">
            <h3 id="implementation-requirements-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
              Implementation Requirements
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {requirements.implementationRequirements?.trim()
                ? requirements.implementationRequirements
                : "No implementation requirements provided."}
            </p>
          </section>

          <hr className="my-5 border-slate-100 dark:border-slate-800" />

          <section aria-labelledby="additional-requirements-heading">
            <h3 id="additional-requirements-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
              Additional Requirements
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {requirements.additionalRequirements?.trim()
                ? requirements.additionalRequirements
                : "No additional requirements provided."}
            </p>
          </section>

          <hr className="my-5 border-slate-100 dark:border-slate-800" />

          <section aria-labelledby="attachment-heading">
            <h3 id="attachment-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
              Attachment
            </h3>
            {requirements.attachment ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex min-w-0 items-center gap-2.5">
                  <IconFile className="h-5 w-5 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {requirements.attachment.fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {requirements.attachment.fileType}
                      {sizeLabel ? ` • ${sizeLabel}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={requirements.attachment.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    <IconEye className="h-3.5 w-3.5" />
                    View PDF
                  </a>
                  <a
                    href={requirements.attachment.downloadUrl}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <IconDownload className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No attachment provided.</p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
          {inquiry.status === "PENDING" && (
            <>
              <button
                type="button"
                onClick={onReject}
                disabled={actionInFlight}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                {actionKind === "reject" && actionInFlight && <IconSpinner className="h-4 w-4" />}
                Reject Inquiry
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={actionInFlight}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionKind === "accept" && actionInFlight && <IconSpinner className="h-4 w-4" />}
                Accept Inquiry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ============================================================================
 * 12. CONFIRMATION DIALOG (shared by Accept / Reject)
 * ==========================================================================*/

function QuotationInquiryActions({
  kind,
  inquiryId,
  onCancel,
  onConfirm,
  loading,
}: {
  readonly kind: "accept" | "reject";
  readonly inquiryId: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly loading: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, loading]);

  const isAccept = kind === "accept";

  return (
    <Portal>
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        onClick={() => !loading && onCancel()}
        className="absolute inset-0 bg-slate-900/50"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        aria-describedby="confirm-action-description"
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl outline-none dark:bg-slate-900"
      >
        <h2 id="confirm-action-title" className="text-base font-semibold text-slate-900 dark:text-white">
          {isAccept ? "Accept Quotation Inquiry?" : "Reject Quotation Inquiry?"}
        </h2>
        <p id="confirm-action-description" className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {isAccept
            ? `Confirm that you want to accept inquiry ${inquiryId} and move it to the quotation preparation flow.`
            : `This will move inquiry ${inquiryId} out of the active quotation inquiry list.`}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              isAccept
                ? "bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600"
                : "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
            }`}
          >
            {loading && <IconSpinner className="h-4 w-4" />}
            {isAccept ? (loading ? "Accepting..." : "Accept Inquiry") : loading ? "Rejecting..." : "Reject Inquiry"}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ============================================================================
 * 13. PAGINATION
 * ==========================================================================*/

function PaginationBar({
  pagination,
  onPageChange,
}: {
  readonly pagination: Pagination;
  readonly onPageChange: (page: number) => void;
}) {
  const { page, totalPages, totalRecords } = pagination;
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row">
      <span>{totalRecords} total record{totalRecords === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Previous
        </button>
        <span className="px-2">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * 14. EMPTY / ERROR STATES
 * ==========================================================================*/

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <IconInbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No quotation inquiries found.</p>
      <p className="text-xs text-slate-400">There are currently no active quotation requests.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <IconAlert className="h-8 w-8 text-red-400" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Retry
      </button>
    </div>
  );
}

/* ============================================================================
 * 15. MAIN PAGE
 * ==========================================================================*/

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

export default function QuotationInquiryPage() {
  const [listState, setListState] = useState<RequestState<QuotationInquiry[]>>({ status: "idle" });
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedInquiry, setSelectedInquiry] = useState<QuotationInquiry | null>(null);
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject" | null>(null);

  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<"accept" | "reject" | null>(null);

  // Background revalidation (post accept/reject) — the table keeps
  // showing its current rows while this is true; it never falls back
  // to the full skeleton, so accept/reject never looks like a full
  // page reload.
  const [isRevalidating, setIsRevalidating] = useState(false);

  const toast = useToastState();
  // Kept in a ref so `fetchInquiries` doesn't need `toast` in its
  // dependency array — `toast` changes identity whenever the toast
  // list changes, which would otherwise re-trigger the data-loading
  // effect every time a toast is shown/dismissed.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Debounce search input.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.quotationType, filters.contractDuration]);

  /**
   * `silent`: used for post-accept/post-reject revalidation. Keeps the
   * currently-rendered rows on screen (no skeleton swap) and, if the
   * revalidation call itself fails, surfaces the backend error via a
   * toast instead of replacing the table with the full error state —
   * the user's already-visible data stays visible either way.
   */
  const fetchInquiries = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (silent) {
        setIsRevalidating(true);
      } else {
        setListState({ status: "loading" });
      }
      try {
        const response = await quotationInquiryService.getQuotationInquiries({
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          status: filters.status || undefined,
          quotationType: filters.quotationType || undefined,
          contractDuration: filters.contractDuration || undefined,
        });
        setListState({
          status: "success",
          data: response.data,
          pagination: response.pagination,
          summary: response.summary,
        });
      } catch (error) {
        if (silent) {
          toastRef.current.error(
            getApiErrorMessage(error, "Unable to refresh quotation inquiries."),
          );
        } else {
          setListState({
            status: "error",
            message: getApiErrorMessage(error, "Unable to load quotation inquiries."),
          });
        }
      } finally {
        if (silent) setIsRevalidating(false);
      }
    },
    [page, debouncedSearch, filters.status, filters.quotationType, filters.contractDuration],
  );

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleView = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
  }, []);

  const handleRequestAccept = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
    setConfirmAction("accept");
  }, []);

  const handleRequestReject = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
    setConfirmAction("reject");
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedInquiry || !confirmAction) return;
    const id = selectedInquiry.inquiryId;
    setActionInFlightId(id);
    setActionKind(confirmAction);
    try {
      const response =
        confirmAction === "accept"
          ? await quotationInquiryService.acceptQuotationInquiry(id)
          : await quotationInquiryService.rejectQuotationInquiry(id);

      if (response.message) {
        toast.success(response.message);
      }

      setConfirmAction(null);
      setSelectedInquiry(null);
      await fetchInquiries({ silent: true });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          confirmAction === "accept" ? "Unable to accept inquiry." : "Unable to reject inquiry.",
        ),
      );
    } finally {
      setActionInFlightId(null);
      setActionKind(null);
    }
  }, [selectedInquiry, confirmAction, fetchInquiries, toast]);

  const inquiries = listState.status === "success" ? listState.data : [];
  const pagination = listState.status === "success" ? listState.pagination : undefined;
  const summary = listState.status === "success" ? listState.summary : undefined;

  const bodyContent = useMemo(() => {
    if (listState.status === "loading" || listState.status === "idle") {
      return <QuotationInquirySkeleton />;
    }
    if (listState.status === "error") {
      return <ErrorState message={listState.message} onRetry={fetchInquiries} />;
    }
    if (inquiries.length === 0) {
      return <EmptyState />;
    }
    return (
      <QuotationInquiryTable
        inquiries={inquiries}
        actionInFlightId={actionInFlightId}
        actionKind={actionKind}
        onView={handleView}
        onAccept={handleRequestAccept}
        onReject={handleRequestReject}
      />
    );
  }, [listState, inquiries, actionInFlightId, actionKind, handleView, handleRequestAccept, handleRequestReject, fetchInquiries]);

  return (
    <div>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          {isRevalidating && (
            <span
              role="status"
              className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
            >
              <IconSpinner className="h-3.5 w-3.5" />
              Refreshing…
            </span>
          )}
        </div>

        {/* Summary */}
        <QuotationInquirySummaryCards summary={summary} />

        {/* Filters */}
        <QuotationInquiryFilters filters={filters} onChange={setFilters} />

        {/* Table / states */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {bodyContent}
          {listState.status === "success" && inquiries.length > 0 && pagination && (
            <PaginationBar pagination={pagination} onPageChange={setPage} />
          )}
        </div>
      </div>

      {/* View drawer */}
      {selectedInquiry && !confirmAction && (
        <QuotationInquiryView
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onAccept={() => setConfirmAction("accept")}
          onReject={() => setConfirmAction("reject")}
          actionKind={actionKind}
          actionInFlight={actionInFlightId === selectedInquiry.inquiryId}
        />
      )}

      {/* Confirmation dialog */}
      {selectedInquiry && confirmAction && (
        <QuotationInquiryActions
          kind={confirmAction}
          inquiryId={selectedInquiry.inquiryId}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
          loading={actionInFlightId === selectedInquiry.inquiryId}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}