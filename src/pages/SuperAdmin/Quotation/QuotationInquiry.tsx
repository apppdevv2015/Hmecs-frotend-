import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { createPortal } from "react-dom";

import AppSelect from "../../../components/ui/dropdown/AppSelect";
import CommonPagination from "../../../components/common/Pagination";
import {
  getQuotationRequests,
  type ApiQuotationRequest,
} from "../../../services/SuperAdmin/quotationInquiryService";

/* ============================================================================
 * 1. TYPES — must match the real API contract. Extend, don't loosen.
 * ==========================================================================*/

export type InquiryStatus = "ACTIVE" | "INACTIVE";
export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface CompanyInfo {
  readonly companyId: string;
  readonly name: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly location: string;
}

export interface TrialRequest {
  readonly requested: boolean;
  readonly duration: string | null;
  readonly machines: number | null;
  readonly description: string | null;
}

export interface ClientRequirement {
  readonly quotationType: string;
  readonly numberOfSites: number;
  readonly siteNames: readonly string[];
  readonly activeMachines: number;
  readonly equipmentTypes: readonly string[];
  readonly requestedServiceIds: readonly string[];
  readonly requirementDescription: string;
  readonly otherRequirements: string | null;
}

export interface QuotationInquiry {
  readonly inquiryId: string;
  readonly status: InquiryStatus;
  readonly inquiryDate: string;
  readonly company: CompanyInfo;
  readonly requirement: ClientRequirement;
  readonly trial: TrialRequest;
  readonly quotationStatus: QuotationStatus;
}

export interface AdditionalService {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultPrice: number;
}

export interface SelectedService {
  readonly serviceId: string;
  readonly selected: boolean;
  readonly price: number;
}

export interface QuotationDraft {
  readonly inquiryId: string;
  readonly contractDuration: string;
  readonly licensedMachineAllowance: number;
  readonly onceOffImplementationFee: number;
  readonly monthlySiteLicence: number;
  readonly additionalMachineCharge: number;
  readonly paymentTerms: string;
  readonly trialRequested: boolean;
  readonly trialDuration: string;
  readonly trialMachines: number;
  readonly trialDescription: string;
  readonly services: readonly SelectedService[];
  readonly notes: string;
}

export interface QuotationTotals {
  readonly additionalServicesTotal: number;
  readonly oneTimeTotal: number;
  readonly monthlyRecurringTotal: number;
  readonly contractValue: number;
}

export interface QuotationResponse {
  readonly quotationId: string;
  readonly inquiryId: string;
  readonly company: CompanyInfo;
  readonly sentDate: string;
  readonly quotationAmount: number;
  readonly status: QuotationStatus;
  readonly responseDate: string | null;
  readonly draft: QuotationDraft;
  readonly inquirySnapshot: QuotationInquiry;
}

export interface Pagination {
  readonly page: number;
  readonly limit: number;
  readonly totalRecords: number;
  readonly totalPages: number;
}

export interface InquirySummary {
  readonly totalInquiries: number;
  readonly pending: number;
  readonly readyToQuote: number;
  readonly sent: number;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly message?: string;
  readonly pagination?: Pagination;
  readonly summary?: InquirySummary;
}

export interface ApiErrorShape {
  readonly response?: {
    readonly data?: {
      readonly message?: string;
      readonly errors?: readonly { field?: string; message: string }[];
    };
  };
  readonly message?: string;
}

/* ============================================================================
 * 2. CONSTANTS — single source of truth for every enum-like value.
 *    BACKEND TODO: these will eventually be served by a /lookups endpoint;
 *    keep the shape identical so the UI never has to change when they move.
 * ==========================================================================*/

export const QUOTATION_TYPES = [
  "Fleet Management",
  "Predictive Maintenance",
  "Asset Monitoring",
] as const;

export const CONTRACT_DURATION_OPTIONS = [
  "6 Months",
  "12 Months",
  "18 Months",
  "24 Months",
] as const;

export const TRIAL_DURATION_OPTIONS = [
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
] as const;

export const PAYMENT_TERMS_OPTIONS = [
  "Monthly in Advance",
  "Quarterly in Advance",
  "Annually in Advance",
  "Net 30",
] as const;

export const DEFAULT_TRIAL_MACHINES = 15;
export const DEFAULT_TRIAL_DURATION = "30 Days";

/** Option lists for the common AppSelect component — built once from the enums above. */
export const STATUS_SELECT_OPTIONS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
] as const;

export const QUOTATION_TYPE_SELECT_OPTIONS = [
  { label: "All", value: "" },
  ...QUOTATION_TYPES.map((t) => ({ label: t, value: t })),
];

export const CONTRACT_DURATION_SELECT_OPTIONS = CONTRACT_DURATION_OPTIONS.map(
  (d) => ({ label: d, value: d }),
);

export const TRIAL_DURATION_SELECT_OPTIONS = TRIAL_DURATION_OPTIONS.map(
  (d) => ({ label: d, value: d }),
);

export const PAYMENT_TERMS_SELECT_OPTIONS = PAYMENT_TERMS_OPTIONS.map((p) => ({
  label: p,
  value: p,
}));

export const RESPONSE_STATUS_SELECT_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Pending", value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
] as const;

const EQUIPMENT_TYPE_POOL = [
  "Excavator",
  "Dump Truck",
  "Dozer",
  "Drill Rig",
  "Loader",
  "Grader",
] as const;

/** Centralized additional-services catalogue — rendered everywhere via .map(), never re-typed. */
export const QUOTATION_SERVICES: readonly AdditionalService[] = [
  {
    id: "telematics-ecu",
    name: "Telematics / ECU Integration",
    description: "Integration with machine telematics and ECU data.",
    defaultPrice: 0,
  },
  {
    id: "sap-erp",
    name: "SAP / ERP Integration",
    description: "Integration with existing ERP systems.",
    defaultPrice: 25000,
  },
  {
    id: "custom-reports",
    name: "Custom Reports",
    description: "Custom reporting and dashboard requirements.",
    defaultPrice: 10000,
  },
  {
    id: "historical-migration",
    name: "Historical Data Migration",
    description: "Migration and preparation of historical machine data.",
    defaultPrice: 15000,
  },
  {
    id: "training",
    name: "Additional Training",
    description: "Additional user or operational training.",
    defaultPrice: 8000,
  },
  {
    id: "onsite-support",
    name: "On-site Technical Support",
    description: "On-site technical support services.",
    defaultPrice: 20000,
  },
];

function getServiceById(id: string): AdditionalService | undefined {
  return QUOTATION_SERVICES.find((s) => s.id === id);
}

const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

/* ============================================================================
 * 3. MOCK DATA + MOCK SERVICE LAYER (UI-TESTING ONLY)
 *    BACKEND TODO: replace every function body in `quotationService` with a
 *    real `apiRequest(...)` call. Signatures/return shapes are already
 *    API-ready — the UI never needs to change when this happens.
 * ==========================================================================*/

