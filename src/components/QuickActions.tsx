import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  Users,
  BarChart3,
  BellPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageKey } from '@/store/useStore';
import ExcelImportButton from './ExcelImportButton';

const actions = [
  {
    icon: FilePlus,
    label: '录入成绩',
    color: 'bg-blue-50 text-blue-600',
    action: 'import',
  },
  {
    icon: Users,
    label: '学生管理',
    color: 'bg-emerald-50 text-emerald-600',
    action: 'navigate',
    page: 'students' as PageKey,
  },
  {
    icon: BarChart3,
    label: '成绩分析',
    color: 'bg-violet-50 text-violet-600',
    action: 'navigate',
    page: 'analytics' as PageKey,
  },
  {
    icon: BellPlus,
    label: '添加提醒',
    color: 'bg-amber-50 text-amber-600',
    action: 'add-reminder',
  },
];

interface QuickActionsProps {
  onToast?: (message: string) => void;
  onAddReminder?: () => void;
}

export default function QuickActions({ onToast, onAddReminder }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleClick = (action: typeof actions[number]) => {
    if (action.action === 'add-reminder') {
      onAddReminder?.();
      return;
    }
    if (action.action === 'navigate' && action.page) {
      navigate(`/${action.page}`);
    } else if (action.action === 'import') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const importBtn = document.getElementById('excel-import-trigger');
          importBtn?.click();
        }
      };
      input.click();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">快捷操作</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">常用功能一键直达</span>
          <ExcelImportButton variant="secondary" label="Excel导入" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleClick(action)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-xl transition-all',
              'hover:bg-gray-50 hover:shadow-sm',
              'active:scale-95'
            )}
          >
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center',
                action.color
              )}
            >
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs text-gray-600 font-medium">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
