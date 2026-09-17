import { apiCall } from "../../apiHandler";
import type { ApiEnvelope, QuotationOptionalService } from "./quotationActionService";

export type ContractStatus = "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface ContractQuotationSummary {
  readonly quotationNumber: string;
  readonly companyName: string;
  readonly contactPerson: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly machineCount: number;
  readonly licensedMachineAllowance: number;
  readonly implementationFee: string;
  readonly monthlySiteLicence: string;
  readonly additionalMachineCharge: string;
  readonly optionalServices: readonly QuotationOptionalService[];
  readonly paymentTerms: string;
}

export interface Contract {
  readonly id: string;
  readonly contractNumber: string;
  readonly quotationId: string;
  readonly companyId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly poNumber: string | null;
  readonly description: string | null;
  readonly status: ContractStatus;
  readonly sentAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly quotation: ContractQuotationSummary;


  readonly superAdminSignatureUrl: string | null;
  readonly superAdminSignedBy: string | null;
  readonly superAdminSignedByUserId: string | null;
  readonly superAdminSignedAt: string | null;

  
  readonly companySignatureUrl: string | null;
  readonly companySignedBy: string | null;
  readonly companySignedByUserId: string | null;
  readonly companySignedAt: string | null;
  readonly acceptanceDescription: string | null;

  
  readonly rejectedBy: string | null;
  readonly rejectedByUserId: string | null;
  readonly rejectedAt: string | null;
  readonly rejectionReason: string | null;
}

export interface ContractListParams {
  readonly companyId?: string;
  readonly status?: ContractStatus;
  readonly signal?: AbortSignal;
}

export interface ContractListResult {
  readonly data: readonly Contract[];
  readonly message?: string;
  readonly statusCode?: number;
}

export interface CreateContractPayload {
  readonly quotationId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly poNumber?: string;
  readonly description?: string;
  readonly superAdminSignedBy: string;
  readonly signatureFile: File;
}

export interface UpdateContractPayload {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly poNumber?: string;
  readonly description?: string;
  readonly status?: ContractStatus;
}

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

export function extractContractError(error: unknown): string | undefined {
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

const BASE_ENDPOINT = "/quotations/contracts";

function buildContractListEndpoint(
  filters: Omit<ContractListParams, "signal"> = {},
): string {
  const query = new URLSearchParams();

  if (filters.companyId) {
    query.set("companyId", filters.companyId);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  const queryString = query.toString();

  return queryString ? `${BASE_ENDPOINT}?${queryString}` : BASE_ENDPOINT;
}

function buildContractByIdEndpoint(id: string): string {
  return `${BASE_ENDPOINT}/${encodeURIComponent(id)}`;
}

export const getContractsList = async (
  params: ContractListParams = {},
): Promise<readonly Contract[]> => {
  const { signal, ...filters } = params;

  const response = await apiCall<ApiEnvelope<Contract[]>>(
    buildContractListEndpoint(filters),
    {
      method: "GET",
      signal,
    },
  );

  return Array.isArray(response?.data) ? response.data : [];
};

export const getContractsListWithMeta = async (
  params: ContractListParams = {},
): Promise<ContractListResult> => {
  const { signal, ...filters } = params;

  const response = await apiCall<ApiEnvelope<Contract[]>>(
    buildContractListEndpoint(filters),
    {
      method: "GET",
      signal,
    },
   
  );

  return {
    data: Array.isArray(response?.data) ? response.data : [],
    message: response?.message,
    statusCode: response?.statusCode,
  };
};

export const getContractById = async (
  id: string,
  signal?: AbortSignal,
): Promise<Contract | undefined> => {
  const response = await apiCall<ApiEnvelope<Contract>>(
    buildContractByIdEndpoint(id),
    {
      method: "GET",
      signal,
    },
  );

  return response?.data;
};


export const createContract = async (
  payload: CreateContractPayload,
  signal?: AbortSignal,
): Promise<Contract | undefined> => {
  const formData = new FormData();
  formData.append("quotationId", payload.quotationId);
  formData.append("startDate", payload.startDate);
  formData.append("endDate", payload.endDate);
  if (payload.poNumber) formData.append("poNumber", payload.poNumber);
  if (payload.description) formData.append("description", payload.description);
  formData.append("superAdminSignedBy", payload.superAdminSignedBy);
  formData.append("signatureFile", payload.signatureFile);

  const response = await apiCall<ApiEnvelope<Contract>>(
    BASE_ENDPOINT,
    {
      method: "POST",
      body: formData,
      signal,
    },
    {
      showSuccess: true,
    },
  );

  return response?.data;
};

export const updateContract = async (
  id: string,
  payload: UpdateContractPayload,
  signal?: AbortSignal,
): Promise<Contract | undefined> => {
  const response = await apiCall<ApiEnvelope<Contract>>(
    buildContractByIdEndpoint(id),
    {
      method: "PUT",
      body: JSON.stringify(payload),
      signal,
    },
     {
      showSuccess: true,
    },
   
  );

  return response?.data;
};

export interface AcceptContractPayload {
  readonly signedBy: string;
  readonly acceptanceDescription?: string;
  readonly signatureFile: File;
}

export const acceptContract = async (
  id: string,
  payload: AcceptContractPayload,
  signal?: AbortSignal,
): Promise<Contract | undefined> => {
  const formData = new FormData();
  formData.append("signedBy", payload.signedBy);
  if (payload.acceptanceDescription) {
    formData.append("acceptanceDescription", payload.acceptanceDescription);
  }
  formData.append("signatureFile", payload.signatureFile);

  const response = await apiCall<ApiEnvelope<Contract>>(
    `${buildContractByIdEndpoint(id)}/accept`,
    {
      method: "POST",
      body: formData,
      signal,
    },
    {
      showSuccess: true,
    },
   
  );

  return response?.data;
};

export interface RejectContractPayload {
  readonly rejectionReason: string;
}


export const rejectContract = async (
  id: string,
  payload: RejectContractPayload,
  signal?: AbortSignal,
): Promise<Contract | undefined> => {
  const response = await apiCall<ApiEnvelope<Contract>>(
    `${buildContractByIdEndpoint(id)}/reject`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
    {
      showSuccess: true,
    },
  );

  return response?.data;
};


export const deleteContract = async (
  id: string,
  signal?: AbortSignal,
): Promise<void> => {
  await apiCall<ApiEnvelope<null>>(
    buildContractByIdEndpoint(id),
    {
      method: "DELETE",
      signal,
    },
     {
      showSuccess: true,
    },
  );
};

export const getContractPdfViewUrl = (id: string): string => {
  return `${buildContractByIdEndpoint(id)}/pdf`;
};

export const downloadContractPdf = async (
  id: string,
  fileName?: string,
  signal?: AbortSignal,
): Promise<void> => {
  const blob = await apiCall<Blob>(
    `${buildContractByIdEndpoint(id)}/pdf?download=true`,
    {
      method: "GET",
      signal,
      responseType: "blob",
    },
   
  );

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getContractPdfBlobUrl = async (
  id: string,
  signal?: AbortSignal,
): Promise<string> => {
  const blob = await apiCall<Blob>(
    `${buildContractByIdEndpoint(id)}/pdf`,
    {
      method: "GET",
      signal,
      responseType: "blob",
    },
  );

  return window.URL.createObjectURL(blob);
};