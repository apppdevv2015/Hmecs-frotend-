import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StorageService, {
  STORAGE_KEYS,
} from "../services/storage.service";
import { getDashboardPathForRole } from "./GuestRoute";

export default function AuthInitializer() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
    const storedUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    const role =
      storedUser?.role ||
      storedUser?.role_name ||
      StorageService.get<string>(STORAGE_KEYS.ROLE);

    if (!token) return;

    const authRoutes = [
      "/",
      "/signin",
      "/signup",
      "/super-admin/login",
      "/reset-password",
      "/forgot-password",
    ];

    if (authRoutes.includes(location.pathname)) {
      const redirectPath = getDashboardPathForRole(role);
      navigate(redirectPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}