import { useMemo } from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { subjectScore, scoreValue } from '@/lib/scoreUtils';

interface StudentRadarProps {
  studentId: string;
  examId: string;
}

export default function RadarChart({ studentId, examId }: StudentRadarProps) {
  const students = useStore((s) => s.students);
  const scores = useStore((s) => s.scores);

  const student = students.find((s) => s.idCard === studentId);

  const data = useMemo(() => {
    if (!student || !examId) return [];
    return ['语文', '数学', '英语', ...student.selectedSubjects].map(
      (subject) => ({
        subject,
        score: scoreValue(
          subjectScore(scores, student.idCard, examId, subject),
        ),
      }),
    );
  }, [student, examId, scores]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">各科成绩雷达</h3>
      {data.length > 0 && data.some((d) => d.score != null) ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 150]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Radar
                name="分数"
                dataKey="score"
                stroke="#2dd4bf"
                fill="#2dd4bf"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          暂无成绩数据
        </div>
      )}
    </div>
  );
}
