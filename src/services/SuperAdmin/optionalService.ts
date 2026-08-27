import { apiCall } from "../apiHandler";

// ----------------------------------------------------
// Types (matches real backend response exactly)
// ----------------------------------------------------

export interface OptionalService {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OptionalServicePayload {
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

const BASE_ENDPOINT = "/optional-services";

// ----------------------------------------------------
// GET ALL (Super Admin - includes inactive)
// ----------------------------------------------------

export const getOptionalServices = async (): Promise<OptionalService[]> => {
  const response = await apiCall<ApiEnvelope<OptionalService[]>>(
    `${BASE_ENDPOINT}/admin/all`,
    { method: "GET" },
    { showError: true },
  );

  return response.data ?? [];
};

// ----------------------------------------------------
// GET BY ID
// ----------------------------------------------------

export const getOptionalServiceById = async (
  id: string,
): Promise<OptionalService> => {
  const response = await apiCall<ApiEnvelope<OptionalService>>(
    `${BASE_ENDPOINT}/${id}`,
    { method: "GET" },
    { showError: true },
  );

  return response.data;
};

// ----------------------------------------------------
// CREATE
// ----------------------------------------------------

export const createOptionalService = async (
  payload: OptionalServicePayload,
): Promise<OptionalService> => {
  const response = await apiCall<ApiEnvelope<OptionalService>>(
    BASE_ENDPOINT,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    {
      showSuccess: true,
      showError: true,
      successMessage: "Optional service created successfully.",
    },
  );

  return response.data;
};

// ----------------------------------------------------
// UPDATE
// ----------------------------------------------------

export const updateOptionalService = async (
  id: string,
  payload: OptionalServicePayload,
): Promise<OptionalService> => {
  const response = await apiCall<ApiEnvelope<OptionalService>>(
    `${BASE_ENDPOINT}/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    {
      showSuccess: true,
      showError: true,
      successMessage: "Optional service updated successfully.",
    },
  );

  return response.data;
};

// ----------------------------------------------------
// TOGGLE STATUS
// (success message is dynamic based on new state, so no
// fixed successMessage here — component shows it after
// reading the returned service's isActive value)
// ----------------------------------------------------

export const toggleOptionalServiceStatus = async (
  id: string,
): Promise<OptionalService> => {
  const response = await apiCall<ApiEnvelope<OptionalService>>(
    `${BASE_ENDPOINT}/${id}/toggle`,
    { method: "PATCH" },
    { showError: true },
  );

  return response.data;
};

// ----------------------------------------------------
// DELETE
// ----------------------------------------------------

export const deleteOptionalService = async (id: string): Promise<void> => {
  await apiCall<ApiEnvelope<null>>(
    `${BASE_ENDPOINT}/${id}`,
    { method: "DELETE" },
    {
      showSuccess: true,
      showError: true,
      successMessage: "Optional service deleted successfully.",
    },
  );
};