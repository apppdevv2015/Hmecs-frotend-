import React, { useState } from "react";
import {
  FileText,
  Wallet,
  CalendarRange,
  PlusCircle,
  Paperclip,
  Send,
  Download,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* MOCK DATA                                                                   */
/* -------------------------------------------------------------------------- */

const quotationSummary = {
  quotationNumber: "QT-2025-000124",
  quotationDate: "22 Aug 2026",
  validUntil: "22 Sep 2026",
  company: "Orion Mining Pvt. Ltd.",
  preparedBy: "Ananya Sharma",
  currency: "INR",
  paymentTerms: "Net 30 Days",
  status: "Quotation Sent",
};

interface PricingRow {
  id: number;
  machine: string;
  description: string;
  qty: number;
  unitPrice: number;
  monthlyCharge: number;
  oneTimeCharge: number;
  additionalCharges: number;
  taxPct: number;
}

const pricingRows: PricingRow[] = [
  {
    id: 1,
    machine: "Hydraulic Excavator EX-220",
    description: "Fleet monitoring + telematics",
    qty: 3,
    unitPrice: 45000,
    monthlyCharge: 4500,
    oneTimeCharge: 12000,
    additionalCharges: 0,
    taxPct: 18,
  },
  {
    id: 2,
    machine: "Dump Truck DT-750",
    description: "Fleet monitoring + telematics",
    qty: 4,
    unitPrice: 38000,
    monthlyCharge: 3800,
    oneTimeCharge: 9000,
    additionalCharges: 0,
    taxPct: 18,
  },
  {
    id: 3,
    machine: "Wheel Loader WL-540",
    description: "Fleet monitoring only",
    qty: 2,
    unitPrice: 30000,
    monthlyCharge: 3000,
    oneTimeCharge: 6000,
    additionalCharges: 0,
    taxPct: 18,
  },
];

const rowTotal = (r: PricingRow) => {
  const base = r.unitPrice * r.qty + r.monthlyCharge + r.oneTimeCharge + r.additionalCharges;
  return base + base * (r.taxPct / 100);
};

const implementationFees = [
  { label: "Platform / Company Setup", amount: 15000 },
  { label: "Fleet / Component Data Loading", amount: 8000 },
  { label: "User & Permission Configuration", amount: 4000 },
  { label: "Workflow Setup", amount: 6000 },
  { label: "Training", amount: 5000 },
  { label: "Initial Dashboards / Reports", amount: 4000 },
];

const monthlyLicence = {
  period: "24 months",
  monthlyAmount: 11300,
  sites: 3,
  machines: 9,
};

const additionalServices = [
  {
    id: 1,
    name: "Priority Support Plan",
    description: "24x7 dedicated support with 2-hour SLA",
    qty: 1,
    unitCost: 6000,
  },
  {
    id: 2,
    name: "Extra Data Retention",
    description: "Extended telemetry history to 5 years",
    qty: 1,
    unitCost: 3500,
  },
];

const currency = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const machineSubtotal = pricingRows.reduce(
  (sum, r) => sum + r.unitPrice * r.qty,
  0
);
const oneTimeTotal = implementationFees.reduce((s, f) => s + f.amount, 0);
const monthlyTotal = monthlyLicence.monthlyAmount;
const additionalTotal = additionalServices.reduce(
  (s, a) => s + a.unitCost * a.qty,
  0
);
const subtotal = machineSubtotal + oneTimeTotal + monthlyTotal + additionalTotal;
const discount = 5000;
const taxable = subtotal - discount;
const tax = Math.round(taxable * 0.18);
const grandTotal = taxable + tax;

interface ChatMessage {
  id: number;
  name: string;
  role: string;
  message: string;
  time: string;
  isSelf: boolean;
  read: boolean;
}

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    name: "Rakesh Verma",
    role: "Company Admin",
    message:
      "Can you confirm whether the training sessions are included for all site operators or just supervisors?",
    time: "22 Aug, 9:40 AM",
    isSelf: false,
    read: true,
  },
  {
    id: 2,
    name: "Ananya Sharma",
    role: "Super Admin",
    message:
      "Training covers up to 10 supervisors on-site. Additional operator sessions can be added as an add-on.",
    time: "22 Aug, 10:05 AM",
    isSelf: true,
    read: true,
  },
];

const attachments = [
  {
    id: 1,
    name: "Quotation_QT-2025-000124.pdf",
    type: "PDF",
    uploadedBy: "Ananya Sharma",
    date: "22 Aug 2026",
  },
  {
    id: 2,
    name: "Machine_Specifications.xlsx",
    type: "XLSX",
    uploadedBy: "Ananya Sharma",
    date: "22 Aug 2026",
  },
];

const fileIcon = (type: string) =>
  type === "XLSX" ? (
    <FileSpreadsheet size={16} className="text-emerald-600" />
  ) : type === "PDF" ? (
    <FileText size={16} className="text-red-500" />
  ) : (
    <FileImage size={16} className="text-blue-500" />
  );

/* -------------------------------------------------------------------------- */
/* SMALL PIECES                                                                */
/* -------------------------------------------------------------------------- */

const SummaryItem: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

const SectionCard: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon size={16} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </section>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                              */
/* -------------------------------------------------------------------------- */

const QuotationDetailsPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: messages.length + 1,
      name: "Ananya Sharma",
      role: "Super Admin",
      message: text,
      time: "Just now",
      isSelf: true,
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setDraft("");
  };

  return (
    <div className="space-y-6">
      {/* A. QUOTATION SUMMARY */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Quotation Summary
          </h2>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {quotationSummary.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          <SummaryItem label="Quotation Number" value={quotationSummary.quotationNumber} />
          <SummaryItem label="Quotation Date" value={quotationSummary.quotationDate} />
          <SummaryItem label="Valid Until" value={quotationSummary.validUntil} />
          <SummaryItem label="Company" value={quotationSummary.company} />
          <SummaryItem label="Prepared By" value={quotationSummary.preparedBy} />
          <SummaryItem label="Currency" value={quotationSummary.currency} />
          <SummaryItem label="Payment Terms" value={quotationSummary.paymentTerms} />
        </div>
      </section>

      {/* B. MACHINE / SERVICE PRICING */}
      <SectionCard icon={FileText} title="Machine / Service Pricing">
        <div className="-mx-6 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">#</th>
                <th className="px-6 py-3 font-medium">Machine / Equipment</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Qty</th>
                <th className="px-6 py-3 font-medium">Unit Price</th>
                <th className="px-6 py-3 font-medium">Monthly</th>
                <th className="px-6 py-3 font-medium">One-Time</th>
                <th className="px-6 py-3 font-medium">Tax</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pricingRows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-blue-50/40">
                  <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {r.machine}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{r.description}</td>
                  <td className="px-6 py-4 text-gray-700">{r.qty}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {currency(r.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {currency(r.monthlyCharge)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {currency(r.oneTimeCharge)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{r.taxPct}%</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {currency(rowTotal(r))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* C + D — Fees / Licence side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* C. ONE-TIME IMPLEMENTATION FEE */}
        <SectionCard icon={Wallet} title="One-Time Implementation Fee">
          <ul className="divide-y divide-gray-100">
            {implementationFees.map((f) => (
              <li key={f.label} className="flex items-center justify-between py-3 text-sm">
                <span className="text-gray-600">{f.label}</span>
                <span className="font-medium text-gray-900">
                  {currency(f.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm font-semibold text-gray-900">
              Total One-Time Fee
            </span>
            <span className="text-sm font-semibold text-blue-600">
              {currency(oneTimeTotal)}
            </span>
          </div>
        </SectionCard>

        {/* D. MONTHLY SITE LICENCE */}
        <SectionCard icon={CalendarRange} title="Monthly Site Licence">
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <SummaryItem label="Licence Period" value={monthlyLicence.period} />
            <SummaryItem
              label="Sites Covered"
              value={`${monthlyLicence.sites} sites`}
            />
            <SummaryItem
              label="Machines Covered"
              value={`${monthlyLicence.machines} machines`}
            />
            <SummaryItem
              label="Monthly Amount"
              value={currency(monthlyLicence.monthlyAmount)}
            />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
            <span className="text-sm font-medium text-blue-700">
              Monthly Subtotal
            </span>
            <span className="text-sm font-semibold text-blue-700">
              {currency(monthlyTotal)}
            </span>
          </div>
        </SectionCard>
      </div>

      {/* E. ADDITIONAL CHARGES */}
      <SectionCard icon={PlusCircle} title="Additional Services" subtitle="Shown separately from the core quotation total">
        <div className="-mx-6 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-3 font-medium">Service</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Qty</th>
                <th className="px-6 py-3 font-medium">Unit Cost</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {additionalServices.map((a) => (
                <tr key={a.id} className="hover:bg-blue-50/40">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {a.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{a.description}</td>
                  <td className="px-6 py-4 text-gray-700">{a.qty}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {currency(a.unitCost)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {currency(a.unitCost * a.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* F. FINANCIAL SUMMARY */}
      <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold text-gray-900">
          Financial Summary
        </h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium text-gray-900">{currency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Discount</span>
            <span className="font-medium text-red-500">−{currency(discount)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>One-Time Charges</span>
            <span className="font-medium text-gray-900">{currency(oneTimeTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Monthly Charges</span>
            <span className="font-medium text-gray-900">{currency(monthlyTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Additional Charges</span>
            <span className="font-medium text-gray-900">{currency(additionalTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (18%)</span>
            <span className="font-medium text-gray-900">{currency(tax)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-600 px-4 py-4">
            <span className="text-sm font-semibold text-white">Grand Total</span>
            <span className="text-xl font-bold text-white">{currency(grandTotal)}</span>
          </div>
        </div>
      </section>

      {/* G. ADMIN MESSAGES / CHAT */}
      <SectionCard icon={Send} title="Messages" subtitle="Conversation linked to this quotation">
        <div className="mb-4 max-h-80 space-y-4 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.isSelf ? "flex-row-reverse text-right" : ""}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {m.name.charAt(0)}
              </div>
              <div className={`max-w-[80%] ${m.isSelf ? "items-end" : "items-start"} flex flex-col`}>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-gray-700">{m.name}</span>
                  <span>· {m.role}</span>
                </div>
                <div
                  className={`mt-1 rounded-2xl px-4 py-2 text-sm ${
                    m.isSelf
                      ? "rounded-tr-sm bg-blue-600 text-white"
                      : "rounded-tl-sm bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.message}
                </div>
                <span className="mt-1 text-[11px] text-gray-400">
                  {m.time} {m.isSelf && (m.read ? "· Read" : "· Sent")}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message about this quotation..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!draft.trim()}
          >
            <Send size={14} />
            Send
          </button>
        </div>
      </SectionCard>

      {/* H. ATTACHMENTS */}
      <SectionCard icon={Paperclip} title="Attachments">
        <ul className="divide-y divide-gray-100">
          {attachments.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50">
                  {fileIcon(f.type)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded by {f.uploadedBy} · {f.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                <Download size={13} />
                Download
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
};

export default QuotationDetailsPage;