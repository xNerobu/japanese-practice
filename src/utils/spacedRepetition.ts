// SM-2 Spaced Repetition Algorithm
// Based on SuperMemo SM-2 algorithm

export interface SRSData {
  char: string;
  interval: number; // days until next review
  repetitions: number; // number of consecutive correct answers
  easeFactor: number; // ease factor (minimum 1.3)
  nextReview: number; // timestamp of next review
  lastReview: number; // timestamp of last review
}

export interface ReviewStats {
  total: number;
  due: number;
  new: number;
}

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const NEW_CARD_INITIAL_INTERVAL = 1; // 1 day for first review
const GRADUATING_INTERVAL = 4; // 4 days after second correct answer

/**
 * Initialize SRS data for a new character
 */
export function initializeSRS(char: string): SRSData {
  return {
    char,
    interval: 0,
    repetitions: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    nextReview: Date.now(), // Due immediately for new cards
    lastReview: 0,
  };
}

/**
 * Update SRS data based on user performance
 * @param srs Current SRS data
 * @param quality Quality of recall (0-5):
 *   0: Complete blackout
 *   1: Incorrect, but upon seeing the answer it felt familiar
 *   2: Incorrect, but upon seeing the answer it seemed easy to remember
 *   3: Correct, but required significant difficulty to recall
 *   4: Correct, with some hesitation
 *   5: Perfect recall
 */
export function updateSRS(srs: SRSData, quality: number): SRSData {
  const now = Date.now();
  let { interval, repetitions, easeFactor } = srs;

  if (quality < 3) {
    // Incorrect answer - reset repetitions
    repetitions = 0;
    interval = 1;
  } else {
    // Correct answer
    repetitions += 1;

    if (repetitions === 1) {
      interval = NEW_CARD_INITIAL_INTERVAL;
    } else if (repetitions === 2) {
      interval = GRADUATING_INTERVAL;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // Update ease factor based on quality
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor);
  }

  return {
    ...srs,
    interval,
    repetitions,
    easeFactor,
    lastReview: now,
    nextReview: now + interval * 24 * 60 * 60 * 1000, // Convert days to milliseconds
  };
}

/**
 * Check if a card is due for review
 */
export function isDue(srs: SRSData): boolean {
  return Date.now() >= srs.nextReview;
}

/**
 * Get all due cards for a given kana type
 * Now accepts CharProgress records which may have optional SRS data
 */
export function getDueCards(
  progressData: Record<string, { srs?: SRSData }>,
  allChars: string[]
): string[] {
  const dueChars: string[] = [];

  for (const char of allChars) {
    const progress = progressData[char];
    const srs = progress?.srs;
    
    if (!srs) {
      // New card - not yet in SRS system
      dueChars.push(char);
    } else if (isDue(srs)) {
      dueChars.push(char);
    }
  }

  return dueChars;
}

/**
 * Get review statistics
 * Now accepts CharProgress records which may have optional SRS data
 */
export function getReviewStats(
  progressData: Record<string, { srs?: SRSData }>,
  allChars: string[]
): ReviewStats {
  let due = 0;
  let newCount = 0;

  for (const char of allChars) {
    const progress = progressData[char];
    const srs = progress?.srs;
    
    if (!srs) {
      newCount++;
      due++; // New cards count as due
    } else if (isDue(srs)) {
      due++;
    }
  }

  return {
    total: allChars.length,
    due,
    new: newCount,
  };
}

/**
 * Migrate old progress data to SRS format
 */
export function migrateProgressToSRS(
  oldProgress: { correct: number; incorrect: number; lastPracticed: number },
  char: string
): SRSData {
  const total = oldProgress.correct + oldProgress.incorrect;
  const accuracy = total > 0 ? oldProgress.correct / total : 0;

  // Initialize with some reasonable defaults based on old progress
  let repetitions = 0;
  let interval = 0;
  let easeFactor = INITIAL_EASE_FACTOR;

  if (accuracy >= 0.8 && total >= 3) {
    // Good performance - give them a moderate interval
    repetitions = 2;
    interval = GRADUATING_INTERVAL;
  } else if (accuracy >= 0.5 && total >= 2) {
    // Fair performance - short interval
    repetitions = 1;
    interval = NEW_CARD_INITIAL_INTERVAL;
  } else {
    // Poor or no performance - due immediately
    repetitions = 0;
    interval = 1;
  }

  // Adjust ease factor based on historical accuracy
  if (accuracy < 0.5) {
    easeFactor = MIN_EASE_FACTOR;
  } else if (accuracy < 0.7) {
    easeFactor = 2.0;
  }

  const now = Date.now();
  const timeSinceLastPractice = oldProgress.lastPracticed
    ? now - oldProgress.lastPracticed
    : 0;

  // If they haven't practiced recently, make it due now
  const nextReview =
    timeSinceLastPractice > 7 * 24 * 60 * 60 * 1000
      ? now
      : now + interval * 24 * 60 * 60 * 1000;

  return {
    char,
    interval,
    repetitions,
    easeFactor,
    nextReview,
    lastReview: oldProgress.lastPracticed || 0,
  };
}
