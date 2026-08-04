import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ============================================================
// 导入三场考试：
//   1. 高一上期中  2025-11-30  (25年11月高一上其中考试.xls)
//   2. 高一上期末  2026-02-28  (26年2月高一上期末考试.xlsx)
//   3. 高一下期中  2026-04-30  (26年4月高一下期中考试.xls)
// 规则：
//   - 选科以高一下期中表（zz/ls/dl/wl/hx/sw 标记）为准
//   - 高一上只记录 语数英 + 所选3科 = 6科（无赋分）
//   - 高一上总分按6科原始分重算，总分校名次按6科重算，班级排名重算
//   - 学生名单 = 现有名单 ∪ 高一下名单（新增学生补入，家长信息保留）
// ============================================================

const BASE = 'D:/Trae/Teacher';
const DESKTOP = 'C:/Users/lenovo/Desktop';
const OUT_DIR = join(BASE, '.import-data');

const EXAM = {
  mid1: { id: 'exam-2025-mid1', name: '高一上期中', date: '2025-11-30' },
  final1: { id: 'exam-2026-final1', name: '高一上期末', date: '2026-02-28' },
  mid2: { id: 'exam-2026-mid1', name: '高一下期中', date: '2026-04-30' },
};

const COMPULSORY = ['语文', '数学', '英语'];
const SELECTABLE = ['政治', '历史', '地理', '物理', '化学', '生物'];
// 高一下表中 [zz, ls, dl, wl, hx, sw] 列位置（0-based）
const MID2_FLAG_COLS = [5, 6, 7, 8, 9, 10];
// 高一下表各科列：科目 -> [原始分, 赋分, 校名次]
const MID2_SUBJECT_COLS = {
  语文: [15, null, 16],
  数学: [17, null, 18],
  英语: [19, null, 20],
  政治: [21, 22, 23],
  历史: [24, 25, 26],
  地理: [27, 28, 29],
  物理: [30, 31, 32],
  化学: [33, 34, 35],
  生物: [36, 37, 38],
};
const MID2_TOTAL = [12, 13]; // 总分, 总分校名次

// 高一上期中（25年11月）各科列：科目 -> [原始分, 校名次]
// 表头顺序：语文(8) 数学(10) 英语(12) 物理(14) 化学(16) 生物(18) 政治(20) 历史(22) 地理(24)
const MID1_SUBJECT_COLS = {
  语文: [8, 9],
  数学: [10, 11],
  英语: [12, 13],
  物理: [14, 15],
  化学: [16, 17],
  生物: [18, 19],
  政治: [20, 21],
  历史: [22, 23],
  地理: [24, 25],
};

// 高一上期末（26年2月）各科列：科目 -> [原始分, 校名次]
// 表头顺序：语文(8) 数学(10) 英语(12) 政治(14) 历史(16) 地理(18) 物理(20) 化学(22) 生物(24)
const FINAL1_SUBJECT_COLS = {
  语文: [8, 9],
  数学: [10, 11],
  英语: [12, 13],
  政治: [14, 15],
  历史: [16, 17],
  地理: [18, 19],
  物理: [20, 21],
  化学: [22, 23],
  生物: [24, 25],
};

function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function loadSheet(file) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  return rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
}

// 标准竞赛排名（同分同名次）
function assignRanks(entries) {
  const sorted = [...entries]
    .filter((e) => e.score !== null && e.score !== undefined)
    .sort((a, b) => b.score - a.score);
  const map = new Map();
  let prevScore = null;
  let prevRank = 0;
  sorted.forEach((entry, idx) => {
    const rank = idx > 0 && entry.score === prevScore ? prevRank : idx + 1;
    map.set(entry.id, rank);
    prevScore = entry.score;
    prevRank = rank;
  });
  return map;
}

// ============ 1. 读取高一下期中表，确定学生名单与选科 ============
const mid2Rows = loadSheet(`${DESKTOP}/26年4月高一下期中考试.xls`);
console.log('高一下期中 rows:', mid2Rows.length);

const mid2Student = new Map(); // id_card -> {name, classNo, selected[]}
for (const r of mid2Rows) {
  const idCard = String(r[0]).trim();
  if (!idCard) continue;
  const selected = SELECTABLE.filter((_, i) => Number(r[MID2_FLAG_COLS[i]] || 0) === 1);
  mid2Student.set(idCard, {
    name: String(r[4]).trim(),
    classNo: Number(r[3]),
    selected,
  });
}
console.log('高一下学生数:', mid2Student.size);

