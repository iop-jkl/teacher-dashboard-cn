-- ============================================================
-- 学生端支持：
--   1. students 加 auth_id 列（关联 Supabase Auth 用户）
--   2. 角色级 RLS：admin/teacher 全权；student 仅看自己
--   3. anonymous_messages 匿名信表
-- 运行方式：node scripts/run-migration.mjs supabase/migrations/0006_students.sql
-- 注意：必须先创建学生 Auth 账号（scripts/create-student-users.mjs）
--      并回填 auth_id，学生才能登录读取自己数据
-- ============================================================

begin;

-- 1. students 加 auth_id
alter table public.students add column if not exists auth_id uuid;

-- 2. 删除旧的全员（authenticated）放开策略
drop policy if exists "auth all on students" on public.students;
drop policy if exists "auth all on exams" on public.exams;
drop policy if exists "auth all on exam_scores" on public.exam_scores;
drop policy if exists "auth all on class_teachers" on public.class_teachers;
drop policy if exists "auth all on reminders" on public.reminders;
drop policy if exists "auth all on schedule_events" on public.schedule_events;

-- 3. 辅助函数：取 JWT 中的角色
create or replace function public.current_role() returns text
  language sql stable
  as $$ select coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') $$;

-- 4. students：admin/teacher 全权；student 仅自己一行
create policy "staff all on students" on public.students
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));
create policy "student self on students" on public.students
  for select to authenticated
  using (auth.uid() = auth_id);

-- 5. exam_scores：admin/teacher 全权；student 仅自己成绩
create policy "staff all on exam_scores" on public.exam_scores
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));
create policy "student self on exam_scores" on public.exam_scores
  for select to authenticated
  using (student_id in (select s.id_card from public.students s where s.auth_id = auth.uid()));

-- 6. exams：admin/teacher 全权；student 只读
create policy "staff all on exams" on public.exams
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));
create policy "student read exams" on public.exams
  for select to authenticated
  using (true);

-- 7. schedule_events：admin/teacher 全权；student 只读（学校日程）
create policy "staff all on schedule_events" on public.schedule_events
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));
create policy "student read schedule_events" on public.schedule_events
  for select to authenticated
  using (true);

-- 8. class_teachers：admin/teacher 全权；student 只读（看班主任姓名）
create policy "staff all on class_teachers" on public.class_teachers
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));
create policy "student read class_teachers" on public.class_teachers
  for select to authenticated
  using (true);

-- 9. reminders：仅 admin/teacher（学生不可见）
create policy "staff all on reminders" on public.reminders
  for all to authenticated
  using (public.current_role() in ('admin', 'teacher'))
  with check (public.current_role() in ('admin', 'teacher'));

-- 10. 匿名信表
create table if not exists public.anonymous_messages (
  id bigint generated always as identity primary key,
  class_no integer not null,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.anonymous_messages enable row level security;

-- 学生可投递：班级号从 JWT 中取，防止伪造（只能投到自己班级）
create policy "student insert anonymous_messages" on public.anonymous_messages
  for insert to authenticated
  with check (
    public.current_role() = 'student'
    and class_no = coalesce((auth.jwt() -> 'user_metadata' ->> 'class_no')::int, 0)
  );
-- 班主任可读/删除本班匿名信
create policy "teacher read anonymous_messages" on public.anonymous_messages
  for select to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = coalesce((auth.jwt() -> 'user_metadata' ->> 'class_no')::int, 0)
  );
create policy "teacher delete anonymous_messages" on public.anonymous_messages
  for delete to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = coalesce((auth.jwt() -> 'user_metadata' ->> 'class_no')::int, 0)
  );

-- 11. 索引
create index if not exists anonymous_messages_class_no_idx on public.anonymous_messages (class_no);
create index if not exists students_auth_id_idx on public.students (auth_id);

commit;
