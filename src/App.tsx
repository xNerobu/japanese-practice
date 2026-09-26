import { useState, useEffect } from 'react';
import { KanaChart } from './components/KanaChart';
import { Quiz } from './components/Quiz';
import { hiraganaData, katakanaData } from './data/kana';
import { loadProgress, saveProgress, getAccuracy } from './utils/progress';
import type { ProgressData } from './utils/progress';
import { initSpeech } from './utils/speech';
import { BookOpen, Brain, BarChart3 } from 'lucide-react';

type View = 'chart' | 'quiz' | 'progress';
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

        <nav className="flex gap-2 mb-6 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md">
          <button
            onClick={() => setView('chart')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              view === 'chart'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BookOpen size={20} />
            <span>字母表</span>
          </button>
          <button
            onClick={() => setView('quiz')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              view === 'quiz'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Brain size={20} />
            <span>測驗</span>
          </button>
          <button
            onClick={() => setView('progress')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
              view === 'progress'
                ? 'bg-purple-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart3 size={20} />
            <span>進度</span>
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
