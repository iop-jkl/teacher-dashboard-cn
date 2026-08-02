import { useState, useMemo, useEffect } from 'react';
import { Menu, X, Save, Pencil } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import {
  buildScoreIndex,
  rankClassStudentsIndexed,
  subjectScore,
} from '@/lib/scoreUtils';
import type { Student } from '@/types';

export default function ScoreEntryPage() {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    exams,
    activeClass,
    setActiveClass,
    updateExamScores,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const showToast = useToastStore((s) => s.showToast);
  const isAdmin = session?.role === 'admin';

  useEffect(() => {
    if (!isAdmin && session?.classNo) {
      setActiveClass(session.classNo);
    }
  }, [isAdmin, session?.classNo, setActiveClass]);

  const [selectedExamId, setSelectedExamId] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { rawScore: string; assignedScore: string }>
  >({});

  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];

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
        : students.filter((s) => s.classNo === activeClass),
    [students, activeClass],
  );

  const scoreIndex = useMemo(() => buildScoreIndex(scores), [scores]);

  const ranked = useMemo(() => {
    if (!activeExam) return [];
    return rankClassStudentsIndexed(
      students,
      scoreIndex,
      activeExam.id,
      activeClass,
    );
  }, [students, scoreIndex, activeExam, activeClass]);

  const studentSubjects = editingStudent
    ? ['语文', '数学', '英语', ...editingStudent.selectedSubjects]
    : [];

  const startEdit = (student: Student) => {
    if (!activeExam) return;
    const next: Record<string, { rawScore: string; assignedScore: string }> = {};
    for (const subject of ['语文', '数学', '英语', ...student.selectedSubjects]) {
      const row = subjectScore(scores, student.idCard, activeExam.id, subject);
      next[subject] = {
        rawScore: row?.rawScore == null ? '' : String(row.rawScore),
        assignedScore: row?.assignedScore == null ? '' : String(row.assignedScore),
      };
    }
    setDrafts(next);
    setEditingStudent(student);
  };

  const saveScores = () => {
    if (!editingStudent || !activeExam) return;
    const updates = studentSubjects.map((subject) => {
      const d = drafts[subject];
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
    updateExamScores(editingStudent.idCard, activeExam.id, updates);
    setEditingStudent(null);
    showToast('成绩已保存并重新计算排名', 'success');
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
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">成绩录入</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeExam?.name || '暂无考试'} ·{' '}
                  {activeClass === 0 ? '全部班级' : `${activeClass}班`}
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
                </select>
              )}
              <select
                value={activeExam?.id || ''}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                aria-label="选择考试"
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-gray-900">录入说明</h3>
            <p className="text-xs text-gray-400 mt-1">
              语数英只填原始分；选考科目同时填原始分和赋分。保存后总分（语数英原始分 + 选科赋分）和班内排名会自动重算。
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">排名</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">学生</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">身份证号</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">班级</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">总分赋分</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((entry, idx) => (
                    <tr
                      key={entry.student.idCard}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-gray-50 text-gray-500">
                          {entry.classRank || idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                            {entry.student.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {entry.student.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {entry.student.idCard}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {entry.student.classNo}班
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-[#1e3a5f]">
                        {entry.total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => startEdit(entry.student)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs rounded-lg hover:bg-[#2dd4bf]/20 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          录入成绩
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-100">
              {ranked.map((entry) => (
                <div key={entry.student.idCard} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.student.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {entry.student.classNo}班 · 总分 {entry.total.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(entry.student)}
                    className="p-2 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs font-medium shrink-0"
                  >
                    录入
                  </button>
                </div>
              ))}
            </div>

            {ranked.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">暂无学生数据</div>
            )}
          </div>
        </div>
      </main>

      {editingStudent && activeExam && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingStudent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {editingStudent.name} · 录入成绩
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeExam.name} · {editingStudent.classNo}班
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {studentSubjects.map((subject) => {
                const isSelected = editingStudent.selectedSubjects.includes(subject);
                return (
                  <div key={subject} className="flex items-center gap-2 flex-wrap">
                    <span className="w-12 text-sm text-gray-700">{subject}</span>
                    <input
                      type="number"
                      value={drafts[subject]?.rawScore ?? ''}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [subject]: {
                            rawScore: e.target.value,
                            assignedScore: prev[subject]?.assignedScore ?? '',
                          },
                        }))
                      }
                      placeholder="原始分"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                    />
                    {isSelected && (
                      <input
                        type="number"
                        value={drafts[subject]?.assignedScore ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [subject]: {
                              rawScore: prev[subject]?.rawScore ?? '',
                              assignedScore: e.target.value,
                            },
                          }))
                        }
                        placeholder="赋分"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveScores}
                className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
