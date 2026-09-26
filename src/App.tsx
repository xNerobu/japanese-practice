import { useState, useEffect } from 'react';
import { KanaChart } from './components/KanaChart';
import { Quiz } from './components/Quiz';
import { Review } from './components/Review';
import { HandwritingPractice } from './components/HandwritingPractice';
import { Progress } from './components/Progress';
import { hiraganaData, katakanaData } from './data/kana';
import { loadProgress, saveProgress } from './utils/progress';
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
            <Progress
              data={currentData}
              kanaType={kanaType}
              progress={progress}
              onProgressUpdate={setProgress}
            />
          )}
        </main>

        <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            筆順資料來自 <a href="https://github.com/KanjiVG/kanjivg" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600 dark:hover:text-purple-400">KanjiVG</a> (CC BY-SA 3.0)
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
