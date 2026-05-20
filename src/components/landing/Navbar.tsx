import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import logo1 from "../../assets/images/landingpageimages/logo1.png";

type NavbarProps = {
  active?: string;
  setActive?: (value: string) => void;
};

const navLinks = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "maintenance", label: "Maintenance" },
  { id: "reports", label: "Reports" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export default function Navbar({ active = "home", setActive }: NavbarProps) {
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  

  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/signin" || location.pathname === "/signup";



  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");

  const showDashboard = Boolean(token) && !isAuthPage;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    const shouldUseDark =
      savedTheme === "dark" ||
      (!savedTheme && document.documentElement.classList.contains("dark"));

    document.documentElement.classList.toggle("dark", shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);


  const toggleTheme = () => {
    const nextDark = !isDark;

    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");

    setIsDark(nextDark);
  };

  const scrollToSection = (id: string) => {
    setActive?.(id);
    setIsMenuOpen(false);

    const section = document.getElementById(id);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    navigate(`/#${id}`);
  };

  const handleDashboardClick = () => {
    const role =
      localStorage.getItem("role") ||
      localStorage.getItem("userRole") ||
      localStorage.getItem("user_type");

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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 text-slate-900 shadow-sm backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-[#050817]/95 dark:text-white">
      <div className="mx-auto flex h-[86px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[90px] lg:px-8">
        <Link to="/" className="flex items-center">
          <img
            src={logo1}
            alt="HME Logo"
            className="h-[60px] w-auto object-contain sm:h-[76px]"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className={`relative text-sm font-semibold tracking-tight transition ${
                active === link.id
                  ? "text-blue-600 dark:text-white"
                  : "text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {link.label}

              {active === link.id && (
                <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-blue-600 dark:bg-white" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-800 transition hover:bg-slate-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

         
            <>
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
            </>
          

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

      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg dark:border-white/10 dark:bg-[#050817] lg:hidden">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  active === link.id
                    ? "bg-blue-50 text-blue-600 dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </button>
            ))}

            <div className="grid grid-cols-2 gap-3 pt-3">
             
                <>
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
                </>
              
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
