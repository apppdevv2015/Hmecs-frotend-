import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import PhoneField from "./PhoneField";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";

import { authService } from "../../services/Auth/authService";

import { showLoadingToast, updateToast } from "../../utils/toastUtils";

import {
  Building2,
  User,
  Mail,
  MapPin,
  Lock,
  ChevronDown,
  Check,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Send,
  ShieldCheck,
  Paperclip,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

const QUOTATION_TYPE_OPTIONS: SelectOption[] = [
  { value: "trial", label: "Free Trial (14 Days)" },
  { value: "quotation", label: "Commercial Quotation" },
  { value: "enterprise", label: "Custom / Enterprise Quotation" },
];

const SITE_COUNT_OPTIONS: SelectOption[] = [
  { value: "1", label: "1 Site" },
  { value: "2-5", label: "2 – 5 Sites" },
  { value: "6-10", label: "6 – 10 Sites" },
  { value: "11-25", label: "11 – 25 Sites" },
  { value: "25+", label: "25+ Sites" },
];

const EQUIPMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "excavators", label: "Excavators" },
  { value: "dump_trucks", label: "Dump Trucks" },
  { value: "bulldozers", label: "Bulldozers" },
  { value: "loaders", label: "Loaders" },
  { value: "graders", label: "Graders" },
  { value: "drilling_rigs", label: "Drilling Rigs" },
  { value: "crushers", label: "Crushers" },
  { value: "conveyors", label: "Conveyors" },
  { value: "cranes", label: "Cranes" },
  { value: "other", label: "Other" },
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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const companyDetailsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),

  contactPerson: z
    .string()
    .trim()
    .min(1, "Contact person is required")
    .min(2, "Contact person must be at least 2 characters"),

  email: z
    .string()
    .trim()
    .min(1, "Company email is required")
    .email("Please enter a valid email address"),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10 digit phone number"),

  siteLocation: z.string().trim().min(1, "Site / Location is required"),

  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),
});

