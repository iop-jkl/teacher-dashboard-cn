import { create } from 'zustand';
import type { Reminder, Student, Announcement, Exam, Score } from '@/types';
import type { ExamTrendPoint } from '@/types';
import type { ComputedRanking } from '@/utils/excelImport';
import {
  mockReminders,
  mockStudents,
  mockAnnouncements,
  mockExams,
  mockScores,
  studentScoreTrend as initialStudentScoreTrend,
  examTrendData as initialExamTrendData,
} from '@/data/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type PageKey = 'dashboard' | 'students' | 'analytics' | 'schedule' | 'settings';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'exam' | 'meeting' | 'activity' | 'deadline';
}

const initialScheduleEvents: ScheduleEvent[] = [
  { id: '1', title: '期中考试', date: '2026-08-05', time: '08:00', location: '教学楼', type: 'exam' },
  { id: '2', title: '期中考试', date: '2026-08-06', time: '08:00', location: '教学楼', type: 'exam' },
  { id: '3', title: '期中考试', date: '2026-08-07', time: '08:00', location: '教学楼', type: 'exam' },
  { id: '4', title: '家长会', date: '2026-07-31', time: '14:00', location: '学校礼堂', type: 'meeting' },
  { id: '5', title: '收实践报告', date: '2026-08-01', time: '17:00', location: '办公室', type: 'deadline' },
  { id: '6', title: '备课组会议', date: '2026-07-30', time: '10:00', location: '教研室', type: 'meeting' },
  { id: '7', title: '主题班会', date: '2026-08-08', time: '15:00', location: '高一(3)班教室', type: 'activity' },
  { id: '8', title: '月考四', date: '2026-08-20', time: '08:00', location: '教学楼', type: 'exam' },
];

export interface UserSettings {
  teacherName: string;
  className: string;
  position: string;
  examDates: Record<string, string>;
  notifications: {
    examReminder: boolean;
    homeworkReminder: boolean;
    declineAlert: boolean;
    parentNotification: boolean;
  };
}

const defaultSettings: UserSettings = {
  teacherName: '俞老师',
  className: '高一(7)班',
  position: '班主任',
  examDates: {},
  notifications: {
    examReminder: true,
    homeworkReminder: true,
    declineAlert: true,
    parentNotification: false,
  },
};

// ============================================================
// Supabase 行 ↔ 对象 映射
// ============================================================
type AnyRow = Record<string, unknown>;

function studentToRow(s: Student): AnyRow {
  return {
    id: s.id,
    name: s.name,
    student_no: s.studentNo,
    class_name: s.className,
    avatar: s.avatar,
    total_score: s.totalScore,
    rank: s.rank,
    trend: s.trend,
    trend_value: s.trendValue,
    remark: s.remark ?? null,
  };
}
function rowToStudent(r: AnyRow): Student {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    studentNo: String(r.student_no ?? ''),
    className: String(r.class_name ?? ''),
    avatar: String(r.avatar ?? ''),
    totalScore: Number(r.total_score ?? 0),
    rank: Number(r.rank ?? 0),
    trend: (r.trend as Student['trend']) ?? 'stable',
    trendValue: Number(r.trend_value ?? 0),
    remark: r.remark == null ? undefined : String(r.remark),
  };
}

function scoreToRow(s: Score): AnyRow {
  return {
    id: s.id,
    student_id: s.studentId,
    exam_id: s.examId,
    subject: s.subject,
    score: s.score,
    class_rank: s.classRank,
    school_rank: s.schoolRank,
    subject_rank: s.subjectRank,
    total_students: s.totalStudents,
  };
}
function rowToScore(r: AnyRow): Score {
  return {
    id: String(r.id),
    studentId: String(r.student_id ?? ''),
    examId: String(r.exam_id ?? ''),
    subject: String(r.subject ?? ''),
    score: Number(r.score ?? 0),
    classRank: Number(r.class_rank ?? 0),
    schoolRank: Number(r.school_rank ?? 0),
    subjectRank: Number(r.subject_rank ?? 0),
    totalStudents: Number(r.total_students ?? 0),
  };
}

