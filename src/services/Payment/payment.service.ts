export type PlanName = "Basic" | "Pro" | "Enterprise";

export interface PaymentRequest {
  planName: PlanName;
  companyEmail?: string;
}

export interface PaymentResponse {
  success: boolean;
  planName: PlanName;
  message: string;
  paymentStatus: "pending" | "success" | "failed";
}

export const createPayment = async (
  data: PaymentRequest
): Promise<PaymentResponse> => {
  return {
    success: true,
    planName: data.planName,
    message: "Dummy payment created successfully",
    paymentStatus: "success",
  };
};
