import { useRef, useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, Trophy } from 'lucide-react';
import { parseExcelFile, generateTemplateExcel, type ImportResult } from '@/utils/excelImport';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

interface ExcelImportButtonProps {
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function ExcelImportButton({
  label = '导入Excel',
  className,
  variant = 'primary',
}: ExcelImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const importStudents = useStore((s) => s.importStudents);
  const importExamScores = useStore((s) => s.importExamScores);
  const updateStudentRanks = useStore((s) => s.updateStudentRanks);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const parsed = await parseExcelFile(file);
      setResult(parsed);

      if (parsed.students.length > 0) {
        importStudents(parsed.students);
      }

      if (parsed.scores.length > 0) {
        if (parsed.computedRankings.length > 0) {
          importExamScores({
            newScores: parsed.scores,
            newTrend: parsed.studentScoreTrend,
            newExamTrend: parsed.examTrendData,
            rankings: parsed.computedRankings,
            examName: parsed.examName,
          });
        } else {
          updateStudentRanks(parsed.computedRankings);
        }
      }

      setShowResult(true);
    } catch (err) {
      console.error('Excel import failed:', err);
      setResult({
        students: [],
        scores: [],
        studentScoreTrend: {},
        examTrendData: [],
        computedRankings: [],
        examName: '',
        warnings: ['导入失败，请检查文件格式是否正确'],
      });
      setShowResult(true);
    } finally {
      setImporting(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    const blob = generateTemplateExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '班主任工作台-导入模板.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResult(null);
  };

  const isPrimary = variant === 'primary';

  return (
    <>
      <div className="relative inline-flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          id="excel-import-trigger"
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
            isPrimary
              ? 'bg-[#2dd4bf] text-white hover:bg-[#14b8a6]'
              : 'border border-gray-200 text-gray-700 hover:bg-gray-50',
            importing && 'opacity-60 cursor-not-allowed',
            className
          )}
        >
          <Upload className="w-4 h-4" />
          {importing ? '导入中...' : label}
        </button>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-[#2dd4bf] transition-colors"
          title="下载导入模板"
        >
          <Download className="w-3.5 h-3.5" />
          模板
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {showResult && result && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">导入结果</h3>
              <button
                onClick={handleCloseResult}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    成功导入 {result.students.length} 名学生
                  </p>
                  <p className="text-xs text-gray-500">
                    {result.scores.length} 条成绩记录
                    {result.examName && ` · ${result.examName}`}
                  </p>
                </div>
              </div>

              {result.computedRankings.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <Trophy className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700">
                      已计算 {result.computedRankings.length} 名学生排名
                    </p>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {result.computedRankings.slice(0, 10).map((r) => (
                        <div
                          key={r.studentId}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-700">
                            第 {r.rank} 名 · {r.name}
                          </span>
                          <span className="font-medium text-[#1e3a5f]">
                            {r.totalScore} 分
                          </span>
                        </div>
                      ))}
                      {result.computedRankings.length > 10 && (
                        <p className="text-xs text-gray-400">
                          ...还有 {result.computedRankings.length - 10} 名学生
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">提示</p>
                    <ul className="text-xs text-amber-600 mt-1 space-y-0.5">
                      {result.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCloseResult}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-[#2dd4bf] text-white text-sm font-medium hover:bg-[#14b8a6] transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </>
  );
}
