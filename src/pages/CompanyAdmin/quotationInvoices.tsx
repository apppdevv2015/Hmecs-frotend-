import React, { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Info,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE" | "CANCELLED" | "REFUNDED";

type CurrencyCode = "INR";

interface Party {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface InvoiceAmounts {
  subtotal: number;
  tax: number;
  additionalCharges: number;
  total: number;
  amountPaid: number;
  currency: CurrencyCode;
}

interface PaymentDetails {
  method: string;
  transactionId: string;
  paymentDate: string;
}

interface InvoiceDocument {
  fileName: string;
  version: string;
}

interface Invoice {
  invoiceNumber: string;
  contractNumber: string;
  quotationNumber: string;
  billingPeriod: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  serviceDescription: string;
  sites: string[];
  machines: string[];
  billTo: Party;
  from: Party;
  amounts: InvoiceAmounts;
  payment: PaymentDetails;
  document: InvoiceDocument;
}

/* ============================================================
   ISSUING COMPANY (constant across every invoice)
   ============================================================ */

const HME_PARTY: Party = {
  name: "HME Component Intelligence Systems",
  email: "billing@hme-cis.com",
  phone: "+91 124 456 7890",
  address: "Tower B, Cyber Hub, Gurugram, Haryana, India",
};

/* ============================================================
   DUMMY DATA
   ------------------------------------------------------------
   Shaped exactly like the payload the invoices API will return
   (array of fully-populated Invoice records). Every field below
   is intentionally filled in — there is no "empty" or "not yet
   generated" invoice state to render, so the UI never needs a
   fallback/placeholder path for missing data.

   BACKEND TODO: replace `invoiceService.list()`'s dummy resolve
   with a real `GET /api/invoices` call. Keep the response shaped
   as Invoice[] so no UI changes are required on integration.
   ============================================================ */

const DUMMY_INVOICES: Invoice[] = [
  {
    invoiceNumber: "INV-2026-0001",
    contractNumber: "CTR-2026-0001",
    quotationNumber: "QR-2025-0001",
    billingPeriod: "Aug 2026",
    issueDate: "01 Aug 2026",
    dueDate: "15 Aug 2026",
    status: "PAID",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Iron Valley Mine"],
    machines: ["Excavator EX-220", "Haul Truck HT-40"],
    billTo: {
      name: "Orion Mining Pvt. Ltd.",
      email: "accounts@orionmining.co.in",
      phone: "+91 98765 43210",
      address: "Plot 14, Industrial Area Phase II, Jharkhand, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 21500, tax: 3000, additionalCharges: 500, total: 25000, amountPaid: 25000, currency: "INR" },
    payment: { method: "NEFT Bank Transfer", transactionId: "TXN-48213076", paymentDate: "03 Aug 2026" },
    document: { fileName: "Invoice-INV-2026-0001.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0002",
    contractNumber: "CTR-2026-0001",
    quotationNumber: "QR-2025-0001",
    billingPeriod: "Sep 2026",
    issueDate: "01 Sep 2026",
    dueDate: "15 Sep 2026",
    status: "PENDING",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Iron Valley Mine"],
    machines: ["Excavator EX-220", "Haul Truck HT-40"],
    billTo: {
      name: "Orion Mining Pvt. Ltd.",
      email: "accounts@orionmining.co.in",
      phone: "+91 98765 43210",
      address: "Plot 14, Industrial Area Phase II, Jharkhand, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 21500, tax: 3000, additionalCharges: 500, total: 25000, amountPaid: 0, currency: "INR" },
    payment: { method: "Awaiting Payment", transactionId: "Not Generated", paymentDate: "Not Paid Yet" },
    document: { fileName: "Invoice-INV-2026-0002.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0003",
    contractNumber: "CTR-2026-0002",
    quotationNumber: "QR-2025-0002",
    billingPeriod: "Aug 2026",
    issueDate: "05 Aug 2026",
    dueDate: "20 Aug 2026",
    status: "OVERDUE",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Meridian Steel Yard"],
    machines: ["Crusher CR-500", "Loader LD-90"],
    billTo: {
      name: "Meridian Steel Works",
      email: "finance@meridiansteel.com",
      phone: "+91 98220 11223",
      address: "MIDC Industrial Estate, Nagpur, Maharashtra, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 36500, tax: 5500, additionalCharges: 500, total: 42500, amountPaid: 0, currency: "INR" },
    payment: { method: "Awaiting Payment", transactionId: "Not Generated", paymentDate: "Not Paid Yet" },
    document: { fileName: "Invoice-INV-2026-0003.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0004",
    contractNumber: "CTR-2026-0003",
    quotationNumber: "QR-2025-0003",
    billingPeriod: "Aug 2026",
    issueDate: "10 Aug 2026",
    dueDate: "25 Aug 2026",
    status: "PAID",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Highland Coal Block A"],
    machines: ["Dragline DL-12", "Conveyor CV-3"],
    billTo: {
      name: "Highland Coal Corp",
      email: "billing@highlandcoal.in",
      phone: "+91 97170 55210",
      address: "Coalfield Road, Dhanbad, Jharkhand, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 26500, tax: 4000, additionalCharges: 500, total: 31000, amountPaid: 31000, currency: "INR" },
    payment: { method: "UPI", transactionId: "TXN-77410092", paymentDate: "12 Aug 2026" },
    document: { fileName: "Invoice-INV-2026-0004.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0005",
    contractNumber: "CTR-2026-0002",
    quotationNumber: "QR-2025-0002",
    billingPeriod: "Sep 2026",
    issueDate: "05 Sep 2026",
    dueDate: "20 Sep 2026",
    status: "PENDING",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Meridian Steel Yard"],
    machines: ["Crusher CR-500", "Loader LD-90"],
    billTo: {
      name: "Meridian Steel Works",
      email: "finance@meridiansteel.com",
      phone: "+91 98220 11223",
      address: "MIDC Industrial Estate, Nagpur, Maharashtra, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 36500, tax: 5500, additionalCharges: 500, total: 42500, amountPaid: 0, currency: "INR" },
    payment: { method: "Awaiting Payment", transactionId: "Not Generated", paymentDate: "Not Paid Yet" },
    document: { fileName: "Invoice-INV-2026-0005.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0006",
    contractNumber: "CTR-2026-0004",
    quotationNumber: "QR-2025-0004",
    billingPeriod: "Oct 2026",
    issueDate: "01 Oct 2026",
    dueDate: "15 Oct 2026",
    status: "PENDING",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Sunridge Quarry East"],
    machines: ["Drill Rig DR-7"],
    billTo: {
      name: "Sunridge Quarries Ltd.",
      email: "payments@sunridgequarries.com",
      phone: "+91 96500 44110",
      address: "Quarry Zone 3, Udaipur, Rajasthan, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 24000, tax: 3500, additionalCharges: 500, total: 28000, amountPaid: 0, currency: "INR" },
    payment: { method: "Awaiting Payment", transactionId: "Not Generated", paymentDate: "Not Paid Yet" },
    document: { fileName: "Invoice-INV-2026-0006.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0007",
    contractNumber: "CTR-2026-0001",
    quotationNumber: "QR-2025-0001",
    billingPeriod: "Oct 2026",
    issueDate: "01 Oct 2026",
    dueDate: "15 Oct 2026",
    status: "PAID",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Iron Valley Mine"],
    machines: ["Excavator EX-220", "Haul Truck HT-40"],
    billTo: {
      name: "Orion Mining Pvt. Ltd.",
      email: "accounts@orionmining.co.in",
      phone: "+91 98765 43210",
      address: "Plot 14, Industrial Area Phase II, Jharkhand, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 21500, tax: 3000, additionalCharges: 500, total: 25000, amountPaid: 25000, currency: "INR" },
    payment: { method: "NEFT Bank Transfer", transactionId: "TXN-90871234", paymentDate: "04 Oct 2026" },
    document: { fileName: "Invoice-INV-2026-0007.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0008",
    contractNumber: "CTR-2026-0005",
    quotationNumber: "QR-2025-0005",
    billingPeriod: "Nov 2026",
    issueDate: "01 Nov 2026",
    dueDate: "15 Nov 2026",
    status: "PENDING",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Blackstone Yard 2"],
    machines: ["Excavator EX-310", "Crusher CR-220"],
    billTo: {
      name: "Blackstone Aggregates",
      email: "ap@blackstoneagg.com",
      phone: "+91 91234 88760",
      address: "Sector 9, Industrial Belt, Ahmedabad, Gujarat, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 31500, tax: 4750, additionalCharges: 500, total: 36750, amountPaid: 0, currency: "INR" },
    payment: { method: "Awaiting Payment", transactionId: "Not Generated", paymentDate: "Not Paid Yet" },
    document: { fileName: "Invoice-INV-2026-0008.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0009",
    contractNumber: "CTR-2026-0003",
    quotationNumber: "QR-2025-0003",
    billingPeriod: "Sep 2026",
    issueDate: "10 Sep 2026",
    dueDate: "25 Sep 2026",
    status: "PAID",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Highland Coal Block A"],
    machines: ["Dragline DL-12", "Conveyor CV-3"],
    billTo: {
      name: "Highland Coal Corp",
      email: "billing@highlandcoal.in",
      phone: "+91 97170 55210",
      address: "Coalfield Road, Dhanbad, Jharkhand, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 26500, tax: 4000, additionalCharges: 500, total: 31000, amountPaid: 31000, currency: "INR" },
    payment: { method: "UPI", transactionId: "TXN-55620187", paymentDate: "14 Sep 2026" },
    document: { fileName: "Invoice-INV-2026-0009.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0010",
    contractNumber: "CTR-2026-0006",
    quotationNumber: "QR-2025-0006",
    billingPeriod: "Nov 2026",
    issueDate: "03 Nov 2026",
    dueDate: "18 Nov 2026",
    status: "OVERDUE",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Northgate Pit 4"],
    machines: ["Haul Truck HT-55", "Loader LD-120"],
    billTo: {
      name: "Northgate Mining Co.",
      email: "invoices@northgatemining.com",
      phone: "+91 90000 12345",
      address: "Northgate Complex, Bellary, Karnataka, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 45000, tax: 6800, additionalCharges: 500, total: 52300, amountPaid: 0, currency: "INR" },
    payment: { method: "Awaiting Payment", transactionId: "Not Generated", paymentDate: "Not Paid Yet" },
    document: { fileName: "Invoice-INV-2026-0010.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0011",
    contractNumber: "CTR-2026-0004",
    quotationNumber: "QR-2025-0004",
    billingPeriod: "Nov 2026",
    issueDate: "01 Nov 2026",
    dueDate: "15 Nov 2026",
    status: "CANCELLED",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Sunridge Quarry East"],
    machines: ["Drill Rig DR-7"],
    billTo: {
      name: "Sunridge Quarries Ltd.",
      email: "payments@sunridgequarries.com",
      phone: "+91 96500 44110",
      address: "Quarry Zone 3, Udaipur, Rajasthan, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 24000, tax: 3500, additionalCharges: 500, total: 28000, amountPaid: 0, currency: "INR" },
    payment: { method: "Not Applicable", transactionId: "Not Applicable", paymentDate: "Not Applicable" },
    document: { fileName: "Invoice-INV-2026-0011.pdf", version: "1.0" },
  },
  {
    invoiceNumber: "INV-2026-0012",
    contractNumber: "CTR-2026-0005",
    quotationNumber: "QR-2025-0005",
    billingPeriod: "Dec 2026",
    issueDate: "01 Dec 2026",
    dueDate: "15 Dec 2026",
    status: "REFUNDED",
    serviceDescription: "Machine Health Monitoring — Monthly Subscription",
    sites: ["Blackstone Yard 2"],
    machines: ["Excavator EX-310", "Crusher CR-220"],
    billTo: {
      name: "Blackstone Aggregates",
      email: "ap@blackstoneagg.com",
      phone: "+91 91234 88760",
      address: "Sector 9, Industrial Belt, Ahmedabad, Gujarat, India",
    },
    from: HME_PARTY,
    amounts: { subtotal: 31500, tax: 4750, additionalCharges: 500, total: 36750, amountPaid: 0, currency: "INR" },
    payment: { method: "NEFT Bank Transfer (Refunded)", transactionId: "TXN-33410567", paymentDate: "03 Dec 2026" },
    document: { fileName: "Invoice-INV-2026-0012.pdf", version: "1.0" },
  },
];

/* ============================================================
   MOCK SERVICE LAYER
   ------------------------------------------------------------
   BACKEND TODO: swap the body of `list()` for a real API call,
   e.g.:
     const response = await apiCall<Invoice[]>("/api/invoices");
     return response.data;
   Keep the Promise<Invoice[]> contract so no caller changes are
   required.
   ============================================================ */

const invoiceService = {
  list: (): Promise<Invoice[]> =>
    new Promise((resolve) => {
      window.setTimeout(() => resolve(DUMMY_INVOICES), 600);
    }),
};

/* ============================================================
   STATUS METADATA
   ============================================================ */

const STATUS_META: Record<InvoiceStatus, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  PAID: {
    label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={13} />,
  },
  PENDING: {
    label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={13} />,
  },
  OVERDUE: {
   label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={13} />,
  },
  CANCELLED: {
 label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={13} />,
  },
  REFUNDED: {
   label: "Paid",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={13} />,
  },
};

const STATUS_FILTER_OPTIONS: Array<{ value: "ALL" | InvoiceStatus; label: string }> = [
  { value: "ALL", label: "All Statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

/* ============================================================
   FORMATTERS
   ============================================================ */

const formatCurrency = (amount: number, currency: CurrencyCode): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const escapePdfText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/* ============================================================
   PDF GENERATION
   ------------------------------------------------------------
   `drawInvoiceToPdf` renders one invoice starting at the top of
   whatever page is currently active on the given jsPDF instance.
   `buildInvoicePdf` wraps it for a single-invoice document, and
   `buildInvoicesExportPdf` reuses the same drawing routine across
   multiple pages for the bulk "Download Invoices" export.
   ============================================================ */

const drawInvoiceToPdf = (pdf: jsPDF, invoice: Invoice): void => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let y = 18;

  const ensureSpace = (height: number): void => {
    if (y + height <= pageHeight - 18) {
      return;
    }
    pdf.addPage();
    y = 18;
  };

  const sectionTitle = (title: string): void => {
    ensureSpace(14);
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin + 4, y + 6);
    y += 14;
  };

  const row = (label: string, value: string, strong = false): void => {
    ensureSpace(10);
    pdf.setFont("helvetica", strong ? "bold" : "normal");
    pdf.setFontSize(strong ? 10 : 9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(escapePdfText(label), margin, y);

    const wrapped: string[] = pdf.splitTextToSize(value, 80);
    pdf.text(
      wrapped.map((line) => escapePdfText(line)),
      pageWidth - margin - 80,
      y,
    );

    y += Math.max(7, wrapped.length * 5);
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42);
  pdf.text("INVOICE", margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(invoice.from.name, margin, y + 7);
  pdf.text(invoice.invoiceNumber, margin, y + 13);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.text("Quotation:", pageWidth - margin - 65, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.quotationNumber, pageWidth - margin - 42, y);

  pdf.setFont("helvetica", "bold");
  pdf.text("Contract:", pageWidth - margin - 65, y + 6);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.contractNumber, pageWidth - margin - 42, y + 6);

  pdf.setFont("helvetica", "bold");
  pdf.text("Issue Date:", pageWidth - margin - 65, y + 12);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.issueDate, pageWidth - margin - 42, y + 12);

  pdf.setFont("helvetica", "bold");
  pdf.text("Due Date:", pageWidth - margin - 65, y + 18);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.dueDate, pageWidth - margin - 42, y + 18);

  y += 28;

  sectionTitle("Billing Information");

  pdf.setDrawColor(226, 232, 240);
  const cardGap = 5;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardTop = y;

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, cardTop, cardWidth, 39, 2, 2, "FD");
  pdf.roundedRect(margin + cardWidth + cardGap, cardTop, cardWidth, 39, 2, 2, "FD");

  const drawParty = (party: Party, title: string, x: number): void => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(title.toUpperCase(), x + 4, cardTop + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(party.name, x + 4, cardTop + 13);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);

    let detailY = cardTop + 19;
    [party.email, party.phone, party.address].forEach((detail) => {
      const lines: string[] = pdf.splitTextToSize(detail, cardWidth - 8);
      pdf.text(lines, x + 4, detailY);
      detailY += lines.length * 4;
    });
  };

  drawParty(invoice.billTo, "Bill To", margin);
  drawParty(invoice.from, "From", margin + cardWidth + cardGap);

  y = cardTop + 46;

  sectionTitle("Monitoring Service");
  row("Service", invoice.serviceDescription);
  row("Billing Period", invoice.billingPeriod);
  row("Sites", invoice.sites.join(", "));
  row("Machines Covered", invoice.machines.join(", "));

  y += 3;

  sectionTitle("Payment Summary");
  row("Subtotal", formatCurrency(invoice.amounts.subtotal, invoice.amounts.currency));
  row("Applicable Tax", formatCurrency(invoice.amounts.tax, invoice.amounts.currency));
  row("Additional Charges", formatCurrency(invoice.amounts.additionalCharges, invoice.amounts.currency));
  row("Total Invoice Value", formatCurrency(invoice.amounts.total, invoice.amounts.currency), true);
  row("Amount Paid", formatCurrency(invoice.amounts.amountPaid, invoice.amounts.currency));
  row(
    "Balance Due",
    formatCurrency(Math.max(invoice.amounts.total - invoice.amounts.amountPaid, 0), invoice.amounts.currency),
    true,
  );

  y += 3;

  sectionTitle("Payment Information");
  row("Payment Method", invoice.payment.method);
  row("Transaction ID", invoice.payment.transactionId);
  row("Payment Date", invoice.payment.paymentDate);
  row("Payment Status", STATUS_META[invoice.status].label);

  ensureSpace(12);
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Document Version ${invoice.document.version} • Currency: ${invoice.amounts.currency}`,
    margin,
    pageHeight - 9,
  );
};

const buildInvoicePdf = (invoice: Invoice): jsPDF => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawInvoiceToPdf(pdf, invoice);
  return pdf;
};

const buildInvoicesExportPdf = (invoices: Invoice[]): jsPDF => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  invoices.forEach((invoice, index) => {
    if (index > 0) {
      pdf.addPage();
    }
    drawInvoiceToPdf(pdf, invoice);
  });
  return pdf;
};

const buildExportFileName = (): string => {
  const stamp = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date())
    .split("/")
    .join("-");
  return `Invoices-Export-${stamp}.pdf`;
};

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */

const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
};

interface RowActionsProps {
  invoice: Invoice;
  busyAction: "view" | "download" | null;
  onView: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
}

const RowActions: React.FC<RowActionsProps> = ({ invoice, busyAction, onView, onDownload }) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => onView(invoice)}
      disabled={busyAction !== null}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {busyAction === "view" ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
      <span>View PDF</span>
    </button>

    <button
      type="button"
      onClick={() => onDownload(invoice)}
      disabled={busyAction !== null}
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
    >
      {busyAction === "download" ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
      <span>Download PDF</span>
    </button>
  </div>
);

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const QuotationInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | InvoiceStatus>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");

  const [rowBusy, setRowBusy] = useState<{ invoiceNumber: string; action: "view" | "download" } | null>(null);
  const [rowActionError, setRowActionError] = useState<string>("");

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string>("");

  const fetchInvoices = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");

    try {
      const data = await invoiceService.list();
      setInvoices(data);
    } catch {
      setLoadError("Unable to load invoices. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  const billingPeriods = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    invoices.forEach((invoice) => {
      if (!seen.has(invoice.billingPeriod)) {
        seen.add(invoice.billingPeriod);
        ordered.push(invoice.billingPeriod);
      }
    });
    return ordered;
  }, [invoices]);

  const filteredInvoices = useMemo<Invoice[]>(() => {
    const term = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        term.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.contractNumber.toLowerCase().includes(term) ||
        invoice.billTo.name.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter;
      const matchesPeriod = periodFilter === "ALL" || invoice.billingPeriod === periodFilter;

      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [invoices, searchTerm, statusFilter, periodFilter]);

  const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== "ALL" || periodFilter !== "ALL";

  const handleReset = useCallback((): void => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPeriodFilter("ALL");
  }, []);

  const handleViewInvoice = useCallback((invoice: Invoice): void => {
    setRowActionError("");
    setRowBusy({ invoiceNumber: invoice.invoiceNumber, action: "view" });

    try {
      const pdf = buildInvoicePdf(invoice);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank");

      if (opened === null) {
        URL.revokeObjectURL(url);
        setRowActionError(`Pop-up blocked. Please allow pop-ups to view ${invoice.invoiceNumber}.`);
      } else {
        opened.opener = null;
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      setRowActionError(`Could not open ${invoice.invoiceNumber}. Please try again.`);
    } finally {
      setRowBusy(null);
    }
  }, []);

  const handleDownloadInvoice = useCallback((invoice: Invoice): void => {
    setRowActionError("");
    setRowBusy({ invoiceNumber: invoice.invoiceNumber, action: "download" });

    try {
      const pdf = buildInvoicePdf(invoice);
      pdf.save(invoice.document.fileName);
    } catch {
      setRowActionError(`Could not download ${invoice.invoiceNumber}. Please try again.`);
    } finally {
      setRowBusy(null);
    }
  }, []);

  const handleDownloadAll = useCallback((): void => {
    setExportError("");

    if (filteredInvoices.length === 0) {
      setExportError("There are no invoices to download for the current filters.");
      return;
    }

    setIsExporting(true);

    try {
      const pdf = buildInvoicesExportPdf(filteredInvoices);
      pdf.save(buildExportFileName());
    } catch {
      setExportError("Could not generate the invoices PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [filteredInvoices]);

  return (
    <div className="w-full min-w-0 pb-8">
      {/* Hides the native scrollbar on scrollable regions below while
          keeping wheel/touch/drag scrolling fully functional. Safe to
          keep even if `.hme-hide-scrollbar` is already defined globally
          elsewhere in the app — the rule is idempotent. */}
      <style>{`
        .hme-hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hme-hide-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1200px] space-y-5">
        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Request and download invoice PDFs generated from signed contracts.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={isExporting || isLoading || filteredInvoices.length === 0}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
          >
            {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Download Invoices
          </button>
        </div>

        {/* ==================================================
            INFO BANNER
        ================================================== */}

        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 sm:text-sm">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            Use <strong>View PDF</strong> or <strong>Download PDF</strong> on any row for a single invoice, or{" "}
            <strong>Download Invoices</strong> above to export every invoice matching your current filters as one PDF.
          </span>
        </div>

        {exportError !== "" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 sm:text-sm"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* ==================================================
            FILTER BAR
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search invoice, contract, or company..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | InvoiceStatus)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:w-44"
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:w-44"
              >
                <option value="ALL">All Periods</option>
                {billingPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={!hasActiveFilters}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </section>

        {/* ==================================================
            INVOICE HISTORY
        ================================================== */}

        <Section title="Invoice History" icon={<ReceiptText size={18} />}>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Below is the list of requested invoices.
            </p>
            {!isLoading && loadError === "" && (
              <p className="text-xs font-medium text-slate-400">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
            )}
          </div>

          {rowActionError !== "" && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 sm:text-sm"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{rowActionError}</span>
            </div>
          )}

          {isLoading && <TableSkeleton />}

          {!isLoading && loadError !== "" && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900/60 dark:bg-red-950/30">
              <AlertCircle size={22} className="text-red-500" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{loadError}</p>
              <button
                type="button"
                onClick={() => void fetchInvoices()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {!isLoading && loadError === "" && filteredInvoices.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-12 text-center dark:border-slate-800 dark:bg-slate-800/40">
              <FileText size={22} className="text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No invoices match your filters.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <RotateCcw size={13} />
                  Reset filters
                </button>
              )}
            </div>
          )}

          {!isLoading && loadError === "" && filteredInvoices.length > 0 && (
            <>
              {/* Desktop / large screens: scrollable data table */}
              <div className="hidden lg:block">
                <div className="hme-hide-scrollbar max-h-[560px] w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr>
                        {["Invoice No.", "Contract No.", "Billing Period", "Issue Date", "Due Date", "Amount", "Status", "Actions"].map(
                          (heading, index) => (
                            <th
                              key={heading}
                              className={`px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                                index === 5 ? "text-right" : "text-left"
                              }`}
                            >
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                      {filteredInvoices.map((invoice) => {
                        const busyAction = rowBusy?.invoiceNumber === invoice.invoiceNumber ? rowBusy.action : null;
                        return (
                          <tr key={invoice.invoiceNumber} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{invoice.contractNumber}</td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{invoice.billingPeriod}</td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{invoice.issueDate}</td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{invoice.dueDate}</td>
                            <td className="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-100">
                              {formatCurrency(invoice.amounts.total, invoice.amounts.currency)}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={invoice.status} />
                            </td>
                            <td className="px-5 py-4">
                              <RowActions
                                invoice={invoice}
                                busyAction={busyAction}
                                onView={handleViewInvoice}
                                onDownload={handleDownloadInvoice}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile / tablet: scrollable stacked cards */}
              <div className="lg:hidden">
                <div className="hme-hide-scrollbar max-h-[560px] w-full space-y-3 overflow-y-auto">
                  {filteredInvoices.map((invoice) => {
                    const busyAction = rowBusy?.invoiceNumber === invoice.invoiceNumber ? rowBusy.action : null;
                    return (
                      <div
                        key={invoice.invoiceNumber}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{invoice.invoiceNumber}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              Contract: {invoice.contractNumber}
                            </p>
                          </div>
                          <StatusBadge status={invoice.status} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div>
                            <p className="text-slate-400">Billing Period</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{invoice.billingPeriod}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Amount</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {formatCurrency(invoice.amounts.total, invoice.amounts.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Issue Date</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{invoice.issueDate}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Due Date</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{invoice.dueDate}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <RowActions
                            invoice={invoice}
                            busyAction={busyAction}
                            onView={handleViewInvoice}
                            onDownload={handleDownloadInvoice}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Section>
      </div>
    </div>
  );
};

/* ============================================================
   SUPPORT COMPONENTS
   ============================================================ */

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        {icon}
      </div>
      <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">{title}</h2>
    </div>
    <div className="p-5 sm:p-6">{children}</div>
  </section>
);

const TableSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
      />
    ))}
  </div>
);

export default QuotationInvoices;