import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import StorageService, { STORAGE_KEYS } from "../services/storage.service";

type RoleProtectedRouteProps = {
  allowedRoles: string[];
};

type AuthState = {
  token: string;
  role: string;
};

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");
}

function getRoleFromToken(token: string) {
  try {
    const payload = token.split(".")[1];

    if (!payload) return "";

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    const decoded = JSON.parse(window.atob(base64));

    return (
      decoded?.role ||
      decoded?.role_name ||
      decoded?.user?.role ||
      decoded?.user?.role_name ||
      decoded?.data?.user?.role ||
      decoded?.data?.user?.role_name ||
      ""
    );
  } catch (error) {
    console.error("Error decoding token:", error);

    return "";
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];

    if (!payload) return true;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    const decoded = JSON.parse(window.atob(base64));

    if (!decoded.exp) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);

    return decoded.exp <= currentTime;
  } catch (error) {
    console.error("Token expiry check failed:", error);
    return true;
  }
}

function getStoredRole() {
  try {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

    const storedUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};

    return (
      storedUser?.role ||
      storedUser?.role_name ||
      StorageService.get<string>(STORAGE_KEYS.ROLE) ||
      getRoleFromToken(token) ||
      ""
    );
  } catch (error) {
    console.error("Error getting stored role:", error);

    return "";
  }
}

export default function RoleProtectedRoute({ allowedRoles }: RoleProtectedRouteProps) {
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(true);

  const [authState, setAuthState] = useState<AuthState>({
    token: "",
    role: "",
  });

  useEffect(() => {
    try {
      const token = StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

      // No token
      if (!token) {
        setAuthState({
          token: "",
          role: "",
        });
        return;
      }

      // Token expired
      if (isTokenExpired(token)) {
        StorageService.remove(STORAGE_KEYS.TOKEN);
        StorageService.remove(STORAGE_KEYS.USER);
        StorageService.remove(STORAGE_KEYS.ROLE);
        StorageService.remove(STORAGE_KEYS.EMAIL);
        StorageService.remove(STORAGE_KEYS.NAME);
        StorageService.remove(STORAGE_KEYS.COMPANY_ID);

        setAuthState({
          token: "",
          role: "",
        });

        return;
      }

      // Token valid
      const role = getStoredRole();

      setAuthState({
        token,
        role,
      });
    } catch (error) {
      console.error("Auth initialization error:", error);

      setAuthState({
        token: "",
        role: "",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return null;
  }

  const normalizedUserRole = normalizeRole(authState.role);

  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role));

  const hasAccess = normalizedAllowedRoles.includes(normalizedUserRole);

  // No token → redirect login
  if (!authState.token) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // No role access → redirect access denied
  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  // Valid access
  return <Outlet />;
}
