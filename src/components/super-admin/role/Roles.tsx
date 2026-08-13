import { useEffect, useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { showErrorToast } from "../../../utils/toastUtils";

import {
  ApiRole,
  createRole as createRoleApi,
  deleteRole as deleteRoleApi,
  getRoles,
  updateRole as updateRoleApi,
} from "../../../services/Auth/roleService";

import { userService } from "../../../services/Auth/userService";

type RoleStatus = "active" | "inactive";

type Role = {
  id: number | string;
  name: string;
  rawName: string;
  status: RoleStatus;
  createdAt?: string;
  updatedAt?: string;
};

type ApiUser = {
  id: number | string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  mobile_number?: string;
  role_name?: string;
  role?: string | { id?: string; name?: string };
  roleId?: string;
  role_id?: string | number;
  company_name?: string;
  company?: string | { name?: string };
};

type UserRow = {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
};

type FormState = {
  name: string;
};

const emptyForm: FormState = {
  name: "",
};

const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Role name must be at least 3 characters")
    .max(30, "Role name cannot exceed 30 characters")
    .regex(/^[A-Za-z ]+$/, "Only alphabets and spaces are allowed"),
});

const formatRoleName = (name: string) =>
  name
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeRoleName = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "_").trim();

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

const normalizeRolesResponse = (response: any): ApiRole[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.roles)) return response.roles;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const normalizeUsersResponse = (response: any): ApiUser[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const mapApiUserToRow = (user: ApiUser, roles: Role[]): UserRow => {
  const firstName = user.firstName || user.first_name || "";
  const lastName = user.lastName || user.last_name || "";
  const fullName = user.name || `${firstName} ${lastName}`.trim() || "Unknown User";

  const matchedRole = roles.find(
    (role) =>
      String(role.id).trim() === String(user.roleId || user.role_id).trim(),
  );

  const roleValue =
    matchedRole?.name ||
    (typeof user.role === "object" ? user.role?.name : user.role) ||
    user.role_name ||
    "—";

  return {
    id: user.id,
    name: fullName,
    email: user.email || "—",
    phone: user.mobileNumber || user.mobile_number || "—",
    role: formatRoleName(String(roleValue)),
    company:
      typeof user.company === "object"
        ? (user.company?.name ?? "—")
        : user.company || user.company_name || "—",
  };
};

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const [viewRole, setViewRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleUsers, setRoleUsers] = useState<UserRow[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [roleError, setRoleError] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);

      const response = await getRoles();

      const data = normalizeRolesResponse(response);

      const mappedRoles: Role[] = data.map((role: any) => {
        const rawName = String(role.name || "");
        const status: RoleStatus =
          role.status === "inactive" || role.isActive === false
            ? "inactive"
            : "active";

        return {
          id: role.id,
          rawName,
          name: formatRoleName(rawName),
          status,
          createdAt: formatDate(role.created_at || role.createdAt),
          updatedAt: formatDate(role.updated_at || role.updatedAt),
        };
      });

      setRoles(mappedRoles);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return roles;

    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(value) ||
        role.rawName.toLowerCase().includes(value) ||
        role.status.toLowerCase().includes(value),
    );
  }, [roles, search]);

  const activeRoles = roles.filter((role) => role.status === "active").length;

  const openAddModal = () => {
    setForm(emptyForm);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (actionLoading) return;

    setIsAddModalOpen(false);
    setForm(emptyForm);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);

    setForm({
      name: role.name,
    });
  };

  const closeEditModal = () => {
    if (actionLoading) return;

    setEditingRole(null);
    setForm(emptyForm);
  };

  const handleCreateRole = async () => {
    const result = roleSchema.safeParse(form);

    if (!result.success) {
      showErrorToast(result.error.issues[0].message);
      return;
    }

    try {
      setActionLoading(true);

      const response = await createRoleApi({
        name: normalizeRoleName(form.name),
      });

      closeAddModal();

      await fetchRoles();
    } catch (error: any) {
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    const result = roleSchema.safeParse(form);

    if (!result.success) {
      showErrorToast(result.error.issues[0].message);
      return;
    }

    try {
      setActionLoading(true);

      const response = await updateRoleApi(editingRole.id, {
        name: normalizeRoleName(form.name),
      });

      closeEditModal();

      await fetchRoles();
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;

    try {
      setActionLoading(true);

      const response = await deleteRoleApi(deleteRole.id);

      setDeleteRole(null);

      await fetchRoles();
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const fetchRoleUsers = async () => {
    try {
      setUsersLoading(true);

      const response = await userService.getUsers({
        page: 1,
        limit: 100,
        forceRefresh: true, // cache bypass
      } as any);

      const usersData = normalizeUsersResponse(response);

      setRoleUsers(usersData.map((user) => mapApiUserToRow(user, roles)));
    } catch {
      // error toast already shown globally by apiCall (userService.getUsers)
    } finally {
      setUsersLoading(false);
    }
  };

  const openRoleUsersModal = async (role: Role) => {
    setSelectedRole(role);
  };

  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      fetchRoleUsers();
    }
  }, [selectedRole, roles]);

  const handleAssignRole = async (userId: number | string) => {
    if (!selectedRole) return;

    try {
      setActionLoading(true);

      const selectedUser = roleUsers.find((user) => user.id === userId);

      if (!selectedUser) return;

      const [firstName = "", ...rest] = selectedUser.name.split(" ");

      const lastName = rest.join(" ");

      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: selectedUser.email,
        mobile_number: selectedUser.phone,
        roleId: selectedRole.id,
      };

      await userService.updateUser(userId, payload);

      // permanent UI update
      setRoleUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: formatRoleName(selectedRole.rawName),
              }
            : u,
        ),
      );
    } catch {
      // success/error toast already shown globally by apiCall (userService.updateUser)
    } finally {
      setActionLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 px-6 py-6 shadow-lg">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          {/* Left Section */}
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
              Access Control
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Role Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100">
              Manage system roles, permissions, and access control settings from
              one centralized location.
            </p>
          </div>

          {/* Right Section */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 backdrop-blur-sm">
              <Search size={16} className="shrink-0 text-blue-100" />

              <input
                placeholder="Search roles..."
                className="w-44 bg-transparent text-sm text-white outline-none placeholder:text-blue-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchRoles}
              disabled={loading}
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            {/* Add Role */}
            <button
              onClick={openAddModal}
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-blue-700 shadow-md transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
            >
              <Plus size={16} />
              Add Role
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard title="Total Roles" value={String(roles.length)} />

        <StatCard title="Active Roles" value={String(activeRoles)} />

        <StatCard
          title="Inactive Roles"
          value={String(roles.length - activeRoles)}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#0f172a]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Roles List
          </h2>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing {filteredRoles.length} roles
          </p>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="py-3">Role Name</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading roles...
                  </td>
                </tr>
              ) : filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <tr
                    key={role.id}
                    onClick={() => openRoleUsersModal(role)}
                    className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                  >
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {role.name}
                    </td>

                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          role.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {role.status}
                      </span>
                    </td>

                    <td className="text-gray-500 dark:text-gray-400">
                      {role.createdAt}
                    </td>

                    <td className="text-gray-500 dark:text-gray-400">
                      {role.updatedAt}
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-2 py-3">
                        <button
                          onClick={() => openEditModal(role)}
                          className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-500/10"
                          type="button"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => setDeleteRole(role)}
                          className="rounded-lg p-2 text-red-500 transition hover:bg-red-500/10"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    No roles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <RoleFormModal
          title="Add Role"
          form={form}
          setForm={setForm}
          onClose={closeAddModal}
          onSubmit={handleCreateRole}
          submitText={actionLoading ? "Creating..." : "Create Role"}
          disabled={actionLoading}
          roleError={roleError}
          setRoleError={setRoleError}
        />
      )}

      {editingRole && (
        <RoleFormModal
          title="Edit Role"
          form={form}
          setForm={setForm}
          onClose={closeEditModal}
          onSubmit={handleUpdateRole}
          submitText={actionLoading ? "Updating..." : "Update Role"}
          disabled={actionLoading}
          roleError={roleError}
          setRoleError={setRoleError}
        />
      )}

      {viewRole && (
        <ViewRoleModal role={viewRole} onClose={() => setViewRole(null)} />
      )}

      {selectedRole && (
        <RoleUsersModal
          role={selectedRole}
          users={roleUsers}
          loading={usersLoading}
          assigning={actionLoading}
          onClose={() => {
            setSelectedRole(null);
            setRoleUsers([]);
          }}
          onAssign={handleAssignRole}
        />
      )}

      {deleteRole && (
        <DeleteConfirmModal
          role={deleteRole}
          onClose={() => setDeleteRole(null)}
          onDelete={handleDeleteRole}
          disabled={actionLoading}
        />
      )}
    </div>
  );
}
function RoleFormModal({
  title,
  form,
  setForm,
  onClose,
  onSubmit,
  submitText,
  disabled,
  roleError,
  setRoleError,
}: any) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-[#081028]">
        <div className="border-b border-slate-200 p-7 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-blue-500">
                ROLE MANAGEMENT
              </p>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
            </div>

            <button
              onClick={onClose}
              disabled={disabled}
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-500/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-7">
          <InputField
            label="Role Name"
            value={form.name}
            placeholder="admin / manager / viewer"
            error={roleError}
            onChange={(value: string) => {
              setForm({ name: value });

              const result = roleSchema.safeParse({ name: value });

              setRoleError(!result.success);
            }}
          />

          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={onClose}
              disabled={disabled}
              type="button"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              onClick={onSubmit}
              disabled={disabled}
              type="button"
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.02] disabled:opacity-60"
            >
              {submitText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewRoleModal({ role, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-[#081028]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[3px] text-blue-500">
              ROLE DETAILS
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {role.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow label="Role ID" value={role.id} />
          <DetailRow label="Role Name" value={role.name} />
          <DetailRow label="Status" value={role.status} />
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ role, onClose, onDelete, disabled }: any) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[32px] bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,0.12)] dark:bg-[#081028]">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
          <Trash2 size={28} className="text-red-500" />
        </div>

        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Delete Role
        </h3>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Are you sure you want to delete{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            {role.name}
          </span>
          ?
        </p>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={disabled}
            type="button"
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-white"
          >
            Cancel
          </button>

          <button
            onClick={onDelete}
            disabled={disabled}
            type="button"
            className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-3 text-sm font-semibold text-white"
          >
            {disabled ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#081028]">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>

      <h3 className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">
        {value}
      </h3>
    </div>
  );
}

function DetailRow({ label, value }: any) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InputField({ label, value, placeholder, onChange, error }: any) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-[56px] w-full rounded-2xl px-5 text-sm font-medium outline-none transition-all
${
  error
    ? "border border-red-500 bg-red-50 focus:border-red-500"
    : "border border-slate-200 bg-slate-50 focus:border-blue-500"
}
dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
      />
    </div>
  );
}

function RoleUsersModal({
  role,
  users,
  loading,
  assigning,
  onClose,
  onAssign,
}: any) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-[#081028]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 p-7 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[3px] text-blue-500">
              ASSIGN ROLE
            </p>

            <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              Assign Role - {role.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* TABLE */}
        <div className="p-7">
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-white dark:bg-[#081028]">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 text-left text-xs font-bold uppercase text-slate-500">
                    User
                  </th>

                  <th className="py-4 text-left text-xs font-bold uppercase text-slate-500">
                    Email
                  </th>

                  <th className="py-4 text-left text-xs font-bold uppercase text-slate-500">
                    Current Role
                  </th>

                  <th className="py-4 text-center text-xs font-bold uppercase text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-16 text-center text-slate-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user: any) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-5 font-medium text-slate-900 dark:text-white">
                        {user.name}
                      </td>

                      <td className="text-slate-500 dark:text-slate-400">
                        {user.email}
                      </td>

                      <td>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {user.role || "No Role"}
                        </span>
                      </td>

                      <td className="text-center">
                        <button
                          onClick={() => onAssign(user.id)}
                          disabled={assigning}
                          type="button"
                          className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
                        >
                          {assigning ? "Assigning..." : "Assign"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-16 text-center text-slate-500"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
