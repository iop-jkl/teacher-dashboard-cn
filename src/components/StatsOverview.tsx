import { Users, Trophy, TrendingUp, Award, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { getTotalClassAverageByExam } from '@/data/mockData';

export default function StatsOverview() {
  const students = useStore((s) => s.students);
  const currentExamIndex = useStore((s) => s.currentExamIndex);

  const totalAvg = getTotalClassAverageByExam(currentExamIndex);
  const prevAvg = currentExamIndex > 0 ? getTotalClassAverageByExam(currentExamIndex - 1) : totalAvg;
  const diff = (totalAvg - prevAvg).toFixed(1);

  const stats = [
    {
      label: '班级人数',
      value: String(students.length),
      unit: '人',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: null,
    },
    {
      label: '本次参考',
      value: String(Math.max(students.length - 1, 0)),
      unit: '人',
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: { value: '-1', label: '请假 1 人', direction: 'down' as const },
    },
    {
      label: '年级排名',
      value: '3',
      unit: '/ 12',
      icon: Trophy,
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: { value: '+1', label: '较上次', direction: 'up' as const },
    },
    {
      label: '优秀率',
      value: '32',
      unit: '%',
      icon: Award,
      color: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      trend: { value: '+3.2%', label: '较上次', direction: 'up' as const },
    },
    {
      label: '总分均分',
      value: String(totalAvg),
      unit: '分',
      icon: TrendingUp,
      color: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      trend: { value: `${Number(diff) >= 0 ? '+' : ''}${diff}`, label: '较上次', direction: (Number(diff) >= 0 ? 'up' : 'down') as 'up' | 'down' },
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                stat.bg
              )}
            >
              <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
            </div>
            {stat.trend && (
              <span
                className={cn(
                  'text-xs font-semibold',
                  stat.trend.direction === 'up' ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {stat.trend.value}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">
                {stat.value}
              </span>
              <span className="text-sm text-gray-400">{stat.unit}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stat.label}
            </p>
            {stat.trend && (
              <p className="text-xs text-gray-400 mt-0.5">
                {stat.trend.label}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
