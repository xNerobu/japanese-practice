import { useState } from 'react';
import type { KanaChar } from '../data/kana';
import type { ProgressData } from '../utils/progress';
import { getAccuracy, isWeakChar, getLevelTitle, getExpProgress } from '../utils/progress';
import { isDue } from '../utils/spacedRepetition';
import { TrendingUp, Target, Calendar, X, Sparkles } from 'lucide-react';

interface ProgressProps {
  data: KanaChar[];
  kanaType: 'hiragana' | 'katakana';
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
}

type CharType = 'basic' | 'dakuten' | 'handakuten' | 'yoon';

interface CellDetailData {
  char: string;
  romaji: string;
  accuracy: number;
  total: number;
  correct: number;
  incorrect: number;
  nextReview?: number;
  interval?: number;
  repetitions?: number;
}

export function Progress({ data, kanaType, progress, onProgressUpdate }: ProgressProps) {
  const [selectedCharType, setSelectedCharType] = useState<CharType>('basic');
  const [selectedCell, setSelectedCell] = useState<CellDetailData | null>(null);

  const dailyHistory = progress.dailyHistory || [];
  const charProgress = progress[kanaType];

  // Calculate summary stats
  const allProgress = Object.values(charProgress);
  const totalPracticed = allProgress.length;
  const avgAccuracy = totalPracticed > 0
    ? Math.round(allProgress.reduce((sum, p) => sum + getAccuracy(p), 0) / totalPracticed)
    : 0;

  const masteredCount = allProgress.filter(p => {
    const acc = getAccuracy(p);
    const total = p.correct + p.incorrect;
    return acc >= 80 && total >= 5;
  }).length;

  // EXP data
  const exp = progress.exp || { totalExp: 0, level: 1 };
  const levelTitle = getLevelTitle(exp.level);
  const expProgress = getExpProgress(exp.totalExp, exp.level);

  // SRS stage breakdown
  const srsStats = {
    new: 0,
    learning: 0,
    mastered: 0,
    dueToday: 0,
  };

  data.forEach(kana => {
    const charProg = charProgress[kana.char];
    if (!charProg || !charProg.srs) {
      srsStats.new++;
    } else {
      const { repetitions } = charProg.srs;
      if (repetitions === 0) {
        srsStats.learning++;
      } else if (repetitions >= 3) {
        srsStats.mastered++;
      } else {
        srsStats.learning++;
      }

      if (isDue(charProg.srs)) {
        srsStats.dueToday++;
      }
    }
  });

  // Get characters for current type
  const currentTypeChars = data.filter(k => k.type === selectedCharType);

  // Organize into grid
  const rowOrder = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'];
  const columnOrder = selectedCharType === 'yoon'
    ? ['ya', 'yu', 'yo']
    : ['a', 'i', 'u', 'e', 'o'];

  const grid: (KanaChar | null)[][] = [];

  if (selectedCharType === 'yoon') {
    // Special layout for yōon
    const yoonRows = ['ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ra'];
    yoonRows.forEach(row => {
      const rowChars = currentTypeChars.filter(k => k.row === row);
      const gridRow: (KanaChar | null)[] = [];
      
      columnOrder.forEach(col => {
        const char = rowChars.find(k => k.romaji.endsWith(col));
        gridRow.push(char || null);
      });
      
      if (gridRow.some(c => c !== null)) {
        grid.push(gridRow);
      }
    });
  } else {
    rowOrder.forEach(row => {
      const rowChars = currentTypeChars.filter(k => k.row === row);
      if (rowChars.length === 0) return;

      const gridRow: (KanaChar | null)[] = [];
      
      if (row === 'ya' || row === 'wa') {
        // Special rows with gaps
        columnOrder.forEach((col, idx) => {
          if (row === 'ya' && (idx === 1 || idx === 3)) {
            gridRow.push(null);
          } else if (row === 'wa' && idx > 0 && idx < 4) {
            gridRow.push(null);
          } else {
            const char = rowChars.find(k => k.romaji.includes(col) || (col === 'a' && k.romaji === row.charAt(0)));
            gridRow.push(char || null);
          }
        });
      } else {
        columnOrder.forEach(col => {
          const char = rowChars.find(k => k.romaji.includes(col));
          gridRow.push(char || null);
        });
      }
      
      grid.push(gridRow);
    });
  }

  // Get cell color based on mastery
  const getCellColor = (kana: KanaChar | null): string => {
    if (!kana) return 'bg-transparent';
    
    const charProg = charProgress[kana.char];
    if (!charProg) return 'bg-gray-200 dark:bg-gray-700';

    const accuracy = getAccuracy(charProg);
    const total = charProg.correct + charProg.incorrect;

    if (total < 3) {
      return 'bg-gray-300 dark:bg-gray-600';
    } else if (accuracy >= 80 && total >= 5) {
      return 'bg-green-500 dark:bg-green-600';
    } else if (accuracy >= 60) {
      return 'bg-yellow-500 dark:bg-yellow-600';
    } else if (accuracy >= 40) {
      return 'bg-orange-500 dark:bg-orange-600';
    } else {
      return 'bg-red-500 dark:bg-red-600';
    }
  };

  // Handle cell click
  const handleCellClick = (kana: KanaChar | null) => {
    if (!kana) return;
    
    const charProg = charProgress[kana.char];
    const total = charProg ? charProg.correct + charProg.incorrect : 0;
    const accuracy = charProg ? getAccuracy(charProg) : 0;

    setSelectedCell({
      char: kana.char,
      romaji: kana.romaji,
      accuracy: Math.round(accuracy),
      total,
      correct: charProg?.correct || 0,
      incorrect: charProg?.incorrect || 0,
      nextReview: charProg?.srs?.nextReview,
      interval: charProg?.srs?.interval,
      repetitions: charProg?.srs?.repetitions,
    });
  };

  // Daily activity chart data (last 7 days)
  const getLast7DaysData = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dailyHistory.find(d => d.date === dateStr);
      
      result.push({
        date: dateStr,
        label: date.toLocaleDateString('zh-TW', { weekday: 'short' }),
        correct: dayData?.correct || 0,
        incorrect: dayData?.incorrect || 0,
        total: dayData?.practiced || 0,
      });
    }
    return result;
  };

  const last7Days = getLast7DaysData();
  const maxDailyCount = Math.max(...last7Days.map(d => d.total), 1);

  // Upcoming reviews forecast
  const getUpcomingReviews = () => {
    const forecast = Array(7).fill(0);
    
    Object.values(charProgress).forEach(cp => {
      if (cp.srs && cp.srs.nextReview) {
        const daysUntil = Math.floor((cp.srs.nextReview - Date.now()) / (24 * 60 * 60 * 1000));
        if (daysUntil >= 0 && daysUntil < 7) {
          forecast[daysUntil]++;
        }
      }
    });
    
    return forecast;
  };

  const upcomingReviews = getUpcomingReviews();

  // Clear all progress
  const handleClearProgress = () => {
    if (confirm('確定要清除所有進度記錄嗎？')) {
      onProgressUpdate({ 
        hiragana: {}, 
        katakana: {}, 
        dailyHistory: [], 
        exp: { totalExp: 0, level: 1 },
        version: 4 
      });
    }
  };

  // Weak characters
  const weakChars = allProgress.filter(p => isWeakChar(p));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 sm:p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2">
            <Target size={20} />
            <div className="text-xs sm:text-sm opacity-90">已練習</div>
          </div>
          <div className="text-2xl sm:text-4xl font-bold">{totalPracticed}</div>
          <div className="text-xs opacity-75 mt-1">/ {data.length} 字符</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 sm:p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} />
            <div className="text-xs sm:text-sm opacity-90">正確率</div>
          </div>
          <div className="text-2xl sm:text-4xl font-bold">{avgAccuracy}%</div>
          <div className="text-xs opacity-75 mt-1">{masteredCount} 個熟練</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} />
            <div className="text-xs sm:text-sm opacity-90">今日待複習</div>
          </div>
          <div className="text-2xl sm:text-4xl font-bold">{srsStats.dueToday}</div>
          <div className="text-xs opacity-75 mt-1">{srsStats.new} 個新字</div>
        </div>
      </div>

      {/* EXP Card */}
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-4 sm:p-6 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={24} />
          <div>
            <div className="text-2xl font-bold">等級 {exp.level}</div>
            <div className="text-sm opacity-90">{levelTitle}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(expProgress.progress * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm opacity-90">
            <span>{expProgress.current} EXP</span>
            <span>{expProgress.needed} EXP 升級</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="opacity-75">總經驗值</div>
            <div className="font-bold">{exp.totalExp.toLocaleString()} EXP</div>
          </div>
          <div>
            <div className="opacity-75">今日獲得</div>
            <div className="font-bold">
              {dailyHistory.length > 0 && dailyHistory[dailyHistory.length - 1]?.date === new Date().toISOString().split('T')[0]
                ? `${dailyHistory[dailyHistory.length - 1]?.exp || 0} EXP`
                : '0 EXP'}
            </div>
          </div>
        </div>
      </div>

      {/* Kana Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          假名熱力圖
        </h3>

        {/* Type Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCharType('basic')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-colors ${
              selectedCharType === 'basic'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            清音
          </button>
          <button
            onClick={() => setSelectedCharType('dakuten')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-colors ${
              selectedCharType === 'dakuten'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            濁音
          </button>
          <button
            onClick={() => setSelectedCharType('handakuten')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-colors ${
              selectedCharType === 'handakuten'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            半濁音
          </button>
          <button
            onClick={() => setSelectedCharType('yoon')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold whitespace-nowrap text-sm transition-colors ${
              selectedCharType === 'yoon'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            拗音
          </button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 sm:gap-2 mb-1 sm:mb-2">
                {row.map((cell, cellIdx) => (
                  <button
                    key={cellIdx}
                    onClick={() => handleCellClick(cell)}
                    disabled={!cell}
                    className={`
                      w-10 h-10 sm:w-14 sm:h-14 rounded flex items-center justify-center
                      text-white font-bold text-sm sm:text-lg
                      transition-all hover:scale-105 active:scale-95
                      disabled:cursor-default disabled:hover:scale-100
                      ${getCellColor(cell)}
                    `}
                  >
                    {cell?.char}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-gray-600 dark:text-gray-400">未熟練</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">&lt; 40%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-gray-600 dark:text-gray-400">40-60%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-gray-600 dark:text-gray-400">60-80%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">≥ 80% 熟練</span>
          </div>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          每日練習記錄（近 7 天）
        </h3>
        
        {dailyHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-2">📊</p>
            <p>尚無練習記錄</p>
            <p className="text-sm mt-1">開始練習後，這裡會顯示你的每日進度</p>
          </div>
        ) : (
          <div className="space-y-2">
            {last7Days.map((day, idx) => (
              <div key={idx} className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 sm:w-12 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {day.label}
                </div>
                <div className="flex-1 relative h-8 sm:h-10">
                  {day.total > 0 && (
                    <>
                      <div
                        className="absolute left-0 top-0 h-full bg-green-500 dark:bg-green-600 rounded"
                        style={{ width: `${(day.correct / maxDailyCount) * 100}%` }}
                      ></div>
                      <div
                        className="absolute bg-red-500 dark:bg-red-600 rounded"
                        style={{
                          left: `${(day.correct / maxDailyCount) * 100}%`,
                          width: `${(day.incorrect / maxDailyCount) * 100}%`,
                          height: '100%',
                          top: 0,
                        }}
                      ></div>
                    </>
                  )}
                  {day.total === 0 && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  )}
                </div>
                <div className="w-12 sm:w-16 text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-right">
                  {day.total > 0 ? `${day.total} 題` : '—'}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-400">正確</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-gray-600 dark:text-gray-400">錯誤</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SRS Stage Breakdown & Upcoming Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* SRS Stages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            學習階段分布
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">新字符</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{srsStats.new}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(srsStats.new / data.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">學習中</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{srsStats.learning}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${(srsStats.learning / data.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">已熟練</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{srsStats.mastered}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(srsStats.mastered / data.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">今日待複習</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{srsStats.dueToday}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Reviews */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg">
          <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
            未來 7 天複習預測
          </h3>
          
          {upcomingReviews.every(r => r === 0) ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>尚無排程複習</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingReviews.map((count, idx) => {
                const date = new Date(Date.now() + idx * 24 * 60 * 60 * 1000);
                const label = idx === 0 ? '今天' : idx === 1 ? '明天' : date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
                const maxCount = Math.max(...upcomingReviews, 1);
                
                return (
                  <div key={idx} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-12 sm:w-16 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {label}
                    </div>
                    <div className="flex-1 relative h-6 sm:h-8">
                      <div
                        className="absolute left-0 top-0 h-full bg-purple-500 dark:bg-purple-600 rounded"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      ></div>
                    </div>
                    <div className="w-8 sm:w-12 text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-right">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Weak Characters */}
      {weakChars.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 sm:p-6 border-2 border-orange-200 dark:border-orange-800">
          <h3 className="text-lg sm:text-xl font-bold mb-3 text-orange-900 dark:text-orange-200">
            ⚠️ 需要加強練習
          </h3>
          <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
            以下 {weakChars.length} 個字符的正確率低於 70%，建議多加練習：
          </p>
          <div className="flex flex-wrap gap-2">
            {weakChars.slice(0, 20).map(cp => {
              const kana = data.find(k => k.char === cp.char);
              return (
                <div
                  key={cp.char}
                  className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-orange-300 dark:border-orange-700"
                >
                  <span className="font-bold text-gray-800 dark:text-gray-200">{cp.char}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                    ({kana?.romaji}) {Math.round(getAccuracy(cp))}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear Progress Button */}
      {totalPracticed > 0 && (
        <button
          onClick={handleClearProgress}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
        >
          清除所有進度
        </button>
      )}

      {/* Cell Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCell(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-5xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {selectedCell.char}
                </div>
                <div className="text-xl text-purple-600 dark:text-purple-400">
                  {selectedCell.romaji}
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">正確率</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedCell.accuracy}%</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">練習次數</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedCell.total}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">正確 / 錯誤</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {selectedCell.correct} / {selectedCell.incorrect}
                </span>
              </div>

              {selectedCell.repetitions !== undefined && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">SRS 階段</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {selectedCell.repetitions === 0 ? '學習中' : selectedCell.repetitions >= 3 ? '已熟練' : '練習中'}
                  </span>
                </div>
              )}

              {selectedCell.interval !== undefined && selectedCell.interval > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">複習間隔</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {selectedCell.interval} 天
                  </span>
                </div>
              )}

              {selectedCell.nextReview && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">下次複習</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {new Date(selectedCell.nextReview).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
