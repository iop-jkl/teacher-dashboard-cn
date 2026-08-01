import * as XLSX from 'xlsx';
import type { Student, Score, ExamTrendPoint } from '@/types';

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'] as const;
const SCORE_FIELDS = ['分数', 'score', 'Score', '成绩'];
const RANK_FIELDS = ['排名', 'rank', 'Rank', '班级排名', 'classRank'];
const STUDENT_NO_FIELDS = ['学号', 'studentNo', 'StudentNo', '准考证号'];
const NAME_FIELDS = ['姓名', 'name', 'Name', '学生姓名'];
const TOTAL_FIELDS = ['总分', 'totalScore', 'TotalScore', 'total', '合计'];

export interface ComputedRanking {
  studentId: string;
  studentNo: string;
  name: string;
  totalScore: number;
  rank: number;
}

export interface ImportResult {
  students: Student[];
  scores: Score[];
  studentScoreTrend: Record<string, ExamTrendPoint[]>;
  examTrendData: ExamTrendPoint[];
  computedRankings: ComputedRanking[];
  examName: string;
  warnings: string[];
}

function getField(row: Record<string, any>, fields: string[]): any {
  for (const f of fields) {
    const key = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === f.trim().toLowerCase()
    );
    if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return undefined;
}

function hasField(row: Record<string, any>, fields: string[]): boolean {
  return getField(row, fields) !== undefined;
}

function normalizeStudentRow(row: Record<string, any>): Student | null {
  const name = String(getField(row, NAME_FIELDS) || '');
  const studentNo = String(getField(row, STUDENT_NO_FIELDS) || '');
  if (!name || !studentNo) return null;

  const totalScore = Number(getField(row, TOTAL_FIELDS) || 0);
  const rank = Number(getField(row, RANK_FIELDS) || 0);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendValue = 0;
  const rawTrend = getField(row, ['趋势', 'trend', 'Trend']);
  if (rawTrend !== undefined && rawTrend !== null) {
    const num = Number(rawTrend);
    if (num > 0) { trend = 'up'; trendValue = num; }
    else if (num < 0) { trend = 'down'; trendValue = num; }
  }

  return {
    id: studentNo,
    name,
    studentNo,
    className: String(getField(row, ['班级', 'className']) || '高一(3)班'),
    avatar: '',
    totalScore: totalScore || 0,
    rank: rank || 0,
    trend,
    trendValue,
  };
}

