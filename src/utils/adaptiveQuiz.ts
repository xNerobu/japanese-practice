import type { KanaChar } from '../data/kana';
import { getAccuracy, isWeakChar } from './progress';
import type { CharProgress } from './progress';

/** 清音 rows used when the learner has almost no stored progress. */
export const BEGINNER_ROWS = ['a', 'ka', 'sa'] as const;

const ROW_ORDER = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'];
const TYPE_ORDER = ['basic', 'dakuten', 'handakuten', 'yoon'] as const;

/** Fewer practiced kana than this → the session is the beginner rows. */
export const COLD_START_PRACTICED = 3;
/** Below this, the session also introduces kana that have never been practiced. */
export const THIN_PROGRESS_PRACTICED = 12;
/** How many kana a normal adaptive session draws from. */
export const ADAPTIVE_POOL_SIZE = 12;

export type QuizDirection = 'kana-to-romaji' | 'romaji-to-kana';

export interface AdaptivePoolResult {
  chars: KanaChar[];
  /** True when practice history is too thin for a personal pool. */
  beginnerFallback: boolean;
}

export interface SelectAdaptiveOptions {
  now?: number;
  rng?: () => number;
  poolSize?: number;
}

function attempts(progress: CharProgress | undefined): number {
  if (!progress) return 0;
  return progress.correct + progress.incorrect;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const current = arr[i];
    arr[i] = arr[j];
    arr[j] = current;
  }
  return arr;
}

function uniqueByChar(chars: readonly KanaChar[]): KanaChar[] {
  const seen = new Set<string>();
  const result: KanaChar[] = [];
  for (const kana of chars) {
    if (seen.has(kana.char)) continue;
    seen.add(kana.char);
    result.push(kana);
  }
  return result;
}

function curriculumRank(kana: KanaChar): number {
  const typeIndex = TYPE_ORDER.indexOf(kana.type);
  const rowIndex = ROW_ORDER.indexOf(kana.row);
  return (typeIndex === -1 ? TYPE_ORDER.length : typeIndex) * 100
    + (rowIndex === -1 ? ROW_ORDER.length : rowIndex);
}

export function beginnerKana(data: readonly KanaChar[]): KanaChar[] {
  const basics = data.filter(
    (kana) => kana.type === 'basic' && (BEGINNER_ROWS as readonly string[]).includes(kana.row),
  );
  if (basics.length > 0) return basics;
  const anyBasic = data.filter((kana) => kana.type === 'basic');
  if (anyBasic.length > 0) return anyBasic.slice(0, ADAPTIVE_POOL_SIZE);
  return data.slice(0, ADAPTIVE_POOL_SIZE);
}

function takeNextNew(chars: readonly KanaChar[], count: number, rng: () => number): KanaChar[] {
  if (count <= 0 || chars.length === 0) return [];
  const sorted = [...chars].sort((a, b) => {
    const rank = curriculumRank(a) - curriculumRank(b);
    if (rank !== 0) return rank;
    return a.char.localeCompare(b.char);
  });
  return shuffle(sorted.slice(0, count), rng);
}

function isReviewDue(progress: CharProgress | undefined, now: number): boolean {
  if (!progress || attempts(progress) === 0 || !progress.srs) return false;
  return progress.srs.nextReview <= now;
}

/**
 * Build a quiz pool from stored progress.
 * Priority: weak accuracy, then SRS-due, then under-practiced.
 * Thin histories also receive the next unpracticed kana in chart order.
 * Almost no history falls back to あ / か / さ basic kana.
 */
