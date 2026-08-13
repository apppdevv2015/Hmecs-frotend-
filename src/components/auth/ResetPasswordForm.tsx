import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { authService } from "../../services/Auth/authService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

// Step 1: Request Email Schema
const requestResetSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
});

// Step 2: Set New Password Schema
const setPasswordSchema = z
  .object({
    otp: z
      .string()
      .trim()
      .min(4, "Please enter the verification code."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Must include at least 1 uppercase letter.")
      .regex(/[0-9]/, "Must include at least 1 number."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RequestResetFormData = z.infer<typeof requestResetSchema>;
type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState("login");

  // Flow states: 1 = Request, 2 = Set Password, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userEmail, setUserEmail] = useState("");
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form for Step 1
  const requestForm = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: "" },
  });

  // Form for Step 2
  const passwordForm = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const watchPassword = passwordForm.watch("newPassword") || "";

  // Check URL parameters on mount
  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (email) {
      setUserEmail(email);
      requestForm.setValue("email", email);
    }

    if (token) {
      setTokenFromUrl(token);
      setStep(2);
      if (token.length >= 6) {
        // Auto-fill OTP field with token or prompt
        passwordForm.setValue("otp", "VERIFIED");
      }
    }
  }, [searchParams, requestForm, passwordForm]);

  // Cooldown countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    if (!watchPassword) return 0;
    let score = 0;
    if (watchPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(watchPassword)) score += 1;
    if (/[a-z]/.test(watchPassword)) score += 1;
    if (/[0-9]/.test(watchPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(watchPassword)) score += 1;
    return score;
  }, [watchPassword]);

  // Step 1: Submit email to request reset
  const handleRequestSubmit = async (data: RequestResetFormData) => {
    try {
      setIsSubmitting(true);
      const res = await authService.forgotPassword({ email: data.email });
      setUserEmail(data.email);
      showSuccessToast(
        res.message || "Password reset instructions sent to your email!"
      );
      
      // If dev OTP was returned, autofill for seamless testing
      if (res.otp) {
        passwordForm.setValue("otp", res.otp);
      }
      if (res.token) {
        setTokenFromUrl(res.token);
      }

      setStep(2);
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err?.message || err?.error || "Failed to send reset link. Please verify your email.";
      showErrorToast(msg);
      requestForm.setError("email", { type: "server", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP / Link
  const handleResend = async () => {
    if (resendCooldown > 0 || !userEmail) return;
    try {
      setIsSubmitting(true);
      const res = await authService.forgotPassword({ email: userEmail });
      if (res.otp) passwordForm.setValue("otp", res.otp);
      if (res.token) setTokenFromUrl(res.token);
      showSuccessToast("A new verification code has been sent.");
      setResendCooldown(60);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to resend code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit new password
  const handlePasswordSubmit = async (data: SetPasswordFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        email: userEmail,
        token: tokenFromUrl || undefined,
        otp: data.otp !== "VERIFIED" ? data.otp : undefined,
        newPassword: data.newPassword,
      };

      const res = await authService.resetPassword(payload);
      showSuccessToast(res.message || "Password reset successfully!");
      setStep(3);
    } catch (err: any) {
      const msg = err?.message || err?.error || "Failed to reset password. Please check your verification code.";
      showErrorToast(msg);
      passwordForm.setError("otp", { type: "server", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-[30px] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex flex-col justify-between">
      <Navbar active={active} setActive={setActive} />

      <main className="relative flex min-h-[640px] items-center justify-center overflow-hidden px-4 pb-12 pt-28">
        {/* Background Ambient Glows */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/65" />
        <div className="absolute left-1/4 top-24 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute right-1/4 bottom-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/40">
          
          {/* Top Logo & Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xl font-black text-white shadow-lg shadow-blue-600/30">
              {step === 3 ? "✓" : "🔐"}
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {step === 1 && "Forgot Password?"}
              {step === 2 && "Create New Password"}
              {step === 3 && "Password Reset Complete"}
            </h1>

            <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
              {step === 1 && "Enter your registered email and we'll send you reset instructions & a verification code."}
              {step === 2 && (
                <span>
                  Enter the verification code sent to <strong className="text-slate-800 dark:text-slate-200">{userEmail}</strong> and your new password.
                </span>
              )}
              {step === 3 && "Your password has been securely updated. You can now log in with your new credentials."}
            </p>
          </div>

          {/* STEP 1: Request Reset Form */}
          {step === 1 && (
            <form
              onSubmit={requestForm.handleSubmit(handleRequestSubmit)}
              className="space-y-4"
              noValidate
            >
              <div>
                <Label>
                  Account Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  error={Boolean(requestForm.formState.errors.email)}
                  className="mt-2"
                  {...requestForm.register("email")}
                />
                {requestForm.formState.errors.email?.message && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending Code...
                  </span>
                ) : (
                  "Send Reset Instructions →"
                )}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/signin"
                  className="text-sm font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                >
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Set New Password Form */}
          {step === 2 && (
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Verification Code */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>
                    Verification Code (OTP) <span className="text-red-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isSubmitting}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-slate-400 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                  </button>
                </div>

                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  error={Boolean(passwordForm.formState.errors.otp)}
                  className="mt-2 text-center text-lg font-mono tracking-widest"
                  maxLength={10}
                  {...passwordForm.register("otp")}
                />
                {passwordForm.formState.errors.otp?.message && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {passwordForm.formState.errors.otp.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <Label>
                  New Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    error={Boolean(passwordForm.formState.errors.newPassword)}
                    className="pr-12"
                    {...passwordForm.register("newPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeIcon className="h-5 w-5 fill-current" />
                    ) : (
                      <EyeCloseIcon className="h-5 w-5 fill-current" />
                    )}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {watchPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength <= 2
                            ? "w-1/3 bg-red-500"
                            : passwordStrength <= 4
                            ? "w-2/3 bg-amber-500"
                            : "w-full bg-emerald-500"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Strength:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {passwordStrength <= 2 ? "Weak" : passwordStrength <= 4 ? "Good" : "Strong"}
                      </span>
                    </p>
                  </div>
                )}

                {passwordForm.formState.errors.newPassword?.message && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label>
                  Confirm New Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    error={Boolean(passwordForm.formState.errors.confirmPassword)}
                    className="pr-12"
                    {...passwordForm.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="h-5 w-5 fill-current" />
                    ) : (
                      <EyeCloseIcon className="h-5 w-5 fill-current" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword?.message && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Resetting Password...
                  </span>
                ) : (
                  "Update Password & Sign In"
                )}
              </Button>

              <div className="pt-2 text-center flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ← Change Email
                </button>
                <Link
                  to="/signin"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                🎉
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Your password has been successfully updated. You can now use your new password to sign into your HME account.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => navigate("/signin")}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
              >
                Proceed to Sign In →
              </Button>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
