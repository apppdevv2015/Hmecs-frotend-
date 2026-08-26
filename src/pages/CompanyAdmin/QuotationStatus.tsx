import React from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  XCircle,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type QuotationStatusType =
  | "received"
  | "in_progress"
  | "in_review"
  | "accepted"
  | "completed"
  | "rejected";

type StepState = "completed" | "current" | "pending" | "rejected";

interface QuotationData {
  quotationNumber: string;
  quotationType: string;
  numberOfSites: number;
  activeMachines: number;
  contractDuration: string;
  sites: string[];
  equipmentTypes: string[];
  currentStatus: QuotationStatusType;
  statusMessage: string;
}

interface ApprovalStep {
  id: string;
  title: string;
  description: string;
  date?: string;
  state: StepState;
}

/* ============================================================
   DUMMY QUOTATION DATA

   NOTE:
   This is intentionally kept as local static data for now.

   When API integration is added later, only this data source
   needs to be replaced/mapped with the API response.
============================================================ */

const quotationData: QuotationData = {
  quotationNumber: "QR-2025-000124",

  quotationType: "Equipment & Service",

  numberOfSites: 2,

  activeMachines: 12,

  contractDuration: "12 Months",

  sites: [
    "Iron Valley Mine",
    "Orion Mining Site",
  ],

  equipmentTypes: [
    "Excavator",
    "Loader",
  ],

  currentStatus: "in_review",

  statusMessage:
    "Your quotation request has been submitted successfully and is currently being reviewed by the admin.",
};

/* ============================================================
   APPROVAL FLOW

   Fixed business flow:

   1. Received
   2. In Progress
   3. In Review
   4. Accepted
   5. Completed

   Keep this structure stable for future API integration.
============================================================ */

const approvalSteps: ApprovalStep[] = [
  {
    id: "received",
    title: "Received",
    description:
      "Your quotation request has been received successfully.",
    date: "22 Aug 2026",
    state: "completed",
  },

  {
    id: "in-progress",
    title: "In Progress",
    description:
      "The quotation is being processed by the admin.",
    date: "22 Aug 2026",
    state: "completed",
  },

  {
    id: "in-review",
    title: "In Review",
    description:
      "The quotation is currently under review by the admin.",
    date: "23 Aug 2026",
    state: "current",
  },

  {
    id: "accepted",
    title: "Accepted",
    description:
      "The quotation will move to this stage once it is approved.",
    state: "pending",
  },

  {
    id: "completed",
    title: "Completed",
    description:
      "The quotation process will be completed after all required steps are finished.",
    state: "pending",
  },
];

/* ============================================================
   STATUS CONFIGURATION
============================================================ */

const statusConfig: Record<
  QuotationStatusType,
  {
    label: string;
    description: string;
    className: string;
    dotClassName: string;
  }
