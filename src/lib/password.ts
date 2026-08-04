import { supabase } from '@/lib/supabase';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generatePassword(length = 10): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CHARSET[arr[i] % CHARSET.length];
  }
  return out;
}

export interface ResetPasswordResult {
  ok: boolean;
  password?: string;
  error?: string;
}

export async function resetPassword(
  targetEmail: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  if (!supabase) return { ok: false, error: '数据库未配置' };
  const { data, error } = await supabase.rpc('reset_user_password', {
    target_email: targetEmail,
    target_password: newPassword,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, password: String(data) };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  email: string,
): Promise<string | null> {
  if (!supabase) return '数据库未配置';
  const { error: signError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword.trim(),
  });
  if (signError) return '当前密码不正确';
  if (newPassword.trim().length < 6) return '新密码至少 6 位';
  const { error } = await supabase.auth.updateUser({
    password: newPassword.trim(),
  });
  if (error) return error.message;
  return null;
}
