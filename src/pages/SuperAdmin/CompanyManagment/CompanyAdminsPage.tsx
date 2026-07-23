import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { showSuccessToast, showErrorToast } from "../../../utils/toastUtils";

import {
  Users,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Shield,
  Building2,
  Mail,
  X,
  FileText,
  Download,
  Loader2,
  ServerCrash,
  RefreshCw,
  UserRound,
  BriefcaseBusiness,
  XCircle,
  CheckCircle2,
  Save,
} from "lucide-react";

import {
  superAdminMachineService,
  type SuperAdminCompany,
} from "../../../services/SuperAdmin/machineService";

import Pagination from "../../../components/common/Pagination";

type CompanyStatus = "Active" | "Expiring Soon" | "Inactive";
type PlanType = "Premium" | "Silver" | "Demo" | "None";

type CompanyAdmin = {
  name: string;
  email: string;
};

type Company = {
  id: string;
  name: string;
  code: string;
  admin: CompanyAdmin;
  staff_count: number;
  active_plan: PlanType;
  status: CompanyStatus;
  joined_date: string;
  role: string;
};


const pageSize = 5;

type EditCompanyFormValues = z.infer<typeof editCompanySchema>; // output (staffCount: number)
type EditCompanyFormInput = z.input<typeof editCompanySchema>; // input (staffCount: unknown/string)

// ---------- Edit Company Zod Schema ----------
const editCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(50, "Company name is too long"),

  code: z
    .string()
    .trim()
    .min(1, "Company code is required")
    .max(30, "Company code is too long")
    .regex(/^[A-Za-z0-9-_]+$/, "Only letters, numbers, - and _ allowed"),

  adminName: z
    .string()
    .trim()
    .min(1, "Admin name is required")
    .max(80, "Admin name is too long"),

  adminEmail: z
    .string()
    .trim()
    .min(1, "Admin email is required")
    .email("Enter a valid email address"),

  staffCount: z.coerce
    .number({
      message: "Staff count is required",
    })
    .int("Staff count must be a whole number")
    .min(0, "Staff count cannot be negative")
    .max(100000, "Staff count seems too high"),

  activePlan: z.enum(["Premium", "Silver", "Demo", "None"], {
    message: "Active plan is required",
  }),

  status: z.enum(["Active", "Expiring Soon", "Inactive"], {
    message: "Status is required",
  }),
});

