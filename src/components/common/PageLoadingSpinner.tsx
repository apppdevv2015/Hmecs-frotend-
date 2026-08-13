import React from "react";
import { Loader2 } from "lucide-react";

export interface PageLoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export default function PageLoadingSpinner({
  message = "Loading Fleet Workspace...",
  subMessage = "Synchronizing live component intelligence and operational records.",
  fullScreen = true,
}: PageLoadingSpinnerProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-50/90 dark:bg-[#080d1a]/95 backdrop-blur-md"
    : "flex min-h-[380px] w-full flex-col items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated Brand Logo / Spinner */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          {/* Outer Pulse Ring */}
          <div className="absolute inset-0 animate-ping rounded-2xl bg-blue-600/15 opacity-75 duration-1000" />
          
          {/* Main Container */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-xl dark:border-blue-800/80 dark:bg-slate-900">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-sm font-bold text-slate-800 dark:text-white sm:text-base">
          {message}
        </h3>

        {subMessage && (
          <p className="mt-1.5 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            {subMessage}
          </p>
        )}

        {/* Loading Progress Bar */}
        <div className="mt-4 h-1 w-44 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full w-full origin-left animate-pulse bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400" />
        </div>
      </div>
    </div>
  );
}
