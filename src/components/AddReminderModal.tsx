import { useState, type FormEvent } from 'react';
import { BellPlus, CalendarDays, ClipboardList, X } from 'lucide-react';
import type { Reminder } from '@/types';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import { cn } from '@/lib/utils';

const typeOptions: { value: Reminder['type']; label: string; activeClass: string }[] = [
  { value: 'todo', label: '待办', activeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'exam', label: '考试', activeClass: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'activity', label: '活动', activeClass: 'bg-blue-50 text-blue-600 border-blue-200' },
];

export default function AddReminderModal({ onClose }: { onClose: () => void }) {
  const addReminder = useStore((s) => s.addReminder);
  const showToast = useToastStore((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Reminder['type']>('todo');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addReminder({
      title: title.trim(),
      content: content.trim(),
      type,
      dueDate,
      completed: false,
    });
    showToast('提醒已添加', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BellPlus className="w-5 h-5 text-[#2dd4bf]" />
            <h3 className="text-base font-semibold text-gray-900">新建提醒</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">提醒标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：收齐月考卷"
              autoFocus
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="提醒内容（可选）"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">日期</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">类型</label>
              <div className="flex gap-2 pt-0.5">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-all',
                      type === option.value
                        ? option.activeClass
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    {option.value === 'todo' ? (
                      <ClipboardList className="w-3.5 h-3.5" />
                    ) : (
                      <CalendarDays className="w-3.5 h-3.5" />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-[#2dd4bf] text-white text-sm hover:bg-[#14b8a6] transition-colors disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
