-- ============================================================
-- 访客匿名信演示隔离：
--   1. anonymous_messages 增加 is_demo 标记列
--   2. guest 只读策略仅返回 is_demo = true 的示例信（真实信件不可见）
--   3. teacher 读策略排除示例信（真实班主任不看到演示数据）
--   4. 首次种子：插入 3 封示例匿名信（幂等，重复执行不会重复插入）
-- 前置：先执行 0015_guest_access.sql
-- ============================================================

begin;

-- 1. 标记列
alter table public.anonymous_messages
  add column if not exists is_demo boolean not null default false;

-- 2. 访客只读示例信（真实信件通过 is_demo = true 条件被过滤）
drop policy if exists "guest read anonymous_messages" on public.anonymous_messages;
create policy "guest read anonymous_messages" on public.anonymous_messages
  for select to authenticated
  using (public.current_role() = 'guest' and is_demo);

-- 3. 班主任不读示例信
drop policy if exists "teacher read anonymous_messages" on public.anonymous_messages;
create policy "teacher read anonymous_messages" on public.anonymous_messages
  for select to authenticated
  using (
    public.current_role() = 'teacher'
    and not is_demo
    and class_no = coalesce((auth.jwt() -> 'user_metadata' ->> 'class_no')::int, 0)
  );

-- 4. 首次种子：3 封示例信（整批幂等）
insert into public.anonymous_messages (class_no, content, read_at, is_demo)
select * from (values
  (1, '老师您好！最近数学课我有些跟不上，尤其是函数部分，请问晚自习可以去办公室问问题吗？谢谢老师！', null, true),
  (2, '班主任辛苦了！想悄悄说一句：希望班级活动能多一点户外运动，比如篮球赛。', now() - interval '1 day', true),
  (3, '老师，我最近有点焦虑，临近考试总是睡不好。不知道该跟谁讲，就先写在这里吧。', null, true)
) as v(class_no, content, read_at, is_demo)
where not exists (select 1 from public.anonymous_messages where is_demo);

commit;