// 现有名单（保留家长信息）
const existing = JSON.parse(readFileSync(join(OUT_DIR, 'students.json'), 'utf8'));
const existingByCard = new Map(existing.map((s) => [s.id_card, s]));
console.log('现有学生数:', existing.length);

// 合并名单：现有 ∪ 高一下，选科/班级以高一下为准
const finalStudents = [];
const seen = new Set();
for (const s of existing) {
  const m = mid2Student.get(s.id_card);
  finalStudents.push({
    id_card: s.id_card,
    name: m ? m.name : s.name,
    class_no: m ? m.classNo : s.class_no,
    selected_subjects: m ? m.selected : s.selected_subjects,
    father_name: s.father_name || '',
    father_phone: s.father_phone || '',
    father_wechat: s.father_wechat || '',
    mother_name: s.mother_name || '',
    mother_phone: s.mother_phone || '',
    mother_wechat: s.mother_wechat || '',
    remark: s.remark || '',
  });
  seen.add(s.id_card);
}
for (const [idCard, m] of mid2Student) {
  if (!seen.has(idCard)) {
    finalStudents.push({
      id_card: idCard,
      name: m.name,
      class_no: m.classNo,
      selected_subjects: m.selected,
      father_name: '',
      father_phone: '',
      father_wechat: '',
      mother_name: '',
      mother_phone: '',
      mother_wechat: '',
      remark: '',
    });
  }
}
const studentById = new Map(finalStudents.map((s) => [s.id_card, s]));
console.log('合并后学生数:', finalStudents.length);

// ============ 2. 通用：生成某场高一上考试的成绩 ============
// file: Excel 路径；exam: 考试对象；subjectCols: 科目列映射；totalCols: [总分列, 总分校名次列]
function buildUpperExam(file, exam, subjectCols) {
  const rows = loadSheet(file);
  const scores = [];
  const totalById = new Map();
  const classById = new Map();
  for (const r of rows) {
    const idCard = String(r[0]).trim();
    if (!idCard) continue;
    const stu = studentById.get(idCard);
    if (!stu) continue; // 不在名单（转学/休学）跳过
    const classNo = stu.class_no;
    const selected = stu.selected_subjects;
    let sum = 0;
    for (const subject of [...COMPULSORY, ...selected]) {
      const [rawCol, rankCol] = subjectCols[subject];
      const raw = num(r[rawCol]);
      scores.push({
        student_id: idCard,
        exam_id: exam.id,
        subject,
        raw_score: raw,
        assigned_score: null,
        school_rank: num(r[rankCol]) ?? 0,
        class_rank: 0,
      });
      if (raw !== null) sum += raw;
    }
    totalById.set(idCard, sum);
    classById.set(idCard, classNo);
  }
  // 总分行 + 按6科重算全校名次
  const totalEntries = [];
  for (const [id, total] of totalById) {
    totalEntries.push({ id, score: total });
  }
  const totalRankMap = assignRanks(totalEntries);
  for (const [id, total] of totalById) {
    scores.push({
      student_id: id,
      exam_id: exam.id,
      subject: '总分',
      raw_score: total,
      assigned_score: null,
      school_rank: totalRankMap.get(id) ?? 0,
      class_rank: 0,
    });
  }
  // 班级排名：总分按 raw，语数英按 raw，选科按 raw（高一上无赋分）
  recomputeClassRanks(scores, classById);
  return scores;
}

