-- ============================================================
-- 学生目标分 + 班主任评语
--   1. student_goals 表：学生自设总分目标（student 可读写自己，
--      staff 可读全部用于批注参考）
--   2. students.teacher_comment 列：班主任评语（staff 可写，
--      student 只读自己的）
-- ============================================================

begin;

-- 1. 目标分表
create table if not exists public.student_goals (
  student_id text primary key references public.students(id_card) on delete cascade,
  total_goal numeric,
  updated_at timestamptz not null default now()
);

alter table public.student_goals enable row level security;

-- staff（admin/teacher）全权
create policy "staff all on student_goals" on public.student_goals
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));

-- 学生只能读写自己的目标
create policy "student own on student_goals" on public.student_goals
  for all to authenticated
  using (
    public.current_role() = 'student'
    and student_id in (select s.id_card from public.students s where s.auth_id = auth.uid())
  )
  with check (
    public.current_role() = 'student'
    and student_id in (select s.id_card from public.students s where s.auth_id = auth.uid())
  );

-- 2. 班主任评语列
alter table public.students add column if not exists teacher_comment text;

commit;
