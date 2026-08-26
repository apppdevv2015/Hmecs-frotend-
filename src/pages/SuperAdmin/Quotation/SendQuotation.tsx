import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Package,
  Plus,
  Send,
  Settings2,
  Users,
  X,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type ContractDuration = "12" | "24" | "36";

type OptionalService = {
  id: string;
  name: string;
  description: string;
};

type AcceptedInquiry = {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  siteName: string;
  quotationType: string;
  numberOfSites: number;
  activeMachines: number;
  equipmentTypes: string[];
  requestedDuration: ContractDuration;
};

type DropdownOption<OptionValue extends string> = {
  value: OptionValue;
  label: string;
};

type QuotationTotals = {
  extraMachineCount: number;
  contractDurationInMonths: number;
  selectedServicesTotal: number;
  totalOneTimeCharges: number;
  monthlyRecurringTotal: number;
  totalContractValue: number;
};

/* ============================================================
   ACCEPTED INQUIRY DATA
   Replace this with API data later.
============================================================ */

const ACCEPTED_INQUIRIES: AcceptedInquiry[] = [
  {
    id: "QIN-000124",
    companyName: "ABC Mining Pvt Ltd",
    contactPerson: "John Doe",
    email: "john@abcmining.com",
    phone: "+91 98765 43210",
    siteName: "Iron Valley Mine",
    quotationType: "Fleet Management",
    numberOfSites: 3,
    activeMachines: 120,
    equipmentTypes: ["Excavator", "Crane", "Loader"],
    requestedDuration: "12",
  },
];

/* ============================================================
   OPTIONAL SERVICES CATALOGUE
   Pricing is entered per quotation, not hardcoded here.
============================================================ */

const OPTIONAL_SERVICES: OptionalService[] = [
  {
    id: "telematics",
    name: "Telematics / ECU Integration",
    description: "Integration with machine telematics and ECU data.",
  },
  {
    id: "erp",
    name: "SAP / ERP Integration",
    description: "Integration with existing ERP systems.",
  },
  {
    id: "reports",
    name: "Custom Reports",
    description: "Custom reporting and dashboard requirements.",
  },
  {
    id: "migration",
    name: "Historical Data Migration",
    description: "Migration and preparation of historical machine data.",
  },
  {
    id: "training",
    name: "Additional Training",
    description: "Additional user or operational training.",
  },
  {
    id: "support",
    name: "On-site Technical Support",
    description: "On-site technical support services.",
  },
];

/* ============================================================
   DROPDOWN OPTION LISTS
============================================================ */

const CONTRACT_DURATION_OPTIONS: ReadonlyArray<
  DropdownOption<ContractDuration>
> = [
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "36 Months" },
];

const PAYMENT_TERMS_OPTIONS: ReadonlyArray<DropdownOption<string>> = [
  { value: "Monthly in Advance", label: "Monthly in Advance" },
  { value: "Quarterly in Advance", label: "Quarterly in Advance" },
  { value: "Annual in Advance", label: "Annual in Advance" },
];

/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);
};

/* ============================================================
   Extremely high, fixed z-index values for the preview modal.
   The modal is rendered through a portal straight into
   document.body, so these values only need to beat whatever
   z-index the app shell (navbar / sidebar) uses — they are not
   relative to anything else in this file.
============================================================ */

const MODAL_OVERLAY_Z_INDEX = 2147483000;
const MODAL_CONTENT_Z_INDEX = 2147483001;

const findOptionalServiceById = (
  serviceId: string,
): OptionalService | undefined => {
  return OPTIONAL_SERVICES.find((service) => service.id === serviceId);
};

const findAcceptedInquiryById = (
  inquiryId: string,
): AcceptedInquiry | undefined => {
  return ACCEPTED_INQUIRIES.find((inquiry) => inquiry.id === inquiryId);
};

const computeExtraMachineCount = (
  inquiry: AcceptedInquiry,
  licensedMachineAllowance: number,
): number => {
  const rawExtraCount = inquiry.activeMachines - licensedMachineAllowance;
  return rawExtraCount > 0 ? rawExtraCount : 0;
};

