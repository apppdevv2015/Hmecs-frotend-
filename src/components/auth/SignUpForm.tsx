import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import PhoneField from "../common/PhoneField";
import { zodResolver } from "@hookform/resolvers/zod";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { authService } from "../../services/Auth/authService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import {
  createQuotationRequest,
  extractApiError,
} from "../../services/Quotation/quotationService";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";

import { showLoadingToast, updateToast } from "../../utils/toastUtils";
import {
  getPublicOptionalServices,
  getEquipmentTypes,
  getOptionalServices,
  type OptionalService,
} from "../../services/SuperAdmin/optionalService";
import { submitQuotationRequest } from "../../services/SuperAdmin/quotationInquiryService";

import {
  signUpSchema,
  STEP_ONE_FIELDS,
  type SignUpFormData,
} from "../../components/common/FormValidation";
import PdfAttachment from "../../components/common/PdfAttachment";


import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

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
} from "lucide-react";

// ---------------------------------------------------------------------------
// Options for the Step 2 (Request a Quotation) dropdowns.
// BACKEND TODO: source these from the pricing/quotation config API once it
// exists — hardcoded here for now since there is no quotation API yet.
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

const QUOTATION_TYPE_OPTIONS: SelectOption[] = [
  { value: "implementation_fee", label: "Once-Off Implementation Fee" },
  { value: "monthly_licence", label: "Fixed Monthly Site Licence" },
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

const OPTIONAL_SERVICE_OPTIONS: SelectOption[] = [
  {
    value: "telematics_ecu_integration",
    label: "Telematics / ECU Integration",
  },
  {
    value: "historical_data_migration_cleaning",
    label: "Historical Data Migration & Cleaning",
  },
  {
    value: "custom_api_development",
    label: "Custom API Development",
  },
  {
    value: "sap_erp_integration",
    label: "SAP / ERP Integration",
  },
  {
    value: "additional_training",
    label: "Additional Training",
  },
  {
    value: "sms_whatsapp_notifications",
    label: "SMS / WhatsApp Notifications",
  },
  {
    value: "custom_reports",
    label: "Custom Reports",
  },
  {
    value: "on_site_technical_support",
    label: "On-site Technical Support",
  },
];

const CONTRACT_DURATION_OPTIONS: SelectOption[] = [
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "36 Months" },
  { value: "custom", label: "Custom" },
];

const MAX_SITE_NAME_FIELDS = 8;

// BACKEND TODO: confirm max upload size allowed by the quotation API once it
// exists — kept generous for now since there is no endpoint to validate against.
// ---------------------------------------------------------------------------
// Reusable custom dropdowns (NOT native <select> elements) — styled to match
// the rest of the form and used for every dropdown field on this page.
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator (Company Details -> Request a Quotation)
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

