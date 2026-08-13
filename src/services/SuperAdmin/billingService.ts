// src/services/SuperAdmin/billingService.ts

import { apiRequest } from "../api";

export interface BillingQueryParams {
  search?: string;
  status?: string;
  companyId?: string;
  planId?: string;
  page?: number;
  limit?: number;
}

const buildQueryString = (
  params?: BillingQueryParams,
): string => {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

export const billingService = {
  /**
   * Get all subscriptions
   */
  async getSubscriptions(
    params?: BillingQueryParams,
  ): Promise<any> {
    const query = buildQueryString(params);

    return apiRequest<any>(
      `/plans/admin/subscriptions${query}`,
      {
        method: "GET",
      },
    );
  },

  /**
   * Get single subscription from list
   * Backend currently does not expose
   * GET /plans/admin/subscriptions/:id
   */
  async getSubscriptionById(
    id: string,
  ): Promise<any> {
    if (!id) {
      throw new Error(
        "Subscription ID is required",
      );
    }

    const response: any =
      await apiRequest<any>(
        "/plans/admin/subscriptions",
        {
          method: "GET",
        },
      );

    return (
      response?.data?.find(
        (item: any) => item.id === id,
      ) || null
    );
  },
};