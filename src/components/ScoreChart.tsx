import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { totalFor } from '@/lib/scoreUtils';

interface ScoreChartProps {
  studentId?: string;
  classNo?: number;
}

export default function ScoreChart({ studentId, classNo }: ScoreChartProps) {
  const students = useStore((s) => s.students);
  const scores = useStore((s) => s.scores);
  const exams = useStore((s) => s.exams);
  const gradeSummary = useStore((s) => s.gradeSummary);

  const sortedExams = useMemo(
    () =>
      [...exams].sort(
        (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
      ),
    [exams],
  );

  const isPersonal = Boolean(studentId);

  const data = useMemo(() => {
    if (isPersonal && studentId) {
      return sortedExams.map((exam) => ({
        exam: exam.name,
        总分赋分: totalFor(scores, studentId, exam.id),
      }));
    }
    if (classNo != null && classNo > 0) {
      if (gradeSummary.length > 0) {
        const rows = gradeSummary.filter(
          (r) => r.classNo === classNo && r.totalAvg != null,
        );
        if (rows.length > 0) {
          const byExam = new Map(rows.map((r) => [r.examId, r.totalAvg]));
          return sortedExams.map((exam) => ({
            exam: exam.name,
            总分赋分: byExam.get(exam.id) ?? 0,
          }));
        }
      }
      const classIds = new Set(
        students.filter((s) => s.classNo === classNo).map((s) => s.idCard),
      );
      return sortedExams.map((exam) => {
        const totals = [...classIds].map((id) =>
          totalFor(scores, id, exam.id),
        );
        const avg =
          totals.length > 0
            ? totals.reduce((sum, t) => sum + t, 0) / totals.length
            : 0;
        return { exam: exam.name, 总分赋分: Math.round(avg * 100) / 100 };
      });
    }
    if (classNo === 0 && gradeSummary.length > 0) {
      const byExam = new Map<string, { sum: number; cnt: number }>();
      for (const r of gradeSummary) {
        if (r.totalAvg == null) continue;
        const cur = byExam.get(r.examId) ?? { sum: 0, cnt: 0 };
        byExam.set(r.examId, {
          sum: cur.sum + r.totalAvg * r.studentCount,
          cnt: cur.cnt + r.studentCount,
        });
      }
      return sortedExams.map((exam) => {
        const agg = byExam.get(exam.id);
        const avg = agg && agg.cnt > 0 ? agg.sum / agg.cnt : 0;
        return { exam: exam.name, 总分赋分: Math.round(avg * 100) / 100 };
      });
    }
    return [];
  }, [isPersonal, studentId, classNo, sortedExams, scores, students, gradeSummary]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        {isPersonal ? '个人成绩趋势' : '班级平均分趋势'}
      </h3>
      <p className="text-xs text-gray-400 -mt-2 mb-4">
        {isPersonal ? '各次考试总分赋分走势' : '各次考试班级总分赋分平均分走势'}
      </p>
      {data.length > 1 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="exam"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="总分赋分"
                stroke="#2dd4bf"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          暂无趋势数据，至少需要两场考试
        </div>
      )}
    </div>
  );
}