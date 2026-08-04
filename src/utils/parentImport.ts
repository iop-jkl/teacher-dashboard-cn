import * as XLSX from 'xlsx';
import type { Student } from '@/types';

export interface ParentRow {
  idCard: string;
  role: 'father' | 'mother';
  name: string;
  phone: string;
  wechat: string;
}

export interface ParsedParentImport {
  rows: ParentRow[];
  warnings: string[];
  matched: { row: ParentRow; old: Student }[];
  unmatched: ParentRow[];
  updated: {
    idCard: string;
    classNo: number;
    fatherName: string;
    fatherPhone: string;
    fatherWechat: string;
    motherName: string;
    motherPhone: string;
    motherWechat: string;
  }[];
}

function numOrStr(v: unknown): string {
  if (v === '' || v === undefined || v === null) return '';
  return String(v).trim();
}

export async function parseParentFile(file: File): Promise<{ rows: ParentRow[]; warnings: string[] }> {
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

  // 自动识别表头
  const header = rows[0].map((c) => String(c).trim().toLowerCase());
  let idCol = -1;
  let roleCol = -1;
  let nameCol = -1;
  let phoneCol = -1;
  let wechatCol = -1;
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (idCol === -1 && /身份证|证件号|证件|idcard|id card|id_number/.test(h)) idCol = i;
    if (roleCol === -1 && /家长|父|母|称谓|关系|role/.test(h)) roleCol = i;
    if (nameCol === -1 && /姓名|名字|^名$|name/.test(h)) nameCol = i;
    if (phoneCol === -1 && /电话|手机|联系|phone|mobile|tel/.test(h)) phoneCol = i;
    if (wechatCol === -1 && /微信|wechat|weixin|wx/.test(h)) wechatCol = i;
  }
  if (idCol === -1 || nameCol === -1) {
    throw new Error('无法识别身份证/姓名列，请确认表头包含“学生身份证号、家长姓名”，最好含“家长类型（父/母）、电话、微信”');
  }

  const warnings: string[] = [];
  const out: ParentRow[] = [];
  for (const r of data) {
    const idCard = String(r[idCol] ?? '').trim();
    const name = numOrStr(r[nameCol]);
    if (!idCard || !name) {
      warnings.push(`第 ${data.indexOf(r) + 2} 行缺少身份证号或家长姓名，已跳过`);
      continue;
    }
    const roleRaw = roleCol >= 0 ? numOrStr(r[roleCol]) : '';
    const role: 'father' | 'mother' = /母|妈|mother|m$/.test(roleRaw) ? 'mother' : 'father';
    out.push({
      idCard,
      role,
      name,
      phone: phoneCol >= 0 ? numOrStr(r[phoneCol]) : '',
      wechat: wechatCol >= 0 ? numOrStr(r[wechatCol]) : '',
    });
  }
  return { rows: out, warnings };
}

export function buildParentImport(
  rows: ParentRow[],
  students: Student[],
): ParsedParentImport {
  const warnings: string[] = [];
  const studentById = new Map(students.map((s) => [s.idCard, s]));
  const matched: ParsedParentImport['matched'] = [];
  const unmatched: ParentRow[] = [];
  const byStudent = new Map<string, { father?: ParentRow; mother?: ParentRow }>();

  for (const row of rows) {
    const stu = studentById.get(row.idCard);
    if (!stu) {
      unmatched.push(row);
      continue;
    }
    matched.push({ row, old: stu });
    if (!byStudent.has(row.idCard)) byStudent.set(row.idCard, {});
    const entry = byStudent.get(row.idCard)!;
    if (row.role === 'father') entry.father = row;
    else entry.mother = row;
  }

  const updated: ParsedParentImport['updated'] = [];
  for (const [idCard, entry] of byStudent) {
    const stu = studentById.get(idCard)!;
    updated.push({
      idCard,
      classNo: stu.classNo,
      fatherName: entry.father?.name ?? stu.fatherName,
      fatherPhone: entry.father?.phone ?? stu.fatherPhone,
      fatherWechat: entry.father?.wechat ?? stu.fatherWechat,
      motherName: entry.mother?.name ?? stu.motherName,
      motherPhone: entry.mother?.phone ?? stu.motherPhone,
      motherWechat: entry.mother?.wechat ?? stu.motherWechat,
    });
  }
  return { rows, warnings, matched, unmatched, updated };
}
