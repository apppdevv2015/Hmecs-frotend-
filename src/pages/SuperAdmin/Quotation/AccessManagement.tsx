import { useEffect, useMemo, useState, type FC } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Eye,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
  UserCheck,
  UserX,
  X,
  Loader2,
  ServerCrash,
  RefreshCw,
} from "lucide-react";

import AppSelect from "../../../components/ui/dropdown/AppSelect";
import {
  superAdminMachineService,
  type SuperAdminCompany,
} from "../../../services/SuperAdmin/machineService";
import { showSuccessToast, showErrorToast } from "../../../utils/toastUtils";

type AccountStatus = "Active" | "Inactive";
type DashboardAccess = "Full Access" | "No Access";

interface AccessCompany {
  id: string;
  adminId?: string;
  companyName: string;
  companyAdmin: string;
  adminEmail: string;
  role: string;
  status: AccountStatus;
  dashboardAccess: DashboardAccess;
  activatedOn: string;
}

interface SelectOption {
  label: string;
  value: string;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: FC<{ size?: number; className?: string }>;
  iconClassName: string;
  iconBackgroundClassName: string;
}

interface AccessBadgeProps {
  access: DashboardAccess;
}

interface DetailItemProps {
  label: string;
  value: string;
}

interface AccessDetailsModalProps {
  company: AccessCompany;
  onClose: () => void;
}

interface StatusConfirmationModalProps {
  company: AccessCompany;
  nextStatus: AccountStatus;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

interface StatusChangeRequest {
  company: AccessCompany;
  nextStatus: AccountStatus;
}

const STATUS_OPTIONS: SelectOption[] = [
  { label: "All Status", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

// ---------- Helpers ----------
const formatActivatedOn = (date?: string) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRoleLabel = (role: string) =>
  String(role || "admin")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatus = (company: SuperAdminCompany): AccountStatus => {
  if (typeof company.isActive === "boolean") {
    return company.isActive ? "Active" : "Inactive";
  }
  if (company.status === "Active" || company.status === "Inactive") {
    return company.status;
  }
  return "Inactive";
};

// Maps raw API company -> table row shape
const mapToAccessCompany = (company: SuperAdminCompany): AccessCompany => {
  const companyName =
    company.companyName ||
    company.company_name ||
    company.name ||
    "Unnamed Company";
  const status = getStatus(company);

  return {
    id: String(company.id),
    adminId: company.adminId || company.admin_id || undefined,
    companyName,
    companyAdmin: company.adminName || "Not assigned",
    adminEmail: company.adminEmail || company.email || "Not available",
    role: formatRoleLabel(
      (company as any).adminRole || (company as any).role || "admin",
    ),
    status,
    dashboardAccess: status === "Active" ? "Full Access" : "No Access",
    activatedOn: formatActivatedOn(company.createdAt || company.created_at),
  };
};

// ---------- Small presentational pieces ----------
const StatCard: FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconClassName,
  iconBackgroundClassName,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBackgroundClassName}`}
      >
        <Icon size={22} className={iconClassName} />
      </div>
    </div>
  </div>
);

const StatusPill: FC<{ status: AccountStatus }> = ({ status }) => {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`}
      />
      {status}
    </span>
  );
};

interface StatusToggleProps {
  status: AccountStatus;
  disabled: boolean;
  onChange: () => void;
}

const StatusToggle: FC<StatusToggleProps> = ({
  status,
  disabled,
  onChange,
}) => {
  const isActive = status === "Active";

  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? "Deactivate company" : "Activate company"}
        disabled={disabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
          isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            isActive ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>

      <span
        className={`text-sm font-semibold ${
          isActive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400"
        }`}
      >
        {status}
      </span>
    </div>
  );
};

