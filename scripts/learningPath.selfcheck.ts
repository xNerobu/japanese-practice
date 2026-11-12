import { hiraganaData, katakanaData } from '../src/data/kana';
import { selectAdaptivePool } from '../src/utils/adaptiveQuiz';
import {
  PATH_STAGES,
  describeLearningPath,
  familiarKanaRequired,
  kanaForStage,
  unlockedKana,
  type PathStageDef,
} from '../src/utils/learningPath';
import type { CharProgress, ProgressData } from '../src/utils/progress';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(char: string, correct: number, incorrect = 0): CharProgress {
  return { char, correct, incorrect, lastPracticed: 1_700_000_000_000 };
}

function emptyProgress(extra: Partial<ProgressData> = {}): ProgressData {
  return {
    hiragana: {},
    katakana: {},
    version: 5,
    ...extra,
  };
}

function fillStage(stage: PathStageDef, correct = 8): Record<string, CharProgress> {
  const map: Record<string, CharProgress> = {};
  for (const kana of kanaForStage(stage)) {
    map[kana.char] = record(kana.char, correct);
  }
  return map;
}

assert(PATH_STAGES.length === 26, `expected 26 stages, got ${PATH_STAGES.length}`);
assert(PATH_STAGES[0]?.id === 'hiragana-a', 'path starts at hiragana あ行');
assert(PATH_STAGES[9]?.id === 'hiragana-wa', 'わ行／ん is the last basic row');
assert(PATH_STAGES[10]?.id === 'hiragana-dakuten', '濁音 follows the basic rows');
assert(PATH_STAGES[11]?.id === 'hiragana-handakuten', '半濁音 follows 濁音');
assert(PATH_STAGES[12]?.id === 'hiragana-yoon', '拗音 follows 半濁音');
assert(PATH_STAGES[13]?.id === 'katakana-a', 'katakana starts after hiragana');
assert(PATH_STAGES[25]?.id === 'katakana-yoon', 'path ends at katakana 拗音');
assert(kanaForStage(PATH_STAGES[0]).length === 5, 'あ行 has 5 kana');
assert(kanaForStage(PATH_STAGES[7]).length === 3, 'や行 has 3 kana');
assert(kanaForStage(PATH_STAGES[9]).map((kana) => kana.char).join('') === 'わをん', 'わ行 includes ん');
assert(kanaForStage(PATH_STAGES[10]).length === 20, 'hiragana 濁音 has 20 kana');
assert(kanaForStage(PATH_STAGES[11]).length === 5, 'hiragana 半濁音 has 5 kana');
assert(kanaForStage(PATH_STAGES[12]).length === 33, 'hiragana 拗音 has 33 kana');
assert(familiarKanaRequired(5) === 3, 'あ行 needs 3 familiar kana');
assert(familiarKanaRequired(3) === 2, 'や行 needs 2 familiar kana');
assert(familiarKanaRequired(20) === 12, '濁音 needs 12 familiar kana');

const fresh = describeLearningPath(emptyProgress());
assert(fresh.unlockedThrough === 0, 'a new learner only has the first stage unlocked');
assert(fresh.current.id === 'hiragana-a', 'the current stage is あ行');
assert(fresh.stages[1]?.visual === 'locked', 'か行 starts locked');
assert(!fresh.allComplete, 'a new path is not complete');
assert(
  unlockedKana('hiragana', fresh.unlockedThrough).every((kana) => kana.row === 'a' && kana.type === 'basic'),
  'unlocked hiragana is only あ行清音',
);
assert(unlockedKana('katakana', fresh.unlockedThrough).length === 0, 'katakana stays locked for a new learner');

const lucky = emptyProgress({
  hiragana: { あ: record('あ', 10) },
});
const luckyPath = describeLearningPath(lucky);
assert(luckyPath.unlockedThrough === 0, 'one heavily practiced kana does not unlock the next row');
assert(luckyPath.current.familiarCount === 1, 'the lucky kana still counts toward the stage');

const almost = emptyProgress({
  hiragana: {
    あ: record('あ', 3),
    い: record('い', 3),
  },
});
assert(describeLearningPath(almost).unlockedThrough === 0, 'two of five familiar kana stay on あ行');

const passedA = emptyProgress({
  hiragana: {
    あ: record('あ', 3),
    い: record('い', 2, 1),
    う: record('う', 4),
  },
});
const openedKa = describeLearningPath(passedA);
assert(openedKa.unlockedThrough === 1, 'three familiar kana unlock か行');
assert(openedKa.current.id === 'hiragana-ka', 'か行 becomes the current stage');
assert(openedKa.stages[0]?.visual === 'complete', 'あ行 is marked complete');

const earlyRows = emptyProgress({
  hiragana: {
    ...fillStage(PATH_STAGES[0]),
    ...fillStage(PATH_STAGES[1]),
    ...fillStage(PATH_STAGES[2]),
  },
});
const throughSa = describeLearningPath(earlyRows);
assert(throughSa.unlockedThrough === 3, 'strong あ・か・さ records unlock た行');
assert(throughSa.stages[3]?.visual === 'current', 'た行 is the current stage');
assert(throughSa.stages[4]?.visual === 'locked', 'な行 stays locked');

const skippedAhead = emptyProgress({
  hiragana: fillStage(PATH_STAGES[3]),
});
const keptTa = describeLearningPath(skippedAhead);
assert(keptTa.unlockedThrough === 4, 'a well-practiced later row is not relocked');
assert(keptTa.stages[3]?.visual === 'complete', 'た行 stays available');
assert(keptTa.current.id === 'hiragana-a', 'the first unfinished stage is still the recommendation');

const remembered = describeLearningPath(emptyProgress({
  learningPath: { unlockedThrough: 4 },
}));
assert(remembered.unlockedThrough === 4, 'stored unlocks do not move backward');
const dropped = describeLearningPath({
  ...earlyRows,
  learningPath: { unlockedThrough: 0 },
});
assert(dropped.unlockedThrough === 3, 'mastery still opens stages a stored path had locked');

const katakanaVeteran = emptyProgress({
  katakana: fillStage(PATH_STAGES[13]),
});
const kataPath = describeLearningPath(katakanaVeteran);
assert(kataPath.unlockedThrough === 14, 'strong katakana あ行 unlocks the next katakana row');
assert(
  kataPath.stages.find((stage) => stage.id === 'katakana-a')?.visual === 'complete',
  'katakana あ行 is not locked for a veteran',
);

const cold = selectAdaptivePool(
  unlockedKana('hiragana', fresh.unlockedThrough),
  {},
  { rng: () => 0 },
);
assert(cold.chars.length === 5, `new adaptive pool should be あ行 only, got ${cold.chars.length}`);
assert(
  cold.chars.every((kana) => kana.row === 'a' && kana.type === 'basic'),
  'adaptive practice must not include locked kana',
);

const focused = selectAdaptivePool(
  unlockedKana('hiragana', throughSa.unlockedThrough),
  earlyRows.hiragana,
  { rng: () => 0, poolSize: 12 },
);
assert(
  focused.chars.every((kana) => ['a', 'ka', 'sa', 'ta'].includes(kana.row) && kana.type === 'basic'),
  `adaptive pool left the unlocked rows: ${focused.chars.map((kana) => kana.char).join('')}`,
);
assert(
  !focused.chars.some((kana) => kana.row === 'na'),
  'adaptive pool included locked な行',
);

assert(hiraganaData.length === katakanaData.length, 'both scripts stay in parallel');

console.log('learning path checks passed');