> = {
  received: {
    label: "Received",
    description:
      "Your quotation request has been received.",
    className:
      "bg-blue-50 text-blue-700 ring-blue-100",
    dotClassName:
      "bg-blue-500",
  },

  in_progress: {
    label: "In Progress",
    description:
      "Your quotation is currently being processed.",
    className:
      "bg-amber-50 text-amber-700 ring-amber-100",
    dotClassName:
      "bg-amber-500",
  },

  in_review: {
    label: "In Review",
    description:
      "Your quotation is currently under review by the admin.",
    className:
      "bg-amber-50 text-amber-700 ring-amber-100",
    dotClassName:
      "bg-amber-500",
  },

  accepted: {
    label: "Accepted",
    description:
      "Your quotation has been accepted by the admin.",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dotClassName:
      "bg-emerald-500",
  },

  completed: {
    label: "Completed",
    description:
      "Your quotation process has been completed successfully.",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-100",
    dotClassName:
      "bg-emerald-500",
  },

  rejected: {
    label: "Rejected",
    description:
      "Your quotation has been rejected by the admin.",
    className:
      "bg-red-50 text-red-700 ring-red-100",
    dotClassName:
      "bg-red-500",
  },
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const QuotationStatus: React.FC = () => {
  const currentStatus =
    statusConfig[quotationData.currentStatus];

  return (
    <div className="w-full min-w-0">
      <div className="space-y-5 sm:space-y-6">

        {/* ==================================================
            QUOTATION STATUS SUMMARY
        ================================================== */}

        <section
          aria-labelledby="quotation-status-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-5 sm:p-6 lg:p-7">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              {/* Quotation Information */}

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText
                      size={17}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>

                  <p className="text-sm font-semibold text-slate-500">
                    Quotation Request
                  </p>

                </div>

                <h1
                  id="quotation-status-heading"
                  className="mt-3 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                >
                  {quotationData.quotationNumber}
                </h1>

              </div>

              {/* Current Status */}

              <div className="shrink-0">

                <p className="mb-1.5 text-xs font-medium text-slate-400">
                  Current Status
                </p>

                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ${currentStatus.className}`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${currentStatus.dotClassName}`}
                    aria-hidden="true"
                  />

                  <span>
                    {currentStatus.label}
                  </span>
                </div>

              </div>

            </div>

            {/* Status Message */}

            <div className="mt-5 border-t border-slate-100 pt-5">

              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                {quotationData.statusMessage}
              </p>

            </div>

          </div>
        </section>

        {/* ==================================================
            QUOTATION INFORMATION
        ================================================== */}

        <section
          aria-labelledby="quotation-information-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">

            <h2
              id="quotation-information-heading"
              className="text-base font-bold text-slate-900"
            >
              Quotation Information
            </h2>

          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">

            {/* Basic Information */}

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">

              <InfoField
                label="Quotation Type"
                value={quotationData.quotationType}
              />

              <InfoField
                label="Number of Sites"
                value={quotationData.numberOfSites}
              />

              <InfoField
                label="Active Machines"
                value={quotationData.activeMachines}
              />

              <InfoField
                label="Contract Duration"
                value={quotationData.contractDuration}
              />

            </div>

            {/* Sites */}

            <div className="mt-7 border-t border-slate-100 pt-6">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-6">

                <div className="flex items-center gap-2">

                  <MapPin
                    size={16}
                    className="shrink-0 text-slate-400"
                    aria-hidden="true"
                  />

                  <span className="text-sm font-medium text-slate-500">
                    Sites
                  </span>

                </div>

                <div className="min-w-0">

                  {quotationData.sites.length > 0 ? (
                    <div className="space-y-1.5">

                      {quotationData.sites.map((site) => (
                        <p
                          key={site}
                          className="break-words text-sm font-semibold text-slate-800"
                        >
                          {site}
                        </p>
                      ))}

                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No sites available
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* Equipment Types */}

            <div className="mt-6 border-t border-slate-100 pt-6">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-6">

                <div className="flex items-center gap-2">

                  <FileText
                    size={16}
                    className="shrink-0 text-slate-400"
                    aria-hidden="true"
                  />

                  <span className="text-sm font-medium text-slate-500">
                    Equipment Types
                  </span>

                </div>

                <p className="break-words text-sm font-semibold text-slate-800">
                  {quotationData.equipmentTypes.length > 0
                    ? quotationData.equipmentTypes.join(", ")
                    : "No equipment types available"}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================
            APPROVAL STATUS
        ================================================== */}

        <section
          aria-labelledby="approval-status-heading"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          {/* Section Header */}

          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">

            <div>

              <h2
                id="approval-status-heading"
                className="text-base font-bold text-slate-900"
              >
                Approval Status
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Track the progress of your quotation request.
              </p>

            </div>

            <Clock3
              size={17}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />

          </div>

          {/* Timeline */}

          <div className="px-5 py-6 sm:px-6 sm:py-7 lg:px-8">

            <div className="relative">

              {approvalSteps.map((step, index) => (
                <ApprovalTimelineItem
                  key={step.id}
                  step={step}
                  isLast={
                    index === approvalSteps.length - 1
                  }
                />
              ))}

            </div>

          </div>

        </section>

      </div>
    </div>
  );
};

