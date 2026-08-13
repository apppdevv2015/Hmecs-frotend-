import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { authService } from "../../services/Auth/authService";
import { userService } from "../../services/Auth/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

import loginBg  from "../../assets/images/loginbg.jpg"
import {
  showSuccessToast,
  showErrorToast,
  dismissAllToasts,
} from "../../utils/toastUtils";

import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),

 password: z
  .string()
  .min(1, "Password is required.")
});

type SignInFormData = z.infer<typeof signInSchema>;

type LoginUser = {
  id?: string | number;
  role?: string;
  role_name?: string;
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  companyName?: string;
  company?: string;
  company_name?: string;
  role_id?: string | number;

  companyId?: string;
  company_id?: string;
};

type LoginResponse = {
  message?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: LoginUser;
  admin?: LoginUser;
  company?: LoginUser;
  companyId?: string;
  company_id?: string;
  data?: {
    message?: string;
    token?: string;
    accessToken?: string;
    access_token?: string;
    user?: LoginUser;
    admin?: LoginUser;
    company?: LoginUser;
    companyId?: string;
    company_id?: string;
  };
};

type DecodedToken = {
  id?: string | number;
  role?: string;
  role_name?: string;
  email?: string;
  name?: string;
  companyName?: string;
  company?: string;
  companyId?: string;
  company_id?: string;
  user?: LoginUser;
  data?: {
    id?: string | number;
    role?: string;
    role_name?: string;
    email?: string;
    name?: string;
    companyId?: string;
    company_id?: string;
    user?: LoginUser;
  };
  roles?: string[];
  exp?: number;
};

const normalizeRole = (role?: string | number | null) => {
  if (!role) return "";

  return String(role)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");
};

const getRedirectPathByRole = (role?: string | number | null) => {
  const normalizedRole = normalizeRole(role);

  const roleRoutes: Record<string, string> = {
    super_admin: "/super-admin/dashboard",
    superadmin: "/super-admin/dashboard",
    system_admin: "/super-admin/dashboard",

    admin: "/company-admin/dashboard",
    company_admin: "/company-admin/dashboard",
    companyadmin: "/company-admin/dashboard",

    operator: "/operator/dashboard",
    planner: "/operator/dashboard",

    supervisor: "/supervisor/dashboard",

    technical_support: "/support/dashboard",
    technicalsupport: "/support/dashboard",
    support: "/support/dashboard",

    engineer: "/artisans/dashboard",
    mechanic: "/artisans/dashboard",

    artisan: "/artisans/dashboard",
    artisans: "/artisans/dashboard",

    viewer: "/viewer/dashboard",
  };

  return roleRoutes[normalizedRole] || null;
};

const clearAuthStorage = () => {
  StorageService.remove(STORAGE_KEYS.TOKEN);
  StorageService.remove(STORAGE_KEYS.USER);
  StorageService.remove(STORAGE_KEYS.ROLE);
  StorageService.remove(STORAGE_KEYS.EMAIL);
  StorageService.remove(STORAGE_KEYS.NAME);
  StorageService.remove(STORAGE_KEYS.COMPANY_ID);
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
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
};

const getUserFullName = (user?: LoginUser) => {
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  return user?.name || fullName || user?.email || "User";
};

const getLoginData = (response: LoginResponse) => response?.data || response;

const getCompanyIdFromLogin = (
  loginData: LoginResponse["data"] | LoginResponse,
  apiUser?: LoginUser,
  decodedToken?: DecodedToken | null,
) => {
  return (
    apiUser?.companyId ||
    apiUser?.company_id ||
    loginData?.companyId ||
    loginData?.company_id ||
    loginData?.company?.companyId ||
    loginData?.company?.company_id ||
    String(loginData?.company?.id || "") ||
    decodedToken?.companyId ||
    decodedToken?.company_id ||
    decodedToken?.user?.companyId ||
    decodedToken?.user?.company_id ||
    decodedToken?.data?.companyId ||
    decodedToken?.data?.company_id ||
    decodedToken?.data?.user?.companyId ||
    decodedToken?.data?.user?.company_id ||
    ""
  );
};

