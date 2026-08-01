import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Announcement } from '@/types';
import { cn } from '@/lib/utils';

const levelConfig = {
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    label: '通知',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    label: '提醒',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    label: '喜讯',
  },
};

interface Props {
  announcements: Announcement[];
}

export default function AnnouncementCard({ announcements }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">班级通知</h3>
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">
          {announcements.length} 条
        </span>
      </div>

      <div className="space-y-3">
        {announcements.map((announcement) => {
          const config = levelConfig[announcement.level];
          const Icon = config.icon;
          return (
            <div
              key={announcement.id}
              className={cn(
                'p-3 rounded-lg border flex gap-3 transition-colors hover:shadow-sm',
                config.bg,
                config.border
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  'bg-white/80',
                  config.text
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs font-medium px-1.5 py-0.5 rounded',
                      config.bg,
                      config.text
                    )}
                  >
                    {config.label}
                  </span>
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {announcement.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {announcement.content}
                </p>
                <p className="text-xs text-gray-400 mt-1">{announcement.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
