import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Compass,
  FileQuestion,
  Home,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { getDashboardPathForRole } from "../../routes/GuestRoute";
import PageMeta from "./PageMeta";

export type StatusPageType =
  | "not-found"
  | "access-denied"
  | "error"
  | "coming-soon"
  | "maintenance";

export interface AppStatusPageProps {
  type: StatusPageType;
  title?: string;
  subtitle?: string;
  description?: string;
  errorCode?: string | number;
  errorMessage?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  customAction?: React.ReactNode;
}

const STATUS_CONFIGS: Record<
  StatusPageType,
  {
    code: string;
    badge: string;
    defaultTitle: string;
    defaultSubtitle: string;
    defaultDescription: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    glowColor: string;
    primaryBtnText: string;
  }
> = {
  "not-found": {
    code: "404",
    badge: "Page Not Found",
    defaultTitle: "Lost in the Fleet Grid?",
    defaultSubtitle: "We couldn't locate the operational page you're searching for.",
    defaultDescription:
      "The link might be broken, deprecated, or moved to a different operations route. Check the URL or return to your active control center.",
    icon: FileQuestion,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800",
    glowColor: "from-blue-500/20 to-indigo-500/0",
    primaryBtnText: "Back to Dashboard",
  },
  "access-denied": {
    code: "403",
    badge: "Access Restricted",
    defaultTitle: "Restricted Operations Area",
    defaultSubtitle: "Your current account role does not have authorization for this section.",
    defaultDescription:
      "This module requires higher administrative or different departmental privileges. If you believe this is in error, contact your system administrator.",
    icon: ShieldAlert,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800",
    glowColor: "from-amber-500/20 to-orange-500/0",
    primaryBtnText: "Back to My Dashboard",
  },
  error: {
    code: "500",
    badge: "System Anomaly",
    defaultTitle: "Unexpected Application Error",
    defaultSubtitle: "A runtime exception occurred while processing this operation.",
    defaultDescription:
      "Our system has caught the issue and prevented a crash. Try refreshing the page or navigating back to your dashboard.",
    icon: AlertTriangle,
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800",
    glowColor: "from-red-500/20 to-rose-500/0",
    primaryBtnText: "Reload Dashboard",
  },
  "coming-soon": {
    code: "SOON",
    badge: "Under Active Development",
    defaultTitle: "New Feature in Pipeline",
    defaultSubtitle: "We are engineering this operational capability for an upcoming release.",
    defaultDescription:
      "This module is part of the HME Component Intelligence roadmap. Fleet metrics and advanced toolsets will be available soon.",
    icon: Rocket,
    iconColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800",
    glowColor: "from-indigo-500/20 to-purple-500/0",
    primaryBtnText: "Return to Operations",
  },
  maintenance: {
    code: "503",
    badge: "Scheduled Maintenance",
    defaultTitle: "System Calibration in Progress",
    defaultSubtitle: "We are performing routine upgrades on the intelligence database.",
    defaultDescription:
      "Services will resume shortly. All your equipment logs and telemetry data remain safely stored and secured.",
    icon: Wrench,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/50 dark:border-cyan-800",
    glowColor: "from-cyan-500/20 to-blue-500/0",
    primaryBtnText: "Check Dashboard Status",
  },
};

export default function AppStatusPage({
  type,
  title,
  subtitle,
  description,
  errorCode,
  errorMessage,
  onRetry,
  showHomeButton = true,
  showBackButton = true,
  customAction,
}: AppStatusPageProps) {
  const navigate = useNavigate();
  const config = STATUS_CONFIGS[type] || STATUS_CONFIGS["not-found"];
  const Icon = config.icon;

  // Resolve user role & destination dashboard path
  const dashboardPath = useMemo(() => {
    try {
      const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
      if (!token) return "/signin";

      const storedUser = StorageService.get<any>(STORAGE_KEYS.USER) || {};
      const role =
        storedUser?.role ||
        storedUser?.role_name ||
        StorageService.get<string>(STORAGE_KEYS.ROLE);

      return getDashboardPathForRole(role);
    } catch {
      return "/signin";
    }
  }, []);

  const displayCode = errorCode || config.code;
  const displayTitle = title || config.defaultTitle;
  const displaySubtitle = subtitle || config.defaultSubtitle;
  const displayDescription = description || config.defaultDescription;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(dashboardPath);
    }
  };

  return (
    <>
      <PageMeta
        title={`${config.badge} | HME Intelligence`}
        description={displaySubtitle}
      />

      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 font-sans dark:bg-[#080d1a] sm:px-6 lg:px-8">
        {/* Ambient Gradient Backdrop */}
        <div
          className={`pointer-events-none absolute -top-40 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-gradient-to-b ${config.glowColor} blur-[120px]`}
        />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/5 blur-[100px]" />

        {/* Decorative subtle grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:28px_28px]" />

        <div className="relative z-10 mx-auto w-full max-w-xl text-center">
          {/* Top Pill / Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>HME Intelligence System</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {displayCode}
            </span>
          </div>

          {/* Central Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/90 sm:p-10">
            {/* Status Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border shadow-inner transition-transform hover:scale-105 sm:h-24 sm:w-24">
              <div
                className={`flex h-full w-full items-center justify-center rounded-2xl border ${config.iconBg}`}
              >
                <Icon className={`h-10 w-10 sm:h-12 sm:w-12 ${config.iconColor}`} />
              </div>
            </div>

            {/* Typography */}
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {displayTitle}
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:text-base">
              {displaySubtitle}
            </p>

            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
              {displayDescription}
            </p>

            {/* Error Message Box (if provided) */}
            {errorMessage && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50/70 p-3 text-left dark:border-red-900/50 dark:bg-red-950/30">
                <p className="font-mono text-xs text-red-700 dark:text-red-400">
                  <span className="font-bold">Error Info:</span> {errorMessage}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              {showBackButton && (
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Go Back</span>
                </button>
              )}

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry Action</span>
                </button>
              )}

              {showHomeButton && (
                <Link
                  to={dashboardPath}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                >
                  <Home className="h-4 w-4" />
                  <span>{config.primaryBtnText}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}

              {customAction}
            </div>
          </div>

          {/* Footer Branding / Quick Links */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span>HME Component Intelligence</span>
            <span>·</span>
            <Link
              to={dashboardPath}
              className="transition hover:text-slate-600 dark:hover:text-slate-300"
            >
              Operations Center
            </Link>
            <span>·</span>
            <span className="font-mono">v2.4.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
