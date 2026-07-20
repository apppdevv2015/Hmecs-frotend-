import { apiCall } from "./apiHandler";

export type SubscriptionPlanApi = {
  id: number | string;
  plan_name?: string;
  name?: string;
  machine_limit: number;
  price: number | string;
  validity_days?: number;
  features?: Record<string, boolean> | string[] | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateSubscriptionPlanPayload = {
  plan_name: string;
  machine_limit: number;
  price: number;
  validity_days: number;
  features?: Record<string, boolean>;
};

export type UpdateSubscriptionPlanPayload = {
  plan_name: string;
  machine_limit: number;
  price: number;
  validity_days: number;
};



export const getSubscriptionPlans = async () => {
  return apiCall<SubscriptionPlanApi[]>("/auth/plans", {
    method: "GET",
  });
};



export const createSubscriptionPlan = async (
  payload: CreateSubscriptionPlanPayload,
) => {
  return apiCall<SubscriptionPlanApi>(
    "/auth/plans",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    {
      showSuccess: true,
      successMessage: "Plan created successfully",
    },
  );
};



export const updateSubscriptionPlan = async (
  id: number | string,
  payload: UpdateSubscriptionPlanPayload,
) => {
  return apiCall<SubscriptionPlanApi>(
    `/auth/plans/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    {
      showSuccess: true,
      successMessage: "Plan updated successfully",
    },
  );
};



export const deleteSubscriptionPlan = async (id: number | string) => {
  return apiCall<{ message?: string }>(
    `/auth/plans/${id}`,
    {
      method: "DELETE",
    },
    {
      showSuccess: true,
      successMessage: "Plan deleted successfully",
    },
  );
};