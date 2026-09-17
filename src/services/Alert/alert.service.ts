import { apiCall } from "../apiHandler";
import { showErrorToast } from "../../utils/toastUtils";


export type AlertStatus = "Critical" | "Warning";

export interface AlertMachine {
  readonly name: string;
  readonly model: string;
  readonly serialNumber: string;
  readonly companyId?: string;
}

export interface AlertParameterDetails {
  readonly unit?: string;
  readonly delta?: number;
  readonly safeMax?: number;
  readonly safeMin?: number;
  readonly summary?: string;
  readonly updatedValue?: string;
  readonly previousValue?: string;
  readonly parameterName?: string;
}

export interface Alert {
  readonly id: string;
  readonly companyId: string;
  readonly machineId: string;
  readonly componentName: string;
  readonly parameterName?: string | null;
  readonly previousHealth: number;
  readonly currentHealth: number;
  readonly healthDrop: number;
  readonly status: AlertStatus | string;
  readonly message: string;
  readonly parameterDetails?: AlertParameterDetails | null;
  readonly isRead: boolean;
  readonly createdAt: string;
  readonly machine: AlertMachine;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
  readonly statusCode?: number;
}

export interface AlertListData {
  readonly page: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly data: readonly Alert[];
}

export interface AlertListParams {
  readonly page?: number;
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface AlertListResult {
  readonly page: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly data: readonly Alert[];
  readonly message?: string;
  readonly statusCode?: number;
}


function assertValidId(id: string): void {
  if (typeof id !== "string" || id.trim().length === 0) {
    showErrorToast("Invalid alert ID provided");
    throw new Error("Invalid alert ID provided");
  }
}

const BASE_ENDPOINT = "/alerts";


function buildAlertsEndpoint(
  filters: Omit<AlertListParams, "signal"> = {},
): string {
  const query = new URLSearchParams();

  if (filters.page !== undefined) {
    query.set("page", String(filters.page));
  }

  if (filters.limit !== undefined) {
    query.set("limit", String(filters.limit));
  }

  const queryString = query.toString();

  return queryString ? `${BASE_ENDPOINT}?${queryString}` : BASE_ENDPOINT;
}

/* ============================================================================
 * 3. SERVICE FUNCTIONS
 * ==========================================================================*/


export async function getAlerts(
  params: AlertListParams = {},
): Promise<AlertListResult> {
  const { signal, ...filters } = params;

  const result = await apiCall<ApiEnvelope<AlertListData>>(
    buildAlertsEndpoint(filters),
    {
      method: "GET",
      signal,
    },
  );

  const payload = result?.data;

  return {
    page: payload?.page ?? filters.page ?? 1,
    limit: payload?.limit ?? filters.limit ?? 20,
    totalItems: payload?.totalItems ?? 0,
    totalPages: payload?.totalPages ?? 1,
    data: Array.isArray(payload?.data) ? payload.data : [],
    message: result?.message,
    statusCode: result?.statusCode,
  };
}

export async function getAlertById(
  id: string,
  signal?: AbortSignal,
): Promise<Alert> {
  assertValidId(id);

  const result = await apiCall<ApiEnvelope<Alert>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(id)}`,
    {
      method: "GET",
      signal,
    },
  );

  return result.data;
}

export async function deleteAlert(id: string): Promise<ApiEnvelope<null>> {
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