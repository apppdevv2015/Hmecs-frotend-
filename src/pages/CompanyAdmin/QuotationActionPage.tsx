import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  FileText,
  Building2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

const quotation = {
  quotationNumber: "HME-QT-2026-001",
  status: "Quotation Sent",

  company: "ABC Mining Corporation",
  site: "ABC Main Mining Site",
  admin: "Aniket Kumar",

  machinePlan: "26–75 Machines",
  activeMachines: 48,

  implementationFee: 85000,
  monthlyLicence: 95000,
  additionalMachineCharges: 0,

  optionalServices: [
    {
      name: "Telematics / ECU Integration",
      amount: 25000,
    },
    {
      name: "Custom Reports",
      amount: 15000,
    },
    {
      name: "Additional Training",
      amount: 10000,
    },
  ],
};

const QuotationActionPage: React.FC = () => {
  const [decision, setDecision] = useState<"accept" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const optionalTotal = quotation.optionalServices.reduce(
    (total, item) => total + item.amount,
    0,
  );

  const total =
    quotation.implementationFee +
    quotation.monthlyLicence +
    quotation.additionalMachineCharges +
    optionalTotal;

  const handleSubmit = () => {
    if (!decision) return;

    setSubmitted(true);

    console.log({
      quotationNumber: quotation.quotationNumber,
      decision: decision === "accept" ? "Accepted" : "Rejected",
      note,
      submittedAt: new Date().toISOString(),
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">

            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                decision === "accept"
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10"
                  : "bg-red-100 text-red-600 dark:bg-red-500/10"
              }`}
            >
              {decision === "accept" ? (
                <CheckCircle size={42} />
              ) : (
                <XCircle size={42} />
              )}
            </div>

            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
              {decision === "accept"
                ? "Quotation Accepted"
                : "Quotation Rejected"}
            </h1>

            <p className="mt-3 text-slate-500">
              {decision === "accept"
                ? "Your quotation has been accepted successfully. The contract creation process will now begin."
                : "Your quotation has been rejected. The HME Admin will review your response."}
            </p>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <p className="font-semibold">
                {quotation.quotationNumber}
              </p>

              <p className="mt-1 text-slate-500">
                Status:{" "}
                {decision === "accept" ? "Accepted" : "Rejected"}
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <FileText size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Accept / Reject Quotation
              </h1>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Review the quotation and submit your decision
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
          <AlertCircle className="text-blue-600" />

          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-300">
              Quotation is ready for your response
            </p>

            <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
              Please review the commercial details before accepting or
              rejecting this quotation.
            </p>
          </div>
        </div>

        {/* Quotation Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">
                Quotation Number
              </p>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {quotation.quotationNumber}
              </h2>
            </div>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              {quotation.status}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                <span className="font-semibold">
                  Company
                </span>
              </div>

              <p className="font-bold text-slate-900 dark:text-white">
                {quotation.company}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Admin: {quotation.admin}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Site: {quotation.site}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <span className="font-semibold">
                  Machine Plan
                </span>
              </div>

              <p className="font-bold text-slate-900 dark:text-white">
                {quotation.machinePlan}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {quotation.activeMachines} Active Machines
              </p>
            </div>

          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <h2 className="mb-5 text-lg font-bold text-slate-900 dark:text-white">
            Commercial Summary
          </h2>

          <div className="space-y-3">

            <SummaryRow
              label="Once-Off Implementation Fee"
              amount={quotation.implementationFee}
            />

            <SummaryRow
              label="Fixed Monthly Site Licence"
              amount={quotation.monthlyLicence}
            />

            <SummaryRow
              label="Additional Machine Charges"
              amount={quotation.additionalMachineCharges}
            />

            {quotation.optionalServices.map((service) => (
              <SummaryRow
                key={service.name}
                label={service.name}
                amount={service.amount}
              />
            ))}

            <div className="mt-5 flex items-center justify-between rounded-xl bg-blue-50 p-5 dark:bg-blue-500/10">
              <span className="text-lg font-bold">
                Total
              </span>

              <span className="text-2xl font-bold text-blue-600">
                R {total.toLocaleString("en-ZA")}
              </span>
            </div>

          </div>
        </div>

        {/* Decision */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Your Decision
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select whether you want to accept or reject this quotation.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            <button
              type="button"
              onClick={() => setDecision("accept")}
              className={`rounded-2xl border p-5 text-left transition ${
                decision === "accept"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-slate-200 hover:border-emerald-300 dark:border-slate-700"
              }`}
            >
              <CheckCircle
                className="text-emerald-600"
                size={28}
              />

              <p className="mt-3 font-bold text-slate-900 dark:text-white">
                Accept Quotation
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Accept the quotation and proceed to contract creation.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDecision("reject")}
              className={`rounded-2xl border p-5 text-left transition ${
                decision === "reject"
                  ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                  : "border-slate-200 hover:border-red-300 dark:border-slate-700"
              }`}
            >
              <XCircle
                className="text-red-600"
                size={28}
              />

              <p className="mt-3 font-bold text-slate-900 dark:text-white">
                Reject Quotation
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Reject this quotation and send your response to HME Admin.
              </p>
            </button>

          </div>

          {/* Note */}
          <div className="mt-6">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <MessageSquare size={17} />
              Add Note / Response
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder={
                decision === "reject"
                  ? "Please provide a reason for rejecting the quotation..."
                  : "Add any additional note or response..."
              }
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={!decision}
              onClick={handleSubmit}
              className={`rounded-xl px-6 py-3 font-semibold text-white transition ${
                !decision
                  ? "cursor-not-allowed bg-slate-400"
                  : decision === "accept"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {decision === "accept"
                ? "Confirm & Accept Quotation"
                : decision === "reject"
                  ? "Confirm & Reject Quotation"
                  : "Select Decision"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

const SummaryRow = ({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
    </span>

    <span className="font-bold text-slate-900 dark:text-white">
      R {amount.toLocaleString("en-ZA")}
    </span>
  </div>
);

export default QuotationActionPage;