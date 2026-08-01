import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Pencil, X } from 'lucide-react';
import type { Student, Score } from '@/types';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import { cn } from '@/lib/utils';

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];

interface StudentTableProps {
  students: Student[];
  scores?: Score[];
  examId?: string;
  className?: string;
}

export default function StudentTable({
  students,
  scores = [],
  examId,
  className = '高一(3)班',
}: StudentTableProps) {
  const updateExamScores = useStore((s) => s.updateExamScores);
  const showToast = useToastStore((s) => s.showToast);
  const [sortKey, setSortKey] = useState('总分');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, number>>({});

  const latestExamId = useMemo(() => {
    if (scores.length === 0) return '';
    return scores.reduce(
      (best, s) => (s.examId > best ? s.examId : best),
      scores[0].examId
    );
  }, [scores]);

  const activeExamId = examId || latestExamId;

  const rankedStudents = useMemo(() => {
    return students
      .map((student) => {
        const examScores = scores.filter(
          (s) => s.studentId === student.id && s.examId === activeExamId
        );
        const subjectScores: Record<string, number> = {};
        for (const s of examScores) {
          subjectScores[s.subject] = s.score;
        }
        const total = SUBJECTS.reduce((sum, subject) => sum + (subjectScores[subject] || 0), 0);
        const value = sortKey === '总分' ? total : subjectScores[sortKey] || 0;
        return { student, subjectScores, total, value };
      })
      .sort((a, b) => b.value - a.value)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [students, scores, activeExamId, sortKey]);

  const openEdit = (student: Student) => {
    const examScores = scores.filter(
      (s) => s.studentId === student.id && s.examId === activeExamId
    );
    const drafts: Record<string, number> = {};
    for (const s of examScores) {
      drafts[s.subject] = s.score;
    }
    setScoreDrafts(drafts);
    setEditingStudent(student);
  };

  const handleSaveScores = () => {
    if (!editingStudent || !activeExamId) return;
    const updates = SUBJECTS.map((subject) => ({
      subject,
      score: scoreDrafts[subject],
    })).filter((u) => typeof u.score === 'number' && !Number.isNaN(u.score));
    if (updates.length === 0) return;
    updateExamScores(editingStudent.id, activeExamId, updates);
    showToast('成绩已保存并重新排名', 'success');
    setEditingStudent(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900">学生成绩排行</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {className} · 共 {students.length} 名学生{activeExamId ? ` · ${activeExamId}` : ''}
          </p>
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:border-[#2dd4bf]/40"
          aria-label="选择排序方式"
        >
          <option value="总分">按总分</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              按{s}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium w-14">排名</th>
              <th className="px-4 py-3 text-left font-medium">学生</th>
              {SUBJECTS.map((subject) => (
                <th key={subject} className="px-3 py-3 text-right font-medium">
                  {subject}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">总分</th>
              <th className="px-4 py-3 text-center font-medium w-20">趋势</th>
            </tr>
          </thead>
          <tbody>
            {rankedStudents.map(({ student, subjectScores, total, rank }, idx) => (
              <tr
                key={student.id}
                onDoubleClick={() => openEdit(student)}
                className={cn(
                  'border-t border-gray-50 hover:bg-gray-50/50 transition-colors',
                  idx % 2 === 1 ? 'bg-gray-50/30' : ''
                )}
              >
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold',
                      rank === 1
                        ? 'bg-amber-100 text-amber-600'
                        : rank === 2
                        ? 'bg-gray-100 text-gray-600'
                        : rank === 3
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-50 text-gray-500'
                    )}
                  >
                    {rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.studentNo}</p>
                    </div>
                    <button
                      onClick={() => openEdit(student)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#2dd4bf] transition-colors"
                      aria-label="编辑成绩"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                {SUBJECTS.map((subject) => (
                  <td key={subject} className="px-3 py-3 text-right text-sm text-gray-700">
                    {subjectScores[subject] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-sm font-semibold text-[#1e3a5f]">
                  {total}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {student.trend === 'up' && (
                      <span className="flex items-center text-emerald-500 text-xs font-medium">
                        <TrendingUp className="w-3 h-3" />+{student.trendValue}
                      </span>
                    )}
                    {student.trend === 'down' && (
                      <span className="flex items-center text-red-500 text-xs font-medium">
                        <TrendingDown className="w-3 h-3" />
                        {student.trendValue}
                      </span>
                    )}
                    {student.trend === 'stable' && (
                      <span className="flex items-center text-gray-400 text-xs">
                        <Minus className="w-3 h-3" />0
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden divide-y divide-gray-50">
        {rankedStudents.map(({ student, subjectScores, total, rank }, idx) => (
          <div
            key={student.id}
            onDoubleClick={() => openEdit(student)}
            className={cn(
              'px-4 py-3 transition-colors',
              idx % 2 === 1 ? 'bg-gray-50/30' : ''
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0',
                  rank === 1
                    ? 'bg-amber-100 text-amber-600'
                    : rank === 2
                    ? 'bg-gray-100 text-gray-600'
                    : rank === 3
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-50 text-gray-500'
                )}
              >
                {rank}
              </span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                <p className="text-xs text-gray-400">{student.studentNo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#1e3a5f]">总分 {total}</p>
              </div>
              <button
                onClick={() => openEdit(student)}
                className="p-2 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf]"
                aria-label="编辑成绩"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
              {SUBJECTS.map((subject) => (
                <div key={subject} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[10px] text-gray-400">{subject}</p>
                  <p className="text-xs font-medium text-gray-700">
                    {subjectScores[subject] ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
                <p className="text-xs text-gray-500 mt-0.5">{activeExamId}</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {SUBJECTS.map((subject) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{subject}</span>
                  <input
                    type="number"
                    value={scoreDrafts[subject] ?? ''}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({
                        ...prev,
                        [subject]: Number(e.target.value),
                      }))
                    }
                    className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#2dd4bf]/50"
                  />
                </div>
              ))}
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
