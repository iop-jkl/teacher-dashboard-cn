import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankedStudent {
  id: string;
  name: string;
  total: number;
  diff: number;
}

interface Props {
  title: string;
  type: 'improve' | 'decline';
  students: RankedStudent[];
}

export default function TopStudentsRanking({ title, type, students }: Props) {
  const isImprove = type === 'improve';

  const rankColors = [
    'bg-yellow-100 text-yellow-700',
    'bg-gray-200 text-gray-600',
    'bg-orange-100 text-orange-700',
    'bg-blue-50 text-blue-600',
    'bg-blue-50 text-blue-600',
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        {isImprove ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-2">
        {students.map((student, idx) => (
          <div
            key={student.id}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-gray-50',
              idx < 3 ? 'bg-gradient-to-r from-transparent to-gray-50/50' : ''
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                rankColors[idx] || 'bg-gray-100 text-gray-600'
              )}
            >
              {idx + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {student.name}
              </p>
              <p className="text-xs text-gray-400">
                总分 {student.total}
              </p>
            </div>

            <div
              className={cn(
                'flex items-center gap-0.5 text-sm font-semibold',
                isImprove ? 'text-emerald-600' : 'text-red-500'
              )}
            >
              {isImprove ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {student.diff > 0 ? '+' : ''}
                {student.diff}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
