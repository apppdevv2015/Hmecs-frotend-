import React, { useState } from "react";
import {
  FileSignature,
  CalendarRange,
  Eye,
  Download,
  Printer,
  PenLine,
  CheckCircle2,
  Clock,
  History,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* MOCK DATA                                                                   */
/* -------------------------------------------------------------------------- */

const contractHeader = {
  contractNumber: "CN-2025-000124",
  contractDate: "24 Aug 2026",
  quotationNumber: "QT-2025-000124",
  company: "Orion Mining Pvt. Ltd.",
};

type ContractStatus =
  | "Not Created"
  | "Draft"
  | "Sent for Signature"
  | "Partially Signed"
  | "Signed"
  | "Rejected"
  | "Expired";

const contractStatusStyles: Record<ContractStatus, string> = {
  "Not Created": "bg-gray-100 text-gray-500",
  Draft: "bg-gray-100 text-gray-600",
  "Sent for Signature": "bg-amber-50 text-amber-700",
  "Partially Signed": "bg-indigo-50 text-indigo-700",
  Signed: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Expired: "bg-gray-100 text-gray-500",
};

const contractInfo = {
  duration: "24 Months",
  startDate: "01 Sep 2026",
  endDate: "31 Aug 2028",
  licencePeriod: "24 Months",
  commercialTerms: "As per Quotation QT-2025-000124, billed monthly in advance.",
  paymentTerms: "Net 30 Days from invoice date.",
  serviceTerms: "Includes fleet monitoring, telematics, and dashboard access for all listed machines.",
  supportTerms: "Standard support: Mon–Sat, 9 AM–7 PM. Priority Support Plan available as add-on.",
};

const contractActivity = [
  { id: 1, label: "Contract Created", date: "24 Aug 2026, 9:10 AM", done: true },
  { id: 2, label: "Contract Sent", date: "24 Aug 2026, 9:30 AM", done: true },
  { id: 3, label: "Contract Viewed", date: "24 Aug 2026, 11:02 AM", done: true },
  { id: 4, label: "Contract Signed", date: null, done: false },
];

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                              */
/* -------------------------------------------------------------------------- */

const QuotationContract: React.FC = () => {
  const [status, setStatus] = useState<ContractStatus>("Sent for Signature");
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState("Rakesh Verma");
  const [signerEmail, setSignerEmail] = useState("rakesh.verma@orionmining.com");
  const [signedMeta, setSignedMeta] = useState<{ date: string; time: string } | null>(null);

  const handleSign = () => {
    if (signed) return;
    if (!signerName.trim() || !signerEmail.trim()) return;

    setSigned(true);
    setStatus("Signed");
    setSignedMeta({ date: "22 Aug 2026", time: "4:12 PM" });
  };

  const activitySteps = contractActivity.map((step) =>
    step.label === "Contract Signed" && signed
      ? { ...step, done: true, date: "22 Aug 2026, 4:12 PM" }
      : step
  );

  return (
    <div className="space-y-6">
      {/* A. CONTRACT HEADER */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileSignature size={18} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Contract Number
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {contractHeader.contractNumber}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${contractStatusStyles[status]}`}
          >
            {status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Contract Date
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractHeader.contractDate}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Quotation Number
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractHeader.quotationNumber}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Company
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractHeader.company}
            </p>
          </div>
        </div>
      </section>

      {/* B. CONTRACT INFORMATION */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CalendarRange size={16} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            Contract Information
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Duration
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractInfo.duration}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Start Date
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractInfo.startDate}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              End Date
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractInfo.endDate}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Licence Period
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {contractInfo.licencePeriod}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Commercial Terms
            </p>
            <p className="mt-1.5 text-sm text-gray-700">
              {contractInfo.commercialTerms}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Payment Terms
            </p>
            <p className="mt-1.5 text-sm text-gray-700">
              {contractInfo.paymentTerms}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Service Terms
            </p>
            <p className="mt-1.5 text-sm text-gray-700">
              {contractInfo.serviceTerms}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Support Terms
            </p>
            <p className="mt-1.5 text-sm text-gray-700">
              {contractInfo.supportTerms}
            </p>
          </div>
        </div>
      </section>

      {/* C. CONTRACT DOCUMENT */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Contract Document
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
            >
              <Eye size={13} />
              View
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
            >
              <Download size={13} />
              Download
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
            >
              <Printer size={13} />
              Print
            </button>
          </div>
        </div>

        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 text-gray-400">
          <FileSignature size={32} className="mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Contract_{contractHeader.contractNumber}.pdf
          </p>
          <p className="text-xs text-gray-400">Document preview</p>
        </div>
      </section>

      {/* D. DIGITAL SIGNATURE */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <PenLine size={16} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            Digital Signature
          </h2>
        </div>

        {!signed ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Signature
              </label>
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
                Signature pad placeholder
              </div>
            </div>

            <button
              type="button"
              onClick={handleSign}
              disabled={!signerName.trim() || !signerEmail.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PenLine size={15} />
              Sign Digitally
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} />
              <span className="text-sm font-semibold">Signed</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-3 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/70">
                  Signed By
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {signerName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/70">
                  Date
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {signedMeta?.date}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/70">
                  Time
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {signedMeta?.time}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/70">
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Signed
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* E. CONTRACT ACTIVITY */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <History size={16} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            Contract Activity
          </h2>
        </div>

        <ol className="space-y-5">
          {activitySteps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  step.done
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-300"
                }`}
              >
                {step.done ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              </span>
              <div className="flex flex-1 items-center justify-between">
                <span
                  className={`text-sm ${
                    step.done ? "font-medium text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-xs text-gray-400">
                  {step.date ?? "Pending"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default QuotationContract;