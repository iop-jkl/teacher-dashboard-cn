import { create } from 'zustand';
import type { Reminder, Exam, Student, Score, ClassTeacher, StudentGoal, GradeSummaryRow } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuth';
import { recomputeClassRanks, recomputeTotalRows } from '@/lib/scoreUtils';
import type { ParsedExamImport } from '@/utils/excelImport';

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
  owner?: string;
}

const initialScheduleEvents: ScheduleEvent[] = [];

type AnyRow = Record<string, unknown>;

function studentToRow(s: Student): AnyRow {
  return {
    id_card: s.idCard,
    name: s.name,
    class_no: s.classNo,
    grade: s.grade,
    selected_subjects: s.selectedSubjects,
    father_name: s.fatherName,
    father_phone: s.fatherPhone,
    father_wechat: s.fatherWechat,
    mother_name: s.motherName,
    mother_phone: s.motherPhone,
    mother_wechat: s.motherWechat,
    remark: s.remark,
    teacher_comment: s.teacherComment ?? null,
  };
}

function rowToStudent(r: AnyRow): Student {
  const raw = r.selected_subjects;
  return {
    idCard: String(r.id_card ?? ''),
    name: String(r.name ?? ''),
    classNo: Number(r.class_no ?? 0),
    grade: String(r.grade ?? '高一'),
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
    teacherComment: r.teacher_comment != null ? String(r.teacher_comment) : undefined,
  };
}

function examToRow(e: Exam): AnyRow {
  return {
    id: e.id,
    name: e.name,
    date: e.date || null,
    scope_class_no: e.scopeClassNo ?? 0,
  };
}

function rowToExam(r: AnyRow): Exam {
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    date: r.date ? String(r.date).slice(0, 10) : '',
    scopeClassNo: Number(r.scope_class_no ?? 0),
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
  };
}

function rowToGoal(r: AnyRow): StudentGoal {
  return {
    studentId: String(r.student_id ?? ''),
    totalGoal: r.total_goal == null ? null : Number(r.total_goal),
  };
}

function rowToGradeSummary(r: AnyRow): GradeSummaryRow {
  const subjectAvg: Record<string, number | null> = {};
  if (r.subject_avg && typeof r.subject_avg === 'object') {
    for (const [k, v] of Object.entries(r.subject_avg as Record<string, unknown>)) {
      subjectAvg[k] = v == null ? null : Number(v);
    }
  }
  return {
    examId: String(r.exam_id ?? ''),
    classNo: Number(r.class_no ?? 0),
    totalAvg: r.total_avg == null ? null : Number(r.total_avg),
    subjectAvg,
    studentCount: Number(r.student_count ?? 0),
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
    owner: e.owner ?? '',
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
    owner: r.owner ? String(r.owner) : '',
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
    owner: r.owner ?? '',
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
    owner: r.owner ? String(r.owner) : '',
  };
}

// 单向可见：管理员创建的（owner='admin' 或空）所有角色可见；
// 班主任创建的（owner=班号）仅本人可见，管理员不可见
function visibleRows<T extends { owner?: string }>(
  rows: T[],
  session: { role: string; classNo: number } | null,
): T[] {
  if (!session) return rows.filter((r) => !r.owner || r.owner === 'admin');
  if (session.role === 'admin' || session.role === 'guest') {
    return rows.filter((r) => !r.owner || r.owner === 'admin');
  }
  if (session.role === 'student') {
    return rows.filter((r) => !r.owner || r.owner === 'admin');
  }
  const mine = String(session.classNo);
  return rows.filter(
    (r) => !r.owner || r.owner === 'admin' || r.owner === mine,
  );
}

