import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from '@/pages/Dashboard';
import StudentDetail from '@/pages/StudentDetail';
import StudentsPage from '@/pages/StudentsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SchedulePage from '@/pages/SchedulePage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import StudentPortal from '@/pages/StudentPortal';
import MessagesPage from '@/pages/MessagesPage';
import ForcePasswordChange from '@/components/ForcePasswordChange';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';

export default function App() {
  const { activePage, setActivePage, closeSidebar } = useStore();
  const loadFromSupabase = useStore((s) => s.loadFromSupabase);
  const supabaseError = useStore((s) => s.supabaseError);
  const restoreAuth = useAuthStore((s) => s.restore);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadFromSupabase();
    }
  }, [loadFromSupabase, isAuthenticated]);

  useEffect(() => {
    const pendingRedirect = sessionStorage.getItem('gh-pages-redirect');
    if (pendingRedirect) {
      sessionStorage.removeItem('gh-pages-redirect');
      window.location.replace(pendingRedirect);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeSidebar();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  return (
    <Router basename={window.location.hostname === 'iop-jkl.github.io' ? '/teacher-dashboard-cn' : ''}>
      {supabaseError && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          <span>{supabaseError}</span>
          <button
            onClick={() => loadFromSupabase()}
            className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs hover:bg-amber-700 transition-colors"
          >
            重试
          </button>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomeRedirect />
            </RequireAuth>
          }
        />
        <Route
          path="/my-scores"
          element={
            <RequireAuth>
              <StudentOnly>
                <StudentPortal />
              </StudentOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/messages"
          element={
            <RequireAuth>
              <MessagesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/students"
          element={
            <RequireAuth>
              <StaffOnly>
                <PageRouter activePage={activePage} setActivePage={setActivePage}>
                  <StudentsPage />
                </PageRouter>
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <StaffOnly>
                <PageRouter activePage={activePage} setActivePage={setActivePage}>
                  <AnalyticsPage />
                </PageRouter>
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/schedule"
          element={
            <RequireAuth>
              <PageRouter activePage={activePage} setActivePage={setActivePage}>
                <SchedulePage />
              </PageRouter>
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <StaffOnly>
                <PageRouter activePage={activePage} setActivePage={setActivePage}>
                  <SettingsPage />
                </PageRouter>
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route
          path="/student/:id"
          element={
            <RequireAuth>
              <StaffOnly>
                <StudentDetail />
              </StaffOnly>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoring = useAuthStore((s) => s.restoring);
  const mustChangePassword = useAuthStore((s) => s.session?.mustChangePassword);
  const location = useLocation();

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="text-sm text-gray-400">正在加载…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const role = useAuthStore((s) => s.session?.role);
  const activePage = useStore((s) => s.activePage);
  const setActivePage = useStore((s) => s.setActivePage);
  if (role === 'student') {
    return <Navigate to="/my-scores" replace />;
  }
  return (
    <PageRouter activePage={activePage} setActivePage={setActivePage}>
      <Dashboard />
    </PageRouter>
  );
}

function StaffOnly({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.session?.role);
  if (role === 'student') {
    return <Navigate to="/my-scores" replace />;
  }
  return <>{children}</>;
}

function StudentOnly({ children }: { children: React.ReactNode }) {
  const role = useAuthStore((s) => s.session?.role);
  if (role !== 'student') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PageRouter({
  activePage,
  setActivePage,
  children,
}: {
  activePage: string;
  setActivePage: (page: string) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const path = window.location.pathname;
    const map: Record<string, string> = {
      '/': 'dashboard',
      '/students': 'students',
      '/analytics': 'analytics',
      '/schedule': 'schedule',
      '/settings': 'settings',
    };
    const key = map[path];
    if (key && activePage !== key) {
      setActivePage(key);
    }
  }, [activePage, setActivePage]);

  return <>{children}</>;
}
