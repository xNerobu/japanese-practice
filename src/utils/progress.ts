export interface CharProgress {
  char: string;
  correct: number;
  incorrect: number;
  lastPracticed: number;
}

export interface ProgressData {
  hiragana: Record<string, CharProgress>;
  katakana: Record<string, CharProgress>;
}

const STORAGE_KEY = 'japanese-learning-progress';

export function loadProgress(): ProgressData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('載入進度失敗:', error);
  }
  return { hiragana: {}, katakana: {} };
}

export function saveProgress(progress: ProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('儲存進度失敗:', error);
  }
}

export function updateCharProgress(
  progress: ProgressData,
  kanaType: 'hiragana' | 'katakana',
  char: string,
  correct: boolean
): ProgressData {
  const current = progress[kanaType][char] || {
    char,
    correct: 0,
    incorrect: 0,
    lastPracticed: 0,
  };

  const updated = {
    ...current,
    correct: correct ? current.correct + 1 : current.correct,
    incorrect: correct ? current.incorrect : current.incorrect + 1,
    lastPracticed: Date.now(),
  };

  return {
    ...progress,
    [kanaType]: {
      ...progress[kanaType],
      [char]: updated,
    },
  };
}

export function getAccuracy(charProgress: CharProgress | undefined): number {
  if (!charProgress) return 0;
  const total = charProgress.correct + charProgress.incorrect;
  if (total === 0) return 0;
  return (charProgress.correct / total) * 100;
}

export function isWeakChar(charProgress: CharProgress | undefined, threshold: number = 70): boolean {
  if (!charProgress) return false;
  const total = charProgress.correct + charProgress.incorrect;
  if (total < 3) return false;
  return getAccuracy(charProgress) < threshold;
}

export function getWeakChars(
  progress: ProgressData,
  kanaType: 'hiragana' | 'katakana',
  chars: string[]
): string[] {
  return chars.filter(char => isWeakChar(progress[kanaType][char]));
}
