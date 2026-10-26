import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { getLevelTitle, type ProgressData } from '../utils/progress';
import {
  MAX_PROGRESS_FILE_BYTES,
  deviceHasProgress,
  parseProgressText,
  progressExportFilename,
  progressTransferMessages,
  serializeProgress,
  summarizeProgress,
  type ProgressSummary,
} from '../utils/progressTransfer';

interface ProgressTransferProps {
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
}

type StatusMessage = { type: 'error' | 'success'; text: string };

export function ProgressTransfer({ progress, onProgressUpdate }: ProgressTransferProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [pending, setPending] = useState<ProgressData | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPending(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  const handleExport = () => {
    try {
      const json = serializeProgress(progress);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = progressExportFilename();
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ type: 'success', text: progressTransferMessages.exported });
    } catch (error) {
      console.error('匯出進度失敗:', error);
      setMessage({ type: 'error', text: progressTransferMessages.downloadFailed });
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size === 0) {
      setPending(null);
      setMessage({ type: 'error', text: progressTransferMessages.empty });
      return;
    }
    if (file.size > MAX_PROGRESS_FILE_BYTES) {
      setPending(null);
      setMessage({ type: 'error', text: progressTransferMessages.tooLarge });
      return;
    }

    setReading(true);
    setMessage(null);
    try {
      const text = await file.text();
      const result = parseProgressText(text);
      if (!result.ok) {
        setPending(null);
        setMessage({ type: 'error', text: result.message });
        return;
      }
      setPending(result.data);
    } catch (error) {
      console.error('讀取進度檔失敗:', error);
      setPending(null);
      setMessage({ type: 'error', text: progressTransferMessages.readFailed });
    } finally {
      setReading(false);
    }
  };

  const confirmReplace = () => {
    if (!pending) return;
    const imported = pending;
    setPending(null);
    onProgressUpdate(imported);
    setMessage({ type: 'success', text: progressTransferMessages.imported });
  };

  const currentSummary = summarizeProgress(progress);
  const pendingSummary = pending ? summarizeProgress(pending) : null;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200">
        備份與還原
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        練習進度只存在這台裝置的瀏覽器裡，不會上傳。匯出的 JSON 檔包含平假名、片假名、每日紀錄與經驗值，可在另一台手機或電腦匯入。
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        匯入時會用檔案整份取代這台裝置目前的進度，不會把兩邊的答題次數加在一起。
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-purple-600"
        >
          <Download size={18} aria-hidden="true" />
          匯出進度
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={reading}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          <Upload size={18} aria-hidden="true" />
          {reading ? '讀取中…' : '匯入進度'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        className="sr-only"
        aria-label="選擇進度 JSON 檔"
        onChange={handleFile}
      />

      {message && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm leading-relaxed ${
            message.type === 'error'
              ? 'text-red-700 dark:text-red-300'
              : 'text-green-700 dark:text-green-300'
          }`}
        >
          {message.text}
        </p>
      )}

      {pending && pendingSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPending(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 id={titleId} className="text-xl font-bold text-gray-800 dark:text-gray-200">
              要以檔案取代目前進度嗎？
            </h4>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              確定後，這台裝置的平假名、片假名、每日練習紀錄與經驗值會整份換成檔案裡的內容。不會與目前進度合併，答題次數也不會相加，所以同一段練習不會被算兩次。這台裝置上還沒匯出的紀錄會消失。檔案只在這台裝置讀取，不會上傳。
            </p>

            <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
              <SummaryBlock label="檔案內容" summary={pendingSummary} />
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                {deviceHasProgress(progress)
                  ? `此裝置目前有平假名 ${currentSummary.hiraganaCount} 字、片假名 ${currentSummary.katakanaCount} 字、等級 ${currentSummary.level}。取代後這些紀錄會消失。`
                  : '此裝置目前沒有練習紀錄。'}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setPending(null)}
                className="min-h-11 w-full rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmReplace}
                className="min-h-11 w-full rounded-lg bg-red-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-600"
              >
                確定取代
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryBlock({ label, summary }: { label: string; summary: ProgressSummary }) {
  const title = getLevelTitle(summary.level);
  return (
    <div>
      <div className="text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 font-semibold leading-relaxed text-gray-800 dark:text-gray-100">
        平假名 {summary.hiraganaCount} 字、片假名 {summary.katakanaCount} 字
        <br />
        等級 {summary.level}（{title}）、{summary.totalExp.toLocaleString('zh-TW')} EXP
        <br />
        每日紀錄 {summary.dailyDays} 天
      </div>
    </div>
  );
}
