import { useState, useEffect } from 'react';
import type { KanaChar } from '../data/kana';
import type { ProgressData } from '../utils/progress';
import { recordDailyActivity, addExp } from '../utils/progress';
import { getDueCards, getReviewStats, initializeSRS, updateSRS } from '../utils/spacedRepetition';
import { speakKana, isSpeechSupported } from '../utils/speech';
import { Volume2, Check, X, RotateCcw } from 'lucide-react';

interface ReviewProps {
  data: KanaChar[];
  kanaType: 'hiragana' | 'katakana';
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
  onExpGain?: (amount: number, leveledUp: boolean, oldLevel?: number, newLevel?: number) => void;
}

type ReviewState = 'start' | 'question' | 'answer' | 'complete';

export function Review({ data, kanaType, progress, onProgressUpdate, onExpGain }: ReviewProps) {
  const [reviewState, setReviewState] = useState<ReviewState>('start');
  const [dueCards, setDueCards] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentChar, setCurrentChar] = useState<KanaChar | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [isFirstReview, setIsFirstReview] = useState(true);

  const allChars = data.map(k => k.char);
  const stats = getReviewStats(progress[kanaType], allChars);

  useEffect(() => {
    if (reviewState === 'start') {
      const due = getDueCards(progress[kanaType], allChars);
      setDueCards(due);
    }
  }, [reviewState, progress, kanaType]);

  const startReview = () => {
    if (dueCards.length === 0) {
      return;
    }
    setCurrentIndex(0);
    setSessionStats({ correct: 0, total: 0 });
    setIsFirstReview(true);
    setReviewState('question');
    generateQuestion(0);
  };

  const generateQuestion = (index: number) => {
    const char = dueCards[index];
    const kana = data.find(k => k.char === char);
    if (!kana) return;

    setCurrentChar(kana);
    setSelectedAnswer(null);
    setIsCorrect(null);

    // Generate options (romaji answers)
    const correctAnswer = kana.romaji;
    const wrongOptions = data
      .filter(k => k.char !== char)
      .map(k => k.romaji)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const handleGrade = (quality: number) => {
    if (!currentChar) return;

    const correct = quality >= 3;
    setIsCorrect(correct);
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));

    // Update progress with SRS
    const currentProgress = progress[kanaType][currentChar.char] || {
      char: currentChar.char,
      correct: 0,
      incorrect: 0,
      lastPracticed: 0,
      srs: initializeSRS(currentChar.char),
    };

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
    
    // Award EXP: scale 5-10 based on quality (0-5)
    // quality 0-2: 5 EXP, quality 3: 7 EXP, quality 4: 8 EXP, quality 5: 10 EXP
    const expAmount = Math.floor(5 + (quality / 5) * 5);
    const expResult = addExp(updatedProgress, expAmount, isFirstReview);
    updatedProgress = expResult.progress;
    
    if (isFirstReview) {
      setIsFirstReview(false);
    }

    onProgressUpdate(updatedProgress);
    
    // Trigger EXP animation
    if (onExpGain) {
      onExpGain(expResult.expGained, expResult.leveledUp, expResult.oldLevel, expResult.newLevel);
    }

    // Move to next card or complete
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < dueCards.length) {
        setCurrentIndex(nextIndex);
        setReviewState('question');
        generateQuestion(nextIndex);
      } else {
        setReviewState('complete');
      }
    }, 1000);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null || !currentChar) return;

    const correctAnswer = currentChar.romaji;
    const correct = answer === correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    // Auto-grade: correct = quality 4, incorrect = quality 1
    handleGrade(correct ? 4 : 1);
  };

  const resetReview = () => {
    setReviewState('start');
    setCurrentIndex(0);
    setCurrentChar(null);
  };

  if (reviewState === 'start') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">
            每日複習
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {stats.due}
              </div>
              <div className="text-gray-600 dark:text-gray-400">待複習</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                {stats.new}
              </div>
              <div className="text-gray-600 dark:text-gray-400">新字符</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {stats.total}
              </div>
              <div className="text-gray-600 dark:text-gray-400">總字符數</div>
            </div>
          </div>

          {stats.due > 0 ? (
            <>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                今天有 <span className="font-bold text-purple-600 dark:text-purple-400">{stats.due}</span> 個字符需要複習
              </p>
              <button
                onClick={startReview}
                className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
              >
                開始複習
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                太棒了！
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                今天沒有需要複習的字符。繼續保持！
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">💡 間隔重複學習</h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            系統會根據你的記憶強度自動安排複習時間。答對的字符會延長複習間隔，答錯的會更頻繁出現，幫助你高效記憶！
          </p>
        </div>
      </div>
    );
  }

  if (reviewState === 'complete') {
    const percentage = sessionStats.total > 0
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          複習完成！
        </h2>
        <div className="text-6xl font-bold text-purple-600 dark:text-purple-400 mb-4">
          {percentage}%
        </div>
        <div className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          答對 {sessionStats.correct} / {sessionStats.total} 個
        </div>
        <button
          onClick={resetReview}
          className="inline-flex items-center gap-2 px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
        >
          <RotateCcw size={24} />
          返回複習總覽
        </button>
      </div>
    );
  }

  if (!currentChar) return null;

  const progress_percent = Math.round(((currentIndex + 1) / dueCards.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
        <div className="text-lg font-semibold">
          {currentIndex + 1} / {dueCards.length}
        </div>
        <div className="text-lg font-semibold">
          正確：{sessionStats.correct} / {sessionStats.total}
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${progress_percent}%` }}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-8xl font-bold text-gray-800 dark:text-gray-200">
              {currentChar.char}
            </div>
            {isSpeechSupported() && (
              <button
                onClick={() => speakKana(currentChar.char)}
                className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
              >
                <Volume2 size={32} />
              </button>
            )}
          </div>
          <div className="text-gray-600 dark:text-gray-400 text-lg">
            請選擇正確的羅馬字
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === currentChar.romaji;
            let buttonClass = 'p-6 text-2xl font-bold rounded-lg border-2 transition-all ';

            if (selectedAnswer === null) {
              buttonClass += 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-purple-400 dark:hover:border-purple-500 text-gray-800 dark:text-gray-200';
            } else if (isSelected && isCorrect) {
              buttonClass += 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
            } else if (isSelected && !isCorrect) {
              buttonClass += 'border-red-500 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
            } else if (isCorrectOption) {
              buttonClass += 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
            } else {
              buttonClass += 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 opacity-50';
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                disabled={selectedAnswer !== null}
                className={buttonClass}
              >
                <div className="flex items-center justify-center gap-3">
                  <span>{option}</span>
                  {selectedAnswer !== null && isSelected && (
                    isCorrect ? <Check size={28} /> : <X size={28} />
                  )}
                  {selectedAnswer !== null && !isSelected && isCorrectOption && (
                    <Check size={28} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedAnswer !== null && (
          <div className={`mt-6 p-4 rounded-lg text-center text-lg font-semibold ${
            isCorrect
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}>
            {isCorrect ? '正確！' : `答錯了。正確答案是：${currentChar.romaji}`}
          </div>
        )}
      </div>
    </div>
  );
}
