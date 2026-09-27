import { useState, useEffect } from 'react';
import { hiraganaData, katakanaData, rowNames } from '../data/kana';
import type { KanaChar } from '../data/kana';
import { updateCharProgress, getWeakChars, addExp } from '../utils/progress';
import type { ProgressData } from '../utils/progress';
import { speakKana } from '../utils/speech';
import { getSimilarKana } from '../data/similarSounds';
import { Volume2, Check, X } from 'lucide-react';

interface ListeningQuizProps {
  data: KanaChar[];
  kanaType: 'hiragana' | 'katakana';
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
  onExpGain?: (amount: number, leveledUp: boolean, oldLevel?: number, newLevel?: number) => void;
}

type KanaTypeFilter = 'hiragana' | 'katakana' | 'mixed';
type QuizFilter = 'all' | 'weak';

interface MissedKana {
  char: string;
  romaji: string;
  userAnswer: string;
}

interface QuestionData extends KanaChar {
  script: 'hiragana' | 'katakana';
}

export function ListeningQuiz({ data, kanaType, progress, onProgressUpdate, onExpGain }: ListeningQuizProps) {
  const [kanaTypeFilter, setKanaTypeFilter] = useState<KanaTypeFilter>(kanaType);
  const [filter, setFilter] = useState<QuizFilter>('all');
  const allRows = [...new Set(data.map(k => k.row))];
  const [selectedRows, setSelectedRows] = useState<string[]>(() => allRows);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['basic']);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [questionCount, setQuestionCount] = useState(10);
  const [questionsRemaining, setQuestionsRemaining] = useState(10);
  const [showResults, setShowResults] = useState(false);
  const [isFirstQuestion, setIsFirstQuestion] = useState(true);
  const [needsStartTap, setNeedsStartTap] = useState(true);
  const [missedKana, setMissedKana] = useState<MissedKana[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const allTypes = [
    { key: 'basic', label: '清音' },
    { key: 'dakuten', label: '濁音' },
    { key: 'handakuten', label: '半濁音' },
    { key: 'yoon', label: '拗音' },
  ];

  useEffect(() => {
    if (kanaTypeFilter !== kanaType && kanaTypeFilter !== 'mixed') {
      setKanaTypeFilter(kanaType);
    }
  }, [kanaType, kanaTypeFilter]);

  // Auto-play audio when question changes (after start tap)
  useEffect(() => {
    if (currentQuestion && !needsStartTap && selectedAnswer === null) {
      speakKana(currentQuestion.char);
    }
  }, [currentQuestion, needsStartTap, selectedAnswer]);

  const startQuiz = () => {
    if (selectedRows.length === 0) {
      setErrorMessage('請至少選擇一個行');
      return;
    }
    if (selectedTypes.length === 0) {
      setErrorMessage('請至少選擇一個類型');
      return;
    }
    setErrorMessage('');
    setIsConfiguring(false);
    setScore({ correct: 0, total: 0 });
    setShowResults(false);
    setIsFirstQuestion(true);
    setNeedsStartTap(true);
    setQuestionsRemaining(questionCount);
    setMissedKana([]);
    
    const question = generateQuestion();
    if (question) {
      setCurrentQuestion(question);
    }
  };

  const generateQuestion = (): QuestionData | null => {
    // Get the pool based on kanaTypeFilter
    let availableChars: QuestionData[] = [];
    
    if (kanaTypeFilter === 'mixed') {
      // Mix both hiragana and katakana
      const hiraganaChars: QuestionData[] = hiraganaData
        .filter(k => selectedRows.includes(k.row) && selectedTypes.includes(k.type))
        .map(k => ({ ...k, script: 'hiragana' as const }));
      const katakanaChars: QuestionData[] = katakanaData
        .filter(k => selectedRows.includes(k.row) && selectedTypes.includes(k.type))
        .map(k => ({ ...k, script: 'katakana' as const }));
      availableChars = [...hiraganaChars, ...katakanaChars];
    } else {
      const dataset = kanaTypeFilter === 'hiragana' ? hiraganaData : katakanaData;
      availableChars = dataset
        .filter(k => selectedRows.includes(k.row) && selectedTypes.includes(k.type))
        .map(k => ({ ...k, script: kanaTypeFilter as 'hiragana' | 'katakana' }));
    }

    // Apply weak filter if needed
    if (filter === 'weak') {
      const scriptToUse = kanaTypeFilter === 'mixed' ? kanaType : kanaTypeFilter;
      const weakChars = getWeakChars(progress, scriptToUse, availableChars.map(k => k.char));
      if (weakChars.length > 0) {
        availableChars = availableChars.filter(k => weakChars.includes(k.char));
      }
    }

    if (availableChars.length === 0) {
      return null;
    }

    const question = availableChars[Math.floor(Math.random() * availableChars.length)];
    
    // Generate distractors from the same script AND from the selected pool (rows + types)
    const poolSameScript = availableChars.filter(k => k.script === question.script && k.char !== question.char);
    
    // Get similar kana (prioritize them, but only from the pool)
    const similarKana = getSimilarKana(question.char, question.script === 'hiragana');
    let wrongOptions: string[] = [];
    
    // Try to include similar sounds, but only if they're in the pool
    for (const similar of similarKana) {
      if (wrongOptions.length >= 3) break;
      const existsInPool = poolSameScript.some(k => k.char === similar);
      if (existsInPool && similar !== question.char && !wrongOptions.includes(similar)) {
        wrongOptions.push(similar);
      }
    }
    
    // Fill remaining with random from pool
    const seenChars = new Set([question.char, ...wrongOptions]);
    let attempts = 0;
    while (wrongOptions.length < 3 && poolSameScript.length > 0 && attempts < 100) {
      const randomChar = poolSameScript[Math.floor(Math.random() * poolSameScript.length)];
      if (!seenChars.has(randomChar.char)) {
        wrongOptions.push(randomChar.char);
        seenChars.add(randomChar.char);
      }
      attempts++;
    }
    
    wrongOptions = wrongOptions.slice(0, 3);
    const allOptions = [question.char, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);
    
    return question;
  };

  const handleStartTap = () => {
    setNeedsStartTap(false);
    if (currentQuestion) {
      speakKana(currentQuestion.char);
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null || !currentQuestion) return;

    const correctAnswer = currentQuestion.char;
    const correct = answer === correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));

    if (!correct) {
      setMissedKana(prev => [...prev, {
        char: currentQuestion.char,
        romaji: currentQuestion.romaji,
        userAnswer: answer,
      }]);
    }

    // Update progress for the question's own script
    let updatedProgress = updateCharProgress(progress, currentQuestion.script, currentQuestion.char, correct);
    
    const expResult = addExp(updatedProgress, correct ? 10 : 2, isFirstQuestion);
    updatedProgress = expResult.progress;
    
    if (isFirstQuestion) {
      setIsFirstQuestion(false);
    }
    
    onProgressUpdate(updatedProgress);
    
    if (onExpGain) {
      onExpGain(expResult.expGained, expResult.leveledUp, expResult.oldLevel, expResult.newLevel);
    }
  };

  const handleNext = () => {
    const remaining = questionsRemaining - 1;
    setQuestionsRemaining(remaining);
    
    if (remaining <= 0) {
      setShowResults(true);
    } else {
      const nextQuestion = generateQuestion();
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
      }
    }
  };

  const resetQuiz = () => {
    setIsConfiguring(true);
    setQuestionsRemaining(questionCount);
    setCurrentQuestion(null);
    setErrorMessage('');
  };

  const toggleRow = (row: string) => {
    setSelectedRows(prev =>
      prev.includes(row) ? prev.filter(r => r !== row) : [...prev, row]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const selectAllRows = () => {
    setSelectedRows(allRows);
  };

  const clearAllRows = () => {
    setSelectedRows([]);
  };

  const selectAllTypes = () => {
    setSelectedTypes(allTypes.map(t => t.key));
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  if (isConfiguring) {
    return (
      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-red-100 dark:bg-red-900 border-2 border-red-500 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">假名類型</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="kanaTypeFilter"
                checked={kanaTypeFilter === 'hiragana'}
                onChange={() => setKanaTypeFilter('hiragana')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">平假名</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="kanaTypeFilter"
                checked={kanaTypeFilter === 'katakana'}
                onChange={() => setKanaTypeFilter('katakana')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">片假名</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="kanaTypeFilter"
                checked={kanaTypeFilter === 'mixed'}
                onChange={() => setKanaTypeFilter('mixed')}
                className="w-4 h-4"
              />
              <span className="text-gray-700 dark:text-gray-300">混合</span>
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
                <span className="text-gray-700 dark:text-gray-300">{rowNames[row as keyof typeof rowNames] || `${row}行`}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">選擇類型</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAllTypes}
                className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                全選
              </button>
              <button
                onClick={clearAllTypes}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                清空
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allTypes.map(type => (
              <label key={type.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.key)}
                  onChange={() => toggleType(type.key)}
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">題數</h3>
          <input
            type="number"
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 10))}
            min="1"
            max="50"
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
          />
        </div>

        <button
          onClick={startQuiz}
          className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
        >
          開始聽音測驗
        </button>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score.correct / score.total) * 100);
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg text-center space-y-6">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">測驗完成！</h2>
        <div className="text-6xl font-bold text-purple-600 dark:text-purple-400 mb-4">
          {percentage}%
        </div>
        <div className="text-xl text-gray-700 dark:text-gray-300 mb-8">
          答對 {score.correct} / {score.total} 題
        </div>

        {missedKana.length > 0 && (
          <div className="text-left">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">答錯的字符</h3>
            <div className="space-y-3">
              {missedKana.map((missed, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-gray-800 dark:text-gray-200">{missed.char}</span>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>正確：{missed.romaji}</div>
                      <div className="text-red-600 dark:text-red-400">你選了：{missed.userAnswer}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => speakKana(missed.char)}
                      className="p-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                      aria-label={`播放正確答案 ${missed.char}`}
                    >
                      <Volume2 size={20} />
                    </button>
                    <button
                      onClick={() => speakKana(missed.userAnswer)}
                      className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                      aria-label={`播放你的選擇 ${missed.userAnswer}`}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={resetQuiz}
          className="w-full px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors"
        >
          再練一次
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const correctAnswer = currentQuestion.char;
  const isLastQuestion = questionsRemaining === 1;

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

      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg space-y-6">
        {needsStartTap ? (
          <div className="text-center space-y-6">
            <div className="text-xl text-gray-700 dark:text-gray-300">
              準備好了嗎？點擊下方按鈕開始聆聽
            </div>
            <button
              onClick={handleStartTap}
              className="px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xl rounded-lg transition-colors"
            >
              開始
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              {selectedAnswer === null ? (
                <>
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="text-5xl text-gray-400 dark:text-gray-500">🔊</div>
                  </div>
                  <button
                    onClick={() => speakKana(currentQuestion.char)}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Volume2 size={24} />
                    再聽一次
                  </button>
                  <div className="text-gray-600 dark:text-gray-400 mt-6">
                    請選擇你聽到的假名
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                    {currentQuestion.char}
                  </div>
                  <div className="text-2xl text-gray-600 dark:text-gray-400 mb-6">
                    {currentQuestion.romaji}
                  </div>
                  {!isCorrect && selectedAnswer && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        比較發音：
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => speakKana(currentQuestion.char)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Volume2 size={20} />
                          正確答案
                        </button>
                        <button
                          onClick={() => speakKana(selectedAnswer)}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Volume2 size={20} />
                          你的選擇
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {options.map((option, idx) => {
                const isSelected = selectedAnswer === option;
                const isCorrectOption = option === correctAnswer;
                let buttonClass = 'p-6 text-3xl font-bold rounded-lg border-2 transition-all ';

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
                        isCorrect ? <Check size={32} /> : <X size={32} />
                      )}
                      {selectedAnswer !== null && !isSelected && isCorrectOption && (
                        <Check size={32} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedAnswer !== null && (
              <>
                <div className={`p-4 rounded-lg text-center text-lg font-semibold ${
                  isCorrect
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {isCorrect ? '答對了！' : `答錯了。正確答案是：${correctAnswer} (${currentQuestion.romaji})`}
                </div>
                
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xl rounded-lg transition-colors"
                >
                  {isLastQuestion ? '查看結果' : '下一題'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