// ============ 3. 高一下期中成绩 ============
function buildMid2Exam() {
  const scores = [];
  const totalById = new Map();
  const classById = new Map();
  for (const r of mid2Rows) {
    const idCard = String(r[0]).trim();
    if (!idCard) continue;
    const stu = studentById.get(idCard);
    if (!stu) continue;
    const selected = stu.selected_subjects;
    for (const subject of COMPULSORY) {
      const [rawCol, , rankCol] = MID2_SUBJECT_COLS[subject];
      scores.push({
        student_id: idCard,
        exam_id: EXAM.mid2.id,
        subject,
        raw_score: num(r[rawCol]),
        assigned_score: null,
        school_rank: num(r[rankCol]) ?? 0,
        class_rank: 0,
      });
    }
    for (const subject of selected) {
      const [rawCol, assignedCol, rankCol] = MID2_SUBJECT_COLS[subject];
      scores.push({
        student_id: idCard,
        exam_id: EXAM.mid2.id,
        subject,
        raw_score: num(r[rawCol]),
        assigned_score: num(r[assignedCol]),
        school_rank: num(r[rankCol]) ?? 0,
        class_rank: 0,
      });
    }
    totalById.set(idCard, { total: num(r[MID2_TOTAL[0]]), schoolRank: num(r[MID2_TOTAL[1]]) ?? 0 });
    classById.set(idCard, stu.class_no);
  }
  for (const [id, { total, schoolRank }] of totalById) {
    scores.push({
      student_id: id,
      exam_id: EXAM.mid2.id,
      subject: '总分',
      raw_score: total,
      assigned_score: null,
      school_rank: schoolRank,
      class_rank: 0,
    });
  }
  recomputeClassRanks(scores, classById);
  return scores;
}

// 班级排名：总分按 raw，选科优先赋分，语数英按 raw
function recomputeClassRanks(scores, classById) {
  const subjects = new Set(scores.map((s) => s.subject));
  const groups = new Map(); // `${subject}|${classNo}` -> entries
  for (const s of scores) {
    const classNo = classById.get(s.student_id);
    if (classNo === undefined) continue;
    const key = `${s.subject}|${classNo}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      id: s.student_id,
      score: s.assigned_score !== null && s.assigned_score !== undefined ? s.assigned_score : s.raw_score,
    });
  }
  const rankMaps = new Map();
  for (const [key, entries] of groups) {
    rankMaps.set(key, assignRanks(entries));
  }
  for (const s of scores) {
    const classNo = classById.get(s.student_id);
    const key = `${s.subject}|${classNo}`;
    const rankMap = rankMaps.get(key);
    if (rankMap) s.class_rank = rankMap.get(s.student_id) ?? 0;
  }
}

// ============ 4. 生成三场考试成绩 ============
const scoresMid1 = buildUpperExam(`${DESKTOP}/25年11月高一上其中考试.xls`, EXAM.mid1, MID1_SUBJECT_COLS);
const scoresFinal1 = buildUpperExam(`${DESKTOP}/26年2月高一上期末考试.xlsx`, EXAM.final1, FINAL1_SUBJECT_COLS);
const scoresMid2 = buildMid2Exam();

console.log('高一上期中 scores:', scoresMid1.length);
console.log('高一上期末 scores:', scoresFinal1.length);
console.log('高一下期中 scores:', scoresMid2.length);

// 保留现有数据（排除本次导入的考试 ID，防止重复运行导致重复追加）
const newExamIds = new Set(Object.values(EXAM).map((e) => e.id));
const existingScores = JSON.parse(readFileSync(join(OUT_DIR, 'scores.json'), 'utf8')).filter(
  (s) => !newExamIds.has(s.exam_id),
);
const existingExams = JSON.parse(readFileSync(join(OUT_DIR, 'exams.json'), 'utf8')).filter(
  (e) => !newExamIds.has(e.id),
);
console.log('现有期末考试 scores:', existingScores.length);

const allScores = [...existingScores, ...scoresMid1, ...scoresFinal1, ...scoresMid2];
const allExams = [...existingExams, ...Object.values(EXAM)];

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'students.json'), JSON.stringify(finalStudents));
writeFileSync(join(OUT_DIR, 'exams.json'), JSON.stringify(allExams));
writeFileSync(join(OUT_DIR, 'scores.json'), JSON.stringify(allScores));

// 校验
const perExam = {};
for (const s of allScores) perExam[s.exam_id] = (perExam[s.exam_id] || 0) + 1;
console.log('scores per exam:', JSON.stringify(perExam));
console.log('exams:', JSON.stringify(allExams.map((e) => e.id)));
console.log('sample mid1 (徐钦浩):');
const sqh = finalStudents.find((s) => s.name === '徐钦浩');
if (sqh) {
  console.log(JSON.stringify(scoresMid1.filter((s) => s.student_id === sqh.id_card), null, 1));
}
