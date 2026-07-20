import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

export default function NotFound() {
  const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
  const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};
  const role = user?.role?.toLowerCase();

  const getDashboardPath = () => {
    if (!token) return "/";

    if (
      role === "superadmin" ||
      role === "super_admin" ||
      role === "super admin"
    ) {
      return "/super-admin/dashboard";
    }

    if (
      role === "admin" ||
      role === "company_admin" ||
      role === "company admin"
    ) {
      return "/company-admin/dashboard";
    }

    if (role === "operator") {
      return "/operator/dashboard";
    }

    if (role === "mechanic") {
      return "/mechanic/dashboard";
    }

    return "/";
  };

  return (
    <>
      <PageMeta
        title="404 Page Not Found | HME Component Intelligence System"
        description="Page not found"
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 z-1">
        <GridShape />

        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
            ERROR
          </h1>

          <img src="/images/error/404.svg" alt="404" className="dark:hidden" />

          <img
            src="/images/error/404-dark.svg"
            alt="404"
            className="hidden dark:block"
          />

          <p className="mt-10 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
            We can’t seem to find the page you are looking for!
          </p>

          <Link
            to={getDashboardPath()}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} - HME Component Intelligence System
        </p>
      </div>
    </>
  );
}