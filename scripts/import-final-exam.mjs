import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const EXCEL_PATH = process.env.XLS_PATH;
if (!EXCEL_PATH) {
  console.error('请先设置环境变量 XLS_PATH 指向期末考试.xls');
  process.exit(1);
}

const EXAM_ID = 'exam-2026-final';
const EXAM_NAME = '期末考试';
const EXAM_DATE = '2026-08-02';

const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
const data = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));

const SUBJECTS = ['语文', '数学', '英语', '政治', '历史', '地理', '物理', '化学', '生物'];
// 选考科目：列序 [政, 历, 地, 物, 化, 生] 对应的科目名
const SELECTABLE = ['政治', '历史', '地理', '物理', '化学', '生物'];
const FLAG_OFFSETS = [3, 4, 5, 6, 7, 8];
// 每科在 Excel 中的 [原始分, 赋分, 校名次] 列
const SUBJECT_COLS = {
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

function num(v) {
  const n = Number(v);
  return v === '' || v === undefined || v === null || Number.isNaN(n) ? null : n;
}

const students = [];
const scoreRows = [];

for (const r of data) {
  const idCard = String(r[0]).trim();
  const name = String(r[2]).trim();
  const classNo = Number(r[1]);
  const selected = SELECTABLE.filter(
    (_, i) => Number(r[FLAG_OFFSETS[i]] || 0) === 1,
  );

  students.push({
    id_card: idCard,
    name,
    class_no: classNo,
    selected_subjects: selected,
    father_name: '',
    father_phone: '',
    father_wechat: '',
    mother_name: '',
    mother_phone: '',
    mother_wechat: '',
    remark: '',
  });

  for (const subject of ['语文', '数学', '英语']) {
    const [rawCol, , rankCol] = SUBJECT_COLS[subject];
    scoreRows.push({
      student_id: idCard,
      exam_id: EXAM_ID,
      subject,
      raw_score: num(r[rawCol]),
      assigned_score: null,
      school_rank: num(r[rankCol]) ?? 0,
      class_rank: 0,
    });
  }

  for (const subject of selected) {
    const [rawCol, assignedCol, rankCol] = SUBJECT_COLS[subject];
    scoreRows.push({
      student_id: idCard,
      exam_id: EXAM_ID,
      subject,
      raw_score: num(r[rawCol]),
      assigned_score: num(r[assignedCol]),
      school_rank: num(r[rankCol]) ?? 0,
      class_rank: 0,
    });
  }

  scoreRows.push({
    student_id: idCard,
    exam_id: EXAM_ID,
    subject: '总分',
    raw_score: null,
    assigned_score: num(r[9]),
    school_rank: num(r[10]) ?? 0,
    class_rank: 0,
  });
}

// 班内排名：同分同名次（标准竞赛排名）
function assignRanks(entries) {
  const sorted = [...entries].sort(
    (a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity),
  );
  const rankMap = new Map();
  let prevScore;
  let prevRank = 0;
  sorted.forEach((entry, idx) => {
    const rank =
      idx > 0 && entry.score === prevScore ? prevRank : idx + 1;
    rankMap.set(entry.studentId, rank);
    prevScore = entry.score;
    prevRank = rank;
  });
  return rankMap;
}

const rankKey = (subject, useAssigned) =>
  scoreRows
    .filter((s) => s.subject === subject)
    .map((s) => ({
      studentId: s.student_id,
      classNo: students.find((st) => st.id_card === s.student_id)?.class_no,
      score: useAssigned ? s.assigned_score : s.raw_score,
    }))
    .filter((e) => e.classNo !== undefined && e.score !== null);

const rankGroups = new Map();
for (const subject of SUBJECTS) {
  const useAssigned = subject !== '语文' && subject !== '数学' && subject !== '英语';
  const key = `${subject}|${useAssigned}`;
  for (const entry of rankKey(subject, useAssigned)) {
    const groupKey = `${key}|${entry.classNo}`;
    if (!rankGroups.has(groupKey)) rankGroups.set(groupKey, []);
    rankGroups.get(groupKey).push(entry);
  }
}
const totalRankGroup = `${'总分'}|true`;
for (const entry of rankKey('总分', true)) {
  const groupKey = `${totalRankGroup}|${entry.classNo}`;
  if (!rankGroups.has(groupKey)) rankGroups.set(groupKey, []);
  rankGroups.get(groupKey).push(entry);
}

for (const [groupKey, entries] of rankGroups) {
  const rankMap = assignRanks(entries);
  const [subject, , classNoStr] = groupKey.split('|');
  const classNo = Number(classNoStr);
  for (const s of scoreRows) {
    if (s.subject === subject && s.student_id && students.find((st) => st.id_card === s.student_id)?.class_no === classNo) {
      const rank = rankMap.get(s.student_id);
      if (rank !== undefined) s.class_rank = rank;
    }
  }
}

const classTeachers = Array.from({ length: 80 }, (_, i) => ({
  class_no: i + 1,
  teacher_name: '',
  password: '111',
}));

const outDir = join(process.cwd(), '.import-data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'students.json'), JSON.stringify(students));
writeFileSync(
  join(outDir, 'exams.json'),
  JSON.stringify([{ id: EXAM_ID, name: EXAM_NAME, date: EXAM_DATE }]),
);
writeFileSync(join(outDir, 'scores.json'), JSON.stringify(scoreRows));
writeFileSync(join(outDir, 'class_teachers.json'), JSON.stringify(classTeachers));

console.log('students:', students.length);
console.log('score rows:', scoreRows.length);
console.log('classes:', new Set(students.map((s) => s.class_no)).size);
console.log('selected subjects count:', students.reduce((n, s) => n + s.selected_subjects.length, 0));
const sample = scoreRows.find((s) => s.subject === '总分' && s.class_rank === 1);
console.log('sample total rank1:', JSON.stringify(sample));
