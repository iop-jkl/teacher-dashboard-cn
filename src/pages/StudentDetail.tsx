import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Save,
  Target,
  MessageSquareQuote,
  Printer,
  GitCompareArrows,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import RadarChart from '@/components/RadarChart';
import ScoreChart from '@/components/ScoreChart';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import { subjectScore, scoreValue, totalFor } from '@/lib/scoreUtils';
import type { Student } from '@/types';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    students,
    scores,
    exams,
    updateStudent,
    updateStudentComment,
    goals,
    loadScoresForStudent,
  } = useStore();
  const showToast = useToastStore((s) => s.showToast);

  const student = students.find((s) => s.idCard === id);

  useEffect(() => {
    if (id && student) {
      loadScoresForStudent(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, student?.classNo]);
  const [selectedExam, setSelectedExam] = useState('');
  const [compareExam, setCompareExam] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const examId = exams.find((e) => e.name === selectedExam)?.id || '';
  const effectiveExam = selectedExam || exams[exams.length - 1]?.name || '';
  const effectiveExamId = exams.find((e) => e.name === effectiveExam)?.id || examId;
  const compareExamId = exams.find((e) => e.name === compareExam)?.id || '';

  const studentSubjects = useMemo(() => {
    if (!student) return [];
    return ['语文', '数学', '英语', ...student.selectedSubjects];
  }, [student]);

  const examScores = useMemo(() => {
    if (!student || !examId) return [];
    return scores.filter(
      (s) => s.studentId === student.idCard && s.examId === examId,
    );
  }, [student, examId, scores]);

  const totalRow = examScores.find((s) => s.subject === '总分');

  const sortedExams = useMemo(
    () =>
      [...exams].sort(
        (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
      ),
    [exams],
  );

  const rankTrendData = useMemo(() => {
    if (!student) return [];
    return sortedExams.map((exam) => {
      const totalRow2 = scores.find(
        (s) =>
          s.studentId === student.idCard &&
          s.examId === exam.id &&
          s.subject === '总分',
      );
      return {
        exam: exam.name,
        总分: totalRow2 && scoreValue(totalRow2) != null ? Number(scoreValue(totalRow2)) : null,
        班排名: totalRow2?.classRank ?? null,
        校排名: totalRow2?.schoolRank ?? null,
      };
    });
  }, [student, scores, sortedExams]);

  const goal = useMemo(
    () =>
      student ? (goals.find((g) => g.studentId === student.idCard)?.totalGoal ?? null) : null,
    [student, goals],
  );
  const currentTotal = useMemo(
    () =>
      student
        ? totalFor(scores, student.idCard, effectiveExamId ?? '')
        : 0,
    [student, scores, effectiveExamId],
  );

  const goalProgress =
    goal != null && goal > 0 && currentTotal > 0
      ? Math.min(100, Math.round((currentTotal / goal) * 100))
      : 0;

  const compareRows = useMemo(() => {
    if (!student || !effectiveExamId || !compareExamId) return [];
    const subjectSet = new Set<string>();
    for (const s of scores) {
      if (
        s.studentId === student.idCard &&
        (s.examId === effectiveExamId || s.examId === compareExamId)
      ) {
        subjectSet.add(s.subject);
      }
    }
    const subjects = [...subjectSet].sort((a, b) => {
      if (a === '总分') return 1;
      if (b === '总分') return -1;
      return a.localeCompare(b);
    });
    return subjects.map((subject) => {
      const a = subjectScore(scores, student.idCard, effectiveExamId, subject);
      const b = subjectScore(scores, student.idCard, compareExamId, subject);
      const va = scoreValue(a);
      const vb = scoreValue(b);
      const diff =
        va != null && vb != null ? Math.round((va - vb) * 100) / 100 : null;
      return { subject, a: a, b: b, va, vb, diff };
    });
  }, [student, scores, effectiveExamId, compareExamId]);

  useEffect(() => {
    setCommentDraft(student?.teacherComment ?? '');
  }, [student?.idCard, student?.teacherComment]);

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
                <p className="text-xs text-gray-500 mt-0.5">
                  {student.classNo}班 · {student.idCard}
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
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors print:hidden"
              >
                <Printer className="w-4 h-4" />
                打印成绩单
              </button>
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

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2dd4bf]" />
              家长信息
            </h3>
            <ParentInfo student={student} onSave={updateStudent} showToast={showToast} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#2dd4bf]" />
                <h3 className="text-base font-semibold text-gray-900">目标分</h3>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-sm text-gray-500">目标</span>
                <span className="text-2xl font-bold text-gray-900">
                  {goal != null ? goal : '-'}
                </span>
                <span className="text-sm text-gray-400">分</span>
                {goal != null && currentTotal > 0 && (
                  <>
                    <span className="mx-2 text-gray-300">|</span>
                    <span className="text-sm text-gray-500">当前总分</span>
                    <span className="text-xl font-bold text-[#2dd4bf]">
                      {currentTotal.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">
                      ({goalProgress}%)
                    </span>
                  </>
                )}
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2dd4bf]"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">学生可自行设定目标，用于自我督促。</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquareQuote className="w-5 h-5 text-[#2dd4bf]" />
                <h3 className="text-base font-semibold text-gray-900">评语</h3>
              </div>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={4}
                placeholder="填写对学生的评语，学生登录后可见…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    updateStudentComment(student.idCard, commentDraft.trim());
                    showToast('评语已保存，学生端可见', 'success');
                  }}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors"
                >
                  <Save className="w-4 h-4" />
                  保存评语
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 print:hidden">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2dd4bf]" />
              排名趋势（历次考试）
            </h3>
            {rankTrendData.some((d) => d.总分 != null) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={rankTrendData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="exam"
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      yAxisId="score"
                      orientation="left"
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      domain={['auto', 'auto']}
                    />
                    <YAxis
                      yAxisId="rank"
                      orientation="right"
                      reversed
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `第${v}名`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      yAxisId="score"
                      type="monotone"
                      dataKey="总分"
                      name="总分"
                      stroke="#2dd4bf"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="rank"
                      type="monotone"
                      dataKey="校排名"
                      name="校排名"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                暂无趋势数据，需要至少两场考试
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 print:hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <GitCompareArrows className="w-5 h-5 text-[#2dd4bf]" />
                两次考试对比
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={effectiveExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                  aria-label="选择考试A"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-400">对比</span>
                <select
                  value={compareExam || exams[0]?.name || ''}
                  onChange={(e) => setCompareExam(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                  aria-label="选择考试B"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {compareRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">科目</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">{effectiveExam}</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">{compareExam || exams[0]?.name}</th>
                      <th className="text-center py-2 px-2 font-medium text-gray-500">变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.subject} className="border-b border-gray-50">
                        <td className="py-2.5 px-2 font-medium text-gray-800">{row.subject}</td>
                        <td className="text-center py-2.5 px-2 text-gray-700">
                          {row.va != null ? row.va.toFixed(2) : '-'}
                        </td>
                        <td className="text-center py-2.5 px-2 text-gray-700">
                          {row.vb != null ? row.vb.toFixed(2) : '-'}
                        </td>
                        <td className="text-center py-2.5 px-2">
                          {row.diff == null ? (
                            <span className="text-gray-400">-</span>
                          ) : row.diff > 0 ? (
                            <span className="text-emerald-600 font-medium">+{row.diff.toFixed(2)}</span>
                          ) : row.diff < 0 ? (
                            <span className="text-red-500 font-medium">{row.diff.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">请选择两场考试进行对比</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ParentInfo({
  student,
  onSave,
  showToast,
}: {
  student: Student;
  onSave: (idCard: string, updates: Partial<Student>) => void;
  showToast: (msg: string, type: 'info' | 'success' | 'error') => void;
}) {
  const [draft, setDraft] = useState({
    fatherName: student.fatherName,
    fatherPhone: student.fatherPhone,
    fatherWechat: student.fatherWechat,
    motherName: student.motherName,
    motherPhone: student.motherPhone,
    motherWechat: student.motherWechat,
    remark: student.remark,
  });

  const save = () => {
    onSave(student.idCard, draft);
    showToast('家长信息已保存', 'success');
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(
          [
            ['父亲姓名', 'fatherName'],
            ['父亲电话', 'fatherPhone'],
            ['父亲微信', 'fatherWechat'],
            ['母亲姓名', 'motherName'],
            ['母亲电话', 'motherPhone'],
            ['母亲微信', 'motherWechat'],
          ] as const
        ).map(([label, key]) => (
          <div key={key}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type="text"
              value={draft[key]}
              onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <label className="block text-xs text-gray-500 mb-1">学生备注</label>
        <textarea
          value={draft.remark}
          onChange={(e) => setDraft((prev) => ({ ...prev, remark: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 resize-none"
        />
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={save}
          className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors"
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>
    </div>
  );
}
