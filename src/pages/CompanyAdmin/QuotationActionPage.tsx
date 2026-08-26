import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  FileText,
  Loader2,
  MessageSquare,
  X,
  XCircle,
} from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */

type QuotationStatus =
  | "AWAITING_RESPONSE"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

type Decision = "accept" | "reject";

interface OptionalService {
  id: string;
  name: string;
  amount: number;
}

interface CommercialProposal {
  implementationFee: number;
  monthlyLicence: number;
  additionalMachineCharges: number;
  optionalServices: OptionalService[];
  totalProposalValue: number;
  currency: "ZAR";
}

interface QuotationActionData {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  companyName: string;
  companyAdmin: string;
  sites: string[];
  machinePlan: string;
  activeMachines: number;
  contractDuration: string;
  quotationDate: string;
  commercials: CommercialProposal;
}

interface DecisionPayload {
  quotationId: string;
  decision: Decision;
  note: string;
  rejectionReason: string;
}

interface DecisionResponse {
  quotation: QuotationActionData;
  message: string;
}

interface QuotationActionService {
  getQuotationAction: (
    quotationId: string,
  ) => Promise<QuotationActionData>;

  submitDecision: (
    payload: DecisionPayload,
  ) => Promise<DecisionResponse>;
}

interface ApiErrorResponse {
  message?: string;
}

interface ApiError {
  message?: string;
  response?: {
    data?: ApiErrorResponse;
  };
}

/* ============================================================
   EXPLICIT UI PREVIEW MODE
   ------------------------------------------------------------
   This is NOT a fallback.
   It is an explicit development-only mode used to verify the
   complete UI until the real quotation API is connected.

   Production integration:
   1. Set ENABLE_UI_PREVIEW_MODE to false.
   2. Replace quotationActionService with the real service.
   3. Keep the page UI and validation unchanged.
   ============================================================ */

const ENABLE_UI_PREVIEW_MODE = true;

/* ============================================================
   DUMMY DATA
   ============================================================ */

const DUMMY_QUOTATION: QuotationActionData = {
  id: "QT-DEMO-2026-000124",
  quotationNumber: "HME-QT-2026-001",
  status: "AWAITING_RESPONSE",

  companyName: "ABC Mining Corporation",
  companyAdmin: "Aniket Kumar",

  sites: [
    "ABC Main Mining Site",
    "North Valley Mining Site",
  ],

  machinePlan: "26–75 Machines",
  activeMachines: 48,
  contractDuration: "12 Months",
  quotationDate: "2026-08-22",

  commercials: {
    implementationFee: 85_000,
    monthlyLicence: 95_000,
    additionalMachineCharges: 0,
    optionalServices: [
      {
        id: "telematics-ecu",
        name: "Telematics / ECU Integration",
        amount: 25_000,
      },
      {
        id: "custom-reports",
        name: "Custom Reports",
        amount: 15_000,
      },
      {
        id: "additional-training",
        name: "Additional Training",
        amount: 10_000,
      },
    ],
    totalProposalValue: 230_000,
    currency: "ZAR",
  },
};

/* ============================================================
   DEVELOPMENT SERVICE
   ============================================================ */

const previewQuotationActionService: QuotationActionService = {
  getQuotationAction: async (): Promise<QuotationActionData> => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 300);
    });

    return structuredClone(DUMMY_QUOTATION);
  },

  submitDecision: async (
    payload: DecisionPayload,
  ): Promise<DecisionResponse> => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 650);
    });

    const nextStatus: QuotationStatus =
      payload.decision === "accept"
        ? "ACCEPTED"
        : "REJECTED";

    const updatedQuotation: QuotationActionData = {
      ...DUMMY_QUOTATION,
      status: nextStatus,
    };

    return {
      quotation: updatedQuotation,
      message:
        payload.decision === "accept"
          ? "Quotation accepted successfully."
          : "Quotation rejected successfully.",
    };
  },
};

