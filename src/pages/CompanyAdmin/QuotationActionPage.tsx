import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  FileCheck,
  FileText,
  Layers,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

import { extractApiError, getOfficialQuotations } from "../../services/Quotation/quotationService";
import {
  acceptQuotation,
  rejectQuotation,
} from "../../services/companyadmin/Quotations/QuotationService";
import type { CompanyQuotation } from "../../services/companyadmin/Quotations/QuotationService";
import StorageService from "../../services/storage.service";
import { showErrorToast } from "../../utils/toastUtils";



type Decision = "accept" | "reject";

/* ============================================================
   HELPERS
   ============================================================ */

const formatZAR = (amount: number): string =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};


const toAmount = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const QuotationActionPage: React.FC = () => {
  // There is no per-record route/prop for this page (confirmed against the
  // parent QuotationManagement tab component — it renders <QuotationAction />
  // with no id). Multiple quotations can be "SENT" (pending decision) at
  // once, so we fetch the full list, filter to pending ones, and let the
  // user pick which one to act on when there's more than one.
  const [pendingQuotations, setPendingQuotations] = useState<
    CompanyQuotation[]
  >([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

 const [decision, setDecision] = useState<Decision | null>(null);
const [rejectionReason, setRejectionReason] = useState<string>("");
const [note, setNote] = useState<string>("");
const [includeNote, setIncludeNote] = useState<boolean>(false);
const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
const [copied, setCopied] = useState<boolean>(false);
  /* ------------------------------------------------------------
     FETCH — GET /quotations (role-filtered list)
  ------------------------------------------------------------ */
  const fetchQuotation = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(undefined);

    try {
      const list = (await getOfficialQuotations()) as unknown as CompanyQuotation[];
      if (signal?.aborted) return;

      const pending = (list ?? []).filter(
        (q) => q.status?.toUpperCase() === "SENT",
      );

      setPendingQuotations(pending);
      // Auto-select when there's exactly one — otherwise leave unselected
      // so the picker view renders and the user chooses.
      setSelectedQuotationId(pending.length === 1 ? pending[0].id : null);
    } catch (err) {
      if (signal?.aborted) return;
      const message = extractApiError(err);
      setLoadError(message);
      setPendingQuotations([]);
      setSelectedQuotationId(null);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchQuotation(controller.signal);
    return () => controller.abort();
  }, [fetchQuotation]);

  const quotation =
    pendingQuotations.find((q) => q.id === selectedQuotationId) ?? null;

  const handleCopyId = () => {
    if (!quotation) return;
    navigator.clipboard.writeText(quotation.quotationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const handleConfirmSubmit = async () => {
    if (!decision || !quotation) return;

    if (decision === "reject" && rejectionReason.trim().length === 0) {
  setShowConfirmModal(false);
  showErrorToast("Please select a reason before submitting a rejection.");
  return;
}

    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
            const envelope =
        decision === "accept"
          ? await acceptQuotation(quotation.id, {
              signedBy: StorageService.getUser()?.name || "Authorized Signatory",
              ...(includeNote && note.trim() ? { note: note.trim() } : {}),
            })
          : await rejectQuotation(quotation.id, {
              rejectionReason,
              ...(includeNote && note.trim() ? { note: note.trim() } : {}),
            }); 

      setPendingQuotations((prev) =>
        prev.map((q) => (q.id === envelope.data.id ? envelope.data : q)),
      );
    }  catch {

} finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     LOADING STATE
     ============================================================ */
  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-16">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm font-medium">Loading quotation…</p>
        </div>
      </div>
    );
  }

  /* ============================================================
     GENUINE ERROR STATE (network/auth/backend failure)
     ============================================================ */
  if (loadError) {
    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-rose-600" />
        <div>
          <p className="text-sm font-bold text-rose-800">
            Couldn&apos;t load your quotations
          </p>
          <p className="mt-1 text-xs text-rose-700">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={() => fetchQuotation()}
          className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ============================================================
     NO PENDING QUOTATION (fetch succeeded, nothing to decide on)
     ============================================================ */
  if (pendingQuotations.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-slate-400" />
        <div>
          <p className="text-sm font-bold text-slate-800">
            No quotation is currently awaiting your decision
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Once Super Admin sends a formal commercial quotation, it will
            appear here for you to accept or reject.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchQuotation()}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>
    );
  }

  /* ============================================================
     PICKER — multiple quotations awaiting a decision, none chosen yet
     ============================================================ */
  if (!quotation) {
    return (
      <div className="w-full space-y-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            Select a quotation to review
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            You have {pendingQuotations.length} quotations awaiting a
            decision. Choose one to view its details and accept or reject.
          </p>
        </div>

        <div className="space-y-3">
          {pendingQuotations.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelectedQuotationId(q.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {q.quotationNumber}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {q.companyName} · {q.tier} · {q.machineCount} machines
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-700">
                  {formatZAR(toAmount(q.totalAmount))}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Sent {formatDate(q.sentAt ?? q.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isAccepted = quotation.status === "ACCEPTED";
  const isRejected = quotation.status === "REJECTED";
  const isAwaiting = !isAccepted && !isRejected; // e.g. "SENT"
  // Backend already computes the total — use it directly rather than
  // re-deriving it client-side (avoids drifting from discounts/tax logic
  // that lives on the server).
  const totalProposalValue = toAmount(quotation.totalAmount);
  const optionalServices = quotation.optionalServices ?? [];

  return (
    <div className="w-full space-y-6">
      {pendingQuotations.length > 1 && (
        <button
          type="button"
          onClick={() => setSelectedQuotationId(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          ← Back to all pending quotations
        </button>
      )}
      {/* ============================================================
          EXECUTIVE HERO HEADER
      ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <FileCheck className="h-3.5 w-3.5 text-blue-300" />
                Formal Commercial Contract Proposal
              </span>

              {isAccepted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Contract Accepted
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3.5 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-400/40">
                  <XCircle className="h-3.5 w-3.5" />
                  Proposal Declined
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/40">
                  <Clock className="h-3.5 w-3.5" />
                  {quotation.status === "SENT"
                    ? "Awaiting Your Decision"
                    : quotation.status}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {quotation.quotationNumber}
              </h1>
              <button
                type="button"
                onClick={handleCopyId}
                title="Copy Quote Number"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="text-sm font-medium text-slate-300">
              Prepared for{" "}
              <span className="font-bold text-white">
                {quotation.companyName}
              </span>{" "}
              · Date: {formatDate(quotation.sentAt ?? quotation.createdAt)}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
                Capacity
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.machineCount} Units
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                Contract Term
              </div>
              <p className="mt-1 text-lg font-bold text-white">
                {quotation.contractDuration}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md sm:col-span-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-yellow-400" />
                Total Value
              </div>
              <p className="mt-1 text-lg font-bold text-emerald-300">
                {formatZAR(totalProposalValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Commercial Cost Breakdown
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official pricing schedule approved by Super Admin
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                Currency: ZAR (R)
              </span>
            </div>

            <div className="space-y-3">
              {quotation.implementationFee !== undefined && (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Once-Off Implementation & Setup Fee
                      </p>
                      <p className="text-xs text-slate-500">
                        System deployment, hardware calibration, and initial
                        onboarding
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatZAR(toAmount(quotation.implementationFee))}
                  </span>
                </div>
              )}

              {quotation.monthlySiteLicence !== undefined && (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                      <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Site Telemetry Licence ({quotation.billingFrequency})
                      </p>
                      <p className="text-xs text-slate-500">
                        Multi-site live machine monitoring ({quotation.tier})
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatZAR(toAmount(quotation.monthlySiteLicence))}
                  </span>
                </div>
              )}

              {toAmount(quotation.additionalMachineCharge) > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                      <Cpu className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Additional Machine Charges
                      </p>
                      <p className="text-xs text-slate-500">
                        Charges for machines beyond licensed allowance
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatZAR(toAmount(quotation.additionalMachineCharge))}
                  </span>
                </div>
              )}

              {/* Optional services included on this quotation */}
              {optionalServices.map((svc) => (
                <div
                  key={svc.serviceId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {svc.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Optional add-on service
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatZAR(svc.price)}
                  </span>
                </div>
              ))}

              {toAmount(quotation.discountAmount) > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Discount Applied
                  </p>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    − {formatZAR(toAmount(quotation.discountAmount))}
                  </span>
                </div>
              )}

              {toAmount(quotation.taxAmount) > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Tax
                  </p>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatZAR(toAmount(quotation.taxAmount))}
                  </span>
                </div>
              )}
            </div>

            {/* Total Grand Value Callout */}
            <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-5 dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-blue-950/40 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Total Contract Commitment
                </p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Final commercial proposal value (incl. all setup and service
                  modules)
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-950 dark:text-white sm:text-3xl">
                  {formatZAR(totalProposalValue)}
                </span>
              </div>
            </div>
          </section>

          {/* Card 2: Final Decision Action Deck */}
          {isAwaiting && (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Executive Contract Decision
                  </h2>
                  <p className="text-xs text-slate-500">
                    Accept this proposal to execute the enterprise agreement,
                    or request revisions
                  </p>
                </div>
              </div>

              {/* Accept vs Reject Choice Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDecision("accept")}
                  className={`relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all ${
                    decision === "accept"
                      ? "border-emerald-500 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/20"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        decision === "accept"
                          ? "bg-emerald-600 text-white shadow"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    {decision === "accept" && (
                      <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                    Accept & Execute Contract
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Approve the commercial terms, generate binding contract
                    documentation, and initiate deployment.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision("reject")}
                  className={`relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all ${
                    decision === "reject"
                      ? "border-rose-500 bg-rose-50/40 shadow-md ring-2 ring-rose-500/20 dark:border-rose-500 dark:bg-rose-950/20"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        decision === "reject"
                          ? "bg-rose-600 text-white shadow"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                      }`}
                    >
                      <XCircle className="h-5 w-5" />
                    </div>
                    {decision === "reject" && (
                      <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                    Decline / Request Revision
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Decline the proposal or ask for changes in machine quota,
                    duration, or optional features.
                  </p>
                </button>
              </div>

              {decision === "reject" && (
                <div className="mt-5 space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Select Reason for Decline
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-lg border border-rose-300 bg-white p-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- Choose reason --</option>
                    <option value="Budget Constraint">
                      Budget / Pricing too high
                    </option>
                    <option value="Machine Quota Adjustment">
                      Need different machine capacity quota
                    </option>
                    <option value="Contract Duration">
                      Duration terms need adjustment
                    </option>
                    <option value="Feature Scope">
                      Required specific features missing
                    </option>
                    <option value="Other">Other / Requesting revision</option>
                  </select>
                </div>
              )}

              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="add-note"
                    checked={includeNote}
                    onChange={(e) => setIncludeNote(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="add-note"
                    className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Attach an executive comment or specific instruction
                  </label>
                </div>

                {includeNote && (
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Provide any instructions or comments for the HME commercial team..."
                    className="w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={!decision || isSubmitting}
                  onClick={() => setShowConfirmModal(true)}
                  className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-md transition-all ${
                    decision === "accept"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      : decision === "reject"
                        ? "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                        : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : decision === "accept" ? (
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {decision === "accept"
                    ? "Confirm & Accept Contract"
                    : decision === "reject"
                      ? "Submit Rejection"
                      : "Select Decision Above"}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: 1 Col (Sidebar Summary) */}
        <div className="space-y-6">
          {/* Contracting Entity Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Contracting Entity
                </h3>
                <p className="text-xs text-slate-500">
                  Target enterprise stakeholder
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Company
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {quotation.companyName}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contact Person
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {quotation.contactPerson}
                </p>
              </div>

              {quotation.contactEmail && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {quotation.contactEmail}
                  </p>
                </div>
              )}

              {quotation.contactPhone && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phone
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {quotation.contactPhone}
                  </p>
                </div>
              )}

              {/*
                NOTE: The original static UI showed a list of "Designated
                Mining Sites" here. CompanyQuotation has no `sites` field,
                so nothing is rendered here rather than showing fake data.
                If sites should come from another endpoint/field, let me
                know and I'll wire it in.
              */}
            </div>
          </section>

          {/* Legal / Terms Card */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Terms of Agreement
                </h3>
                <p className="text-xs text-slate-500">
                  Contract validity & compliance
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {quotation.validUntil && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  <span>Valid until {formatDate(quotation.validUntil)}.</span>
                </li>
              )}
              {quotation.paymentTerms && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  <span>Payment terms: {quotation.paymentTerms}.</span>
                </li>
              )}
              {quotation.trialRequested && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  <span>A trial period was requested for this account.</span>
                </li>
              )}
              {quotation.notes && (
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  <span>{quotation.notes}</span>
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>

      {/* ============================================================
          CONFIRMATION MODAL
      ============================================================ */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  decision === "accept"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {decision === "accept" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {decision === "accept"
                    ? "Confirm Contract Acceptance"
                    : "Confirm Proposal Rejection"}
                </h3>
                <p className="text-xs text-slate-500">
                  {quotation.quotationNumber} · {quotation.companyName}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {decision === "accept"
                ? `Are you sure you want to approve and execute the commercial contract for ${formatZAR(
                    totalProposalValue,
                  )}?`
                : `Are you sure you want to decline this quotation proposal?`}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow ${
                  decision === "accept"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationActionPage;