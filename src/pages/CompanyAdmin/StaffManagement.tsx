import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { CardSkeleton, TableSkeleton } from "../../components/common/Skeleton";
import AppSelect from "../../components/ui/dropdown/AppSelect";

import { createPortal } from "react-dom";
import { z } from "zod";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import PhoneField from "../../components/common/PhoneField";
import Pagination from "../../components/common/Pagination";
import {
  userService,
  type ApiRole,
  type ApiUser,
} from "../../services/userService";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

type Staff = {
  id: string | number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleId?: number | string;
  companyId?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  joinedAt: string;
  isActive: boolean;
};

type StaffFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobileNumber: string;
  roleName: string;
  companyId: string;
  isActive: boolean;
};

type FormErrors = Partial<Record<keyof StaffFormData, string>>;

type UsersApiResponse =
  | ApiUser[]
  | {
      users?: ApiUser[];
      data?: ApiUser[] | { users?: ApiUser[]; data?: ApiUser[] };
      results?: ApiUser[];
      message?: string;
    };

type RolesApiResponse =
  | ApiRole[]
  | {
      roles?: ApiRole[];
      data?: ApiRole[] | { roles?: ApiRole[]; data?: ApiRole[] };
      results?: ApiRole[];
      message?: string;
    };

type UserDetailApiResponse =
  | ApiUser
  | {
      user?: ApiUser;
      data?: ApiUser | { user?: ApiUser };
      message?: string;
    };

const perPage = 5;

const roleLabelMap: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  engineer: "Engineer",
  operator: "Operator",
};

const emptyForm: StaffFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  mobileNumber: "",
  roleName: "",
  companyId: "",
  isActive: true,
};

const addStaffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .regex(/^[A-Za-z\s]+$/, "First name can contain only alphabets"),

  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[A-Za-z\s]+$/, "Last name can contain only alphabets"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(100, "Email cannot exceed 100 characters")
    .email("Enter a valid email address"),

  password: z
    .string()
    .trim()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(30, "Password cannot exceed 30 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,30}$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),

  mobileNumber: z.string().trim().min(1, "Phone number is required"),

  roleName: z.string().trim().min(1, "Role is required"),

  companyId: z.string().trim().min(1, "Company is required"),

  isActive: z.boolean().optional(),
});
const editStaffSchema = addStaffSchema.omit({ password: true }).extend({
  password: z.string().optional(),
});

const normalizeRoleName = (role?: string) => {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
};

const formatDateTime = (date?: string) => {
  if (!date) return "Recently Added";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Recently Added";

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatRole = (role?: string) => {
  const normalizedRole = normalizeRoleName(role);

  if (roleLabelMap[normalizedRole]) {
    return roleLabelMap[normalizedRole];
  }

  if (!role) return "Viewer";

  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRoleName = (user: ApiUser) => {
  if (typeof user.role === "object" && user.role !== null) {
    return user.role?.name || user.role_name || "viewer";
  }

  return user.role_name || user.role || "viewer";
};

const mapApiUserToStaff = (user: ApiUser): Staff => {
  const firstName = user.firstName || user.first_name || user.fname || "";
  const lastName = user.lastName || user.last_name || user.lname || "";
  const fullName = user.name || `${firstName} ${lastName}`.trim();

  return {
    id: user.id,
    firstName,
    lastName,
    name: fullName || "Unknown Staff",
    email: user.email || "—",
    phone:
      user.mobileNumber ||
      user.mobile_number ||
      user.mobile ||
      user.phone ||
      "—",
    role: getRoleName(user),
    roleId: user.role_id,
    companyId: user.company_id,
    createdAt: user.created_at || user.createdAt,
    updatedAt: user.updated_at || user.updatedAt,
    joinedAt: formatDateTime(user.created_at || user.createdAt),
    isActive:
      (user as any).isActive !== undefined
        ? (user as any).isActive
        : user.is_active !== undefined
          ? user.is_active
          : true,
  };
};

const extractUsers = (response: UsersApiResponse): ApiUser[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    typeof response.data === "object" &&
    Array.isArray(response.data.users)
  ) {
    return response.data.users;
  }

  if (
    response.data &&
    typeof response.data === "object" &&
    Array.isArray(response.data.data)
  ) {
    return response.data.data;
  }

  return [];
};

const extractRoles = (response: RolesApiResponse): ApiRole[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.roles)) return response.roles;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;

  if (
    response.data &&
    typeof response.data === "object" &&
    Array.isArray(response.data.roles)
  ) {
    return response.data.roles;
  }

  if (
    response.data &&
    typeof response.data === "object" &&
    Array.isArray(response.data.data)
  ) {
    return response.data.data;
  }

  return [];
};

