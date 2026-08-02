-- ============================================================
-- 2026 期末考试：重建学生/成绩表（身份证主键，原始分+赋分）
-- 运行方式：Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- ============================================================

begin;

-- 清空并删除旧的学生/成绩表（提醒、日程、设置保留）
drop table if exists public.exam_scores;
drop table if exists public.exams;
drop table if exists public.class_teachers;
drop table if exists public.scores;
drop table if exists public.students;

-- 学生表：身份证为主键
create table public.students (
  id_card text primary key,
  name text not null,
  class_no integer not null,
  selected_subjects text[] not null default '{}',
  father_name text default '',
  father_phone text default '',
  father_wechat text default '',
  mother_name text default '',
  mother_phone text default '',
  mother_wechat text default '',
  remark text default '',
  created_at timestamptz default now()
);

-- 考试表
create table public.exams (
  id text primary key,
  name text not null,
  date date,
  created_at timestamptz default now()
);

-- 成绩表：每科原始分/赋分/校名次/班名次
create table public.exam_scores (
  student_id text not null references public.students(id_card) on delete cascade,
  exam_id text not null references public.exams(id) on delete cascade,
  subject text not null,
  raw_score numeric,
  assigned_score numeric,
  school_rank integer default 0,
  class_rank integer default 0,
  created_at timestamptz default now(),
  primary key (student_id, exam_id, subject)
);

-- 班主任账号表：班级号 / 密码 / 班主任姓名
create table public.class_teachers (
  class_no integer primary key,
  teacher_name text default '',
  password text not null default '111',
  created_at timestamptz default now()
);

-- 班主任账号：1~80 班，默认密码 111，姓名留空待填写
insert into public.class_teachers (class_no)
select gs
from generate_series(1, 80) as gs
on conflict (class_no) do nothing;

create index if not exists idx_students_class_no on public.students(class_no);
create index if not exists idx_exam_scores_exam_subject on public.exam_scores(exam_id, subject);
create index if not exists idx_exam_scores_student on public.exam_scores(student_id);

-- RLS：与现有应用一致，anon/authenticated 均可访问
alter table public.students enable row level security;
alter table public.exams enable row level security;
alter table public.exam_scores enable row level security;
alter table public.class_teachers enable row level security;

drop policy if exists "allow all on students" on public.students;
create policy "allow all on students" on public.students
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on exams" on public.exams;
create policy "allow all on exams" on public.exams
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on exam_scores" on public.exam_scores;
create policy "allow all on exam_scores" on public.exam_scores
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "allow all on class_teachers" on public.class_teachers;
create policy "allow all on class_teachers" on public.class_teachers
  for all to anon, authenticated using (true) with check (true);

commit;