export default function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const routerState = location.state as {
    quotationType?: string;
    quotationTypeLabel?: string;
  } | null;

  const preselectedQuotationType = routerState?.quotationType;
  const preselectedQuotationTypeLabel = routerState?.quotationTypeLabel;

  const [active, setActive] = useState("");


  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);


  const [equipmentTypeOptions, setEquipmentTypeOptions] =
    useState<SelectOption[]>(EQUIPMENT_TYPE_OPTIONS);
  const [optionalServiceOptions, setOptionalServiceOptions] =
    useState<SelectOption[]>(OPTIONAL_SERVICE_OPTIONS);
  const [isLoadingDynamicOptions, setIsLoadingDynamicOptions] = useState(false);

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
          Array.isArray(equipmentsRes.value) &&
          equipmentsRes.value.length > 0
        ) {
          const mappedEquipments: SelectOption[] = equipmentsRes.value.map(
            (item: any) => {
              if (typeof item === "string") {
                return { value: item, label: item };
              }
              const name =
                item.name || item.category || item.label || String(item);
              return { value: name, label: name };
            },
          );
          if (isMounted && mappedEquipments.length > 0) {
            setEquipmentTypeOptions(mappedEquipments);
          }
        }

        if (
          servicesRes.status === "fulfilled" &&
          Array.isArray(servicesRes.value) &&
          servicesRes.value.length > 0
        ) {
          const mappedServices: SelectOption[] = servicesRes.value.map(
            (item: any) => {
              const val = item.name || item.id || item.value;
              const lbl = item.name || item.label || val;
              return { value: val, label: lbl };
            },
          );
          if (isMounted && mappedServices.length > 0) {
            setOptionalServiceOptions(mappedServices);
          }
        }
      } catch (err) {
        console.warn(
          "Failed to load dynamic quotation options, using fallback:",
          err,
        );
      } finally {
        if (isMounted) setIsLoadingDynamicOptions(false);
      }
    };

    loadDynamicOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    control,
    register,
    handleSubmit,
    trigger,
    clearErrors,
    watch,
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
      quotationType: preselectedQuotationType ?? "",
      numberOfSites: "",
      siteNames: [{ name: "" }],
      activeMachines: "",
      equipmentTypes: [],
      contractDuration: "",
      customContractDuration: "",
      implementationRequirements: "",
      optionalServices: [],
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
    errors.siteNames as { message?: string }
  )?.message;

  const contractDurationValue = watch("contractDuration");

  const handleNext = async () => {
    const isStepValid = await trigger(STEP_ONE_FIELDS);
    if (isStepValid) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  // Enter key inside Step 1 should advance to Step 2, not submit the form.
  const handleStepOneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleNext();
    }
  };

  const onSubmit = async (data: SignUpFormData) => {
    // The final submit action is available only on Step 2.
    if (step !== 2) {
      await handleNext();
      return;
    }

    try {
      // --------------------------------------------------
      // 1. Register the company/user
      // --------------------------------------------------

      const contactParts = data.contactPerson.trim().split(/\\s+/);
      const firstName = contactParts[0] || "";
      const lastName = contactParts.slice(1).join(" ") || firstName;

      const registerResponse = await authService.register({
        company_name: data.companyName.trim(),
        fname: firstName,
        lname: lastName,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        mobile_number: data.phone.trim(),
      });

      const registerData =
        (registerResponse as any)?.data ??
        registerResponse;

      const registrationMessage =
        (typeof registerData?.message === "string" && registerData.message.trim()) ||
        (typeof (registerResponse as any)?.message === "string" && (registerResponse as any).message.trim()) ||
        "";

      if (registrationMessage) {
        showSuccessToast(registrationMessage, { duration: 4000 });
      }

      const token =
        registerData?.token ||
        registerData?.accessToken ||
        registerData?.access_token;

      // A freshly created account is not an active authenticated session yet.
      // Clear any token/session state from the browser so the user lands on the
      // login page instead of getting redirected into a protected dashboard route.
      StorageService.remove(STORAGE_KEYS.TOKEN);
      StorageService.remove(STORAGE_KEYS.USER);
      StorageService.remove(STORAGE_KEYS.ROLE);
      StorageService.remove(STORAGE_KEYS.EMAIL);
      StorageService.remove(STORAGE_KEYS.NAME);
      StorageService.remove(STORAGE_KEYS.COMPANY_ID);

      const createdCompanyId =
        registerResponse?.data?.company?.id ||
        registerResponse?.company?.id ||
        user?.companyId ||
        user?.company_id;

      const createdUserId =
        registerResponse?.data?.user?.id ||
        registerResponse?.user?.id ||
        user?.id;

      const normalizedRole = "company_admin";
      const finalUser = {
        id: createdUserId,
        role: normalizedRole,
        role_name: "Admin",
        companyId: createdCompanyId,
        isActive: false,
        email: data.email.trim().toLowerCase(),
        name: data.contactPerson.trim(),
        companyName: data.companyName.trim(),
        company: data.companyName.trim(),
      };

      if (token) {
        console.warn("Registration returned a token, but signup flow intentionally clears it so the user must login manually.");
      }

      StorageService.set(STORAGE_KEYS.ROLE, normalizedRole);
      StorageService.set(STORAGE_KEYS.USER, finalUser);
      StorageService.set(STORAGE_KEYS.EMAIL, finalUser.email);
      StorageService.set(STORAGE_KEYS.NAME, finalUser.name);
      if (createdCompanyId) {
        StorageService.set(STORAGE_KEYS.COMPANY_ID, createdCompanyId);
      }

      // Submit Quotation Request Details to Backend Database
      try {
        await submitQuotationRequest({
          companyName: data.companyName.trim(),
          contactPerson: data.contactPerson.trim(),
          email: data.email.trim().toLowerCase(),
          phone: data.phone.trim(),
          siteLocation: data.siteLocation?.trim(),
          quotationType: data.quotationType,
          numberOfSites: Number(data.numberOfSites) || 1,
          siteNames:
            data.siteNames?.map((s) => s.name).filter(Boolean) || [],
          activeMachines: Number(data.activeMachines) || 1,
          equipmentTypes: data.equipmentTypes || [],
          contractDuration: data.contractDuration,
          optionalServices: data.optionalServices || [],
          implementationRequirements:
            data.implementationRequirements?.trim(),
          additionalRequirements: data.additionalRequirements?.trim(),
          companyId: createdCompanyId,
          userId: createdUserId,
        });
      } catch (quotationErr) {
        console.warn("Quotation inquiry submission notice:", quotationErr);
      }

      updateToast(
        toastId,
        "Quotation request submitted successfully! Redirecting to company portal...",
        "success",
      );

      setTimeout(() => {
        window.location.href = "/company-admin/dashboard";
      }, 1000);


      // --------------------------------------------------
      // 3. Build quotation request payload
      // --------------------------------------------------

      const quotationPayload = {
        companyId: registerData?.company?.id || registerData?.companyId || null,
        userId: registerData?.user?.id || registerData?.userId || null,
        companyName: (registerData?.company?.name || data.companyName.trim()).trim(),
        contactPerson: data.contactPerson.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        quotationType: data.quotationType.trim(),
        numberOfSites: Number.parseInt(data.numberOfSites, 10),
        siteNames: data.siteNames
          .map((site) => site.name.trim())
          .filter(Boolean),
        activeMachines: Number(data.activeMachines),
        equipmentTypes: data.equipmentTypes,
        contractDuration:
          data.contractDuration === "custom"
            ? data.customContractDuration?.trim() || ""
            : data.contractDuration,
        optionalServices: data.optionalServices ?? [],
        implementationRequirements:
          data.implementationRequirements?.trim() || "",
        additionalRequirements: data.additionalRequirements?.trim() || "",
      };

      // --------------------------------------------------
      // 4. Submit quotation request
      // --------------------------------------------------

      await createQuotationRequest(quotationPayload);

      navigate("/signin", { replace: true });

    } catch (error) {
      const errorMessage = extractApiError(error);
      if (errorMessage) {
        showErrorToast(errorMessage, { duration: 5000 });
      }
      console.error("Signup/Quotation API Error:", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-[90px] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar active={active} setActive={setActive} />

      <main
        className="relative flex min-h-[calc(100vh-90px)] items-center justify-center overflow-x-hidden bg-cover bg-center bg-no-repeat px-3 py-8 sm:px-5 lg:px-8"
        style={{
          backgroundImage: "url('/signin-bg.jpg')",
        }}
      >
        {/* Background overlay */}
        <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] dark:bg-slate-950/70" />

        <div className="absolute left-0 top-32 h-48 w-48 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

        {/* Registration card */}
        <div className="relative z-10 w-full max-w-6xl overflow-visible rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/15 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left information panel */}
            <section className="hidden min-w-0 flex-col justify-center border-b border-slate-200 bg-slate-50/90 p-8 dark:border-slate-800 dark:bg-slate-800/60 lg:flex lg:border-b-0 lg:border-r lg:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white shadow-lg shadow-blue-600/30">
                H
              </div>

              <h2 className="mt-6 text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">
                Start your HME account
              </h2>

              <p className="mt-4 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">
                Create your mining company account and manage fleet,
                maintenance, alerts, and reports in one place.
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

            {/* Right registration panel */}
            <section className="min-w-0 p-5 sm:p-7 lg:p-8 xl:px-10 xl:py-9">
              {/* Step indicator */}
              <StepIndicator step={step} />
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
                {/* -------------------- STEP 1: Company Details -------------------- */}
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

                {/* -------------------- STEP 2: Request a Quotation -------------------- */}
                {step === 2 && (
                  <div>
                    <div className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">


                                          {/* Quotation Type */}
                      <div className="flex min-w-0 flex-col sm:col-span-2">
                        <Label>1. Quotation Type *</Label>

                        {preselectedQuotationTypeLabel ? (
                          <div className="mt-1 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 dark:border-blue-500/20 dark:bg-blue-500/10">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                Selected Plan
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {preselectedQuotationTypeLabel}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                navigate("/signup", { replace: true, state: null })
                              }
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
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
                        )}

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
                              if (errors.numberOfSites) {
                                clearErrors("numberOfSites");
                              }
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

                      {/* Site Name(s) */}
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
                                  (errors.siteNames as any)?.[index]?.name
                                    ?.message
                                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                    : ""
                                }`}
                                {...register(
                                  `siteNames.${index}.name` as const,
                                  {
                                    setValueAs: (value) => value.trim(),
                                  },
                                )}
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
                          disabled={
                            siteNameFields.length >= MAX_SITE_NAME_FIELDS
                          }
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

                      {/* Number of Active Machines */}
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

                      {/* Fleet / Equipment Types */}
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
                                options={equipmentTypeOptions}
                                placeholder={
                                  isLoadingDynamicOptions
                                    ? "Loading equipment types..."
                                    : "Select equipment types"
                                }
                                error={Boolean(errors.equipmentTypes)}

                                values={field.value || []}
                                onChange={(values) => field.onChange(values)}
                                options={optionalServiceOptions}
                                placeholder="Select optional services"

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

                                           {/* Preferred Contract Duration */}
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

                        {contractDurationValue === "custom" && (
                          <div className="mt-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Enter number of months"
                              className={`w-full ${
                                errors.customContractDuration
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                  : ""
                              }`}
                              {...register("customContractDuration", {
                                setValueAs: (value) => value.trim(),
                                onChange: () => {
                                  if (errors.customContractDuration) {
                                    clearErrors("customContractDuration");
                                  }
                                },
                              })}
                            />
                          </div>
                        )}

                        <div className="min-h-[34px] pt-1">
                          {errors.contractDuration?.message && (
                            <p className="text-xs leading-5 text-red-500">
                              {errors.contractDuration.message}
                            </p>
                          )}
                          {errors.customContractDuration?.message && (
                            <p className="text-xs leading-5 text-red-500">
                              {errors.customContractDuration.message}
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

                                placeholder="Select optional services"
            />
                            )}
                          />
                        </div>
                      </div>

                      {/* Additional Requirements (+ optional PDF attachment) */}
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
                                <PdfAttachment
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
                        {isSubmitting
                          ? "Submitting..."
                          : "Submit Quotation Request"}
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/60">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Already have an account?{" "}
                  <Link
                    to="/signin"
                    className="font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}
