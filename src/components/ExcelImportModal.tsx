import { useRef, useState } from 'react';
import { CalendarDays, FileSpreadsheet, Upload, X, AlertCircle } from 'lucide-react';
import { parseExamFile, type ParsedExamImport } from '@/utils/excelImport';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToast';

interface Props {
  onClose: () => void;
}

export default function ExcelImportModal({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importExamFromExcel = useStore((s) => s.importExamFromExcel);
  const showToast = useToastStore((s) => s.showToast);
  const [examDate, setExamDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedExamImport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setFileName(file.name);
    try {
      const result = await parseExamFile(file);
      setParsed(result);
    } catch (e) {
      console.error('Excel parse failed:', e);
      setParsed(null);
      setError('文件解析失败，请确认是成绩表格式（含身份证号、班级、姓名、各科原始分/赋分、校名次等列）');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (!parsed || !examDate) return;
    const res = importExamFromExcel(parsed, examDate);
    if (res.ignored > 0) {
      showToast(
        `已导入考试“${parsed.examName}”（本班 ${res.imported} 人），忽略非本班数据 ${res.ignored} 条`,
        'info',
      );
    } else {
      showToast(`已导入考试“${parsed.examName}”`, 'success');
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">录入成绩</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              选择考试时间，再读取 Excel 成绩表，文件名将作为考试名称
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">考试时间</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#2dd4bf]/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Excel 成绩表</label>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/5 disabled:opacity-60 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#2dd4bf]" />
              {loading ? '正在解析...' : fileName || '选择 .xls / .xlsx 文件'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {parsed && (
            <div className="rounded-lg bg-teal-50 border border-teal-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  考试名称：{parsed.examName || '（未命名）'}
                </span>
                <span className="text-xs text-teal-600">{examDate}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>学生 {parsed.students.length} 人</span>
                <span>成绩 {parsed.scores.length} 条</span>
              </div>
              {parsed.warnings.length > 0 && (
                <p className="text-xs text-amber-600">
                  提示：{parsed.warnings.length} 行数据异常，详见控制台
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsed}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-[#2dd4bf] rounded-lg hover:bg-[#14b8a6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            确认导入
          </button>
        </div>
      </div>
    </div>
  );
}
