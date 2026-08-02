import { create } from 'zustand';
import type { Reminder, Exam, Student, Score, ClassTeacher } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { recomputeClassRanks, recomputeTotalRows } from '@/lib/scoreUtils';

export type PageKey =
  | 'dashboard'
  | 'students'
  | 'analytics'
  | 'schedule'
  | 'settings';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'exam' | 'meeting' | 'activity' | 'deadline';
}

const initialScheduleEvents: ScheduleEvent[] = [
  { id: '1', title: '期末考试', date: '2026-08-05', time: '08:00', location: '教学楼', type: 'exam' },
  { id: '2', title: '期末考试', date: '2026-08-06', time: '08:00', location: '教学楼', type: 'exam' },
  { id: '3', title: '期末考试', date: '2026-08-07', time: '08:00', location: '教学楼', type: 'exam' },
  { id: '4', title: '家长会', date: '2026-07-31', time: '14:00', location: '学校礼堂', type: 'meeting' },
  { id: '5', title: '收实践报告', date: '2026-08-01', time: '17:00', location: '办公室', type: 'deadline' },
  { id: '6', title: '备课组会议', date: '2026-07-30', time: '10:00', location: '教研组', type: 'meeting' },
];

type AnyRow = Record<string, unknown>;

function studentToRow(s: Student): AnyRow {
  return {
    id_card: s.idCard,
    name: s.name,
    class_no: s.classNo,
    selected_subjects: s.selectedSubjects,
    father_name: s.fatherName,
    father_phone: s.fatherPhone,
    father_wechat: s.fatherWechat,
    mother_name: s.motherName,
    mother_phone: s.motherPhone,
    mother_wechat: s.motherWechat,
    remark: s.remark,
  };
}

function rowToStudent(r: AnyRow): Student {
  const raw = r.selected_subjects;
  return {
    idCard: String(r.id_card ?? ''),
    name: String(r.name ?? ''),
    classNo: Number(r.class_no ?? 0),
    selectedSubjects: Array.isArray(raw)
      ? raw.map((x) => String(x))
      : [],
    fatherName: String(r.father_name ?? ''),
    fatherPhone: String(r.father_phone ?? ''),
    fatherWechat: String(r.father_wechat ?? ''),
    motherName: String(r.mother_name ?? ''),
    motherPhone: String(r.mother_phone ?? ''),
    motherWechat: String(r.mother_wechat ?? ''),
    remark: String(r.remark ?? ''),
  };
}

function examToRow(e: Exam): AnyRow {
  return { id: e.id, name: e.name, date: e.date || null };
}

function rowToExam(r: AnyRow): Exam {
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    date: r.date ? String(r.date).slice(0, 10) : '',
  };
}

function scoreToRow(s: Score): AnyRow {
  return {
    student_id: s.studentId,
    exam_id: s.examId,
    subject: s.subject,
    raw_score: s.rawScore,
    assigned_score: s.assignedScore,
    school_rank: s.schoolRank,
    class_rank: s.classRank,
  };
}

function rowToScore(r: AnyRow): Score {
  return {
    studentId: String(r.student_id ?? ''),
    examId: String(r.exam_id ?? ''),
    subject: String(r.subject ?? ''),
    rawScore: r.raw_score == null ? null : Number(r.raw_score),
    assignedScore: r.assigned_score == null ? null : Number(r.assigned_score),
    schoolRank: Number(r.school_rank ?? 0),
    classRank: Number(r.class_rank ?? 0),
  };
}

function rowToTeacher(r: AnyRow): ClassTeacher {
  return {
    classNo: Number(r.class_no ?? 0),
    teacherName: String(r.teacher_name ?? ''),
    password: String(r.password ?? ''),
  };
}

function scheduleToRow(e: ScheduleEvent): AnyRow {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    time: e.time,
    location: e.location,
    type: e.type,
  };
}

function rowToSchedule(r: AnyRow): ScheduleEvent {
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    date: String(r.date ?? ''),
    time: String(r.time ?? ''),
    location: String(r.location ?? ''),
    type: (r.type as ScheduleEvent['type']) ?? 'activity',
  };
}

function reminderToRow(r: Reminder): AnyRow {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    type: r.type,
    due_date: r.dueDate,
    completed: r.completed,
  };
}

