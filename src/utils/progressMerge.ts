import { reconcileLearningPath } from './learningPath';
import {
  calculateLevelFromExp,
  upgradeProgress,
  type CharProgress,
  type DailyActivity,
  type ProgressData,
} from './progress';
import { parseProgressText } from './progressTransfer';
import type { SRSData } from './spacedRepetition';

/**
 * Merge rules for local and cloud progress. Neither side's finished work is
 * discarded when both copies exist:
 * - Per kana, correct and incorrect keep the higher count, and lastPracticed
 *   keeps the later timestamp. Counts are not added together, so the same
 *   answers are not stored twice. SRS is taken from the side with more
 *   practice attempts (correct + incorrect). If the counts tie, the later
 *   lastPracticed wins. A missing SRS is filled from the other side.
 * - Daily history is the union by date. The same day keeps the higher
 *   correct, incorrect, practiced, and exp.
 * - Learning-path unlockedThrough keeps the further stage, so a stage that
 *   is already unlocked stays unlocked. Mastery can still open a later stage
 *   when the merged records are reconciled.
 * - totalExp keeps the higher total, so experience never goes backwards.
 *   Level is at least the higher stored level and the level implied by that
 *   total.
 * - dailyBonusClaimed keeps the later date.
 *
 * Sign-in uses resolveSignInProgress: if only one side has progress, that
 * copy is used and should be written to both localStorage and Firestore.
 * An explicit import or "clear all" while signed in overwrites the cloud
 * document with the new local snapshot so this device does not immediately
 * merge the previous cloud copy back. A later sign-in on another device that
 * still has richer local progress merges again, so that work is not deleted.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function hasSyncableProgress(progress: ProgressData): boolean {
  const data = upgradeProgress(progress);
  if (Object.keys(data.hiragana).length > 0) return true;
  if (Object.keys(data.katakana).length > 0) return true;
  if ((data.dailyHistory?.length ?? 0) > 0) return true;
  if ((data.exp?.totalExp ?? 0) > 0) return true;
  if ((data.learningPath?.unlockedThrough ?? 0) > 0) return true;
  if (data.exp?.dailyBonusClaimed) return true;
  return false;
}

export function mergeProgress(left: ProgressData, right: ProgressData): ProgressData {
  const a = upgradeProgress(left);
  const b = upgradeProgress(right);
  const totalExp = Math.max(count(a.exp?.totalExp), count(b.exp?.totalExp));
  const level = Math.max(
    normalizedLevel(a.exp?.level),
    normalizedLevel(b.exp?.level),
    calculateLevelFromExp(totalExp),
  );
  const dailyBonusClaimed = laterDate(a.exp?.dailyBonusClaimed, b.exp?.dailyBonusClaimed);

  return reconcileLearningPath({
    hiragana: mergeCharMap(a.hiragana, b.hiragana),
    katakana: mergeCharMap(a.katakana, b.katakana),
    dailyHistory: mergeDailyHistory(a.dailyHistory, b.dailyHistory),
    exp: {
      totalExp,
      level,
      ...(dailyBonusClaimed ? { dailyBonusClaimed } : {}),
    },
    learningPath: {
      unlockedThrough: Math.max(
        count(a.learningPath?.unlockedThrough),
        count(b.learningPath?.unlockedThrough),
      ),
    },
    version: a.version,
  });
}

/**
 * Choose the progress to keep when a user signs in.
 * `cloud === null` means the account has no progress document yet.
 */
export function resolveSignInProgress(local: ProgressData, cloud: ProgressData | null): ProgressData {
  const localReady = reconcileLearningPath(upgradeProgress(local));
  if (cloud === null) return localReady;

  const cloudReady = reconcileLearningPath(upgradeProgress(cloud));
  const localHas = hasSyncableProgress(localReady);
  const cloudHas = hasSyncableProgress(cloudReady);
  if (localHas && cloudHas) return mergeProgress(localReady, cloudReady);
  if (cloudHas) return cloudReady;
  return localReady;
}

export function progressEquals(left: ProgressData, right: ProgressData): boolean {
  return stableString(reconcileLearningPath(upgradeProgress(left)))
    === stableString(reconcileLearningPath(upgradeProgress(right)));
}

/** Plain JSON object safe to store as the Firestore progress document. */
export function toCloudDocument(progress: ProgressData): Record<string, unknown> {
  const ready = reconcileLearningPath(upgradeProgress(progress));
  return JSON.parse(stableString(ready)) as Record<string, unknown>;
}

/** Return null when the document is not a progress record this app can read. */
export function parseCloudDocument(data: unknown): ProgressData | null {
  if (!isPlainObject(data)) return null;
  let text: string;
  try {
    text = JSON.stringify(data);
  } catch {
    return null;
  }
  const parsed = parseProgressText(text);
  return parsed.ok ? parsed.data : null;
}

