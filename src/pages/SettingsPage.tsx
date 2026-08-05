import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, GraduationCap, LogOut, Save, Trash2, User, Upload, FileSpreadsheet, CheckCircle2, KeyRound, Copy, Lock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import { useStore } from '@/store/useStore';
import { useAuthStore, toEmail } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import { parseClassChangeFile, type ParsedClassChange } from '@/utils/classChange';
import { parseParentFile, buildParentImport, type ParsedParentImport } from '@/utils/parentImport';
import { generatePassword, resetPassword, changePassword } from '@/lib/password';
import { isGuestRole, maskField } from '@/lib/privacy';
import type { Student } from '@/types';

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
    students,
    reassignClass,
    updateParentInfo,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const showToast = useToastStore((s) => s.showToast);

  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [teacherDrafts, setTeacherDrafts] = useState<Record<number, string>>({});
  const [selectedTeacherClass, setSelectedTeacherClass] = useState<number | null>(null);

  const [classChangeTargetGrade, setClassChangeTargetGrade] = useState('高二');
  const [classChangeResult, setClassChangeResult] = useState<ParsedClassChange | null>(null);
  const [classChangeFileName, setClassChangeFileName] = useState('');
  const [classChangeLoading, setClassChangeLoading] = useState(false);
  const [classChangeFull, setClassChangeFull] = useState(true);
  const [classChangeError, setClassChangeError] = useState('');

  const [parentResult, setParentResult] = useState<ParsedParentImport | null>(null);
  const [parentFileName, setParentFileName] = useState('');
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState('');
  const [parentSaving, setParentSaving] = useState(false);
  const [parentScopeClass, setParentScopeClass] = useState<number>(0);
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [parentFileRows, setParentFileRows] = useState<ParsedParentImport['rows']>([]);
  const [parentFileWarnings, setParentFileWarnings] = useState<string[]>([]);

  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdChanging, setPwdChanging] = useState(false);
  const [teacherResetInfo, setTeacherResetInfo] = useState<{
    classNo: number;
    teacherName: string;
    password: string;
  } | null>(null);
  const [teacherResetting, setTeacherResetting] = useState<number | null>(null);

  const parentClassList = useMemo(() => {
    const set = new Set<number>();
    for (const s of students) set.add(s.classNo);
    return [...set].filter((c) => c > 0).sort((a, b) => a - b);
  }, [students]);

  const isAdmin = session?.role === 'admin';
  const isGuest = isGuestRole(session?.role);
  const visibleTeachers = isAdmin || isGuest
    ? classTeachers
    : classTeachers.filter((t) => t.classNo === session?.classNo);

  const handleLogout = async () => {
    await logout();
    showToast('已退出登录', 'info');
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!session || pwdNew !== pwdConfirm) {
      showToast('两次输入的新密码不一致', 'info');
      return;
    }
    if (pwdNew.trim().length < 6) {
      showToast('新密码至少 6 位', 'info');
      return;
    }
    setPwdChanging(true);
    try {
      const err = await changePassword(pwdOld, pwdNew, toEmail(session.username));
      if (err) {
        showToast(err, 'error');
        return;
      }
      setPwdOld('');
      setPwdNew('');
      setPwdConfirm('');
      showToast('密码已修改，下次登录请使用新密码', 'success');
    } catch (e) {
      console.error('修改密码失败:', e);
      showToast('修改失败，请稍后重试', 'error');
    } finally {
      setPwdChanging(false);
    }
  };

  const handleResetTeacherPassword = async (classNo: number, teacherName: string) => {
    if (!window.confirm(`确认重置${classNo}班班主任（${teacherName || '未设置姓名'}）的登录密码？`)) return;
    setTeacherResetting(classNo);
    try {
      const newPassword = generatePassword();
      const res = await resetPassword(`class${classNo}@school.local`, newPassword);
      if (!res.ok) {
        showToast(res.error || '重置失败', 'error');
        return;
      }
      setTeacherResetInfo({ classNo, teacherName, password: newPassword });
      showToast('密码已重置', 'success');
    } catch (e) {
      console.error('重置班主任密码失败:', e);
      showToast('重置失败，请稍后重试', 'error');
    } finally {
      setTeacherResetting(null);
    }
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
    if (draft === undefined) return;
    updateClassTeacher(classNo, {
      teacherName: draft,
    });
    showToast(`${classNo}班班主任信息已保存`, 'success');
  };

  const handleClassChangeFile = async (file: File | undefined) => {
    if (!file) return;
    setClassChangeLoading(true);
    setClassChangeError('');
    setClassChangeFileName(file.name);
    try {
      const result = await parseClassChangeFile(file, students);
      setClassChangeResult(result);
    } catch (e) {
      console.error('分班表解析失败:', e);
      setClassChangeResult(null);
      setClassChangeError(
        e instanceof Error ? e.message : '文件解析失败，请确认是分班表格式（含身份证、班级列）',
      );
    } finally {
      setClassChangeLoading(false);
    }
  };

  const handleClassChangeConfirm = () => {
    if (!classChangeResult || classChangeResult.matched.length === 0) return;
    const updates: Record<string, number> = {};
    for (const m of classChangeResult.matched) {
      updates[m.idCard] = m.classNo;
    }
    // 全校重分：未在分班表中的学生置为待分班（class_no=0）
    if (classChangeFull) {
      const matchedCards = new Set(classChangeResult.matched.map((m) => m.idCard));
      for (const s of students) {
        if (!matchedCards.has(s.idCard)) updates[s.idCard] = 0;
      }
    }
    reassignClass(updates, classChangeTargetGrade);
    showToast(
      `分班完成：${classChangeResult.matched.length} 名学生已分配到 ${classChangeTargetGrade}，其余学生${classChangeFull ? '已转为待分班' : '保持不变'}`,
      'success',
    );
    setClassChangeResult(null);
    setClassChangeFileName('');
  };

  const rebuildParentPreview = (rows: ParsedParentImport['rows'], warnings: string[], scopeClass: number) => {
    const scopeStudents = scopeClass > 0
      ? students.filter((s) => s.classNo === scopeClass)
      : students;
    const result = buildParentImport(rows, scopeStudents);
    result.warnings = [...warnings, ...result.warnings];
    setParentResult(result);
    setSelectedParentIds(new Set(result.updated.map((u) => u.idCard)));
  };

  const handleParentFile = async (file: File | undefined) => {
    if (!file) return;
    setParentLoading(true);
    setParentError('');
    setParentFileName(file.name);
    try {
      const { rows, warnings } = await parseParentFile(file);
      setParentFileRows(rows);
      setParentFileWarnings(warnings);
      const scopeClass = isAdmin ? parentScopeClass : (session?.classNo ?? 0);
      rebuildParentPreview(rows, warnings, scopeClass);
    } catch (e) {
      console.error('家长表解析失败:', e);
      setParentResult(null);
      setParentError(
        e instanceof Error ? e.message : '文件解析失败，请确认是家长信息表格式（含学生身份证号、家长姓名列）',
      );
    } finally {
      setParentLoading(false);
    }
  };

  const handleParentConfirm = async () => {
    if (!parentResult) return;
    const chosen = parentResult.updated.filter((u) => selectedParentIds.has(u.idCard));
    if (chosen.length === 0) {
      setParentError('请至少选择一名学生');
      return;
    }
    setParentSaving(true);
    setParentError('');
    try {
      const updates: Record<string, Partial<Student>> = {};
      for (const u of chosen) {
        updates[u.idCard] = {
          fatherName: u.fatherName,
          fatherPhone: u.fatherPhone,
          fatherWechat: u.fatherWechat,
          motherName: u.motherName,
          motherPhone: u.motherPhone,
          motherWechat: u.motherWechat,
        };
      }
      const limitClassNo = isAdmin ? parentScopeClass : (session?.classNo ?? null);
      await updateParentInfo(updates, limitClassNo);
      showToast(`家长信息已更新 ${chosen.length} 名学生`, 'success');
      setParentResult(null);
      setParentFileName('');
      setSelectedParentIds(new Set());
    } catch (err) {
      console.error('家长信息保存失败:', err);
      setParentError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setParentSaving(false);
    }
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
          {isGuest && (
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-700">
              访客演示模式：全部数据只读且已脱敏，隐私信息（姓名、身份证、家长信息）不可见，所有修改功能已禁用。
            </div>
          )}

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
                  {isGuest ? 'guest' : session?.username}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">身份</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {isGuest
                    ? '访客（演示 · 只读）'
                    : isAdmin
                      ? '管理员（全部班级）'
                      : `${session?.classNo}班班主任`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">姓名</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {isGuest ? '访客' : session?.teacherName}
                </p>
              </div>
            </div>
          </div>

          {!isGuest && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">修改密码</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  输入当前密码与新密码完成修改，下次登录请使用新密码
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">当前密码</label>
                <input
                  type="password"
                  value={pwdOld}
                  onChange={(e) => setPwdOld(e.target.value)}
                  placeholder="当前登录密码"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">新密码</label>
                <input
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleChangePassword}
                disabled={pwdChanging || !pwdOld || !pwdNew}
                className="flex items-center gap-1 px-4 py-2 text-xs text-white bg-[#1e3a5f] rounded-lg hover:bg-[#162c48] disabled:opacity-50 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {pwdChanging ? '提交中...' : '确认修改密码'}
              </button>
            </div>
          </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">班主任账号</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isAdmin ? '选择班级，编辑该班班主任姓名' : '修改自己班级的账号信息'}
                </p>
              </div>
            </div>

            {isGuest ? (
              <div className="space-y-3">
                <select
                  value={selectedTeacherClass ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedTeacherClass(v ? Number(v) : null);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                >
                  <option value="">请选择班级…</option>
                  {classTeachers.map((t) => (
                    <option key={t.classNo} value={t.classNo}>
                      {t.classNo}班
                    </option>
                  ))}
                </select>

                {selectedTeacherClass !== null &&
                  (() => {
                    const t = classTeachers.find((x) => x.classNo === selectedTeacherClass);
                    if (!t) {
                      return (
                        <div className="py-6 text-center text-sm text-gray-400">
                          未找到该班级
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg px-3 py-2">
                        <span className="w-16 text-sm font-medium text-gray-800">
                          {t.classNo}班
                        </span>
                        <span className="text-sm text-gray-600">
                          班主任：{t.teacherName ? maskField(t.teacherName) : '未设置'}
                        </span>
                      </div>
                    );
                  })()}
                {selectedTeacherClass === null && (
                  <div className="py-6 text-center text-sm text-gray-400">
                    请选择班级后查看班主任信息
                  </div>
                )}
              </div>
            ) : isAdmin ? (
              <div className="space-y-3">
                <select
                  value={selectedTeacherClass ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedTeacherClass(v ? Number(v) : null);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                >
                  <option value="">请选择班级…</option>
                  {classTeachers.map((t) => (
                    <option key={t.classNo} value={t.classNo}>
                      {t.classNo}班{t.teacherName ? ` · ${t.teacherName}` : ''}
                    </option>
                  ))}
                </select>

                {selectedTeacherClass !== null &&
                  (() => {
                    const t = classTeachers.find((x) => x.classNo === selectedTeacherClass);
                    if (!t) {
                      return (
                        <div className="py-6 text-center text-sm text-gray-400">
                          未找到该班级
                        </div>
                      );
                    }
                    const draft = teacherDrafts[t.classNo] ?? t.teacherName;
                    return (
                      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-lg px-3 py-2">
                        <span className="w-16 text-sm font-medium text-gray-800">
                          {t.classNo}班
                        </span>
                        <input
                          type="text"
                          value={draft}
                          onChange={(e) =>
                            setTeacherDrafts((prev) => ({
                              ...prev,
                              [t.classNo]: e.target.value,
                            }))
                          }
                          placeholder="班主任姓名"
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/40"
                        />
                        <button
                          onClick={() => saveTeacher(t.classNo)}
                          className="flex items-center gap-1 px-3 py-2 bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs rounded-lg hover:bg-[#2dd4bf]/20 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          保存
                        </button>
                        <button
                          onClick={() => handleResetTeacherPassword(t.classNo, t.teacherName)}
                          disabled={teacherResetting === t.classNo}
                          className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-600 text-xs rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {teacherResetting === t.classNo ? '重置中...' : '重置密码'}
                        </button>
                      </div>
                    );
                  })()}
                {selectedTeacherClass === null && (
                  <div className="py-6 text-center text-sm text-gray-400">
                    请选择班级后编辑班主任姓名
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleTeachers.map((t) => {
                  const draft = teacherDrafts[t.classNo] ?? t.teacherName;
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
                        value={draft}
                        onChange={(e) =>
                          setTeacherDrafts((prev) => ({
                            ...prev,
                            [t.classNo]: e.target.value,
                          }))
                        }
                        placeholder="班主任姓名"
                        className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/40"
                      />
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
            )}
          </div>

          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">分班管理</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    上传分班表（含身份证、姓名、班级），将学生分配到目标年级的新班级
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">目标年级</label>
                    <select
                      value={classChangeTargetGrade}
                      onChange={(e) => setClassChangeTargetGrade(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                    >
                      <option value="高二">高二</option>
                      <option value="高三">高三</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 mt-5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={classChangeFull}
                      onChange={(e) => setClassChangeFull(e.target.checked)}
                      className="accent-[#2dd4bf] w-4 h-4"
                    />
                    全校重分：未在分班表中的学生转为待分班
                  </label>
                </div>

                <button
                  onClick={() => document.getElementById('class-change-file')?.click()}
                  disabled={classChangeLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/5 disabled:opacity-60 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#2dd4bf]" />
                  {classChangeLoading
                    ? '正在解析...'
                    : classChangeFileName || '选择分班表 .xls / .xlsx 文件'}
                </button>
                <input
                  id="class-change-file"
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={(e) => handleClassChangeFile(e.target.files?.[0])}
                  className="hidden"
                />

                {classChangeError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                    {classChangeError}
                  </div>
                )}

                {classChangeResult && (
                  <div className="rounded-lg bg-teal-50 border border-teal-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        分班预览（{classChangeTargetGrade}）
                      </span>
                      <span className="text-xs text-teal-600">
                        {classChangeResult.rows.length} 行
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span>
                        匹配 <b className="text-teal-700">{classChangeResult.matched.length}</b> 人
                      </span>
                      <span>
                        未匹配 <b className="text-amber-600">{classChangeResult.unmatched.length}</b> 人
                      </span>
                      <span>
                        姓名不一致 <b className="text-amber-600">{classChangeResult.nameMismatch.length}</b> 人
                      </span>
                      <span>
                        当前待分班 <b className="text-indigo-600">{classChangeResult.pendingStudents.length}</b> 人
                      </span>
                    </div>

                    {classChangeResult.classDist.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {classChangeResult.classDist.map((d) => (
                          <span key={d.classNo} className="px-2 py-0.5 rounded bg-white text-xs text-gray-600 border border-teal-100">
                            {d.classNo}班 {d.count} 人
                          </span>
                        ))}
                      </div>
                    )}

                    {classChangeResult.warnings.length > 0 && (
                      <p className="text-xs text-amber-600">
                        提示：{classChangeResult.warnings.length} 行班级无法解析，详见浏览器控制台
                      </p>
                    )}

                    {classChangeResult.unmatched.length > 0 && (
                      <div className="text-xs text-amber-600 max-h-24 overflow-y-auto">
                        {classChangeResult.unmatched.slice(0, 10).map((u) => (
                          <p key={u.idCard}>
                            未匹配：{u.idCard} {u.name || ''} → {u.classNo}班（系统中无此人，可能为转学生）
                          </p>
                        ))}
                      </div>
                    )}

                    {classChangeFull && (
                      <p className="text-xs text-indigo-600">
                        全校重分：未出现在分班表中的 {students.length - classChangeResult.matched.length} 名学生将转为待分班
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setClassChangeResult(null);
                          setClassChangeFileName('');
                        }}
                        className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleClassChangeConfirm}
                        disabled={classChangeResult.matched.length === 0}
                        className="flex items-center gap-1 px-4 py-2 text-xs text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        确认执行分班
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">家长信息导入</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isAdmin
                    ? '上传家长信息表（含学生身份证号、家长姓名、电话、微信），可更新全部班级'
                    : `上传家长信息表，仅更新本班（${session?.classNo}班）学生，支持父/母两行`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {isGuest ? (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-500">
                  访客模式下无法上传或导入家长信息。
                </div>
              ) : (
                <>
                  <button
                    onClick={() => document.getElementById('parent-file')?.click()}
                    disabled={parentLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/5 disabled:opacity-60 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    {parentLoading
                      ? '正在解析...'
                      : parentFileName || '选择家长信息表 .xls / .xlsx 文件'}
                  </button>
              <input
                id="parent-file"
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={(e) => handleParentFile(e.target.files?.[0])}
                className="hidden"
              />
                </>
              )}

              {parentError && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                  {parentError}
                </div>
              )}

              {parentResult && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      家长信息预览
                    </span>
                    <span className="text-xs text-amber-600">
                      {parentResult.rows.length} 行
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>
                      匹配 <b className="text-amber-700">{parentResult.matched.length}</b> 人
                    </span>
                    <span>
                      未匹配 <b className="text-red-600">{parentResult.unmatched.length}</b> 人
                    </span>
                    <span>
                      可导入 <b className="text-indigo-600">{parentResult.updated.length}</b> 名学生
                    </span>
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        导入范围（仅影响预览匹配，未勾选班级的学生不会被导入）
                      </label>
                      <select
                        value={parentScopeClass}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setParentScopeClass(v);
                          if (parentFileRows.length > 0) {
                            rebuildParentPreview(parentFileRows, parentFileWarnings, v);
                          }
                        }}
                        className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-amber-500/50"
                      >
                        <option value={0}>全部班级</option>
                        {parentClassList.map((c) => (
                          <option key={c} value={c}>
                            {c}班
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {parentResult.unmatched.length > 0 && (
                    <div className="text-xs text-amber-600 max-h-24 overflow-y-auto">
                      {parentResult.unmatched.slice(0, 10).map((u, i) => (
                        <p key={`${u.idCard}-${i}`}>
                          未匹配：{u.idCard} {u.name}（系统中无此人，可能为转学生或不在本班）
                        </p>
                      ))}
                    </div>
                  )}

                  {parentResult.warnings.length > 0 && (
                    <p className="text-xs text-amber-600">
                      提示：{parentResult.warnings.length} 条跳过记录（缺少字段/无法解析）
                    </p>
                  )}

                  {parentResult.updated.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              selectedParentIds.size === parentResult.updated.length
                            }
                            onChange={(e) => {
                              setSelectedParentIds(
                                e.target.checked
                                  ? new Set(parentResult.updated.map((u) => u.idCard))
                                  : new Set(),
                              );
                            }}
                            className="accent-amber-600 w-4 h-4"
                          />
                          全选
                        </label>
                        <span className="text-xs text-gray-500">
                          已选 <b className="text-amber-700">{selectedParentIds.size}</b> / {parentResult.updated.length}
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg bg-white border border-amber-100 divide-y divide-gray-50">
                        {parentResult.updated.map((u) => (
                          <label
                            key={u.idCard}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 cursor-pointer hover:bg-amber-50/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParentIds.has(u.idCard)}
                              onChange={(e) => {
                                setSelectedParentIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(u.idCard);
                                  else next.delete(u.idCard);
                                  return next;
                                });
                              }}
                              className="accent-amber-600 w-4 h-4 shrink-0"
                            />
                            <span className="w-10 shrink-0 text-gray-400">
                              {u.classNo}班
                            </span>
                            <span className="w-44 shrink-0 truncate" title={u.idCard}>
                              {u.idCard}
                            </span>
                            <span className="flex-1 truncate">
                              {u.fatherName
                                ? `父·${u.fatherName}${u.fatherPhone ? ` ${u.fatherPhone}` : ''}`
                                : ''}
                              {u.motherName
                                ? ` 母·${u.motherName}${u.motherPhone ? ` ${u.motherPhone}` : ''}`
                                : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setParentResult(null);
                        setParentFileName('');
                        setSelectedParentIds(new Set());
                      }}
                      className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleParentConfirm}
                      disabled={selectedParentIds.size === 0 || parentSaving}
                      className="flex items-center gap-1 px-4 py-2 text-xs text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {parentSaving
                        ? '保存中...'
                        : `导入所选 ${selectedParentIds.size} 名学生`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
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
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </main>

      {teacherResetInfo && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setTeacherResetInfo(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">密码已重置</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {teacherResetInfo.classNo}班班主任（{teacherResetInfo.teacherName || '未设置姓名'}）
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              初始随机密码如下，请告知该班主任，并提醒其登录后尽快修改：
            </p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 mb-4">
              <code className="flex-1 text-base font-bold text-gray-900 tracking-wide">
                {teacherResetInfo.password}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(teacherResetInfo.password);
                  showToast('已复制', 'success');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                title="复制密码"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setTeacherResetInfo(null)}
              className="w-full px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm hover:bg-[#162c48] transition-colors"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
