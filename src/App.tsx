import { useNotifications } from "./context/NotificationContext";
import { PageSkeleton } from "./components/common/Skeleton";
import { authService } from "./services/Auth/authService";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { Suspense, lazy } from "react";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import AccessDenied from "./pages/Common/AccessDenied";
import RoleProtectedRoute from "./routes/RoleProtectedRoute";
import GuestRoute from "./routes/GuestRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useEffect } from "react";
import socketService from "./services/socketService";

import StorageService, { STORAGE_KEYS } from "./services/storage.service";

// ---------------- Public ----------------

const LandingPage = lazy(() => import("./pages/Landing/LandingPage"));
const PricingPage = lazy(() => import("./pages/pricing/PricingPage"));
const CartPage = lazy(() => import("./pages/pricing/CartPage"));

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const ResetPassword = lazy(() => import("./pages/AuthPages/ResetPassword"));
const SuperAdminLogin = lazy(() => import("./pages/AuthPages/SuperAdminLogin"));

const FeaturesPage = lazy(() => import("./pages/Landing/FeaturesPage"));

const MaintenancePage = lazy(() => import("./pages/Landing/MaintenancePage"));

const ReportsPage = lazy(() => import("./pages/Landing/ReportsPage"));

const AboutPage = lazy(() => import("./pages/Landing/AboutPage"));

const ContactPage = lazy(() => import("./pages/Landing/ContactPage"));

const NotificationsPage = lazy(
  () => import("./components/notifications/NotificationsPage"),
);

const SupportOverviewDashboard = lazy(
  () => import("./pages/Support/SupportOverviewDashboard"),
);
const SupportTicketCenter = lazy(
  () => import("./pages/Support/SupportTicketCenter"),
);
const SupportTicketDetails = lazy(
  () => import("./pages/Support/SupportTicketDetails"),
);
const SupportReportsPage = lazy(
  () => import("./pages/Support/SupportReportsPage"),
);
const SupportActivityLogsPage = lazy(
  () => import("./pages/Support/SupportActivityLogsPage"),
);
const TicketManagementPage = lazy(
  () => import("./pages/Support/TicketManagementPage"),
);
const TechnicalSupportManagement = lazy(
  () => import("./pages/SuperAdmin/TechnicalSupportManagement"),
);

// ---------------- Common ----------------

const NotFound = lazy(() => import("./pages/Common/NotFound"));
const UserProfiles = lazy(() => import("./pages/Common/UserProfiles"));
const ComingSoon = lazy(() => import("./pages/Common/ComingSoon"));

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
const Blank = lazy(() => import("./pages/Common/Blank"));

// ---------------- Super Admin ----------------

const Home = lazy(() => import("./pages/SuperAdmin/SuperAdminDashboard"));

const FleetIntelligence = lazy(
  () => import("./pages/SuperAdmin/CompanyIntelligence"),
);

const PlanManagement = lazy(
  () => import("./pages/SuperAdmin/PlanManagement/PlanManagement"),
);

const UsersPage = lazy(
  () => import("./pages/SuperAdmin/user-management/UsersPage"),
);

const RolesPage = lazy(
  () => import("./pages/SuperAdmin/user-management/RolesPage"),
);

const RoleDetailsPage = lazy(
  () => import("./components/super-admin/dashboard/RoleDetails"),
);

const CompanyAdminsPage = lazy(
  () => import("./pages/SuperAdmin/CompanyManagment/CompanyAdminsPage"),
);

const PlanAndBilling = lazy(
  () => import("./pages/SuperAdmin/Invoices/PlanAndBilling"),
);

const InvoicePreviewPage = lazy(
  () => import("./pages/SuperAdmin/Invoices/InvoicePreviewPage"),
);

const SuperAdminComponents = lazy(
  () => import("./pages/SuperAdmin/Asset Managment/Components"),
);

const SuperAdminMachinesPage = lazy(
  () => import("./pages/SuperAdmin/Asset Managment/machines"),
);

