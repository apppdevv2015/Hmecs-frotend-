import { apiCall } from "./../../apiHandler";
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
  readonly optionalServices: readonly {
    readonly serviceId: string;
    readonly name: string;
    readonly price: number;
  }[];
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

  // Acceptance lifecycle (populated only when status === "ACCEPTED")
  readonly signatureUrl: string | null;
  readonly signedBy: string | null;
  readonly signedByUserId: string | null;
  readonly signedAt: string | null;
  readonly acceptanceDescription: string | null;

  // Rejection lifecycle (populated only when status === "REJECTED")
  readonly rejectedBy: string | null;
  readonly rejectedByUserId: string | null;
  readonly rejectedAt: string | null;
  readonly rejectionReason: string | null;
}

export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly statusCode: number;
  readonly message: string;
  readonly data: T;
  readonly timestamp?: string;
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


export function extractContractActionError(error: unknown): string | undefined {
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

/* ============================================================================
 * 4. PAYLOAD TYPES
 * ==========================================================================*/

export interface AcceptContractPayload {
  readonly signatureFile: File | Blob;
  readonly signedBy: string;
  readonly acceptanceDescription?: string;
}

/** Payload for POST /quotations/contracts/{id}/reject. Plain JSON — no file. */
export interface RejectContractPayload {
  readonly rejectionReason: string;
}

export const acceptContract = async (
  idOrContractNumber: string,
  payload: AcceptContractPayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<Contract>> => {
  const formData = new FormData();
  formData.append("signatureFile", payload.signatureFile, "signature.png");
  formData.append("signedBy", payload.signedBy);
  if (payload.acceptanceDescription) {
    formData.append("acceptanceDescription", payload.acceptanceDescription);
  }

  return apiCall<ApiEnvelope<Contract>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrContractNumber)}/accept`,
    {
      method: "POST",
      body: formData,
      signal,
    },
    {
      showSuccess: true,
    },
  );
};

export const rejectContract = async (
  idOrContractNumber: string,
  payload: RejectContractPayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<Contract>> => {
  return apiCall<ApiEnvelope<Contract>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrContractNumber)}/reject`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      signal,
    },
    {
      showSuccess: true,
    },
  );
};