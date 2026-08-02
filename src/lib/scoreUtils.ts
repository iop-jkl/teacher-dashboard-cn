import type { Score, Student } from '@/types';
import { COMPULSORY } from '@/data/mockData';

export function scoreValue(s: Score | undefined): number | null {
  if (!s) return null;
  if (s.assignedScore !== null && s.assignedScore !== undefined) {
    return s.assignedScore;
  }
  return s.rawScore;
}

export function subjectScore(
  scores: Score[],
  studentId: string,
  examId: string,
  subject: string,
): Score | undefined {
  return scores.find(
    (s) =>
      s.studentId === studentId && s.examId === examId && s.subject === subject,
  );
}

export function totalFor(
  scores: Score[],
  studentId: string,
  examId: string,
): number {
  const totalRow = subjectScore(scores, studentId, examId, '总分');
  if (totalRow && totalRow.assignedScore !== null) {
    return totalRow.assignedScore;
  }
  return subjectComponents(scores, studentId, examId, true);
}

export function subjectComponents(
  scores: Score[],
  studentId: string,
  examId: string,
  preferAssigned = true,
): number {
  let sum = 0;
  for (const s of scores) {
    if (s.studentId !== studentId || s.examId !== examId) continue;
    if (s.subject === '总分') continue;
    const v = preferAssigned ? scoreValue(s) : s.rawScore;
    sum += v ?? 0;
  }
  return sum;
}

export function studentSubjects(student: Student): string[] {
  return [...COMPULSORY, ...student.selectedSubjects];
}

export interface RankingEntry {
  student: Student;
  total: number;
  classRank: number;
  schoolRank: number;
  subjectTotals: Record<string, number | null>;
}

export function rankClassStudents(
  students: Student[],
  scores: Score[],
  examId: string,
  classNo: number,
): RankingEntry[] {
  const list = students.filter((s) => s.classNo === classNo);
  const entries: RankingEntry[] = list.map((student) => {
    const total = totalFor(scores, student.idCard, examId);
    const totalRow = subjectScore(scores, student.idCard, examId, '总分');
    const subjectTotals: Record<string, number | null> = {};
    for (const subject of studentSubjects(student)) {
      subjectTotals[subject] = scoreValue(
        subjectScore(scores, student.idCard, examId, subject),
      );
    }
    return {
      student,
      total,
      classRank: totalRow?.classRank ?? 0,
      schoolRank: totalRow?.schoolRank ?? 0,
      subjectTotals,
    };
  });
  return entries.sort((a, b) => b.total - a.total);
}

export function assignStandardRanks(
  entries: { id: string; value: number | null }[],
): Map<string, number> {
  const sorted = [...entries]
    .filter((e) => e.value !== null)
    .sort((a, b) => (b.value as number) - (a.value as number));
  const map = new Map<string, number>();
  let prevValue: number | null = null;
  let prevRank = 0;
  sorted.forEach((entry, idx) => {
    const rank =
      idx > 0 && entry.value === prevValue ? prevRank : idx + 1;
    map.set(entry.id, rank);
    prevValue = entry.value as number;
    prevRank = rank;
  });
  return map;
}

export function recomputeClassRanks(
  students: Student[],
  scores: Score[],
  examId: string,
): Score[] {
  const byClass = new Map<number, Student[]>();
  for (const s of students) {
    if (!byClass.has(s.classNo)) byClass.set(s.classNo, []);
    byClass.get(s.classNo)!.push(s);
  }
  const subjects = new Set<string>();
  for (const s of scores) {
    if (s.examId === examId) subjects.add(s.subject);
  }
  const next = scores.map((s) => ({ ...s }));
  for (const subject of subjects) {
    for (const [classNo, classStudents] of byClass) {
      const rows = next.filter(
        (s) =>
          s.examId === examId &&
          s.subject === subject &&
          classStudents.some((st) => st.idCard === s.studentId),
      );
      const useAssigned =
        subject === '总分' || rows.some((r) => r.assignedScore !== null);
      const rankMap = assignStandardRanks(
        rows.map((r) => ({
          id: r.studentId,
          value: useAssigned ? r.assignedScore : r.rawScore,
        })),
      );
      for (const r of next) {
        if (
          r.examId === examId &&
          r.subject === subject &&
          classStudents.some((st) => st.idCard === r.studentId)
        ) {
          const rank = rankMap.get(r.studentId);
          r.classRank = rank ?? 0;
        }
      }
    }
  }
  return next;
}

export function recomputeTotalRows(
  students: Student[],
  scores: Score[],
  examId: string,
): Score[] {
  const next = scores.filter((s) => !(s.examId === examId && s.subject === '总分'));
  const schoolRankById = new Map<string, number>();
  for (const s of scores) {
    if (s.examId === examId && s.subject === '总分') {
      schoolRankById.set(s.studentId, s.schoolRank);
    }
  }
  const added: Score[] = [];
  for (const student of students) {
    const total = subjectComponents(
      scores,
      student.idCard,
      examId,
      true,
    );
    added.push({
      studentId: student.idCard,
      examId,
      subject: '总分',
      rawScore: null,
      assignedScore: total,
      schoolRank: schoolRankById.get(student.idCard) ?? 0,
      classRank: 0,
    });
  }
  return recomputeClassRanks(
    students,
    [...next, ...added],
    examId,
  );
}
