
import { Rocket, Timer, ChevronLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import StorageService, { STORAGE_KEYS } from "../services/storage.service";

type UserRole =
  | "super_admin"
  | "company_admin"
  | "operator"
  | "mechanic"
  | "admin"
  | "system_admin"
  | "planner"
  | "Artisans"
  | "viewer";

type JwtPayload = {
  role?: string;
  roleName?: string;
  roles?: string[];
  user?: {
    role?: string;
    roleName?: string;
    role_name?: string;
  };
  data?: {
    role?: string;
    roleName?: string;
    role_name?: string;
  };
};

const normalizeRole = (role?: string | null) => {
  return String(role || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+$/g, "");
};

const getRoleDashboardPath = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case "super_admin":
    case "system_admin":
      return "/super-admin/dashboard";

    case "company_admin":
    case "admin":
      return "/company-admin/dashboard";

    case "operator":
    case "planner":
      return "/operator/dashboard";

    case "mechanic":
    case "Artisans":
      return "/mechanic/dashboard";

    default:
      return "/signin";
  }
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split(".")[1];

    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getRoleFromLocalStorage = () => {
  const storedRole = StorageService.get<string>(STORAGE_KEYS.ROLE);

  if (storedRole) {
    return storedRole;
  }

  try {
    const storedUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};

    return (
      storedUser?.role ||
      storedUser?.role_name ||
      storedUser?.roleName ||
      storedUser?.user?.role ||
      storedUser?.user?.role_name ||
      storedUser?.user?.roleName ||
      null
    );
  } catch {
    return null;
  }
};

const getRoleFromStorageOrToken = () => {
  const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);

  if (!token) return null;

  const decodedToken = decodeJwtPayload(token);

  const tokenRole =
    decodedToken?.role ||
    decodedToken?.roleName ||
    decodedToken?.roles?.[0] ||
    decodedToken?.user?.role ||
    decodedToken?.user?.roleName ||
    decodedToken?.user?.role_name ||
    decodedToken?.data?.role ||
    decodedToken?.data?.roleName ||
    decodedToken?.data?.role_name;

  if (tokenRole) return tokenRole;

  return getRoleFromLocalStorage();
};

export default function ComingSoon() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleDashboardRedirect = () => {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);

    if (!token) {
      navigate("/signin", { replace: true });
      return;
    }

    const role = getRoleFromStorageOrToken();
    const dashboardPath = getRoleDashboardPath(role);

    navigate(dashboardPath, { replace: true });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl w-full text-center space-y-10 animate-in fade-in zoom-in duration-500">
        {/* Animated Icon */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />

          <div className="relative flex items-center justify-center w-full h-full bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-100 dark:border-slate-700">
            <Rocket className="w-12 h-12 text-orange-500 animate-bounce" />
          </div>

          <div className="absolute -bottom-2 -right-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2 rounded-xl shadow-lg">
            <Timer size={20} />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
            We're building something{" "}
            <span className="text-orange-500">Amazing</span>
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-lg mx-auto">
            This module is currently under development to provide you with the
            best fleet intelligence experience. Stay tuned!
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Development Progress</span>
            <span className="text-orange-500">75%</span>
          </div>

          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-50 dark:border-slate-700">
            <div className="h-full w-3/4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full shadow-sm shadow-orange-500/20" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          >
            <ChevronLeft size={16} />
            Go Back
          </button>

          <button
            type="button"
            onClick={handleDashboardRedirect}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 dark:bg-white dark:text-slate-900"
          >
            Back to Dashboard
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Footer Badge */}
        <div className="pt-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>

            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
              Live Updates Incoming
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}