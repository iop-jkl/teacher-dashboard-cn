import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { SUBJECTS, studentScoreTrend } from '@/data/mockData';

interface StudentRadarProps {
  studentId: string;
  examIndex?: number;
}

export default function StudentRadar({ studentId, examIndex = 2 }: StudentRadarProps) {
  const trendData = studentScoreTrend[studentId];
  if (!trendData) return null;

  const dataPoint = trendData[examIndex] || trendData[trendData.length - 1];
  const data = SUBJECTS.map((subject) => ({
    subject,
    score: dataPoint[subject] as number,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">各科成绩雷达</h3>
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
              domain={[60, 100]}
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
    </div>
  );
}
