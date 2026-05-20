import React from "react";

import {
  LayoutDashboard,
  ClipboardCheck,
  Truck,
  AlertTriangle,
  Wrench,
  Gauge,
  FileClock,
  UserCog,
  UsersRound,
  PackageSearch,
  ClipboardList,
  Map,
  FileBarChart,
  CreditCard,
  Settings,
  ShieldCheck,
  Users,
  UserRoundCog,
  BadgeCheck,
  Cpu,
  Activity,
  FileWarning,
  FileText,
  Building2,
  UserRound,
} from "lucide-react";

export type UserRole = "super_admin" | "company_admin" | "engineer";

export type NavLinkItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavLinkItem[];
  isComingSoon?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavLinkItem[];
};

export type SidebarProfile = {
  shortName: string;
  title: string;
  subtitle: string;
  email: string;
};

const sidebarIconClass =
  "h-[17px] w-[17px] stroke-[2] text-black dark:text-white";

const engineerIconClass =
  "h-5 w-5 stroke-[2.2] text-black dark:text-white";

export const sidebarConfig: Record<
  UserRole,
  {
    dashboardItem: NavLinkItem;
    navGroups: NavGroup[];
    profile: SidebarProfile;
  }
> = {
  super_admin: {
    dashboardItem: {
      icon: <LayoutDashboard className={sidebarIconClass} />,
      name: "Dashboard",
      path: "/super-admin/dashboard",
    },

    navGroups: [
      {
        title: "Admin Management",
        items: [
          {
            name: "User Management",
            icon: <ShieldCheck className={sidebarIconClass} />,
            children: [
              {
                name: "Users",
                path: "/admin-management/users",
                icon: <Users className={sidebarIconClass} />,
              },
              {
                name: "Roles",
                path: "/admin-management/roles",
                icon: <UserRoundCog className={sidebarIconClass} />,
              },
              {
                name: "Plans",
                path: "/admin-management/plans",
                icon: <BadgeCheck className={sidebarIconClass} />,
              },
            ],
          },
        ],
      },

      {
        title: "Company Management",
        items: [
          {
            name: "Company Admins",
            path: "/super-admin/company-admins",
            icon: <Building2 className={sidebarIconClass} />,
          },
          {
            name: "Operators",
            path: "/super-admin/operators",
            icon: <UsersRound className={sidebarIconClass} />,
          },
          {
            name: "Mechanics",
            path: "/super-admin/mechanics",
            icon: <UserRound className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Asset Management",
        items: [
          {
            name: "Machines",
            path: "/super-admin/machines",
            icon: <Truck className={sidebarIconClass} />,
            isComingSoon: true,
          },
          {
            name: "Components",
            path: "/super-admin/components",
            icon: <Cpu className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Monitoring",
        items: [
          {
            name: "Machine Health",
            path: "/super-admin/machine-health",
            icon: <Activity className={sidebarIconClass} />,
            isComingSoon: true,
          },
          {
            name: "Alerts & Logs",
            path: "/super-admin/alerts",
            icon: <FileWarning className={sidebarIconClass} />,
            isComingSoon: true,
          },
          {
            name: "Reports",
            path: "/super-admin/reports",
            icon: <FileText className={sidebarIconClass} />,
            isComingSoon: true,
          },
        ],
      },

      {
        title: "Settings",
        items: [
          {
            name: "Plans & Billing",
            path: "/super-admin/plans-billing",
            icon: <CreditCard className={sidebarIconClass} />,
          },
          {
            name: "System Settings",
            path: "/super-admin/settings",
            icon: <Settings className={sidebarIconClass} />,
            isComingSoon: true,
          },
        ],
      },
    ],

    profile: {
      shortName: "SA",
      title: "Super Admin",
      subtitle: "superadmin@hme.com",
      email: "superadmin@hme.com",
    },
  },

  company_admin: {
    dashboardItem: {
      icon: <LayoutDashboard className={sidebarIconClass} />,
      name: "Dashboard",
      path: "/company-admin/dashboard",
    },

    navGroups: [
      {
        title: "Company",
        items: [
          {
            name: "Staff",
            path: "/company-admin/staff",
            icon: <UsersRound className={sidebarIconClass} />,
          },
          {
            name: "Machines",
            path: "/company-admin/machines",
            icon: <Truck className={sidebarIconClass} />,
          },
          {
            name: "Components",
            path: "/company-admin/register",
            icon: <PackageSearch className={sidebarIconClass} />,
          },
          {
            name: "Maintenance",
            path: "/company-admin/maintenance",
            icon: <ClipboardList className={sidebarIconClass} />,
          },
          {
            name: "Heat Map",
            path: "/company-admin/heatmap",
            icon: <Map className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Monitoring",
        items: [
          {
            name: "Alerts",
            path: "/company-admin/alerts",
            icon: <AlertTriangle className={sidebarIconClass} />,
          },
          {
            name: "Reports",
            path: "/company-admin/coming-soon/reports",
            icon: <FileBarChart className={sidebarIconClass} />,
            isComingSoon: true,
          },
        ],
      },

      {
        title: "Account",
        items: [
          {
            name: "Subscriptions",
            path: "/company-admin/subscriptions",
            icon: <CreditCard className={sidebarIconClass} />,
          },
          {
            name: "Settings",
            path: "/company-admin/coming-soon/settings",
            icon: <Settings className={sidebarIconClass} />,
            isComingSoon: true,
          },
        ],
      },
    ],

    profile: {
      shortName: "CA",
      title: "Company Admin",
      subtitle: "companyadmin@hme.com",
      email: "companyadmin@hme.com",
    },
  },

  engineer: {
    dashboardItem: {
      icon: <LayoutDashboard className={engineerIconClass} />,
      name: "Dashboard",
      path: "/engineer/dashboard",
    },

    navGroups: [
      {
        title: "Work Operations",
        items: [
          {
            name: "My Tasks",
            path: "/engineer/tasks",
            icon: <ClipboardCheck className={engineerIconClass} />,
          },
          {
            name: "Assigned Machines",
            path: "/engineer/machines",
            icon: <Truck className={engineerIconClass} />,
          },
        ],
      },

      {
        title: "Machine Monitoring",
        items: [
          {
            name: "Component Health",
            path: "/engineer/components",
            icon: <Gauge className={engineerIconClass} />,
          },
          {
            name: "Predictive Alerts",
            path: "/engineer/alerts",
            icon: <AlertTriangle className={engineerIconClass} />,
          },
        ],
      },

      {
        title: "Maintenance Records",
        items: [
          {
            name: "Maintenance",
            path: "/engineer/maintenance",
            icon: <Wrench className={engineerIconClass} />,
          },
          {
            name: "Service Logs",
            path: "/engineer/service-logs",
            icon: <FileClock className={engineerIconClass} />,
          },
        ],
      },

      {
        title: "Account",
        items: [
          {
            name: "Profile",
            path: "/engineer/profile",
            icon: <UserCog className={engineerIconClass} />,
          },
        ],
      },
    ],

    profile: {
      shortName: "EN",
      title: "Engineer",
      subtitle: "engineer@hme.com",
      email: "engineer@hme.com",
    },
  },
};