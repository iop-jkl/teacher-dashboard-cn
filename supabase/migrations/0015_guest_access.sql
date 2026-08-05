-- ============================================================
-- 访客（guest）只读访问：
--   1. 为所有业务表增加 guest 只读（select）策略
--   2. 访客无任何 insert/update/delete 策略，写入被 RLS 一律拒绝
--   3. get_grade_summary 允许访客查看（仅聚合均分，不含个人明细）
-- 前置：必须先创建访客账号（node scripts/create-guest-user.mjs）
-- ============================================================

begin;

-- ============ 访客只读策略（current_role() 读取 app_metadata.role） ============
drop policy if exists "guest read students" on public.students;
create policy "guest read students" on public.students
  for select to authenticated
  using (public.current_role() = 'guest');

drop policy if exists "guest read exam_scores" on public.exam_scores;
create policy "guest read exam_scores" on public.exam_scores
  for select to authenticated
  using (public.current_role() = 'guest');

drop policy if exists "guest read exams" on public.exams;
create policy "guest read exams" on public.exams
  for select to authenticated
  using (public.current_role() = 'guest');

drop policy if exists "guest read class_teachers" on public.class_teachers;
create policy "guest read class_teachers" on public.class_teachers
  for select to authenticated
  using (public.current_role() = 'guest');

drop policy if exists "guest read schedule_events" on public.schedule_events;
create policy "guest read schedule_events" on public.schedule_events
  for select to authenticated
  using (public.current_role() = 'guest');

drop policy if exists "guest read reminders" on public.reminders;
create policy "guest read reminders" on public.reminders
  for select to authenticated
  using (public.current_role() = 'guest');

drop policy if exists "guest read anonymous_messages" on public.anonymous_messages;
create policy "guest read anonymous_messages" on public.anonymous_messages
  for select to authenticated
  using (public.current_role() = 'guest');

-- ============ 均分聚合 RPC 允许访客（仅聚合数据） ============
create or replace function public.get_grade_summary()
returns table (
  exam_id text,
  class_no bigint,
  total_avg numeric,
  subject_avg jsonb,
  student_count bigint
)
language sql
stable
security invoker
as $$
  with agg as (
    select
      s.exam_id,
      st.class_no,
      s.subject,
      round(avg(case when s.assigned_score is not null then s.assigned_score else s.raw_score end), 2) as score,
      count(distinct s.student_id) as cnt
    from public.exam_scores s
    join public.students st on st.id_card = s.student_id
    where (
      public.current_role() in ('admin', 'teacher', 'guest')
    )
    and (
      public.current_role() <> 'teacher'
      or st.class_no = public.current_class_no()
    )
    group by s.exam_id, st.class_no, s.subject
  )
  select
    a.exam_id,
    a.class_no,
    t.score as total_avg,
    (select jsonb_object_agg(subject, score)
       from agg
       where exam_id = a.exam_id and class_no = a.class_no and subject <> '总分') as subject_avg,
    a.cnt as student_count
  from (
    select exam_id, class_no, max(cnt) filter (where subject = '总分') as cnt
    from agg group by exam_id, class_no
  ) a
  left join agg t
    on t.exam_id = a.exam_id and t.class_no = a.class_no and t.subject = '总分'
$$;

commit;