function scheduleToRow(e: ScheduleEvent): AnyRow {
  return { id: e.id, title: e.title, date: e.date, time: e.time, location: e.location, type: e.type };
}
function rowToSchedule(r: AnyRow): ScheduleEvent {
  return {
    id: String(r.id),
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
    id: String(r.id),
    title: String(r.title ?? ''),
    content: String(r.content ?? ''),
    type: (r.type as Reminder['type']) ?? 'todo',
    dueDate: String(r.due_date ?? ''),
    completed: Boolean(r.completed),
  };
}

function announcementToRow(a: Announcement): AnyRow {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    level: a.level,
    date: a.date,
  };
}
function rowToAnnouncement(r: AnyRow): Announcement {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    content: String(r.content ?? ''),
    level: (r.level as Announcement['level']) ?? 'info',
    date: String(r.date ?? ''),
  };
}

function settingsToRow(s: UserSettings): AnyRow {
  return {
    id: 'default',
    teacher_name: s.teacherName,
    class_name: s.className,
    position: s.position,
    notifications: {
      ...s.notifications,
      examDates: s.examDates,
    },
  };
}
function rowToSettings(r: AnyRow): UserSettings {
  const n = (r.notifications ?? {}) as Record<string, unknown>;
  return {
    teacherName: String(r.teacher_name ?? defaultSettings.teacherName),
    className: String(r.class_name ?? defaultSettings.className),
    position: String(r.position ?? defaultSettings.position),
    examDates: (n.examDates as Record<string, string>) ?? {},
    notifications: {
      examReminder: Boolean(
        n.examReminder ?? defaultSettings.notifications.examReminder
      ),
      homeworkReminder: Boolean(
        n.homeworkReminder ?? defaultSettings.notifications.homeworkReminder
      ),
      declineAlert: Boolean(
        n.declineAlert ?? defaultSettings.notifications.declineAlert
      ),
      parentNotification: Boolean(
        n.parentNotification ?? defaultSettings.notifications.parentNotification
      ),
    },
  };
}

