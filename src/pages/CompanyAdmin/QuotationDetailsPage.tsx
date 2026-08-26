import React, { useState } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageCircle,
  Package,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

type QuotationStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "COMPLETED"
  | "REJECTED";

interface QuotationCompany {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface QuotationSummary {
  id: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  quotationType: string;
  contractDuration: string;
  status: QuotationStatus;
  company: QuotationCompany;
}

interface QuotationSite {
  id: string;
  name: string;
}

interface EquipmentRequirement {
  id: string;
  type: string;
  description: string;
}

interface ServiceRequirement {
  id: string;
  name: string;
  description: string;
}

interface QuotationChatMessage {
  id: string;
  senderType: "SUPER_ADMIN" | "COMPANY_ADMIN";
  senderName: string;
  message: string;
  timestamp: string;
}

interface QuotationDetailsResponse {
  summary: QuotationSummary;
  sites: QuotationSite[];
  equipment: EquipmentRequirement[];
  services: ServiceRequirement[];
  chatMessages: QuotationChatMessage[];
}

interface QuotationDetailsPageProps {
  quotation?: QuotationDetailsResponse;
  isLoading?: boolean;
  error?: string;
}

/* ============================================================================
   TEMPORARY DEVELOPMENT DATA
   ---------------------------------------------------------------------------
   This is the current UI data source until the quotation API is integrated.
   When the API is connected, replace this data source with the API response.
============================================================================ */

const DUMMY_QUOTATION: QuotationDetailsResponse = {
  summary: {
    id: "quotation-001",
    quotationNumber: "QR-2025-000124",
    quotationDate: "22 Aug 2026",
    validUntil: "21 Sep 2026",
    quotationType: "Equipment & Service",
    contractDuration: "12 Months",
    status: "IN_REVIEW",

    company: {
      id: "company-001",
      name: "Orion Mining Pvt. Ltd.",
      email: "admin@orionmining.com",
      phone: "+91 98765 43210",
      address: "Industrial Area, Ranchi, Jharkhand",
    },
  },

  sites: [
    {
      id: "site-001",
      name: "Iron Valley Mine",
    },
    {
      id: "site-002",
      name: "Orion Mining Site",
    },
  ],

  equipment: [
    {
      id: "equipment-001",
      type: "Excavator",
      description: "Heavy-duty mining excavator",
    },
    {
      id: "equipment-002",
      type: "Loader",
      description: "Mining wheel loader",
    },
  ],

  services: [
    {
      id: "service-001",
      name: "Preventive Maintenance",
      description: "Monthly preventive maintenance service",
    },
  ],

  chatMessages: [
    {
      id: "message-001",
      senderType: "SUPER_ADMIN",
      senderName: "Super Admin",
      message:
        "Your quotation request has been received and is currently under review.",
      timestamp: "22 Aug 2026, 11:15 AM",
    },
    {
      id: "message-002",
      senderType: "COMPANY_ADMIN",
      senderName: "Company Admin",
      message:
        "Thank you. Please let us know if any additional information is required.",
      timestamp: "22 Aug 2026, 11:28 AM",
    },
  ],
};

/* ============================================================================
   APPROVAL WORKFLOW
============================================================================ */

interface ApprovalStep {
  id: Exclude<QuotationStatus, "REJECTED">;
  label: string;
  description: string;
  date: string;
}

const APPROVAL_STEPS: ApprovalStep[] = [
  {
    id: "RECEIVED",
    label: "Received",
    description: "Quotation request has been received.",
    date: "22 Aug 2026",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    description: "Quotation request is being processed.",
    date: "22 Aug 2026",
  },
  {
    id: "IN_REVIEW",
    label: "In Review",
    description: "Quotation is currently being reviewed by the admin.",
    date: "22 Aug 2026",
  },
  {
    id: "ACCEPTED",
    label: "Accept",
    description: "Quotation has been accepted by the admin.",
    date: "Pending",
  },
  {
    id: "COMPLETED",
    label: "Complete",
    description: "Quotation process has been completed.",
    date: "Pending",
  },
];

/* ============================================================================
   STATUS HELPERS
============================================================================ */

type ApprovalStepState =
  | "completed"
  | "current"
  | "pending"
  | "rejected";

const getStatusIndex = (status: QuotationStatus): number => {
  if (status === "REJECTED") {
    return -1;
  }

  return APPROVAL_STEPS.findIndex((step) => step.id === status);
};

const getStepState = (
  step: ApprovalStep,
  currentStatus: QuotationStatus,
): ApprovalStepState => {
  if (currentStatus === "REJECTED") {
    if (step.id === "IN_REVIEW") {
      return "rejected";
    }

    return "pending";
  }

  const currentIndex = getStatusIndex(currentStatus);
  const stepIndex = getStatusIndex(step.id);

  if (stepIndex < currentIndex) {
    return "completed";
  }

  if (stepIndex === currentIndex) {
    return "current";
  }

  return "pending";
};

const getCurrentStatusLabel = (status: QuotationStatus): string => {
  switch (status) {
    case "RECEIVED":
      return "Received";

    case "IN_PROGRESS":
      return "In Progress";

    case "IN_REVIEW":
      return "In Review";

    case "ACCEPTED":
      return "Accepted";

    case "COMPLETED":
      return "Completed";

    case "REJECTED":
      return "Rejected";

    default:
      return status;
  }
};

/* ============================================================================
   REUSABLE SECTION CARD
============================================================================ */

interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  children,
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={18} strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            {title}
          </h2>

          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
};

