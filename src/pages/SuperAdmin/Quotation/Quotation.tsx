import { type FC, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Send,
  MessageSquareCheck,
} from "lucide-react";

import QuotationInquiry from "./QuotationInquiry";
import QuotationResponses from "./QuotationResponses";

/* ============================================================
   TYPES
============================================================ */

type QuotationTabId =
  | "inquiry"
  | "send-quotation"
  | "responses";

interface QuotationTabConfig {
  readonly id: QuotationTabId;
  readonly label: string;
  readonly description: string;
  readonly icon: ReactNode;
}

/* ============================================================
   TAB CONFIGURATION
============================================================ */

const QUOTATION_TABS: readonly QuotationTabConfig[] = [
  {
    id: "inquiry",
    label: "Quotation Inquiry",
    description: "Review and manage quotation inquiries",
    icon: (
      <ClipboardList
        size={21}
        strokeWidth={2}
        aria-hidden="true"
      />
    ),
  },
  {
    id: "responses",
    label: "Quotation Responses",
    description: "Track quotation responses",
    icon: (
      <MessageSquareCheck
        size={21}
        strokeWidth={2}
        aria-hidden="true"
      />
    ),
  },
];

/* ============================================================
   TAB VALIDATION
============================================================ */

const isQuotationTab = (
  value: string | null,
): value is QuotationTabId => {
  return (
    value === "inquiry" ||
    value === "send-quotation" ||
    value === "responses"
  );
};

/* ============================================================
   COMPONENT
============================================================ */

const Quotation: FC = () => {
  const [searchParams, setSearchParams] =
    useSearchParams();

  /*
   * URL is the single source of truth for the active tab.
   *
   * Examples:
   *
   * /super-admin/quotation?tab=inquiry
   * /super-admin/quotation?tab=send-quotation
   * /super-admin/quotation?tab=responses
   */

  const tabParam = searchParams.get("tab");

  const activeTab: QuotationTabId = isQuotationTab(
    tabParam,
  )
    ? tabParam
    : "inquiry";

  /* ==========================================================
     TAB CHANGE
  ========================================================== */

  const handleTabChange = (
    tab: QuotationTabId,
  ): void => {
    const nextParams = new URLSearchParams(
      searchParams,
    );

    nextParams.set("tab", tab);

    setSearchParams(nextParams, {
      replace: true,
    });
  };

  /* ==========================================================
     CONTENT
  ========================================================== */

  const renderTabContent = (): ReactNode => {
    switch (activeTab) {
      case "inquiry":
        return <QuotationInquiry />;


      case "responses":
        return <QuotationResponses />;
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <section
      className="
        min-h-full
        w-full
        bg-slate-50
        text-slate-900
        transition-colors
        duration-200

        dark:bg-slate-950
        dark:text-slate-100
      "
      aria-label="Quotation management"
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1600px]
          px-4
          py-5
          sm:px-6
          lg:px-8
        "
      >

        {/* ==================================================
            QUOTATION NAVIGATION
        ================================================== */}

        <nav
          aria-label="Quotation navigation"
          className="
            mb-6
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-sm
            transition-colors
            duration-200

            dark:border-slate-800
            dark:bg-slate-900
            dark:shadow-black/20
          "
        >
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
              aria-orientation="horizontal"
              className="
                flex
                min-w-[760px]
                w-full
              "
            >
              {QUOTATION_TABS.map(
                (tab, index) => {
                  const isActive =
                    activeTab === tab.id;

                  return (
                    <div
                      key={tab.id}
                      className="
                        flex
                        flex-1
                        items-stretch
                      "
                    >
                      {/* ==================================================
                          TAB BUTTON
                      ================================================== */}

                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`quotation-panel-${tab.id}`}
                        id={`quotation-tab-${tab.id}`}
                        tabIndex={
                          isActive ? 0 : -1
                        }
                        onClick={() =>
                          handleTabChange(tab.id)
                        }
                        className={`
                          group
                          relative
                          flex
                          min-h-[92px]
                          w-full
                          flex-1
                          items-center
                          justify-center
                          gap-3
                          px-5
                          py-4
                          text-left
                          outline-none
                          transition-colors
                          duration-200

                          focus-visible:z-10
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-blue-500

                          ${
                            isActive
                              ? `
                                bg-white
                                dark:bg-slate-900
                              `
                              : `
                                bg-white
                                hover:bg-slate-50

                                dark:bg-slate-900
                                dark:hover:bg-slate-800
                              `
                          }
                        `}
                      >
                        {/* ==================================================
                            ICON
                        ================================================== */}

                        <span
                          className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ring-1
                            transition-colors
                            duration-200

                            ${
                              isActive
                                ? `
                                  bg-blue-50
                                  text-blue-600
                                  ring-blue-100

                                  dark:bg-blue-500/10
                                  dark:text-blue-400
                                  dark:ring-blue-500/20
                                `
                                : `
                                  bg-slate-50
                                  text-slate-400
                                  ring-slate-100

                                  group-hover:bg-slate-100
                                  group-hover:text-slate-600

                                  dark:bg-slate-800
                                  dark:text-slate-500
                                  dark:ring-slate-700

                                  dark:group-hover:bg-slate-700
                                  dark:group-hover:text-slate-300
                                `
                            }
                          `}
                          aria-hidden="true"
                        >
                          {tab.icon}
                        </span>

                        {/* ==================================================
                            LABEL + DESCRIPTION
                        ================================================== */}

                        <span className="min-w-0">
                          <span
                            className={`
                              block
                              whitespace-nowrap
                              text-sm
                              font-semibold
                              tracking-tight
                              transition-colors
                              duration-200

                              ${
                                isActive
                                  ? `
                                    text-blue-600
                                    dark:text-blue-400
                                  `
                                  : `
                                    text-slate-700
                                    group-hover:text-slate-900

                                    dark:text-slate-300
                                    dark:group-hover:text-white
                                  `
                              }
                            `}
                          >
                            {tab.label}
                          </span>

                          <span
                            className="
                              mt-1
                              block
                              whitespace-nowrap
                              text-xs
                              text-slate-500

                              dark:text-slate-400
                            "
                          >
                            {tab.description}
                          </span>
                        </span>

                        {/* ==================================================
                            ACTIVE INDICATOR
                        ================================================== */}

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

                            ${
                              isActive
                                ? `
                                  bg-blue-600
                                  dark:bg-blue-500
                                `
                                : "bg-transparent"
                            }
                          `}
                        />
                      </button>

                      {/* ==================================================
                          TAB DIVIDER
                      ================================================== */}

                      {index <
                        QUOTATION_TABS.length -
                          1 && (
                        <span
                          aria-hidden="true"
                          className="
                            my-5
                            w-px
                            shrink-0
                            bg-slate-100

                            dark:bg-slate-800
                          "
                        />
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </nav>

        {/* ==================================================
            ACTIVE TAB CONTENT
        ================================================== */}

        <main
          id={`quotation-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`quotation-tab-${activeTab}`}
          className="
            w-full
            min-w-0
          "
        >
          {renderTabContent()}
        </main>
      </div>
    </section>
  );
};

export default Quotation;
