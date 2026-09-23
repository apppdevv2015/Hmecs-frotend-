import { useCallback, useEffect, useMemo, useState } from "react";
import AppSelect from "../../../components/ui/dropdown/AppSelect";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  Eye,
  Download,
  FileText,
  Loader2,
  Inbox,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  getContractsList,
  extractContractError,
  type Contract,
} from "../../../services/SuperAdmin/quotation/contractService";
import {
  getInvoices,
  downloadInvoicePdf,
  getInvoicePdfBlobUrl,
  extractInvoiceActionError,
  type Invoice,
} from "../../../services/Quotation/invoice.service";

type InvoiceStatusFilter = "ALL" | "GENERATED" | "NOT_GENERATED";

const INVOICE_STATUS_SELECT_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Generated", value: "GENERATED" },
  { label: "Not Generated", value: "NOT_GENERATED" },
] as const;

interface InvoiceManagementRow {
  readonly contract: Contract;
  readonly invoice: Invoice | null;
}

const PAGE_SIZE = 6;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ContractStatusBadge({ status }: { status: Contract["status"] }) {
  const styles: Record<Contract["status"], string> = {
    ACCEPTED: "bg-green-50 text-green-700 border-green-200",
    SENT: "bg-blue-50 text-blue-700 border-blue-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
    EXPIRED: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function InvoiceStatusBadge({ generated }: { generated: boolean }) {
  return generated ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
      Generated
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
      Not Generated
    </span>
  );
}

export default function InvoiceManagement() {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<readonly Contract[]>([]);
  const [invoices, setInvoices] = useState<readonly Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("ALL");

  const [pdfViewer, setPdfViewer] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      const [contractsRes, invoicesRes] = await Promise.all([
        getContractsList({ status: "ACCEPTED", signal }),
        getInvoices(undefined, signal),
      ]);
      setContracts(contractsRes);
      setInvoices(Array.isArray(invoicesRes?.data) ? invoicesRes.data : []);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(
        extractContractError(err) ??
          extractInvoiceActionError(err) ??
          "Failed to load invoice data. Please refresh the page.",
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadData(controller.signal).finally(() => setLoading(false));
    return () => controller.abort();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Contract-centric merge: each ACCEPTED contract + its invoice (if any) ──
  const rows: readonly InvoiceManagementRow[] = useMemo(() => {
    return contracts.map((contract) => ({
      contract,
      invoice: invoices.find((inv) => inv.contractId === contract.id) ?? null,
    }));
  }, [contracts, invoices]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter === "GENERATED" && !row.invoice) return false;
      if (statusFilter === "NOT_GENERATED" && row.invoice) return false;

      if (!query) return true;

      const haystack = [
        row.contract.quotation.contactPerson,
        row.contract.quotation.companyName,
        row.contract.contractNumber,
        row.invoice?.invoiceNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, search, statusFilter]);

  const handleInvoiceAction = (row: InvoiceManagementRow) => {
    navigate(`/super-admin/invoices/generate?contractId=${row.contract.id}`);
  };

  const handleViewPdf = async (invoice: Invoice) => {
    setActionError(null);
    setPdfLoadingId(invoice.id);
    try {
      const url = await getInvoicePdfBlobUrl(invoice.id);
      setPdfViewer({ url, title: invoice.invoiceNumber });
    } catch (err) {
      setActionError(
        extractInvoiceActionError(err) ??
          "Failed to load PDF. Please try again.",
      );
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    setActionError(null);
    setDownloadingId(invoice.id);
    try {
      await downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      setActionError(
        extractInvoiceActionError(err) ??
          "Failed to download PDF. Please try again.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const closePdfViewer = () => {
    if (pdfViewer) {
      window.URL.revokeObjectURL(pdfViewer.url);
    }
    setPdfViewer(null);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Invoice Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage invoices for all accepted contracts
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#0b1728] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Search + Filter bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, company, contract or invoice number..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#101f33] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <AppSelect
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as InvoiceStatusFilter)}
            options={INVOICE_STATUS_SELECT_OPTIONS}
            className="sm:w-48"
          />
        </div>

        {/* Table — shows VISIBLE_ROWS rows, rest scrolls, scrollbar stays visible */}
        <div className="overflow-x-auto">
          <div className="max-h-[336px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-[#101f33] text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contract Number</th>
                  <th className="px-4 py-3">Contract Period</th>
                  <th className="px-4 py-3">Contract Status</th>
                  <th className="px-4 py-3">Invoice Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 w-full max-w-[100px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : loadError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10">
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {loadError}
                        </p>
                        <button
                          type="button"
                          onClick={handleRefresh}
                          className="mt-1 text-sm font-medium text-blue-600 hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10">
                      <div className="flex flex-col items-center justify-center text-center gap-2">
                        <Inbox className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {rows.length === 0
                            ? "No accepted contracts available yet."
                            : "No records match your search or filter."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const { contract, invoice } = row;
                    const generated = Boolean(invoice);

                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-gray-50 dark:hover:bg-[#0e1b2e]"
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {contract.quotation.contactPerson}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {contract.quotation.companyName}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {contract.contractNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {formatDate(contract.startDate)} -{" "}
                          {formatDate(contract.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          <ContractStatusBadge status={contract.status} />
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge generated={generated} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={
                                !invoice || pdfLoadingId === invoice?.id
                              }
                              onClick={() => invoice && handleViewPdf(invoice)}
                              title="View PDF"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {pdfLoadingId === invoice?.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              View
                            </button>
                            <button
                              type="button"
                              disabled={
                                !invoice || downloadingId === invoice?.id
                              }
                              onClick={() =>
                                invoice && handleDownloadPdf(invoice)
                              }
                              title="Download PDF"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {downloadingId === invoice?.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Download
                            </button>
                            <button
                              type="button"
                              disabled={generated}
                              onClick={() => handleInvoiceAction(row)}
                              title={
                                generated
                                  ? "Invoice already generated"
                                  : "Generate invoice"
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary footer — no pagination, table scrolls instead */}
        {!loading && !loadError && filteredRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredRows.length} record
              {filteredRows.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <div className="fixed inset-0 z-99999 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b1728] rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {pdfViewer.title}
              </h3>
              <button
                type="button"
                onClick={closePdfViewer}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={pdfViewer.url}
              title={pdfViewer.title}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
