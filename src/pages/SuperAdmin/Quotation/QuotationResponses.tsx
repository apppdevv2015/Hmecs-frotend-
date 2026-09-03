import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Mail,
  Phone,
  Receipt,
  X,
  XCircle,
} from "lucide-react";
import { EftVerificationModal } from "./EftVerificationModal";

type QuotationResponseStatus =
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

type ResponseFilter = "ALL" | QuotationResponseStatus;

interface QuotationResponse {
  readonly id: string;
  readonly quotationNumber: string;
  readonly companyName: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly sentAt: string;
  readonly respondedAt: string;
  readonly status: QuotationResponseStatus;
  readonly rejectionReason: string;
  readonly quotationType: string;
  readonly contractDuration: string;
  readonly quotationAmount: number;
}

/* ============================================================
   MODAL Z-INDEX
   The response modal is rendered through a portal straight into
   document.body, so these values only need to beat whatever
   z-index the app shell (navbar / sidebar) uses. Set as inline
   styles rather than Tailwind classes so nothing can clamp or
   override the value.
============================================================ */

const MODAL_OVERLAY_Z_INDEX = 2147483000;
const MODAL_CONTENT_Z_INDEX = 2147483001;

const DEVELOPMENT_QUOTATION_RESPONSES: readonly QuotationResponse[] = [
  {
    id: "response-001",
    quotationNumber: "QTN-2026-001",
    companyName: "ABC Mining Solutions",
    contactPerson: "John Doe",
    email: "john.doe@abcmining.co.za",
    phone: "+27 11 555 0101",
    sentAt: "25 Aug 2026, 10:32 AM",
    respondedAt: "25 Aug 2026, 03:45 PM",
    status: "ACCEPTED",
    rejectionReason: "",
    quotationType: "Fleet Management",
    contractDuration: "12 Months",
    quotationAmount: 85000,
  },
  {
    id: "response-002",
    quotationNumber: "QTN-2026-002",
    companyName: "Global Heavy Equipment",
    contactPerson: "David Miller",
    email: "david.miller@globalheavy.co.za",
    phone: "+27 12 555 0182",
    sentAt: "24 Aug 2026, 09:15 AM",
    respondedAt: "25 Aug 2026, 11:20 AM",
    status: "REJECTED",
    rejectionReason:
      "The quoted pricing is above our approved budget. We would like to review a revised commercial proposal.",
    quotationType: "Predictive Maintenance",
    contractDuration: "24 Months",
    quotationAmount: 62500,
  },
  {
    id: "response-003",
    quotationNumber: "QTN-2026-003",
    companyName: "Iron Valley Corporation",
    contactPerson: "Sarah Johnson",
    email: "sarah.johnson@ironvalley.co.za",
    phone: "+27 13 555 0144",
    sentAt: "24 Aug 2026, 04:45 PM",
    respondedAt: "",
    status: "SENT",
    rejectionReason: "",
    quotationType: "Asset Monitoring",
    contractDuration: "6 Months",
    quotationAmount: 48000,
  },
  {
    id: "response-004",
    quotationNumber: "QTN-2026-004",
    companyName: "North Star Equipment",
    contactPerson: "Michael Brown",
    email: "michael.brown@northstar.co.za",
    phone: "+27 21 555 0198",
    sentAt: "23 Aug 2026, 11:20 AM",
    respondedAt: "",
    status: "EXPIRED",
    rejectionReason: "",
    quotationType: "Fleet Management",
    contractDuration: "12 Months",
    quotationAmount: 71000,
  },
  {
    id: "response-005",
    quotationNumber: "QTN-2026-005",
    companyName: "Peak Mining Limited",
    contactPerson: "Robert Wilson",
    email: "robert.wilson@peakmining.co.za",
    phone: "+27 10 555 0116",
    sentAt: "23 Aug 2026, 03:10 PM",
    respondedAt: "24 Aug 2026, 09:30 AM",
    status: "ACCEPTED",
    rejectionReason: "",
    quotationType: "Predictive Maintenance",
    contractDuration: "18 Months",
    quotationAmount: 92000,
  },
  {
    id: "response-006",
    quotationNumber: "QTN-2026-006",
    companyName: "Terra Mines Pvt Ltd",
    contactPerson: "Emily Davis",
    email: "emily.davis@terramines.co.za",
    phone: "+27 14 555 0167",
    sentAt: "23 Aug 2026, 10:05 AM",
    respondedAt: "24 Aug 2026, 02:15 PM",
    status: "REJECTED",
    rejectionReason:
      "The proposed contract duration does not match our current operational requirement.",
    quotationType: "Asset Monitoring",
    contractDuration: "6 Months",
    quotationAmount: 54000,
  },
];

