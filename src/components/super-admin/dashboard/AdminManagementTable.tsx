import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  MoreVertical,
  Search,
  SlidersHorizontal,
  Eye,
  Edit,
  Trash2,
  X,
  User,
  Mail,
  Shield,
  Phone,
  Building2,
  TrendingUp,
  Lock,
} from "lucide-react";
import Pagination from "../../common/Pagination";
import { userService } from "../../../services/Auth/userService";
import { superAdminMachineService } from "../../../services/SuperAdmin/machineService";
import { useNavigate } from "react-router";

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
  role?: string | { name?: string };

  company_id?: string | number | null;
  company_code?: string | null;
  companyCode?: string;
  company_name?: string;

  company?: {
    id?: string;
    name?: string;
    companyCode?: string;
    companyCodee?: string;
  };

  status?: string;

  isActive?: boolean;
  is_active?: boolean;

  created_at?: string;
  createdAt?: string;

  updated_at?: string;
  updatedAt?: string;
};

type Admin = {
  id: string | number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  mobileNumber: string;
  roleName: string;
  companyName: string;
  companyCode: string;
  status: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
};

const roleColor: Record<string, string> = {
  super_admin:
    "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",

  admin: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",

  Artisans:
    "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",

  supervisor:
    "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",

  operator: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",

  planner:
    "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",

  viewer: "bg-gray-50 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

const uniqueRoles = [
  "super_admin",
  "admin",
  "Artisans",
  "supervisor",
  "operator",
  "planner",
  "viewer",
];

const getApiMessage = (response: unknown, fallback: string) => {
  if (response && typeof response === "object") {
    const data = response as {
      message?: string;
      error?: string;
      data?: { message?: string };
    };

    return data.message || data.error || data.data?.message || fallback;
  }

  return fallback;
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object") {
    const error = err as {
      message?: string;
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    };

    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      fallback
    );
  }

  return fallback;
};

