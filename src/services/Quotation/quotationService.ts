/**
 * quotationService.ts
 * -----------------------------------------------------------------------
 * Single source of truth for all HTTP communication with the quotation
 * backend. No component should call fetch/axios directly for quotations —
 * everything goes through the functions exported here.
 *
 * Base endpoint: /quotations/requests
 *
 * MESSAGE POLICY:
 * - Backend success/error messages are handled by the shared apiHandler.
 * - This service never calls toast directly.
 * - Mutation APIs explicitly enable the centralized success Toast through
 *   apiCall({ showSuccess: true }).
 * - GET APIs do not show success Toasts.
 * - No fallback error messages are generated in this service.
 * - If the backend does not provide an error message, no message is returned.
 * -----------------------------------------------------------------------
 */

import { apiCall } from "../apiHandler";

/* ============================================================================
 * 1. ERROR NORMALIZATION
 * ==========================================================================*/

export interface ApiErrorShape {
  readonly response?: {
    readonly status?: number;
    readonly data?: {
      readonly message?: string;
      readonly errors?: readonly {
        field?: string;
        message: string;
      }[];
    };
  };
  readonly message?: string;
  readonly name?: string;
}

/**
 * Extracts only a message that actually exists on the backend/thrown error.
 *
 * No fallback message is generated here.
 *
 * Returns:
 * - string -> when a usable error message exists
 * - undefined -> when no usable message exists
 */
export function extractApiError(error: unknown): string | undefined {
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
 * 2. TYPES
 * ==========================================================================*/

export type QuotationRequestStatus =
  | "PENDING"
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

/**
 * Exact shape of one item in GET /quotations/requests `data[]`.
 */
export interface QuotationRequest {
  readonly id: string;
  readonly requestId: string;
  readonly userId: string;
  readonly companyId: string;
  readonly companyName: string;
  readonly contactPerson: string;
  readonly email: string;
  readonly phone: string;
  readonly siteLocation: string;
  readonly quotationType: string;
  readonly numberOfSites: number;
  readonly siteNames: readonly string[];
  readonly activeMachines: number;
  readonly equipmentTypes: readonly string[];
  readonly contractDuration: string | null;
  readonly optionalServices: readonly string[];
  readonly implementationRequirements: string | null;
  readonly additionalRequirements: string | null;
  readonly attachmentUrl: string | null;
  readonly status: QuotationRequestStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
  readonly statusCode?: number;
}

export interface QuotationRequestsMetaResult {
  readonly data: readonly QuotationRequest[];
  readonly message?: string;
  readonly statusCode?: number;
}

export interface QuotationRequestListParams {
  readonly status?: QuotationRequestStatus;
  readonly quotationType?: string;
  readonly search?: string;
  readonly signal?: AbortSignal;
}

export interface CreateQuotationRequestPayload {
  readonly companyId: string;
  readonly quotationType: string;
  readonly numberOfSites: number;
  readonly siteNames: readonly string[];
  readonly activeMachines: number;
  readonly equipmentTypes: readonly string[];
  readonly contractDuration?: string;
  readonly optionalServices?: readonly string[];
  readonly implementationRequirements?: string;
  readonly additionalRequirements?: string;
  readonly attachmentUrl?: string;
}

export type UpdateQuotationRequestPayload = Partial<
  CreateQuotationRequestPayload & {
    readonly status: QuotationRequestStatus;
  }
>;

/* ============================================================================
 * 3. HELPERS
 * ==========================================================================*/

function assertValidId(id: string): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error();
  }
}

const BASE_ENDPOINT = "/quotations/requests";

/**
 * Builds the query string for GET /quotations/requests.
 *
 * Only parameters that contain a value are included.
 */
function buildQuotationRequestsEndpoint(
  filters: Omit<QuotationRequestListParams, "signal"> = {},
): string {
  const query = new URLSearchParams();

  if (filters.status) {
    query.set("status", filters.status);
  }

  if (filters.quotationType) {
    query.set("quotationType", filters.quotationType);
  }

  if (filters.search) {
    query.set("search", filters.search);
  }

  const queryString = query.toString();

  return queryString ? `${BASE_ENDPOINT}?${queryString}` : BASE_ENDPOINT;
}

/* ============================================================================
 * 4. SERVICE FUNCTIONS
 * ==========================================================================*/

/**
 * Raw list call.
 *
 * GET requests intentionally do not show a success Toast.
 */
export async function getQuotationRequests(
  params: QuotationRequestListParams = {},
): Promise<readonly QuotationRequest[]> {
  const { signal, ...filters } = params;

  const result = await apiCall<ApiEnvelope<QuotationRequest[]>>(
    buildQuotationRequestsEndpoint(filters),
    {
      method: "GET",
      signal,
    },
  );

  return Array.isArray(result?.data) ? result.data : [];
}

/**
 * List call used by the Quotation List page.
 *
 * Returns backend data, message and status code.
 */
export async function getQuotationRequestsWithMeta(
  params: QuotationRequestListParams = {},
  signal?: AbortSignal,
): Promise<QuotationRequestsMetaResult> {
  const { signal: paramSignal, ...filters } = params;

  const result = await apiCall<ApiEnvelope<QuotationRequest[]>>(
    buildQuotationRequestsEndpoint(filters),
    {
      method: "GET",
      signal: signal ?? paramSignal,
    },
  );

  return {
    data: Array.isArray(result?.data) ? result.data : [],
    message: result?.message,
    statusCode: result?.statusCode,
  };
}

/**
 * Get one quotation request by ID.
 *
 * GET request intentionally does not show a success Toast.
 */
export async function getQuotationRequestById(
  id: string,
  signal?: AbortSignal,
): Promise<QuotationRequest> {
  assertValidId(id);

  const result = await apiCall<ApiEnvelope<QuotationRequest>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
    {
      method: "GET",
      signal,
    },
  );

  return result.data;
}

export async function createQuotationRequest(
  payload: CreateQuotationRequestPayload,
): Promise<ApiEnvelope<QuotationRequest>> {
  return apiCall<ApiEnvelope<QuotationRequest>>(
    BASE_ENDPOINT,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    {
      showSuccess: true,
    },
  );
}

export async function updateQuotationRequest(
  id: string,
  payload: UpdateQuotationRequestPayload,
): Promise<ApiEnvelope<QuotationRequest>> {
  assertValidId(id);

  return apiCall<ApiEnvelope<QuotationRequest>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    {
      showSuccess: true,
    },
  );
}

export async function deleteQuotationRequest(
  id: string,
): Promise<ApiEnvelope<null>> {
  assertValidId(id);

  return apiCall<ApiEnvelope<null>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    {
      showSuccess: true,
    },
  );
}
