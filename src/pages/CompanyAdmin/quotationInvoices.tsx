import React, { useState } from "react";
import {
  Receipt,
  FileClock,
  Eye,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* MOCK DATA                                                                   */
/* -------------------------------------------------------------------------- */

type InvoiceStatus =
  | "Not Requested"
  | "Requested"
  | "Draft"
  | "Generated"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Rejected"
  | "Paid";

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  "Not Requested": "bg-gray-100 text-gray-500",
  Requested: "bg-amber-50 text-amber-700",
  Draft: "bg-gray-100 text-gray-600",
  Generated: "bg-indigo-50 text-indigo-700",
  Sent: "bg-blue-50 text-blue-700",
  Viewed: "bg-blue-50 text-blue-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Paid: "bg-emerald-50 text-emerald-700",
};

interface Invoice {
  id: number;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
}

const initialInvoices: Invoice[] = [
  {
    id: 1,
    number: "INV-2025-000091",
    date: "01 Sep 2026",
    dueDate: "01 Oct 2026",
    amount: 11300,
    tax: 2034,
    total: 13334,
    status: "Sent",
  },
];

const currency = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const lineItems = [
  { id: 1, item: "Monthly Site Licence — Sep 2026", qty: 1, unitPrice: 11300, tax: 2034 },
];

/* -------------------------------------------------------------------------- */
/* SMALL PIECES                                                                */
/* -------------------------------------------------------------------------- */

const StatusPill: React.FC<{ status: InvoiceStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${invoiceStatusStyles[status]}`}
  >
    {status}
  </span>
);

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                              */
/* -------------------------------------------------------------------------- */

const QuotationInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [requested, setRequested] = useState(true);
  const [requestMeta] = useState({ date: "28 Aug 2026", by: "Rakesh Verma" });

  const [activeInvoiceId, setActiveInvoiceId] = useState<number>(initialInvoices[0].id);
  const activeInvoice = invoices.find((i) => i.id === activeInvoiceId) ?? invoices[0];

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acceptedMeta, setAcceptedMeta] = useState<{ date: string; time: string } | null>(null);

  const currentStatus: InvoiceStatus = requested
    ? invoices[0]?.status ?? "Requested"
    : "Not Requested";

  const handleRequestInvoice = () => setRequested(true);

  const updateInvoiceStatus = (id: number, status: InvoiceStatus) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)));
  };

  const handleAccept = () => {
    updateInvoiceStatus(activeInvoice.id, "Accepted");
    setAcceptedMeta({ date: "22 Aug 2026", time: "5:40 PM" });
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    updateInvoiceStatus(activeInvoice.id, "Rejected");
    setShowRejectModal(false);
    setRejectReason("");
  };

  return (
    <div className="space-y-6">
      {/* A. INVOICE SUMMARY */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Receipt size={16} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Invoice Summary
            </h2>
          </div>
          <StatusPill status={activeInvoice?.status ?? currentStatus} />
        </div>

        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Invoice Number
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {activeInvoice?.number ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Invoice Date
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {activeInvoice?.date ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Due Date
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {activeInvoice?.dueDate ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Quotation Number
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              QT-2025-000124
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Contract Number
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              CN-2025-000124
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Company
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              Orion Mining Pvt. Ltd.
            </p>
          </div>
        </div>
      </section>

      {/* B. INVOICE REQUEST */}
      {!requested && (
        <section className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-6 text-center">
          <FileClock size={28} className="mx-auto mb-3 text-blue-500" />
          <p className="mb-4 text-sm text-gray-600">
            No invoice has been requested yet for this quotation.
          </p>
          <button
            type="button"
            onClick={handleRequestInvoice}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Request Invoice
          </button>
        </section>
      )}

      {requested && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileClock size={16} className="text-blue-500" />
              <p className="text-sm text-gray-600">
                Invoice requested by{" "}
                <span className="font-medium text-gray-900">{requestMeta.by}</span> on{" "}
                <span className="font-medium text-gray-900">{requestMeta.date}</span>
              </p>
            </div>
            <StatusPill status="Requested" />
          </div>
        </section>
      )}

      {/* C. INVOICE LIST */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">Invoice Number</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Due Date</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Tax</th>
                <th className="px-6 py-3 font-medium">Total</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className={`transition-colors hover:bg-blue-50/40 ${
                    inv.id === activeInvoiceId ? "bg-blue-50/40" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {inv.number}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{inv.date}</td>
                  <td className="px-6 py-4 text-gray-500">{inv.dueDate}</td>
                  <td className="px-6 py-4 text-gray-700">{currency(inv.amount)}</td>
                  <td className="px-6 py-4 text-gray-700">{currency(inv.tax)}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {currency(inv.total)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill status={inv.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceId(inv.id)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <Eye size={12} />
                        View
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <Printer size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* D. INVOICE DETAILS */}
      {activeInvoice && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">
            Invoice Details — {activeInvoice.number}
          </h2>

          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Billed To
              </p>
              <p className="text-sm font-medium text-gray-900">
                Orion Mining Pvt. Ltd.
              </p>
              <p className="text-sm text-gray-500">
                Plot 14, Industrial Area, Nagpur, Maharashtra
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Billed By
              </p>
              <p className="text-sm font-medium text-gray-900">FleetOps Technologies Pvt. Ltd.</p>
              <p className="text-sm text-gray-500">
                Payment Terms: Net 30 Days · Due {activeInvoice.dueDate}
              </p>
            </div>
          </div>

          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3 font-medium">Item</th>
                  <th className="px-6 py-3 font-medium">Qty</th>
                  <th className="px-6 py-3 font-medium">Unit Price</th>
                  <th className="px-6 py-3 font-medium">Tax</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="px-6 py-4 text-gray-900">{li.item}</td>
                    <td className="px-6 py-4 text-gray-700">{li.qty}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {currency(li.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{currency(li.tax)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {currency(li.unitPrice + li.tax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Amount</span>
                <span>{currency(activeInvoice.amount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{currency(activeInvoice.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1.5 text-sm font-semibold text-gray-900">
                <span>Total Amount</span>
                <span>{currency(activeInvoice.total)}</span>
              </div>
            </div>
          </div>

          {/* E. INVOICE APPROVAL / ACCEPTANCE */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            {activeInvoice.status === "Accepted" ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">
                <CheckCircle2 size={18} />
                <span className="text-sm font-semibold">Invoice Accepted</span>
                {acceptedMeta && (
                  <span className="text-xs text-emerald-600">
                    by Rakesh Verma · {acceptedMeta.date}, {acceptedMeta.time}
                  </span>
                )}
              </div>
            ) : activeInvoice.status === "Rejected" ? (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-red-700">
                <XCircle size={18} />
                <span className="text-sm font-semibold">Invoice Rejected</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <CheckCircle2 size={15} />
                  Accept Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600"
                >
                  <XCircle size={15} />
                  Reject Invoice
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {showRejectModal && (
        <Modal title="Reject Invoice" onClose={() => setShowRejectModal(false)}>
          <p className="mb-3 text-sm text-gray-500">
            Please tell us why this invoice is being rejected.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Enter reason"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reject Invoice
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuotationInvoices;