import * as XLSX from 'xlsx';
import type { Score, Student } from '@/types';

export interface ParsedExamImport {
  examName: string;
  students: Student[];
  scores: Score[];
  warnings: string[];
}

const SELECTABLE = ['政治', '历史', '地理', '物理', '化学', '生物'];
const FLAG_OFFSETS = [3, 4, 5, 6, 7, 8];
const SUBJECT_COLS: Record<string, [number, number | null, number]> = {
  语文: [11, null, 12],
  数学: [13, null, 14],
  英语: [15, null, 16],
  政治: [17, 18, 19],
  历史: [20, 21, 22],
  地理: [23, 24, 25],
  物理: [26, 27, 28],
  化学: [29, 30, 31],
  生物: [32, 33, 34],
};

function num(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function assignRanks(
  entries: { id: string; score: number | null }[],
): Map<string, number> {
  const sorted = [...entries]
    .filter((e) => e.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number));
  const map = new Map<string, number>();
  let prevScore: number | null = null;
  let prevRank = 0;
  sorted.forEach((entry, idx) => {
    const rank = idx > 0 && entry.score === prevScore ? prevRank : idx + 1;
    map.set(entry.id, rank);
    prevScore = entry.score;
    prevRank = rank;
  });
  return map;
}

export async function parseExamFile(file: File): Promise<ParsedExamImport> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    raw: true,
  });
  const data = rows
    .slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ''));

  const students: Student[] = [];
  const scoreRows: Score[] = [];
  const warnings: string[] = [];
  const classSet = new Set<number>();

  for (const r of data) {
    const idCard = String(r[0] ?? '').trim();
    const name = String(r[2] ?? '').trim();
    const classNo = Number(r[1]);
    if (!idCard || !name) {
      warnings.push(`第 ${data.indexOf(r) + 2} 行缺少姓名或身份证号，已跳过`);
      continue;
    }
    classSet.add(classNo);
    const selected = SELECTABLE.filter(
      (_, i) => Number(r[FLAG_OFFSETS[i]] || 0) === 1,
    );

    students.push({
      idCard,
      name,
      classNo,
      selectedSubjects: selected,
      fatherName: '',
      fatherPhone: '',
      fatherWechat: '',
      motherName: '',
      motherPhone: '',
      motherWechat: '',
      remark: '',
    });

    for (const subject of ['语文', '数学', '英语']) {
      const [rawCol, , rankCol] = SUBJECT_COLS[subject];
      scoreRows.push({
        studentId: idCard,
        examId: '',
        subject,
        rawScore: num(r[rawCol]),
        assignedScore: null,
        schoolRank: num(r[rankCol]) ?? 0,
        classRank: 0,
      });
    }

    for (const subject of selected) {
      const [rawCol, assignedCol, rankCol] = SUBJECT_COLS[subject];
      scoreRows.push({
        studentId: idCard,
        examId: '',
        subject,
        rawScore: num(r[rawCol]),
        assignedScore: num(r[assignedCol]),
        schoolRank: num(r[rankCol]) ?? 0,
        classRank: 0,
      });
    }

    scoreRows.push({
      studentId: idCard,
      examId: '',
      subject: '总分',
      rawScore: num(r[9]),
      assignedScore: null,
      schoolRank: num(r[10]) ?? 0,
      classRank: 0,
    });
  }

  // 计算班内排名：总分按 raw_score，选考科目按赋分，语数英按原始分
  const rankGroups = new Map<string, { id: string; score: number | null }[]>();
  const studentById = new Map(students.map((s) => [s.idCard, s]));
  for (const s of scoreRows) {
    const useAssigned = s.assignedScore !== null;
    const value = useAssigned ? s.assignedScore : s.rawScore;
    const student = studentById.get(s.studentId);
    if (!student) continue;
    const key = `${s.subject}|${student.classNo}`;
    if (!rankGroups.has(key)) rankGroups.set(key, []);
    rankGroups.get(key)!.push({ id: s.studentId, score: value });
  }

  for (const [key, entries] of rankGroups) {
    const rankMap = assignRanks(entries);
    const subject = key.split('|')[0];
    for (const s of scoreRows) {
      if (s.subject === subject) {
        const rank = rankMap.get(s.studentId);
        if (rank !== undefined) s.classRank = rank;
      }
    }
  }

  const examName = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
  return { examName, students, scores: scoreRows, warnings };
}
