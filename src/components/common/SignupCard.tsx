import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Layers,
  Paperclip,
  Plus,
  Send,
  Wallet,
  X,
  ArrowLeft,
  ArrowRight,
  Puzzle,
  Building2,
} from "lucide-react";

import Label from "../form/Label";
import Input from "../form/input/InputField";

import {
  submitQuotationRequest,
  type ApiQuotationRequest,
} from "../../services/SuperAdmin/quotationInquiryService";
import { showLoadingToast, updateToast } from "../../utils/toastUtils";
import StorageService from "../../services/storage.service";
import {
  getEquipmentTypes,
  getPublicOptionalServices,
} from "../../services/SuperAdmin/optionalService";

import {
  userService,
  type CompanySummary,
} from "../../services/Auth/userService";

// ---------------------------------------------------------------------------
// Options / constants
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

const OPTIONAL_SERVICE_OPTIONS: SelectOption[] = [
  {
    value: "telematics_ecu_integration",
    label: "Telematics / ECU Integration",
  },
  {
    value: "historical_data_migration_cleaning",
    label: "Historical Data Migration & Cleaning",
  },
  { value: "custom_api_development", label: "Custom API Development" },
  { value: "sap_erp_integration", label: "SAP / ERP Integration" },
  { value: "additional_training", label: "Additional Training" },
  {
    value: "sms_whatsapp_notifications",
    label: "SMS / WhatsApp Notifications",
  },
  { value: "custom_reports", label: "Custom Reports" },
  { value: "on_site_technical_support", label: "On-site Technical Support" },
];

const CONTRACT_DURATION_OPTIONS: SelectOption[] = [
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "36 Months" },
  { value: "custom", label: "Custom" },
];

const MAX_SITE_NAME_FIELDS = 8;
const MAX_ATTACHMENT_SIZE_MB = 10;

type PlanId = "once_off" | "monthly_licence";

interface QuotationPlan {
  id: PlanId;
  title: string;
  badge: string;
  description: string;
}

const QUOTATION_PLANS: Record<PlanId, QuotationPlan> = {
  once_off: {
    id: "once_off",
    title: "Once-Off Implementation Fee",
    badge: "One-Time Fee",
    description: "Complete platform setup and deployment.",
  },
  monthly_licence: {
    id: "monthly_licence",
    title: "Fixed Monthly Site Licence",
    badge: "Monthly Licence",
    description:
      "Licence fee is based on the number of active machines in your fleet.",
  },
};

const ONCE_OFF_INCLUDED_SERVICES = [
  "Platform and company setup",
  "User and permission configuration",
  "Training",
  "Integration setup, where required",
  "Fleet and component data loading",
  "Workflow setup",
  "Initial dashboards and reports",
];

const MONTHLY_PRICING_TIERS = [
  "Up to 10 Machines",
  "11 – 25 Machines",
  "26 – 75 Machines",
  "76 – 150 Machines",
  "151+ Machines or Multiple Sites",
];

// ---------------------------------------------------------------------------
// Validation — Step 2 "Request a Quotation" fields only. Company details
// are assumed already on file for the logged-in company placing this
// inquiry, so this schema does not re-collect them.
//
// numberOfSites is a plain numeric field (not a range picker) because the
// backend contract (QuotationRequestPayload.numberOfSites) is `number`.
// ---------------------------------------------------------------------------

const quotationRequestSchema = z.object({
  companyId: z.string().min(1, "Please select a company"),

  quotationType: z.string().min(1, "Please select a quotation type"),

  numberOfSites: z
    .string()
    .trim()
    .min(1, "Number of sites is required")
    .regex(/^\d+$/, "Enter a valid whole number")
    .refine((value) => Number(value) > 0, "Must be at least 1"),

  siteNames: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Site name is required"),
      }),
    )
    .min(1, "Add at least one site"),

  activeMachines: z
    .string()
    .trim()
    .min(1, "Number of active machines is required")
    .regex(/^\d+$/, "Enter a valid whole number")
    .refine((value) => Number(value) > 0, "Must be at least 1"),

  equipmentTypes: z
    .array(z.string())
    .min(1, "Select at least one equipment type"),

  contractDuration: z.string().min(1, "Please select contract duration"),

  implementationRequirements: z.string().trim().optional(),

  optionalServices: z.array(z.string()).optional(),

  additionalRequirements: z.string().trim().optional(),

  attachment: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.type === "application/pdf",
      "Only PDF files are allowed",
    )
    .refine(
      (file) => !file || file.size <= MAX_ATTACHMENT_SIZE_MB * 1024 * 1024,
      `File must be under ${MAX_ATTACHMENT_SIZE_MB}MB`,
    ),
});

