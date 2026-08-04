-- ============================================================
-- 学生首次登录强制改密
--   标志位 must_change_password 存放于 auth.users.raw_app_meta_data
--   （即 JWT 的 app_metadata，用户无法自行修改）
--   前端流程：学生登录后读到该标志 -> 强制修改密码
--     -> supabase.auth.updateUser({ password })
--     -> 调用本函数清除标志 -> refreshSession 拿到新 JWT
-- ============================================================

create or replace function public.complete_must_change_password()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_claims jsonb := auth.jwt();
  caller_id uuid := (caller_claims ->> 'sub')::uuid;
  caller_role text := coalesce((caller_claims -> 'app_metadata' ->> 'role'), '');
begin
  if caller_id is null then
    raise exception '未登录';
  end if;
  if caller_role <> 'student' then
    raise exception '仅学生账号需要强制改密';
  end if;

  update auth.users
     set raw_app_meta_data = raw_app_meta_data - 'must_change_password',
         updated_at = now()
   where id = caller_id
     and raw_app_meta_data ->> 'must_change_password' = 'true';

  if not found then
    raise exception '当前账号无需强制改密';
  end if;
end;
$$;

grant execute on function public.complete_must_change_password() to authenticated;
revoke execute on function public.complete_must_change_password() from anon;