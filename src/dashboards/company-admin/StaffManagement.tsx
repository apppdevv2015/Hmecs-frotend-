import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Pencil, Plus, Search, Trash2, X, XCircle } from "lucide-react";

import Pagination from "../../components/common/Pagination";
import { userService, type ApiRole, type ApiUser } from "../../services/userService";

type Staff = {
  id: string | number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleId?: number;
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
type ToastType = "success" | "error";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

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
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter valid email address"),
  password: z.string().min(6, "Password must be minimum 6 characters"),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Enter valid 10 digit mobile number"),
  roleName: z.string().trim().min(1, "Please select role"),
  companyId: z.string().trim().min(1, "Company ID is required"),
  isActive: z.boolean().optional(),
});

const editStaffSchema = addStaffSchema.omit({ password: true }).extend({
  password: z.string().optional(),
});

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
  if (!role) return "Viewer";
  return role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const getRoleName = (user: ApiUser) => {
  if (typeof user.role === "object" && user.role !== null) {
    return user.role?.name || user.role_name || "viewer";
  }

  return user.role_name || user.role || "viewer";
};

const mapApiUserToStaff = (user: any): Staff => {
  const firstName = user.firstName || user.first_name || user.fname || "";
  const lastName = user.lastName || user.last_name || user.lname || "";
  const fullName = user.name || `${firstName} ${lastName}`.trim();

  return {
    id: user.id,
    firstName,
    lastName,
    name: fullName || "Unknown Staff",
    email: user.email || "—",
    phone: user.mobileNumber || user.mobile_number || user.mobile || user.phone || "—",
    role: getRoleName(user),
    roleId: user.role_id,
    companyId: user.company_id || user.companyId,
    createdAt: user.created_at || user.createdAt,
    updatedAt: user.updated_at || user.updatedAt,
    joinedAt: formatDateTime(user.created_at || user.createdAt),
    isActive:
      user.isActive !== undefined
        ? user.isActive
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

  if (response.data && typeof response.data === "object" && Array.isArray(response.data.users)) {
    return response.data.users;
  }

  if (response.data && typeof response.data === "object" && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  return [];
};

const extractRoles = (response: RolesApiResponse): ApiRole[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.roles)) return response.roles;
  if (Array.isArray(response.results)) return response.results;
  if (Array.isArray(response.data)) return response.data;

  if (response.data && typeof response.data === "object" && Array.isArray(response.data.roles)) {
    return response.data.roles;
  }

  if (response.data && typeof response.data === "object" && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  return [];
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

    if (msg.includes("duplicate") || msg.includes("already") || msg.includes("email")) {
      return "Email already exists. Please use another email.";
    }

    return err.message;
  }

  return "Something went wrong";
};

const getCompanyIdFromToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";

    const payload = JSON.parse(atob(token.split(".")[1]));

    return payload.company_id || payload.companyId || payload.company?.id || "";
  } catch {
    return "";
  }
};

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  function showToast(type: ToastType, message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name !== "super_admin" && role.name !== "system_admin" && role.name !== "super admin",
    );
  }, [roles]);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);

      const response = (await userService.getRoles()) as RolesApiResponse;
      const rolesArray = extractRoles(response);

      const companyStaffRoles = rolesArray.filter(
        (role) =>
          role.name !== "super_admin" &&
          role.name !== "system_admin" &&
          role.name !== "super admin",
      );

      setRoles(companyStaffRoles);

      if (!formData.roleName && companyStaffRoles.length > 0) {
        setFormData((prev) => ({
          ...prev,
          roleName: companyStaffRoles[0].name,
        }));
      }
    } catch (err) {
      showToast("error", getApiErrorMessage(err));
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = (await userService.getUsers({ limit: 1000 })) as UsersApiResponse;
      const usersArray = extractUsers(response);
      const mappedStaff = usersArray.map(mapApiUserToStaff);

      setStaffList(mappedStaff);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      showToast("error", message);
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
        staff.phone.toLowerCase().includes(searchText);

      const matchRole =
        roleFilter === "All" || staff.role.trim().toLowerCase() === roleFilter.trim().toLowerCase();

      return matchSearch && matchRole;
    });
  }, [staffList, search, roleFilter]);

  const totalItems = filteredStaff.length;
  const totalPages = Math.max(Math.ceil(totalItems / perPage), 1);

  const paginatedStaff = filteredStaff.slice((currentPage - 1) * perPage, currentPage * perPage);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

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

      const response = (await userService.getUserById(staff.id)) as UserDetailApiResponse;

      const userDetail = extractUserDetail(response);

      if (!userDetail) {
        throw new Error("Staff detail not found");
      }

      setViewStaff(mapApiUserToStaff(userDetail));
    } catch (err) {
      showToast("error", getApiErrorMessage(err));
    } finally {
      setViewLoading(false);
    }
  }

  function openEditModal(staff: Staff) {
    setFormErrors({});
    setEditStaff(staff);

    setFormData({
      firstName: staff.firstName || staff.name.split(" ")[0] || "",
      lastName: staff.lastName || staff.name.split(" ").slice(1).join(" ") || "",
      email: staff.email === "—" ? "" : staff.email,
      password: "",
      mobileNumber: staff.phone === "—" ? "" : staff.phone,
      roleName: staff.role || "",
      companyId: staff.companyId ? String(staff.companyId) : getCompanyIdFromToken(),
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

      if (editStaff) {
        await userService.updateUser(editStaff.id, {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile_number: formData.mobileNumber.trim(),
          role_name: formData.roleName,
          company_id: formData.companyId.trim(),
          is_active: formData.isActive,
        } as any);

        await fetchStaffUsers();
        setEditStaff(null);
        setFormData(emptyForm);
        setFormErrors({});
        showToast("success", "Staff updated successfully");
        return;
      }

      await userService.addUser({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        mobile_number: formData.mobileNumber.trim(),
        role_name: formData.roleName,
        company_id: formData.companyId.trim(),
        is_active: formData.isActive,
      } as any);

      await fetchStaffUsers();

      setCurrentPage(1);
      setIsAddOpen(false);
      setFormData(emptyForm);
      setFormErrors({});
      showToast("success", "Staff created successfully");
    } catch (err) {
      showToast("error", getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStaff() {
    if (!deleteStaff) return;

    try {
      setIsSubmitting(true);

      await userService.deleteUser(deleteStaff.id);
      await fetchStaffUsers();

      setDeleteStaff(null);
      setCurrentPage(1);
      showToast("success", "Staff deleted successfully");
    } catch (err) {
      showToast("error", getApiErrorMessage(err));
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
    <div className="min-h-screen bg-gray-50 p-4 text-slate-900 dark:bg-[#050b18] dark:text-white md:p-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View, add, edit and manage company staff.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={fetchStaffUsers}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={openAddModal}
            disabled={isStaffLimitReached}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="All">All Roles</option>
            {filteredRoles.map((role) => (
              <option key={role.id} value={role.name}>
                {formatRole(role.name)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4">Staff</th>
                <th className="px-5 py-4">Mobile</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created At</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                !error &&
                paginatedStaff.map((staff) => (
                  <tr
                    key={staff.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.email}</p>
                    </td>

                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{staff.phone}</td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        {formatRole(staff.role)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {staff.isActive ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {staff.joinedAt}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <IconButton onClick={() => openViewModal(staff)}>
                          <Eye size={16} />
                        </IconButton>

                        <IconButton onClick={() => openEditModal(staff)}>
                          <Pencil size={16} />
                        </IconButton>

                        <IconButton onClick={() => setDeleteStaff(staff)} danger>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="p-8 text-center text-sm text-slate-500">Loading staff...</div>}

        {error && <div className="p-8 text-center text-sm text-red-500">{error}</div>}

        {!loading && !error && filteredStaff.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-500">No staff found.</div>
        )}

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
      </div>

      {(isAddOpen || editStaff) && (
        <Modal title={isAddOpen ? "Add Staff" : "Edit Staff"} onClose={closeFormModal}>
          <StaffForm
            formData={formData}
            setFormData={setFormData}
            errors={formErrors}
            setErrors={setFormErrors}
            roles={filteredRoles}
            rolesLoading={rolesLoading}
            isEdit={Boolean(editStaff)}
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={closeFormModal}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-60 dark:border-slate-700"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmitStaff}
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isAddOpen ? "Add Staff" : "Update Staff"}
            </button>
          </div>
        </Modal>
      )}

      {viewLoading && (
        <Modal title="View Staff" onClose={() => setViewLoading(false)}>
          <p className="text-sm text-slate-500">Loading staff details...</p>
        </Modal>
      )}

      {viewStaff && !viewLoading && (
        <Modal title="View Staff" onClose={() => setViewStaff(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Staff ID" value={viewStaff.id} />
            <Info label="First Name" value={viewStaff.firstName || "—"} />
            <Info label="Last Name" value={viewStaff.lastName || "—"} />
            <Info label="Email" value={viewStaff.email} />
            <Info label="Mobile Number" value={viewStaff.phone} />
            <Info label="Role" value={formatRole(viewStaff.role)} />
            <Info label="Role ID" value={viewStaff.roleId || "—"} />
            <Info label="Company ID" value={viewStaff.companyId || "—"} />
            <Info label="Created At" value={formatDateTime(viewStaff.createdAt)} />
            <Info label="Updated At" value={formatDateTime(viewStaff.updatedAt)} />
          </div>
        </Modal>
      )}

      {deleteStaff && (
        <Modal title="Delete Staff" onClose={() => setDeleteStaff(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete <span className="font-bold">{deleteStaff.name}</span>?
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setDeleteStaff(null)}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-60 dark:border-slate-700"
            >
              Cancel
            </button>

            <button
              onClick={handleDeleteStaff}
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return createPortal(
    <div className="fixed right-5 top-5 z-[999999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
              isSuccess
                ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300"
                : "border-red-200 bg-white text-red-700 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300"
            }`}
          >
            <div
              className={`mt-0.5 rounded-full p-1 ${
                isSuccess
                  ? "bg-emerald-100 dark:bg-emerald-500/10"
                  : "bg-red-100 dark:bg-red-500/10"
              }`}
            >
              {isSuccess ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            </div>

            <div className="flex-1">
              <p className="text-sm font-black">{isSuccess ? "Success" : "Error"}</p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{toast.message}</p>
            </div>

            <button
              onClick={() => onClose(toast.id)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

function IconButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-2 transition ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-500/10"
          : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body,
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900 dark:text-white">
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

  const updateField = (field: keyof StaffFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="First Name"
        value={formData.firstName}
        error={errors.firstName}
        onChange={(value) => updateField("firstName", value)}
      />

      <Input
        label="Last Name"
        value={formData.lastName}
        error={errors.lastName}
        onChange={(value) => updateField("lastName", value)}
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        error={errors.email}
        onChange={(value) => updateField("email", value)}
      />

      <Input
        label="Mobile Number"
        value={formData.mobileNumber}
        error={errors.mobileNumber}
        maxLength={10}
        onChange={(value) => updateField("mobileNumber", value.replace(/\D/g, ""))}
      />

      {!isEdit && (
        <div>
          <label className="mb-2 block text-sm font-bold">Password</label>

          <div className="relative">
            <input
              value={formData.password}
              type={showPassword ? "text" : "password"}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Create password"
              className={`w-full rounded-xl border bg-slate-50 px-4 py-3 pr-11 text-sm outline-none focus:border-blue-500 dark:bg-slate-950 ${
                errors.password ? "border-red-400" : "border-slate-200 dark:border-slate-700"
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errors.password && (
            <p className="mt-1 text-xs font-semibold text-red-500">{errors.password}</p>
          )}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-bold">Role Name</label>

        <select
          value={formData.roleName}
          onChange={(e) => updateField("roleName", e.target.value)}
          className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:bg-slate-950 ${
            errors.roleName ? "border-red-400" : "border-slate-200 dark:border-slate-700"
          }`}
        >
          <option value="">Select Role</option>

          {rolesLoading ? (
            <option value="">Loading roles...</option>
          ) : (
            roles.map((role) => (
              <option key={role.id} value={role.name}>
                {formatRole(role.name)}
              </option>
            ))
          )}
        </select>

        {errors.roleName && (
          <p className="mt-1 text-xs font-semibold text-red-500">{errors.roleName}</p>
        )}
      </div>

      {isEdit && (
        <div>
          <label className="mb-2 block text-sm font-bold">Status</label>
          <select
            value={formData.isActive ? "true" : "false"}
            onChange={(e) => updateField("isActive", e.target.value === "true")}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 font-bold"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">{label}</label>

      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 dark:bg-slate-950 ${
          error ? "border-red-400" : "border-slate-200 dark:border-slate-700"
        }`}
      />

      {error && <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}
