import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/useToast';
import { cn } from '@/lib/utils';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border min-w-[240px] max-w-sm animate-in',
            toast.type === 'success' && 'bg-emerald-50 border-emerald-200',
            toast.type === 'error' && 'bg-red-50 border-red-200',
            toast.type === 'info' && 'bg-blue-50 border-blue-200'
          )}
        >
          {toast.type === 'success' && (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
          )}
          <p
            className={cn(
              'text-sm flex-1',
              toast.type === 'success' && 'text-emerald-700',
              toast.type === 'error' && 'text-red-700',
              toast.type === 'info' && 'text-blue-700'
            )}
          >
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 rounded hover:bg-white/50"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
