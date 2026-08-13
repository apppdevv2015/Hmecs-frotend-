import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Icons and form input components import
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";

// Services and utilities import
import { authService, normalizeRole } from "../../services/authService";
import { userService } from "../../services/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { showErrorToast, showLoginSuccessToast } from "../../utils/toastUtils";
import { signInSchema } from "../../validations/auth.validation";
import { AUTH_ERRORS, translateError } from "../../errors/auth.errors";
import { decodeToken } from "../../utils/token";
import { LoginResponse } from "../../types/auth.types";
import {
  getTokenFromResponse,
  getUserFromResponse,
  getRoleFromResponse,
  getFinalUser,
} from "../../utils/authParser";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

// React Hook Form types inference from validation schema
type SignInFormData = z.infer<typeof signInSchema>;

// Local getUserFullName helper has been centralized in src/utils/authParser.ts

/**
 * Helper: Extracts nested 'data' payload from API response if present.
 */
const getLoginData = (response: LoginResponse) => response?.data || response;

export default function SignInForm() {
  const navigate = useNavigate();

  // Active state for navigation menu links
  const [active, setActive] = useState("");
  // State to toggle password visibility (show/hide)
  const [showPassword, setShowPassword] = useState(false);
  // State to check whether "Remember Me" is checked
  const [isChecked, setIsChecked] = useState(false);

  // Memoized default form values to prevent unnecessary re-renders
  const defaultValues = useMemo<SignInFormData>(
    () => ({
      email: "",
      password: "",
    }),
    [],
  );

  // React Hook Form hooks initialization using the zod validation resolver
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

  // Side Effect: Auto-populates remembered email credentials from StorageService if active
  useEffect(() => {
    const rememberMe = StorageService.get<string>(STORAGE_KEYS.REMEMBER_ME);
    const rememberedEmail = StorageService.get<string>(STORAGE_KEYS.REMEMBER_EMAIL);

    if (rememberMe === "true" && rememberedEmail) {
      setValue("email", rememberedEmail, { shouldValidate: false });
      setIsChecked(true); // Sets state to auto-tick the checkbox
    }
  }, [setValue]);

  // onSubmit: Submits credentials payload to the authentication API
  const onSubmit = async (formData: SignInFormData) => {
    try {
      clearErrors(); // Resets previous form errors

      const email = formData.email.trim().toLowerCase();

      // Triggers authentication login service call
      const response = (await authService.login({
        email,
        password: formData.password,
      })) as LoginResponse;

      const loginData = getLoginData(response);
      const token = getTokenFromResponse(response);
      const apiUser = getUserFromResponse(response);

      // Validates login token existence; logs out if token is missing
      if (!token) {
        authService.clearAuthStorage();

        setError("password", {
          type: "server",
          message: AUTH_ERRORS.tokenNotFound,
        });

        showErrorToast(AUTH_ERRORS.tokenNotFound, {
          duration: 3000,
        });

        return;
      }

      // Decodes standard JWT base64 tokens
      const decodedToken = decodeToken(token);
      // Extracts user role from credentials payload
      const userRole = getRoleFromResponse(response, decodedToken || apiUser);

      // Normalizes and maps user roles to specific dashboard paths
      const normalizedRole = normalizeRole(userRole);
      const redirectPath = authService.getRedirectPathByRole(normalizedRole);

      // Rejects unauthorized access if user role redirect path is undefined
      if (!redirectPath) {
        authService.clearAuthStorage();

        const message = translateError(`Role not allowed: ${userRole || "No role found"}`);

        setError("password", {
          type: "server",
          message,
        });

        showErrorToast(message, {
          duration: 3000,
        });

        return;
      }

      // Standardizes LoginUser object mapping from response data and token via centralized helper
      const finalUser = getFinalUser(response, decodedToken, normalizedRole, email);

      // Saves user details, role, and token inside LocalStorage
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

      // Verifies active billing subscription plans for administrators
      if (normalizedRole === "company_admin" || normalizedRole === "admin") {
        try {
          const subscription = await userService.getActiveSubscription();

          // Redirects to plans/pricing page if no active subscription is found
          if (!subscription) {
            finalRedirect = "/plans";
          }
        } catch (subscriptionError) {
          console.error("Subscription check error:", subscriptionError);
        }
      }

      // Saves or clears Remember Me credentials based on checkbox status
      if (isChecked) {
        StorageService.set(STORAGE_KEYS.REMEMBER_ME, "true");
        StorageService.set(STORAGE_KEYS.REMEMBER_EMAIL, email);
      } else {
        StorageService.remove(STORAGE_KEYS.REMEMBER_ME);
        StorageService.remove(STORAGE_KEYS.REMEMBER_EMAIL);
      }

      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");

      // Triggers successful sign-in toast notification
      showLoginSuccessToast(normalizedRole);

      // Redirects to target dashboard with replace history option
      setTimeout(() => {
        navigate(redirectParam || finalRedirect, {
          replace: true,
        });
      }, 500);
    } catch (error) {
      console.error("Login API Error:", error);

      authService.clearAuthStorage();

      // Translates server-side API error messages into standard user messages
      const message = authService.getApiErrorMessage(error);

      setError("password", {
        type: "server",
        message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Header Navigation menu bar */}
      <Navbar active={active} setActive={setActive} />

      <main
        className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 pb-10 pt-32"
        style={{
          backgroundImage: `url('${import.meta.env.VITE_APP_SIGNIN_BG || "/signin-bg.jpg"}')`,
        }}
      >
        {/* Background layout decorations and filters */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/65" />
        <div className="absolute left-10 top-32 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />

        {/* Form wrapper container card */}
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
          <div className="mb-6 text-center">
            {/* Branding Logo Character Icon */}
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/30">
              {import.meta.env.VITE_APP_LOGO_LETTER || "H"}
            </div>

            {/* Dynamic Welcome Header Title */}
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {import.meta.env.VITE_APP_WELCOME_TITLE || "Welcome Back"}
            </h1>

            {/* Dynamic app name description */}
            <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
              Sign in to access your {import.meta.env.VITE_APP_NAME || "HME"} dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email input field container */}
            <div>
              <Label>
                Email <span className="text-red-500">*</span>
              </Label>

              <Input
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                error={Boolean(errors.email)}
                className={`mt-2 ${
                  errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
                }`}
                {...register("email", {
                  onChange: () => {
                    if (errors.email) clearErrors("email");
                  },
                })}
              />

              {/* Inline email validation error alert message */}
              {errors.email?.message && (
                <p className="mt-1 text-xs font-medium text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password input field container */}
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

                {/* Button to toggle password input visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeCloseIcon className="h-5 w-5 fill-current" />
                  ) : (
                    <EyeIcon className="h-5 w-5 fill-current" />
                  )}
                </button>
              </div>

              {/* Inline password validation error alert message */}
              {errors.password?.message && (
                <p className="mt-1 text-xs font-medium text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Actions footer: Remember Me checkbox and Reset Password link */}
            <div className="flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={isChecked} onChange={setIsChecked} />

                <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
              </label>

              <Link
                to="/reset-password"
                className="text-sm font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            {/* Primary Sign In submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          {/* NavLink options to trigger register redirect */}
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

      {/* Standard footer section */}
      <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}
