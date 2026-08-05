import { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Award, Menu } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import ScoreRankTable from '@/components/ScoreRankTable';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { ALL_SUBJECTS } from '@/data/mockData';
import {
  buildScoreIndex,
  buildExamValueMap,
  totalForIndexed,
} from '@/lib/scoreUtils';
import { isGuestRole, maskName } from '@/lib/privacy';

type ViewType = 'trend' | 'ranking';

export default function AnalyticsPage() {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    exams,
    examList,
    activeClass,
    setActiveClass,
    currentExamIndex,
    setCurrentExamIndex,
    gradeSummary,
    scoresLoading,
    loadedScoreClasses,
    loadAllScores,
    loadScoresForClass,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const isAdmin = session?.role === 'admin' || session?.role === 'guest';
  const isGuest = isGuestRole(session?.role);
  const allClassCount = useMemo(
    () => new Set(students.map((s) => s.classNo)).size,
    [students],
  );
  const [activeView, setActiveView] = useState<ViewType>('trend');

  const examIndex = Math.min(Math.max(currentExamIndex, 0), examList.length - 1);
  const examName = examList[examIndex] || '暂无考试';
  const activeExam = exams.find((e) => e.name === examName);

  const classNoList = useMemo(() => {
    const set = new Set<number>();
    for (const s of students) set.add(s.classNo);
    const list = [...set].sort((a, b) => a - b);
    return isAdmin ? [0, ...list] : list;
  }, [students, isAdmin]);

  const classStudents = useMemo(
    () =>
      activeClass === 0 ? students : students.filter((s) => s.classNo === activeClass),
    [students, activeClass],
  );

  const scoreIndex = useMemo(() => buildScoreIndex(scores), [scores]);
  const examValueMap = useMemo(
    () => (activeExam ? buildExamValueMap(scores, activeExam.id) : new Map()),
    [scores, activeExam],
  );

  const historyData = useMemo(() => {
    if (gradeSummary.length > 0) {
      const rows = gradeSummary.filter(
        (r) => activeClass === 0 || r.classNo === activeClass,
      );
      const byExam = new Map<string, { sum: number; cnt: number }>();
      for (const r of rows) {
        if (r.totalAvg == null) continue;
        const cur = byExam.get(r.examId) ?? { sum: 0, cnt: 0 };
        byExam.set(r.examId, {
          sum: cur.sum + r.totalAvg * r.studentCount,
          cnt: cur.cnt + r.studentCount,
        });
      }
      return [...exams]
        .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
        .map((exam) => {
          const agg = byExam.get(exam.id);
          const avg = agg && agg.cnt > 0 ? agg.sum / agg.cnt : 0;
          return { name: exam.name, 平均分: Math.round(avg * 100) / 100 };
        });
    }
    return exams
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
      .map((exam) => {
        const totals = classStudents
          .map((s) => totalForIndexed(scoreIndex, s.idCard, exam.id))
          .filter((t) => t > 0);
        const avg =
          totals.length > 0
            ? totals.reduce((sum, t) => sum + t, 0) / totals.length
            : 0;
        return { name: exam.name, 平均分: Math.round(avg * 100) / 100 };
      });
  }, [exams, classStudents, scoreIndex, gradeSummary, activeClass]);

  const classAvgData = useMemo(() => {
    if (!activeExam) return [];
    if (gradeSummary.length > 0) {
      const row = gradeSummary.find(
        (r) => r.examId === activeExam.id && r.classNo === activeClass,
      );
      if (row) {
        const result: { subject: string; classAverage: number; gradeAverage: number }[] = [];
        for (const subject of ALL_SUBJECTS) {
          const v = row.subjectAvg[subject];
          if (v == null) continue;
          result.push({
            subject,
            classAverage: Math.round(v * 10) / 10,
            gradeAverage: Math.round(v * 10) / 10,
          });
        }
        if (result.length > 0) return result;
      }
    }
    const result: { subject: string; classAverage: number; gradeAverage: number }[] = [];
    for (const subject of ALL_SUBJECTS) {
      const values = classStudents
        .map((s) => examValueMap.get(`${s.idCard}\u0000${subject}`))
        .filter((v): v is number => v != null && v > 0);
      if (values.length === 0) continue;
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const allValues = students
        .map((s) => examValueMap.get(`${s.idCard}\u0000${subject}`))
        .filter((v): v is number => v != null && v > 0);
      const allAvg =
        allValues.length > 0
          ? allValues.reduce((sum, v) => sum + v, 0) / allValues.length
          : avg;
      result.push({
        subject,
        classAverage: Math.round(avg * 10) / 10,
        gradeAverage: Math.round(allAvg * 10) / 10,
      });
    }
    return result;
  }, [classStudents, students, examValueMap, activeExam, gradeSummary, activeClass]);

  const progressRankings = useMemo(() => {
    if (examIndex < 1) return [];
    const prevExam = exams[examIndex - 1];
    const curExam = exams[examIndex];
    return classStudents.map((student) => {
      const total = totalForIndexed(scoreIndex, student.idCard, curExam.id);
      const prevTotal = totalForIndexed(scoreIndex, student.idCard, prevExam.id);
      return {
        id: student.idCard,
        name: student.name,
        total,
        diff: Math.round((total - prevTotal) * 100) / 100,
      };
    });
  }, [classStudents, scoreIndex, exams, examIndex]);

  const topImprovements = useMemo(
    () =>
      [...progressRankings]
        .sort((a, b) => b.diff - a.diff)
        .filter((s) => s.diff > 0)
        .slice(0, 5),
    [progressRankings],
  );
  const topDeclines = useMemo(
    () =>
      [...progressRankings]
        .sort((a, b) => a.diff - b.diff)
        .filter((s) => s.diff < 0)
        .slice(0, 5),
    [progressRankings],
  );

  const views: { key: ViewType; label: string; icon: typeof TrendingUp }[] = [
    { key: 'trend', label: '趋势', icon: TrendingUp },
    { key: 'ranking', label: '学生排名', icon: Award },
  ];

  const handleExamChange = (name: string) => {
    const idx = examList.indexOf(name);
    if (idx >= 0) setCurrentExamIndex(idx);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (activeClass === 0) loadAllScores();
    else loadScoresForClass(activeClass);
  }, [isAdmin, activeClass, loadAllScores, loadScoresForClass]);

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
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeClass === 0 ? '全部班级' : `${activeClass}班`} · {examName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <select
                  value={activeClass}
                  onChange={(e) => setActiveClass(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                  aria-label="切换班级"
                >
                  {classNoList.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls === 0 ? '全部班级' : `${cls}班`}
                    </option>
                  ))}
                </select>
              )}
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
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  班级平均分历史
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={historyData}
                      margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="平均分" radius={[6, 6, 0, 0]}>
                        {historyData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.name === examName ? '#2dd4bf' : '#cbd5e1'}
                            cursor="pointer"
                            onClick={() => handleExamChange(entry.name)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {historyData.length === 0 && (
                  <div className="py-10 text-center text-sm text-gray-400">暂无考试数据</div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">学科平均分</h3>
                    <p className="text-xs text-gray-400 mt-0.5">选择考试查看各科平均分</p>
                  </div>
                  <select
                    value={examName}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                    aria-label="选择考试"
                  >
                    {examList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {classAvgData.map((d, idx) => (
                    <div key={d.subject} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{d.subject}</span>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: [
                              '#2dd4bf',
                              '#6366f1',
                              '#f59e0b',
                              '#ec4899',
                              '#8b5cf6',
                              '#22c55e',
                              '#3b82f6',
                              '#ef4444',
                              '#14b8a6',
                            ][idx % 9],
                          }}
                        />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {d.classAverage.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">班级平均</span>
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      先选择考试，再选择总分或各科排序
                    </p>
                  </div>
                  <select
                    value={examName}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                    aria-label="选择考试"
                  >
                    {examList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeClass === 0 && scoresLoading.includes(0) && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 mb-4 text-sm">
                  <span className="text-gray-600">正在加载全部班级成绩…</span>
                  <span className="text-gray-400 tabular-nums">
                    {loadedScoreClasses.length}/{allClassCount} 个班级
                  </span>
                </div>
              )}
              <ScoreRankTable
                students={classStudents}
                scores={scores}
                examId={activeExam?.id}
                className={`${activeClass}班`}
                loading={
                  activeClass !== 0 && scoresLoading.includes(activeClass)
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    进步排名 Top 5
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
                          <p className="text-sm font-medium text-gray-900">
                            {isGuest ? maskName(s.name, s.id) : s.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {examName} · 总分 {s.total.toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">
                          +{s.diff}
                        </span>
                      </div>
                    ))}
                    {topImprovements.length === 0 && (
                      <div className="py-10 text-center text-sm text-gray-400">
                        暂无进步数据，需要至少两场考试
                      </div>
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
                          <p className="text-sm font-medium text-gray-900">
                            {isGuest ? maskName(s.name, s.id) : s.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {examName} · 总分 {s.total.toFixed(2)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-red-600">
                          {s.diff}
                        </span>
                      </div>
                    ))}
                    {topDeclines.length === 0 && (
                      <div className="py-10 text-center text-sm text-gray-400">
                        暂无退步数据，需要至少两场考试
                      </div>
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