const NETWORK_DELAY_MS = 600;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const MOCK_COMPANIES: readonly Omit<CompanyInfo, "companyId">[] = [
  {
    name: "XYZ Resources Ltd",
    contactPerson: "David Miller",
    email: "david.miller@xyzresources.com",
    phone: "+91 91234 56780",
    location: "Bhubaneswar, Odisha",
  },
  {
    name: "Iron Valley Corp",
    contactPerson: "Sarah Johnson",
    email: "sarah.j@ironvalley.com",
    phone: "+91 99887 76655",
    location: "Jamshedpur, Jharkhand",
  },
  {
    name: "Global Mining Co.",
    contactPerson: "Michael Brown",
    email: "michael.b@globalmining.com",
    phone: "+91 90000 11223",
    location: "Bellary, Karnataka",
  },
  {
    name: "Kaveri Infra Pvt Ltd",
    contactPerson: "Rohit Sharma",
    email: "rohit.sharma@kaveri.com",
    phone: "+91 98123 45678",
    location: "Raipur, Chhattisgarh",
  },
  {
    name: "Eastern Coalfields",
    contactPerson: "Anjali Verma",
    email: "anjali.verma@ecfl.com",
    phone: "+91 93456 78901",
    location: "Dhanbad, Jharkhand",
  },
  {
    name: "Hindustan Minerals",
    contactPerson: "Vikram Patil",
    email: "vikram.p@hindmin.com",
    phone: "+91 97654 32109",
    location: "Nagpur, Maharashtra",
  },
  {
    name: "Western Quarry Ltd",
    contactPerson: "Kapil Singh",
    email: "kapil.s@wq.com",
    phone: "+91 99001 22334",
    location: "Udaipur, Rajasthan",
  },
  {
    name: "Delta Mining Services",
    contactPerson: "Neha Kumari",
    email: "neha.k@delta.com",
    phone: "+91 98765 43210",
    location: "Ranchi, Jharkhand",
  },
];

function buildMockInquiry(index: number): QuotationInquiry {
  const company = MOCK_COMPANIES[index % MOCK_COMPANIES.length];
  const quotationType = QUOTATION_TYPES[index % QUOTATION_TYPES.length];
  const numberOfSites = 1 + (index % 4);
  const equipmentTypes = EQUIPMENT_TYPE_POOL.filter(
    (_, i) => (i + index) % 2 === 0,
  ).slice(0, 3);
  const requestsTrial = index % 3 !== 0;
  const daysAgo = index;
  const requestedServiceIds = QUOTATION_SERVICES.filter(
    (_, i) => (i + index) % 4 === 0,
  ).map((s) => s.id);

  return {
    inquiryId: `QIN-${String(90 - index).padStart(5, "0")}`,
    status: index % 9 === 0 ? "INACTIVE" : "ACTIVE",
    inquiryDate: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    company: { companyId: `CMP-${index}`, ...company },
    requirement: {
      quotationType,
      numberOfSites,
      siteNames: Array.from(
        { length: numberOfSites },
        (_, i) => `${company.location.split(",")[0]} Site ${i + 1}`,
      ),
      activeMachines: 12 + index * 4,
      equipmentTypes,
      requestedServiceIds,
      requirementDescription:
        "Client is looking to monitor real-time machine health, receive predictive maintenance alerts and reduce unplanned downtime across active sites.",
      otherRequirements:
        index % 3 === 0
          ? null
          : "Please share references from at least two existing mining-sector clients using a similar fleet size.",
    },
    trial: {
      requested: requestsTrial,
      duration: requestsTrial ? DEFAULT_TRIAL_DURATION : null,
      machines: requestsTrial ? DEFAULT_TRIAL_MACHINES : null,
      description: requestsTrial
        ? "Client would like to evaluate the system before final implementation."
        : null,
    },
    quotationStatus: null,
  };
}

function buildDefaultDraft(inquiry: QuotationInquiry): QuotationDraft {
  return {
    inquiryId: inquiry.inquiryId,
    contractDuration: CONTRACT_DURATION_OPTIONS[1],
    licensedMachineAllowance: inquiry.requirement.activeMachines,
    onceOffImplementationFee: 0,
    monthlySiteLicence: 0,
    additionalMachineCharge: 0,
    paymentTerms: PAYMENT_TERMS_OPTIONS[0],
    trialRequested: inquiry.trial.requested,
    trialDuration: inquiry.trial.duration ?? DEFAULT_TRIAL_DURATION,
    trialMachines: inquiry.trial.machines ?? DEFAULT_TRIAL_MACHINES,
    trialDescription: inquiry.trial.description ?? "",
    services: QUOTATION_SERVICES.map((s) => ({
      serviceId: s.id,
      selected: false,
      price: s.defaultPrice,
    })),
    notes: "",
  };
}

/** In-memory "database" — mutated by save-draft / send-quotation. */
const mockInquiries: QuotationInquiry[] = Array.from({ length: 24 }, (_, i) =>
  buildMockInquiry(i),
);
const draftsByInquiryId = new Map<string, QuotationDraft>();
const mockResponses: QuotationResponse[] = [];

/** Seed a handful of inquiries as already quoted, so Quotation Responses has data on first load. */
function seedSentQuotations(): void {
  mockInquiries.slice(0, 4).forEach((inquiry, i) => {
    const draft = buildDefaultDraft(inquiry);
    const seededDraft: QuotationDraft = {
      ...draft,
      onceOffImplementationFee: 15000,
      monthlySiteLicence: 8000 + i * 1000,
      additionalMachineCharge: 500,
      services: draft.services.map((s, idx) =>
        idx < 2 ? { ...s, selected: true } : s,
      ),
      notes:
        "Proposal covers predictive maintenance monitoring with monthly health reporting.",
    };
    const totals = computeQuotationTotals(seededDraft);
    const idx = mockInquiries.findIndex(
      (q) => q.inquiryId === inquiry.inquiryId,
    );
    const statusCycle: QuotationStatus[] = [
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "SENT",
    ];
    const quotationStatus = statusCycle[i % statusCycle.length];
    mockInquiries[idx] = { ...mockInquiries[idx], quotationStatus };
    draftsByInquiryId.set(inquiry.inquiryId, seededDraft);
    const sentDate = new Date(
      Date.now() - (i + 1) * 2 * 86_400_000,
    ).toISOString();
    mockResponses.push({
      quotationId: `QUO-${String(1000 + i)}`,
      inquiryId: inquiry.inquiryId,
      company: inquiry.company,
      sentDate,
      quotationAmount: totals.contractValue,
      status: quotationStatus,
      responseDate:
        quotationStatus === "SENT"
          ? null
          : new Date(Date.now() - i * 86_400_000).toISOString(),
      draft: seededDraft,
      inquirySnapshot: mockInquiries[idx],
    });
  });
}
seedSentQuotations();

function maybeThrowSimulatedError(): void {
  /* Flip this to a small probability locally to exercise the error + retry state. */
  const SIMULATE_ERROR_RATE = 0;
  if (SIMULATE_ERROR_RATE > 0 && Math.random() < SIMULATE_ERROR_RATE) {
    const err: ApiErrorShape = {
      response: {
        data: {
          message:
            "The quotation service is temporarily unavailable. Please try again.",
        },
      },
    };
    throw err;
  }
}

