import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../services/api";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

type LoginUser = {
  id?: string | number;
  role?: string;
  role_name?: string;
  name?: string;
  email?: string;
};

type LoginResponse = {
  token?: string;
  access_token?: string;
  data?: {
    token?: string;
    access_token?: string;
    user?: LoginUser;
  };
  user?: LoginUser;
};

type DecodedToken = {
  role?: string;
  role_name?: string;
  email?: string;
  name?: string;
  user?: LoginUser;
};

const normalizeRole = (role?: string) => {
  return role?.toLowerCase().trim().replace(/\s+/g, "_").replace(/-/g, "_") || "";
};

const decodeToken = (token: string): DecodedToken | null => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((char) => {
          return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
};

export default function SuperAdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearAuthStorage = () => {
    StorageService.remove(STORAGE_KEYS.TOKEN);
    StorageService.remove(STORAGE_KEYS.USER);
    StorageService.remove(STORAGE_KEYS.ROLE);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showErrorToast("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      clearAuthStorage();

      const response = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const token =
        response?.token ||
        response?.access_token ||
        response?.data?.token ||
        response?.data?.access_token;

      if (!token) {
        showErrorToast("Login failed. Token not received.");
        return;
      }

      const decodedToken = decodeToken(token);

      const apiUser = response?.user || response?.data?.user;

      const userRole =
        decodedToken?.role ||
        decodedToken?.role_name ||
        decodedToken?.user?.role ||
        decodedToken?.user?.role_name ||
        apiUser?.role ||
        apiUser?.role_name;

      const normalizedRole = normalizeRole(userRole);

      const allowedRoles = ["super_admin", "system_admin", "superadmin"];

      if (!allowedRoles.includes(normalizedRole)) {
        clearAuthStorage();
        showErrorToast("Super Admin only access");
        return;
      }

      const finalUser: LoginUser = {
        id: apiUser?.id || decodedToken?.user?.id,
        role: userRole,
        role_name: apiUser?.role_name || decodedToken?.role_name,
        name: apiUser?.name || decodedToken?.name || decodedToken?.user?.name,
        email: apiUser?.email || decodedToken?.email || decodedToken?.user?.email,
      };

      StorageService.set(STORAGE_KEYS.TOKEN, token);
      StorageService.set(STORAGE_KEYS.ROLE, normalizedRole);
      StorageService.set(STORAGE_KEYS.USER, finalUser);

      showSuccessToast("Super Admin login successful");

      setTimeout(() => {
        navigate("/super-admin/dashboard", { replace: true });
      }, 800);
    } catch (error: any) {
      clearAuthStorage();
      showErrorToast(error?.message || "Invalid super admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1e40af33,transparent_35%),radial-gradient(circle_at_bottom,#f9731630,transparent_30%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
              <ShieldCheck className="h-9 w-9 text-white" />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Super Admin Login</h1>
            <p className="mt-2 text-sm text-slate-400">HME Component Intelligence System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email Address</label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-3 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-3 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login as Super Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
