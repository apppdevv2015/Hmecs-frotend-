import toast from "react-hot-toast";

let currentToastId: string | undefined = undefined;

const getThemeStyles = () => {
  const isDark = document.documentElement.classList.contains("dark");

  if (isDark) {
    return {
      background: "#1f2937",
      color: "#fff",
      borderRadius: "12px",
      padding: "14px 16px",
      fontSize: "14px",
    };
  }

  return {
    background: "#fff",
    color: "#111827",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  };
};

export const showSuccessToast = (
  message: string,
  options: { duration?: number; id?: string } = {},
) => {
  if (currentToastId) {
    toast.dismiss(currentToastId);
  }

  const toastId = options.id || `toast-${Date.now()}`;
  currentToastId = toastId;

  return toast.success(message, {
    duration: options.duration || 3000,
    position: "top-right",
    id: toastId,
    style: getThemeStyles(),
  });
};

export const showErrorToast = (
  message: string,
  options: { duration?: number; id?: string } = {},
) => {
  if (currentToastId) {
    toast.dismiss(currentToastId);
  }

  const toastId = options.id || `toast-${Date.now()}`;
  currentToastId = toastId;

  return toast.error(message, {
    duration: options.duration || 3000,
    position: "top-right",
    id: toastId,
    style: getThemeStyles(),
  });
};

export const showLoadingToast = (message: string, options: { id?: string } = {}) => {
  if (currentToastId) {
    toast.dismiss(currentToastId);
  }

  const toastId = options.id || `toast-${Date.now()}`;
  currentToastId = toastId;

  return toast.loading(message, {
    position: "top-right",
    id: toastId,
    style: getThemeStyles(),
  });
};

export const updateToast = (
  toastId: string,
  message: string,
  type: "success" | "error" | "loading" = "success",
) => {
  if (type === "success") {
    toast.success(message, {
      id: toastId,
      duration: 3000,
      position: "top-right",
      style: getThemeStyles(),
    });
  } else if (type === "error") {
    toast.error(message, {
      id: toastId,
      duration: 3000,
      position: "top-right",
      style: getThemeStyles(),
    });
  }
  currentToastId = toastId;
};

export const dismissAllToasts = () => {
  toast.dismiss();
  currentToastId = undefined;
};

const normalizeRoleForToast = (role?: string | number | null) => {
  if (!role) return "";
  return String(role)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");
};

export const showLoginSuccessToast = (role?: string | number | null) => {
  const normalizedRole = normalizeRoleForToast(role);

  const messages: Record<string, string> = {
    super_admin: "Super Admin login successfully",
    superadmin: "Super Admin login successfully",
    system_admin: "Super Admin login successfully",
    admin: "Company Admin login successfully",
    company_admin: "Company Admin login successfully",
    companyadmin: "Company Admin login successfully",
    operator: "Operator login successfully",
    planner: "Operator login successfully",
    supervisor: "Supervisor login successfully",
    mechanic: "Mechanic login successfully",
    artisans: "Artisans login successfully",
    artisuns: "Artisans login successfully",
    viewer: "Viewer login successfully",
  };

  showSuccessToast(messages[normalizedRole] || "Login successfully", {
    duration: 2500,
    id: "login-success",
  });
};