// 可修改判断：admin 数据（owner 为空视为 admin 创建）仅管理员可改；
// 班主任只能改自己创建的；访客一律不可改
export function canModifyRow(
  owner: string | undefined,
  session: { role: string; classNo: number } | null,
): boolean {
  if (!session || session.role === 'student' || session.role === 'guest') return false;
  if (session.role === 'admin') return true;
  if (!owner || owner === 'admin') return false;
  return owner === String(session.classNo);
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

async function deleteScoresByExam(examId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('exam_scores')
    .delete()
    .eq('exam_id', examId);
  if (error) console.error('[supabase] delete exam scores failed:', error.message);
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
    });
  if (error) console.error('[supabase] upsert class_teacher failed:', error.message);
}

function sortExamList(exams: Exam[]): string[] {
  return [...exams]
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
    .map((e) => e.name);
}

function mergeScores(existing: Score[], incoming: Score[]): Score[] {
  if (incoming.length === 0) return existing;
  const key = (s: Score) => `${s.studentId}\u0000${s.examId}\u0000${s.subject}`;
  const map = new Map<string, Score>();
  for (const s of existing) map.set(key(s), s);
  for (const s of incoming) map.set(key(s), s);
  return [...map.values()];
}

// 网络层无超时会导致请求无限挂起，这里统一加超时保护
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function fetchAllRows(
  table: string,
  orderBy: { column: string; ascending: boolean }[],
  filter?: { column: string; value: unknown | unknown[] },
): Promise<AnyRow[]> {
  if (!supabase) return [];
  const pageSize = 1000;
  type QueryFilter = ReturnType<ReturnType<NonNullable<typeof supabase>['from']>['select']>;
  const applyFilter = (values?: { column: string; value: unknown | unknown[] }) => (
    q: QueryFilter,
  ): QueryFilter => {
    if (!values) return q;
    return Array.isArray(values.value)
      ? q.in(values.column, values.value)
      : q.eq(values.column, values.value);
  };

  const rows: AnyRow[] = [];
  // 分页拉取直到出现不满一页的结果（免去额外的 count 往返请求）；
  // in() 列表场景可按条目数上限估算页数，避免并发 worker 抢跑发出大量空页请求
  const maxPages =
    filter && Array.isArray(filter.value) && filter.value.length > 0
      ? Math.ceil((filter.value.length * 32) / pageSize) + 1
      : 1000;
  // 限流并发 12，单页失败重试 3 次（退避）；仍有失败则整体抛错，由上层重试
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let cursor = 0;
  let done = false;
  let failedPages = 0;
  const workers = Array.from({ length: 12 }, async () => {
    while (!done) {
      const idx = cursor++;
      if (idx >= maxPages) break;
      let got: AnyRow[] | null = null;
      for (let attempt = 0; attempt < 3 && !got; attempt++) {
        try {
          let query = applyFilter(filter)(supabase.from(table).select('*'));
          for (const o of orderBy) {
            query = query.order(o.column, { ascending: o.ascending });
          }
          const page = await withTimeout(
            query.range(idx * pageSize, idx * pageSize + pageSize - 1),
            20000,
            `fetch ${table} page ${idx}`,
          );
          if (!page.error) {
            got = (page.data ?? []) as AnyRow[];
          } else {
            // 偶发 401/403：先刷新会话再重试
            const status = (page as { status?: number }).status;
            if (status === 401 || status === 403) {
              try {
                await supabase.auth.refreshSession();
              } catch {
                /* ignore */
              }
            }
            await sleep(800 * (attempt + 1));
          }
        } catch (e) {
          console.error(`[supabase] ${table} page ${idx} error:`, (e as Error)?.message);
          await sleep(800 * (attempt + 1));
        }
      }
      if (!got) {
        failedPages++;
        done = true;
        continue;
      }
      rows.push(...got);
      if (got.length < pageSize) done = true;
    }
  });
  await Promise.all(workers);
  if (failedPages > 0) {
    throw new Error(`fetch ${table} failed: ${failedPages} page(s) error`);
  }
  return rows;
}

let loadPromise: Promise<void> | null = null;

