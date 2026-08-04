import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  UserPlus,
  Trash2,
  X,
  Save,
  Eye,
  KeyRound,
  Copy,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import ExcelExportButton from '@/components/ExcelExportButton';
import Pagination from '@/components/Pagination';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import {
  buildScoreIndex,
  rankClassStudentsIndexed,
  subjectScore,
  scoreValue,
} from '@/lib/scoreUtils';
import type { Student } from '@/types';
import { generatePassword, resetPassword } from '@/lib/password';

const SELECTABLE = ['政治', '历史', '地理', '物理', '化学', '生物'];

export default function StudentsPage() {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    exams,
    removeStudent,
    removeStudents,
    updateStudent,
    addStudent,
    updateExamScores,
    activeClass,
    setActiveClass,
    loadScoresForClass,
    loadScoresForStudent,
    loadAllScores,
    scoresLoading,
    loadedScoreClasses,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const showToast = useToastStore((s) => s.showToast);
  const navigate = useNavigate();

  const isAdmin = session?.role === 'admin';
  const allClassCount = useMemo(
    () => new Set(students.map((s) => s.classNo)).size,
    [students],
  );

  useEffect(() => {
    if (!isAdmin && session?.classNo) {
      setActiveClass(session.classNo);
    }
  }, [isAdmin, session?.classNo, setActiveClass]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeClass > 0) loadScoresForClass(activeClass);
    if (activeClass === 0) loadAllScores();
  }, [isAdmin, activeClass, loadScoresForClass, loadAllScores]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (selectedStudent) {
      loadScoresForStudent(selectedStudent.idCard);
    }
  }, [selectedStudent, loadScoresForStudent]);
  const [selectedExam, setSelectedExam] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { rawScore: string; assignedScore: string }>
  >({});
  const [remarkDraft, setRemarkDraft] = useState('');
  const [parentDraft, setParentDraft] = useState({
    fatherName: '',
    fatherPhone: '',
    fatherWechat: '',
    motherName: '',
    motherPhone: '',
    motherWechat: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [resetPasswordInfo, setResetPasswordInfo] = useState<
    { name: string; idCard: string; password: string } | null
  >(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    idCard: '',
    classNo: 1,
    selectedSubjects: [] as string[],
    fatherName: '',
    fatherPhone: '',
    fatherWechat: '',
    motherName: '',
    motherPhone: '',
    motherWechat: '',
  });

  const classNoList = useMemo(() => {
    const set = new Set<number>();
    for (const s of students) set.add(s.classNo);
    const list = [...set].sort((a, b) => a - b);
    return isAdmin ? [0, ...list] : list;
  }, [students, isAdmin]);

  const classStudents = useMemo(
    () =>
      activeClass === 0
        ? students
        : activeClass === -1
          ? students.filter((s) => s.classNo === 0)
          : students.filter((s) => s.classNo === activeClass),
    [students, activeClass],
  );

  const latestExam = exams[exams.length - 1];
  const scoreIndex = useMemo(() => buildScoreIndex(scores), [scores]);

  const ranked = useMemo(() => {
    if (!latestExam || activeClass === -1) return [];
    return rankClassStudentsIndexed(
      students,
      scoreIndex,
      latestExam.id,
      activeClass,
    );
  }, [students, scoreIndex, latestExam, activeClass]);

  const filtered = useMemo(() => {
    let result = ranked;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.student.name.toLowerCase().includes(q) ||
          e.student.idCard.toLowerCase().includes(q),
      );
    }
    return result;
  }, [ranked, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, activeClass]);

  const PAGE_SIZE = 100;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedFiltered = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    if (!selectedStudent) return;
    const examsForStudent = exams;
    setSelectedExam(examsForStudent[examsForStudent.length - 1]?.name || '');
    setRemarkDraft(selectedStudent.remark);
    setParentDraft({
      fatherName: selectedStudent.fatherName,
      fatherPhone: selectedStudent.fatherPhone,
      fatherWechat: selectedStudent.fatherWechat,
      motherName: selectedStudent.motherName,
      motherPhone: selectedStudent.motherPhone,
      motherWechat: selectedStudent.motherWechat,
    });
    setEditMode(false);
    setScoreDrafts({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent?.idCard, exams]);

  const examId = exams.find((e) => e.name === selectedExam)?.id || '';

  const selectedStudentScores = useMemo(() => {
    if (!selectedStudent || !examId) return [];
    return scores.filter(
      (s) => s.studentId === selectedStudent.idCard && s.examId === examId,
    );
  }, [selectedStudent, examId, scores]);

  const selectedTotal = selectedStudentScores.find((s) => s.subject === '总分');
  const selectedSubjects = selectedStudent
    ? [...['语文', '数学', '英语'], ...selectedStudent.selectedSubjects]
    : [];

  const handleDeleteStudent = (idCard: string) => {
    if (!window.confirm('确认删除该学生及其全部成绩？')) return;
    removeStudent(idCard);
    setSelectedIds((prev) => prev.filter((x) => x !== idCard));
    showToast('学生已删除', 'info');
  };

  const handleResetStudentPassword = async (student: Student) => {
    if (!window.confirm(`确认重置学生“${student.name}”的登录密码？`)) return;
    setResettingPassword(true);
    try {
      const newPassword = generatePassword();
      const res = await resetPassword(
        `s${student.idCard.toUpperCase()}@school.local`,
        newPassword,
      );
      if (!res.ok) {
        showToast(res.error || '重置失败', 'error');
        return;
      }
      setResetPasswordInfo({
        name: student.name,
        idCard: student.idCard,
        password: newPassword,
      });
      showToast('密码已重置', 'success');
    } catch (e) {
      console.error('重置密码失败:', e);
      showToast('重置失败，请稍后重试', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确认删除选中的 ${selectedIds.length} 名学生及其成绩？`)) return;
    removeStudents(selectedIds);
    setSelectedIds([]);
    showToast('已删除选中学生', 'success');
  };

  const toggleSelect = (idCard: string) => {
    setSelectedIds((prev) =>
      prev.includes(idCard)
        ? prev.filter((x) => x !== idCard)
        : [...prev, idCard],
    );
  };

  const handleSaveStudentInfo = () => {
    if (!selectedStudent) return;
    updateStudent(selectedStudent.idCard, {
      remark: remarkDraft,
      ...parentDraft,
    });
    setSelectedStudent({
      ...selectedStudent,
      remark: remarkDraft,
      ...parentDraft,
    });
    showToast('家长信息与备注已保存', 'success');
  };

  const startEditScores = () => {
    if (!selectedStudent) return;
    const drafts: Record<string, { rawScore: string; assignedScore: string }> = {};
    for (const subject of selectedSubjects) {
      const row = subjectScore(scores, selectedStudent.idCard, examId, subject);
      drafts[subject] = {
        rawScore: row?.rawScore == null ? '' : String(row.rawScore),
        assignedScore: row?.assignedScore == null ? '' : String(row.assignedScore),
      };
    }
    setScoreDrafts(drafts);
    setEditMode(true);
  };

  const handleSaveScoreDrafts = () => {
    if (!selectedStudent || !examId) return;
    const updates = selectedSubjects.map((subject) => {
      const d = scoreDrafts[subject];
      const raw =
        d?.rawScore === '' || d?.rawScore === undefined
          ? null
          : Number(d.rawScore);
      const assigned =
        d?.assignedScore === '' || d?.assignedScore === undefined
          ? null
          : Number(d.assignedScore);
      return {
        subject,
        rawScore: raw === null || Number.isNaN(raw) ? null : raw,
        assignedScore:
          assigned === null || Number.isNaN(assigned) ? null : assigned,
      };
    });
    updateExamScores(selectedStudent.idCard, examId, updates);
    setEditMode(false);
    showToast('成绩已保存并重新计算排名', 'success');
  };

  const handleAddStudent = () => {
    setAddForm({
      name: '',
      idCard: '',
      classNo: activeClass === 0 ? 1 : activeClass,
      selectedSubjects: [],
      fatherName: '',
      fatherPhone: '',
      fatherWechat: '',
      motherName: '',
      motherPhone: '',
      motherWechat: '',
    });
    setShowAddModal(true);
  };

  const handleSaveAddStudent = () => {
    if (!addForm.name.trim() || !/^\d{17}[\dXx]$/.test(addForm.idCard.trim())) {
      showToast('请填写姓名和正确的18位身份证号', 'info');
      return;
    }
    if (addForm.selectedSubjects.length !== 3) {
      showToast('请选择3门选考科目', 'info');
      return;
    }
    if (students.some((s) => s.idCard === addForm.idCard.trim())) {
      showToast('该身份证号已存在', 'info');
      return;
    }
    addStudent({
      idCard: addForm.idCard.trim(),
      name: addForm.name.trim(),
      classNo: addForm.classNo,
      grade: '高一',
      selectedSubjects: addForm.selectedSubjects,
      fatherName: addForm.fatherName.trim(),
      fatherPhone: addForm.fatherPhone.trim(),
      fatherWechat: addForm.fatherWechat.trim(),
      motherName: addForm.motherName.trim(),
      motherPhone: addForm.motherPhone.trim(),
      motherWechat: addForm.motherWechat.trim(),
      remark: '',
    });
    setShowAddModal(false);
    showToast('学生已添加', 'success');
  };

  const toggleSelectedSubject = (subject: string) => {
    setAddForm((prev) => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subject)
        ? prev.selectedSubjects.filter((s) => s !== subject)
        : [...prev.selectedSubjects, subject],
    }));
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
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">学生管理</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeClass === 0
                    ? '全部班级'
                    : activeClass === -1
                      ? '待分班'
                      : `${activeClass}班`}{' '}
                  · 共 {classStudents.length} 名学生
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <select
                  value={activeClass}
                  onChange={(e) => setActiveClass(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                  aria-label="切换班级"
                >
                  {classNoList.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls === 0 ? '全部班级' : `${cls}班`}
                    </option>
                  ))}
                  {students.some((s) => s.classNo === 0) && (
                    <option value={-1}>待分班</option>
                  )}
                </select>
              )}
              <ExcelExportButton />
              <button
                onClick={handleAddStudent}
                className="flex items-center gap-1 px-3 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                添加
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索学生姓名或身份证号"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/30 focus:outline-none transition-all"
              />
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-3 flex-wrap">
              <span className="text-sm text-gray-600">已选 {selectedIds.length} 人</span>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 transition-colors"
              >
                批量删除
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filtered.length > 0 &&
                          filtered.every((e) => selectedIds.includes(e.student.idCard))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => [
                              ...new Set([
                                ...prev,
                                ...filtered.map((x) => x.student.idCard),
                              ]),
                            ]);
                          } else {
                            setSelectedIds((prev) =>
                              prev.filter(
                                (id) =>
                                  !filtered.some((x) => x.student.idCard === id),
                              ),
                            );
                          }
                        }}
                        className="accent-[#2dd4bf]"
                      />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">学生</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">年级</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">身份证号</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">班级</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">选科</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFiltered.map((entry) => (
                    <tr
                      key={entry.student.idCard}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.student.idCard)}
                          onChange={() => toggleSelect(entry.student.idCard)}
                          className="accent-[#2dd4bf]"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelectedStudent(entry.student)}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                            {entry.student.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 group-hover:text-[#2dd4bf] transition-colors">
                            {entry.student.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[11px]">
                          {entry.student.grade || '高一'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{entry.student.idCard}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{entry.student.classNo === 0 ? '待分班' : `${entry.student.classNo}班`}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          {entry.student.selectedSubjects.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 text-[11px]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedStudent(entry.student)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#2dd4bf] transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(entry.student.idCard)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-100">
              {pagedFiltered.map((entry) => (
                <div key={entry.student.idCard} className="p-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry.student.idCard)}
                    onChange={() => toggleSelect(entry.student.idCard)}
                    className="accent-[#2dd4bf] shrink-0"
                  />
                  <button
                    onClick={() => setSelectedStudent(entry.student)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-sm font-medium shrink-0"
                  >
                    {entry.student.name.charAt(0)}
                  </button>
                  <button
                    onClick={() => setSelectedStudent(entry.student)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {entry.student.name}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {entry.student.grade || '高一'} · {entry.student.classNo === 0 ? '待分班' : `${entry.student.classNo}班`} · {entry.student.idCard}
                    </p>
                  </button>
                  <button
                    onClick={() => setSelectedStudent(entry.student)}
                    className="p-2 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs font-medium shrink-0"
                  >
                    详情
                  </button>
                </div>
              ))}
            </div>

            {scoresLoading.includes(activeClass) && activeClass !== 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                正在加载成绩数据…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                {searchQuery ? '未找到匹配的学生' : '暂无学生数据'}
              </div>
            ) : (
              <>
                {activeClass === 0 && scoresLoading.includes(0) && (
                  <p className="text-xs text-gray-400 mb-3">
                    正在加载全部班级成绩…（已加载 {loadedScoreClasses.length}/{allClassCount}{' '}
                    个班级）
                  </p>
                )}
                <Pagination
                  page={currentPage}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-lg font-medium">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedStudent.idCard} · {selectedStudent.classNo}班
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">选择考试</h4>
                  <p className="text-xs text-gray-400 mt-0.5">查看该次考试的成绩与排名</p>
                </div>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTotal && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1e3a5f] text-white rounded-lg p-3 text-center">
                    <p className="text-xs text-white/70">总分赋分</p>
                    <p className="text-xl font-bold mt-1">
                      {(scoreValue(selectedTotal) ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-teal-50 text-teal-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-teal-600/70">班级排名</p>
                    <p className="text-xl font-bold mt-1">
                      {selectedTotal.classRank || '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 text-gray-700 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">学校排名</p>
                    <p className="text-xl font-bold mt-1">
                      {selectedTotal.schoolRank || '-'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">各科成绩</h4>
                {isAdmin && (
                  <button
                    onClick={() => (editMode ? setEditMode(false) : startEditScores())}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#2dd4bf]/30 text-[#2dd4bf] hover:bg-[#2dd4bf]/5 transition-colors"
                  >
                    {editMode ? '完成编辑' : '编辑成绩'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {selectedSubjects.map((subject) => {
                  const row = subjectScore(scores, selectedStudent.idCard, examId, subject);
                  const value = scoreValue(row);
                  const hasAssigned =
                    row?.assignedScore !== null &&
                    row?.assignedScore !== undefined &&
                    selectedStudent.selectedSubjects.includes(subject);
                  return (
                    <div
                      key={subject}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg flex-wrap gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{subject}</span>
                        {hasAssigned && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">
                            赋分
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {isAdmin && editMode ? (
                          <>
                            <input
                              type="number"
                              value={
                                scoreDrafts[subject]?.rawScore ??
                                String(row?.rawScore ?? '')
                              }
                              onChange={(e) =>
                                setScoreDrafts((prev) => ({
                                  ...prev,
                                  [subject]: {
                                    rawScore: e.target.value,
                                    assignedScore:
                                      prev[subject]?.assignedScore ??
                                      String(row?.assignedScore ?? ''),
                                  },
                                }))
                              }
                              placeholder="原始分"
                              className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#2dd4bf]/50"
                            />
                            {hasAssigned && (
                              <input
                                type="number"
                                value={
                                  scoreDrafts[subject]?.assignedScore ??
                                  String(row?.assignedScore ?? '')
                                }
                                onChange={(e) =>
                                  setScoreDrafts((prev) => ({
                                    ...prev,
                                    [subject]: {
                                      rawScore:
                                        prev[subject]?.rawScore ??
                                        String(row?.rawScore ?? ''),
                                      assignedScore: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="赋分"
                                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#2dd4bf]/50"
                              />
                            )}
                          </>
                        ) : (
                          <>
                            {hasAssigned && (
                              <span className="text-xs text-gray-400">
                                原始 {row?.rawScore ?? '-'}
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {value?.toFixed(2) ?? '-'} 分
                            </span>
                          </>
                        )}
                        <span className="text-xs text-gray-400">
                          班第{row?.classRank || '-'}名 · 校第{row?.schoolRank || '-'}名
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-sm font-medium text-gray-900 mb-3">家长信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      ['父亲姓名', 'fatherName'],
                      ['父亲电话', 'fatherPhone'],
                      ['父亲微信', 'fatherWechat'],
                      ['母亲姓名', 'motherName'],
                      ['母亲电话', 'motherPhone'],
                      ['母亲微信', 'motherWechat'],
                    ] as const
                  ).map(([label, key]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={parentDraft[key]}
                        onChange={(e) =>
                          setParentDraft((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">学生备注</h4>
                  <span className="text-xs text-gray-400">{remarkDraft.length} 字</span>
                </div>
                <textarea
                  value={remarkDraft}
                  onChange={(e) => setRemarkDraft(e.target.value)}
                  placeholder="输入对该学生的备注，如学习状态、家长沟通要点等"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                关闭
              </button>
              {session?.role === 'teacher' && (
                <button
                  onClick={() => handleResetStudentPassword(selectedStudent)}
                  disabled={resettingPassword}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                  {resettingPassword ? '重置中...' : '重置密码'}
                </button>
              )}
              <button
                onClick={() => navigate(`/student/${selectedStudent.idCard}`)}
                className="px-4 py-2 text-sm text-[#2dd4bf] border border-[#2dd4bf]/30 rounded-lg hover:bg-[#2dd4bf]/5 transition-colors"
              >
                查看完整档案
              </button>
              {isAdmin && editMode && (
                <button
                  onClick={handleSaveScoreDrafts}
                  className="px-4 py-2 text-sm text-white bg-[#1e3a5f] rounded-lg hover:bg-[#162c48] transition-colors"
                >
                  保存成绩
                </button>
              )}
              <button
                onClick={handleSaveStudentInfo}
                className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">添加学生</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">姓名</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="学生姓名"
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">班级</label>
                  <input
                    type="number"
                    value={addForm.classNo}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, classNo: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">身份证号</label>
                <input
                  type="text"
                  value={addForm.idCard}
                  onChange={(e) => setAddForm((p) => ({ ...p, idCard: e.target.value }))}
                  placeholder="18位身份证号"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">选考科目（选3门）</label>
                <div className="grid grid-cols-3 gap-2">
                  {SELECTABLE.map((subject) => {
                    const active = addForm.selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSelectedSubject(subject)}
                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                          active
                            ? 'bg-[#2dd4bf]/10 border-[#2dd4bf]/40 text-[#2dd4bf] font-medium'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    ['父亲姓名', 'fatherName'],
                    ['父亲电话', 'fatherPhone'],
                    ['父亲微信', 'fatherWechat'],
                    ['母亲姓名', 'motherName'],
                    ['母亲电话', 'motherPhone'],
                    ['母亲微信', 'motherWechat'],
                  ] as const
                ).map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      type="text"
                      value={addForm[key]}
                      onChange={(e) => setAddForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAddStudent}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2dd4bf] text-white text-sm hover:bg-[#14b8a6] transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {resetPasswordInfo && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setResetPasswordInfo(null)}
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
                  {resetPasswordInfo.name}（{resetPasswordInfo.idCard}）
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              初始随机密码如下，请告知学生本人，并提醒其登录后尽快修改：
            </p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3 mb-4">
              <code className="flex-1 text-base font-bold text-gray-900 tracking-wide">
                {resetPasswordInfo.password}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(resetPasswordInfo.password);
                  showToast('已复制', 'success');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                title="复制密码"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setResetPasswordInfo(null)}
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
