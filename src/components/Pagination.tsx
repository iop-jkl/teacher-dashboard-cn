import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  page,
  total,
  pageSize,
  onChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 0), totalPages - 1);

  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const set = new Set<number>([0, 1, totalPages - 2, totalPages - 1]);
    for (let i = -2; i <= 2; i++) set.add(current + i);
    const list = [...set]
      .filter((p) => p >= 0 && p < totalPages)
      .sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    for (const p of list) {
      if (result.length && typeof result[result.length - 1] === 'number') {
        const prev = result[result.length - 1] as number;
        if (p - prev > 1) result.push('...');
      }
      result.push(p);
    }
    return result;
  }, [totalPages, current]);

  if (totalPages <= 1) return null;

  const btn =
    'inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg text-xs font-medium transition-colors';

  return (
    <div
      className={`flex items-center justify-center gap-1 flex-wrap px-4 py-3 border-t border-gray-100 ${className ?? ''}`}
    >
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 0}
        className={`${btn} text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="上一页"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-1 text-gray-400 text-xs">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btn} ${
              p === current
                ? 'bg-[#2dd4bf] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === totalPages - 1}
        className={`${btn} text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="下一页"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="ml-2 text-xs text-gray-400">
        共 {total} 人
      </span>
    </div>
  );
}
