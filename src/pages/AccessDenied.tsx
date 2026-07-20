import { Link } from "react-router";
import StorageService, { STORAGE_KEYS } from "../services/storage.service";

export default function AccessDenied() {
  const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
  const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};

const role = user?.role?.toLowerCase();

  const getDashboardPath = () => {
    if (!token) return "/signin";

    if (role === "superadmin" || role === "super_admin" || role === "super admin") {
      return "/super-admin/dashboard";
    }

    if (role === "admin" || role === "company_admin" || role === "company admin") {
      return "/company-admin/dashboard";
    }

    if (role === "operator") {
      return "/operator/dashboard";
    }

    if (role === "mechanic") {
      return "/mechanic/dashboard";
    }

    return "/signin";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-[#0B1120]">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-500/20">
          🚫
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Access Denied
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          You do not have permission to access this page.
        </p>

        <div className="mt-6">
          <Link
            to={getDashboardPath()}
            className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}