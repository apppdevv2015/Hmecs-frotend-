import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import Pagination from "../../common/Pagination";
import UserModal from "./UserModal";
import UsersFilters from "./UsersFilters";
import UsersStats from "./UsersStats";
import UsersTable from "./UsersTable";
import type { ModalMode, User, UserFormData, UserStatus } from "./userTypes";
import { userService } from "../../../services/userService";

type ApiUser = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  fname?: string;
  lname?: string;
  name?: string;
  email?: string;
  mobile?: string;
  mobile_number?: string;
  phone?: string;
  role_name?: string;
  role?: string | { name?: string };
  company_name?: string;
  company?: string | { name?: string };
  company_code?: string | null;
  status?: string;
  is_active?: boolean;
  last_login?: string;
  lastLogin?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

type UsersApiResponse = {
  message?: string;
  users?: ApiUser[];
  data?: ApiUser[] | { users?: ApiUser[] };
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
};

type ExtendedUser = User & {
  firstName?: string;
  lastName?: string;
  companyCode?: string;
  updatedAt?: string;
  rawStatus?: string;
};

const USERS_PER_PAGE = 5;
const ALL_USERS_LIMIT = 10000;

const emptyForm: UserFormData = {
  name: "",
  email: "",
  phone: "",
  role: "Viewer",
  company: "",
  status: "active",
};

const roleMap: Record<string, string> = {
  super_admin: "Super Admin",
  system_admin: "Super Admin",
  admin: "Admin",
  company_admin: "Admin",
  engineer: "Engineer",
  mechanic: "Engineer",
  planner: "Planner",
  operator: "Planner",
  viewer: "Viewer",
};

const apiRoleMap: Record<string, string> = {
  "Super Admin": "super_admin",
  Admin: "admin",
  Engineer: "engineer",
  Planner: "planner",
  Viewer: "viewer",
};

const userFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be less than 60 characters")
    .regex(/^[A-Za-z\s]+$/, "Name should contain only letters"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be 10 digits")
    .max(10, "Phone number must be 10 digits")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"),

  role: z.string().trim().min(1, "Role is required"),

  company: z.string().trim().min(1, "Company is required"),

  status: z.enum(["active", "inactive"]),
});

const showToastError = (message: string) => {
  toast.error(message, { position: "top-right" });
};

