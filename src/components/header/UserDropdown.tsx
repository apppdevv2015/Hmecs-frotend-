import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StorageService, {
  STORAGE_KEYS,
} from "../../services/storage.service";
import { showSuccessToast } from "../../utils/toastUtils";

function normalizeRole(role?: string | null) {
  return String(role || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/_+$/g, "");
}

function getProfilePath() {
  try {
    const userData =
      StorageService.get<any>(STORAGE_KEYS.USER) || {};

    const role = normalizeRole(
      userData?.role ||
        userData?.role_name ||
        userData?.user?.role ||
        userData?.user?.role_name ||
        StorageService.get<string>(
          STORAGE_KEYS.ROLE,
        ) ||
        "",
    );

    if (
      role === "super_admin" ||
      role === "superadmin" ||
      role === "system_admin"
    ) {
      return "/super-admin/profile";
    }

    if (
      role === "sub_super_admin" ||
      role === "subsuperadmin"
    ) {
      return "/sub-super-admin/profile";
    }

    if (
      role === "company_admin" ||
      role === "companyadmin" ||
      role === "admin"
    ) {
      return "/company-admin/profile";
    }

    if (
      role === "sub_admin" ||
      role === "subadmin"
    ) {
      return "/sub-admin/profile";
    }

    if (role === "Artisans") {
      return "/Artisans/profile";
    }

    if (role === "operator" || role === "planner") {
      return "/operator/profile";
    }

    return "/signin";
  } catch {
    return "/signin";
  }
}

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  const handleLogout = () => {
    [
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.ROLE,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.SELECTED_PLAN,
      STORAGE_KEYS.EMAIL,
      STORAGE_KEYS.NAME,
      STORAGE_KEYS.COMPANY_ID,
    ].forEach((key) =>
      StorageService.remove(key),
    );

    StorageService.sessionRemove(
      "login-toast-shown",
    );

    showSuccessToast(
      "Logout Successfully",
      {
        duration: 1500,
      },
    );

    setIsOpen(false);

    setTimeout(() => {
      navigate("/signin", {
        replace: true,
      });
    }, 1500);
  };

  let userData: any = null;

  try {
    userData =
      StorageService.get<any>(
        STORAGE_KEYS.USER,
      ) || null;
  } catch {
    userData = null;
  }

  const userName =
    userData?.name ||
    `${
      userData?.first_name || ""
    } ${
      userData?.last_name || ""
    }`.trim() ||
    StorageService.get<string>(
      STORAGE_KEYS.NAME,
    ) ||
    StorageService.get<string>(
      STORAGE_KEYS.USER_NAME,
    ) ||
    "User";

  const userEmail =
    userData?.email ||
    StorageService.get<string>(
      STORAGE_KEYS.EMAIL,
    ) ||
    "user@example.com";

  const profilePath =
    getProfilePath();

  return (
    <>
      <div
        ref={dropdownRef}
        className="relative"
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(
              (prev) => !prev,
            );
          }}
          className="flex items-center text-gray-700 dark:text-gray-400"
        >
          <span className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700 lg:h-11 lg:w-11">
            <img
              src="/images/user/owner.jpg"
              alt="User"
              className="h-full w-full object-cover"
            />
          </span>

          <span className="ml-3 mr-1 hidden max-w-[120px] truncate font-medium text-theme-sm text-gray-700 dark:text-gray-300 lg:block">
            {userName}
          </span>

          <svg
            className={`hidden transition-transform duration-200 lg:block ${
              isOpen
                ? "rotate-180"
                : ""
            } stroke-gray-500 dark:stroke-gray-400`}
            width="18"
            height="20"
            viewBox="0 0 18 20"
            fill="none"
          >
            <path
              d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            className="absolute right-0 z-99999 mt-3 w-[270px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
              <span className="block truncate font-semibold text-gray-800 text-theme-sm dark:text-white">
                {userName}
              </span>

              <span className="mt-1 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {userEmail}
              </span>
            </div>

            <ul className="mt-3 flex flex-col gap-1 border-b border-gray-200 pb-3 dark:border-gray-800">
              <li>
                <Link
                  to={profilePath}
                  onClick={() =>
                    setIsOpen(false)
                  }
                  className="flex items-center rounded-xl px-3 py-2 font-medium text-gray-700 text-theme-sm transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Edit Profile
                </Link>
              </li>
            </ul>

            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(
                  true,
                )
              }
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-red-50 px-3 py-2.5 text-center font-semibold text-red-600 text-theme-sm transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Log Out
            </button>
          </div>
        )}
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Logout Confirmation
              </h3>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to logout from your account?
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  setShowLogoutModal(
                    false,
                  )
                }
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowLogoutModal(
                    false,
                  );
                  handleLogout();
                }}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}