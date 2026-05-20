import { apiRequest } from "./api";

export type PayFastCheckoutResponse = {
  checkout_url?: string;
  payment_url?: string;
  redirect_url?: string;
  url?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
  skip_payment?: boolean;
  message?: string;
};

export const initiatePayFastCheckout = async (
  planId: string | number,
  idempotencyKey?: string
): Promise<PayFastCheckoutResponse> => {
  const response = await apiRequest<any>("/auth/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      idempotency_key: idempotencyKey,
      return_url:
        import.meta.env.VITE_PAYFAST_RETURN_URL ||
        "http://localhost:5173/signin?payment=success",
      cancel_url:
        import.meta.env.VITE_PAYFAST_CANCEL_URL ||
        "http://localhost:5173/payment/cancel",
    }),
  });

  // If response is wrapped under standard responseHandler envelope { success, message, data }
  if (response && response.success && response.data) {
    return response.data;
  }

  return response;
};