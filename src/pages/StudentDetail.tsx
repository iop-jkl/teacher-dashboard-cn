import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ArrowLeft, Award, BookOpen, Save } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import RadarChart from '@/components/RadarChart';
import ScoreChart from '@/components/ScoreChart';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import { subjectScore, scoreValue } from '@/lib/scoreUtils';
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
  } = useStore();
  const showToast = useToastStore((s) => s.showToast);

  const student = students.find((s) => s.idCard === id);
  const [selectedExam, setSelectedExam] = useState('');
  const examId = exams.find((e) => e.name === selectedExam)?.id || '';

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

  const effectiveExam = selectedExam || exams[exams.length - 1]?.name || '';
  const effectiveExamId =
    exams.find((e) => e.name === effectiveExam)?.id || examId;

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
