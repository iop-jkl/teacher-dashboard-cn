-- ============================================================
-- 0010: RPC 聚合班级/全校均分，避免前端全量拉取 11 万行成绩
--   get_grade_summary() 返回每场考试每班一行：
--     - total_avg: 平均总分
--     - subject_avg: {科目: 均分} JSON
--     - student_count: 参考人数
--   RLS 感知：teacher 只返回本班，admin 返回全部
-- ============================================================

begin;

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
      public.current_role() in ('admin', 'teacher')
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