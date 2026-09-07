import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  HelpCircle,
  Layers,
  Loader2,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

type QuotationStatus =
  | "AWAITING_RESPONSE"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

type Decision = "accept" | "reject";

interface OptionalService {
  id: string;
  name: string;
  amount: number;
}

interface CommercialProposal {
  implementationFee: number;
  monthlyLicence: number;
  additionalMachineCharges: number;
  optionalServices: OptionalService[];
  totalProposalValue: number;
  currency: "ZAR";
}

interface QuotationActionData {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  companyName: string;
  companyAdmin: string;
  sites: string[];
  machinePlan: string;
  activeMachines: number;
  contractDuration: string;
  quotationDate: string;
  commercials: CommercialProposal;
}

interface DecisionPayload {
  quotationId: string;
  decision: Decision;
  note: string;
  rejectionReason: string;
}

interface DecisionResponse {
  quotation: QuotationActionData;
  message: string;
}

/* ============================================================
   MOCK / PREVIEW DATA
   ============================================================ */

const DUMMY_QUOTATION: QuotationActionData = {
  id: "QT-DEMO-2026-000124",
  quotationNumber: "HME-QT-2026-001",
  status: "AWAITING_RESPONSE",
  companyName: "ABC Mining Corporation",
  companyAdmin: "Aniket Kumar",
  sites: ["ABC Main Mining Site", "North Valley Mining Site"],
  machinePlan: "26–75 Machines",
  activeMachines: 48,
  contractDuration: "12 Months",
  quotationDate: "2026-08-22",
  commercials: {
    implementationFee: 85_000,
    monthlyLicence: 95_000,
    additionalMachineCharges: 0,
    optionalServices: [
      {
        id: "telematics-ecu",
        name: "Telematics / ECU Integration",
        amount: 25_000,
      },
      {
        id: "custom-reports",
        name: "Custom Reports & API Access",
        amount: 15_000,
      },
      {
        id: "additional-training",
        name: "On-site Field Staff Training",
        amount: 10_000,
      },
    ],
    totalProposalValue: 230_000,
    currency: "ZAR",
  },
};

const formatZAR = (amount: number): string =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value: string): string => {
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

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const QuotationActionPage: React.FC = () => {
  const [quotation, setQuotation] =
    useState<QuotationActionData>(DUMMY_QUOTATION);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [includeNote, setIncludeNote] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<
    string | null
  >(null);
  const [copied, setCopied] = useState<boolean>(false);

  const isAccepted = quotation.status === "ACCEPTED";
  const isRejected = quotation.status === "REJECTED";
  const isAwaiting = quotation.status === "AWAITING_RESPONSE";

  const handleCopyId = () => {
    navigator.clipboard.writeText(quotation.quotationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSubmit = async () => {
    if (!decision) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, 600));
      const nextStatus: QuotationStatus =
        decision === "accept" ? "ACCEPTED" : "REJECTED";

      setQuotation((prev) => ({
        ...prev,
        status: nextStatus,
      }));

      setActionSuccessMessage(
        decision === "accept"
          ? "🎉 Commercial quotation approved & accepted! The enterprise contract agreement is now active."
          : "Quotation has been rejected. Notification sent to Super Admin.",
      );
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
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
                  Awaiting Your Decision
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
              · Date: {formatDate(quotation.quotationDate)}
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
                {quotation.activeMachines} Units
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
                {formatZAR(quotation.commercials.totalProposalValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-semibold">{actionSuccessMessage}</p>
        </div>
      )}

      {/* ============================================================
          MAIN TWO COLUMN DECK
      ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: 2 Cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Commercial Proposal Breakdown Table */}
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

            {/* Pricing Line Items */}
            <div className="space-y-3">
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
                      System deployment, hardware calibration, and initial onboarding
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatZAR(quotation.commercials.implementationFee)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                    <Zap className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Annual / Monthly Site Telemetry Licence
                    </p>
                    <p className="text-xs text-slate-500">
                      Multi-site live machine monitoring ({quotation.machinePlan})
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatZAR(quotation.commercials.monthlyLicence)}
                </span>
              </div>

              {/* Optional Services */}
              {quotation.commercials.optionalServices.map((svc) => (
                <div
                  key={svc.id}
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
                        Selected add-on service
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatZAR(svc.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Grand Value Callout */}
            <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-5 dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-blue-950/40 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Total Contract Commitment
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Final commercial proposal value (incl. all setup and service modules)
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-950 dark:text-white sm:text-3xl">
                  {formatZAR(quotation.commercials.totalProposalValue)}
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
                    Accept this proposal to execute the enterprise agreement, or request revisions
                  </p>
                </div>
              </div>

              {/* Accept vs Reject Choice Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Accept Option Card */}
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
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Approve the commercial terms, generate binding contract documentation, and initiate deployment.
                  </p>
                </button>

                {/* Reject Option Card */}
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
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Decline the proposal or ask for changes in machine quota, duration, or optional features.
                  </p>
                </button>
              </div>

              {/* Rejection Reason Selector (if Reject selected) */}
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
                    <option value="Budget Constraint">Budget / Pricing too high</option>
                    <option value="Machine Quota Adjustment">Need different machine capacity quota</option>
                    <option value="Contract Duration">Duration terms need adjustment</option>
                    <option value="Feature Scope">Required specific features missing</option>
                    <option value="Other">Other / Requesting revision</option>
                  </select>
                </div>
              )}

              {/* Optional Response Notes */}
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
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
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

              {/* Submit Action Button */}
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
                        : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800"
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
          {/* Scope Card */}
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
                  Authorised Admin
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {quotation.companyAdmin}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Designated Mining Sites
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {quotation.sites.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <MapPin className="h-3 w-3 text-emerald-500" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>
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

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>
                  Acceptance initiates immediate contract document generation and invoicing.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>
                  Full machine telemetry access will transition smoothly without interruption.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>
                  Payment terms are 14 days from contract execution.
                </span>
              </li>
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

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {decision === "accept"
                ? `Are you sure you want to approve and execute the commercial contract for ${formatZAR(
                    quotation.commercials.totalProposalValue,
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