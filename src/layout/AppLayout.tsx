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

const isBrowserOnline = (): boolean =>
  typeof navigator === "undefined" ? true : navigator.onLine;

const LayoutContent: React.FC<AppLayoutProps> = ({ role = "super_admin" }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [hasActiveSub, setHasActiveSub] = useState(true);

  const [isOffline, setIsOffline] = useState(() => !isBrowserOnline());

  // Single source of truth for network state (prevents duplicate toasts/syncs)
  const networkStateRef = useRef(isBrowserOnline());
  // Prevents two syncs from running at the same time (avoids duplicate requests)
  const isSyncingRef = useRef(false);

  // ─── Sync pending offline requests ───────────────────────────────────────
  const syncPendingRequests = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const pendingRequests = await offlineQueueService.getRequests();
      if (pendingRequests.length === 0) return;

      await offlineQueueService.syncRequests();
      toast.success("✅ Offline changes synced successfully.", {
        duration: 4000,
      });
    } catch (error) {
      console.error("Offline sync failed:", error);
      toast.error("❌ Failed to sync offline changes.", { duration: 4000 });
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // ─── Online / offline transition handlers ────────────────────────────────
  const handleWentOffline = useCallback(() => {
    if (!networkStateRef.current) return; // Already offline
    networkStateRef.current = false;
    setIsOffline(true);
    toast.error("⚠️ Internet connection lost. Working in offline mode.", {
      duration: 6000,
      id: "network-offline",
    });
  }, []);

  const handleWentOnline = useCallback(() => {
    if (networkStateRef.current) return; // Already online
    networkStateRef.current = true;
    setIsOffline(false);
    toast.dismiss("network-offline");
    toast.success("✅ Internet connection restored.", {
      duration: 4000,
      id: "network-online",
    });
    void syncPendingRequests();
  }, [syncPendingRequests]);

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

  // ─── Network detection: browser online/offline events ────────────────────
  useEffect(() => {
    window.addEventListener("offline", handleWentOffline);
    window.addEventListener("online", handleWentOnline);

    if (isBrowserOnline()) {
      // Page load: send any changes that were queued in an earlier session
      void syncPendingRequests();
    } else {
      toast.error("⚠️ Internet connection lost. Working in offline mode.", {
        duration: 6000,
        id: "network-offline",
      });
    }

    return () => {
      window.removeEventListener("offline", handleWentOffline);
      window.removeEventListener("online", handleWentOnline);
    };
  }, [handleWentOffline, handleWentOnline, syncPendingRequests]);

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