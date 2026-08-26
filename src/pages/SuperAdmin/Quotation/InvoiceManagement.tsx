import { useEffect, useMemo, useState, type FC, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  ReceiptText,
  Search,
  X,
} from "lucide-react";

import AppSelect from "../../../components/ui/dropdown/AppSelect";

type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Sent";

type InvoiceType =
  | "Implementation"
  | "Monthly Site Licence"
  | "Additional Machine"
  | "Optional Services";

type FilterValue = "All" | InvoiceStatus;
type InvoiceTypeFilter = "All" | InvoiceType;

interface InvoiceRecord {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly companyName: string;
  readonly companyAdmin: string;
  readonly adminEmail: string;
  readonly contractNumber: string;
  readonly invoiceType: InvoiceType;
  readonly description: string;
  readonly amount: number;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly status: InvoiceStatus;
  readonly billingPeriod: string;
  readonly paymentTerms: string;
}

interface SelectOption {
  label: string;
  value: string;
}

interface SummaryCardProps {
  readonly title: string;
  readonly value: string;
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly iconClassName: string;
  readonly backgroundClassName: string;
}

interface InvoiceStatusBadgeProps {
  readonly status: InvoiceStatus;
}

interface InvoiceDetailsModalProps {
  readonly invoice: InvoiceRecord;
  readonly onClose: () => void;
  readonly onPrint: () => void;
}

interface MoneyFormatterOptions {
  readonly currency: string;
  readonly locale: string;
}

const MONEY_OPTIONS: MoneyFormatterOptions = {
  currency: "ZAR",
  locale: "en-ZA",
};

const DUMMY_INVOICES: InvoiceRecord[] = [
  {
    id: "invoice-001",
    invoiceNumber: "INV-2026-001",
    companyName: "ABC Mining Pvt Ltd",
    companyAdmin: "John Smith",
    adminEmail: "john.smith@abcmining.com",
    contractNumber: "CON-2026-001",
    invoiceType: "Implementation",
    description: "Initial implementation and system setup charges.",
    amount: 50000,
    issueDate: "25 Aug 2026",
    dueDate: "09 Sep 2026",
    status: "Sent",
    billingPeriod: "August 2026",
    paymentTerms: "Payment due within 15 days.",
  },
  {
    id: "invoice-002",
    invoiceNumber: "INV-2026-002",
    companyName: "ABC Mining Pvt Ltd",
    companyAdmin: "John Smith",
    adminEmail: "john.smith@abcmining.com",
    contractNumber: "CON-2026-001",
    invoiceType: "Monthly Site Licence",
    description: "Monthly site licence charges for August 2026.",
    amount: 25000,
    issueDate: "25 Aug 2026",
    dueDate: "09 Sep 2026",
    status: "Pending",
    billingPeriod: "August 2026",
    paymentTerms: "Payment due within 15 days.",
  },
  {
    id: "invoice-003",
    invoiceNumber: "INV-2026-003",
    companyName: "Global Heavy Equipment",
    companyAdmin: "Michael Brown",
    adminEmail: "michael.brown@globalheavy.com",
    contractNumber: "CON-2026-002",
    invoiceType: "Implementation",
    description: "Initial implementation and system setup charges.",
    amount: 75000,
    issueDate: "23 Aug 2026",
    dueDate: "07 Sep 2026",
    status: "Paid",
    billingPeriod: "August 2026",
    paymentTerms: "Payment due within 15 days.",
  },
  {
    id: "invoice-004",
    invoiceNumber: "INV-2026-004",
    companyName: "Prime Construction Group",
    companyAdmin: "Sarah Johnson",
    adminEmail: "sarah.johnson@primeconstruction.com",
    contractNumber: "CON-2026-003",
    invoiceType: "Additional Machine",
    description: "Additional machine charges as per contract terms.",
    amount: 10000,
    issueDate: "18 Aug 2026",
    dueDate: "23 Aug 2026",
    status: "Overdue",
    billingPeriod: "August 2026",
    paymentTerms: "Payment due within 5 days.",
  },
  {
    id: "invoice-005",
    invoiceNumber: "INV-2026-005",
    companyName: "Iron Valley Industries",
    companyAdmin: "David Miller",
    adminEmail: "david.miller@ironvalley.com",
    contractNumber: "CON-2026-004",
    invoiceType: "Monthly Site Licence",
    description: "Monthly site licence charges for August 2026.",
    amount: 30000,
    issueDate: "22 Aug 2026",
    dueDate: "06 Sep 2026",
    status: "Sent",
    billingPeriod: "August 2026",
    paymentTerms: "Payment due within 15 days.",
  },
  {
    id: "invoice-006",
    invoiceNumber: "INV-2026-006",
    companyName: "Terra Mining Solutions",
    companyAdmin: "Emily Davis",
    adminEmail: "emily.davis@terramining.com",
    contractNumber: "CON-2026-005",
    invoiceType: "Optional Services",
    description: "Optional service package charges.",
    amount: 15000,
    issueDate: "20 Aug 2026",
    dueDate: "04 Sep 2026",
    status: "Pending",
    billingPeriod: "August 2026",
    paymentTerms: "Payment due within 15 days.",
  },
];

