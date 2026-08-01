import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFullScore } from '@/data/mockData';

interface SubjectCardProps {
  subject: string;
  classAverage: number;
  gradeAverage: number;
  previousAverage?: number;
}

export default function SubjectCard({
  subject,
  classAverage,
  gradeAverage,
  previousAverage,
}: SubjectCardProps) {
  const fullScore = getFullScore(subject);
  const diff = classAverage - gradeAverage;
  const trend = previousAverage ? classAverage - previousAverage : 0;
  const rate = Math.round((classAverage / fullScore) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">{subject}</span>
        {trend !== 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend).toFixed(1)}
          </div>
        )}
        {trend === 0 && previousAverage && (
          <Minus className="w-3 h-3 text-gray-400" />
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-[#1e3a5f]">
          {classAverage.toFixed(1)}
        </span>
        <span className="text-xs text-gray-400">/ {fullScore}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">年级均分</span>
        <span
          className={cn(
            'font-medium',
            diff >= 0 ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {diff >= 0 ? '+' : ''}
          {diff.toFixed(1)}
        </span>
      </div>

      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#2dd4bf] to-[#1e3a5f] rounded-full transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}
