import { hiraganaData } from '../src/data/kana';
import type { CharProgress } from '../src/utils/progress';
import { initializeSRS } from '../src/utils/spacedRepetition';
import {
  BEGINNER_ROWS,
  buildAnswerOptions,
  selectAdaptivePool,
} from '../src/utils/adaptiveQuiz';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = 1_700_000_000_000;
const rng = () => 0;

function progressFor(
  char: string,
  correct: number,
  incorrect: number,
  extra: Partial<CharProgress> = {},
): CharProgress {
  return {
    char,
    correct,
    incorrect,
    lastPracticed: extra.lastPracticed ?? now - 1000,
    ...extra,
  };
}

function charsOf(result: { chars: { char: string }[] }): string[] {
  return result.chars.map((kana) => kana.char);
}

const cold = selectAdaptivePool(hiraganaData, {}, { now, rng });
assert(cold.beginnerFallback, 'empty progress uses the beginner fallback');
assert(cold.chars.length === 15, `beginner pool should be 15 kana, got ${cold.chars.length}`);
assert(
  cold.chars.every((kana) => kana.type === 'basic' && (BEGINNER_ROWS as readonly string[]).includes(kana.row)),
  'beginner pool stays on あ/か/さ basic kana',
);
assert(new Set(charsOf(cold)).size === cold.chars.length, 'beginner pool has duplicate kana');

const coldWithWeak = selectAdaptivePool(hiraganaData, {
  きゃ: progressFor('きゃ', 0, 5),
}, { now, rng });
assert(coldWithWeak.beginnerFallback, 'two or fewer practiced kana stay on the beginner path');
assert(charsOf(coldWithWeak).includes('きゃ'), 'cold start still keeps an already-weak kana');
assert(charsOf(coldWithWeak).includes('あ'), 'cold start still includes あ');

const mastered = hiraganaData.filter((kana) => kana.type === 'basic').slice(0, 13);
const weakList = hiraganaData.filter((kana) => kana.row === 'ta' && kana.type === 'basic');
const established: Record<string, CharProgress> = {};
mastered.forEach((kana, index) => {
  established[kana.char] = progressFor(kana.char, 8, 0, {
    lastPracticed: now - (index + 1) * 100_000,
    srs: {
      ...initializeSRS(kana.char),
      nextReview: now + 10 * 86_400_000,
      repetitions: 3,
      interval: 10,
    },
  });
});
weakList.forEach((kana) => {
  established[kana.char] = progressFor(kana.char, 1, 4, {
    srs: {
      ...initializeSRS(kana.char),
      nextReview: now - 86_400_000,
      repetitions: 0,
      interval: 1,
    },
  });
});

const focused = selectAdaptivePool(hiraganaData, established, { now, rng, poolSize: 12 });
assert(!focused.beginnerFallback, 'established progress should not use the beginner fallback');
assert(focused.chars.length === 12, `focused pool should be 12, got ${focused.chars.length}`);
for (const kana of weakList) {
  assert(charsOf(focused).includes(kana.char), `missing weak kana ${kana.char}`);
}
assert(focused.chars.every((kana) => kana.type !== 'yoon'), 'established pool should not pull in unpracticed yoon');

const thinProgress: Record<string, CharProgress> = {};
for (const char of ['あ', 'い', 'う', 'え', 'お']) {
  thinProgress[char] = progressFor(char, 1, 0);
}
const thin = selectAdaptivePool(hiraganaData, thinProgress, { now, rng });
assert(!thin.beginnerFallback, 'a few practiced kana are past the cold start');
for (const char of ['あ', 'い', 'う', 'え', 'お']) {
  assert(charsOf(thin).includes(char), `thin pool dropped practiced ${char}`);
}
const introduced = thin.chars.filter((kana) => !'あいうえお'.includes(kana.char));
assert(introduced.length >= 2, 'thin progress should introduce unpracticed kana');
assert(
  introduced.every((kana) => kana.type === 'basic' && kana.row === 'ka'),
  `new kana should be the next basic row, got ${introduced.map((kana) => kana.char).join('')}`,
);

const dueProgress: Record<string, CharProgress> = {};
const practicedBasics = hiraganaData.filter((kana) => kana.type === 'basic').slice(0, 15);
practicedBasics.forEach((kana, index) => {
  const dueCard = index < 5;
  dueProgress[kana.char] = progressFor(kana.char, 6, 0, {
    lastPracticed: now - (index + 1) * 100_000,
    srs: {
      ...initializeSRS(kana.char),
      nextReview: dueCard ? now - 1000 : now + 10 * 86_400_000,
      repetitions: 3,
      interval: dueCard ? 1 : 10,
    },
  });
});
const duePool = selectAdaptivePool(hiraganaData, dueProgress, { now, rng, poolSize: 12 });
const dueChars = practicedBasics.slice(0, 5).map((kana) => kana.char);
for (const char of dueChars) {
  assert(charsOf(duePool).includes(char), `due kana ${char} was left out`);
}
assert(
  duePool.chars.every((kana) => practicedBasics.some((item) => item.char === kana.char)),
  'due-focused pool should stay inside practiced kana when there are enough of them',
);

const manualPool = hiraganaData.filter((kana) => kana.row === 'a' && kana.type === 'basic');
const question = manualPool[0];
const options = buildAnswerOptions(question, manualPool, manualPool, 'kana-to-romaji', rng);
assert(options.includes(question.romaji), 'options include the correct romaji');
assert(new Set(options).size === options.length, 'options contain duplicates');
assert(options.length === 4, `expected 4 options, got ${options.length}`);
assert(
  options.every((option) => manualPool.some((kana) => kana.romaji === option)),
  'manual options escaped the selected rows',
);

const shared = buildAnswerOptions(
  hiraganaData.find((kana) => kana.char === 'じ')!,
  hiraganaData,
  hiraganaData,
  'kana-to-romaji',
  rng,
);
assert(shared.filter((option) => option === 'ji').length === 1, 'shared romaji should appear once');

const empty = selectAdaptivePool([], {}, { now, rng });
assert(empty.chars.length === 0 && empty.beginnerFallback, 'empty chart does not throw');

console.log('adaptive quiz checks passed');
