import { useNotifications } from "./context/NotificationContext";

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { Suspense, lazy } from "react";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import AccessDenied from "./pages/AccessDenied";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";

import { useEffect } from "react";
import socketService from "./services/socketService";

import StorageService, { STORAGE_KEYS } from "./services/storage.service";

// ---------------- Public ----------------

const LandingPage = lazy(() => import("./pages/Landing/LandingPage"));
const PricingPage = lazy(() => import("./pages/pricing/PricingPage"));
const CartPage = lazy(() => import("./pages/Cart/CartPage"));

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const SuperAdminLogin = lazy(() => import("./pages/AuthPages/SuperAdminLogin"));

// ---------------- Common ----------------

const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

// ---------------- UI Pages ----------------

const Videos = lazy(() => import("./pages/UiElements/Videos"));
const Images = lazy(() => import("./pages/UiElements/Images"));
const Alerts = lazy(() => import("./pages/UiElements/Alerts"));
const Badges = lazy(() => import("./pages/UiElements/Badges"));
const Avatars = lazy(() => import("./pages/UiElements/Avatars"));
const Buttons = lazy(() => import("./pages/UiElements/Buttons"));

const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));

const BasicTables = lazy(() => import("./pages/Tables/BasicTables"));
const FormElements = lazy(() => import("./pages/Forms/FormElements"));
const Blank = lazy(() => import("./pages/Blank"));

// ---------------- Super Admin ----------------

const Home = lazy(() => import("./dashboards/super-admin/SuperAdminDashboard"));

const FleetIntelligence = lazy(() => import("./dashboards/super-admin/CompanyIntelligence"));

const PlanManagement = lazy(() => import("./dashboards/super-admin/PlanManagement/PlanManagement"));

const UsersPage = lazy(() => import("./dashboards/super-admin/user-management/UsersPage"));

const RolesPage = lazy(() => import("./dashboards/super-admin/user-management/RolesPage"));

const RoleDetailsPage = lazy(() => import("./dashboards/super-admin/RoleDetails"));

const CompanyAdminsPage = lazy(
  () => import("./dashboards/super-admin/CompanyManagment/CompanyAdminsPage"),
);

// const PlanAndBilling = lazy(
//   () => import("./dashboards/super-admin/Invoices/PlanAndBilling"),
// );

// const InvoicePreviewPage = lazy(
//   () => import("./dashboards/super-admin/Invoices/InvoicePreviewPage"),
// );

// const SuperAdminComponents = lazy(
//   () => import("./dashboards/super-admin/Asset Managment/Components"),
// );

// const SuperAdminMachinesPage = lazy(
//   () => import("./dashboards/super-admin/Asset Managment/machines"),
// );

// const FleetMonitoring = lazy(
//   () => import("./dashboards/super-admin/Asset Managment/FleetMonitoring"),
// );

const Operators = lazy(() => import("./dashboards/super-admin/CompanyManagment/Operators"));

const Mechanics = lazy(() => import("./dashboards/super-admin/CompanyManagment/mechanics"));

// const ServiceLog1 = lazy(
//   () => import("./dashboards/super-admin/Asset Managment/ServiceLog"),
// );

// ---------------- Company Admin ----------------

const CompanyAdminDashboard = lazy(
  () => import("./dashboards/company-admin/CompanyAdminDashboard"),
);

const ComponentRegister = lazy(() => import("./dashboards/company-admin/ComponentRegister"));

const MaintenanceLog = lazy(() => import("./dashboards/company-admin/MaintenanceLog"));

const FleetHeatMap = lazy(() => import("./dashboards/company-admin/FleetHeatMap"));

const AddComponent = lazy(() => import("./dashboards/company-admin/AddComponent"));

const StaffManagement = lazy(() => import("./dashboards/company-admin/StaffManagement"));

const MachineManagement = lazy(() => import("./dashboards/company-admin/MachineManagement"));

const AlertsPage = lazy(() => import("./dashboards/company-admin/AlertsPage"));

const SubscriptionHistory = lazy(() => import("./dashboards/company-admin/SubscriptionHistory"));

// const ReportingManagement = lazy(
//   () => import("./pages/CompanyAdmin/ReportingManagement"),
// );

// const ServiceLog = lazy(() => import("./pages/CompanyAdmin/ServiceLog"));

// ---------------- Engineer ----------------

const ArtisansDashboard = lazy(() => import("./dashboards/artisans/ArtisansDashboard"));

const ArtisansTasks = lazy(() => import("./dashboards/artisans/ArtisansTasks"));

const ArtisansReport = lazy(() => import("./dashboards/artisans/ArtisansReport"));

const ArtisansAlerts = lazy(() => import("./dashboards/artisans/ArtisansAlerts"));

const ArtisansMaintenance = lazy(() => import("./dashboards/artisans/ArtisansMaintenance"));

const ArtisansFleetHeat = lazy(() => import("./dashboards/artisans/ArtisansFleetHeat"));

