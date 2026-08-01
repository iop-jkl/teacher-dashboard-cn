import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Menu, UserPlus, Trash2, Eye, X, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import ExcelImportButton from '@/components/ExcelImportButton';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';
import { getFullScore } from '@/data/mockData';
import type { Student } from '@/types';

type FilterType = 'all' | 'improve' | 'decline' | 'stable';

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];

export default function StudentsPage() {
  const { sidebarOpen, openSidebar, closeSidebar, students, scores, removeStudent, updateStudent } = useStore();
  const showToast = useToastStore((s) => s.showToast);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');

  const filteredStudents = useMemo(() => {
    let result = students;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.studentNo.includes(query)
      );
    }

    if (activeFilter !== 'all') {
      result = result.filter((s) => {
        if (activeFilter === 'improve') return s.trend === 'up';
        if (activeFilter === 'decline') return s.trend === 'down';
        if (activeFilter === 'stable') return s.trend === 'stable';
        return true;
      });
    }

    return result;
  }, [students, searchQuery, activeFilter]);

  const studentScores = useMemo(() => {
    if (!selectedStudent) return [];
    return scores.filter((s) => s.studentId === selectedStudent.id);
  }, [scores, selectedStudent]);

  const handleDeleteStudent = (id: string) => {
    removeStudent(id);
    showToast('学生已删除', 'info');
  };

  const handleAddStudent = () => {
    showToast('添加学生功能：请通过 Excel 导入', 'info');
  };

  const handleOpenStudent = (student: Student) => {
    setSelectedStudent(student);
    setRemarkDraft(student.remark || '');
  };

  const handleSaveRemark = () => {
    if (selectedStudent) {
      updateStudent(selectedStudent.id, { remark: remarkDraft });
      setSelectedStudent({ ...selectedStudent, remark: remarkDraft });
      showToast('备注已保存', 'success');
    }
  };

  const filterCounts = useMemo(() => ({
    all: students.length,
    improve: students.filter((s) => s.trend === 'up').length,
    decline: students.filter((s) => s.trend === 'down').length,
    stable: students.filter((s) => s.trend === 'stable').length,
  }), [students]);

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
                <p className="text-xs text-gray-500 mt-0.5">高一(3)班 · 共 {students.length} 名学生</p>
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
            <div className="flex items-center gap-3 flex-wrap">
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
              <div className="flex items-center gap-1">
                <Filter className="w-4 h-4 text-gray-400 mr-1" />
                {([
                  { key: 'all' as const, label: '全部', count: filterCounts.all },
                  { key: 'improve' as const, label: '进步', count: filterCounts.improve },
                  { key: 'decline' as const, label: '退步', count: filterCounts.decline },
                  { key: 'stable' as const, label: '稳定', count: filterCounts.stable },
                ]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                      activeFilter === f.key
                        ? 'bg-[#2dd4bf]/10 text-[#2dd4bf] font-medium'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {f.label}
                    <span className="ml-1 text-gray-400">({f.count})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="hidden lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总分</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">趋势</th>
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
                      <td className="px-5 py-3 text-sm text-gray-600">{student.className}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{student.totalScore}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">第 {student.rank} 名</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          student.trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
                          student.trend === 'down' ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {student.trend === 'up' ? `↑ +${student.trendValue}` :
                           student.trend === 'down' ? `↓ ${student.trendValue}` :
                           '→ 稳定'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenStudent(student)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#2dd4bf] transition-colors"
                            title="查看详情"
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{student.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                        student.trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
                        student.trend === 'down' ? 'bg-red-50 text-red-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {student.trend === 'up' ? `+${student.trendValue}` :
                         student.trend === 'down' ? student.trendValue : '稳定'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {student.studentNo} · 总分 {student.totalScore}
                    </p>
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
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
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
                    {selectedStudent.studentNo} · {selectedStudent.className}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">总分</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStudent.totalScore}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">排名</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">第 {selectedStudent.rank} 名</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">趋势</p>
                  <div className="flex items-center justify-center mt-1">
                    {selectedStudent.trend === 'up' ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">+{selectedStudent.trendValue}</span>
                      </span>
                    ) : selectedStudent.trend === 'down' ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm font-medium">{selectedStudent.trendValue}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Minus className="w-4 h-4" />
                        <span className="text-sm font-medium">稳定</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">各科成绩</h4>
                {studentScores.length > 0 ? (
                  <div className="space-y-2">
                    {SUBJECTS.map((subject) => {
                      const scoreEntries = studentScores.filter((s) => s.subject === subject);
                      const latest = scoreEntries[scoreEntries.length - 1];
                      if (!latest) return null;
                      const fullScore = getFullScore(subject);
                      const rate = Math.round((latest.score / fullScore) * 100);
                      return (
                        <div key={subject} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{subject}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">满分 {fullScore}</span>
                            <span className="text-sm font-medium text-gray-900">{latest.score} 分</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              rate >= 85 ? 'bg-emerald-50 text-emerald-600' :
                              rate >= 60 ? 'bg-amber-50 text-amber-600' :
                              'bg-red-50 text-red-500'
                            }`}>
                              {rate}%
                            </span>
                            {latest.classRank > 0 && (
                              <span className="text-xs text-gray-400">第 {latest.classRank} 名</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-gray-400">
                    暂无成绩数据，请通过 Excel 导入考试成绩
                  </div>
                )}
              </div>

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
                    onClick={() => setRemarkDraft(selectedStudent.remark || '')}
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
    </div>
  );
}
