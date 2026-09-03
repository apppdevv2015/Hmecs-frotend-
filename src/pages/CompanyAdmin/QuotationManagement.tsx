import React, { useState } from "react";
import {
  CheckCircle,
  ClipboardCheck,
  FileText,
  Plus,
  type LucideIcon,
} from "lucide-react";

import QuotationStatus from "./QuotationStatus";
import QuotationDetails from "./QuotationDetailsPage";
import QuotationAction from "./QuotationActionPage";

import AdminQuotationForm from "../../components/common/AdminQuotationForm";

/* ============================================================
   TYPES
============================================================ */

type QuotationTabId = "status" | "details" | "decision";

interface QuotationTab {
  id: QuotationTabId;
  label: string;
  icon: LucideIcon;
}

/* ============================================================
   TAB CONFIGURATION
============================================================ */

const quotationTabs: QuotationTab[] = [
  {
    id: "details",
    label: "Quotation Details",
    icon: FileText,
  },
  {
    id: "status",
    label: "Quotation Status",
    icon: ClipboardCheck,
  },
  {
    id: "decision",
    label: "Accept / Reject",
    icon: CheckCircle,
  },
];

/* ============================================================
   COMPONENT
============================================================ */

const QuotationManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<QuotationTabId>("details");
  const [isNewQuotationOpen, setIsNewQuotationOpen] = useState<boolean>(false);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const handleQuotationCreated = (): void => {
    setIsNewQuotationOpen(false);
    setRefreshToken((previous) => previous + 1);
    setActiveTab("details");
  };

  /* ==========================================================
     ACTIVE SECTION
  ========================================================== */

  const renderActiveSection = () => {
    switch (activeTab) {
      case "status":
        return <QuotationStatus key={`status-${refreshToken}`} />;

      case "details":
        return <QuotationDetails key={`details-${refreshToken}`} />;

      case "decision":
        return <QuotationAction key={`decision-${refreshToken}`} />;

      default:
        return <QuotationStatus key={`status-${refreshToken}`} />;
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {/* ==================================================
            HEADER — TITLE + NEW QUOTATION BUTTON
        ================================================== */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Quotation Management
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Submit new quotation requests and track their status
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewQuotationOpen(true)}
            className="inline-flex h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Plus size={18} strokeWidth={2.4} />
            New Quotation
          </button>
        </div>

        {/* ==================================================
            QUOTATION TABS
        ================================================== */}

        <section aria-label="Quotation navigation" className="mb-6">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Responsive horizontal scrolling */}
            <div
              className="
                w-full
                overflow-x-auto
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              <div
                role="tablist"
                aria-label="Quotation sections"
                className="
                  flex
                  min-w-[760px]
                  w-full
                "
              >
                {quotationTabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <React.Fragment key={tab.id}>
                      {/* ==================================================
                          TAB BUTTON
                      ================================================== */}

                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`quotation-panel-${tab.id}`}
                        id={`quotation-tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          group
                          relative
                          flex
                          min-h-[84px]
                          flex-1
                          items-center
                          justify-center
                          gap-3
                          px-4
                          py-4
                          text-left
                          outline-none
                          transition-colors
                          duration-200
                          focus-visible:z-10
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-blue-500
                          ${isActive ? "bg-white" : "bg-white hover:bg-slate-50"}
                        `}
                      >
                        {/* Icon */}
                        <span
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ring-1
                            transition-colors
                            duration-200
                            ${
                              isActive
                                ? "bg-blue-50 text-blue-600 ring-blue-100"
                                : "bg-slate-50 text-slate-400 ring-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600"
                            }
                          `}
                        >
                          <Icon size={19} strokeWidth={2} aria-hidden="true" />
                        </span>

                        {/* Label */}
                        <span
                          className={`
                            whitespace-nowrap
                            text-sm
                            font-semibold
                            tracking-tight
                            transition-colors
                            duration-200
                            ${
                              isActive
                                ? "text-blue-600"
                                : "text-slate-600 group-hover:text-slate-900"
                            }
                          `}
                        >
                          {tab.label}
                        </span>

                        {/* Active indicator */}
                        <span
                          aria-hidden="true"
                          className={`
                            absolute
                            inset-x-6
                            bottom-0
                            h-[3px]
                            rounded-t-full
                            transition-colors
                            duration-200
                            ${isActive ? "bg-blue-600" : "bg-transparent"}
                          `}
                        />
                      </button>

                      {/* ==================================================
                          TAB DIVIDER
                      ================================================== */}
                      {index < quotationTabs.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="my-5 w-px shrink-0 bg-slate-100"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            ACTIVE CONTENT
        ================================================== */}

        <main
          id={`quotation-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`quotation-tab-${activeTab}`}
          className="w-full min-w-0"
        >
          {renderActiveSection()}
          
        </main>
      </div>

      {/* ==================================================
          NEW QUOTATION MODAL
          Uses AdminQuotationForm — the quotation-only form,
          API-connected via createQuotationRequest. No signup
          or company-details step here.
      ================================================== */}

      {isNewQuotationOpen ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl">
            <AdminQuotationForm
              onSuccess={handleQuotationCreated}
              onClose={() => setIsNewQuotationOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default QuotationManagement;