const FleetMonitoring = lazy(
  () => import("./pages/SuperAdmin/Asset Managment/FleetMonitoring"),
);

const Operators = lazy(
  () => import("./pages/SuperAdmin/CompanyManagment/Operators"),
);

const Mechanics = lazy(
  () => import("./pages/SuperAdmin/CompanyManagment/Artisuns"),
);

const ServiceLog1 = lazy(
  () => import("./pages/SuperAdmin/Asset Managment/ServiceLog"),
);

// ---------------- Company Admin ----------------

const CompanyProfile = lazy(
  () => import("./pages/CompanyAdmin/CompanyProfile"),
);

const CompanyAdminDashboard = lazy(
  () => import("./pages/CompanyAdmin/CompanyAdminDashboard"),
);

const ComponentRegister = lazy(
  () => import("./pages/CompanyAdmin/ComponentRegister"),
);

const FleetHeatMap = lazy(() => import("./pages/CompanyAdmin/FleetHeatMap"));

const UpdatePage = lazy(() => import("./pages/CompanyAdmin/UpdateData"));

const AddComponent = lazy(() => import("./pages/CompanyAdmin/AddComponent"));

const StaffManagement = lazy(
  () => import("./pages/CompanyAdmin/StaffManagement"),
);

const MachineManagement = lazy(
  () => import("./pages/CompanyAdmin/MachineManagement"),
);

const AlertsPage = lazy(() => import("./pages/CompanyAdmin/AlertsPage"));

const SubscriptionHistory = lazy(
  () => import("./pages/CompanyAdmin/SubscriptionHistory"),
);

const CategoryManagement = lazy(
  () => import("./pages/CompanyAdmin/CategoryManagement"),
);

////////////////

const QuotationRequest = lazy(
  () => import("./pages/CompanyAdmin/QuotationContract"),
);
const QuotationStatus = lazy(
  () => import("./pages/CompanyAdmin/QuotationStatus"),
);

const Messages = lazy(() => import("./pages/CompanyAdmin/quotationInvoices"));

// NEW
const QuotationDetails = lazy(
  () => import("./pages/CompanyAdmin/QuotationDetailsPage"),
);

const QuotationAction = lazy(
  () => import("./pages/CompanyAdmin/QuotationActionPage"),
);

const QuotationManagement = lazy(
  () => import("./pages/CompanyAdmin/QuotationManagement"),
);

//////////

const Documents = lazy(() => import("./pages/CompanyAdmin/Documents"));

const InspectionDataEntry = lazy(
  () => import("./pages/CompanyAdmin/InspectionDataEntry"),
);

const ReportingManagement = lazy(
  () => import("./pages/CompanyAdmin/ReportingManagement"),
);

const ServiceLog = lazy(() => import("./pages/CompanyAdmin/ServiceLog"));
const JobCardManagement = lazy(
  () => import("./pages/CompanyAdmin/JobCardManagement"),
);

// ---------------- Artisans ----------------

const ArtisansDashboard = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansDashboard"),
);

const ArtisansTasks = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansTasks"),
);

const ArtisansReport = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansReport"),
);

const ArtisanPreStartInspection = lazy(
  () => import("./pages/ArtisansDashboard/ArtisanPreStartInspection"),
);

const ArtisanWorkOrderCapture = lazy(
  () => import("./pages/ArtisansDashboard/WorkOrderCapture"),
);

const ArtisansAlerts = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansAlerts"),
);

const ArtisansMaintenance = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansMaintenance"),
);

const ArtisansFleetHeat = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansFleetHeat"),
);
const ArtisansUpdateData = lazy(
  () => import("./pages/ArtisansDashboard/UpdateData"),
);

const ArtisansServiceLogs = lazy(
  () => import("./pages/ArtisansDashboard/ArtisansServiceLogs"),
);
// ---------------- Operator ----------------

const OperatorDashboard = lazy(
  () => import("./pages/OperatorDashboard/OperatorDashboard"),
);

const PreStartInspection = lazy(
  () => import("./pages/OperatorDashboard/PreStartInspection"),
);

