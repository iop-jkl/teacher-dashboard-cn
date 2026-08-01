import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { useStore, type PageKey } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: {
  icon: typeof LayoutDashboard;
  label: string;
  key: PageKey;
  path: string;
}[] = [
  { icon: LayoutDashboard, label: '工作台', key: 'dashboard', path: '/' },
  { icon: Users, label: '学生管理', key: 'students', path: '/students' },
  { icon: FileText, label: '成绩分析', key: 'analytics', path: '/analytics' },
  { icon: Calendar, label: '日程安排', key: 'schedule', path: '/schedule' },
  { icon: Settings, label: '设置', key: 'settings', path: '/settings' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = useStore((s) => s.activePage);
  const setActivePage = useStore((s) => s.setActivePage);
  const closeSidebar = useStore((s) => s.closeSidebar);
  const userSettings = useStore((s) => s.userSettings);
  const showToast = useToastStore((s) => s.showToast);

  const handleNavigate = (item: typeof navItems[number]) => {
    setActivePage(item.key);
    navigate(item.path);
    closeSidebar();
  };

  const handleLogout = () => {
    showToast('已退出登录（演示）', 'info');
    closeSidebar();
  };

  const currentPath = location.pathname;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 z-40
          transform transition-transform duration-200 ease-out
          lg:translate-x-0 lg:static lg:z-auto lg:w-60 lg:shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100">
          <button
            onClick={() => {
              setActivePage('dashboard');
              navigate('/');
            }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center">
              <span className="text-white text-sm font-bold">CT</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 leading-tight">班主任工作台</p>
              <p className="text-[10px] text-gray-400 leading-tight">Class Teacher</p>
            </div>
          </button>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.key === activePage ||
              (item.path === '/' && (currentPath === '/' || currentPath === '')) ||
              currentPath.startsWith(item.path) && item.path !== '/' && item.path !== '';

            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${
                    isActive
                      ? 'bg-[#2dd4bf]/10 text-[#2dd4bf] font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.key === activePage && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2dd4bf]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-sm font-medium">
              {userSettings.teacherName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userSettings.teacherName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {userSettings.className} · {userSettings.position}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>
    </>
  );
}
