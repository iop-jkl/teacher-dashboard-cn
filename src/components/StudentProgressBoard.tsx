import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Award, Target, ChevronRight } from 'lucide-react';
import { getStudentExamRank, getExamName, EXAM_NAMES } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface Props {
  examIndex: number;
}

export default function StudentProgressBoard({ examIndex }: Props) {
  const students = getStudentExamRank(examIndex);
  const examName = getExamName(examIndex);
  const hasPrev = examIndex > 0;

  const bestProgress = [...students].sort((a, b) => b.trend - a.trend).slice(0, 3);
  const worstDecline = [...students].sort((a, b) => a.trend - b.trend).slice(0, 3);

  const stats = {
    totalImproved: students.filter((s) => s.trend > 0).length,
    totalDeclined: students.filter((s) => s.trend < 0).length,
    stable: students.filter((s) => s.trend === 0).length,
    avgChange: (students.reduce((sum, s) => sum + s.trend, 0) / students.length).toFixed(1),
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {examName}班级进步榜
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {hasPrev ? '对比上一场考试的总分变化' : '本次为首次考试，暂无对比数据'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">
            进步 {stats.totalImproved} 人
          </span>
          <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full">
            退步 {stats.totalDeclined} 人
          </span>
          <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full">
            稳定 {stats.stable} 人
          </span>
          <span
            className={cn(
              'px-2 py-1 rounded-full',
              Number(stats.avgChange) >= 0
                ? 'bg-teal-50 text-teal-600'
                : 'bg-orange-50 text-orange-600'
            )}
          >
            平均变化 {Number(stats.avgChange) >= 0 ? '+' : ''}
            {stats.avgChange}
          </span>
        </div>
      </div>

      {!hasPrev ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          首次考试暂无对比数据，请切换到后续考试查看进步榜
          <div className="flex justify-center gap-2 mt-4">
            {EXAM_NAMES.map((name, idx) => (
              <span key={name} className="text-xs text-gray-300">
                {name}
                {idx < EXAM_NAMES.length - 1 && ' → '}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">进步之星</span>
            </div>
            <div className="space-y-2">
              {bestProgress.map((s, idx) => (
                <ProgressRow key={s.id} student={s} rank={idx + 1} type="improve" />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-700">重点关注</span>
            </div>
            <div className="space-y-2">
              {worstDecline.map((s, idx) => (
                <ProgressRow key={s.id} student={s} rank={idx + 1} type="decline" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  student,
  rank,
  type,
}: {
  student: { id: string; name: string; total: number; rank: number; trend: number };
  rank: number;
  type: 'improve' | 'decline';
}) {
  const isImprove = type === 'improve';
  return (
    <Link
      to={`/student/${student.id}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm',
        isImprove ? 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50' : 'border-red-100 bg-red-50/30 hover:bg-red-50'
      )}
    >
      <span
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          rank === 1
            ? 'bg-amber-100 text-amber-700'
            : rank === 2
            ? 'bg-gray-200 text-gray-600'
            : 'bg-orange-100 text-orange-700'
        )}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium shrink-0">
            {student.name.charAt(0)}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          现排名第 {student.rank} 名 · 总分 {student.total}
        </p>
      </div>
      <div
        className={cn(
          'flex items-center gap-0.5 text-sm font-semibold',
          isImprove ? 'text-emerald-600' : 'text-red-500'
        )}
      >
        {isImprove ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        <span>
          {student.trend > 0 ? '+' : ''}
          {student.trend}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  );
}