const quotationSchema = z.object({
  quotationType: z.string().min(1, "Please select a quotation type"),

  numberOfSites: z.string().min(1, "Please select number of sites"),

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

const signUpSchema = companyDetailsSchema.merge(quotationSchema);

type SignUpFormData = z.infer<typeof signUpSchema>;

const STEP_ONE_FIELDS = [
  "companyName",
  "contactPerson",
  "email",
  "phone",
  "siteLocation",
  "password",
] as const;

// ---------------------------------------------------------------------------
// Backend response contract (register API)
//
// Confirmed shape from POST /register (2026-08-26):
// {
//   success: boolean,
//   message: string,
//   data: {
//     company: { id, companyCode, name, subscriptionStatus, createdAt, updatedAt },
//     user: { id, email, firstName, lastName, mobileNumber, isActive, companyId, role, createdAt, updatedAt }
//   },
//   error: string | null,
//   timestamp: string
// }
//
// NOTE: No token is returned on register. A newly registered user comes
// back with isActive: false and the company with subscriptionStatus:
// "pending" — the account is not authenticated/usable immediately after
// signup (it likely needs activation/approval). Do NOT attempt to log the
// user in or store auth/session data from this response.
// ---------------------------------------------------------------------------

interface RegisterApiCompany {
  id: string;
  companyCode: string;
  name: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface RegisterApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  isActive: boolean;
  companyId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface RegisterApiResponse {
  success: boolean;
  message: string;
  data: {
    company: RegisterApiCompany;
    user: RegisterApiUser;
  };
  error: string | null;
  timestamp: string;
}

const isRegisterApiResponse = (value: unknown): value is RegisterApiResponse => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<RegisterApiResponse>;

  return (
    typeof candidate.success === "boolean" &&
    typeof candidate.data === "object" &&
    candidate.data !== null &&
    typeof candidate.data.company === "object" &&
    typeof candidate.data.user === "object"
  );
};

const getApiErrorMessage = (error: unknown): string => {
  const defaultMessage = "Signup failed. Please try again.";

  if (!(error instanceof Error) || !error.message) {
    return defaultMessage;
  }

  const message = error.message.toLowerCase();

  const blockedWords = [
    "select",
    "insert",
    "update",
    "delete",
    "relation",
    "sql",
    "database",
    "users",
    "roles",
    "companies",
    "join",
    "where",
    "limit",
    "constraint",
    "violates",
  ];

  const isBackendError = blockedWords.some((word) => message.includes(word));

  return isBackendError ? defaultMessage : error.message;
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
        className={`flex h-11 w-full items-center justify-between rounded-lg border bg-white px-3.5 text-sm transition focus:outline-none focus:ring-4 dark:bg-slate-900 ${
          error
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
        : `${selectedLabels.length} types selected`;

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
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2.5 sm:justify-start sm:gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            step === 1
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          }`}
        >
          {step > 1 ? <Check className="h-3.5 w-3.5" /> : 1}
        </span>

        <span
          className={`text-xs font-bold sm:text-sm ${
            step === 1
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Company Details
        </span>
      </div>

      <div
        className={`h-[2px] w-8 shrink-0 rounded-full transition-colors sm:w-16 ${
          step === 2 ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
        }`}
      />

      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            step === 2
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
          }`}
        >
          2
        </span>

        <span
          className={`text-xs font-bold sm:text-sm ${
            step === 2
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          Request a Quotation
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signup Card — Props
// ---------------------------------------------------------------------------

interface SignupCardProps {
  /**
   * Rendered as a close (X) button next to the step indicator when
   * provided. Pass this when SignupCard is embedded inside a modal/dialog.
   * When omitted, no close button is rendered and the card behaves as a
   * standalone page section (e.g. on a full /signup route).
   */
  onClose?: () => void;

  /**
   * Called after a successful registration, with the created company and
   * user data from the API. Use this when SignupCard is embedded (e.g.
   * inside an admin "Add User" modal) so the parent can close the modal
   * and refresh its own list, without the whole app navigating away.
   *
   * When omitted, the component falls back to its standalone behavior:
   * redirecting to /signin after a short delay.
   */
  onSuccess?: (result: { company: RegisterApiCompany; user: RegisterApiUser }) => void;
}

// ---------------------------------------------------------------------------
// Signup Card
// ---------------------------------------------------------------------------

export default function SignupCard({ onClose, onSuccess }: SignupCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    new URLSearchParams(location.search).get("redirect") || "/cart";

  const signinRedirectPath = `/signin?redirect=${encodeURIComponent(
    redirectTo,
  )}`;

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const {
    control,
    register,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),

    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      siteLocation: "",
      password: "",
      quotationType: "",
      numberOfSites: "",
      siteNames: [{ name: "" }],
      activeMachines: "",
      equipmentTypes: [],
      contractDuration: "",
      implementationRequirements: "",
      additionalRequirements: "",
      attachment: undefined,
    },

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

  // -------------------------------------------------------------------------
  // Close on Escape (only when the card is being used as a dismissible modal)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!onClose) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // -------------------------------------------------------------------------
  // Step Navigation
  // -------------------------------------------------------------------------

  const handleNext = async () => {
    const isStepValid = await trigger(STEP_ONE_FIELDS);

    if (isStepValid) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleStepOneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleNext();
    }
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const onSubmit = async (data: SignUpFormData) => {
    // Safety net: the real submit button only exists on Step 2. If this
    // somehow fires while on Step 1, advance instead of submitting
    // incomplete/unvalidated Step 2 data.
    if (step !== 2) {
      handleNext();
      return;
    }

    const toastId = "signup-loading";

    showLoadingToast("Creating account...", { id: toastId });

    try {
      const contactParts = data.contactPerson.trim().split(/\s+/);
      const firstName = contactParts[0] || "";
      const lastName = contactParts.slice(1).join(" ") || firstName;

      const response = await authService.register({
        company_name: data.companyName.trim(),
        fname: firstName,
        lname: lastName,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        mobile_number: data.phone.trim(),
      });

      if (!isRegisterApiResponse(response)) {
        throw new Error(
          "Unexpected response from server. Please try again.",
        );
      }

      if (!response.success) {
        throw new Error(response.message || "Registration failed");
      }

      const { company, user } = response.data;

      // IMPORTANT: the register API does not return an auth token, and a
      // newly created user comes back with isActive: false (company
      // subscriptionStatus: "pending"). The account is not usable/logged-in
      // immediately after signup — it requires activation first. We
      // therefore do NOT store any token/role/user session data here, to
      // avoid corrupting whichever session is currently active in this
      // browser (e.g. a Super Admin creating this account on someone
      // else's behalf).

      updateToast(
        toastId,
        response.message || "Account created successfully",
        "success",
      );

      if (onSuccess) {
        // Embedded usage (e.g. inside an admin modal): let the parent
        // decide what happens next instead of forcing a redirect.
        onSuccess({ company, user });
      } else {
        // Standalone usage (e.g. full /signup page): send the person to
        // sign in once their account is activated.
        setTimeout(() => {
          navigate("/signin", { replace: true });
        }, 700);
      }
    } catch (error) {
      console.error("Signup API Error:", error);

      const message = getApiErrorMessage(error);

      if (message.toLowerCase().includes("password")) {
        setError("password", { type: "server", message });
      } else {
        setError("email", { type: "server", message });
      }

      updateToast(toastId, message, "error");
    }
  };

  return (
    <div className="relative w-full overflow-visible rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        {/* ================================================================
            LEFT INFORMATION PANEL
        ================================================================= */}

        <section className="hidden min-w-0 flex-col justify-center border-b border-slate-200 bg-slate-50/90 p-8 dark:border-slate-800 dark:bg-slate-800/60 lg:flex lg:border-b-0 lg:border-r lg:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white shadow-lg shadow-blue-600/30">
            H
          </div>

          <h2 className="mt-6 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">
            Start your HME account
          </h2>

          <p className="mt-4 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">
            Create your mining company account and manage fleet, maintenance,
            alerts, and reports in one place.
          </p>

          <div className="mt-7 space-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            <p>✓ Fleet &amp; Machine Tracking</p>
            <p>✓ Maintenance Planning</p>
            <p>✓ Alert Monitoring</p>
            <p>✓ Offline-first system</p>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              HME Component Intelligence
            </p>

            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Start with your company details and continue to the limited
              company portal.
            </p>
          </div>
        </section>

        {/* ================================================================
            RIGHT REGISTRATION PANEL
        ================================================================= */}

        <section className="min-w-0 p-5 sm:p-7 lg:p-8 xl:px-10 xl:py-9">
          {/* Header row: step indicator (left) + close affordance (right) */}
          <div className="flex items-start justify-between gap-4">
            <StepIndicator step={step} />

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close signup form"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 dark:border-slate-800" />

          <div className="mb-5 mt-5 text-center lg:text-left">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {step === 1 ? "Create Account" : "Request a Quotation"}
            </h1>

            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {step === 1
                ? "Enter your company details"
                : "Provide details about your requirements."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="w-full min-w-0"
          >
            {/* ============================================================
                STEP 1 - COMPANY DETAILS
            ============================================================= */}

            {step === 1 && (
              <div onKeyDown={handleStepOneKeyDown}>
                <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {/* Company Name */}

                  <div className="flex min-w-0 flex-col">
                    <Label>Company Name *</Label>

                    <div className="relative mt-1">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <Input
                        placeholder="ABC Mining Pvt Ltd"
                        autoComplete="organization"
                        className={`w-full pl-10 ${
                          errors.companyName
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : ""
                        }`}
                        {...register("companyName", {
                          setValueAs: (value) => value.trim(),
                          onChange: () => {
                            if (errors.companyName) {
                              clearErrors("companyName");
                            }
                          },
                        })}
                      />
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.companyName?.message && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.companyName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Person */}

                  <div className="flex min-w-0 flex-col">
                    <Label>Contact Person *</Label>

                    <div className="relative mt-1">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <Input
                        placeholder="John Doe"
                        autoComplete="name"
                        className={`w-full pl-10 ${
                          errors.contactPerson
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : ""
                        }`}
                        {...register("contactPerson", {
                          setValueAs: (value) => value.trim(),
                          onChange: () => {
                            if (errors.contactPerson) {
                              clearErrors("contactPerson");
                            }
                          },
                        })}
                      />
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.contactPerson?.message && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.contactPerson.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}

                  <div className="flex min-w-0 flex-col">
                    <Label>Email Address *</Label>

                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <Input
                        type="email"
                        placeholder="company@email.com"
                        autoComplete="email"
                        className={`w-full pl-10 ${
                          errors.email
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : ""
                        }`}
                        {...register("email", {
                          setValueAs: (value) => value.trim().toLowerCase(),
                          onChange: () => {
                            if (errors.email) {
                              clearErrors("email");
                            }
                          },
                        })}
                      />
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.email?.message && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}

                  <div className="relative z-30 min-w-0">
                    <Label>Phone Number *</Label>

                    <div className="relative z-50 mt-1 w-full min-w-0 overflow-visible">
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                          <PhoneField
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              if (errors.phone) {
                                clearErrors("phone");
                              }
                            }}
                            error={undefined}
                            label=""
                            defaultCountry="IN"
                          />
                        )}
                      />
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.phone && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Site / Location */}

                  <div className="flex min-w-0 flex-col">
                    <Label>Site / Location *</Label>

                    <div className="relative mt-1">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <Input
                        placeholder="Iron Valley Mine"
                        autoComplete="street-address"
                        className={`w-full pl-10 ${
                          errors.siteLocation
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : ""
                        }`}
                        {...register("siteLocation", {
                          setValueAs: (value) => value.trim(),
                          onChange: () => {
                            if (errors.siteLocation) {
                              clearErrors("siteLocation");
                            }
                          },
                        })}
                      />
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.siteLocation?.message && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.siteLocation.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password */}

                  <div className="flex min-w-0 flex-col">
                    <Label>Password *</Label>

                    <div className="relative mt-1">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter strong password"
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-12 ${
                          errors.password
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                            : ""
                        }`}
                        {...register("password", {
                          onChange: () => {
                            if (errors.password) {
                              clearErrors("password");
                            }
                          },
                        })}
                      />

                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        {showPassword ? (
                          <EyeIcon className="h-5 w-5 fill-current" />
                        ) : (
                          <EyeCloseIcon className="h-5 w-5 fill-current" />
                        )}
                      </button>
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.password?.message && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 1 Footer */}

                <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:justify-start">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                    Your information is secure and encrypted
                  </p>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 sm:w-auto"
                  >
                    Next Step
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                STEP 2 - REQUEST A QUOTATION
            ============================================================= */}

            {step === 2 && (
              <div>
                <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {/* Quotation Type */}

                  <div className="flex min-w-0 flex-col">
                    <Label>1. Quotation Type *</Label>

                    <div className="mt-1">
                      <Controller
                        name="quotationType"
                        control={control}
                        render={({ field }) => (
                          <AppSelect
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              if (errors.quotationType) {
                                clearErrors("quotationType");
                              }
                            }}
                            options={QUOTATION_TYPE_OPTIONS}
                            placeholder="Select quotation type"
                            error={Boolean(errors.quotationType)}
                          />
                        )}
                      />
                    </div>

                    <div className="min-h-[34px] pt-1">
                      {errors.quotationType?.message && (
                        <p className="text-xs leading-5 text-red-500">
                          {errors.quotationType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Number of Sites */}

                  <div className="flex min-w-0 flex-col">
                    <Label>2. Number of Sites *</Label>

                    <div className="mt-1">
                      <Controller
                        name="numberOfSites"
                        control={control}
                        render={({ field }) => (
                          <AppSelect
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              if (errors.numberOfSites) {
                                clearErrors("numberOfSites");
                              }
                            }}
                            options={SITE_COUNT_OPTIONS}
                            placeholder="Select number of sites"
                            error={Boolean(errors.numberOfSites)}
                          />
                        )}
                      />
                    </div>

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
                          if (errors.activeMachines) {
                            clearErrors("activeMachines");
                          }
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
                              if (errors.equipmentTypes) {
                                clearErrors("equipmentTypes");
                              }
                            }}
                            options={EQUIPMENT_TYPE_OPTIONS}
                            placeholder="Select equipment types"
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
                              if (errors.contractDuration) {
                                clearErrors("contractDuration");
                              }
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
                              onChange={(file) =>
                                field.onChange(file ?? undefined)
                              }
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

                {/* Step 2 Footer */}

                <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
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
              </div>
            )}
          </form>

          {/* Sign In */}

          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                to={signinRedirectPath}
                className="font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}