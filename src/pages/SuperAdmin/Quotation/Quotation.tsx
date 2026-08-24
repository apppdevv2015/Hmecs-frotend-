import { useState } from "react";

import QuotationManagement from "./QuotationManagement";
import QuotationDetails from "./QuotationDetails";
import ContractManagement from "./ContractManagement";
import InvoiceManagement from "./InvoiceManagement";

type QuotationTab =
  | "management"
  | "details"
  | "contract"
  | "invoices";

interface QuotationTabConfig {
  id: QuotationTab;
  label: string;
  icon: React.ReactNode;
}

const QUOTATION_TABS: QuotationTabConfig[] = [
  {
    id: "management",
    label: "Quotation Management",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    id: "details",
    label: "Quotation Details",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h16v16H4z" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    id: "contract",
    label: "Contract",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 3h16v18H4z" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h5" />
      </svg>
    ),
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: (
      <svg
        aria-hidden="true"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
];

const Quotation = () => {
  const [activeTab, setActiveTab] =
    useState<QuotationTab>("management");

  const renderTabContent = () => {
    if (activeTab === "management") {
      return <QuotationManagement />;
    }

    if (activeTab === "details") {
      return <QuotationDetails />;
    }

    if (activeTab === "contract") {
      return <ContractManagement />;
    }

    return <InvoiceManagement />;
  };

  return (
    <section
      className="min-h-full w-full bg-slate-50"
      aria-label="Quotation management"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Quotation
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage quotations, contracts and invoices
        </p>
      </header>

      <nav
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label="Quotation navigation"
      >
        <div
          className="flex w-full overflow-x-auto"
          role="tablist"
          aria-orientation="horizontal"
        >
          {QUOTATION_TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                className="flex min-w-[220px] flex-1 items-stretch"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`quotation-panel-${tab.id}`}
                  id={`quotation-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex min-h-[88px] w-full
                    items-center justify-center gap-3
                    px-5 py-4 text-sm font-medium
                    transition-colors duration-200
                    focus:outline-none focus-visible:ring-2
                    focus-visible:ring-blue-500
                    focus-visible:ring-offset-2
                    ${
                      isActive
                        ? "text-blue-600"
                        : "text-slate-700 hover:text-blue-600"
                    }
                  `}
                >
                  <span
                    className={`
                      flex h-12 w-12 shrink-0 items-center
                      justify-center rounded-xl border
                      ${
                        isActive
                          ? "border-blue-200 bg-blue-50 text-blue-600"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      }
                    `}
                  >
                    {tab.icon}
                  </span>

                  <span className="whitespace-nowrap">
                    {tab.label}
                  </span>

                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="
                        absolute bottom-0 left-6 right-6
                        h-[3px] rounded-t-full bg-blue-600
                      "
                    />
                  )}
                </button>

                {index < QUOTATION_TABS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="my-4 w-px shrink-0 bg-slate-200"
                  />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <main
        id={`quotation-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`quotation-tab-${activeTab}`}
        className="mt-6"
      >
        {renderTabContent()}
      </main>
    </section>
  );
};

export default Quotation;