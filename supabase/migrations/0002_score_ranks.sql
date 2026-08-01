-- 成绩表新增：学校总排名、单科班内排名
alter table public.scores
  add column if not exists school_rank integer default 0;

alter table public.scores
  add column if not exists subject_rank integer default 0;
