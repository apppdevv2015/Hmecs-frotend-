import React, { useCallback, useEffect, useMemo, useState } from "react";
import CustomSelect from "../../components/ui/dropdown/AppSelect";

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Hash,
  Banknote,
  Info,
  Landmark,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import {
  getInvoices,
  getInvoicePdfBlobUrl,
  downloadInvoicePdf,
  extractInvoiceActionError,
  submitInvoicePaymentProof,
  type Invoice,
  type InvoiceStatus,
} from "../../services/Quotation/invoice.service";

import { showErrorToast } from "../../utils/toastUtils";
/* ============================================================
   STATUS METADATA — matches real backend InvoiceStatus enum
   ============================================================ */

const STATUS_META: Record<
  InvoiceStatus,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  GENERATED: {
    label: "Generated",
    badgeClass:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileText size={13} />,
  },
  SENT: {
    label: "Sent",
    badgeClass:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    icon: <Clock size={13} />,
  },
  PAID: {
    label: "Paid",
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: <CheckCircle2 size={13} />,
  },
  OVERDUE: {
    label: "Overdue",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    icon: <AlertCircle size={13} />,
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass:
      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
    icon: <XCircle size={13} />,
  },
};

const STATUS_FILTER_OPTIONS: Array<{
  value: "ALL" | InvoiceStatus;
  label: string;
}> = [
  { value: "ALL", label: "All Statuses" },
  { value: "GENERATED", label: "Generated" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "Select Payment Method" },
  { value: "BANK_TRANSFER", label: "Bank Transfer / EFT" },
  { value: "CARD", label: "Card Payment" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
] as const;

interface PaymentProofFormState {
  paymentMethod: string;
  paymentDate: string;
  amountPaid: string;
  transactionReference: string;
  proofFile: File | null;
}

const emptyPaymentProofForm: PaymentProofFormState = {
  paymentMethod: "",
  paymentDate: "",
  amountPaid: "",
  transactionReference: "",
  proofFile: null,
};

/* ============================================================
   FORMATTERS
   ============================================================ */

const formatCurrency = (amount: string | number): string => {
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatBillingPeriod = (invoiceDate: string): string => {
  const date = new Date(invoiceDate);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
};

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */

const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}
    >
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
  onSubmitProof: (invoice: Invoice) => void;
}