const ArtisansServiceLogs = lazy(() => import("./dashboards/artisans/ArtisansServiceLogs"));
// ---------------- Operator ----------------

const OperatorDashboard = lazy(() => import("./dashboards/operator/OperatorDashboard"));

const OperatorMachines = lazy(() => import("./dashboards/operator/OperatorMachines"));

const OperatorChecklist = lazy(() => import("./dashboards/operator/OperatorComponents"));

const OperatorTasks = lazy(() => import("./dashboards/operator/OperatorReport"));

const OperatorReportIssue = lazy(() => import("./dashboards/operator/OperatorTask"));

const OperatorAlerts = lazy(() => import("./dashboards/operator/OperatorAlerts"));

const OperatorRunningLogs = lazy(() => import("./dashboards/operator/OperatorAlerts"));

const OperatorFleet = lazy(() => import("./dashboards/operator/OperatorFleet"));

const OperatorServiceLog = lazy(() => import("./dashboards/operator/OperatorServiceLog"));

// ---------------- Supervisor ----------------

const SupervisorDashboard = lazy(() => import("./dashboards/supervisor/SupervisorDashboard"));

const SupervisorMachines = lazy(() => import("./dashboards/supervisor/SupervisorMachines"));

const SupervisorOperators = lazy(() => import("./dashboards/supervisor/SupervisorOperators"));

const SupervisorTasks = lazy(() => import("./dashboards/supervisor/SupervisorTasks"));

const SupervisorReports = lazy(() => import("./dashboards/supervisor/ReportingManagement"));

const SupervisorAlerts = lazy(() => import("./dashboards/supervisor/SupervisorAlerts"));

const SupervisorComponent = lazy(() => import("./dashboards/supervisor/SupervisorComponent"));

const SupervisorFleet = lazy(() => import("./dashboards/supervisor/Fleet"));

const SupervisorLog = lazy(() => import("./dashboards/supervisor/ServiceLog"));

import AuthInitializer from "./routes/AuthInitializer";

