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

import AppSelect from "../../../components/ui/dropdown/AppSelect";
import CommonPagination from "../../../components/common/Pagination";

import {
  deleteQuotationRequest,
  extractApiError,
  getQuotationRequestById,
  getQuotationRequestsWithMeta,
  updateQuotationRequest,
  type QuotationRequest,
  type QuotationRequestStatus,
} from "../../../services/Quotation/quotationService";

/* ============================================================================
 * 1. VIEW-MODEL TYPES
 *
 * `status` on QuotationInquiry is the RAW backend status
 * (QuotationRequestStatus) — there is no second, derived "Active/Inactive"
 * concept layered on top of it. Whatever the backend calls a request's
 * status is what the whole UI treats as its status, end to end.
 * ==========================================================================*/

export interface CompanyInfo {
  readonly companyId: string;
  readonly name: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly location: string;
}

/**
 * The current GET /quotations/requests contract does not include
 * trial-request fields. This shape is kept so the drawer UI has something
 * to bind to, but every value is honestly `false`/`null` until the
 * backend adds these fields — nothing here is invented per-record data.
 */
export interface TrialRequest {
  readonly requested: boolean;
  readonly duration: string | null;
  readonly machines: number | null;
  readonly description: string | null;
}

export interface ClientRequirement {
  readonly quotationType: string;
  readonly numberOfSites: number;
  readonly siteNames: readonly string[];
  readonly activeMachines: number;
  readonly equipmentTypes: readonly string[];
  /** Display-ready service names requested by the client (from `optionalServices`). */
  readonly requestedServiceNames: readonly string[];
  readonly requirementDescription: string;
  readonly otherRequirements: string | null;
}

export interface QuotationInquiry {
  /** Real backend primary key — required for detail/update/delete calls. */
  readonly id: string;
  /** Human-friendly reference shown throughout the UI. */
  readonly inquiryId: string;
  /** Raw backend lifecycle status — single source of truth, no derived flag. */
  readonly status: QuotationRequestStatus;
  readonly inquiryDate: string;
  readonly company: CompanyInfo;
  readonly requirement: ClientRequirement;
  readonly trial: TrialRequest;
  readonly attachmentUrl: string | null;
}

export interface AdditionalService {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultPrice: number;
}

export interface SelectedService {
  readonly serviceId: string;
  readonly selected: boolean;
  readonly price: number;
}

export interface QuotationDraft {
  readonly inquiryId: string;
  readonly contractDuration: string;
  readonly licensedMachineAllowance: number;
  readonly onceOffImplementationFee: number;
  readonly monthlySiteLicence: number;
  readonly additionalMachineCharge: number;
  readonly paymentTerms: string;
  readonly trialRequested: boolean;
  readonly trialDuration: string;
  readonly trialMachines: number;
  readonly trialDescription: string;
  readonly services: readonly SelectedService[];
  readonly notes: string;
}

export interface QuotationTotals {
  readonly additionalServicesTotal: number;
  readonly oneTimeTotal: number;
  readonly monthlyRecurringTotal: number;
  readonly contractValue: number;
}

export interface InquirySummary {
  readonly totalInquiries: number;
  readonly pending: number;
  readonly readyToQuote: number;
  readonly sent: number;
}

/* ============================================================================
 * 2. CENTRALIZED TEXT — the ONLY place literal user-facing copy lives in
 * this file. Every toast, empty-state and error fallback pulls from here
 * instead of a string typed inline at the call site. The backend's own
 * `message` field always wins where one is available (see usages below);
 * these are last-resort fallbacks only.
 * ==========================================================================*/

export const MESSAGES = {
  inquiriesLoadError: "Unable to load quotation inquiries.",
  inquiryDetailLoadError: "Unable to load inquiry details.",
  responsesLoadError: "Unable to load quotation responses.",
  draftSaveError: "Unable to save quotation draft.",
  draftSaveSuccess: "Quotation saved as draft.",
  sendError: "Unable to send quotation.",
  sendSuccess: "Quotation sent successfully.",
  deleteError: "Unable to delete quotation.",
  deleteSuccess: "Quotation deleted successfully.",
  emptyInquiriesTitle: "No quotation inquiries found.",
  emptyInquiriesSubtitle:
    "There are currently no quotation requests matching your filters.",
  emptyResponsesTitle: "No quotation responses found.",
  emptyResponsesSubtitle:
    "Quotations that have been sent will appear here once you send one.",
  confirmSendTitle: "Send this quotation?",
  confirmSendAction: "Send Quotation",
  confirmSending: "Sending...",
  confirmDeleteTitle: "Delete this quotation?",
  confirmDeleteBody:
    "This will permanently delete the quotation request for {company}. This cannot be undone.",
  confirmDeleteAction: "Delete",
  confirmDeleting: "Deleting...",
} as const;

/* ============================================================================
 * 3. BUSINESS CONFIGURATION
 *
 * These are static configuration values (available contract lengths,
 * trial-window lengths, payment terms, and the additional-services
 * catalogue with its starting price) — not per-record data. The backend
 * contract in hand (see quotationService.ts) has no `/quotations/config`
 * or `/quotations/services` endpoint, so these live here as the single
 * source of truth for now.
 *
 * TODO(backend): once a config endpoint exists, replace this block with a
 * fetch (e.g. `getQuotationConfig()`) and delete the constants below —
 * every component in this file already reads them by name only, so the
 * swap is contained to this section.
 * ==========================================================================*/

export const CONTRACT_DURATION_OPTIONS = [
  "6 Months",
  "12 Months",
  "18 Months",
  "24 Months",
] as const;

export const TRIAL_DURATION_OPTIONS = [
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
] as const;

export const PAYMENT_TERMS_OPTIONS = [
  "Monthly in Advance",
  "Quarterly in Advance",
  "Annually in Advance",
  "Net 30",
] as const;

export const DEFAULT_TRIAL_MACHINES = 15;
export const DEFAULT_TRIAL_DURATION = "30 Days";

/**
 * Matches the `status` dropdown values on GET /quotations/requests exactly.
 * If the backend adds/renames a status, update this one array only.
 */
export const STATUS_SELECT_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
] as const;

/** Responses tab only ever shows requests past the Pending/Draft stage. */
export const RESPONSE_STATUS_SELECT_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Sent", value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
] as const;

export const CONTRACT_DURATION_SELECT_OPTIONS = CONTRACT_DURATION_OPTIONS.map(
  (d) => ({ label: d, value: d }),
);
export const TRIAL_DURATION_SELECT_OPTIONS = TRIAL_DURATION_OPTIONS.map(
  (d) => ({ label: d, value: d }),
);
export const PAYMENT_TERMS_SELECT_OPTIONS = PAYMENT_TERMS_OPTIONS.map((p) => ({
  label: p,
  value: p,
}));