function mergeCharMap(
  left: Record<string, CharProgress>,
  right: Record<string, CharProgress>,
): Record<string, CharProgress> {
  const merged: Record<string, CharProgress> = {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const record = mergeChar(key, left[key], right[key]);
    if (record) merged[key] = record;
  }
  return merged;
}

function mergeChar(key: string, left?: CharProgress, right?: CharProgress): CharProgress | null {
  if (!left && !right) return null;
  if (!left) return cloneChar(key, right as CharProgress);
  if (!right) return cloneChar(key, left);

  const leftAttempts = attempts(left);
  const rightAttempts = attempts(right);
  const preferred = leftAttempts > rightAttempts
    ? left
    : rightAttempts > leftAttempts
      ? right
      : timestamp(left.lastPracticed) >= timestamp(right.lastPracticed)
        ? left
        : right;
  const other = preferred === left ? right : left;
  const srs = readableSrs(preferred.srs, key) ?? readableSrs(other.srs, key);

  return {
    char: key,
    correct: Math.max(count(left.correct), count(right.correct)),
    incorrect: Math.max(count(left.incorrect), count(right.incorrect)),
    lastPracticed: Math.max(timestamp(left.lastPracticed), timestamp(right.lastPracticed)),
    ...(srs ? { srs } : {}),
  };
}

function mergeDailyHistory(
  left: DailyActivity[] | undefined,
  right: DailyActivity[] | undefined,
): DailyActivity[] {
  const byDate = new Map<string, DailyActivity>();
  for (const entry of [...(left ?? []), ...(right ?? [])]) {
    if (!entry || typeof entry.date !== 'string') continue;
    const previous = byDate.get(entry.date);
    if (!previous) {
      byDate.set(entry.date, cloneDaily(entry));
      continue;
    }
    const exp = mergeOptionalCount(previous.exp, entry.exp);
    const next: DailyActivity = {
      date: entry.date,
      correct: Math.max(count(previous.correct), count(entry.correct)),
      incorrect: Math.max(count(previous.incorrect), count(entry.incorrect)),
      practiced: Math.max(count(previous.practiced), count(entry.practiced)),
    };
    if (exp !== undefined) next.exp = exp;
    byDate.set(entry.date, next);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function cloneChar(key: string, record: CharProgress): CharProgress {
  const srs = readableSrs(record.srs, key);
  return {
    char: key,
    correct: count(record.correct),
    incorrect: count(record.incorrect),
    lastPracticed: timestamp(record.lastPracticed),
    ...(srs ? { srs } : {}),
  };
}

function readableSrs(srs: SRSData | undefined, char: string): SRSData | undefined {
  if (!srs) return undefined;
  if (!isWhole(srs.interval) || !isWhole(srs.repetitions)) return undefined;
  if (typeof srs.easeFactor !== 'number' || !Number.isFinite(srs.easeFactor)) return undefined;
  if (srs.easeFactor < 1 || srs.easeFactor > 100) return undefined;
  if (!isTimestamp(srs.nextReview) || !isTimestamp(srs.lastReview)) return undefined;
  return {
    char,
    interval: srs.interval,
    repetitions: srs.repetitions,
    easeFactor: srs.easeFactor,
    nextReview: srs.nextReview,
    lastReview: srs.lastReview,
  };
}

function cloneDaily(entry: DailyActivity): DailyActivity {
  return {
    date: entry.date,
    correct: count(entry.correct),
    incorrect: count(entry.incorrect),
    practiced: count(entry.practiced),
    ...(entry.exp !== undefined ? { exp: count(entry.exp) } : {}),
  };
}

function attempts(record: CharProgress): number {
  return count(record.correct) + count(record.incorrect);
}

function mergeOptionalCount(left: number | undefined, right: number | undefined): number | undefined {
  if (left === undefined && right === undefined) return undefined;
  return Math.max(count(left), count(right));
}

function laterDate(left: string | undefined, right: string | undefined): string | undefined {
  const dates = [left, right].filter((value): value is string => (
    typeof value === 'string' && DATE_PATTERN.test(value)
  ));
  if (dates.length === 0) return undefined;
  return dates.sort((a, b) => a.localeCompare(b)).at(-1);
}

function normalizedLevel(level: number | undefined): number {
  const value = count(level);
  return value >= 1 ? value : 1;
}

function count(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER);
}

function timestamp(value: number | undefined): number {
  if (!isTimestamp(value)) return 0;
  return value;
}

function isTimestamp(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function isWhole(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

function stableString(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const nested = value[key];
    if (nested !== undefined) sorted[key] = sortValue(nested);
  }
  return sorted;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
