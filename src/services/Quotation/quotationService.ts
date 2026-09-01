import { apiCall } from "../apiHandler";

// ----------------------------------------------------
// Types
// Matches the POST /quotations/requests API contract
// ----------------------------------------------------

export interface QuotationRequestPayload {
  quotationType: string;
  numberOfSites: number;
  siteNames: string[];
  activeMachines: number;
  equipmentTypes: string[];
  contractDuration: string;
  optionalServices?: string[];
  implementationRequirements?: string;
  additionalRequirements?: string;
}

export interface QuotationRequest {
  id: string;
  requestId: string;
  userId: string;
  companyId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  siteLocation: string;
  quotationType: string;
  numberOfSites: number;
  siteNames: string[];
  activeMachines: number;
  equipmentTypes: string[];
  contractDuration: string;
  optionalServices: string[];
  implementationRequirements: string;
  additionalRequirements: string;
  attachmentUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}



const BASE_ENDPOINT = "/quotations/requests";
export const createQuotationRequest = async (
  payload: QuotationRequestPayload,
): Promise<QuotationRequest> => {
  const response = await apiCall<ApiEnvelope<QuotationRequest>>(
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