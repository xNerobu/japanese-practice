import { useState } from 'react';
import { songsData, type Song, type ThemeWord } from '../data/songs';
import { speakKana } from '../utils/speech';
import { addExp } from '../utils/progress';
import type { ProgressData } from '../utils/progress';
import { ArrowLeft, Volume2, Eye, EyeOff, Check, X, ExternalLink } from 'lucide-react';

interface SongsProps {
  progress: ProgressData;
  onProgressUpdate: (progress: ProgressData) => void;
  onExpGain?: (amount: number, leveledUp: boolean, oldLevel?: number, newLevel?: number) => void;
}

type View = 'list' | 'detail' | 'quiz';

type QuizQuestion = {
  type: 'word-to-meaning' | 'audio-to-kana';
  word: ThemeWord;
  options: string[];
  correctAnswer: string;
};

export function Songs({ progress, onProgressUpdate, onExpGain }: SongsProps) {
  const [view, setView] = useState<View>('list');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showRomaji, setShowRomaji] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isFirstQuestion, setIsFirstQuestion] = useState(true);

  const handleSongClick = (song: Song) => {
    setSelectedSong(song);
    setShowRomaji(false);
    setView('detail');
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedSong(null);
    setShowRomaji(false);
  };

  const handleBackToDetail = () => {
    setView('detail');
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore({ correct: 0, total: 0 });
    setIsFirstQuestion(true);
  };

  const speakWord = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startQuiz = () => {
    if (!selectedSong) return;

    const words = selectedSong.themeWords;
    const numQuestions = Math.min(words.length, Math.floor(Math.random() * 4) + 5); // 5-8 questions
    const selectedWords = [...words].sort(() => Math.random() - 0.5).slice(0, numQuestions);

    const questions: QuizQuestion[] = selectedWords.map((word) => {
      const questionType = Math.random() < 0.5 ? 'word-to-meaning' : 'audio-to-kana';

      if (questionType === 'word-to-meaning') {
        // Show word, pick meaning
        const correctAnswer = word.meaning;
        const allWords = songsData.flatMap(s => s.themeWords);
        const wrongOptions = allWords
          .filter(w => w.meaning !== word.meaning)
          .map(w => w.meaning)
          .filter((value, index, self) => self.indexOf(value) === index)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

        return {
          type: 'word-to-meaning',
          word,
          options,
          correctAnswer,
        };
      } else {
        // Play audio, pick kana reading
        const correctAnswer = word.kana;
        const allWords = songsData.flatMap(s => s.themeWords);
        const wrongOptions = allWords
          .filter(w => w.kana !== word.kana)
          .map(w => w.kana)
          .filter((value, index, self) => self.indexOf(value) === index)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

        return {
          type: 'audio-to-kana',
          word,
          options,
          correctAnswer,
        };
      }
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore({ correct: 0, total: 0 });
    setIsFirstQuestion(true);
    setView('quiz');
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;

    const question = quizQuestions[currentQuestionIndex];
    const correct = answer === question.correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));

    // Award EXP: +2 per correct answer
    let updatedProgress = progress;
    const expResult = addExp(updatedProgress, correct ? 2 : 0, isFirstQuestion);
    updatedProgress = expResult.progress;

    if (isFirstQuestion) {
      setIsFirstQuestion(false);
    }

    onProgressUpdate(updatedProgress);

    // Trigger EXP animation
    if (onExpGain && expResult.expGained > 0) {
      onExpGain(expResult.expGained, expResult.leveledUp, expResult.oldLevel, expResult.newLevel);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      // Quiz finished, stay on last question with results
      setView('detail');
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setScore({ correct: 0, total: 0 });
      setIsFirstQuestion(true);
    }
  };

  const getYouTubeSearchUrl = (song: Song) => {
    const query = encodeURIComponent(`${song.artist} ${song.title} official`);
    return `https://www.youtube.com/results?search_query=${query}`;
  };

  const getLyricsSearchUrl = (song: Song) => {
    const query = encodeURIComponent(song.title);
    return `https://www.uta-net.com/search/?Keyword=${query}&Aselect=2&Bselect=3`;
  };

  // List view
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">歌曲列表</h2>
        <div className="grid grid-cols-1 gap-4">
          {songsData.map((song) => (
            <button
              key={song.id}
              onClick={() => handleSongClick(song)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {song.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {song.titleKana}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold mb-2">
                    {song.artist}
                  </p>
                  {song.anime && (
                    <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs px-2 py-1 rounded">
                      {song.anime}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Detail view
  if (view === 'detail' && selectedSong) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
        >
          <ArrowLeft size={20} />
          <span>返回歌曲列表</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {selectedSong.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">{selectedSong.artist}</p>
          {selectedSong.anime && (
            <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
              {selectedSong.anime}
            </p>
          )}
          <p className="text-gray-700 dark:text-gray-300 mb-4">{selectedSong.description}</p>

          {/* Title kana-by-kana */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">標題讀音</h3>
              <button
                onClick={() => setShowRomaji(!showRomaji)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={showRomaji ? '隱藏羅馬字' : '顯示羅馬字'}
              >
                {showRomaji ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSong.titleKana.split('').map((kana, idx) => (
                <button
                  key={idx}
                  onClick={() => speakKana(kana)}
                  className="flex flex-col items-center gap-1 p-2 bg-purple-50 dark:bg-purple-900/30 rounded hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors"
                >
                  <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">{kana}</span>
                  {showRomaji && (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedSong.titleRomaji.split(' ').join('').charAt(idx) || ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme words */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">主題單字</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedSong.themeWords.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => speakWord(word.kana)}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  <Volume2 size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{word.word}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {word.kana} ({word.romaji})
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">{word.meaning}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quiz button */}
          <button
            onClick={startQuiz}
            className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors mb-4"
          >
            單字小測驗
          </button>

          {/* External links */}
          <div className="space-y-2 mb-4">
            <a
              href={getYouTubeSearchUrl(selectedSong)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ExternalLink size={18} />
              <span>在 YouTube 聽</span>
            </a>
            <a
              href={getLyricsSearchUrl(selectedSong)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ExternalLink size={18} />
              <span>看官方歌詞（外部網站）</span>
            </a>
          </div>

          {/* Copyright notice */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            本站不收錄歌詞，歌詞版權屬於原作者，請到官方網站或平台欣賞。
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  if (view === 'quiz' && quizQuestions.length > 0) {
    const question = quizQuestions[currentQuestionIndex];
    const totalQuestions = quizQuestions.length;

    return (
      <div className="space-y-6">
        <button
          onClick={handleBackToDetail}
          className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:underline"
        >
          <ArrowLeft size={20} />
          <span>返回歌曲詳情</span>
        </button>

        <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
          <div className="text-lg font-semibold">
            題目 {selectedAnswer !== null ? currentQuestionIndex + 1 : currentQuestionIndex + 1} / {totalQuestions}
          </div>
          <div className="text-lg font-semibold">
            得分：{score.correct} / {score.total}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="text-center mb-6">
            {question.type === 'word-to-meaning' ? (
              <>
                <div className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {question.word.word}
                </div>
                <div className="text-gray-600 dark:text-gray-400 mb-4">
                  {question.word.kana} ({question.word.romaji})
                </div>
                <div className="text-gray-600 dark:text-gray-400">請選擇正確的中文意思</div>
              </>
            ) : (
              <>
                <button
                  onClick={() => speakWord(question.word.kana)}
                  className="mx-auto mb-4 p-6 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                >
                  <Volume2 size={36} />
                </button>
                <div className="text-gray-600 dark:text-gray-400">請聽音選擇正確的假名讀音</div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === question.correctAnswer;
              let buttonClass = 'p-4 text-lg font-semibold rounded-lg border-2 transition-all ';

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
                  <div className="flex items-center justify-center gap-2">
                    <span>{option}</span>
                    {selectedAnswer !== null && isSelected && (
                      isCorrect ? <Check size={20} /> : <X size={20} />
                    )}
                    {selectedAnswer !== null && !isSelected && isCorrectOption && (
                      <Check size={20} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedAnswer !== null && (
            <>
              <div className={`mt-6 p-4 rounded-lg text-center text-lg font-semibold ${
                isCorrect
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {isCorrect ? '答對了！' : `答錯了。正確答案是：${question.correctAnswer}`}
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full mt-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
              >
                {currentQuestionIndex < quizQuestions.length - 1 ? '下一題' : '完成測驗'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
