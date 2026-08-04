import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, X, ArrowUp, ArrowDown } from 'lucide-react';
import type { Student, Score } from '@/types';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import {
  buildScoreIndex,
  totalForIndexed,
  studentScoreFromIndex,
  studentSubjectTotals,
  subjectScore,
} from '@/lib/scoreUtils';
import { ALL_SUBJECTS } from '@/data/mockData';
import { cn } from '@/lib/utils';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 100;

interface StudentTableProps {
  students: Student[];
  scores?: Score[];
  examId?: string;
  className?: string;
  loading?: boolean;
}

export default function StudentTable({
  students,
  scores = [],
  examId,
  className = '本班',
  loading = false,
}: StudentTableProps) {
  const exams = useStore((s) => s.exams);
  const updateExamScores = useStore((s) => s.updateExamScores);
  const session = useAuthStore((s) => s.session);
  const showToast = useToastStore((s) => s.showToast);
  const canEdit = session?.role === 'admin';
  const [sortKey, setSortKey] = useState('总分');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(0);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { rawScore: string; assignedScore: string }>
  >({});

  const activeExamId = examId || exams[exams.length - 1]?.id || '';
  const index = useMemo(() => buildScoreIndex(scores), [scores]);

  useEffect(() => {
    setPage(0);
  }, [activeExamId, students]);

  const rows = useMemo(() => {
    return students
      .map((student) => {
        const totalRow = studentScoreFromIndex(
          index,
          student.idCard,
          activeExamId,
          '总分',
        );
        const total = activeExamId
          ? totalForIndexed(index, student.idCard, activeExamId)
          : 0;
        const totals = studentSubjectTotals(index, student.idCard, activeExamId);
        const subjectTotals: Record<string, number | null> = {};
        for (const subject of ALL_SUBJECTS) {
          subjectTotals[subject] = totals.get(subject) ?? null;
        }
        const value =
          sortKey === '总分' ? total : subjectTotals[sortKey] ?? -Infinity;
        return {
          student,
          total,
          classRank: totalRow?.classRank ?? 0,
          schoolRank: totalRow?.schoolRank ?? 0,
          subjectTotals,
          value,
        };
      })
      .sort((a, b) =>
        sortOrder === 'desc' ? b.value - a.value : a.value - b.value,
      );
  }, [students, index, activeExamId, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const toggleSortOrder = () =>
    setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));

  const openEdit = (student: Student) => {
    const list = ['语文', '数学', '英语', ...student.selectedSubjects];
    const next: Record<string, { rawScore: string; assignedScore: string }> = {};
    for (const subject of list) {
      const row = subjectScore(scores, student.idCard, activeExamId, subject);
      next[subject] = {
        rawScore: row?.rawScore == null ? '' : String(row.rawScore),
        assignedScore:
          row?.assignedScore == null ? '' : String(row.assignedScore),
      };
    }
    setDrafts(next);
    setEditingStudent(student);
  };

  const handleSaveScores = () => {
    if (!editingStudent || !activeExamId) return;
    const updates = ['语文', '数学', '英语', ...editingStudent.selectedSubjects].map(
      (subject) => {
        const d = drafts[subject];
        const raw = d?.rawScore === '' ? null : Number(d?.rawScore);
        const assigned = d?.assignedScore === '' ? null : Number(d?.assignedScore);
        return {
          subject,
          rawScore: Number.isNaN(raw as number) ? null : raw,
          assignedScore: Number.isNaN(assigned as number) ? null : assigned,
        };
      },
    );
    updateExamScores(editingStudent.idCard, activeExamId, updates);
    showToast('成绩已保存并重新计算班内排名', 'success');
    setEditingStudent(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900">学生成绩排行</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {className} · 共 {students.length} 名学生
            {activeExamId ? ` · ${exams.find((e) => e.id === activeExamId)?.name || ''}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:border-[#2dd4bf]/40"
            aria-label="选择排序方式"
          >
            <option value="总分">按总分赋分</option>
            {ALL_SUBJECTS.map((s) => (
              <option key={s} value={s}>
                按{s}
              </option>
            ))}
          </select>
          <button
            onClick={toggleSortOrder}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="切换排序方向"
            title={sortOrder === 'desc' ? '当前降序，点击切换为升序' : '当前升序，点击切换为降序'}
          >
            {sortOrder === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
            {sortOrder === 'desc' ? '降序' : '升序'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">
          正在加载成绩数据…
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[1600px]">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium w-14">排名</th>
              <th className="px-4 py-3 text-left font-medium">学生</th>
              <th className="px-4 py-3 text-left font-medium">身份证号</th>
              <th className="px-4 py-3 text-left font-medium">班级</th>
              <th className="px-4 py-3 text-right font-medium">总分赋分</th>
              <th className="px-4 py-3 text-right font-medium">班名次</th>
              <th className="px-4 py-3 text-right font-medium">校名次</th>
              {ALL_SUBJECTS.map((subject) => (
                <th key={subject} className="px-3 py-3 text-right font-medium">
                  {subject}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium">选科</th>
              {canEdit && (
                <th className="px-4 py-3 text-center font-medium w-16">编辑</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr
                key={row.student.idCard}
                onDoubleClick={canEdit ? () => openEdit(row.student) : undefined}
                className={cn(
                  'border-t border-gray-50 hover:bg-gray-50/50 transition-colors',
                  idx % 2 === 1 ? 'bg-gray-50/30' : '',
                )}
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-gray-50 text-gray-500">
                    {row.classRank || idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/student/${row.student.idCard}`}
                    className="flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                      {row.student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {row.student.name}
                      </p>
                      <p className="text-xs text-gray-400">{row.student.classNo}班</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.student.idCard}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.student.classNo}班</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#1e3a5f]">
                  {row.total.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {row.classRank || '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {row.schoolRank || '-'}
                </td>
                {ALL_SUBJECTS.map((subject) => {
                  const v = row.subjectTotals[subject];
                  const isAssigned = row.student.selectedSubjects.includes(subject);
                  return (
                    <td key={subject} className="px-3 py-3 text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {v != null ? v.toFixed(isAssigned ? 2 : 1) : '-'}
                        {isAssigned && v != null ? '分' : ''}
                      </p>
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {row.student.selectedSubjects.map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openEdit(row.student)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#2dd4bf] transition-colors"
                      aria-label="编辑成绩"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={currentPage}
          total={rows.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      <div className="lg:hidden divide-y divide-gray-50">
        {pageRows.map((row, idx) => (
          <div key={row.student.idCard} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 shrink-0">
                {row.classRank || idx + 1}
              </span>
              <Link to={`/student/${row.student.idCard}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {row.student.name}
                </p>
                <p className="text-xs text-gray-400">
                  {row.student.classNo}班 · 总分 {row.total.toFixed(2)}
                </p>
              </Link>
              {canEdit && (
                <button
                  onClick={() => openEdit(row.student)}
                  className="p-2 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf]"
                  aria-label="编辑成绩"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        <Pagination
          page={page}
          total={rows.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
        </div>
        </>
      )}

      {editingStudent && (
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
                  {editingStudent.name} · 编辑成绩
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {exams.find((e) => e.id === activeExamId)?.name || ''}
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
              {['语文', '数学', '英语', ...editingStudent.selectedSubjects].map(
                (subject) => {
                  const selected = editingStudent.selectedSubjects.includes(subject);
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
                      {selected && (
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
                },
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveScores}
                className="px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
