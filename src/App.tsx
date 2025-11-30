import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetails from "./pages/CourseDetails";
import MyRequests from "./pages/MyRequests";
import ApprovalsEnhanced from "./pages/ApprovalsEnhanced";
import TrainingRequest from "./pages/TrainingRequest";
import RequestDetail from "./pages/RequestDetail";
import Sessions from "./pages/Sessions";
import SessionDetails from "./pages/SessionDetails";
import SessionAttendance from "./pages/SessionAttendance";
import SessionCompletion from "./pages/SessionCompletion";
import Reports from "./pages/Reports";
import TeamNominations from "./pages/TeamNominations";
import LearningHistory from "./pages/LearningHistory";
import TeamLearningHistory from "./pages/TeamLearningHistory";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import MyCertificates from "./pages/MyCertificates";
import TeamCertificates from "./pages/TeamCertificates";
import CertificateAdmin from "./pages/CertificateAdmin";
import CertificateTemplateEditor from "./pages/CertificateTemplateEditor";
import MyScholarshipApplications from "./pages/MyScholarshipApplications";
import ScholarshipApplication from "./pages/ScholarshipApplication";
import ScholarshipManagerReview from "./pages/ScholarshipManagerReview";
import ScholarshipHRBPReview from "./pages/ScholarshipHRBPReview";
import ScholarshipCommittee from "./pages/ScholarshipCommittee";
import ScholarshipFinanceReview from "./pages/ScholarshipFinanceReview";
import ScholarshipFinalApproval from "./pages/ScholarshipFinalApproval";
import ScholarshipAdmin from "./pages/ScholarshipAdmin";
import Scholars from "./pages/Scholars";
import ScholarRecord from "./pages/ScholarRecord";
import MyScholarProgress from "./pages/MyScholarProgress";
import TeamScholars from "./pages/TeamScholars";
import ScholarsAdmin from "./pages/ScholarsAdmin";
import RiskDashboard from "./pages/RiskDashboard";
import BondDashboard from "./pages/BondDashboard";
import BondRecord from "./pages/BondRecord";
import MyBond from "./pages/MyBond";
import CatalogueAdmin from "./pages/CatalogueAdmin";
import CatalogueDetail from "./pages/CatalogueDetail";
import CatalogueForm from "./pages/CatalogueForm";
import ProviderAdmin from "./pages/ProviderAdmin";
import ProviderDetail from "./pages/ProviderDetail";
import ProviderForm from "./pages/ProviderForm";
import ProviderPerformance from "./pages/ProviderPerformance";
import ProviderPerformanceDetail from "./pages/ProviderPerformanceDetail";
import MyTrainingNeeds from "./pages/MyTrainingNeeds";
import TeamTrainingNeeds from "./pages/TeamTrainingNeeds";
import TNAOverview from "./pages/TNAOverview";
import TNAAdmin from "./pages/TNAAdmin";
import TNAForm from "./pages/TNAForm";
import TrainingPlanBuilder from "./pages/TrainingPlanBuilder";
import TrainingPlanDetail from "./pages/TrainingPlanDetail";
import TrainingPlanCostView from "./pages/TrainingPlanCostView";
import MyTeamTrainingPlan from "./pages/MyTeamTrainingPlan";
import AIPriorityAdmin from "./pages/AIPriorityAdmin";
import ScenarioConsole from "./pages/ScenarioConsole";
import ScenarioWorkspace from "./pages/ScenarioWorkspace";
import MyAbroadTrainings from "./pages/MyAbroadTrainings";
import TravelVisaAdmin from "./pages/TravelVisaAdmin";
import TravelVisaReports from "./pages/TravelVisaReports";
import PerDiemAdmin from "./pages/PerDiemAdmin";
import PerDiemReports from "./pages/PerDiemReports";
import LogisticsConsole from "./pages/LogisticsConsole";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id"
        element={
          <ProtectedRoute>
            <CourseDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/request/:courseId"
        element={
          <ProtectedRoute>
            <TrainingRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-requests"
        element={
          <ProtectedRoute>
            <MyRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <RequestDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <ApprovalsEnhanced />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Sessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:id"
        element={
          <ProtectedRoute>
            <SessionDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:id/attendance"
        element={
          <ProtectedRoute>
            <SessionAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:id/completion"
        element={
          <ProtectedRoute>
            <SessionCompletion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning-history"
        element={
          <ProtectedRoute>
            <LearningHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute>
            <ComplianceDashboard />
          </ProtectedRoute>
        }
      />

      {/* Team Nominations */}
      <Route
        path="/team-requests"
        element={
          <ProtectedRoute>
            <TeamNominations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-learning"
        element={
          <ProtectedRoute>
            <TeamLearningHistory />
          </ProtectedRoute>
        }
      />

      {/* Certificates */}
      <Route
        path="/my-certificates"
        element={
          <ProtectedRoute>
            <MyCertificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-certificates"
        element={
          <ProtectedRoute>
            <TeamCertificates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificate-admin"
        element={
          <ProtectedRoute>
            <CertificateAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificate-templates/:id"
        element={
          <ProtectedRoute>
            <CertificateTemplateEditor />
          </ProtectedRoute>
        }
      />

      {/* Scholarship Routes */}
      <Route
        path="/my-scholarships"
        element={
          <ProtectedRoute>
            <MyScholarshipApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/apply"
        element={
          <ProtectedRoute>
            <ScholarshipApplication />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/apply/:id"
        element={
          <ProtectedRoute>
            <ScholarshipApplication />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/manager-review"
        element={
          <ProtectedRoute>
            <ScholarshipManagerReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/hrbp-review"
        element={
          <ProtectedRoute>
            <ScholarshipHRBPReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/committee"
        element={
          <ProtectedRoute>
            <ScholarshipCommittee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/finance-review"
        element={
          <ProtectedRoute>
            <ScholarshipFinanceReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/final-approval"
        element={
          <ProtectedRoute>
            <ScholarshipFinalApproval />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholarship/admin"
        element={
          <ProtectedRoute>
            <ScholarshipAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholars"
        element={
          <ProtectedRoute>
            <Scholars />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholars/:id"
        element={
          <ProtectedRoute>
            <ScholarRecord />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-scholar-progress"
        element={
          <ProtectedRoute>
            <MyScholarProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-scholars"
        element={
          <ProtectedRoute>
            <TeamScholars />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scholars-admin"
        element={
          <ProtectedRoute>
            <ScholarsAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/risk-dashboard"
        element={
          <ProtectedRoute>
            <RiskDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Bond Routes */}
      <Route
        path="/bonds"
        element={
          <ProtectedRoute>
            <BondDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bonds/:id"
        element={
          <ProtectedRoute>
            <BondRecord />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bond"
        element={
          <ProtectedRoute>
            <MyBond />
          </ProtectedRoute>
        }
      />

      {/* Catalogue Routes */}
      <Route
        path="/catalogue"
        element={
          <ProtectedRoute>
            <CatalogueAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogue/new"
        element={
          <ProtectedRoute>
            <CatalogueForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogue/:id"
        element={
          <ProtectedRoute>
            <CatalogueDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogue/:id/edit"
        element={
          <ProtectedRoute>
            <CatalogueForm />
          </ProtectedRoute>
        }
      />

      {/* Provider Routes */}
      <Route
        path="/providers"
        element={
          <ProtectedRoute>
            <ProviderAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers/new"
        element={
          <ProtectedRoute>
            <ProviderForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers/:id"
        element={
          <ProtectedRoute>
            <ProviderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers/:id/edit"
        element={
          <ProtectedRoute>
            <ProviderForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers/performance"
        element={
          <ProtectedRoute>
            <ProviderPerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/providers/:id/performance"
        element={
          <ProtectedRoute>
            <ProviderPerformanceDetail />
          </ProtectedRoute>
        }
      />

      {/* Training Plan Routes */}
      <Route
        path="/training-plan"
        element={
          <ProtectedRoute>
            <TrainingPlanBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training-plan/:id"
        element={
          <ProtectedRoute>
            <TrainingPlanDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/training-plan/:id/cost"
        element={
          <ProtectedRoute>
            <TrainingPlanCostView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-training-plan"
        element={
          <ProtectedRoute>
            <MyTeamTrainingPlan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-priority"
        element={
          <ProtectedRoute>
            <AIPriorityAdmin />
          </ProtectedRoute>
        }
      />

      {/* Scenario Routes */}
      <Route
        path="/scenarios"
        element={
          <ProtectedRoute>
            <ScenarioConsole />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scenarios/:scenarioId"
        element={
          <ProtectedRoute>
            <ScenarioWorkspace />
          </ProtectedRoute>
        }
      />

      {/* TNA Routes */}
      <Route
        path="/my-training-needs"
        element={
          <ProtectedRoute>
            <MyTrainingNeeds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-training-needs"
        element={
          <ProtectedRoute>
            <TeamTrainingNeeds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tna-overview"
        element={
          <ProtectedRoute>
            <TNAOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tna-admin"
        element={
          <ProtectedRoute>
            <TNAAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tna/:id"
        element={
          <ProtectedRoute>
            <TNAForm />
          </ProtectedRoute>
        }
      />

      {/* Travel & Visa Routes */}
      <Route
        path="/my-abroad-trainings"
        element={
          <ProtectedRoute>
            <MyAbroadTrainings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/travel-visa-admin"
        element={
          <ProtectedRoute>
            <TravelVisaAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/travel-visa-reports"
        element={
          <ProtectedRoute>
            <TravelVisaReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/per-diem-admin"
        element={
          <ProtectedRoute>
            <PerDiemAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/per-diem-reports"
        element={
          <ProtectedRoute>
            <PerDiemReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/logistics-console"
        element={
          <ProtectedRoute>
            <LogisticsConsole />
          </ProtectedRoute>
        }
      />

      {/* Placeholder routes */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
