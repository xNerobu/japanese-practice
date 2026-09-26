import type { SRSData } from './spacedRepetition';
import { migrateProgressToSRS, updateSRS as updateSRSFunc } from './spacedRepetition';

export interface CharProgress {
  char: string;
  correct: number;
  incorrect: number;
  lastPracticed: number;
  srs?: SRSData; // Optional for backward compatibility
}

export interface ProgressData {
  hiragana: Record<string, CharProgress>;
  katakana: Record<string, CharProgress>;
  version?: number; // Track data version for migrations
}

const STORAGE_KEY = 'japanese-learning-progress';
const CURRENT_VERSION = 2;

export function loadProgress(): ProgressData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: ProgressData = JSON.parse(stored);
      
      // Migrate old data if needed
      if (!data.version || data.version < CURRENT_VERSION) {
        return migrateProgressData(data);
      }
      
      return data;
    }
  } catch (error) {
    console.error('載入進度失敗:', error);
  }
  return { hiragana: {}, katakana: {}, version: CURRENT_VERSION };
}

/**
 * Migrate progress data to include SRS fields
 */
function migrateProgressData(oldData: ProgressData): ProgressData {
  const migratedData: ProgressData = {
    hiragana: {},
    katakana: {},
    version: CURRENT_VERSION,
  };

  // Migrate hiragana
  for (const char in oldData.hiragana) {
    const oldProgress = oldData.hiragana[char];
    if (!oldProgress.srs) {
      migratedData.hiragana[char] = {
        ...oldProgress,
        srs: migrateProgressToSRS(oldProgress, char),
      };
    } else {
      migratedData.hiragana[char] = oldProgress;
    }
  }

  // Migrate katakana
  for (const char in oldData.katakana) {
    const oldProgress = oldData.katakana[char];
    if (!oldProgress.srs) {
      migratedData.katakana[char] = {
        ...oldProgress,
        srs: migrateProgressToSRS(oldProgress, char),
      };
    } else {
      migratedData.katakana[char] = oldProgress;
    }
  }

  console.log('進度資料已遷移至版本', CURRENT_VERSION);
  return migratedData;
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
  correct: boolean,
  updateSRS: boolean = false
): ProgressData {
  const current = progress[kanaType][char] || {
    char,
    correct: 0,
    incorrect: 0,
    lastPracticed: 0,
  };

  const updated: CharProgress = {
    ...current,
    correct: correct ? current.correct + 1 : current.correct,
    incorrect: correct ? current.incorrect : current.incorrect + 1,
    lastPracticed: Date.now(),
  };

  // Don't update SRS in regular quiz mode unless explicitly requested
  if (updateSRS && current.srs) {
    // Quality mapping: correct = 4 (good), incorrect = 1 (again)
    const quality = correct ? 4 : 1;
    updated.srs = updateSRSFunc(current.srs, quality);
  }

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
