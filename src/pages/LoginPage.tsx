import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, User, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('账号或密码错误');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#1e3a5f] text-white flex items-center justify-center mx-auto mb-3">
            <span className="text-lg font-bold">班</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">班主任工作台</h1>
          <p className="text-sm text-gray-500 mt-1">请登录后继续使用</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
        >
          <div>
            <label htmlFor="username" className="block text-sm text-gray-600 mb-1">
              账号
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="管理员：admin；班主任：班级号"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-600 mb-1">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-700">管理员</p>
                <p className="text-[11px] text-blue-500">admin / 111，查看全部班级</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-2">
              <GraduationCap className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-teal-700">班主任</p>
                <p className="text-[11px] text-teal-500">用班级号登录，如 1</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2dd4bf] text-white text-sm font-medium rounded-lg hover:bg-[#14b8a6] disabled:opacity-60 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
