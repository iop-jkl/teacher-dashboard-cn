import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuth';

export default function UserMenu() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const teacherName = session?.teacherName || '用户';
  const subtitle =
    session?.role === 'admin'
      ? '管理员 · 全部班级'
      : `${session?.classNo ?? ''}班 · 班主任`;
  const initial = Array.from(teacherName.trim())[0] || '师';

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/login');
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="用户菜单"
        aria-expanded={open}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-sm font-medium">
          {initial}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-sm font-semibold text-gray-900 truncate">{teacherName}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4 text-gray-400" />
              账号与设置
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
