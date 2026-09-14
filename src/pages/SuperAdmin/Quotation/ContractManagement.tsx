import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eraser,
  FileCheck2,
  FileText,
  History,
  PackageCheck,
  PenTool,
  Send,
  X,
} from "lucide-react";

import AppSelect from "../../../components/ui/dropdown/AppSelect";
import ContractHistory from "../../SuperAdmin/Quotation/ContractHistoryPage";
import { showErrorToast } from "../../../utils/toastUtils";

import {
  getQuotationsListWithMeta,
  extractQuotationListError,
  type Quotation,
} from "../../../services/SuperAdmin/quotation/quotationActionService";

import {
  createContract,
  extractContractError,
  type CreateContractPayload,
} from "../../../services/SuperAdmin/quotation/contractService";

/* ============================================================
   TYPES
============================================================ */

interface CompanyOption {
  value: string;
  label: string;
}

interface OptionalService {
  id: string;
  name: string;
  price: number;
  billingFrequency: string;
}

interface ContractCreateForm {
  companyId: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  duration: string;
  poNumber: string;
  paymentTerms: string;
  description: string;
  licensedMachineAllowance: number;
  currentLicensedMachines: number;
  additionalMachineCharge: number;
  implementationFee: number;
  monthlySiteLicence: number;
  optionalServices: OptionalService[];
}

/* ============================================================
   MODAL Z-INDEX
   The contract preview is rendered through a portal straight
   into document.body, so these values only need to beat
   whatever z-index the app shell (navbar / sidebar) uses. Set
   as inline styles rather than a Tailwind class so nothing in
   the app can clamp or override the value.
============================================================ */

const MODAL_OVERLAY_Z_INDEX = 2147483000;
const MODAL_CONTENT_Z_INDEX = 2147483001;

/* ============================================================
   CONSTANTS
============================================================ */

const PAYMENT_TERM_OPTIONS = [
  { value: "NET_30", label: "Net 30" },
  { value: "NET_60", label: "Net 60" },
  { value: "ADVANCE", label: "Advance Payment" },
];

/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (date: string): string => {
  if (!date) {
    return "—";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const getTodayDateString = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
};

const getDurationInMonths = (duration: string): number | null => {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

const DURATION_MONTHS_MAP: Record<string, number> = {
  "6_MONTHS": 6,
  "12_MONTHS": 12,
  "24_MONTHS": 24,
  "36_MONTHS": 36,
};

const getExpectedEndDate = (
  startDate: string,
  duration: string,
): string | null => {
  const months = getDurationInMonths(duration);

  if (!startDate || months === null) {
    return null;
  }

  const date = new Date(`${startDate}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split("T")[0];
};

/**
 * Validates that:
 * 1. Start date is not before today.
 * 2. End date is not before the start date.
 * 3. End date is reasonably close to the quotation's contracted duration
 *    (within a small tolerance for month-length differences).
 */
const validateContractDates = (
  startDate: string,
  endDate: string,
  duration: string,
): string | null => {
  if (!startDate || !endDate) {
    return null;
  }

  const today = getTodayDateString();

  if (startDate < today) {
    return "Start date cannot be before today.";
  }

  if (endDate <= startDate) {
    return "End date must be after the start date.";
  }

  const expectedEndDate = getExpectedEndDate(startDate, duration);

  if (expectedEndDate) {
    const expected = new Date(expectedEndDate);
    const actual = new Date(endDate);
    const diffInDays = Math.abs(
      (actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays > 3) {
      return `End date doesn't match the ${duration.toLowerCase()} contract duration. Expected around ${expectedEndDate}.`;
    }
  }

  return null;
};

/**
 * Maps an ACCEPTED quotation coming from the API into the shape this
 * screen works with. Fields that belong to the contract itself (not
 * the quotation) — contract number, start date, PO number — don't
 * exist yet at this stage, so they're seeded with sensible defaults
 * the Super Admin can adjust before sending.
 */
/* ============================================================
   SMALL UI COMPONENTS
============================================================ */

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const SectionHeader: FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
}) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
      {icon}
    </div>

    <div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  </div>
);

interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem: FC<InfoItemProps> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </p>
  </div>
);

/* ============================================================
   PREVIEW MODAL
   Rendered through a portal directly into document.body so it
   escapes the stacking context of any parent layout region
   (sidebar / navbar) and always paints on top, regardless of
   the z-index those regions use.
============================================================ */

