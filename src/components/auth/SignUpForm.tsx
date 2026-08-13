import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import PhoneField from "../common/PhoneField";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { authService } from "../../services/Auth/authService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import {
  showSuccessToast,
  showErrorToast,
  showLoadingToast,
  updateToast,
} from "../../utils/toastUtils";

import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),

  lastName: z.string().trim().min(1, "Last name is required"),

  companyName: z.string().trim().min(1, "Company name is required"),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10 digit phone number"),

  email: z
    .string()
    .trim()
    .min(1, "Company email is required")
    .email("Please enter a valid email address"),

  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const getApiErrorMessage = (error: unknown) => {
  const defaultMessage = "Signup failed. Please try again.";

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
    "constraint",
    "violates",
  ];

  const isBackendError = blockedWords.some((word) => message.includes(word));

  if (isBackendError) {
    return defaultMessage;
  }

  return error.message;
};

export default function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo =
    new URLSearchParams(location.search).get("redirect") || "/cart";

  const signinRedirectPath = `/signin?redirect=${encodeURIComponent(
    redirectTo,
  )}`;

  const [active, setActive] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      phone: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const onSubmit = async (data: SignUpFormData) => {
    const toastId = showLoadingToast("Creating account...", {
      id: "signup-loading",
    });

    try {
      const response = await authService.register({
        company_name: data.companyName.trim(),
        fname: data.firstName.trim(),
        lname: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        mobile_number: data.phone.trim(),
      });

     

      const registerResponse = response as any;

      const token =
        registerResponse?.token ||
        registerResponse?.accessToken ||
        registerResponse?.access_token ||
        registerResponse?.data?.token ||
        registerResponse?.data?.accessToken ||
        registerResponse?.data?.access_token ||
        registerResponse?.admin?.token ||
        registerResponse?.data?.admin?.token ||
        registerResponse?.company?.token ||
        registerResponse?.data?.company?.token;

      const user =
        registerResponse?.user ||
        registerResponse?.data?.user ||
        registerResponse?.data;

      const role =
        user?.role ||
        user?.role_name ||
        user?.roleName ||
        registerResponse?.role ||
        registerResponse?.role_name ||
        registerResponse?.data?.role ||
        registerResponse?.data?.role_name;

      if (token) {
        StorageService.set(STORAGE_KEYS.TOKEN, token);
      }

      if (role) {
        StorageService.set(STORAGE_KEYS.ROLE, String(role));
      }

      if (user) {
        StorageService.set(STORAGE_KEYS.USER, user);
      }

      updateToast("signup-loading", "Account created successfully", "success");

      setTimeout(() => {
        navigate("/cart", { replace: true });
      }, 700);
    } catch (error) {
      console.error("Signup API Error:", error);

      const message = getApiErrorMessage(error);

      if (message.toLowerCase().includes("password")) {
        setError("password", {
          type: "server",
          message,
        });
      } else {
        setError("email", {
          type: "server",
          message,
        });
      }

      updateToast("signup-loading", message, "error");
    }
  };

  return (
    <div className="min-h-screen pt-[90px] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <style>
        {`
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: #0f172a !important;
            transition: background-color 999999s ease-in-out 0s !important;
            box-shadow: inset 0 0 0 1000px #ffffff !important;
            caret-color: #0f172a !important;
          }

          .dark input:-webkit-autofill,
          .dark input:-webkit-autofill:hover,
          .dark input:-webkit-autofill:focus,
          .dark input:-webkit-autofill:active {
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: #ffffff !important;
            transition: background-color 999999s ease-in-out 0s !important;
            box-shadow: inset 0 0 0 1000px #0f172a !important;
            caret-color: #ffffff !important;
          }
        `}
      </style>

      <Navbar active={active} setActive={setActive} />

      <main
        className="relative flex min-h-[720px] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 pb-10"
        style={{
          backgroundImage: "url('/signin-bg.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/65" />
        <div className="absolute left-10 top-32 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="hidden flex-col justify-center border-r border-slate-200 bg-slate-50/90 p-6 dark:border-slate-800 dark:bg-slate-800/60 lg:flex">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/30">
                H
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                Start your HME account
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Create your mining company account and manage fleet,
                maintenance, alerts, and reports in one place.
              </p>

              <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p>✔ Fleet & Machine Tracking</p>
                <p>✔ Maintenance Planning</p>
                <p>✔ Alert Monitoring</p>
                <p>✔ Offline-first system</p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-4 text-center lg:text-left">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  Create Account
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enter your company details
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>First Name *</Label>

                    <Input
                      placeholder="John"
                      className={`mt-1 ${
                        errors.firstName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                      {...register("firstName", {
                        onChange: () => {
                          if (errors.firstName) clearErrors("firstName");
                        },
                      })}
                    />

                    <div className="mt-1 h-3">
                      <p className="text-xs text-red-500">
                        {errors.firstName?.message || ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Last Name *</Label>

                    <Input
                      placeholder="Doe"
                      className={`mt-1 ${
                        errors.lastName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                      {...register("lastName", {
                        onChange: () => {
                          if (errors.lastName) clearErrors("lastName");
                        },
                      })}
                    />

                    <div className="mt-1 h-3">
                      {errors.lastName?.message && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Company Name *</Label>

                    <Input
                      placeholder="ABC Mining Pvt Ltd"
                      className={`mt-1 ${
                        errors.companyName
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                      {...register("companyName", {
                        onChange: () => {
                          if (errors.companyName) clearErrors("companyName");
                        },
                      })}
                    />

                    <div className="mt-1 h-3">
                      <p className="text-xs text-red-500">
                        {errors.companyName?.message || ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-1 h-3">
                    <Label>Phone *</Label>

                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <PhoneField
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);

                            if (errors.phone) {
                              clearErrors("phone");
                            }
                          }}
                          error={undefined} // PhoneField ka default error hide
                          label=""
                          defaultCountry="ZA"
                        />
                      )}
                    />

                    <div className="mt-1 h-5">
                      <p className="text-xs text-red-500">
                        {errors.phone ? "Invalid phone number." : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Company Email *</Label>

                    <Input
                      type="email"
                      placeholder="company@email.com"
                      autoComplete="email"
                      className={`mt-1 ${
                        errors.email
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : ""
                      }`}
                      {...register("email", {
                        setValueAs: (value) => value.trim().toLowerCase(),
                        onChange: () => {
                          if (errors.email) clearErrors("email");
                        },
                      })}
                    />
                    <div className="mt-1 h-5">
                      {errors.email?.message && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Password *</Label>

                    <div className="relative mt-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter strong password"
                        autoComplete="new-password"
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
                      >
                        {showPassword ? (
                          <EyeIcon className="h-5 w-5 fill-current" />
                        ) : (
                          <EyeCloseIcon className="h-5 w-5 fill-current" />
                        )}
                      </button>
                    </div>

                    <div className="mt-1 h-1">
                      <p className="text-xs text-red-500">
                        {errors.password?.message || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Already have an account?{" "}
                  <Link
                    to={signinRedirectPath}
                    className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}
