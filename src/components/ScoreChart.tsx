import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { SUBJECTS } from '@/data/mockData';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

const COLORS: Record<string, string> = {
  语文: '#1e3a5f',
  数学: '#2dd4bf',
  英语: '#3b82f6',
  物理: '#8b5cf6',
  化学: '#f59e0b',
  生物: '#10b981',
};

export default function ScoreChart({ studentId }: { studentId?: string }) {
  const studentScoreTrend = useStore((s) => s.studentScoreTrend);
  const classTrendData = useStore((s) => s.examTrendData);
  const [activeSubjects, setActiveSubjects] = useState<string[]>([...SUBJECTS]);

  const personalData = useMemo(() => {
    if (!studentId) return [];
    return (studentScoreTrend[studentId] || []).map((point) => ({
      examName: point.examName,
      date: point.date,
      ...SUBJECTS.reduce((acc, subject) => {
        acc[subject] = point[subject];
        return acc;
      }, {} as Record<string, string | number>),
    }));
  }, [studentId, studentScoreTrend]);

  const isPersonal = Boolean(studentId);
  const chartData = isPersonal ? personalData : classTrendData;
  const xKey = isPersonal ? 'examName' : 'date';

  const toggleSubject = (subject: string) => {
    setActiveSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {isPersonal ? '个人成绩趋势' : '班级成绩趋势'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {isPersonal ? '该学生各科成绩走势' : '近三次考试各科平均分走势'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUBJECTS.map((subject) => (
          <button
            key={subject}
            onClick={() => toggleSubject(subject)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-all',
              activeSubjects.includes(subject)
                ? 'border-transparent text-white'
                : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
            )}
            style={
              activeSubjects.includes(subject)
                ? { backgroundColor: COLORS[subject] }
                : undefined
            }
          >
            {subject}
          </button>
        ))}
      </div>

      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey={xKey}
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
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              {activeSubjects.map((subject) => (
                <Line
                  key={subject}
                  type="monotone"
                  dataKey={subject}
                  stroke={COLORS[subject]}
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          暂无个人成绩趋势数据
        </div>
      )}
    </div>
  );
}
