import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface ExcelExportButtonProps {
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function ExcelExportButton({
  label = '导出Excel',
  className,
  variant = 'secondary',
}: ExcelExportButtonProps) {
  const students = useStore((s) => s.students);
  const scores = useStore((s) => s.scores);
  const exams = useStore((s) => s.exams);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    const studentRows = students.map((s) => ({
      身份证号: s.idCard,
      姓名: s.name,
      班级: s.classNo,
      选科: s.selectedSubjects.join('、'),
      父亲姓名: s.fatherName,
      父亲电话: s.fatherPhone,
      父亲微信: s.fatherWechat,
      母亲姓名: s.motherName,
      母亲电话: s.motherPhone,
      母亲微信: s.motherWechat,
      备注: s.remark,
    }));
    const studentSheet = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, studentSheet, '学生名单');

    const examNameById = new Map(exams.map((e) => [e.id, e.name]));
    const studentNameById = new Map(students.map((s) => [s.idCard, s.name]));
    const scoreRows = scores.map((s) => ({
      考试: examNameById.get(s.examId) || s.examId,
      身份证号: s.studentId,
      姓名: studentNameById.get(s.studentId) || '',
      科目: s.subject,
      原始分: s.rawScore ?? '',
      赋分: s.assignedScore ?? '',
      班级排名: s.classRank || '',
      学校排名: s.schoolRank || '',
    }));
    const scoreSheet = XLSX.utils.json_to_sheet(scoreRows);
    XLSX.utils.book_append_sheet(wb, scoreSheet, '成绩明细');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const url = URL.createObjectURL(
      new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = '班主任工作台-数据备份.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        variant === 'primary'
          ? 'bg-[#1e3a5f] text-white hover:bg-[#162c48]'
          : 'border border-gray-200 text-gray-700 hover:bg-gray-50',
        className,
      )}
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