type QuotationRequestFormData = z.infer<typeof quotationRequestSchema>;

// ---------------------------------------------------------------------------
// Custom Select
// ---------------------------------------------------------------------------

function AppSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition focus:outline-none focus:ring-4 dark:bg-slate-900 ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60"
            : error
              ? "border-red-500 focus:ring-red-500/20"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700"
        }`}
      >
        <span
          className={`truncate ${
            selectedLabel
              ? "text-slate-900 dark:text-white"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {selectedLabel || placeholder}
        </span>

        {!disabled && (
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && !disabled && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Multi Select
// ---------------------------------------------------------------------------

function AppMultiSelect({
  values,
  onChange,
  options,
  placeholder = "Select options",
  error,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleValue = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter((item) => item !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  const summaryText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  return (
    <div>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition focus:outline-none focus:ring-4 dark:bg-slate-900 ${
            error
              ? "border-red-500 focus:ring-red-500/20"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700"
          }`}
        >
          <span
            className={`truncate ${
              selectedLabels.length
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {summaryText}
          </span>

          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {options.map((option) => {
              const isSelected = values.includes(option.value);

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleValue(option.value)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                      isSelected
                        ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>

                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        You can select multiple options
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Select (searchable single-select for the quotation form)
// ---------------------------------------------------------------------------

function AppCompanySelect({
  companies,
  isLoading,
  value,
  onChange,
  error,
}: {
  companies: CompanySummary[];
  isLoading: boolean;
  value: string;
  onChange: (companyId: string) => void;
  error?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedCompany = companies.find((c) => c.id === value);

  const filteredCompanies = companies.filter((company) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      company.companyName.toLowerCase().includes(query) ||
      company.companyCode.toLowerCase().includes(query) ||
      company.adminEmail.toLowerCase().includes(query)
    );
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition focus:outline-none focus:ring-4 dark:bg-slate-900 ${
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700"
        }`}
      >
        <span
          className={`truncate ${
            selectedCompany
              ? "text-slate-900 dark:text-white"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {selectedCompany
            ? `${selectedCompany.companyName} (${selectedCompany.companyCode})`
            : isLoading
              ? "Loading companies..."
              : "Select company"}
        </span>

        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company..."
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <ul role="listbox" className="max-h-56 overflow-y-auto p-1.5">
            {isLoading ? (
              <li className="px-2.5 py-2 text-sm text-slate-500 dark:text-slate-400">
                Loading companies...
              </li>
            ) : filteredCompanies.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-slate-500 dark:text-slate-400">
                No companies found.
              </li>
            ) : (
              filteredCompanies.map((company) => {
                const isSelected = company.id === value;

                return (
                  <li key={company.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(company.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {company.companyName}{" "}
                        <span className="text-xs text-slate-400">
                          ({company.companyCode})
                        </span>
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Attachment
// ---------------------------------------------------------------------------

function AppInlineFileAttach({
  file,
  onChange,
  accept = "application/pdf",
}: {
  file: File | null | undefined;
  onChange: (file: File | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0] || null;
          onChange(selected);
        }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach PDF
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />

          <span className="truncate font-medium text-slate-700 dark:text-slate-200">
            {file.name}
          </span>

          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => {
              onChange(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
        Optional
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company Selection Modal
// ---------------------------------------------------------------------------

function CompanySelectionModal({
  companies,
  isLoading,
  onSelectCompany,
  onClose,
}: {
  companies: CompanySummary[];
  isLoading: boolean;
  onSelectCompany: (company: CompanySummary) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const filteredCompanies = companies.filter((company) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      company.companyName.toLowerCase().includes(query) ||
      company.companyCode.toLowerCase().includes(query) ||
      company.adminEmail.toLowerCase().includes(query)
    );
  });

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-selection-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8">
          <div>
            <h2
              id="company-selection-title"
              className="text-2xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              Select Company
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose the company you want to request this quotation for.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800 sm:px-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, code or email..."
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto px-3 py-3 sm:px-4">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading companies...
            </p>
          ) : filteredCompanies.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No companies found.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filteredCompanies.map((company) => (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCompany(company)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/60 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <Building2 className="h-4.5 w-4.5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {company.companyName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {company.companyCode} · {company.adminEmail}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        company.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {company.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Selection Modal
// ---------------------------------------------------------------------------

function PlanSelectionModal({
  selectedPlanId,
  optionalServiceOptions,
  onSelectPlan,
  onClose,
}: {
  selectedPlanId: PlanId | null;
  optionalServiceOptions: SelectOption[];
  onSelectPlan: (planId: PlanId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-selection-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8">
          <div>
            <h2
              id="plan-selection-title"
              className="text-2xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              Request a Quotation
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose the plan that fits how you want to get started.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Plan 1 — Once-Off Implementation Fee */}
            <div
              className={`flex h-full flex-col rounded-2xl border-2 p-6 transition ${
                selectedPlanId === "once_off"
                  ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <Layers className="h-5 w-5" />
                </div>

                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {QUOTATION_PLANS.once_off.badge}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                {QUOTATION_PLANS.once_off.title}
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {QUOTATION_PLANS.once_off.description}
              </p>

              <ul className="mt-5 space-y-2.5">
                {ONCE_OFF_INCLUDED_SERVICES.map((service) => (
                  <li
                    key={service}
                    className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>

              {/* Spacer pushes the button to the bottom so both cards align */}
              <div className="flex-1" />

              <button
                type="button"
                onClick={() => onSelectPlan("once_off")}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                Request Quotation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Plan 2 — Fixed Monthly Site Licence */}
            <div
              className={`flex h-full flex-col rounded-2xl border-2 p-6 transition ${
                selectedPlanId === "monthly_licence"
                  ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <Wallet className="h-5 w-5" />
                </div>

                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {QUOTATION_PLANS.monthly_licence.badge}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                {QUOTATION_PLANS.monthly_licence.title}
              </h3>

              <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {QUOTATION_PLANS.monthly_licence.description}
              </p>

              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Fleet size tiers
                </p>

                <ul className="mt-3 space-y-2">
                  {MONTHLY_PRICING_TIERS.map((tier, index) => (
                    <li
                      key={tier}
                      className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span>{tier}</span>
                      {index === MONTHLY_PRICING_TIERS.length - 1 && (
                        <span className="ml-2 shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400">
                          Custom Pricing
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs leading-5 text-slate-400 dark:text-slate-500">
                  Your exact rate is confirmed against your active machine count
                  once this request is submitted.
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Monthly Additional Charge
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Optional add-on services and support levels you select below
                  may carry an additional monthly charge, confirmed with your
                  quotation.
                </p>
              </div>

              {/* Spacer pushes the button to the bottom so both cards align */}
              <div className="flex-1" />

              <button
                type="button"
                onClick={() => onSelectPlan("monthly_licence")}
                className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
              >
                Request Quotation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Optional Services */}
          <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-500/30 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Puzzle className="h-5 w-5" />
              </div>

              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                Optional Services
              </h3>

              <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Included / As Per Requirement
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Enhance your solution with additional integrations and value-added
              services.
            </p>

            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {optionalServiceOptions.map((service) => (
                  <div
                    key={service.value}
                    className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>{service.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request Quotation Modal
// ---------------------------------------------------------------------------

interface RequestQuotationModalProps {
  planId: PlanId;
  companies: CompanySummary[];
  isLoadingCompanies: boolean;
  userId: string;
  phone: string;
  siteLocation?: string;
  equipmentTypeOptions: SelectOption[];
  isLoadingDynamicOptions: boolean;
  /**
   * The backend contract stores attachments as a URL
   * (QuotationRequestPayload.attachmentUrl), not a raw File. If the user
   * attaches a PDF, this function is called first to upload it and return
   * the resulting URL. Wire this up to your actual upload endpoint before
   * going live — without it, submission is blocked whenever a file is
   * attached, rather than silently dropping the attachment.
   */
  onUploadAttachment?: (file: File) => Promise<string>;
  onBack: () => void;
  onClose: () => void;
  onSubmitted?: (result: ApiQuotationRequest) => void;
}

function RequestQuotationModal({
  planId,
  companies,
  isLoadingCompanies,
  userId,
  phone,
  siteLocation,
  equipmentTypeOptions,
  optionalServiceOptions,
  isLoadingDynamicOptions,
  onUploadAttachment,
  onBack,
  onClose,
  onSubmitted,
}: RequestQuotationModalProps) {
  const plan = QUOTATION_PLANS[planId];

  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<QuotationRequestFormData>({
    resolver: zodResolver(quotationRequestSchema),
    defaultValues: {
      companyId: "",
      quotationType: planId,
      numberOfSites: "",
      siteNames: [{ name: "" }],
      activeMachines: "",
      equipmentTypes: [],
      contractDuration: "",
      implementationRequirements: "",
      optionalServices: [],
      additionalRequirements: "",
      attachment: undefined,
    },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Quotation Type is derived from the selected plan and kept in sync
  // automatically — it is never edited directly on this form.
  useEffect(() => {
    setValue("quotationType", planId, { shouldValidate: false });
  }, [planId, setValue]);

  const {
    fields: siteNameFields,
    append: appendSiteName,
    remove: removeSiteName,
  } = useFieldArray({
    control,
    name: "siteNames",
  });

  const siteNameArrayError = (
    errors.siteNames as { message?: string } | undefined
  )?.message;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const onSubmit = async (data: QuotationRequestFormData) => {
    const toastId = "quotation-request-submit";

    const selectedCompany = companies.find((c) => c.id === data.companyId);

    if (!selectedCompany || !userId) {
      showLoadingToast("Checking company selection...", { id: toastId });
      updateToast(
        toastId,
        "Please select a valid company before submitting.",
        "error",
      );
      return;
    }

    showLoadingToast("Submitting your quotation request...", { id: toastId });

    try {
      let attachmentUrl: string | undefined;

      if (data.attachment) {
        if (!onUploadAttachment) {
          updateToast(
            toastId,
            "Attachment upload isn't configured yet. Remove the file and submit again, or contact support.",
            "error",
          );
          return;
        }

        try {
          attachmentUrl = await onUploadAttachment(data.attachment);
        } catch (uploadError) {
          console.error("Attachment upload failed:", uploadError);
          updateToast(
            toastId,
            "Failed to upload the attached PDF. Please try again.",
            "error",
          );
          return;
        }
      }

      const result = await submitQuotationRequest({
        companyName: selectedCompany.companyName,
        contactPerson: selectedCompany.adminName,
        email: selectedCompany.adminEmail,
        phone,
        siteLocation,
        quotationType: data.quotationType,
        numberOfSites: Number(data.numberOfSites),
        siteNames: data.siteNames.map((s) => s.name).filter(Boolean),
        activeMachines: Number(data.activeMachines),
        equipmentTypes: data.equipmentTypes,
        contractDuration: data.contractDuration,
        optionalServices: data.optionalServices || [],
        implementationRequirements: data.implementationRequirements?.trim(),
        additionalRequirements: data.additionalRequirements?.trim(),
        attachmentUrl,
        companyId: selectedCompany.id,
        userId,
      });

      updateToast(
        toastId,
        "Quotation request submitted successfully!",
        "success",
      );

      onSubmitted?.(result);
      onClose();
    } catch (error) {
      console.error("Quotation request submission error:", error);

      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to submit quotation request. Please try again.";

      updateToast(toastId, message, "error");
    }
  };

  const PlanIcon = planId === "once_off" ? Layers : Wallet;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-8 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-quotation-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8">
          <div className="flex items-start justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4">
            <h1
              id="request-quotation-title"
              className="text-2xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              Request a Quotation
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Provide details about your requirements.
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="max-h-[65vh] overflow-y-auto px-6 py-6 sm:px-8">
            {/* Selected Plan */}
            <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/25 dark:bg-blue-500/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <PlanIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Selected Plan
                </p>
                <p className="mt-0.5 truncate text-base font-black text-slate-950 dark:text-white">
                  {plan.title}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {plan.badge}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {plan.description}
                </p>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {/* Company */}
              <div className="flex min-w-0 flex-col sm:col-span-2">
                <Label>Company *</Label>

                <div className="mt-1">
                  <Controller
                    name="companyId"
                    control={control}
                    render={({ field }) => (
                      <AppCompanySelect
                        companies={companies}
                        isLoading={isLoadingCompanies}
                        value={field.value}
                        onChange={(companyId) => {
                          field.onChange(companyId);
                          if (errors.companyId) clearErrors("companyId");
                        }}
                        error={Boolean(errors.companyId)}
                      />
                    )}
                  />
                </div>

                <div className="min-h-[18px] pt-1">
                  {errors.companyId?.message && (
                    <p className="text-xs leading-5 text-red-500">
                      {errors.companyId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Quotation Type — auto-set from the selected plan */}
              <div className="flex min-w-0 flex-col">
                <Label>1. Quotation Type *</Label>

                <div className="mt-1">
                  <AppSelect
                    value={planId}
                    onChange={() => {
                      /* locked: derived from the selected plan */
                    }}
                    options={[{ value: plan.id, label: plan.title }]}
                    disabled
                  />
                </div>

                <div className="min-h-[10px] pt-1" />
              </div>

              {/* Number of Sites */}
              <div className="flex min-w-0 flex-col">
                <Label>2. Number of Sites *</Label>

                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter number of sites"
                  className={`mt-1 w-full ${
                    errors.numberOfSites
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                  {...register("numberOfSites", {
                    setValueAs: (value) => value.trim(),
                    onChange: () => {
                      if (errors.numberOfSites) clearErrors("numberOfSites");
                    },
                  })}
                />

                <div className="min-h-[34px] pt-1">
                  {errors.numberOfSites?.message && (
                    <p className="text-xs leading-5 text-red-500">
                      {errors.numberOfSites.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Site Names */}
              <div className="flex min-w-0 flex-col sm:col-span-2">
                <Label>3. Site Name(s) *</Label>

                <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {siteNameFields.map((field, index) => (
                    <div key={field.id} className="relative">
                      <Input
                        placeholder={`Site ${index + 1} Name`}
                        className={`w-full ${
                          siteNameFields.length > 1 ? "pr-9" : ""
                        } ${
                          (errors.siteNames as any)?.[index]?.name?.message
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : ""
                        }`}
                        {...register(`siteNames.${index}.name` as const, {
                          setValueAs: (value) => value.trim(),
                        })}
                      />

                      {siteNameFields.length > 1 && (
                        <button
                          type="button"
                          aria-label="Remove site"
                          onClick={() => removeSiteName(index)}
                          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    siteNameFields.length < MAX_SITE_NAME_FIELDS &&
                    appendSiteName({ name: "" })
                  }
                  disabled={siteNameFields.length >= MAX_SITE_NAME_FIELDS}
                  className="mt-2.5 inline-flex w-fit items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                >
                  <Plus className="h-4 w-4" />
                  Add More
                </button>

                <div className="min-h-[34px] pt-1">
                  {siteNameArrayError && (
                    <p className="text-xs leading-5 text-red-500">
                      {siteNameArrayError}
                    </p>
                  )}
                </div>
              </div>

              {/* Active Machines */}
              <div className="flex min-w-0 flex-col">
                <Label>4. Number of Active Machines *</Label>

                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter number of active machines"
                  className={`mt-1 w-full ${
                    errors.activeMachines
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                  {...register("activeMachines", {
                    setValueAs: (value) => value.trim(),
                    onChange: () => {
                      if (errors.activeMachines) clearErrors("activeMachines");
                    },
                  })}
                />

                <div className="min-h-[34px] pt-1">
                  {errors.activeMachines?.message && (
                    <p className="text-xs leading-5 text-red-500">
                      {errors.activeMachines.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Equipment Types */}
              <div className="flex min-w-0 flex-col">
                <Label>5. Fleet / Equipment Types *</Label>

                <div className="mt-1">
                  <Controller
                    name="equipmentTypes"
                    control={control}
                    render={({ field }) => (
                      <AppMultiSelect
                        values={field.value}
                        onChange={(values) => {
                          field.onChange(values);
                          if (errors.equipmentTypes)
                            clearErrors("equipmentTypes");
                        }}
                        options={equipmentTypeOptions}
                        placeholder={
                          isLoadingDynamicOptions
                            ? "Loading equipment types..."
                            : "Select equipment types"
                        }
                        error={Boolean(errors.equipmentTypes)}
                      />
                    )}
                  />
                </div>

                <div className="min-h-[18px] pt-1">
                  {errors.equipmentTypes?.message && (
                    <p className="text-xs leading-5 text-red-500">
                      {errors.equipmentTypes.message as string}
                    </p>
                  )}
                </div>
              </div>

              {/* Contract Duration */}
              <div className="flex min-w-0 flex-col">
                <Label>6. Preferred Contract Duration *</Label>

                <div className="mt-1">
                  <Controller
                    name="contractDuration"
                    control={control}
                    render={({ field }) => (
                      <AppSelect
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          if (errors.contractDuration)
                            clearErrors("contractDuration");
                        }}
                        options={CONTRACT_DURATION_OPTIONS}
                        placeholder="Select contract duration"
                        error={Boolean(errors.contractDuration)}
                      />
                    )}
                  />
                </div>

                <div className="min-h-[34px] pt-1">
                  {errors.contractDuration?.message && (
                    <p className="text-xs leading-5 text-red-500">
                      {errors.contractDuration.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Implementation Requirements */}
              <div className="flex min-w-0 flex-col">
                <Label>7. Implementation Requirements</Label>

                <textarea
                  rows={3}
                  placeholder="Describe your implementation, setup, integration or deployment requirements..."
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  {...register("implementationRequirements")}
                />

                <div className="min-h-[10px] pt-1" />
              </div>

              {/* Optional Services */}
              <div className="flex min-w-0 flex-col">
                <Label>Optional Services</Label>

                <div className="mt-1">
                  <Controller
                    name="optionalServices"
                    control={control}
                    render={({ field }) => (
                      <AppMultiSelect
                        values={field.value || []}
                        onChange={(values) => field.onChange(values)}
                        options={optionalServiceOptions}
                        placeholder={
                          isLoadingDynamicOptions
                            ? "Loading optional services..."
                            : "Select optional services"
                        }
                      />
                    )}
                  />
                </div>

                <div className="min-h-[10px] pt-1" />
              </div>

              {/* Additional Requirements */}
              <div className="flex min-w-0 flex-col">
                <Label>8. Additional Requirements</Label>

                <div
                  className={`mt-1 w-full rounded-lg border bg-white transition focus-within:ring-4 dark:bg-slate-900 ${
                    errors.attachment
                      ? "border-red-500 focus-within:ring-red-500/20"
                      : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/10 dark:border-slate-700"
                  }`}
                >
                  <textarea
                    rows={3}
                    placeholder="Enter any additional requirements or special requests..."
                    className="w-full resize-none rounded-t-lg border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-white"
                    {...register("additionalRequirements")}
                  />

                  <div className="flex items-center border-t border-slate-100 px-3.5 py-2 dark:border-slate-800">
                    <Controller
                      name="attachment"
                      control={control}
                      render={({ field }) => (
                        <AppInlineFileAttach
                          file={field.value}
                          onChange={(file) => field.onChange(file ?? undefined)}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="min-h-[10px] pt-1">
                  {errors.attachment?.message && (
                    <p className="text-xs leading-5 text-red-500">
                      {errors.attachment.message as string}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? "Submitting..." : "Submit Quotation Request"}
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


type FlowStep = "closed" | "plan" | "form";

interface FormCardProps {
  companyId?: string;
  userId?: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  siteLocation?: string;

  // /** Optional dynamically-loaded option lists — falls back to the static
  //  * defaults defined in this file when not supplied. */
  // equipmentTypeOptions?: SelectOption[];
  // optionalServiceOptions?: SelectOption[];
  // isLoadingDynamicOptions?: boolean;

  /** See RequestQuotationModalProps.onUploadAttachment. */
  onUploadAttachment?: (file: File) => Promise<string>;

  /** Called after a quotation request is submitted successfully, with the
   * created record, so the parent page can refresh its inquiry list. */
  onInquirySubmitted?: (result: ApiQuotationRequest) => void;
}

export default function FormCard({
  companyId,
  userId,
  companyName,
  contactPerson,
  email,
  phone,
  siteLocation,
  onUploadAttachment,
  onInquirySubmitted,
}: FormCardProps) {
  const [step, setStep] = useState<FlowStep>("closed");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);

  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(
    null,
  );

   useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const list = await userService.getCompanySummaries();
        if (isMounted) setCompanies(list);
      } catch (err) {
        console.error("Failed to load companies:", err);
      } finally {
        if (isMounted) setIsLoadingCompanies(false);
      }
    };

    loadCompanies();
    return () => {
      isMounted = false;
    };
  }, []);


  const [equipmentTypeOptions, setEquipmentTypeOptions] = useState<
    SelectOption[]
  >([]);
  const [optionalServiceOptions, setOptionalServiceOptions] = useState<
    SelectOption[]
  >([]);
  const [isLoadingDynamicOptions, setIsLoadingDynamicOptions] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDynamicOptions = async () => {
      setIsLoadingDynamicOptions(true);
      try {
        const [equipmentsRes, servicesRes] = await Promise.allSettled([
          getEquipmentTypes(),
          getPublicOptionalServices(),
        ]);

        if (
          equipmentsRes.status === "fulfilled" &&
          Array.isArray(equipmentsRes.value)
        ) {
          const mapped: SelectOption[] = equipmentsRes.value.map(
            (item: any) => {
              if (typeof item === "string") return { value: item, label: item };
              const name =
                item.name || item.category || item.label || String(item);
              return { value: name, label: name };
            },
          );
          if (isMounted) setEquipmentTypeOptions(mapped);
        } else if (equipmentsRes.status === "rejected") {
          console.error(
            "Failed to load equipment types:",
            equipmentsRes.reason,
          );
        }

        if (
          servicesRes.status === "fulfilled" &&
          Array.isArray(servicesRes.value)
        ) {
          const mapped: SelectOption[] = servicesRes.value.map((item: any) => {
            const val = item.name || item.id || item.value;
            const lbl = item.name || item.label || val;
            return { value: val, label: lbl };
          });
          if (isMounted) setOptionalServiceOptions(mapped);
        } else if (servicesRes.status === "rejected") {
          console.error(
            "Failed to load optional services:",
            servicesRes.reason,
          );
        }
      } finally {
        if (isMounted) setIsLoadingDynamicOptions(false);
      }
    };

    loadDynamicOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  const storedUser = StorageService.getUser();

  const resolvedCompanyId =
    selectedCompany?.id ||
    companyId ||
    StorageService.getCompanyId() ||
    storedUser?.companyId ||
    "";
  const resolvedUserId =
    selectedCompany?.adminId || userId || storedUser?.id || "";
  const resolvedCompanyName =
    selectedCompany?.companyName ||
    companyName ||
    storedUser?.companyName ||
    storedUser?.company ||
    "";
  const resolvedContactPerson =
    selectedCompany?.adminName || contactPerson || storedUser?.name || "";
  const resolvedEmail =
    selectedCompany?.adminEmail || email || storedUser?.email || "";
  const resolvedPhone = phone || storedUser?.mobileNumber || "";

  const openPlanSelection = () => setStep("plan");

  const handleSelectPlan = (planId: PlanId) => {
    setSelectedPlanId(planId);
    setStep("form");
  };

  const handleBackToPlans = () => {
    setStep("plan");
  };

  const handleCloseAll = () => {
    setStep("closed");
    setSelectedPlanId(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPlanSelection}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
      >
        <Plus className="h-4 w-4" />
        Add Inquiry
      </button>

      {step === "plan" && (
        <PlanSelectionModal
          selectedPlanId={selectedPlanId}
          optionalServiceOptions={optionalServiceOptions}
          onSelectPlan={handleSelectPlan}
          onClose={handleCloseAll}
        />
      )}

      {step === "form" && selectedPlanId && (
        <RequestQuotationModal
          planId={selectedPlanId}
          companies={companies}
          isLoadingCompanies={isLoadingCompanies}
          userId={resolvedUserId}
          phone={resolvedPhone}
          siteLocation={siteLocation}
          equipmentTypeOptions={equipmentTypeOptions}
          optionalServiceOptions={optionalServiceOptions}
          isLoadingDynamicOptions={isLoadingDynamicOptions}
          onUploadAttachment={onUploadAttachment}
          onBack={handleBackToPlans}
          onClose={handleCloseAll}
          onSubmitted={onInquirySubmitted}
        />
      )}
    </>
  );
}
