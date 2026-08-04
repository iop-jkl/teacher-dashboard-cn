-- ============================================================
-- 密码重置（凭角色授权，非服务端密钥）
--   caller teacher：可重置自己班级学生的密码
--   caller admin：可重置任一班班主任的密码
-- 安全性：SECURITY DEFINER 内再次校验角色；密码长度 6-72；
--   直接在 auth.users.encrypted_password 写入 bcrypt 哈希。
-- 前端通过 supabase.rpc('reset_user_password', {target_email, new_password})
-- 调用，返回值即新密码文本（供操作者转告用户）。
-- ============================================================

create or replace function public.reset_user_password(target_email text, target_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_claims jsonb := auth.jwt();
  caller_role text := coalesce((caller_claims -> 'app_metadata' ->> 'role'), '');
  caller_class int := coalesce((caller_claims -> 'app_metadata' ->> 'class_no')::int, 0);
  target_meta jsonb;
  target_role text;
  target_id uuid;
  row_count int;
begin
  if target_email is null or target_email = '' then
    raise exception '目标账号不能为空';
  end if;
  if target_password is null or length(target_password) < 6 or length(target_password) > 72 then
    raise exception '密码长度需为 6-72 位';
  end if;

  select u.id, u.raw_app_meta_data into target_id, target_meta
    from auth.users u
   where u.email = target_email
   limit 1;
  if target_id is null then
    raise exception '目标账号不存在';
  end if;
  target_role := coalesce((target_meta ->> 'role'), '');

  if caller_role = 'admin' then
    if target_role <> 'teacher' then
      raise exception '管理员仅能重置班主任密码';
    end if;
  elsif caller_role = 'teacher' then
    if target_role <> 'student' then
      raise exception '班主任仅能重置本班学生密码';
    end if;
    if not exists (
      select 1 from public.students s
       where s.id_card = upper(substr(target_email, 2, position('@' in target_email) - 2))
         and s.class_no = caller_class
    ) then
      raise exception '只能重置本班学生的密码';
    end if;
  else
    raise exception '无权重置密码';
  end if;

  update auth.users
     set encrypted_password = crypt(target_password, gen_salt('bf')),
         updated_at = now()
   where id = target_id;
  get diagnostics row_count = row_count;

  if row_count = 0 then
    raise exception '密码更新失败';
  end if;

  return target_password;
end;
$$;

grant execute on function public.reset_user_password(text, text) to authenticated;
revoke execute on function public.reset_user_password(text, text) from anon;