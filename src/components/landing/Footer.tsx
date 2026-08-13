import { Link } from "react-router";
import logo1 from "../../assets/images/landingpageimages/logo1.webp";

export default function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-slate-200 bg-white px-5 py-10 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Company */}
          <div className="flex flex-col">
            <Link to="/" className="inline-flex w-fit">
              <img src={logo1} alt="HMEC Logo" className="h-20 w-auto object-contain" />
            </Link>

            <p className="mt-6 max-w-[340px] text-[16px] leading-8 text-slate-600 dark:text-slate-400">
              AI-powered fleet intelligence platform for heavy mining operations. Monitor machine
              health, manage maintenance, generate intelligent reports, and optimize fleet
              performance from one unified dashboard.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Product
            </h3>

            <ul className="mt-6 space-y-4">
              <li>
                <Link
                  to="/features"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Features
                </Link>
              </li>

              <li>
                <Link
                  to="/maintenance"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Maintenance
                </Link>
              </li>

              <li>
                <Link
                  to="/reports"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Reports
                </Link>
              </li>

              <li>
                <Link
                  to="/plans"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Company
            </h3>

            <ul className="mt-6 space-y-4">
              <li>
                <Link
                  to="/about"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  About Us
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/careers"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Careers
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/blog"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Blog
                </Link>
              </li>

              <li>
                <Link
                  to="/contact"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[15px] font-extrabold uppercase tracking-[0.22em] text-slate-950 dark:text-white">
              Support
            </h3>

            <ul className="mt-6 space-y-4">
              <li>
                <Link
                  to="/company-admin/coming-soon/help-center"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Help Center
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/documentation"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Documentation
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/terms"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Terms of Service
                </Link>
              </li>

              <li>
                <Link
                  to="/company-admin/coming-soon/privacy-policy"
                  className="text-[16px] text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-600"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-500 md:flex-row">
          <p>
            © 2026 <span className="font-semibold text-slate-700 dark:text-white">HMEC</span>. All
            rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link
              to="/company-admin/coming-soon/privacy-policy"
              className="transition hover:text-blue-600"
            >
              Privacy
            </Link>

            <Link to="/company-admin/coming-soon/terms" className="transition hover:text-blue-600">
              Terms
            </Link>

            <Link to="/contact" className="transition hover:text-blue-600">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
