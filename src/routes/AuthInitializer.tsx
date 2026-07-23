import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import StorageService, {
  STORAGE_KEYS,
} from "../services/storage.service";

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

const roleRoutes: Record<string, string> = {
  super_admin: "/super-admin/dashboard",
  superadmin: "/super-admin/dashboard",

  admin: "/company-admin/dashboard",
  company_admin: "/company-admin/dashboard",
  companyadmin: "/company-admin/dashboard",

  operator: "/operator/dashboard",
  supervisor: "/supervisor/dashboard",
  technical_support: "/support/dashboard",
  technicalsupport: "/support/dashboard",
  support: "/support/dashboard",
  engineer: "/artisans/dashboard",
  artisan: "/artisans/dashboard",
  artisans: "/artisans/dashboard",
};

export default function AuthInitializer() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
    const role = StorageService.get<string>(STORAGE_KEYS.ROLE);

    if (!token || !role) return;

    const redirectPath = roleRoutes[normalizeRole(role)];

    if (!redirectPath) return;

    const authRoutes = [
      "/",
      "/signin",
      "/signup",
      "/super-admin/login",
    ];

    // Current page auth page nahi hai to kuch mat karo
    if (!authRoutes.includes(location.pathname)) {
      return;
    }

    const navigation =
      performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming | undefined;

    // Sirf browser refresh par redirect karo
    if (navigation?.type !== "reload") {
      return;
    }

    navigate(redirectPath, {
      replace: true,
    });
  }, []); // ⭐ Important: sirf initial page load par chalega

  return null;
}