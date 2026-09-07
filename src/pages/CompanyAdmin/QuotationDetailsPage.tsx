import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Download,
  FileCheck2,
  FileText,
  Layers,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

import {
  extractApiError,
  getQuotationRequestsWithMeta,
  type QuotationRequest,
} from "../../services/Quotation/quotationService";

/* ============================================================================
   FALLBACK QUOTATION
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
   HELPERS & NORMALIZATION
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

const formatDate = (value: string | null | undefined): string => {
  if (!value || typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

const formatFullDate = (value: string | null | undefined): string => {
  if (!value || typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
};

/* ============================================================================
   STATUS BADGE COMPONENT
============================================================================ */

function StatusBadge({ status }: { readonly status: string }) {
  const norm = status.toUpperCase().trim();

  if (norm === "APPROVED" || norm === "ACCEPTED" || norm === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/40">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
        </span>
        Approved & Active
      </span>
    );
  }

  if (norm === "PENDING" || norm === "PENDING_REVIEW") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
        <Clock className="h-3 w-3" />
        Pending Super Admin Approval
      </span>
    );
  }

  if (norm === "SENT") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-bold text-blue-300 ring-1 ring-blue-400/40">
        <Zap className="h-3 w-3" />
        Quotation Sent
      </span>
    );
  }

  if (norm === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3.5 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-400/40">
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
      {status || "Draft"}
    </span>
  );
}

/* ============================================================================
   SKELETON LOADER
============================================================================ */

function DetailsSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="h-44 w-full animate-pulse rounded-2xl bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-48 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="space-y-6">
          <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

const QuotationDetailsPage: React.FC = () => {
  const [quotation, setQuotation] = useState<QuotationRequest>(EMPTY_QUOTATION);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchCurrentQuotation = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await getQuotationRequestsWithMeta(undefined, signal);
      if (signal.aborted) return;

      const data = Array.isArray(result?.data) ? result.data : [];
      setQuotation(
        data.length > 0 ? normalizeQuotation(data[0]) : EMPTY_QUOTATION,
      );
    } catch (requestError: unknown) {
      if (signal.aborted) return;
      const { message } = extractApiError(requestError);
      setErrorMessage(message || "Failed to load quotation details.");
      setQuotation(EMPTY_QUOTATION);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCurrentQuotation(controller.signal);
    return () => controller.abort();
  }, [fetchCurrentQuotation, reloadToken]);

  const handleCopyId = () => {
    if (!quotation.requestId) return;
    navigator.clipboard.writeText(quotation.requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  const isTrial =
    quotation.quotationType?.toLowerCase().includes("trial") ||
    quotation.quotationType?.toLowerCase().includes("demo");

  const isApproved =
    quotation.status?.toUpperCase() === "APPROVED" ||
    quotation.status?.toUpperCase() === "ACCEPTED";

  // Calculate activation start and end
  const startDate = isApproved
    ? quotation.updatedAt
      ? new Date(quotation.updatedAt)
      : new Date()
    : quotation.createdAt
      ? new Date(quotation.createdAt)
      : new Date();

  const durationDays = quotation.contractDuration
    ? parseInt(quotation.contractDuration, 10) || 5
    : 5;

  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return (
    <div className="w-full space-y-6">
      {/* Error alert if any */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setReloadToken((prev) => prev + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* ====================================================================
          HERO EXECUTIVE BANNER
      ==================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
                {isTrial ? (
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-blue-300" />
                )}
                {quotation.quotationType || "Standard Quotation"}
              </span>
              <StatusBadge status={quotation.status} />
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {quotation.requestId || "REQ-NO-ID"}
              </h1>
              {quotation.requestId && (
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy Request ID"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            <p className="text-sm font-medium text-slate-300">
              Submitted for{" "}
              <span className="font-bold text-white">
                {quotation.companyName || "HME Mining Corp"}
              </span>{" "}
              · Created on {formatDate(quotation.createdAt)}
            </p>
          </div>

          {/* Key KPI Metric Chips */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
                Machines
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.activeMachines || 1} Units
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                Sites
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.numberOfSites || 1} Location
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md sm:col-span-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-yellow-400" />
                Duration
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.contractDuration || "5 Days"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TWO-COLUMN MAIN CONTENT
      ==================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: 2 Cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Equipment & Machine Scope */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Machine & Equipment Scope
                  </h2>
                  <p className="text-xs text-slate-500">
                    Target machinery and site allocations for this evaluation
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {quotation.activeMachines} Machines Assigned
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Active Machines Limit
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {quotation.activeMachines}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Telemetry / Health Nodes
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Site Deployments
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {quotation.numberOfSites}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {quotation.siteLocation || "Primary Mining Zone"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sites Tags */}
            <div className="mt-5">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Designated Sites & Equipment
              </p>
              <div className="flex flex-wrap gap-2">
                {quotation.siteNames.length > 0 ? (
                  quotation.siteNames.map((site, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {site}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {quotation.siteLocation || "All Active Site Locations"}
                  </span>
                )}

                {quotation.equipmentTypes.map((eq, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Card 2: Services & Requirements */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Included Features & Services
                </h2>
                <p className="text-xs text-slate-500">
                  Optional services and technical requirements for this evaluation
                </p>
              </div>
            </div>

            {/* Optional Services Chips */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Selected Add-on Services
              </p>
              {quotation.optionalServices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {quotation.optionalServices.map((svc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {svc}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic">
                  Standard package telemetry & health diagnostics included.
                </p>
              )}
            </div>

            {/* Requirements Spec box */}
            <div className="space-y-4">
              {quotation.implementationRequirements && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Implementation Requirements
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {quotation.implementationRequirements}
                  </p>
                </div>
              )}

              {quotation.additionalRequirements && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Additional Notes & Specifications
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {quotation.additionalRequirements}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Card 3: Attachments */}
          {quotation.attachmentUrl && (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {quotation.attachmentFileName || "Quotation-Document.pdf"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Uploaded specification attachment
                    </p>
                  </div>
                </div>
                <a
                  href={quotation.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: 1 Col (Sidebar) */}
        <div className="space-y-6">
          {/* Timeline & Lifecycle Status Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Evaluation Lifecycle
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time status & duration tracker
                </p>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="space-y-5">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="h-full w-0.5 bg-emerald-200 dark:bg-emerald-800/60" />
                </div>
                <div className="pb-4">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Request Submitted
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {formatFullDate(quotation.createdAt)}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${
                      isApproved ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  >
                    {isApproved ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <div className="h-full w-0.5 bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="pb-4">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {isApproved
                      ? "Super Admin Approved & Activated"
                      : "Pending Super Admin Approval"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isApproved
                      ? formatFullDate(quotation.updatedAt)
                      : "Awaiting review"}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ${
                      isApproved ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {isApproved ? "Demo Evaluation Active" : "5 Days Evaluation Window"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isApproved
                      ? `${formatDate(startDate.toISOString())} to ${formatDate(endDate.toISOString())} (${durationDays} Days)`
                      : "Starts automatically upon approval"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetailsPage;