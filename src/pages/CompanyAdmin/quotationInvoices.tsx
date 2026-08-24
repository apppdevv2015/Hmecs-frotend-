import React, { useCallback, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Info,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  Send,
  WalletCards,
  XCircle,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

type InvoiceStatus =
  | "NOT_GENERATED"
  | "REQUEST_PENDING"
  | "GENERATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_PROCESSING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "CANCELLED"
  | "REFUNDED";

type InvoiceRequestStatus =
  | "NOT_REQUESTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

type CurrencyCode = "ZAR";

interface Party {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface MonitoringScope {
  planName: string;
  duration: string;
  sites: string[];
  machines: string[];
}

interface InvoiceAmounts {
  subtotal: number;
  tax: number;
  additionalCharges: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: CurrencyCode;
}

interface PaymentDetails {
  method: string;
  transactionId: string;
  paymentDate: string;
  status: InvoiceStatus;
}

interface InvoiceDocument {
  fileName: string;
  version: string;
}

interface GeneratedInvoice {
  invoiceNumber: string;
  quotationNumber: string;
  contractNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  billingStartDate: string;
  billingEndDate: string;
  dueDate: string;
  billTo: Party;
  from: Party;
  scope: MonitoringScope;
  amounts: InvoiceAmounts;
  payment: PaymentDetails;
  document: InvoiceDocument;
}

interface InvoiceRequest {
  requestId: string;
  quotationNumber: string;
  contractNumber: string;
  requestedAt: string;
  requestedBy: string;
  status: InvoiceRequestStatus;
}

/* ============================================================
   DEVELOPMENT / UI PREVIEW DATA
   ------------------------------------------------------------
   Temporary local data for frontend verification only.

   The request starts as NOT_REQUESTED so the request button is
   enabled. The invoice below is used to render the full invoice
   layout right away (as placeholder/preview content) even before
   the Super Admin has generated a real invoice — the page
   structure should never go blank.

   BACKEND TODO: once the invoice API is connected, replace
   DEVELOPMENT_GENERATED_INVOICE with the real invoice returned by
   the API. When no invoice exists yet, pass an invoice object with
   empty string / zero fields instead of removing sections — every
   field below already renders through displayText()/formatCurrency()
   so it degrades to "—" gracefully.
   ============================================================ */

const DEVELOPMENT_REQUEST: InvoiceRequest = {
  requestId: "INVRQ-2026-000124",
  quotationNumber: "QR-2025-000124",
  contractNumber: "CT-2026-000124",
  requestedAt: "24 Aug 2026, 03:30 PM",
  requestedBy: "Orion Mining Pvt. Ltd.",
  status: "NOT_REQUESTED",
};

const DEVELOPMENT_GENERATED_INVOICE: GeneratedInvoice = {
  invoiceNumber: "INV-2026-000124",
  quotationNumber: "QR-2025-000124",
  contractNumber: "CT-2026-000124",
  status: "GENERATED",
  invoiceDate: "24 Aug 2026",
  billingStartDate: "22 Aug 2026",
  billingEndDate: "21 Aug 2027",
  dueDate: "31 Aug 2026",

  billTo: {
    name: "Orion Mining Pvt. Ltd.",
    email: "admin@orionmining.com",
    phone: "+27 11 987 3210",
    address: "Industrial Area, Johannesburg, South Africa",
  },

  from: {
    name: "HME / Company",
    email: "billing@hme.com",
    phone: "+27 11 555 0100",
    address: "HME Industrial Area, South Africa",
  },

  scope: {
    planName: "Machine Health Monitoring Plan",
    duration: "12 Months",
    sites: ["Iron Valley Mine", "Orion Mining Site"],
    machines: ["Excavator", "Loader"],
  },

  amounts: {
    subtotal: 4500000,
    tax: 810000,
    additionalCharges: 50000,
    total: 5360000,
    amountPaid: 0,
    balanceDue: 5360000,
    currency: "ZAR",
  },

  payment: {
    method: "Not Paid",
    transactionId: "Not Available",
    paymentDate: "Not Available",
    status: "PAYMENT_PENDING",
  },

  document: {
    fileName: "Invoice-INV-2026-000124.pdf",
    version: "1.0",
  },
};

/* ============================================================
   EMPTY INVOICE
   ------------------------------------------------------------
   Used while no invoice has actually been generated yet. Every
   field is blank/zero — the sections still render fully (through
   displayText()/formatCurrency() fallbacks), just with "—" in
   place of real values, until the Super Admin generates the real
   invoice and the API response replaces this.
   ============================================================ */

const EMPTY_PARTY: Party = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

const EMPTY_INVOICE: GeneratedInvoice = {
  invoiceNumber: "",
  quotationNumber: DEVELOPMENT_REQUEST.quotationNumber,
  contractNumber: DEVELOPMENT_REQUEST.contractNumber,
  status: "NOT_GENERATED",
  invoiceDate: "",
  billingStartDate: "",
  billingEndDate: "",
  dueDate: "",

  billTo: EMPTY_PARTY,
  from: EMPTY_PARTY,

  scope: {
    planName: "",
    duration: "",
    sites: [],
    machines: [],
  },

  amounts: {
    subtotal: 0,
    tax: 0,
    additionalCharges: 0,
    total: 0,
    amountPaid: 0,
    balanceDue: 0,
    currency: "ZAR",
  },

  payment: {
    method: "",
    transactionId: "",
    paymentDate: "",
    status: "NOT_GENERATED",
  },

  document: {
    fileName: "",
    version: "",
  },
};

/* ============================================================
   CONSTANTS
   ============================================================ */

const EMPTY_TEXT = "—";

const INVOICE_REQUEST_STATUS_META: Record<
  InvoiceRequestStatus,
  {
    label: string;
    tone: string;
  }
> = {
  NOT_REQUESTED: {
    label: "Not Requested",
    tone:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  PENDING: {
    label: "Pending Admin Review",
    tone:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  APPROVED: {
    label: "Invoice Generated",
    tone:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Request Rejected",
    tone:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
};

const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  {
    label: string;
    tone: string;
    icon: React.ReactNode;
  }
> = {
  NOT_GENERATED: {
    label: "Not Generated",
    tone:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileText size={14} />,
  },
  REQUEST_PENDING: {
    label: "Request Pending",
    tone:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    icon: <RefreshCw size={14} />,
  },
  GENERATED: {
    label: "Generated",
    tone:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    icon: <ReceiptText size={14} />,
  },
  PAYMENT_PENDING: {
    label: "Payment Pending",
    tone:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    icon: <WalletCards size={14} />,
  },
  PAYMENT_PROCESSING: {
    label: "Payment Processing",
    tone:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    icon: <RefreshCw size={14} />,
  },
  PAID: {
    label: "Paid",
    tone:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={14} />,
  },
  PAYMENT_FAILED: {
    label: "Payment Failed",
    tone:
      "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    icon: <XCircle size={14} />,
  },
  CANCELLED: {
    label: "Cancelled",
    tone:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: <XCircle size={14} />,
  },
  REFUNDED: {
    label: "Refunded",
    tone:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    icon: <RefreshCw size={14} />,
  },
};

/* ============================================================
   FORMATTERS
   ============================================================ */

const displayText = (value?: string | null): string =>
  value && value.trim().length > 0 ? value : EMPTY_TEXT;

const formatCurrency = (amount?: number): string => {
  if (typeof amount !== "number") {
    return EMPTY_TEXT;
  }

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const escapePdfText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const calculateBalance = (total: number, amountPaid: number): number => {
  return Math.max(total - amountPaid, 0);
};

/* ============================================================
   REAL PDF GENERATOR
   ------------------------------------------------------------
   The function intentionally does not fall back to HTML.
   It uses jsPDF to produce an actual PDF document.
   ============================================================ */

const buildInvoicePdf = (invoice: GeneratedInvoice) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

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

  const row = (
    label: string,
    value: string,
    strong: boolean = false,
  ): void => {
    ensureSpace(10);

    pdf.setFont("helvetica", strong ? "bold" : "normal");
    pdf.setFontSize(strong ? 10 : 9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(escapePdfText(label), margin, y);

    const wrapped = pdf.splitTextToSize(value, 80);

    pdf.text(
      wrapped.map((line: string) => escapePdfText(line)),
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
  pdf.text("HME / Machine Health Monitoring", margin, y + 7);
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
  pdf.text("Invoice Date:", pageWidth - margin - 65, y + 12);
  pdf.setFont("helvetica", "normal");
  pdf.text(invoice.invoiceDate, pageWidth - margin - 42, y + 12);

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
  pdf.roundedRect(
    margin + cardWidth + cardGap,
    cardTop,
    cardWidth,
    39,
    2,
    2,
    "FD",
  );

  const drawParty = (
    party: Party,
    title: string,
    x: number,
  ): void => {
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

    const details = [
      party.email,
      party.phone,
      party.address,
    ];

    let detailY = cardTop + 19;

    details.forEach((detail) => {
      const lines = pdf.splitTextToSize(detail, cardWidth - 8);
      pdf.text(lines, x + 4, detailY);
      detailY += lines.length * 4;
    });
  };

  drawParty(invoice.billTo, "Bill To", margin);
  drawParty(
    invoice.from,
    "From",
    margin + cardWidth + cardGap,
  );

  y = cardTop + 46;

  sectionTitle("Monitoring Service");

  row("Plan", invoice.scope.planName);
  row("Duration", invoice.scope.duration);
  row(
    "Billing Period",
    `${invoice.billingStartDate} – ${invoice.billingEndDate}`,
  );
  row("Sites", invoice.scope.sites.join(", "));
  row("Machines Covered", invoice.scope.machines.join(", "));

  y += 3;

  sectionTitle("Payment Summary");

  row(
    "Subtotal",
    formatCurrency(invoice.amounts.subtotal),
  );
  row(
    "Applicable Tax",
    formatCurrency(invoice.amounts.tax),
  );
  row(
    "Additional Charges",
    formatCurrency(invoice.amounts.additionalCharges),
  );
  row(
    "Total Invoice Value",
    formatCurrency(invoice.amounts.total),
    true,
  );
  row(
    "Amount Paid",
    formatCurrency(invoice.amounts.amountPaid),
  );
  row(
    "Balance Due",
    formatCurrency(
      calculateBalance(
        invoice.amounts.total,
        invoice.amounts.amountPaid,
      ),
    ),
    true,
  );

  y += 3;

  sectionTitle("Payment Information");

  row("Payment Method", invoice.payment.method);
  row("Transaction ID", invoice.payment.transactionId);
  row("Payment Date", invoice.payment.paymentDate);
  row(
    "Payment Status",
    INVOICE_STATUS_META[invoice.payment.status].label,
  );

  ensureSpace(12);

  pdf.setDrawColor(226, 232, 240);
  pdf.line(
    margin,
    pageHeight - 15,
    pageWidth - margin,
    pageHeight - 15,
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Document Version ${invoice.document.version} • Currency: ZAR`,
    margin,
    pageHeight - 9,
  );

  return pdf;
};

/* ============================================================
   REUSABLE UI
   ============================================================ */

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  children,
}) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        {icon}
      </div>

      <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
        {title}
      </h2>
    </div>

    <div className="p-5 sm:p-6">{children}</div>
  </section>
);

interface PartyCardProps {
  title: string;
  party?: Party;
}

const PartyCard: React.FC<PartyCardProps> = ({
  title,
  party,
}) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/40">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
      {title}
    </p>

    <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
      {displayText(party?.name)}
    </h3>

    <div className="mt-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <Mail size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span className="break-all text-sm text-slate-600 dark:text-slate-300">
          {displayText(party?.email)}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Phone size={15} className="shrink-0 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {displayText(party?.phone)}
        </span>
      </div>

      <div className="flex items-start gap-2.5">
        <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span className="text-sm leading-5 text-slate-600 dark:text-slate-300">
          {displayText(party?.address)}
        </span>
      </div>
    </div>
  </div>
);

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const meta = INVOICE_STATUS_META[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${meta.tone}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
};

interface AmountRowProps {
  label: string;
  value: string;
  strong?: boolean;
}

const AmountRow: React.FC<AmountRowProps> = ({
  label,
  value,
  strong = false,
}) => (
  <div
    className={`flex items-center justify-between gap-6 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800 ${
      strong ? "text-base" : "text-sm"
    }`}
  >
    <span
      className={
        strong
          ? "font-bold text-slate-900 dark:text-white"
          : "font-medium text-slate-600 dark:text-slate-300"
      }
    >
      {label}
    </span>

    <span
      className={
        strong
          ? "font-bold text-slate-900 dark:text-white"
          : "font-semibold text-slate-800 dark:text-slate-200"
      }
    >
      {value}
    </span>
  </div>
);

/* ============================================================
   MAIN COMPONENT
   ------------------------------------------------------------
   The invoice layout below always renders in full — it never
   collapses into an empty placeholder page. Whatever invoice
   data is available (real once the API is connected, dummy for
   now) is shown; any missing field simply falls back to "—"
   through displayText()/formatCurrency() instead of hiding the
   section it belongs to.
   ============================================================ */

const QuotationInvoices: React.FC = () => {
  const [invoiceRequest, setInvoiceRequest] =
    useState<InvoiceRequest>(DEVELOPMENT_REQUEST);

  const [invoiceStatus, setInvoiceStatus] =
    useState<InvoiceStatus>("NOT_GENERATED");

  // BACKEND TODO: swap this for the invoice returned by the API once
  // the Super Admin actually generates it. Until then it stays empty
  // so every field falls back to "—" instead of showing placeholder
  // numbers.
  const [invoice, setInvoice] = useState<GeneratedInvoice>(
    EMPTY_INVOICE,
  );

  const [documentError, setDocumentError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] =
    useState(false);

  const isInvoiceGenerated = invoiceStatus !== "NOT_GENERATED" && invoiceStatus !== "REQUEST_PENDING";

  const calculatedBalance = useMemo(() => {
    return calculateBalance(
      invoice.amounts.total,
      invoice.amounts.amountPaid,
    );
  }, [invoice]);

  // Amounts fall back to "—" until the invoice is actually generated,
  // instead of showing "R 0,00" placeholder figures.
  const amountText = useCallback(
    (value: number): string =>
      isInvoiceGenerated ? formatCurrency(value) : EMPTY_TEXT,
    [isInvoiceGenerated],
  );

  const handleInvoiceRequest = useCallback(async (): Promise<void> => {
    if (isSubmittingRequest) {
      return;
    }

    if (invoiceRequest.status === "PENDING") {
      return;
    }

    if (invoiceRequest.status === "APPROVED") {
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError("");

    try {
      /*
       * UI-preview mode:
       * In API mode this section will call the invoice-request endpoint.
       * The backend will create the request and notify Super Admin.
       */
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 600);
      });

      const requestedAt = new Intl.DateTimeFormat("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());

      setInvoiceRequest((previous) => ({
        ...previous,
        requestedAt,
        status: "PENDING",
      }));

      setInvoiceStatus("REQUEST_PENDING");
    } catch {
      setRequestError(
        "Unable to send the invoice generation request.",
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  }, [invoiceRequest.status, isSubmittingRequest]);

  const handleViewInvoice = useCallback((): void => {
    setDocumentError("");

    if (!isInvoiceGenerated) {
      setDocumentError(
        "This invoice has not been generated yet. Please wait until the Super Admin generates it.",
      );
      return;
    }

    try {
      const pdf = buildInvoicePdf(invoice);
      const pdfBlob = pdf.output("blob");
      const documentUrl = URL.createObjectURL(pdfBlob);
      const openedWindow = window.open(documentUrl, "_blank");

      if (openedWindow === null) {
        URL.revokeObjectURL(documentUrl);
        setDocumentError(
          "Unable to open the invoice PDF. Please allow pop-ups and try again.",
        );
        return;
      }

      openedWindow.opener = null;

      window.setTimeout(() => {
        URL.revokeObjectURL(documentUrl);
      }, 60_000);
    } catch {
      setDocumentError(
        "The invoice PDF could not be generated.",
      );
    }
  }, [invoice, isInvoiceGenerated]);

  const handleDownloadInvoice = useCallback((): void => {
    setDocumentError("");

    if (!isInvoiceGenerated) {
      setDocumentError(
        "This invoice has not been generated yet. Please wait until the Super Admin generates it.",
      );
      return;
    }

    try {
      const pdf = buildInvoicePdf(invoice);
      const pdfBlob = pdf.output("blob");
      const documentUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");

      anchor.href = documentUrl;
      anchor.download = invoice.document.fileName;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(documentUrl);
      }, 1_000);
    } catch {
      setDocumentError(
        "The invoice PDF could not be downloaded.",
      );
    }
  }, [invoice, isInvoiceGenerated]);

  const requestStatusMeta =
    INVOICE_REQUEST_STATUS_META[invoiceRequest.status];

  return (
    <div className="w-full min-w-0 pb-8">
      <div className="mx-auto w-full max-w-[1200px] space-y-5">

        {/* ==================================================
            INVOICE REQUEST
        ================================================== */}

        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/70 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Send size={18} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-blue-950 dark:text-blue-100 sm:text-base">
                    Invoice Request
                  </h2>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${requestStatusMeta.tone}`}
                  >
                    {requestStatusMeta.label}
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-300 sm:text-sm">
                  Request invoice generation for the approved contract.
                  Your request will be sent to the Super Admin for review
                  before the invoice is generated.
                </p>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-blue-700/80 dark:text-blue-300/80 sm:text-xs">
                  <span>
                    Quotation: {invoiceRequest.quotationNumber}
                  </span>

                  <span>
                    Contract: {invoiceRequest.contractNumber}
                  </span>

                  <span>
                    Requested by: {invoiceRequest.requestedBy}
                  </span>

                  {invoiceRequest.status !== "NOT_REQUESTED" && (
                    <span>
                      Requested: {invoiceRequest.requestedAt}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleInvoiceRequest()}
              disabled={
                isSubmittingRequest ||
                invoiceRequest.status === "PENDING" ||
                invoiceRequest.status === "APPROVED"
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmittingRequest ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}

              {invoiceRequest.status === "NOT_REQUESTED"
                ? "Request Invoice Generation"
                : invoiceRequest.status === "PENDING"
                  ? "Request Sent"
                  : invoiceRequest.status === "APPROVED"
                    ? "Invoice Generated"
                    : "Request Invoice Generation"}
            </button>
          </div>

          {requestError !== "" && (
            <div
              role="alert"
              className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-400 sm:px-6"
            >
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{requestError}</span>
            </div>
          )}
        </section>

        {/* ==================================================
            REQUEST FLOW STATUS
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Invoice Generation Status
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  The invoice details below become final once the Super
                  Admin approves the request and generates the document.
                </p>
              </div>

              <StatusBadge status={invoiceStatus} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <FlowStep
                active={
                  invoiceRequest.status === "NOT_REQUESTED"
                }
                complete={
                  invoiceRequest.status === "PENDING" ||
                  invoiceRequest.status === "APPROVED"
                }
                title="Request Invoice"
                description="Company Admin sends the request."
              />

              <FlowStep
                active={
                  invoiceRequest.status === "PENDING"
                }
                complete={
                  invoiceRequest.status === "APPROVED"
                }
                title="Super Admin Review"
                description="Super Admin reviews the request."
              />

              <FlowStep
                active={
                  invoiceRequest.status === "APPROVED" &&
                  !isInvoiceGenerated
                }
                complete={isInvoiceGenerated}
                title="Invoice Generated"
                description="Invoice becomes final and ready for payment."
              />
            </div>
          </div>
        </section>

        
        {/* ==================================================
            INVOICE HEADER
        ================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <ReceiptText
                    size={18}
                    className="shrink-0 text-blue-600"
                  />

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Invoice
                  </span>
                </div>

                <h1 className="break-all text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  {displayText(invoice.invoiceNumber)}
                </h1>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span>
                    Quotation:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {displayText(invoice.quotationNumber)}
                    </strong>
                  </span>

                  <span>
                    Contract:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {displayText(invoice.contractNumber)}
                    </strong>
                  </span>
                </div>
              </div>

              <StatusBadge status={invoiceStatus} />
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            {[
              ["Invoice Date", displayText(invoice.invoiceDate)],
              [
                "Billing Period",
                `${displayText(invoice.billingStartDate)} – ${displayText(
                  invoice.billingEndDate,
                )}`,
              ],
              ["Due Date", displayText(invoice.dueDate)],
              ["Balance Due", amountText(calculatedBalance)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center gap-3 px-5 py-4 sm:px-6"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <CalendarDays size={17} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">
                    {label}
                  </p>

                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================================================
            BILLING INFORMATION
        ================================================== */}

        <Section title="Billing Information" icon={<Building2 size={18} />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PartyCard title="Bill To" party={invoice.billTo} />
            <PartyCard title="From" party={invoice.from} />
          </div>
        </Section>

        {/* ==================================================
            MONITORING SERVICE
        ================================================== */}

        <Section title="Monitoring Service" icon={<FileText size={18} />}>
          <div className="space-y-0">
            <DetailRow label="Plan" value={displayText(invoice.scope.planName)} />

            <DetailRow
              label="Duration"
              value={displayText(invoice.scope.duration)}
            />

            <DetailRow
              label="Billing Period"
              value={`${displayText(invoice.billingStartDate)} – ${displayText(
                invoice.billingEndDate,
              )}`}
            />

            <DetailRow
              label="Sites"
              value={
                invoice.scope.sites.length > 0 ? (
                  <div className="space-y-2">
                    {invoice.scope.sites.map((site) => (
                      <div key={site} className="flex items-start gap-2">
                        <MapPin
                          size={15}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <span>{site}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">{EMPTY_TEXT}</span>
                )
              }
            />

            <DetailRow
              label="Machines Covered"
              value={
                invoice.scope.machines.length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {invoice.scope.machines.map((machine) => (
                      <span key={machine}>{machine}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">{EMPTY_TEXT}</span>
                )
              }
            />
          </div>
        </Section>

        {/* ==================================================
            PAYMENT SUMMARY
        ================================================== */}

        <Section title="Payment Summary" icon={<CreditCard size={18} />}>
          <div className="w-full">
            <AmountRow
              label="Subtotal"
              value={amountText(invoice.amounts.subtotal)}
            />

            <AmountRow
              label="Applicable Tax"
              value={amountText(invoice.amounts.tax)}
            />

            <AmountRow
              label="Additional Charges"
              value={amountText(invoice.amounts.additionalCharges)}
            />

            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

            <AmountRow
              label="Total Invoice Value"
              value={amountText(invoice.amounts.total)}
              strong
            />

            <AmountRow
              label="Amount Paid"
              value={amountText(invoice.amounts.amountPaid)}
            />

            <AmountRow
              label="Balance Due"
              value={amountText(calculatedBalance)}
              strong
            />
          </div>
        </Section>

        {/* ==================================================
            PAYMENT STATUS
        ================================================== */}

        <Section title="Payment Status" icon={<CheckCircle2 size={18} />}>
          <div className="space-y-5">
            <FlowStep
              active={!isInvoiceGenerated}
              complete={isInvoiceGenerated}
              title="Invoice Generated"
              description={
                isInvoiceGenerated
                  ? `Generated on ${displayText(invoice.invoiceDate)}.`
                  : "Waiting for the Super Admin to generate the invoice."
              }
            />

            <FlowStep
              active={invoice.payment.status === "PAYMENT_PENDING"}
              complete={invoice.payment.status === "PAID"}
              title={
                invoice.payment.status === "PAID"
                  ? "Payment Completed"
                  : "Payment Pending"
              }
              description={
                invoice.payment.status === "PAID"
                  ? `Payment received on ${displayText(invoice.payment.paymentDate)}.`
                  : `Payment due by ${displayText(invoice.dueDate)}.`
              }
            />
          </div>
        </Section>

        {/* ==================================================
            PAYMENT INFORMATION
        ================================================== */}

        <Section title="Payment Information" icon={<WalletCards size={18} />}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <DetailRow
              label="Payment Method"
              value={displayText(invoice.payment.method)}
            />

            <DetailRow
              label="Transaction ID"
              value={displayText(invoice.payment.transactionId)}
            />

            <DetailRow
              label="Payment Date"
              value={displayText(invoice.payment.paymentDate)}
            />

            <DetailRow
              label="Payment Status"
              value={<StatusBadge status={invoice.payment.status} />}
            />
          </div>
        </Section>

        {/* ==================================================
            INVOICE DOCUMENT
        ================================================== */}

        <Section title="Invoice Document" icon={<FileText size={18} />}>
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                <FileText size={20} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {displayText(invoice.document.fileName)}
                </p>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Invoice Document • Version{" "}
                  {displayText(invoice.document.version)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleViewInvoice}
                disabled={!isInvoiceGenerated}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-900 dark:disabled:hover:bg-slate-900"
              >
                <Eye size={16} />
                View Invoice
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={!isInvoiceGenerated}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600 dark:focus:ring-offset-slate-900"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>

          {!isInvoiceGenerated && (
            <p className="mt-3 text-xs text-slate-400">
              View/Download will be available once the invoice is generated.
            </p>
          )}

          {documentError !== "" && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{documentError}</span>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

/* ============================================================
   SUPPORT COMPONENTS
   ============================================================ */

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
}) => (
  <div className="grid grid-cols-1 gap-3 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800 sm:grid-cols-[190px_1fr] sm:gap-5">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
    </span>

    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
      {value}
    </div>
  </div>
);

interface FlowStepProps {
  active: boolean;
  complete: boolean;
  title: string;
  description: string;
}

const FlowStep: React.FC<FlowStepProps> = ({
  active,
  complete,
  title,
  description,
}) => (
  <div className="flex items-start gap-3">
    <div
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        complete
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          : active
            ? "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
      }`}
    >
      {complete ? (
        <CheckCircle2 size={15} />
      ) : active ? (
        <RefreshCw size={14} className="animate-spin" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-current" />
      )}
    </div>

    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  </div>
);

export default QuotationInvoices;