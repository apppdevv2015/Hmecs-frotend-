import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  Mail,
  MoreVertical,
  RotateCcw,
  Search,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";

import AppSelect from "../../../components/ui/dropdown/AppSelect";

import {
  getPaymentProofs,
  verifyPaymentProof,
  extractInvoiceActionError,
  type PaymentProof,
} from "../../../services/Quotation/invoice.service";

/* ============================================================
   CONSTANTS
============================================================ */

const MODAL_OVERLAY_Z_INDEX = 2147483000;
const MODAL_CONTENT_Z_INDEX = 2147483001;

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Verified / Paid" },
];

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
];

/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (amount: string | number): string => {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `R ${formatted}`;
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const formatDateOnly = (value: string): string => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().split("T")[0];
};

const formatMethodLabel = (method: string): string =>
  method
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getMethodIcon = (method: string) => {
  const normalized = method.toLowerCase();
  if (normalized.includes("bank") || normalized.includes("transfer") || normalized.includes("eft")) {
    return Landmark;
  }
  if (normalized.includes("upi")) {
    return Smartphone;
  }
  if (normalized.includes("card")) {
    return CreditCard;
  }
  return Wallet;
};

const getInitials = (name: string | null): string => {
  if (!name || !name.trim()) {
    return "?";
  }
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

const getAvatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
};

const getFileNameFromUrl = (url: string): string => {
  const segments = url.split("/");
  return segments[segments.length - 1] || "proof-file";
};

const getAbsoluteFileUrl = (proofFileUrl: string): string => {
  const base = (import.meta.env.VITE_API_BASE_URL as string) || "";
  const origin = base.replace(/\/api\/v1\/?$/, "");
  if (proofFileUrl.startsWith("http")) {
    return proofFileUrl;
  }
  return `${origin}${proofFileUrl}`;
};

/* ============================================================
   SMALL UI COMPONENTS
============================================================ */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  accent: string;
}

const StatCard: FC<StatCardProps> = ({ icon, label, value, subtitle, accent }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
    </div>
  </div>
);

interface StatusBadgeProps {
  status: "PENDING" | "PAID";
}

const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400">
        <CheckCircle2 size={13} />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400">
      <Clock3 size={13} />
      Pending
    </span>
  );
};

interface DetailRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: (value: string) => void;
  copied?: boolean;
}

const DetailRow: FC<DetailRowProps> = ({ icon, label, value, copyable, onCopy, copied }) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm font-semibold text-slate-900 dark:text-white" title={value}>
        {value}
      </span>
      {copyable && (
        <button
          type="button"
          onClick={() => onCopy?.(value)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
        </button>
      )}
    </div>
  </div>
);

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const SectionCard: FC<SectionCardProps> = ({ icon, title, children }) => (
  <div>
    <div className="mb-2 flex items-center gap-2">
      <span className="text-blue-600 dark:text-blue-400">{icon}</span>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
    </div>
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 dark:divide-slate-800 dark:border-slate-700">
      {children}
    </div>
  </div>
);

/* ============================================================
   PAYMENT DETAILS SIDE PANEL
============================================================ */

interface PaymentDetailsPanelProps {
  proof: PaymentProof;
  onClose: () => void;
  onVerify: (proof: PaymentProof) => void;
  isVerifying: boolean;
  verifyError: string;
}

