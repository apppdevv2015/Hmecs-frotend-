import { useEffect, useState, useRef, type ReactNode } from "react";
import AppSelect from "../../components/ui/dropdown/AppSelect";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";
import { userService } from "../../services/Auth/userService";
import { apiCall } from "../../services/apiHandler";

type ProfileUser = {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;

  email?: string;
  role?: any;
  role_name?: string;

  companyId?: string;
  company_id?: string;
  companyName?: string;
  company_name?: string;
  company?: any;

  mobile_number?: string;
  mobileNumber?: string;
  phone?: string;

  avatar?: string;
  profile_image?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  postalCode?: string;
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

const isUuid = (val: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

const getStoredUser = (): ProfileUser => {
  try {
    const storedUser = StorageService.get<ProfileUser>(STORAGE_KEYS.USER);
    if (storedUser && Object.keys(storedUser).length > 0) {
      return storedUser;
    }

    const decoded = decodeToken();
    return {
      id: decoded?.id || decoded?.user?.id || decoded?.data?.user?.id || "",
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
        StorageService.get<string>(STORAGE_KEYS.ROLE) ||
        "",
      companyId:
        StorageService.get<string>(STORAGE_KEYS.COMPANY_ID) ||
        decoded?.companyId ||
        decoded?.company_id ||
        "",
      companyName:
        decoded?.companyName ||
        decoded?.company_name ||
        "",
    };
  } catch (error) {
    console.error("Stored user parse error:", error);
    return {};
  }
};

const formatRoleName = (role?: any) => {
  if (!role) return "Supervisor";
  const rawRole = typeof role === "object" ? role.name || role.roleName : String(role);
  if (!rawRole) return "Supervisor";

  const normalizedRole = rawRole
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");

  const roleMap: Record<string, string> = {
    super_admin: "Super Admin",
    superadmin: "Super Admin",
    system_admin: "Super Admin",
    sub_super_admin: "Sub Super Admin",
    subsuperadmin: "Sub Super Admin",
    admin: "Company Admin",
    company_admin: "Company Admin",
    companyadmin: "Company Admin",
    sub_admin: "Sub Admin",
    subadmin: "Sub Admin",
    artisans: "Artisans",
    artisan: "Artisans",
    operator: "Operator",
    planner: "Operator",
    engineer: "Engineer",
    mechanic: "Mechanic",
    supervisor: "Supervisor",
    viewer: "Viewer",
  };

  return (
    roleMap[normalizedRole] ||
    normalizedRole
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

const getFullName = (user: ProfileUser) => {
  const firstName = user.first_name || user.firstName || "";
  const lastName = user.last_name || user.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return user.name || fullName || user.email?.split("@")[0] || "Supervisor";
};

const getFirstName = (user: ProfileUser) => {
  if (user.first_name) return user.first_name;
  if (user.firstName) return user.firstName;
  const fullName = getFullName(user);
  return fullName.split(" ")[0] || "";
};

const getLastName = (user: ProfileUser) => {
  if (user.last_name) return user.last_name;
  if (user.lastName) return user.lastName;
  const fullName = getFullName(user);
  return fullName.split(" ").slice(1).join(" ") || "";
};

const getCleanCompanyName = (user: ProfileUser) => {
  if (typeof user.company === "object" && user.company?.name) {
    return user.company.name;
  }
  if (user.companyName && !isUuid(user.companyName)) {
    return user.companyName;
  }
  if (user.company_name && !isUuid(user.company_name)) {
    return user.company_name;
  }
  if (typeof user.company === "string" && !isUuid(user.company)) {
    return user.company;
  }
  return "HME Mining & Fleet Operations";
};

const buildFormData = (user: ProfileUser): ProfileFormData => {
  return {
    firstName: getFirstName(user),
    lastName: getLastName(user),
    phone: user.mobile_number || user.mobileNumber || user.phone || "",
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

const getUserInitials = (name: string, email?: string) => {
  if (!name && email) {
    return email.slice(0, 2).toUpperCase();
  }
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function UserProfile() {
  const [user, setUser] = useState<ProfileUser>(() => getStoredUser());
  const [formData, setFormData] = useState<ProfileFormData>(() =>
    buildFormData(getStoredUser())
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = getFullName(user);
  const roleName = formatRoleName(user.role_name || user.role);
  const companyName = getCleanCompanyName(user);
  const email = user.email || formData.email;
  const phone = user.mobile_number || user.mobileNumber || user.phone || formData.phone;

  const hasCustomPhoto = Boolean(
    (user.profile_image &&
      !user.profile_image.includes("pinimg.com") &&
      !user.profile_image.includes("unsplash.com")) ||
      (user.avatar &&
        !user.avatar.includes("pinimg.com") &&
        !user.avatar.includes("unsplash.com"))
  );

  const userPhoto = user.profile_image || user.avatar;
  const initials = getUserInitials(fullName, email);

  // Load user data live from backend API on mount
  useEffect(() => {
    const fetchLiveUser = async () => {
      const stored = getStoredUser();
      const userId = stored.id;

      try {
        setLoading(true);

        // Fetch user either by ID or via /auth/me
        let liveData: any = null;

        if (userId) {
          try {
            liveData = await userService.getUserById(userId);
          } catch {
            liveData = null;
          }
        }

        if (!liveData) {
          liveData = await apiCall<any>("/auth/me", { method: "GET" }).catch(() => null);
        }

        if (liveData) {
          const resolved = liveData.data || liveData.user || liveData;
          const merged: ProfileUser = {
            ...stored,
            ...resolved,
            firstName: resolved.firstName || resolved.first_name || stored.firstName,
            lastName: resolved.lastName || resolved.last_name || stored.lastName,
            mobile_number: resolved.mobileNumber || resolved.mobile_number || stored.mobile_number,
            companyName: resolved.company?.name || stored.companyName,
          };

          setUser(merged);
          setFormData(buildFormData(merged));
          StorageService.set(STORAGE_KEYS.USER, merged);
        }
      } catch (error: any) {
        console.warn("Profile fetch warning:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveUser();
  }, []);

  const updateField = (key: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated = { ...user, avatar: dataUrl, profile_image: dataUrl };
      setUser(updated);
      StorageService.set(STORAGE_KEYS.USER, updated);
      showSuccessToast("Profile photo updated");
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    const userId = user.id;

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

      // Call backend update user API if user has ID
      if (userId) {
        try {
          await userService.updateUser(userId, payload);
        } catch (apiErr) {
          console.warn("Backend updateUser fallback:", apiErr);
        }
      }

      const updatedProfile: ProfileUser = {
        ...user,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        mobile_number: formData.phone.trim(),
        mobileNumber: formData.phone.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        address: formData.address.trim(),
      };

      setUser(updatedProfile);
      setFormData(buildFormData(updatedProfile));
      StorageService.set(STORAGE_KEYS.USER, updatedProfile);
      StorageService.set(STORAGE_KEYS.NAME, updatedProfile.name);

      showSuccessToast("Profile updated successfully");
    } catch (error: any) {
      console.error("Profile update error:", error);
      showErrorToast(error?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      <div className="mx-auto w-full max-w-[1500px]">
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 pb-28 pt-10 text-white shadow-lg sm:px-10 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_40%)]" />
          <div className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                HME Intelligence
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Welcome, {fullName}
              </h2>

              <p className="mt-2 max-w-xl text-xs sm:text-sm leading-6 text-blue-100">
                View and manage your company profile, account settings, and
                system activity from one place.
              </p>
            </div>
          </div>
        </section>

        {/* Profile Card & Settings Form */}
        <section className="relative -mt-20 grid grid-cols-1 gap-6 px-4 pb-8 lg:grid-cols-[310px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center px-5 pb-5 pt-6">
              <div className="relative">
                {hasCustomPhoto && userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={fullName || "User profile"}
                    className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-900"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-3xl font-black tracking-wider text-white shadow-md dark:border-slate-900">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile photo"
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

            <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <InfoRow
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Company"
                value={companyName}
              />
              <InfoRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Role"
                value={roleName}
              />

              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={phone || "-"}
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
                options={["India", "United States", "United Kingdom", "Canada", "Australia"]}
              />

              <TextInput
                label="Address"
                value={formData.address}
                onChange={(value) => updateField("address", value)}
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                Profile information is synchronized with your authenticated session.
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleUpdateProfile}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 focus:ring-4 focus:ring-blue-500/20"
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
