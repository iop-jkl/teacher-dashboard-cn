-- ============================================================
-- 班主任工作台 数据库 schema
-- 使用方法：登录 Supabase 项目后台 → SQL Editor → 粘贴本文件 → Run
-- ============================================================

-- 学生表
create table if not exists public.students (
  id text primary key,
  name text not null,
  student_no text,
  class_name text,
  avatar text default '',
  total_score integer default 0,
  rank integer default 0,
  trend text default 'stable',
  trend_value integer default 0,
  remark text,
  created_at timestamptz default now()
);

-- 成绩表
create table if not exists public.scores (
  id text primary key,
  student_id text,
  exam_id text,
  subject text,
  score numeric default 0,
  class_rank integer default 0,
  total_students integer default 0,
  created_at timestamptz default now()
);

-- 日程表
create table if not exists public.schedule_events (
  id text primary key,
  title text not null,
  date text,
  time text,
  location text,
  type text,
  created_at timestamptz default now()
);

-- 提醒表
create table if not exists public.reminders (
  id text primary key,
  title text not null,
  content text,
  type text,
  due_date text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 公告表
create table if not exists public.announcements (
  id text primary key,
  title text not null,
  content text,
  level text default 'info',
  date text,
  created_at timestamptz default now()
);

-- 用户设置表（单行，id 固定为 'default'）
create table if not exists public.user_settings (
  id text primary key default 'default',
  teacher_name text,
  class_name text,
  position text,
  notifications jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 索引（提升查询性能）
create index if not exists idx_scores_student_id on public.scores(student_id);
create index if not exists idx_scores_exam_id on public.scores(exam_id);

-- ============================================================
-- 行级安全 (RLS)
-- 说明：本应用为班主任个人工具，前端使用 anon key。
-- 这里对 anon 与 authenticated 开放完全访问。
-- 若需要更严格的权限，请改为只允许 authenticated 并接入 Supabase Auth。
-- ============================================================
alter table public.students enable row level security;
alter table public.scores enable row level security;
alter table public.schedule_events enable row level security;
alter table public.reminders enable row level security;
alter table public.announcements enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "allow all on students" on public.students;
create policy "allow all on students" on public.students
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on scores" on public.scores;
create policy "allow all on scores" on public.scores
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on schedule_events" on public.schedule_events;
create policy "allow all on schedule_events" on public.schedule_events
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on reminders" on public.reminders;
create policy "allow all on reminders" on public.reminders
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on announcements" on public.announcements;
create policy "allow all on announcements" on public.announcements
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on user_settings" on public.user_settings;
create policy "allow all on user_settings" on public.user_settings
  for all to anon, authenticated using (true) with check (true);

-- updated_at 触发器（user_settings）
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_settings_updated on public.user_settings;
create trigger trg_user_settings_updated
  before update on public.user_settings
  for each row execute function public.touch_updated_at();
