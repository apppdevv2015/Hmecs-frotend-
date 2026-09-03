import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Check,
  Plus,
  X,
  Send,
  Loader2,
  Paperclip,
  FileText,
} from "lucide-react";

import {
  createQuotationRequest,
  extractApiError,
  type CreateQuotationRequestPayload,
} from "../../services/Quotation/quotationService";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

const QUOTATION_TYPE_OPTIONS: SelectOption[] = [
  { value: "Free Trial (14 Days)", label: "Free Trial (14 Days)" },
  { value: "Commercial Quotation", label: "Commercial Quotation" },
  {
    value: "Custom / Enterprise Quotation",
    label: "Custom / Enterprise Quotation",
  },
];

const EQUIPMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "Excavator", label: "Excavator" },
  { value: "Dump Truck", label: "Dump Truck" },
  { value: "Bulldozer", label: "Bulldozer" },
  { value: "Loader", label: "Loader" },
  { value: "Grader", label: "Grader" },
  { value: "Drilling Rig", label: "Drilling Rig" },
  { value: "Crusher", label: "Crusher" },
  { value: "Conveyor", label: "Conveyor" },
  { value: "Crane", label: "Crane" },
  { value: "Other", label: "Other" },
];

const OPTIONAL_SERVICE_OPTIONS: SelectOption[] = [
  {
    value: "Telematics / ECU Integration",
    label: "Telematics / ECU Integration",
  },
  { value: "SAP / ERP Integration", label: "SAP / ERP Integration" },
  {
    value: "On-site Installation Support",
    label: "On-site Installation Support",
  },
  { value: "Dedicated Account Manager", label: "Dedicated Account Manager" },
];

const CONTRACT_DURATION_OPTIONS: SelectOption[] = [
  { value: "6 Months", label: "6 Months" },
  { value: "12 Months", label: "12 Months" },
  { value: "24 Months", label: "24 Months" },
  { value: "36 Months", label: "36 Months" },
];

