import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// ============================================================
// 分班导入脚本：
//   输入：分班表 Excel（列含 身份证、姓名、班级），支持全校/部分/单班
//   1. 按身份证匹配学生，更新 students.class_no
//   2. 对全部历史考试重算班级名次（同分同名次，选科优先赋分）
//   3. 校名次不受分班影响，保留不动
// 用法：node scripts/import-class-change.mjs <分班表路径>
// ============================================================

const env = {};
try {
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* ignore */ }

const baseUrl = (process.env.SUPABASE_URL || env.VITE_SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!baseUrl || !key) {
  console.error('缺少 SUPABASE_URL 或 KEY（请检查 .env.local）');
  process.exit(1);
}
const rest = `${baseUrl}/rest/v1`;

const file = process.argv[2];
if (!file) {
  console.error('用法：node scripts/import-class-change.mjs <分班表.xlsx>');
  process.exit(1);
}

// ---------- 工具函数 ----------
function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// 班级解析：支持 3 / "3班" / "高二(3)班" / "2-3" 等，提取最后一个数字
function parseClassNo(v) {
  if (v === '' || v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  const s = String(v).trim();
  const m = s.match(/\d+/g);
  if (!m) return null;
  return Number(m[m.length - 1]);
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

async function fetchAll(path) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const res = await fetch(`${rest}/${path}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + pageSize - 1}`,
      },
    });
    if (!res.ok) {
      throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
    }
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function updateStudentsByClass(map) {
  // map: classNo -> idCard[]（按班级分组批量更新）
  let updated = 0;
  for (const [classNo, idCards] of map) {
    const res = await fetch(`${rest}/students?id_card=in.(${idCards.join(',')})`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,count=exact',
      },
      body: JSON.stringify({ class_no: classNo }),
    });
    if (!res.ok) {
      throw new Error(`PATCH students failed: ${res.status} ${await res.text()}`);
    }
    updated += idCards.length;
  }
  return updated;
}

// ---------- 1. 读取分班表 ----------
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
console.log(`分班表行数: ${rows.length}`);

// 自动识别表头：找含 身份证/证件、班级/班、姓名 的列
const header = rows[0].map((c) => String(c).trim().toLowerCase());
let idCol = -1, classCol = -1, nameCol = -1;
for (let i = 0; i < header.length; i++) {
  const h = header[i];
  if (idCol === -1 && /身份证|证件号|证件|idcard|id card|id_number/.test(h)) idCol = i;
  if (classCol === -1 && /班级|班别|班号|^班$|class/.test(h)) classCol = i;
  if (nameCol === -1 && /姓名|名字|^名$|name/.test(h)) nameCol = i;
}
if (idCol === -1 && classCol === -1 && nameCol === -1) {
  // 无表头：按 身份证/姓名/班级 顺序
  idCol = 0; nameCol = 1; classCol = 2;
  console.log('未识别表头，按 身份证/姓名/班级 列序解析');
}
if (idCol === -1 || classCol === -1) {
  console.error('无法定位 身份证/班级 列，请确认表头名称（身份证、姓名、班级）');
  process.exit(1);
}
console.log(`列位置: 身份证=${idCol} 姓名=${nameCol >= 0 ? nameCol : '-'} 班级=${classCol}`);

const newClassById = new Map(); // idCard -> { classNo, name }
const parseErrors = [];
for (const r of rows.slice(1)) {
  const idCard = String(r[idCol]).trim();
  if (!idCard) continue;
  const classNo = parseClassNo(r[classCol]);
  if (classNo === null || classNo <= 0) {
    parseErrors.push({ idCard, classRaw: String(r[classCol] ?? '').trim() });
    continue;
  }
  newClassById.set(idCard, {
    classNo,
    name: nameCol >= 0 ? String(r[nameCol] ?? '').trim() : '',
  });
}
if (parseErrors.length) {
  console.log(`⚠️ 无法解析班级号 ${parseErrors.length} 行（已跳过）:`);
  for (const e of parseErrors.slice(0, 20)) console.log(`  ${e.idCard} -> "${e.classRaw}"`);
}
console.log(`待更新学生数: ${newClassById.size}`);

// ---------- 2. 匹配现有学生 ----------
const students = await fetchAll('students');
const studentByCard = new Map(students.map((s) => [s.id_card, s]));
console.log(`现有学生数: ${students.length}`);

