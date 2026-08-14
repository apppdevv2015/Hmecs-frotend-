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
  ListChecks,
  TruckIcon,
  RefreshCcw,
  UserCheck,
  AlertCircle,
  CheckSquare,
} from "lucide-react";

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "artisans"
  | "operator"
  | "supervisor"
  | "technical_support";

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

const sidebarIconClass = "h-[17px] w-[17px] stroke-[2] text-current";

const artisansIconClass = "h-5 w-5 stroke-[2.2] text-current";

const operatorIconClass = "h-5 w-5 stroke-[2.2] text-current";

const supervisorIconClass = "h-5 w-5 stroke-[2.2] text-current";

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
        title: "User Management",
        items: [
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
          {
            name: "Technical Support",
            path: "/super-admin/technical-support",
            icon: <UserCheck className={sidebarIconClass} />,
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
        ],
      },

      {
        title: "Asset Management",
        items: [
          {
            name: "Machines",
            path: "/super-admin/machines",
            icon: <Truck className={sidebarIconClass} />,
          },

          {
            name: "Fleet",
            path: "/super-admin/fleet",
            icon: <Truck className={sidebarIconClass} />,
          },

          {
            name: "Components",
            path: "/super-admin/components",
            icon: <Cpu className={sidebarIconClass} />,
          },
          {
            name: "Service Logs",
            path: "/super-admin/service-logs",
            icon: <FileClock className={sidebarIconClass} />,
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
            name: "Heat Map",
            path: "/company-admin/heatmap",
            icon: <Map className={sidebarIconClass} />,
          },
          {
            name: "Category Master",
            path: "/company-admin/categories",
            icon: <ListChecks className={sidebarIconClass} />,
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
            path: "/company-admin/reporting",
            icon: <FileBarChart className={sidebarIconClass} />,
          },
          {
            name: "Service Log",
            path: "/company-admin/service-log",
            icon: <FileText className={sidebarIconClass} />,
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

  artisans: {
    dashboardItem: {
      icon: <LayoutDashboard className={artisansIconClass} />,
      name: "Dashboard",
      path: "/artisans/dashboard",
    },

    navGroups: [
      {
        title: "Work Operations",
        items: [
          {
            name: "My Tasks",
            path: "/artisans/tasks",
            icon: <ClipboardCheck className={artisansIconClass} />,
          },

          {
            name: "Fleet Heat",
            path: "/artisans/fleet-heat",
            icon: <Map className={artisansIconClass} />,
          },
          {
            name: "Update Data",
            path: "/artisans/data-update",
            icon: <RefreshCcw className={artisansIconClass} />,
          },
          {
            name: "Report",
            path: "/artisans/machines",
            icon: <Truck className={artisansIconClass} />,
          },
        ],
      },

      {
        title: "Machine Monitoring",
        items: [
          {
            name: "Predictive Alerts",
            path: "/artisans/alerts",
            icon: <AlertTriangle className={artisansIconClass} />,
          },
          {
            name: "Maintenance",
            path: "/artisans/maintenance",
            icon: <Wrench className={artisansIconClass} />,
          },
          {
            name: "Service Logs",
            path: "/artisans/service-logs",
            icon: <FileClock className={artisansIconClass} />,
          },
        ],
      },

      {
        title: "Account",
        items: [
          {
            name: "Profile",
            path: "/artisans/profile",
            icon: <UserCog className={artisansIconClass} />,
          },
        ],
      },
    ],

    profile: {
      shortName: "AR",
      title: "Artisans",
      subtitle: "artisans@hme.com",
      email: "artisans@hme.com",
    },
  },

  operator: {
    dashboardItem: {
      icon: <LayoutDashboard className={operatorIconClass} />,
      name: "Dashboard",
      path: "/operator/dashboard",
    },

    navGroups: [
      {
        title: "Operations",
        items: [
          {
            name: "My Assigned Machines",
            path: "/operator/machines",
            icon: <Truck className={operatorIconClass} />,
          },
          {
            name: "Pre-Start Inspection",
            path: "/operator/pre-start-inspection",
            icon: <ClipboardCheck className={operatorIconClass} />,
          },
          {
            name: "Work Order Capture",
            path: "/operator/work-order-capture",
            icon: <ClipboardList className={operatorIconClass} />,
          },
          {
            name: "Active Task",
            path: "/operator/active-task",
            icon: <Activity className={operatorIconClass} />,
          },
          {
            name: "Shift Summary",
            path: "/operator/shift-summary",
            icon: <FileText className={operatorIconClass} />,
          },
        ],
      },
      {
        title: "Monitoring & Logs",
        items: [
          {
            name: "Issue Reports",
            path: "/operator/issue-reports",
            icon: <AlertCircle className={operatorIconClass} />,
          },
          {
            name: "Fleet",
            path: "/operator/fleet",
            icon: <Map className={operatorIconClass} />,
          },
          {
            name: "Update Data",
            path: "/operator/data-update",
            icon: <RefreshCcw className={operatorIconClass} />,
          },
          {
            name: "Components",
            path: "/operator/checklist",
            icon: <ListChecks className={operatorIconClass} />,
          },
          {
            name: "Alerts",
            path: "/operator/alerts",
            icon: <AlertTriangle className={operatorIconClass} />,
          },
          {
            name: "Service Logs",
            path: "/operator/service-logs",
            icon: <FileClock className={operatorIconClass} />,
          },
          {
            name: "Profile",
            path: "/operator/profile",
            icon: <UserCog className={operatorIconClass} />,
          },
        ],
      },
    ],

    profile: {
      shortName: "OP",
      title: "Operator",
      subtitle: "operator@hme.com",
      email: "operator@hme.com",
    },
  },

  supervisor: {
    dashboardItem: {
      icon: <LayoutDashboard className={supervisorIconClass} />,
      name: "Dashboard",
      path: "/supervisor/dashboard",
    },

    navGroups: [
      {
        title: "Overview",
        items: [
          {
            name: "Machines",
            path: "/supervisor/machines",
            icon: <Truck className={supervisorIconClass} />,
          },
          {
            name: "Components",
            path: "/supervisor/components",
            icon: <Cpu className={supervisorIconClass} />,
          },
          {
            name: "Operators",
            path: "/supervisor/operators",
            icon: <UsersRound className={supervisorIconClass} />,
          },
          {
            name: "Task Review",
            path: "/supervisor/task-review",
            icon: <CheckSquare className={supervisorIconClass} />,
          },
          {
            name: "Supervisor Services",
            path: "/supervisor/services",
            icon: <ClipboardList className={supervisorIconClass} />,
          },
          {
            name: "Assigned Artisans",
            path: "/supervisor/assigned-artisans",
            icon: <UserCheck className={supervisorIconClass} />,
          },
          {
            name: "Assigned Operators",
            path: "/supervisor/tasks",
            icon: <ClipboardCheck className={supervisorIconClass} />,
          },
          {
            name: "Fleet Health",
            path: "/supervisor/fleet",
            icon: <Activity className={supervisorIconClass} />,
          },
          {
            name: "Service Logs",
            path: "/supervisor/service-log",
            icon: <FileClock className={operatorIconClass} />,
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            name: "Profile",
            path: "/supervisor/profile",
            icon: <UserCog className={supervisorIconClass} />,
          },
        ],
      },
    ],

    profile: {
      shortName: "SV",
      title: "Supervisor",
      subtitle: "supervisor@hme.com",
      email: "supervisor@hme.com",
    },
  },

  technical_support: {
    dashboardItem: {
      icon: <LayoutDashboard className={sidebarIconClass} />,
      name: "Dashboard",
      path: "/support/dashboard",
    },

    navGroups: [
      {
        title: "Ticket Management",
        items: [
          {
            name: "All Tickets",
            path: "/support/tickets",
            icon: <FileWarning className={sidebarIconClass} />,
          },
          {
            name: "My Assigned",
            path: "/support/tickets?assigned=me",
            icon: <UserCheck className={sidebarIconClass} />,
          },
          {
            name: "Open",
            path: "/support/tickets?status=Open",
            icon: <AlertTriangle className={sidebarIconClass} />,
          },
          {
            name: "In Progress",
            path: "/support/tickets?status=In%20Progress",
            icon: <Activity className={sidebarIconClass} />,
          },
          {
            name: "Waiting",
            path: "/support/tickets?status=Waiting%20for%20Customer",
            icon: <FileClock className={sidebarIconClass} />,
          },
          {
            name: "Resolved",
            path: "/support/tickets?status=Resolved",
            icon: <BadgeCheck className={sidebarIconClass} />,
          },
          {
            name: "Closed",
            path: "/support/tickets?status=Closed",
            icon: <ClipboardCheck className={sidebarIconClass} />,
          },
        ],
      },
      {
        title: "Analytics & System",
        items: [
          {
            name: "Reports",
            path: "/support/reports",
            icon: <FileBarChart className={sidebarIconClass} />,
          },
          {
            name: "Activity Logs",
            path: "/support/activity",
            icon: <FileClock className={sidebarIconClass} />,
          },
          {
            name: "Notifications",
            path: "/support/notifications",
            icon: <FileText className={sidebarIconClass} />,
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            name: "Profile",
            path: "/support/profile",
            icon: <UserCog className={sidebarIconClass} />,
          },
        ],
      },
    ],

    profile: {
      shortName: "TS",
      title: "Technical Support",
      subtitle: "support@hme.com",
      email: "support@hme.com",
    },
  },
};