const WorkOrderCapture = lazy(
  () => import("./pages/OperatorDashboard/WorkOrderCapture"),
);

const ActiveTaskPage = lazy(
  () => import("./pages/OperatorDashboard/ActiveTask"),
);

const ShiftSummaryPage = lazy(
  () => import("./pages/OperatorDashboard/ShiftSummary"),
);

const OperatorMachines = lazy(
  () => import("./pages/OperatorDashboard/OperatorMachines"),
);
const OperatorAssignedMachines = lazy(
  () => import("./pages/OperatorDashboard/OperatorAssignedMachines"),
);

const OperatorChecklist = lazy(
  () => import("./pages/OperatorDashboard/OperatorComponents"),
);

const OperatorTasks = lazy(
  () => import("./pages/OperatorDashboard/OperatorReport"),
);

const OperatorReportIssue = lazy(
  () => import("./pages/OperatorDashboard/OperatorTask"),
);

const OperatorAlerts = lazy(
  () => import("./pages/OperatorDashboard/OperatorAlerts"),
);

const OperatorRunningLogs = lazy(
  () => import("./pages/OperatorDashboard/OperatorAlerts"),
);

const OperatorFleet = lazy(
  () => import("./pages/OperatorDashboard/OperatorFleet"),
);
const OperatorDataUpdate = lazy(
  () => import("./pages/OperatorDashboard/UpdateData"),
);

const OperatorServiceLog = lazy(
  () => import("./pages/OperatorDashboard/OperatorServiceLog"),
);

// ---------------- Supervisor ----------------

const SupervisorDashboard = lazy(
  () => import("./pages/Supervisor/SupervisorDashboard"),
);

const SupervisorMachines = lazy(
  () => import("./pages/Supervisor/SupervisorMachines"),
);

const SupervisorOperators = lazy(
  () => import("./pages/Supervisor/SupervisorOperators"),
);

const SupervisorTasks = lazy(
  () => import("./pages/Supervisor/SupervisorTasks"),
);

const SupervisorReports = lazy(
  () => import("./pages/Supervisor/ReportingManagement"),
);

const SupervisorAlerts = lazy(
  () => import("./pages/Supervisor/SupervisorAlerts"),
);

const SupervisorComponent = lazy(
  () => import("./pages/Supervisor/SupervisorComponent"),
);

const SupervisorFleet = lazy(() => import("./pages/Supervisor/Fleet"));

const SupervisorUpdateData = lazy(
  () => import("./pages/Supervisor/UpdateData"),
);

const SupervisorLog = lazy(() => import("./pages/Supervisor/ServiceLog"));
const ArtisanFixHistory = lazy(
  () => import("./pages/Supervisor/ArtisanFixHistory"),
);
const SupervisorAssignedArtisans = lazy(
  () => import("./pages/Supervisor/SupervisorAssignedArtisans"),
);
const SupervisorServices = lazy(
  () => import("./pages/Supervisor/SupervisorServices"),
);
const SupervisorTaskReview = lazy(
  () => import("./pages/Supervisor/SupervisorTaskReview"),
);

import AuthInitializer from "./routes/AuthInitializer";

export default function App() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const refreshUser = async () => {
      const token = StorageService.get<string>(STORAGE_KEYS.TOKEN);

      if (!token) {
        return;
      }

      try {
        // Get latest user data from backend
        const response = await authService.getMe();

        const latestUser = response?.user ?? response?.admin ?? response?.data;

        if (latestUser) {
          // Update latest user data in localStorage
          StorageService.set(STORAGE_KEYS.USER, latestUser);
        }

        // Read fresh user data
        const user = latestUser || StorageService.get<any>(STORAGE_KEYS.USER);

        const role =
          StorageService.get<string>(STORAGE_KEYS.ROLE) || user?.role;

        // Connect WebSocket
        if (user) {
          socketService.connect(user.id || user.userId, role, token);
        }
      } catch (error) {
        console.error("[App] Failed to refresh user", error);
      }
    };
    refreshUser();
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <AuthInitializer />

      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <LandingPage />
                </Suspense>
              }
            />
            <Route
              path="/features"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <FeaturesPage />
                </Suspense>
              }
            />

            <Route
              path="/maintenance"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <MaintenancePage />
                </Suspense>
              }
            />

            <Route
              path="/reports"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ReportsPage />
                </Suspense>
              }
            />

            <Route
              path="/about"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <AboutPage />
                </Suspense>
              }
            />

            <Route
              path="/contact"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ContactPage />
                </Suspense>
              }
            />

            <Route
              path="/plans"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <PricingPage />
                </Suspense>
              }
            />
            <Route
              path="/cart"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <CartPage />
                </Suspense>
              }
            />
            {/* Guest Only Auth Routes */}
            <Route element={<GuestRoute />}>
              <Route
                path="/signup"
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <SignUp />
                  </Suspense>
                }
              />
              <Route
                path="/signin"
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <SignIn />
                  </Suspense>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <ResetPassword />
                  </Suspense>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <ResetPassword />
                  </Suspense>
                }
              />
              <Route
                path="/super-admin/login"
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <SuperAdminLogin />
                  </Suspense>
                }
              />
            </Route>
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

                <Route
                  path="/super-admin/dashboard"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Home />
                    </Suspense>
                  }
                />

                <Route
                  path="/super-admin/technical-support"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <TechnicalSupportManagement />
                    </Suspense>
                  }
                />

                <Route path="/super-admin/profile" element={<UserProfiles />} />

                <Route
                  path="/super-admin/intelligence"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FleetIntelligence />
                    </Suspense>
                  }
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

                <Route
                  path="/super-admin/company-admins"
                  element={<CompanyAdminsPage />}
                />

                <Route
                  path="/company-admins"
                  element={
                    <Navigate to="/super-admin/company-admins" replace />
                  }
                />

                <Route path="/super-admin/operators" element={<Operators />} />
                <Route path="/super-admin/mechanics" element={<Mechanics />} />

                <Route
                  path="/super-admin/plans-billing"
                  element={<PlanAndBilling />}
                />
                <Route
                  path="/super-admin/invoice/:id"
                  element={<InvoicePreviewPage />}
                />

                <Route
                  path="/super-admin/machines"
                  element={<SuperAdminMachinesPage />}
                />

                <Route
                  path="/super-admin/fleet"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FleetMonitoring />
                    </Suspense>
                  }
                />

                <Route
                  path="/super-admin/components"
                  element={<SuperAdminComponents />}
                />

                <Route
                  path="/super-admin/notifications"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/super-admin/service-logs"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ServiceLog1 />
                    </Suspense>
                  }
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
                  allowedRoles={[
                    "company_admin",
                    "admin",
                    "companyadmin",
                    "super_admin",
                    "superadmin",
                  ]}
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
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <CompanyAdminDashboard />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/quotation"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <QuotationManagement />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/quotation"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <QuotationRequest />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/quotation-status"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <QuotationStatus />
                    </Suspense>
                  }
                />
                <Route
                  path="/company-admin/messages"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Messages />
                    </Suspense>
                  }
                />
                <Route
                  path="/company-admin/quotation-invoices"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Messages />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/quotation-details"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <QuotationDetails />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/quotation-action"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <QuotationAction />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/documents"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Documents />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/categories"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <CategoryManagement />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/profile"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <CompanyProfile />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/job-cards"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <JobCardManagement />
                    </Suspense>
                  }
                />
                <Route
                  path="/company_admin/job-cards"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <JobCardManagement />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/register"
                  element={<ComponentRegister />}
                />
                <Route
                  path="/company-admin/components"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ComponentRegister />
                    </Suspense>
                  }
                />
                <Route
                  path="/company_admin/components"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ComponentRegister />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/heatmap"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FleetHeatMap />
                    </Suspense>
                  }
                />
                <Route
                  path="/company-admin/heat-map"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FleetHeatMap />
                    </Suspense>
                  }
                />
                <Route
                  path="/company_admin/heatmap"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FleetHeatMap />
                    </Suspense>
                  }
                />
                <Route
                  path="/company_admin/heat-map"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <FleetHeatMap />
                    </Suspense>
                  }
                />
                <Route
                  path="/company-admin/inspection-entry"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <InspectionDataEntry />
                    </Suspense>
                  }
                />
                <Route
                  path="/company_admin/inspection-entry"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <InspectionDataEntry />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/add-component"
                  element={<AddComponent />}
                />

                <Route path="/company-admin/alerts" element={<AlertsPage />} />

                <Route
                  path="/company-admin/data-update"
                  element={<UpdatePage />}
                />

                <Route
                  path="/company-admin/staff"
                  element={<StaffManagement />}
                />
                <Route
                  path="/company_admin/staff"
                  element={<StaffManagement />}
                />
                <Route
                  path="/company-admin/machines"
                  element={<MachineManagement />}
                />
                <Route
                  path="/company_admin/machines"
                  element={<MachineManagement />}
                />
                <Route
                  path="/company-admin/subscriptions"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SubscriptionHistory />
                    </Suspense>
                  }
                />
                <Route
                  path="/company_admin/subscriptions"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SubscriptionHistory />
                    </Suspense>
                  }
                />
                <Route
                  path="/company-admin/reporting"
                  element={<ReportingManagement />}
                />
                <Route
                  path="/company_admin/reporting"
                  element={<ReportingManagement />}
                />

                <Route
                  path="/company-admin/notifications"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/service-log"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ServiceLog />
                    </Suspense>
                  }
                />

                <Route
                  path="/company-admin/support-tickets"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <TicketManagementPage />
                    </Suspense>
                  }
                />
              </Route>
            </Route>

            {/* TECHNICAL SUPPORT ROUTES */}
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={[
                    "technical_support",
                    "technicalsupport",
                    "support",
                    "super_admin",
                    "superadmin",
                  ]}
                />
              }
            >
              <Route element={<AppLayout role="technical_support" />}>
                <Route
                  path="/support"
                  element={<Navigate to="/support/dashboard" replace />}
                />
                <Route
                  path="/support/dashboard"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupportOverviewDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/tickets"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupportTicketCenter />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/tickets/:id"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupportTicketDetails />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/reports"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupportReportsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/activity"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupportActivityLogsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/notifications"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/profile"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <UserProfiles />
                    </Suspense>
                  }
                />
              </Route>
            </Route>
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={["artisans", "artisan", "engineer", "mechanic"]}
                />
              }
            >
              <Route element={<AppLayout role="artisans" />}>
                <Route
                  path="/artisans"
                  element={<Navigate to="/artisans/dashboard" replace />}
                />
                <Route
                  path="/artisans/dashboard"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ArtisansDashboard />
                    </Suspense>
                  }
                />
                <Route path="/artisans/profile" element={<UserProfiles />} />

                <Route path="/artisans/tasks" element={<ArtisansTasks />} />

                <Route
                  path="/artisans/pre-start-inspection"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ArtisanPreStartInspection />
                    </Suspense>
                  }
                />

                <Route
                  path="/artisans/work-order-capture"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ArtisanWorkOrderCapture />
                    </Suspense>
                  }
                />

                <Route path="/artisans/machines" element={<ArtisansReport />} />

                <Route path="/artisans/alerts" element={<ArtisansAlerts />} />

                <Route
                  path="/artisans/maintenance"
                  element={<ArtisansMaintenance />}
                />

                <Route
                  path="/artisans/fleet-heat"
                  element={<ArtisansFleetHeat />}
                />

                <Route
                  path="/artisans/data-update"
                  element={<ArtisansUpdateData />}
                />

                <Route
                  path="/artisans/notifications"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/artisans/service-logs"
                  element={<ArtisansServiceLogs />}
                />
              </Route>
            </Route>

            {/* Operator Routes */}
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={[
                    "operator",
                    "planner",
                    "super_admin",
                    "company_admin",
                    "supervisor",
                    "admin",
                  ]}
                />
              }
            >
              <Route element={<AppLayout role="operator" />}>
                <Route
                  path="/operator"
                  element={<Navigate to="/operator/dashboard" replace />}
                />

                <Route
                  path="/operator/notifications"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/dashboard"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <OperatorDashboard />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/pre-start-inspection"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <PreStartInspection />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/work-order-capture"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <WorkOrderCapture />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/active-task"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ActiveTaskPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/shift-summary"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ShiftSummaryPage />
                    </Suspense>
                  }
                />

                <Route path="/operator/profile" element={<UserProfiles />} />

                <Route
                  path="/operator/machines"
                  element={<OperatorMachines />}
                />

                <Route
                  path="/operator/assigned-machines"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <OperatorAssignedMachines />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/running-logs"
                  element={<OperatorRunningLogs />}
                />

                <Route path="/operator/alerts" element={<OperatorAlerts />} />
                <Route
                  path="/operator/checklist"
                  element={<OperatorChecklist />}
                />
                <Route path="/operator/tasks" element={<OperatorTasks />} />
                <Route
                  path="/operator/fleet"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <OperatorFleet />
                    </Suspense>
                  }
                />
                <Route
                  path="/operator/data-update"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <OperatorDataUpdate />
                    </Suspense>
                  }
                />
                <Route
                  path="/operator/service-logs"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <OperatorServiceLog />
                    </Suspense>
                  }
                />

                <Route
                  path="/operator/report-issue"
                  element={<OperatorReportIssue />}
                />

                <Route
                  path="/operator/issue-reports"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ComingSoon />
                    </Suspense>
                  }
                />
                <Route
                  path="/operator/coming-soon/*"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ComingSoon />
                    </Suspense>
                  }
                />
              </Route>
            </Route>

            {/* Supervisor Routes */}
            <Route
              element={<RoleProtectedRoute allowedRoles={["supervisor"]} />}
            >
              <Route element={<AppLayout role="supervisor" />}>
                <Route
                  path="/supervisor"
                  element={<Navigate to="/supervisor/dashboard" replace />}
                />

                <Route
                  path="/supervisor/dashboard"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupervisorDashboard />
                    </Suspense>
                  }
                />

                <Route
                  path="/supervisor/machines"
                  element={<SupervisorMachines />}
                />
                <Route
                  path="/supervisor/operators"
                  element={<SupervisorOperators />}
                />

                <Route
                  path="/supervisor/components"
                  element={<SupervisorComponent />}
                />

                <Route
                  path="/supervisor/notifications"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />

                <Route
                  path="/supervisor/service-log"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupervisorLog />
                    </Suspense>
                  }
                />
                <Route path="/supervisor/fleet" element={<SupervisorFleet />} />
                <Route
                  path="/supervisor/fleet-health"
                  element={<SupervisorFleet />}
                />

                <Route
                  path="/supervisor/data-update"
                  element={<SupervisorFleet />}
                />
                <Route
                  path="/supervisor/updatedata"
                  element={<SupervisorFleet />}
                />

                <Route path="/supervisor/tasks" element={<SupervisorTasks />} />
                <Route
                  path="/supervisor/task-review"
                  element={<SupervisorTasks />}
                />
                <Route
                  path="/supervisor/reports"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupervisorReports />
                    </Suspense>
                  }
                />
                <Route
                  path="/supervisor/alerts"
                  element={<SupervisorAlerts />}
                />
                <Route
                  path="/supervisor/artisan-history"
                  element={<ArtisanFixHistory />}
                />
                <Route
                  path="/supervisor/assigned-artisans"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupervisorAssignedArtisans />
                    </Suspense>
                  }
                />
                <Route
                  path="/supervisor/services"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupervisorServices />
                    </Suspense>
                  }
                />
                <Route
                  path="/supervisor/task-review"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <SupervisorTaskReview />
                    </Suspense>
                  }
                />
                <Route path="/supervisor/profile" element={<UserProfiles />} />
              </Route>
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
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
