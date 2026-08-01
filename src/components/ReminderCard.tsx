import { ClipboardCheck, CalendarDays, Check, ClipboardList } from 'lucide-react';
import type { Reminder } from '@/types';
import { cn } from '@/lib/utils';

const typeConfig = {
  exam: {
    icon: ClipboardCheck,
    color: 'text-amber-500 bg-amber-500/10',
    label: '考试',
  },
  activity: {
    icon: CalendarDays,
    color: 'text-blue-500 bg-blue-500/10',
    label: '活动',
  },
  todo: {
    icon: ClipboardList,
    color: 'text-emerald-500 bg-emerald-500/10',
    label: '待办',
  },
};

interface ReminderCardProps {
  reminder: Reminder;
  onToggle: (id: string) => void;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff > 0 && diff <= 7) return `${diff} 天后`;
  if (diff < 0) return '已过期';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function ReminderCard({ reminder, onToggle }: ReminderCardProps) {
  const config = typeConfig[reminder.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-200 hover:shadow-md',
        reminder.completed
          ? 'bg-gray-50 border-gray-100 opacity-60'
          : 'bg-white border-gray-100 hover:border-[#2dd4bf]/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.color)}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={cn(
                'font-medium text-sm truncate',
                reminder.completed ? 'line-through text-gray-400' : 'text-gray-900'
              )}
            >
              {reminder.title}
            </h3>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full whitespace-nowrap',
                config.color
              )}
            >
              {config.label}
            </span>
          </div>
          <p
            className={cn(
              'text-xs mt-1 line-clamp-2',
              reminder.completed ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            {reminder.content}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatDate(reminder.dueDate)}
            </span>
            <button
              onClick={() => onToggle(reminder.id)}
              className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                reminder.completed
                  ? 'bg-[#2dd4bf] border-[#2dd4bf] text-white'
                  : 'border-gray-300 hover:border-[#2dd4bf]'
              )}
            >
              {reminder.completed && <Check className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
