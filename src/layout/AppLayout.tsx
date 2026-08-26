import React, { useEffect, useState, useRef, useCallback } from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, Link } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import type { UserRole } from "../config/sidebar.config";
import { userService } from "../services/Auth/userService";
import { AlertCircle, Rocket } from "lucide-react";
import AppToaster from "../components/common/AppToaster";
import offlineQueueService from "../services/offlineQueue.service";
import { toast } from "react-hot-toast";

type AppLayoutProps = {
  role?: UserRole;
};

const checkRealInternet = async (): Promise<boolean> => {
  try {
    const cacheBuster = `${Date.now()}-${crypto.randomUUID()}`;

    const res = await fetch(`/favicon.ico?cb=${cacheBuster}`, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
};

const LayoutContent: React.FC<AppLayoutProps> = ({ role = "super_admin" }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [hasActiveSub, setHasActiveSub] = useState(true);
  const [isOffline, setIsOffline] = useState(false); // Optimistic: assume online

  // Single source of truth for network state
  const networkStateRef = useRef(true);
  // Prevents overlapping heartbeat calls
  const checkingRef = useRef(false);
  // Tracks if initial check has run
  const initialCheckDoneRef = useRef(false);

  // ─── Core transition handler ─────────────────────────────────────────────
  // All online/offline transitions go through here to prevent duplicate toasts
  const handleWentOffline = useCallback(() => {
    if (!networkStateRef.current) return; // Already offline
    networkStateRef.current = false;
    setIsOffline(true);
    toast.error("⚠️ Internet connection lost. Working in offline mode.", {
      duration: 6000,
      id: "network-offline", // Prevents duplicate toasts
    });
  }, []);

  const handleWentOnline = useCallback(async () => {
    if (networkStateRef.current) return; // Already online
    networkStateRef.current = true;
    setIsOffline(false);
    toast.success("✅ Internet connection restored.", {
      duration: 4000,
      id: "network-online", // Prevents duplicate toasts
    });

    try {
      const pendingRequests = await offlineQueueService.getRequests();
      if (pendingRequests.length > 0) {
        await offlineQueueService.syncRequests();
        toast.success("✅ Offline changes synced successfully.", {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Offline sync failed:", error);
      toast.error("❌ Failed to sync offline changes.", { duration: 4000 });
    }
  }, []);

  // ─── Subscription check ──────────────────────────────────────────────────
  useEffect(() => {
    if (role !== "company_admin") return;
    const checkSub = async () => {
      try {
        const sub = await userService.getActiveSubscription();
        setHasActiveSub(Boolean(sub?.data || sub));
      } catch (error) {
        console.error("Subscription check failed:", error);
        setHasActiveSub(false);
      }
    };
    checkSub();
  }, [role]);

  // ─── Heartbeat — PRIMARY source of truth ─────────────────────────────────
  // Runs every 3s. This catches: ethernet unplug, WiFi cut, ISP down,
  // mobile data off — anything the browser events miss.
  useEffect(() => {
    const heartbeat = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;

      const isOnline = await checkRealInternet();

      if (!initialCheckDoneRef.current) {
        // First run — silently set initial state, no toast
        initialCheckDoneRef.current = true;
        networkStateRef.current = isOnline;
        setIsOffline(!isOnline);
        if (!isOnline) {
          toast.error("⚠️ Internet connection lost. Working in offline mode.", {
            duration: 6000,
            id: "network-offline",
          });
        }
        checkingRef.current = false;
        return;
      }

      if (isOnline) {
        await handleWentOnline();
      } else {
        handleWentOffline();
      }

      checkingRef.current = false;
    };

    // Run immediately, then every 3 seconds
    heartbeat();
    const interval = setInterval(heartbeat, 3000);
    return () => clearInterval(interval);
  }, [handleWentOffline, handleWentOnline]);

  // ─── Browser events — SECONDARY (instant UX, not reliable alone) ─────────
  // These fire instantly when OS detects network change — good for quick UX.
  // But they miss many real-world cases, so heartbeat is still primary.
  useEffect(() => {
    const handleOfflineEvent = () => {
      // Don't trust the event blindly — verify with a real fetch
      // But do an optimistic UI update for instant feedback
      handleWentOffline();
    };

    const handleOnlineEvent = async () => {
      // Browser says online — but verify before showing success toast
      // Wait a moment for connection to stabilize, then verify
      setTimeout(async () => {
        const actually = await checkRealInternet();
        if (actually) {
          await handleWentOnline();
        }
        // If not actually online, heartbeat will catch it
      }, 1000);
    };

    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("online", handleOnlineEvent);

    return () => {
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("online", handleOnlineEvent);
    };
  }, [handleWentOffline, handleWentOnline]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <AppSidebar role={role} />
      <Backdrop />

      <div
        className={`min-h-screen min-w-0 transition-all duration-300 ease-in-out ${
          isMobileOpen
            ? "ml-0"
            : isExpanded || isHovered
              ? "lg:ml-[280px]"
              : "lg:ml-[92px]"
        }`}
      >
        <AppHeader />

        {isOffline && (
          <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-300">
            ⚠ Offline Mode • Changes will sync automatically when internet is
            restored
          </div>
        )}

        <AppToaster />

        {!hasActiveSub && role === "company_admin" && (
          <div className="mx-4 mt-6 overflow-hidden rounded-[2rem] border border-blue-200 bg-blue-500 p-1 text-white shadow-lg shadow-blue-500/20 animate-in fade-in slide-in-from-top-4 duration-500 dark:border-blue-500/30 dark:bg-blue-600 md:mx-6">
            <div className="flex flex-col items-start justify-between gap-5 rounded-[1.7rem] bg-blue-600 px-6 py-5 dark:bg-blue-700 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">
                    Subscription Notice
                  </p>
                  <h4 className="mt-1 text-sm font-black uppercase tracking-widest text-white">
                    Read-Only Mode Active
                  </h4>
                  <p className="mt-1 text-xs font-semibold leading-5 text-blue-100">
                    Your subscription has expired. You can view data but cannot
                    make changes.
                  </p>
                </div>
              </div>

              <Link
                to="/plans"
                className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-lg shadow-blue-900/10 transition-all hover:bg-orange-50 hover:text-orange-600"
              >
                Upgrade Now
                <Rocket size={14} />
              </Link>
            </div>
          </div>
        )}

        <main className="w-full p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC<AppLayoutProps> = ({ role = "super_admin" }) => {
  return (
    <SidebarProvider>
      <LayoutContent role={role} />
    </SidebarProvider>
  );
};

export default AppLayout;
