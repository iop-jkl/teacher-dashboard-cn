import * as XLSX from 'xlsx';
import type { Student } from '@/types';

export interface ParsedClassChange {
  rows: { idCard: string; classNo: number; name: string }[];
  warnings: string[];
  matched: { idCard: string; classNo: number; name: string; oldClassNo: number }[];
  unmatched: { idCard: string; classNo: number; name: string }[];
  nameMismatch: { idCard: string; classNo: number; oldName: string; newName: string }[];
  classDist: { classNo: number; count: number }[];
  pendingStudents: { idCard: string; name: string; classNo: number }[];
}

// 班级解析：支持 3 / "3班" / "高二(3)班" / "2-3" 等，提取最后一个数字
export function parseClassNo(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  const s = String(v).trim();
  const m = s.match(/\d+/g);
  if (!m) return null;
  return Number(m[m.length - 1]);
}

export function parseClassChangeFile(
  file: File,
  students: Student[],
): Promise<ParsedClassChange> {
  return file.arrayBuffer().then((buffer) => {
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
    let classCol = -1;
    let nameCol = -1;
    for (let i = 0; i < header.length; i++) {
      const h = header[i];
      if (idCol === -1 && /身份证|证件号|证件|idcard|id card|id_number/.test(h)) idCol = i;
      if (classCol === -1 && /班级|班别|班号|^班$|class/.test(h)) classCol = i;
      if (nameCol === -1 && /姓名|名字|^名$|name/.test(h)) nameCol = i;
    }
    if (idCol === -1 && classCol === -1 && nameCol === -1) {
      idCol = 0;
      nameCol = 1;
      classCol = 2;
    }
    if (idCol === -1 || classCol === -1) {
      throw new Error('无法识别身份证/班级列，请确认表头包含“身份证、姓名、班级”');
    }

    const warnings: string[] = [];
    const parsed: { idCard: string; classNo: number; name: string }[] = [];
    for (const r of data) {
      const idCard = String(r[idCol] ?? '').trim();
      const name = nameCol >= 0 ? String(r[nameCol] ?? '').trim() : '';
      if (!idCard) continue;
      const classNo = parseClassNo(r[classCol]);
      if (classNo === null || classNo <= 0) {
        warnings.push(`第 ${data.indexOf(r) + 2} 行身份证 ${idCard} 的班级「${String(r[classCol] ?? '')}」无法解析，已跳过`);
        continue;
      }
      parsed.push({ idCard, classNo, name });
    }

    const studentById = new Map(students.map((s) => [s.idCard, s]));
    const matched: ParsedClassChange['matched'] = [];
    const unmatched: ParsedClassChange['unmatched'] = [];
    const nameMismatch: ParsedClassChange['nameMismatch'] = [];
    for (const p of parsed) {
      const stu = studentById.get(p.idCard);
      if (!stu) {
        unmatched.push(p);
        continue;
      }
      if (p.name && stu.name !== p.name) {
        nameMismatch.push({
          idCard: p.idCard,
          classNo: p.classNo,
          oldName: stu.name,
          newName: p.name,
        });
      }
      matched.push({ ...p, oldClassNo: stu.classNo });
    }

    const classCount = new Map<number, number>();
    for (const m of matched) {
      classCount.set(m.classNo, (classCount.get(m.classNo) || 0) + 1);
    }
    const classDist = [...classCount.entries()]
      .map(([classNo, count]) => ({ classNo, count }))
      .sort((a, b) => a.classNo - b.classNo);

    return {
      rows: parsed,
      warnings,
      matched,
      unmatched,
      nameMismatch,
      classDist,
      pendingStudents: students.filter((s) => s.classNo === 0),
    };
  });
}
