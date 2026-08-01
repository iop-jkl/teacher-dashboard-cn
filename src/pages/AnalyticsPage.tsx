import { useState, useMemo } from 'react';
import { TrendingUp, Award, Menu } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import ExcelImportButton from '@/components/ExcelImportButton';
import StudentTable from '@/components/StudentTable';
import { useStore } from '@/store/useStore';
import { getClassAverageByExam, EXAM_NAMES, SUBJECTS } from '@/data/mockData';
import type { ExamTrendPoint } from '@/types';

type ViewType = 'trend' | 'ranking';

function sumPoint(point: ExamTrendPoint | undefined): number {
  if (!point) return 0;
  return SUBJECTS.reduce((sum, subject) => sum + (Number(point[subject]) || 0), 0);
}

function ExamSelector({
  exams,
  value,
  onChange,
}: {
  exams: string[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
      aria-label="选择考试"
    >
      {exams.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

export default function AnalyticsPage() {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    currentExamIndex,
    setCurrentExamIndex,
    studentScoreTrend,
    examTrendData,
  } = useStore();
  const [activeView, setActiveView] = useState<ViewType>('trend');

  const examList = useMemo(() => {
    const names = [...new Set(examTrendData.map((p) => p.examName).filter(Boolean))];
    if (names.length > 0) return names;
    const fromScores = [...new Set(scores.map((s) => s.examId))].sort((a, b) =>
      a.localeCompare(b)
    );
    return fromScores.length > 0 ? fromScores : [...EXAM_NAMES];
  }, [examTrendData, scores]);

  const examIndex = Math.min(Math.max(currentExamIndex, 0), examList.length - 1);
  const examName = examList[examIndex] || '暂无考试';

  const classAvgData = useMemo(() => {
    const examScores = scores.filter((s) => s.examId === examName && s.score > 0);
    if (examScores.length > 0) {
      const result: { subject: string; classAverage: number; gradeAverage: number }[] = [];
      for (const subject of SUBJECTS) {
        const list = examScores.filter((s) => s.subject === subject);
        if (list.length === 0) continue;
        const avg = list.reduce((sum, s) => sum + s.score, 0) / list.length;
        result.push({
          subject,
          classAverage: Math.round(avg * 10) / 10,
          gradeAverage: Math.round(avg * 10) / 10,
        });
      }
      return result;
    }
    return getClassAverageByExam(examIndex);
  }, [scores, examName, examIndex]);

  const historyData = useMemo(() => {
    if (examTrendData.length > 0) {
      return examTrendData.map((p) => ({
        name: p.examName,
        avg:
          SUBJECTS.reduce((sum, subject) => sum + (Number(p[subject]) || 0), 0) /
          SUBJECTS.length,
      }));
    }
    return EXAM_NAMES.map((name, idx) => {
      const data = getClassAverageByExam(idx);
      const avg = data.reduce((sum, d) => sum + d.classAverage, 0) / (data.length || 1);
      return { name, avg };
    });
  }, [examTrendData]);

  const progressRankings = useMemo(() => {
    return students
      .map((student) => {
        const points = studentScoreTrend[student.id] || [];
        let total = student.totalScore;
        let prevTotal = student.totalScore;
        if (points.length > 0) {
          const idx = Math.min(examIndex, points.length - 1);
          total = sumPoint(points[idx]);
          prevTotal = idx > 0 ? sumPoint(points[idx - 1]) : total;
        }
        return { id: student.id, name: student.name, total, diff: total - prevTotal };
      })
      .filter((s) => s.total > 0 || s.diff !== 0);
  }, [students, studentScoreTrend, examIndex]);

  const topImprovements = useMemo(
    () =>
      [...progressRankings]
        .sort((a, b) => b.diff - a.diff)
        .filter((s) => s.diff > 0)
        .slice(0, 5),
    [progressRankings]
  );

  const topDeclines = useMemo(
    () =>
      [...progressRankings]
        .sort((a, b) => a.diff - b.diff)
        .filter((s) => s.diff < 0)
        .slice(0, 5),
    [progressRankings]
  );

  const views: { key: ViewType; label: string; icon: typeof TrendingUp }[] = [
    { key: 'trend', label: '趋势', icon: TrendingUp },
    { key: 'ranking', label: '学生排名', icon: Award },
  ];

  const colors = ['#2dd4bf', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#22c55e'];

  const handleExamChange = (name: string) => {
    const idx = examList.indexOf(name);
    if (idx >= 0) setCurrentExamIndex(idx);
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
            <div className="flex items-center gap-4 flex-wrap">
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
                  {historyData.map((h, idx) => {
                    const isCurrent = historyData.findIndex((x) => x.name === examName) === idx;
                    const heightPercent = Math.max((h.avg / 580) * 100, 2);
                    return (
                      <div key={`${h.name}-${idx}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs text-gray-500 font-medium">{h.avg.toFixed(0)}</div>
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isCurrent
                              ? 'bg-gradient-to-t from-[#2dd4bf] to-[#5eead4]'
                              : 'bg-gradient-to-t from-gray-200 to-gray-100'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="text-xs text-gray-500">{h.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">学科平均分</h3>
                    <p className="text-xs text-gray-400 mt-0.5">选择考试查看各科平均分</p>
                  </div>
                  <ExamSelector exams={examList} value={examName} onChange={handleExamChange} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {classAvgData.map((d, idx) => (
                    <div key={d.subject} className="bg-gray-50 rounded-xl p-4">
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
                  {classAvgData.length === 0 && (
                    <div className="col-span-full py-10 text-center text-sm text-gray-400">
                      暂无成绩数据
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeView === 'ranking' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">学生排名</h3>
                    <p className="text-xs text-gray-400 mt-0.5">先选择考试，再选择排序方式</p>
                  </div>
                  <ExamSelector exams={examList} value={examName} onChange={handleExamChange} />
                </div>
              </div>

              <StudentTable students={students} scores={scores} examId={examName} />

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
                        <span className="text-sm font-semibold text-emerald-600">+{s.diff}</span>
                      </div>
                    ))}
                    {topImprovements.length === 0 && (
                      <div className="py-10 text-center text-sm text-gray-400">暂无进步数据</div>
                    )}
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
                        <span className="text-sm font-semibold text-red-600">{s.diff}</span>
                      </div>
                    ))}
                    {topDeclines.length === 0 && (
                      <div className="py-10 text-center text-sm text-gray-400">暂无退步数据</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
