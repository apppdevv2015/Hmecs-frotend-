import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  FileText,
  Building2,
  Mail,
  User,
  ShieldCheck,
  RefreshCw,
  LogOut,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { authService } from "../../services/Auth/authService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import { useNavigate } from "react-router-dom";

interface CompanyPendingApprovalViewProps {
  onRefresh?: () => void;
}

export const CompanyPendingApprovalView: React.FC<
  CompanyPendingApprovalViewProps
> = ({ onRefresh }) => {
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const user = StorageService.getUser();

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      const res = await authService.getMe();
      const latestUser = res?.user || res?.admin || res?.data;

      if (latestUser) {
        StorageService.set(STORAGE_KEYS.USER, latestUser);
        if (latestUser.isActive || latestUser.is_active) {
          showSuccessToast("🎉 Congratulations! Your account has been approved.");
          setTimeout(() => {
            window.location.reload();
          }, 800);
          return;
        }
      }

      showSuccessToast(
        "Application is still under review by Super Admin. Please check back shortly.",
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to check status");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    StorageService.clear();
    window.location.href = "/signin";
  };

  return (
    <div className="mx-auto max-w-5xl py-4 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 p-6 shadow-sm backdrop-blur-md dark:border-amber-900/40 dark:from-amber-950/40 dark:to-orange-950/20 sm:p-8">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/25 ring-4 ring-amber-500/20">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-500" />
                  Under Review & Quotation Processing
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Welcome, {user?.name || "Company Admin"}!
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                Your quotation inquiry and company registration have been
                received. Super Admin is currently evaluating your fleet
                specifications and generating your customized quotation proposal.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
              />
              <span>Check Status</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout: Timeline + Company Info */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Process Stepper / Timeline (2 Columns) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Account Activation Journey
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track the progress of your company onboarding and quotation
              </p>
            </div>
            <button
              onClick={() => navigate("/company-admin/quotation-status")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <span>View Quotation Details</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    1. Quotation Request Submitted
                  </h3>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Completed
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your company information, fleet requirements, and optional
                  services have been logged into the system.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-4 ring-amber-500/20 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    2. Super Admin Technical Review & Pricing
                  </h3>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    In Progress
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Our engineering & commercial team is structuring your machine
                  allowance tier, telemetry modules, and pricing package.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4 opacity-60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    3. Official Quotation & Digital Contract
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
                    Pending
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  You will review and digitally accept the official quotation
                  terms and billing plan right in your portal.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4 opacity-60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    4. Full Platform & AI Health Activation
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
                    Locked
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Full access to real-time machine telemetry, predictive failure
                  alerts, job cards, and maintenance analytics will be activated.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Summary & Support (1 Column) */}
        <div className="flex flex-col gap-6">
          {/* Company Details Box */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Registered Company Details
            </h3>

            <div className="mt-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    Company Name
                  </p>
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {user?.companyName || user?.company || "Mining Company"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    Contact Admin
                  </p>
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {user?.name || "Admin"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    Email Address
                  </p>
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {user?.email || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assistance & Help Card */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-md dark:border-slate-800">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Need Priority Setup?
              </span>
            </div>
            <h4 className="mt-2 text-sm font-bold text-white">
              Direct Super Admin Support
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              If your operations require immediate expedited quotation or trial
              activation, contact our platform administrators directly.
            </p>

            <a
              href="mailto:support@hme.com?subject=Expedite%20Quotation%20Review"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Contact Platform Team</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPendingApprovalView;
