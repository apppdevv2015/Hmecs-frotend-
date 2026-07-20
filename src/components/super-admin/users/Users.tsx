  import { useCallback, useEffect, useMemo, useState } from "react";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import PhoneField from "../../common/PhoneField";
  import AppSelect from "../../ui/dropdown/AppSelect";
  

  import {
    superAdminMachineService,
    type SuperAdminCompany,
  } from "../../../services/SuperAdmin/machineService";

  import { Eye, Pencil, Trash2, X } from "lucide-react";

  import { z } from "zod";

  import Pagination from "../../common/Pagination";
  import {
    userService,
    type AddUserPayload,
    type UpdateUserPayload,
  } from "../../../services/userService";

  export type UserStatus = "active" | "inactive";
  export type ModalMode = "add" | "edit";

  export type UserFlowType = "existing" | "new_company_admin";

  export type User = {
    id: string | number;
    name: string;
    email: string;
    phone: string;
    role: string;
    company: string;
    companyId?: string;
    companyCode?: string;
    status: UserStatus;
    lastLogin: string;
    createdAt: string;
  };

  type UserFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;

    password?: string;
    role?: string;
    company?: string;
    companyId?: string;

    status: UserStatus;
    flowType?: UserFlowType;
  };

  type ApiUser = {
    id: string | number;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    fname?: string;
    lname?: string;
    name?: string;
    email?: string;
    mobileNumber?: string;
    mobile_number?: string;
    mobile?: string;
    phone?: string;
    role_name?: string;
    role?: string | { id?: string; name?: string };
    company?: { id?: string; name?: string; companyCode?: string };
    company_id?: string;
    company_name?: string;
    companyCode?: string;
    company_code?: string;
    status?: string;
    isActive?: boolean;
    is_active?: boolean;
    last_login?: string;
    lastLogin?: string;
    created_at?: string;
    createdAt?: string;
    updated_at?: string;
    updatedAt?: string;
  };

  type PaginationData = {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };

  type UsersApiResponse = {
    success?: boolean;
    message?: string;
    data?: { users?: ApiUser[]; pagination?: PaginationData };
    users?: ApiUser[];
    pagination?: PaginationData;
  };

  type ExtendedUser = User & {
    firstName?: string;
    lastName?: string;
    companyCode?: string;
    updatedAt?: string;
    rawStatus?: string;
  };

  type SuperAdminFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    status: UserStatus;
  };

  // ========================
  // CONSTANTS
  // ========================

  const USERS_PER_PAGE = 5;
  const ALL_COMPANIES = "All Companies";
  const ALL_ROLES = "All Roles";
  const ALL_STATUS = "All Status";

  const emptyForm: UserFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "Operator",
    company: "",
    companyId: "",
    status: "active",
    flowType: "existing",
  };

  const emptySuperAdminForm: SuperAdminFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    status: "active",
  };

  // ========================
  // ROLE MAPS
  // ========================

  const roleMap: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    Artisans: "Artisans",
    Supervisor: "Supervisor",
    Operator: "Operator",
    artisans: "Artisans",
    supervisor: "Supervisor",
    operator: "Operator",
  };

  const apiRoleMap: Record<string, string> = {
    "Super Admin": "super_admin",
    Admin: "admin",
    Artisans: "Artisans",
    Supervisor: "Supervisor",
    Operator: "Operator",
  };

  const ROLE_OPTIONS = [ALL_ROLES, "Admin", "Supervisor", "Artisans", "Operator"];

  // ========================
  // VALIDATION SCHEMAS
  // ========================

  // Existing company user — companyId required
  const existingUserFormSchema = z.object({
    firstName: z
      .string()
      .trim()
      .min(1, "first name is required.")
      .max(50, "First name cannot exceed 50 characters."),

    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .max(50, "Last name cannot exceed 50 characters."),

    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Please enter a valid email address."),

    phone: z.string().trim().min(1, "Phone number is required."),

    role: z.string().trim().min(1, "Please select a role."),

    companyId: z.string().trim().min(1, "Please select a company."),

    status: z.enum(["active", "inactive"]),

    password: z.string().optional(),
    company: z.string().optional(),
    flowType: z.enum(["existing", "new_company_admin"]).optional(),
  });

  // New company admin — no companyId needed
  const newCompanyAdminFormSchema = z.object({
    firstName: z.string().trim().min(1, "First name is required."),

    lastName: z.string().trim().min(1, "Last name is required."),

    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Please enter a valid email address."),

    phone: z.string().trim().min(1, "Phone number is required."),

    status: z.enum(["active", "inactive"]),

    password: z.string().optional(),
    role: z.string().optional(),
    company: z.string().optional(),
    companyId: z.string().optional(),
    flowType: z.enum(["existing", "new_company_admin"]).optional(),
  });

  const superAdminFormSchema = z
    .object({
      firstName: z.string().trim().min(1, "First name is required."),
      lastName: z.string().trim().min(1, "Last name is required."),

      email: z
        .string()
        .trim()
        .min(1, "Email is required.")
        .email("Please enter a valid email address."),

      phone: z.string().trim().min(1, "Phone number is required."),

      password: z
        .string()
        .trim()
        .min(1, "Password is required.")
        .min(8, "Password must be at least 8 characters."),

      confirmPassword: z.string().trim().min(1, "Please confirm your password."),

      status: z.enum(["active", "inactive"]),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  // ========================
  // HELPERS
  // ========================
  // NOTE: toast calls removed from this file — userService now uses apiCall
  // internally (services/apiHandler.ts), which shows success/error toasts
  // automatically. This file only manages local UI state (loading, inline
  // error text, modal open/close). Don't add manual toast.* calls here again.

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const normalizeText = (value: string | number | undefined | null) =>
    String(value || "")
      .toLowerCase()
      .trim();

  const formatDate = (date?: string) => {
    if (!date) return "—";
    const d = new Date(date);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  const formatRole = (role?: string) => {
    if (!role) return "Operator";
    return roleMap[role.toLowerCase().trim()] || "Operator";
  };

  const getApiRoleName = (role?: string) => {
    return apiRoleMap[role ?? "Operator"] || "Operator";
  };

  const getCompanyName = (user: ApiUser) =>
    user.company?.name || user.company_name || "—";

  const getUserStatus = (user: ApiUser): UserStatus => {
    if (typeof user.isActive === "boolean")
      return user.isActive ? "active" : "inactive";
    if (typeof user.is_active === "boolean")
      return user.is_active ? "active" : "inactive";
    return user.status === "active" ? "active" : "inactive";
  };

  const mapApiUserToUser = (user: ApiUser): ExtendedUser => {
    const firstName = user.firstName || user.first_name || user.fname || "";
    const lastName = user.lastName || user.last_name || user.lname || "";
    const fullName =
      user.name || `${firstName} ${lastName}`.trim() || "Unknown User";
    const roleValue =
      typeof user.role === "object"
        ? user.role?.name
        : user.role || user.role_name || "operator";

    return {
      id: user.id,
      name: fullName,
      firstName,
      lastName,
      email: user.email || "—",
      phone:
        user.mobileNumber ||
        user.mobile_number ||
        user.mobile ||
        user.phone ||
        "—",
      role: formatRole(roleValue),
      company: getCompanyName(user),
      companyId: user.company?.id || "",
      companyCode:
        user.company?.companyCode || user.companyCode || user.company_code || "—",
      status: getUserStatus(user),
      rawStatus: user.status || "—",
      lastLogin: formatDate(user.last_login || user.lastLogin),
      createdAt: formatDate(user.created_at || user.createdAt),
      updatedAt: formatDate(user.updated_at || user.updatedAt),
    };
  };

  const getStatusClass = (status: UserStatus) =>
    status === "active"
      ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
      : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";

  const getRoleClass = (role: string) => {
    switch (role) {
      case "Super Admin":
        return "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400";
      case "Admin":
        return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
      case "Artisans":
        return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
      case "Supervisor":
        return "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300";
    }
  };

  // ========================
  // REUSABLE: ModalShell
  // ========================

  type ModalShellProps = {
    title: string;
    subtitle?: string;
    onClose: () => void;
    disableClose?: boolean;
    maxWidth?: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  };

  function ModalShell({
    title,
    subtitle,
    onClose,
    disableClose = false,
    maxWidth = "max-w-3xl",
    children,
    footer,
  }: ModalShellProps) {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !disableClose) onClose();
      };

      const previousBodyOverflow = document.body.style.overflow;
      const previousHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      };
    }, [onClose, disableClose]);

    return (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !disableClose) onClose();
        }}
      >
        <div
          className={`
      w-full
      ${maxWidth}
      flex
      max-h-[90dvh]
      flex-col
      overflow-hidden
      rounded-[28px]
      border
      border-slate-200
      bg-white
      shadow-2xl
      dark:border-slate-800
      dark:bg-[#081028]
    `}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-7 pt-6 pb-5 dark:border-slate-800 shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={disableClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto px-7 py-6 flex-1">{children}</div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 px-7 py-5 dark:border-slate-800 shrink-0">
            {footer}
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // REUSABLE: FormField
  // ========================

  type FormFieldProps = {
    label: string;
    colSpan?: boolean;
    error?: string;
  } & (
    | ({
        as?: "input";
      } & React.InputHTMLAttributes<HTMLInputElement>)
    | ({
        as: "select";
        children: React.ReactNode;
      } & React.SelectHTMLAttributes<HTMLSelectElement>)
  );

  function FormField({
    label,
    colSpan,
    error,
    as = "input",
    ...rest
  }: FormFieldProps) {
    const baseClass =
      "h-[44px] w-full rounded-2xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 dark:bg-[#0B1739] dark:text-white " +
      (error
        ? "border-red-400 dark:border-red-500"
        : "border-slate-200 dark:border-slate-700");

    return (
      <div
        className={`flex min-h-[88px] flex-col ${colSpan ? "md:col-span-2" : ""}`}
      >
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </label>
        {as === "select" ? (
          <select
            className={baseClass}
            {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {(rest as { children: React.ReactNode }).children}
          </select>
        ) : (
          <input
            className={baseClass}
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        <div className="mt-1 min-h-[18px]">
          {error && (
            <p className="text-[11px] font-medium leading-4 text-red-500 break-words">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ========================
  // REUSABLE: ModalFooterButtons
  // ========================

  function ModalFooterButtons({
    onCancel,
    onConfirm,
    cancelLabel = "Cancel",
    confirmLabel,
    loadingLabel,
    isLoading = false,
    confirmVariant = "primary",
    disabled = false,
  }: {
    onCancel: () => void;
    onConfirm?: () => void;
    cancelLabel?: string;
    confirmLabel: string;
    loadingLabel?: string;
    isLoading?: boolean;
    confirmVariant?: "primary" | "danger";
    disabled?: boolean;
  }) {
    const confirmClass =
      confirmVariant === "danger"
        ? "rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        : "rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50";

    return (
      <>
        <button
          onClick={onCancel}
          disabled={isLoading || disabled}
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {cancelLabel}
        </button>
        {onConfirm && confirmLabel && (
          <button
            onClick={onConfirm}
            disabled={isLoading || disabled}
            className={confirmClass}
          >
            {isLoading && loadingLabel ? loadingLabel : confirmLabel}
          </button>
        )}
      </>
    );
  }

  // ========================
  // MAIN COMPONENT
  // ========================

  export default function Users() {
    const [allUsers, setAllUsers] = useState<ExtendedUser[]>([]);
    const [companies, setCompanies] = useState<SuperAdminCompany[]>([]);

    const [search, setSearch] = useState("");
    const [companyFilter, setCompanyFilter] = useState(ALL_COMPANIES);
    const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
    const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>("add");
    const [editingUserId, setEditingUserId] = useState<string | number | null>(
      null,
    );
    const [initialFormData, setInitialFormData] =
      useState<UserFormData>(emptyForm);

    const [viewUser, setViewUser] = useState<ExtendedUser | null>(null);
    const [deleteUser, setDeleteUser] = useState<ExtendedUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [error, setError] = useState("");
    const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
    const [allUsersForFilters, setAllUsersForFilters] = useState<ExtendedUser[]>(
      [],
    );

    // BACKEND TODO: replace 9999 with dedicated /users/companies endpoint
    const fetchAllUsersForFilters = useCallback(async () => {
      try {
        const response = (await userService.getUsers({
          page: 1,
          limit: 9999,
        })) as UsersApiResponse;
        const users = response?.data?.users || response?.users || [];
        setAllUsersForFilters(users.map(mapApiUserToUser));
      } catch {
        setAllUsersForFilters([]);
      }
    }, []);

    const fetchUsers = useCallback(async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await userService.getUsers({
          page: currentPage,
          limit: USERS_PER_PAGE,
        })) as UsersApiResponse;
        const users = response?.data?.users || response?.users || [];
        const pagination = response?.data?.pagination || response?.pagination;
        setAllUsers(users.map(mapApiUserToUser));
        setTotalPages(pagination?.pages || 1);
        setTotalUsers(pagination?.total || 0);
      } catch (err) {
        // inline error banner for the table; the error toast itself is
        // already shown globally by apiCall inside userService.getUsers
        setError(getErrorMessage(err, "Failed to fetch users"));
      } finally {
        setLoading(false);
      }
    }, [currentPage]);

    const fetchCompanies = useCallback(async () => {
      try {
        const response = await superAdminMachineService.getCompanies();
        setCompanies(response || []);
      } catch (error) {
        console.error(error);
      }
    }, []);

    useEffect(() => {
      fetchUsers();
    }, [fetchUsers]);
    useEffect(() => {
      fetchCompanies();
    }, [fetchCompanies]);
    useEffect(() => {
      fetchAllUsersForFilters();
    }, [fetchAllUsersForFilters]);

    // ========================
    // DYNAMIC FILTER OPTIONS
    // ========================

    const companyOptions = useMemo(() => {
      const seen = new Set<string>();
      const list: string[] = [];
      allUsersForFilters.forEach((u) => {
        const name = u.company?.trim();
        if (name && name !== "—" && !seen.has(name)) {
          seen.add(name);
          list.push(name);
        }
      });
      return [ALL_COMPANIES, ...list.sort((a, b) => a.localeCompare(b))];
    }, [allUsersForFilters]);

    const roleOptions = useMemo(() => {
      const seen = new Set<string>();
      const list: string[] = [ALL_ROLES];
      ROLE_OPTIONS.slice(1).forEach((role) => {
        if (!seen.has(role) && allUsersForFilters.some((u) => u.role === role)) {
          seen.add(role);
          list.push(role);
        }
      });
      return list;
    }, [allUsersForFilters]);

    const filteredUsers = useMemo(() => {
      const s = normalizeText(search);
      return allUsersForFilters.filter((u) => {
        const matchSearch =
          !s ||
          normalizeText(u.name).includes(s) ||
          normalizeText(u.email).includes(s) ||
          normalizeText(u.phone).includes(s) ||
          normalizeText(u.role).includes(s) ||
          normalizeText(u.company).includes(s);
        const matchCompany =
          companyFilter === ALL_COMPANIES || u.company === companyFilter;
        const matchRole = roleFilter === ALL_ROLES || u.role === roleFilter;
        const matchStatus =
          statusFilter === ALL_STATUS || u.status === statusFilter.toLowerCase();
        return matchSearch && matchCompany && matchRole && matchStatus;
      });
    }, [allUsersForFilters, search, companyFilter, roleFilter, statusFilter]);

    const paginatedUsers = useMemo(() => {
      const start = (currentPage - 1) * USERS_PER_PAGE;
      return filteredUsers.slice(start, start + USERS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalFilteredUsers = filteredUsers.length;
    const startItem =
      totalFilteredUsers === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * USERS_PER_PAGE, totalFilteredUsers);
    const filteredTotalPages = Math.ceil(totalFilteredUsers / USERS_PER_PAGE);

    // ========================
    // HANDLERS
    // ========================

    const openAddModal = () => {
      setModalMode("add");
      setEditingUserId(null);
      setInitialFormData({ ...emptyForm, flowType: "existing" });
      setIsModalOpen(true);
    };

    const openViewModal = async (user: User) => {
      try {
        setViewLoading(true);
        const response = (await userService.getUserById(user.id)) as ApiUser;
        setViewUser(mapApiUserToUser(response));
      } catch {
        // error toast already shown globally by apiCall
      } finally {
        setViewLoading(false);
      }
    };

    const openEditModal = async (user: User) => {
      try {
        setViewLoading(true);
        const response = (await userService.getUserById(user.id)) as ApiUser;
        const firstName =
          response.firstName || response.first_name || response.fname || "";
        const lastName =
          response.lastName || response.last_name || response.lname || "";
        const role =
          typeof response.role === "object"
            ? response.role?.name
            : response.role || response.role_name || "operator";

        const hasCompany = !!(response.company?.id || response.company_id);

        setModalMode("edit");
        setEditingUserId(user.id);
        setInitialFormData({
          firstName,
          lastName,
          email: response.email || "",
          phone:
            response.mobileNumber ||
            response.mobile_number ||
            response.mobile ||
            response.phone ||
            "",
          password: "",
          role: formatRole(role),
          company: response.company?.name || response.company_name || "",
          companyId: response.company?.id || response.company_id || "",
          status: response.status === "active" ? "active" : "inactive",
          flowType: hasCompany ? "existing" : "new_company_admin",
        });

        setIsModalOpen(true);
      } catch {
        // error toast already shown globally by apiCall
      } finally {
        setViewLoading(false);
      }
    };

    const closeModal = () => {
      setIsModalOpen(false);
      setModalMode("add");
      setEditingUserId(null);
      setInitialFormData(emptyForm);
    };

    const handleModalSuccess = async () => {
      closeModal();
      await Promise.all([fetchUsers(), fetchAllUsersForFilters()]);
    };

    const openDeleteModal = (id: string | number) => {
      const selected = allUsers.find((u) => u.id === id);
      if (selected) setDeleteUser(selected);
    };

    const handleConfirmDeleteUser = async () => {
      if (!deleteUser) return;
      try {
        setIsDeleting(true);
        await userService.deleteUser(deleteUser.id);
        setDeleteUser(null);
        await Promise.all([fetchUsers(), fetchAllUsersForFilters()]);
      } catch {
        // success/error toast already shown globally by apiCall
      } finally {
        setIsDeleting(false);
      }
    };

    const clearFilters = () => {
      setSearch("");
      setCompanyFilter(ALL_COMPANIES);
      setRoleFilter(ALL_ROLES);
      setStatusFilter(ALL_STATUS);
      setCurrentPage(1);
    };

    const handleRefresh = async () => {
      await Promise.all([fetchUsers(), fetchAllUsersForFilters()]);
    };

    return (
      <div className="min-h-screen p-5">
        <div className="mt-5 rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#081028]">
          {/* Page Header */}
          <div className="overflow-hidden rounded-t-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6 shadow-lg">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                  Users Administration
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Users Management
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100">
                  Manage platform users, roles, permissions, and account access
                  from one centralized location.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsSuperAdminModalOpen(true)}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
                >
                  + Sub Super Admin
                </button>
                <button
                  onClick={openAddModal}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>

          <UsersFilters
            search={search}
            companyFilter={companyFilter}
            companyOptions={companyOptions}
            roleFilter={roleFilter}
            roleOptions={roleOptions}
            statusFilter={statusFilter}
            onSearchChange={(v) => {
              setSearch(v);
              setCurrentPage(1);
            }}
            onCompanyFilterChange={(v) => {
              setCompanyFilter(v);
              setCurrentPage(1);
            }}
            onRoleFilterChange={(v) => {
              setRoleFilter(v);
              setCurrentPage(1);
            }}
            onStatusFilterChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
            onClearFilters={clearFilters}
          />

          <UsersTable
            users={paginatedUsers}
            loading={loading}
            error={error}
            onView={openViewModal}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={filteredTotalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalFilteredUsers}
            onPrev={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNext={() =>
              setCurrentPage((p) => Math.min(p + 1, filteredTotalPages))
            }
          />
        </div>

        {/* ── Modals ── */}

        <UserModal
          isOpen={isModalOpen}
          mode={modalMode}
          editingUserId={editingUserId}
          initialFormData={initialFormData}
          companies={companies}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />

        <SuperAdminModal
          isOpen={isSuperAdminModalOpen}
          onClose={() => setIsSuperAdminModalOpen(false)}
          onCreated={handleRefresh}
        />

        {viewLoading && <ViewLoadingOverlay />}
        {viewUser && (
          <ViewUserModal user={viewUser} onClose={() => setViewUser(null)} />
        )}
        {deleteUser && (
          <DeleteUserModal
            user={deleteUser}
            onClose={() => {
              if (!isDeleting) setDeleteUser(null);
            }}
            onDelete={handleConfirmDeleteUser}
            isSubmitting={isDeleting}
          />
        )}
      </div>
    );
  }

  // ========================
  // FILTERS BAR
  // ========================

  function UsersFilters({
    search,
    companyFilter,
    companyOptions,
    roleFilter,
    roleOptions,
    statusFilter,
    onSearchChange,
    onCompanyFilterChange,
    onRoleFilterChange,
    onStatusFilterChange,
    onClearFilters,
  }: {
    search: string;
    companyFilter: string;
    companyOptions: string[];
    roleFilter: string;
    roleOptions: string[];
    statusFilter: string;
    onSearchChange: (v: string) => void;
    onCompanyFilterChange: (v: string) => void;
    onRoleFilterChange: (v: string) => void;
    onStatusFilterChange: (v: string) => void;
    onClearFilters: () => void;
  }) {
    const companySelectOptions = companyOptions.map((company) => ({
      label: company,
      value: company,
    }));

    const roleSelectOptions = roleOptions.map((role) => ({
      label: role,
      value: role,
    }));

    const statusSelectOptions = [
      {
        label: ALL_STATUS,
        value: ALL_STATUS,
      },
      {
        label: "Active",
        value: "Active",
      },
      {
        label: "Inactive",
        value: "Inactive",
      },
    ];

    return (
      <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search user, email, phone..."
            className="h-[48px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white lg:max-w-md"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppSelect
              value={companyFilter}
              options={companySelectOptions}
              onChange={onCompanyFilterChange}
              placeholder="All Companies"
              triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
            />

            <AppSelect
              value={roleFilter}
              options={roleSelectOptions}
              onChange={onRoleFilterChange}
              placeholder="All Roles"
              triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
            />

            <AppSelect
              value={statusFilter}
              options={statusSelectOptions}
              onChange={onStatusFilterChange}
              placeholder="All Status"
              triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
            />

            <button
              onClick={onClearFilters}
              className="h-[48px] rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // USERS TABLE
  // ========================

  function UsersTable({
    users,
    loading,
    error,
    onView,
    onEdit,
    onDelete,
  }: {
    users: User[];
    loading: boolean;
    error: string;
    onView: (u: User) => void;
    onEdit: (u: User) => void;
    onDelete: (id: string | number) => void;
  }) {
    if (loading)
      return (
        <div className="flex min-h-[260px] items-center justify-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading users...
          </p>
        </div>
      );

    if (error)
      return (
        <div className="flex min-h-[260px] items-center justify-center">
          <p className="text-sm font-semibold text-red-500 dark:text-red-400">
            {error}
          </p>
        </div>
      );

    if (users.length === 0)
      return (
        <div className="flex min-h-[260px] items-center justify-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No users found.
          </p>
        </div>
      );

    const thClass =
      "px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500";

    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0B1739]/30">
            <tr>
              {[
                "User",
                "Email",
                "Phone",
                "Role",
                "Company",
                "Status",
                "Last Login",
              ].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((user) => (
              <tr
                key={user.id}
                className="transition hover:bg-slate-50 dark:hover:bg-[#0B1739]/40"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-white">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        Joined {user.createdAt}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                  {user.email}
                </td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                  {user.phone}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleClass(user.role)}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                  {user.company}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(user.status)}`}
                  >
                    ● {user.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300">
                  {user.lastLogin}
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(user)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      className="rounded-xl border border-slate-200 p-2 text-blue-600 transition hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-800"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(user.id)}
                      className="rounded-xl border border-slate-200 p-2 text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-slate-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ========================
  // ADD / EDIT USER MODAL — self-contained with RHF + Zod
  // ========================

  type UserModalProps = {
    isOpen: boolean;
    mode: ModalMode;
    editingUserId: string | number | null;
    initialFormData: UserFormData;
    companies: SuperAdminCompany[];
    onClose: () => void;
    onSuccess: () => Promise<void>;
  };

  function UserModal({
    isOpen,
    mode,
    editingUserId,
    initialFormData,
    companies,
    onClose,
    onSuccess,
  }: UserModalProps) {
    const [flowType, setFlowType] = useState<UserFlowType>(
      initialFormData.flowType ?? "existing",
    );
    const [loading, setLoading] = useState(false);

    const isNewCompanyAdmin = flowType === "new_company_admin";

    const activeSchema = isNewCompanyAdmin
      ? newCompanyAdminFormSchema
      : existingUserFormSchema;

    const companySelectOptions = companies.map((company) => ({
      label:
        company.name ||
        company.company_name ||
        company.companyName ||
        "Unnamed Company",
      value: company.id,
    }));

    const roleSelectOptions = [
      { label: "Admin", value: "Admin" },
      { label: "Supervisor", value: "Supervisor" },
      { label: "Artisans", value: "Artisans" },
      { label: "Operator", value: "Operator" },
    ];

    const statusSelectOptions = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    const {
      register,
      handleSubmit,
      reset,
      watch,
      setValue,
      clearErrors,
      formState: { errors, isSubmitting },
    } = useForm<UserFormData>({
      resolver: zodResolver(activeSchema),

      defaultValues: initialFormData,
      mode: "onTouched",
      reValidateMode: "onChange",
      shouldFocusError: true,
    });

    // Reset form every time modal opens with fresh data
    useEffect(() => {
      if (isOpen) {
        setFlowType(initialFormData.flowType ?? "existing");
        reset(initialFormData);
      }
    }, [isOpen, initialFormData, reset]);

    if (!isOpen) return null;

    const isLoading = loading || isSubmitting;

    const switchFlow = (flow: UserFlowType) => {
      setFlowType(flow);
      setValue("flowType", flow);
      setValue("companyId", "");
      setValue("company", "");
      setValue("role", flow === "new_company_admin" ? "Admin" : "Operator");
      clearErrors();
    };

    const onSubmit = async (form: UserFormData) => {
      try {
        setLoading(true);

        if (mode === "add") {
          const payload: AddUserPayload = {
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email.trim(),
            password: form.password?.trim() || "Admin@123",
            mobile_number: form.phone.trim(),
            role_name:
              flowType === "existing"
                ? getApiRoleName(form.role ?? "Operator")
                : "admin",
            company_id: flowType === "existing" ? form.companyId : undefined,
          };

          await userService.addUser(payload);
        } else if (editingUserId) {
          const payload: UpdateUserPayload = {
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email.trim(),
            mobile_number: form.phone.trim(),
            status: form.status,
            role_name:
              flowType === "existing"
                ? getApiRoleName(form.role ?? "Operator")
                : "admin",
            company_id: flowType === "existing" ? form.companyId : undefined,
          };

          await userService.updateUser(editingUserId, payload);
        }

        await onSuccess();
      } catch {
        // success/error toast already shown globally by apiCall
      } finally {
        setLoading(false);
      }
    };

    return (
      <ModalShell
        title={mode === "add" ? "Add New User" : "Edit User"}
        subtitle="Fill in all required user information"
        onClose={onClose}
        disableClose={isLoading}
        footer={
          <ModalFooterButtons
            onCancel={onClose}
            onConfirm={handleSubmit(onSubmit)}
            cancelLabel="Cancel"
            confirmLabel={mode === "add" ? "Add User" : "Update User"}
            loadingLabel={mode === "add" ? "Creating..." : "Updating..."}
            isLoading={isLoading}
          />
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          {/* ── Basic Info ── */}

          <FormField
            label="First Name"
            placeholder="First Name"
            error={errors.firstName?.message}
            disabled={isLoading}
            {...register("firstName", {
              onChange: () => {
                if (errors.firstName) clearErrors("firstName");
              },
            })}
          />

          <FormField
            label="Last Name"
            placeholder="Last Name"
            error={errors.lastName?.message}
            disabled={isLoading}
            {...register("lastName", {
              onChange: () => {
                if (errors.lastName) clearErrors("lastName");
              },
            })}
          />

          <FormField
            label="Email Address"
            type="email"
            placeholder="Email Address"
            error={errors.email?.message}
            disabled={isLoading}
            {...register("email", {
              setValueAs: (v: string) => v.trim().toLowerCase(),
              onChange: () => {
                if (errors.email) clearErrors("email");
              },
            })}
          />

          <PhoneField
            label="Phone Number"
            value={watch("phone")}
            onChange={(value) => {
              setValue("phone", value, {
                shouldValidate: true,
                shouldDirty: true,
              });

              if (errors.phone) {
                clearErrors("phone");
              }
            }}
            error={errors.phone?.message}
            disabled={isLoading}
            defaultCountry="ZA"
          />

          {/* ── Flow Selector (add mode only) ── */}
          {mode === "add" && (
            <div className="md:col-span-2">
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                User Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Existing Company */}
                <button
                  type="button"
                  onClick={() => switchFlow("existing")}
                  disabled={isLoading}
                  className={`flex flex-col gap-1.5 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    !isNewCompanyAdmin
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-[#0B1739] dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${!isNewCompanyAdmin ? "border-blue-500" : "border-slate-400 dark:border-slate-500"}`}
                    >
                      {!isNewCompanyAdmin && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold ${!isNewCompanyAdmin ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      Existing Company
                    </span>
                  </div>
                  <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
                    Assign user to an already registered company. Select company &
                    role below.
                  </p>
                </button>

                {/* New Company Admin */}
                <button
                  type="button"
                  onClick={() => switchFlow("new_company_admin")}
                  disabled={isLoading}
                  className={`flex flex-col gap-1.5 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    isNewCompanyAdmin
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-[#0B1739] dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${isNewCompanyAdmin ? "border-blue-500" : "border-slate-400 dark:border-slate-500"}`}
                    >
                      {isNewCompanyAdmin && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold ${isNewCompanyAdmin ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      New Company Admin
                    </span>
                  </div>
                  <p className="ml-6 text-xs text-slate-500 dark:text-slate-400">
                    Create an Admin who will register their company & purchase a
                    plan independently.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* ── Company Selector (existing flow only) ── */}
          {!isNewCompanyAdmin && (
            <div>
              <AppSelect
                label="Company"
                value={watch("companyId") || ""}
                options={companySelectOptions}
                onChange={(value) => {
                  const selectedCompany = companies.find((c) => c.id === value);
                  setValue("companyId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setValue(
                    "company",
                    selectedCompany?.name ||
                      selectedCompany?.company_name ||
                      selectedCompany?.companyName ||
                      "",
                    {
                      shouldValidate: true,
                      shouldDirty: true,
                    },
                  );
                  if (errors.companyId) clearErrors("companyId");
                }}
                placeholder="Select Company"
                error={Boolean(errors.companyId)}
                errorMessage={errors.companyId?.message}
                disabled={isLoading}
                triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
              />
            </div>
          )}

          {/* ── New Company Admin info banner ── */}
          {isNewCompanyAdmin && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10 md:col-span-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                ℹ️ No company required
              </p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-300">
                This Admin account will be created without a company. They can
                register their company and purchase a plan after logging in.
              </p>
            </div>
          )}

          {/* ── Role ── */}
          {isNewCompanyAdmin ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Role
              </label>
              <input
                readOnly
                value="Admin"
                className="h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>
          ) : (
            <AppSelect
              label="Role"
              value={watch("role") || "Operator"}
              options={roleSelectOptions}
              onChange={(value) => {
                setValue("role", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                if (errors.role) clearErrors("role");
              }}
              placeholder="Select Role"
              error={Boolean(errors.role)}
              errorMessage={errors.role?.message}
              disabled={isLoading}
              triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
            />
          )}

          {/* ── Status ── */}
          <AppSelect
            label="Status"
            value={watch("status") || "active"}
            options={statusSelectOptions}
            onChange={(value) => {
              setValue("status", value as UserStatus, {
                shouldValidate: true,
                shouldDirty: true,
              });
              if (errors.status) clearErrors("status");
            }}
            placeholder="Select Status"
            error={Boolean(errors.status)}
            errorMessage={errors.status?.message}
            disabled={isLoading}
            triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
          />

          {/* ── Password (add mode only) ── */}
          {mode === "add" && (
            <FormField
              label="Password"
              type="password"
              placeholder="Password (default: Admin@123)"
              error={errors.password?.message}
              disabled={isLoading}
              {...register("password", {
                onChange: () => {
                  if (errors.password) clearErrors("password");
                },
              })}
            />
          )}
        </div>
      </ModalShell>
    );
  }

  // ========================
  // CREATE SUPER ADMIN MODAL
  // ========================

  function SuperAdminModal({
    isOpen,
    onClose,
    onCreated,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
  }) {
    const [loading, setLoading] = useState(false);

    const statusSelectOptions = [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    const {
      register,
      handleSubmit,
      reset,
      watch,
      setValue,
      clearErrors,
      formState: { errors, isSubmitting },
    } = useForm<SuperAdminFormData>({
      resolver: zodResolver(superAdminFormSchema),
      defaultValues: emptySuperAdminForm,
      mode: "onTouched",
      reValidateMode: "onChange",
      shouldFocusError: true,
    });

    useEffect(() => {
      if (isOpen) reset(emptySuperAdminForm);
    }, [isOpen, reset]);

    if (!isOpen) return null;

    const onSubmit = async (form: SuperAdminFormData) => {
      try {
        setLoading(true);
        const payload = {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email.trim(),
          mobile_number: form.phone.trim(),
          password: form.password.trim(),
          role_name: "super_admin",
          status: form.status,
        };
        await userService.addUser(payload);
        onClose();
        onCreated();
      } catch {
        // success/error toast already shown globally by apiCall
      } finally {
        setLoading(false);
      }
    };

    const isLoading = loading || isSubmitting;

    return (
      <ModalShell
        title="Create Sub Super Admin"
        subtitle="Create a new platform administrator — no company required"
        onClose={onClose}
        disableClose={isLoading}
        footer={
          <ModalFooterButtons
            onCancel={onClose}
            onConfirm={handleSubmit(onSubmit)}
            cancelLabel="Cancel"
            confirmLabel="Create Sub Super Admin"
            loadingLabel="Creating..."
            isLoading={isLoading}
          />
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            label="First Name"
            placeholder="First Name"
            error={errors.firstName?.message}
            disabled={isLoading}
            {...register("firstName", {
              onChange: () => {
                if (errors.firstName) clearErrors("firstName");
              },
            })}
          />

          <FormField
            label="Last Name"
            placeholder="Last Name"
            error={errors.lastName?.message}
            disabled={isLoading}
            {...register("lastName", {
              onChange: () => {
                if (errors.lastName) clearErrors("lastName");
              },
            })}
          />
          <FormField
            label="Email Address"
            type="email"
            placeholder="Email Address"
            error={errors.email?.message}
            disabled={isLoading}
            {...register("email", {
              setValueAs: (v: string) => v.trim().toLowerCase(),
              onChange: () => {
                if (errors.email) clearErrors("email");
              },
            })}
          />

          <PhoneField
            label="Phone Number"
            value={watch("phone")}
            onChange={(value) => {
              setValue("phone", value, {
                shouldValidate: true,
                shouldDirty: true,
              });

              if (errors.phone) {
                clearErrors("phone");
              }
            }}
            error={errors.phone?.message}
            disabled={isLoading}
            defaultCountry="ZA"
          />

          <AppSelect
            label="Status"
            value={watch("status") || "active"}
            options={statusSelectOptions}
            onChange={(value) => {
              setValue("status", value as UserStatus, {
                shouldValidate: true,
                shouldDirty: true,
              });

              if (errors.status) {
                clearErrors("status");
              }
            }}
            placeholder="Select Status"
            error={Boolean(errors.status)}
            errorMessage={errors.status?.message}
            disabled={isLoading}
            triggerClassName="h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#0B1739] dark:text-white"
          />

          <FormField
            label="Password"
            type="password"
            placeholder="Password (min. 8 characters)"
            error={errors.password?.message}
            disabled={isLoading}
            {...register("password", {
              onChange: () => {
                if (errors.password) clearErrors("password");
              },
            })}
          />

          <FormField
            label="Confirm Password"
            type="password"
            placeholder="Confirm Password"
            error={errors.confirmPassword?.message}
            disabled={isLoading}
            {...register("confirmPassword", {
              onChange: () => {
                if (errors.confirmPassword) clearErrors("confirmPassword");
              },
            })}
          />
        </div>
      </ModalShell>
    );
  }

  // ========================
  // VIEW USER MODAL
  // ========================

  function ViewUserModal({
    user,
    onClose,
  }: {
    user: ExtendedUser;
    onClose: () => void;
  }) {
    return (
      <ModalShell
        title="User Details"
        subtitle="View complete user information"
        onClose={onClose}
        footer={
          <ModalFooterButtons
            onCancel={onClose}
            cancelLabel="Close"
            confirmLabel=""
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <DetailRow label="Full Name" value={user.name} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone} />
          <DetailRow label="Role" value={user.role} />
          <DetailRow label="Company" value={user.company} />
          <DetailRow label="Company Code" value={user.companyCode || "—"} />
          <DetailRow label="Status" value={user.status} />
          <DetailRow label="Last Login" value={user.lastLogin} />
          <DetailRow label="Created At" value={user.createdAt} />
          <DetailRow label="Updated At" value={user.updatedAt || "—"} />
        </div>
      </ModalShell>
    );
  }

  // ========================
  // DELETE CONFIRM MODAL
  // ========================

  function DeleteUserModal({
    user,
    onClose,
    onDelete,
    isSubmitting,
  }: {
    user: ExtendedUser;
    onClose: () => void;
    onDelete: () => void;
    isSubmitting: boolean;
  }) {
    return (
      <ModalShell
        title="Delete User"
        subtitle="This action cannot be undone."
        onClose={onClose}
        disableClose={isSubmitting}
        footer={
          <ModalFooterButtons
            onCancel={onClose}
            onConfirm={onDelete}
            cancelLabel="Cancel"
            confirmLabel="Delete"
            loadingLabel="Deleting..."
            isLoading={isSubmitting}
            confirmVariant="danger"
          />
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Are you sure you want to permanently delete{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            {user.name}
          </span>
          ?
        </p>
      </ModalShell>
    );
  }

  // ========================
  // LOADING OVERLAY
  // ========================

  function ViewLoadingOverlay() {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-[24px] border border-slate-200 bg-white px-8 py-6 text-sm font-semibold text-slate-700 shadow-2xl dark:border-slate-800 dark:bg-[#081028] dark:text-white">
          Loading user details...
        </div>
      </div>
    );
  }

  // DETAIL ROW (View modal)

  function DetailRow({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0B1739]">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    );
  }