/** 访客为只读演示模式：所有写操作一律拦截 */
function isGuestSession(): boolean {
  return useAuthStore.getState().session?.role === 'guest';
}

async function fetchUnreadCount(
  session: { role: string; classNo: number } | null,
): Promise<number> {
  if (!supabase) return 0;
  const { role, classNo } = session ?? { role: '', classNo: 0 };
  if (role !== 'teacher' && role !== 'guest') return 0;
  if (role === 'teacher' && !classNo) return 0;
  let query = supabase
    .from('anonymous_messages')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);
  if (role === 'teacher') query = query.eq('class_no', classNo);
  const { count } = await query;
  return count ?? 0;
}

async function loadStudentData(
  studentId: string,
  set: (partial: Partial<Store>) => void,
) {
  if (!supabase) return;
  const [myRow, myScores, ex, sch, myGoal] = await Promise.all([
    supabase.from('students').select('*').eq('id_card', studentId).maybeSingle(),
    supabase.from('exam_scores').select('*').eq('student_id', studentId),
    supabase.from('exams').select('*'),
    supabase.from('schedule_events').select('*'),
    supabase
      .from('student_goals')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle(),
  ]);
  for (const r of [myRow, myScores, ex, sch, myGoal]) {
    if (r.error) throw r.error;
  }
  const students = myRow.data ? [rowToStudent(myRow.data as AnyRow)] : [];
  const scores = (myScores.data ?? []).map((r) => rowToScore(r as AnyRow));
  const exams = (ex.data ?? []).map((r) => rowToExam(r as AnyRow));
  const scheduleEvents = visibleRows(
    (sch.data ?? []).map((r) => rowToSchedule(r as AnyRow)),
    useAuthStore.getState().session,
  );
  const goals = myGoal.data
    ? [rowToGoal(myGoal.data as AnyRow)]
    : [];
  set({
    students,
    scores,
    exams,
    examList: sortExamList(exams),
    reminders: [],
    scheduleEvents,
    classTeachers: [],
    goals,
    dataLoaded: true,
    supabaseError: null,
  });
}

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
  reassignClass: (updates: Record<string, number>, grade: string) => void;
  updateParentInfo: (
    updates: Record<string, Partial<Student>>,
    classNo: number | null,
  ) => Promise<void>;

  scores: Score[];
  gradeSummary: GradeSummaryRow[];
  scoresLoading: number[];
  loadedScoreClasses: number[];
  loadScoresForClass: (classNo: number) => Promise<void>;
  loadScoresForStudent: (studentId: string) => Promise<void>;
  loadAllScores: () => Promise<void>;
  importExamFromExcel: (
    parsed: ParsedExamImport,
    examDate: string,
  ) => { imported: number; ignored: number };
  updateExamScores: (
    studentId: string,
    examId: string,
    updates: { subject: string; rawScore: number | null; assignedScore?: number | null }[],
  ) => void;

  classTeachers: ClassTeacher[];
  updateClassTeacher: (classNo: number, updates: Partial<ClassTeacher>) => void;

  goals: StudentGoal[];
  setStudentGoal: (studentId: string, totalGoal: number | null) => void;
  updateStudentComment: (idCard: string, comment: string) => void;

  unreadMessages: number;
  refreshUnreadMessages: () => Promise<void>;

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
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const session = useAuthStore.getState().session;
          if (session?.role === 'student' && session.studentId) {
            await loadStudentData(session.studentId, set);
            return;
          } else {
            // 班主任只加载本班学生与成绩（数千行，秒开）；admin 加载全部学生与轻表，
            // 成绩改为按需：均分类统计走 RPC 聚合（gradeSummary），明细按班级/学生懒加载
            const isTeacher = session?.role === 'admin' ? false : session?.role === 'teacher';
            const classFilter = isTeacher && session?.classNo
          ? { column: 'class_no', value: session.classNo }
          : undefined;
        const stuRows = await fetchAllRows(
          'students',
          [{ column: 'id_card', ascending: true }],
          classFilter,
        );
        const classIds = stuRows.map((r) => String(r.id_card ?? ''));
        const scoreFilter = isTeacher
          ? classIds.length > 0
            ? { column: 'student_id', value: classIds }
            : { column: 'student_id', value: ['__none__'] }
          : undefined;
        const isAdmin = session?.role === 'admin' || session?.role === 'guest';
        const [scoRows, ex, rem, sch, teachers, goalRows, summaryRows] =
          await withTimeout(
            Promise.all([
              scoreFilter
                ? fetchAllRows(
                    'exam_scores',
                    [
                      { column: 'student_id', ascending: true },
                      { column: 'exam_id', ascending: true },
                      { column: 'subject', ascending: true },
                    ],
                    scoreFilter,
                  )
                : Promise.resolve([]),
              isAdmin
                ? supabase
                    .from('exams')
                    .select('*')
                    .eq('scope_class_no', 0)
                : supabase.from('exams').select('*'),
              supabase.from('reminders').select('*'),
              supabase.from('schedule_events').select('*'),
              supabase.from('class_teachers').select('*').order('class_no'),
              supabase.from('student_goals').select('*'),
              isAdmin
                ? supabase.rpc('get_grade_summary')
                : Promise.resolve({ data: null, error: null }),
            ]),
            30000,
            'load initial tables',
          );
        for (const r of [ex, rem, sch, teachers, goalRows]) {
          if (r.error) throw r.error;
        }
        const students = stuRows.map((r) => rowToStudent(r));
        const scores = scoRows.map((r) => rowToScore(r));
        const exams = (ex.data ?? []).map((r) => rowToExam(r as AnyRow));
        const reminders = visibleRows(
          (rem.data ?? []).map((r) => rowToReminder(r as AnyRow)),
          session,
        );
        const scheduleEvents = visibleRows(
          (sch.data ?? []).map((r) => rowToSchedule(r as AnyRow)),
          session,
        );
        const classTeachers = (teachers.data ?? []).map((r) =>
          rowToTeacher(r as AnyRow),
        );
        const goals = (goalRows.data ?? []).map((r) =>
          rowToGoal(r as AnyRow),
        );
        const gradeSummary = isAdmin
          ? (summaryRows?.data ?? []).map((r) => rowToGradeSummary(r as AnyRow))
          : [];
        const unreadCount = await withTimeout(fetchUnreadCount(session), 15000, 'fetch unread count');
        set({
          students,
          scores,
          exams,
          examList: sortExamList(exams),
          reminders: reminders.length ? reminders : [],
          scheduleEvents: scheduleEvents.length ? scheduleEvents : [],
          classTeachers,
          goals,
          gradeSummary,
          unreadMessages: unreadCount,
          activeClass: get().activeClass,
          dataLoaded: true,
          supabaseError: null,
        });
        return;
        }
        } catch (e) {
          console.error(`[supabase] loadFromSupabase attempt ${attempt}/3 failed`, e);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }
      set({ dataLoaded: true, supabaseError: '云端数据加载失败，请检查网络后重试。' });
    })().finally(() => {
      loadPromise = null;
    });
    return loadPromise;
  },

  exams: [],
  examList: [],
  addExam: (name, date) => {
    if (isGuestSession()) return;
    const exam: Exam = {
      id: `exam-${Date.now()}`,
      name: name.trim(),
      date,
      scopeClassNo: 0,
    };
    set((state) => {
      const exams = [...state.exams, exam];
      return { exams, examList: sortExamList(exams) };
    });
    upsertExams([exam]);
  },
  removeExam: (id) => {
    if (isGuestSession()) return;
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
    if (isGuestSession()) return;
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
    const session = useAuthStore.getState().session;
    let toggled: Reminder | undefined;
    set((state) => ({
      reminders: state.reminders.map((r) => {
        if (r.id === id) {
          if (!canModifyRow(r.owner, session)) return r;
          toggled = { ...r, completed: !r.completed };
          return toggled;
        }
        return r;
      }),
    }));
    if (toggled) upsertReminders([toggled]);
  },
  addReminder: (r) => {
    if (isGuestSession()) return;
    const session = useAuthStore.getState().session;
    const newReminder: Reminder = {
      ...r,
      id: Date.now().toString(),
      owner: session?.role === 'admin' ? 'admin' : String(session?.classNo ?? ''),
    };
    set((state) => ({ reminders: [...state.reminders, newReminder] }));
    upsertReminders([newReminder]);
  },
  removeReminder: (id) => {
    const session = useAuthStore.getState().session;
    const target = get().reminders.find((r) => r.id === id);
    if (!target || !canModifyRow(target.owner, session)) return;
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
    deleteReminderRow(id);
  },

  students: [],
  addStudent: (s) => {
    if (isGuestSession()) return;
    const student: Student = {
      idCard: s.idCard.trim(),
      name: s.name.trim(),
      classNo: s.classNo,
      grade: s.grade || '高一',
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
    if (isGuestSession()) return;
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
  updateParentInfo: async (updates, classNo) => {
    if (isGuestSession()) return;
    if (!supabase) {
      set((state) => ({
        students: state.students.map((s) =>
          updates[s.idCard] ? { ...s, ...updates[s.idCard] } : s,
        ),
      }));
      return;
    }
    const session = useAuthStore.getState().session;
    const isTeacher = session?.role === 'teacher';
    const idCards = Object.keys(updates);
    const updateRows = idCards.map((idCard) => {
      const row: AnyRow = { id_card: idCard };
      const u = updates[idCard];
      if (u.fatherName !== undefined) row.father_name = u.fatherName || '';
      if (u.fatherPhone !== undefined) row.father_phone = u.fatherPhone || '';
      if (u.fatherWechat !== undefined) row.father_wechat = u.fatherWechat || '';
      if (u.motherName !== undefined) row.mother_name = u.motherName || '';
      if (u.motherPhone !== undefined) row.mother_phone = u.motherPhone || '';
      if (u.motherWechat !== undefined) row.mother_wechat = u.motherWechat || '';
      return row;
    });
    try {
      // admin/teacher 均逐条按 id_card 更新（teacher 额外限定本班，RLS 兜底）
      for (let i = 0; i < idCards.length; i++) {
        let query = supabase
          .from('students')
          .update(updateRows[i])
          .eq('id_card', idCards[i]);
        if (isTeacher && classNo) {
          query = query.eq('class_no', classNo);
        }
        const { error } = await query;
        if (error) throw error;
      }
    } catch (e) {
      console.error('[supabase] update parent info failed', e);
      set({ supabaseError: '家长信息保存失败，请检查网络后重试。' });
      return;
    }
    set((state) => ({
      students: state.students.map((s) =>
        updates[s.idCard] ? { ...s, ...updates[s.idCard] } : s,
      ),
    }));
  },
  removeStudent: (idCard) => {
    if (isGuestSession()) return;
    deleteStudentRows([idCard]);
    deleteScoresByStudents([idCard]);
    set((state) => ({
      students: state.students.filter((s) => s.idCard !== idCard),
      scores: state.scores.filter((s) => s.studentId !== idCard),
    }));
  },
  removeStudents: (idCards) => {
    if (isGuestSession() || idCards.length === 0) return;
    deleteStudentRows(idCards);
    deleteScoresByStudents(idCards);
    set((state) => ({
      students: state.students.filter((s) => !idCards.includes(s.idCard)),
      scores: state.scores.filter((s) => !idCards.includes(s.studentId)),
    }));
  },

  scores: [],
  gradeSummary: [],
  scoresLoading: [],
  loadedScoreClasses: [],
  loadScoresForClass: async (classNo) => {
    if (!supabase) return;
    const { loadedScoreClasses, scoresLoading } = get();
    if (loadedScoreClasses.includes(classNo) || scoresLoading.includes(classNo)) {
      return;
    }
    const session = useAuthStore.getState().session;
    if (session?.role !== 'admin' && session?.role !== 'guest') return;
    // 等待学生名单就绪（登录初期 students 尚未加载完成时）
    const waitStart = Date.now();
    while (get().students.length === 0) {
      if (Date.now() - waitStart > 60000) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    const classIds = get()
      .students.filter((s) => s.classNo === classNo)
      .map((s) => s.idCard);
    if (classIds.length === 0) {
      set({ loadedScoreClasses: [...get().loadedScoreClasses, classNo] });
      return;
    }
    set({ scoresLoading: [...scoresLoading, classNo] });
    try {
      const rows = await fetchAllRows(
        'exam_scores',
        [
          { column: 'student_id', ascending: true },
          { column: 'exam_id', ascending: true },
          { column: 'subject', ascending: true },
        ],
        { column: 'student_id', value: classIds },
      );
      const newScores = rows.map((r) => rowToScore(r));
      set((state) => ({
        scores: mergeScores(state.scores, newScores),
        scoresLoading: state.scoresLoading.filter((c) => c !== classNo),
        loadedScoreClasses: [...state.loadedScoreClasses, classNo],
      }));
    } catch (e) {
      console.error('[supabase] load class scores failed', e);
      set({ scoresLoading: get().scoresLoading.filter((c) => c !== classNo) });
    }
  },
  loadScoresForStudent: async (studentId) => {
    if (!supabase) return;
    const { scores } = get();
    const hasAllExams = (sid: string) => {
      const set = new Set(scores.filter((s) => s.studentId === sid).map((s) => s.examId));
      return set.size > 0 && set.size === get().exams.length;
    };
    if (hasAllExams(studentId)) return;
    const { error, data } = await supabase
      .from('exam_scores')
      .select('*')
      .eq('student_id', studentId);
    if (error) {
      console.error('[supabase] load student scores failed', error.message);
      return;
    }
    const newScores = (data ?? []).map((r) => rowToScore(r as AnyRow));
    set((state) => ({ scores: mergeScores(state.scores, newScores) }));
  },
  loadAllScores: async () => {
    if (!supabase) return;
    const { loadedScoreClasses, scoresLoading } = get();
    if (scoresLoading.includes(0)) return;
    // 先置位 loading 标记（单飞），再等待学生名单就绪
    set({ scoresLoading: [...scoresLoading, 0] });
    try {
      const waitStart = Date.now();
      while (get().students.length === 0) {
        if (Date.now() - waitStart > 60000) return;
        await new Promise((r) => setTimeout(r, 250));
      }
      const allClasses = [...new Set(get().students.map((s) => s.classNo))];
      const remaining = allClasses.filter((c) => !loadedScoreClasses.includes(c));
      if (remaining.length === 0) return;
      const idsByClass = new Map<number, string[]>();
      for (const s of get().students) {
        if (!remaining.includes(s.classNo)) continue;
        const ids = idsByClass.get(s.classNo) ?? [];
        ids.push(s.idCard);
        idsByClass.set(s.classNo, ids);
      }
      let cursor = 0;
      let failed = 0;
      // 按班级并发拉取，班级数据到位即合并，页面可渐进填充而非一次性等待全表
      const workers = Array.from({ length: 8 }, async () => {
        while (true) {
          const classNo = remaining[cursor++];
          if (classNo === undefined) break;
          const ids = idsByClass.get(classNo) ?? [];
          if (ids.length === 0) {
            set((state) => ({
              loadedScoreClasses: [...state.loadedScoreClasses, classNo],
            }));
            continue;
          }
          try {
            const rows = await fetchAllRows(
              'exam_scores',
              [
                { column: 'student_id', ascending: true },
                { column: 'exam_id', ascending: true },
                { column: 'subject', ascending: true },
              ],
              { column: 'student_id', value: ids },
            );
            const newScores = rows.map((r) => rowToScore(r));
            set((state) => ({
              scores: mergeScores(state.scores, newScores),
              loadedScoreClasses: [...state.loadedScoreClasses, classNo],
            }));
          } catch (e) {
            failed++;
            console.error('[supabase] load class scores failed', classNo, e);
          }
        }
      });
      await Promise.all(workers);
      if (failed === remaining.length) {
        set({ supabaseError: '云端数据加载失败，请检查网络后重试。' });
      }
    } finally {
      set({ scoresLoading: get().scoresLoading.filter((c) => c !== 0) });
    }
  },
  importExamFromExcel: (parsed, examDate) => {
    if (isGuestSession()) return { imported: 0, ignored: 0 };
    const session = useAuthStore.getState().session;
    const isTeacher = session?.role === 'teacher';
    const scopeClassNo = isTeacher ? session?.classNo ?? 0 : 0;

    // 班主任仅导入本班成绩：过滤出本班学生与成绩，其余忽略并计数
    let importStudents = parsed.students;
    let importScores = parsed.scores;
    let ignored = 0;
    if (isTeacher) {
      importStudents = parsed.students.filter((s) => s.classNo === scopeClassNo);
      const ownIds = new Set(importStudents.map((s) => s.idCard));
      importScores = parsed.scores.filter((s) => ownIds.has(s.studentId));
      ignored =
        parsed.students.length - importStudents.length +
        (parsed.scores.length - importScores.length);
    }

    const existing = get().exams.find(
      (e) => e.name === parsed.examName && e.scopeClassNo === scopeClassNo,
    );
    const examId = existing?.id || `exam-${Date.now()}`;
    const exam: Exam = {
      id: examId,
      name: parsed.examName,
      date: examDate,
      scopeClassNo,
    };
    const scoresWithExam = importScores.map((s) => ({ ...s, examId }));
    const existingStudents = get().students;
    const byId = new Map(existingStudents.map((s) => [s.idCard, s]));
    for (const s of importStudents) {
      const old = byId.get(s.idCard);
      byId.set(
        s.idCard,
        old
          ? {
              ...old,
              name: s.name,
              selectedSubjects: s.selectedSubjects,
              // 未分班学生用成绩表中的班级回填；已分班学生保持不动
              classNo: old.classNo === 0 ? s.classNo : old.classNo,
            }
          : s,
      );
    }
    const students = [...byId.values()];
    const mergedImport = importStudents.map((s) => {
      const old = byId.get(s.idCard);
      return old && old !== s
        ? {
            ...old,
            name: s.name,
            selectedSubjects: s.selectedSubjects,
            classNo: old.classNo === 0 ? s.classNo : old.classNo,
          }
        : s;
    });
    set((state) => {
      const exams = state.exams.some((e) => e.id === examId)
        ? state.exams.map((e) => (e.id === examId ? exam : e))
        : [...state.exams, exam];
      const examList = sortExamList(exams);
      return {
        exams,
        examList,
        students,
        scores: [
          ...scoresWithExam,
          ...state.scores.filter((s) => s.examId !== examId),
        ],
        currentExamIndex: Math.max(0, examList.length - 1),
      };
    });
    deleteScoresByExam(examId);
    upsertExams([exam]);
    upsertStudents(mergedImport);
    upsertScores(scoresWithExam);
    return { imported: importStudents.length, ignored };
  },
  updateExamScores: (studentId, examId, updates) => {
    if (isGuestSession()) return;
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
    if (isGuestSession()) return;
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

  goals: [],
  setStudentGoal: (studentId, totalGoal) => {
    if (isGuestSession()) return;
    const session = useAuthStore.getState().session;
    if (!session || session.role === 'student' && session.studentId !== studentId) {
      return;
    }
    const goal: StudentGoal = { studentId, totalGoal };
    set((state) => ({
      goals: [
        ...state.goals.filter((g) => g.studentId !== studentId),
        goal,
      ],
    }));
    if (!supabase) return;
    if (totalGoal == null) {
      supabase
        .from('student_goals')
        .delete()
        .eq('student_id', studentId)
        .then(({ error }) => {
          if (error) console.error('[supabase] delete goal failed:', error.message);
        });
    } else {
      supabase
        .from('student_goals')
        .upsert({ student_id: studentId, total_goal: totalGoal })
        .then(({ error }) => {
          if (error) console.error('[supabase] upsert goal failed:', error.message);
        });
    }
  },
  updateStudentComment: (idCard, comment) => {
    if (isGuestSession()) return;
    let updated: Student | undefined;
    set((state) => ({
      students: state.students.map((s) => {
        if (s.idCard === idCard) {
          updated = { ...s, teacherComment: comment };
          return updated;
        }
        return s;
      }),
    }));
    if (updated) upsertStudents([updated]);
  },

  unreadMessages: 0,
  refreshUnreadMessages: async () => {
    const session = useAuthStore.getState().session;
    const count = await fetchUnreadCount(session);
    set({ unreadMessages: count });
  },

  scheduleEvents: [...initialScheduleEvents],
  addScheduleEvent: (e) => {
    if (isGuestSession()) return;
    const session = useAuthStore.getState().session;
    const newEvent: ScheduleEvent = {
      ...e,
      id: Date.now().toString(),
      owner:
        session?.role === 'admin' ? 'admin' : String(session?.classNo ?? ''),
    };
    set((state) => ({ scheduleEvents: [...state.scheduleEvents, newEvent] }));
    upsertSchedule([newEvent]);
  },
  removeScheduleEvent: (id) => {
    const session = useAuthStore.getState().session;
    const target = get().scheduleEvents.find((e) => e.id === id);
    if (!target || !canModifyRow(target.owner, session)) return;
    set((state) => ({
      scheduleEvents: state.scheduleEvents.filter((e) => e.id !== id),
    }));
    deleteScheduleRow(id);
  },

  reassignClass: (updates, grade) => {
    // updates: idCard -> classNo（考勤分班后学生班级映射）
    const session = useAuthStore.getState().session;
    if (session?.role !== 'admin') return;
    const byClass = new Map<number, { idCards: string[] }>();
    for (const [idCard, classNo] of Object.entries(updates)) {
      if (!byClass.has(classNo)) byClass.set(classNo, { idCards: [] });
      byClass.get(classNo)!.idCards.push(idCard);
    }
    if (!supabase) {
      // 本地模式：直接在 store 更新
      set((state) => ({
        students: state.students.map((s) => {
          const no = updates[s.idCard];
          if (no === undefined) return s;
          return { ...s, classNo: no === 0 ? 0 : no, grade };
        }),
      }));
      return;
    }
    Promise.all(
      [...byClass.entries()].map(async ([classNo, { idCards }]) => {
        const { error } = await supabase
          .from('students')
          .update({ class_no: classNo, grade })
          .in('id_card', idCards);
        if (error) console.error('[supabase] reassign class failed:', error.message);
      }),
    );
    set((state) => ({
      students: state.students.map((s) => {
        const no = updates[s.idCard];
        if (no === undefined) return s;
        return { ...s, classNo: no === 0 ? 0 : no, grade };
      }),
    }));
  },

  activeClass: 0,
  setActiveClass: (cls) => {
    set({ activeClass: cls });
    const session = useAuthStore.getState().session;
    if (session?.role !== 'admin' && session?.role !== 'guest') return;
    if (cls > 0) get().loadScoresForClass(cls);
    if (cls === 0) get().loadAllScores();
  },

  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  currentExamIndex: 0,
  setCurrentExamIndex: (idx) => set({ currentExamIndex: idx }),
}));
