import { CURRENT_VERSION, type ProgressData } from '../src/utils/progress';
import {
  newerVersionMessage,
  parseProgressText,
  progressExportFilename,
  progressTransferMessages,
  serializeProgress,
} from '../src/utils/progressTransfer';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function failureMessage(text: string): string {
  const result = parseProgressText(text);
  if (result.ok) throw new Error(`expected this file to be rejected: ${JSON.stringify(text)}`);
  return result.message;
}

const srs = {
  char: 'あ',
  interval: 4,
  repetitions: 2,
  easeFactor: 2.5,
  nextReview: 1_700_000_000_000,
  lastReview: 1_699_000_000_000,
};

const sample: ProgressData = {
  hiragana: {
    あ: {
      char: 'あ',
      correct: 8,
      incorrect: 1,
      lastPracticed: 1_699_000_000_000,
      srs,
    },
    きゃ: {
      char: 'きゃ',
      correct: 1,
      incorrect: 4,
      lastPracticed: 1_699_100_000_000,
    },
  },
  katakana: {
    ア: {
      char: 'ア',
      correct: 5,
      incorrect: 0,
      lastPracticed: 1_699_200_000_000,
      srs: {
        char: 'ア',
        interval: 1,
        repetitions: 1,
        easeFactor: 2.5,
        nextReview: 1_700_100_000_000,
        lastReview: 1_699_200_000_000,
      },
    },
  },
  dailyHistory: [
    { date: '2026-10-26', correct: 4, incorrect: 1, practiced: 5, exp: 42 },
  ],
  exp: { totalExp: 180, level: 3, dailyBonusClaimed: '2026-10-26' },
  version: CURRENT_VERSION,
};

const roundTrip = parseProgressText(serializeProgress(sample));
assert(roundTrip.ok, 'valid export should parse');
if (roundTrip.ok) {
  assert(roundTrip.data.hiragana['あ'].correct === 8, 'hiragana count should come from the file');
  assert(roundTrip.data.katakana['ア'].correct === 5, 'katakana count should come from the file');
  assert(roundTrip.data.hiragana['きゃ'].srs === undefined, 'missing srs stays missing on v4');
  assert(roundTrip.data.exp?.totalExp === 180, 'exp should be kept');
  assert(roundTrip.data.dailyHistory?.length === 1, 'daily history should be kept');
  assert(roundTrip.summary.hiraganaCount === 2, 'summary counts hiragana records');
  assert(JSON.stringify(parseProgressText(serializeProgress(roundTrip.data))) === JSON.stringify(roundTrip), 'second pass stays stable');
}

const localCorrect = 20;
const imported = parseProgressText(JSON.stringify({
  hiragana: { あ: { char: 'あ', correct: 2, incorrect: 0, lastPracticed: 10 } },
  katakana: {},
  version: 4,
}));
assert(imported.ok && imported.data.hiragana['あ'].correct === 2, 'import uses the file count');
assert(imported.ok && imported.data.hiragana['あ'].correct !== localCorrect + 2, 'import must not add local counts');

assert(failureMessage('') === progressTransferMessages.empty, 'empty string fails');
assert(failureMessage('   \n') === progressTransferMessages.empty, 'whitespace is an empty file');
assert(failureMessage('{') === progressTransferMessages.invalidJson, 'broken json');
assert(failureMessage('null') === progressTransferMessages.wrongShape, 'null is the wrong shape');
assert(failureMessage('[]') === progressTransferMessages.wrongShape, 'array is the wrong shape');
assert(failureMessage('{"foo":1}') === progressTransferMessages.wrongShape, 'missing kana maps');
assert(
  failureMessage('{"hiragana":{},"katakana":null,"version":4}') === progressTransferMessages.wrongShape,
  'katakana must be an object',
);
assert(
  failureMessage('{"hiragana":{"あ":{"char":"あ","correct":"1","incorrect":0,"lastPracticed":1}},"katakana":{},"version":4}')
    === progressTransferMessages.badCharacters,
  'string counts are rejected',
);
assert(
  failureMessage('{"hiragana":{"あ":{"char":"い","correct":1,"incorrect":0,"lastPracticed":1}},"katakana":{},"version":4}')
    === progressTransferMessages.badCharacters,
  'char key mismatch is rejected',
);
assert(
  failureMessage('{"version":6,"hiragana":{},"katakana":{}}') === newerVersionMessage(6),
  'newer version is rejected',
);
assert(
  failureMessage('{"version":0,"hiragana":{},"katakana":{}}') === progressTransferMessages.badVersion,
  'version 0 is rejected',
);
assert(
  failureMessage('{"version":"4","hiragana":{},"katakana":{}}') === progressTransferMessages.badVersion,
  'string version is rejected',
);

