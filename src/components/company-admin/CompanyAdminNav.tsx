import React from "react";
import { Link, useLocation } from "react-router";

import {
  LayoutDashboard as Dashboard,
  ClipboardList as Register,
  Activity as Log,
  Map as HeatMap,
  PlusCircle,
  AlertCircle,
} from "lucide-react";

export const CompanyAdminNav: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      name: "Dashboard",
      path: "/company-admin/dashboard",
      icon: <Dashboard size={18} />,
    },
    {
      name: "Component Register",
      path: "/company-admin/register",
      icon: <Register size={18} />,
    },
    {
      name: "Maintenance Log",
      path: "/company-admin/maintenance",
      icon: <Log size={18} />,
    },
    {
      name: "Fleet Heat Map",
      path: "/company-admin/heatmap",
      icon: <HeatMap size={18} />,
    },
    {
      name: "Alerts & Logs",
      path: "/company-admin/alerts",
      icon: <AlertCircle size={18} />,
    },
  ];

  const getNavClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-[2rem] px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
      isActive
        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
        : "text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
    }`;

  return (
    <div className="mb-8 w-full rounded-[2.5rem] border border-blue-100 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-[#0F172A]">
      <div className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={getNavClass(isActive)}
            >
              <span
                className={
                  isActive
                    ? "text-white"
                    : "text-blue-500 dark:text-blue-400"
                }
              >
                {item.icon}
              </span>

              {item.name}
            </Link>
          );
        })}

        <Link
          to="/company-admin/add-component"
          className={`flex items-center gap-3 rounded-[2rem] px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
            currentPath === "/company-admin/add-component"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "border border-orange-100 bg-orange-50 text-orange-500 hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20"
          }`}
        >
          <PlusCircle size={18} />
          Add Component
        </Link>
      </div>
    </div>
  );
};