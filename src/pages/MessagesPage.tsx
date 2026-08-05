import { useState, useEffect, type FormEvent } from 'react';
import { Mail, Send, Trash2, Inbox } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserMenu from '@/components/UserMenu';
import ToastContainer from '@/components/ToastContainer';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuth';
import { useToastStore } from '@/store/useToast';
import { supabase } from '@/lib/supabase';
interface AnonymousMessage {
  id: number;
  class_no: number;
  content: string;
  created_at: string;
  read_at: string | null;
}

export default function MessagesPage() {
  const { sidebarOpen, openSidebar, closeSidebar, refreshUnreadMessages } = useStore();
  const session = useAuthStore((s) => s.session);
  const showToast = useToastStore((s) => s.showToast);
  const isStudent = session?.role === 'student';
  const isTeacher = session?.role === 'teacher' || session?.role === 'guest';
  const isGuest = session?.role === 'guest';

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTeacher) {
      loadMessages(session?.classNo ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, session?.classNo]);

  async function loadMessages(classNo: number) {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase.from('anonymous_messages').select('*');
      if (classNo > 0) query = query.eq('class_no', classNo);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setMessages((data ?? []) as AnonymousMessage[]);
      refreshUnreadMessages();
    } catch (e) {
      console.error('加载匿名信失败', e);
      showToast('加载匿名信失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      showToast('请输入你想说的话', 'info');
      return;
    }
    if (!supabase || !isStudent) return;
    setSending(true);
    try {
      const { error } = await supabase.from('anonymous_messages').insert({
        class_no: session?.classNo ?? 0,
        content: text,
      });
      if (error) throw error;
      setContent('');
      showToast('已匿名提交，班主任会看到', 'success');
    } catch (err) {
      console.error('提交失败', err);
      showToast('提交失败，请稍后再试', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    if (!supabase || isGuest) return;
    const { error } = await supabase
      .from('anonymous_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)),
    );
    refreshUnreadMessages();
  };

  const handleMarkUnread = async (id: number) => {
    if (!supabase || isGuest) return;
    const { error } = await supabase
      .from('anonymous_messages')
      .update({ read_at: null })
      .eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read_at: null } : m)));
    refreshUnreadMessages();
  };

  const handleDelete = async (id: number) => {
    if (!supabase || isGuest) return;
    if (!window.confirm('确认删除这封信？')) return;
    const { error } = await supabase
      .from('anonymous_messages')
      .delete()
      .eq('id', id);
    if (error) {
      console.error(error);
      showToast('删除失败', 'error');
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    refreshUnreadMessages();
    showToast('已删除', 'success');
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <ToastContainer />

      <main className="flex-1 ml-0">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={openSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {isStudent ? '匿名信' : '匿名信箱'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isStudent
                    ? `${session?.classNo}班 · 仅班主任可见，完全匿名`
                    : isGuest
                      ? '访客 · 只读查看，不可操作'
                      : `${session?.classNo}班 · 学生来信，仅本班班主任可查看`}
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
          {isStudent && (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">写一封匿名信</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    只有你班级的班主任能看到，不会显示你的身份
                  </p>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="想对班主任说的话、建议、困扰……"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2dd4bf]/40 resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{content.length}/1000</span>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] disabled:opacity-60 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sending ? '提交中...' : '匿名提交'}
                </button>
              </div>
            </form>
          )}

          {isTeacher && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">收到的匿名信</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {messages.filter((m) => !m.read_at).length} 封未读 · 共 {messages.length} 封
                  </p>
                </div>
              </div>

              {isGuest && (
                <div className="rounded-lg border border-purple-100 bg-purple-50/60 px-3 py-2 text-xs text-purple-600">
                  以下为演示示例信件，真实匿名信对学生与老师保密，访客不可见。
                </div>
              )}

              {loading ? (
                <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  还没有收到匿名信
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-4 ${
                      m.read_at ? 'bg-gray-50 border-gray-100' : 'bg-purple-50/50 border-purple-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {!m.read_at ? (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-600 text-white">
                            未读
                          </span>
                        ) : (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500">
                            已读
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {isGuest && (
                            <span className="text-purple-600 font-medium mr-1.5">
                              第{m.class_no}班
                            </span>
                          )}
                          {new Date(m.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => (m.read_at ? handleMarkUnread(m.id) : handleMarkRead(m.id))}
                          className="text-xs text-gray-500 hover:text-[#2dd4bf] transition-colors"
                        >
                          {m.read_at ? '标记未读' : '标记已读'}
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {!isStudent && !isTeacher && (
            <div className="py-12 text-center text-gray-400">无权访问</div>
          )}
        </div>
      </main>
    </div>
  );
}