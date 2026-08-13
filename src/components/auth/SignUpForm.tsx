import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Controller, useForm } from "react-hook-form";
import PhoneField from "../common/PhoneField";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";

// Raw SVG icons and form layouts import
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { authService } from "../../services/authService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { showLoadingToast, updateToast } from "../../utils/toastUtils";
import { signUpSchema } from "../../validations/auth.validation";
import { getSanitizedErrorMessage } from "../../utils/errorHelper";
import { translateError } from "../../errors/auth.errors";
import {
  getTokenFromResponse,
  getUserFromResponse,
  getRoleFromResponse,
} from "../../utils/authParser";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

// Infer SignUpFormData types from validation schemas
type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();

  // Resolves post-registration redirection pathway
  const redirectTo = new URLSearchParams(location.search).get("redirect") || "/cart";

  // Generates redirection URL parameters for returning to sign-in page
  const signinRedirectPath = `/signin?redirect=${encodeURIComponent(redirectTo)}`;

  // Active state indicator for UI components
  const [active, setActive] = useState("");
  // Password visibility flag state
  const [showPassword, setShowPassword] = useState(false);

  // Form initialization using React Hook Form and zod validation schemas
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

  // Handler triggered on submit validation success
  const onSubmit = async (data: SignUpFormData) => {
    // Shows standard UI load indicator toast
    showLoadingToast("Creating account...", {
      id: "signup-loading",
    });

    try {
      // Calls registration API service
      const response = await authService.register({
        company_name: data.companyName.trim(),
        fname: data.firstName.trim(),
        lname: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        mobile_number: data.phone.trim(),
      });

      console.log("Signup API Success:", response);

      // Extracts authentication token, user profile, and permission roles from response
      const token = getTokenFromResponse(response);
      const user = getUserFromResponse(response);
      const role = getRoleFromResponse(response, user);

      // Stores registration token inside storage service if present
      if (token) {
        StorageService.set(STORAGE_KEYS.TOKEN, token);
      }

      // Stores role credentials inside storage service if present
      if (role) {
        StorageService.set(STORAGE_KEYS.ROLE, String(role));
      }

      // Stores user profile payload inside storage service if present
      if (user) {
        StorageService.set(STORAGE_KEYS.USER, user);
      }

      // Triggers success notification alert toast
      updateToast("signup-loading", "Account created successfully", "success");

      // Redirects user to checkout plan or dashboard view
      setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 700);
    } catch (error) {
      console.error("Signup API Error:", error);

      // Filters and translates raw backend errors to friendly English texts
      const rawMessage = getSanitizedErrorMessage(error, "Signup failed. Please try again.");
      const message = translateError(rawMessage);

      // Binds API errors to relevant input form fields
      if (rawMessage.toLowerCase().includes("password")) {
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

      // Updates loading toast with final error description
      updateToast("signup-loading", message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Navigation menu header bar */}
      <Navbar active={active} setActive={setActive} />

      <main
        className="relative flex min-h-[720px] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 pb-10"
        style={{
          backgroundImage: `url('${import.meta.env.VITE_APP_SIGNIN_BG}')`,
        }}
      >
        {/* Background layout overlay filters and shapes */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/65" />
        <div className="absolute left-10 top-32 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />

        {/* Outer card container layout */}
        <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/30">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            {/* Sidebar information card container */}
            <div className="hidden flex-col justify-center border-r border-slate-200 bg-slate-50/90 p-6 dark:border-slate-800 dark:bg-slate-800/60 lg:flex">
              {/* Branding Logo Character Icon */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/30">
                {import.meta.env.VITE_APP_LOGO_LETTER || "H"}
              </div>

              {/* Dynamic registration title header */}
              <h2 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
                Start your {import.meta.env.VITE_APP_NAME || "HME"} account
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Create your mining company account and manage fleet, maintenance, alerts, and
                reports in one place.
              </p>

              {/* Product feature bullets */}
              <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  Fleet & Machine Tracking
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  Maintenance Planning
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  Alert Monitoring
                </p>
                <p className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  Offline-first system
                </p>
              </div>
            </div>

            {/* Registration Form container */}
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
                  {/* First Name container */}
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

                    {/* Inline validation alert trigger */}
                    <div className="mt-1 h-3">
                      <p className="text-xs text-red-500">{errors.firstName?.message || ""}</p>
                    </div>
                  </div>

                  {/* Last Name container */}
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

                    {/* Inline validation alert trigger */}
                    <div className="mt-1 h-3">
                      {errors.lastName?.message && (
                        <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Company Name container */}
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

                    {/* Inline validation alert trigger */}
                    <div className="mt-1 h-3">
                      <p className="text-xs text-red-500">{errors.companyName?.message || ""}</p>
                    </div>
                  </div>

                  {/* Phone container */}
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
                          error={undefined} // Hides defaults
                          label=""
                          defaultCountry="ZA"
                        />
                      )}
                    />

                    {/* Inline validation alert trigger */}
                    <div className="mt-1 h-5">
                      <p className="text-xs text-red-500">
                        {errors.phone ? "Invalid phone number." : ""}
                      </p>
                    </div>
                  </div>

                  {/* Email container */}
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

                    {/* Inline validation alert trigger */}
                    <div className="mt-1 h-5">
                      {errors.email?.message && (
                        <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Password container */}
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

                      {/* Password visibility toggler icon button */}
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

                    {/* Inline validation alert trigger */}
                    <div className="mt-1 h-1">
                      <p className="text-xs text-red-500">{errors.password?.message || ""}</p>
                    </div>
                  </div>
                </div>

                {/* Primary submit register account button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              {/* Redirect option to Sign In page */}
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

      {/* Footer container block */}
      <div className="[&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
        <Footer />
      </div>
    </div>
  );
}