const formatRole = (role?: string) => {
  if (!role) return "-";
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (date?: string) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAvatar = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getCompanyName = (user: ApiUser) => {
  const roleVal = (
    typeof user.role === "string"
      ? user.role
      : user.role?.name || user.role_name || ""
  ).toLowerCase();

  if (
    roleVal.includes("sub_super") ||
    roleVal.includes("sub super") ||
    roleVal.includes("super_admin") ||
    roleVal.includes("super admin")
  ) {
    return "-";
  }

  if (typeof user.company === "object") {
    return user.company?.name || user.company_name || "-";
  }

  return user.company_name || "-";
};

const getCompanyCode = (user: ApiUser) => {
  const roleVal = (
    typeof user.role === "string"
      ? user.role
      : user.role?.name || user.role_name || ""
  ).toLowerCase();

  if (
    roleVal.includes("sub_super") ||
    roleVal.includes("sub super") ||
    roleVal.includes("super_admin") ||
    roleVal.includes("super admin")
  ) {
    return "-";
  }

  if (typeof user.company === "object") {
    return (
      user.company?.companyCode || user.companyCode || user.company_code || "-"
    );
  }

  return user.companyCode || user.company_code || "-";
};

const getStatus = (user: ApiUser) => {
  if (typeof user.isActive === "boolean") {
    return user.isActive ? "Active" : "Inactive";
  }

  if (typeof user.is_active === "boolean") {
    return user.is_active ? "Active" : "Inactive";
  }

  return user.status?.toLowerCase() === "inactive" ? "Inactive" : "Active";
};

const normalizeRole = (role?: string) => {
  const value = (role || "").toLowerCase();

  if (value === "super_admin") return "super_admin";
  if (value === "admin") return "admin";
  if (value === "Artisans") return "Artisans";
  if (value === "supervisor") return "supervisor";
  if (value === "operator") return "operator";
  if (value === "planner") return "planner";
  if (value === "viewer") return "viewer";

  return value || "unknown";
};

const mapApiUserToAdmin = (user: ApiUser): Admin => {
  const firstName = user.firstName || user.first_name || user.fname || "";

  const lastName = user.lastName || user.last_name || user.lname || "";

  const fullName =
    user.name || `${firstName} ${lastName}`.trim() || "Unknown User";

  const roleValue =
    user.role_name ||
    (typeof user.role === "object" ? user.role?.name : user.role) ||
    "viewer";

  return {
    id: user.id,

    firstName,
    lastName,

    name: fullName,

    email: user.email || "",

    mobileNumber:
      user.mobileNumber ||
      user.mobile_number ||
      user.mobile ||
      user.phone ||
      "",

    roleName: normalizeRole(roleValue),

    companyName: getCompanyName(user),

    companyCode: getCompanyCode(user),

    status: getStatus(user),

    avatar: getAvatar(fullName),

    createdAt: user.created_at || user.createdAt || "-",

    updatedAt: user.updated_at || user.updatedAt || "-",
  };
};

export default function AdminManagementTable() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [companies, setCompanies] = useState<{ id: string | number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCompaniesList = async () => {
      try {
        const res = await superAdminMachineService.getCompanies();
        const val: any = res;
        const rawList = Array.isArray(val)
          ? val
          : Array.isArray(val?.data)
            ? val.data
            : Array.isArray(val?.companies)
              ? val.companies
              : [];

        const compList = rawList.map((c: any) => ({
          id: c.id,
          name: c.name || c.company_name || c.companyName || "Company",
        }));
        setCompanies(compList);
      } catch (err) {
        console.error("Failed to load companies dropdown list:", err);
      }
    };

    loadCompaniesList();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [modalType, setModalType] = useState<"view" | "edit" | "delete" | null>(
    null,
  );
  const [editForm, setEditForm] = useState<Admin | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response = await userService.getUsers({
        page: currentPage,
        limit: 10,
      });

      const rawResponse = response as any;

      const usersData = Array.isArray(rawResponse)
        ? rawResponse
        : rawResponse?.data?.users || rawResponse?.users || [];

      const pagination = rawResponse?.data?.pagination;

      setTotalPages(pagination?.pages || 1);
      setTotalItems(pagination?.total || 0);

      setAdmins(
        Array.isArray(usersData) ? usersData.map(mapApiUserToAdmin) : [],
      );
    } catch (err) {
      const message = getErrorMessage(err, "Failed to fetch users");

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  const activeFilterCount =
    (selectedRole !== "All" ? 1 : 0) + (selectedStatus !== "All" ? 1 : 0);

  const filteredAdmins = useMemo(() => {
    const searchText = searchTerm.toLowerCase().trim();

    return admins.filter((admin) => {
      if (!searchText) return true;

      return (
        (admin.name || "").toLowerCase().includes(searchText) ||
        (admin.email || "").toLowerCase().includes(searchText) ||
        (admin.mobileNumber || "").toLowerCase().includes(searchText) ||
        (admin.roleName || "").toLowerCase().includes(searchText) ||
        (admin.companyName || "").toLowerCase().includes(searchText) ||
        (admin.companyCode || "").toLowerCase().includes(searchText)
      );
    });
  }, [admins, searchTerm]);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * 10 + 1;

  const paginatedAdmins = filteredAdmins;

  const endItem = Math.min(currentPage * 10, totalItems);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedStatus]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const closeModal = () => {
    if (isSubmitting || viewLoading) return;

    setSelectedAdmin(null);
    setEditForm(null);
    setModalType(null);
  };

  const handleView = async (admin: Admin) => {
    try {
      setViewLoading(true);
      setOpenMenu(null);

      const response = await userService.getUserById(admin.id);
      const freshAdmin = mapApiUserToAdmin(response as ApiUser);

      setSelectedAdmin(freshAdmin);
      setModalType("view");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to fetch user details"));
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditForm({ ...admin });
    setModalType("edit");
    setOpenMenu(null);
  };

  const handleDelete = (admin: Admin) => {
    setSelectedAdmin(admin);
    setModalType("delete");
    setOpenMenu(null);
  };

  const saveEdit = async () => {
    if (!editForm || !selectedAdmin) return;

    if (
      !editForm.firstName.trim() ||
      !editForm.lastName.trim() ||
      !editForm.email.trim() ||
      !editForm.mobileNumber.trim() ||
      !editForm.roleName.trim() ||
      !editForm.companyName.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await userService.updateUser(selectedAdmin.id, {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        email: editForm.email,
        mobile_number: editForm.mobileNumber,
        role_name: editForm.roleName,
        company_name: editForm.companyName,
      });

      await fetchUsers();
      closeModal();

      toast.success(getApiMessage(response, "User updated successfully"));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedAdmin) return;

    try {
      setIsSubmitting(true);

      const response = await userService.deleteUser(selectedAdmin.id);

      await fetchUsers();
      closeModal();

      toast.success(getApiMessage(response, "User deleted successfully"));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSelectedRole("All");
    setSelectedStatus("All");
    setSearchTerm("");
    setShowFilter(false);
    setCurrentPage(1);
  };

  return (
    <>
      <div className="flex h-full min-h-[620px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Admin Management
              </h2>
            </div>

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:border-blue-500 sm:w-64"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowFilter(!showFilter)}
                className={`relative flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all duration-200 ${
                  showFilter || activeFilterCount > 0
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-400"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                <SlidersHorizontal size={17} />
                Filter
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {showFilter && (
                <div className="absolute right-0 top-12 z-50 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950 sm:w-72">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                        Filter Users
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Refine list by role and status.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFilter(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Role
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <option>All</option>
                        {uniqueRoles.map((role) => (
                          <option key={role} value={role}>
                            {formatRole(role)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                        Status
                      </label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <option>All</option>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        Reset
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowFilter(false)}
                        className="h-10 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => fetchUsers(currentPage)}
                disabled={loading}
                className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-white/10"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto px-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-y border-slate-200 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Company Code</th>
                <th className="px-4 py-3 font-medium">Company Name</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : paginatedAdmins.length > 0 ? (
                paginatedAdmins.map((admin) => (
                  <tr
                    key={String(admin.id)}
                    className="border-b border-slate-100 transition hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                          {admin.avatar || "U"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-950 dark:text-white">
                            {admin.name}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {admin.email || "-"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                      {admin.mobileNumber || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-medium ${
                          roleColor[admin.roleName] || roleColor.viewer
                        }`}
                      >
                        {formatRole(admin.roleName)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                      {admin.companyCode || "-"}
                    </td>

                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                      {admin.companyName || "-"}
                    </td>

                    <td className="px-4 py-4">
                      {(admin.roleName || "").toLowerCase().includes("sub_super") ||
                      (admin.roleName || "").toLowerCase().includes("sub super") ||
                      (admin.roleName || "").toLowerCase().includes("super_admin") ? (
                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Platform Admin (No Plan)
                        </span>
                      ) : (
                        <span
                          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                            admin.status === "Active"
                              ? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                          }`}
                        >
                          ● {admin.status}
                        </span>
                      )}
                    </td>

                    <td className="relative px-4 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenu(
                            openMenu === String(admin.id)
                              ? null
                              : String(admin.id),
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenu === String(admin.id) && (
                        <div className="absolute right-6 top-12 z-50 w-36 rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                          <button
                            type="button"
                            onClick={() => {
                              const compId = (admin as any).companyId || (admin as any).company_id;
                              if (compId) {
                                navigate(`/super-admin/intelligence?companyId=${encodeURIComponent(compId)}`);
                              } else {
                                navigate("/super-admin/intelligence");
                              }
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-white/10"
                          >
                            <TrendingUp size={15} />
                            Intelligence
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(admin)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-white/10"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto border-t border-slate-200 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startItem={startItem}
            endItem={endItem}
            totalItems={totalItems}
            onPrev={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onNext={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
          />
        </div>
      </div>

      {viewLoading && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            Loading user details...
          </div>
        </div>
      )}

      {modalType && selectedAdmin && !viewLoading && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl transition-all duration-300 [scrollbar-width:none] dark:border-slate-800 dark:bg-slate-950 [&::-webkit-scrollbar]:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {modalType === "view" && "User Details"}
                  {modalType === "edit" && "Edit User"}
                  {modalType === "delete" && "Delete User"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {modalType === "edit" && editForm && (
              <div className="space-y-3">
                <InputBox
                  label="First Name"
                  icon={<User size={16} />}
                  value={editForm.firstName}
                  onChange={(value) =>
                    setEditForm({ ...editForm, firstName: value })
                  }
                />

                <InputBox
                  label="Last Name"
                  icon={<User size={16} />}
                  value={editForm.lastName}
                  onChange={(value) =>
                    setEditForm({ ...editForm, lastName: value })
                  }
                />

                <InputBox
                  label="Email"
                  icon={<Mail size={16} />}
                  value={editForm.email}
                  disabled={true}
                  readOnly={true}
                />

                <InputBox
                  label="Mobile Number"
                  icon={<Phone size={16} />}
                  value={editForm.mobileNumber}
                  onChange={(value) =>
                    setEditForm({ ...editForm, mobileNumber: value })
                  }
                />

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Role
                  </label>

                  <div className="relative">
                    <Shield
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                    />

                    <select
                      value={editForm.roleName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, roleName: e.target.value })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {uniqueRoles.map((role) => (
                        <option key={role} value={role}>
                          {formatRole(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Company Name
                    </label>
                    {((editForm.roleName || "").toLowerCase().includes("sub_super") ||
                      (editForm.roleName || "").toLowerCase().includes("sub super") ||
                      (editForm.roleName || "").toLowerCase().includes("super_admin")) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <Lock size={11} /> Locked
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Building2
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                    />

                    {(editForm.roleName || "").toLowerCase().includes("sub_super") ||
                    (editForm.roleName || "").toLowerCase().includes("sub super") ||
                    (editForm.roleName || "").toLowerCase().includes("super_admin") ? (
                      <input
                        disabled
                        readOnly
                        value="No Company Required (Platform Admin)"
                        className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100/90 pl-10 pr-3 text-sm text-slate-500 opacity-75 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400"
                      />
                    ) : (
                      <select
                        value={editForm.companyName || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, companyName: e.target.value })
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <option value="">Select Company</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={isSubmitting}
                    className="h-11 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Updating..." : "Update User"}
                  </button>
                </div>
              </div>
            )}

            {modalType === "view" && (
              <div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailBox
                    label="First Name"
                    value={selectedAdmin.firstName}
                  />
                  <DetailBox label="Last Name" value={selectedAdmin.lastName} />
                  <DetailBox label="Email" value={selectedAdmin.email} />
                  <DetailBox
                    label="Mobile"
                    value={selectedAdmin.mobileNumber}
                  />
                  <DetailBox
                    label="Role"
                    value={formatRole(selectedAdmin.roleName)}
                  />
                  <DetailBox
                    label="Company Code"
                    value={selectedAdmin.companyCode}
                  />
                  <DetailBox
                    label="Company Name"
                    value={selectedAdmin.companyName}
                  />
                  <DetailBox label="Status" value={selectedAdmin.status} />
                  <DetailBox label="User ID" value={String(selectedAdmin.id)} />
                  <DetailBox
                    label="Created At"
                    value={formatDateTime(selectedAdmin.createdAt)}
                  />
                  <DetailBox
                    label="Updated At"
                    value={formatDateTime(selectedAdmin.updatedAt)}
                  />
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-5 h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            )}

            {modalType === "delete" && (
              <div>
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                  <h4 className="text-base font-semibold text-slate-950 dark:text-white">
                    Delete {selectedAdmin.name}?
                  </h4>

                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Are you sure you want to delete this user?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={isSubmitting}
                    className="h-11 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Deleting..." : "Delete User"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-white/[0.04]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-950 dark:text-white">
        {value || "-"}
      </p>
    </div>
  );
}

function InputBox({
  label,
  value,
  icon,
  disabled = false,
  readOnly = false,
  onChange,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}
        </label>
        {disabled && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <Lock size={11} /> Locked
          </span>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={`h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm text-slate-700 outline-none transition-all dark:border-slate-800 dark:text-slate-300 ${
            disabled
              ? "cursor-not-allowed bg-slate-100/90 text-slate-500 opacity-75 dark:bg-slate-800/80 dark:text-slate-400"
              : "bg-slate-50 focus:border-blue-500 dark:bg-slate-900"
          }`}
        />
      </div>
    </div>
  );
}