/**
 * Additional-services catalogue used to price a quotation. The backend
 * contract only returns service *names* per request (`optionalServices`);
 * it does not yet expose a services/pricing endpoint. Until one exists,
 * this catalogue is the source of truth for available services and their
 * starting price, and is used to pre-select whichever services the client
 * already asked for in their original inquiry.
 */
export const QUOTATION_SERVICES: readonly AdditionalService[] = [
  {
    id: "telematics-ecu",
    name: "Telematics / ECU Integration",
    description: "Integration with machine telematics and ECU data.",
    defaultPrice: 0,
  },
  {
    id: "sap-erp",
    name: "SAP / ERP Integration",
    description: "Integration with existing ERP systems.",
    defaultPrice: 25000,
  },
  {
    id: "custom-reports",
    name: "Custom Reports",
    description: "Custom reporting and dashboard requirements.",
    defaultPrice: 10000,
  },
  {
    id: "historical-migration",
    name: "Historical Data Migration",
    description: "Migration and preparation of historical machine data.",
    defaultPrice: 15000,
  },
  {
    id: "training",
    name: "Additional Training",
    description: "Additional user or operational training.",
    defaultPrice: 8000,
  },
  {
    id: "onsite-support",
    name: "On-site Technical Support",
    description: "On-site technical support services.",
    defaultPrice: 20000,
  },
];

function getServiceById(id: string): AdditionalService | undefined {
  return QUOTATION_SERVICES.find((s) => s.id === id);
}

function findServiceIdByName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  return QUOTATION_SERVICES.find(
    (s) => s.name.trim().toLowerCase() === normalized,
  )?.id;
}

