import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, User, LogOut } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';

export default function SettingsPage() {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    userSettings: storeSettings,
    updateSettings,
  } = useStore();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.showToast);

  const [localSettings, setLocalSettings] = useState(storeSettings);
  const [saved, setSaved] = useState(false);
  const initialSettings = useRef(storeSettings);

  useEffect(() => {
    initialSettings.current = storeSettings;
    setLocalSettings(storeSettings);
  }, [storeSettings]);

  const setField = <K extends keyof typeof localSettings>(
    key: K,
    value: (typeof localSettings)[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    initialSettings.current = { ...localSettings };
    setSaved(true);
    showToast('设置已保存', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setLocalSettings(initialSettings.current);
    showToast('已取消修改', 'info');
  };

  const handleLogout = () => {
    logout();
    showToast('已退出登录', 'info');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <ToastContainer />

      <main className="flex-1 ml-0">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={openSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">设置</h2>
                <p className="text-xs text-gray-500 mt-0.5">偏好与账户管理</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">个人信息</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">姓名</label>
                <input
                  type="text"
                  value={localSettings.teacherName}
                  onChange={(e) => setField('teacherName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-[#2dd4bf]/10"
                  placeholder="请输入姓名"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">班级</label>
                <input
                  type="text"
                  value={localSettings.className}
                  onChange={(e) => setField('className', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-[#2dd4bf]/10"
                  placeholder="请输入班级"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">职务</label>
                <input
                  type="text"
                  value={localSettings.position}
                  onChange={(e) => setField('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-[#2dd4bf]/10"
                  placeholder="请输入职务"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  saved ? 'bg-emerald-500' : 'bg-[#2dd4bf] hover:bg-[#14b8a6]'
                }`}
              >
                <Save className="w-4 h-4" />
                {saved ? '已保存' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