interface ContractPreviewProps {
  company: Quotation;
  form: ContractCreateForm;
  endDate: string;
  onClose: () => void;
  onCreateAndSend: () => void;
  onEndDateChange: (value: string) => void; 
  isSubmitting: boolean;
}

const ContractPreview: FC<ContractPreviewProps> = ({
  company,
  form,
  endDate,
  onClose,
  onCreateAndSend,
  onEndDateChange,
  isSubmitting,
}) => {
  const monthlyOptionalServices = form.optionalServices.reduce(
    (total, service) => total + service.price,
    0,
  );

  const monthlyTotal = form.monthlySiteLicence + monthlyOptionalServices;

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      style={{ zIndex: MODAL_OVERLAY_Z_INDEX }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        style={{ zIndex: MODAL_CONTENT_Z_INDEX }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Contract Preview
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {form.contractNumber || "Pending contract number"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close contract preview"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <div className="mb-4 flex items-center gap-2">
                <FileText
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Contract Information
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem label="Company" value={company.companyName} />

                <InfoItem label="Quotation" value={company.quotationNumber} />

                <InfoItem
                  label="Contract Number"
                  value={form.contractNumber || "—"}
                />

                <InfoItem
                  label="Start Date"
                  value={formatDate(form.startDate)}
                />

                <div>
                  <label
                    htmlFor="contract-end-date"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    End Date
                  </label>

                  <input
                    id="contract-end-date"
                    type="date"
                    value={form.endDate}
                   onChange={(event) => onEndDateChange(event.target.value)} 
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <InfoItem label="Duration" value={form.duration} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <div className="mb-4 flex items-center gap-2">
                <PackageCheck
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Licensed Machines
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <InfoItem
                  label="Allowance"
                  value={`${form.licensedMachineAllowance} Machines`}
                />

                <InfoItem
                  label="Current"
                  value={`${form.currentLicensedMachines} Machines`}
                />

                <InfoItem
                  label="Additional Machine"
                  value={formatCurrency(form.additionalMachineCharge)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <div className="mb-4 flex items-center gap-2">
                <FileCheck2
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Commercial Details
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr>
                      <td className="py-3 text-sm text-slate-500 dark:text-slate-400">
                        Implementation Fee
                      </td>

                      <td className="py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(form.implementationFee)}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 text-sm text-slate-500 dark:text-slate-400">
                        Monthly Site Licence
                      </td>

                      <td className="py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(form.monthlySiteLicence)}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 text-sm font-semibold text-slate-900 dark:text-white">
                        Estimated Monthly Total
                      </td>

                      <td className="py-3 text-right text-base font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(monthlyTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />

                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Optional Services
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Service
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Billing
                      </th>

                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Price
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {form.optionalServices.map((service) => (
                      <tr key={service.id}>
                        <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">
                          {service.name}
                        </td>

                        <td className="py-3 text-sm text-slate-500 dark:text-slate-400">
                          {service.billingFrequency}
                        </td>

                        <td className="py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(service.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem label="PO Number" value={form.poNumber || "—"} />

                <InfoItem label="Payment Terms" value={form.paymentTerms} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close Preview
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCreateAndSend}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed dark:focus:ring-offset-slate-900"
          >
            <Send size={17} />
            {isSubmitting ? "Sending..." : "Create & Send Contract"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const ContractManagement: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const [acceptedCompanies, setAcceptedCompanies] = useState<
    readonly Quotation[]
  >([]);
  const [form, setForm] = useState<ContractCreateForm | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isContractHistoryOpen, setIsContractHistoryOpen] =
    useState<boolean>(false);

  // Super Admin digital signature — captured on canvas before create & send
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [signedByName, setSignedByName] = useState<string>("");

  // Fetch every ACCEPTED quotation — these are the companies eligible
  // to have a contract created and sent against them.
  useEffect(() => {
    const controller = new AbortController();

    const loadAcceptedQuotations = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getQuotationsListWithMeta({
          status: "ACCEPTED",
          signal: controller.signal,
        });

        setAcceptedCompanies(result.data);
      } catch (error: unknown) {
        const message = extractQuotationListError(error);

        if (message !== undefined) {
          setErrorMessage(message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadAcceptedQuotations();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      return;
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas || !canvas.parentElement) {
      return;
    }
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 192;
  }, [selectedCompanyId]);

  const companyOptions = useMemo<CompanyOption[]>(
    () =>
      acceptedCompanies.map((quotation) => ({
        value: quotation.id,
        label: `${quotation.companyName} — ${quotation.quotationNumber}`,
      })),
    [acceptedCompanies],
  );

  const selectedCompany = useMemo(
    () => acceptedCompanies.find((company) => company.id === selectedCompanyId),
    [acceptedCompanies, selectedCompanyId],
  );

  const dateValidationError = useMemo(() => {
    if (!form) {
      return null;
    }

    return validateContractDates(form.startDate, form.endDate, form.duration);
  }, [form]);

  const handleSignatureStart = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): void => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSignatureMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): void => {
    if (!isDrawingRef.current) {
      return;
    }
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const handleSignatureEnd = (): void => {
    isDrawingRef.current = false;
  };

  const handleClearSignature = (): void => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const getSignatureFile = (): Promise<File | null> => {
    return new Promise((resolve) => {
      const canvas = signatureCanvasRef.current;
      if (!canvas || !hasSignature) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(
          new File([blob], "super-admin-signature.png", {
            type: "image/png",
          }),
        );
      }, "image/png");
    });
  };

  const handleContractHistory = (): void => {
    setIsContractHistoryOpen(true);
  };

  const handleCompanyChange = (companyId: string): void => {
    const company = acceptedCompanies.find((item) => item.id === companyId);

    if (!company) {
      setSelectedCompanyId("");
      setForm(null);
      setIsPreviewOpen(false);
      return;
    }

    setSelectedCompanyId(company.id);

    setForm({
      companyId: company.id,
      contractNumber: "",
      startDate: "",
      endDate: "",
      duration: company.contractDuration ?? "12 Months",
      poNumber: "",
      paymentTerms: "NET_30",
      description: "",
      licensedMachineAllowance: company.licensedMachineAllowance ?? 0,
      currentLicensedMachines: company.machineCount ?? 0,
      additionalMachineCharge: toNumber(company.additionalMachineCharge),
      implementationFee: toNumber(company.implementationFee),
      monthlySiteLicence: toNumber(company.monthlySiteLicence),
      optionalServices: [...(company.optionalServices ?? [])],
    });

    setIsPreviewOpen(false);
  };

  const handleStartDateChange = (value: string): void => {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      startDate: value,
    });
  };

  const handleEndDateChange = (value: string): void => {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      endDate: value,
    });
  };

  const handlePaymentTermsChange = (value: string): void => {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      paymentTerms: value,
    });
  };

  const handlePreview = (): void => {
    if (!selectedCompany || !form) {
      return;
    }

    const error = validateContractDates(
      form.startDate,
      form.endDate,
      form.duration,
    );

       if (error) {
      showErrorToast(error);
      return;
    }

    setIsPreviewOpen(true);
  };

  const handleCreateAndSend = async (): Promise<void> => {
    if (!selectedCompany || !form) {
      return;
    }

    const dateError = validateContractDates(
      form.startDate,
      form.endDate,
      form.duration,
    );

        if (dateError) {
      showErrorToast(dateError);
      return;
    }

    if (!signedByName.trim()) {
      showErrorToast("Please enter the name of the person signing the contract.");
      return;
    }

    if (!hasSignature) {
      showErrorToast("A digital signature is required.");
      return;
    }

    const signatureFile = await getSignatureFile();

    if (!signatureFile) {
      showErrorToast("Unable to capture the digital signature. Please sign again.");
      return;
    }

    setIsSubmitting(true);

    const payload: CreateContractPayload = {
      quotationId: selectedCompany.id,
      startDate: form.startDate,
      endDate: form.endDate,
      poNumber: form.poNumber || undefined,
      description: form.description || undefined,
      superAdminSignedBy: signedByName.trim(),
      signatureFile,
    };

    try {
      const contract = await createContract(payload);

           if (!contract) {
        showErrorToast("Unable to create the contract. Please try again.");
        return;
      }

      setIsPreviewOpen(false);
      setForm(null);
      setSelectedCompanyId("");
      setSignedByName("");
      handleClearSignature();
       } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isContractHistoryOpen ? (
        <ContractHistory onBack={() => setIsContractHistoryOpen(false)} />
      ) : (
        <>
          <section className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <FileSignatureIcon />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      Contract Management
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Create and send contracts for accepted quotations.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContractHistory}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <History size={17} />
                  Contract History
                </button>
              </div>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              {/* ==================================================
              COMPANY SELECTION
          ================================================== */}

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <SectionHeader
                  icon={<PackageCheck size={20} />}
                  title="Company Selection"
                  description="Select a company from the accepted quotations."
                />

                <div className="max-w-2xl">
                  <AppSelect
                    label="Accepted Company"
                    options={companyOptions}
                    value={selectedCompanyId}
                    onChange={handleCompanyChange}
                    placeholder={
                      isLoading
                        ? "Loading accepted companies..."
                        : "Select accepted company"
                    }
                  />

                  {!isLoading && errorMessage.length > 0 && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {errorMessage}
                    </p>
                  )}

                  {!isLoading &&
                    errorMessage.length === 0 &&
                    companyOptions.length === 0 && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        No accepted quotations available yet.
                      </p>
                    )}
                </div>
              </div>

              {/* ==================================================
              COMPANY INFORMATION
          ================================================== */}

              {selectedCompany && form && (
                <>
                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <SectionHeader
                      icon={<FileText size={20} />}
                      title="Company Information"
                      description="Information loaded from the accepted quotation."
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      <InfoItem
                        label="Company"
                        value={selectedCompany.companyName}
                      />

                      <InfoItem
                        label="Contact"
                        value={selectedCompany.contactPerson}
                      />

                      <InfoItem
                        label="Email"
                        value={selectedCompany.contactEmail}
                      />

                      <InfoItem
                        label="Phone"
                        value={selectedCompany.contactPhone}
                      />

                      <InfoItem
                        label="Quotation"
                        value={selectedCompany.quotationNumber}
                      />
                    </div>
                  </div>

                  {/*CONTRACT DETAILS*/}

                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <SectionHeader
                      icon={<CalendarDays size={20} />}
                      title="Contract Details"
                      description="Configure the contract period and payment information."
                    />

                    {/* Top row — read-only fields from the quotation */}
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem
                        label="Contract Number"
                        value={form.contractNumber || "Assigned on send"}
                      />

                      <InfoItem
                        label="Contract Duration"
                        value={form.duration}
                      />

                      <InfoItem
                        label="PO Number"
                        value={form.poNumber || "—"}
                      />
                    </div>

                    {/* Bottom row — editable fields */}
                    <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label
                          htmlFor="contract-start-date"
                          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Start Date
                        </label>

                        <input
                          id="contract-start-date"
                          type="date"
                          value={form.startDate}
                          onChange={(event) =>
                            handleStartDateChange(event.target.value)
                          }
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contract-end-date"
                          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          End Date
                        </label>

                        <input
                          id="contract-end-date"
                          type="date"
                          value={form.endDate}
                          onChange={(event) =>
                            handleEndDateChange(event.target.value)
                          }
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />

                        {dateValidationError && (
                          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                            {dateValidationError}
                          </p>
                        )}
                      </div>

                      <AppSelect
                        label="Payment Terms"
                        options={PAYMENT_TERM_OPTIONS}
                        value={form.paymentTerms}
                        onChange={handlePaymentTermsChange}
                        placeholder="Select payment terms"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                    <SectionHeader
                      icon={<FileText size={20} />}
                      title="Contract Description"
                      description="Add any additional contract scope, terms, instructions, or special requirements."
                    />

                    <div>
                      <label
                        htmlFor="contract-description"
                        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Description
                      </label>

                      <textarea
                        id="contract-description"
                        value={form.description}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            description: event.target.value,
                          });
                        }}
                        rows={6}
                        maxLength={2000}
                        placeholder="Enter contract scope, special terms, implementation instructions, or additional requirements..."
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                      />

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          This description will be included in the contract sent
                          to the company.
                        </p>

                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          {form.description.length}/2000
                        </span>
                      </div>
                    </div>
                  </div>

                  {/*LICENSED MACHINES*/}

                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <SectionHeader
                      icon={<PackageCheck size={20} />}
                      title="Licensed Machines"
                      description="Machine licensing information agreed in the quotation."
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                      <InfoItem
                        label="Licensed Allowance"
                        value={`${form.licensedMachineAllowance} Machines`}
                      />

                      <InfoItem
                        label="Current Machines"
                        value={`${form.currentLicensedMachines} Machines`}
                      />

                      <InfoItem
                        label="Additional Machine Charge"
                        value={formatCurrency(form.additionalMachineCharge)}
                      />
                    </div>
                  </div>

                  {/*COMMERCIAL DETAILS*/}

                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <SectionHeader
                      icon={<FileCheck2 size={20} />}
                      title="Commercial Details"
                      description="Commercial terms carried forward from the accepted quotation."
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                      <InfoItem
                        label="Implementation Fee"
                        value={formatCurrency(form.implementationFee)}
                      />

                      <InfoItem
                        label="Monthly Site Licence"
                        value={formatCurrency(form.monthlySiteLicence)}
                      />

                      <InfoItem
                        label="Additional Machine"
                        value={formatCurrency(form.additionalMachineCharge)}
                      />
                    </div>
                  </div>

                  {/*OPTIONAL SERVICES*/}

                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <SectionHeader
                      icon={<CheckCircle2 size={20} />}
                      title="Optional Services"
                      description="Optional services included in the accepted quotation."
                    />

                    {form.optionalServices.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No optional services were included in this quotation.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Service
                              </th>

                              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Billing Frequency
                              </th>

                              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Price
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {form.optionalServices.map((service) => (
                              <tr key={service.id}>
                                <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                  {service.name}
                                </td>

                                <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                                  {service.billingFrequency}
                                </td>

                                <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(service.price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

               

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <SectionHeader
                      icon={<Clock3 size={20} />}
                      title="Contract Summary"
                      description="Review the main contract information before creating it."
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoItem
                        label="Company"
                        value={selectedCompany.companyName}
                      />

                      <InfoItem label="Duration" value={form.duration} />

                      <InfoItem
                        label="Contract Period"
                        value={`${formatDate(form.startDate)} — ${formatDate(form.endDate)}`}
                      />

                      <InfoItem
                        label="Monthly Licence"
                        value={formatCurrency(form.monthlySiteLicence)}
                      />
                    </div>
                  </div>

                  {/*DIGITAL SIGNATURE*/}
                  <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                    <SectionHeader
                      icon={<PenTool size={20} />}
                      title="Digital Signature"
                      description="Sign as Super Admin to create and send this contract."
                    />

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Signature
                        </label>

                        <button
                          type="button"
                          onClick={handleClearSignature}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <Eraser size={15} />
                          Clear
                        </button>
                      </div>

                      <canvas
                        ref={signatureCanvasRef}
                        onPointerDown={handleSignatureStart}
                        onPointerMove={handleSignatureMove}
                        onPointerUp={handleSignatureEnd}
                        onPointerLeave={handleSignatureEnd}
                        className="h-48 w-full touch-none rounded-xl border border-dashed border-blue-300 bg-white dark:border-blue-900/50 dark:bg-slate-900"
                      />

                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Draw your signature above.
                      </p>
                    </div>

                    <div className="mt-4 max-w-md">
                      <label
                        htmlFor="super-admin-signed-by"
                        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Signed By
                      </label>

                      <input
                        id="super-admin-signed-by"
                        type="text"
                        value={signedByName}
                        onChange={(event) =>
                          setSignedByName(event.target.value)
                        }
                        placeholder="Full name and title"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

             

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-slate-700">
            
                    <button
                      type="button"
                      onClick={handlePreview}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
                    >
                      <FileText size={17} />
                      Preview
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateAndSend}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      <Send size={17} />
                      Create & Send Contract
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {isPreviewOpen && selectedCompany && form && (
              <ContractPreview
              company={selectedCompany}
              form={form}
              endDate={form.endDate}
              onClose={() => setIsPreviewOpen(false)}
              onCreateAndSend={handleCreateAndSend}
              onEndDateChange={handleEndDateChange} 
              isSubmitting={isSubmitting}
            />
          )}
        </>
      )}
    </>
  );
};

const FileSignatureIcon: FC = () => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h2" />
    <path d="M8 17h5" />
    <path d="M16 13.5c.8-.8 2.2-.8 3 0 .8.8.8 2.2 0 3l-3.5 3.5-2.5.5.5-2.5z" />
  </svg>
);

export default ContractManagement;