const RowActions: React.FC<RowActionsProps> = ({
  invoice,
  busyAction,
  onView,
  onDownload,
  onSubmitProof,
}) => {
  const canSubmitProof =
    invoice.status !== "PAID" &&
    invoice.status !== "CANCELLED" &&
    invoice.paymentProofStatus !== "PENDING_VERIFICATION" &&
    invoice.paymentProofStatus !== "VERIFIED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onView(invoice)}
        disabled={busyAction !== null}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {busyAction === "view" ? (
          <RefreshCw size={13} className="animate-spin" />
        ) : (
          <Eye size={13} />
        )}
        <span>View PDF</span>
      </button>

      <button
        type="button"
        onClick={() => onDownload(invoice)}
        disabled={busyAction !== null}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
      >
        {busyAction === "download" ? (
          <RefreshCw size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        <span>Download PDF</span>
      </button>

      <button
        type="button"
        onClick={() => onSubmitProof(invoice)}
        disabled={busyAction !== null || !canSubmitProof}
        title={
          invoice.paymentProofStatus === "PENDING_VERIFICATION"
            ? "Payment proof already submitted, awaiting verification"
            : invoice.paymentProofStatus === "VERIFIED"
              ? "Payment already verified"
              : "Submit payment proof (ETF)"
        }
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
      >
        <Send size={13} />
        <span>Submit Payment Proof</span>
      </button>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const QuotationInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<readonly Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | InvoiceStatus>(
    "ALL",
  );
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");

  const [rowBusy, setRowBusy] = useState<{
    invoiceId: string;
    action: "view" | "download";
  } | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [pdfViewer, setPdfViewer] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const [proofModalInvoice, setProofModalInvoice] = useState<Invoice | null>(
    null,
  );
  const [proofForm, setProofForm] = useState<PaymentProofFormState>(
    emptyPaymentProofForm,
  );
  const [proofSubmitting, setProofSubmitting] = useState<boolean>(false);

  const fetchInvoices = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      setIsLoading(true);
      setLoadError("");

      try {
        const res = await getInvoices(undefined, signal);
        setInvoices(res.data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(
          extractInvoiceActionError(err) ??
            "Unable to load invoices. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchInvoices(controller.signal);
    return () => controller.abort();
  }, [fetchInvoices]);

  // ── Revoke the blob URL when the viewer closes or the component unmounts ──
  useEffect(() => {
    return () => {
      if (pdfViewer) {
        window.URL.revokeObjectURL(pdfViewer.url);
      }
    };
  }, [pdfViewer]);

  const billingPeriods = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    invoices.forEach((invoice) => {
      const period = formatBillingPeriod(invoice.invoiceDate);
      if (!seen.has(period)) {
        seen.add(period);
        ordered.push(period);
      }
    });
    return ordered;
  }, [invoices]);

  const periodOptions = useMemo(
    () => [
      { value: "ALL", label: "All Periods" },
      ...billingPeriods.map((period) => ({ value: period, label: period })),
    ],
    [billingPeriods],
  );

  const filteredInvoices = useMemo<readonly Invoice[]>(() => {
    const term = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        term.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.contractNumber.toLowerCase().includes(term) ||
        invoice.billToName.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "ALL" || invoice.status === statusFilter;
      const matchesPeriod =
        periodFilter === "ALL" ||
        formatBillingPeriod(invoice.invoiceDate) === periodFilter;

      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [invoices, searchTerm, statusFilter, periodFilter]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "ALL" ||
    periodFilter !== "ALL";

  const handleReset = useCallback((): void => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPeriodFilter("ALL");
  }, []);

  const handleViewInvoice = useCallback(
    async (invoice: Invoice): Promise<void> => {
      setRowBusy({ invoiceId: invoice.id, action: "view" });
      try {
        const url = await getInvoicePdfBlobUrl(invoice.id);
        setPdfViewer({ url, title: invoice.invoiceNumber });
      } catch {
      } finally {
        setRowBusy(null);
      }
    },
    [],
  );

  const handleDownloadInvoice = useCallback(
    async (invoice: Invoice): Promise<void> => {
      setRowBusy({ invoiceId: invoice.id, action: "download" });
      try {
        await downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      } catch {
      } finally {
        setRowBusy(null);
      }
    },
    [],
  );

  const handleDownloadAll = useCallback(async (): Promise<void> => {
    if (filteredInvoices.length === 0) {
      showErrorToast(
        "There are no invoices to download for the current filters.",
      );
      return;
    }

    setIsExporting(true);

    try {
      for (const invoice of filteredInvoices) {
        await downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
      }
    } catch {
    } finally {
      setIsExporting(false);
    }
  }, [filteredInvoices]);

  const closePdfViewer = useCallback((): void => {
    setPdfViewer((current) => {
      if (current) {
        window.URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }, []);


  const openProofModal = useCallback((invoice: Invoice): void => {
    setProofForm(emptyPaymentProofForm);
    setProofModalInvoice(invoice);
  }, []);

  const closeProofModal = useCallback((): void => {
    if (proofSubmitting) return;
    setProofModalInvoice(null);
    setProofForm(emptyPaymentProofForm);
  }, [proofSubmitting]);

  const MAX_PROOF_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  const ACCEPTED_PROOF_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ];

 const handleProofFileChange = useCallback(
  (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;

    if (file) {
      if (!ACCEPTED_PROOF_MIME_TYPES.includes(file.type)) {
        showErrorToast("Only JPG, PNG or PDF files are allowed.");
        event.target.value = "";
        return;
      }
      if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
        showErrorToast("File size must not exceed 5 MB.");
        event.target.value = "";
        return;
      }
    }

    setProofForm((prev) => ({ ...prev, proofFile: file }));
  },
  [],
);

  const handleSubmitProof = useCallback(
  async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!proofModalInvoice) return;

    if (
      !proofForm.paymentMethod ||
      !proofForm.paymentDate ||
      !proofForm.amountPaid ||
      !proofForm.transactionReference ||
      !proofForm.proofFile
    ) {
      showErrorToast("Please fill in all required fields and attach a proof file.");
      return;
    }

    setProofSubmitting(true);

    try {
      await submitInvoicePaymentProof(
        proofModalInvoice.id,
        {
          paymentMethod: proofForm.paymentMethod,
          paymentDate: proofForm.paymentDate,
          amountPaid: proofForm.amountPaid,
          transactionReference: proofForm.transactionReference,
        },
        proofForm.proofFile as File,
      );

      setProofModalInvoice(null);
      setProofForm(emptyPaymentProofForm);
      await fetchInvoices();
    } catch {
    } finally {
      setProofSubmitting(false);
    }
  },
  [proofModalInvoice, proofForm, fetchInvoices],
);

  return (
    <div className="w-full min-w-0 pb-8">
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Invoices
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View and download invoice PDFs generated from your signed
              contracts.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search invoice, contract, or company..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="lg:w-44">
              <CustomSelect
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(val) =>
                  setStatusFilter(val as "ALL" | InvoiceStatus)
                }
                placeholder="All Statuses"
              />
            </div>

            <div className="lg:w-44">
              <CustomSelect
                options={periodOptions}
                value={periodFilter}
                onChange={(val) => setPeriodFilter(val)}
                placeholder="All Periods"
              />
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
              Below is the list of invoices raised against your contracts.
            </p>
            {!isLoading && loadError === "" && (
              <p className="text-xs font-medium text-slate-400">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
            )}
          </div>

          {isLoading && <TableSkeleton />}

          {!isLoading && loadError !== "" && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900/60 dark:bg-red-950/30">
              <AlertCircle size={22} className="text-red-500" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {loadError}
              </p>
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
                        {[
                          "Invoice No.",
                          "Contract No.",
                          "Bill To",
                          "Invoice Date",
                          "Due Date",
                          "Amount",
                          "Status",
                          "Actions",
                        ].map((heading, index) => (
                          <th
                            key={heading}
                            className={`px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${
                              index === 5 ? "text-right" : "text-left"
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                      {filteredInvoices.map((invoice) => {
                        const busyAction =
                          rowBusy?.invoiceId === invoice.id
                            ? rowBusy.action
                            : null;
                        return (
                          <tr
                            key={invoice.id}
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          >
                            <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-100">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {invoice.contractNumber}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {invoice.billToName}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {formatDate(invoice.invoiceDate)}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                              {formatDate(invoice.dueDate)}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-100">
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={invoice.status} />
                            </td>
                            <td className="px-5 py-4">
                              <RowActions
                                invoice={invoice}
                                busyAction={busyAction}
                                onView={(inv) => void handleViewInvoice(inv)}
                                onDownload={(inv) =>
                                  void handleDownloadInvoice(inv)
                                }
                                onSubmitProof={(inv) => openProofModal(inv)}
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
                    const busyAction =
                      rowBusy?.invoiceId === invoice.id ? rowBusy.action : null;
                    return (
                      <div
                        key={invoice.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              Contract: {invoice.contractNumber}
                            </p>
                          </div>
                          <StatusBadge status={invoice.status} />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div>
                            <p className="text-slate-400">Bill To</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {invoice.billToName}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Amount</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {formatCurrency(invoice.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Invoice Date</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {formatDate(invoice.invoiceDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Due Date</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                              {formatDate(invoice.dueDate)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <RowActions
                            invoice={invoice}
                            busyAction={busyAction}
                            onView={(inv) => void handleViewInvoice(inv)}
                            onDownload={(inv) =>
                              void handleDownloadInvoice(inv)
                            }
                            onSubmitProof={(inv) => openProofModal(inv)}
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

      {/* ==================================================
          PDF VIEWER MODAL
      ================================================== */}
      {pdfViewer && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {pdfViewer.title}
              </h3>
              <button
                type="button"
                onClick={closePdfViewer}
                className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <iframe
              src={pdfViewer.url}
              title={pdfViewer.title}
              className="w-full flex-1"
            />
          </div>
        </div>
      )}

      {/* ==================================================
          SUBMIT PAYMENT PROOF (ETF) MODAL
      ================================================== */}
      {proofModalInvoice && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Submit Payment Proof (ETF)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    For invoice {proofModalInvoice.invoiceNumber}. Please
                    provide payment details and upload the transaction proof for
                    verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProofModal}
                disabled={proofSubmitting}
                className="shrink-0 rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmitProof(e)}
              className="flex-1 overflow-y-auto px-5 py-4"
            >

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    options={PAYMENT_METHOD_OPTIONS.filter(
                      (opt) => opt.value !== "",
                    )}
                    value={proofForm.paymentMethod}
                    onChange={(val) =>
                      setProofForm((prev) => ({ ...prev, paymentMethod: val }))
                    }
                    placeholder="Select Payment Method"
                    leftIcon={<Landmark size={15} />}
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Choose the method you used for payment.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="date"
                      value={proofForm.paymentDate}
                      onChange={(e) =>
                        setProofForm((prev) => ({
                          ...prev,
                          paymentDate: e.target.value,
                        }))
                      }
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Enter the date when you made the payment.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Amount Paid <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Banknote
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={proofForm.amountPaid}
                      onChange={(e) =>
                        setProofForm((prev) => ({
                          ...prev,
                          amountPaid: e.target.value,
                        }))
                      }
                      required
                      placeholder="Enter amount"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Enter the exact amount you have paid.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transaction / Reference ID{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={proofForm.transactionReference}
                      onChange={(e) =>
                        setProofForm((prev) => ({
                          ...prev,
                          transactionReference: e.target.value,
                        }))
                      }
                      required
                      placeholder="Enter UTR / Transaction ID / Reference Number"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Enter the transaction reference number (e.g. UTR,
                    Transaction ID, etc.).
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Proof <span className="text-red-500">*</span>
                  </label>
                  <label
                    htmlFor="payment-proof-file"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <UploadCloud size={26} className="text-blue-500" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-[11px] text-slate-400">
                      JPG, JPEG, PNG or PDF (Max 5 MB)
                    </p>
                    {proofForm.proofFile && (
                      <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {proofForm.proofFile.name}
                      </p>
                    )}
                    <input
                      id="payment-proof-file"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Upload a screenshot or receipt of your payment.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeProofModal}
                  disabled={proofSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proofSubmitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {proofSubmitting ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
      <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
        {title}
      </h2>
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