const legacy = parseProgressText(JSON.stringify({
  hiragana: {
    あ: { char: 'あ', correct: 3, incorrect: 0, lastPracticed: 1_699_000_000_000 },
  },
  katakana: {},
}));
assert(legacy.ok, 'legacy file without version should migrate');
if (legacy.ok) {
  assert(legacy.data.version === CURRENT_VERSION, 'legacy file is upgraded');
  assert(legacy.data.hiragana['あ'].srs !== undefined, 'legacy char receives srs');
  assert(legacy.data.hiragana['あ'].correct === 3, 'legacy counts are preserved');
  assert(legacy.data.exp?.totalExp !== undefined, 'legacy file gets exp');
  assert(Array.isArray(legacy.data.dailyHistory), 'legacy file gets daily history');
}

const bom = parseProgressText(`\uFEFF${JSON.stringify({ hiragana: {}, katakana: {}, version: 4 })}`);
assert(bom.ok, 'BOM-prefixed json is accepted');

assert(
  failureMessage('{"hiragana":{},"katakana":{},"version":4,"dailyHistory":[{"date":"10/27/2026","correct":1,"incorrect":0,"practiced":1}]}')
    === progressTransferMessages.badHistory,
  'bad dates are rejected',
);
assert(
  failureMessage('{"hiragana":{},"katakana":{},"version":4,"exp":{"totalExp":-1,"level":1}}')
    === progressTransferMessages.badExp,
  'negative exp is rejected',
);

const emptyProgress = parseProgressText('{"hiragana":{},"katakana":{},"dailyHistory":[],"exp":{"totalExp":0,"level":1},"version":4}');
assert(emptyProgress.ok, 'empty progress file is valid');

assert(progressExportFilename(new Date(2026, 9, 27)) === 'japanese-kana-progress-2026-10-27.json', 'filename uses the local date');

const extra = parseProgressText(JSON.stringify({
  hiragana: {},
  katakana: {},
  version: 4,
  note: 'ignore me',
}));
assert(extra.ok && !('note' in extra.data), 'unknown root fields are dropped');
assert(extra.ok && extra.data.learningPath?.unlockedThrough === 0, 'v4 file without a path starts at あ行');

const masteredA = {
  char: 'あ',
  correct: 8,
  incorrect: 0,
  lastPracticed: 10,
};
const veteran = parseProgressText(JSON.stringify({
  hiragana: {
    あ: masteredA,
    い: { ...masteredA, char: 'い' },
    う: { ...masteredA, char: 'う' },
    え: { ...masteredA, char: 'え' },
    お: { ...masteredA, char: 'お' },
  },
  katakana: {},
  version: 4,
}));
assert(veteran.ok && veteran.data.learningPath?.unlockedThrough === 1, 'strong あ行 records unlock か行 on import');

const ahead = parseProgressText(JSON.stringify({
  hiragana: {},
  katakana: {},
  version: 5,
  learningPath: { unlockedThrough: 4 },
}));
assert(ahead.ok && ahead.data.learningPath?.unlockedThrough === 4, 'stored unlocks are kept when mastery is behind');
if (ahead.ok) {
  const again = parseProgressText(serializeProgress(ahead.data));
  assert(again.ok && again.data.learningPath?.unlockedThrough === 4, 'export keeps a path that is ahead of mastery');
}

assert(
  failureMessage('{"hiragana":{},"katakana":{},"version":5,"learningPath":{"unlockedThrough":-1}}')
    === progressTransferMessages.badPath,
  'negative path index is rejected',
);
assert(
  failureMessage('{"hiragana":{},"katakana":{},"version":5,"learningPath":[]}')
    === progressTransferMessages.badPath,
  'path must be an object',
);

const raised = parseProgressText(JSON.stringify({
  hiragana: {
    あ: masteredA,
    い: { ...masteredA, char: 'い' },
    う: { ...masteredA, char: 'う' },
    え: { ...masteredA, char: 'え' },
    お: { ...masteredA, char: 'お' },
  },
  katakana: {},
  version: 5,
  learningPath: { unlockedThrough: 0 },
}));
assert(raised.ok && raised.data.learningPath?.unlockedThrough === 1, 'mastery can open a stage the file still marks locked');

console.log('progress transfer checks passed');