export default function App() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);

    const role = StorageService.get<string>(STORAGE_KEYS.ROLE);

    const user = StorageService.get<any>(STORAGE_KEYS.USER);

    if (!token || !user) {
      return;
    }

    // Connect WebSocket
    socketService.connect(user.id || user.userId, role || user.role, token);

    // Listen Notifications
    const unsubscribe = socketService.onMessage((data) => {
      console.log("WS MESSAGE:", data);

      if (data.type === "ALERT") {
        console.log("ALERT RECEIVED:", data.data);

        addNotification({
          title: data.data.title,
          message: data.data.message,
          severity: data.data.severity || "info",
        });

        alert(data.data.message);
      }
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <AuthInitializer />

      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <LandingPage />
              </Suspense>
            }
          />

          <Route
            path="/plans"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <PricingPage />
              </Suspense>
            }
          />
          <Route
            path="/cart"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <CartPage />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <SignUp />
              </Suspense>
            }
          />
          <Route
            path="/signin"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <SignIn />
              </Suspense>
            }
          />
          <Route
            path="/super-admin/login"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <SuperAdminLogin />
              </Suspense>
            }
          />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Super Admin Routes */}
          <Route
            element={
              <RoleProtectedRoute allowedRoles={["super_admin", "superadmin", "system_admin"]} />
            }
          >
            <Route element={<AppLayout role="super_admin" />}>
              <Route
                path="/super-admin"
                element={<Navigate to="/super-admin/dashboard" replace />}
              />

              <Route
                path="/super-admin/dashboard"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Home />
                  </Suspense>
                }
              />

              <Route path="/super-admin/profile" element={<UserProfiles />} />

              <Route
                path="/super-admin/intelligence"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <FleetIntelligence />
                  </Suspense>
                }
              />

              <Route path="/admin-management/users" element={<UsersPage />} />
              <Route path="/admin-management/roles" element={<RolesPage />} />

              <Route path="/admin-management/roles/:roleId" element={<RoleDetailsPage />} />

              <Route path="/admin-management/plans" element={<PlanManagement />} />

              <Route path="/super-admin/company-admins" element={<CompanyAdminsPage />} />

              <Route
                path="/company-admins"
                element={<Navigate to="/super-admin/company-admins" replace />}
              />

              <Route path="/super-admin/operators" element={<Operators />} />
              <Route path="/super-admin/mechanics" element={<Mechanics />} />

              {/* <Route
                path="/super-admin/plans-billing"
                element={<PlanAndBilling />}
              />
              <Route
                path="/super-admin/invoice/:id"
                element={<InvoicePreviewPage />}
              /> */}

              {/* <Route
                path="/super-admin/machines"
                element={<SuperAdminMachinesPage />}
              /> */}

              {/* <Route
                path="/super-admin/fleet"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <FleetMonitoring />
                  </Suspense>
                }
              /> */}

              {/* <Route
                path="/super-admin/components"
                element={<SuperAdminComponents />}
              />

              <Route
                path="/super-admin/service-logs"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <ServiceLog1 />
                  </Suspense>
                }
              /> */}

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
          {/* <Route
            element={
              <RoleProtectedRoute
                allowedRoles={["company_admin", "admin", "companyadmin"]}
              />
            }
          > */}
          <Route element={<AppLayout role="company_admin" />}>
            <Route
              path="/company-admin"
              element={<Navigate to="/company-admin/dashboard" replace />}
            />

            <Route
              path="/company-admin/dashboard"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <CompanyAdminDashboard />
                </Suspense>
              }
            />

            <Route path="/company-admin/profile" element={<UserProfiles />} />

            <Route path="/company-admin/register" element={<ComponentRegister />} />

            <Route path="/company-admin/maintenance" element={<MaintenanceLog />} />

            <Route path="/company-admin/heatmap" element={<FleetHeatMap />} />

            <Route path="/company-admin/add-component" element={<AddComponent />} />

            <Route path="/company-admin/alerts" element={<AlertsPage />} />
            <Route path="/company-admin/staff" element={<StaffManagement />} />
            <Route path="/company-admin/machines" element={<MachineManagement />} />
            <Route path="/company-admin/subscriptions" element={<SubscriptionHistory />} />
            {/* <Route
                path="/company-admin/reporting"
                element={<ReportingManagement />}
              />
              <Route
                path="/company-admin/service-log"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <ServiceLog />
                  </Suspense>
                }
              />
            </Route> */}
          </Route>
          <Route element={<RoleProtectedRoute allowedRoles={["artisans"]} />}>
            <Route element={<AppLayout role="artisans" />}>
              <Route path="/artisans" element={<Navigate to="/artisans/dashboard" replace />} />
              <Route
                path="/artisans/dashboard"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <ArtisansDashboard />
                  </Suspense>
                }
              />
              <Route path="/artisans/profile" element={<UserProfiles />} />

              <Route path="/artisans/tasks" element={<ArtisansTasks />} />

              <Route path="/artisans/machines" element={<ArtisansReport />} />

              <Route path="/artisans/alerts" element={<ArtisansAlerts />} />

              <Route path="/artisans/maintenance" element={<ArtisansMaintenance />} />

              <Route path="/artisans/fleet-heat" element={<ArtisansFleetHeat />} />

              <Route path="/artisans/service-logs" element={<ArtisansServiceLogs />} />
            </Route>
          </Route>

          {/* Operator Routes */}
          <Route element={<RoleProtectedRoute allowedRoles={["operator", "planner"]} />}>
            <Route element={<AppLayout role="operator" />}>
              <Route path="/operator" element={<Navigate to="/operator/dashboard" replace />} />

              <Route
                path="/operator/dashboard"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <OperatorDashboard />
                  </Suspense>
                }
              />

              <Route path="/operator/profile" element={<UserProfiles />} />

              <Route path="/operator/machines" element={<OperatorMachines />} />

              <Route path="/operator/running-logs" element={<OperatorRunningLogs />} />

              <Route path="/operator/alerts" element={<OperatorAlerts />} />
              <Route path="/operator/checklist" element={<OperatorChecklist />} />
              <Route path="/operator/tasks" element={<OperatorTasks />} />
              <Route
                path="/operator/fleet"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <OperatorFleet />
                  </Suspense>
                }
              />
              <Route
                path="/operator/service-logs"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <OperatorServiceLog />
                  </Suspense>
                }
              />

              <Route path="/operator/report-issue" element={<OperatorReportIssue />} />
            </Route>
          </Route>

          {/* Supervisor Routes */}
          <Route element={<RoleProtectedRoute allowedRoles={["supervisor"]} />}>
            <Route element={<AppLayout role="supervisor" />}>
              <Route path="/supervisor" element={<Navigate to="/supervisor/dashboard" replace />} />

              <Route
                path="/supervisor/dashboard"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <SupervisorDashboard />
                  </Suspense>
                }
              />

              <Route path="/supervisor/machines" element={<SupervisorMachines />} />
              <Route path="/supervisor/operators" element={<SupervisorOperators />} />

              <Route path="/supervisor/components" element={<SupervisorComponent />} />
              <Route
                path="/supervisor/service-log"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <SupervisorLog />
                  </Suspense>
                }
              />
              <Route path="/supervisor/fleet" element={<SupervisorFleet />} />

              <Route path="/supervisor/tasks" element={<SupervisorTasks />} />

              <Route
                path="/supervisor/reports"
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <SupervisorReports />
                  </Suspense>
                }
              />
              <Route path="/supervisor/alerts" element={<SupervisorAlerts />} />
              <Route path="/supervisor/profile" element={<UserProfiles />} />
            </Route>
          </Route>

          {/* Coming Soon Routes */}
          <Route path="/company-admin/coming-soon/:module" element={<ComingSoon />} />

          <Route path="/coming-soon" element={<ComingSoon />} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
