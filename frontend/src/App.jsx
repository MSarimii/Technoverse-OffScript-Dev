import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from './components/ui';

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage })))
  : null;

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const VerifyReportPage = lazy(() => import('./pages/VerifyReportPage').then((m) => ({ default: m.VerifyReportPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const CandidateExamsPage = lazy(() => import('./pages/candidate/CandidateExamsPage').then((m) => ({ default: m.CandidateExamsPage })));
const PreExamPage = lazy(() => import('./pages/candidate/PreExamPage').then((m) => ({ default: m.PreExamPage })));
const ExamWorkspacePage = lazy(() => import('./pages/candidate/ExamWorkspacePage').then((m) => ({ default: m.ExamWorkspacePage })));
const CandidateResultsPage = lazy(() => import('./pages/candidate/CandidateResultsPage').then((m) => ({ default: m.CandidateResultsPage })));
const ResultDetailPage = lazy(() => import('./pages/candidate/ResultDetailPage').then((m) => ({ default: m.ResultDetailPage })));
const ExaminerDashboardPage = lazy(() => import('./pages/examiner/ExaminerDashboardPage').then((m) => ({ default: m.ExaminerDashboardPage })));
const ExamDetailPage = lazy(() => import('./pages/examiner/ExamDetailPage').then((m) => ({ default: m.ExamDetailPage })));
const QuestionBankPage = lazy(() => import('./pages/examiner/QuestionBankPage').then((m) => ({ default: m.QuestionBankPage })));
const ExamWizardPage = lazy(() => import('./pages/examiner/ExamWizardPage').then((m) => ({ default: m.ExamWizardPage })));
const ExamMonitorPage = lazy(() => import('./pages/examiner/ExamMonitorPage').then((m) => ({ default: m.ExamMonitorPage })));
const ExamGradingPage = lazy(() => import('./pages/examiner/ExamGradingPage').then((m) => ({ default: m.ExamGradingPage })));
const ExamAnalyticsPage = lazy(() => import('./pages/examiner/ExamAnalyticsPage').then((m) => ({ default: m.ExamAnalyticsPage })));
const ExamFairnessPage = lazy(() => import('./pages/examiner/ExamFairnessPage').then((m) => ({ default: m.ExamFairnessPage })));
const ExamDisputesPage = lazy(() => import('./pages/examiner/ExamDisputesPage').then((m) => ({ default: m.ExamDisputesPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center font-mono text-xs text-ink-muted">
    Loading view...
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const isExamWorkspace = location.pathname.startsWith('/candidate/exam/');
  const skipMotion = prefersReducedMotion || isExamWorkspace;

  const content = (
    <Suspense fallback={<RouteFallback />}>
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/verify/:verificationId" element={<VerifyReportPage />} />

        {import.meta.env.DEV && DesignSystemPage && (
          <Route path="/_design" element={<DesignSystemPage />} />
        )}

        {/* Admin */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AdminUsersPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Examiner */}
        <Route
          path="/examiner"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExaminerDashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/questions"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <QuestionBankPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/new"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamWizardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamDetailPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamWizardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id/monitor"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamMonitorPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id/grading"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamGradingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id/analytics"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamAnalyticsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id/fairness"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamFairnessPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/examiner/exams/:id/disputes"
          element={
            <ProtectedRoute allowedRoles={['examiner']}>
              <AppLayout>
                <ExamDisputesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Candidate + Examiner Sandbox */}
        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <AppLayout>
                <CandidateExamsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/exams"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <AppLayout>
                <CandidateExamsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/exams/:examId"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <AppLayout>
                <PreExamPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/exam/:examId"
          element={
            <ProtectedRoute allowedRoles={['candidate', 'examiner']}>
              <ExamWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/attempts/:attemptId"
          element={
            <ProtectedRoute allowedRoles={['candidate', 'examiner']}>
              <ExamWorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/results"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <AppLayout>
                <CandidateResultsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/results/:attemptId"
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <AppLayout>
                <ResultDetailPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );

  if (skipMotion) {
    return content;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell() {
  const location = useLocation();
  const isExamWorkspace = location.pathname.startsWith('/candidate/exam/');

  return (
    <div className="min-h-screen bg-canvas flex flex-col text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0B0F0E] focus:text-white focus:rounded-lg"
      >
        Skip to content
      </a>
      <Toaster />
      <Navbar />
      <div id="main-content" className="flex-1">
        <AnimatedRoutes />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppShell />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
