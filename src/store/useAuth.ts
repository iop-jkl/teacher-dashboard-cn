import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'teacher-dashboard-auth';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '111';

interface AuthState {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

function readAuthState(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: readAuthState(),
  login: (username, password) => {
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return false;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    set({ isAuthenticated: true });
    return true;
  },
  logout: () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ isAuthenticated: false });
  },
}));
