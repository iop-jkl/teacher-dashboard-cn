import { useState, useMemo } from 'react';
import { Bell, Search, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ReminderCard from '@/components/ReminderCard';
import SubjectCard from '@/components/SubjectCard';
import ScoreChart from '@/components/ScoreChart';
import StudentTable from '@/components/StudentTable';
import TopStudentsRanking from '@/components/TopStudentsRanking';
import QuickActions from '@/components/QuickActions';
import AddReminderModal from '@/components/AddReminderModal';
import StudentProgressBoard from '@/components/StudentProgressBoard';
import ExcelImportButton from '@/components/ExcelImportButton';
import ToastContainer from '@/components/ToastContainer';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import {
  SUBJECTS,
  EXAM_NAMES,
  getClassAverageByExam,
} from '@/data/mockData';
import type { ExamTrendPoint } from '@/types';

function sumPoint(point: ExamTrendPoint | undefined): number {
  if (!point) return 0;
  return SUBJECTS.reduce((sum, subject) => sum + (Number(point[subject]) || 0), 0);
}

export default function Dashboard() {
  const {
    reminders,
    toggleReminder,
    activeClass,
    sidebarOpen,
    openSidebar,
    currentExamIndex,
    setCurrentExamIndex,
    closeSidebar,
    students,
    scores,
    studentScoreTrend,
    examTrendData,
  } = useStore();

  const showToast = useToastStore((s) => s.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);

  const completedCount = reminders.filter((r) => r.completed).length;
  const pendingCount = reminders.length - completedCount;

  const examList = useMemo(() => {
    const names = [...new Set(examTrendData.map((p) => p.examName).filter(Boolean))];
    if (names.length > 0) return names;
    const fromScores = [...new Set(scores.map((s) => s.examId))].sort((a, b) =>
      a.localeCompare(b)
    );
    return fromScores.length > 0 ? fromScores : [...EXAM_NAMES];
  }, [examTrendData, scores]);

  const clampedExamIndex = Math.min(Math.max(currentExamIndex, 0), examList.length - 1);
  const latestExamName = examList[clampedExamIndex] || '暂无考试';
  const examHasPrev = clampedExamIndex > 0;
  const prevExamName = examHasPrev ? examList[clampedExamIndex - 1] : '';

  const examAverageData = useMemo(() => {
    const examScores = scores.filter((s) => s.examId === latestExamName && s.score > 0);
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
    return getClassAverageByExam(clampedExamIndex);
  }, [scores, latestExamName, clampedExamIndex]);

  const prevExamAverageData = useMemo(() => {
    if (!prevExamName) return [];
    const examScores = scores.filter((s) => s.examId === prevExamName && s.score > 0);
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
    return getClassAverageByExam(clampedExamIndex - 1);
  }, [scores, prevExamName, clampedExamIndex]);

  const progressRankings = useMemo(() => {
    return students
      .map((student) => {
        const points = studentScoreTrend[student.id] || [];
        let total = student.totalScore;
        let prevTotal = student.totalScore;
        if (points.length > 0) {
          const idx = Math.min(clampedExamIndex, points.length - 1);
          total = sumPoint(points[idx]);
          prevTotal = idx > 0 ? sumPoint(points[idx - 1]) : total;
        }
        return { id: student.id, name: student.name, total, diff: total - prevTotal };
      })
      .filter((s) => s.total > 0 || s.diff !== 0);
  }, [students, studentScoreTrend, clampedExamIndex]);

  const topImprovements = useMemo(
    () => [...progressRankings].sort((a, b) => b.diff - a.diff).slice(0, 5),
    [progressRankings]
  );
  const topDeclines = useMemo(
    () => [...progressRankings].sort((a, b) => a.diff - b.diff).slice(0, 5),
    [progressRankings]
  );

  const progressBoardStudents = useMemo(
    () =>
      students.map((student) => {
        const p = progressRankings.find((r) => r.id === student.id);
        return {
          id: student.id,
          name: student.name,
          total: p?.total ?? student.totalScore,
          rank: student.rank,
          trend: p?.diff ?? 0,
        };
      }),
    [students, progressRankings]
  );

  const prevExam = () => {
    if (clampedExamIndex > 0) setCurrentExamIndex(clampedExamIndex - 1);
  };
  const nextExam = () => {
    if (clampedExamIndex < examList.length - 1) setCurrentExamIndex(clampedExamIndex + 1);
  };

  const getSubjectAverage = (subject: string, data: typeof examAverageData) =>
    data.find((d) => d.subject === subject);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.studentNo.includes(query)
    );
  }, [searchQuery, students]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setShowSearchResults(value.length > 0);
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
                aria-label="打开菜单"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">工作台</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                  {new Date().toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                  {' · '}
                  <span className="text-[#2dd4bf]">{activeClass}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5 sm:hidden">
                  <span className="text-[#2dd4bf]">{activeClass}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setShowSearchResults(searchQuery.length > 0)}
                  placeholder="搜索学生、考试..."
                  className="pl-10 pr-4 py-2 w-48 lg:w-64 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/30 focus:outline-none transition-all"
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-2 max-h-64 overflow-y-auto z-20">
                    {searchResults.map((student) => (
                      <a
                        key={student.id}
                        href={`/student/${student.id}`}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <span className="text-gray-900">{student.name}</span>
                        <span className="text-gray-400 text-xs">{student.studentNo}</span>
                      </a>
                    ))}
                  </div>
                )}
                {showSearchResults && searchResults.length === 0 && searchQuery && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-3 px-4 text-sm text-gray-400 z-20">
                    未找到匹配的学生
                  </div>
                )}
              </div>

              <button
                className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => showToast('您有新的考试提醒', 'info')}
              >
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <QuickActions
            onToast={(msg) => showToast(msg, 'info')}
            onAddReminder={() => setShowAddReminder(true)}
          />

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-gray-900">选择考试</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  切换不同考试查看进步/退步前五名及各科平均分
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevExam}
                  disabled={clampedExamIndex === 0}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="上一场考试"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium min-w-[100px] text-center">
                  {latestExamName}
                </div>
                <button
                  onClick={nextExam}
                  disabled={clampedExamIndex === examList.length - 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="下一场考试"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {examList.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setCurrentExamIndex(idx)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    idx === clampedExamIndex
                      ? 'bg-[#2dd4bf] text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">近期提醒</h3>
                  <span className="text-xs bg-[#2dd4bf]/10 text-[#2dd4bf] px-2 py-1 rounded-full font-medium">
                    {pendingCount} 待办
                  </span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {reminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onToggle={toggleReminder}
                    />
                  ))}
                </div>
              </div>

            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      考试平均分概览
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      本次考试：{latestExamName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {SUBJECTS.map((subject) => {
                    const current = getSubjectAverage(subject, examAverageData);
                    const prev = examHasPrev ? getSubjectAverage(subject, prevExamAverageData) : undefined;
                    if (!current) return null;
                    return (
                      <SubjectCard
                        key={subject}
                        subject={subject}
                        classAverage={current.classAverage}
                        gradeAverage={current.gradeAverage}
                        previousAverage={prev?.classAverage}
                      />
                    );
                  })}
                </div>
              </div>

              <ScoreChart />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TopStudentsRanking
                  title={`${latestExamName}进步最大 Top 5`}
                  type="improve"
                  students={topImprovements}
                />
                <TopStudentsRanking
                  title={`${latestExamName}退步最大 Top 5`}
                  type="decline"
                  students={topDeclines}
                />
              </div>
            </div>
          </div>

          <StudentProgressBoard
            examName={latestExamName}
            hasPrev={examHasPrev}
            students={progressBoardStudents}
          />

          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">学生成绩排行</h3>
            <ExcelImportButton label="导入Excel数据" />
          </div>
          <StudentTable students={students} scores={scores} className={activeClass} />
        </div>
      </main>

      {showAddReminder && <AddReminderModal onClose={() => setShowAddReminder(false)} />}
    </div>
  );
}
