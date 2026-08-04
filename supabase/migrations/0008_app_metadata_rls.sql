-- ============================================================
-- 安全修复 v2：
--   A. 角色判断改读 app_metadata（user_metadata 用户可篡改，
--       app_metadata 仅服务端可写）
--   B. 收紧班主任权限：teacher 仅能读写本班 students/
--      exam_scores/class_teachers，本班 reminders/schedule_events，
--      全校 exams 只读；admin 全权
--   C. anonymous_messages 补 teacher update 策略（标记已读/未读）
-- 前置：必须先运行 scripts/migrate-metadata.mjs 迁移权限字段
-- ============================================================

begin;

-- 1. 角色判断函数改读 app_metadata
create or replace function public.current_role() returns text
  language sql stable
  as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') $$;

-- 2. 辅助函数：当前班级号（app_metadata）
create or replace function public.current_class_no() returns int
  language sql stable
  as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'class_no')::int, 0) $$;

-- ============ students ============
drop policy if exists "staff all on students" on public.students;
drop policy if exists "student self on students" on public.students;
create policy "admin all on students" on public.students
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "teacher own class on students" on public.students
  for all to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  )
  with check (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  );
create policy "student self on students" on public.students
  for select to authenticated
  using (auth.uid() = auth_id);

-- ============ exam_scores ============
drop policy if exists "staff all on exam_scores" on public.exam_scores;
drop policy if exists "student self on exam_scores" on public.exam_scores;
create policy "admin all on exam_scores" on public.exam_scores
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "teacher own class on exam_scores" on public.exam_scores
  for all to authenticated
  using (
    public.current_role() = 'teacher'
    and student_id in (
      select s.id_card from public.students s
      where s.class_no = public.current_class_no()
    )
  )
  with check (
    public.current_role() = 'teacher'
    and student_id in (
      select s.id_card from public.students s
      where s.class_no = public.current_class_no()
    )
  );
create policy "student self on exam_scores" on public.exam_scores
  for select to authenticated
  using (student_id in (select s.id_card from public.students s where s.auth_id = auth.uid()));

-- ============ exams（teacher 只读，admin 全权） ============
drop policy if exists "staff all on exams" on public.exams;
drop policy if exists "student read exams" on public.exams;
create policy "admin all on exams" on public.exams
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "staff read exams" on public.exams
  for select to authenticated
  using (public.current_role() in ('admin', 'teacher'));
create policy "student read exams" on public.exams
  for select to authenticated
  using (true);

-- ============ schedule_events（teacher 本班/学校，admin 全权） ============
drop policy if exists "staff all on schedule_events" on public.schedule_events;
drop policy if exists "student read schedule_events" on public.schedule_events;
create policy "admin all on schedule_events" on public.schedule_events
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "teacher on schedule_events" on public.schedule_events
  for all to authenticated
  using (
    public.current_role() = 'teacher'
    and (
      owner is null or owner = 'admin' or owner = public.current_class_no()::text
    )
  )
  with check (
    public.current_role() = 'teacher'
    and (owner is null or owner = 'admin' or owner = public.current_class_no()::text)
  );
create policy "student read schedule_events" on public.schedule_events
  for select to authenticated
  using (owner is null or owner = 'admin');

-- ============ class_teachers（teacher 仅本班） ============
drop policy if exists "staff all on class_teachers" on public.class_teachers;
drop policy if exists "student read class_teachers" on public.class_teachers;
create policy "admin all on class_teachers" on public.class_teachers
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "teacher own class on class_teachers" on public.class_teachers
  for all to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  )
  with check (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  );
create policy "student read class_teachers" on public.class_teachers
  for select to authenticated
  using (true);

-- ============ reminders（teacher 本班/学校，admin 全权） ============
drop policy if exists "staff all on reminders" on public.reminders;
create policy "admin all on reminders" on public.reminders
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
create policy "teacher on reminders" on public.reminders
  for all to authenticated
  using (
    public.current_role() = 'teacher'
    and (owner is null or owner = 'admin' or owner = public.current_class_no()::text)
  )
  with check (
    public.current_role() = 'teacher'
    and (owner is null or owner = 'admin' or owner = public.current_class_no()::text)
  );

-- ============ anonymous_messages（补 teacher update 标记已读） ============
drop policy if exists "student insert anonymous_messages" on public.anonymous_messages;
create policy "student insert anonymous_messages" on public.anonymous_messages
  for insert to authenticated
  with check (
    public.current_role() = 'student'
    and class_no = public.current_class_no()
  );

drop policy if exists "teacher read anonymous_messages" on public.anonymous_messages;
create policy "teacher read anonymous_messages" on public.anonymous_messages
  for select to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  );

drop policy if exists "teacher update anonymous_messages" on public.anonymous_messages;
create policy "teacher update anonymous_messages" on public.anonymous_messages
  for update to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  )
  with check (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  );

drop policy if exists "teacher delete anonymous_messages" on public.anonymous_messages;
create policy "teacher delete anonymous_messages" on public.anonymous_messages
  for delete to authenticated
  using (
    public.current_role() = 'teacher'
    and class_no = public.current_class_no()
  );

-- 其余表（user_settings/announcements 等）不启用 RLS，无需处理。

commit;
