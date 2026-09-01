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

// GET PUBLIC (Active Optional Services for quotation/signup)
// ----------------------------------------------------

export const getPublicOptionalServices = async (): Promise<OptionalService[]> => {
  const response = await apiCall<any>(
    BASE_ENDPOINT,
    { method: "GET" },
    { showError: false },
  );

  const list = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

  return list;
};

// ----------------------------------------------------
// GET PUBLIC EQUIPMENT TYPES (Master Catalog Categories)
// ----------------------------------------------------

export const getEquipmentTypes = async (): Promise<string[]> => {
  const response = await apiCall<any>(
    "/equipment-types",
    { method: "GET" },
    { showError: false },
  );

  const list = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

  return list;
};

// ----------------------------------------------------
// GET ALL (Super Admin - includes inactive)
=======
// GET ALL

// ----------------------------------------------------

export const getOptionalServices = async (): Promise<OptionalService[]> => {
  const response = await apiCall<ApiEnvelope<OptionalService[]>>(
    BASE_ENDPOINT,
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
// Backend response message is used by apiCall.
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
    },
  );

  return response.data;
};

// ----------------------------------------------------
// UPDATE
// Backend response message is used by apiCall.
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
    },
  );

  return response.data;
};

// ----------------------------------------------------
// TOGGLE STATUS
// Backend response message is used by apiCall.
// ----------------------------------------------------

export const toggleOptionalServiceStatus = async (
  id: string,
): Promise<OptionalService> => {
  const response = await apiCall<ApiEnvelope<OptionalService>>(
    `${BASE_ENDPOINT}/${id}/toggle`,
    { method: "PATCH" },
    {
      showSuccess: true,
      showError: true,
    },
  );

  return response.data;
};

// ----------------------------------------------------
// DELETE
// Backend response message is used by apiCall.
// ----------------------------------------------------

export const deleteOptionalService = async (
  id: string,
): Promise<void> => {
  await apiCall<ApiEnvelope<null>>(
    `${BASE_ENDPOINT}/${id}`,
    { method: "DELETE" },
    {
      showSuccess: true,
      showError: true,
    },
  );
};