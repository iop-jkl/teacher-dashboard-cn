import { useMemo, useState } from 'react';
import { BookOpen, Target, MessageSquareQuote, Save, Lock, KeyRound } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import RadarChart from '@/components/RadarChart';
import ScoreChart from '@/components/ScoreChart';
import { useStore } from '@/store/useStore';
import { useAuthStore, toEmail } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import { subjectScore, scoreValue } from '@/lib/scoreUtils';
import { changePassword } from '@/lib/password';
import type { Student } from '@/types';

export default function StudentPortal() {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    exams,
    goals,
    setStudentGoal,
  } = useStore();
  const session = useAuthStore((s) => s.session);
  const showToast = useToastStore((s) => s.showToast);
  const [selectedExam, setSelectedExam] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdChanging, setPwdChanging] = useState(false);

  const handleChangePassword = async () => {
    if (pwdNew !== pwdConfirm) {
      showToast('两次输入的新密码不一致', 'info');
      return;
    }
    if (pwdNew.trim().length < 6) {
      showToast('新密码至少 6 位', 'info');
      return;
    }
    setPwdChanging(true);
    try {
      const email = session ? toEmail(session.username) : '';
      const err = await changePassword(pwdOld, pwdNew, email);
      if (err) {
        showToast(err, 'error');
        return;
      }
      setPwdOld('');
      setPwdNew('');
      setPwdConfirm('');
      showToast('密码已修改，下次登录请使用新密码', 'success');
    } catch (e) {
      console.error('修改密码失败:', e);
      showToast('修改失败，请稍后重试', 'error');
    } finally {
      setPwdChanging(false);
    }
  };

  const student: Student | undefined = students[0];
  const examId = exams.find((e) => e.name === selectedExam)?.id || '';

  const studentSubjects = useMemo(() => {
    if (!student) return [];
    return ['语文', '数学', '英语', ...student.selectedSubjects];
  }, [student]);

  const effectiveExam = selectedExam || exams[exams.length - 1]?.name || '';
  const effectiveExamId = exams.find((e) => e.name === effectiveExam)?.id || examId;

  const totalRow = useMemo(() => {
    if (!student || !effectiveExamId) return undefined;
    return scores.find(
      (s) =>
        s.studentId === student.idCard &&
        s.examId === effectiveExamId &&
        s.subject === '总分',
    );
  }, [student, scores, effectiveExamId]);

  if (!student) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center text-gray-500">暂无成绩数据</div>
      </div>
    );
  }

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
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">我的成绩</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {student.classNo}班 · {student.grade}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={effectiveExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </select>
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
                  {student.classNo}班 · 选科：{student.selectedSubjects.join('、')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{effectiveExam} 总分赋分</p>
                <p className="text-3xl font-bold text-[#2dd4bf] mt-1">
                  {totalRow && scoreValue(totalRow) != null
                    ? Number(scoreValue(totalRow)).toFixed(2)
                    : '-'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  班第{totalRow?.classRank || '-'}名 · 校第{totalRow?.schoolRank || '-'}名
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RadarChart studentId={student.idCard} examId={effectiveExamId} />
            <ScoreChart studentId={student.idCard} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2dd4bf]" />
              各科成绩明细（原始分 / 赋分 / 排名）
            </h3>
            <div className="space-y-2">
              {studentSubjects.map((subject) => {
                const row = subjectScore(
                  scores,
                  student.idCard,
                  effectiveExamId,
                  subject,
                );
                const value = scoreValue(row);
                const hasAssigned =
                  row?.assignedScore != null &&
                  student.selectedSubjects.includes(subject);
                return (
                  <div
                    key={subject}
                    className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg flex-wrap gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{subject}</span>
                      {hasAssigned && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">
                          赋分
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {hasAssigned && (
                        <span className="text-xs text-gray-400">
                          原始 {row?.rawScore ?? '-'}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-gray-900">
                        {value != null ? value.toFixed(2) : '-'} 分
                      </span>
                      <span className="text-xs text-gray-400">
                        班第{row?.classRank || '-'}名 · 校第{row?.schoolRank || '-'}名
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalCard
              currentTotal={
                totalRow && scoreValue(totalRow) != null
                  ? Number(scoreValue(totalRow))
                  : null
              }
              goal={goals.find((g) => g.studentId === student.idCard)?.totalGoal ?? null}
              draft={goalDraft}
              setDraft={setGoalDraft}
              onSave={(value) => {
                setStudentGoal(student.idCard, value);
                showToast(value == null ? '已清除目标分' : '目标分已保存', 'success');
              }}
            />
            <CommentCard comment={student.teacherComment ?? ''} />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-semibold text-gray-900">修改密码</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              输入当前密码与新密码完成修改，下次登录请使用新密码
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="password"
                value={pwdOld}
                onChange={(e) => setPwdOld(e.target.value)}
                placeholder="当前密码"
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
              <input
                type="password"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                placeholder="新密码（至少 6 位）"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
              <input
                type="password"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                placeholder="确认新密码"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
              />
            </div>
            <div className="mt-4">
              <button
                onClick={handleChangePassword}
                disabled={pwdChanging || !pwdOld || !pwdNew}
                className="flex items-center gap-1 px-4 py-2 text-xs text-white bg-[#1e3a5f] rounded-lg hover:bg-[#162c48] disabled:opacity-50 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {pwdChanging ? '提交中...' : '确认修改密码'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function GoalCard({
  currentTotal,
  goal,
  draft,
  setDraft,
  onSave,
}: {
  currentTotal: number | null;
  goal: number | null;
  draft: string;
  setDraft: (v: string) => void;
  onSave: (value: number | null) => void;
}) {
  const showToast = useToastStore((s) => s.showToast);
  const goalDisplay = draft || (goal != null ? String(goal) : '');
  const progress =
    goal != null && goal > 0 && currentTotal != null
      ? Math.min(100, Math.round((currentTotal / goal) * 100))
      : 0;
  const achieved = goal != null && currentTotal != null && currentTotal >= goal;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-[#2dd4bf]" />
        <h3 className="text-base font-semibold text-gray-900">我的目标分</h3>
      </div>
      {goal != null && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-gray-500">
              目标 {goal} 分 · 当前 {currentTotal != null ? currentTotal.toFixed(2) : '-'} 分
            </span>
            <span
              className={`text-sm font-semibold ${achieved ? 'text-emerald-600' : 'text-gray-700'}`}
            >
              {achieved ? '已达成 🎉' : `还差 ${(goal - (currentTotal ?? 0)).toFixed(1)} 分`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${achieved ? 'bg-emerald-500' : 'bg-[#2dd4bf]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">达成度 {progress}%</p>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          max={900}
          value={goalDisplay}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={goal != null ? String(goal) : '输入总分目标，如 650'}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
        />
        <button
          onClick={() => {
            const v = parseFloat(goalDisplay);
            if (goalDisplay.trim() === '') {
              onSave(null);
              setDraft('');
              return;
            }
            if (Number.isNaN(v) || v < 0) {
              showToast('请输入有效的目标分', 'error');
              return;
            }
            onSave(v);
            setDraft('');
          }}
          className="flex items-center gap-1 px-4 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
        >
          <Save className="w-4 h-4" />
          保存目标
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">目标分用于自我督促，班主任也可看到你的目标。</p>
    </div>
  );
}

function CommentCard({ comment }: { comment: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareQuote className="w-5 h-5 text-[#2dd4bf]" />
        <h3 className="text-base font-semibold text-gray-900">班主任评语</h3>
      </div>
      {comment ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment}</p>
      ) : (
        <p className="text-sm text-gray-400">班主任还没有为你留下评语。</p>
      )}
    </div>
  );
}
