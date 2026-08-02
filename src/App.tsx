import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from '@/pages/Dashboard';
import StudentDetail from '@/pages/StudentDetail';
import StudentsPage from '@/pages/StudentsPage';
import ScoreEntryPage from '@/pages/ScoreEntryPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SchedulePage from '@/pages/SchedulePage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';

export default function App() {
  const { activePage, setActivePage, closeSidebar } = useStore();
  const loadFromSupabase = useStore((s) => s.loadFromSupabase);
  const supabaseError = useStore((s) => s.supabaseError);

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

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
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/students"
          element={
            <RequireAuth>
              <PageRouter activePage={activePage} setActivePage={setActivePage}>
                <StudentsPage />
              </PageRouter>
            </RequireAuth>
          }
        />
        <Route
          path="/score-entry"
          element={
            <RequireAuth>
              <PageRouter activePage={activePage} setActivePage={setActivePage}>
                <ScoreEntryPage />
              </PageRouter>
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <PageRouter activePage={activePage} setActivePage={setActivePage}>
                <AnalyticsPage />
              </PageRouter>
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
              <PageRouter activePage={activePage} setActivePage={setActivePage}>
                <SettingsPage />
              </PageRouter>
            </RequireAuth>
          }
        />
        <Route
          path="/student/:id"
          element={
            <RequireAuth>
              <StudentDetail />
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
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function PageRouter({
  activePage,
  setActivePage,
  children,
}: {
  activePage: string;
  setActivePage: (page: any) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const path = window.location.pathname;
    const map: Record<string, string> = {
      '/students': 'students',
      '/score-entry': 'score-entry',
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
