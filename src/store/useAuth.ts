import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AUTH_STORAGE_KEY = 'teacher-dashboard-auth';

export interface AuthSession {
  role: 'admin' | 'teacher';
  username: string;
  teacherName: string;
  classNo: number;
}

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed && parsed.role && parsed.username) return parsed;
    return null;
  } catch {
    return null;
  }
}

function persist(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export const useAuthStore = create<AuthState>((set) => {
  const initial = readSession();
  return {
    session: initial,
    isAuthenticated: Boolean(initial),
    login: async (username, password) => {
      const name = username.trim();
      const pass = password.trim();

      if (name === 'admin' && pass === '111') {
        const session: AuthSession = {
          role: 'admin',
          username: 'admin',
          teacherName: '管理员',
          classNo: 0,
        };
        persist(session);
        set({ session, isAuthenticated: true });
        return true;
      }

      if (!/^\d+$/.test(name)) return false;
      const classNo = Number(name);

      if (!isSupabaseConfigured || !supabase) return false;
      const { data, error } = await supabase
        .from('class_teachers')
        .select('class_no, teacher_name, password')
        .eq('class_no', classNo)
        .maybeSingle();
      if (error || !data) return false;
      if (data.password !== pass) return false;

      const session: AuthSession = {
        role: 'teacher',
        username: name,
        teacherName: data.teacher_name || `${classNo}班班主任`,
        classNo,
      };
      persist(session);
      set({ session, isAuthenticated: true });
      return true;
    },
    logout: () => {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      set({ session: null, isAuthenticated: false });
    },
  };
});
