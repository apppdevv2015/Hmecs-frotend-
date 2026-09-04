import { apiCall } from "../apiHandler";

export interface QuotationRequestPayload {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  siteLocation?: string;
  quotationType: string;
  numberOfSites: number;
  siteNames?: string[];
  activeMachines: number;
  equipmentTypes: string[];
  contractDuration: string;
  optionalServices?: string[];
  implementationRequirements?: string;
  additionalRequirements?: string;
  attachmentUrl?: string;
  companyId?: string;
  userId?: string;
}

export interface ApiQuotationRequest {
  id: string;
  requestId: string;
  companyId?: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  siteLocation?: string;
  quotationType: string;
  numberOfSites: number;
  siteNames?: string[];
  activeMachines: number;
  equipmentTypes?: string[];
  contractDuration?: string;
  optionalServices?: string[];
  implementationRequirements?: string;
  additionalRequirements?: string;
  attachmentUrl?: string;
  status: string;
  quotationStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export const submitQuotationRequest = async (
  payload: QuotationRequestPayload,
): Promise<ApiQuotationRequest> => {
  const response = await apiCall<any>(
    "/quotations/requests",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { showError: false },
  );

  return response?.data || response;
};

export const getQuotationRequests = async (
  params?: Record<string, any>,
): Promise<ApiQuotationRequest[]> => {
  const query = params
    ? "?" + new URLSearchParams(params as any).toString()
    : "";
  const response = await apiCall<any>(
    `/quotations/requests${query}`,
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

export const getQuotationRequestById = async (
  id: string,
): Promise<ApiQuotationRequest> => {
  const response = await apiCall<any>(
    `/quotations/requests/${id}`,
    { method: "GET" },
    { showError: true },
  );

  return response?.data || response;
};

export const updateQuotationRequest = async (
  id: string,
  payload: Partial<QuotationRequestPayload>,
): Promise<ApiQuotationRequest> => {
  const response = await apiCall<any>(
    `/quotations/requests/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    { showError: true },
  );

  return response?.data || response;
};

export const deleteQuotationRequest = async (id: string): Promise<void> => {
  await apiCall<any>(
    `/quotations/requests/${id}`,
    { method: "DELETE" },
    { showError: true },
  );
};
