import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { useParams } from "react-router";
import { superAdminMachineService } from "../../services/SuperAdmin/machineService";
import { getRoles } from "../../services/roleService";

type Permission = {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type RoleStatus = "active" | "inactive";

type RoleDetails = {
  id: string | number;
  name: string;
  status: RoleStatus;
  users: number;
  permissions: Permission[];
  assignedUsers: string[];
  linkedMachines: string[];
  activityHistory: string[];
};

const rolesDetailsData: RoleDetails[] = [
  {
    id: "1",
    name: "Super Admin",
    status: "active",
    users: 2,
    permissions: [
      { module: "Dashboard", view: true, create: true, edit: true, delete: true },
      { module: "Users", view: true, create: true, edit: true, delete: true },
      { module: "Roles", view: true, create: true, edit: true, delete: true },
      { module: "Machines", view: true, create: true, edit: true, delete: true },
      { module: "Reports", view: true, create: true, edit: true, delete: true },
      { module: "Alerts", view: true, create: true, edit: true, delete: true },
    ],
    assignedUsers: ["Kwame Mensah", "Amina Diallo"],
    linkedMachines: ["All Machines", "All Plants", "All Components"],
    activityHistory: [
      "Updated system permissions",
      "Created new company admin",
      "Changed role access scope",
    ],
  },
  {
    id: "2",
    name: "Company Admin",
    status: "active",
    users: 8,
    permissions: [
      { module: "Dashboard", view: true, create: false, edit: true, delete: false },
      { module: "Users", view: true, create: true, edit: true, delete: false },
      { module: "Roles", view: true, create: false, edit: false, delete: false },
      { module: "Machines", view: true, create: true, edit: true, delete: false },
      { module: "Reports", view: true, create: false, edit: true, delete: false },
      { module: "Alerts", view: true, create: true, edit: true, delete: false },
    ],
    assignedUsers: ["David Okafor", "Musa Bello", "Samuel Mensah"],
    linkedMachines: ["Plant A", "Plant B", "EX200-01 Excavator", "HD785-03 Dump Truck"],
    activityHistory: ["Added new user", "Updated company machine access", "Reviewed alert summary"],
  },
];

export default function RoleDetailsPage() {
  const { roleId } = useParams();
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [activities, setActivities] = useState<any[]>([]);
  const [roleDetails, setRoleDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch available roles on mount (if roleId is not in URL)
  useEffect(() => {
    let isMounted = true;
    const fetchRolesList = async () => {
      if (roleId) {
        setSelectedRoleId(roleId);
        return;
      }
      try {
        const response = await getRoles();
        let roles: any[] = [];
        if (Array.isArray(response)) {
          roles = response;
        } else if (response && Array.isArray((response as any).roles)) {
          roles = (response as any).roles;
        } else if (response && Array.isArray((response as any).data)) {
          roles = (response as any).data;
        } else if (
          response &&
          (response as any).data &&
          Array.isArray((response as any).data.roles)
        ) {
          roles = (response as any).data.roles;
        }

        if (isMounted) {
          setRolesList(roles);
          if (roles.length > 0) {
            // Default to super_admin or first role
            const superAdminRole = roles.find((r) => r.name === "super_admin");
            setSelectedRoleId(String(superAdminRole ? superAdminRole.id : roles[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load roles list:", err);
      }
    };
    fetchRolesList();
    return () => {
      isMounted = false;
    };
  }, [roleId]);

  // 2. Fetch specific role details when selectedRoleId changes
  useEffect(() => {
    let isMounted = true;
    const loadRoleDetails = async () => {
      if (!selectedRoleId) return;
      try {
        setLoading(true);
        const [activityLogs, details] = await Promise.all([
          superAdminMachineService.getDashboardRolesActivity(),
          superAdminMachineService.getDashboardRoleDetails(selectedRoleId),
        ]);
        if (isMounted) {
          setActivities(Array.isArray(activityLogs) ? activityLogs : []);
          setRoleDetails(details);
        }
      } catch (err) {
        console.error("Failed to load dashboard role data:", err);
        // Mock fallback if API fails
        const mock =
          rolesDetailsData.find((item) => String(item.id) === String(selectedRoleId)) ||
          rolesDetailsData[0];
        if (isMounted) setRoleDetails(mock);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRoleDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedRoleId]);

  const role =
    roleDetails ||
    rolesDetailsData.find((item) => String(item.id) === String(selectedRoleId)) ||
    rolesDetailsData[0];

  return (
    <div className="space-y-4">
      {/* Header with Title and Dropdown if embedded in dashboard */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#0f172a] sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Role Insights & Access Details
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            View live system permissions, assigned users, and activities per role.
          </p>
        </div>
        {!roleId && rolesList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Select Role:
            </span>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-gray-800 dark:bg-[#1e293b] dark:text-gray-300"
            >
              {rolesList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name === "super_admin"
                    ? "Super Admin"
                    : r.name === "admin"
                      ? "Company Admin"
                      : r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-[#0f172a]">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Activity History</h2>
        </div>
        <div
          className="max-h-[220px] space-y-2 overflow-y-auto 
  [scrollbar-width:none] 
  [-ms-overflow-style:none] 
  [&::-webkit-scrollbar]:hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-xs text-gray-500">
              No recent activity logs.
            </div>
          ) : (
            activities.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                      {item.roleName}
                    </h3>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-500`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{item.activity}</p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Users</p>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">
                    {item.userCount}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#0f172a]">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Permissions Matrix
          </h2>

          <div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  <th className="py-3">Module</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>

              <tbody>
                {role.permissions &&
                  role.permissions.map((permission: any) => (
                    <tr
                      key={permission.module}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {permission.module}
                      </td>
                      <td>
                        <Check value={permission.view} />
                      </td>
                      <td>
                        <Check value={permission.create} />
                      </td>
                      <td>
                        <Check value={permission.edit} />
                      </td>
                      <td>
                        <Check value={permission.delete} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <SectionCard title="Assigned Users" items={role.assignedUsers || []} />

        <SectionCard title="Linked Machines / Components" items={role.linkedMachines || []} />

        <SectionCard title="Selected Role Activity History" items={role.activityHistory || []} />
      </div>
    </div>
  );
}

function SectionCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#0f172a]">
      <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            {item}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-2">No items available</div>
        )}
      </div>
    </div>
  );
}

function Check({ value }: { value: boolean }) {
  return (
    <input
      type="checkbox"
      checked={value}
      readOnly
      className="h-4 w-4 cursor-default accent-blue-600"
    />
  );
}
