import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import logo1 from "../../assets/images/landingpageimages/logo1.webp";
import StorageService, { STORAGE_KEYS } from "../../services/storage.service";

type NavbarProps = {
  active?: string;
  setActive?: (value: string) => void;
};

const navLinks = [
  { path: "/", label: "Home" },
  { path: "/features", label: "Features" },
  { path: "/maintenance", label: "Maintenance" },
  { path: "/reports", label: "Reports" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
];

export default function Navbar({ active = "home", setActive }: NavbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/signin" || location.pathname === "/signup";

  const token =
    StorageService.get<string>(STORAGE_KEYS.TOKEN) ||
    StorageService.get<string>(STORAGE_KEYS.AUTH_TOKEN) ||
    StorageService.get<string>(STORAGE_KEYS.ACCESS_TOKEN);

  const showDashboard = Boolean(token) && !isAuthPage;

  useEffect(() => {
    const savedTheme = StorageService.get<string>(STORAGE_KEYS.THEME);

    const shouldUseDark =
      savedTheme === "dark" ||
      (!savedTheme && document.documentElement.classList.contains("dark"));

    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;

    document.documentElement.classList.toggle("dark", nextDark);
    StorageService.set(STORAGE_KEYS.THEME, nextDark ? "dark" : "light");

    setIsDark(nextDark);
  };

  const handleDashboardClick = () => {
    const role =
      StorageService.get<string>(STORAGE_KEYS.ROLE) ||
      StorageService.get<string>(STORAGE_KEYS.USER_ROLE) ||
      StorageService.get<string>(STORAGE_KEYS.USER_TYPE);

    setIsMenuOpen(false);

    const normalizedRole = role?.toLowerCase().trim();

    if (normalizedRole === "super_admin" || normalizedRole === "system_admin") {
      navigate("/super-admin/dashboard");
      return;
    }

    if (normalizedRole === "company_admin" || normalizedRole === "admin") {
      navigate("/company-admin/dashboard");
      return;
    }

    if (normalizedRole === "operator") {
      navigate("/operator/dashboard");
      return;
    }

    if (normalizedRole === "mechanic") {
      navigate("/mechanic/dashboard");
      return;
    }

    navigate("/signin");
  };

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");

      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [location.hash]);

  return (
 <header className="fixed inset-x-0 top-0 z-[9999] border-b border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-3xl transition-all duration-300 dark:border-white/10 dark:bg-[#050817]/80 dark:text-white">
      <div className="mx-auto flex h-[90px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={logo1}
            alt="HME Logo"
            className="h-[58px] w-auto object-contain transition-transform duration-300 hover:scale-105 sm:h-[70px]"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-9 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
            className={`group relative py-2 text-[15px] font-semibold tracking-wide transition-all duration-300 hover:-translate-y-[1px] ${
                location.pathname === link.path
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-700/90 hover:text-blue-600 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              {link.label}

              <span
                className={`absolute -bottom-1 left-0 h-[3px] rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300 ${
                  location.pathname === link.path
                    ? "w-full"
                    : "w-0 group-hover:w-full"
                }`}
              />
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
         className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-800 shadow-md backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:rotate-180 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <Link
            to="/signin"
            className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-white sm:inline-flex"
          >
            Login
          </Link>

          <Link
            to="/plans"
            className="hidden rounded-lg bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 sm:inline-flex"
          >
            Get Started
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-100 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 lg:hidden"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed top-[90px] left-0 right-0 z-[9998] border-t border-slate-200 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#050817]/95 lg:hidden">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  location.pathname === link.path
                    ? "bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link
                to="/signin"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 dark:border-white/15 dark:text-white"
              >
                Login
              </Link>

              <Link
                to="/plans"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