const matched = [];
const unmatched = [];
const nameMismatch = [];
for (const [idCard, info] of newClassById) {
  const stu = studentByCard.get(idCard);
  if (!stu) {
    unmatched.push({ idCard, name: info.name });
    continue;
  }
  if (info.name && stu.name !== info.name) {
    nameMismatch.push({ idCard, old: stu.name, new: info.name });
  }
  matched.push({ ...info, oldClassNo: stu.class_no });
}
console.log(`匹配成功: ${matched.length}，未匹配(转学/不存在): ${unmatched.length}`);
if (unmatched.length) {
  console.log('⚠️ 未匹配学生（表中存在但库里没有，可能需手动新增）:');
  for (const u of unmatched.slice(0, 20)) console.log(`  ${u.idCard} ${u.name}`);
}
if (nameMismatch.length) {
  console.log('⚠️ 姓名不一致（身份证重复录入？）:');
  for (const m of nameMismatch.slice(0, 20)) console.log(`  ${m.idCard} 库里「${m.old}」表中「${m.new}」`);
}

// ---------- 3. 更新 students.class_no（按班级分组批量） ----------
const byClass = new Map();
for (const m of matched) {
  if (!byClass.has(m.classNo)) byClass.set(m.classNo, []);
  byClass.get(m.classNo).push(m.idCard);
}
const updated = await updateStudentsByClass(byClass);
console.log(`已更新学生班级: ${updated}`);

// ---------- 4. 重算全部历史考试的班级名次 ----------
const scores = await fetchAll('exam_scores');
console.log(`成绩行数: ${scores.length}`);

const newClassMap = new Map(matched.map((m) => [m.idCard, m.classNo]));
const changed = matched.map((m) => ({ id: m.idCard, from: m.oldClassNo, to: m.classNo }))
  .filter((c) => c.from !== c.to);
console.log(`实际换班学生: ${changed.length}`);

// 班内其他学生也可能因人员进出而名次变化，因此按新班级对全部学生重算
const classOf = new Map(students.map((s) => [s.id_card, s.class_no]));
for (const m of matched) classOf.set(m.idCard, m.classNo);

const subjectGroups = new Map(); // `${subject}|${classNo}` -> entries
for (const s of scores) {
  const classNo = classOf.get(s.student_id);
  if (classNo === undefined) continue;
  const key = `${s.subject}|${classNo}`;
  if (!subjectGroups.has(key)) subjectGroups.set(key, []);
  subjectGroups.get(key).push({
    id: s.student_id,
    score: s.assigned_score !== null && s.assigned_score !== undefined ? s.assigned_score : s.raw_score,
  });
}
const rankMaps = new Map();
for (const [key, entries] of subjectGroups) {
  rankMaps.set(key, assignRanks(entries));
}
const updates = new Map(); // student_id -> { exam_id, subject, classRank }
for (const s of scores) {
  const classNo = classOf.get(s.student_id);
  const key = `${s.subject}|${classNo}`;
  const rankMap = rankMaps.get(key);
  const rank = rankMap ? rankMap.get(s.student_id) ?? 0 : 0;
  if (rank !== s.class_rank) updates.set(`${s.student_id}|${s.exam_id}|${s.subject}`, { ...s, class_rank: rank });
}
console.log(`需重算班级名次的成绩行: ${updates.size}`);

// 按 (exam_id, subject) 分组批量更新 class_rank
const byKey = new Map();
for (const s of updates.values()) {
  const k = `${s.exam_id}|${s.subject}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(s);
}
let updatedRows = 0;
for (const [, group] of byKey) {
  // 逐行 PATCH（每行 class_rank 不同，无法一次批量）
  for (const s of group) {
    const r = await fetch(`${rest}/exam_scores?student_id=eq.${s.student_id}&exam_id=eq.${s.exam_id}&subject=eq.${s.subject}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ class_rank: s.class_rank }),
    });
    if (!r.ok) {
      throw new Error(`PATCH class_rank failed: ${r.status} ${await r.text()}`);
    }
    updatedRows++;
  }
}
console.log(`已更新班级名次行数: ${updatedRows}`);

// ---------- 5. 报告 ----------
const dist = new Map();
for (const m of matched) {
  dist.set(m.classNo, (dist.get(m.classNo) || 0) + 1);
}
console.log('\n===== 导入完成报告 =====');
console.log(`更新学生: ${matched.length}（覆盖 ${dist.size} 个班）`);
console.log(`实际换班: ${changed.length}`);
console.log(`未匹配: ${unmatched.length}，姓名不一致: ${nameMismatch.length}`);
console.log(`重算成绩行: ${updatedRows}`);
console.log('新班级分布:');
for (const [cls, n] of [...dist].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${cls}班: ${n} 人`);
}
