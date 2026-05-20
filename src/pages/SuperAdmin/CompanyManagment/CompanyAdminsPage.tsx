import React, { useMemo, useState } from "react";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Shield,
  Building2,
  Mail,
  UserPlus,
  ArrowUpRight,
  X,
  Pencil,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type CompanyStatus = "Active" | "Expiring Soon" | "Inactive";
type PlanType = "Premium" | "Silver" | "Demo";

type CompanyAdmin = {
  name: string;
  email: string;
};

type Company = {
  id: number;
  name: string;
  code: string;
  admin: CompanyAdmin;
  staff_count: number;
  active_plan: PlanType;
  status: CompanyStatus;
  joined_date: string;
  avatar: string;
};

type StaffMember = {
  name: string;
  role: string;
  email: string;
  joined: string;
};

type CompanyFormState = {
  name: string;
  code: string;
  adminName: string;
  adminEmail: string;
  staffCount: string;
  activePlan: PlanType;
  status: CompanyStatus;
};

const MOCK_COMPANIES: Company[] = [
  {
    id: 1,
    name: "Mining Solutions Corp",
    code: "MSC-2024",
    admin: { name: "John Doe", email: "john@miningsolutions.com" },
    staff_count: 24,
    active_plan: "Premium",
    status: "Active",
    joined_date: "Jan 12, 2024",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MSC",
  },
  {
    id: 2,
    name: "Global Excavation Ltd",
    code: "GEL-990",
    admin: { name: "Sarah Smith", email: "sarah@globalex.com" },
    staff_count: 12,
    active_plan: "Silver",
    status: "Active",
    joined_date: "Feb 05, 2024",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=GEL",
  },
  {
    id: 3,
    name: "Precision Haulage",
    code: "PH-785",
    admin: { name: "Mike Johnson", email: "mike@precision.com" },
    staff_count: 8,
    active_plan: "Demo",
    status: "Expiring Soon",
    joined_date: "May 01, 2024",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=PH",
  },
  {
    id: 4,
    name: "Apex Earthmovers",
    code: "AE-010",
    admin: { name: "Robert Chen", email: "robert@apex.com" },
    staff_count: 45,
    active_plan: "Premium",
    status: "Active",
    joined_date: "Nov 20, 2023",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=AE",
  },
  {
    id: 5,
    name: "TechMining SA",
    code: "TM-EX300",
    admin: { name: "Elena Rodriguez", email: "elena@techmining.co.za" },
    staff_count: 15,
    active_plan: "Silver",
    status: "Active",
    joined_date: "Mar 15, 2024",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TM",
  },
];

const MOCK_STAFF: StaffMember[] = [
  {
    name: "Alice Thompson",
    role: "Operator",
    email: "alice@mining.com",
    joined: "Jan 20",
  },
  {
    name: "Bob Wilson",
    role: "Mechanic",
    email: "bob@mining.com",
    joined: "Feb 15",
  },
  {
    name: "Charlie Davis",
    role: "Manager",
    email: "charlie@mining.com",
    joined: "Mar 02",
  },
];

const emptyForm: CompanyFormState = {
  name: "",
  code: "",
  adminName: "",
  adminEmail: "",
  staffCount: "",
  activePlan: "Premium",
  status: "Active",
};

