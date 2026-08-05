import { useState } from 'react';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuth';

export default function ForcePasswordChange() {
  const session = useAuthStore((s) => s.session);
  const completePasswordChange = useAuthStore((s) => s.completePasswordChange);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (session?.role === 'guest') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('新密码至少 8 位，建议包含字母与数字');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    const msg = await completePasswordChange(password);
    setLoading(false);
    if (msg) {
      setError(msg);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="mt-3 text-base font-semibold text-gray-900">密码修改成功</h2>
          <p className="mt-1 text-sm text-gray-500">正在进入系统…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-gray-900">首次登录须修改密码</h2>
          <p className="mt-1 text-sm text-gray-500">
            {session?.teacherName
              ? `同学 ${session.teacherName}，为保障账号安全，首次登录请设置个人新密码。`
              : '为保障账号安全，首次登录请设置个人新密码。'}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">新密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/40 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">确认新密码</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/40 focus:outline-none transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '提交中…' : '确认修改'}
            </button>
          </form>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          若无法完成修改，请联系班主任重置密码
        </p>
      </div>
    </div>
  );
}