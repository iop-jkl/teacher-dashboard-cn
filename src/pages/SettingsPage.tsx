import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, User, LogOut, CalendarPlus, Trash2 } from 'lucide-react';
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
    examList,
    addExam,
    removeExam,
    updateExamDate,
  } = useStore();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.showToast);

  const [localSettings, setLocalSettings] = useState(storeSettings);
  const [saved, setSaved] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState(
    new Date().toISOString().split('T')[0]
  );
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

  const handleAddExam = () => {
    if (!newExamName.trim()) {
      showToast('请输入考试名称', 'info');
      return;
    }
    if (examList.includes(newExamName.trim())) {
      showToast('考试已存在', 'info');
      return;
    }
    addExam(newExamName.trim(), newExamDate);
    setNewExamName('');
    showToast('考试已添加', 'success');
  };

  const handleRemoveExam = (name: string) => {
    if (!window.confirm(`确认删除考试“${name}”及其全部成绩？`)) return;
    removeExam(name);
    showToast('考试已删除', 'success');
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

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <CalendarPlus className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">考试管理</h3>
            </div>

            <div className="space-y-3">
              {examList.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-sm font-medium text-gray-800">{name}</p>
                  </div>
                  <input
                    type="date"
                    value={storeSettings.examDates[name] || ''}
                    onChange={(e) => updateExamDate(name, e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#2dd4bf]/40"
                  />
                  <button
                    onClick={() => handleRemoveExam(name)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`删除${name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {examList.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-400">
                  暂无考试，请先添加
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <input
                type="text"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                placeholder="考试名称，如：期末考"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
              <input
                type="date"
                value={newExamDate}
                onChange={(e) => setNewExamDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
              <button
                onClick={handleAddExam}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                <CalendarPlus className="w-4 h-4" />
                添加考试
              </button>
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