export default function CompanyAdminsPage() {
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"All Plans" | PlanType>(
    "All Plans"
  );
  const [selectedCompany, setSelectedCompany] = useState("All Companies");

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedCompanyStaff, setSelectedCompanyStaff] = useState<
    StaffMember[]
  >([]);
  const [currentCompanyName, setCurrentCompanyName] = useState("");

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CompanyFormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        company.name.toLowerCase().includes(search) ||
        company.code.toLowerCase().includes(search) ||
        company.admin.name.toLowerCase().includes(search) ||
        company.admin.email.toLowerCase().includes(search);

      const matchesPlan =
        selectedPlan === "All Plans" || company.active_plan === selectedPlan;

      const matchesCompany =
        selectedCompany === "All Companies" ||
        company.name === selectedCompany;

      return matchesSearch && matchesPlan && matchesCompany;
    });
  }, [companies, searchTerm, selectedPlan, selectedCompany]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize));

  const paginatedCompanies = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, currentPage, totalPages]);

  const totalStaff = companies.reduce(
    (total, company) => total + company.staff_count,
    0
  );

  const activeAdmins = companies.filter(
    (company) => company.status === "Active"
  ).length;

  const closeAllMenus = () => {
    setOpenMenuId(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedPlan("All Plans");
    setSelectedCompany("All Companies");
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setFormMode("add");
    setEditingCompanyId(null);
    setFormData(emptyForm);
    setFormError("");
    setIsFormModalOpen(true);
    closeAllMenus();
  };

  const openEditModal = (company: Company) => {
    setFormMode("edit");
    setEditingCompanyId(company.id);
    setFormData({
      name: company.name,
      code: company.code,
      adminName: company.admin.name,
      adminEmail: company.admin.email,
      staffCount: String(company.staff_count),
      activePlan: company.active_plan,
      status: company.status,
    });
    setFormError("");
    setIsFormModalOpen(true);
    closeAllMenus();
  };

  const handleViewCompany = (company: Company) => {
    setViewCompany(company);
    setIsViewModalOpen(true);
    closeAllMenus();
  };

  const handleViewStaff = (company: Company) => {
    setCurrentCompanyName(company.name);

    // Later API integration:
    // const staff = await staffService.getStaffByCompanyId(company.id);
    // setSelectedCompanyStaff(staff);

    setSelectedCompanyStaff(MOCK_STAFF);
    setIsStaffModalOpen(true);
    closeAllMenus();
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Company name is required.";
    if (!formData.code.trim()) return "Company code is required.";
    if (!formData.adminName.trim()) return "Admin name is required.";
    if (!formData.adminEmail.trim()) return "Admin email is required.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail.trim())) {
      return "Please enter a valid admin email.";
    }

    if (!formData.staffCount.trim()) return "Staff count is required.";

    const staffCount = Number(formData.staffCount);
    if (Number.isNaN(staffCount) || staffCount < 0) {
      return "Staff count must be a valid number.";
    }

    return "";
  };

  const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const companyPayload: Company = {
      id:
        formMode === "edit" && editingCompanyId
          ? editingCompanyId
          : Date.now(),
      name: formData.name.trim(),
      code: formData.code.trim(),
      admin: {
        name: formData.adminName.trim(),
        email: formData.adminEmail.trim(),
      },
      staff_count: Number(formData.staffCount),
      active_plan: formData.activePlan,
      status: formData.status,
      joined_date:
        formMode === "edit"
          ? companies.find((company) => company.id === editingCompanyId)
              ?.joined_date || new Date().toDateString()
          : new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            }),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        formData.code.trim() || formData.name.trim()
      )}`,
    };

    if (formMode === "add") {
      setCompanies((prev) => [companyPayload, ...prev]);
      setCurrentPage(1);
    } else {
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === editingCompanyId ? companyPayload : company
        )
      );
    }

    setIsFormModalOpen(false);
    setFormData(emptyForm);
    setEditingCompanyId(null);
    setFormError("");
  };

  const handleDeleteCompany = () => {
    if (!deleteCompany) return;

    setCompanies((prev) =>
      prev.filter((company) => company.id !== deleteCompany.id)
    );
    setDeleteCompany(null);
    closeAllMenus();

    if (paginatedCompanies.length === 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleExportData = () => {
    const headers = [
      "Company Name",
      "Company Code",
      "Admin Name",
      "Admin Email",
      "Staff Count",
      "Active Plan",
      "Status",
      "Joined Date",
    ];

    const rows = filteredCompanies.map((company) => [
      company.name,
      company.code,
      company.admin.name,
      company.admin.email,
      company.staff_count,
      company.active_plan,
      company.status,
      company.joined_date,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "company-admins.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleInputChange = (
    field: keyof CompanyFormState,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (formError) setFormError("");
  };

  const getPlanDotClass = (plan: PlanType) => {
    if (plan === "Premium") {
      return "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]";
    }

    if (plan === "Silver") {
      return "bg-blue-500";
    }

    return "bg-orange-500";
  };

  const getStatusClass = (status: CompanyStatus) => {
    if (status === "Active") {
      return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    }

    if (status === "Expiring Soon") {
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
    }

    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  };

  return (
    <div
      className="min-h-screen bg-[#F8F9FC] p-4 dark:bg-slate-900 lg:p-10"
      onClick={closeAllMenus}
    >
      <div className="mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Company <span className="text-blue-600">Administrators</span>
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Manage enterprise clients and monitor their ecosystem activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <img
                  key={i}
                  className="h-9 w-9 rounded-full border-2 border-white bg-slate-100 dark:border-slate-800"
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                    i + 10
                  }`}
                  alt="User"
                />
              ))}

              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[10px] font-bold text-white dark:border-slate-800">
                +{companies.length}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openAddModal();
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700"
            >
              <UserPlus size={16} />
              Add New Admin
            </button>
          </div>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Companies",
            value: companies.length,
            icon: Building2,
            color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10",
          },
          {
            label: "Active Admins",
            value: activeAdmins,
            icon: Users,
            color: "bg-green-50 text-green-600 dark:bg-green-500/10",
          },
          {
            label: "Staff Members",
            value: totalStaff,
            icon: UserPlus,
            color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10",
          },
          {
            label: "Monthly Revenue",
            value: "R 42.5K",
            icon: ArrowUpRight,
            color: "bg-orange-50 text-orange-600 dark:bg-orange-500/10",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color}`}
              >
                <stat.icon size={22} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                {stat.label}
              </span>
            </div>
            <p className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-800/50">
        <div className="border-b border-slate-50 p-8 dark:border-slate-700/50">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search company, code, admin or email..."
                className="w-full rounded-2xl border-none bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/20 dark:bg-slate-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 dark:bg-slate-900">
                <Building2 size={16} className="text-slate-400" />
                <select
                  className="border-none bg-transparent py-1 text-xs font-bold text-slate-600 focus:ring-0 dark:text-slate-300"
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option>All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 dark:bg-slate-900">
                <Filter size={16} className="text-slate-400" />
                <select
                  className="border-none bg-transparent py-1 text-xs font-bold text-slate-600 focus:ring-0 dark:text-slate-300"
                  value={selectedPlan}
                  onChange={(e) => {
                    setSelectedPlan(e.target.value as "All Plans" | PlanType);
                    setCurrentPage(1);
                  }}
                >
                  <option>All Plans</option>
                  <option>Premium</option>
                  <option>Silver</option>
                  <option>Demo</option>
                </select>
              </div>

              <button
                onClick={resetFilters}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Reset
              </button>

              <button
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800"
              >
                <Download size={15} />
                Export Data
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Company & Code
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Admin Info
                </th>
                <th className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Staff Count
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Active Plan
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status
                </th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {paginatedCompanies.length > 0 ? (
                paginatedCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-2xl border border-slate-100 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                          <img
                            src={company.avatar}
                            alt={company.name}
                            className="h-full w-full rounded-[14px] object-cover"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {company.name}
                          </p>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Shield size={10} className="text-blue-500" />
                            {company.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {company.admin.name}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                          <Mail size={10} />
                          {company.admin.email}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {company.staff_count}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">
                          Members
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${getPlanDotClass(
                            company.active_plan
                          )}`}
                        />
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                          {company.active_plan}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getStatusClass(
                          company.status
                        )}`}
                      >
                        {company.status}
                      </span>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div
                        className="relative flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleViewCompany(company)}
                          title="View company"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-900"
                        >
                          <Eye size={18} />
                        </button>

                        <button
                          onClick={() => openEditModal(company)}
                          title="Edit company"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-orange-50 hover:text-orange-600 dark:bg-slate-900"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => setDeleteCompany(company)}
                          title="Delete company"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 dark:bg-slate-900"
                        >
                          <Trash2 size={16} />
                        </button>

                        <button
                          onClick={() =>
                            setOpenMenuId((prev) =>
                              prev === company.id ? null : company.id
                            )
                          }
                          title="More actions"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-900 hover:text-white dark:bg-slate-900"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {openMenuId === company.id && (
                          <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-slate-100 bg-white p-2 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
                            <button
                              onClick={() => handleViewStaff(company)}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-900"
                            >
                              <Users size={15} />
                              View Staff Members
                            </button>

                            <button
                              onClick={() => handleViewCompany(company)}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-900"
                            >
                              <Eye size={15} />
                              View Details
                            </button>

                            <button
                              onClick={() => openEditModal(company)}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-slate-900"
                            >
                              <Pencil size={15} />
                              Edit Admin
                            </button>

                            <button
                              onClick={() => setDeleteCompany(company)}
                              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={15} />
                              Delete Admin
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-slate-900">
                        <Search size={24} />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        No companies found
                      </h3>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Try changing search, company filter or plan filter.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-50 bg-slate-50/50 p-6 dark:border-slate-700/50 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Showing {paginatedCompanies.length} of {filteredCompanies.length}{" "}
              companies
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Previous
              </button>

              <span className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-slate-800 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                  {formMode === "add" ? (
                    <UserPlus size={24} />
                  ) : (
                    <Pencil size={22} />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {formMode === "add" ? "Add New Admin" : "Edit Admin"}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    Company administrator details
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle size={16} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Company Name
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter company name"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Company Code
                </label>
                <input
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="Example: MSC-2024"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Admin Name
                </label>
                <input
                  value={formData.adminName}
                  onChange={(e) =>
                    handleInputChange("adminName", e.target.value)
                  }
                  placeholder="Enter admin name"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Admin Email
                </label>
                <input
                  value={formData.adminEmail}
                  onChange={(e) =>
                    handleInputChange("adminEmail", e.target.value)
                  }
                  placeholder="Enter admin email"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Staff Count
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.staffCount}
                  onChange={(e) =>
                    handleInputChange("staffCount", e.target.value)
                  }
                  placeholder="Enter staff count"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Active Plan
                </label>
                <select
                  value={formData.activePlan}
                  onChange={(e) =>
                    handleInputChange("activePlan", e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option>Premium</option>
                  <option>Silver</option>
                  <option>Demo</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option>Active</option>
                  <option>Expiring Soon</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700"
                >
                  {formMode === "add" ? "Create Admin" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && viewCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-800">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={viewCompany.avatar}
                  alt={viewCompany.name}
                  className="h-14 w-14 rounded-2xl border border-slate-100 bg-white"
                />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {viewCompany.name}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {viewCompany.code}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsViewModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Admin Name", viewCompany.admin.name],
                ["Admin Email", viewCompany.admin.email],
                ["Staff Count", `${viewCompany.staff_count} Members`],
                ["Active Plan", viewCompany.active_plan],
                ["Status", viewCompany.status],
                ["Joined Date", viewCompany.joined_date],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleViewStaff(viewCompany);
                }}
                className="w-full rounded-2xl bg-blue-600 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700"
              >
                View Staff
              </button>

              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(viewCompany);
                }}
                className="w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-800">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">
                  <Users size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Staff Members
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {currentCompanyName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {selectedCompanyStaff.map((staff, i) => (
                <div
                  key={`${staff.email}-${i}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-50 bg-slate-50/30 p-5 dark:border-slate-700/50 dark:bg-slate-900/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-xs font-bold text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      {staff.name.charAt(0)}
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {staff.name}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        {staff.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[9px] font-black uppercase text-blue-600 dark:bg-blue-500/10">
                      {staff.role}
                    </span>
                    <p className="mt-1 text-[8px] font-bold uppercase text-slate-400">
                      Joined {staff.joined}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="mt-10 w-full rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-slate-800"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {deleteCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-800">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10">
              <Trash2 size={24} />
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Delete Company Admin?
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Are you sure you want to delete{" "}
              <span className="font-black text-slate-900 dark:text-white">
                {deleteCompany.name}
              </span>
              ? This action will remove it from the list.
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setDeleteCompany(null)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-4 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteCompany}
                className="w-full rounded-2xl bg-red-600 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {companies.length > 0 && (
        <div className="fixed bottom-5 right-5 hidden items-center gap-2 rounded-2xl border border-green-100 bg-white px-4 py-3 text-xs font-bold text-green-700 shadow-lg dark:border-green-500/10 dark:bg-slate-800 dark:text-green-400 sm:flex">
          <CheckCircle2 size={16} />
          Local CRUD ready for API integration
        </div>
      )}
    </div>
  );
}