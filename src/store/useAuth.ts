import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AuthSession {
  role: 'admin' | 'teacher' | 'student';
  username: string;
  teacherName: string;
  classNo: number;
  studentId?: string;
  mustChangePassword?: boolean;
}

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  restoring: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  completePasswordChange: (newPassword: string) => Promise<string>;
}

function mapUserToAccount(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): AuthSession | null {
  const am = user.app_metadata ?? {};
  const um = user.user_metadata ?? {};
  const meta: Record<string, unknown> = {
    ...am,
    name: um.name,
    teacher_name: um.teacher_name,
  };
  const role = am.role ?? '';
  if (role === 'admin') {
    return {
      role: 'admin',
      username: 'admin',
      teacherName: '管理员',
      classNo: 0,
    };
  }
  if (role === 'teacher') {
    const classNo = Number(meta.class_no ?? 0);
    if (!classNo) return null;
    return {
      role: 'teacher',
      username: String(classNo),
      teacherName: String(meta.teacher_name ?? ''),
      classNo,
    };
  }
  if (role === 'student') {
    const idCard = String(meta.id_card ?? '');
    if (!idCard) return null;
    return {
      role: 'student',
      username: idCard,
      teacherName: String(meta.name ?? ''),
      classNo: Number(meta.class_no ?? 0),
      studentId: idCard,
      mustChangePassword: am.must_change_password === true,
    };
  }
  return null;
}

export function toEmail(username: string): string {
  const name = username.trim();
  if (name === 'admin') return 'admin@school.local';
  if (/^\d{1,3}$/.test(name)) return `class${name}@school.local`;
  if (/^\d{17}[\dXx]$/.test(name)) return `s${name.toUpperCase()}@school.local`;
  return '';
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isAuthenticated: false,
  restoring: true,

  restore: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ session: null, isAuthenticated: false, restoring: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const session = data.session?.user ? mapUserToAccount(data.session.user) : null;
    set({
      session,
      isAuthenticated: Boolean(session),
      restoring: false,
    });
  },

  login: async (username, password) => {
    if (!isSupabaseConfigured || !supabase) return false;
    const email = toEmail(username);
    if (!email) return false;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password.trim(),
    });
    if (error || !data.session?.user) return false;
    const session = mapUserToAccount(data.session.user);
    if (!session) return false;
    set({ session, isAuthenticated: true, restoring: false });
    return true;
  },

  logout: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, isAuthenticated: false, restoring: false });
  },

  completePasswordChange: async (newPassword) => {
    if (!supabase) return '系统未配置';
    const update = await supabase.auth.updateUser({ password: newPassword });
    if (update.error) {
      return update.error.message === 'Password should be longer than 6 characters.'
        ? '密码至少 6 位，建议 8 位以上（含字母与数字）'
        : `修改失败：${update.error.message}`;
    }
    const rpc = await supabase.rpc('complete_must_change_password');
    if (rpc.error) {
      return `修改失败：${rpc.error.message}`;
    }
    const refreshed = await supabase.auth.refreshSession();
    const session = refreshed.data.session?.user
      ? mapUserToAccount(refreshed.data.session.user)
      : null;
    set({
      session,
      isAuthenticated: Boolean(session),
      restoring: false,
    });
    return '';
  },
}));
