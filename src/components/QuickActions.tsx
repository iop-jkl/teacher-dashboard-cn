import { useNavigate } from 'react-router-dom';
import { FilePlus, Users, BarChart3, BellPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuth';
import { isGuestRole } from '@/lib/privacy';
import type { PageKey } from '@/store/useStore';

const actions = [
  {
    icon: FilePlus,
    label: '录入成绩',
    color: 'bg-blue-50 text-blue-600',
    addScoreImport: true,
  },
  {
    icon: Users,
    label: '学生管理',
    color: 'bg-emerald-50 text-emerald-600',
    page: 'students' as PageKey,
  },
  {
    icon: BarChart3,
    label: '成绩分析',
    color: 'bg-violet-50 text-violet-600',
    page: 'analytics' as PageKey,
  },
  {
    icon: BellPlus,
    label: '添加提醒',
    color: 'bg-amber-50 text-amber-600',
    addReminder: true,
  },
];

interface QuickActionsProps {
  onToast?: (message: string) => void;
  onAddReminder?: () => void;
  onAddScoreImport?: () => void;
}

export default function QuickActions({
  onAddReminder,
  onAddScoreImport,
}: QuickActionsProps) {
  const navigate = useNavigate();
  const isGuest = isGuestRole(useAuthStore((s) => s.session)?.role);
  const visibleActions = isGuest
    ? actions.filter((a) => !('addScoreImport' in a) && !('addReminder' in a))
    : actions;

  const handleClick = (action: (typeof actions)[number]) => {
    if ('addScoreImport' in action) {
      onAddScoreImport?.();
      return;
    }
    if ('addReminder' in action) {
      onAddReminder?.();
      return;
    }
    if ('page' in action) {
      navigate(`/${action.page}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">快捷操作</h3>
        <span className="text-xs text-gray-400">常用功能一键直达</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleClick(action)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
              'hover:bg-gray-50 hover:shadow-sm',
              'active:scale-95',
            )}
          >
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center',
                action.color,
              )}
            >
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs text-gray-600 font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