function rowToReminder(r: AnyRow): Reminder {
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? ''),
    content: String(r.content ?? ''),
    type: (r.type as Reminder['type']) ?? 'todo',
    dueDate: String(r.due_date ?? ''),
    completed: Boolean(r.completed),
  };
}

async function upsertStudents(rows: Student[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase
    .from('students')
    .upsert(rows.map(studentToRow));
  if (error) console.error('[supabase] upsert students failed:', error.message);
}

async function upsertScores(rows: Score[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase
    .from('exam_scores')
    .upsert(rows.map(scoreToRow), { onConflict: 'student_id,exam_id,subject' });
  if (error) console.error('[supabase] upsert exam_scores failed:', error.message);
}

async function upsertExams(rows: Exam[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from('exams').upsert(rows.map(examToRow));
  if (error) console.error('[supabase] upsert exams failed:', error.message);
}

async function deleteExamRow(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) console.error('[supabase] delete exam failed:', error.message);
}

async function deleteStudentRows(ids: string[]) {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase.from('students').delete().in('id_card', ids);
  if (error) console.error('[supabase] delete students failed:', error.message);
}

async function deleteScoresByStudents(ids: string[]) {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase
    .from('exam_scores')
    .delete()
    .in('student_id', ids);
  if (error) console.error('[supabase] delete scores failed:', error.message);
}

async function upsertReminders(rows: Reminder[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from('reminders').upsert(rows.map(reminderToRow));
  if (error) console.error('[supabase] upsert reminders failed:', error.message);
}

async function deleteReminderRow(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) console.error('[supabase] delete reminder failed:', error.message);
}

async function upsertSchedule(rows: ScheduleEvent[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase
    .from('schedule_events')
    .upsert(rows.map(scheduleToRow));
  if (error) console.error('[supabase] upsert schedule failed:', error.message);
}

async function deleteScheduleRow(id: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('schedule_events')
    .delete()
    .eq('id', id);
  if (error) console.error('[supabase] delete schedule failed:', error.message);
}

async function upsertClassTeacher(t: ClassTeacher) {
  if (!supabase) return;
  const { error } = await supabase
    .from('class_teachers')
    .upsert({
      class_no: t.classNo,
      teacher_name: t.teacherName,
      password: t.password,
    });
  if (error) console.error('[supabase] upsert class_teacher failed:', error.message);
}

function sortExamList(exams: Exam[]): string[] {
  return [...exams]
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
    .map((e) => e.name);
}

async function fetchAllRows(
  table: string,
  orderBy: { column: string; ascending: boolean }[],
): Promise<AnyRow[]> {
  if (!supabase) return [];
  const pageSize = 1000;
  let countQuery = supabase.from(table).select('*', {
    count: 'exact',
    head: true,
  });
  for (const o of orderBy) {
    countQuery = countQuery.order(o.column, { ascending: o.ascending });
  }
  const { count } = await countQuery.range(0, 0);
  const total = count ?? 0;
  const pageCount = Math.ceil(total / pageSize);
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => {
      let query = supabase.from(table).select('*');
      for (const o of orderBy) {
        query = query.order(o.column, { ascending: o.ascending });
      }
      return query.range(i * pageSize, i * pageSize + pageSize - 1);
    }),
  );
  const rows: AnyRow[] = [];
  for (const page of pages) {
    if (page.error) throw page.error;
    rows.push(...((page.data ?? []) as AnyRow[]));
  }
  return rows;
}

let loadPromise: Promise<void> | null = null;

interface Store {
  dataLoaded: boolean;
  supabaseError: string | null;
  loadFromSupabase: () => Promise<void>;

  exams: Exam[];
  examList: string[];
  addExam: (name: string, date: string) => void;
  removeExam: (id: string) => void;
  updateExamDate: (id: string, date: string) => void;

  reminders: Reminder[];
  toggleReminder: (id: string) => void;
  addReminder: (r: Omit<Reminder, 'id'>) => void;
  removeReminder: (id: string) => void;

  students: Student[];
  addStudent: (s: Omit<Student, 'remark'> & { remark?: string }) => void;
  updateStudent: (idCard: string, updates: Partial<Student>) => void;
  removeStudent: (idCard: string) => void;
  removeStudents: (idCards: string[]) => void;

  scores: Score[];
  updateExamScores: (
    studentId: string,
    examId: string,
    updates: { subject: string; rawScore: number | null; assignedScore?: number | null }[],
  ) => void;

  classTeachers: ClassTeacher[];
  updateClassTeacher: (classNo: number, updates: Partial<ClassTeacher>) => void;

  scheduleEvents: ScheduleEvent[];
  addScheduleEvent: (e: Omit<ScheduleEvent, 'id'>) => void;
  removeScheduleEvent: (id: string) => void;

  activeClass: number;
  setActiveClass: (cls: number) => void;

  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  activePage: PageKey;
  setActivePage: (page: PageKey) => void;

  currentExamIndex: number;
  setCurrentExamIndex: (idx: number) => void;
}

export const useStore = create<Store>((set, get) => ({
  dataLoaded: false,
  supabaseError: null,
  loadFromSupabase: async () => {
    if (loadPromise) return loadPromise;
    if (!isSupabaseConfigured || !supabase) {
      set({ dataLoaded: true, supabaseError: null });
      return;
    }
    loadPromise = (async () => {
      try {
        const [stuRows, scoRows, ex, rem, sch, teachers] = await Promise.all([
          fetchAllRows('students', [{ column: 'id_card', ascending: true }]),
          fetchAllRows('exam_scores', [
            { column: 'student_id', ascending: true },
            { column: 'exam_id', ascending: true },
            { column: 'subject', ascending: true },
          ]),
          supabase.from('exams').select('*'),
          supabase.from('reminders').select('*'),
          supabase.from('schedule_events').select('*'),
          supabase.from('class_teachers').select('*').order('class_no'),
        ]);
        for (const r of [ex, rem, sch, teachers]) {
          if (r.error) throw r.error;
        }
        const students = stuRows.map((r) => rowToStudent(r));
        const scores = scoRows.map((r) => rowToScore(r));
        const exams = (ex.data ?? []).map((r) => rowToExam(r as AnyRow));
        const reminders = (rem.data ?? []).map((r) => rowToReminder(r as AnyRow));
        const scheduleEvents = (sch.data ?? []).map((r) =>
          rowToSchedule(r as AnyRow),
        );
        const classTeachers = (teachers.data ?? []).map((r) =>
          rowToTeacher(r as AnyRow),
        );
        set({
          students,
          scores,
          exams,
          examList: sortExamList(exams),
          reminders: reminders.length ? reminders : [],
          scheduleEvents: scheduleEvents.length ? scheduleEvents : [],
          classTeachers,
          activeClass: get().activeClass,
          dataLoaded: true,
          supabaseError: null,
        });
      } catch (e) {
        console.error('[supabase] load failed', e);
        set({
          dataLoaded: true,
          supabaseError: '云端数据加载失败，请检查网络后重试。',
        });
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  exams: [],
  examList: [],
  addExam: (name, date) => {
    const exam: Exam = {
      id: `exam-${Date.now()}`,
      name: name.trim(),
      date,
    };
    set((state) => {
      const exams = [...state.exams, exam];
      return { exams, examList: sortExamList(exams) };
    });
    upsertExams([exam]);
  },
  removeExam: (id) => {
    deleteExamRow(id);
    set((state) => {
      const exams = state.exams.filter((e) => e.id !== id);
      return {
        exams,
        examList: sortExamList(exams),
        scores: state.scores.filter((s) => s.examId !== id),
      };
    });
  },
  updateExamDate: (id, date) => {
    let updated: Exam | undefined;
    set((state) => {
      const exams = state.exams.map((e) => {
        if (e.id === id) {
          updated = { ...e, date };
          return updated;
        }
        return e;
      });
      return { exams, examList: sortExamList(exams) };
    });
    if (updated) upsertExams([updated]);
  },

  reminders: [],
  toggleReminder: (id) => {
    let toggled: Reminder | undefined;
    set((state) => ({
      reminders: state.reminders.map((r) => {
        if (r.id === id) {
          toggled = { ...r, completed: !r.completed };
          return toggled;
        }
        return r;
      }),
    }));
    if (toggled) upsertReminders([toggled]);
  },
  addReminder: (r) => {
    const newReminder: Reminder = { ...r, id: Date.now().toString() };
    set((state) => ({ reminders: [...state.reminders, newReminder] }));
    upsertReminders([newReminder]);
  },
  removeReminder: (id) => {
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
    deleteReminderRow(id);
  },

  students: [],
  addStudent: (s) => {
    const student: Student = {
      idCard: s.idCard.trim(),
      name: s.name.trim(),
      classNo: s.classNo,
      selectedSubjects: s.selectedSubjects,
      fatherName: s.fatherName || '',
      fatherPhone: s.fatherPhone || '',
      fatherWechat: s.fatherWechat || '',
      motherName: s.motherName || '',
      motherPhone: s.motherPhone || '',
      motherWechat: s.motherWechat || '',
      remark: s.remark || '',
    };
    set((state) => ({ students: [...state.students, student] }));
    upsertStudents([student]);
  },
  updateStudent: (idCard, updates) => {
    let updated: Student | undefined;
    set((state) => ({
      students: state.students.map((s) => {
        if (s.idCard === idCard) {
          updated = { ...s, ...updates };
          return updated;
        }
        return s;
      }),
    }));
    if (updated) upsertStudents([updated]);
  },
  removeStudent: (idCard) => {
    deleteStudentRows([idCard]);
    deleteScoresByStudents([idCard]);
    set((state) => ({
      students: state.students.filter((s) => s.idCard !== idCard),
      scores: state.scores.filter((s) => s.studentId !== idCard),
    }));
  },
  removeStudents: (idCards) => {
    if (idCards.length === 0) return;
    deleteStudentRows(idCards);
    deleteScoresByStudents(idCards);
    set((state) => ({
      students: state.students.filter((s) => !idCards.includes(s.idCard)),
      scores: state.scores.filter((s) => !idCards.includes(s.studentId)),
    }));
  },

  scores: [],
  updateExamScores: (studentId, examId, updates) => {
    let affected: Score[] = [];
    set((state) => {
      let next = state.scores.map((s) => {
        if (s.studentId !== studentId || s.examId !== examId) return s;
        const update = updates.find((u) => u.subject === s.subject);
        if (!update) return s;
        return {
          ...s,
          rawScore:
            update.rawScore !== undefined ? update.rawScore : s.rawScore,
          assignedScore:
            update.assignedScore !== undefined
              ? update.assignedScore
              : s.assignedScore,
        };
      });
      for (const update of updates) {
        const exists = next.some(
          (s) =>
            s.studentId === studentId &&
            s.examId === examId &&
            s.subject === update.subject,
        );
        if (!exists) {
          next.push({
            studentId,
            examId,
            subject: update.subject,
            rawScore: update.rawScore ?? null,
            assignedScore: update.assignedScore ?? null,
            schoolRank: 0,
            classRank: 0,
          });
        }
      }
      next = recomputeTotalRows(state.students, next, examId);
      next = recomputeClassRanks(state.students, next, examId);
      affected = next.filter((s) => s.examId === examId);
      return { scores: next };
    });
    if (affected.length > 0) upsertScores(affected);
  },

  classTeachers: [],
  updateClassTeacher: (classNo, updates) => {
    let updated: ClassTeacher | undefined;
    set((state) => ({
      classTeachers: state.classTeachers.map((t) => {
        if (t.classNo === classNo) {
          updated = { ...t, ...updates };
          return updated;
        }
        return t;
      }),
    }));
    if (updated) upsertClassTeacher(updated);
  },

  scheduleEvents: [...initialScheduleEvents],
  addScheduleEvent: (e) => {
    const newEvent: ScheduleEvent = { ...e, id: Date.now().toString() };
    set((state) => ({ scheduleEvents: [...state.scheduleEvents, newEvent] }));
    upsertSchedule([newEvent]);
  },
  removeScheduleEvent: (id) => {
    set((state) => ({
      scheduleEvents: state.scheduleEvents.filter((e) => e.id !== id),
    }));
    deleteScheduleRow(id);
  },

  activeClass: 0,
  setActiveClass: (cls) => set({ activeClass: cls }),

  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  currentExamIndex: 0,
  setCurrentExamIndex: (idx) => set({ currentExamIndex: idx }),
}));
