import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, UserPlus, Trash2, Eye, X, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import ExcelImportButton from '@/components/ExcelImportButton';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import { getFullScore } from '@/data/mockData';
import type { Student } from '@/types';

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];

export default function StudentsPage() {
  const { sidebarOpen, openSidebar, closeSidebar, students, scores, removeStudent, updateStudent, addStudent, updateExamScores, activeClass } = useStore();
  const showToast = useToastStore((s) => s.showToast);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedExam, setSelectedExam] = useState('');
  const [remarkDraft, setRemarkDraft] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addStudentNo, setAddStudentNo] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, number>>({});

  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.studentNo.toLowerCase().includes(query)
      );
    }
    return [...result].sort((a, b) =>
      a.studentNo.localeCompare(b.studentNo, undefined, { numeric: true })
    );
  }, [students, searchQuery]);

  const studentExams = useMemo(() => {
    if (!selectedStudent) return [];
    return [
      ...new Set(
        scores
          .filter((s) => s.studentId === selectedStudent.id)
          .map((s) => s.examId)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [scores, selectedStudent]);

  const selectedExamScores = useMemo(() => {
    if (!selectedStudent || !selectedExam) return [];
    return scores.filter(
      (s) => s.studentId === selectedStudent.id && s.examId === selectedExam
    );
  }, [scores, selectedStudent, selectedExam]);

  const prevExamScores = useMemo(() => {
    if (!selectedStudent || !selectedExam) return [];
    const idx = studentExams.indexOf(selectedExam);
    const prev = idx > 0 ? studentExams[idx - 1] : '';
    return prev
      ? scores.filter((s) => s.studentId === selectedStudent.id && s.examId === prev)
      : [];
  }, [scores, selectedStudent, selectedExam, studentExams]);

  const selectedTotal = useMemo(
    () => selectedExamScores.reduce((sum, s) => sum + s.score, 0),
    [selectedExamScores]
  );
  const prevTotal = useMemo(
    () => prevExamScores.reduce((sum, s) => sum + s.score, 0),
    [prevExamScores]
  );
  const selectedClassRank = selectedExamScores[0]?.classRank || 0;
  const selectedSchoolRank = selectedExamScores[0]?.schoolRank || 0;
  const hasPrev = studentExams.indexOf(selectedExam) > 0;
  const totalDiff = hasPrev ? selectedTotal - prevTotal : 0;

  useEffect(() => {
    if (!selectedStudent || !selectedExam) return;
    const drafts: Record<string, number> = {};
    for (const s of scores.filter(
      (x) => x.studentId === selectedStudent.id && x.examId === selectedExam
    )) {
      drafts[s.subject] = s.score;
    }
    setScoreDrafts(drafts);
    setEditMode(false);
  }, [selectedStudent?.id, selectedExam, scores]);

  const handleDeleteStudent = (id: string) => {
    removeStudent(id);
    showToast('学生已删除', 'info');
  };

  const handleAddStudent = () => {
    setAddName('');
    setAddStudentNo('');
    setShowAddModal(true);
  };

  const handleSaveAddStudent = () => {
    if (!addName.trim() || !addStudentNo.trim()) {
      showToast('请填写姓名和学号', 'info');
      return;
    }
    addStudent({
      name: addName.trim(),
      studentNo: addStudentNo.trim(),
      className: activeClass,
      avatar: '',
      totalScore: 0,
      rank: 0,
      trend: 'stable',
      trendValue: 0,
    });
    setShowAddModal(false);
    showToast('学生已添加', 'success');
  };

  const handleOpenStudent = (student: Student) => {
    setSelectedStudent(student);
    setRemarkDraft(student.remark || '');
    const exams = [
      ...new Set(scores.filter((s) => s.studentId === student.id).map((s) => s.examId)),
    ].sort((a, b) => a.localeCompare(b));
    setSelectedExam(exams[exams.length - 1] || '');
  };

  const handleSaveRemark = () => {
    if (selectedStudent) {
      updateStudent(selectedStudent.id, { remark: remarkDraft });
      setSelectedStudent({ ...selectedStudent, remark: remarkDraft });
      showToast('备注已保存', 'success');
    }
  };

  const handleSaveScores = () => {
    if (!selectedStudent || !selectedExam) return;
    const updates = SUBJECTS.map((subject) => ({
      subject,
      score: scoreDrafts[subject],
    })).filter((u) => typeof u.score === 'number' && !Number.isNaN(u.score));
    if (updates.length === 0) return;
    updateExamScores(selectedStudent.id, selectedExam, updates);
    showToast('成绩已保存并重新排名', 'success');
    setEditMode(false);
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
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">学生管理</h2>
                <p className="text-xs text-gray-500 mt-0.5">{activeClass} · 共 {students.length} 名学生</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExcelImportButton variant="secondary" label="导入Excel" />
              <button
                onClick={handleAddStudent}
                className="flex items-center gap-1 px-3 py-2 bg-[#2dd4bf] text-white text-sm rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                添加
              </button>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索学生姓名或学号"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/30 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleOpenStudent(student)}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-xs font-medium">
                            {student.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 group-hover:text-[#2dd4bf] transition-colors">
                            {student.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{student.studentNo}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenStudent(student)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#2dd4bf] transition-colors"
                            title="查看成绩"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 flex items-center gap-3">
                  <button
                    onClick={() => handleOpenStudent(student)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-sm font-medium shrink-0"
                  >
                    {student.name.charAt(0)}
                  </button>
                  <button
                    onClick={() => handleOpenStudent(student)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate">{student.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{student.studentNo}</p>
                  </button>
                  <button
                    onClick={() => handleOpenStudent(student)}
                    className="p-2 rounded-lg bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs font-medium shrink-0"
                  >
                    详情
                  </button>
                </div>
              ))}
            </div>

            {filteredStudents.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {searchQuery ? '未找到匹配的学生' : '暂无学生数据'}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2dd4bf] flex items-center justify-center text-white text-lg font-medium">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{selectedStudent.name}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedStudent.studentNo} · {activeClass}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {studentExams.length > 0 ? (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">选择考试</h4>
                    <p className="text-xs text-gray-400 mt-0.5">查看该次考试的成绩与排名</p>
                  </div>
                  <select
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-[#2dd4bf]/40"
                  >
                    {studentExams.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-gray-400">
                  暂无成绩数据，请通过 Excel 导入考试成绩
                </div>
              )}

              {selectedExamScores.length > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">总分</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedTotal}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">班级排名</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {selectedClassRank > 0 ? `第 ${selectedClassRank} 名` : '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">学校排名</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {selectedSchoolRank > 0 ? `第 ${selectedSchoolRank} 名` : '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">与上次变化</p>
                      <div className="flex items-center justify-center mt-1">
                        {!hasPrev ? (
                          <span className="text-sm text-gray-400">首次考试</span>
                        ) : totalDiff > 0 ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">+{totalDiff}</span>
                          </span>
                        ) : totalDiff < 0 ? (
                          <span className="flex items-center gap-1 text-red-500">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-sm font-medium">{totalDiff}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Minus className="w-4 h-4" />
                            <span className="text-sm font-medium">持平</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">各科成绩</h4>
                      {selectedExamScores.length > 0 &&
                        (editMode ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditMode(false)}
                              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={handleSaveScores}
                              className="px-3 py-1.5 bg-[#2dd4bf] text-white text-xs rounded-lg hover:bg-[#14b8a6] transition-colors"
                            >
                              保存成绩
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditMode(true)}
                            className="px-3 py-1.5 bg-[#2dd4bf]/10 text-[#2dd4bf] text-xs rounded-lg hover:bg-[#2dd4bf]/20 transition-colors"
                          >
                            编辑成绩
                          </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                      {SUBJECTS.map((subject) => {
                        const current = selectedExamScores.find((s) => s.subject === subject);
                        if (!current) return null;
                        const prev = prevExamScores.find((s) => s.subject === subject);
                        const diff = prev ? current.score - prev.score : null;
                        const fullScore = getFullScore(subject);
                        const rate = Math.round((current.score / fullScore) * 100);
                        return (
                          <div key={subject} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">{subject}</span>
                              {diff !== null && diff !== undefined && (
                                <span
                                  className={`text-xs font-medium ${
                                    diff > 0
                                      ? 'text-emerald-600'
                                      : diff < 0
                                      ? 'text-red-500'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : '→ 持平'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">满分 {fullScore}</span>
                              {editMode ? (
                                <input
                                  type="number"
                                  value={scoreDrafts[subject] ?? current.score}
                                  onChange={(e) =>
                                    setScoreDrafts((prev) => ({
                                      ...prev,
                                      [subject]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:border-[#2dd4bf]/50"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-900">{current.score} 分</span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                rate >= 85 ? 'bg-emerald-50 text-emerald-600' :
                                rate >= 60 ? 'bg-amber-50 text-amber-600' :
                                'bg-red-50 text-red-500'
                              }`}>
                                {rate}%
                              </span>
                              {current.subjectRank > 0 && (
                                <span className="text-xs text-gray-400">班内第 {current.subjectRank} 名</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">学生备注</h4>
                  <span className="text-xs text-gray-400">{remarkDraft.length} 字</span>
                </div>
                <textarea
                  value={remarkDraft}
                  onChange={(e) => setRemarkDraft(e.target.value)}
                  placeholder="输入对该学生的备注，如学习状态、家长沟通要点、需要关注的事项等..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50 focus:ring-2 focus:ring-[#2dd4bf]/10 resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setRemarkDraft('')}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    重置
                  </button>
                  <button
                    onClick={handleSaveRemark}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#2dd4bf] text-white text-xs rounded-lg hover:bg-[#14b8a6] transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    保存备注
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => navigate(`/student/${selectedStudent.id}`)}
                className="px-4 py-2 text-sm text-[#2dd4bf] border border-[#2dd4bf]/30 rounded-lg hover:bg-[#2dd4bf]/5 transition-colors"
              >
                查看完整档案
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">添加学生</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">姓名</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="请输入学生姓名"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">学号</label>
                <input
                  type="text"
                  value={addStudentNo}
                  onChange={(e) => setAddStudentNo(e.target.value)}
                  placeholder="请输入学号"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">班级</label>
                <input
                  type="text"
                  value={activeClass}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAddStudent}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#2dd4bf] text-white text-sm hover:bg-[#14b8a6] transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
