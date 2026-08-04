-- ============================================================
-- 安全加固：
--   1. class_teachers 移除 password 列（密码迁移到 Supabase Auth）
--   2. RLS 收紧：students/exams/exam_scores/class_teachers/
--      reminders/schedule_events 仅允许已登录（authenticated）访问，
--      anon 一律拒绝
-- 运行方式：Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- 注意：必须先运行 scripts/create-auth-users.mjs 创建 Auth 账号
-- ============================================================

begin;

-- 1. 移除密码列（登录改用 Supabase Auth）
alter table public.class_teachers drop column if exists password;

-- 2. 收紧 RLS：先删除旧的 anon 全放开策略
drop policy if exists "allow all on students" on public.students;
drop policy if exists "allow all on exams" on public.exams;
drop policy if exists "allow all on exam_scores" on public.exam_scores;
drop policy if exists "allow all on class_teachers" on public.class_teachers;
drop policy if exists "allow all on reminders" on public.reminders;
drop policy if exists "allow all on schedule_events" on public.schedule_events;

-- 3. 仅 authenticated（登录后）可访问
create policy "auth all on students" on public.students
  for all to authenticated using (true) with check (true);
create policy "auth all on exams" on public.exams
  for all to authenticated using (true) with check (true);
create policy "auth all on exam_scores" on public.exam_scores
  for all to authenticated using (true) with check (true);
create policy "auth all on class_teachers" on public.class_teachers
  for all to authenticated using (true) with check (true);
create policy "auth all on reminders" on public.reminders
  for all to authenticated using (true) with check (true);
create policy "auth all on schedule_events" on public.schedule_events
  for all to authenticated using (true) with check (true);

-- 4. 已存在但不再使用的表也收紧（防泄露；表可能不存在，用 DO 块安全处理）
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'scores') then
    drop policy if exists "allow all on scores" on public.scores;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'announcements') then
    drop policy if exists "allow all on announcements" on public.announcements;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'user_settings') then
    drop policy if exists "allow all on user_settings" on public.user_settings;
  end if;
end $$;

commit;
