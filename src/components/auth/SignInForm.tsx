import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";

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
    .min(5, "Password must be at least 6 characters."),
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
};

type LoginResponse = {
  message?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: LoginUser;
  admin?: LoginUser;
  company?: LoginUser;
  data?: {
    message?: string;
    token?: string;
    accessToken?: string;
    access_token?: string;
    user?: LoginUser;
    admin?: LoginUser;
    company?: LoginUser;
  };
};

type DecodedToken = {
  role?: string;
  role_name?: string;
  email?: string;
  name?: string;
  companyName?: string;
  company?: string;
  user?: LoginUser;
  data?: {
    role?: string;
    role_name?: string;
    email?: string;
    name?: string;
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

    mechanic: "/mechanic/dashboard",

    engineer: "/engineer/dashboard",

    viewer: "/viewer/dashboard",
  };

  return roleRoutes[normalizedRole] || null;
};

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  localStorage.removeItem("name");
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
        .join("")
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

    mechanic: "Mechanic login successfully",

    engineer: "Engineer login successfully",

    viewer: "Viewer login successfully",
  };

  toast.dismiss();

  toast.success(messages[normalizedRole] || "Login successfully", {
    duration: 2500,
    position: "top-right",
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
    []
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
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    const rememberMe = localStorage.getItem("rememberMe");
    const rememberedEmail = localStorage.getItem("rememberEmail");

    if (rememberMe === "true" && rememberedEmail) {
      setValue("email", rememberedEmail, { shouldValidate: false });
      setIsChecked(true);
    }
  }, [setValue]);

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

        toast.dismiss();
        toast.error("Token not found in login response", {
          duration: 3000,
          position: "top-right",
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

        toast.dismiss();
        toast.error(message, {
          duration: 3000,
          position: "top-right",
        });

        return;
      }

      const finalUser: LoginUser = {
        id: apiUser?.id,
        role: normalizedRole,
        role_name: apiUser?.role_name,
        role_id: apiUser?.role_id,
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

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));
      localStorage.setItem("role", normalizedRole);
      localStorage.setItem("email", finalUser.email || "");
      localStorage.setItem("name", finalUser.name || "");

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
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberEmail");
      }

      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");

      showLoginSuccessToast(normalizedRole);

      navigate(redirectParam || finalRedirect, { replace: true });
    } catch (error) {
      console.error("Login API Error:", error);

      clearAuthStorage();

      const message = getApiErrorMessage(error);

      setError("password", {
        type: "server",
        message,
      });

      toast.dismiss();
      toast.error(message || "Invalid email or password", {
        duration: 3000,
        position: "top-right",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar active={active} setActive={setActive} />

      <main
        className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 pb-10 pt-32"
        style={{
          backgroundImage: "url('/signin-bg.jpg')",
        }}
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