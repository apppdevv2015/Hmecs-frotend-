import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";

import { Toaster } from "react-hot-toast";

import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import Home from "./pages/SuperAdmin/SuperAdminDashboard";
import FleetIntelligence from "./pages/SuperAdmin/CompanyIntelligence";
import LandingPage from "./pages/Landing/LandingPage";
import PricingPage from "./pages/pricing/PricingPage";
import CartPage from "./pages/Cart/CartPage";

import PlanManagement from "./pages/SuperAdmin/PlanManagement/PlanManagement";
import UsersPage from "./pages/SuperAdmin/user-management/UsersPage";
import RolesPage from "./pages/SuperAdmin/user-management/RolesPage";
import RoleDetailsPage from "./components/super-admin/dashboard/RoleDetails";

import CompanyAdminDashboard from "./pages/CompanyAdmin/CompanyAdminDashboard";
import ComponentRegister from "./pages/CompanyAdmin/ComponentRegister";
import MaintenanceLog from "./pages/CompanyAdmin/MaintenanceLog";
import FleetHeatMap from "./pages/CompanyAdmin/FleetHeatMap";
import AddComponent from "./pages/CompanyAdmin/AddComponent";

import AccessDenied from "./pages/AccessDenied";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";
import StaffManagement from "./pages/CompanyAdmin/StaffManagement";
import MachineManagement from "./pages/CompanyAdmin/MachineManagement";
import AlertsPage from "./pages/CompanyAdmin/AlertsPage";
import ComingSoon from "./pages/ComingSoon";
import SubscriptionHistory from "./pages/CompanyAdmin/SubscriptionHistory";

import SuperAdminLogin from "./pages/AuthPages/SuperAdminLogin";
import CompanyAdminsPage from "./pages/SuperAdmin/CompanyManagment/CompanyAdminsPage";

import PlanAndBilling from "./pages/SuperAdmin/PlanAndBilling";
import SuperAdminComponents from "./pages/SuperAdmin/Asset Managment/Components";
import Operators from "./pages/SuperAdmin/CompanyManagment/Operators";
import Mechanics from "./pages/SuperAdmin/CompanyManagment/mechanics";

import EngineerDashboard from "./pages/Engineer/EngineerDashboard";
import EngineerTasks from "./pages/Engineer/EngineerTasks";
import EngineerMachines from "./pages/Engineer/EngineerMachines";
import EngineerAlerts from "./pages/Engineer/EngineerAlerts";
import EngineerMaintenance from "./pages/Engineer/EngineerMaintenance";
import EngineerComponent from "./pages/Engineer/EngineerComponent";
import ServiceLogs from "./pages/Engineer/ServiceLogs";

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/plans" element={<PricingPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Super Admin Routes */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={["super_admin", "superadmin", "system_admin"]}
            />
          }
        >
          <Route element={<AppLayout role="super_admin" />}>
            <Route
              path="/super-admin"
              element={<Navigate to="/super-admin/dashboard" replace />}
            />

            <Route path="/super-admin/dashboard" element={<Home />} />

            <Route
              path="/super-admin/intelligence"
              element={<FleetIntelligence />}
            />

            <Route path="/admin-management/users" element={<UsersPage />} />
            <Route path="/admin-management/roles" element={<RolesPage />} />

            <Route
              path="/admin-management/roles/:roleId"
              element={<RoleDetailsPage />}
            />

            <Route
              path="/admin-management/plans"
              element={<PlanManagement />}
            />

            {/* Fixed Company Admin Management Route */}
            <Route
              path="/super-admin/company-admins"
              element={<CompanyAdminsPage />}
            />

            {/* Old route redirect, so old sidebar/dashboard links do not show 404 */}
            <Route
              path="/company-admins"
              element={<Navigate to="/super-admin/company-admins" replace />}
            />

            <Route path="/super-admin/operators" element={<Operators />} />
            <Route path="/super-admin/mechanics" element={<Mechanics />} />

            <Route
              path="/super-admin/plans-billing"
              element={<PlanAndBilling />}
            />

            <Route
              path="/super-admin/components"
              element={<SuperAdminComponents />}
            />

            <Route path="/blank" element={<Blank />} />
            <Route path="/form-elements" element={<FormElements />} />
            <Route path="/basic-tables" element={<BasicTables />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>
        </Route>

        {/* Company Admin Routes */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={["company_admin", "admin", "companyadmin"]}
            />
          }
        >
          <Route element={<AppLayout role="company_admin" />}>
            <Route
              path="/company-admin"
              element={<Navigate to="/company-admin/dashboard" replace />}
            />

            <Route
              path="/company-admin/dashboard"
              element={<CompanyAdminDashboard />}
            />

            <Route
              path="/company-admin/register"
              element={<ComponentRegister />}
            />

            <Route
              path="/company-admin/maintenance"
              element={<MaintenanceLog />}
            />

            <Route path="/company-admin/heatmap" element={<FleetHeatMap />} />

            <Route
              path="/company-admin/add-component"
              element={<AddComponent />}
            />

            <Route path="/company-admin/alerts" element={<AlertsPage />} />
            <Route path="/company-admin/staff" element={<StaffManagement />} />

            <Route
              path="/company-admin/machines"
              element={<MachineManagement />}
            />

            <Route
              path="/company-admin/subscriptions"
              element={<SubscriptionHistory />}
            />
          </Route>
        </Route>

        {/* Engineer Routes */}
        <Route element={<RoleProtectedRoute allowedRoles={["engineer"]} />}>
          <Route element={<AppLayout role="engineer" />}>
            <Route
              path="/engineer"
              element={<Navigate to="/engineer/dashboard" replace />}
            />

            <Route path="/engineer/dashboard" element={<EngineerDashboard />} />
            <Route path="/engineer/tasks" element={<EngineerTasks />} />
            <Route path="/engineer/machines" element={<EngineerMachines />} />
            <Route path="/engineer/alerts" element={<EngineerAlerts />} />

            <Route
              path="/engineer/maintenance"
              element={<EngineerMaintenance />}
            />

            <Route
              path="/engineer/components"
              element={<EngineerComponent />}
            />

            <Route path="/engineer/service-logs" element={<ServiceLogs />} />
          </Route>
        </Route>

        {/* Common Profile Route */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={[
                "super_admin",
                "superadmin",
                "system_admin",
                "company_admin",
                "admin",
                "companyadmin",
                "engineer",
              ]}
            />
          }
        >
          <Route path="/profile" element={<UserProfiles />} />
        </Route>

        {/* Coming Soon Routes */}
        <Route
          path="/company-admin/coming-soon/:module"
          element={<ComingSoon />}
        />

        <Route path="/coming-soon" element={<ComingSoon />} />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            zIndex: 999999,
          },
        }}
      />
    </Router>
  );
}