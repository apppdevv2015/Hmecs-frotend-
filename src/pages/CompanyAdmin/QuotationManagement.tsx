import React, { useState } from "react";
import {
  ClipboardCheck,
  FileText,
  FileSignature,
  Receipt,
  CheckCircle,
  Building2,
  CalendarDays,
  Clock3,
  ChevronRight,
  CircleCheck,
} from "lucide-react";

import QuotationStatus from "./QuotationStatus";
import QuotationDetails from "./QuotationDetailsPage";
import QuotationContract from "./QuotationContract";
import QuotationInvoices from "./quotationInvoices";
import QuotationAction from "./QuotationActionPage";

const QuotationManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("status");

  const tabs = [
    {
      id: "status",
      label: "Quotation Status",
      shortLabel: "Status",
      icon: ClipboardCheck,
    },
    {
      id: "details",
      label: "Quotation Details",
      shortLabel: "Details",
      icon: FileText,
    },
    {
      id: "contract",
      label: "Contract",
      shortLabel: "Contract",
      icon: FileSignature,
    },
    {
      id: "invoices",
      label: "Invoices",
      shortLabel: "Invoices",
      icon: Receipt,
    },
    {
      id: "decision",
      label: "Accept / Reject",
      shortLabel: "Decision",
      icon: CheckCircle,
    },
  ] as const;

  const currentTab =
    tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  const renderActiveSection = () => {
    switch (activeTab) {
      case "status":
        return <QuotationStatus />;

      case "details":
        return <QuotationDetails />;

      case "contract":
        return <QuotationContract />;

      case "invoices":
        return <QuotationInvoices />;

      case "decision":
        return <QuotationAction />;

      default:
        return <QuotationStatus />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Blue Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-6 sm:px-7">

            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-20 right-28 h-36 w-36 rounded-full bg-white/5" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              {/* Left */}
              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                  <FileText
                    size={24}
                    className="text-white"
                    strokeWidth={2}
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-blue-100">
                      Company / Quotation
                    </p>

                    <ChevronRight
                      size={14}
                      className="text-blue-200"
                    />

                    <p className="text-sm text-blue-100">
                      Request Management
                    </p>
                  </div>

                  <h1 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Quotation #QR-2025-000124
                  </h1>

                  <p className="mt-1 text-sm text-blue-100">
                    Manage quotation, contract, invoices and approval
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-300" />
                </span>

                <div>
                  <p className="text-xs text-blue-100">
                    Current Status
                  </p>

                  <p className="text-sm font-semibold text-white">
                    Under Review
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Request Information */}
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">

            <InfoItem
              icon={<Building2 size={18} />}
              label="Company"
              value="Orion Mining Pvt. Ltd."
            />

            <InfoItem
              icon={<CalendarDays size={18} />}
              label="Requested On"
              value="21 Aug 2026"
            />

            <InfoItem
              icon={<Clock3 size={18} />}
              label="Last Updated"
              value="21 Aug 2026, 11:15 AM"
            />

            <InfoItem
              icon={<FileText size={18} />}
              label="Machines"
              value="4 Machines"
            />

          </div>
        </div>

  
        {/* =====================================================
            TOP NAVIGATION / TABS
        ====================================================== */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-2 pt-2 sm:px-3">

            <div className="flex overflow-x-auto scrollbar-hide">

              {tabs.map((tab) => {

                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex min-w-fit items-center gap-2.5
                      px-4 py-4 text-sm font-semibold
                      transition-all duration-200
                      sm:px-5
                      ${
                        isActive
                          ? "text-blue-600"
                          : "text-slate-500 hover:text-slate-800"
                      }
                    `}
                  >

                    {/* Icon */}
                    <span
                      className={`
                        flex h-8 w-8 items-center justify-center
                        rounded-lg transition-all
                        ${
                          isActive
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                        }
                      `}
                    >
                      <Icon size={17} strokeWidth={2} />
                    </span>

                    <span className="whitespace-nowrap">
                      {tab.label}
                    </span>

                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />
                    )}

                  </button>
                );
              })}

            </div>
          </div>
        </div>

        {/* =====================================================
            ACTIVE PAGE CONTENT
        ====================================================== */}
        <div className="rounded-2xl">
          {renderActiveSection()}
        </div>

      </div>
    </div>
  );
};

/* ============================================================
   INFO ITEM
============================================================ */

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex items-center gap-3 px-5 py-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>

    </div>
  );
};

export default QuotationManagement;