const PaymentDetailsPanel: FC<PaymentDetailsPanelProps> = ({
  proof,
  onClose,
  onVerify,
  isVerifying,
  verifyError,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (field: string, value: string): void => {
    void navigator.clipboard.writeText(value);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500);
  };

  if (typeof document === "undefined") {
    return null;
  }

  const fileUrl = getAbsoluteFileUrl(proof.proofFileUrl);
  const fileName = getFileNameFromUrl(proof.proofFileUrl);
  const isPending = proof.status === "PENDING";

  return createPortal(
    <div
      className="fixed inset-0 flex justify-end bg-slate-950/50 backdrop-blur-sm"
      style={{ zIndex: MODAL_OVERLAY_Z_INDEX }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ zIndex: MODAL_CONTENT_Z_INDEX }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Payment Details</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment details"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              isPending
                ? "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-500/10"
                : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-500/10"
            }`}
          >
            {isPending ? (
              <Clock3 size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${
                  isPending ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"
                }`}
              >
                {isPending ? "Pending Verification" : "Payment Verified"}
              </p>
              <p className={`mt-0.5 text-xs ${isPending ? "text-amber-700/80 dark:text-amber-400/80" : "text-emerald-700/80 dark:text-emerald-400/80"}`}>
                {isPending
                  ? "Review the payment details and verify."
                  : "This payment has been confirmed and the invoice is marked as paid."}
              </p>
            </div>
          </div>

          <SectionCard icon={<FileText size={16} />} title="Invoice Information">
            <DetailRow label="Invoice No." value={proof.invoiceNumber} />
            <DetailRow
              label="Invoice ID"
              value={proof.invoiceId}
              copyable
              copied={copiedField === "invoiceId"}
              onCopy={(value) => handleCopy("invoiceId", value)}
            />
            <DetailRow
              label="Company ID"
              value={proof.companyId}
              copyable
              copied={copiedField === "companyId"}
              onCopy={(value) => handleCopy("companyId", value)}
            />
          </SectionCard>

          <SectionCard icon={<Mail size={16} />} title="User Information">
            <DetailRow label="Name" value={proof.submittedByName ?? "—"} />
            <DetailRow label="Email" value={proof.submittedByEmail ?? "—"} />
          </SectionCard>

          <SectionCard icon={<CreditCard size={16} />} title="Payment Information">
            <DetailRow label="Payment Method" value={formatMethodLabel(proof.paymentMethod)} />
            <DetailRow label="Payment Date" value={formatDateTime(proof.paymentDate)} />
            <DetailRow label="Amount Paid" value={formatCurrency(proof.amountPaid)} />
            <DetailRow
              label="Transaction Reference"
              value={proof.transactionReference}
              copyable
              copied={copiedField === "txnRef"}
              onCopy={(value) => handleCopy("txnRef", value)}
            />
            <DetailRow label="Submitted On" value={formatDateTime(proof.createdAt)} />
          </SectionCard>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400">
                <FileText size={16} />
              </span>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Payment Proof</h4>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{fileName}</p>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">{proof.proofFileUrl}</p>
            </div>
              <a
                href={fileUrl}
                download={fileName}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Download payment proof"
              >
                <Download size={16} />
              </a>
                            </div>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-slate-600 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              <ExternalLink size={16} />
              Open Payment Proof
            </a>
          </div>

          {!isPending && (
            <SectionCard icon={<CheckCircle2 size={16} />} title="Verification Information">
              <DetailRow label="Verified At" value={formatDateTime(proof.verifiedAt)} />
              <DetailRow label="Verified By" value={proof.verifiedBy ?? "—"} />
            </SectionCard>
          )}
        </div>

        <div className="border-t border-slate-200 p-5 dark:border-slate-700">
          {verifyError && (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400">{verifyError}</p>
          )}

          {isPending ? (
            <button
              type="button"
              disabled={isVerifying}
              onClick={() => onVerify(proof)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Mark as Verified
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 size={17} />
              Already Verified
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const PaymentVerifications: FC = () => {
  const [proofs, setProofs] = useState<readonly PaymentProof[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isDateRangeOpen, setIsDateRangeOpen] = useState<boolean>(false);
  const dateRangeRef = useRef<HTMLDivElement | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string>("");

  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  /* ---------------- Fetch ---------------- */

  useEffect(() => {
    const controller = new AbortController();

    const loadProofs = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getPaymentProofs(undefined, controller.signal);
        setProofs(result.data);
      } catch (error: unknown) {
        const message = extractInvoiceActionError(error);
        if (message !== undefined) {
          setErrorMessage(message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadProofs();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target as Node)) {
        setIsDateRangeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- Derived data ---------------- */

  const paymentMethodOptions = useMemo(() => {
    const unique = Array.from(new Set(proofs.map((proof) => proof.paymentMethod)));
    return [
      { value: "ALL", label: "All Payment Methods" },
      ...unique.map((method) => ({ value: method, label: formatMethodLabel(method) })),
    ];
  }, [proofs]);

  const totalSubmissions = proofs.length;
  const pendingCount = useMemo(
    () => proofs.filter((proof) => proof.status === "PENDING").length,
    [proofs],
  );
  const verifiedCount = useMemo(
    () => proofs.filter((proof) => proof.status === "PAID").length,
    [proofs],
  );

  const filteredProofs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return proofs.filter((proof) => {
      if (statusFilter !== "ALL" && proof.status !== statusFilter) {
        return false;
      }

      if (methodFilter !== "ALL" && proof.paymentMethod !== methodFilter) {
        return false;
      }

      if (dateFrom) {
        const submitted = formatDateOnly(proof.createdAt);
        if (submitted < dateFrom) {
          return false;
        }
      }

      if (dateTo) {
        const submitted = formatDateOnly(proof.createdAt);
        if (submitted > dateTo) {
          return false;
        }
      }

      if (query) {
        const haystack = [
          proof.invoiceNumber,
          proof.submittedByName ?? "",
          proof.submittedByEmail ?? "",
          proof.transactionReference,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [proofs, searchTerm, statusFilter, methodFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredProofs.length / rowsPerPage));

  const paginatedProofs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProofs.slice(start, start + rowsPerPage);
  }, [filteredProofs, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter, dateFrom, dateTo, rowsPerPage]);

  /* ---------------- Handlers ---------------- */

  const handleReset = (): void => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setIsDateRangeOpen(false);
  };

  const handleVerify = async (proof: PaymentProof): Promise<void> => {
    setIsVerifying(true);
    setVerifyError("");

    try {
      const result = await verifyPaymentProof(proof.id, {});
      const updated = result.data;

      setProofs((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedProof(updated);
    } catch (error: unknown) {
      setVerifyError(
        extractInvoiceActionError(error) ?? "Unable to verify this payment. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const dateRangeLabel =
    dateFrom || dateTo
      ? `${dateFrom || "…"} → ${dateTo || "…"}`
      : "Select Date Range";

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    statusFilter !== "ALL" ||
    methodFilter !== "ALL" ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  const startIndex = filteredProofs.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredProofs.length);

  /* ---------------- Render ---------------- */

  return (
    <section className="w-full">
      {/* ============ HEADER ============ */}
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Payment Verifications
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and verify payment proofs submitted by users for generated invoices.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      {/* ============ STATS ============ */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText size={20} />}
          label="Total Submissions"
          value={totalSubmissions}
          subtitle="All payment proofs"
          accent="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        />
        <StatCard
          icon={<Clock3 size={20} />}
          label="Pending Verification"
          value={pendingCount}
          subtitle="Awaiting verification"
          accent="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="Verified / Paid"
          value={verifiedCount}
          subtitle="Marked as paid"
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
      </div>

      {/* ============ FILTERS ============ */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by user name, email, invoice number..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="w-full lg:w-48">
          <AppSelect
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-full lg:w-52">
          <AppSelect
            options={paymentMethodOptions}
            value={methodFilter}
            onChange={setMethodFilter}
            placeholder="All Payment Methods"
          />
        </div>

        <div className="relative w-full lg:w-56" ref={dateRangeRef}>
          <button
            type="button"
            onClick={() => setIsDateRangeOpen((open) => !open)}
            className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <CalendarDays size={16} className="shrink-0 text-slate-400" />
            <span className="truncate">{dateRangeLabel}</span>
          </button>

          {isDateRangeOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsDateRangeOpen(false)}
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>

      {/* ============ TABLE ============ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  #
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Invoice No.
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Amount Paid
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Submitted On
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
                    Loading payment proofs...
                  </td>
                </tr>
              )}

              {!isLoading && paginatedProofs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No payment proofs match your filters.
                  </td>
                </tr>
              )}

              {!isLoading &&
                paginatedProofs.map((proof, index) => {
                  const MethodIcon = getMethodIcon(proof.paymentMethod);
                  const displayName = proof.submittedByName ?? "Unknown user";

                  return (
                    <tr key={proof.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                        />
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {startIndex + index}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedProof(proof)}
                          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {proof.invoiceNumber}
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(
                              displayName,
                            )}`}
                          >
                            {getInitials(proof.submittedByName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {displayName}
                            </p>
                            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                              {proof.submittedByEmail ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(proof.amountPaid)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <MethodIcon size={15} className="text-slate-400" />
                          {formatMethodLabel(proof.paymentMethod)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {formatDateTime(proof.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={proof.status} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="relative flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProof(proof)}
                            aria-label="View details"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <FileText size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionMenuId((current) =>
                                current === proof.id ? null : proof.id,
                              )
                            }
                            aria-label="More actions"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openActionMenuId === proof.id && (
                            <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProof(proof);
                                  setOpenActionMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <FileText size={14} />
                                View Details
                              </button>
                              {proof.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    void handleVerify(proof);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                                >
                                  <CheckCircle2 size={14} />
                                  Mark as Verified
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* ============ PAGINATION ============ */}
        {!isLoading && filteredProofs.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {startIndex} - {endIndex} of {filteredProofs.length} results
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Rows per page</span>
                <select
                  value={rowsPerPage}
                  onChange={(event) => setRowsPerPage(Number(event.target.value))}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProof && (
        <PaymentDetailsPanel
          proof={selectedProof}
          onClose={() => {
            setSelectedProof(null);
            setVerifyError("");
          }}
          onVerify={(proof) => void handleVerify(proof)}
          isVerifying={isVerifying}
          verifyError={verifyError}
        />
      )}
    </section>
  );
};

export default PaymentVerifications;