function parseScoreSheet(
  sheet: XLSX.WorkSheet,
  examName: string,
  examDate: string,
  studentIdMap: Map<string, string>
): {
  scores: Score[];
  studentTrends: Record<string, ExamTrendPoint[]>;
  examTrendPoint: ExamTrendPoint | null;
  computedRankings: ComputedRanking[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (data.length === 0) {
    warnings.push(`工作表"${examName}"为空`);
    return { scores: [], studentTrends: {}, examTrendPoint: null, computedRankings: [], warnings };
  }

  const firstRow = data[0] as Record<string, any>;
  const firstRowKeys = Object.keys(firstRow);

  const subjectColumns: string[] = [];
  for (const subject of SUBJECTS) {
    const key = firstRowKeys.find(
      (k) => k.trim().toLowerCase() === subject.trim().toLowerCase()
    );
    if (key) {
      const val = Number(firstRow[key]);
      if (!isNaN(val) || key === subject) {
        subjectColumns.push(subject);
      }
    }
  }

  const hasSubjectAndScore = SUBJECTS.some((s) =>
    firstRowKeys.some((k) => k.trim().toLowerCase() === s.trim().toLowerCase())
  );

  const isWideFormat = hasSubjectAndScore || subjectColumns.length > 0;
  const isLongFormat = !isWideFormat && hasField(firstRow, ['学科', 'subject', '学科名称']);

  if (!isWideFormat && !isLongFormat) {
    warnings.push(`工作表"${examName}"无法识别为成绩表格式`);
    return { scores: [], studentTrends: {}, examTrendPoint: null, computedRankings: [], warnings };
  }

  const scores: Score[] = [];
  const studentTrends: Record<string, ExamTrendPoint[]> = {};
  const trendPoint: ExamTrendPoint = {
    examName,
    date: examDate.slice(5),
  };

  const studentTotals = new Map<string, { studentNo: string; name: string; total: number; subjects: Record<string, number> }>();

  if (isWideFormat) {
    for (const row of data) {
      const r = row as Record<string, any>;
      const studentNo = String(getField(r, STUDENT_NO_FIELDS) || '');
      const studentName = String(getField(r, NAME_FIELDS) || '');
      if (!studentNo) continue;

      let studentId = studentIdMap.get(studentNo) || studentNo;

      let totalScore = 0;
      const subjectsMap: Record<string, number> = {};

      for (const subject of SUBJECTS) {
        const subjectKey = Object.keys(r).find(
          (k) => k.trim().toLowerCase() === subject.trim().toLowerCase()
        );
        if (subjectKey) {
          const score = Number(r[subjectKey]);
          if (!isNaN(score) && score >= 0) {
            scores.push({
              id: `${examName}-${studentId}-${subject}`,
              studentId,
              examId: examName,
              subject,
              score,
              classRank: Number(getField(r, RANK_FIELDS) || 0),
              totalStudents: 45,
            });

            totalScore += score;
            subjectsMap[subject] = score;

            if (!trendPoint[subject] || score > (trendPoint[subject] as number)) {
              trendPoint[subject] = score;
            }
          }
        }
      }

      if (totalScore > 0) {
        studentTotals.set(studentId, {
          studentNo,
          name: studentName || `学生${studentNo}`,
          total: totalScore,
          subjects: subjectsMap,
        });
      }
    }
  } else {
    for (const row of data) {
      const r = row as Record<string, any>;
      const studentNo = String(getField(r, STUDENT_NO_FIELDS) || '');
      const subject = String(getField(r, ['学科', 'subject']) || '');
      const score = Number(getField(r, SCORE_FIELDS) || 0);
      if (!studentNo || !subject || !SUBJECTS.includes(subject as any) || score <= 0) continue;

      let studentId = studentIdMap.get(studentNo) || studentNo;

      scores.push({
        id: `${examName}-${studentId}-${subject}`,
        studentId,
        examId: examName,
        subject,
        score,
        classRank: Number(getField(r, RANK_FIELDS) || 0),
        totalStudents: 45,
      });

      if (!trendPoint[subject]) {
        trendPoint[subject] = score;
      }

      if (!studentTotals.has(studentId)) {
        const name = String(getField(r, NAME_FIELDS) || `学生${studentNo}`);
        studentTotals.set(studentId, { studentNo, name, total: 0, subjects: {} });
      }
      const entry = studentTotals.get(studentId)!;
      entry.total += score;
      entry.subjects[subject] = score;
    }
  }

  const computedRankings: ComputedRanking[] = [];
  const sortedStudents = Array.from(studentTotals.entries())
    .sort((a, b) => b[1].total - a[1].total);

  sortedStudents.forEach(([studentId, data], idx) => {
    const rank = idx + 1;
    computedRankings.push({
      studentId,
      studentNo: data.studentNo,
      name: data.name,
      totalScore: data.total,
      rank,
    });

    const trend: ExamTrendPoint = {
      examName,
      date: examDate.slice(5),
      ...data.subjects,
    };

    if (!studentTrends[studentId]) {
      studentTrends[studentId] = [];
    }
    studentTrends[studentId].push(trend);
  });

  const examTrendPoint = Object.keys(trendPoint).length > 2 ? trendPoint : null;

  return { scores, studentTrends, examTrendPoint, computedRankings, warnings };
}

export async function parseExcelFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const warnings: string[] = [];

  const students: Student[] = [];
  const scores: Score[] = [];
  const studentScoreTrend: Record<string, ExamTrendPoint[]> = {};
  const examTrendData: ExamTrendPoint[] = [];
  const allComputedRankings: ComputedRanking[] = [];
  let examName = '';

  const studentIdMap = new Map<string, string>();

  const studentSheetNames = workbook.SheetNames.filter((n) =>
    n.includes('学生') || n.includes('名单') || n.toLowerCase().includes('student')
  );

  if (studentSheetNames.length > 0) {
    for (const sheetName of studentSheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      for (const row of data) {
        const student = normalizeStudentRow(row as Record<string, any>);
        if (student) {
          students.push(student);
          studentIdMap.set(student.studentNo, student.id);
        }
      }
    }
  }

  const examSheetNames = workbook.SheetNames.filter(
    (n) => !studentSheetNames.includes(n)
  );

  if (examSheetNames.length === 0) {
    warnings.push('未找到考试成绩工作表');
  }

  for (const sheetName of examSheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const result = parseScoreSheet(sheet, sheetName, new Date().toISOString().split('T')[0], studentIdMap);

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }

    if (result.scores.length > 0) {
      if (!examName) {
        examName = sheetName;
      }
      scores.push(...result.scores);

      for (const [sid, trends] of Object.entries(result.studentTrends)) {
        if (!studentScoreTrend[sid]) {
          studentScoreTrend[sid] = [];
        }
        studentScoreTrend[sid].push(...trends);
      }

      if (result.examTrendPoint) {
        examTrendData.push(result.examTrendPoint);
      }

      allComputedRankings.push(...result.computedRankings);
    }
  }

  if (students.length === 0 && allComputedRankings.length > 0) {
    for (const ranking of allComputedRankings) {
      students.push({
        id: ranking.studentId,
        name: ranking.name,
        studentNo: ranking.studentNo,
        className: '高一(3)班',
        avatar: '',
        totalScore: ranking.totalScore,
        rank: ranking.rank,
        trend: 'stable',
        trendValue: 0,
      });
    }
    warnings.push('未找到学生名单，已从成绩数据自动生成学生记录');
  }

  if (allComputedRankings.length > 0) {
    const sorted = [...allComputedRankings].sort((a, b) => a.totalScore - b.totalScore);
    let currentRank = 1;
    let prevScore = -1;
    for (const r of sorted) {
      if (prevScore !== r.totalScore) {
        currentRank = sorted.filter((x) => x.totalScore > r.totalScore).length + 1;
      }
      prevScore = r.totalScore;

      const student = students.find((s) => s.studentNo === r.studentNo || s.id === r.studentId);
      if (student) {
        student.totalScore = r.totalScore;
        student.rank = currentRank;
      }
    }
  }

  return {
    students,
    scores,
    studentScoreTrend,
    examTrendData,
    computedRankings: allComputedRankings,
    examName,
    warnings,
  };
}

