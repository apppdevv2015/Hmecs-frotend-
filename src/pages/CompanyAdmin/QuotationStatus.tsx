import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
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

/* ============================================================
   FALLBACK DATA
============================================================ */

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

/* ============================================================
   HELPERS & FORMATTERS
============================================================ */

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

/* ============================================================
   MAIN COMPONENT
============================================================ */

const QuotationStatus: React.FC = () => {
  const [quotation, setQuotation] = useState<QuotationRequest>(EMPTY_QUOTATION);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchStatus = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await getQuotationRequestsWithMeta(undefined, signal);
      if (signal.aborted) return;

      const data = Array.isArray(result?.data) ? result.data : [];
      if (data.length > 0) {
        setQuotation(data[0]);
      } else {
        setQuotation(EMPTY_QUOTATION);
      }
    } catch (err: unknown) {
      if (signal.aborted) return;
      const { message } = extractApiError(err);
      setErrorMessage(message || "Failed to load quotation status.");
      setQuotation(EMPTY_QUOTATION);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchStatus(controller.signal);
    return () => controller.abort();
  }, [fetchStatus, reloadToken]);

  const handleCopyId = () => {
    if (!quotation.requestId) return;
    navigator.clipboard.writeText(quotation.requestId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-44 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-48 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const isApproved =
    quotation.status?.toUpperCase() === "APPROVED" ||
    quotation.status?.toUpperCase() === "ACCEPTED";

  const isSent = quotation.status?.toUpperCase() === "SENT";
  const isRejected = quotation.status?.toUpperCase() === "REJECTED";
  const isPending = !isApproved && !isSent && !isRejected;

  const durationDays = quotation.contractDuration
    ? parseInt(quotation.contractDuration, 10) || 5
    : 5;

  const startDate = isApproved
    ? quotation.updatedAt
      ? new Date(quotation.updatedAt)
      : new Date()
    : quotation.createdAt
      ? new Date(quotation.createdAt)
      : new Date();

  const endDate = new Date(
    startDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );

  return (
    <div className="w-full space-y-6">
      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setReloadToken((p) => p + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* ============================================================
          TOP STATUS HERO CARD
      ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                {quotation.quotationType || "Demo Evaluation Plan"}
              </span>

              {isApproved ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  </span>
                  Approved & Active
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3.5 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-400/40">
                  Rejected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
                  <Clock className="h-3.5 w-3.5" />
                  Pending Review
                </span>
              )}
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
              {isApproved
                ? `Demo plan active for ${quotation.companyName || "your company"}. Health diagnostics and machine telemetry are unlocked.`
                : "Your quotation request is under Super Admin review. You will receive active evaluation telemetry upon approval."}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
                Active Units
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.activeMachines || 1} Machines
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                Allocated Sites
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.numberOfSites || 1} Sites
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

      {/* ============================================================
          APPROVAL TIMELINE & WORKFLOW STEPPER
      ============================================================ */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Evaluation Progress & Approval Status
            </h2>
            <p className="text-xs text-slate-500">
              Track the live milestone progress of your quotation lifecycle
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Updated: {formatFullDate(quotation.updatedAt || quotation.createdAt)}
          </span>
        </div>

        {/* Milestone Steps (4-step layout) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Step 1: Received */}
          <div className="relative flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                Completed
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              1. Request Received
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Inquiry submitted successfully.
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {formatDate(quotation.createdAt)}
            </p>
          </div>

          {/* Step 2: Super Admin Review */}
          <div
            className={`relative flex flex-col rounded-xl border p-4 ${
              isApproved || isSent
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                : "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${
                  isApproved || isSent ? "bg-emerald-600" : "bg-amber-500"
                }`}
              >
                {isApproved || isSent ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  isApproved || isSent
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                }`}
              >
                {isApproved || isSent ? "Approved" : "In Review"}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              2. Super Admin Review
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {isApproved
                ? "Machinery specifications verified & approved."
                : "Admin reviewing machinery allocation."}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {isApproved
                ? formatDate(quotation.updatedAt)
                : "Under processing"}
            </p>
          </div>

          {/* Step 3: Activation */}
          <div
            className={`relative flex flex-col rounded-xl border p-4 ${
              isApproved
                ? "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${
                  isApproved ? "bg-blue-600" : "bg-slate-400"
                }`}
              >
                <Zap className="h-4 w-4" />
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  isApproved
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {isApproved ? "Active" : "Pending"}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              3. Telemetry Activated
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {isApproved
                ? `${durationDays} Days live telemetry access granted.`
                : "Unlocks on admin approval."}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {isApproved
                ? `${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`
                : "Pending approval"}
            </p>
          </div>

          {/* Step 4: Enterprise Contract Ready */}
          <div className="relative flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4 opacity-70 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                Next Stage
              </span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              4. Commercial Contract
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Upgrade to full production multi-year deployment.
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              Post-Evaluation
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SCOPE & ALLOCATION SUMMARY
      ============================================================ */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Target Scope & Allocated Configurations
            </h2>
            <p className="text-xs text-slate-500">
              Summary of sites, machines, and optional services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Machines
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {quotation.activeMachines || 1} Units
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.isArray(quotation.equipmentTypes) &&
              quotation.equipmentTypes.length > 0 ? (
                quotation.equipmentTypes.map((eq, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200"
                  >
                    <Wrench className="h-3 w-3 text-indigo-500" />
                    {eq}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  Standard Fleet Machinery
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Designated Sites
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {quotation.numberOfSites || 1} Sites
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.isArray(quotation.siteNames) &&
              quotation.siteNames.length > 0 ? (
                quotation.siteNames.map((site, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200"
                  >
                    <MapPin className="h-3 w-3 text-emerald-500" />
                    {site}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  {quotation.siteLocation || "All Active Operational Sites"}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Selected Services
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {Array.isArray(quotation.optionalServices)
                ? quotation.optionalServices.length
                : 0}{" "}
              Add-ons
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.isArray(quotation.optionalServices) &&
              quotation.optionalServices.length > 0 ? (
                quotation.optionalServices.map((svc, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {svc}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  Standard Telemetry & Diagnostics
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuotationStatus;