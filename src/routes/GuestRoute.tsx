import { Navigate, Outlet } from "react-router-dom";
import StorageService, { STORAGE_KEYS } from "../services/storage.service";
import { normalizeRole } from "./RoleProtectedRoute";

function getRoleFromToken(token: string): string {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(base64));

    return normalizeRole(
      decoded?.role ||
      decoded?.role_name ||
      decoded?.user?.role ||
      decoded?.user?.role_name ||
      decoded?.data?.user?.role ||
      ""
    );
  } catch {
    return "";
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(base64));

    if (!decoded.exp) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime;
  } catch {
    return true;
  }
}

export const getDashboardPathForRole = (role?: any): string => {
  const normalized = normalizeRole(role);

  const roleMap: Record<string, string> = {
    super_admin: "/super-admin/dashboard",
    superadmin: "/super-admin/dashboard",
    system_admin: "/super-admin/dashboard",

    admin: "/company-admin/dashboard",
    company_admin: "/company-admin/dashboard",
    companyadmin: "/company-admin/dashboard",

    supervisor: "/supervisor/dashboard",

    artisans: "/artisans/dashboard",
    artisan: "/artisans/dashboard",
    engineer: "/engineers/dashboard",
    mechanic: "/artisans/dashboard",

    operator: "/operator/dashboard",
    planner: "/operator/dashboard",

    technical_support: "/support/dashboard",
    technicalsupport: "/support/dashboard",
    support: "/support/dashboard",
    viewer: "/viewer/dashboard",

     engineers: "/engineers/dashboard",
  };

  return roleMap[normalized] || "/supervisor/dashboard";
};

/**
 * GuestRoute (PublicOnlyRoute):
 * If an already authenticated user visits public authentication pages (e.g. /signin, /signup),
 * they are automatically and immediately redirected to their role's dashboard.
 */
export default function GuestRoute() {
  const token = StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

  if (token && !isTokenExpired(token)) {
    const storedUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    const role =
      storedUser?.role ||
      storedUser?.role_name ||
      StorageService.get<any>(STORAGE_KEYS.ROLE) ||
      getRoleFromToken(token) ||
      "";

    const dashboardPath = getDashboardPathForRole(role);
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
}