// ============================================================
// 同步辅助（fire-and-forget，未配置时为空操作）
// ============================================================
async function upsertStudents(rows: Student[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from('students').upsert(rows.map(studentToRow));
  if (error) console.error('[supabase] upsert students failed:', error.message);
}
async function deleteStudentRow(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) console.error('[supabase] delete student failed:', error.message);
}
async function upsertScores(rows: Score[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from('scores').upsert(rows.map(scoreToRow));
  if (!error) return;
  if (/subject_rank|school_rank/i.test(error.message)) {
    const fallbackRows = rows.map((s) => {
      const row = scoreToRow(s);
      delete row.subject_rank;
      delete row.school_rank;
      return row;
    });
    const { error: fallbackError } = await supabase.from('scores').upsert(fallbackRows);
    if (fallbackError) {
      console.error('[supabase] upsert scores failed:', fallbackError.message);
    }
    return;
  }
  console.error('[supabase] upsert scores failed:', error.message);
}
async function upsertSchedule(rows: ScheduleEvent[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from('schedule_events').upsert(rows.map(scheduleToRow));
  if (error) console.error('[supabase] upsert schedule failed:', error.message);
}
async function deleteScheduleRow(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('schedule_events').delete().eq('id', id);
  if (error) console.error('[supabase] delete schedule failed:', error.message);
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
async function upsertAnnouncements(rows: Announcement[]) {
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from('announcements').upsert(rows.map(announcementToRow));
  if (error) console.error('[supabase] upsert announcements failed:', error.message);
}
async function deleteAnnouncementRow(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) console.error('[supabase] delete announcement failed:', error.message);
}
async function deleteScoresByExam(examId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('scores').delete().eq('exam_id', examId);
  if (error) console.error('[supabase] delete scores by exam failed:', error.message);
}
async function deleteStudentRows(ids: string[]) {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase.from('students').delete().in('id', ids);
  if (error) console.error('[supabase] delete students failed:', error.message);
}
async function deleteScoresByStudents(ids: string[]) {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase.from('scores').delete().in('student_id', ids);
  if (error) console.error('[supabase] delete scores by students failed:', error.message);
}
async function upsertSettings(s: UserSettings) {
  if (!supabase) return;
  const { error } = await supabase.from('user_settings').upsert(settingsToRow(s));
  if (error) console.error('[supabase] upsert settings failed:', error.message);
}

function buildExamList(
  scores: Score[],
  examDates: Record<string, string>
): string[] {
  const names = new Set<string>([
    ...Object.keys(examDates),
    ...scores.map((s) => s.examId),
  ]);
  return [...names].sort((a, b) => {
    const dateA = examDates[a] || '';
    const dateB = examDates[b] || '';
    return dateA.localeCompare(dateB) || a.localeCompare(b);
  });
}

function applyExamDates(
  exams: Exam[],
  examDates: Record<string, string>
): Exam[] {
  return exams.map((e) => ({
    ...e,
    date: examDates[e.name] || e.date,
  }));
}

// ============================================================
// 由 scores 派生 exam / trend 数据（保持 Analytics 与持久化数据一致）
// ============================================================
function deriveExamData(
  scores: Score[],
  examDates: Record<string, string> = {}
): {
  exams: Exam[];
  studentScoreTrend: Record<string, ExamTrendPoint[]>;
  examTrendData: ExamTrendPoint[];
} {
  const studentTrend: Record<string, ExamTrendPoint[]> = {};
  const examAgg: Record<string, { sum: Record<string, number>; count: Record<string, number> }> = {};
  const examOrder: string[] = [];

  for (const s of scores) {
    if (!studentTrend[s.studentId]) studentTrend[s.studentId] = [];
    let point = studentTrend[s.studentId].find((p) => p.examName === s.examId);
    if (!point) {
      point = { examName: s.examId, date: '' };
      studentTrend[s.studentId].push(point);
    }
    point[s.subject] = s.score;

    if (!examAgg[s.examId]) {
      examAgg[s.examId] = { sum: {}, count: {} };
      examOrder.push(s.examId);
    }
    examAgg[s.examId].sum[s.subject] = (examAgg[s.examId].sum[s.subject] || 0) + s.score;
    examAgg[s.examId].count[s.subject] = (examAgg[s.examId].count[s.subject] || 0) + 1;
  }

  const sortedExamOrder = [...examOrder].sort((a, b) => {
    const dateA = examDates[a] || '';
    const dateB = examDates[b] || '';
    return dateA.localeCompare(dateB) || a.localeCompare(b);
  });

  for (const sid of Object.keys(studentTrend)) {
    studentTrend[sid].sort(
      (a, b) =>
        sortedExamOrder.indexOf(a.examName) -
        sortedExamOrder.indexOf(b.examName)
    );
  }

  const examTrendData: ExamTrendPoint[] = sortedExamOrder.map((name) => {
    const p: ExamTrendPoint = { examName: name, date: '' };
    for (const subj of Object.keys(examAgg[name].sum)) {
      p[subj] = Math.round((examAgg[name].sum[subj] / examAgg[name].count[subj]) * 10) / 10;
    }
    return p;
  });

  const exams: Exam[] = [];
  for (const name of sortedExamOrder) {
    for (const subj of Object.keys(examAgg[name].sum)) {
      const avg = Math.round((examAgg[name].sum[subj] / examAgg[name].count[subj]) * 10) / 10;
      exams.push({
        id: `${name}-${subj}`,
        name,
        date: new Date().toISOString().slice(0, 10),
        subject: subj,
        classAverage: avg,
        gradeAverage: avg,
      });
    }
  }

  return { exams, studentScoreTrend: studentTrend, examTrendData };
}

function assignRanks(entries: { id: string; score: number }[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const rankMap = new Map<string, number>();
  sorted.forEach((entry, idx) => {
    const rank =
      idx > 0 && sorted[idx - 1].score === entry.score
        ? rankMap.get(sorted[idx - 1].id)!
        : idx + 1;
    rankMap.set(entry.id, rank);
  });
  return rankMap;
}

function recomputeExamRanks(scores: Score[]): Score[] {
  const subjectGroups = new Map<string, { id: string; score: number }[]>();
  for (const s of scores) {
    if (!subjectGroups.has(s.subject)) subjectGroups.set(s.subject, []);
    subjectGroups.get(s.subject)!.push({ id: s.studentId, score: s.score });
  }
  for (const [subject, entries] of subjectGroups) {
    const rankMap = assignRanks(entries);
    for (const s of scores) {
      if (s.subject === subject) {
        s.subjectRank = rankMap.get(s.studentId) ?? 0;
      }
    }
  }

  const totals = new Map<string, number>();
  for (const s of scores) {
    totals.set(s.studentId, (totals.get(s.studentId) || 0) + s.score);
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const rankById = new Map<string, number>();
  sorted.forEach(([id], idx) => rankById.set(id, idx + 1));
  for (const s of scores) {
    s.classRank = rankById.get(s.studentId) ?? 0;
  }
  return scores;
}

// ============================================================
// 首次初始化：把 mock 基线写入 Supabase
// ============================================================
async function seedSupabase() {
  if (!supabase) return;
  try {
    await Promise.all([
      supabase.from('students').upsert(mockStudents.map(studentToRow)),
      supabase.from('schedule_events').upsert(initialScheduleEvents.map(scheduleToRow)),
      supabase.from('reminders').upsert(mockReminders.map(reminderToRow)),
      supabase.from('announcements').upsert(mockAnnouncements.map(announcementToRow)),
      supabase.from('user_settings').upsert(settingsToRow(defaultSettings)),
    ]);
  } catch (e) {
    console.error('[supabase] seed failed', e);
  }
}

// 防止 StrictMode 重复加载
let loadPromise: Promise<void> | null = null;

interface Store {
  dataLoaded: boolean;
  supabaseError: string | null;
  loadFromSupabase: () => Promise<void>;

  examList: string[];
  addExam: (name: string, date: string) => void;
  removeExam: (name: string) => void;
  updateExamDate: (name: string, date: string) => void;

  reminders: Reminder[];
  toggleReminder: (id: string) => void;
  addReminder: (r: Omit<Reminder, 'id'>) => void;
  removeReminder: (id: string) => void;

  students: Student[];
  addStudent: (s: Omit<Student, 'id'>) => void;
  removeStudents: (ids: string[]) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  importStudents: (students: Student[]) => void;
  updateStudentRanks: (rankings: ComputedRanking[]) => void;

  announcements: Announcement[];
  addAnnouncement: (a: Omit<Announcement, 'id'>) => void;
  removeAnnouncement: (id: string) => void;

  exams: Exam[];
  scores: Score[];
  studentScoreTrend: Record<string, ExamTrendPoint[]>;
  examTrendData: ExamTrendPoint[];
  importScores: (
    newScores: Score[],
    newTrend: Record<string, ExamTrendPoint[]>,
    newExamTrend: ExamTrendPoint[]
  ) => void;
  updateExamScores: (
    studentId: string,
    examId: string,
    updates: { subject: string; score: number }[]
  ) => void;
  batchUpdateScores: (
    updates: { studentId: string; examId: string; subject: string; score: number }[]
  ) => void;
  importExamScores: (params: {
    newScores: Score[];
    newTrend: Record<string, ExamTrendPoint[]>;
    newExamTrend: ExamTrendPoint[];
    rankings: ComputedRanking[];
    examName: string;
  }) => void;

  scheduleEvents: ScheduleEvent[];
  addScheduleEvent: (e: Omit<ScheduleEvent, 'id'>) => void;
  removeScheduleEvent: (id: string) => void;

  activeClass: string;
  setActiveClass: (cls: string) => void;

  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  activePage: PageKey;
  setActivePage: (page: PageKey) => void;

  currentExamIndex: number;
  setCurrentExamIndex: (idx: number) => void;

  userSettings: UserSettings;
  updateSettings: (s: Partial<UserSettings>) => void;
  updateNotification: (key: keyof UserSettings['notifications'], value: boolean) => void;
}

export const useStore = create<Store>((set, get) => ({
  dataLoaded: false,
  supabaseError: null,
  examList: [],
  addExam: (name, date) => {
    set((state) => {
      const examDates = { ...state.userSettings.examDates, [name]: date };
      return {
        userSettings: { ...state.userSettings, examDates },
        examList: buildExamList(state.scores, examDates),
      };
    });
    upsertSettings(get().userSettings);
  },
  removeExam: (name) => {
    deleteScoresByExam(name);
    set((state) => {
      const examDates = { ...state.userSettings.examDates };
      delete examDates[name];
      const nextScores = state.scores.filter((s) => s.examId !== name);
      const derived = nextScores.length
        ? deriveExamData(nextScores, state.userSettings.examDates)
        : { exams: [], studentScoreTrend: {}, examTrendData: [] };
      return {
        scores: nextScores,
        userSettings: { ...state.userSettings, examDates },
        exams: applyExamDates(derived.exams, state.userSettings.examDates),
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        examList: buildExamList(nextScores, examDates),
      };
    });
    upsertSettings(get().userSettings);
  },
  updateExamDate: (name, date) => {
    set((state) => {
      const examDates = { ...state.userSettings.examDates, [name]: date };
      return {
        userSettings: { ...state.userSettings, examDates },
        examList: buildExamList(state.scores, examDates),
      };
    });
    upsertSettings(get().userSettings);
  },
  loadFromSupabase: async () => {
    if (loadPromise) return loadPromise;
    if (!isSupabaseConfigured || !supabase) {
      set({ dataLoaded: true, supabaseError: null });
      return;
    }
    loadPromise = (async () => {
      try {
        const { data: settingsRows, error: sErr } = await supabase
          .from('user_settings')
          .select('*');
        if (sErr) throw sErr;

        // 尚未初始化：写入 mock 基线，保持本地 mock 状态
        if (!settingsRows || settingsRows.length === 0) {
          await seedSupabase();
          set({
            students: [...mockStudents],
            scores: [...mockScores],
            scheduleEvents: [...initialScheduleEvents],
            reminders: [...mockReminders],
            announcements: [...mockAnnouncements],
            userSettings: { ...defaultSettings },
            exams: [...mockExams],
            studentScoreTrend: { ...initialStudentScoreTrend },
            examTrendData: [...initialExamTrendData],
            examList: buildExamList(mockScores, defaultSettings.examDates),
            activeClass: defaultSettings.className,
            dataLoaded: true,
            supabaseError: null,
          });
          return;
        }

        const [stu, sco, sch, rem, ann] = await Promise.all([
          supabase.from('students').select('*'),
          supabase.from('scores').select('*'),
          supabase.from('schedule_events').select('*'),
          supabase.from('reminders').select('*'),
          supabase.from('announcements').select('*').order('date', { ascending: false }),
        ]);

        const rawStudents = (stu.data ?? []).map((r) => rowToStudent(r as AnyRow));
        const scores = (sco.data ?? []).map((r) => rowToScore(r as AnyRow));
        const scheduleEvents = (sch.data ?? []).map((r) => rowToSchedule(r as AnyRow));
        const reminders = (rem.data ?? []).map((r) => rowToReminder(r as AnyRow));
        const announcements = (ann.data ?? []).map((r) => rowToAnnouncement(r as AnyRow));
        const userSettings = rowToSettings(settingsRows[0] as AnyRow);
        const normalizedStudents = rawStudents.map((s) => ({
          ...s,
          className: userSettings.className,
        }));
        const studentsNeedSync =
          rawStudents.length > 0 &&
          normalizedStudents.some((s, i) => s.className !== rawStudents[i].className);

        // 有成绩时由成绩派生 exam/trend；无成绩时退回 mock（保持原演示效果）
        const derived = scores.length
          ? deriveExamData(scores, userSettings.examDates)
          : { exams: [], studentScoreTrend: {}, examTrendData: [] };
        const derivedExams = derived.exams.map((e) => ({
          ...e,
          date: userSettings.examDates[e.name] || e.date,
        }));
        const examList = buildExamList(scores, userSettings.examDates);

        set({
          students: normalizedStudents.length ? normalizedStudents : [],
          scores,
          scheduleEvents: scheduleEvents.length ? scheduleEvents : [],
          reminders: reminders.length ? reminders : [],
          announcements: announcements.length ? announcements : [],
          userSettings,
          exams: derivedExams,
          studentScoreTrend: derived.studentScoreTrend,
          examTrendData: derived.examTrendData,
          examList,
          activeClass: userSettings.className || '高一(3)班',
          dataLoaded: true,
          supabaseError: null,
        });
        if (studentsNeedSync) {
          void upsertStudents(normalizedStudents);
        }
      } catch (e) {
        console.error('[supabase] 加载失败，使用本地 mock 数据', e);
        set({
          dataLoaded: true,
          supabaseError: '云端数据加载失败，当前显示本地示例数据，请检查网络后重试。',
        });
      } finally {
        loadPromise = null;
      }
    })();
    return loadPromise;
  },

  reminders: [...mockReminders],
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
    set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id) }));
    deleteReminderRow(id);
  },

  students: [...mockStudents],
  addStudent: (s) => {
    const newStudent: Student = { ...s, id: Date.now().toString() };
    set((state) => ({ students: [...state.students, newStudent] }));
    upsertStudents([newStudent]);
  },
  updateStudent: (id, updates) => {
    set((state) => ({
      students: state.students.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    const updated = get().students.find((s) => s.id === id);
    if (updated) upsertStudents([updated]);
  },
  removeStudent: (id) => {
    deleteStudentRow(id);
    deleteScoresByStudents([id]);
    set((state) => {
      const nextScores = state.scores.filter((s) => s.studentId !== id);
      const derived = nextScores.length
        ? deriveExamData(nextScores, state.userSettings.examDates)
        : { exams: [], studentScoreTrend: {}, examTrendData: [] };
      return {
        students: state.students.filter((s) => s.id !== id),
        scores: nextScores,
        exams: derived.exams,
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        examList: buildExamList(nextScores, state.userSettings.examDates),
      };
    });
  },
  removeStudents: (ids) => {
    if (ids.length === 0) return;
    deleteStudentRows(ids);
    deleteScoresByStudents(ids);
    set((state) => {
      const nextStudents = state.students.filter((s) => !ids.includes(s.id));
      const nextScores = state.scores.filter((s) => !ids.includes(s.studentId));
      const derived = nextScores.length
        ? deriveExamData(nextScores, state.userSettings.examDates)
        : { exams: [], studentScoreTrend: {}, examTrendData: [] };
      return {
        students: nextStudents,
        scores: nextScores,
        exams: applyExamDates(derived.exams, state.userSettings.examDates),
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        examList: buildExamList(nextScores, state.userSettings.examDates),
      };
    });
  },
  importStudents: (students) => {
    const existing = get().students;
    const normalized = students.map((s) => {
      const match = existing.find((e) => e.studentNo === s.studentNo);
      return match
        ? { ...s, id: match.id, className: match.className || s.className }
        : s;
    });
    const merged = [
      ...normalized,
      ...existing.filter(
        (e) => !normalized.find((ns) => ns.studentNo === e.studentNo)
      ),
    ];
    set({ students: merged });
    upsertStudents(normalized);
  },
  updateStudentRanks: (rankings) => {
    const updated: Student[] = [];
    set((state) => ({
      students: state.students.map((s) => {
        const ranking = rankings.find(
          (r) => r.studentId === s.id || r.studentNo === s.studentNo
        );
        if (ranking) {
          const next = { ...s, totalScore: ranking.totalScore, rank: ranking.rank };
          updated.push(next);
          return next;
        }
        return s;
      }),
    }));
    upsertStudents(updated);
  },

  announcements: [...mockAnnouncements],
  addAnnouncement: (a) => {
    const newAnnouncement: Announcement = { ...a, id: Date.now().toString() };
    set((state) => ({
      announcements: [newAnnouncement, ...state.announcements],
    }));
    upsertAnnouncements([newAnnouncement]);
  },
  removeAnnouncement: (id) => {
    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    }));
    deleteAnnouncementRow(id);
  },

  exams: [...mockExams],
  scores: [...mockScores],
  studentScoreTrend: { ...initialStudentScoreTrend },
  examTrendData: [...initialExamTrendData],
  importScores: (newScores, newTrend, newExamTrend) => {
    const existing = get().students;
    const idByStudentNo = new Map(existing.map((s) => [s.studentNo, s.id]));
    const mapId = (sid: string) => idByStudentNo.get(sid) || sid;
    const mappedScores = newScores.map((sc) => ({
      ...sc,
      studentId: mapId(sc.studentId),
    }));
    const mappedTrend: Record<string, ExamTrendPoint[]> = {};
    for (const [sid, points] of Object.entries(newTrend)) {
      mappedTrend[mapId(sid)] = points;
    }
    set((state) => {
      const combinedScores = [...mappedScores, ...state.scores];
      const derived = deriveExamData(
        combinedScores,
        state.userSettings.examDates
      );
      return {
        scores: combinedScores,
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        exams: applyExamDates(derived.exams, state.userSettings.examDates),
        examList: buildExamList(
          combinedScores,
          state.userSettings.examDates
        ),
      };
    });
    upsertScores(mappedScores);
  },
  updateExamScores: (studentId, examId, updates) => {
    let updatedScores: Score[] = [];
    let updatedStudents: Student[] = [];
    set((state) => {
      const nextScores = recomputeExamRanks(
        state.scores.map((s) => {
          if (s.studentId !== studentId || s.examId !== examId) return s;
          const update = updates.find((u) => u.subject === s.subject);
          return update ? { ...s, score: update.score } : s;
        })
      );
      const derived = deriveExamData(
        nextScores,
        state.userSettings.examDates
      );
      const examOrder = buildExamList(nextScores, state.userSettings.examDates);
      const latestExamId = examOrder[examOrder.length - 1] || '';
      const totals = new Map<string, number>();
      for (const s of nextScores) {
        if (!latestExamId || s.examId !== latestExamId) continue;
        totals.set(s.studentId, (totals.get(s.studentId) || 0) + s.score);
      }
      const sortedStudents = [...totals.entries()].sort((a, b) => b[1] - a[1]);
      const rankById = new Map<string, number>();
      sortedStudents.forEach(([id], idx) => rankById.set(id, idx + 1));
      updatedStudents = state.students.map((st) => {
        const total = totals.get(st.id);
        if (total === undefined) return st;
        return { ...st, totalScore: total, rank: rankById.get(st.id) || 0 };
      });
      updatedScores = nextScores.filter((s) => s.examId === examId);
      return {
        scores: nextScores,
        students: updatedStudents,
        exams: derived.exams,
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        examList: buildExamList(nextScores, state.userSettings.examDates),
      };
    });
    if (updatedScores.length > 0) upsertScores(updatedScores);
    if (updatedStudents.length > 0) upsertStudents(updatedStudents);
  },
  batchUpdateScores: (updates) => {
    let updatedScores: Score[] = [];
    let updatedStudents: Student[] = [];
    set((state) => {
      const updateMap = new Map(
        updates.map((u) => [`${u.studentId}|${u.examId}|${u.subject}`, u.score])
      );
      const nextScores = recomputeExamRanks(
        state.scores.map((s) => {
          const score = updateMap.get(`${s.studentId}|${s.examId}|${s.subject}`);
          return score === undefined ? s : { ...s, score };
        })
      );
      const derived = deriveExamData(
        nextScores,
        state.userSettings.examDates
      );
      const examOrder = buildExamList(nextScores, state.userSettings.examDates);
      const latestExamId = examOrder[examOrder.length - 1] || '';
      const totals = new Map<string, number>();
      for (const s of nextScores) {
        if (!latestExamId || s.examId !== latestExamId) continue;
        totals.set(s.studentId, (totals.get(s.studentId) || 0) + s.score);
      }
      const sortedStudents = [...totals.entries()].sort((a, b) => b[1] - a[1]);
      const rankById = new Map<string, number>();
      sortedStudents.forEach(([id], idx) => rankById.set(id, idx + 1));
      updatedStudents = state.students.map((st) => {
        const total = totals.get(st.id);
        if (total === undefined) return st;
        return { ...st, totalScore: total, rank: rankById.get(st.id) || 0 };
      });
      const affectedExamIds = new Set(updates.map((u) => u.examId));
      updatedScores = nextScores.filter((s) => affectedExamIds.has(s.examId));
      return {
        scores: nextScores,
        students: updatedStudents,
        exams: derived.exams,
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        examList: buildExamList(nextScores, state.userSettings.examDates),
      };
    });
    if (updatedScores.length > 0) upsertScores(updatedScores);
    if (updatedStudents.length > 0) upsertStudents(updatedStudents);
  },
  importExamScores: ({ newScores, newTrend, newExamTrend, rankings, examName }) => {
    let updatedStudents: Student[] = [];
    const existing = get().students;
    const idByStudentNo = new Map(existing.map((s) => [s.studentNo, s.id]));
    const mapId = (sid: string) => idByStudentNo.get(sid) || sid;
    const mappedScores = newScores.map((sc) => ({
      ...sc,
      studentId: mapId(sc.studentId),
    }));
    const mappedTrend: Record<string, ExamTrendPoint[]> = {};
    for (const [sid, points] of Object.entries(newTrend)) {
      mappedTrend[mapId(sid)] = points;
    }
    const mappedRankings = rankings.map((r) => ({
      ...r,
      studentId: mapId(r.studentId),
    }));
    set((state) => {
      const updated = state.students.map((s) => {
        const ranking = mappedRankings.find(
          (r) => r.studentId === s.id || r.studentNo === s.studentNo
        );
        if (ranking) {
          const prevTrend = state.studentScoreTrend[s.id];
          let trend: 'up' | 'down' | 'stable' = 'stable';
          let trendValue = 0;

          if (prevTrend && prevTrend.length > 0) {
            const lastExam = prevTrend[prevTrend.length - 1];
            const prevTotal = Object.entries(lastExam)
              .filter(([k]) => !['examName', 'date'].includes(k))
              .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
            trendValue = ranking.totalScore - prevTotal;
            if (trendValue > 0) trend = 'up';
            else if (trendValue < 0) trend = 'down';
          }

          const next = {
            ...s,
            totalScore: ranking.totalScore,
            rank: ranking.rank,
            trend,
            trendValue,
          };
          updatedStudents.push(next);
          return next;
        }
        return s;
      });

      const existingExamNames = new Set(state.exams.map((e) => e.name));
      let updatedExams = [...state.exams];
      if (examName && !existingExamNames.has(examName)) {
        const subjectAverages: Record<string, number> = {};
        const subjectCounts: Record<string, number> = {};
        for (const score of mappedScores) {
          if (score.examId === examName) {
            subjectAverages[score.subject] = (subjectAverages[score.subject] || 0) + score.score;
            subjectCounts[score.subject] = (subjectCounts[score.subject] || 0) + 1;
          }
        }
        const today =
          state.userSettings.examDates[examName] ||
          new Date().toISOString().split('T')[0];
        for (const [subject, total] of Object.entries(subjectAverages)) {
          const count = subjectCounts[subject] || 1;
          const avg = Math.round((total / count) * 10) / 10;
          updatedExams.push({
            id: `${examName}-${subject}`,
            name: examName,
            date: today,
            subject,
            classAverage: avg,
            gradeAverage: avg,
          });
        }
      }

      const combinedScores = [...mappedScores, ...state.scores];
      const derived = deriveExamData(
        combinedScores,
        state.userSettings.examDates
      );
      return {
        students: updated,
        exams: applyExamDates(derived.exams, state.userSettings.examDates),
        scores: combinedScores,
        studentScoreTrend: derived.studentScoreTrend,
        examTrendData: derived.examTrendData,
        examList: buildExamList(
          combinedScores,
          state.userSettings.examDates
        ),
      };
    });
    upsertStudents(updatedStudents);
    upsertScores(mappedScores);
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

  activeClass: '高一(3)班',
  setActiveClass: (cls) => set({ activeClass: cls }),

  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activePage: 'dashboard',
  setActivePage: (page: PageKey) => set({ activePage: page }),

  currentExamIndex: 2,
  setCurrentExamIndex: (idx: number) => set({ currentExamIndex: idx }),

  userSettings: { ...defaultSettings },
  updateSettings: (s) => {
    let next: UserSettings | undefined;
    let updatedStudents: Student[] = [];
    set((state) => {
      next = { ...state.userSettings, ...s };
      if (s.className && s.className !== state.userSettings.className) {
        updatedStudents = state.students.map((st) => ({
          ...st,
          className: s.className as string,
        }));
        return {
          userSettings: next,
          activeClass: s.className,
          students: updatedStudents,
        };
      }
      return {
        userSettings: next,
        activeClass: s.className || state.activeClass,
      };
    });
    if (next) upsertSettings(next);
    if (updatedStudents.length > 0) upsertStudents(updatedStudents);
  },
  updateNotification: (key, value) => {
    let next: UserSettings | undefined;
    set((state) => {
      next = {
        ...state.userSettings,
        notifications: { ...state.userSettings.notifications, [key]: value },
      };
      return { userSettings: next };
    });
    if (next) upsertSettings(next);
  },
}));