// ---------- Helpers (unchanged) ----------
const formatJoinedDate = (date?: string) => {
  if (!date) return "-";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const getPlanType = (plan?: string): PlanType => {
  const normalizedPlan = String(plan || "")
    .toLowerCase()
    .trim();
  if (!normalizedPlan || normalizedPlan === "none") return "None";
  if (normalizedPlan.includes("premium")) return "Premium";
  if (normalizedPlan.includes("silver")) return "Silver";
  if (normalizedPlan.includes("demo")) return "Demo";
  return "None";
};

const getCompanyStatus = (company: SuperAdminCompany): CompanyStatus => {
  const activePlan = String(company.activePlan || "")
    .toLowerCase()
    .trim();
  if (!activePlan || activePlan === "none") return "Inactive";
  return "Active";
};

const getInitials = (name: string) => {
  const words = name.trim().split(" ").filter(Boolean);
  if (!words.length) return "CO";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const formatRoleLabel = (role: string) => {
  return String(role || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCsvCell = (value: string | number) => {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
};

const mapCompanyToAdminRow = (company: SuperAdminCompany): Company => {
  const companyName =
    company.companyName ||
    company.company_name ||
    company.name ||
    "Unnamed Company";
  const companyCode =
    company.companyCode || company.company_code || "Code not available";
  const adminName = company.adminName || "Not assigned";
  const adminEmail = company.adminEmail || company.email || "Not available";

  return {
    id: String(company.id),
    name: companyName,
    code: companyCode,
    admin: { name: adminName, email: adminEmail },
    staff_count: Number(company.staffCount || 0),
    active_plan: getPlanType(company.activePlan),
    status: getCompanyStatus(company),
    joined_date: formatJoinedDate(company.createdAt || company.created_at),
    role: "company_admin",
  };
};

export default function CompanyAdminsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"All Plans" | PlanType>(
    "All Plans",
  );
  const [selectedCompany, setSelectedCompany] = useState("All Companies");

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewCompany, setViewCompany] = useState<Company | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEditForm,
    formState: {
      errors: editErrors,
      isValid: isEditFormValid,
      isDirty: isEditFormDirty,
    },
  } = useForm<EditCompanyFormInput, any, EditCompanyFormValues>({
    resolver: zodResolver(editCompanySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      code: "",
      adminName: "",
      adminEmail: "",
      staffCount: 0,
      activePlan: "None",
      status: "Inactive",
    },
  });

  const fetchCompanyAdmins = async () => {
    try {
      setAdminsLoading(true);
      setAdminsError("");

      const companyList = await superAdminMachineService.getCompanies();
      const mappedCompanies = companyList.map(mapCompanyToAdminRow);

      setCompanies(mappedCompanies);
      setCurrentPage(1);
    } catch (error: any) {
      console.error("Failed to fetch company administrators:", error);
      setAdminsError(
        error?.message || "Unable to load company administrators.",
      );
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyAdmins();
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const search = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !search ||
        company.name.toLowerCase().includes(search) ||
        company.code.toLowerCase().includes(search) ||
        company.admin.name.toLowerCase().includes(search) ||
        company.admin.email.toLowerCase().includes(search) ||
        formatRoleLabel(company.role).toLowerCase().includes(search);

      const matchesPlan =
        selectedPlan === "All Plans" || company.active_plan === selectedPlan;
      const matchesCompany =
        selectedCompany === "All Companies" || company.name === selectedCompany;

      return matchesSearch && matchesPlan && matchesCompany;
    });
  }, [companies, searchTerm, selectedPlan, selectedCompany]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCompanies.length / pageSize),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCompanies = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, safeCurrentPage]);

  const startItem =
    filteredCompanies.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(
    safeCurrentPage * pageSize,
    filteredCompanies.length,
  );

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));

  const totalStaff = companies.reduce(
    (total, company) => total + company.staff_count,
    0,
  );
  const activeAdmins = companies.filter(
    (company) => company.status === "Active",
  ).length;
  const inactiveCompanies = companies.filter(
    (company) => company.status === "Inactive",
  ).length;

  const closeAllMenus = () => setOpenMenuId(null);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedPlan("All Plans");
    setSelectedCompany("All Companies");
    setCurrentPage(1);
  };

  const handleViewCompany = (company: Company) => {
    setViewCompany(company);
    setIsViewModalOpen(true);
    closeAllMenus();
  };

  // ---------- Edit handlers ----------
  const handleEditCompany = (company: Company) => {
    setEditCompany(company);

    resetEditForm({
      name: company.name,
      code: company.code,
      adminName: company.admin.name,
      adminEmail: company.admin.email,
      staffCount: company.staff_count,
      activePlan: company.active_plan,
      status: company.status,
    });

    setIsEditModalOpen(true);
    closeAllMenus();
  };

  const handleCloseEditModal = () => {
    if (isSavingEdit) return;
    setIsEditModalOpen(false);
    setEditCompany(null);
    resetEditForm();
  };

  const onSubmitEditCompany = async (values: EditCompanyFormValues) => {
    if (!editCompany) return;

    try {
      setIsSavingEdit(true);

  await superAdminMachineService.updateCompany(
  editCompany.id,
  {
    companyName: values.name,
    companyCode: values.code,
    adminName: values.adminName,
    adminEmail: values.adminEmail,
    staffCount: values.staffCount,
    activePlan: values.activePlan,
    status: values.status,
  },
);

setIsEditModalOpen(false);
setEditCompany(null);
resetEditForm();

await fetchCompanyAdmins();

    } catch (error: any) {
      console.error("Update failed:", error);
      showErrorToast(error?.message || "Failed to update company");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompany) return;

    try {
      setIsDeleting(true);

      const response: any = await superAdminMachineService.deleteCompany(
        deleteCompany.id,
      );

      setDeleteCompany(null);
      await fetchCompanyAdmins();

      showSuccessToast(response?.message || "Company deleted successfully");
    } catch (error: any) {
      console.error("Delete failed:", error);
      showErrorToast(error?.message || "Failed to delete company");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewCompany(null);
  };

  // ---------- Status toggle (checkbox) handler ----------
  // Note: "Expiring Soon" is a backend-driven state (based on subscription
  // expiry) and is treated as "not active" for the purpose of this toggle.
  // Toggling always switches between Active <-> Inactive and hits the API.
  const handleToggleStatus = async (company: Company) => {
    if (togglingStatusId) return; // prevent double-fire while a request is in flight

    const nextStatus: CompanyStatus =
      company.status === "Active" ? "Inactive" : "Active";

    const previousCompanies = companies;

    // Optimistic update
    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, status: nextStatus } : c)),
    );
    setTogglingStatusId(company.id);

    try {
      // BACKEND TODO: replace with a dedicated status-toggle endpoint once
      // available (ideally a lightweight PATCH that only needs { status }).
      // Until then, updateCompany expects the full payload, so we resend the
      // company's existing fields unchanged and only flip `status`.
      const response: any = await superAdminMachineService.updateCompany(
        company.id,
        {
          companyName: company.name,
          companyCode: company.code,
          adminName: company.admin.name,
          adminEmail: company.admin.email,
          staffCount: company.staff_count,
          activePlan: company.active_plan,
          status: nextStatus,
        },
      );

      showSuccessToast(
        response?.message || `${company.name} marked as ${nextStatus}`,
      );
    } catch (error: any) {
      console.error("Status toggle failed:", error);
      // Revert optimistic update on failure
      showErrorToast(error?.message || "Failed to update company status");
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleExportData = () => {
    const headers = [
      "Company Name",
      "Company Code",
      "Admin Name",
      "Admin Email",
      "Role",
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
      formatRoleLabel(company.role),
      company.staff_count,
      company.active_plan,
      company.status,
      company.joined_date,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(formatCsvCell).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "company-administrators.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const generatedOn = new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Company Administrators Report", 40, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on ${generatedOn}`, 40, 58);
    doc.text(`Total Records: ${filteredCompanies.length}`, 40, 72);

    const tableHeaders = [
      "Company",
      "Code",
      "Admin Name",
      "Admin Email",
      "Role",
      "Staff",
      "Plan",
      "Status",
      "Joined",
    ];

    const tableRows = filteredCompanies.map((company) => [
      company.name,
      company.code,
      company.admin.name,
      company.admin.email,
      formatRoleLabel(company.role),
      String(company.staff_count),
      company.active_plan,
      company.status,
      company.joined_date,
    ]);

    autoTable(doc, {
      startY: 90,
      head: [tableHeaders],
      body: tableRows,
      styles: {
        fontSize: 8,
        cellPadding: 6,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [29, 78, 216],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 40, right: 40 },
    });

    doc.save("company-administrators.pdf");
  };

  const getPlanDotClass = (plan: PlanType) => {
    if (plan === "Premium") return "bg-violet-500";
    if (plan === "Silver") return "bg-blue-500";
    if (plan === "Demo") return "bg-amber-500";
    return "bg-slate-400";
  };

  const getPlanBadgeClass = (plan: PlanType) => {
    if (plan === "Premium")
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300";
    if (plan === "Silver")
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
    if (plan === "Demo")
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  };

  const getStatusClass = (status: CompanyStatus) => {
    if (status === "Active")
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
    if (status === "Expiring Soon")
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  };

  const stats = [
    {
      label: "Total Companies",
      value: companies.length,
      icon: Building2,
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
      helper: "Registered companies",
    },
    {
      label: "Active Admins",
      value: activeAdmins,
      icon: Users,
      iconClass:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      helper: "Companies with active plan",
    },
    {
      label: "Staff Members",
      value: totalStaff,
      icon: BriefcaseBusiness,
      iconClass:
        "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
      helper: "Total assigned users",
    },
    {
      label: "Inactive Companies",
      value: inactiveCompanies,
      icon: Shield,
      iconClass:
        "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
      helper: "No active plan",
    },
  ];

  // Reusable input error class
  const inputErrorClass = (hasError: boolean) =>
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:border-blue-400";

  return (
    <div
      className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white lg:p-8"
      onClick={closeAllMenus}
    >
      <div className="overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6  mb-4 shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
              Super Admin Panel
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Company Administrators
            </h1>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-blue-100">
              Manage and review company administrator records, assigned staff,
              active plans, and account status from one centralized location.
            </p>
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              fetchCompanyAdmins();
            }}
            disabled={adminsLoading}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adminsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.iconClass}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {stat.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search by company, code, admin, email or role"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-blue-400"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <Building2 className="h-4 w-4 text-slate-400" />

                  <select
                    className="min-w-36 border-none bg-transparent text-sm font-medium text-slate-700 outline-none focus:ring-0 dark:text-slate-300"
                    value={selectedCompany}
                    onChange={(event) => {
                      setSelectedCompany(event.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option>All Companies</option>
                    {companies.map((company) => (
                      <option key={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <Filter className="h-4 w-4 text-slate-400" />

                  <select
                    className="min-w-28 border-none bg-transparent text-sm font-medium text-slate-700 outline-none focus:ring-0 dark:text-slate-300"
                    value={selectedPlan}
                    onChange={(event) => {
                      setSelectedPlan(
                        event.target.value as "All Plans" | PlanType,
                      );
                      setCurrentPage(1);
                    }}
                  >
                    <option>All Plans</option>
                    <option>Premium</option>
                    <option>Silver</option>
                    <option>Demo</option>
                    <option>None</option>
                  </select>
                </div>

                <button
                  onClick={resetFilters}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Reset
                </button>
              </div>

              <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-700">
                <button
                  onClick={handleExportData}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>

                <button
                  onClick={handleExportPDF}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {adminsLoading && (
            <div className="flex items-center justify-center gap-3 px-8 py-14 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Loading company administrator records...
            </div>
          )}

          {!adminsLoading && adminsError && (
            <div className="m-5 flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <ServerCrash className="h-10 w-10 text-red-600 dark:text-red-400" />
              <h3 className="mt-4 text-base font-semibold text-red-700 dark:text-red-300">
                Unable to load records
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-red-600 dark:text-red-300">
                {adminsError}
              </p>

              <button
                onClick={fetchCompanyAdmins}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          )}

          {!adminsLoading && !adminsError && (
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                  <th className="px-6 py-4 align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Company
                  </th>
                  <th className="px-6 py-4 align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Administrator
                  </th>
                  <th className="px-6 py-4 align-middle text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Staff
                  </th>
                  <th className="px-6 py-4 align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Plan
                  </th>
                  <th className="px-6 py-4 align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 align-middle text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedCompanies.length > 0 ? (
                  paginatedCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {getInitials(company.name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {company.name}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <Shield className="h-3.5 w-3.5 text-blue-500" />
                              {company.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-middle">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {company.admin.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="h-3.5 w-3.5" />
                            {company.admin.email}
                          </p>
                          <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                            {formatRoleLabel(company.role)}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 align-middle text-center">
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          {company.staff_count}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Members
                        </p>
                      </td>

                      <td className="px-6 py-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${getPlanBadgeClass(company.active_plan)}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${getPlanDotClass(company.active_plan)}`}
                          />
                          {company.active_plan}
                        </span>
                      </td>

                      <td className="px-6 py-4 align-middle">
                        <div
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center gap-2"
                        >
                          <label
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                              company.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-slate-300 dark:bg-slate-700"
                            } ${
                              togglingStatusId === company.id
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer"
                            }`}
                            title={
                              company.status === "Active"
                                ? "Click to mark Inactive"
                                : "Click to mark Active"
                            }
                          >
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={company.status === "Active"}
                              disabled={togglingStatusId === company.id}
                              onChange={() => handleToggleStatus(company)}
                            />
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                company.status === "Active"
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </label>

                          <span
                            className={`text-xs font-medium ${
                              company.status === "Active"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : company.status === "Expiring Soon"
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-red-700 dark:text-red-300"
                            }`}
                          >
                            {company.status}
                          </span>

                          {togglingStatusId === company.id && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-middle text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            onClick={() => handleViewCompany(company)}
                            title="View details"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleEditCompany(company)}
                            title="Edit company"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600 transition hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setDeleteCompany(company)}
                            title="Delete company"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                          <Search className="h-5 w-5" />
                        </div>

                        <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                          No records found
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          No company administrator records match your current
                          search or filter selection.
                        </p>

                        <button
                          onClick={resetFilters}
                          className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!adminsLoading && !adminsError && (
          <Pagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={filteredCompanies.length}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        )}
      </div>

      {/* ---------- View Modal (unchanged) ---------- */}
      {isViewModalOpen && viewCompany && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="relative z-[10000] max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 p-6 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-base font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {getInitials(viewCompany.name)}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Company Details
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
                      {viewCompany.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {viewCompany.code}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      {viewCompany.admin.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {viewCompany.admin.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["Role", formatRoleLabel(viewCompany.role)],
                  ["Staff Count", `${viewCompany.staff_count} Members`],
                  ["Active Plan", viewCompany.active_plan],
                  ["Status", viewCompany.status],
                  ["Joined Date", viewCompany.joined_date],
                  ["Company Code", viewCompany.code],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseViewModal}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Edit Modal ---------- */}
      {isEditModalOpen && editCompany && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="relative z-[10000] max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                  Edit Company
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Update company and administrator details — {editCompany.name}
                </p>
              </div>

              <button
                onClick={handleCloseEditModal}
                disabled={isSavingEdit}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(onSubmitEditCompany)} noValidate>
              <div className="grid gap-5 p-6 md:grid-cols-2">
                {/* Company Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Company Name
                  </label>
                  <input
                    type="text"
                    {...registerEdit("name")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.name)}`}
                    placeholder="Enter company name"
                  />
                  {editErrors.name && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.name.message}
                    </p>
                  )}
                </div>

                {/* Company Code */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Company Code
                  </label>
                  <input
                    type="text"
                    {...registerEdit("code")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.code)}`}
                    placeholder="e.g. ACME-01"
                  />
                  {editErrors.code && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.code.message}
                    </p>
                  )}
                </div>

                {/* Staff Count */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Staff Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    {...registerEdit("staffCount")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.staffCount)}`}
                    placeholder="0"
                  />
                  {editErrors.staffCount && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.staffCount.message}
                    </p>
                  )}
                </div>

                {/* Admin Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    {...registerEdit("adminName")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.adminName)}`}
                    placeholder="Enter admin full name"
                  />
                  {editErrors.adminName && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.adminName.message}
                    </p>
                  )}
                </div>

                {/* Admin Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    {...registerEdit("adminEmail")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.adminEmail)}`}
                    placeholder="admin@company.com"
                  />
                  {editErrors.adminEmail && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.adminEmail.message}
                    </p>
                  )}
                </div>

                {/* Active Plan */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Active Plan
                  </label>
                  <select
                    {...registerEdit("activePlan")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.activePlan)}`}
                  >
                    <option value="None">None</option>
                    <option value="Premium">Premium</option>
                    <option value="Silver">Silver</option>
                    <option value="Demo">Demo</option>
                  </select>
                  {editErrors.activePlan && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.activePlan.message}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Status
                  </label>
                  <select
                    {...registerEdit("status")}
                    className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-950 dark:text-white ${inputErrorClass(!!editErrors.status)}`}
                  >
                    <option value="Active">Active</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  {editErrors.status && (
                    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      {editErrors.status.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-slate-200 p-6 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSavingEdit}
                  className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSavingEdit || !isEditFormValid || !isEditFormDirty
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Delete Modal (unchanged) ---------- */}
      {deleteCompany && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-bold">Delete Company</h2>
                <p className="text-gray-500">This action cannot be undone.</p>
              </div>

              <button onClick={() => setDeleteCompany(null)}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong>{deleteCompany.name}</strong>?
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t p-6">
              <button
                onClick={() => setDeleteCompany(null)}
                className="rounded-xl border px-6 py-2"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteCompany}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-6 py-2 text-white hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
