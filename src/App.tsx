import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from '@/pages/Dashboard';
import StudentDetail from '@/pages/StudentDetail';
import StudentsPage from '@/pages/StudentsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SchedulePage from '@/pages/SchedulePage';
import SettingsPage from '@/pages/SettingsPage';
import { useStore } from '@/store/useStore';

export default function App() {
  const { activePage, setActivePage, closeSidebar } = useStore();
  const loadFromSupabase = useStore((s) => s.loadFromSupabase);
  const supabaseError = useStore((s) => s.supabaseError);

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

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
    <Router>
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
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/students"
          element={
            <PageRouter activePage={activePage} setActivePage={setActivePage}>
              <StudentsPage />
            </PageRouter>
          }
        />
        <Route
          path="/analytics"
          element={
            <PageRouter activePage={activePage} setActivePage={setActivePage}>
              <AnalyticsPage />
            </PageRouter>
          }
        />
        <Route
          path="/schedule"
          element={
            <PageRouter activePage={activePage} setActivePage={setActivePage}>
              <SchedulePage />
            </PageRouter>
          }
        />
        <Route
          path="/settings"
          element={
            <PageRouter activePage={activePage} setActivePage={setActivePage}>
              <SettingsPage />
            </PageRouter>
          }
        />
        <Route path="/student/:id" element={<StudentDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
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
