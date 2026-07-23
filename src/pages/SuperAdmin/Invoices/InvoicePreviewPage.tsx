import { useParams, useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";

import { billingService } from "../../../services/SuperAdmin/billingService";

import {
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  Hash,
  Layers,
  CreditCard,
} from "lucide-react";

const mockInvoices: BillingHistory[] = [
  {
    id: "1",
    invoiceNo: "HMEC-INV-2026-000001",
    companyName: "CapeRock Mining Pty Ltd",
    companyEmail: "accounts@caperockmining.co.za",
    companyAddress:
      "14 Mineral Ridge Road, Rustenburg Mining Zone, North West, South Africa, 0300",
    companyPhone: "+27 14 555 0192",
    contactPerson: "Johan van der Merwe",
    companyGst: "ZA-GST-4892730-01",
    planName: "Pro Plan",
    billingCycle: "Monthly",
    planLimit: "50 Machines",
    userLimit: "25 Users",
    planBenefits: [
      { label: "Real-time machine health monitoring" },
      { label: "Component analytics (Engine, Tyre, Hydraulic, Suspension)" },
      { label: "Maintenance scheduling & alerts" },
      { label: "Multi-site fleet management" },
      { label: "Finance & invoice history" },
      { label: "API access & integrations" },
    ],
    subscriptionStart: "2026-05-10",
    subscriptionEnd: "2026-06-10",
    currency: "ZAR",
    amount: 4999,
    taxBreakdowns: [
      { label: "VAT (15%)", rate: 15, amount: 749.85 },
      { label: "Service Tax (3%)", rate: 3, amount: 149.97 },
    ],
    tax: 900,
    paidToDate: 5899,
    paymentMethod: "PayFast",
    transactionId: "TXN-PF-982734",
    paymentDate: "2026-05-10",
    lastPaymentDate: "2026-04-10",
    nextBillingDate: "2026-06-10",
    status: "paid",
    invoiceDate: "2026-05-10",
    dueDate: "2026-06-10",
    generatedBy: "System (Auto-billing)",
    timezone: "Africa/Johannesburg (UTC+2)",
    items: [
      {
        item: "Pro Plan — Monthly",
        description:
          "Monthly subscription for machine intelligence dashboard (50 machines)",
        unitCost: 4999,
        quantity: 1,
      },
      {
        item: "Component Reports",
        description:
          "Engine, tyre, hydraulic and suspension analytics — included",
        unitCost: 0,
        quantity: 1,
      },
      {
        item: "Invoice Storage",
        description: "Finance history and saved invoice access — included",
        unitCost: 0,
        quantity: 1,
      },
      {
        item: "API Access",
        description: "REST API access for integrations — included",
        unitCost: 0,
        quantity: 1,
      },
    ],
  },
  {
    id: "2",
    invoiceNo: "HMEC-INV-2026-000002",
    companyName: "Goldfields West Operations",
    companyEmail: "billing@gwo.co.za",
    companyAddress: "Carletonville, Gauteng, South Africa",
    companyPhone: "+27 18 786 0034",
    contactPerson: "Sipho Dlamini",
    companyGst: "ZA-GST-5512344-02",
    planName: "Enterprise Plan",
    billingCycle: "Yearly",
    planLimit: "200 Machines",
    userLimit: "100 Users",
    planBenefits: [
      { label: "All Pro Plan features" },
      { label: "Dedicated account manager" },
      { label: "Custom reporting & exports" },
      { label: "Priority support (24/7)" },
      { label: "White-label option" },
    ],
    subscriptionStart: "2026-01-01",
    subscriptionEnd: "2026-12-31",
    currency: "ZAR",
    amount: 49999,
    taxBreakdowns: [
      { label: "VAT (15%)", rate: 15, amount: 7499.85 },
      { label: "Service Tax (3%)", rate: 3, amount: 1499.97 },
    ],
    tax: 9000,
    paidToDate: 0,
    paymentMethod: "EFT Bank Transfer",
    transactionId: "TXN-EFT-772341",
    paymentDate: "",
    lastPaymentDate: "2025-12-31",
    nextBillingDate: "2027-01-01",
    status: "pending",
    invoiceDate: "2026-01-01",
    dueDate: "2026-01-15",
    generatedBy: "Admin — Keanu Mathews",
    timezone: "Africa/Johannesburg (UTC+2)",
    items: [
      {
        item: "Enterprise Plan — Yearly",
        description:
          "Annual subscription for machine intelligence platform (200 machines)",
        unitCost: 49999,
        quantity: 1,
      },
      {
        item: "Dedicated Support",
        description: "24/7 priority support + dedicated account manager",
        unitCost: 0,
        quantity: 1,
      },
    ],
  },
  {
    id: "3",
    invoiceNo: "HMEC-INV-2025-000031",
    companyName: "Anglo Platinum Thabazimbi",
    companyEmail: "finance@apt.co.za",
    companyAddress: "Thabazimbi, Limpopo, South Africa",
    companyPhone: "+27 14 777 0092",
    contactPerson: "Marie Fourie",
    companyGst: "ZA-GST-6612210-03",
    planName: "Starter Plan",
    billingCycle: "Monthly",
    planLimit: "10 Machines",
    userLimit: "5 Users",
    planBenefits: [
      { label: "Basic machine health monitoring" },
      { label: "Maintenance alerts" },
      { label: "Invoice history (3 months)" },
    ],
    subscriptionStart: "2025-11-01",
    subscriptionEnd: "2025-12-01",
    currency: "ZAR",
    amount: 999,
    taxBreakdowns: [{ label: "VAT (15%)", rate: 15, amount: 149.85 }],
    tax: 150,
    paidToDate: 0,
    paymentMethod: "Credit Card",
    transactionId: "TXN-CC-443211",
    paymentDate: "",
    lastPaymentDate: "2025-10-01",
    nextBillingDate: "2025-12-01",
    status: "overdue",
    invoiceDate: "2025-11-01",
    dueDate: "2025-11-15",
    generatedBy: "System (Auto-billing)",
    timezone: "Africa/Johannesburg (UTC+2)",
    items: [
      {
        item: "Starter Plan — Monthly",
        description: "Monthly subscription — 10 machines",
        unitCost: 999,
        quantity: 1,
      },
    ],
  },
  {
    id: "4",
    invoiceNo: "HMEC-INV-2026-000003",
    companyName: "Sibanye-Stillwater Kloof",
    companyEmail: "accounts@ssk.co.za",
    companyAddress: "Kloof, KwaZulu-Natal, South Africa",
    companyPhone: "+27 31 509 0017",
    contactPerson: "Bongani Zulu",
    companyGst: "ZA-GST-7712380-04",
    planName: "Pro Plan",
    billingCycle: "Monthly",
    planLimit: "50 Machines",
    userLimit: "25 Users",
    planBenefits: [
      { label: "Real-time machine health monitoring" },
      { label: "Component analytics" },
      { label: "Maintenance scheduling" },
    ],
    subscriptionStart: "2026-04-01",
    subscriptionEnd: "2026-05-01",
    currency: "ZAR",
    amount: 4999,
    taxBreakdowns: [
      { label: "VAT (15%)", rate: 15, amount: 749.85 },
      { label: "Service Tax (3%)", rate: 3, amount: 149.97 },
    ],
    tax: 900,
    paidToDate: 5899,
    paymentMethod: "PayFast",
    transactionId: "TXN-PF-883901",
    paymentDate: "2026-04-01",
    lastPaymentDate: "2026-03-01",
    nextBillingDate: "2026-05-01",
    status: "paid",
    invoiceDate: "2026-04-01",
    dueDate: "2026-04-15",
    generatedBy: "System (Auto-billing)",
    timezone: "Africa/Johannesburg (UTC+2)",
    items: [
      {
        item: "Pro Plan — Monthly",
        description: "Monthly subscription — 50 machines",
        unitCost: 4999,
        quantity: 1,
      },
    ],
  },
];


const dummyInvoiceDetails = {
   customer: {},
   company: {},
   billing: {},
   payment: {},
   plan: {},
   subscription: {},
   history: []
}

type InvoiceStatus = "paid" | "pending" | "failed" | "overdue";
type BillingCycle = "Monthly" | "Yearly";

type PlanBenefit = {
  label: string;
};

type InvoiceLineItem = {
  item: string;
  description: string;
  unitCost: number;
  quantity: number;
};

type TaxBreakdown = {
  label: string;
  rate: number;
  amount: number;
};

type BillingHistory = {
  id: string;
  invoiceNo: string;
  // Company
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  companyPhone: string;
  contactPerson: string;
  companyGst: string;
  // Plan
  planName: string;
  billingCycle: BillingCycle;
  planLimit: string;
  userLimit: string;
  planBenefits: PlanBenefit[];
  subscriptionStart: string;
  subscriptionEnd: string;
  // Financial
  amount: number;
  currency: string;
  taxBreakdowns: TaxBreakdown[];
  tax: number;
  paidToDate: number;
  paymentMethod: string;
  transactionId: string;
  paymentDate: string;
  lastPaymentDate: string;
  nextBillingDate: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  // Meta
  generatedBy: string;
  timezone: string;
  items: InvoiceLineItem[];

  
};

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; lightCls: string; darkCls: string; icon: React.ReactNode }
> = {
  paid: {
    label: "PAID",
    lightCls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    darkCls:
      "dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700",
    icon: <CheckCircle size={14} />,
  },
  pending: {
    label: "PENDING",
    lightCls: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    darkCls: "dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-700",
    icon: <Clock size={14} />,
  },
  failed: {
    label: "FAILED",
    lightCls: "bg-red-50 text-red-700 ring-1 ring-red-200",
    darkCls: "dark:bg-red-900/30 dark:text-red-400 dark:ring-red-700",
    icon: <XCircle size={14} />,
  },
  overdue: {
    label: "OVERDUE",
    lightCls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    darkCls: "dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-700",
    icon: <AlertCircle size={14} />,
  },
};

const StatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${cfg.lightCls} ${cfg.darkCls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const formatCurrency = (amount: number, currency = "ZAR") => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getLineTotal = (item: InvoiceLineItem) => item.unitCost * item.quantity;

const getInvoiceSubtotal = (inv: BillingHistory) =>
  (inv.items || []).reduce(
    (s, i) => s + getLineTotal(i),
    0,
  );

const getInvoiceTotal = (inv: BillingHistory) =>
  getInvoiceSubtotal(inv) + inv.tax;
const getInvoiceDue = (inv: BillingHistory) =>
  Math.max(getInvoiceTotal(inv) - inv.paidToDate, 0);

// ─── Small helper components ─────────────────────────────────────────────────

const MetaRow = ({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) => (
  <div className="flex justify-between gap-6 border-b border-white/10 py-1.5 text-sm last:border-0">
    <span className="text-blue-100">{label}</span>
    <span className={bold ? "font-black" : "font-semibold"}>{value}</span>
  </div>
);

// Invoice-internal row (white bg, no dark classes — print safe)
const IRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs font-semibold text-slate-400">{label}</span>
    <span className="text-right text-xs font-black text-slate-800">
      {value}
    </span>
  </div>
);

// Invoice-internal amount row
const IAmt = ({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) => (
  <div
    className={`flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 ${
      highlight ? "text-orange-600" : "text-slate-700"
    }`}
  >
    <span
      className={`text-xs ${strong || highlight ? "font-black" : "font-semibold"}`}
    >
      {label}
    </span>
    <span
      className={`text-xs ${strong || highlight ? "font-black" : "font-semibold"}`}
    >
      {value}
    </span>
  </div>
);

type InvoiceTemplateProps = {
  invoice: BillingHistory;
};

const InvoiceTemplate = ({ invoice }: InvoiceTemplateProps) => {
  const subtotal = getInvoiceSubtotal(invoice);
  const total = getInvoiceTotal(invoice);
  const partialDue = getInvoiceDue(invoice);

  const watermarkColor =
    invoice.status === "paid"
      ? "rgba(16,185,129,0.10)"
      : invoice.status === "overdue"
        ? "rgba(244,63,94,0.10)"
        : "rgba(249,115,22,0.10)";

  const watermarkText =
    invoice.status === "paid"
      ? "PAID"
      : invoice.status === "overdue"
        ? "OVERDUE"
        : invoice.status === "pending"
          ? "PENDING"
          : "FAILED";

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-[2rem] bg-white text-slate-950 shadow-xl"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* ── Watermark ── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <span
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: watermarkColor,
            transform: "rotate(-30deg)",
            letterSpacing: 8,
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          {watermarkText}
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-orange-400 px-8 py-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {/* Branding */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black text-white backdrop-blur-sm ring-2 ring-white/20">
                HME
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  HME Component Intelligence System
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-blue-100">
                  Heavy Machinery Subscription & Finance Invoice
                </p>
                <p className="mt-0.5 text-xs text-blue-200">
                  support@hme-system.com · hme-system.com · South Africa
                </p>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="min-w-[240px] rounded-2xl bg-white/10 p-4 text-sm backdrop-blur-sm">
              <MetaRow label="Invoice No." value={invoice.invoiceNo} bold />
              <MetaRow
                label="Invoice Date"
                value={formatDate(invoice.invoiceDate)}
              />
              <MetaRow label="Due Date" value={formatDate(invoice.dueDate)} />
              <MetaRow label="Generated By" value={invoice.generatedBy} />
              <MetaRow label="Currency" value={invoice.currency} />
              <MetaRow label="Timezone" value={invoice.timezone} />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="space-y-4 px-7 py-6">
          {/* Bill To + Subscription Details */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Bill To */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600">
                <Building2 size={12} /> Bill To
              </p>
              <p className="text-[15px] font-black text-slate-900">
                {invoice.companyName}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {invoice.companyAddress}
              </p>
              <div className="mt-3 space-y-1.5">
                {[
                  { icon: <User size={11} />, text: invoice.contactPerson },
                  { icon: <Phone size={11} />, text: invoice.companyPhone },
                  { icon: <Mail size={11} />, text: invoice.companyEmail },
                  {
                    icon: <Hash size={11} />,
                    text: `GST: ${invoice.companyGst}`,
                    bold: true,
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-slate-500"
                  >
                    <span className="flex-shrink-0 text-slate-300">
                      {row.icon}
                    </span>
                    <span
                      className={row.bold ? "font-semibold text-slate-700" : ""}
                    >
                      {row.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Details */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600">
                <Layers size={12} /> Subscription Details
              </p>
              <div className="space-y-2.5">
                <IRow label="Plan" value={invoice.planName} />
                <IRow label="Billing Cycle" value={invoice.billingCycle} />
                <IRow label="Machine Limit" value={invoice.planLimit} />
                <IRow label="User Limit" value={invoice.userLimit} />
                <IRow
                  label="Period"
                  value={`${formatDate(invoice.subscriptionStart)} – ${formatDate(invoice.subscriptionEnd)}`}
                />
              </div>
            </div>
          </div>

          {/* Plan Benefits */}
          {invoice.planBenefits.length > 0 && (
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="mb-2.5 text-xs font-black uppercase tracking-wider text-blue-600">
                Plan Benefits Included
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {(invoice.planBenefits || []).map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-blue-800"
                  >
                    <CheckCircle
                      size={12}
                      className="flex-shrink-0 text-blue-500"
                    />
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {[
                    "Item",
                    "Description",
                    "Unit Cost",
                    "Qty",
                    "Line Total",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-black uppercase tracking-wider ${
                        h === "Line Total" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${i % 2 !== 0 ? "bg-slate-50/50" : ""}`}
                  >
                    <td className="px-4 py-3.5 align-top text-xs font-black text-slate-900">
                      {item.item}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs leading-5 text-slate-500">
                      {item.description}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs font-semibold text-slate-700">
                      {item.unitCost > 0 ? (
                        formatCurrency(item.unitCost, invoice.currency)
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">
                          Included
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs font-semibold text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right align-top text-xs font-black text-slate-900">
                      {item.unitCost > 0
                        ? formatCurrency(getLineTotal(item), invoice.currency)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom section: Tax + Payment | Totals + Meta */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left col */}
            <div className="space-y-4">
              {/* Tax Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  Tax Breakdown
                </p>
                <div className="space-y-2">
                  {invoice.taxBreakdowns.map((t, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-500">{t.label}</span>
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(t.amount, invoice.currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-xs font-black text-slate-900">
                    <span>Total Tax</span>
                    <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
                  <CreditCard size={11} /> Payment Info
                </p>
                <div className="space-y-2.5">
                  <IRow label="Method" value={invoice.paymentMethod} />
                  <IRow label="Transaction ID" value={invoice.transactionId} />
                  {invoice.paymentDate && (
                    <IRow
                      label="Payment Date"
                      value={formatDate(invoice.paymentDate)}
                    />
                  )}
                  <IRow
                    label="Last Payment"
                    value={formatDate(invoice.lastPaymentDate)}
                  />
                  <IRow
                    label="Next Billing"
                    value={formatDate(invoice.nextBillingDate)}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-black text-orange-700">Note</p>
                <p className="mt-1 text-xs leading-5 text-orange-600">
                  Invoice generated for HME subscription. Payment is linked with
                  subscription activation and saved in finance history.
                </p>
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4">
              {/* Amount Summary */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  Amount Summary
                </p>
                <div className="space-y-2">
                  <IAmt
                    label="Subtotal"
                    value={formatCurrency(subtotal, invoice.currency)}
                  />
                  <IAmt
                    label="Total Tax"
                    value={formatCurrency(invoice.tax, invoice.currency)}
                  />
                  <IAmt
                    label="Total"
                    value={formatCurrency(total, invoice.currency)}
                    strong
                  />
                  <IAmt
                    label="Paid to Date"
                    value={formatCurrency(invoice.paidToDate, invoice.currency)}
                  />
                  <IAmt
                    label="Amount Due"
                    value={formatCurrency(partialDue, invoice.currency)}
                    highlight
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-400">
                    Payment Status
                  </span>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>

              {/* Invoice Metadata */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  Invoice Metadata
                </p>
                <div className="space-y-2.5">
                  <IRow
                    label="Generated"
                    value={formatDate(invoice.invoiceDate)}
                  />
                  <IRow label="Generated By" value={invoice.generatedBy} />
                  <IRow label="Currency" value={invoice.currency} />
                  <IRow label="Timezone" value={invoice.timezone} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-orange-400 px-7 py-5 text-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black">
                HME Component Intelligence System
              </p>
              <p className="mt-0.5 text-xs text-blue-100">
                support@hme-system.com · hme-system.com
              </p>
            </div>
            <div className="text-xs leading-5 text-blue-100 md:text-right">
              <p>Mining Component Intelligence Platform · South Africa</p>
              <p>{invoice.timezone}</p>
              <p className="mt-1 italic text-blue-200">Page 1 of 1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoicePreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchInvoice = async () => {
    try {
      if (!id) return;

      setLoading(true);

      const response: any =
  await billingService.getSubscriptionById(id);

setInvoice({
  id: response.id,

  invoiceNo: `INV-${response.id?.slice(0, 8)}`,

  companyName: "N/A",
  companyEmail: "",
  companyAddress: "",
  companyPhone: "",
  contactPerson: "",
  companyGst: "",

  planName: response.plan?.planName || "N/A",

  billingCycle: "Monthly",

  planLimit: String(
    response.plan?.machineLimit || 0,
  ),

  userLimit: String(
    response.plan?.staffLimit || 0,
  ),

  planBenefits: [],

  subscriptionStart:
    response.subscriptionStartDate || "",

  subscriptionEnd:
    response.subscriptionEndDate || "",

  amount: Number(
    response.plan?.price || 0,
  ),

  currency: "ZAR",

  taxBreakdowns: [],

  tax: 0,

  paidToDate:
    response.paymentStatus === "PAID"
      ? Number(response.plan?.price || 0)
      : 0,

  paymentMethod: "-",

  transactionId: "-",

  paymentDate: "",

  lastPaymentDate: "",

  nextBillingDate:
    response.subscriptionEndDate || "",

  status:
    response.paymentStatus === "PAID"
      ? "paid"
      : response.paymentStatus === "PENDING"
        ? "pending"
        : "failed",

  invoiceDate:
    response.createdAt || "",

  dueDate:
    response.subscriptionEndDate || "",

  generatedBy: "System",

  timezone: "UTC",

  items: [
    {
      item:
        response.plan?.planName || "Plan",
      description:
        "Subscription Plan",
      unitCost: Number(
        response.plan?.price || 0,
      ),
      quantity: 1,
    },
  ],
});


    } catch (error) {
      console.error("Invoice fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const [invoice, setInvoice] = useState<BillingHistory | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading Invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h2 className="text-xl font-bold">Invoice Not Found</h2>
      </div>
    );
  }
  const handleDownload = () => {
    const content = invoiceRef.current?.innerHTML;

    if (!content) return;

    const win = window.open("", "_blank", "width=1000,height=800");

    if (!win) return;

    win.document.write(`
    <html>
      <head>
        <title>${invoice?.invoiceNo}</title>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);

    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      <div ref={invoiceRef}>
        <InvoiceTemplate invoice={invoice} />
      </div>
    </div>
  );
};

export default InvoicePreviewPage;
