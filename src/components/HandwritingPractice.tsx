import { useState, useRef, useEffect } from 'react';
import type { KanaChar } from '../data/kana';
import type { ProgressData } from '../utils/progress';
import { recordDailyActivity } from '../utils/progress';
import { initializeSRS, updateSRS } from '../utils/spacedRepetition';
import { StrokeOrderAnimation } from './StrokeOrderAnimation';
import { hasStrokeData } from '../data/strokeOrder';
import { Eraser, Undo, SkipForward, Eye, EyeOff, X } from 'lucide-react';

interface HandwritingPracticeProps {
  data: KanaChar[];
  kanaType: 'hiragana' | 'katakana';
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

export function HandwritingPractice({
  data,
  kanaType,
  progress,
  onProgressUpdate,
}: HandwritingPracticeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [showGuide, setShowGuide] = useState(true);
  const [currentChar, setCurrentChar] = useState<KanaChar | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [stats, setStats] = useState({ practiced: 0, correct: 0 });
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);

  const allRows = [...new Set(data.map(k => k.row))];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, 500);
      canvas.width = size;
      canvas.height = size;
    }

    // Redraw
    redrawCanvas();
  }, [strokes, currentStroke, showGuide, currentChar]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw guide if enabled
    if (showGuide && currentChar) {
      ctx.save();
      ctx.font = `${canvas.width * 0.6}px sans-serif`;
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(currentChar.char, canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw completed strokes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // Draw current stroke
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  };

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    setCurrentStroke(prev => [...prev, point]);
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke }]);
    }
    setCurrentStroke([]);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
    }
  };

  const handleGrade = (correct: boolean) => {
    if (!currentChar) return;

    setStats(prev => ({
      practiced: prev.practiced + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }));

    // Update progress with SRS
    const currentProgress = progress[kanaType][currentChar.char] || {
      char: currentChar.char,
      correct: 0,
      incorrect: 0,
      lastPracticed: 0,
      srs: initializeSRS(currentChar.char),
    };

    // Quality: correct = 4 (good), incorrect = 1 (again)
    const quality = correct ? 4 : 1;
    const updatedSRS = updateSRS(currentProgress.srs || initializeSRS(currentChar.char), quality);

    let updatedProgress: ProgressData = {
      ...progress,
      [kanaType]: {
        ...progress[kanaType],
        [currentChar.char]: {
          ...currentProgress,
          correct: correct ? currentProgress.correct + 1 : currentProgress.correct,
          incorrect: correct ? currentProgress.incorrect : currentProgress.incorrect + 1,
          lastPracticed: Date.now(),
          srs: updatedSRS,
        },
      },
    };
    
    // Record daily activity
    updatedProgress = recordDailyActivity(updatedProgress, correct);

    onProgressUpdate(updatedProgress);

    // Move to next character
    handleNext();
  };

  const handleNext = () => {
    handleClear();
    generateNextChar();
  };

  const generateNextChar = () => {
    const availableChars = data.filter(k => selectedRows.includes(k.row));
    if (availableChars.length === 0) return;

    const nextChar = availableChars[Math.floor(Math.random() * availableChars.length)];
    setCurrentChar(nextChar);
  };

  const startPractice = () => {
    if (selectedRows.length === 0) {
      alert('請至少選擇一個行');
      return;
    }
    setIsConfiguring(false);
    setStats({ practiced: 0, correct: 0 });
    generateNextChar();
  };

  const toggleRow = (row: string) => {
    setSelectedRows(prev =>
      prev.includes(row) ? prev.filter(r => r !== row) : [...prev, row]
    );
  };

  const selectAllRows = () => {
    setSelectedRows(allRows);
  };

  const clearAllRows = () => {
    setSelectedRows([]);
  };

  if (isConfiguring) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">手寫練習設定</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            用手指或滑鼠在畫布上書寫假名，然後自我評分。正確的字符會延長複習間隔，需要更多練習的會更頻繁出現。
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">選擇行段</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllRows}
                className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                全選
              </button>
              <button
                onClick={clearAllRows}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                清空
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {allRows.map(row => (
              <label key={row} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row)}
                  onChange={() => toggleRow(row)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">{row}行</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={startPractice}
          className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
        >
          開始手寫練習
        </button>
      </div>
    );
  }

  if (!currentChar) return null;

  const accuracy = stats.practiced > 0
    ? Math.round((stats.correct / stats.practiced) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">練習統計</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              已練習 {stats.practiced} 個 · 正確率 {accuracy}%
            </div>
          </div>
          <button
            onClick={() => setIsConfiguring(true)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            重新配置
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {currentChar.char}
          </div>
          <div className="text-2xl text-purple-600 dark:text-purple-400">
            {currentChar.romaji}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            請在下方畫布書寫
          </div>
          {hasStrokeData(currentChar.char) && (
            <button
              onClick={() => setShowStrokeOrder(true)}
              className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              📝 筆順
            </button>
          )}
        </div>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-300 dark:border-gray-600 rounded-lg touch-none bg-white"
            style={{ maxWidth: '100%', height: 'auto' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="flex items-center justify-center gap-2 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo size={20} />
            <span>復原</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-2 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <Eraser size={20} />
            <span>清除</span>
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center justify-center gap-2 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {showGuide ? <EyeOff size={20} /> : <Eye size={20} />}
            <span>{showGuide ? '隱藏' : '顯示'}描摹</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleGrade(true)}
            className="py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-lg transition-colors"
          >
            ✓ 正確
          </button>
          <button
            onClick={() => handleGrade(false)}
            className="py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-lg transition-colors"
          >
            ↻ 再練習
          </button>
        </div>

        <button
          onClick={handleNext}
          className="w-full mt-3 py-3 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <SkipForward size={20} />
          跳過
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>提示：</strong>寫完後根據自己的表現評分。正確的字符會延長複習間隔，需要更多練習的會更頻繁出現。
        </p>
      </div>

      {/* Stroke Order Modal */}
      {showStrokeOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowStrokeOrder(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
              {currentChar.char} 的筆順
            </h3>
            <StrokeOrderAnimation
              char={currentChar.char}
              size={280}
              showNumbers={true}
              autoPlay={false}
              className="mx-auto"
            />
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              {currentChar.romaji}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
