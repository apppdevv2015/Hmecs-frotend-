import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { sidebarConfig } from "../config/sidebar.config";
import type { UserRole, NavLinkItem } from "../config/sidebar.config";
import { X, ChevronRight, LogOut } from "lucide-react";
import StorageService, { STORAGE_KEYS } from "../services/storage.service";

import logo1 from "../assets/images/landingpageimages/logo1.webp";

type AppSidebarProps = {
  role?: UserRole;
};

const COMING_SOON_ROUTE = "/coming-soon";

const getStoredUserInfo = () => {
  try {
    const user = StorageService.get<any>(STORAGE_KEYS.USER) || {};
    const name =
      user?.name ||
      `${user?.firstName || user?.first_name || ""} ${user?.lastName || user?.last_name || ""}`.trim() ||
      StorageService.get<string>(STORAGE_KEYS.NAME) ||
      StorageService.get<string>(STORAGE_KEYS.USER_NAME) ||
      "";

    const email =
      user?.email ||
      StorageService.get<string>(STORAGE_KEYS.EMAIL) ||
      "";

    const initials = name
      ? name
          .split(" ")
          .filter(Boolean)
          .map((part: string) => part[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "";

    return { name, email, initials };
  } catch {
    return { name: "", email: "", initials: "" };
  }
};

export default function AppSidebar({ role = "super_admin" }: AppSidebarProps) {
  const location = useLocation();

  const activeRoleKey = (role && sidebarConfig[role]) ? role : "super_admin";
  const sidebarData = sidebarConfig[activeRoleKey] || sidebarConfig.super_admin;
  const dashboardItem = sidebarData?.dashboardItem;
  const navGroups = sidebarData?.navGroups || [];
  const profile = sidebarData?.profile;

  const isSuperAdmin = role === "super_admin";

  const storedUserInfo = getStoredUserInfo();
  const displayTitle = storedUserInfo.name || profile?.title || "User";
  const profileEmail =
    storedUserInfo.email ||
    profile?.email ||
    profile?.subtitle ||
    "admin@gmail.com";
  const displayShortName =
    storedUserInfo.initials || profile?.shortName || "US";

  const mainGroups = isSuperAdmin
    ? navGroups
    : navGroups.filter((group) => group.title !== "Settings");

  const settingsGroup = isSuperAdmin
    ? null
    : navGroups.find((group) => group.title === "Settings");

  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    [
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.ROLE,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.SELECTED_PLAN,
      STORAGE_KEYS.EMAIL,
      STORAGE_KEYS.NAME,
      STORAGE_KEYS.COMPANY_ID,
    ].forEach((key) => StorageService.remove(key));

    StorageService.sessionRemove("login-toast-shown");

    navigate("/signin", {
      replace: true,
    });
  };

  const {
    isMobileOpen,
    isExpanded,
    isHovered,
    toggleMobileSidebar,
    setIsHovered,
  } = useSidebar();

  const isDesktopOpen = isExpanded || isHovered;
  const showText = isMobileOpen || isDesktopOpen;

  const closeSidebar = () => {
    if (isMobileOpen) toggleMobileSidebar();
  };

  const toggleGroup = (title: string) => {
    setOpenGroup((prev) => (prev === title ? null : title));
  };

  const toggleSubMenu = (name: string) => {
    setOpenSubMenu((prev) => (prev === name ? null : name));
  };

  function normalizeRole(role?: string | null) {
    return String(role || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  }

  const getProfilePath = () => {
    const userData = StorageService.get<any>(STORAGE_KEYS.USER) || {};

    const role = normalizeRole(
      userData?.role ||
        userData?.role_name ||
        StorageService.get(STORAGE_KEYS.ROLE) ||
        "",
    );
    if (role === "super_admin" || role === "superadmin") {
      return "/super-admin/profile";
    }
    if (role === "company_admin" || role === "admin") {
      return "/company-admin/profile";
    }

    if (role === "artisans") {
      return "/artisans/profile";
    }

    if (role === "supervisor") {
      return "/supervisor/profile";
    }

    if (role === "operator" || role === "planner") {
      return "/operator/profile";
    }

    return "/signin";
  };

  const handleProfileClick = () => {
    navigate(getProfilePath());
  };

  const getItemPath = (item: NavLinkItem) => {
    if (item.isComingSoon) return COMING_SOON_ROUTE;

    if (!item.path || item.path.trim() === "" || item.path === "#") {
      return COMING_SOON_ROUTE;
    }

    return item.path;
  };

  const isValidRouteItem = (item: NavLinkItem) => {
    return Boolean(item.path && item.path.trim() !== "" && item.path !== "#");
  };

  const isItemActive = (item: NavLinkItem) => {
    const itemPath = getItemPath(item);

    if (item.children?.length) {
      return item.children.some((child) => {
        const childPath = getItemPath(child);

        if (child.isComingSoon || !isValidRouteItem(child)) {
          return location.pathname === COMING_SOON_ROUTE;
        }

        return location.pathname === childPath;
      });
    }

    if (item.isComingSoon || !isValidRouteItem(item)) {
      return location.pathname === COMING_SOON_ROUTE;
    }

    return location.pathname === itemPath;
  };

  const renderLink = (item: NavLinkItem, isChild = false) => {
    const isActive = isItemActive(item);

    const isComingSoonItem =
      item.isComingSoon ||
      !item.path ||
      item.path.trim() === "" ||
      item.path === "#";

    if (item.children && !item.isComingSoon) {
      const isOpen = openSubMenu === item.name;

      return (
        <div key={item.name}>
          <button
            type="button"
            onClick={() => toggleSubMenu(item.name)}
            className={`group flex w-full items-center justify-between rounded-lg px-4 py-3 text-[14px] font-semibold leading-5 transition-all duration-200 ${
              isActive
                ? "bg-blue-500/25 text-white shadow-sm ring-1 ring-blue-300/30 dark:bg-blue-600/35 dark:ring-blue-400/35"
                : "text-white/90 hover:bg-blue-500/15 hover:text-white dark:text-slate-200 dark:hover:bg-blue-600/20 dark:hover:text-white"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
                  isActive
                    ? "text-blue-100"
                    : "text-white/75 group-hover:text-white dark:text-slate-300 dark:group-hover:text-white"
                }`}
              >
                {item.icon}
              </span>

              {showText && (
                <span className="truncate tracking-[0.01em]">{item.name}</span>
              )}
            </span>

            {showText && (
              <span
                className={`shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-90 text-white" : "text-white/70"
                }`}
              >
                <ChevronRight size={16} />
              </span>
            )}
          </button>

          {isOpen && showText && (
            <div className="mt-1.5 space-y-1 pl-6">
              {item.children.map((child) => renderLink(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={getItemPath(item)}
        onClick={closeSidebar}
        className={`group relative flex items-center gap-3 rounded-lg px-4 py-3 text-[14px] font-semibold leading-5 transition-all duration-200 ${
          isChild ? "text-[13.5px]" : ""
        } ${
          isActive
            ? "bg-blue-500/25 text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] ring-1 ring-blue-300/30 dark:bg-blue-600/35 dark:ring-blue-400/35"
            : "text-white/90 hover:bg-blue-500/15 hover:text-white dark:text-slate-200 dark:hover:bg-blue-600/20 dark:hover:text-white"
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
            isActive
              ? "text-blue-100"
              : "text-white/75 group-hover:text-white dark:text-slate-300 dark:group-hover:text-white"
          }`}
        >
          {item.icon}
        </span>

        {showText && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate tracking-[0.01em]">{item.name}</span>

            {isComingSoonItem && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  isActive
                    ? "bg-blue-400/25 text-white"
                    : "bg-white/10 text-white/75"
                }`}
              >
                Soon
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-[55] bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 z-[60] flex h-screen flex-col border-r border-white/10 bg-[#3437e8] text-white shadow-[18px_0_40px_rgba(15,23,42,0.12)] transition-all duration-300 dark:border-white/5 dark:bg-[#0f1724] dark:text-white dark:shadow-black/30
          ${
            isMobileOpen
              ? "translate-x-0 w-[280px]"
              : "-translate-x-full w-[280px]"
          }
          ${isDesktopOpen ? "lg:w-[280px]" : "lg:w-[92px]"}
          lg:translate-x-0`}
      >
        <div className="shrink-0 flex items-center justify-center">
          <div
            className="
      flex items-center justify-center
      w-12 h-12
      sm:w-14 sm:h-14
      md:w-16 md:h-16
      lg:w-20 lg:h-20
      xl:w-24 xl:h-24
      shrink-0
    "
          >
            <img
              src={logo1}
              alt="HME Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <nav className="mt-7 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-1.5">{renderLink(dashboardItem)}</div>

          {mainGroups.map((group, index) => {
            const isOpen = openGroup === group.title;
            const hasTitle = group.title.trim() !== "";

            return (
              <div key={group.title || `group-${index}`} className="space-y-2">
                {hasTitle ? (
                  <>
                    {showText ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title)}
                        className="flex w-full items-center justify-between px-4 py-3 text-[15px] font-medium text-white/85 transition-all duration-300 hover:text-white"
                      >
                        <span>{group.title}</span>

                        <span
                          className={`transition-transform duration-200 ${
                            isOpen ? "rotate-90 text-white/90" : "text-white/70"
                          }`}
                        >
                          <ChevronRight size={15} />
                        </span>
                      </button>
                    ) : (
                      <div className="mx-auto h-px w-8 bg-white/10" />
                    )}

                    <div
                      className={`
                         overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                           ${
                             isOpen || !showText
                               ? "max-h-[500px] opacity-100 translate-y-0"
                               : "max-h-0 opacity-0 -translate-y-2"
                           }
                            `}
                    >
                      <div className="space-y-1.5 pt-1">
                        {group.items.map((item) => renderLink(item))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    {group.items.map((item) => renderLink(item))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 bg-transparent p-4">
          {settingsGroup && (
            <div className="mb-3 space-y-1.5">
              {settingsGroup.items.map((item) => renderLink(item))}
            </div>
          )}

          {showText ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-3">
              <button
                type="button"
                onClick={handleProfileClick}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/10"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-semibold text-white shadow-sm">
                  {displayShortName}

                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#3437e8] bg-emerald-500 dark:border-[#0f1724]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white">
                    {displayTitle}
                  </p>

                  <p className="truncate text-[12px] font-normal text-white/65">
                    {profileEmail}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-semibold text-white shadow-sm">
              {displayShortName}
            </div>
          )}
        </div>
      </aside>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                <LogOut className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Logout Confirmation
              </h3>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to logout from your account?
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
