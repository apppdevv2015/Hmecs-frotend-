import { apiRequest } from "./api";

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

// GET ALL PLANS API
export const getSubscriptionPlans = async () => {
  return apiRequest<SubscriptionPlanApi[]>("/auth/plans", {
    method: "GET",
  });
};

// CREATE PLAN API
export const createSubscriptionPlan = async (
  payload: CreateSubscriptionPlanPayload,
) => {
  return apiRequest<SubscriptionPlanApi>("/auth/plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// UPDATE PLAN API
export const updateSubscriptionPlan = async (
  id: number | string,
  payload: UpdateSubscriptionPlanPayload,
) => {
  return apiRequest<SubscriptionPlanApi>(`/auth/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

// DELETE PLAN API
export const deleteSubscriptionPlan = async (id: number | string) => {
  return apiRequest<{ message?: string }>(`/auth/plans/${id}`, {
    method: "DELETE",
  });
};