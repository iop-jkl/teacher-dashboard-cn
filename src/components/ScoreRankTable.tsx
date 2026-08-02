import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALL_SUBJECTS } from '@/data/mockData';
import {
  buildScoreIndex,
  totalForIndexed,
  scoreValue,
} from '@/lib/scoreUtils';
import type { Score, Student } from '@/types';

interface Props {
  students: Student[];
  scores: Score[];
  examId: string;
  className?: string;
}

export default function ScoreRankTable({
  students,
  scores,
  examId,
  className = '本班',
}: Props) {
  const [sortKey, setSortKey] = useState('总分');
  const index = useMemo(() => buildScoreIndex(scores), [scores]);

  const rows = useMemo(() => {
    if (!examId) return [];
    return students
      .map((student) => {
        const rowsForStudent = index.get(student.idCard) ?? [];
        const totalRow = rowsForStudent.find(
          (s) => s.examId === examId && s.subject === '总分',
        );
        const total = totalForIndexed(index, student.idCard, examId);
        const subjects: Record<
          string,
          { value: number | null; classRank: number; schoolRank: number }
        > = {};
        for (const subject of ALL_SUBJECTS) {
          const row = rowsForStudent.find(
            (s) => s.examId === examId && s.subject === subject,
          );
          subjects[subject] = {
            value: row ? scoreValue(row) : null,
            classRank: row?.classRank ?? 0,
            schoolRank: row?.schoolRank ?? 0,
          };
        }
        const value =
          sortKey === '总分'
            ? total
            : (subjects[sortKey]?.value ?? -Infinity);
        return {
          student,
          total,
          classRank: totalRow?.classRank ?? 0,
          schoolRank: totalRow?.schoolRank ?? 0,
          subjects,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [students, index, examId, sortKey]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900">全部成绩与排名</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {className} · 共 {students.length} 名学生
          </p>
        </div>
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="px-3 py-3 text-left font-medium w-14">排名</th>
              <th className="px-3 py-3 text-left font-medium">学生</th>
              <th className="px-3 py-3 text-left font-medium">班级</th>
              <th className="px-3 py-3 text-right font-medium">总分赋分</th>
              <th className="px-3 py-3 text-right font-medium">班名次</th>
              <th className="px-3 py-3 text-right font-medium">校名次</th>
              {ALL_SUBJECTS.map((subject) => (
                <th key={subject} className="px-3 py-3 text-right font-medium">
                  {subject}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.student.idCard}
                className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold bg-gray-50 text-gray-500">
                    {row.classRank || idx + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Link to={`/student/${row.student.idCard}`} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                      {row.student.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {row.student.name}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-600">
                  {row.student.classNo}班
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-[#1e3a5f]">
                  {row.total.toFixed(2)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm text-gray-600">
                  {row.classRank || '-'}
                </td>
                <td className="px-3 py-2.5 text-right text-sm text-gray-600">
                  {row.schoolRank || '-'}
                </td>
                {ALL_SUBJECTS.map((subject) => {
                  const cell = row.subjects[subject];
                  const isAssigned = row.student.selectedSubjects.includes(subject);
                  return (
                    <td key={subject} className="px-3 py-2.5 text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {cell.value != null ? cell.value.toFixed(1) : '-'}
                        {isAssigned && cell.value != null ? '分' : ''}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        班{cell.classRank || '-'} 校{cell.schoolRank || '-'}
                      </p>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">暂无成绩数据</div>
      )}
    </div>
  );
}
