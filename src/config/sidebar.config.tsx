import React from "react";
import {
  LayoutDashboard,
  Layers,
  Receipt,
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
  CheckCircle,
  PackagePlus,
  User,
  FileSignature,

  // Limited Company Admin
  UserCircle,
  MessageSquare,
  FolderOpen,
} from "lucide-react";

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "artisans"
  | "operator"
  | "supervisor"
  | "technical_support"
  | "engineers"; 

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

const engineersIconClass = "h-5 w-5 stroke-[2.2] text-current";

const companyAdminNavGroups: NavGroup[] = [
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
        path: "/company-admin/components",
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
      {
        name: "Machine Health",
        path: "/company-admin/inspection-entry",
        icon: <ClipboardCheck className={sidebarIconClass} />,
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
    title: "Commercial",
    items: [
      {
        name: "Quotation",
        path: "/company-admin/quotation",
        icon: <FileText className={sidebarIconClass} />,
      },
      {
        name: "Contract",
        path: "/company-admin/contracts",
        icon: <FileSignature className={sidebarIconClass} />,
      },
      {
        name: "Invoices",
        path: "/company-admin/invoices",
        icon: <Receipt className={sidebarIconClass} />,
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
];

const engineerNavGroups: NavGroup[] = companyAdminNavGroups.map((group) => ({
  ...group,
  items: group.items.map((item) => ({
    ...item,
    path: item.path?.replace(/^\/company-admin\//, "/engineers/"),
  })),
}));

export const sidebarConfig: Record<
  UserRole,
  {
    dashboardItem: NavLinkItem;
    navGroups: NavGroup[];
    limitedNavGroups?: NavGroup[];
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
        title: "Quotation",
        items: [
          {
            name: "Quotation",
            path: "/super-admin/quotation",
            icon: <FileText className={sidebarIconClass} />,
          },
          {
            name: "Quotation Plans",
            path: "/super-admin/quotation-plans",
            icon: <Layers className={sidebarIconClass} />,
          },
          {
            name: "Contract",
            path: "/super-admin/contracts",
            icon: <FileSignature className={sidebarIconClass} />,
          },
          {
            name: "Access Management",
            path: "/super-admin/access-management",
            icon: <FileSignature className={sidebarIconClass} />,
          },
          {
            name: "Invoices",
            path: "/super-admin/invoices",
            icon: <Receipt className={sidebarIconClass} />,
          },
        ],
      },
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
            name: "Machine Health",
            path: "/super-admin/machine-health",
            icon: <Activity className={sidebarIconClass} />,
          },

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
        ],
      }, {
        title: "Optional Service",
        items: [
          {
            name: "Optional Service",
            path: "/super-admin/optional-services",
            icon: <PackagePlus className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Settings",
        items: [
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
    // --------------------------------------------------
    // Dashboard
    // --------------------------------------------------
    dashboardItem: {
      icon: <LayoutDashboard className={sidebarIconClass} />,
      name: "Dashboard",
      path: "/company-admin/dashboard",
    },

    // --------------------------------------------------
    // FULL ACCESS
    // Shown when Company Admin isActive === true
    // --------------------------------------------------
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
            path: "/company-admin/components",
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
          {
            name: "Machine Health",
            path: "/company-admin/inspection-entry",
            icon: <ClipboardCheck className={sidebarIconClass} />,
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
            isComingSoon: true,
          },
          {
            name: "Service Log",
            path: "/company-admin/service-log",
            icon: <FileText className={sidebarIconClass} />,
          },
        ],
      },

      // --------------------------------------------------
      // COMMERCIAL
      // --------------------------------------------------
      {
        title: "Commercial",
        items: [
          {
            name: "Quotation",
            path: "/company-admin/quotation",
            icon: <FileText className={sidebarIconClass} />,
          },
          {
            name: "Contract",
            path: "/company-admin/contracts",
            icon: <FileSignature className={sidebarIconClass} />,
          },
          {
            name: "Invoices",
            path: "/company-admin/invoices",
            icon: <Receipt className={sidebarIconClass} />,
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

    // --------------------------------------------------
    // LIMITED ACCESS
    // Shown when Company Admin isActive === false
    // --------------------------------------------------
    limitedNavGroups: [
      {
        title: "Company",
        items: [
          {
            name: "Company Profile",
            path: "/company-admin/profile",
            icon: <User className={sidebarIconClass} />,
          },
        ],
      },

      // --------------------------------------------------
      // COMMERCIAL
      // --------------------------------------------------
      {
        title: "Commercial",
        items: [
          {
            name: "Quotation",
            path: "/company-admin/quotation",
            icon: <FileText className={sidebarIconClass} />,
          },
          {
            name: "Contract",
            path: "/company-admin/contracts",
            icon: <FileSignature className={sidebarIconClass} />,
          },
          {
            name: "Invoices",
            path: "/company-admin/invoices",
            icon: <Receipt className={sidebarIconClass} />,
          },
        ],
      },
    ],

    // --------------------------------------------------
    // PROFILE
    // --------------------------------------------------
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
            name: "Pre-Start Inspection",
            path: "/artisans/pre-start-inspection",
            icon: <ClipboardCheck className={artisansIconClass} />,
          },
          {
            name: "Work Order Capture",
            path: "/artisans/work-order-capture",
            icon: <ClipboardList className={artisansIconClass} />,
          },

          {
            name: "Fleet Heat",
            path: "/artisans/fleet-heat",
            icon: <Map className={artisansIconClass} />,
          },
          {
            name: "Report",
            path: "/artisans/machines",
            icon: <Truck className={artisansIconClass} />,
            isComingSoon: true,
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
            isComingSoon: true,
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
            name: "Machines",
            path: "/operator/machines",
            icon: <Truck className={operatorIconClass} />,
          },

          {
            name: "Assigned Machines",
            path: "/operator/assigned-machines",
            icon: <Truck className={operatorIconClass} />,
          },

          {
            name: "Pre-Start Inspection",
            path: "/operator/pre-start-inspection",
            icon: <ClipboardCheck className={operatorIconClass} />,
          },
          {
            name: "Fleet",
            path: "/operator/fleet",
            icon: <Map className={operatorIconClass} />,
          },
          {
            name: "Work Order Capture",
            path: "/operator/work-order-capture",
            icon: <ClipboardList className={operatorIconClass} />,
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
            name: "Alerts",
            path: "/operator/alerts",
            icon: <AlertTriangle className={operatorIconClass} />,
            isComingSoon: true,
          },
          {
            name: "Active Task",
            path: "/operator/active-task",
            icon: <Activity className={operatorIconClass} />,
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


   // Engineer sidebar 

  
engineers: {
  dashboardItem: {
    icon: <LayoutDashboard className={engineersIconClass} />,
    name: "Dashboard",
    path: "/engineers/dashboard",
  },

  navGroups: [
    ...engineerNavGroups,
    {
      title: "Account",
      items: [
        {
          name: "Profile",
          path: "/engineers/profile",
          icon: <UserCog className={engineersIconClass} />,
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

  sub_admin: {
    dashboardItem: {
      icon: <LayoutDashboard className={sidebarIconClass} />,
      name: "Dashboard",
      path: "/sub-admin/dashboard",
    },

    navGroups: [
      {
        title: "Company",
        items: [
          {
            name: "Staff",
            path: "/sub-admin/staff",
            icon: <UsersRound className={sidebarIconClass} />,
          },
          {
            name: "Machines",
            path: "/sub-admin/machines",
            icon: <Truck className={sidebarIconClass} />,
          },
          {
            name: "Components",
            path: "/sub-admin/components",
            icon: <PackageSearch className={sidebarIconClass} />,
          },
          {
            name: "Heat Map",
            path: "/sub-admin/heatmap",
            icon: <Map className={sidebarIconClass} />,
          },
          {
            name: "Category Master",
            path: "/sub-admin/categories",
            icon: <ListChecks className={sidebarIconClass} />,
          },
          {
            name: "Machine Health",
            path: "/sub-admin/inspection-entry",
            icon: <ClipboardCheck className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Monitoring",
        items: [
          {
            name: "Alerts",
            path: "/sub-admin/alerts",
            icon: <AlertTriangle className={sidebarIconClass} />,
          },
          {
            name: "Reports",
            path: "/sub-admin/reporting",
            icon: <FileBarChart className={sidebarIconClass} />,
          },
          {
            name: "Service Log",
            path: "/sub-admin/service-log",
            icon: <FileText className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Account",
        items: [
          {
            name: "Billing",
            path: "/sub-admin/subscriptions",
            icon: <Receipt className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Settings",
        items: [
          {
            name: "Profile",
            path: "/sub-admin/profile",
            icon: <UserCog className={sidebarIconClass} />,
          },
        ],
      },
    ],

    profile: {
      shortName: "SA",
      title: "Sub Admin",
      subtitle: "admin@gmail.com",
      email: "admin@gmail.com",
    },
  },
  sub_super_admin: {
    dashboardItem: {
      icon: <LayoutDashboard className={sidebarIconClass} />,
      name: "Dashboard",
      path: "/sub-super-admin/dashboard",
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
            path: "/sub-super-admin/technical-support",
            icon: <UserCheck className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Company Management",
        items: [
          {
            name: "Company Admins",
            path: "/sub-super-admin/company-admins",
            icon: <Building2 className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Asset Management",
        items: [
          {
            name: "Machines",
            path: "/sub-super-admin/machines",
            icon: <Truck className={sidebarIconClass} />,
          },
          {
            name: "Fleet",
            path: "/sub-super-admin/fleet",
            icon: <Truck className={sidebarIconClass} />,
          },
          {
            name: "Components",
            path: "/sub-super-admin/components",
            icon: <Cpu className={sidebarIconClass} />,
          },
          {
            name: "Service Logs",
            path: "/sub-super-admin/service-logs",
            icon: <FileClock className={sidebarIconClass} />,
          },
        ],
      },

      {
        title: "Settings",
        items: [
          {
            name: "Plans & Billing",
            path: "/sub-super-admin/plans-billing",
            icon: <CreditCard className={sidebarIconClass} />,
          },
          {
            name: "System Settings",
            path: "/sub-super-admin/settings",
            icon: <Settings className={sidebarIconClass} />,
            isComingSoon: true,
          },
        ],
      },
    ],

    profile: {
      shortName: "SSA",
      title: "Sub Super Admin",
      subtitle: "subsuperadmin@hme.com",
      email: "subsuperadmin@hme.com",
    },
  },
};

(sidebarConfig as any).subadmin = (sidebarConfig as any).sub_admin;
(sidebarConfig as any).subsuperadmin = (sidebarConfig as any).sub_super_admin;
