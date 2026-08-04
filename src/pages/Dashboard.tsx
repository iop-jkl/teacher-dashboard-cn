import { useState, useMemo, useEffect } from 'react';
import { Bell, Search, Menu, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ReminderCard from '@/components/ReminderCard';
import SubjectCard from '@/components/SubjectCard';
import ScoreChart from '@/components/ScoreChart';
import StudentTable from '@/components/StudentTable';
import TopStudentsRanking from '@/components/TopStudentsRanking';
import QuickActions from '@/components/QuickActions';
import AddReminderModal from '@/components/AddReminderModal';
import ExcelImportModal from '@/components/ExcelImportModal';
import ExcelExportButton from '@/components/ExcelExportButton';
import ToastContainer from '@/components/ToastContainer';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import { ALL_SUBJECTS } from '@/data/mockData';
import {
  buildScoreIndex,
  buildExamValueMap,
  totalForIndexed,
} from '@/lib/scoreUtils';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    reminders,
    toggleReminder,
    activeClass,
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    exams,
    examList,
    currentExamIndex,
    setCurrentExamIndex,
    setActiveClass,
    unreadMessages,
    gradeSummary,
    scoresLoading,
    loadedScoreClasses,
    dataLoaded,
    loadAllScores,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const isAdmin = session?.role === 'admin';
  const allClassCount = useMemo(
    () => new Set(students.map((s) => s.classNo)).size,
    [students],
  );

  useEffect(() => {
    if (!isAdmin && session?.classNo) {
      setActiveClass(session.classNo);
    }
  }, [isAdmin, session?.classNo, setActiveClass]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!dataLoaded) return;
    if (activeClass === 0) {
      loadAllScores();
    }
  }, [isAdmin, activeClass, dataLoaded, loadAllScores]);

  const showToast = useToastStore((s) => s.showToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showScoreImport, setShowScoreImport] = useState(false);

  const pendingCount = reminders.filter((r) => !r.completed).length;

  const clampedExamIndex = Math.min(Math.max(currentExamIndex, 0), examList.length - 1);
  const latestExamName = examList[clampedExamIndex] || '暂无考试';
  const latestExam = exams.find((e) => e.name === latestExamName);
  const prevExamName = clampedExamIndex > 0 ? examList[clampedExamIndex - 1] : '';
  const prevExam = exams.find((e) => e.name === prevExamName);

  const classStudents = useMemo(
    () =>
      activeClass === 0
        ? students
        : activeClass === -1
          ? students.filter((s) => s.classNo === 0)
          : students.filter((s) => s.classNo === activeClass),
    [students, activeClass],
  );

  const classNoList = useMemo(() => {
    const set = new Set<number>();
    for (const s of students) set.add(s.classNo);
    const list = [...set].sort((a, b) => a - b);
    return isAdmin ? [0, ...list] : list;
  }, [students, isAdmin]);

  const scoreIndex = useMemo(() => buildScoreIndex(scores), [scores]);
  const examValueMap = useMemo(
    () => (latestExam ? buildExamValueMap(scores, latestExam.id) : new Map()),
    [scores, latestExam],
  );

  const gradeAveragesForExam = useMemo(() => {
    if (!latestExam || gradeSummary.length === 0) return null;
    const rows = gradeSummary.filter((r) => r.examId === latestExam.id);
    if (rows.length === 0) return null;
    const gradeRow = rows.find((r) => r.classNo === activeClass);
    const useRows = activeClass === 0 ? rows : gradeRow ? [gradeRow] : rows;
    return {
      class: gradeRow ?? null,
      all: useRows,
    };
  }, [latestExam, gradeSummary, activeClass]);

  const examAverageData = useMemo(() => {
    if (gradeAveragesForExam) {
      const result: { subject: string; classAverage: number; gradeAverage: number }[] = [];
      for (const subject of ALL_SUBJECTS) {
        const classAvg = gradeAveragesForExam.class?.subjectAvg[subject];
        if (classAvg == null) continue;
        let allAvg: number | null = null;
        if (activeClass === 0) {
          let sum = 0;
          let cnt = 0;
          for (const r of gradeAveragesForExam.all) {
            const v = r.subjectAvg[subject];
            if (v != null) {
              sum += v * r.studentCount;
              cnt += r.studentCount;
            }
          }
          allAvg = cnt > 0 ? sum / cnt : null;
        } else {
          allAvg = classAvg;
        }
        result.push({
          subject,
          classAverage: Math.round(classAvg * 10) / 10,
          gradeAverage: allAvg != null ? Math.round(allAvg * 10) / 10 : Math.round(classAvg * 10) / 10,
        });
      }
      if (result.length > 0) return result;
    }
    if (!latestExam) return [];
    const result: { subject: string; classAverage: number; gradeAverage: number }[] = [];
    for (const subject of ALL_SUBJECTS) {
      const values = classStudents
        .map((s) => examValueMap.get(`${s.idCard}\u0000${subject}`))
        .filter((v): v is number => v != null && v > 0);
      const allValues = students
        .map((s) => examValueMap.get(`${s.idCard}\u0000${subject}`))
        .filter((v): v is number => v != null && v > 0);
      if (values.length === 0) continue;
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
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
  }, [classStudents, students, examValueMap, latestExam, gradeAveragesForExam, activeClass]);

  const progressRankings = useMemo(() => {
    if (!latestExam || !prevExam) return [];
    return classStudents.map((student) => {
      const total = totalForIndexed(scoreIndex, student.idCard, latestExam.id);
      const prevTotal = totalForIndexed(scoreIndex, student.idCard, prevExam.id);
      return {
        id: student.idCard,
        name: student.name,
        total,
        diff: Math.round((total - prevTotal) * 100) / 100,
      };
    });
  }, [classStudents, scoreIndex, latestExam, prevExam]);

  const topImprovements = useMemo(
    () => [...progressRankings].sort((a, b) => b.diff - a.diff).slice(0, 5),
    [progressRankings],
  );
  const topDeclines = useMemo(
    () => [...progressRankings].sort((a, b) => a.diff - b.diff).slice(0, 5),
    [progressRankings],
  );

  const goPrevExam = () => {
    if (clampedExamIndex > 0) setCurrentExamIndex(clampedExamIndex - 1);
  };
  const goNextExam = () => {
    if (clampedExamIndex < examList.length - 1) setCurrentExamIndex(clampedExamIndex + 1);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return classStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.idCard.toLowerCase().includes(q),
    );
  }, [searchQuery, classStudents]);

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
                  <span className="text-[#2dd4bf]">
                    {activeClass === 0
                      ? '全部班级'
                      : activeClass === -1
                        ? '待分班'
                        : `${activeClass}班`}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
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
                  {students.some((s) => s.classNo === 0) && (
                    <option value={-1}>待分班</option>
                  )}
                </select>
              )}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSearchResults(searchQuery.length > 0)}
                  placeholder="搜索学生姓名或身份证号"
                  className="pl-10 pr-4 py-2 w-48 lg:w-64 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/30 focus:outline-none transition-all"
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 w-full bg-white rounded-lg shadow-lg border border-gray-100 py-2 max-h-64 overflow-y-auto z-20">
                    {searchResults.map((student) => (
                      <a
                        key={student.idCard}
                        href={`/student/${student.idCard}`}
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
                        <span className="text-gray-400 text-xs">{student.classNo}班</span>
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
            onAddScoreImport={() => setShowScoreImport(true)}
          />

          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-gray-900">选择考试</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  切换不同考试查看班级均分与进步/退步前五名
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrevExam}
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
                  onClick={goNextExam}
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
              {session?.role === 'teacher' && (
                <div
                  onClick={() => navigate('/messages')}
                  className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-[#2dd4bf]/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-purple-500" />
                      <h3 className="text-base font-semibold text-gray-900">匿名信箱</h3>
                    </div>
                    {unreadMessages > 0 && (
                      <span className="flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-500 text-white text-xs font-medium">
                        {unreadMessages} 未读
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {unreadMessages > 0
                      ? `你有 ${unreadMessages} 封新匿名信待查看`
                      : '暂无未读匿名信'}
                  </p>
                </div>
              )}
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
                    <h3 className="text-base font-semibold text-gray-900">考试平均分概览</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activeClass}班 · {latestExamName}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {examAverageData.map((d) => (
                    <SubjectCard
                      key={d.subject}
                      subject={d.subject}
                      classAverage={d.classAverage}
                      gradeAverage={d.gradeAverage}
                    />
                  ))}
                  {examAverageData.length === 0 && (
                    <div className="col-span-full py-10 text-center text-sm text-gray-400">
                      暂无成绩数据
                    </div>
                  )}
                </div>
              </div>

              <ScoreChart classNo={activeClass} />

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

          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">学生成绩排行</h3>
            <ExcelExportButton />
          </div>
          {scoresLoading.includes(activeClass) && activeClass !== 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-500">正在加载该班级成绩…</p>
            </div>
          ) : (
            <>
              {activeClass === 0 && scoresLoading.includes(0) && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">正在加载全部班级成绩…</span>
                    <span className="text-gray-400 tabular-nums">
                      {loadedScoreClasses.length}/{allClassCount} 个班级
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#2dd4bf] rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (loadedScoreClasses.length / Math.max(allClassCount, 1)) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <StudentTable
                students={classStudents}
                scores={scores}
                examId={latestExam?.id}
                className={activeClass === -1 ? '待分班' : `${activeClass}班`}
                loading={false}
              />
            </>
          )}
        </div>
      </main>

      {showAddReminder && <AddReminderModal onClose={() => setShowAddReminder(false)} />}
      {showScoreImport && (
        <ExcelImportModal onClose={() => setShowScoreImport(false)} />
      )}
    </div>
  );
}
