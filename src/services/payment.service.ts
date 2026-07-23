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

  // Future API will be added here
  // const response = await fetch("/api/payments/create", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(data),
  // });
  // return response.json();
  return {
    success: true,
    planName: data.planName,
    message: "Dummy payment created successfully",
    paymentStatus: "success",
  };
};