export function selectAdaptivePool(
  data: readonly KanaChar[],
  kanaProgress: Record<string, CharProgress>,
  options: SelectAdaptiveOptions = {},
): AdaptivePoolResult {
  const now = options.now ?? Date.now();
  const rng = options.rng ?? Math.random;
  const poolSize = options.poolSize ?? ADAPTIVE_POOL_SIZE;
  const starter = beginnerKana(data);

  if (data.length === 0) {
    return { chars: [], beginnerFallback: true };
  }

  const progressOf = (kana: KanaChar) => kanaProgress[kana.char];
  const practiced = data.filter((kana) => attempts(progressOf(kana)) > 0);

  const weak = data
    .filter((kana) => isWeakChar(progressOf(kana)))
    .sort((a, b) => {
      const accuracyGap = getAccuracy(progressOf(a)) - getAccuracy(progressOf(b));
      if (accuracyGap !== 0) return accuracyGap;
      return attempts(progressOf(a)) - attempts(progressOf(b));
    });

  const due = data
    .filter((kana) => {
      const progress = progressOf(kana);
      return isReviewDue(progress, now) && !isWeakChar(progress);
    })
    .sort((a, b) => (progressOf(a)?.srs?.nextReview ?? 0) - (progressOf(b)?.srs?.nextReview ?? 0));

  const under = data
    .filter((kana) => {
      const progress = progressOf(kana);
      const count = attempts(progress);
      if (count <= 0 || count >= 5) return false;
      if (isWeakChar(progress) || isReviewDue(progress, now)) return false;
      return true;
    })
    .sort((a, b) => {
      const countGap = attempts(progressOf(a)) - attempts(progressOf(b));
      if (countGap !== 0) return countGap;
      return getAccuracy(progressOf(a)) - getAccuracy(progressOf(b));
    });

  const fresh = data.filter((kana) => attempts(progressOf(kana)) === 0);

  if (practiced.length < COLD_START_PRACTICED) {
    return {
      chars: uniqueByChar([...weak, ...due, ...starter]),
      beginnerFallback: true,
    };
  }

  const chosen = new Set<string>();
  const selected: KanaChar[] = [];
  const push = (list: readonly KanaChar[], limit: number) => {
    let added = 0;
    for (const kana of list) {
      if (added >= limit || selected.length >= poolSize) break;
      if (chosen.has(kana.char)) continue;
      chosen.add(kana.char);
      selected.push(kana);
      added += 1;
    }
  };

  const thin = practiced.length < THIN_PROGRESS_PRACTICED;
  if (thin) {
    const newCount = Math.min(4, fresh.length, Math.max(fresh.length > 0 ? 2 : 0, poolSize - weak.length));
    const prioritySlots = Math.max(0, poolSize - newCount);
    push(weak, prioritySlots);
    push(due, prioritySlots - selected.length);
    push(under, prioritySlots - selected.length);
    push(takeNextNew(fresh.filter((kana) => !chosen.has(kana.char)), newCount, rng), newCount);
  } else {
    push(weak, poolSize);
    push(due, poolSize - selected.length);
    push(under, poolSize - selected.length);
  }

  if (selected.length < poolSize) {
    const review = practiced
      .filter((kana) => !chosen.has(kana.char))
      .sort((a, b) => {
        const practicedGap = (progressOf(a)?.lastPracticed ?? 0) - (progressOf(b)?.lastPracticed ?? 0);
        if (practicedGap !== 0) return practicedGap;
        return getAccuracy(progressOf(a)) - getAccuracy(progressOf(b));
      });
    push(review, poolSize - selected.length);
  }

  if (selected.length < Math.min(8, poolSize)) {
    const remaining = poolSize - selected.length;
    push(
      takeNextNew(fresh.filter((kana) => !chosen.has(kana.char)), remaining, rng),
      remaining,
    );
  }

  if (selected.length === 0) {
    return {
      chars: starter.length > 0 ? starter : [...data].slice(0, poolSize),
      beginnerFallback: true,
    };
  }

  return { chars: selected, beginnerFallback: false };
}

export function answerText(kana: KanaChar, direction: QuizDirection): string {
  return direction === 'kana-to-romaji' ? kana.romaji : kana.char;
}

/**
 * Four-choice answers. Distractors prefer the session pool, then the same
 * row and type inside `universe`. Pass the manual selection as `universe`
 * to keep custom quizzes inside the rows and types the learner picked.
 */
export function buildAnswerOptions(
  question: KanaChar,
  pool: readonly KanaChar[],
  universe: readonly KanaChar[],
  direction: QuizDirection,
  rng: () => number = Math.random,
): string[] {
  const correct = answerText(question, direction);
  const seen = new Set<string>([correct]);
  const wrong: string[] = [];
  const tiers = [
    shuffle(pool.filter((kana) => kana.char !== question.char), rng),
    shuffle(
      universe.filter((kana) => kana.char !== question.char && kana.type === question.type && kana.row === question.row),
      rng,
    ),
    shuffle(
      universe.filter((kana) => kana.char !== question.char && kana.type === question.type),
      rng,
    ),
    shuffle(universe.filter((kana) => kana.char !== question.char), rng),
  ];

  for (const tier of tiers) {
    for (const kana of tier) {
      const value = answerText(kana, direction);
      if (seen.has(value)) continue;
      seen.add(value);
      wrong.push(value);
      if (wrong.length === 3) return shuffle([correct, ...wrong], rng);
    }
  }

  return shuffle([correct, ...wrong], rng);
}