/*
 * Replace the preview service with the project's real quotation service
 * when the backend endpoint is connected.
 *
 * The real service must implement:
 *
 * getQuotationAction(quotationId)
 * submitDecision({ quotationId, decision, note, rejectionReason })
 */
const quotationActionService: QuotationActionService =
  previewQuotationActionService;

/* ============================================================
   CONSTANTS
   ============================================================ */

const ACTIONABLE_STATUSES: readonly QuotationStatus[] = [
  "AWAITING_RESPONSE",
];

const RESPONSE_MAX_LENGTH = 1000;

/* ============================================================
   HELPERS
   ============================================================ */

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Quotation date is invalid.");
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const isActionableStatus = (
  status: QuotationStatus,
): boolean =>
  ACTIONABLE_STATUSES.includes(status);

const getStatusLabel = (
  status: QuotationStatus,
): string => {
  switch (status) {
    case "AWAITING_RESPONSE":
      return "Awaiting Response";
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
  }
};

const getBackendErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  const apiError = error as ApiError;
  const backendMessage = apiError.response?.data?.message;

  if (typeof backendMessage === "string" && backendMessage.trim().length > 0) {
    return backendMessage;
  }

  /*
   * The application API layer is expected to normalize every backend
   * failure into an Error before it reaches this component.
   *
   * No frontend business-error fallback is manufactured here.
   */
  throw error;
};

/* ============================================================
   SMALL UI COMPONENTS
   ============================================================ */

interface StatusBadgeProps {
  status: QuotationStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
}) => {
  const statusClass = (() => {
    switch (status) {
      case "ACCEPTED":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
      case "REJECTED":
        return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
      case "EXPIRED":
      case "CANCELLED":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      case "AWAITING_RESPONSE":
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    }
  })();

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${statusClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getStatusLabel(status)}
    </span>
  );
};

interface SummaryRowProps {
  label: string;
  amount: number;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  amount,
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
      {label}
    </span>
    <span className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
      {formatCurrency(amount)}
    </span>
  </div>
);

interface DecisionCardProps {
  type: Decision;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

const DecisionCard: React.FC<DecisionCardProps> = ({
  type,
  selected,
  disabled,
  onSelect,
}) => {
  const isAccept = type === "accept";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border p-5 text-left transition-all",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:shadow-md",
        isAccept
          ? selected
            ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:bg-emerald-500/10"
            : "border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900"
          : selected
            ? "border-red-500 bg-red-50 ring-2 ring-red-500/20 dark:bg-red-500/10"
            : "border-slate-200 bg-white hover:border-red-300 dark:border-slate-700 dark:bg-slate-900",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 items-center justify-center rounded-xl",
          isAccept
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            : "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
        ].join(" ")}
      >
        {isAccept ? (
          <CheckCircle size={24} />
        ) : (
          <XCircle size={24} />
        )}
      </div>

      <p className="mt-4 font-bold text-slate-900 dark:text-white">
        {isAccept ? "Accept Proposal" : "Reject Proposal"}
      </p>

      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {isAccept
          ? "Accept the approved proposal and proceed to the contract process."
          : "Reject this proposal and provide a reason for the decision."}
      </p>
    </button>
  );
};

interface InfoCardProps {
  title: string;
  value: string;
  details: string[];
  icon: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  details,
  icon,
}) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
    <div className="flex items-center gap-2">
      <span className="text-blue-600 dark:text-blue-400">
        {icon}
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </span>
    </div>

    <p className="mt-3 text-base font-bold text-slate-900 dark:text-white">
      {value}
    </p>

    {details.map((detail) => (
      <p
        key={detail}
        className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400"
      >
        {detail}
      </p>
    ))}
  </div>
);

