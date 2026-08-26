import { useMemo, useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  Mail,
  PackageCheck,
  Send,
  X,
} from "lucide-react";

import AppSelect from "../../../components/ui/dropdown/AppSelect";

/* ============================================================
   TYPES
============================================================ */

type ContractDuration = "12 Months" | "24 Months" | "36 Months";

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

interface ContractCompany {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  quotationNumber: string;
  acceptedDate: string;
  contractNumber: string;
  startDate: string;
  duration: ContractDuration;
  poNumber: string;
  paymentTerms: string;
  licensedMachineAllowance: number;
  currentLicensedMachines: number;
  additionalMachineCharge: number;
  implementationFee: number;
  monthlySiteLicence: number;
  optionalServices: OptionalService[];
}
interface ContractFormData {
  companyId: string;
  contractNumber: string;
  startDate: string;
  duration: ContractDuration;
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
   DUMMY DATA
   Replace this data source with API response later.
============================================================ */

const ACCEPTED_COMPANIES: ContractCompany[] = [
  {
    id: "company-001",
    companyName: "ABC Mining Pvt Ltd",
    contactName: "John Smith",
    email: "john.smith@abcmining.com",
    phone: "+27 11 555 0142",
    quotationNumber: "QT-2026-001",
    acceptedDate: "25 Aug 2026",
    contractNumber: "CNT-2026-001",
    startDate: "2026-09-01",
    duration: "12 Months",
    poNumber: "PO-ABC-2026-081",
    paymentTerms: "Monthly in Advance",
    licensedMachineAllowance: 85,
    currentLicensedMachines: 82,
    additionalMachineCharge: 450,
    implementationFee: 25000,
    monthlySiteLicence: 18500,
    optionalServices: [
      {
        id: "service-001",
        name: "Predictive Maintenance",
        price: 4500,
        billingFrequency: "Monthly",
      },
      {
        id: "service-002",
        name: "Machine Health Monitoring",
        price: 3200,
        billingFrequency: "Monthly",
      },
    ],
  },
  {
    id: "company-002",
    companyName: "XYZ Construction Ltd",
    contactName: "Michael Brown",
    email: "michael.brown@xyzconstruction.com",
    phone: "+27 21 555 0198",
    quotationNumber: "QT-2026-014",
    acceptedDate: "24 Aug 2026",
    contractNumber: "CNT-2026-002",
    startDate: "2026-09-15",
    duration: "24 Months",
    poNumber: "PO-XYZ-2026-117",
    paymentTerms: "Monthly in Advance",
    licensedMachineAllowance: 120,
    currentLicensedMachines: 116,
    additionalMachineCharge: 425,
    implementationFee: 30000,
    monthlySiteLicence: 24000,
    optionalServices: [
      {
        id: "service-003",
        name: "Advanced Machine Analytics",
        price: 5200,
        billingFrequency: "Monthly",
      },
    ],
  },
  {
    id: "company-003",
    companyName: "Global Equipment Ltd",
    contactName: "Sarah Williams",
    email: "sarah.williams@globalequipment.com",
    phone: "+27 31 555 0116",
    quotationNumber: "QT-2026-021",
    acceptedDate: "23 Aug 2026",
    contractNumber: "CNT-2026-003",
    startDate: "2026-10-01",
    duration: "36 Months",
    poNumber: "PO-GE-2026-221",
    paymentTerms: "Monthly in Advance",
    licensedMachineAllowance: 150,
    currentLicensedMachines: 145,
    additionalMachineCharge: 400,
    implementationFee: 40000,
    monthlySiteLicence: 29500,
    optionalServices: [
      {
        id: "service-004",
        name: "Predictive Maintenance",
        price: 6500,
        billingFrequency: "Monthly",
      },
      {
        id: "service-005",
        name: "Advanced Machine Analytics",
        price: 5800,
        billingFrequency: "Monthly",
      },
    ],
  },
];

/* ============================================================
   CONSTANTS
============================================================ */

const COMPANY_OPTIONS: CompanyOption[] = ACCEPTED_COMPANIES.map((company) => ({
  value: company.id,
  label: `${company.companyName} — ${company.quotationNumber}`,
}));

const DURATION_OPTIONS = [
  { value: "12 Months", label: "12 Months" },
  { value: "24 Months", label: "24 Months" },
  { value: "36 Months", label: "36 Months" },
];

const PAYMENT_TERM_OPTIONS = [
  {
    value: "Monthly in Advance",
    label: "Monthly in Advance",
  },
  {
    value: "Quarterly in Advance",
    label: "Quarterly in Advance",
  },
  {
    value: "Annual in Advance",
    label: "Annual in Advance",
  },
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

const getDurationMonths = (duration: ContractDuration): number => {
  switch (duration) {
    case "12 Months":
      return 12;

    case "24 Months":
      return 24;

    case "36 Months":
      return 36;
  }
};

const calculateEndDate = (
  startDate: string,
  duration: ContractDuration,
): string => {
  const date = new Date(`${startDate}T00:00:00`);

  date.setMonth(date.getMonth() + getDurationMonths(duration));

  date.setDate(date.getDate() - 1);

  return date.toISOString().split("T")[0];
};

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

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
  company: ContractCompany;
  form: ContractFormData;
  endDate: string;
  onClose: () => void;
  onCreateAndSend: () => void;
}

const ContractPreview: FC<ContractPreviewProps> = ({
  company,
  form,
  endDate,
  onClose,
  onCreateAndSend,
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
              {form.contractNumber}
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

                <InfoItem label="Contract Number" value={form.contractNumber} />

                <InfoItem
                  label="Start Date"
                  value={formatDate(form.startDate)}
                />

                <InfoItem label="End Date" value={formatDate(endDate)} />

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
                <InfoItem label="PO Number" value={form.poNumber} />

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
            onClick={onCreateAndSend}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <Send size={17} />
            Create & Send Contract
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const [form, setForm] = useState<ContractFormData | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const selectedCompany = useMemo(
    () =>
      ACCEPTED_COMPANIES.find((company) => company.id === selectedCompanyId),
    [selectedCompanyId],
  );

  const endDate = useMemo(() => {
    if (!form) {
      return "";
    }

    return calculateEndDate(form.startDate, form.duration);
  }, [form]);

  const handleCompanyChange = (companyId: string): void => {
    const company = ACCEPTED_COMPANIES.find((item) => item.id === companyId);

    if (!company) {
      setSelectedCompanyId("");
      setForm(null);
      setIsPreviewOpen(false);
      return;
    }

    setSelectedCompanyId(company.id);

    setForm({
      companyId: company.id,
      contractNumber: company.contractNumber,
      startDate: company.startDate,
      duration: company.duration,
      poNumber: company.poNumber,
      paymentTerms: company.paymentTerms,
      description: "",
      licensedMachineAllowance: company.licensedMachineAllowance,
      currentLicensedMachines: company.currentLicensedMachines,
      additionalMachineCharge: company.additionalMachineCharge,
      implementationFee: company.implementationFee,
      monthlySiteLicence: company.monthlySiteLicence,
      optionalServices: company.optionalServices,
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

  const handleDurationChange = (value: ContractDuration): void => {
    if (!form) {
      return;
    }

    setForm({
      ...form,
      duration: value,
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

    setIsPreviewOpen(true);
  };

  const handleCreateAndSend = (): void => {
    if (!selectedCompany || !form) {
      return;
    }

    /*
      API integration point.

      Example future implementation:

      await contractService.createAndSendContract({
        companyId: form.companyId,
        contractNumber: form.contractNumber,
        startDate: form.startDate,
        duration: form.duration,
        poNumber: form.poNumber,
        paymentTerms: form.paymentTerms,
        licensedMachineAllowance:
          form.licensedMachineAllowance,
        currentLicensedMachines:
          form.currentLicensedMachines,
        additionalMachineCharge:
          form.additionalMachineCharge,
        implementationFee:
          form.implementationFee,
        monthlySiteLicence:
          form.monthlySiteLicence,
        optionalServices:
          form.optionalServices,
      });
    */

    setIsPreviewOpen(false);
  };

  return (
    <>
      <section className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6 dark:border-slate-700">
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
                options={COMPANY_OPTIONS}
                value={selectedCompanyId}
                onChange={handleCompanyChange}
                placeholder="Select accepted company"
              />
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
                    value={selectedCompany.contactName}
                  />

                  <InfoItem label="Email" value={selectedCompany.email} />

                  <InfoItem label="Phone" value={selectedCompany.phone} />

                  <InfoItem
                    label="Quotation"
                    value={selectedCompany.quotationNumber}
                  />
                </div>
              </div>

              {/* ==================================================
                  CONTRACT DETAILS
              ================================================== */}

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <SectionHeader
                  icon={<CalendarDays size={20} />}
                  title="Contract Details"
                  description="Configure the contract period and payment information."
                />

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <InfoItem
                    label="Contract Number"
                    value={form.contractNumber}
                  />

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

                  <AppSelect
                    label="Contract Duration"
                    options={DURATION_OPTIONS}
                    value={form.duration}
                    onChange={(value) =>
                      handleDurationChange(value as ContractDuration)
                    }
                    placeholder="Select duration"
                  />

                  <InfoItem label="End Date" value={formatDate(endDate)} />

                  <InfoItem label="PO Number" value={form.poNumber} />

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
                      This description will be included in the contract sent to
                      the company.
                    </p>

                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {form.description.length}/2000
                    </span>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  LICENSED MACHINES
              ================================================== */}

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

              {/* ==================================================
                  COMMERCIAL DETAILS
              ================================================== */}

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

              {/* ==================================================
                  OPTIONAL SERVICES
              ================================================== */}

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <SectionHeader
                  icon={<CheckCircle2 size={20} />}
                  title="Optional Services"
                  description="Optional services included in the accepted quotation."
                />

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
              </div>

              {/* ==================================================
                  CONTRACT SUMMARY
              ================================================== */}

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
                    value={`${formatDate(
                      form.startDate,
                    )} — ${formatDate(endDate)}`}
                  />

                  <InfoItem
                    label="Monthly Licence"
                    value={formatCurrency(form.monthlySiteLicence)}
                  />
                </div>
              </div>

              {/* ==================================================
                  ACTIONS
              ================================================== */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end dark:border-slate-700">
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
          endDate={endDate}
          onClose={() => setIsPreviewOpen(false)}
          onCreateAndSend={handleCreateAndSend}
        />
      )}
    </>
  );
};

/* ============================================================
   ICON
============================================================ */

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