/* ============================================================================
   DETAIL ITEM
============================================================================ */

interface DetailItemProps {
  label: string;
  value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800">
        {value}
      </p>
    </div>
  );
};

/* ============================================================================
   EMPTY STATE
============================================================================ */

interface EmptyStateProps {
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

/* ============================================================================
   LOADING STATE
============================================================================ */

const DetailsSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {[1, 2, 3, 4].map((section) => (
        <div
          key={section}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-200" />

            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-slate-200" />
              <div className="h-3 w-52 rounded bg-slate-100" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-4 w-32 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================================================
   ERROR STATE
============================================================================ */

interface ErrorStateProps {
  message: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message }) => {
  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <XCircle size={24} strokeWidth={2} />
        </div>

        <h2 className="mt-4 text-base font-semibold text-slate-900">
          Unable to load quotation details
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {message}
        </p>
      </div>
    </section>
  );
};

/* ============================================================================
   APPROVAL STATUS
============================================================================ */

interface ApprovalStatusProps {
  status: QuotationStatus;
}

const ApprovalStatus: React.FC<ApprovalStatusProps> = ({ status }) => {
  const currentIndex = getStatusIndex(status);

  return (
    <SectionCard
      icon={CheckCircle2}
      title="Quotation Approval Status"
      subtitle="Current progress of your quotation request"
    >
      <div className="relative">
        {/* Desktop progress line */}
        <div className="pointer-events-none absolute left-[10%] right-[10%] top-5 hidden h-px bg-slate-200 lg:block" />

        {currentIndex > 0 && (
          <div
            className="pointer-events-none absolute left-[10%] top-5 hidden h-px bg-blue-600 transition-all duration-300 lg:block"
            style={{
              width: `${currentIndex * 20}%`,
            }}
          />
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {APPROVAL_STEPS.map((step) => {
            const state = getStepState(step, status);

            const isCompleted = state === "completed";
            const isCurrent = state === "current";
            const isRejected = state === "rejected";

            return (
              <div
                key={step.id}
                className="relative flex items-start gap-3 lg:flex-col lg:items-center lg:text-center"
              >
                {/* Mobile connector */}
                <div className="absolute left-5 top-10 h-[calc(100%+24px)] w-px bg-slate-200 sm:hidden last:hidden" />

                <div
                  className={`
                    relative z-10 flex h-10 w-10 shrink-0 items-center
                    justify-center rounded-full border-2 bg-white
                    transition-all duration-200
                    ${
                      isCompleted
                        ? "border-blue-600 bg-blue-600 text-white"
                        : ""
                    }
                    ${
                      isCurrent
                        ? "border-blue-600 bg-blue-50 text-blue-600 ring-4 ring-blue-50"
                        : ""
                    }
                    ${
                      isRejected
                        ? "border-red-500 bg-red-50 text-red-600"
                        : ""
                    }
                    ${
                      !isCompleted && !isCurrent && !isRejected
                        ? "border-slate-200 text-slate-400"
                        : ""
                    }
                  `}
                >
                  {isRejected ? (
                    <XCircle size={18} strokeWidth={2.2} />
                  ) : isCompleted ? (
                    <CheckCircle2 size={18} strokeWidth={2.2} />
                  ) : isCurrent ? (
                    <Clock3 size={18} strokeWidth={2.2} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="min-w-0 pt-0.5 lg:pt-3">
                  <p
                    className={`
                      text-sm font-semibold
                      ${
                        isCompleted || isCurrent
                          ? "text-slate-900"
                          : isRejected
                            ? "text-red-600"
                            : "text-slate-400"
                      }
                    `}
                  >
                    {step.label}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {isRejected
                      ? "Quotation was rejected."
                      : step.description}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-center">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                        <Check size={12} />
                        Completed
                      </span>
                    )}

                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
                        <Clock3 size={12} />
                        In Progress
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                        <XCircle size={12} />
                        Rejected
                      </span>
                    )}

                    <span className="text-[11px] font-medium text-slate-400">
                      {step.date}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
};

/* ============================================================================
   CHAT MESSAGE
============================================================================ */

interface ChatMessageProps {
  message: QuotationChatMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isCompanyAdmin = message.senderType === "COMPANY_ADMIN";

  return (
    <div
      className={`flex ${
        isCompanyAdmin ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`
          flex max-w-[90%] gap-3 sm:max-w-[75%]
          ${isCompanyAdmin ? "flex-row-reverse" : "flex-row"}
        `}
      >
        <div
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-full
            ${
              isCompanyAdmin
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-100 text-slate-600"
            }
          `}
        >
          <UserRound size={16} strokeWidth={2} />
        </div>

        <div
          className={`
            min-w-0 rounded-2xl px-4 py-3
            ${
              isCompanyAdmin
                ? "rounded-tr-md bg-blue-600 text-white"
                : "rounded-tl-md border border-slate-200 bg-slate-50 text-slate-800"
            }
          `}
        >
          <div
            className={`mb-1 flex items-center gap-2 ${
              isCompanyAdmin ? "justify-end" : "justify-start"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                isCompanyAdmin ? "text-blue-50" : "text-slate-700"
              }`}
            >
              {message.senderName}
            </p>

            <span
              className={`text-[10px] ${
                isCompanyAdmin ? "text-blue-100" : "text-slate-400"
              }`}
            >
              {message.timestamp}
            </span>
          </div>

          <p
            className={`text-sm leading-6 ${
              isCompanyAdmin ? "text-white" : "text-slate-600"
            }`}
          >
            {message.message}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   QUOTATION CHAT
   ---------------------------------------------------------------------------
   Current implementation uses local dummy messages.
   Future API integration can replace the local state update with the
   quotation messaging API / WebSocket implementation.
============================================================================ */

interface QuotationChatProps {
  quotationId: string;
  initialMessages: QuotationChatMessage[];
}

const QuotationChat: React.FC<QuotationChatProps> = ({
  quotationId,
  initialMessages,
}) => {
  const [messages, setMessages] =
    useState<QuotationChatMessage[]>(initialMessages);

  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage) {
      return;
    }

    const newMessage: QuotationChatMessage = {
      id: `${quotationId}-message-${Date.now()}`,
      senderType: "COMPANY_ADMIN",
      senderName: "Company Admin",
      message: trimmedMessage,
      timestamp: "Just now",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      newMessage,
    ]);

    setMessageText("");
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <SectionCard
      icon={MessageCircle}
      title="Conversation with Super Admin"
      subtitle="Discuss this quotation request with the Super Admin"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <UserRound size={17} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Super Admin
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                <span className="text-[11px] font-medium text-slate-500">
                  Quotation Support
                </span>
              </div>
            </div>
          </div>

          <span className="hidden text-[11px] font-medium text-slate-400 sm:block">
            {quotationId}
          </span>
        </div>

        {/* Messages */}
        <div className="max-h-[420px] min-h-[220px] space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          {messages.length === 0 ? (
            <EmptyState message="No messages available for this quotation." />
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
              />
            ))
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50">
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Type a message..."
              aria-label="Message"
              className="
                min-h-[48px] flex-1 resize-none bg-transparent px-2 py-1
                text-sm text-slate-800 outline-none
                placeholder:text-slate-400
              "
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-xl bg-blue-600 text-white
                transition-colors
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:bg-slate-200
                disabled:text-slate-400
              "
              aria-label="Send message"
            >
              <Send size={17} strokeWidth={2} />
            </button>
          </div>

          <p className="mt-2 px-1 text-[10px] text-slate-400">
            Press Enter to send. Use Shift + Enter for a new line.
          </p>
        </div>
      </div>
    </SectionCard>
  );
};

/* ============================================================================
   MAIN COMPONENT
============================================================================ */

const QuotationDetailsPage: React.FC<
  QuotationDetailsPageProps
> = ({
  quotation,
  isLoading,
  error,
}) => {
  /*
   * Current development source:
   * Dummy quotation data is intentionally used until the quotation API
   * is connected.
   *
   * When API integration is ready, the parent component should provide
   * the quotation object through the `quotation` prop.
   */

  const quotationData = quotation ? quotation : DUMMY_QUOTATION;

  if (isLoading === true) {
    return <DetailsSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const summary = quotationData.summary;
  const sites = quotationData.sites;
  const equipment = quotationData.equipment;
  const services = quotationData.services;
  const chatMessages = quotationData.chatMessages;

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {/* ====================================================================
          QUOTATION INFORMATION
      ==================================================================== */}

      <SectionCard
        icon={FileText}
        title="Quotation Information"
        subtitle="Basic information submitted with your quotation request"
      >
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Quotation Number
            </p>

            <p className="mt-1 break-all text-lg font-bold tracking-tight text-slate-900">
              {summary.quotationNumber}
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Clock3 size={14} strokeWidth={2} />

            {getCurrentStatusLabel(summary.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem
            label="Quotation Date"
            value={summary.quotationDate}
          />

          <DetailItem
            label="Valid Until"
            value={summary.validUntil}
          />

          <DetailItem
            label="Quotation Type"
            value={summary.quotationType}
          />

          <DetailItem
            label="Contract Duration"
            value={summary.contractDuration}
          />
        </div>
      </SectionCard>

      {/* ====================================================================
          COMPANY INFORMATION
      ==================================================================== */}

      <SectionCard
        icon={Building2}
        title="Company Information"
        subtitle="Company information associated with this quotation"
      >
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem
            label="Company Name"
            value={summary.company.name}
          />

          <DetailItem
            label="Email"
            value={summary.company.email}
          />

          <DetailItem
            label="Phone"
            value={summary.company.phone}
          />

          <DetailItem
            label="Address"
            value={summary.company.address}
          />
        </div>
      </SectionCard>

      {/* ====================================================================
          SITE INFORMATION
      ==================================================================== */}

      <SectionCard
        icon={MapPin}
        title="Site Information"
        subtitle="Sites included in this quotation request"
      >
        {sites.length === 0 ? (
          <EmptyState message="No site information is available." />
        ) : (
          <div className="divide-y divide-slate-100">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                  <MapPin size={16} strokeWidth={2} />
                </div>

                <p className="text-sm font-medium text-slate-800">
                  {site.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====================================================================
          EQUIPMENT REQUIREMENTS
      ==================================================================== */}

      <SectionCard
        icon={Package}
        title="Equipment Requirements"
        subtitle="Equipment requested in the quotation"
      >
        {equipment.length === 0 ? (
          <EmptyState message="No equipment requirements are available." />
        ) : (
          <div className="divide-y divide-slate-100">
            {equipment.map((item) => (
              <div
                key={item.id}
                className="
                  grid grid-cols-1 gap-2 py-4
                  first:pt-0 last:pb-0
                  sm:grid-cols-[180px_minmax(0,1fr)]
                  sm:gap-6
                "
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Equipment Type
                </p>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.type}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====================================================================
          SERVICE REQUIREMENTS
      ==================================================================== */}

      <SectionCard
        icon={FileText}
        title="Service Requirements"
        subtitle="Services requested in the quotation"
      >
        {services.length === 0 ? (
          <EmptyState message="No service requirements are available." />
        ) : (
          <div className="divide-y divide-slate-100">
            {services.map((service) => (
              <div
                key={service.id}
                className="
                  grid grid-cols-1 gap-2 py-4
                  first:pt-0 last:pb-0
                  sm:grid-cols-[180px_minmax(0,1fr)]
                  sm:gap-6
                "
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Service
                </p>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {service.name}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ====================================================================
          APPROVAL STATUS
      ==================================================================== */}

      <ApprovalStatus status={summary.status} />

      {/* ====================================================================
          CURRENT STATUS INFORMATION
      ==================================================================== */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
            <CalendarDays size={16} strokeWidth={2} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              Quotation submitted successfully
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Your quotation request is being processed according to the
              current approval workflow.
            </p>
          </div>
        </div>
      </div>

      {/* ====================================================================
          SUPER ADMIN CHAT
      ==================================================================== */}

      <QuotationChat
        quotationId={summary.quotationNumber}
        initialMessages={chatMessages}
      />
    </div>
  );
};

export default QuotationDetailsPage;