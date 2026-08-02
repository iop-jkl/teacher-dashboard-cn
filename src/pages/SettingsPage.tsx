import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, GraduationCap, LogOut, Save, Trash2, User, KeyRound } from 'lucide-react';
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
    exams,
    addExam,
    removeExam,
    updateExamDate,
    classTeachers,
    updateClassTeacher,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);

  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [teacherDrafts, setTeacherDrafts] = useState<Record<number, { teacherName: string; password: string }>>({});

  const isAdmin = session?.role === 'admin';
  const visibleTeachers = isAdmin
    ? classTeachers
    : classTeachers.filter((t) => t.classNo === session?.classNo);

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
    if (exams.some((e) => e.name === newExamName.trim())) {
      showToast('考试已存在', 'info');
      return;
    }
    addExam(newExamName.trim(), newExamDate);
    setNewExamName('');
    showToast('考试已添加', 'success');
  };

  const handleRemoveExam = (id: string, name: string) => {
    if (!window.confirm(`确认删除考试“${name}”及该考试全部成绩？`)) return;
    removeExam(id);
    showToast('考试已删除', 'success');
  };

  const saveTeacher = (classNo: number) => {
    const draft = teacherDrafts[classNo];
    if (!draft) return;
    updateClassTeacher(classNo, {
      teacherName: draft.teacherName,
      password: draft.password,
    });
    showToast(`${classNo}班班主任信息已保存`, 'success');
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
                <p className="text-xs text-gray-500 mt-0.5">账号、班主任与考试管理</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">当前账号</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">账号</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {session?.username}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">身份</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {isAdmin ? '管理员（全部班级）' : `${session?.classNo}班班主任`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">姓名</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {session?.teacherName}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">班主任账号</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isAdmin ? '可管理全部班级的账号、密码与姓名' : '修改自己班级的账号信息'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {visibleTeachers.map((t) => {
                const draft = teacherDrafts[t.classNo] || {
                  teacherName: t.teacherName,
                  password: t.password,
                };
                return (
                  <div
                    key={t.classNo}
                    className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="w-16 text-sm font-medium text-gray-800">
                      {t.classNo}班
                    </span>
                    <input
                      type="text"
                      value={draft.teacherName}
                      onChange={(e) =>
                        setTeacherDrafts((prev) => ({
                          ...prev,
                          [t.classNo]: { ...draft, teacherName: e.target.value },
                        }))
                      }
                      placeholder="班主任姓名"
                      className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/40"
                    />
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={draft.password}
                        onChange={(e) =>
                          setTeacherDrafts((prev) => ({
                            ...prev,
                            [t.classNo]: { ...draft, password: e.target.value },
                          }))
                        }
                        placeholder="密码"
                        className="w-32 pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/40"
                      />
                    </div>
                    <button
                      onClick={() => saveTeacher(t.classNo)}
                      className="flex items-center gap-1 px-3 py-2 bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs rounded-lg hover:bg-[#2dd4bf]/20 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      保存
                    </button>
                  </div>
                );
              })}
              {visibleTeachers.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-400">
                  暂无班主任账号
                </div>
              )}
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
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-sm font-medium text-gray-800">{exam.name}</p>
                  </div>
                  <input
                    type="date"
                    value={exam.date || ''}
                    onChange={(e) => updateExamDate(exam.id, e.target.value)}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#2dd4bf]/40"
                  />
                  <button
                    onClick={() => handleRemoveExam(exam.id, exam.name)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`删除${exam.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {exams.length === 0 && (
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
                placeholder="考试名称，如：期末考试"
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

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </main>
    </div>
  );
}