const getQuotationResponses = async (): Promise<
  readonly QuotationResponse[]
> => DEVELOPMENT_QUOTATION_RESPONSES;

interface StatusConfig {
  readonly label: string;
  readonly className: string;
  readonly icon: ReactNode;
}

const STATUS_CONFIG: Record<
  QuotationResponseStatus,
  StatusConfig
> = {
  SENT: {
 label: "Accepted",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: <CheckCircle2 size={14} aria-hidden="true" />,  },

  ACCEPTED: {
    label: "Accepted",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: <CheckCircle2 size={14} aria-hidden="true" />,
  },
  REJECTED: {
    label: "Rejected",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    icon: <XCircle size={14} aria-hidden="true" />,
  },
  EXPIRED: {
    label: "Expired",
    className:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <Clock3 size={14} aria-hidden="true" />,
  },
};

const QuotationResponses: FC = () => {
  const [responses, setResponses] = useState<
    readonly QuotationResponse[]
  >([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<ResponseFilter>("ALL");

  const [selectedResponse, setSelectedResponse] =
    useState<QuotationResponse | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadResponses = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await getQuotationResponses();

        if (isMounted) {
          setResponses(data);
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load quotation responses.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadResponses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredResponses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return responses.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.companyName
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.quotationNumber
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesFilter =
        activeFilter === "ALL" ||
        item.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [responses, search, activeFilter]);

  const totalResponses = responses.length;

  const acceptedCount = responses.filter(
    (item) => item.status === "ACCEPTED",
  ).length;

  const rejectedCount = responses.filter(
    (item) => item.status === "REJECTED",
  ).length;

  const pendingCount = responses.filter(
    (item) => item.status === "SENT",
  ).length;

  return (
    <>
      <section className="w-full text-slate-900 dark:text-slate-100">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Responses"
              value={totalResponses}
              icon={
                <FileText
                  size={18}
                  aria-hidden="true"
                />
              }
            />

            <SummaryCard
              label="Accepted"
              value={acceptedCount}
              icon={
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                />
              }
            />

            <SummaryCard
              label="Rejected"
              value={rejectedCount}
              icon={
                <XCircle
                  size={18}
                  aria-hidden="true"
                />
              }
            />

            <SummaryCard
              label="Pending Response"
              value={pendingCount}
              icon={
                <Clock3
                  size={18}
                  aria-hidden="true"
                />
              }
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="relative w-full">
                  <FileText
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    aria-hidden="true"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search company or quotation number..."
                    aria-label="Search quotation responses"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-800"
                  />
                </div>

                <div
                  className="flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                  aria-label="Quotation response filters"
                >
                  <FilterButton
                    label="All"
                    value="ALL"
                    activeFilter={activeFilter}
                    onClick={setActiveFilter}
                  />

                  <FilterButton
                    label="Accepted"
                    value="ACCEPTED"
                    activeFilter={activeFilter}
                    onClick={setActiveFilter}
                  />

                  <FilterButton
                    label="Rejected"
                    value="REJECTED"
                    activeFilter={activeFilter}
                    onClick={setActiveFilter}
                  />
                  <FilterButton
                    label="Expired"
                    value="EXPIRED"
                    activeFilter={activeFilter}
                    onClick={setActiveFilter}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                    <TableHeader>
                      Company Name
                    </TableHeader>

                    <TableHeader>
                      Quotation Number
                    </TableHeader>

                    <TableHeader>
                      Sent Date
                    </TableHeader>

                    <TableHeader>
                      Response Date
                    </TableHeader>

                    <TableHeader>
                      Status
                    </TableHeader>

                    <TableHeader align="right">
                      Action
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {isLoading && <TableLoading />}

                  {!isLoading &&
                    errorMessage.length > 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-16 text-center"
                        >
                          <div className="mx-auto max-w-md">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                              <XCircle
                                size={21}
                                aria-hidden="true"
                              />
                            </div>

                            <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                              Unable to load quotation
                              responses
                            </p>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {errorMessage}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                  {!isLoading &&
                    errorMessage.length === 0 &&
                    filteredResponses.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-16 text-center"
                        >
                          <div className="mx-auto max-w-md">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                              <FileText
                                size={21}
                                aria-hidden="true"
                              />
                            </div>

                            <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                              No quotation responses
                              found
                            </p>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              No records match the current
                              search or status filter.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                  {!isLoading &&
                    errorMessage.length === 0 &&
                    filteredResponses.map((item) => (
                      <QuotationResponseRow
                        key={item.id}
                        response={item}
                        onView={setSelectedResponse}
                      />
                    ))}
                </tbody>
              </table>
            </div>

            {!isLoading &&
              errorMessage.length === 0 &&
              filteredResponses.length > 0 && (
                <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {filteredResponses.length} of{" "}
                    {responses.length} responses
                  </p>
                </div>
              )}
          </div>
        </div>
      </section>

      {selectedResponse !== undefined &&
        typeof document !== "undefined" &&
        createPortal(
          <QuotationResponseModal
            response={selectedResponse}
            onClose={() =>
              setSelectedResponse(undefined)
            }
          />,
          document.body,
        )}
    </>
  );
};

interface QuotationResponseRowProps {
  readonly response: QuotationResponse;
  readonly onView: (
    response: QuotationResponse,
  ) => void;
}

const QuotationResponseRow: FC<
  QuotationResponseRowProps
> = ({ response, onView }) => {
  const status = STATUS_CONFIG[response.status];

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <td className="px-5 py-4">
        <div className="flex min-w-[190px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Building2
              size={16}
              aria-hidden="true"
            />
          </div>

          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {response.companyName}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
          {response.quotationNumber}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
          {response.sentAt}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
          {response.respondedAt.length > 0
            ? response.respondedAt
            : "—"}
        </span>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}
        >
          {status.icon}
          {status.label}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onView(response)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
          >
            <Eye
              size={16}
              aria-hidden="true"
            />
            View
          </button>
        </div>
      </td>
    </tr>
  );
};

interface QuotationResponseModalProps {
  readonly response: QuotationResponse;
  readonly onClose: () => void;
}

const QuotationResponseModal: FC<
  QuotationResponseModalProps
> = ({ response, onClose }) => {
  const [showEftModal, setShowEftModal] = useState(false);
  const status = STATUS_CONFIG[response.status];

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5"
      style={{ zIndex: MODAL_OVERLAY_Z_INDEX }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-response-modal-title"
    >
      <button
        type="button"
        aria-label="Close quotation response"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <section
        className="relative flex max-h-[calc(100vh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100vh-40px)] sm:rounded-3xl"
        style={{ zIndex: MODAL_CONTENT_Z_INDEX }}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <FileText
                  size={18}
                  aria-hidden="true"
                />
              </span>

              <div className="min-w-0">
                <h2
                  id="quotation-response-modal-title"
                  className="truncate text-lg font-semibold text-slate-900 dark:text-white"
                >
                  Quotation Response
                </h2>

                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {response.quotationNumber}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X
                size={20}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="mt-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}
            >
              {status.icon}
              {status.label}
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 dark:bg-slate-900/40">
          <div className="space-y-5 p-4 sm:p-6 md:p-7">
            <ModalSection
              title="Company Information"
              icon={
                <Building2
                  size={17}
                  aria-hidden="true"
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Company Name"
                  value={response.companyName}
                />

                <DetailItem
                  label="Contact Person"
                  value={response.contactPerson}
                />

                <DetailItem
                  label="Email Address"
                  value={response.email}
                  icon={
                    <Mail
                      size={14}
                      aria-hidden="true"
                    />
                  }
                />

                <DetailItem
                  label="Phone Number"
                  value={response.phone}
                  icon={
                    <Phone
                      size={14}
                      aria-hidden="true"
                    />
                  }
                />
              </div>
            </ModalSection>

            <ModalSection
              title="Quotation Information"
              icon={
                <FileText
                  size={17}
                  aria-hidden="true"
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem
                  label="Quotation Number"
                  value={response.quotationNumber}
                />

                <DetailItem
                  label="Quotation Type"
                  value={response.quotationType}
                />

                <DetailItem
                  label="Contract Duration"
                  value={response.contractDuration}
                />

                <DetailItem
                  label="Quotation Amount"
                  value={`R ${response.quotationAmount.toLocaleString(
                    "en-ZA",
                  )}`}
                />
              </div>
            </ModalSection>

            <ModalSection
              title="Response Timeline"
              icon={
                <CalendarDays
                  size={17}
                  aria-hidden="true"
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Quotation Sent"
                  value={response.sentAt}
                />

                <DetailItem
                  label="Company Response"
                  value={
                    response.respondedAt.length > 0
                      ? response.respondedAt
                      : "No response received yet"
                  }
                />
              </div>
            </ModalSection>

            {response.status === "REJECTED" &&
              response.rejectionReason.length > 0 && (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                      <XCircle
                        size={17}
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Rejection Reason
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700 dark:text-red-300/90">
                        {response.rejectionReason}
                      </p>
                    </div>
                  </div>
                </section>
              )}

            {response.status === "ACCEPTED" && (
              <ResponseNotice
                tone="accepted"
                icon={
                  <CheckCircle2
                    size={17}
                    aria-hidden="true"
                  />
                }
                title="Quotation Accepted"
              >
                The company administrator has accepted
                this quotation.
              </ResponseNotice>
            )}

            {response.status === "SENT" && (
              <ResponseNotice
                tone="pending"
                icon={
                  <Clock3
                    size={17}
                    aria-hidden="true"
                  />
                }
                title="Quotation Accepted"
              >
                The company administrator has accepted this quotation.
              </ResponseNotice>
            )}

            {response.status === "EXPIRED" && (
              <ResponseNotice
                tone="expired"
                icon={
                  <Clock3
                    size={17}
                    aria-hidden="true"
                  />
                }
                title="Quotation Expired"
              >
                This quotation has expired without an
                active response.
              </ResponseNotice>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <button
            type="button"
            onClick={() => setShowEftModal(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <Receipt size={16} />
            Verify EFT / Bank Payment
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-auto sm:min-w-28"
          >
            Close
          </button>
        </footer>

        {showEftModal && (
          <EftVerificationModal
            isOpen={showEftModal}
            onClose={() => setShowEftModal(false)}
            quotation={{
              id: response.id,
              quotationNumber: response.quotationNumber,
              companyName: response.companyName,
              contactEmail: response.email,
              totalAmount: response.quotationAmount,
              status: response.status,
            }}
          />
        )}
      </section>
    </div>
  );
};

interface ModalSectionProps {
  readonly title: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}

const ModalSection: FC<ModalSectionProps> = ({
  title,
  icon,
  children,
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        {icon}
      </span>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>
    </div>

    {children}
  </section>
);

interface DetailItemProps {
  readonly label: string;
  readonly value: string;
  readonly icon?: ReactNode;
}

const DetailItem: FC<DetailItemProps> = ({
  label,
  value,
  icon,
}) => (
  <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
      {label}
    </p>

    <div className="mt-1.5 flex items-start gap-1.5">
      {icon !== undefined && (
        <span className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
          {icon}
        </span>
      )}

      <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  </div>
);

interface ResponseNoticeProps {
  readonly tone: "accepted" | "pending" | "expired";
  readonly icon: ReactNode;
  readonly title: string;
  readonly children: ReactNode;
}

const ResponseNotice: FC<ResponseNoticeProps> = ({
  tone,
  icon,
  title,
  children,
}) => {
  const classes =
    tone === "accepted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "pending"
        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
        : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <section
      className={`rounded-2xl border p-4 ${classes}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/60">
          {icon}
        </span>

        <div>
          <h3 className="text-sm font-semibold">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6">
            {children}
          </p>
        </div>
      </div>
    </section>
  );
};

interface TableHeaderProps {
  readonly children: ReactNode;
  readonly align?: "left" | "right";
}

const TableHeader: FC<TableHeaderProps> = ({
  children,
  align = "left",
}) => (
  <th
    className={`px-5 py-4 text-${align} text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400`}
  >
    {children}
  </th>
);

interface FilterButtonProps {
  readonly label: string;
  readonly value: ResponseFilter;
  readonly activeFilter: ResponseFilter;
  readonly onClick: (
    value: ResponseFilter,
  ) => void;
}

const FilterButton: FC<FilterButtonProps> = ({
  label,
  value,
  activeFilter,
  onClick,
}) => {
  const isActive = activeFilter === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onClick(value)}
      className={`shrink-0 rounded-lg border px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
        isActive
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
      }`}
    >
      {label}
    </button>
  );
};

interface SummaryCardProps {
  readonly label: string;
  readonly value: number;
  readonly icon: ReactNode;
}

const SummaryCard: FC<SummaryCardProps> = ({
  label,
  value,
  icon,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
        {icon}
      </span>
    </div>

    <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
      {value}
    </p>
  </div>
);

const TableLoading: FC = () => (
  <>
    {Array.from(
      { length: 5 },
      (_, index) => (
        <tr
          key={`quotation-response-loading-${index}`}
          className="border-b border-slate-100 dark:border-slate-800"
        >
          <td className="px-5 py-5">
            <LoadingBlock width="w-40" />
          </td>

          <td className="px-5 py-5">
            <LoadingBlock width="w-32" />
          </td>

          <td className="px-5 py-5">
            <LoadingBlock width="w-36" />
          </td>

          <td className="px-5 py-5">
            <LoadingBlock width="w-36" />
          </td>

          <td className="px-5 py-5">
            <LoadingBlock width="w-20" />
          </td>

          <td className="px-5 py-5">
            <div className="flex justify-end">
              <LoadingBlock width="w-16" />
            </div>
          </td>
        </tr>
      ),
    )}
  </>
);

interface LoadingBlockProps {
  readonly width: string;
}

const LoadingBlock: FC<LoadingBlockProps> = ({
  width,
}) => (
  <div
    className={`${width} h-4 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800`}
  />
);

export default QuotationResponses;