/* ============================================================
   INFO FIELD
============================================================ */

interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
}

const InfoField: React.FC<InfoFieldProps> = ({
  label,
  value,
}) => {
  return (
    <div className="min-w-0">

      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-800">
        {value}
      </p>

    </div>
  );
};

/* ============================================================
   APPROVAL TIMELINE ITEM
============================================================ */

interface ApprovalTimelineItemProps {
  step: ApprovalStep;
  isLast: boolean;
}

const ApprovalTimelineItem: React.FC<
  ApprovalTimelineItemProps
> = ({ step, isLast }) => {

  const config = getStepConfig(step.state);

  const Icon = config.icon;

  return (
    <div className="relative flex gap-4 sm:gap-5">

      {/* ======================================================
          CONNECTING LINE
      ====================================================== */}

      {!isLast && (
        <div
          aria-hidden="true"
          className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-px ${config.lineClass}`}
        />
      )}

      {/* ======================================================
          STATUS ICON
      ====================================================== */}

      <div
        className={`
          relative z-10
          flex h-8 w-8 shrink-0 items-center justify-center
          rounded-full
          ring-1
          ${config.iconWrapperClass}
        `}
      >
        <Icon
          size={16}
          strokeWidth={2.3}
          aria-hidden="true"
        />
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div
        className={`
          min-w-0 flex-1
          ${isLast ? "" : "pb-7 sm:pb-8"}
        `}
      >

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-5">

          <div className="min-w-0">

            <h3
              className={`break-words text-sm font-semibold ${config.titleClass}`}
            >
              {step.title}
            </h3>

            {step.date && (
              <div className="mt-1.5 flex items-center gap-1.5">

                <CalendarDays
                  size={13}
                  className="shrink-0 text-slate-400"
                  aria-hidden="true"
                />

                <span className="text-xs text-slate-400">
                  {step.date}
                </span>

              </div>
            )}

          </div>

          {/* Status */}

          <span
            className={`
              inline-flex
              w-fit shrink-0
              items-center
              rounded-full
              px-2.5 py-1
              text-[11px]
              font-semibold
              ring-1
              ${config.badgeClass}
            `}
          >
            {config.badgeText}
          </span>

        </div>

        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
          {step.description}
        </p>

      </div>

    </div>
  );
};

/* ============================================================
   STEP CONFIGURATION
============================================================ */

const getStepConfig = (
  state: StepState,
) => {

  switch (state) {

    case "completed":
      return {
        icon: CheckCircle2,
        iconWrapperClass:
          "bg-emerald-50 text-emerald-600 ring-emerald-100",
        titleClass:
          "text-slate-800",
        badgeClass:
          "bg-emerald-50 text-emerald-700 ring-emerald-100",
        badgeText:
          "Completed",
        lineClass:
          "bg-emerald-200",
      };

    case "current":
      return {
        icon: Clock3,
        iconWrapperClass:
          "bg-blue-50 text-blue-600 ring-blue-100",
        titleClass:
          "text-slate-900",
        badgeClass:
          "bg-blue-50 text-blue-700 ring-blue-100",
        badgeText:
          "In Progress",
        lineClass:
          "bg-slate-200",
      };

    case "rejected":
      return {
        icon: XCircle,
        iconWrapperClass:
          "bg-red-50 text-red-600 ring-red-100",
        titleClass:
          "text-red-700",
        badgeClass:
          "bg-red-50 text-red-700 ring-red-100",
        badgeText:
          "Rejected",
        lineClass:
          "bg-red-200",
      };

    case "pending":
    default:
      return {
        icon: Check,
        iconWrapperClass:
          "bg-slate-50 text-slate-400 ring-slate-200",
        titleClass:
          "text-slate-500",
        badgeClass:
          "bg-slate-50 text-slate-500 ring-slate-200",
        badgeText:
          "Pending",
        lineClass:
          "bg-slate-200",
      };
  }
};

export default QuotationStatus;