const STATUS_OPTIONS: SelectOption[] = [
  { label: "All Status", value: "All" },
  { label: "Paid", value: "Paid" },
  { label: "Pending", value: "Pending" },
  { label: "Sent", value: "Sent" },
  { label: "Overdue", value: "Overdue" },
];

const INVOICE_TYPE_OPTIONS: SelectOption[] = [
  { label: "All Invoice Types", value: "All" },
  { label: "Implementation", value: "Implementation" },
  { label: "Monthly Site Licence", value: "Monthly Site Licence" },
  { label: "Additional Machine", value: "Additional Machine" },
  { label: "Optional Services", value: "Optional Services" },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(MONEY_OPTIONS.locale, {
    style: "currency",
    currency: MONEY_OPTIONS.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const escapeHtml = (value: string): string => {
  return value
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace('"', "&quot;")
    .replace("'", "&#039;");
};

const createInvoiceMarkup = (invoice: InvoiceRecord): string => {
  const companyName = escapeHtml(invoice.companyName);
  const companyAdmin = escapeHtml(invoice.companyAdmin);
  const adminEmail = escapeHtml(invoice.adminEmail);
  const invoiceNumber = escapeHtml(invoice.invoiceNumber);
  const contractNumber = escapeHtml(invoice.contractNumber);
  const invoiceType = escapeHtml(invoice.invoiceType);
  const description = escapeHtml(invoice.description);
  const issueDate = escapeHtml(invoice.issueDate);
  const dueDate = escapeHtml(invoice.dueDate);
  const billingPeriod = escapeHtml(invoice.billingPeriod);
  const paymentTerms = escapeHtml(invoice.paymentTerms);
  const amount = formatCurrency(invoice.amount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 40px;
    }

    .invoice {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 24px;
    }

    .brand {
      font-size: 24px;
      font-weight: 700;
    }

    .muted {
      color: #64748b;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.1;
    }

    .invoice-number {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }

    .section {
      margin-top: 30px;
    }

    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }

    .label {
      margin-bottom: 8px;
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .value {
      margin: 6px 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .table-wrapper {
      margin-top: 30px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th {
      padding: 13px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .table td {
      padding: 18px 13px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 14px;
      line-height: 1.5;
    }

    .amount {
      width: 180px;
      text-align: right !important;
      white-space: nowrap;
    }

    .total {
      display: flex;
      justify-content: flex-end;
      gap: 60px;
      padding: 20px 13px;
      font-size: 18px;
      font-weight: 700;
    }

    .terms {
      margin-top: 30px;
      padding: 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      text-align: center;
      font-size: 11px;
      line-height: 1.5;
    }

    @page {
      size: A4;
      margin: 14mm;
    }

    @media print {
      body {
        padding: 0;
      }

      .invoice {
        max-width: none;
      }
    }

    @media screen and (max-width: 700px) {
      body {
        padding: 20px;
      }

      .header,
      .two-column {
        grid-template-columns: 1fr;
      }

      .header {
        flex-direction: column;
      }

      .invoice-title {
        text-align: left;
      }

      .two-column {
        display: grid;
        gap: 20px;
      }
    }
  </style>
</head>

<body>
  <main class="invoice">
    <header class="header">
      <div>
        <div class="brand">HME</div>
        <div class="muted">Component Intelligence System</div>
      </div>

      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">${invoiceNumber}</div>
      </div>
    </header>

    <section class="section two-column">
      <div>
        <div class="label">Bill To</div>
        <div class="value"><strong>${companyName}</strong></div>
        <div class="value">${companyAdmin}</div>
        <div class="value">${adminEmail}</div>
      </div>

      <div>
        <div class="label">Invoice Information</div>
        <div class="value"><strong>Contract:</strong> ${contractNumber}</div>
        <div class="value"><strong>Issue Date:</strong> ${issueDate}</div>
        <div class="value"><strong>Due Date:</strong> ${dueDate}</div>
        <div class="value"><strong>Billing Period:</strong> ${billingPeriod}</div>
      </div>
    </section>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              <strong>${invoiceType}</strong>
              <br />
              <span class="muted">${description}</span>
            </td>
            <td class="amount">${amount}</td>
          </tr>
        </tbody>
      </table>

      <div class="total">
        <span>Total Amount</span>
        <span>${amount}</span>
      </div>
    </div>

    <section class="terms">
      <div class="label">Payment Terms</div>
      <div class="value">${paymentTerms}</div>
    </section>

    <footer class="footer">
      This invoice is generated from the applicable quotation and contract commercial terms.
    </footer>
  </main>
</body>
</html>`;
};

const openInvoicePrintPreview = (invoice: InvoiceRecord): void => {
  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (printWindow === null) {
    throw new Error("Unable to open invoice preview. Please allow pop-ups.");
  }

  const invoiceMarkup = createInvoiceMarkup(invoice);

  printWindow.document.open();
  printWindow.document.write(invoiceMarkup);
  printWindow.document.close();
  printWindow.focus();

  printWindow.onload = (): void => {
    printWindow.print();
  };
};

const SummaryCard: FC<SummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  iconClassName,
  backgroundClassName,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${backgroundClassName}`}
        >
          <Icon size={22} className={iconClassName} />
        </div>
      </div>
    </div>
  );
};

const InvoiceStatusBadge: FC<InvoiceStatusBadgeProps> = ({ status }) => {
  const statusClassName =
    status === "Paid"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : status === "Pending"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
        : status === "Overdue"
          ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
          : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";

  const StatusIcon =
    status === "Paid"
      ? CheckCircle2
      : status === "Overdue"
        ? Clock3
        : FileText;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${statusClassName}`}
    >
      <StatusIcon size={13} aria-hidden="true" />
      {status}
    </span>
  );
};

const InvoiceDetailsModal: FC<InvoiceDetailsModalProps> = ({
  invoice,
  onClose,
  onPrint,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return (): void => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Invoice Details
            </p>

            <h2
              id="invoice-details-title"
              className="mt-1 text-xl font-semibold text-slate-900 dark:text-white"
            >
              {invoice.invoiceNumber}
            </h2>

            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {invoice.companyName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="bg-white p-5 text-slate-900 sm:p-8">
            <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <ReceiptText size={21} aria-hidden="true" />
                </div>

                <div>
                  <h3 className="text-xl font-bold">HME</h3>
                  <p className="text-xs text-slate-500">
                    Component Intelligence System
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-2xl font-bold tracking-tight">INVOICE</p>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {invoice.invoiceNumber}
                </p>

                <div className="mt-3">
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Bill To
                </p>

                <p className="mt-2 text-base font-bold">{invoice.companyName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {invoice.companyAdmin}
                </p>
                <p className="mt-1 break-all text-sm text-slate-600">
                  {invoice.adminEmail}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Invoice Information
                </p>

                <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Contract:
                    </span>{" "}
                    {invoice.contractNumber}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">
                      Issue Date:
                    </span>{" "}
                    {invoice.issueDate}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">
                      Due Date:
                    </span>{" "}
                    {invoice.dueDate}
                  </p>

                  <p>
                    <span className="font-semibold text-slate-800">
                      Billing Period:
                    </span>{" "}
                    {invoice.billingPeriod}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1fr_160px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Description</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="grid grid-cols-[1fr_160px] gap-4 px-4 py-5">
                <div>
                  <p className="font-semibold">{invoice.invoiceType}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {invoice.description}
                  </p>
                </div>

                <p className="text-right font-semibold">
                  {formatCurrency(invoice.amount)}
                </p>
              </div>

              <div className="border-t border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-700">
                    Total Amount
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Payment Terms
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {invoice.paymentTerms}
              </p>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
              This invoice is generated from the applicable quotation and
              contract commercial terms.
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Download size={16} aria-hidden="true" />
            Download / Print
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

const InvoiceManagement: FC = () => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("All");
  const [invoiceTypeFilter, setInvoiceTypeFilter] =
    useState<InvoiceTypeFilter>("All");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  useEffect(() => {
    const loadInvoices = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await Promise.resolve(DUMMY_INVOICES);
        setInvoices(response);
      } catch {
        setLoadError("Unable to load invoices.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        invoice.companyName.toLowerCase().includes(normalizedSearch) ||
        invoice.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
        invoice.contractNumber.toLowerCase().includes(normalizedSearch) ||
        invoice.companyAdmin.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" || invoice.status === statusFilter;

      const matchesType =
        invoiceTypeFilter === "All" ||
        invoice.invoiceType === invoiceTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [invoices, search, statusFilter, invoiceTypeFilter]);

  const totalInvoices = invoices.length;

  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "Paid",
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === "Pending",
  ).length;

  const overdueInvoices = invoices.filter(
    (invoice) => invoice.status === "Overdue",
  ).length;

  const totalInvoiceValue = invoices.reduce(
    (total, invoice) => total + invoice.amount,
    0,
  );

  const selectedInvoice = invoices.find(
    (invoice) => invoice.id === selectedInvoiceId,
  );

  const handlePrintInvoice = (): void => {
    if (selectedInvoice === undefined) {
      return;
    }

    try {
      openInvoicePrintPreview(selectedInvoice);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to open invoice preview.";

      setLoadError(message);
    }
  };

  const handleStatusChange = (value: string): void => {
    setStatusFilter(value as FilterValue);
  };

  const handleInvoiceTypeChange = (value: string): void => {
    setInvoiceTypeFilter(value as InvoiceTypeFilter);
  };

  return (
    <section className="min-h-full w-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ReceiptText size={24} aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Invoice Management
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage generated invoices, payment status and invoice history.
              </p>
            </div>
          </div>
        </header>

        {loadError.length > 0 && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          >
            {loadError}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Invoices"
            value={String(totalInvoices)}
            icon={FileText}
            iconClassName="text-blue-600 dark:text-blue-400"
            backgroundClassName="bg-blue-50 dark:bg-blue-500/10"
          />

          <SummaryCard
            title="Paid"
            value={String(paidInvoices)}
            icon={CheckCircle2}
            iconClassName="text-emerald-600 dark:text-emerald-400"
            backgroundClassName="bg-emerald-50 dark:bg-emerald-500/10"
          />

          <SummaryCard
            title="Pending"
            value={String(pendingInvoices)}
            icon={Clock3}
            iconClassName="text-amber-600 dark:text-amber-400"
            backgroundClassName="bg-amber-50 dark:bg-amber-500/10"
          />

          <SummaryCard
            title="Overdue"
            value={String(overdueInvoices)}
            icon={Clock3}
            iconClassName="text-red-600 dark:text-red-400"
            backgroundClassName="bg-red-50 dark:bg-red-500/10"
          />

          <SummaryCard
            title="Invoice Value"
            value={formatCurrency(totalInvoiceValue)}
            icon={ReceiptText}
            iconClassName="text-violet-600 dark:text-violet-400"
            backgroundClassName="bg-violet-50 dark:bg-violet-500/10"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Invoices
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  View and manage invoices generated from company contracts.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
                <div className="relative w-full md:w-72">
                  <Search
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company, invoice..."
                    aria-label="Search invoices"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="w-full md:w-44">
                  <AppSelect
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={handleStatusChange}
                    placeholder="Select status"
                  />
                </div>

                <div className="w-full md:w-52">
                  <AppSelect
                    options={INVOICE_TYPE_OPTIONS}
                    value={invoiceTypeFilter}
                    onChange={handleInvoiceTypeChange}
                    placeholder="Select invoice type"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1250px] table-fixed text-left">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[13%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
              </colgroup>

              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Company
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invoice No.
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invoice Type
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Contract
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Due Date
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="inline-flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                        Loading invoices...
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <FileText size={18} aria-hidden="true" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                              title={invoice.companyName}
                            >
                              {invoice.companyName}
                            </p>

                            <p
                              className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                              title={invoice.companyAdmin}
                            >
                              {invoice.companyAdmin}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {invoice.issueDate}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <p
                          className="truncate text-sm font-medium text-slate-700 dark:text-slate-300"
                          title={invoice.invoiceType}
                        >
                          {invoice.invoiceType}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                          {invoice.contractNumber}
                        </p>
                      </td>

                      <td className="px-4 py-5 text-right">
                        <p className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(invoice.amount)}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {invoice.dueDate}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>

                      <td className="px-3 py-5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          className="inline-flex h-10 w-[96px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        >
                          <Eye size={16} aria-hidden="true" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                {!isLoading && filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                          <Search size={21} aria-hidden="true" />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                          No invoices found
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          No invoice matches the current search or filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Showing {filteredInvoices.length} of {totalInvoices} invoices
            </p>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Invoice data is linked to contract commercial terms.
            </p>
          </div>
        </section>
      </div>

      {selectedInvoice !== undefined && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoiceId("")}
          onPrint={handlePrintInvoice}
        />
      )}
    </section>
  );
};

export default InvoiceManagement;