const getApiErrorMessage = (error: unknown) => {
  const defaultMessage = "Invalid email or password";

  if (!(error instanceof Error) || !error.message) {
    return defaultMessage;
  }

  const message = error.message.toLowerCase();

  const blockedWords = [
    "select",
    "insert",
    "update",
    "delete",
    "relation",
    "sql",
    "database",
    "users",
    "roles",
    "companies",
    "join",
    "where",
    "limit",
    "syntax",
    "column",
    "table",
  ];

  const isBackendError = blockedWords.some((word) => message.includes(word));

  if (isBackendError) {
    return defaultMessage;
  }

  return error.message;
};

const showLoginSuccessToast = (role?: string | number | null) => {
  const normalizedRole = normalizeRole(role);

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
    artisuns: "Artisuns login successfully",
    viewer: "Viewer login successfully",
  };

  showSuccessToast(messages[normalizedRole] || "Login successfully", {
    duration: 2500,
    id: "login-success",
  });
};

export default function SignInForm() {
  const navigate = useNavigate();

  const [active, setActive] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const defaultValues = useMemo<SignInFormData>(
    () => ({
      email: "",
      password: "",
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  useEffect(() => {
    const rememberMe = StorageService.get<string>(STORAGE_KEYS.REMEMBER_ME);
    const rememberedEmail = StorageService.get<string>(
      STORAGE_KEYS.REMEMBER_EMAIL,
    );

    if (rememberMe === "true" && rememberedEmail) {
      setValue("email", rememberedEmail, { shouldValidate: false });
      setIsChecked(true);
    }
  }, [setValue]);


  useEffect(() => {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
    if (!token) return;

    const storedUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    const role =
      storedUser?.role ||
      storedUser?.role_name ||
      StorageService.get<string>(STORAGE_KEYS.ROLE);

    const redirect = getRedirectPathByRole(role);

    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [navigate]);


  const onSubmit = async (formData: SignInFormData) => {
    try {
      clearErrors();

      const email = formData.email.trim().toLowerCase();

      const response = (await authService.login({
        email,
        password: formData.password,
      })) as LoginResponse;

      const loginData = getLoginData(response);

      const token =
        loginData?.token || loginData?.accessToken || loginData?.access_token;

      const apiUser =
        loginData?.user || loginData?.admin || loginData?.company || undefined;

      if (!token) {
        clearAuthStorage();

        setError("password", {
          type: "server",
          message: "Token not found in login response.",
        });

        showErrorToast("Token not found in login response", {
          duration: 3000,
        });

        return;
      }

      const decodedToken = decodeToken(token);

      const userRole =
        decodedToken?.role ||
        decodedToken?.role_name ||
        decodedToken?.user?.role ||
        decodedToken?.user?.role_name ||
        decodedToken?.data?.role ||
        decodedToken?.data?.role_name ||
        decodedToken?.data?.user?.role ||
        decodedToken?.data?.user?.role_name ||
        decodedToken?.roles?.[0] ||
        apiUser?.role ||
        apiUser?.role_name;

      const normalizedRole = normalizeRole(userRole);
      const redirectPath = getRedirectPathByRole(normalizedRole);

      if (!redirectPath) {
        clearAuthStorage();

        const message = `Role not allowed: ${userRole || "No role found"}`;

        setError("password", {
          type: "server",
          message,
        });

        showErrorToast(message, {
          duration: 3000,
        });

        return;
      }

      const companyId = getCompanyIdFromLogin(loginData, apiUser, decodedToken);

      const finalUser: LoginUser = {
        id:
          apiUser?.id ||
          decodedToken?.id ||
          decodedToken?.user?.id ||
          decodedToken?.data?.id ||
          decodedToken?.data?.user?.id,

        role: normalizedRole,
        role_name: apiUser?.role_name,
        role_id: apiUser?.role_id,

        companyId,

        email:
          decodedToken?.email ||
          decodedToken?.user?.email ||
          decodedToken?.data?.email ||
          decodedToken?.data?.user?.email ||
          apiUser?.email ||
          email,

        name:
          decodedToken?.name ||
          decodedToken?.user?.name ||
          decodedToken?.data?.name ||
          decodedToken?.data?.user?.name ||
          apiUser?.name ||
          getUserFullName(apiUser),

        first_name: apiUser?.first_name,
        last_name: apiUser?.last_name,

        companyName:
          decodedToken?.companyName ||
          decodedToken?.user?.companyName ||
          apiUser?.companyName ||
          apiUser?.company_name,

        company:
          decodedToken?.company ||
          decodedToken?.user?.company ||
          apiUser?.company ||
          apiUser?.company_name,
      };

      StorageService.set(STORAGE_KEYS.TOKEN, token);
      StorageService.set(STORAGE_KEYS.USER, finalUser);
      StorageService.set(STORAGE_KEYS.ROLE, normalizedRole);
      StorageService.set(STORAGE_KEYS.EMAIL, finalUser.email || "");
      StorageService.set(STORAGE_KEYS.NAME, finalUser.name || "");

      if (finalUser.companyId) {
        StorageService.set(STORAGE_KEYS.COMPANY_ID, finalUser.companyId);
      } else {
        StorageService.remove(STORAGE_KEYS.COMPANY_ID);
      }

      let finalRedirect = redirectPath;

      if (normalizedRole === "company_admin" || normalizedRole === "admin") {
        try {
          const subscription = await userService.getActiveSubscription();

          if (!subscription) {
            finalRedirect = "/plans";
          }
        } catch (subscriptionError) {
          console.error("Subscription check error:", subscriptionError);
        }
      }

      if (isChecked) {
        StorageService.set(STORAGE_KEYS.REMEMBER_ME, "true");
        StorageService.set(STORAGE_KEYS.REMEMBER_EMAIL, email);
      } else {
        StorageService.remove(STORAGE_KEYS.REMEMBER_ME);
        StorageService.remove(STORAGE_KEYS.REMEMBER_EMAIL);
      }

      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");

      showLoginSuccessToast(normalizedRole);

      setTimeout(() => {
        navigate(redirectParam || finalRedirect, {
        });
      }, 500);
    } catch (error) {
      console.error("Login API Error:", error);

      clearAuthStorage();

      const message = getApiErrorMessage(error);

      showErrorToast(message, {
        duration: 4000,
      });

      setError("password", {
        type: "server",
        message,
      });
    }
  };

  return (
    <div className="min-h-screen pt-[30px] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar active={active} setActive={setActive} />

      <main
  className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 pb-10 pt-32"
  // style={{
  //   backgroundImage: `linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2)), url(${loginBg})`,
  // }}
>
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/65" />
        <div className="absolute left-10 top-32 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/30">
              H
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
              Sign in to access your HME dashboard
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div>
              <Label>
                Company Email <span className="text-red-500">*</span>
              </Label>

              <Input
                type="email"
                placeholder="Enter your company email"
                autoComplete="email"
                error={Boolean(errors.email)}
                className={`mt-2 ${
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : ""
                }`}
                {...register("email", {
                  onChange: () => {
                    if (errors.email) clearErrors("email");
                  },
                })}
              />

              {errors.email?.message && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label>
                Password <span className="text-red-500">*</span>
              </Label>

              <div className="relative mt-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  className={`pr-12 ${
                    errors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : ""
                  }`}
                  {...register("password", {
                    onChange: () => {
                      if (errors.password) clearErrors("password");
                    },
                  })}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeIcon className="h-5 w-5 fill-current" />
                  ) : (
                    <EyeCloseIcon className="h-5 w-5 fill-current" />
                  )}
                </button>
              </div>

              {errors.password?.message && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={isChecked} onChange={setIsChecked} />

                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Remember me
                </span>
              </label>

              <Link
                to="/reset-password"
                className="text-sm font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Don’t have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </main>

      <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}