export interface InquiryListParams {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly status?: InquiryStatus;
  readonly quotationType?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface ResponseListParams {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly status?: QuotationStatus;
}

const quotationService = {
  async getInquiries(
    params: InquiryListParams,
  ): Promise<ApiResponse<QuotationInquiry[]>> {
    let apiInquiries: QuotationInquiry[] = [];

    try {
      const apiReqs = await getQuotationRequests({
        search: params.search,
        status: params.status,
      });

      if (Array.isArray(apiReqs) && apiReqs.length > 0) {
        apiInquiries = apiReqs.map((req: ApiQuotationRequest) => {
          const isTrial = (req.quotationType || "")
            .toLowerCase()
            .includes("trial");

          const siteNamesList = Array.isArray(req.siteNames)
            ? req.siteNames
            : typeof req.siteNames === "string"
              ? [req.siteNames]
              : [];

          const equipmentTypesList = Array.isArray(req.equipmentTypes)
            ? req.equipmentTypes
            : typeof req.equipmentTypes === "string"
              ? [req.equipmentTypes]
              : [];

          const optionalServicesList = Array.isArray(req.optionalServices)
            ? req.optionalServices
            : typeof req.optionalServices === "string"
              ? [req.optionalServices]
              : [];

          return {
            inquiryId:
              req.requestId ||
              `QIN-${(req.id || "").substring(0, 8).toUpperCase()}`,
            status: (req.status === "INACTIVE"
              ? "INACTIVE"
              : "ACTIVE") as InquiryStatus,
            inquiryDate: req.createdAt || new Date().toISOString(),
            company: {
              companyId: req.companyId || req.id,
              name: req.companyName || "Registered Company",
              contactPerson: req.contactPerson || "Contact Person",
              email: req.email || "-",
              phone: req.phone || "-",
              location: req.siteLocation || "Main Mining Site",
            },
            requirement: {
              quotationType: req.quotationType || "Commercial Quotation",
              numberOfSites: Number(req.numberOfSites) || 1,
              siteNames:
                siteNamesList.length > 0 ? siteNamesList : ["Main Site"],
              activeMachines: Number(req.activeMachines) || 1,
              equipmentTypes:
                equipmentTypesList.length > 0
                  ? equipmentTypesList
                  : ["Excavators"],
              requestedServiceIds: optionalServicesList,
              requirementDescription:
                req.implementationRequirements ||
                "Customer submitted quotation inquiry via portal.",
              otherRequirements: req.additionalRequirements || null,
            },
            trial: {
              requested: isTrial,
              duration: isTrial
                ? req.contractDuration || DEFAULT_TRIAL_DURATION
                : null,
              machines: isTrial
                ? Number(req.activeMachines) || DEFAULT_TRIAL_MACHINES
                : null,
              description: isTrial ? "Evaluation requested." : null,
            },
            quotationStatus: (req.quotationStatus as QuotationStatus) || null,
          };
        });
      }
    } catch (apiErr) {
      console.warn("Notice: Fetching quotation requests:", apiErr);
    }

    const combinedInquiries = [
      ...apiInquiries,
      ...mockInquiries.filter(
        (m) => !apiInquiries.some((a) => a.inquiryId === m.inquiryId),
      ),
    ];

    let rows = [...combinedInquiries];

    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter(
        (inq) =>
          inq.inquiryId.toLowerCase().includes(q) ||
          inq.company.name.toLowerCase().includes(q) ||
          inq.company.contactPerson.toLowerCase().includes(q) ||
          inq.company.email.toLowerCase().includes(q),
      );
    }
    if (params.status) {
      rows = rows.filter((inq) => inq.status === params.status);
    }
    if (params.quotationType) {
      rows = rows.filter(
        (inq) => inq.requirement.quotationType === params.quotationType,
      );
    }
    if (params.dateFrom) {
      const from = new Date(params.dateFrom).getTime();
      rows = rows.filter((inq) => new Date(inq.inquiryDate).getTime() >= from);
    }
    if (params.dateTo) {
      const to = new Date(params.dateTo).getTime() + 86_400_000 - 1;
      rows = rows.filter((inq) => new Date(inq.inquiryDate).getTime() <= to);
    }

    rows.sort((a, b) => (a.inquiryDate < b.inquiryDate ? 1 : -1));

    const totalRecords = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / params.limit));
    const start = (params.page - 1) * params.limit;
    const pageRows = rows.slice(start, start + params.limit);

    const summary: InquirySummary = {
      totalInquiries: combinedInquiries.length,
      pending: combinedInquiries.filter((i) => i.quotationStatus === null).length,
      readyToQuote: combinedInquiries.filter(
        (i) => i.quotationStatus === "DRAFT",
      ).length,
      sent: combinedInquiries.filter(
        (i) => i.quotationStatus !== null && i.quotationStatus !== "DRAFT",
      ).length,
    };

    return {
      data: pageRows,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalRecords,
        totalPages,
      },
      summary,
    };
  },

  async getInquiryById(id: string): Promise<ApiResponse<QuotationInquiry>> {
    await wait(NETWORK_DELAY_MS / 2);
    maybeThrowSimulatedError();
    const found = mockInquiries.find((i) => i.inquiryId === id);
    if (!found) {
      const err: ApiErrorShape = {
        response: { data: { message: `Inquiry ${id} was not found.` } },
      };
      throw err;
    }
    return { data: found };
  },

  async getDraftForInquiry(inquiry: QuotationInquiry): Promise<QuotationDraft> {
    await wait(200);
    return (
      draftsByInquiryId.get(inquiry.inquiryId) ?? buildDefaultDraft(inquiry)
    );
  },

  async saveQuotationDraft(
    draft: QuotationDraft,
  ): Promise<ApiResponse<QuotationInquiry>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();
    draftsByInquiryId.set(draft.inquiryId, draft);
    const idx = mockInquiries.findIndex((i) => i.inquiryId === draft.inquiryId);
    if (idx === -1) {
      const err: ApiErrorShape = {
        response: {
          data: { message: `Inquiry ${draft.inquiryId} was not found.` },
        },
      };
      throw err;
    }
    if (mockInquiries[idx].quotationStatus === null) {
      mockInquiries[idx] = { ...mockInquiries[idx], quotationStatus: "DRAFT" };
    }
    return {
      data: mockInquiries[idx],
      message: `Quotation for ${draft.inquiryId} saved as draft.`,
    };
  },

  async sendQuotation(
    inquiry: QuotationInquiry,
    draft: QuotationDraft,
  ): Promise<ApiResponse<QuotationResponse>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();
    draftsByInquiryId.set(draft.inquiryId, draft);
    const idx = mockInquiries.findIndex((i) => i.inquiryId === draft.inquiryId);
    if (idx === -1) {
      const err: ApiErrorShape = {
        response: {
          data: { message: `Inquiry ${draft.inquiryId} was not found.` },
        },
      };
      throw err;
    }
    mockInquiries[idx] = { ...mockInquiries[idx], quotationStatus: "SENT" };
    const totals = computeQuotationTotals(draft);
    const response: QuotationResponse = {
      quotationId: `QUO-${String(1000 + mockResponses.length)}`,
      inquiryId: inquiry.inquiryId,
      company: inquiry.company,
      sentDate: new Date().toISOString(),
      quotationAmount: totals.contractValue,
      status: "SENT",
      responseDate: null,
      draft,
      inquirySnapshot: mockInquiries[idx],
    };
    mockResponses.unshift(response);
    return {
      data: response,
      message: `Quotation sent to ${inquiry.company.name}.`,
    };
  },

  async getResponses(
    params: ResponseListParams,
  ): Promise<ApiResponse<QuotationResponse[]>> {
    await wait(NETWORK_DELAY_MS);
    maybeThrowSimulatedError();

    let rows = [...mockResponses];
    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.quotationId.toLowerCase().includes(q) ||
          r.inquiryId.toLowerCase().includes(q) ||
          r.company.name.toLowerCase().includes(q),
      );
    }
    if (params.status) {
      rows = rows.filter((r) => r.status === params.status);
    }
    rows.sort((a, b) => (a.sentDate < b.sentDate ? 1 : -1));

    const totalRecords = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / params.limit));
    const start = (params.page - 1) * params.limit;
    const pageRows = rows.slice(start, start + params.limit);

    return {
      data: pageRows,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalRecords,
        totalPages,
      },
    };
  },
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  const shaped = error as ApiErrorShape | undefined;
  const backendMessage = shaped?.response?.data?.message ?? shaped?.message;
  return backendMessage && backendMessage.trim().length > 0
    ? backendMessage
    : fallback;
}

