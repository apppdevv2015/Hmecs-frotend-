import toast from "react-hot-toast";

type ToastType = "success" | "error" | "loading";

let currentToastId: string | undefined = undefined;
let toastCounter = 0;

// caller ki di hui id -> actual unique id (updateToast ke liye)
const idAliases = new Map<string, string>();

const LOADING_FAILSAFE_MS = 30000;

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

// Hamesha unique id: same id pe dismiss + re-show ka race avoid hota hai
const createToastId = (baseId?: string) => {
  const id = `${baseId ?? "toast"}-${++toastCounter}`;
  if (baseId) idAliases.set(baseId, id);
  return id;
};

const dismissCurrent = () => {
  if (currentToastId) {
    toast.dismiss(currentToastId);
  }
};

export const showSuccessToast = (
  message: string,
  options: { duration?: number; id?: string } = {},
) => {
  dismissCurrent();

  const toastId = createToastId(options.id);
  currentToastId = toastId;

  return toast.success(message, {
    duration: options.duration ?? 3000,
    position: "top-right",
    id: toastId,
    style: getThemeStyles(),
  });
};

export const showErrorToast = (
  message: string,
  options: { duration?: number; id?: string } = {},
) => {
  dismissCurrent();

  const toastId = createToastId(options.id);
  currentToastId = toastId;

  return toast.error(message, {
    duration: options.duration ?? 3000,
    position: "top-right",
    id: toastId,
    style: getThemeStyles(),
  });
};

export const showLoadingToast = (
  message: string,
  options: { id?: string } = {},
) => {
  dismissCurrent();

  const toastId = createToastId(options.id);
  currentToastId = toastId;

  return toast.loading(message, {
    duration: LOADING_FAILSAFE_MS, // kabhi infinite stuck nahi hoga
    position: "top-right",
    id: toastId,
    style: getThemeStyles(),
  });
};

export const updateToast = (
  toastId: string,
  message: string,
  type: ToastType = "success",
) => {
  const actualId = idAliases.get(toastId) ?? toastId;

  // Original toast replace/dismiss ho chuka hai: purani id dobara use
  // karne se ghost toast banta hai, isliye naya toast dikhao.
  if (actualId !== currentToastId) {
    if (type === "error") return showErrorToast(message);
    if (type === "loading") return showLoadingToast(message);
    return showSuccessToast(message);
  }

  const base = {
    id: actualId,
    position: "top-right" as const,
    style: getThemeStyles(),
  };

  if (type === "success") {
    toast.success(message, { ...base, duration: 3000 });
  } else if (type === "error") {
    toast.error(message, { ...base, duration: 3000 });
  } else {
    toast.loading(message, { ...base, duration: LOADING_FAILSAFE_MS });
  }

  return actualId;
};

export const dismissAllToasts = () => {
  toast.dismiss();
  currentToastId = undefined;
  idAliases.clear();
};