const getUniqueRoles = (roles: ApiRole[]) => {
  const roleMap = new Map<string, ApiRole>();

  roles.forEach((role) => {
    if (!role?.name) return;

    const key = normalizeRoleName(role.name);

    if (!roleMap.has(key)) {
      roleMap.set(key, role);
    }
  });

  return Array.from(roleMap.values());
};

const extractUserDetail = (response: UserDetailApiResponse): ApiUser | null => {
  if ("id" in response) return response;
  if (response.user) return response.user;
  if (response.data && "id" in response.data) return response.data;

  if (
    response.data &&
    typeof response.data === "object" &&
    "user" in response.data &&
    response.data.user
  ) {
    return response.data.user;
  }

  return null;
};

const getApiErrorMessage = (err: unknown) => {
  if (err instanceof Error && err.message) {
    const msg = err.message.toLowerCase();

    if (
      msg.includes("duplicate") ||
      msg.includes("already") ||
      msg.includes("email")
    ) {
      return "Email already exists. Please use another email.";
    }

    return err.message;
  }

  return "Something went wrong";
};

const getCompanyIdFromToken = () => {
  try {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);
    if (!token) return "";

    const payload = JSON.parse(atob(token.split(".")[1]));

    return payload.company_id || payload.companyId || payload.company?.id || "";
  } catch {
    return "";
  }
};

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const getRoleTone = (role?: string) => {
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole.includes("super")) {
    return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300";
  }

  if (normalizedRole.includes("admin")) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
  }

  if (normalizedRole.includes("engineer")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (normalizedRole.includes("operator")) {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState<StaffFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [subscription, setSubscription] = useState<any>(null);

  const isAnyModalOpen =
    isAddOpen || !!editStaff || !!deleteStaff || !!viewStaff || viewLoading;

  useEffect(() => {
    document.body.style.overflow = isAnyModalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const filteredRoles = useMemo(() => {
    const allowedRoles = ["admin", "supervisor", "artisans", "operator"];

    return getUniqueRoles(roles).filter((role) =>
      allowedRoles.includes(normalizeRoleName(role.name)),
    );
  }, [roles]);

  const roleFilterOptions = [
    {
      label: "All Roles",
      value: "All",
    },
    ...filteredRoles.map((role) => ({
      label: formatRole(role.name),
      value: normalizeRoleName(role.name),
    })),
  ];

  const getExactRoleName = (roleName: string) => {
    const selectedRole = filteredRoles.find(
      (role) => normalizeRoleName(role.name) === normalizeRoleName(roleName),
    );

    return selectedRole?.name || roleName;
  };

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);

      const response = (await userService.getRoles()) as RolesApiResponse;
      const rolesArray = getUniqueRoles(extractRoles(response));

      setRoles(rolesArray);

      setFormData((prev) => ({
        ...prev,
        roleName: prev.roleName || rolesArray[0]?.name || "",
      }));
    } catch (err) {
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = (await userService.getUsers({
        limit: 1000,
      })) as UsersApiResponse;

      const usersArray = extractUsers(response);

      const allowedRoles = ["admin", "supervisor", "artisans", "operator"];

      const mappedStaff = usersArray
        .filter((user) => {
          const roleName =
            typeof user.role === "object"
              ? user.role?.name
              : user.role_name || user.role;

          return allowedRoles.includes(normalizeRoleName(roleName));
        })
        .map(mapApiUserToStaff);

      setStaffList(mappedStaff);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      if (typeof userService.getActiveSubscription !== "function") return;

      const response = await userService.getActiveSubscription();
      setSubscription(response);
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchStaffUsers();
    fetchSubscription();
  }, []);

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const searchText = search.trim().toLowerCase();

      const matchSearch =
        !searchText ||
        staff.name.toLowerCase().includes(searchText) ||
        staff.email.toLowerCase().includes(searchText) ||
        staff.phone.toLowerCase().includes(searchText) ||
        formatRole(staff.role).toLowerCase().includes(searchText);

      const staffRole = normalizeRoleName(staff.role);
      const selectedRole = normalizeRoleName(roleFilter);

      const matchRole = roleFilter === "All" || staffRole === selectedRole;

      return matchSearch && matchRole;
    });
  }, [staffList, search, roleFilter]);

  const totalItems = filteredStaff.length;
  const totalPages = Math.max(Math.ceil(totalItems / perPage), 1);

  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  const activeStaffCount = useMemo(() => {
    return staffList.filter((staff) => staff.isActive).length;
  }, [staffList]);

  const inactiveStaffCount = useMemo(() => {
    return staffList.filter((staff) => !staff.isActive).length;
  }, [staffList]);

  const roleCount = useMemo(() => {
    return new Set(staffList.map((staff) => normalizeRoleName(staff.role)))
      .size;
  }, [staffList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    if (totalItems > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, totalItems]);

  function openAddModal() {
    setFormErrors({});

    setFormData({
      ...emptyForm,
      roleName: filteredRoles[0]?.name || "",
      companyId: getCompanyIdFromToken(),
    });

    setIsAddOpen(true);
  }

  async function openViewModal(staff: Staff) {
    try {
      setViewLoading(true);
      setViewStaff(null);

      const response = (await userService.getUserById(
        staff.id,
      )) as UserDetailApiResponse;

      const userDetail = extractUserDetail(response);

      if (!userDetail) {
        throw new Error("Staff detail not found");
      }

      setViewStaff(mapApiUserToStaff(userDetail));
    } catch (err) {
    } finally {
      setViewLoading(false);
    }
  }

  function openEditModal(staff: Staff) {
    setFormErrors({});
    setEditStaff(staff);

    setFormData({
      firstName: staff.firstName || staff.name.split(" ")[0] || "",
      lastName:
        staff.lastName || staff.name.split(" ").slice(1).join(" ") || "",
      email: staff.email === "—" ? "" : staff.email,
      password: "",
      mobileNumber: staff.phone === "—" ? "" : staff.phone,
      roleName: getExactRoleName(staff.role),
      companyId: staff.companyId
        ? String(staff.companyId)
        : getCompanyIdFromToken(),
      isActive: staff.isActive,
    });
  }

  function closeFormModal() {
    if (isSubmitting) return;

    setIsAddOpen(false);
    setEditStaff(null);
    setFormData(emptyForm);
    setFormErrors({});
  }

  const validateForm = () => {
    const schema = editStaff ? editStaffSchema : addStaffSchema;
    const result = schema.safeParse(formData);

    if (result.success) {
      setFormErrors({});
      return true;
    }

    const errors: FormErrors = {};

    result.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof StaffFormData;
      errors[key] = issue.message;
    });

    setFormErrors(errors);
    return false;
  };

  async function handleSubmitStaff() {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const exactRoleName = getExactRoleName(formData.roleName);

      if (editStaff) {
        const result: any = await userService.updateUser(editStaff.id, {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile_number: formData.mobileNumber.trim(),
          role_name: exactRoleName,
          company_id: formData.companyId.trim(),
          is_active: formData.isActive,
        } as any);

        if (result?.offline || result?.queued) {
          setStaffList((prev) =>
            prev.map((staff) =>
              staff.id === editStaff.id
                ? {
                    ...staff,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    name: `${formData.firstName} ${formData.lastName}`,
                    email: formData.email,
                    phone: formData.mobileNumber,
                    role: exactRoleName,
                    isActive: formData.isActive,
                  }
                : staff,
            ),
          );
        } else {
          await fetchStaffUsers();
        }

        setEditStaff(null);
        setFormData(emptyForm);
        setFormErrors({});
        return;
      }

      const result: any = await userService.addUser({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        mobile_number: formData.mobileNumber.trim(),
        role_name: exactRoleName,
        company_id: formData.companyId.trim(),
        is_active: formData.isActive,
      } as any);

      if (result?.offline || result?.queued) {
        const offlineStaff = {
          id: `offline-${Date.now()}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.mobileNumber,
          role: exactRoleName,
          companyId: formData.companyId,
          joinedAt: "Just Now",
          isActive: formData.isActive,
        };

        setStaffList((prev) => [offlineStaff, ...prev]);
      } else {
        await fetchStaffUsers();
      }

      setCurrentPage(1);
      setIsAddOpen(false);
      setFormData(emptyForm);
      setFormErrors({});
    } catch (err) {
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStaff() {
    if (!deleteStaff) return;

    try {
      setIsSubmitting(true);

      const result: any = await userService.deleteUser(deleteStaff.id);

      if (result?.offline || result?.queued) {
        setStaffList((prev) =>
          prev.filter((staff) => staff.id !== deleteStaff.id),
        );
      } else {
        await fetchStaffUsers();
      }

      setDeleteStaff(null);
      setCurrentPage(1);
    } catch (err) {
    } finally {
      setIsSubmitting(false);
    }
  }

  const isStaffLimitReached =
    subscription &&
    subscription.staff_limit !== null &&
    subscription.staff_limit !== undefined &&
    staffList.length >= Number(subscription.staff_limit);

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 dark:bg-[#07111f] dark:text-white sm:p-6 lg:p-8">
      <style>{`
        .hme-hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .hme-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-[#3B37E6] via-[#3730D9] to-[#2E2AD9] px-6 py-6 dark:border-slate-700 dark:from-[#1E3A8A] dark:via-[#1D4ED8] dark:to-[#2563EB]">
            {/* Decorative Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              {/* Left Section */}
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  <ShieldCheck size={14} />
                  Company Staff Control
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Staff Management
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Manage company staff, user roles, contact details and active
                  access status from connected backend APIs.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Add Staff */}
                <button
                  onClick={openAddModal}
                  disabled={isStaffLimitReached}
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-white px-5 text-sm font-bold text-[#3730D9] shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white sm:w-fit dark:border-slate-600 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
                >
                  <Plus size={18} strokeWidth={2.4} />
                  Add Staff
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<Users size={20} />}
                title="Total Staff"
                value={`${staffList.length}`}
                description="All company users"
              />

              <MetricCard
                icon={<CheckCircle2 size={20} />}
                title="Active Staff"
                value={`${activeStaffCount}`}
                description="Currently active users"
              />

              <MetricCard
                icon={<XCircle size={20} />}
                title="Inactive Staff"
                value={`${inactiveStaffCount}`}
                description="Disabled access"
              />

              <MetricCard
                icon={<ShieldCheck size={20} />}
                title="Roles Used"
                value={`${roleCount}`}
                description="Mapped role groups"
              />
            </div>
          )}
        </div>

        {isStaffLimitReached && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
            Staff limit reached for your active subscription. Upgrade the plan
            or remove an existing staff member before adding a new one.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1728]">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Company Staff Registry
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Search, filter and maintain staff records without changing the
                existing API integration.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center lg:justify-end">
              <div className="relative w-full lg:w-80">
                <Search
                  size={17}
                  strokeWidth={2.4}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, mobile, role..."
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500"
                />
              </div>

              <AppSelect
                value={roleFilter}
                options={roleFilterOptions}
                onChange={setRoleFilter}
                placeholder="All Roles"
                triggerClassName="h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto hme-hide-scrollbar">
            <table className="hidden w-full min-w-[1050px] border-collapse text-left md:table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                  <th className="w-20 px-6 py-4 font-bold">#</th>
                  <th className="px-6 py-4 font-bold">Staff</th>
                  <th className="px-6 py-4 font-bold">Mobile</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Created At</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <TableSkeleton rows={6} />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <ErrorState message={error} />
                    </td>
                  </tr>
                ) : paginatedStaff.length > 0 ? (
                  paginatedStaff.map((staff, index) => (
                    <tr
                      key={staff.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4 text-sm font-extrabold text-slate-500 dark:text-slate-400">
                        {(currentPage - 1) * perPage + index + 1}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-extrabold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                            {getInitials(staff.name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
                              {staff.name}
                            </p>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {staff.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {staff.phone}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getRoleTone(
                            staff.role,
                          )}`}
                        >
                          {formatRole(staff.role)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge active={staff.isActive} />
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {staff.joinedAt}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton
                            title="View Staff Details"
                            onClick={() => openViewModal(staff)}
                            tone="view"
                          >
                            <Eye size={15} strokeWidth={2.4} />
                          </ActionButton>

                          <ActionButton
                            title="Edit Staff"
                            onClick={() => openEditModal(staff)}
                            tone="edit"
                          >
                            <Pencil size={15} strokeWidth={2.4} />
                          </ActionButton>

                          <ActionButton
                            title="Delete Staff"
                            onClick={() => setDeleteStaff(staff)}
                            tone="delete"
                          >
                            <Trash2 size={15} strokeWidth={2.4} />
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <EmptyState search={search} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="grid gap-3 p-4 md:hidden">
              {loading ? (
                <LoadingState message="Loading staff records..." />
              ) : error ? (
                <ErrorState message={error} />
              ) : paginatedStaff.length > 0 ? (
                paginatedStaff.map((staff) => (
                  <MobileStaffCard
                    key={staff.id}
                    staff={staff}
                    onView={() => openViewModal(staff)}
                    onEdit={() => openEditModal(staff)}
                    onDelete={() => setDeleteStaff(staff)}
                  />
                ))
              ) : (
                <EmptyState search={search} />
              )}
            </div>
          </div>

          {!loading && !error && totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalItems={totalItems}
              onPrev={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            />
          )}
        </section>
      </div>

      {(isAddOpen || editStaff) && (
        <Modal
          title={isAddOpen ? "Add New Staff" : "Edit Staff"}
          subtitle={
            isAddOpen
              ? "Create a staff account with role and company mapping."
              : "Update staff profile, role and active status."
          }
          onClose={closeFormModal}
          maxWidth="max-w-3xl"
        >
          <StaffForm
            formData={formData}
            setFormData={setFormData}
            errors={formErrors}
            setErrors={setFormErrors}
            roles={filteredRoles}
            rolesLoading={rolesLoading}
            isEdit={Boolean(editStaff)}
          />

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
            <button
              onClick={closeFormModal}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b]"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmitStaff}
              disabled={
                isSubmitting || rolesLoading || filteredRoles.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              {isSubmitting
                ? "Saving..."
                : isAddOpen
                  ? "Add Staff"
                  : "Update Staff"}
            </button>
          </div>
        </Modal>
      )}

      {viewLoading && (
        <Modal
          title="View Staff"
          subtitle="Fetching latest staff details from API."
          onClose={() => setViewLoading(false)}
          maxWidth="max-w-2xl"
        >
          <LoadingState message="Loading staff details..." />
        </Modal>
      )}

      {viewStaff && !viewLoading && (
        <Modal
          title="Staff Details"
          subtitle="Complete staff profile and company access details."
          onClose={() => setViewStaff(null)}
          maxWidth="max-w-3xl"
        >
          <div className="mb-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#101f33] sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-lg font-extrabold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              {getInitials(viewStaff.name)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-slate-950 dark:text-white">
                {viewStaff.name}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {viewStaff.email} • {viewStaff.phone}
              </p>
            </div>

            <span
              className={`inline-flex w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${getRoleTone(
                viewStaff.role,
              )}`}
            >
              {formatRole(viewStaff.role)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Staff ID" value={viewStaff.id} />
            <Info label="First Name" value={viewStaff.firstName || "—"} />
            <Info label="Last Name" value={viewStaff.lastName || "—"} />
            <Info label="Email" value={viewStaff.email} />
            <Info label="Mobile Number" value={viewStaff.phone} />
            <Info label="Role" value={formatRole(viewStaff.role)} />
            <Info label="Role ID" value={viewStaff.roleId || "—"} />
            <Info label="Company ID" value={viewStaff.companyId || "—"} />
            <Info
              label="Status"
              value={viewStaff.isActive ? "Active" : "Inactive"}
            />
            <Info
              label="Created At"
              value={formatDateTime(viewStaff.createdAt)}
            />
            <Info
              label="Updated At"
              value={formatDateTime(viewStaff.updatedAt)}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setViewStaff(null)}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {deleteStaff && (
        <DeleteStaffModal
          staff={deleteStaff}
          deleting={isSubmitting}
          onCancel={() => setDeleteStaff(null)}
          onConfirm={handleDeleteStaff}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-[#101f33] dark:hover:border-blue-500/50 dark:hover:bg-[#12243b]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition group-hover:scale-105 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <h3 className="mt-2 truncate text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
        {value}
      </h3>

      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  tone: "view" | "edit" | "delete";
}) {
  const toneClass = {
    view: "border-blue-200 bg-white text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
    edit: "border-orange-200 bg-white text-orange-700 hover:bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20",
    delete:
      "border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${toneClass[tone]}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      Inactive
    </span>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        <Loader2 className="animate-spin" size={24} />
      </div>

      <p className="text-sm font-extrabold tracking-tight text-slate-700 dark:text-slate-300">
        {message}
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <AlertTriangle size={24} strokeWidth={2.4} />
      </div>

      <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
        Failed to load staff
      </h3>

      <p className="mt-1 max-w-md text-sm font-medium leading-6 text-red-500 dark:text-red-300">
        {message}
      </p>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        <AlertTriangle size={24} strokeWidth={2.4} />
      </div>

      <h3 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
        No staff found
      </h3>

      <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
        {search.trim()
          ? "Aapke search ya role filter ke liye koi staff record nahi mila. Dusra search term try karein."
          : "Abhi staff API se koi data nahi mila. Add Staff button se new staff create kar sakte hain."}
      </p>
    </div>
  );
}

function MobileStaffCard({
  staff,
  onView,
  onEdit,
  onDelete,
}: {
  staff: Staff;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#101f33]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-extrabold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          {getInitials(staff.name)}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
            {staff.name}
          </h3>

          <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {staff.email}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${getRoleTone(
                staff.role,
              )}`}
            >
              {formatRole(staff.role)}
            </span>

            <StatusBadge active={staff.isActive} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="font-bold text-slate-500 dark:text-slate-400">
            Mobile
          </span>
          <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
            {staff.phone}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="font-bold text-slate-500 dark:text-slate-400">
            Created
          </span>
          <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
            {staff.joinedAt}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <ActionButton title="View Staff Details" onClick={onView} tone="view">
          <Eye size={15} strokeWidth={2.4} />
        </ActionButton>

        <ActionButton title="Edit Staff" onClick={onEdit} tone="edit">
          <Pencil size={15} strokeWidth={2.4} />
        </ActionButton>

        <ActionButton title="Delete Staff" onClick={onDelete} tone="delete">
          <Trash2 size={15} strokeWidth={2.4} />
        </ActionButton>
      </div>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = "max-w-3xl",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]`}
      >
        <div className="flex items-center justify-between rounded-t-2xl border-b border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm font-medium text-blue-100">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-86px)] overflow-y-auto p-5 hme-hide-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#101f33]">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function StaffForm({
  formData,
  setFormData,
  errors,
  setErrors,
  roles,
  rolesLoading,
  isEdit,
}: {
  formData: StaffFormData;
  setFormData: Dispatch<SetStateAction<StaffFormData>>;
  errors: FormErrors;
  setErrors: Dispatch<SetStateAction<FormErrors>>;
  roles: ApiRole[];
  rolesLoading: boolean;
  isEdit: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field: keyof StaffFormData, value: string | boolean) => {
    const updatedData = {
      ...formData,
      [field]: value,
    };

    setFormData(updatedData);

    // Phone ko skip karo
    if (field === "mobileNumber") {
      setErrors((prev) => ({
        ...prev,
        mobileNumber: undefined,
      }));
      return;
    }

    const schema = addStaffSchema;

    const result = schema.safeParse(updatedData);

    if (result.success) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
      return;
    }

    const issue = result.error.issues.find((err) => err.path[0] === field);

    setErrors((prev) => ({
      ...prev,
      [field]: issue?.message,
    }));
  };

  const roleOptions = roles.map((role) => ({
    label: formatRole(role.name),
    value: role.name,
  }));

  const statusOptions = [
    {
      label: "Active",
      value: "true",
    },
    {
      label: "Inactive",
      value: "false",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="First Name"
        value={formData.firstName}
        error={errors.firstName}
        placeholder="e.g. neoapp"
        onChange={(value) => updateField("firstName", value)}
      />

      <Input
        label="Last Name"
        value={formData.lastName}
        error={errors.lastName}
        placeholder="e.g. Kumar"
        onChange={(value) => updateField("lastName", value)}
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        error={errors.email}
        placeholder="e.g. rahul@gmail.com"
        onChange={(value) => updateField("email", value)}
      />

      <PhoneField
        label="Mobile Number"
        required
        value={formData.mobileNumber}
        error={errors.mobileNumber}
        onChange={(value) => updateField("mobileNumber", value)}
      />

      {!isEdit && (
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Password
          </label>

          <div className="relative">
            <input
              value={formData.password}
              type={showPassword ? "text" : "password"}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Create password"
              className={`h-11 w-full rounded-lg border bg-white px-4 pr-11 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500 ${
                errors.password
                  ? "border-red-400"
                  : "border-slate-300 dark:border-slate-700"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="mt-1 h-5">
            <p
              className={`text-xs font-semibold transition-opacity duration-200 ${
                errors.password ? "opacity-100 text-red-500" : "opacity-0"
              }`}
            >
              {errors.password || " "}
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Role Name
        </label>

        <AppSelect
          value={formData.roleName}
          options={roleOptions}
          onChange={(value) => updateField("roleName", value)}
          placeholder={
            rolesLoading
              ? "Loading roles..."
              : roles.length === 0
                ? "No roles found"
                : "Select Role"
          }
          disabled={rolesLoading || roles.length === 0}
          triggerClassName={`h-11 w-full rounded-lg border bg-white px-6 text-sm font-semibold text-slate-600 dark:bg-[#101f33] dark:text-white ${
            errors.roleName
              ? "border-red-400"
              : "border-slate-300 dark:border-slate-700"
          }`}
        />

        <div className="mt-1 h-5">
          <p
            className={`text-xs font-semibold transition-opacity duration-200 ${
              errors.roleName ? "opacity-100 text-red-500" : "opacity-0"
            }`}
          >
            {errors.roleName || " "}
          </p>
        </div>
      </div>

      {isEdit && (
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Status
          </label>

          <AppSelect
            value={formData.isActive ? "true" : "false"}
            options={statusOptions}
            onChange={(value) => updateField("isActive", value === "true")}
            triggerClassName="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-[#101f33] dark:text-white"
          />
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  type = "text",
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 w-full rounded-lg border bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:bg-[#101f33] dark:text-white dark:focus:border-blue-500 ${
          error ? "border-red-400" : "border-slate-300 dark:border-slate-700"
        }`}
      />

      <div className="mt-1 h-5">
        <p
          className={`text-xs font-semibold transition-opacity duration-200 ${
            error ? "opacity-100 text-red-500" : "opacity-0"
          }`}
        >
          {error || " "}
        </p>
      </div>
    </div>
  );
}

function DeleteStaffModal({
  staff,
  deleting,
  onCancel,
  onConfirm,
}: {
  staff: Staff;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl dark:bg-[#0b1728]">
        <div className="border-b border-slate-200 bg-slate-950 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
              <Trash2 size={22} strokeWidth={2.4} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white">
                Delete Staff?
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-300">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-extrabold text-slate-950 dark:text-white">
              {staff.name}
            </span>
            ? This will remove the selected staff record.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-[#101f33] dark:text-slate-200 dark:hover:bg-[#12243b]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting && <Loader2 size={17} className="animate-spin" />}
              Delete Staff
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