/* ============================================================================
 * 4. CALCULATION UTILITIES — centralized so totals are never hand-computed
 *    inside JSX. BACKEND TODO: server should recompute/validate these same
 *    totals before persisting a sent quotation.
 * ==========================================================================*/

function parseContractMonths(duration: string): number {
  const match = /^(\d+)/.exec(duration);
  return match ? parseInt(match[1], 10) : 0;
}

function computeSelectedServicesTotal(
  services: readonly SelectedService[],
): number {
  return services
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + (Number.isFinite(s.price) ? s.price : 0), 0);
}

export function computeQuotationTotals(draft: QuotationDraft): QuotationTotals {
  const additionalServicesTotal = computeSelectedServicesTotal(draft.services);
  const oneTimeTotal = draft.onceOffImplementationFee + additionalServicesTotal;
  const monthlyRecurringTotal =
    draft.monthlySiteLicence + draft.additionalMachineCharge;
  const months = parseContractMonths(draft.contractDuration);
  const contractValue = oneTimeTotal + monthlyRecurringTotal * months;
  return {
    additionalServicesTotal,
    oneTimeTotal,
    monthlyRecurringTotal,
    contractValue,
  };
}

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function clampPositiveInteger(n: number): number {
  const rounded = Math.round(n);
  return Number.isFinite(rounded) && rounded >= 0 ? rounded : 0;
}

