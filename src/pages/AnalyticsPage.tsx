import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Users, PieChart as PieChartIcon, Menu } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import ExcelImportButton from '@/components/ExcelImportButton';
import { useStore } from '@/store/useStore';
import { getClassAverageByExam, getTopImprovements, getTopDeclines, EXAM_NAMES, getExamName } from '@/data/mockData';

type ViewType = 'trend' | 'distribution' | 'ranking';

export default function AnalyticsPage() {
  const { sidebarOpen, openSidebar, closeSidebar, students, currentExamIndex, studentScoreTrend } = useStore();
  const [activeView, setActiveView] = useState<ViewType>('trend');

  const examName = getExamName(currentExamIndex);
  const classAvgData = useMemo(() => getClassAverageByExam(currentExamIndex), [currentExamIndex]);
  const topImprovements = useMemo(() => getTopImprovements(currentExamIndex, 5), [currentExamIndex, studentScoreTrend]);
  const topDeclines = useMemo(() => getTopDeclines(currentExamIndex, 5), [currentExamIndex, studentScoreTrend]);

  const views: { key: ViewType; label: string; icon: typeof TrendingUp }[] = [
    { key: 'trend', label: '趋势', icon: TrendingUp },
    { key: 'distribution', label: '学科分布', icon: BarChart3 },
    { key: 'ranking', label: '进步排行', icon: Award },
  ];

  const colors = ['#2dd4bf', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e'];

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
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">成绩分析</h2>
                <p className="text-xs text-gray-500 mt-0.5">{examName} · 深度分析</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExcelImportButton variant="secondary" label="导入Excel" />
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <h3 className="text-base font-semibold text-gray-900">分析视图</h3>
              <div className="flex gap-1">
                {views.map((view) => (
                  <button
                    key={view.key}
                    onClick={() => setActiveView(view.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all ${
                      activeView === view.key
                        ? 'bg-[#2dd4bf]/10 text-[#2dd4bf] font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <view.icon className="w-4 h-4" />
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeView === 'trend' && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">班级均分历史</h3>
                <div className="h-64 flex items-end justify-between gap-2 px-2">
                  {EXAM_NAMES.map((examName, idx) => {
                    const data = getClassAverageByExam(idx);
                    const totalClassAvg = data.reduce((sum, d) => sum + d.classAverage, 0) / (data.length || 1);
                    const maxAvg = 580;
                    const heightPercent = (totalClassAvg / maxAvg) * 100;
                    return (
                      <div key={examName} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs text-gray-500 font-medium">
                          {totalClassAvg.toFixed(0)}
                        </div>
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            idx === currentExamIndex
                              ? 'bg-gradient-to-t from-[#2dd4bf] to-[#5eead4]'
                              : 'bg-gradient-to-t from-gray-200 to-gray-100'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="text-xs text-gray-500">{examName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {classAvgData.map((d, idx) => (
                  <div
                    key={d.subject}
                    className="bg-white rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{d.subject}</span>
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {d.classAverage.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">/ 年级 {d.gradeAverage.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeView === 'distribution' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#2dd4bf]" />
                  学科成绩分布
                </h3>
                <div className="space-y-4">
                  {classAvgData.map((d, idx) => (
                    <div key={d.subject}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{d.subject}</span>
                        <span className="font-medium text-gray-900">{d.classAverage.toFixed(1)} 分</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(d.classAverage / 100) * 100}%`,
                            backgroundColor: colors[idx % colors.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-[#2dd4bf]" />
                  学科占比
                </h3>
                <div className="relative w-48 h-48 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      const total = classAvgData.reduce((sum, d) => sum + d.classAverage, 0);
                      let cumulative = 0;
                      return classAvgData.map((d, idx) => {
                        const pct = (d.classAverage / total) * 100;
                        const dasharray = `${pct} ${100 - pct}`;
                        const offset = -cumulative;
                        cumulative += pct;
                        return (
                          <circle
                            key={d.subject}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="20"
                            strokeDasharray={dasharray}
                            strokeDashoffset={offset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                      <p className="text-xs text-gray-500">名学生</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {classAvgData.map((d, idx) => (
                    <div key={d.subject} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      />
                      <span className="text-xs text-gray-600">{d.subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'ranking' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  进步排行 Top 5
                </h3>
                <div className="space-y-3">
                  {topImprovements.map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">
                          {examName} · 总分 {s.total}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        +{s.diff}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />
                  退步关注 Top 5
                </h3>
                <div className="space-y-3">
                  {topDeclines.map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-red-50/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">
                          {examName} · 总分 {s.total}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {s.diff}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
