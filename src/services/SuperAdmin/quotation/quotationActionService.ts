import { apiCall } from "../../apiHandler";
/* ============================================================================
 * 1. TYPES
 * ==========================================================================*/

export type QuotationListStatus =
  | "PENDING_REVIEW"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface QuotationOptionalService {
  readonly serviceId: string;
  readonly name: string;
  readonly price: number;
}
export interface Quotation {
  readonly id: string;
  readonly quotationNumber: string;
  readonly quotationRequestId: string | null;
  readonly companyId: string;
  readonly companyName: string;
  readonly contactPerson: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly status: string;
  readonly tier: string;
  readonly machineCount: number;
  readonly contractDuration: string;
  readonly billingFrequency: string;
  readonly licensedMachineAllowance?: number;
  readonly implementationFee?: string;
  readonly monthlySiteLicence?: string;
  readonly additionalMachineCharge?: string;
  readonly trialRequested?: boolean;
  readonly trialDuration?: string | null;
  readonly trialMachines?: number | null;
  readonly trialDescription?: string | null;
  readonly baseAmount?: string;
  readonly optionalServicesAmount?: string;
  readonly discountAmount?: string;
  readonly taxAmount?: string;
  readonly totalAmount?: string;
  readonly optionalServices?: readonly QuotationOptionalService[];
  readonly scopeOfWork?: string | null;
  readonly paymentTerms?: string;
  readonly notes?: string;
  readonly validUntil?: string;
  readonly sentAt?: string;
  readonly acceptedAt?: string | null;
  readonly rejectedAt?: string | null;
  readonly signedBy?: string | null;
  readonly signatureUrl?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly statusCode: number;
  readonly message: string;
  readonly data: T;
  readonly timestamp?: string;
}

export interface QuotationListParams {
  readonly status?: QuotationListStatus;
  readonly search?: string;
  readonly signal?: AbortSignal;
}

export interface QuotationListResult {
  readonly data: readonly Quotation[];
  readonly message?: string;
  readonly statusCode?: number;
}

/* ============================================================================
 * 2. ERROR NORMALIZATION — kept local, zero cross-file dependency.
 * ==========================================================================*/

export interface ApiErrorShape {
  readonly response?: {
    readonly status?: number;
    readonly data?: {
      readonly message?: string;
    };
  };
  readonly message?: string;
  readonly name?: string;
}

export function extractQuotationListError(
  error: unknown,
): string | undefined {
  if (error instanceof DOMException && error.name === "AbortError") {
    return undefined;
  }

  const shaped = error as ApiErrorShape | undefined;
  const backendMessage = shaped?.response?.data?.message ?? shaped?.message;

  if (typeof backendMessage === "string" && backendMessage.trim().length > 0) {
    return backendMessage;
  }

  return undefined;
}

/* ============================================================================
 * 3. HELPERS
 * ==========================================================================*/

const BASE_ENDPOINT = "/quotations";

function buildQuotationListEndpoint(
  filters: Omit<QuotationListParams, "signal"> = {},
): string {
  const query = new URLSearchParams();

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.search && filters.search.trim().length > 0) {
    query.set("search", filters.search.trim());
  }

  const queryString = query.toString();

  return queryString ? `${BASE_ENDPOINT}?${queryString}` : BASE_ENDPOINT;
}

/* ============================================================================
 * 4. SERVICE FUNCTIONS
 * ==========================================================================*/

export const getQuotationsList = async (
  params: QuotationListParams = {},
): Promise<readonly Quotation[]> => {
  const { signal, ...filters } = params;

  const response = await apiCall<ApiEnvelope<Quotation[]>>(
    buildQuotationListEndpoint(filters),
    {
      method: "GET",
      signal,
    },
    {
      showError: true,
    },
  );

  return Array.isArray(response?.data) ? response.data : [];
};

export const getQuotationsListWithMeta = async (
  params: QuotationListParams = {},
): Promise<QuotationListResult> => {
  const { signal, ...filters } = params;

  const response = await apiCall<ApiEnvelope<Quotation[]>>(
    buildQuotationListEndpoint(filters),
    {
      method: "GET",
      signal,
    },
    {
      showError: true,
    },
  );

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    message: response?.message,
    statusCode: response?.statusCode,
  };
};