const MAX_SITE_NAME_FIELDS = 8;
const MAX_ATTACHMENT_SIZE_MB = 10;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const quotationFormSchema = z.object({
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

  optionalServices: z.array(z.string()).optional(),

  implementationRequirements: z.string().trim().optional(),

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

type QuotationFormData = z.infer<typeof quotationFormSchema>;

const DEFAULT_VALUES: QuotationFormData = {
  quotationType: "",
  numberOfSites: "",
  siteNames: [{ name: "" }],
  activeMachines: "",
  equipmentTypes: [],
  contractDuration: "",
  optionalServices: [],
  implementationRequirements: "",
  additionalRequirements: "",
  attachment: undefined,
};

// ---------------------------------------------------------------------------
// Custom Select
// ---------------------------------------------------------------------------

function AppSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
}: {
  value: string;
  onChange: (value: string) => void;
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

  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition focus:outline-none focus:ring-4 ${
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
        }`}
      >
        <span
          className={`truncate ${selectedLabel ? "text-slate-900" : "text-slate-400"}`}
        >
          {selectedLabel || placeholder}
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
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
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
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition focus:outline-none focus:ring-4 ${
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
        }`}
      >
        <span
          className={`truncate ${
            selectedLabels.length ? "text-slate-900" : "text-slate-400"
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
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
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
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300"
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
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach PDF
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />

          <span className="truncate font-medium text-slate-700">
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
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition hover:text-slate-700"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <span className="shrink-0 text-[11px] text-slate-400">Optional</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submit status banner — always driven by the backend's own message,
// for every outcome (success or error), no hardcoded per-case copy.
// ---------------------------------------------------------------------------

interface SubmitStatus {
  outcome: "success" | "error";
  message: string;
}

function StatusBanner({ status }: { status: SubmitStatus }) {
  const isError = status.outcome === "error";
  const Icon = isError ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isError
          ? "border-red-200 bg-red-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <Icon
        size={18}
        strokeWidth={2}
        className={
          isError
            ? "mt-0.5 shrink-0 text-red-600"
            : "mt-0.5 shrink-0 text-emerald-600"
        }
      />

      <p
        className={`text-sm font-medium leading-5 ${
          isError ? "text-red-700" : "text-emerald-700"
        }`}
      >
        {status.message}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quotation Request Form
// ---------------------------------------------------------------------------

interface QuotationRequestFormProps {
  /** Called after a successful submission, with the created request's ID. */
  onSuccess?: (requestId: string) => void;

  /**
   * Rendered as a close (X) button in the header when provided. Pass this
   * when the form is embedded inside a modal/dialog so the person can
   * dismiss it without submitting. When omitted, no close button is
   * rendered and the form behaves as a standalone page section.
   */
  onClose?: () => void;
}

export default function QuotationRequestForm({
  onSuccess,
  onClose,
}: QuotationRequestFormProps) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

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

  // Close on Escape (only when the form is being used as a dismissible
  // modal, i.e. onClose was passed in).
  useEffect(() => {
    if (!onClose) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const onSubmit = async (data: QuotationFormData) => {
    setSubmitStatus(null);

    // BACKEND TODO: the attachment (data.attachment) is captured in the UI
    // but is NOT sent below — createQuotationRequest posts JSON, and the
    // backend has not exposed a multipart/file-upload endpoint for
    // quotation attachments yet. Wire this once that endpoint exists.

    const payload: CreateQuotationRequestPayload = {
      companyId: "",
      quotationType: data.quotationType,
      numberOfSites: Number(data.numberOfSites),
      siteNames: data.siteNames.map((site) => site.name),
      activeMachines: Number(data.activeMachines),
      equipmentTypes: data.equipmentTypes,
      contractDuration: data.contractDuration,
      optionalServices:
        data.optionalServices && data.optionalServices.length > 0
          ? data.optionalServices
          : undefined,
      implementationRequirements:
        data.implementationRequirements &&
        data.implementationRequirements.length > 0
          ? data.implementationRequirements
          : undefined,
      additionalRequirements:
        data.additionalRequirements && data.additionalRequirements.length > 0
          ? data.additionalRequirements
          : undefined,
    };

    try {
      const created = await createQuotationRequest(payload);
      const createdRequest = created?.data;
      const requestId = createdRequest?.requestId ?? createdRequest?.id ?? "";

      setSubmitStatus({
        outcome: "success",
        message: requestId
          ? `Quotation request ${requestId} submitted successfully.`
          : "Quotation request submitted successfully.",
      });

      showSuccessToast(
        created?.message ||
          (requestId
            ? `Quotation request ${requestId} submitted successfully.`
            : "Quotation request submitted successfully."),
        { duration: 4000 },
      );

      reset(DEFAULT_VALUES);

      if (onSuccess && requestId) {
        onSuccess(requestId);
      }
    } catch (requestError: unknown) {
  const message = extractApiError(requestError);

  if (!message) {
    return;
  }

  setSubmitStatus({
    outcome: "error",
    message,
  });

  showErrorToast(message, { duration: 5000 });
}
  };

  return (
    <div className="w-full min-w-0 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Request a Quotation
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Tell us about your fleet and requirements.
          </p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quotation form"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {submitStatus !== null ? <StatusBanner status={submitStatus} /> : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full min-w-0"
      >
        <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {/* Quotation Type */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              1. Quotation Type *
            </label>

            <Controller
              name="quotationType"
              control={control}
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={QUOTATION_TYPE_OPTIONS}
                  placeholder="Select quotation type"
                  error={Boolean(errors.quotationType)}
                />
              )}
            />

            <div className="min-h-[20px] pt-1">
              {errors.quotationType?.message && (
                <p className="text-xs leading-5 text-red-500">
                  {errors.quotationType.message}
                </p>
              )}
            </div>
          </div>

          {/* Number of Sites */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              2. Number of Sites *
            </label>

            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 2"
              className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                errors.numberOfSites
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
              }`}
              {...register("numberOfSites")}
            />

            <div className="min-h-[20px] pt-1">
              {errors.numberOfSites?.message && (
                <p className="text-xs leading-5 text-red-500">
                  {errors.numberOfSites.message}
                </p>
              )}
            </div>
          </div>

          {/* Site Names */}

          <div className="flex min-w-0 flex-col sm:col-span-2">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              3. Site Name(s) *
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {siteNameFields.map((field, index) => (
                <div key={field.id} className="relative">
                  <input
                    type="text"
                    placeholder={`Site ${index + 1} Name`}
                    className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                      siteNameFields.length > 1 ? "pr-9" : ""
                    } ${
                      (errors.siteNames as any)?.[index]?.name?.message
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
                    }`}
                    {...register(`siteNames.${index}.name` as const)}
                  />

                  {siteNameFields.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove site"
                      onClick={() => removeSiteName(index)}
                      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
              className="mt-2.5 inline-flex w-fit items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add More
            </button>

            <div className="min-h-[20px] pt-1">
              {siteNameArrayError && (
                <p className="text-xs leading-5 text-red-500">
                  {siteNameArrayError}
                </p>
              )}
            </div>
          </div>

          {/* Active Machines */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              4. Number of Active Machines *
            </label>

            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter number of active machines"
              className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                errors.activeMachines
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/10"
              }`}
              {...register("activeMachines")}
            />

            <div className="min-h-[20px] pt-1">
              {errors.activeMachines?.message && (
                <p className="text-xs leading-5 text-red-500">
                  {errors.activeMachines.message}
                </p>
              )}
            </div>
          </div>

          {/* Equipment Types */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              5. Fleet / Equipment Types *
            </label>

            <Controller
              name="equipmentTypes"
              control={control}
              render={({ field }) => (
                <AppMultiSelect
                  values={field.value}
                  onChange={field.onChange}
                  options={EQUIPMENT_TYPE_OPTIONS}
                  placeholder="Select equipment types"
                  error={Boolean(errors.equipmentTypes)}
                />
              )}
            />

            <div className="min-h-[20px] pt-1">
              {errors.equipmentTypes?.message && (
                <p className="text-xs leading-5 text-red-500">
                  {errors.equipmentTypes.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Contract Duration */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              6. Preferred Contract Duration *
            </label>

            <Controller
              name="contractDuration"
              control={control}
              render={({ field }) => (
                <AppSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={CONTRACT_DURATION_OPTIONS}
                  placeholder="Select contract duration"
                  error={Boolean(errors.contractDuration)}
                />
              )}
            />

            <div className="min-h-[20px] pt-1">
              {errors.contractDuration?.message && (
                <p className="text-xs leading-5 text-red-500">
                  {errors.contractDuration.message}
                </p>
              )}
            </div>
          </div>

          {/* Optional Services */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              7. Optional Services
            </label>

            <Controller
              name="optionalServices"
              control={control}
              render={({ field }) => (
                <AppMultiSelect
                  values={field.value ?? []}
                  onChange={field.onChange}
                  options={OPTIONAL_SERVICE_OPTIONS}
                  placeholder="Select optional services"
                />
              )}
            />

            <div className="min-h-[20px] pt-1" />
          </div>

          {/* Implementation Requirements */}

          <div className="flex min-w-0 flex-col">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              8. Implementation Requirements
            </label>

            <textarea
              rows={3}
              placeholder="Describe your implementation, setup, integration or deployment requirements..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              {...register("implementationRequirements")}
            />

            <div className="min-h-[10px] pt-1" />
          </div>

          {/* Additional Requirements + Attachment */}

          <div className="flex min-w-0 flex-col sm:col-span-2">
            <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              9. Additional Requirements
            </label>

            <div
              className={`w-full rounded-lg border bg-white transition focus-within:ring-4 ${
                errors.attachment
                  ? "border-red-500 focus-within:ring-red-500/20"
                  : "border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-500/10"
              }`}
            >
              <textarea
                rows={3}
                placeholder="Enter any additional requirements or special requests..."
                className="w-full resize-none rounded-t-lg border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                {...register("additionalRequirements")}
              />

              <div className="flex items-center border-t border-slate-100 px-3.5 py-2">
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

        {/* Footer */}

        <div className="mt-2 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? "Submitting..." : "Submit Quotation Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
