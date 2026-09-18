import { apiCall } from "../apiHandler";

export type InvoiceStatus = "GENERATED" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface InvoiceLineItem {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly amount: number;
}

export interface IssuerSnapshot {
  readonly businessName: string;
  readonly addressLine: string;
  readonly gstin: string | null;
  readonly phone: string | null;
  readonly email: string | null;
}

export interface BankDetailsSnapshot {
  readonly bankName: string;
  readonly accountHolderName: string;
  readonly accountNumber: string;
  readonly ifscCode: string;
  readonly branch: string | null;
}

export interface Invoice {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly contractId: string;
  readonly companyId: string;
  readonly quotationId: string | null;

  readonly billToName: string;
  readonly billToAddress: string | null;
  readonly billToGstin: string | null;

  readonly issuerSnapshot: IssuerSnapshot;
  readonly bankDetailsSnapshot: BankDetailsSnapshot;

  readonly contractNumber: string;
  readonly quotationNumber: string | null;
  readonly contractPeriodStart: string;
  readonly contractPeriodEnd: string;

  readonly lineItems: readonly InvoiceLineItem[];
  readonly subtotal: string;
  readonly totalAmount: string;

  readonly paymentTerms: string | null;
  readonly notes: string | null;

  readonly status: InvoiceStatus;
  readonly paymentProofStatus?: "PENDING_VERIFICATION" | "VERIFIED" | null;
  readonly invoiceDate: string;
  readonly dueDate: string;

