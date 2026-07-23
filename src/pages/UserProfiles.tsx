import { useEffect, useState, type ReactNode } from "react";
import AppSelect from "../components/ui/dropdown/AppSelect";
import {
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import StorageService, { STORAGE_KEYS } from "../services/storage.service";

type ProfileUser = {
  id?: string | number;

  name?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;
  role?: string;
  role_name?: string;

  companyId?: string;
  company_id?: string;
  companyName?: string;
  company_name?: string;
  company?: string;

  mobile_number?: string;
  phone?: string;

  avatar?: string;
  profile_image?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  postalCode?: string;
  tax_id?: string;
  taxId?: string;
  created_at?: string;
  createdAt?: string;
};

type ProfileFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  address: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000/api";

const getToken = () => StorageService.get<string>(STORAGE_KEYS.TOKEN) || "";

const decodeToken = () => {
  try {
    const token = getToken();
    if (!token) return null;

    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
};

const normalizeProfileResponse = (data: any): ProfileUser | null => {
  return (
    data?.data?.user ||
    data?.data?.profile ||
    data?.data ||
    data?.user ||
    data?.profile ||
    data ||
    null
  );
};

const getStoredUser = (): ProfileUser => {
  try {
    const storedUser = StorageService.get<ProfileUser>(STORAGE_KEYS.USER);

    if (storedUser) {
      return storedUser;
    }

    const decoded = decodeToken();

    return {
      id: decoded?.id || decoded?.user?.id || decoded?.data?.user?.id,
      name:
        decoded?.name ||
        decoded?.user?.name ||
        StorageService.get<string>(STORAGE_KEYS.NAME) ||
        "",
      email:
        decoded?.email ||
        decoded?.user?.email ||
        StorageService.get<string>(STORAGE_KEYS.EMAIL) ||
        "",
      role:
        decoded?.role ||
        decoded?.role_name ||
        decoded?.user?.role ||
        decoded?.user?.role_name ||
        StorageService.get<string>(STORAGE_KEYS.ROLE) ||
        "",
      companyId:
        StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) ||
        decoded?.companyId ||
        decoded?.company_id ||
        decoded?.user?.companyId ||
        decoded?.user?.company_id ||
        "",
      companyName:
        decoded?.companyName ||
        decoded?.company_name ||
        decoded?.user?.companyName ||
        decoded?.user?.company_name ||
        "",
    };
  } catch (error) {
    console.error("Stored user parse error:", error);
    return {};
  }
};

const formatRoleName = (role?: string) => {
  if (!role) return "User";

  const normalizedRole = role
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");

  const roleMap: Record<string, string> = {
    super_admin: "Super Admin",
    superadmin: "Super Admin",
    system_admin: "Super Admin",

    admin: "Company Admin",
    company_admin: "Company Admin",
    companyadmin: "Company Admin",

    Artisans: "Artisans",
    operator: "Operator",
    planner: "Operator",
    mechanic: "Mechanic",
    supervisor: "Supervisor",
    viewer: "Viewer",
  };

  return (
    roleMap[normalizedRole] ||
    normalizedRole
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

const getFullName = (user: ProfileUser) => {
  const firstName = user.first_name || user.firstName || "";
  const lastName = user.last_name || user.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return user.name || fullName || user.email?.split("@")[0] || "User";
};

const getFirstName = (user: ProfileUser) => {
  const fullName = getFullName(user);
  return user.first_name || user.firstName || fullName.split(" ")[0] || "";
};

const getLastName = (user: ProfileUser) => {
  const fullName = getFullName(user);

  return (
    user.last_name ||
    user.lastName ||
    fullName.split(" ").slice(1).join(" ") ||
    ""
  );
};

const getCompanyName = (user: ProfileUser) => {
  return (
    user.companyName ||
    user.company_name ||
    user.company ||
    user.companyId ||
    user.company_id ||
    "HME Intelligence"
  );
};

const getCreatedDate = (user: ProfileUser) => {
  const dateValue = user.created_at || user.createdAt;

  if (!dateValue) return "-";

  try {
    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const getUserInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
};

const buildFormData = (user: ProfileUser): ProfileFormData => {
  return {
    firstName: getFirstName(user),
    lastName: getLastName(user),
    phone: user.mobile_number || user.phone || "",
    email: user.email || "",
    city: user.city || "",
    state: user.state || "",
    country: user.country || "India",
    address: user.address || "",
  };
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-white">
          {value || "-"}
        </p>
      </div>
    </div>
  );
};

const TextInput = ({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
      />
    </div>
  );
};

const SelectInput = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <AppSelect
        placeholder={`Select ${label}`}
        value={value}
        onChange={onChange}
        options={options.map((item) => ({
          value: item,
          label: item,
        }))}
      />
    </div>
  );
};

export default function UserProfile() {
  const [user, setUser] = useState<ProfileUser>(() => getStoredUser());
  const [formData, setFormData] = useState<ProfileFormData>(() =>
    buildFormData(getStoredUser()),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fullName = getFullName(user);
  const roleName = formatRoleName(user.role_name || user.role);
  const companyName = getCompanyName(user);
  const email = user.email || formData.email;
  const phone = user.mobile_number || user.phone || formData.phone;

  const defaultProfileImage =
    "https://i.pinimg.com/1200x/ed/5d/68/ed5d686b135d8923f3f10b5b44f64f9e.jpg";

  const profileImage = user.profile_image || user.avatar || defaultProfileImage;

  const memberSince = getCreatedDate(user);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to fetch profile");
        }

        const currentUser = normalizeProfileResponse(data);

        if (!currentUser) {
          throw new Error("Profile data not found");
        }

        setUser(currentUser);
        setFormData(buildFormData(currentUser));
        StorageService.set(STORAGE_KEYS.USER, currentUser);
      } catch (error: any) {
        console.error("Profile fetch error:", error);
        toast.error(error?.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const updateField = (key: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUpdateProfile = async () => {
    const token = getToken();

    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        mobile_number: formData.phone.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        address: formData.address.trim(),
      };

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      const updatedProfile = normalizeProfileResponse(data) || {
        ...user,
        ...payload,
      };

      setUser(updatedProfile);
      setFormData(buildFormData(updatedProfile));
      StorageService.set(STORAGE_KEYS.USER, updatedProfile);

      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1500px]">
        {loading && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile information...
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-900 px-6 py-12 shadow-lg sm:px-8 lg:px-10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-10 top-0 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="absolute right-20 top-10 h-56 w-56 rounded-full bg-blue-300 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-cyan-300 blur-3xl" />
          </div>

          <div className="relative flex min-h-[180px] items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
                HME Intelligence
              </p>

              <h2 className="mt-3 text-3xl font-bold text-white">
                Welcome, {fullName}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                View and manage your company profile, account settings, and
                system activity from one place.
              </p>
            </div>
          </div>
        </section>

        <section className="relative -mt-20 grid grid-cols-1 gap-6 px-4 pb-8 lg:grid-cols-[310px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center px-5 pb-5 pt-6">
              <div className="relative">
                <img
                  src={profileImage}
                  alt={fullName || "User profile"}
                  className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-900"
                  onError={(event) => {
                    event.currentTarget.src = defaultProfileImage;
                  }}
                />

                <button
                  type="button"
                  className="absolute bottom-2 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition hover:bg-blue-700 dark:border-slate-900"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                {fullName}
              </h3>

              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {roleName}
              </p>

              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            </div>

            <div className="mx-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 mb-5">
              <InfoRow
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Company"
                value={
                  companyName.includes("-0000-") ||
                  companyName === "HME Intelligence"
                    ? ""
                    : companyName
                }
              />
              <InfoRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Role"
                value={roleName}
              />

              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={phone}
              />

              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={email}
              />
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800">
              {["Account Settings"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`relative px-3 pb-4 text-sm font-semibold transition ${
                    index === 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {tab}

                  {index === 0 && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TextInput
                label="First Name"
                value={formData.firstName}
                onChange={(value) => updateField("firstName", value)}
              />

              <TextInput
                label="Last Name"
                value={formData.lastName}
                onChange={(value) => updateField("lastName", value)}
              />

              <TextInput
                label="Phone Number"
                value={formData.phone}
                onChange={(value) => updateField("phone", value)}
              />

              <TextInput
                label="Email Address"
                value={formData.email}
                type="email"
                disabled
                onChange={(value) => updateField("email", value)}
              />

              <SelectInput
                label="Country"
                value={formData.country}
                onChange={(value) => updateField("country", value)}
                options={["India", "United States", "United Kingdom", "Canada"]}
              />

              <TextInput
                label="Address"
                value={formData.address}
                onChange={(value) => updateField("address", value)}
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                Profile information is loaded from the logged-in user session.
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleUpdateProfile}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 focus:ring-4 focus:ring-blue-500/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Profile
                  </>
                )}
              </button>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
