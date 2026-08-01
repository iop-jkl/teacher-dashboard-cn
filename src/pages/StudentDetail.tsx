import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, TrendingUp } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import StudentRadar from '@/components/RadarChart';
import ScoreChart from '@/components/ScoreChart';
import { useStore } from '@/store/useStore';
import { SUBJECTS } from '@/data/mockData';
import type { SubjectScore } from '@/types';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sidebarOpen, openSidebar, closeSidebar, students, scores, currentExamIndex } = useStore();

  const student = students.find((s) => s.id === id);

  if (!student) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到该学生</p>
          <button
            onClick={() => navigate('/students')}
            className="px-4 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
          >
            返回学生列表
          </button>
        </div>
      </div>
    );
  }

  const studentScores = scores.filter((s) => s.studentId === student.id);

  const latestScores: SubjectScore[] = SUBJECTS.map((subject) => {
    const score = studentScores
      .filter((s) => s.subject === subject)
      .sort((a, b) => b.examId.localeCompare(a.examId))[0];
    return {
      subject,
      score: score?.score || 0,
      classRank: score?.classRank || 0,
      subjectRank: score?.subjectRank || 0,
      schoolRank: score?.schoolRank || 0,
    };
  });

  const latestOverallScore = [...studentScores].sort((a, b) =>
    b.examId.localeCompare(a.examId)
  )[0];

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <ToastContainer />

      <main className="flex-1 ml-0">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={openSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">学生成绩详情</h2>
                <p className="text-xs text-gray-500 mt-0.5">{student.className}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-2xl font-medium">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{student.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  学号：{student.studentNo}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">最近一次考试总分</p>
                <p className="text-3xl font-bold text-[#2dd4bf] mt-1">{student.totalScore}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  班级第 {student.rank} 名
                  {latestOverallScore && latestOverallScore.schoolRank > 0
                    ? ` · 学校第 ${latestOverallScore.schoolRank} 名`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2dd4bf]" />
                各科成绩雷达
              </h3>
              <StudentRadar studentId={student.id} examIndex={currentExamIndex} />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#2dd4bf]" />
                各科成绩历史趋势
              </h3>
              <ScoreChart studentId={student.id} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2dd4bf]" />
              最近考试成绩明细
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {latestScores.map((score) => (
                <div
                  key={score.subject}
                  className="p-4 rounded-lg bg-gray-50"
                >
                  <p className="text-xs text-gray-500 mb-1">{score.subject}</p>
                  <p className="text-2xl font-bold text-gray-900">{score.score}</p>
                  {(score.subjectRank || score.classRank) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      班内第 {score.subjectRank || score.classRank} 名
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
