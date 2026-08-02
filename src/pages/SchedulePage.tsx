import { useState } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import { useStore, type ScheduleEvent } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';

const typeColors = {
  exam: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', label: '考试' },
  meeting: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: '会议' },
  activity: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: '活动' },
  deadline: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: '截止' },
};

export default function SchedulePage() {
  const { sidebarOpen, openSidebar, closeSidebar, scheduleEvents, addScheduleEvent, removeScheduleEvent } = useStore();
  const showToast = useToastStore((s) => s.showToast);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth()));
  const [showAddModal, setShowAddModal] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1));

  const getEventsOnDay = (day: number): ScheduleEvent[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return scheduleEvents.filter((e) => e.date === dateStr);
  };

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const todayStr = today.toISOString().split('T')[0];

  const upcomingEvents = [...scheduleEvents]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const handleAddEvent = (e: Omit<ScheduleEvent, 'id'>) => {
    addScheduleEvent(e);
    setShowAddModal(false);
    showToast(`已添加日程：${e.title}`, 'success');
  };

  const handleDeleteEvent = (id: string) => {
    removeScheduleEvent(id);
    showToast('日程已删除', 'info');
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <ToastContainer />

      <main className="flex-1 ml-0">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={openSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">日程安排</h2>
                <p className="text-xs text-gray-500 mt-0.5">查看与管理班级日程</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-3 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加日程
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2dd4bf]" />
                  {year} 年 {month + 1} 月
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth()))}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-[#2dd4bf] transition-colors"
                  >
                    今天
                  </button>
                  <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                  <div key={d} className="text-xs font-medium text-gray-400 text-center py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weeks.map((week, wi) => (
                  <div key={wi} className="contents">
                    {week.map((day, di) => {
                      if (day === null) {
                        return <div key={`${wi}-${di}`} className="h-20 sm:h-24" />;
                      }
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isToday = dateStr === todayStr;
                      const events = getEventsOnDay(day);
                      return (
                        <div
                          key={`${wi}-${di}`}
                          onClick={() => {
                            if (events.length > 0) {
                              handleDeleteEvent(events[0].id);
                            }
                          }}
                          className={`h-20 sm:h-24 p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isToday
                              ? 'border-[#2dd4bf] bg-[#2dd4bf]/5'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-[#2dd4bf]' : 'text-gray-700'}`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {events.slice(0, 2).map((e) => (
                              <div
                                key={e.id}
                                className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate ${typeColors[e.type].bg} ${typeColors[e.type].text}`}
                              >
                                {e.title}
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-[10px] text-gray-400">+{events.length - 2} 更多</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">即将到来</h3>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => {
                    const colors = typeColors[event.type];
                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${colors.border} ${colors.bg} group relative`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/50 transition-opacity"
                        >
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.text} bg-white`}>
                                {colors.label}
                              </span>
                              <h4 className="text-sm font-medium text-gray-900 truncate">{event.title}</h4>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                <span>{event.date} · {event.time}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                <span>{event.location}</span>
                              </div>
                            </div>
                          </div>
                          <Users className={`w-4 h-4 ${colors.text} shrink-0`} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-gray-400 text-sm">暂无即将到来的日程</div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-[#2dd4bf] hover:underline py-2"
                >
                  <Plus className="w-3 h-3" />
                  新建日程
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEvent}
        />
      )}
    </div>
  );
}

function AddEventModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (e: Omit<ScheduleEvent, 'id'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:00');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<ScheduleEvent['type']>('exam');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), date, time, location: location.trim() || '未指定', type });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">新建日程</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">日程标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：期中考试"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">时间</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">地点</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="如：教学楼"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">类型</label>
            <div className="flex gap-2">
              {(Object.keys(typeColors) as Array<keyof typeof typeColors>).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    type === t
                      ? `${typeColors[t].bg} ${typeColors[t].text} ${typeColors[t].border}`
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {typeColors[t].label}
                </button>
              ))}
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
