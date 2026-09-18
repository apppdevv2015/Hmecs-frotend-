import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getContractsList,
  deleteContract,
  getContractPdfBlobUrl,
  downloadContractPdf,
  extractContractError,
  type Contract,
  type ContractStatus,
} from "../../../services/SuperAdmin/quotation/contractService";

/**
 * Contract History
 *
 * Data comes from GET /quotations/contracts (role-filtered server-side —
 * no companyId param needed, backend resolves it from the auth token).
 */
type ContractHistoryPageProps = {
  onBack?: () => void;
};

const ContractHistoryPage: React.FC<ContractHistoryPageProps> = ({ onBack }) => {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [rowBusy, setRowBusy] = useState<{
    id: string;
    action: "view" | "download";
  } | null>(null);
  const [rowActionError, setRowActionError] = useState<string>("");
  const [pdfViewer, setPdfViewer] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ContractStatus>(
    "All",
  );
  const [page, setPage] = useState(1);

  const pageSize = 10;

  /* ------------------------------------------------------------
     FETCH — GET /quotations/contracts
  ------------------------------------------------------------ */
  const fetchContracts = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    getContractsList({ signal })
      .then((data) => {
        if (signal?.aborted) return;
        setContracts([...data]);
      })
      .catch((err) => {
        if (signal?.aborted) return;
        setError(extractContractError(err) ?? "Failed to load contracts.");
        setContracts([]);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchContracts(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (pdfViewer) {
        window.URL.revokeObjectURL(pdfViewer.url);
      }
    };
  }, [pdfViewer]);

  /* ------------------------------------------------------------
     FILTER + PAGINATION
  ------------------------------------------------------------ */
  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const matchesSearch =
        !query ||
        contract.contractNumber.toLowerCase().includes(query) ||
        contract.id.toLowerCase().includes(query) ||
        contract.quotation.companyName.toLowerCase().includes(query) ||
        contract.quotation.contactPerson.toLowerCase().includes(query) ||
        contract.quotation.contactEmail.toLowerCase().includes(query) ||
        contract.quotation.quotationNumber.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContracts.length / pageSize),
  );

  const visibleContracts = filteredContracts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const summary = useMemo(
    () => ({
      total: contracts.length,
      sent: contracts.filter((item) => item.status === "SENT").length,
      accepted: contracts.filter((item) => item.status === "ACCEPTED").length,
      rejected: contracts.filter((item) => item.status === "REJECTED").length,
      expired: contracts.filter((item) => item.status === "EXPIRED").length,
    }),
    [contracts],
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: "All" | ContractStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  /* ------------------------------------------------------------
     ACTIONS
  ------------------------------------------------------------ */
  const handleViewPdf = async (contract: Contract) => {
    setRowActionError("");
    setRowBusy({ id: contract.id, action: "view" });
    try {
      const url = await getContractPdfBlobUrl(contract.id);
      setPdfViewer({ url, title: contract.contractNumber });
    } catch (err) {
      setRowActionError(
        extractContractError(err) ??
          `Could not open ${contract.contractNumber}. The contract may not be accepted/signed yet.`,
      );
    } finally {
      setRowBusy(null);
    }
  };

  const handleDownloadPdf = async (contract: Contract) => {
    setRowActionError("");
    setRowBusy({ id: contract.id, action: "download" });
    try {
      await downloadContractPdf(contract.id, `${contract.contractNumber}.pdf`);
    } catch (err) {
      setRowActionError(
        extractContractError(err) ??
          `Could not download ${contract.contractNumber}. The contract may not be accepted/signed yet.`,
      );
    } finally {
      setRowBusy(null);
    }
  };

  const closePdfViewer = () => {
    setPdfViewer((current) => {
      if (current) {
        window.URL.revokeObjectURL(current.url);
      }
      return null;
    });
  };

  const requestDelete = (contract: Contract) => {
    setDeleteTarget(contract);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

       setDeletingId(deleteTarget.id);
    try {
      await deleteContract(deleteTarget.id);
      setContracts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const statusClasses: Record<ContractStatus, string> = {
    SENT: "bg-amber-50 text-amber-700",
    ACCEPTED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
    EXPIRED: "bg-slate-100 text-slate-500",
  };

  const statusLabels: Record<ContractStatus, string> = {
    SENT: "Sent",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    EXPIRED: "Expired",
  };

  /* ------------------------------------------------------------
     LOADING / ERROR STATES
  ------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500">
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading contracts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <svg
          className="h-8 w-8 text-red-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => fetchContracts()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
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
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
                    <button
            type="button"
            onClick={() => (onBack ? onBack() : navigate(-1))}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Contract History
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View and manage all contracts that have been sent.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchContracts()}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 11a8.1 8.1 0 0 0-15.5-3M4 5v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 15.5 3M20 19v-4h-4" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Total Contracts" value={summary.total} />
          <SummaryCard label="Sent" value={summary.sent} />
          <SummaryCard label="Accepted" value={summary.accepted} />
          <SummaryCard label="Rejected" value={summary.rejected} />
          <SummaryCard label="Expired" value={summary.expired} />
        </div>

        {/* Table Card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Filters */}
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Search contracts, company or quotation..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="status-filter"
                  className="hidden text-sm font-medium text-slate-600 sm:block"
                >
                  Status
                </label>

                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    handleStatusChange(
                      event.target.value as "All" | ContractStatus,
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-44"
                >
                  <option value="All">All statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {rowActionError !== "" && (
            <div
              role="alert"
              className="mx-4 mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:mx-5"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{rowActionError}</span>
            </div>
          )}

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contract
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Company
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Quotation
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Start
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    End
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6M8 13h8M8 17h6" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {contract.contractNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            PO: {contract.poNumber || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">
                        {contract.quotation.companyName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {contract.quotation.contactEmail}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {contract.quotation.quotationNumber}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(contract.startDate)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(contract.endDate)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[contract.status]}`}
                      >
                        {statusLabels[contract.status]}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <ActionButton
                          label="View"
                          onClick={() => void handleViewPdf(contract)}
                          disabled={
                            contract.status !== "ACCEPTED" ||
                            rowBusy !== null ||
                            deletingId === contract.id
                          }
                          loading={
                            rowBusy?.id === contract.id &&
                            rowBusy.action === "view"
                          }
                          title={
                            contract.status !== "ACCEPTED"
                              ? "PDF is available only after the contract is accepted and signed"
                              : undefined
                          }
                        />
                        <ActionButton
                          label="Download"
                          onClick={() => void handleDownloadPdf(contract)}
                          disabled={
                            contract.status !== "ACCEPTED" ||
                            rowBusy !== null ||
                            deletingId === contract.id
                          }
                          loading={
                            rowBusy?.id === contract.id &&
                            rowBusy.action === "download"
                          }
                          title={
                            contract.status !== "ACCEPTED"
                              ? "PDF is available only after the contract is accepted and signed"
                              : undefined
                          }
                        />
                        <ActionButton
                          label={
                            deletingId === contract.id
                              ? "Deleting..."
                              : "Delete"
                          }
                          onClick={() => requestDelete(contract)}
                          disabled={
                            rowBusy !== null || deletingId === contract.id
                          }
                          variant="danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleContracts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <svg
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6M8 13h8M8 17h5" />
                          </svg>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-900">
                          No contracts found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {contracts.length === 0
                            ? "Contracts sent from the system will appear here."
                            : "Try changing your search or status filter."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {filteredContracts.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-slate-700">
                {Math.min(page * pageSize, filteredContracts.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">
                {filteredContracts.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="min-w-20 text-center text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* PDF VIEWER MODAL */}
      {pdfViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                {pdfViewer.title}
              </h3>
              <button
                type="button"
                onClick={closePdfViewer}
                className="rounded-md p-1.5 hover:bg-slate-100"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Delete Contract
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700">
                {deleteTarget.contractNumber}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId !== null}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId !== null && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type SummaryCardProps = {
  label: string;
  value: number;
};

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
      {value}
    </p>
  </div>
);

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "danger";
  title?: string;
};

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  disabled,
  loading = false,
  variant = "default",
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
      variant === "danger"
        ? "text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-200"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200"
    }`}
  >
    {loading && (
      <svg
        className="h-3 w-3 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    )}
    {label}
  </button>
);

const formatDate = (date: string | null) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

export default ContractHistoryPage;
