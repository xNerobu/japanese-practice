import type { SRSData } from './spacedRepetition';
import { migrateProgressToSRS, updateSRS as updateSRSFunc } from './spacedRepetition';

export interface CharProgress {
  char: string;
  correct: number;
  incorrect: number;
  lastPracticed: number;
  srs?: SRSData; // Optional for backward compatibility
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD format
  correct: number;
  incorrect: number;
  practiced: number;
}

export interface ProgressData {
  hiragana: Record<string, CharProgress>;
  katakana: Record<string, CharProgress>;
  dailyHistory?: DailyActivity[];
  version?: number; // Track data version for migrations
}

const STORAGE_KEY = 'japanese-learning-progress';
const CURRENT_VERSION = 3;

export function loadProgress(): ProgressData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: ProgressData = JSON.parse(stored);
      
      // Migrate old data if needed
      if (!data.version || data.version < CURRENT_VERSION) {
        return migrateProgressData(data);
      }
      
      // Ensure dailyHistory exists
      if (!data.dailyHistory) {
        data.dailyHistory = [];
      }
      
      return data;
    }
  } catch (error) {
    console.error('載入進度失敗:', error);
  }
  return { hiragana: {}, katakana: {}, dailyHistory: [], version: CURRENT_VERSION };
}

/**
 * Migrate progress data to include SRS fields and daily history
 */
function migrateProgressData(oldData: ProgressData): ProgressData {
  const migratedData: ProgressData = {
    hiragana: {},
    katakana: {},
    dailyHistory: oldData.dailyHistory || [],
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

  let updatedProgress: ProgressData = {
    ...progress,
    [kanaType]: {
      ...progress[kanaType],
      [char]: updated,
    },
  };
  
  // Record daily activity
  updatedProgress = recordDailyActivity(updatedProgress, correct);

  return updatedProgress;
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

/**
 * Record daily activity
 */
export function recordDailyActivity(
  progress: ProgressData,
  correct: boolean
): ProgressData {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyHistory = progress.dailyHistory || [];
  
  // Find or create today's entry
  const todayIndex = dailyHistory.findIndex(d => d.date === today);
  
  if (todayIndex >= 0) {
    // Update existing entry
    const updatedEntry = {
      ...dailyHistory[todayIndex],
      correct: dailyHistory[todayIndex].correct + (correct ? 1 : 0),
      incorrect: dailyHistory[todayIndex].incorrect + (correct ? 0 : 1),
      practiced: dailyHistory[todayIndex].practiced + 1,
    };
    
    const newHistory = [...dailyHistory];
    newHistory[todayIndex] = updatedEntry;
    
    return {
      ...progress,
      dailyHistory: newHistory,
    };
  } else {
    // Create new entry
    const newEntry: DailyActivity = {
      date: today,
      correct: correct ? 1 : 0,
      incorrect: correct ? 0 : 1,
      practiced: 1,
    };
    
    return {
      ...progress,
      dailyHistory: [...dailyHistory, newEntry],
    };
  }
}

/**
 * Get practice streak (consecutive days)
 */
export function getPracticeStreak(dailyHistory: DailyActivity[]): { current: number; longest: number } {
  if (dailyHistory.length === 0) return { current: 0, longest: 0 };
  
  // Sort by date descending
  const sorted = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date));
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Check if practiced today or yesterday
  if (sorted[0].date === today || sorted[0].date === yesterday) {
    currentStreak = 1;
    tempStreak = 1;
    
    // Count consecutive days
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].date);
      const currDate = new Date(sorted[i].date);
      const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (diffDays === 1) {
        currentStreak++;
        tempStreak++;
      } else {
        break;
      }
    }
    
    longestStreak = Math.max(longestStreak, currentStreak);
  }
  
  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  
  return { current: currentStreak, longest: Math.max(longestStreak, 1) };
}