  readonly pdfUrl: string | null;
  readonly createdById: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BillingProfile {
  readonly id: string;
  readonly businessName: string;
  readonly addressLine: string;
  readonly gstin: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly bankName: string;
  readonly accountHolderName: string;
  readonly accountNumber: string;
  readonly ifscCode: string;
  readonly branch: string | null;
  readonly isActive: boolean;
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

export function extractInvoiceActionError(error: unknown): string | undefined {
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

const BASE_ENDPOINT = "/quotations/invoices";
const BILLING_PROFILE_ENDPOINT = "/quotations/billing-profile";

/* ============================================================================
 * 2. PAYLOAD TYPES
 * ==========================================================================*/

/** Optional manual line item override for POST /invoices. */
export interface InvoiceLineItemInput {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
}


export interface CreateInvoicePayload {
  readonly contractId: string;
  readonly lineItems?: readonly InvoiceLineItemInput[];
  readonly dueDate?: string;
  readonly paymentTerms?: string;
  readonly notes?: string;
}

export interface BillingProfilePayload {
  readonly businessName: string;
  readonly addressLine: string;
  readonly gstin?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly bankName: string;
  readonly accountHolderName: string;
  readonly accountNumber: string;
  readonly ifscCode: string;
  readonly branch?: string;
}

export interface GetInvoicesFilter {
  readonly status?: InvoiceStatus;
  readonly contractId?: string;
  readonly search?: string;
}


export const createInvoice = async (
  payload: CreateInvoicePayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<Invoice>> => {
  return apiCall<ApiEnvelope<Invoice>>(
    BASE_ENDPOINT,
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

export const getInvoices = async (
  filter?: GetInvoicesFilter,
  signal?: AbortSignal,
): Promise<ApiEnvelope<readonly Invoice[]>> => {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.contractId) params.set("contractId", filter.contractId);
  if (filter?.search) params.set("search", filter.search);

  const query = params.toString();
  const url = query ? `${BASE_ENDPOINT}?${query}` : BASE_ENDPOINT;

  return apiCall<ApiEnvelope<readonly Invoice[]>>(
    url,
    { method: "GET", signal },
    {
      showError: true,
      showSuccess: false,
    },
  );
};

export const getInvoiceById = async (
  idOrInvoiceNumber: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<Invoice>> => {
  return apiCall<ApiEnvelope<Invoice>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrInvoiceNumber)}`,
    { method: "GET", signal },
    {
      showError: true,
      showSuccess: false,
    },
  );
};


export const getInvoicePdfViewUrl = (idOrInvoiceNumber: string): string => {
  return `${BASE_ENDPOINT}/${encodeURIComponent(idOrInvoiceNumber)}/pdf`;
};


export const downloadInvoicePdf = async (
  idOrInvoiceNumber: string,
  fileName?: string,
  signal?: AbortSignal,
): Promise<void> => {
  const blob = await apiCall<Blob>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrInvoiceNumber)}/pdf?download=true`,
    { method: "GET", signal, responseType: "blob" },
    {
      showError: true,
      showSuccess: false,
    },
  );

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `${idOrInvoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getInvoicePdfBlobUrl = async (
  idOrInvoiceNumber: string,
  signal?: AbortSignal,
): Promise<string> => {
  const blob = await apiCall<Blob>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrInvoiceNumber)}/pdf`,
    { method: "GET", signal, responseType: "blob" },
    {
      showError: true,
      showSuccess: false,
    },
  );

  return window.URL.createObjectURL(blob);
};

export const getBillingProfile = async (
  signal?: AbortSignal,
): Promise<ApiEnvelope<BillingProfile | null>> => {
  return apiCall<ApiEnvelope<BillingProfile | null>>(
    BILLING_PROFILE_ENDPOINT,
    { method: "GET", signal },
    {
      showError: true,
      showSuccess: false,
    },
  );
};

export const saveBillingProfile = async (
  payload: BillingProfilePayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<BillingProfile>> => {
  return apiCall<ApiEnvelope<BillingProfile>>(
    BILLING_PROFILE_ENDPOINT,
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

export interface PaymentProof {
  readonly id: string;
  readonly invoiceId: string;
  readonly invoiceNumber: string;
  readonly companyId: string;

  readonly submittedById: string | null;
  readonly submittedByName: string | null;
  readonly submittedByEmail: string | null;

  readonly paymentMethod: string;
  readonly paymentDate: string;
  readonly amountPaid: string;
  readonly transactionReference: string;
    readonly proofFileUrl: string;

  readonly status: "PENDING" | "PAID";
  readonly verifiedAt: string | null;
  readonly verifiedBy: string | null;

  readonly createdAt: string;
}

export interface SubmitPaymentProofPayload {
  readonly paymentMethod: string;
  readonly paymentDate: string;
  readonly amountPaid: string;
  readonly transactionReference: string;
}

export interface GetPaymentProofsFilter {
  readonly invoiceId?: string;
  readonly companyId?: string;
}

export const submitInvoicePaymentProof = async (
  idOrInvoiceNumber: string,
  payload: SubmitPaymentProofPayload,
  proofFile: File,
  signal?: AbortSignal,
): Promise<ApiEnvelope<PaymentProof>> => {
  const formData = new FormData();
  formData.append("paymentMethod", payload.paymentMethod);
  formData.append("paymentDate", payload.paymentDate);
  formData.append("amountPaid", payload.amountPaid);
  formData.append("transactionReference", payload.transactionReference);
  formData.append("proofFile", proofFile);

  return apiCall<ApiEnvelope<PaymentProof>>(
    `${BASE_ENDPOINT}/${encodeURIComponent(idOrInvoiceNumber)}/payment-proof`,
    {
      method: "POST",
      body: formData,
      signal,
    },
    {
      showError: true,
      showSuccess: true,
    },
  );
};

export const getPaymentProofs = async (
  filter?: GetPaymentProofsFilter,
  signal?: AbortSignal,
): Promise<ApiEnvelope<readonly PaymentProof[]>> => {
  const params = new URLSearchParams();
  if (filter?.invoiceId) params.set("invoiceId", filter.invoiceId);
  if (filter?.companyId) params.set("companyId", filter.companyId);

  const query = params.toString();
  const url = query
    ? `/quotations/payment-proofs?${query}`
    : `/quotations/payment-proofs`;

  return apiCall<ApiEnvelope<readonly PaymentProof[]>>(
    url,
    { method: "GET", signal },
    {
      showError: true,
      showSuccess: false,
    },
  );
};


export interface VerifyPaymentProofPayload {
  readonly notes?: string;
}

export const verifyPaymentProof = async (
  paymentProofId: string,
  payload?: VerifyPaymentProofPayload,
  signal?: AbortSignal,
): Promise<ApiEnvelope<PaymentProof>> => {
  return apiCall<ApiEnvelope<PaymentProof>>(
    `/quotations/payment-proofs/${encodeURIComponent(paymentProofId)}/verify`,
    {
      method: "PUT",
      body: JSON.stringify(payload ?? {}),
      signal,
    },
    {
      showError: true,
      showSuccess: true,
    },
  );
};