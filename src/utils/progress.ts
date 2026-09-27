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
  exp?: number; // EXP earned this day
}

export interface ExpData {
  totalExp: number;
  level: number;
  dailyBonusClaimed?: string; // Date of last daily bonus (YYYY-MM-DD)
}

export interface ProgressData {
  hiragana: Record<string, CharProgress>;
  katakana: Record<string, CharProgress>;
  dailyHistory?: DailyActivity[];
  exp?: ExpData;
  version?: number; // Track data version for migrations
}

const STORAGE_KEY = 'japanese-learning-progress';
const CURRENT_VERSION = 4;

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
      
      // Ensure exp exists
      if (!data.exp) {
        data.exp = { totalExp: 0, level: 1 };
      }
      
      return data;
    }
  } catch (error) {
    console.error('載入進度失敗:', error);
  }
  return { 
    hiragana: {}, 
    katakana: {}, 
    dailyHistory: [], 
    exp: { totalExp: 0, level: 1 },
    version: CURRENT_VERSION 
  };
}

/**
 * Migrate progress data to include SRS fields, daily history, and EXP
 */
function migrateProgressData(oldData: ProgressData): ProgressData {
  const migratedData: ProgressData = {
    hiragana: {},
    katakana: {},
    dailyHistory: oldData.dailyHistory || [],
    exp: oldData.exp || { totalExp: 0, level: 1 },
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

  // Calculate retroactive EXP if missing
  if (!oldData.exp) {
    const allProgress = [
      ...Object.values(oldData.hiragana),
      ...Object.values(oldData.katakana),
    ];
    
    let retroactiveExp = 0;
    allProgress.forEach(p => {
      // Estimate EXP from existing practice
      retroactiveExp += p.correct * 10; // Quiz correct answers
      retroactiveExp += p.incorrect * 2; // Quiz wrong answers
    });
    
    // Add bonus for having practiced at all
    if (retroactiveExp > 0) {
      retroactiveExp += 100; // Initial bonus
    }
    
    const level = calculateLevelFromExp(retroactiveExp);
    migratedData.exp = { totalExp: retroactiveExp, level };
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

/**
 * EXP and Leveling System
 */

// Level titles in Traditional Chinese (kana-themed, beginner to master)
export const LEVEL_TITLES: Record<number, string> = {
  1: '假名新手',
  2: '假名見習生',
  3: '五十音學徒',
  5: '假名練習者',
  7: '平假名愛好者',
  10: '片假名探索者',
  13: '假名熟練者',
  16: '五十音達人',
  20: '假名專家',
  25: '假名宗師',
  30: '假名大師',
  35: '五十音傳說',
  40: '假名至尊',
};

/**
 * Calculate EXP required for a given level (exponential curve)
 */
export function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Early levels fast, later ones slower
  // Level 2: ~50, Level 5: ~300, Level 10: ~1500, Level 20: ~8000, Level 30: ~20000
  return Math.floor(50 * Math.pow(level - 1, 1.5));
}

/**
 * Calculate level from total EXP
 */
export function calculateLevelFromExp(totalExp: number): number {
  let level = 1;
  while (getExpForLevel(level + 1) <= totalExp) {
    level++;
  }
  return level;
}

/**
 * Get level title for a given level
 */
export function getLevelTitle(level: number): string {
  // Find the highest milestone at or below current level
  const milestones = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const milestone of milestones) {
    if (level >= milestone) {
      return LEVEL_TITLES[milestone];
    }
  }
  return LEVEL_TITLES[1];
}

/**
 * Get EXP progress for current level (0-1)
 */
export function getExpProgress(totalExp: number, level: number): { 
  current: number; 
  needed: number; 
  progress: number;
} {
  const currentLevelExp = getExpForLevel(level);
  const nextLevelExp = getExpForLevel(level + 1);
  const expInLevel = totalExp - currentLevelExp;
  const expNeeded = nextLevelExp - currentLevelExp;
  
  return {
    current: expInLevel,
    needed: expNeeded,
    progress: expNeeded > 0 ? expInLevel / expNeeded : 1,
  };
}

/**
 * Add EXP and return updated progress with level-up info
 */
export function addExp(
  progress: ProgressData,
  amount: number,
  checkDailyBonus: boolean = false
): { 
  progress: ProgressData; 
  expGained: number; 
  leveledUp: boolean; 
  newLevel?: number;
  oldLevel?: number;
} {
  const exp = progress.exp || { totalExp: 0, level: 1 };
  const oldLevel = exp.level;
  let expGained = amount;
  
  // Check daily bonus
  const today = new Date().toISOString().split('T')[0];
  if (checkDailyBonus && exp.dailyBonusClaimed !== today) {
    expGained += 20; // Daily first-practice bonus
    exp.dailyBonusClaimed = today;
  }
  
  const newTotalExp = exp.totalExp + expGained;
  const newLevel = calculateLevelFromExp(newTotalExp);
  const leveledUp = newLevel > oldLevel;
  
  // Update daily history with EXP
  const dailyHistory = progress.dailyHistory || [];
  const todayIndex = dailyHistory.findIndex(d => d.date === today);
  if (todayIndex >= 0) {
    dailyHistory[todayIndex].exp = (dailyHistory[todayIndex].exp || 0) + expGained;
  } else {
    dailyHistory.push({
      date: today,
      correct: 0,
      incorrect: 0,
      practiced: 0,
      exp: expGained,
    });
  }
  
  return {
    progress: {
      ...progress,
      exp: { totalExp: newTotalExp, level: newLevel, dailyBonusClaimed: exp.dailyBonusClaimed },
      dailyHistory,
    },
    expGained,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    oldLevel: leveledUp ? oldLevel : undefined,
  };
}
