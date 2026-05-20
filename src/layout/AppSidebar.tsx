import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { sidebarConfig } from "../config/sidebar.config";
import type { UserRole, NavLinkItem } from "../config/sidebar.config";
import { X, ChevronRight } from "lucide-react";

type AppSidebarProps = {
  role?: UserRole;
};

const COMING_SOON_ROUTE = "/coming-soon";

const getStoredUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.email || "";
  } catch {
    return "";
  }
};

export default function AppSidebar({ role = "super_admin" }: AppSidebarProps) {
  const location = useLocation();

  const sidebarData = sidebarConfig[role];
  const dashboardItem = sidebarData.dashboardItem;
  const navGroups = sidebarData.navGroups;
  const profile = sidebarData.profile;

  const isSuperAdmin = role === "super_admin";

  const profileEmail =
    getStoredUserEmail() ||
    profile?.email ||
    profile?.subtitle ||
    "admin@gmail.com";

  const mainGroups = isSuperAdmin
    ? navGroups
    : navGroups.filter((group) => group.title !== "Settings");

  const settingsGroup = isSuperAdmin
    ? null
    : navGroups.find((group) => group.title === "Settings");

  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    if (isSuperAdmin) {
      const firstGroup = mainGroups.find((group) => group.title.trim() !== "");
      return firstGroup?.title || null;
    }

    return mainGroups[0]?.title || null;
  });

  const [openSubMenu, setOpenSubMenu] = useState<string | null>(
    role === "super_admin" ? "User Management" : null
  );

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
            className={`group flex w-full items-center justify-between rounded-2xl px-5 py-4 text-[14px] font-extrabold transition-all duration-200 ${
              isActive
                ? "bg-blue-50 text-blue-600 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            <span className="flex min-w-0 items-center gap-4">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                  isActive
                    ? "text-blue-500"
                    : "text-slate-500 group-hover:text-blue-500"
                }`}
              >
                {item.icon}
              </span>

              {showText && (
                <span className="truncate tracking-tight">{item.name}</span>
              )}
            </span>

            {showText && (
              <span
                className={`shrink-0 transition-transform ${
                  isOpen ? "rotate-90 text-blue-500" : "text-slate-400"
                }`}
              >
                <ChevronRight size={18} />
              </span>
            )}
          </button>

          {isOpen && showText && (
            <div className="mt-2 space-y-2 pl-7">
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
        className={`group relative flex items-center gap-4 rounded-2xl px-5 py-4 text-[14px] font-extrabold transition-all duration-200 ${
          isChild ? "text-[13px]" : ""
        } ${
          isActive
            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            : "text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
            isActive ? "text-white" : "text-slate-500 group-hover:text-blue-500"
          }`}
        >
          {item.icon}
        </span>

        {showText && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate tracking-tight">{item.name}</span>

            {isComingSoonItem && (
              <span
                className={`shrink-0 rounded-lg border px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] shadow-sm ${
                  isActive
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-blue-100 bg-blue-50 text-blue-500 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
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
          className="fixed inset-0 z-[55] bg-slate-900/20 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 z-[60] flex h-screen flex-col border-r border-blue-100 bg-white text-slate-900 shadow-xl shadow-blue-900/5 transition-all duration-300 dark:border-white/5 dark:bg-[#081A33] dark:text-white
          ${isMobileOpen ? "translate-x-0 w-[300px]" : "-translate-x-full w-[300px]"}
          ${isDesktopOpen ? "lg:w-[300px]" : "lg:w-[100px]"}
          lg:translate-x-0`}
      >
        <div className="flex h-28 shrink-0 items-center justify-between px-8">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-500/25">
              <span className="text-lg font-black text-white">H</span>
            </div>

            {showText && (
              <div className="flex flex-col">
                <span className="text-lg font-black leading-tight tracking-tighter text-blue-600 dark:text-white">
                  HME <span className="text-orange-400">INTEL</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Fleet Intelligence
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500 transition hover:bg-blue-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-10 overflow-y-auto overflow-x-hidden px-6 py-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <p
              className={`mb-5 px-5 text-[11px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-slate-400 ${
                !showText ? "text-center" : ""
              }`}
            >
              {showText ? "Main Overview" : "•••"}
            </p>

            <div className="space-y-2">{renderLink(dashboardItem)}</div>
          </div>

          {mainGroups.map((group, index) => {
            const isOpen = openGroup === group.title;
            const hasTitle = group.title.trim() !== "";

            return (
              <div key={group.title || `group-${index}`} className="space-y-4">
                {hasTitle ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.title)}
                      className={`flex w-full items-center justify-between px-5 text-[11px] font-black uppercase tracking-[0.25em] text-blue-600 transition-colors hover:text-blue-500 dark:text-slate-400 ${
                        !showText ? "justify-center" : ""
                      }`}
                    >
                      {showText ? group.title : "•••"}

                      {showText && (
                        <span
                          className={`transition-transform duration-200 ${
                            isOpen ? "rotate-90 text-blue-500" : "text-slate-400"
                          }`}
                        >
                          <ChevronRight size={18} />
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {group.items.map((item) => renderLink(item))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {group.items.map((item) => renderLink(item))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-4 border-t border-blue-100 p-5 dark:border-white/5">
          {settingsGroup && (
            <div className="space-y-1.5">
              {settingsGroup.items.map((item) => renderLink(item))}
            </div>
          )}

          {showText && (
            <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-[#F8FAFC] p-4 shadow-sm dark:border-white/5 dark:bg-white/5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-xs font-black text-white shadow-lg shadow-blue-500/25">
                {profile.shortName}
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 shadow-sm dark:border-[#081A33]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black uppercase tracking-tight text-blue-600 dark:text-white">
                  {profile.title}
                </p>

                <p className="truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {profileEmail}
                </p>
              </div>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-colors hover:text-blue-500 dark:bg-slate-800"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}