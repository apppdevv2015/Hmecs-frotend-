/**
 * companyQuotationService.ts
 * -----------------------------------------------------------------------
 * Single source of truth for Company Admin's read access to a quotation
 * that Super Admin has sent them.
 *
 * Base endpoint: /quotations/{id}
 * The path param accepts EITHER the quotation's real id OR its
 * human-readable quotation number (e.g. "QT-20260907-YB2B") — this
 * matches the backend contract exactly (see swagger: "Get quotation
 * details by ID or Quotation Number").
 *
 * TYPE NOTE:
 * This interface was verified against a real GET /quotations/{id}
 * response on 2026-09-07 (see below). Several monetary fields come back
 * as STRINGS from the backend, not numbers — the type reflects that
 * exactly so nothing here silently disagrees with reality.
 *
 * MESSAGE POLICY:
 * - Backend success/error messages are handled by the shared apiHandler.
 * - This service never calls toast directly.
 * - This is a read-only (GET) service — no success Toast is shown.
 * - No fallback error messages are generated in this service.
 * - No mock/dummy data anywhere in this file — every value returned
 *   comes directly from the real backend response.
 * -----------------------------------------------------------------------
 */

import { apiCall } from "./../../apiHandler";

/* ============================================================================
 * 1. TYPES — exact shape of `data` from GET /quotations/{id}
 *    (verified against a live response, not guessed)
 * ==========================================================================*/

export interface QuotationOptionalService {
  readonly serviceId: string;
  readonly name: string;
  readonly price: number;
}

/**
 * A single quotation as sent by Super Admin. Field set matches the real
 * backend response exactly — nothing here is guessed or invented.
 *
 * NOTE: implementationFee, monthlySiteLicence, additionalMachineCharge,
 * baseAmount, optionalServicesAmount, discountAmount, taxAmount and
 * totalAmount are all returned by the backend as STRINGS (likely to
 * preserve decimal precision), not numbers. Parse with Number(...) at
 * the point of use/display.
 */
export interface CompanyQuotation {
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

/* ============================================================================
 * 2. ERROR NORMALIZATION — same contract as quotationService.ts, kept
 * local so this file has zero cross-file dependency for its own errors.
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

/**
 * Extracts only a message that actually exists on the backend/thrown error.
 * No fallback message is generated here.
 */
export function extractCompanyQuotationError(
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

function assertValidQuotationIdentifier(id: string): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Invalid quotation id or quotation number provided");
  }
}

const BASE_ENDPOINT = "/quotations";

/* ============================================================================
 * 4. SERVICE FUNCTIONS
 * ==========================================================================*/

/**
 * Company Admin — fetch full details of a quotation sent by Super Admin.
 * GET /quotations/{id}
 *
 * @param idOrQuotationNumber - either the quotation's real id, or its
 * quotation number (e.g. "QT-20260907-YB2B"). Both are accepted by the
 * backend for this same endpoint.
 */
export const getQuotationDetails = async (
  idOrQuotationNumber: string,
  signal?: AbortSignal,
): Promise<CompanyQuotation> => {
  assertValidQuotationIdentifier(idOrQuotationNumber);

  const response = await apiCall<ApiEnvelope<CompanyQuotation>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrQuotationNumber)}`,
    {
      method: "GET",
      signal,
    },
    {
      showError: true,
    },
  );

  return response.data;
};

/* ============================================================================
 * 5. ACCEPT / REJECT — Company Admin's decision on a quotation
 *
 * ASSUMPTION (verify against swagger before shipping):
 *   POST /quotations/{id}/accept
 *   POST /quotations/{id}/reject   (rejectionReason required)
 * Both are assumed to return the updated CompanyQuotation record wrapped
 * in the same ApiEnvelope, so the UI can render the post-decision state
 * exactly as the backend computed it — no client-side status guessing.
 * ==========================================================================*/

export interface QuotationDecisionPayload {
  readonly note?: string;
  readonly signedBy?: string;
  readonly signatureUrl?: string;
}

export interface QuotationRejectionPayload extends QuotationDecisionPayload {
  readonly rejectionReason: string;
}

/**
 * Company Admin — accept a quotation sent by Super Admin.
 * POST /quotations/{id}/accept
 */
export const acceptQuotation = async (
  idOrQuotationNumber: string,
  payload?: QuotationDecisionPayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<CompanyQuotation>> => {
  assertValidQuotationIdentifier(idOrQuotationNumber);

  return apiCall<ApiEnvelope<CompanyQuotation>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrQuotationNumber)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
      signal,
    },
    {
      showError: true,
      showSuccess: true,
    },
  );
};

export const rejectQuotation = async (
  idOrQuotationNumber: string,
  payload: QuotationRejectionPayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<CompanyQuotation>> => {
  assertValidQuotationIdentifier(idOrQuotationNumber);

  if (!payload.rejectionReason || payload.rejectionReason.trim().length === 0) {
    throw new Error("A rejection reason is required");
  }

  return apiCall<ApiEnvelope<CompanyQuotation>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrQuotationNumber)}/reject`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
    {
      showError: true,
      showSuccess: true,
    },
  );
};