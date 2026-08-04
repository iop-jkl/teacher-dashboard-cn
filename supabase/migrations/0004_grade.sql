-- ============================================================
-- 年级标记：学生表新增 grade（高一/高二/高三），默认高一
-- 运行方式：Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- 幂等：可重复运行
-- ============================================================
alter table public.students
  add column if not exists grade text not null default '高一';
