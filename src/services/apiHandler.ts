import { apiRequest } from "./api";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

type ToastOptions = {
  showSuccess?: boolean;
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
};

/**
 * apiCall = apiRequest + automatic toast handling.
 * Har service file me manually showSuccessToast/showErrorToast
 * call karne ki zarurat nahi — bas yaha se options pass karo.
 *
 * Default: GET/mutation dono pe error toast auto show hoga.
 * Success toast sirf tab aayega jab showSuccess:true pass karoge (mutations ke liye).
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  toastOptions: ToastOptions = {},
): Promise<T> {
  const {
    showSuccess = false,
    showError = true,
    successMessage,
    errorMessage,
  } = toastOptions;

  try {
    const response = await apiRequest<T>(endpoint, options);

    if (showSuccess) {
      const msg =
        successMessage || (response as any)?.message || "Done successfully";

      showSuccessToast(msg);
    }

    return response;
  } catch (error: any) {
    if (showError) {
      const msg =
        errorMessage ||
        error?.response?.message ||
        error?.message ||
        "Something went wrong";

      showErrorToast(msg);
    }

    throw error;
  }
}