const AccessBadge: FC<AccessBadgeProps> = ({ access }) => {
  const hasFullAccess = access === "Full Access";
  return (
    <span
      className={`inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold ${
        hasFullAccess
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {hasFullAccess ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
      {access}
    </span>
  );
};

const DetailItem: FC<DetailItemProps> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </p>
    <p className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-white">
      {value}
    </p>
  </div>
);

// ---------- View modal ----------
const AccessDetailsModal: FC<AccessDetailsModalProps> = ({
  company,
  onClose,
}) => {
  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Company Access
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-slate-900 dark:text-white">
              {company.companyName}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {company.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Building2
                size={18}
                className="text-blue-600 dark:text-blue-400"
              />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Company Information
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Company Name" value={company.companyName} />
              <DetailItem label="Company Admin" value={company.companyAdmin} />
              <DetailItem label="Admin Email" value={company.adminEmail} />
              <DetailItem label="Role" value={company.role} />
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck
                size={18}
                className="text-blue-600 dark:text-blue-400"
              />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Account Access
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Account Status
                </p>
                <div className="mt-2">
                  <StatusPill status={company.status} />
                </div>
              </div>

              <DetailItem
                label="Dashboard Access"
                value={company.dashboardAccess}
              />
              <DetailItem label="Activated On" value={company.activatedOn} />
            </div>
          </section>

        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// ---------- Confirmation modal ----------
const StatusConfirmationModal: FC<StatusConfirmationModalProps> = ({
  company,
  nextStatus,
  loading,
  onCancel,
  onConfirm,
}) => {
  const isActivating = nextStatus === "Active";

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                isActivating
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              }`}
            >
              {isActivating ? (
                <ShieldCheck size={21} />
              ) : (
                <ShieldOff size={21} />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {isActivating ? "Activate Company?" : "Deactivate Company?"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Are you sure you want to{" "}
                {isActivating ? "activate" : "deactivate"}{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {company.companyName}
                </span>
                ?
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`h-10 rounded-xl px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isActivating
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading
                ? "Updating..."
                : isActivating
                  ? "Activate"
                  : "Deactivate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// ---------- Main component ----------
const SuperAdminAccessManagement: FC = () => {
  const [companies, setCompanies] = useState<AccessCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "All">(
    "All",
  );

  const [selectedCompany, setSelectedCompany] = useState<
    AccessCompany | undefined
  >(undefined);
  const [pendingStatusChange, setPendingStatusChange] = useState<
    StatusChangeRequest | undefined
  >(undefined);
  const [updatingCompanyId, setUpdatingCompanyId] = useState("");

  // ---------- Fetch all company admins from API ----------
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError("");

      const list = await superAdminMachineService.getCompanies();
      setCompanies(list.map(mapToAccessCompany));
    } catch (err: any) {
      console.error("Failed to fetch company admins:", err);
      setError(err?.message || "Unable to load company administrators.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.companyName.toLowerCase().includes(normalizedSearch) ||
        company.companyAdmin.toLowerCase().includes(normalizedSearch) ||
        company.adminEmail.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" || company.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "Active").length;
  const inactiveCompanies = companies.filter(
    (c) => c.status === "Inactive",
  ).length;
  const fullAccessCompanies = companies.filter(
    (c) => c.dashboardAccess === "Full Access",
  ).length;

  // Called from inside the View modal
  const handleStatusRequest = (company: AccessCompany) => {
    const nextStatus: AccountStatus =
      company.status === "Active" ? "Inactive" : "Active";
    setPendingStatusChange({ company, nextStatus });
  };

  // Confirmed in the confirmation modal -> real API call
  const handleStatusConfirm = async () => {
    if (!pendingStatusChange) return;

    const { company, nextStatus } = pendingStatusChange;

    if (!company.adminId) {
      showErrorToast(
        `No administrator user account found for ${company.companyName}.`,
      );
      setPendingStatusChange(undefined);
      return;
    }

    setUpdatingCompanyId(company.id);

    try {
      const response: any = await superAdminMachineService.updateCompany(
        company.adminId,
        {
          companyName: company.companyName,
          companyCode: "", // not shown/edited on this screen
          adminName: company.companyAdmin,
          adminEmail: company.adminEmail,
          staffCount: 0,
          activePlan: "None",
          status: nextStatus,
        },
      );

      const nextAccess: DashboardAccess =
        nextStatus === "Active" ? "Full Access" : "No Access";

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === company.id
            ? { ...c, status: nextStatus, dashboardAccess: nextAccess }
            : c,
        ),
      );

      setSelectedCompany((current) =>
        current && current.id === company.id
          ? { ...current, status: nextStatus, dashboardAccess: nextAccess }
          : current,
      );

      showSuccessToast(
        response?.message || `${company.companyName} marked as ${nextStatus}`,
      );
    } catch (err: any) {
      console.error("Status update failed:", err);
      showErrorToast(err?.message || "Failed to update company status");
    } finally {
      setUpdatingCompanyId("");
      setPendingStatusChange(undefined);
    }
  };

  const handleStatusCancel = () => {
    if (updatingCompanyId.length > 0) return;
    setPendingStatusChange(undefined);
  };

  return (
    <section className="min-h-full w-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <ShieldCheck size={24} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  Access Management
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage company account status and dashboard access.
                </p>
              </div>
            </div>

            <button
              onClick={fetchCompanies}
              disabled={loading}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Companies"
            value={totalCompanies}
            icon={Building2}
            iconClassName="text-blue-600 dark:text-blue-400"
            iconBackgroundClassName="bg-blue-50 dark:bg-blue-500/10"
          />
          <StatCard
            label="Active Companies"
            value={activeCompanies}
            icon={UserCheck}
            iconClassName="text-emerald-600 dark:text-emerald-400"
            iconBackgroundClassName="bg-emerald-50 dark:bg-emerald-500/10"
          />
          <StatCard
            label="Inactive Companies"
            value={inactiveCompanies}
            icon={UserX}
            iconClassName="text-red-600 dark:text-red-400"
            iconBackgroundClassName="bg-red-50 dark:bg-red-500/10"
          />
          <StatCard
            label="Full Access"
            value={fullAccessCompanies}
            icon={Users}
            iconClassName="text-violet-600 dark:text-violet-400"
            iconBackgroundClassName="bg-violet-50 dark:bg-violet-500/10"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Company Access
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage dashboard access for company administrators.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search company or admin..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <AppSelect
                    options={STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(value: string) =>
                      setStatusFilter(value as AccountStatus | "All")
                    }
                    placeholder="Select status"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            {loading && (
              <div className="flex items-center justify-center gap-3 px-8 py-14 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Loading company administrators...
              </div>
            )}

            {!loading && error && (
              <div className="m-5 flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
                <ServerCrash className="h-10 w-10 text-red-600 dark:text-red-400" />
                <h3 className="mt-4 text-base font-semibold text-red-700 dark:text-red-300">
                  Unable to load records
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-red-600 dark:text-red-300">
                  {error}
                </p>
                <button
                  onClick={fetchCompanies}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <table className="w-full min-w-[640px] table-fixed text-left">
                <colgroup>
                  <col className="w-[38%]" />
                  <col className="w-[27%]" />
                  <col className="w-[20%]" />
                  <col className="w-[15%]" />
                </colgroup>

                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Company Name
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Admin Name
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-5">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <Building2 size={19} />
                          </div>
                          <p
                            className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                            title={company.companyName}
                          >
                            {company.companyName}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <p
                          className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                          title={company.companyAdmin}
                        >
                          {company.companyAdmin}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <StatusToggle
                          status={company.status}
                          disabled={updatingCompanyId === company.id}
                          onChange={() => handleStatusRequest(company)}
                        />
                      </td>

                      <td className="px-3 py-5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCompany(company)}
                          className="inline-flex h-10 w-[96px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredCompanies.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <Search size={21} />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                            No companies found
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            No company matches the current search or status
                            filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {selectedCompany !== undefined &&
        createPortal(
          <AccessDetailsModal
            company={selectedCompany}
            onClose={() => setSelectedCompany(undefined)}
          />,
          document.body,
        )}

      {pendingStatusChange !== undefined &&
        createPortal(
          <StatusConfirmationModal
            company={pendingStatusChange.company}
            nextStatus={pendingStatusChange.nextStatus}
            loading={updatingCompanyId.length > 0}
            onCancel={handleStatusCancel}
            onConfirm={handleStatusConfirm}
          />,
          document.body,
        )}
    </section>
  );
};

export default SuperAdminAccessManagement;