/** Single label + style source for every status badge in the UI. */
const STATUS_LABEL: Record<QuotationRequestStatus, string> = {
  PENDING: "Pending",
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUS_BADGE_STYLES: Record<QuotationRequestStatus, string> = {
  PENDING:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  DRAFT:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  SENT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  ACCEPTED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  EXPIRED:
    "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

/** A request is "actionable" (still needs a quotation) while it's Pending. */
const OPEN_STATUSES: readonly QuotationRequestStatus[] = ["PENDING", "DRAFT"];

/* ============================================================================
 * 4. ADAPTER — maps the real backend `QuotationRequest` onto the view
 * model the UI renders. This is the only place backend field names are
 * known; every component below only knows about QuotationInquiry.
 * ==========================================================================*/

function safeArray<T>(value: unknown): readonly T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeText(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

export function mapRequestToInquiry(raw: QuotationRequest): QuotationInquiry {
  return {
    id: raw.id,
    inquiryId: raw.requestId,
    status: raw.status,
    inquiryDate: raw.createdAt,
    company: {
      companyId: raw.companyId,
      name: safeText(raw.companyName, "Unknown Company"),
      contactPerson: safeText(raw.contactPerson, "—"),
      email: safeText(raw.email, "—"),
      phone: safeText(raw.phone, "—"),
      location: safeText(raw.siteLocation, "—"),
    },
    requirement: {
      quotationType: safeText(raw.quotationType, "—"),
      numberOfSites:
        typeof raw.numberOfSites === "number" ? raw.numberOfSites : 0,
      siteNames: safeArray<string>(raw.siteNames),
      activeMachines:
        typeof raw.activeMachines === "number" ? raw.activeMachines : 0,
      equipmentTypes: safeArray<string>(raw.equipmentTypes),
      requestedServiceNames: safeArray<string>(raw.optionalServices),
      requirementDescription: safeText(
        raw.implementationRequirements,
        "No description provided.",
      ),
      otherRequirements:
        typeof raw.additionalRequirements === "string" &&
        raw.additionalRequirements.trim().length > 0
          ? raw.additionalRequirements
          : null,
    },
    // Documented limitation, not fabricated data — see TrialRequest above.
    trial: {
      requested: false,
      duration: null,
      machines: null,
      description: null,
    },
    attachmentUrl: raw.attachmentUrl ?? null,
  };
}

function buildDefaultDraft(inquiry: QuotationInquiry): QuotationDraft {
  const requestedIds = new Set(
    inquiry.requirement.requestedServiceNames
      .map(findServiceIdByName)
      .filter((id): id is string => Boolean(id)),
  );
  return {
    inquiryId: inquiry.inquiryId,
    contractDuration: CONTRACT_DURATION_OPTIONS[1],
    licensedMachineAllowance: inquiry.requirement.activeMachines,
    onceOffImplementationFee: 0,
    monthlySiteLicence: 0,
    additionalMachineCharge: 0,
    paymentTerms: PAYMENT_TERMS_OPTIONS[0],
    trialRequested: inquiry.trial.requested,
    trialDuration: inquiry.trial.duration ?? DEFAULT_TRIAL_DURATION,
    trialMachines: inquiry.trial.machines ?? DEFAULT_TRIAL_MACHINES,
    trialDescription: inquiry.trial.description ?? "",
    services: QUOTATION_SERVICES.map((s) => ({
      serviceId: s.id,
      selected: requestedIds.has(s.id),
      price: s.defaultPrice,
    })),
    notes: "",
  };
}

/* ============================================================================
 * 5. CALCULATION UTILITIES
 * ==========================================================================*/

function parseContractMonths(duration: string): number {
  const match = /^(\d+)/.exec(duration);
  return match ? parseInt(match[1], 10) : 0;
}

function computeSelectedServicesTotal(
  services: readonly SelectedService[],
): number {
  return services
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + (Number.isFinite(s.price) ? s.price : 0), 0);
}

export function computeQuotationTotals(draft: QuotationDraft): QuotationTotals {
  const additionalServicesTotal = computeSelectedServicesTotal(draft.services);
  const oneTimeTotal = draft.onceOffImplementationFee + additionalServicesTotal;
  const monthlyRecurringTotal =
    draft.monthlySiteLicence + draft.additionalMachineCharge;
  const months = parseContractMonths(draft.contractDuration);
  const contractValue = oneTimeTotal + monthlyRecurringTotal * months;
  return {
    additionalServicesTotal,
    oneTimeTotal,
    monthlyRecurringTotal,
    contractValue,
  };
}

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampPositiveInteger(n: number): number {
  const rounded = Math.round(n);
  return Number.isFinite(rounded) && rounded >= 0 ? rounded : 0;
}

function formatZAR(amount: number | null | undefined): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `R${Math.round(amount).toLocaleString("en-ZA")}`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ============================================================================
 * 6. DRAFT VALIDATION
 * ==========================================================================*/

interface DraftErrors {
  contractDuration?: string;
  licensedMachineAllowance?: string;
  paymentTerms?: string;
  trialDuration?: string;
  trialMachines?: string;
}

function validateDraft(draft: QuotationDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.contractDuration)
    errors.contractDuration = "Contract duration is required.";
  if (!draft.licensedMachineAllowance || draft.licensedMachineAllowance <= 0) {
    errors.licensedMachineAllowance = "Licensed machine allowance is required.";
  }
  if (!draft.paymentTerms) errors.paymentTerms = "Payment terms are required.";
  if (draft.trialRequested) {
    if (!draft.trialDuration)
      errors.trialDuration = "Trial duration is required.";
    if (!draft.trialMachines || draft.trialMachines <= 0) {
      errors.trialMachines = "Trial machines must be a positive integer.";
    }
  }
  return errors;
}

/* ============================================================================
 * 7. TOAST SYSTEM
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
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  const dismiss = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const success = useCallback(
    (message: string) => push("success", message),
    [push],
  );
  const error = useCallback(
    (message: string) => push("error", message),
    [push],
  );

  return useMemo(
    () => ({ toasts, success, error, dismiss }),
    [toasts, success, error, dismiss],
  );
}

function Portal({ children }: { readonly children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
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
        className="fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2"
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
              className="shrink-0 rounded p-0.5 text-current/70 hover:text-current focus-visible:outline focus-visible:outline-2"
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
 * 8. ICONS
 * ==========================================================================*/

function IconSearch(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function IconX(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M18 6 6 18M6 6l12 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconEye(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconSend(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="m22 2-7 20-4-9-9-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTrash(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSpinner(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${p.className ?? ""}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={3}
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconAlert(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconInbox(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M22 12h-6l-2 3h-4l-2-3H2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.4 5.6 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.4A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconClock(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLayers(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path
        d="m3 12 9 5 9-5M3 17l9 5 9-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconWallet(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M21 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16v-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 7V5a2 2 0 0 0-2-2H5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="13" r="1.4" />
    </svg>
  );
}

/* ============================================================================
 * 9. SMALL PRESENTATIONAL PRIMITIVES
 * ==========================================================================*/

function Chip({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

/**
 * Single badge component for every status shown in the app (Inquiry list,
 * Details drawer, Responses table). Backed 1:1 by QuotationRequestStatus —
 * there is no separate Active/Inactive badge concept anymore.
 */
function StatusBadge({ status }: { readonly status: QuotationRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly tone?: "neutral" | "primary" | "danger";
  readonly children: ReactNode;
}) {
  const toneClasses =
    tone === "primary"
      ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
      : tone === "danger"
        ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses}`}
    >
      {children}
    </button>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  readonly children: ReactNode;
  readonly required?: boolean;
}) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/50";

function FieldError({ message }: { readonly message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/* ============================================================================
 * 10. TABS
 * ==========================================================================*/

type ActiveTab = "inquiry" | "responses";

function QuotationTabs({
  active,
  onChange,
}: {
  readonly active: ActiveTab;
  readonly onChange: (tab: ActiveTab) => void;
}) {
  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "inquiry", label: "Quotation Inquiry" },
    { key: "responses", label: "Quotation Responses" },
  ];
  return (
    <div
      className="flex gap-6 border-b border-slate-200 dark:border-slate-800"
      role="tablist"
      aria-label="Quotation sections"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative -mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              isActive
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * 11. SUMMARY CARDS — computed client-side from the fetched, filtered
 * result set, since the backend envelope does not currently include a
 * summary object. All four numbers come straight from real `status`
 * values — nothing here is a guess.
 * ==========================================================================*/

function computeSummary(
  inquiries: readonly QuotationInquiry[],
): InquirySummary {
  return {
    totalInquiries: inquiries.length,
    pending: inquiries.filter((i) => i.status === "PENDING").length,
    readyToQuote: inquiries.filter((i) => i.status === "DRAFT").length,
    sent: inquiries.filter((i) => !OPEN_STATUSES.includes(i.status)).length,
  };
}

function SummaryCards({
  summary,
}: {
  readonly summary: InquirySummary | undefined;
}) {
  if (!summary) return null;
  const cards: {
    key: string;
    label: string;
    value: number;
    icon: ReactNode;
    tint: string;
  }[] = [
    {
      key: "total",
      label: "Total Inquiries",
      value: summary.totalInquiries,
      icon: <IconInbox className="h-4 w-4" />,
      tint: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      key: "pending",
      label: "Pending",
      value: summary.pending,
      icon: <IconClock className="h-4 w-4" />,
      tint: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      key: "ready",
      label: "Ready to Quote",
      value: summary.readyToQuote,
      icon: <IconLayers className="h-4 w-4" />,
      tint: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    },
    {
      key: "sent",
      label: "Sent",
      value: summary.sent,
      icon: <IconSend className="h-4 w-4" />,
      tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.tint}`}
          >
            {c.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-none text-slate-900 dark:text-white">
              {c.value}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {c.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 12. INQUIRY FILTERS
 *
 * `status` and `quotationType` here are both sent to the backend as real
 * query params (see QuotationInquiryTabContent) — this component only
 * renders the controls, it does not filter anything itself.
 * ==========================================================================*/

interface InquiryFilterState {
  readonly search: string;
  readonly status: QuotationRequestStatus | "";
  readonly quotationType: string;
}

const emptyInquiryFilters: InquiryFilterState = {
  search: "",
  status: "",
  quotationType: "",
};

function InquiryFilters({
  filters,
  onChange,
  quotationTypeOptions,
}: {
  readonly filters: InquiryFilterState;
  readonly onChange: (next: InquiryFilterState) => void;
  readonly quotationTypeOptions: readonly { label: string; value: string }[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by company name, contact person, email or inquiry ID..."
          aria-label="Search inquiries"
          className={`${inputClasses} pl-9`}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Status
          <AppSelect
            value={filters.status}
            onChange={(value) =>
              onChange({
                ...filters,
                status: value as InquiryFilterState["status"],
              })
            }
            options={STATUS_SELECT_OPTIONS}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Quotation Type
          <AppSelect
            value={filters.quotationType}
            onChange={(value) => onChange({ ...filters, quotationType: value })}
            options={quotationTypeOptions}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onChange(emptyInquiryFilters)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 13. SKELETON / EMPTY / ERROR
 * ==========================================================================*/

function TableSkeleton({
  rows = 6,
  cols = 7,
}: {
  readonly rows?: number;
  readonly cols?: number;
}) {
  return (
    <div
      className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className="h-3 flex-1 rounded bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  readonly title: string;
  readonly subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <IconInbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {title}
      </p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <IconAlert className="h-8 w-8 text-red-400" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {message}
      </p>
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
 * 14. INQUIRY TABLE
 * ==========================================================================*/

function InquiryTable({
  inquiries,
  onView,
  onSendQuotation,
}: {
  readonly inquiries: readonly QuotationInquiry[];
  readonly onView: (inquiry: QuotationInquiry) => void;
  readonly onSendQuotation: (inquiry: QuotationInquiry) => void;
}) {
  return (
    <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Inquiry ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Company
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Contact
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Sites / Machines
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Received Date
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Status
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {inquiries.map((inquiry) => {
            const isOpen = OPEN_STATUSES.includes(inquiry.status);
            return (
              <tr
                key={inquiry.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                  {inquiry.inquiryId}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {inquiry.company.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {inquiry.company.location}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-200">
                      {inquiry.company.contactPerson}
                    </span>
                    <span className="text-xs text-slate-400">
                      {inquiry.company.email}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  <div className="flex flex-col">
                    <span>{inquiry.requirement.numberOfSites} Sites</span>
                    <span className="text-xs text-slate-400">
                      {inquiry.requirement.activeMachines} Machines
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                  {formatDateTime(inquiry.inquiryDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={inquiry.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <IconButton
                      label="View inquiry"
                      onClick={() => onView(inquiry)}
                    >
                      <IconEye className="h-4 w-4" />
                    </IconButton>
                    <button
                      type="button"
                      onClick={() => onSendQuotation(inquiry)}
                      disabled={!isOpen}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <IconSend className="h-3.5 w-3.5" />
                      {isOpen ? "Send Quotation" : "View Quotation"}
                    </button>
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
 * 15. DRAWER SHELL
 * ==========================================================================*/

function DrawerShell({
  open,
  widthClassName,
  onClose,
  headerIcon,
  title,
  subtitle,
  children,
  footer,
}: {
  readonly open: boolean;
  readonly widthClassName: string;
  readonly onClose: () => void;
  readonly headerIcon: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[99999] ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close overlay"
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 right-0 flex h-full w-full ${widthClassName} flex-col bg-white shadow-2xl outline-none transition-transform duration-200 dark:bg-slate-900 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                {headerIcon}
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
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

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function SectionHeading({ children }: { readonly children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
      {children}
    </h3>
  );
}

/* ============================================================================
 * 16. INQUIRY DETAILS DRAWER (VIEW) — loads full detail via
 * getQuotationRequestById so the drawer never relies on stale list data.
 * ==========================================================================*/

function InquiryDetailsDrawer({
  inquiryId,
  open,
  onClose,
  onSendQuotation,
  onError,
}: {
  /** The real backend id (`QuotationInquiry.id`), not the display requestId. */
  readonly inquiryId: string | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSendQuotation: (inquiry: QuotationInquiry) => void;
  readonly onError: (message: string) => void;
}) {
  const [detailState, setDetailState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; inquiry: QuotationInquiry }
    | { status: "error"; message: string }
  >({ status: "idle" });

  useEffect(() => {
    if (!open || !inquiryId) {
      setDetailState({ status: "idle" });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setDetailState({ status: "loading" });
    getQuotationRequestById(inquiryId, controller.signal)
      .then((raw) => {
        if (cancelled) return;
        setDetailState({
          status: "success",
          inquiry: mapRequestToInquiry(raw),
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          extractApiError(error) ?? MESSAGES.inquiryDetailLoadError;

        setDetailState({ status: "error", message });
        onError(message);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [inquiryId, open, onError]);

  if (!open || !inquiryId) return null;

  if (detailState.status !== "success") {
    return (
      <DrawerShell
        open={open}
        widthClassName="max-w-xl"
        onClose={onClose}
        headerIcon={<IconEye className="h-4 w-4" />}
        title="Inquiry Details"
      >
        {detailState.status === "error" ? (
          <ErrorState message={detailState.message} onRetry={onClose} />
        ) : (
          <TableSkeleton rows={5} cols={2} />
        )}
      </DrawerShell>
    );
  }

  const inquiry = detailState.inquiry;
  const { company, requirement, trial } = inquiry;
  const isOpen = OPEN_STATUSES.includes(inquiry.status);

  return (
    <DrawerShell
      open={open}
      widthClassName="max-w-xl"
      onClose={onClose}
      headerIcon={<IconEye className="h-4 w-4" />}
      title="Inquiry Details"
      subtitle={inquiry.inquiryId}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onSendQuotation(inquiry)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <IconSend className="h-4 w-4" />
            {isOpen ? "Send Quotation" : "View Quotation"}
          </button>
        </>
      }
    >
      <section aria-labelledby="company-details-heading">
        <SectionHeading>Company Details</SectionHeading>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-400">Company Name</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Contact Person
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.contactPerson}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Email</dt>
            <dd className="mt-0.5 break-all text-slate-800 dark:text-slate-200">
              {company.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Phone</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.phone}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">
              Site / Location
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.location}
            </dd>
          </div>
        </dl>
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="client-requirements-heading">
        <SectionHeading>Client Requirements</SectionHeading>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Quotation Type
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {requirement.quotationType}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Number of Sites
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {requirement.numberOfSites}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Active Machines
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {requirement.activeMachines}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">
              Equipment Types
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {requirement.equipmentTypes.map((e) => (
                <Chip key={e}>{e}</Chip>
              ))}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">
              Requested Services
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {requirement.requestedServiceNames.length > 0 ? (
                requirement.requestedServiceNames.map((name) => (
                  <Chip key={name}>{name}</Chip>
                ))
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  None specified.
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="requirement-description-heading">
        <SectionHeading>Requirement Description</SectionHeading>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {requirement.requirementDescription}
        </p>
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="trial-request-heading">
        <SectionHeading>Trial Request</SectionHeading>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Trial Requested:{" "}
          <span
            className={`font-semibold ${trial.requested ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}
          >
            {trial.requested ? "Yes" : "No"}
          </span>
        </p>
        {trial.requested && (
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-400">
                Requested Trial Duration
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {trial.duration}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-400">
                Requested Trial Machines
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {trial.machines}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-400">
                Trial Description
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {trial.description}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="other-requirements-heading">
        <SectionHeading>Other Requirements</SectionHeading>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {requirement.otherRequirements ??
            "No additional requirements provided."}
        </p>
      </section>
    </DrawerShell>
  );
}

/* ============================================================================
 * 17. SEND QUOTATION DRAWER
 * ==========================================================================*/

function CommercialDetailsSection({
  draft,
  errors,
  readOnly,
  onChange,
}: {
  readonly draft: QuotationDraft;
  readonly errors: DraftErrors;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<QuotationDraft>) => void;
}) {
  return (
    <section aria-labelledby="commercial-details-heading">
      <SectionHeading>Commercial Details</SectionHeading>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <FieldLabel required>Contract Duration</FieldLabel>
          <AppSelect
            value={draft.contractDuration}
            disabled={readOnly}
            onChange={(value) => onChange({ contractDuration: value })}
            options={CONTRACT_DURATION_SELECT_OPTIONS}
          />
          <FieldError message={errors.contractDuration} />
        </div>

        <div>
          <FieldLabel required>Licensed Machine Allowance</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.licensedMachineAllowance}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                licensedMachineAllowance: clampPositiveInteger(
                  Number(e.target.value),
                ),
              })
            }
            className={inputClasses}
          />
          <FieldError message={errors.licensedMachineAllowance} />
        </div>

        <div>
          <FieldLabel>Once-Off Implementation Fee (R)</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.onceOffImplementationFee}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                onceOffImplementationFee: clampNonNegative(
                  Number(e.target.value),
                ),
              })
            }
            className={inputClasses}
          />
        </div>

        <div>
          <FieldLabel>Monthly Site Licence (R)</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.monthlySiteLicence}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                monthlySiteLicence: clampNonNegative(Number(e.target.value)),
              })
            }
            className={inputClasses}
          />
        </div>

        <div>
          <FieldLabel>Additional Machine Charge (R)</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.additionalMachineCharge}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                additionalMachineCharge: clampNonNegative(
                  Number(e.target.value),
                ),
              })
            }
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-slate-400">
            Monthly charge per machine above the allowance.
          </p>
        </div>

        <div>
          <FieldLabel required>Payment Terms</FieldLabel>
          <AppSelect
            value={draft.paymentTerms}
            disabled={readOnly}
            onChange={(value) => onChange({ paymentTerms: value })}
            options={PAYMENT_TERMS_SELECT_OPTIONS}
          />
          <FieldError message={errors.paymentTerms} />
        </div>
      </div>
    </section>
  );
}

function TrialOptionSection({
  draft,
  errors,
  readOnly,
  onChange,
}: {
  readonly draft: QuotationDraft;
  readonly errors: DraftErrors;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<QuotationDraft>) => void;
}) {
  return (
    <section aria-labelledby="trial-option-heading">
      <SectionHeading>Trial Option</SectionHeading>
      <div className="mt-3">
        <FieldLabel>Trial Requested by Client?</FieldLabel>
        <div className="flex items-center gap-6">
          {(["Yes", "No"] as const).map((opt) => {
            const isYes = opt === "Yes";
            const checked = draft.trialRequested === isYes;
            return (
              <label
                key={opt}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <span
                  onClick={() =>
                    !readOnly && onChange({ trialRequested: isYes })
                  }
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    checked
                      ? "border-blue-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {checked && (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </span>
                {opt}
              </label>
            );
          })}
        </div>
      </div>

      {draft.trialRequested && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div>
            <FieldLabel required>Trial Duration</FieldLabel>
            <AppSelect
              value={draft.trialDuration}
              disabled={readOnly}
              onChange={(value) => onChange({ trialDuration: value })}
              options={TRIAL_DURATION_SELECT_OPTIONS}
            />
            <FieldError message={errors.trialDuration} />
          </div>

          <div>
            <FieldLabel required>Trial Machines</FieldLabel>
            <input
              type="number"
              min={0}
              value={draft.trialMachines}
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  trialMachines: clampPositiveInteger(Number(e.target.value)),
                })
              }
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-slate-400">
              Default trial machines: {DEFAULT_TRIAL_MACHINES}.
            </p>
            <FieldError message={errors.trialMachines} />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Trial Description</FieldLabel>
            <textarea
              value={draft.trialDescription}
              disabled={readOnly}
              onChange={(e) => onChange({ trialDescription: e.target.value })}
              rows={2}
              className={inputClasses}
              placeholder="Client would like to evaluate the system before final implementation."
            />
          </div>
        </div>
      )}
    </section>
  );
}

function AdditionalServicesSection({
  services,
  readOnly,
  onToggle,
  onPriceChange,
  total,
}: {
  readonly services: readonly SelectedService[];
  readonly readOnly: boolean;
  readonly onToggle: (serviceId: string) => void;
  readonly onPriceChange: (serviceId: string, price: number) => void;
  readonly total: number;
}) {
  return (
    <section aria-labelledby="additional-services-heading">
      <SectionHeading>Additional Services</SectionHeading>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                Service
              </th>
              <th scope="col" className="px-4 py-2.5">
                Description
              </th>
              <th scope="col" className="px-4 py-2.5 text-center">
                Select
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Price (R)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {services.map((selection) => {
              const service = getServiceById(selection.serviceId);
              if (!service) return null;
              return (
                <tr key={service.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {service.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {service.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selection.selected}
                      disabled={readOnly}
                      onChange={() => onToggle(service.id)}
                      aria-label={`Select ${service.name}`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={selection.price}
                      disabled={readOnly || !selection.selected}
                      onChange={(e) =>
                        onPriceChange(
                          service.id,
                          clampNonNegative(Number(e.target.value)),
                        )
                      }
                      className={`${inputClasses} text-right`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <td
                colSpan={3}
                className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Total Additional Services
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                {formatZAR(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function QuotationSummarySection({
  draft,
}: {
  readonly draft: QuotationDraft;
}) {
  const totals = computeQuotationTotals(draft);
  const months = parseContractMonths(draft.contractDuration);
  return (
    <section
      aria-labelledby="quotation-summary-heading"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
    >
      <SectionHeading>Quotation Summary</SectionHeading>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="font-medium text-slate-500 dark:text-slate-400">
          One-Time Charges
        </p>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Implementation Fee</span>
          <span>{formatZAR(draft.onceOffImplementationFee)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Additional Services</span>
          <span>{formatZAR(totals.additionalServicesTotal)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
          <span>One-Time Total</span>
          <span>{formatZAR(totals.oneTimeTotal)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <p className="font-medium text-slate-500 dark:text-slate-400">
          Recurring Charges
        </p>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Monthly Site Licence</span>
          <span>{formatZAR(draft.monthlySiteLicence)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Additional Machine Charges</span>
          <span>{formatZAR(draft.additionalMachineCharge)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
          <span>Monthly Recurring Total</span>
          <span>{formatZAR(totals.monthlyRecurringTotal)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-600 px-4 py-3 text-white">
        <div>
          <p className="text-xs opacity-80">
            Total Contract Value ({months || 0} months)
          </p>
          <p className="text-lg font-semibold">
            {formatZAR(totals.contractValue)}
          </p>
        </div>
        <IconWallet className="h-6 w-6 opacity-80" />
      </div>
    </section>
  );
}

function SendQuotationDrawer({
  inquiry,
  open,
  mode,
  onClose,
  onSaveDraft,
  onRequestSend,
  onRequestDelete,
  savingState,
}: {
  readonly inquiry: QuotationInquiry | null;
  readonly open: boolean;
  readonly mode: "edit" | "view";
  readonly onClose: () => void;
  readonly onSaveDraft: (draft: QuotationDraft) => void;
  readonly onRequestSend: (draft: QuotationDraft) => void;
  readonly onRequestDelete: () => void;
  readonly savingState: "idle" | "draft" | "send" | "delete";
}) {
  const [draft, setDraft] = useState<QuotationDraft | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});

  useEffect(() => {
    if (!inquiry || !open) {
      setDraft(null);
      return;
    }
    // No dedicated pricing/draft-persistence endpoint exists in the current
    // API contract, so the commercial draft is built locally from the
    // inquiry every time the drawer opens. Swap this for a real fetch
    // (e.g. getQuotationDraft(inquiry.id)) once the backend adds one.
    setDraft(buildDefaultDraft(inquiry));
    setErrors({});
  }, [inquiry, open]);

  const patchDraft = useCallback((patch: Partial<QuotationDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const toggleService = useCallback((serviceId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) =>
          s.serviceId === serviceId ? { ...s, selected: !s.selected } : s,
        ),
      };
    });
  }, []);

  const changeServicePrice = useCallback((serviceId: string, price: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) =>
          s.serviceId === serviceId ? { ...s, price } : s,
        ),
      };
    });
  }, []);

  if (!inquiry || !draft) return null;
  const readOnly = mode === "view";
  const totals = computeQuotationTotals(draft);
  const servicesTotal = totals.additionalServicesTotal;
  const isBusy = savingState !== "idle";

  function handleSaveDraft() {
    if (!draft) return;
    onSaveDraft(draft);
  }

  function handleSendClick() {
    if (!draft) return;
    const validation = validateDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onRequestSend(draft);
  }

  return (
    <DrawerShell
      open={open}
      widthClassName="max-w-3xl"
      onClose={onClose}
      headerIcon={<IconSend className="h-4 w-4" />}
      title={readOnly ? "Quotation Details" : "Send Quotation"}
      subtitle={`${inquiry.inquiryId} · ${inquiry.company.name}`}
      footer={
        readOnly ? (
          <>
            <IconButton
              label="Delete quotation"
              tone="danger"
              onClick={onRequestDelete}
              disabled={isBusy}
            >
              {savingState === "delete" ? (
                <IconSpinner className="h-4 w-4" />
              ) : (
                <IconTrash className="h-4 w-4" />
              )}
            </IconButton>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <IconButton
              label="Delete quotation"
              tone="danger"
              onClick={onRequestDelete}
              disabled={isBusy}
            >
              {savingState === "delete" ? (
                <IconSpinner className="h-4 w-4" />
              ) : (
                <IconTrash className="h-4 w-4" />
              )}
            </IconButton>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              {savingState === "draft" && <IconSpinner className="h-4 w-4" />}
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSendClick}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingState === "send" ? (
                <IconSpinner className="h-4 w-4" />
              ) : (
                <IconSend className="h-4 w-4" />
              )}
              {savingState === "send"
                ? MESSAGES.confirmSending
                : "Send Quotation"}
            </button>
          </>
        )
      }
    >
      <div className="space-y-6">
        <section aria-labelledby="inquiry-reference-heading">
          <SectionHeading>Inquiry Reference</SectionHeading>
          <div className="mt-3 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/40">
            <ReadOnlyField label="Inquiry ID" value={inquiry.inquiryId} />
            <ReadOnlyField label="Company" value={inquiry.company.name} />
            <ReadOnlyField
              label="Contact Person"
              value={inquiry.company.contactPerson}
            />
            <ReadOnlyField label="Email" value={inquiry.company.email} />
            <ReadOnlyField label="Phone" value={inquiry.company.phone} />
            <ReadOnlyField label="Site" value={inquiry.company.location} />
            <ReadOnlyField
              label="Quotation Type"
              value={inquiry.requirement.quotationType}
            />
            <ReadOnlyField
              label="Sites"
              value={inquiry.requirement.numberOfSites}
            />
            <ReadOnlyField
              label="Active Machines"
              value={inquiry.requirement.activeMachines}
            />
          </div>
        </section>

        <hr className="border-slate-100 dark:border-slate-800" />

        <CommercialDetailsSection
          draft={draft}
          errors={errors}
          readOnly={readOnly}
          onChange={patchDraft}
        />

        <hr className="border-slate-100 dark:border-slate-800" />

        <TrialOptionSection
          draft={draft}
          errors={errors}
          readOnly={readOnly}
          onChange={patchDraft}
        />

        <hr className="border-slate-100 dark:border-slate-800" />

        <AdditionalServicesSection
          services={draft.services}
          readOnly={readOnly}
          onToggle={toggleService}
          onPriceChange={changeServicePrice}
          total={servicesTotal}
        />

        <hr className="border-slate-100 dark:border-slate-800" />

        <section aria-labelledby="description-notes-heading">
          <SectionHeading>Description / Notes</SectionHeading>
          <textarea
            value={draft.notes}
            disabled={readOnly}
            onChange={(e) => patchDraft({ notes: e.target.value })}
            rows={4}
            placeholder="Quotation description, implementation notes, special conditions..."
            className={`${inputClasses} mt-2`}
          />
        </section>

        <hr className="border-slate-100 dark:border-slate-800" />

        <QuotationSummarySection draft={draft} />
      </div>
    </DrawerShell>
  );
}

/* ============================================================================
 * 18. CONFIRMATION DIALOG (generic — reused for both Send and Delete)
 * ==========================================================================*/

function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  loadingLabel,
  tone = "primary",
  onCancel,
  onConfirm,
  loading,
}: {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly loadingLabel: string;
  readonly tone?: "primary" | "danger";
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

  const confirmClasses =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
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
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl outline-none dark:bg-slate-900"
        >
          <h2
            id="confirm-dialog-title"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            {title}
          </h2>
          <p
            id="confirm-dialog-description"
            className="mt-2 text-sm text-slate-600 dark:text-slate-400"
          >
            {description}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${confirmClasses}`}
            >
              {loading && <IconSpinner className="h-4 w-4" />}
              {loading ? loadingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ============================================================================
 * 19. QUOTATION RESPONSES TAB
 *
 * The API contract only exposes a single `/quotations/requests` resource
 * (no dedicated "responses" endpoint), so this tab is derived from the
 * same resource: any request past the Pending/Draft stage is shown here.
 * `quotationAmount` isn't part of the contract, so it renders as "—"
 * rather than a fabricated number — documented, not invented.
 * ==========================================================================*/

interface ResponseFilterState {
  readonly search: string;
  readonly status: QuotationRequestStatus | "";
}

const emptyResponseFilters: ResponseFilterState = { search: "", status: "" };

function ResponseFilters({
  filters,
  onChange,
}: {
  readonly filters: ResponseFilterState;
  readonly onChange: (next: ResponseFilterState) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by quotation ID, inquiry ID or company..."
          aria-label="Search quotation responses"
          className={`${inputClasses} pl-9`}
        />
      </div>
      <AppSelect
        value={filters.status}
        onChange={(value) =>
          onChange({
            ...filters,
            status: value as ResponseFilterState["status"],
          })
        }
        options={RESPONSE_STATUS_SELECT_OPTIONS}
        className="sm:w-48"
      />
      <button
        type="button"
        onClick={() => onChange(emptyResponseFilters)}
        className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Reset
      </button>
    </div>
  );
}

interface QuotationResponseRow {
  readonly quotationId: string;
  readonly inquiryId: string;
  readonly companyName: string;
  readonly sentDate: string;
  readonly quotationAmount: number | null;
  readonly status: QuotationRequestStatus;
  readonly responseDate: string | null;
  readonly inquiry: QuotationInquiry;
}

function ResponsesTable({
  responses,
  onView,
}: {
  readonly responses: readonly QuotationResponseRow[];
  readonly onView: (row: QuotationResponseRow) => void;
}) {
  return (
    <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Quotation ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Inquiry ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Company
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Sent Date
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Quotation Amount
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Status
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Response Date
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {responses.map((r) => (
            <tr
              key={r.quotationId}
              className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                {r.quotationId}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                {r.inquiryId}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                {r.companyName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                {formatDateTime(r.sentDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                {formatZAR(r.quotationAmount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                {r.responseDate ? formatDateTime(r.responseDate) : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <IconButton
                  label="View quotation"
                  tone="primary"
                  onClick={() => onView(r)}
                >
                  <IconEye className="h-4 w-4" />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * 20. REQUEST-STATE MODEL (shared by both tabs)
 * ==========================================================================*/

type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 400;

/* ============================================================================
 * 21. QUOTATION INQUIRY TAB — wired to GET /quotations/requests via
 * getQuotationRequestsWithMeta(). `status`, `quotationType` and `search`
 * are all sent to the backend as real query params — filtering happens
 * server-side, this component performs zero client-side status filtering.
 * The backend contract doesn't return pagination metadata, so the
 * filtered result set is paginated client-side for display only.
 * ==========================================================================*/

function QuotationInquiryTabContent({
  onView,
  onSendQuotation,
  refreshTick,
}: {
  readonly onView: (inquiry: QuotationInquiry) => void;
  readonly onSendQuotation: (inquiry: QuotationInquiry) => void;
  readonly refreshTick: number;
}) {
  const [listState, setListState] = useState<
    RequestState<readonly QuotationInquiry[]>
  >({ status: "idle" });
  const [listMessage, setListMessage] = useState<string>("");
  const [filters, setFilters] =
    useState<InquiryFilterState>(emptyInquiryFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.quotationType]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchInquiries() {
      setListState({ status: "loading" });
      try {
        const result = await getQuotationRequestsWithMeta(
          {
            status: (filters.status || undefined) as
              | QuotationRequestStatus
              | undefined,
            quotationType: filters.quotationType || undefined,
            search: debouncedSearch || undefined,
          },
          controller.signal,
        );
        if (cancelled) return;
        setListState({
          status: "success",
          data: (result.data ?? []).map(mapRequestToInquiry),
        });
        setListMessage(result.message ?? "");
      } catch (error) {
        if (
          cancelled ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        const message = extractApiError(error) ?? MESSAGES.inquiriesLoadError;

        setListState({
          status: "error",
          message,
        });
      }
    }

    fetchInquiries();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedSearch, filters.status, filters.quotationType, refreshTick]);

  const allInquiries = listState.status === "success" ? listState.data : [];
  const totalRecords = allInquiries.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const pageInquiries = useMemo(
    () => allInquiries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allInquiries, page],
  );
  const summary = useMemo(() => computeSummary(allInquiries), [allInquiries]);

  // Derived from the currently-loaded (filtered) page of real backend data.
  // TODO(backend): once a dedicated `/quotations/quotation-types` (or
  // similar) endpoint exists, replace this derivation with a real fetch so
  // the dropdown always shows every type in the system, not just the ones
  // present in the current result set.
  const quotationTypeOptions = useMemo(() => {
    const unique = Array.from(
      new Set(allInquiries.map((i) => i.requirement.quotationType)),
    ).filter(Boolean);
    return [
      { label: "All", value: "" },
      ...unique.map((t) => ({ label: t, value: t })),
    ];
  }, [allInquiries]);

  const handleRetry = useCallback(() => {
    setFilters((f) => ({ ...f }));
  }, []);

  const body = useMemo(() => {
    if (listState.status === "loading" || listState.status === "idle")
      return <TableSkeleton />;
    if (listState.status === "error")
      return <ErrorState message={listState.message} onRetry={handleRetry} />;
    if (pageInquiries.length === 0)
      return (
        <EmptyState
          title={MESSAGES.emptyInquiriesTitle}
          subtitle={listMessage || MESSAGES.emptyInquiriesSubtitle}
        />
      );
    return (
      <InquiryTable
        inquiries={pageInquiries}
        onView={onView}
        onSendQuotation={onSendQuotation}
      />
    );
  }, [
    listState,
    pageInquiries,
    listMessage,
    handleRetry,
    onView,
    onSendQuotation,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards
        summary={listState.status === "success" ? summary : undefined}
      />
      <InquiryFilters
        filters={filters}
        onChange={setFilters}
        quotationTypeOptions={quotationTypeOptions}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {body}
        {listState.status === "success" && pageInquiries.length > 0 && (
          <CommonPagination
            page={page}
            totalPages={totalPages}
            totalRecords={totalRecords}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 22. QUOTATION RESPONSES TAB
 * ==========================================================================*/

function toResponseRow(inquiry: QuotationInquiry): QuotationResponseRow | null {
  if (OPEN_STATUSES.includes(inquiry.status)) return null;
  return {
    quotationId: inquiry.inquiryId,
    inquiryId: inquiry.inquiryId,
    companyName: inquiry.company.name,
    sentDate: inquiry.inquiryDate,
    quotationAmount: null,
    status: inquiry.status,
    responseDate: inquiry.status === "SENT" ? null : inquiry.inquiryDate,
    inquiry,
  };
}

function QuotationResponsesTabContent({
  onView,
  refreshTick,
}: {
  readonly onView: (inquiry: QuotationInquiry) => void;
  readonly refreshTick: number;
}) {
  const [listState, setListState] = useState<
    RequestState<readonly QuotationInquiry[]>
  >({ status: "idle" });
  const [filters, setFilters] =
    useState<ResponseFilterState>(emptyResponseFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(filters.search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function fetchResponses() {
      setListState({ status: "loading" });
      try {
        const result = await getQuotationRequestsWithMeta(
          {
            status: (filters.status || undefined) as
              | QuotationRequestStatus
              | undefined,
            search: debouncedSearch || undefined,
          },
          controller.signal,
        );
        if (cancelled) return;
        setListState({
          status: "success",
          data: (result.data ?? []).map(mapRequestToInquiry),
        });
      } catch (error) {
        if (
          cancelled ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        const message = extractApiError(error) ?? MESSAGES.responsesLoadError;

        setListState({
          status: "error",
          message,
        });
      }
    }

    fetchResponses();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedSearch, filters.status, refreshTick]);

  const responses = useMemo(() => {
    if (listState.status !== "success") return [];
    return listState.data
      .map(toResponseRow)
      .filter((r): r is QuotationResponseRow => r !== null);
  }, [listState]);

  const handleRetry = useCallback(() => setFilters((f) => ({ ...f })), []);

  const body = useMemo(() => {
    if (listState.status === "loading" || listState.status === "idle")
      return <TableSkeleton cols={7} />;
    if (listState.status === "error")
      return <ErrorState message={listState.message} onRetry={handleRetry} />;
    if (responses.length === 0)
      return (
        <EmptyState
          title={MESSAGES.emptyResponsesTitle}
          subtitle={MESSAGES.emptyResponsesSubtitle}
        />
      );
    return (
      <ResponsesTable
        responses={responses}
        onView={(row) => onView(row.inquiry)}
      />
    );
  }, [listState, responses, handleRetry, onView]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Quotation Responses
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track sent quotations and their client responses.
        </p>
      </div>

      <ResponseFilters filters={filters} onChange={setFilters} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {body}
      </div>
    </div>
  );
}

/* ============================================================================
 * 23. MAIN PAGE
 * ==========================================================================*/

export default function QuotationManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("inquiry");

  const [selectedInquiry, setSelectedInquiry] =
    useState<QuotationInquiry | null>(null);
  const [detailsInquiryId, setDetailsInquiryId] = useState<string | null>(null);
  const [isInquiryDetailsOpen, setIsInquiryDetailsOpen] = useState(false);
  const [isSendQuotationOpen, setIsSendQuotationOpen] = useState(false);
  const [sendDrawerMode, setSendDrawerMode] = useState<"edit" | "view">("edit");
  const [savingState, setSavingState] = useState<
    "idle" | "draft" | "send" | "delete"
  >("idle");
  const [pendingSendDraft, setPendingSendDraft] =
    useState<QuotationDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const toast = useToastState();

  const handleView = useCallback((inquiry: QuotationInquiry) => {
    setDetailsInquiryId(inquiry.id);
    setIsInquiryDetailsOpen(true);
  }, []);

  const handleOpenSendQuotation = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
    setSendDrawerMode(OPEN_STATUSES.includes(inquiry.status) ? "edit" : "view");
    setIsInquiryDetailsOpen(false);
    setIsSendQuotationOpen(true);
  }, []);

  const handleViewResponse = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
    setSendDrawerMode("view");
    setIsSendQuotationOpen(true);
  }, []);

  const closeAllDrawers = useCallback(() => {
    setIsInquiryDetailsOpen(false);
    setDetailsInquiryId(null);
    setIsSendQuotationOpen(false);
    setSelectedInquiry(null);
    setPendingSendDraft(null);
    setPendingDelete(false);
  }, []);

  const handleSaveDraft = useCallback(
    async (draft: QuotationDraft) => {
      if (!selectedInquiry) return;
      setSavingState("draft");
      try {
        // The pricing fields on `draft` (fees, licence, services, notes)
        // aren't part of the current request contract — only its
        // lifecycle `status` is (see UpdateQuotationRequestPayload in
        // quotationService.ts). Persisting the full commercial draft
        // needs a dedicated backend field/endpoint; until then this call
        // moves the request into the "Draft" state so it shows up as
        // Ready to Quote. See CONTRACT_DURATION_OPTIONS etc. above for the
        // same limitation on the commercial-config side.
        const result = await updateQuotationRequest(selectedInquiry.id, {
          status: "DRAFT",
        });
        toast.success(result.message || MESSAGES.draftSaveSuccess);
        setIsSendQuotationOpen(false);
        setSelectedInquiry(null);
        setRefreshTick((t) => t + 1);
      } catch (error) {
       toast.error(
  extractApiError(error) ?? MESSAGES.draftSaveError
);
      } finally {
        setSavingState("idle");
      }
    },
    [selectedInquiry, toast],
  );

  const handleRequestSend = useCallback((draft: QuotationDraft) => {
    setPendingSendDraft(draft);
  }, []);

  const handleConfirmSend = useCallback(async () => {
    if (!selectedInquiry || !pendingSendDraft) return;
    setSavingState("send");
    try {
      const result = await updateQuotationRequest(selectedInquiry.id, {
        status: "SENT",
      });
      toast.success(result.message || MESSAGES.sendSuccess);
      setPendingSendDraft(null);
      setIsSendQuotationOpen(false);
      setSelectedInquiry(null);
      setRefreshTick((t) => t + 1);
    } catch (error) {
     toast.error(
  extractApiError(error) ?? MESSAGES.sendError
);
    } finally {
      setSavingState("idle");
    }
  }, [selectedInquiry, pendingSendDraft, toast]);

  const handleRequestDelete = useCallback(() => {
    setPendingDelete(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedInquiry || savingState === "delete") return;
    setSavingState("delete");
    try {
      const result = await deleteQuotationRequest(selectedInquiry.id);
      toast.success(result.message || MESSAGES.deleteSuccess);
      setPendingDelete(false);
      closeAllDrawers();
      setRefreshTick((t) => t + 1);
    } catch (error) {
      toast.error(
  extractApiError(error) ?? MESSAGES.deleteError
);
    } finally {
      setSavingState("idle");
    }
  }, [selectedInquiry, savingState, toast, closeAllDrawers]);

  const handleDetailsError = useCallback(
    (message: string) => {
      toast.error(message);
    },
    [toast],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <QuotationTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === "inquiry" ? (
        <QuotationInquiryTabContent
          onView={handleView}
          onSendQuotation={handleOpenSendQuotation}
          refreshTick={refreshTick}
        />
      ) : (
        <QuotationResponsesTabContent
          onView={handleViewResponse}
          refreshTick={refreshTick}
        />
      )}

      <InquiryDetailsDrawer
        inquiryId={detailsInquiryId}
        open={isInquiryDetailsOpen}
        onClose={closeAllDrawers}
        onSendQuotation={handleOpenSendQuotation}
        onError={handleDetailsError}
      />

      <SendQuotationDrawer
        inquiry={selectedInquiry}
        open={isSendQuotationOpen}
        mode={sendDrawerMode}
        onClose={closeAllDrawers}
        onSaveDraft={handleSaveDraft}
        onRequestSend={handleRequestSend}
        onRequestDelete={handleRequestDelete}
        savingState={savingState}
      />

      {pendingSendDraft && selectedInquiry && (
        <ConfirmationDialog
          title={MESSAGES.confirmSendTitle}
          description={`Are you sure you want to send this quotation to ${selectedInquiry.company.name}?`}
          confirmLabel={MESSAGES.confirmSendAction}
          loadingLabel={MESSAGES.confirmSending}
          tone="primary"
          onCancel={() => setPendingSendDraft(null)}
          onConfirm={handleConfirmSend}
          loading={savingState === "send"}
        />
      )}

      {pendingDelete && selectedInquiry && (
        <ConfirmationDialog
          title={MESSAGES.confirmDeleteTitle}
          description={MESSAGES.confirmDeleteBody.replace(
            "{company}",
            selectedInquiry.company.name,
          )}
          confirmLabel={MESSAGES.confirmDeleteAction}
          loadingLabel={MESSAGES.confirmDeleting}
          tone="danger"
          onCancel={() => setPendingDelete(false)}
          onConfirm={handleConfirmDelete}
          loading={savingState === "delete"}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