function formatZAR(amount: number): string {
  return `R${Math.round(amount).toLocaleString("en-ZA")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ============================================================================
 * 5. DRAFT VALIDATION
 * ==========================================================================*/

interface DraftErrors {
  contractDuration?: string;
  licensedMachineAllowance?: string;
  paymentTerms?: string;
  trialDuration?: string;
  trialMachines?: string;
}

function validateDraft(draft: QuotationDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.contractDuration)
    errors.contractDuration = "Contract duration is required.";
  if (!draft.licensedMachineAllowance || draft.licensedMachineAllowance <= 0) {
    errors.licensedMachineAllowance = "Licensed machine allowance is required.";
  }
  if (!draft.paymentTerms) errors.paymentTerms = "Payment terms are required.";
  if (draft.trialRequested) {
    if (!draft.trialDuration)
      errors.trialDuration = "Trial duration is required.";
    if (!draft.trialMachines || draft.trialMachines <= 0) {
      errors.trialMachines = "Trial machines must be a positive integer.";
    }
  }
  return errors;
}

/* ============================================================================
 * 6. TOAST SYSTEM (minimal — swap for the project's existing toast system
 *    if one exists in the host app).
 * ==========================================================================*/

interface ToastItem {
  readonly id: number;
  readonly kind: "success" | "error";
  readonly message: string;
}

function useToastState() {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastItem["kind"], message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  const dismiss = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  const success = useCallback(
    (message: string) => push("success", message),
    [push],
  );
  const error = useCallback(
    (message: string) => push("error", message),
    [push],
  );

  return useMemo(
    () => ({ toasts, success, error, dismiss }),
    [toasts, success, error, dismiss],
  );
}

function Portal({ children }: { readonly children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  readonly toasts: readonly ToastItem[];
  readonly onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <Portal>
      <div
        className="fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-current/70 hover:text-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Portal>
  );
}

/* ============================================================================
 * 7. ICONS (inline SVG — no icon library dependency)
 * ==========================================================================*/

function IconSearch(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function IconX(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M18 6 6 18M6 6l12 12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconEye(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconSend(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="m22 2-7 20-4-9-9-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSpinner(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${p.className ?? ""}`}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth={3}
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconAlert(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconInbox(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M22 12h-6l-2 3h-4l-2-3H2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.4 5.6 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.4A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconClock(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLayers(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path
        d="m3 12 9 5 9-5M3 17l9 5 9-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconWallet(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...p}
    >
      <path
        d="M21 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16v-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 7V5a2 2 0 0 0-2-2H5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="13" r="1.4" />
    </svg>
  );
}

/* ============================================================================
 * 8. SMALL PRESENTATIONAL PRIMITIVES
 * ==========================================================================*/

function Chip({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

function InquiryStatusBadge({ status }: { readonly status: InquiryStatus }) {
  const styles: Record<InquiryStatus, string> = {
    ACTIVE:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    INACTIVE:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {INQUIRY_STATUS_LABEL[status]}
    </span>
  );
}

function QuotationStatusBadge({
  status,
}: {
  readonly status: QuotationStatus | null;
}) {
  if (status === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        Pending
      </span>
    );
  }
  const styles: Record<QuotationStatus, string> = {
    DRAFT:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    SENT: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    ACCEPTED:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    REJECTED:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    EXPIRED:
      "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {QUOTATION_STATUS_LABEL[status]}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly tone?: "neutral" | "primary";
  readonly children: ReactNode;
}) {
  const toneClasses =
    tone === "primary"
      ? "text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses}`}
    >
      {children}
    </button>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  readonly children: ReactNode;
  readonly required?: boolean;
}) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/50";

function FieldError({ message }: { readonly message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/* ============================================================================
 * 9. TABS
 * ==========================================================================*/

type ActiveTab = "inquiry" | "responses";

function QuotationTabs({
  active,
  onChange,
}: {
  readonly active: ActiveTab;
  readonly onChange: (tab: ActiveTab) => void;
}) {
  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "inquiry", label: "Quotation Inquiry" },
    { key: "responses", label: "Quotation Responses" },
  ];
  return (
    <div
      className="flex gap-6 border-b border-slate-200 dark:border-slate-800"
      role="tablist"
      aria-label="Quotation sections"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative -mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              isActive
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================================
 * 10. SUMMARY CARDS
 * ==========================================================================*/

function SummaryCards({
  summary,
}: {
  readonly summary: InquirySummary | undefined;
}) {
  if (!summary) return null;
  const cards: {
    key: string;
    label: string;
    value: number;
    icon: ReactNode;
    tint: string;
  }[] = [
    {
      key: "total",
      label: "Total Inquiries",
      value: summary.totalInquiries,
      icon: <IconInbox className="h-4 w-4" />,
      tint: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      key: "pending",
      label: "Pending",
      value: summary.pending,
      icon: <IconClock className="h-4 w-4" />,
      tint: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      key: "ready",
      label: "Ready to Quote",
      value: summary.readyToQuote,
      icon: <IconLayers className="h-4 w-4" />,
      tint: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    },
    {
      key: "sent",
      label: "Sent",
      value: summary.sent,
      icon: <IconSend className="h-4 w-4" />,
      tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.tint}`}
          >
            {c.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-none text-slate-900 dark:text-white">
              {c.value}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {c.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * 11. INQUIRY FILTERS
 * ==========================================================================*/

interface InquiryFilterState {
  readonly search: string;
  readonly status: InquiryStatus | "";
  readonly quotationType: string;
  readonly dateFrom: string;
  readonly dateTo: string;
}

const emptyInquiryFilters: InquiryFilterState = {
  search: "",
  status: "",
  quotationType: "",
  dateFrom: "",
  dateTo: "",
};

function InquiryFilters({
  filters,
  onChange,
}: {
  readonly filters: InquiryFilterState;
  readonly onChange: (next: InquiryFilterState) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by company name, contact person, email or inquiry ID..."
          aria-label="Search inquiries"
          className={`${inputClasses} pl-9`}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Status
          <AppSelect
            value={filters.status}
            onChange={(value) =>
              onChange({
                ...filters,
                status: value as InquiryFilterState["status"],
              })
            }
            options={STATUS_SELECT_OPTIONS}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Quotation Type
          <AppSelect
            value={filters.quotationType}
            onChange={(value) => onChange({ ...filters, quotationType: value })}
            options={QUOTATION_TYPE_SELECT_OPTIONS}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onChange(emptyInquiryFilters)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 12. SKELETON / EMPTY / ERROR
 * ==========================================================================*/

function TableSkeleton({
  rows = 6,
  cols = 7,
}: {
  readonly rows?: number;
  readonly cols?: number;
}) {
  return (
    <div
      className="animate-pulse divide-y divide-slate-100 dark:divide-slate-800"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((__, j) => (
            <div
              key={j}
              className="h-3 flex-1 rounded bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  readonly title: string;
  readonly subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <IconInbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {title}
      </p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <IconAlert className="h-8 w-8 text-red-400" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Retry
      </button>
    </div>
  );
}

/* Local pagination UI removed — the project's common CommonPagination
 * component (imported above) is used instead. See its two call sites in
 * QuotationInquiryTabContent and QuotationResponsesTabContent. */

/* ============================================================================
 * 13. INQUIRY TABLE
 * ==========================================================================*/

function InquiryTable({
  inquiries,
  onView,
  onSendQuotation,
}: {
  readonly inquiries: readonly QuotationInquiry[];
  readonly onView: (inquiry: QuotationInquiry) => void;
  readonly onSendQuotation: (inquiry: QuotationInquiry) => void;
}) {
  return (
    <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Inquiry ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Company
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Contact
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Sites / Machines
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Received Date
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Status
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {inquiries.map((inquiry) => {
            return (
              <tr
                key={inquiry.inquiryId}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                  {inquiry.inquiryId}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {inquiry.company.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {inquiry.company.location}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-200">
                      {inquiry.company.contactPerson}
                    </span>
                    <span className="text-xs text-slate-400">
                      {inquiry.company.email}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  <div className="flex flex-col">
                    <span>{inquiry.requirement.numberOfSites} Sites</span>
                    <span className="text-xs text-slate-400">
                      {inquiry.requirement.activeMachines} Machines
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                  {formatDateTime(inquiry.inquiryDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <InquiryStatusBadge status={inquiry.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <IconButton
                      label="View inquiry"
                      onClick={() => onView(inquiry)}
                    >
                      <IconEye className="h-4 w-4" />
                    </IconButton>
                    <button
                      type="button"
                      onClick={() => onSendQuotation(inquiry)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <IconSend className="h-3.5 w-3.5" />
                      Send Quotation
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * 14. RIGHT-SIDE DRAWER SHELL — reused by both the Inquiry Details drawer
 *     and the Send Quotation drawer so header/footer chrome never diverges.
 * ==========================================================================*/

function DrawerShell({
  open,
  widthClassName,
  onClose,
  headerIcon,
  title,
  subtitle,
  children,
  footer,
}: {
  readonly open: boolean;
  readonly widthClassName: string;
  readonly onClose: () => void;
  readonly headerIcon: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[99999] ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close overlay"
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className={`absolute inset-y-0 right-0 flex h-full w-full ${widthClassName} flex-col bg-white shadow-2xl outline-none transition-transform duration-200 dark:bg-slate-900 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                {headerIcon}
              </span>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function SectionHeading({ children }: { readonly children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
      {children}
    </h3>
  );
}

/* ============================================================================
 * 15. INQUIRY DETAILS DRAWER (VIEW)
 * ==========================================================================*/

function InquiryDetailsDrawer({
  inquiry,
  open,
  onClose,
  onSendQuotation,
}: {
  readonly inquiry: QuotationInquiry | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSendQuotation: (inquiry: QuotationInquiry) => void;
}) {
  if (!inquiry) return null;
  const { company, requirement, trial } = inquiry;
  const requestedServices = requirement.requestedServiceIds
    .map(getServiceById)
    .filter((s): s is AdditionalService => Boolean(s));
  const alreadyQuoted = inquiry.quotationStatus !== null;

  return (
    <DrawerShell
      open={open}
      widthClassName="max-w-xl"
      onClose={onClose}
      headerIcon={<IconEye className="h-4 w-4" />}
      title="Inquiry Details"
      subtitle={inquiry.inquiryId}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onSendQuotation(inquiry)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <IconSend className="h-4 w-4" />
            {alreadyQuoted ? "View Quotation" : "Send Quotation"}
          </button>
        </>
      }
    >
      <section aria-labelledby="company-details-heading">
        <SectionHeading>Company Details</SectionHeading>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-400">Company Name</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Contact Person
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.contactPerson}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Email</dt>
            <dd className="mt-0.5 break-all text-slate-800 dark:text-slate-200">
              {company.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">Phone</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.phone}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">
              Site / Location
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {company.location}
            </dd>
          </div>
        </dl>
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="client-requirements-heading">
        <SectionHeading>Client Requirements</SectionHeading>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Quotation Type
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {requirement.quotationType}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Number of Sites
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {requirement.numberOfSites}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-400">
              Active Machines
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
              {requirement.activeMachines}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">
              Equipment Types
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {requirement.equipmentTypes.map((e) => (
                <Chip key={e}>{e}</Chip>
              ))}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-400">
              Requested Services
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {requestedServices.length > 0 ? (
                requestedServices.map((s) => <Chip key={s.id}>{s.name}</Chip>)
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  None specified.
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="requirement-description-heading">
        <SectionHeading>Requirement Description</SectionHeading>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {requirement.requirementDescription}
        </p>
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="trial-request-heading">
        <SectionHeading>Trial Request</SectionHeading>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Trial Requested:{" "}
          <span
            className={`font-semibold ${trial.requested ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}
          >
            {trial.requested ? "Yes" : "No"}
          </span>
        </p>
        {trial.requested && (
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-400">
                Requested Trial Duration
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {trial.duration}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-400">
                Requested Trial Machines
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {trial.machines}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-400">
                Trial Description
              </dt>
              <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                {trial.description}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <hr className="my-5 border-slate-100 dark:border-slate-800" />

      <section aria-labelledby="other-requirements-heading">
        <SectionHeading>Other Requirements</SectionHeading>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {requirement.otherRequirements ??
            "No additional requirements provided."}
        </p>
      </section>
    </DrawerShell>
  );
}

/* ============================================================================
 * 16. SEND QUOTATION DRAWER
 * ==========================================================================*/

function CommercialDetailsSection({
  draft,
  errors,
  readOnly,
  onChange,
}: {
  readonly draft: QuotationDraft;
  readonly errors: DraftErrors;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<QuotationDraft>) => void;
}) {
  return (
    <section aria-labelledby="commercial-details-heading">
      <SectionHeading>Commercial Details</SectionHeading>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <FieldLabel required>Contract Duration</FieldLabel>
          <AppSelect
            value={draft.contractDuration}
            disabled={readOnly}
            onChange={(value) => onChange({ contractDuration: value })}
            options={CONTRACT_DURATION_SELECT_OPTIONS}
          />
          <FieldError message={errors.contractDuration} />
        </div>

        <div>
          <FieldLabel required>Licensed Machine Allowance</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.licensedMachineAllowance}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                licensedMachineAllowance: clampPositiveInteger(
                  Number(e.target.value),
                ),
              })
            }
            className={inputClasses}
          />
          <FieldError message={errors.licensedMachineAllowance} />
        </div>

        <div>
          <FieldLabel>Once-Off Implementation Fee (R)</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.onceOffImplementationFee}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                onceOffImplementationFee: clampNonNegative(
                  Number(e.target.value),
                ),
              })
            }
            className={inputClasses}
          />
        </div>

        <div>
          <FieldLabel>Monthly Site Licence (R)</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.monthlySiteLicence}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                monthlySiteLicence: clampNonNegative(Number(e.target.value)),
              })
            }
            className={inputClasses}
          />
        </div>

        <div>
          <FieldLabel>Additional Machine Charge (R)</FieldLabel>
          <input
            type="number"
            min={0}
            value={draft.additionalMachineCharge}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                additionalMachineCharge: clampNonNegative(
                  Number(e.target.value),
                ),
              })
            }
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-slate-400">
            Monthly charge per machine above the allowance.
          </p>
        </div>

        <div>
          <FieldLabel required>Payment Terms</FieldLabel>
          <AppSelect
            value={draft.paymentTerms}
            disabled={readOnly}
            onChange={(value) => onChange({ paymentTerms: value })}
            options={PAYMENT_TERMS_SELECT_OPTIONS}
          />
          <FieldError message={errors.paymentTerms} />
        </div>
      </div>
    </section>
  );
}

function TrialOptionSection({
  draft,
  errors,
  readOnly,
  onChange,
}: {
  readonly draft: QuotationDraft;
  readonly errors: DraftErrors;
  readonly readOnly: boolean;
  readonly onChange: (patch: Partial<QuotationDraft>) => void;
}) {
  return (
    <section aria-labelledby="trial-option-heading">
      <SectionHeading>Trial Option</SectionHeading>
      <div className="mt-3">
        <FieldLabel>Trial Requested by Client?</FieldLabel>
        <div className="flex items-center gap-6">
          {(["Yes", "No"] as const).map((opt) => {
            const isYes = opt === "Yes";
            const checked = draft.trialRequested === isYes;
            return (
              <label
                key={opt}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
              >
                <span
                  onClick={() =>
                    !readOnly && onChange({ trialRequested: isYes })
                  }
                  className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                    checked
                      ? "border-blue-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {checked && (
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </span>
                {opt}
              </label>
            );
          })}
        </div>
      </div>

      {draft.trialRequested && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div>
            <FieldLabel required>Trial Duration</FieldLabel>
            <AppSelect
              value={draft.trialDuration}
              disabled={readOnly}
              onChange={(value) => onChange({ trialDuration: value })}
              options={TRIAL_DURATION_SELECT_OPTIONS}
            />
            <FieldError message={errors.trialDuration} />
          </div>

          <div>
            <FieldLabel required>Trial Machines</FieldLabel>
            <input
              type="number"
              min={0}
              value={draft.trialMachines}
              disabled={readOnly}
              onChange={(e) =>
                onChange({
                  trialMachines: clampPositiveInteger(Number(e.target.value)),
                })
              }
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-slate-400">
              Default trial machines: {DEFAULT_TRIAL_MACHINES}.
            </p>
            <FieldError message={errors.trialMachines} />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Trial Description</FieldLabel>
            <textarea
              value={draft.trialDescription}
              disabled={readOnly}
              onChange={(e) => onChange({ trialDescription: e.target.value })}
              rows={2}
              className={inputClasses}
              placeholder="Client would like to evaluate the system before final implementation."
            />
          </div>
        </div>
      )}
    </section>
  );
}

function AdditionalServicesSection({
  services,
  readOnly,
  onToggle,
  onPriceChange,
  total,
}: {
  readonly services: readonly SelectedService[];
  readonly readOnly: boolean;
  readonly onToggle: (serviceId: string) => void;
  readonly onPriceChange: (serviceId: string, price: number) => void;
  readonly total: number;
}) {
  return (
    <section aria-labelledby="additional-services-heading">
      <SectionHeading>Additional Services</SectionHeading>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-2.5">
                Service
              </th>
              <th scope="col" className="px-4 py-2.5">
                Description
              </th>
              <th scope="col" className="px-4 py-2.5 text-center">
                Select
              </th>
              <th scope="col" className="px-4 py-2.5 text-right">
                Price (R)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {services.map((selection) => {
              const service = getServiceById(selection.serviceId);
              if (!service) return null;
              return (
                <tr key={service.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {service.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {service.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selection.selected}
                      disabled={readOnly}
                      onChange={() => onToggle(service.id)}
                      aria-label={`Select ${service.name}`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={selection.price}
                      disabled={readOnly || !selection.selected}
                      onChange={(e) =>
                        onPriceChange(
                          service.id,
                          clampNonNegative(Number(e.target.value)),
                        )
                      }
                      className={`${inputClasses} text-right`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-slate-800">
              <td
                colSpan={3}
                className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Total Additional Services
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                {formatZAR(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function QuotationSummarySection({
  draft,
}: {
  readonly draft: QuotationDraft;
}) {
  const totals = computeQuotationTotals(draft);
  const months = parseContractMonths(draft.contractDuration);
  return (
    <section
      aria-labelledby="quotation-summary-heading"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40"
    >
      <SectionHeading>Quotation Summary</SectionHeading>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="font-medium text-slate-500 dark:text-slate-400">
          One-Time Charges
        </p>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Implementation Fee</span>
          <span>{formatZAR(draft.onceOffImplementationFee)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Additional Services</span>
          <span>{formatZAR(totals.additionalServicesTotal)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
          <span>One-Time Total</span>
          <span>{formatZAR(totals.oneTimeTotal)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <p className="font-medium text-slate-500 dark:text-slate-400">
          Recurring Charges
        </p>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Monthly Site Licence</span>
          <span>{formatZAR(draft.monthlySiteLicence)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
          <span>Additional Machine Charges</span>
          <span>{formatZAR(draft.additionalMachineCharge)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
          <span>Monthly Recurring Total</span>
          <span>{formatZAR(totals.monthlyRecurringTotal)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-600 px-4 py-3 text-white">
        <div>
          <p className="text-xs opacity-80">
            Total Contract Value ({months || 0} months)
          </p>
          <p className="text-lg font-semibold">
            {formatZAR(totals.contractValue)}
          </p>
        </div>
        <IconWallet className="h-6 w-6 opacity-80" />
      </div>
    </section>
  );
}

function SendQuotationDrawer({
  inquiry,
  open,
  mode,
  onClose,
  onSaveDraft,
  onRequestSend,
  savingState,
}: {
  readonly inquiry: QuotationInquiry | null;
  readonly open: boolean;
  readonly mode: "edit" | "view";
  readonly onClose: () => void;
  readonly onSaveDraft: (draft: QuotationDraft) => void;
  readonly onRequestSend: (draft: QuotationDraft) => void;
  readonly savingState: "idle" | "draft" | "send";
}) {
  const [draft, setDraft] = useState<QuotationDraft | null>(null);
  const [errors, setErrors] = useState<DraftErrors>({});

  useEffect(() => {
    if (!inquiry || !open) return;
    let cancelled = false;
    quotationService.getDraftForInquiry(inquiry).then((loaded) => {
      if (!cancelled) {
        setDraft(loaded);
        setErrors({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inquiry, open]);

  const patchDraft = useCallback((patch: Partial<QuotationDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const toggleService = useCallback((serviceId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) =>
          s.serviceId === serviceId ? { ...s, selected: !s.selected } : s,
        ),
      };
    });
  }, []);

  const changeServicePrice = useCallback((serviceId: string, price: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) =>
          s.serviceId === serviceId ? { ...s, price } : s,
        ),
      };
    });
  }, []);

  if (!inquiry || !draft) return null;
  const readOnly = mode === "view";
  const totals = computeQuotationTotals(draft);
  const servicesTotal = totals.additionalServicesTotal;

  function handleSaveDraft() {
    if (!draft) return;
    onSaveDraft(draft);
  }

  function handleSendClick() {
    if (!draft) return;
    const validation = validateDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onRequestSend(draft);
  }

  return (
    <DrawerShell
      open={open}
      widthClassName="max-w-3xl"
      onClose={onClose}
      headerIcon={<IconSend className="h-4 w-4" />}
      title={readOnly ? "Quotation Details" : "Send Quotation"}
      subtitle={`${inquiry.inquiryId} · ${inquiry.company.name}`}
      footer={
        readOnly ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={savingState !== "idle"}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingState !== "idle"}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950"
            >
              {savingState === "draft" && <IconSpinner className="h-4 w-4" />}
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSendClick}
              disabled={savingState !== "idle"}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingState === "send" ? (
                <IconSpinner className="h-4 w-4" />
              ) : (
                <IconSend className="h-4 w-4" />
              )}
              {savingState === "send" ? "Sending..." : "Send Quotation"}
            </button>
          </>
        )
      }
    >
      <div className="space-y-6">
        <section aria-labelledby="inquiry-reference-heading">
          <SectionHeading>Inquiry Reference</SectionHeading>
          <div className="mt-3 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/40">
            <ReadOnlyField label="Inquiry ID" value={inquiry.inquiryId} />
            <ReadOnlyField label="Company" value={inquiry.company.name} />
            <ReadOnlyField
              label="Contact Person"
              value={inquiry.company.contactPerson}
            />
            <ReadOnlyField label="Email" value={inquiry.company.email} />
            <ReadOnlyField label="Phone" value={inquiry.company.phone} />
            <ReadOnlyField label="Site" value={inquiry.company.location} />
            <ReadOnlyField
              label="Quotation Type"
              value={inquiry.requirement.quotationType}
            />
            <ReadOnlyField
              label="Sites"
              value={inquiry.requirement.numberOfSites}
            />
            <ReadOnlyField
              label="Active Machines"
              value={inquiry.requirement.activeMachines}
            />
          </div>
        </section>

        <hr className="border-slate-100 dark:border-slate-800" />

        <CommercialDetailsSection
          draft={draft}
          errors={errors}
          readOnly={readOnly}
          onChange={patchDraft}
        />

        <hr className="border-slate-100 dark:border-slate-800" />

        <TrialOptionSection
          draft={draft}
          errors={errors}
          readOnly={readOnly}
          onChange={patchDraft}
        />

        <hr className="border-slate-100 dark:border-slate-800" />

        <AdditionalServicesSection
          services={draft.services}
          readOnly={readOnly}
          onToggle={toggleService}
          onPriceChange={changeServicePrice}
          total={servicesTotal}
        />

        <hr className="border-slate-100 dark:border-slate-800" />

        <section aria-labelledby="description-notes-heading">
          <SectionHeading>Description / Notes</SectionHeading>
          <textarea
            value={draft.notes}
            disabled={readOnly}
            onChange={(e) => patchDraft({ notes: e.target.value })}
            rows={4}
            placeholder="Quotation description, implementation notes, special conditions..."
            className={`${inputClasses} mt-2`}
          />
        </section>

        <hr className="border-slate-100 dark:border-slate-800" />

        <QuotationSummarySection draft={draft} />
      </div>
    </DrawerShell>
  );
}

/* ============================================================================
 * 17. SEND CONFIRMATION DIALOG
 * ==========================================================================*/

function SendConfirmationDialog({
  companyName,
  onCancel,
  onConfirm,
  loading,
}: {
  readonly companyName: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly loading: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel, loading]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close dialog overlay"
          onClick={() => !loading && onCancel()}
          className="absolute inset-0 bg-slate-900/50"
        />
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-send-title"
          aria-describedby="confirm-send-description"
          className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl outline-none dark:bg-slate-900"
        >
          <h2
            id="confirm-send-title"
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            Send this quotation?
          </h2>
          <p
            id="confirm-send-description"
            className="mt-2 text-sm text-slate-600 dark:text-slate-400"
          >
            Are you sure you want to send this quotation to {companyName}?
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <IconSpinner className="h-4 w-4" />}
              {loading ? "Sending..." : "Send Quotation"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ============================================================================
 * 18. QUOTATION RESPONSES TAB
 * ==========================================================================*/

interface ResponseFilterState {
  readonly search: string;
  readonly status: QuotationStatus | "";
}

const emptyResponseFilters: ResponseFilterState = { search: "", status: "" };

function ResponseFilters({
  filters,
  onChange,
}: {
  readonly filters: ResponseFilterState;
  readonly onChange: (next: ResponseFilterState) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by quotation ID, inquiry ID or company..."
          aria-label="Search quotation responses"
          className={`${inputClasses} pl-9`}
        />
      </div>
      <AppSelect
        value={filters.status}
        onChange={(value) =>
          onChange({
            ...filters,
            status: value as ResponseFilterState["status"],
          })
        }
        options={RESPONSE_STATUS_SELECT_OPTIONS}
        className="sm:w-56"
      />
      <button
        type="button"
        onClick={() => onChange(emptyResponseFilters)}
        className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Reset
      </button>
    </div>
  );
}

function ResponsesTable({
  responses,
  onView,
}: {
  readonly responses: readonly QuotationResponse[];
  readonly onView: (response: QuotationResponse) => void;
}) {
  return (
    <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Quotation ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Inquiry ID
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Company
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Sent Date
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Quotation Amount
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Status
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Response Date
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {responses.map((r) => (
            <tr
              key={r.quotationId}
              className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                {r.quotationId}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                {r.inquiryId}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                {r.company.name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                {formatDateTime(r.sentDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                {formatZAR(r.quotationAmount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <QuotationStatusBadge status={r.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                {r.responseDate ? formatDateTime(r.responseDate) : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <IconButton
                  label="View quotation"
                  tone="primary"
                  onClick={() => onView(r)}
                >
                  <IconEye className="h-4 w-4" />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * 19. REQUEST-STATE MODEL (shared by both tabs)
 * ==========================================================================*/

type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      data: T;
      pagination?: Pagination;
      summary?: InquirySummary;
    }
  | { status: "error"; message: string };

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 400;

/* ============================================================================
 * 20. QUOTATION INQUIRY TAB (composed page section)
 * ==========================================================================*/

function QuotationInquiryTabContent({
  toast,
  onView,
  onSendQuotation,
  refreshTick,
}: {
  readonly toast: ReturnType<typeof useToastState>;
  readonly onView: (inquiry: QuotationInquiry) => void;
  readonly onSendQuotation: (inquiry: QuotationInquiry) => void;
  readonly refreshTick: number;
}) {
  const [listState, setListState] = useState<RequestState<QuotationInquiry[]>>({
    status: "idle",
  });
  const [filters, setFilters] =
    useState<InquiryFilterState>(emptyInquiryFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.quotationType, filters.dateFrom, filters.dateTo]);

  const fetchInquiries = useCallback(async () => {
    setListState({ status: "loading" });
    try {
      const response = await quotationService.getInquiries({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        quotationType: filters.quotationType || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      setListState({
        status: "success",
        data: response.data,
        pagination: response.pagination,
        summary: response.summary,
      });
    } catch (error) {
      setListState({
        status: "error",
        message: getApiErrorMessage(
          error,
          "Unable to load quotation inquiries.",
        ),
      });
    }
  }, [
    page,
    debouncedSearch,
    filters.status,
    filters.quotationType,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useEffect(() => {
    fetchInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInquiries, refreshTick]);

  const inquiries = listState.status === "success" ? listState.data : [];
  const pagination =
    listState.status === "success" ? listState.pagination : undefined;
  const summary =
    listState.status === "success" ? listState.summary : undefined;

  const body = useMemo(() => {
    if (listState.status === "loading" || listState.status === "idle")
      return <TableSkeleton />;
    if (listState.status === "error")
      return (
        <ErrorState message={listState.message} onRetry={fetchInquiries} />
      );
    if (inquiries.length === 0)
      return (
        <EmptyState
          title="No quotation inquiries found."
          subtitle="There are currently no active quotation requests."
        />
      );
    return (
      <InquiryTable
        inquiries={inquiries}
        onView={onView}
        onSendQuotation={onSendQuotation}
      />
    );
  }, [listState, inquiries, fetchInquiries, onView, onSendQuotation]);

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards summary={summary} />
      <InquiryFilters filters={filters} onChange={setFilters} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {body}
        {listState.status === "success" &&
          inquiries.length > 0 &&
          pagination && (
            <CommonPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.totalRecords}
              onPageChange={setPage}
            />
          )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 21. QUOTATION RESPONSES TAB (composed page section)
 * ==========================================================================*/

function QuotationResponsesTabContent({
  onView,
  refreshTick,
}: {
  readonly onView: (response: QuotationResponse) => void;
  readonly refreshTick: number;
}) {
  const [listState, setListState] = useState<RequestState<QuotationResponse[]>>(
    { status: "idle" },
  );
  const [filters, setFilters] =
    useState<ResponseFilterState>(emptyResponseFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.status]);

  const fetchResponses = useCallback(async () => {
    setListState({ status: "loading" });
    try {
      const response = await quotationService.getResponses({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
      });
      setListState({
        status: "success",
        data: response.data,
        pagination: response.pagination,
      });
    } catch (error) {
      setListState({
        status: "error",
        message: getApiErrorMessage(
          error,
          "Unable to load quotation responses.",
        ),
      });
    }
  }, [page, debouncedSearch, filters.status]);

  useEffect(() => {
    fetchResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchResponses, refreshTick]);

  const responses = listState.status === "success" ? listState.data : [];
  const pagination =
    listState.status === "success" ? listState.pagination : undefined;

  const body = useMemo(() => {
    if (listState.status === "loading" || listState.status === "idle")
      return <TableSkeleton cols={7} />;
    if (listState.status === "error")
      return (
        <ErrorState message={listState.message} onRetry={fetchResponses} />
      );
    if (responses.length === 0)
      return (
        <EmptyState
          title="No quotation responses found."
          subtitle="Quotations that have been sent will appear here."
        />
      );
    return <ResponsesTable responses={responses} onView={onView} />;
  }, [listState, responses, fetchResponses, onView]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Quotation Responses
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track sent quotations and their client responses.
        </p>
      </div>

      <ResponseFilters filters={filters} onChange={setFilters} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {body}
        {listState.status === "success" &&
          responses.length > 0 &&
          pagination && (
            <CommonPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalRecords={pagination.totalRecords}
              onPageChange={setPage}
            />
          )}
      </div>
    </div>
  );
}

/* ============================================================================
 * 22. MAIN PAGE — top-level state per section 20 of the spec:
 *     selectedInquiry, drawer open flags, quotationDraft mode, filters live
 *     inside each tab's own component; everything cross-cutting lives here.
 * ==========================================================================*/

export default function QuotationManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("inquiry");

  const [selectedInquiry, setSelectedInquiry] =
    useState<QuotationInquiry | null>(null);
  const [isInquiryDetailsOpen, setIsInquiryDetailsOpen] = useState(false);
  const [isSendQuotationOpen, setIsSendQuotationOpen] = useState(false);
  const [sendDrawerMode, setSendDrawerMode] = useState<"edit" | "view">("edit");
  const [savingState, setSavingState] = useState<"idle" | "draft" | "send">(
    "idle",
  );
  const [pendingSendDraft, setPendingSendDraft] =
    useState<QuotationDraft | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const toast = useToastState();

  const handleView = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
    setIsInquiryDetailsOpen(true);
  }, []);

  const handleOpenSendQuotation = useCallback((inquiry: QuotationInquiry) => {
    setSelectedInquiry(inquiry);
    setSendDrawerMode("edit");
    setIsInquiryDetailsOpen(false);
    setIsSendQuotationOpen(true);
  }, []);

  const handleViewResponse = useCallback((response: QuotationResponse) => {
    setSelectedInquiry(response.inquirySnapshot);
    setSendDrawerMode("view");
    setIsSendQuotationOpen(true);
  }, []);

  const closeAllDrawers = useCallback(() => {
    setIsInquiryDetailsOpen(false);
    setIsSendQuotationOpen(false);
    setSelectedInquiry(null);
    setPendingSendDraft(null);
  }, []);

  const handleSaveDraft = useCallback(
    async (draft: QuotationDraft) => {
      if (!selectedInquiry) return;
      setSavingState("draft");
      try {
        const response = await quotationService.saveQuotationDraft(draft);
        toast.success(response.message ?? "Quotation saved as draft.");
        setIsSendQuotationOpen(false);
        setSelectedInquiry(null);
        setRefreshTick((t) => t + 1);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, "Unable to save quotation draft."),
        );
      } finally {
        setSavingState("idle");
      }
    },
    [selectedInquiry, toast],
  );

  const handleRequestSend = useCallback((draft: QuotationDraft) => {
    setPendingSendDraft(draft);
  }, []);

  const handleConfirmSend = useCallback(async () => {
    if (!selectedInquiry || !pendingSendDraft) return;
    setSavingState("send");
    try {
      const response = await quotationService.sendQuotation(
        selectedInquiry,
        pendingSendDraft,
      );
      toast.success(response.message ?? "Quotation sent successfully.");
      setPendingSendDraft(null);
      setIsSendQuotationOpen(false);
      setSelectedInquiry(null);
      setRefreshTick((t) => t + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to send quotation."));
    } finally {
      setSavingState("idle");
    }
  }, [selectedInquiry, pendingSendDraft, toast]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {activeTab === "inquiry" ? (
        <QuotationInquiryTabContent
          toast={toast}
          onView={handleView}
          onSendQuotation={handleOpenSendQuotation}
          refreshTick={refreshTick}
        />
      ) : (
        <QuotationResponsesTabContent
          onView={handleViewResponse}
          refreshTick={refreshTick}
        />
      )}

      <InquiryDetailsDrawer
        inquiry={selectedInquiry}
        open={isInquiryDetailsOpen}
        onClose={closeAllDrawers}
        onSendQuotation={handleOpenSendQuotation}
      />

      <SendQuotationDrawer
        inquiry={selectedInquiry}
        open={isSendQuotationOpen}
        mode={sendDrawerMode}
        onClose={closeAllDrawers}
        onSaveDraft={handleSaveDraft}
        onRequestSend={handleRequestSend}
        savingState={savingState}
      />

      {pendingSendDraft && selectedInquiry && (
        <SendConfirmationDialog
          companyName={selectedInquiry.company.name}
          onCancel={() => setPendingSendDraft(null)}
          onConfirm={handleConfirmSend}
          loading={savingState === "send"}
        />
      )}

      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