const showToastSuccess = (message: string) => {
  toast.success(message, { position: "top-right" });
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatDate = (date?: string) => {
  if (!date) return "—";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRole = (role?: string) => {
  if (!role) return "Viewer";

  const normalizedRole = role.toLowerCase().trim();

  return (
    roleMap[normalizedRole] ||
    normalizedRole
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const getApiRoleName = (role: string) => {
  return apiRoleMap[role] || role.toLowerCase().replace(/\s+/g, "_");
};

const getCompanyName = (user: ApiUser) => {
  if (typeof user.company === "object") {
    return user.company?.name || user.company_name || user.company_code || "—";
  }

  return user.company_name || user.company || user.company_code || "—";
};

const getUserStatus = (user: ApiUser): UserStatus => {
  if (typeof user.is_active === "boolean") {
    return user.is_active ? "active" : "inactive";
  }

  const status = (user.status || "active").toLowerCase();

  if (status === "inactive") return "inactive";

  return "active";
};

const getRoleValue = (user: ApiUser) => {
  return (
    user.role_name ||
    (typeof user.role === "object" ? user.role?.name : user.role) ||
    "viewer"
  );
};

const mapApiUserToUser = (user: ApiUser): ExtendedUser => {
  const firstName = user.first_name || user.fname || "";
  const lastName = user.last_name || user.lname || "";

  const fullName =
    user.name || `${firstName} ${lastName}`.trim() || "Unknown User";

  const roleValue = getRoleValue(user);

  return {
    id: user.id,
    name: fullName,
    firstName: firstName || "—",
    lastName: lastName || "—",
    email: user.email || "—",
    phone: user.mobile_number || user.mobile || user.phone || "—",
    role: formatRole(roleValue),
    company: getCompanyName(user),
    companyCode: user.company_code || "—",
    status: getUserStatus(user),
    rawStatus: user.status || "—",
    lastLogin: formatDate(user.last_login || user.lastLogin),
    createdAt: formatDate(user.created_at || user.createdAt),
    updatedAt: formatDate(user.updated_at || user.updatedAt),
  };
};

const getUsersFromResponse = (response: UsersApiResponse | ApiUser[]) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response.users)) {
    return response.users;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (
    response.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.users)
  ) {
    return response.data.users;
  }

  return [];
};

const normalizeText = (value: string | number | undefined | null) => {
  return String(value || "").toLowerCase().trim();
};

export default function Users() {
  const [allUsers, setAllUsers] = useState<ExtendedUser[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingUserId, setEditingUserId] = useState<string | number | null>(
    null
  );
  const [formData, setFormData] = useState<UserFormData>(emptyForm);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewUser, setViewUser] = useState<ExtendedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ExtendedUser | null>(null);

  const [loading, setLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = (await userService.getUsers({
        page: 1,
        limit: ALL_USERS_LIMIT,
      } as never)) as UsersApiResponse | ApiUser[];

      const usersData = getUsersFromResponse(response);
      const mappedUsers = usersData.map(mapApiUserToUser);

      setAllUsers(mappedUsers);
    } catch (err) {
      const message = getErrorMessage(err, "Failed to fetch users");
      setError(message);
      showToastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const searchValue = normalizeText(search);

    return allUsers.filter((user) => {
      const matchesSearch =
        !searchValue ||
        normalizeText(user.name).includes(searchValue) ||
        normalizeText(user.email).includes(searchValue) ||
        normalizeText(user.phone).includes(searchValue) ||
        normalizeText(user.role).includes(searchValue) ||
        normalizeText(user.company).includes(searchValue) ||
        normalizeText(user.companyCode).includes(searchValue) ||
        normalizeText(user.id).includes(searchValue);

      const matchesRole =
        roleFilter === "All Roles" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All Status" ||
        user.status === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, search, roleFilter, statusFilter]);

  const totalUsers = allUsers.length;
  const filteredTotalUsers = filteredUsers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTotalUsers / USERS_PER_PAGE)
  );

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;

    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startItem =
    filteredTotalUsers === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * USERS_PER_PAGE, filteredTotalUsers);

  const openAddModal = () => {
    setModalMode("add");
    setEditingUserId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openViewModal = async (user: User) => {
    try {
      setViewLoading(true);

      const response = await userService.getUserById(user.id);
      const mappedUser = mapApiUserToUser(response as ApiUser);

      setViewUser(mappedUser);
    } catch (err) {
      const fallbackUser = allUsers.find((item) => item.id === user.id);

      if (fallbackUser) {
        setViewUser(fallbackUser);
        return;
      }

      showToastError(getErrorMessage(err, "Failed to fetch user details"));
    } finally {
      setViewLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setModalMode("edit");
    setEditingUserId(user.id);

    setFormData({
      name: user.name,
      email: user.email === "—" ? "" : user.email,
      phone: user.phone === "—" ? "" : user.phone,
      role: user.role,
      company: user.company === "—" ? "" : user.company,
      status: user.status,
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;

    setIsModalOpen(false);
    setModalMode("add");
    setEditingUserId(null);
    setFormData(emptyForm);
  };

  const validateUserForm = () => {
    const result = userFormSchema.safeParse(formData);

    if (!result.success) {
      const firstError =
        result.error.issues[0]?.message || "Please fill valid user details";

      showToastError(firstError);
      return false;
    }

    return true;
  };

  const handleSubmitUser = async () => {
    if (!validateUserForm()) return;

    try {
      setIsSubmitting(true);

      const nameParts = formData.name.trim().split(/\s+/);
      const firstName = nameParts[0] || formData.name.trim();
      const lastName = nameParts.slice(1).join(" ");

      if (modalMode === "edit" && editingUserId !== null) {
        await userService.updateUser(editingUserId, {
          first_name: firstName,
          last_name: lastName,
          email: formData.email.trim(),
          mobile_number: formData.phone.trim(),
          role_name: getApiRoleName(formData.role),
          status: formData.status,
        });

        closeModal();
        await fetchUsers();
        showToastSuccess("User updated successfully");
        return;
      }

      await userService.addUser({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        role: getApiRoleName(formData.role),
      });

      closeModal();
      setCurrentPage(1);
      await fetchUsers();
      showToastSuccess("User created successfully");
    } catch (err) {
      showToastError(getErrorMessage(err, "Failed to save user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (id: string | number) => {
    const selectedUser = allUsers.find((user) => user.id === id);

    if (selectedUser) {
      setDeleteUser(selectedUser);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      setIsSubmitting(true);

      await userService.deleteUser(deleteUser.id);

      setDeleteUser(null);

      const nextTotalAfterDelete = Math.max(filteredTotalUsers - 1, 0);
      const nextTotalPages = Math.max(
        1,
        Math.ceil(nextTotalAfterDelete / USERS_PER_PAGE)
      );

      if (currentPage > nextTotalPages) {
        setCurrentPage(nextTotalPages);
      }

      await fetchUsers();

      showToastSuccess("User deleted successfully");
    } catch (err) {
      showToastError(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDeleteModal = () => {
    if (isSubmitting) return;
    setDeleteUser(null);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("All Roles");
    setStatusFilter("All Status");
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    await fetchUsers();
  };

  return (
    <div className="flex h-[calc(100dvh-80px)] min-h-0 flex-col overflow-hidden bg-gray-50 p-2 dark:bg-[#0B1120] sm:p-4">
      <div className="shrink-0 space-y-2 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              Users
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 sm:text-xs">
              Manage all users and their access
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 w-full rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#1F2A44] dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-white/10 sm:h-9 sm:w-auto"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={openAddModal}
              className="h-8 w-full rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:h-9 sm:w-auto"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Total users yaha all users ke basis par show honge */}
        <UsersStats users={allUsers} />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827] sm:mt-4">
        <UsersFilters
          search={search}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onRoleFilterChange={setRoleFilter}
          onStatusFilterChange={setStatusFilter}
          onClearFilters={clearFilters}
        />

        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px] text-gray-500 dark:border-[#1F2A44] dark:text-slate-400">
          <span>
            Total Users:{" "}
            <strong className="text-gray-900 dark:text-white">
              {totalUsers}
            </strong>
          </span>

          <span>
            Filtered Users:{" "}
            <strong className="text-gray-900 dark:text-white">
              {filteredTotalUsers}
            </strong>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-0 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden xl:p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
              Loading users...
            </div>
          ) : error ? (
            <div className="flex h-40 items-center justify-center text-sm text-red-500">
              {error}
            </div>
          ) : (
            <>
              <UsersTable
                users={paginatedUsers}
                onView={openViewModal}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />

              {paginatedUsers.length === 0 && (
                <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-slate-400">
                  No users found
                </div>
              )}
            </>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          startItem={startItem}
          endItem={endItem}
          totalItems={filteredTotalUsers}
          onPrev={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          onNext={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
        />
      </div>

      <UserModal
        isOpen={isModalOpen}
        mode={modalMode}
        formData={formData}
        onClose={closeModal}
        onSubmit={handleSubmitUser}
        onFormChange={setFormData}
        isSubmitting={isSubmitting}
      />

      {viewLoading && <ViewLoadingModal />}

      {viewUser && !viewLoading && (
        <ViewUserModal user={viewUser} onClose={() => setViewUser(null)} />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          onClose={closeDeleteModal}
          onDelete={handleConfirmDeleteUser}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

function ViewLoadingModal() {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm font-semibold text-gray-700 shadow-2xl dark:border-[#1F2A44] dark:bg-[#0F172A] dark:text-white">
        Loading user details...
      </div>
    </div>
  );
}

function ViewUserModal({
  user,
  onClose,
}: {
  user: ExtendedUser;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] dark:border-[#1F2A44] dark:bg-[#0F172A] sm:p-5 [&::-webkit-scrollbar]:hidden">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              User Details
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Complete user profile information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#1F2A44] dark:bg-[#111C33]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-bold uppercase text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
              {user.name.charAt(0)}
            </div>

            <div className="min-w-0">
              <h4 className="truncate text-lg font-bold text-gray-900 dark:text-white">
                {user.name}
              </h4>
              <p className="truncate text-sm text-gray-600 dark:text-slate-300">
                {user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {user.role}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    user.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                  }`}
                >
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Personal Information
            </h4>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailRow label="Full Name" value={user.name} />
              <DetailRow label="First Name" value={user.firstName || "—"} />
              <DetailRow label="Last Name" value={user.lastName || "—"} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Phone" value={user.phone} />
              <DetailRow label="User ID" value={user.id} />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-[#1F2A44]" />

          <div>
            <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Role & Company Information
            </h4>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="Company" value={user.company} />
              <DetailRow label="Company Code" value={user.companyCode || "—"} />
              <DetailRow label="Status" value={user.status} />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-[#1F2A44]" />

          <div>
            <h4 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
              Activity Information
            </h4>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailRow label="Last Login" value={user.lastLogin || "—"} />
              <DetailRow label="Created At" value={user.createdAt || "—"} />
              <DetailRow label="Updated At" value={user.updatedAt || "—"} />
              <DetailRow label="Raw Status" value={user.rawStatus || "—"} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#0f172a]">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Delete User
        </h3>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {user.name}
          </span>
          ? This user will be deleted from backend.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-white dark:hover:bg-white/10"
          >
            Cancel
          </button>

          <button
            onClick={onDelete}
            disabled={isSubmitting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-[#1F2A44] dark:bg-[#111C33]">
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words font-semibold capitalize text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}