interface ConfirmationModalProps {
  decision: Decision;
  quotationNumber: string;
  rejectionReason: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  decision,
  quotationNumber,
  rejectionReason,
  isSubmitting,
  onReasonChange,
  onClose,
  onConfirm,
}) => {
  const isReject = decision === "reject";

  const canConfirm = isSubmitting === false;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (
        event.key === "Escape" &&
        isSubmitting === false
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isSubmitting, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-modal-title"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Confirm Decision
            </p>

            <h2
              id="decision-modal-title"
              className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
            >
              {isReject
                ? "Reject Proposal"
                : "Accept Proposal"}
            </h2>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div
            className={
              isReject
                ? "rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
                : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
            }
          >
            <p
              className={
                isReject
                  ? "text-sm leading-6 text-red-700 dark:text-red-300"
                  : "text-sm leading-6 text-emerald-700 dark:text-emerald-300"
              }
            >
              {isReject
                ? `You are about to reject quotation ${quotationNumber}. This decision will be recorded against the quotation.`
                : `You are about to accept quotation ${quotationNumber}. The quotation will proceed to the contract creation process.`}
            </p>
          </div>

          {isReject && (
            <div>
              <label
                htmlFor="rejection-reason"
                className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
              >
                Rejection Reason
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(event) =>
                  onReasonChange(
                    event.target.value.slice(
                      0,
                      RESPONSE_MAX_LENGTH,
                    ),
                  )
                }
                rows={5}
                disabled={isSubmitting}
                placeholder="Please provide the reason for rejecting this proposal..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
              />

              <div className="mt-2 flex justify-between gap-3 text-xs">
                <span className="text-slate-400 dark:text-slate-500">
                  The final validation is performed by the backend.
                </span>

                <span className="text-slate-400">
                  {rejectionReason.length}/
                  {RESPONSE_MAX_LENGTH}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={canConfirm === false}
              onClick={onConfirm}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition",
                canConfirm === false
                  ? "cursor-not-allowed bg-slate-400"
                  : isReject
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700",
              ].join(" ")}
            >
              {isSubmitting && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {isSubmitting
                ? "Processing..."
                : isReject
                  ? "Confirm & Reject"
                  : "Confirm & Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   RESULT SCREEN
   ============================================================ */

interface DecisionResultProps {
  quotation: QuotationActionData;
  message: string;
}

const DecisionResult: React.FC<DecisionResultProps> = ({
  quotation,
  message,
}) => {
  const accepted = quotation.status === "ACCEPTED";

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              accepted
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {accepted ? (
              <CheckCircle size={42} />
            ) : (
              <XCircle size={42} />
            )}
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
            {accepted
              ? "Quotation Accepted"
              : "Quotation Rejected"}
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
            {message}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Quotation Number
            </p>

            <p className="mt-1 font-bold text-slate-900 dark:text-white">
              {quotation.quotationNumber}
            </p>

            <div className="mt-4">
              <StatusBadge status={quotation.status} />
            </div>

            {accepted && (
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                The quotation has reached its final approval
                step. The next workflow stage is contract
                creation and signing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN PAGE
   ============================================================ */

const QuotationActionPage: React.FC = () => {
  const quotationId = DUMMY_QUOTATION.id;

  const [quotation, setQuotation] =
    useState<QuotationActionData | null>(null);

  const [decision, setDecision] =
    useState<Decision | null>(null);

  const [note, setNote] = useState("");
  const [rejectionReason, setRejectionReason] =
    useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const loadQuotation = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!modalOpen) {
      }

      const result =
        await quotationActionService.getQuotationAction(
          quotationId,
        );

      setQuotation(result);
    } catch (error) {
      setQuotation(null);
      try {
        setErrorMessage(getBackendErrorMessage(error));
      } catch (unhandledError) {
        throw unhandledError;
      }
    } finally {
      setIsLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    void loadQuotation();
  }, [loadQuotation]);

  const canTakeDecision =
    quotation !== null &&
    isActionableStatus(quotation.status);

  const handleDecisionSelect = (
    nextDecision: Decision,
  ): void => {
    if (canTakeDecision === false) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    setDecision(nextDecision);
    setErrorMessage("");
    setSuccessMessage("");

    if (nextDecision === "accept") {
      setRejectionReason("");
    }
  };

  const handleConfirmClick = (): void => {
    if (decision === null) {
      setErrorMessage(
        "Please select Accept or Reject before continuing.",
      );
      return;
    }

    if (canTakeDecision === false) {
      setErrorMessage(
        "This quotation is no longer available for a decision.",
      );
      return;
    }

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const handleConfirmDecision = useCallback(
    async (): Promise<void> => {
      if (decision === null) {
        return;
      }

      if (quotation === null) {
        return;
      }

      if (isActionableStatus(quotation.status) === false) {
        return;
      }

      if (isSubmitting) {
        return;
      }

      const trimmedNote = note.trim();
      const trimmedReason = rejectionReason.trim();

      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        if (!true) {
        }

        const payload: DecisionPayload = {
          quotationId,
          decision,
          note: trimmedNote,
          rejectionReason: trimmedReason,
        };

        const response =
          await quotationActionService.submitDecision(
            payload,
          );

        setQuotation(response.quotation);
        setSuccessMessage(response.message);

        setDecision(null);
        setNote("");
        setRejectionReason("");
        setModalOpen(false);
      } catch (error) {
        try {
          setErrorMessage(getBackendErrorMessage(error));
        } catch (unhandledError) {
          throw unhandledError;
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      decision,
      isSubmitting,
      note,
      quotation,
      quotationId,
      rejectionReason,
    ],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <Loader2
          size={32}
          className="animate-spin text-blue-600"
        />
      </div>
    );
  }

  if (quotation === null) {
    return (
      <div className="min-h-[60vh] bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-500/20 dark:bg-slate-900">
          <AlertCircle
            size={32}
            className="mx-auto text-red-600 dark:text-red-400"
          />

          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Unable to load quotation
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadQuotation()}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (
    quotation.status === "ACCEPTED" ||
    quotation.status === "REJECTED"
  ) {
    return (
      <DecisionResult
        quotation={quotation}
        message={
          successMessage.length > 0
            ? successMessage
            : quotation.status === "ACCEPTED"
              ? "Quotation accepted successfully."
              : "Quotation rejected successfully."
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* {ENABLE_UI_PREVIEW_MODE && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <span className="font-semibold">
              UI Preview Mode:
            </span>{" "}
            Dummy quotation data is being used only for
            frontend verification.
          </div>
        )} */}

        {/* Header */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <FileText size={24} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Quotation Decision
                </p>

                <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {quotation.quotationNumber}
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review the proposal before accepting or
                  rejecting it.
                </p>
              </div>
            </div>

            <StatusBadge status={quotation.status} />
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <span>
                Quotation Date:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatDate(
                    quotation.quotationDate,
                  )}
                </strong>
              </span>

              <span>
                Contract Duration:{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {quotation.contractDuration}
                </strong>
              </span>
            </div>
          </div>
        </section>

        {/* Error */}

        {errorMessage.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10"
          >
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
            />

            <p className="text-sm leading-6 text-red-700 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Success */}

        {successMessage.length > 0 && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          >
            <CheckCircle
              size={18}
              className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />

            <p className="text-sm leading-6 text-emerald-700 dark:text-emerald-400">
              {successMessage}
            </p>
          </div>
        )}

        {/* Current status */}

        {canTakeDecision && (
          <section className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
            />

            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-300">
                Quotation is ready for your response
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-400">
                This is the final quotation decision step.
                Review all submitted details before accepting or
                rejecting the proposal.
              </p>
            </div>
          </section>
        )}

        {/* Overview */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Quotation Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Information included in the quotation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              title="Company"
              value={quotation.companyName}
              details={[
                `Admin: ${quotation.companyAdmin}`,
                `Sites: ${quotation.sites.join(", ")}`,
              ]}
              icon={<Building2 size={18} />}
            />

            <InfoCard
              title="Monitoring Plan"
              value={quotation.machinePlan}
              details={[
                `${quotation.activeMachines} Active Machines`,
                `Contract Duration: ${quotation.contractDuration}`,
              ]}
              icon={<FileText size={18} />}
            />
          </div>
        </section>

        {/* Commercial proposal */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Commercial Proposal
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Approved commercial values supplied with the
              proposal.
            </p>
          </div>

          <div className="space-y-3">
            <SummaryRow
              label="Once-Off Implementation Fee"
              amount={
                quotation.commercials
                  .implementationFee
              }
            />

            <SummaryRow
              label="Monthly Site Licence"
              amount={
                quotation.commercials
                  .monthlyLicence
              }
            />

            <SummaryRow
              label="Additional Machine Charges"
              amount={
                quotation.commercials
                  .additionalMachineCharges
              }
            />

            {quotation.commercials.optionalServices.map(
              (serviceItem) => (
                <SummaryRow
                  key={serviceItem.id}
                  label={serviceItem.name}
                  amount={serviceItem.amount}
                />
              ),
            )}

            <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total Proposal Value
                </p>

                <p className="mt-1 text-xs text-blue-600/80 dark:text-blue-400">
                  Final commercial amount supplied with the
                  approved proposal.
                </p>
              </div>

              <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                {formatCurrency(
                  quotation.commercials
                    .totalProposalValue,
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Decision */}

        {canTakeDecision && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Final Decision
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Select Accept or Reject. An accepted quotation
                proceeds to the contract process. A rejected
                quotation becomes final and requires a reason.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DecisionCard
                type="accept"
                selected={decision === "accept"}
                disabled={isSubmitting}
                onSelect={() =>
                  handleDecisionSelect("accept")
                }
              />

              <DecisionCard
                type="reject"
                selected={decision === "reject"}
                disabled={isSubmitting}
                onSelect={() =>
                  handleDecisionSelect("reject")
                }
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="quotation-response"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"
              >
                <MessageSquare size={17} />
                {decision === "reject"
                  ? "Rejection Reason"
                  : "Response / Note"}

                {decision === "reject" && (
                  <span className="text-red-500">
                    *
                  </span>
                )}
              </label>

              <textarea
                id="quotation-response"
                value={
                  decision === "reject"
                    ? rejectionReason
                    : note
                }
                onChange={(event) => {
                  const value =
                    event.target.value.slice(
                      0,
                      RESPONSE_MAX_LENGTH,
                    );

                  if (decision === "reject") {
                    setRejectionReason(value);
                  } else {
                    setNote(value);
                  }
                }}
                rows={5}
                disabled={isSubmitting}
                placeholder={
                  decision === "reject"
                    ? "Please provide a clear reason for rejecting this proposal..."
                    : "Add an optional response or note for the HME team..."
                }
                className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
              />

              <div className="mt-2 flex justify-end">
                <span className="text-xs text-slate-400">
                  {(decision === "reject"
                    ? rejectionReason.length
                    : note.length)}/
                  {RESPONSE_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={
                  decision === null ||
                  isSubmitting
                }
                onClick={handleConfirmClick}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition",
                  decision === null ||
                  isSubmitting
                    ? "cursor-not-allowed bg-slate-400"
                    : decision === "accept"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700",
                ].join(" ")}
              >
                {isSubmitting && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {decision === null
                  ? "Select Decision"
                  : decision === "accept"
                    ? "Confirm & Accept Proposal"
                    : "Confirm & Reject Proposal"}
              </button>
            </div>
          </section>
        )}

        {(quotation.status === "EXPIRED" ||
          quotation.status === "CANCELLED") && (
          <section className="rounded-3xl border border-slate-200 bg-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-slate-500"
              />

              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {quotation.status === "EXPIRED"
                    ? "Quotation Expired"
                    : "Quotation Cancelled"}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  No further decision can be submitted for this
                  quotation.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {modalOpen &&
        decision !== null && (
          <ConfirmationModal
            decision={decision}
            quotationNumber={
              quotation.quotationNumber
            }
            rejectionReason={rejectionReason}
            isSubmitting={isSubmitting}
            onReasonChange={
              setRejectionReason
            }
            onClose={() => {
              if (isSubmitting === false) {
                setModalOpen(false);
              }
            }}
            onConfirm={() =>
              void handleConfirmDecision()
            }
          />
        )}
    </div>
  );
};

export default QuotationActionPage;