export function generateTemplateExcel(): Blob {
  const wb = XLSX.utils.book_new();

  const studentData = [
    { 学号: '2026001', 姓名: '陈思远', 班级: '高一(3)班', 排名: 1, 趋势: 12 },
    { 学号: '2026002', 姓名: '林晓晴', 班级: '高一(3)班', 排名: 2, 趋势: 8 },
    { 学号: '2026003', 姓名: '王浩然', 班级: '高一(3)班', 排名: 3, 趋势: 0 },
    { 学号: '2026004', 姓名: '赵雨桐', 班级: '高一(3)班', 排名: 4, 趋势: 6 },
    { 学号: '2026005', 姓名: '刘思琪', 班级: '高一(3)班', 排名: 5, 趋势: -4 },
  ];
  const studentSheet = XLSX.utils.json_to_sheet(studentData);
  XLSX.utils.book_append_sheet(wb, studentSheet, '学生名单');

  const scoreData = [
    { 学号: '2026001', 姓名: '陈思远', 语文: 95, 数学: 100, 英语: 92, 物理: 94, 化学: 95, 生物: 98 },
    { 学号: '2026002', 姓名: '林晓晴', 语文: 91, 数学: 95, 英语: 89, 物理: 87, 化学: 90, 生物: 93 },
    { 学号: '2026003', 姓名: '王浩然', 语文: 86, 数学: 91, 英语: 83, 物理: 89, 化学: 85, 生物: 87 },
    { 学号: '2026004', 姓名: '赵雨桐', 语文: 88, 数学: 93, 英语: 85, 物理: 86, 化学: 88, 生物: 91 },
    { 学号: '2026005', 姓名: '刘思琪', 语文: 84, 数学: 90, 英语: 87, 物理: 83, 化学: 86, 生物: 88 },
  ];
  const scoreSheet = XLSX.utils.json_to_sheet(scoreData);
  XLSX.utils.book_append_sheet(wb, scoreSheet, '月考三');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
