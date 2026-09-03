import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  MapPin,
  Package,
} from "lucide-react";

import {
  extractApiError,
  getQuotationRequestsWithMeta,
  type QuotationRequest,
} from "../../services/Quotation/quotationService";

/* ============================================================================
   EMPTY / FALLBACK QUOTATION
   Rendered whenever the backend responds with an empty list, so the page
   layout stays fully intact — individual fields simply render blank
   instead of the whole page disappearing.
============================================================================ */

const EMPTY_QUOTATION: QuotationRequest = {
  id: "",
  requestId: "",
  userId: "",
  companyId: "",
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  siteLocation: "",
  quotationType: "",
  numberOfSites: 0,
  siteNames: [],
  activeMachines: 0,
  equipmentTypes: [],
  contractDuration: "",
  optionalServices: [],
  implementationRequirements: "",
  additionalRequirements: "",
  attachmentUrl: null,
  attachmentFileName: null,
  attachmentFileType: null,
  attachmentSize: null,
  status: "",
  createdAt: "",
  updatedAt: "",
};

/* ============================================================================
   API RESPONSE STATE
   A single, generic shape that carries whatever the backend actually
   returned (statusCode + message), for ANY outcome — 200, 201, 400,
   401, 404, 500, network failure, etc. Nothing below is status-specific;
   one code path renders whatever the backend sent.
============================================================================ */

type ApiOutcome = "success" | "error";

interface ApiResponseState {
  outcome: ApiOutcome;
  statusCode: number | null;
  message: string;
}

/* ============================================================================
   TYPES
============================================================================ */

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

interface DetailItemProps {
  label: string;
  value: string | number | null | undefined;
}

/* ============================================================================
   SECTION CARD
============================================================================ */

const SectionCard: React.FC<SectionCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  children,
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={18} strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            {title}
          </h2>

          {subtitle !== undefined ? (
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
};

/* ============================================================================
   DETAIL ITEM
============================================================================ */

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  const displayValue =
    typeof value === "string"
      ? value.trim()
      : value !== null && value !== undefined
        ? String(value).trim()
        : "";

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">
        {displayValue.length > 0 ? displayValue : "—"}
      </p>
    </div>
  );
};

/* ============================================================================
   EMPTY LIST PLACEHOLDER
   Field-level UX microcopy (not a backend status message) — same as any
   production app shows for an empty section of a form/detail view.
============================================================================ */

interface EmptyListRowProps {
  message: string;
}

const EmptyListRow: React.FC<EmptyListRowProps> = ({ message }) => {
  return <p className="py-2 text-sm font-medium text-slate-400">{message}</p>;
};

/* ============================================================================
   LOADING STATE
============================================================================ */

const DetailsSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {[1, 2, 3, 4].map((section) => (
        <div
          key={section}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-200" />

            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-slate-200" />
              <div className="h-3 w-52 rounded bg-slate-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-4 w-32 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================================================
   API STATUS BANNER
   Renders WHATEVER the backend returned — statusCode + message — using
   one unified layout. Success (200/201) gets a neutral tone, any error
   status (400/401/403/404/409/422/500, etc.) gets an error tone. No
   per-status-code custom copy anywhere: the text on screen is always
   response.message, taken as-is from the backend.
============================================================================ */

interface ApiStatusBannerProps {
  state: ApiResponseState;
  onRetry?: () => void;
}

const ApiStatusBanner: React.FC<ApiStatusBannerProps> = ({
  state,
  onRetry,
}) => {
  const isError = state.outcome === "error";

  const Icon = isError
    ? AlertTriangle
    : state.statusCode !== null
      ? CheckCircle2
      : Info;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isError ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={18}
          strokeWidth={2}
          className={isError ? "mt-0.5 text-red-600" : "mt-0.5 text-slate-500"}
        />

        <div className="min-w-0">
          <p
            className={`text-sm font-medium leading-5 ${
              isError ? "text-red-700" : "text-slate-600"
            }`}
          >
            {state.message}
          </p>

          {state.statusCode !== null ? (
            <p className="mt-0.5 text-xs text-slate-400">
              Status: {state.statusCode}
            </p>
          ) : null}
        </div>
      </div>

      {isError && onRetry !== undefined ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex w-fit shrink-0 items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
};

/* ============================================================================
   DATE FORMATTER
============================================================================ */

const formatDate = (value: string | null | undefined): string => {
  if (!value || typeof value !== "string") {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(date);
};

/* ============================================================================
   SAFE API DATA NORMALIZATION
   Normalize nullable API fields before rendering. The API request and service
   integration are unchanged; this only prevents null values from crashing the UI.
============================================================================ */

const toSafeString = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const toSafeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const normalizeQuotation = (
  raw: Partial<QuotationRequest> | null | undefined,
): QuotationRequest => ({
  ...EMPTY_QUOTATION,
  ...raw,
  id: toSafeString(raw?.id),
  requestId: toSafeString(raw?.requestId),
  userId: toSafeString(raw?.userId),
  companyId: toSafeString(raw?.companyId),
  companyName: toSafeString(raw?.companyName),
  contactPerson: toSafeString(raw?.contactPerson),
  email: toSafeString(raw?.email),
  phone: toSafeString(raw?.phone),
  siteLocation: toSafeString(raw?.siteLocation),
  quotationType: toSafeString(raw?.quotationType),
  numberOfSites:
    typeof raw?.numberOfSites === "number" && Number.isFinite(raw.numberOfSites)
      ? raw.numberOfSites
      : 0,
  siteNames: toSafeStringArray(raw?.siteNames),
  activeMachines:
    typeof raw?.activeMachines === "number" && Number.isFinite(raw.activeMachines)
      ? raw.activeMachines
      : 0,
  equipmentTypes: toSafeStringArray(raw?.equipmentTypes),
  contractDuration: toSafeString(raw?.contractDuration),
  optionalServices: toSafeStringArray(raw?.optionalServices),
  implementationRequirements: toSafeString(raw?.implementationRequirements),
  additionalRequirements: toSafeString(raw?.additionalRequirements),
  attachmentUrl: raw?.attachmentUrl ?? null,
  attachmentFileName: raw?.attachmentFileName ?? null,
  attachmentFileType: raw?.attachmentFileType ?? null,
  attachmentSize: raw?.attachmentSize ?? null,
  status: toSafeString(raw?.status),
  createdAt: toSafeString(raw?.createdAt),
  updatedAt: toSafeString(raw?.updatedAt),
});

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

const QuotationDetailsPage: React.FC = () => {
  const [quotation, setQuotation] = useState<QuotationRequest>(EMPTY_QUOTATION);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiState, setApiState] = useState<ApiResponseState | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const fetchCurrentQuotation = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);

    try {
      const result = await getQuotationRequestsWithMeta(undefined, signal);

      if (signal.aborted) {
        return;
      }

      const data = Array.isArray(result?.data) ? result.data : [];

      setQuotation(
        data.length > 0
          ? normalizeQuotation(data[0])
          : EMPTY_QUOTATION,
      );

      setApiState({
        outcome: "success",
        statusCode:
          typeof result?.statusCode === "number" ? result.statusCode : null,
        message:
          typeof result?.message === "string" ? result.message : "Request completed.",
      });
    } catch (requestError: unknown) {
      if (signal.aborted) {
        return;
      }

      const { message, statusCode } = extractApiError(requestError);

      setQuotation(EMPTY_QUOTATION);
      setApiState({
        outcome: "error",
        statusCode,
        message,
      });
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetchCurrentQuotation(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchCurrentQuotation, reloadToken]);

  const handleRetry = (): void => {
    setReloadToken((previous) => previous + 1);
  };

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  /* ==========================================================================
     UI — ALWAYS RENDERED
     The backend's own message/statusCode drives the banner at the top,
     for every outcome (200, 201, 400, 401, 404, 500, ...). The page
     structure below stays visible regardless — fields render blank
     when there is no data, instead of the page disappearing.
  ========================================================================== */

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {apiState !== null ? (
        <ApiStatusBanner
          state={apiState}
          onRetry={apiState.outcome === "error" ? handleRetry : undefined}
        />
      ) : null}

      {/* ======================================================================
          QUOTATION INFORMATION
      ====================================================================== */}

      <SectionCard
        icon={FileText}
        title="Quotation Information"
        subtitle="Information submitted with your quotation request"
      >
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Request ID
            </p>

            <p className="mt-1 break-all text-lg font-bold tracking-tight text-slate-900">
              {quotation.requestId?.trim().length > 0
                ? quotation.requestId
                : "—"}
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Clock3 size={14} strokeWidth={2} />

            {quotation.status?.trim().length > 0 ? quotation.status : "—"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem
            label="Quotation Date"
            value={formatDate(quotation.createdAt)}
          />

          <DetailItem label="Quotation Type" value={quotation.quotationType} />

          <DetailItem
            label="Contract Duration"
            value={quotation.contractDuration}
          />

          <DetailItem
            label="Updated At"
            value={formatDate(quotation.updatedAt)}
          />
        </div>
      </SectionCard>

      {/* ======================================================================
          COMPANY INFORMATION
      ====================================================================== */}

      <SectionCard
        icon={Building2}
        title="Company Information"
        subtitle="Company information associated with this quotation"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Company Name" value={quotation.companyName} />

          <DetailItem label="Contact Person" value={quotation.contactPerson} />

          <DetailItem label="Email" value={quotation.email} />

          <DetailItem label="Phone" value={quotation.phone} />

          <DetailItem label="Site Location" value={quotation.siteLocation} />

          <DetailItem
            label="Number of Sites"
            value={String(quotation.numberOfSites)}
          />
        </div>
      </SectionCard>

      {/* ======================================================================
          SITE INFORMATION
      ====================================================================== */}

      <SectionCard
        icon={MapPin}
        title="Site Information"
        subtitle="Sites included in this quotation request"
      >
        {quotation.siteNames.length === 0 ? (
          <EmptyListRow message="No sites added." />
        ) : (
          quotation.siteNames.filter(Boolean).map((siteName, index) => (
            <div
              key={`${siteName}-${index}`}
              className="flex items-center gap-3 border-b border-slate-100 py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <MapPin size={16} strokeWidth={2} />
              </div>

              <p className="text-sm font-medium text-slate-800">{siteName}</p>
            </div>
          ))
        )}
      </SectionCard>

      {/* ======================================================================
          EQUIPMENT REQUIREMENTS
      ====================================================================== */}

      <SectionCard
        icon={Package}
        title="Equipment Requirements"
        subtitle="Equipment requested in the quotation"
      >
        <div className="mb-5">
          <DetailItem
            label="Active Machines"
            value={String(quotation.activeMachines)}
          />
        </div>

        {quotation.equipmentTypes.length === 0 ? (
          <EmptyListRow message="No equipment types added." />
        ) : (
          quotation.equipmentTypes.filter(Boolean).map((equipmentType, index) => (
            <div
              key={`${equipmentType}-${index}`}
              className="flex items-center gap-3 border-b border-slate-100 py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <Package size={16} strokeWidth={2} />
              </div>

              <p className="text-sm font-semibold text-slate-900">
                {equipmentType}
              </p>
            </div>
          ))
        )}
      </SectionCard>

      {/* ======================================================================
          SERVICE REQUIREMENTS
      ====================================================================== */}

      <SectionCard
        icon={FileText}
        title="Service Requirements"
        subtitle="Optional services requested with the quotation"
      >
        {quotation.optionalServices.length === 0 ? (
          <EmptyListRow message="No optional services selected." />
        ) : (
          quotation.optionalServices.filter(Boolean).map((service, index) => (
            <div
              key={`${service}-${index}`}
              className="flex items-center gap-3 border-b border-slate-100 py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <FileText size={16} strokeWidth={2} />
              </div>

              <p className="text-sm font-semibold text-slate-900">{service}</p>
            </div>
          ))
        )}
      </SectionCard>

      {/* ======================================================================
          REQUIREMENTS
      ====================================================================== */}

      <SectionCard
        icon={FileText}
        title="Requirements"
        subtitle="Requirements submitted with the quotation"
      >
        <div className="grid grid-cols-1 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Implementation Requirements
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {quotation.implementationRequirements?.trim().length > 0
                ? quotation.implementationRequirements
                : "—"}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Additional Requirements
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {quotation.additionalRequirements?.trim().length > 0
                ? quotation.additionalRequirements
                : "—"}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ======================================================================
          ATTACHMENT
      ====================================================================== */}

      <SectionCard icon={FileText} title="Attachment">
        {quotation.attachmentUrl !== null && quotation.attachmentUrl !== "" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-all text-sm font-semibold text-slate-900">
                {quotation.attachmentFileName ?? quotation.attachmentUrl}
              </p>

              {quotation.attachmentFileType !== null &&
              quotation.attachmentFileType !== "" ? (
                <p className="mt-1 text-xs text-slate-500">
                  {quotation.attachmentFileType}
                </p>
              ) : null}

              {quotation.attachmentSize !== null ? (
                <p className="mt-1 text-xs text-slate-500">
                  {quotation.attachmentSize}
                </p>
              ) : null}
            </div>

            <a
              href={quotation.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View attachment"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-50"
            >
              <FileText size={16} strokeWidth={2} />
              View Attachment
            </a>
          </div>
        ) : (
          <EmptyListRow message="No attachment provided." />
        )}
      </SectionCard>

      {/* ======================================================================
          CURRENT STATUS
      ====================================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CalendarDays size={16} strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Current Quotation Status
            </p>

            <p className="mt-1 text-sm font-semibold text-blue-600">
              {quotation.status?.trim().length > 0 ? quotation.status : "—"}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {formatDate(quotation.updatedAt)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuotationDetailsPage;