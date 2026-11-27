import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { VerifyReportPage } from './pages/VerifyReportPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { CandidateExamsPage } from './pages/candidate/CandidateExamsPage';
import { ExamWorkspacePage } from './pages/candidate/ExamWorkspacePage';
import { CandidateResultsPage } from './pages/candidate/CandidateResultsPage';
import { ResultDetailPage } from './pages/candidate/ResultDetailPage';
import { ExaminerDashboardPage } from './pages/examiner/ExaminerDashboardPage';
import { QuestionBankPage } from './pages/examiner/QuestionBankPage';
import { ExamWizardPage } from './pages/examiner/ExamWizardPage';
import { ExamMonitorPage } from './pages/examiner/ExamMonitorPage';
import { ExamGradingPage } from './pages/examiner/ExamGradingPage';
import { ExamAnalyticsPage } from './pages/examiner/ExamAnalyticsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const isExamWorkspace = location.pathname.startsWith('/candidate/exam/');
  const skipMotion = prefersReducedMotion || isExamWorkspace;

  const content = (
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/verify/:verificationId" element={<VerifyReportPage />} />

      {/* Admin */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />

      {/* Examiner */}
      <Route
        path="/examiner"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <ExaminerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examiner/questions"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <QuestionBankPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examiner/exams/new"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <ExamWizardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examiner/exams/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <ExamWizardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examiner/exams/:id/monitor"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <ExamMonitorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examiner/exams/:id/grading"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <ExamGradingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/examiner/exams/:id/analytics"
        element={
          <ProtectedRoute allowedRoles={['examiner']}>
            <ExamAnalyticsPage />
          </ProtectedRoute>
        }
      />

      {/* Candidate + Examiner Sandbox */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <CandidateExamsPage />
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
        path="/candidate/results"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <CandidateResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/results/:attemptId"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <ResultDetailPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-canvas flex flex-col text-ink">
            <Toaster richColors position="top-right" />
            <Navbar />
            <div className="flex-1">
              <AnimatedRoutes />
            </div>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
