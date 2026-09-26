import { useState, useEffect } from 'react';
import { KanaChart } from './components/KanaChart';
import { Quiz } from './components/Quiz';
import { Review } from './components/Review';
import { HandwritingPractice } from './components/HandwritingPractice';
import { hiraganaData, katakanaData } from './data/kana';
import { loadProgress, saveProgress, getAccuracy } from './utils/progress';
import type { ProgressData } from './utils/progress';
import { initSpeech } from './utils/speech';
import { getReviewStats } from './utils/spacedRepetition';
import { BookOpen, Brain, BarChart3, Calendar, PenTool } from 'lucide-react';

type View = 'chart' | 'quiz' | 'review' | 'handwriting' | 'progress';
type KanaType = 'hiragana' | 'katakana';

function App() {
  const [view, setView] = useState<View>('chart');
  const [kanaType, setKanaType] = useState<KanaType>('hiragana');
  const [progress, setProgress] = useState<ProgressData>(loadProgress());

  useEffect(() => {
    initSpeech();
  }, []);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const currentData = kanaType === 'hiragana' ? hiraganaData : katakanaData;
  const currentTitle = kanaType === 'hiragana' ? '平假名' : '片假名';

  const progressStats = Object.values(progress[kanaType]);
  const totalPracticed = progressStats.length;
  const avgAccuracy = totalPracticed > 0
    ? progressStats.reduce((sum, p) => sum + getAccuracy(p), 0) / totalPracticed
    : 0;

  // Get review stats for due count badge
  const allChars = currentData.map(k => k.char);
  const reviewStats = getReviewStats(progress[kanaType], allChars);
  const dueCount = reviewStats.due;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            日語假名學習
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            學習平假名和片假名的互動工具
          </p>
        </header>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setKanaType('hiragana')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              kanaType === 'hiragana'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            平假名
          </button>
          <button
            onClick={() => setKanaType('katakana')}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              kanaType === 'katakana'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            片假名
          </button>
        </div>

        <nav className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md">
          <button
            onClick={() => setView('chart')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 rounded-lg font-semibold transition-colors ${
              view === 'chart'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BookOpen size={20} />
            <span className="text-xs sm:text-base">字母表</span>
          </button>
          <button
            onClick={() => setView('quiz')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 rounded-lg font-semibold transition-colors ${
              view === 'quiz'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Brain size={20} />
            <span className="text-xs sm:text-base">測驗</span>
          </button>
          <button
            onClick={() => setView('review')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 rounded-lg font-semibold transition-colors relative ${
              view === 'review'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar size={20} />
            <span className="text-xs sm:text-base">複習</span>
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('handwriting')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 rounded-lg font-semibold transition-colors ${
              view === 'handwriting'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <PenTool size={20} />
            <span className="text-xs sm:text-base">手寫</span>
          </button>
          <button
            onClick={() => setView('progress')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-3 px-2 rounded-lg font-semibold transition-colors ${
              view === 'progress'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-xs sm:text-base">進度</span>
          </button>
        </nav>

        <main>
          {view === 'chart' && (
            <KanaChart data={currentData} title={currentTitle} />
          )}
          {view === 'quiz' && (
            <Quiz
              data={currentData}
              kanaType={kanaType}
              progress={progress}
              onProgressUpdate={setProgress}
            />
          )}
          {view === 'review' && (
            <Review
              data={currentData}
              kanaType={kanaType}
              progress={progress}
              onProgressUpdate={setProgress}
            />
          )}
          {view === 'handwriting' && (
            <HandwritingPractice
              data={currentData}
              kanaType={kanaType}
              progress={progress}
              onProgressUpdate={setProgress}
            />
          )}
          {view === 'progress' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                  <div className="text-gray-600 dark:text-gray-400 mb-2">已練習字符</div>
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {totalPracticed}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                  <div className="text-gray-600 dark:text-gray-400 mb-2">平均正確率</div>
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.round(avgAccuracy)}%
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                  各字符表現
                </h3>
                {totalPracticed === 0 ? (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                    還沒有練習記錄。開始測驗來追蹤你的進度！
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {Object.values(progress[kanaType])
                      .sort((a, b) => getAccuracy(a) - getAccuracy(b))
                      .map(charProgress => {
                        const accuracy = getAccuracy(charProgress);
                        const total = charProgress.correct + charProgress.incorrect;
                        const kana = currentData.find(k => k.char === charProgress.char);

                        return (
                          <div
                            key={charProgress.char}
                            className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="text-2xl font-bold w-12 text-center">
                              {charProgress.char}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 w-16">
                              {kana?.romaji}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      accuracy >= 70
                                        ? 'bg-green-500'
                                        : accuracy >= 40
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${accuracy}%` }}
                                  />
                                </div>
                                <div className="text-sm font-semibold w-12 text-right">
                                  {Math.round(accuracy)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {charProgress.correct}/{total}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {totalPracticed > 0 && (
                <button
                  onClick={() => {
                    if (confirm('確定要清除所有進度記錄嗎？')) {
                      setProgress({ hiragana: {}, katakana: {} });
                    }
                  }}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  清除所有進度
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
