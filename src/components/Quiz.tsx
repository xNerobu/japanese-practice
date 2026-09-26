import React, { useState, useEffect } from 'react';
import { KanaChar } from '../data/kana';
import { ProgressData, updateCharProgress, getWeakChars } from '../utils/progress';
import { speakKana, isSpeechSupported } from '../utils/speech';
import { Volume2, Check, X } from 'lucide-react';

interface QuizProps {
  data: KanaChar[];
  kanaType: 'hiragana' | 'katakana';
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
}

type QuizMode = 'kana-to-romaji' | 'romaji-to-kana';
type QuizFilter = 'all' | 'weak';

export function Quiz({ data, kanaType, progress, onProgressUpdate }: QuizProps) {
  const [mode, setMode] = useState<QuizMode>('kana-to-romaji');
  const [filter, setFilter] = useState<QuizFilter>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<KanaChar | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [questionsRemaining, setQuestionsRemaining] = useState(10);
  const [showResults, setShowResults] = useState(false);

  const allRows = [...new Set(data.map(k => k.row))];

  const startQuiz = () => {
    if (selectedRows.length === 0) {
      alert('請至少選擇一個行');
      return;
    }
    setIsConfiguring(false);
    setScore({ correct: 0, total: 0 });
    setShowResults(false);
    generateQuestion();
  };

  const generateQuestion = () => {
    let availableChars = data.filter(k => selectedRows.includes(k.row));
    
    if (filter === 'weak') {
      const weakChars = getWeakChars(progress, kanaType, availableChars.map(k => k.char));
      if (weakChars.length > 0) {
        availableChars = availableChars.filter(k => weakChars.includes(k.char));
      }
    }

    if (availableChars.length === 0) {
      availableChars = data.filter(k => selectedRows.includes(k.row));
    }

    const question = availableChars[Math.floor(Math.random() * availableChars.length)];
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setIsCorrect(null);

    const correctAnswer = mode === 'kana-to-romaji' ? question.romaji : question.char;
    const wrongOptions = availableChars
      .filter(k => k.char !== question.char)
      .map(k => mode === 'kana-to-romaji' ? k.romaji : k.char)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;

    const correctAnswer = mode === 'kana-to-romaji' ? currentQuestion!.romaji : currentQuestion!.char;
    const correct = answer === correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));

    const updatedProgress = updateCharProgress(progress, kanaType, currentQuestion!.char, correct);
    onProgressUpdate(updatedProgress);

    setTimeout(() => {
      const remaining = questionsRemaining - 1;
      setQuestionsRemaining(remaining);
      
      if (remaining <= 0) {
        setShowResults(true);
      } else {
        generateQuestion();
      }
    }, 1500);
  };

  const resetQuiz = () => {
    setIsConfiguring(true);
    setQuestionsRemaining(10);
    setCurrentQuestion(null);
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
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">測驗模式</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'kana-to-romaji'}
                onChange={() => setMode('kana-to-romaji')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">看假名選羅馬字</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'romaji-to-kana'}
                onChange={() => setMode('romaji-to-kana')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">看羅馬字選假名</span>
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">練習範圍</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === 'all'}
                onChange={() => setFilter('all')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">所有字符</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === 'weak'}
                onChange={() => setFilter('weak')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">弱項字符（正確率 &lt; 70%）</span>
            </label>
          </div>
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
          onClick={startQuiz}
          className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
        >
          開始測驗
        </button>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score.correct / score.total) * 100);
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">測驗完成！</h2>
        <div className="text-6xl font-bold text-purple-600 dark:text-purple-400 mb-4">
          {percentage}%
        </div>
        <div className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          答對 {score.correct} / {score.total} 題
        </div>
        <button
          onClick={resetQuiz}
          className="px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
        >
          重新配置測驗
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const questionDisplay = mode === 'kana-to-romaji' ? currentQuestion.char : currentQuestion.romaji;
  const correctAnswer = mode === 'kana-to-romaji' ? currentQuestion.romaji : currentQuestion.char;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
        <div className="text-lg font-semibold">
          題目 {score.total + 1} / {score.total + questionsRemaining}
        </div>
        <div className="text-lg font-semibold">
          得分：{score.correct} / {score.total}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-6xl font-bold text-gray-800 dark:text-gray-200">
              {questionDisplay}
            </div>
            {mode === 'kana-to-romaji' && isSpeechSupported() && (
              <button
                onClick={() => speakKana(currentQuestion.char)}
                className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
              >
                <Volume2 size={28} />
              </button>
            )}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {mode === 'kana-to-romaji' ? '請選擇正確的羅馬字' : '請選擇正確的假名'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === correctAnswer;
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
            {isCorrect ? '答對了！' : `答錯了。正確答案是：${correctAnswer}`}
          </div>
        )}
      </div>
    </div>
  );
}