const computeQuotationTotals = (params: {
  inquiry: AcceptedInquiry;
  contractDuration: ContractDuration;
  licensedMachineAllowance: number;
  implementationFee: number;
  monthlySiteLicence: number;
  additionalMachineCharge: number;
  selectedServicesTotal: number;
}): QuotationTotals => {
  const extraMachineCount = computeExtraMachineCount(
    params.inquiry,
    params.licensedMachineAllowance,
  );

  const contractDurationInMonths = Number(params.contractDuration);

  const totalOneTimeCharges =
    params.implementationFee + params.selectedServicesTotal;

  const monthlyRecurringTotal =
    params.monthlySiteLicence +
    params.additionalMachineCharge * extraMachineCount;

  const totalContractValue =
    totalOneTimeCharges + monthlyRecurringTotal * contractDurationInMonths;

  return {
    extraMachineCount,
    contractDurationInMonths,
    selectedServicesTotal: params.selectedServicesTotal,
    totalOneTimeCharges,
    monthlyRecurringTotal,
    totalContractValue,
  };
};

/* ============================================================
   COMPONENT
============================================================ */

const SendQuotation: FC = () => {
  const initialInquiry = ACCEPTED_INQUIRIES.length > 0 ? ACCEPTED_INQUIRIES[0] : undefined;

  const [selectedInquiryId, setSelectedInquiryId] = useState<string>(
    initialInquiry !== undefined ? initialInquiry.id : "",
  );

  const [contractDuration, setContractDuration] =
    useState<ContractDuration>("12");

  const [licensedMachineAllowance, setLicensedMachineAllowance] =
    useState<number>(0);

  const [implementationFee, setImplementationFee] = useState<number>(0);

  const [monthlySiteLicence, setMonthlySiteLicence] = useState<number>(0);

  const [additionalMachineCharge, setAdditionalMachineCharge] =
    useState<number>(0);

  const [paymentTerms, setPaymentTerms] =
    useState<string>("Monthly in Advance");

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [serviceAmountById, setServiceAmountById] = useState<
    Record<string, number>
  >({});

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const [isSending, setIsSending] = useState<boolean>(false);

  /* ============================================================
     SELECTED INQUIRY
  ============================================================ */

  const selectedInquiry = useMemo<AcceptedInquiry | undefined>(
    () => findAcceptedInquiryById(selectedInquiryId),
    [selectedInquiryId],
  );

  /* ============================================================
     SELECTED OPTIONAL SERVICES (with resolved name + price)
  ============================================================ */

  const selectedServiceLineItems = useMemo(() => {
    return selectedServiceIds.map((serviceId) => {
      const catalogueEntry = findOptionalServiceById(serviceId);
      const amount = serviceAmountById[serviceId] !== undefined
        ? serviceAmountById[serviceId]
        : 0;

      return {
        id: serviceId,
        name: catalogueEntry !== undefined ? catalogueEntry.name : serviceId,
        amount,
      };
    });
  }, [selectedServiceIds, serviceAmountById]);

  const selectedServicesTotal = useMemo(() => {
    return selectedServiceLineItems.reduce(
      (runningTotal, lineItem) => runningTotal + lineItem.amount,
      0,
    );
  }, [selectedServiceLineItems]);

  /* ============================================================
     TOTALS
  ============================================================ */

  const quotationTotals = useMemo<QuotationTotals | undefined>(() => {
    if (selectedInquiry === undefined) {
      return undefined;
    }

    return computeQuotationTotals({
      inquiry: selectedInquiry,
      contractDuration,
      licensedMachineAllowance,
      implementationFee,
      monthlySiteLicence,
      additionalMachineCharge,
      selectedServicesTotal,
    });
  }, [
    selectedInquiry,
    contractDuration,
    licensedMachineAllowance,
    implementationFee,
    monthlySiteLicence,
    additionalMachineCharge,
    selectedServicesTotal,
  ]);

  /* ============================================================
     SERVICE TOGGLE
  ============================================================ */

  const toggleOptionalService = (serviceId: string): void => {
    setSelectedServiceIds((currentSelectedIds) => {
      const isCurrentlySelected = currentSelectedIds.includes(serviceId);

      if (isCurrentlySelected) {
        return currentSelectedIds.filter((id) => id !== serviceId);
      }

      return [...currentSelectedIds, serviceId];
    });
  };

  /* ============================================================
     SERVICE PRICE
  ============================================================ */

  const updateOptionalServiceAmount = (
    serviceId: string,
    rawValue: string,
  ): void => {
    const parsedAmount = Number(rawValue);
    const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0;

    setServiceAmountById((currentAmounts) => ({
      ...currentAmounts,
      [serviceId]: isValidAmount ? parsedAmount : 0,
    }));
  };

  /* ============================================================
     SEND
  ============================================================ */

  const handleSendQuotation = async (): Promise<void> => {
    setIsSending(true);

    /*
      Production API integration:

      await quotationService.sendQuotation({
        inquiryId: selectedInquiry.id,
        contractDuration,
        licensedMachineAllowance,
        implementationFee,
        monthlySiteLicence,
        additionalMachineCharge,
        paymentTerms,
        optionalServices: selectedServiceLineItems,
        totals: quotationTotals,
      });

      Backend response should control success/error handling.
    */
    try {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 800);
      });
    } finally {
      setIsSending(false);
    }
  };

  /* ============================================================
     NO ACCEPTED INQUIRY
  ============================================================ */

  if (ACCEPTED_INQUIRIES.length === 0) {
    return (
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <FileText className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          No accepted inquiries
        </h2>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Accepted quotation inquiries will appear here when they are ready
          for quotation preparation.
        </p>
      </section>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <>
      <section className="w-full">
        
        {/* ======================================================
            INQUIRY SELECTOR
        ====================================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <FileText size={19} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Select Accepted Inquiry
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select the accepted inquiry for quotation preparation.
              </p>
            </div>
          </div>

          <Dropdown<string>
            ariaLabel="Select accepted inquiry"
            value={selectedInquiryId}
            onChange={setSelectedInquiryId}
            options={ACCEPTED_INQUIRIES.map((inquiry) => ({
              value: inquiry.id,
              label: `${inquiry.id} — ${inquiry.companyName}`,
            }))}
          />
        </div>

        {selectedInquiry !== undefined && quotationTotals !== undefined && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            {/* ==================================================
                LEFT CONTENT
            ================================================== */}

            <div className="min-w-0 space-y-6">
              {/* ==================================================
                  COMPANY INFORMATION
              ================================================== */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Building2 size={19} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Company & Inquiry Information
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Information received from the quotation inquiry.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem
                    label="Company"
                    value={selectedInquiry.companyName}
                  />

                  <InfoItem
                    label="Contact Person"
                    value={selectedInquiry.contactPerson}
                  />

                  <InfoItem
                    label="Email"
                    value={selectedInquiry.email}
                  />

                  <InfoItem
                    label="Phone"
                    value={selectedInquiry.phone}
                  />

                  <InfoItem
                    label="Site"
                    value={selectedInquiry.siteName}
                  />

                  <InfoItem
                    label="Quotation Type"
                    value={selectedInquiry.quotationType}
                  />

                  <InfoItem
                    label="Number of Sites"
                    value={String(selectedInquiry.numberOfSites)}
                  />

                  <InfoItem
                    label="Active Machines"
                    value={String(selectedInquiry.activeMachines)}
                  />

                  <InfoItem
                    label="Equipment Types"
                    value={selectedInquiry.equipmentTypes.join(", ")}
                  />
                </div>
              </section>

              {/* ==================================================
                  COMMERCIAL DETAILS
              ================================================== */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <SectionHeader
                  icon={<Settings2 size={19} />}
                  title="Commercial Details"
                  description="Configure the commercial terms for this quotation."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Contract Duration</FieldLabel>

                    <Dropdown<ContractDuration>
                      ariaLabel="Contract duration"
                      value={contractDuration}
                      onChange={setContractDuration}
                      options={CONTRACT_DURATION_OPTIONS}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Licensed Machine Allowance</FieldLabel>

                    <input
                      type="number"
                      min={0}
                      value={licensedMachineAllowance}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setLicensedMachineAllowance(
                          nextValue >= 0 ? nextValue : 0,
                        );
                      }}
                      className={inputClassName}
                    />

                  </Field>

                  <Field>
                    <FieldLabel>Once-Off Implementation Fee</FieldLabel>

                    <MoneyInput
                      value={implementationFee}
                      onChange={setImplementationFee}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Monthly Site Licence</FieldLabel>

                    <MoneyInput
                      value={monthlySiteLicence}
                      onChange={setMonthlySiteLicence}
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Recurring monthly charge.
                    </p>
                  </Field>

                  <Field>
                    <FieldLabel>Additional Machine Charge</FieldLabel>

                    <MoneyInput
                      value={additionalMachineCharge}
                      onChange={setAdditionalMachineCharge}
                    />

                    <p className="mt-1.5 text-xs text-slate-400">
                      Monthly charge per machine above the allowance.
                    </p>
                  </Field>

                  <Field>
                    <FieldLabel>Payment Terms</FieldLabel>

                    <Dropdown<string>
                      ariaLabel="Payment terms"
                      value={paymentTerms}
                      onChange={setPaymentTerms}
                      options={PAYMENT_TERMS_OPTIONS}
                    />
                  </Field>
                </div>
              </section>

              {/* ==================================================
                  OPTIONAL SERVICES
              ================================================== */}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <SectionHeader
                  icon={<Plus size={19} />}
                  title="Optional Services"
                  description="Add any additional services required for this quotation."
                />

                <div className="space-y-3">
                  {OPTIONAL_SERVICES.map((service) => {
                    const isSelected = selectedServiceIds.includes(
                      service.id,
                    );
                    const currentAmount =
                      serviceAmountById[service.id] !== undefined
                        ? serviceAmountById[service.id]
                        : 0;

                    return (
                      <div
                        key={service.id}
                        className={`rounded-xl border p-4 transition ${
                          isSelected
                            ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/5"
                            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <label className="flex min-w-0 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleOptionalService(service.id)
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />

                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                                {service.name}
                              </span>

                              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                {service.description}
                              </span>
                            </span>
                          </label>

                          {isSelected && (
                            <div className="w-full lg:w-48">
                              <MoneyInput
                                value={currentAmount}
                                onChange={(nextAmount) =>
                                  updateOptionalServiceAmount(
                                    service.id,
                                    String(nextAmount),
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* ==================================================
                RIGHT SUMMARY
            ================================================== */}

            <aside className="h-fit xl:sticky xl:top-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <FileText size={19} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Quotation Summary
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Review before sending.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <SummaryRow
                    label="Company"
                    value={selectedInquiry.companyName}
                  />

                  <SummaryRow
                    label="Contract"
                    value={`${contractDuration} Months`}
                  />

                  <SummaryRow
                    label="Licensed Machines"
                    value={String(licensedMachineAllowance)}
                  />

                  {quotationTotals.extraMachineCount > 0 && (
                    <SummaryRow
                      label="Extra Machines Billed"
                      value={String(quotationTotals.extraMachineCount)}
                    />
                  )}

                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      One-Time Charges
                    </p>

                    <SummaryRow
                      label="Implementation Fee"
                      value={formatCurrency(implementationFee)}
                    />

                    {selectedServiceLineItems.length === 0 ? (
                      <SummaryRow
                        label="Optional Services"
                        value={formatCurrency(0)}
                      />
                    ) : (
                      selectedServiceLineItems.map((lineItem) => (
                        <SummaryRow
                          key={lineItem.id}
                          label={lineItem.name}
                          value={formatCurrency(lineItem.amount)}
                        />
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Recurring Charges (Monthly)
                    </p>

                    <SummaryRow
                      label="Monthly Site Licence"
                      value={`${formatCurrency(monthlySiteLicence)} / month`}
                    />

                    <SummaryRow
                      label="Additional Machines"
                      value={`${formatCurrency(
                        additionalMachineCharge *
                          quotationTotals.extraMachineCount,
                      )} / month`}
                    />

                    <SummaryRow
                      label="Total Monthly Recurring"
                      value={`${formatCurrency(
                        quotationTotals.monthlyRecurringTotal,
                      )} / month`}
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        One-Time Total
                      </span>

                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatCurrency(quotationTotals.totalOneTimeCharges)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        Total Contract Value ({contractDuration} mo)
                      </span>

                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(quotationTotals.totalContractValue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <FileText size={17} />
                    Preview Quotation
                  </button>

                  <button
                    type="button"
                    disabled={isSending}
                    onClick={handleSendQuotation}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {isSending ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Send Quotation
                      </>
                    )}
                  </button>
                </div>
              </section>
            </aside>
          </div>
        )}
      </section>

      {/* ========================================================
          PREVIEW MODAL
          Rendered through a portal directly into document.body so
          it escapes the stacking context of any parent layout
          region (sidebar / navbar) and always paints on top,
          regardless of the z-index those regions use.
      ======================================================== */}

      {isPreviewOpen &&
        selectedInquiry !== undefined &&
        quotationTotals !== undefined &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            style={{ zIndex: MODAL_OVERLAY_Z_INDEX }}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
              style={{ zIndex: MODAL_CONTENT_Z_INDEX }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    Quotation Preview
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedInquiry.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        HME
                      </h1>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Commercial Quotation
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedInquiry.id}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Company
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedInquiry.companyName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedInquiry.contactPerson}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Contract
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {contractDuration} Months
                      </p>
                    </div>
                  </div>

                  <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      One-Time Charges
                    </p>

                    <SummaryRow
                      label="Once-Off Implementation Fee"
                      value={formatCurrency(implementationFee)}
                    />

                    {selectedServiceLineItems.length === 0 ? (
                      <SummaryRow
                        label="Optional Services"
                        value={formatCurrency(0)}
                      />
                    ) : (
                      selectedServiceLineItems.map((lineItem) => (
                        <SummaryRow
                          key={lineItem.id}
                          label={lineItem.name}
                          value={formatCurrency(lineItem.amount)}
                        />
                      ))
                    )}

                    <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                      <SummaryRow
                        label="One-Time Total"
                        value={formatCurrency(
                          quotationTotals.totalOneTimeCharges,
                        )}
                      />
                    </div>
                  </div>

                  <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Recurring Charges (Monthly)
                    </p>

                    <SummaryRow
                      label="Monthly Site Licence"
                      value={`${formatCurrency(monthlySiteLicence)} / month`}
                    />

                    <SummaryRow
                      label="Additional Machine Charge"
                      value={`${formatCurrency(additionalMachineCharge)} / machine / month`}
                    />

                    {quotationTotals.extraMachineCount > 0 && (
                      <SummaryRow
                        label={`Billed Extra Machines (${quotationTotals.extraMachineCount})`}
                        value={`${formatCurrency(
                          additionalMachineCharge *
                            quotationTotals.extraMachineCount,
                        )} / month`}
                      />
                    )}

                    <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                      <SummaryRow
                        label="Total Monthly Recurring"
                        value={`${formatCurrency(
                          quotationTotals.monthlyRecurringTotal,
                        )} / month`}
                      />
                    </div>
                  </div>

                  <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                  <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                        Total Contract Value ({contractDuration} months)
                      </span>

                      <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(quotationTotals.totalContractValue)}
                      </span>
                    </div>
                  </div>

                  <div className="my-6 border-t border-slate-200 dark:border-slate-800" />

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <PreviewStat
                      icon={<Package size={16} />}
                      label="Machines"
                      value={String(licensedMachineAllowance)}
                    />

                    <PreviewStat
                      icon={<CalendarDays size={16} />}
                      label="Duration"
                      value={`${contractDuration} Months`}
                    />

                    <PreviewStat
                      icon={<Users size={16} />}
                      label="Payment"
                      value={paymentTerms}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

/* ============================================================
   REUSABLE UI
============================================================ */

interface InfoItemProps {
  readonly label: string;
  readonly value: string;
}

const InfoItem: FC<InfoItemProps> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
    <p className="text-xs font-medium text-slate-400">{label}</p>

    <p className="mt-1.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
      {value}
    </p>
  </div>
);

interface SectionHeaderProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
}

const SectionHeader: FC<SectionHeaderProps> = ({
  icon,
  title,
  description,
}) => (
  <div className="mb-5 flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
      {icon}
    </div>

    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  </div>
);

interface FieldProps {
  readonly children: ReactNode;
}

const Field: FC<FieldProps> = ({ children }) => (
  <div className="min-w-0">{children}</div>
);

interface FieldLabelProps {
  readonly children: ReactNode;
}

const FieldLabel: FC<FieldLabelProps> = ({ children }) => (
  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
    {children}
  </label>
);

interface DropdownProps<OptionValue extends string> {
  readonly value: OptionValue;
  readonly options: ReadonlyArray<DropdownOption<OptionValue>>;
  readonly onChange: (nextValue: OptionValue) => void;
  readonly ariaLabel: string;
}

/**
 * Custom, fully-responsive dropdown used in place of a native
 * <select>. It renders its own menu as an absolutely positioned
 * panel scoped to its own wrapper (not tied to any fixed section
 * width), so it behaves correctly across breakpoints and inside
 * the preview modal alike.
 */
const Dropdown = <OptionValue extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: DropdownProps<OptionValue>) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event: MouseEvent): void => {
      const wrapperElement = wrapperRef.current;

      if (wrapperElement === null) {
        return;
      }

      const clickedInsideWrapper = wrapperElement.contains(
        event.target as Node,
      );

      if (!clickedInsideWrapper) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMenuOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel =
    selectedOption !== undefined ? selectedOption.label : "";

  const handleOptionSelect = (nextValue: OptionValue): void => {
    onChange(nextValue);
    setIsMenuOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((currentIsOpen) => !currentIsOpen)}
        className={`${inputClassName} flex items-center justify-between gap-2 pr-4 text-left`}
      >
        <span className="truncate">{selectedLabel}</span>

        <ChevronDown
          size={17}
          className={`shrink-0 text-slate-400 transition-transform ${
            isMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isMenuOpen && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((option) => {
            const isOptionSelected = option.value === value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isOptionSelected}
                  onClick={() => handleOptionSelect(option.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    isOptionSelected
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{option.label}</span>

                  {isOptionSelected && <Check size={15} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface MoneyInputProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
}

const MoneyInput: FC<MoneyInputProps> = ({ value, onChange }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
      R
    </span>

    <input
      type="number"
      min={0}
      step="0.01"
      value={value}
      onChange={(event) => {
        const nextValue = Number(event.target.value);
        const isValidValue = Number.isFinite(nextValue) && nextValue >= 0;

        onChange(isValidValue ? nextValue : 0);
      }}
      className={`${inputClassName} pl-9`}
    />
  </div>
);

interface SummaryRowProps {
  readonly label: string;
  readonly value: string;
}

const SummaryRow: FC<SummaryRowProps> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-sm text-slate-500 dark:text-slate-400">
      {label}
    </span>

    <span className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
      {value}
    </span>
  </div>
);

interface PreviewStatProps {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
}

const PreviewStat: FC<PreviewStatProps> = ({ icon, label, value }) => (
  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
    <div className="flex items-center gap-2 text-slate-400">
      {icon}

      <span className="text-xs">{label}</span>
    </div>

    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </p>
  </div>
);

/* ============================================================
   SHARED CLASSES
============================================================ */

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export default SendQuotation;