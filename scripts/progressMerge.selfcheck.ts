import { calculateLevelFromExp, CURRENT_VERSION, type ProgressData } from '../src/utils/progress';
import {
  hasSyncableProgress,
  mergeProgress,
  parseCloudDocument,
  progressEquals,
  resolveSignInProgress,
  toCloudDocument,
} from '../src/utils/progressMerge';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const srsEarly = {
  char: 'あ',
  interval: 4,
  repetitions: 3,
  easeFactor: 2.5,
  nextReview: 1_700_000_000_000,
  lastReview: 1_690_000_000_000,
};

const srsLate = {
  char: 'あ',
  interval: 1,
  repetitions: 1,
  easeFactor: 2.1,
  nextReview: 1_800_000_000_000,
  lastReview: 1_790_000_000_000,
};

function emptyProgress(): ProgressData {
  return {
    hiragana: {},
    katakana: {},
    dailyHistory: [],
    exp: { totalExp: 0, level: 1 },
    learningPath: { unlockedThrough: 0 },
    version: CURRENT_VERSION,
  };
}

const local: ProgressData = {
  hiragana: {
    あ: {
      char: 'あ',
      correct: 8,
      incorrect: 1,
      lastPracticed: 1_000,
      srs: srsEarly,
    },
  },
  katakana: {
    ア: {
      char: 'ア',
      correct: 2,
      incorrect: 0,
      lastPracticed: 2_000,
    },
  },
  dailyHistory: [
    { date: '2026-11-01', correct: 2, incorrect: 1, practiced: 3, exp: 20 },
    { date: '2026-11-03', correct: 1, incorrect: 0, practiced: 1 },
  ],
  exp: { totalExp: 80, level: 2, dailyBonusClaimed: '2026-11-01' },
  learningPath: { unlockedThrough: 4 },
  version: CURRENT_VERSION,
};

const cloud: ProgressData = {
  hiragana: {
    あ: {
      char: 'あ',
      correct: 2,
      incorrect: 6,
      lastPracticed: 5_000,
      srs: srsLate,
    },
    い: {
      char: 'い',
      correct: 3,
      incorrect: 0,
      lastPracticed: 4_000,
    },
  },
  katakana: {},
  dailyHistory: [
    { date: '2026-11-01', correct: 1, incorrect: 4, practiced: 4, exp: 10 },
    { date: '2026-11-02', correct: 5, incorrect: 0, practiced: 5, exp: 40 },
  ],
  exp: { totalExp: 40, level: 9, dailyBonusClaimed: '2026-11-18' },
  learningPath: { unlockedThrough: 1 },
  version: CURRENT_VERSION,
};

const merged = mergeProgress(local, cloud);
const a = merged.hiragana['あ'];
assert(a.correct === 8 && a.incorrect === 6, 'per-kana counts keep the higher value and are not summed');
assert(a.lastPracticed === 5_000, 'per-kana timestamp keeps the later practice');
assert(a.srs?.repetitions === 3 && a.srs.interval === 4, 'SRS comes from the side with more attempts');
assert(merged.hiragana['い'].correct === 3, 'a kana that exists on only one side is kept');
assert(merged.katakana['ア'].correct === 2, 'the other script is kept');
assert(merged.learningPath?.unlockedThrough === 4, 'an unlocked stage stays unlocked');
assert(merged.exp?.totalExp === 80, 'EXP does not go backwards');
assert((merged.exp?.level ?? 0) >= 9, 'level does not go backwards');
assert(
  (merged.exp?.level ?? 0) >= calculateLevelFromExp(80),
  'level is at least the level implied by the higher EXP',
);
assert(merged.exp?.dailyBonusClaimed === '2026-11-18', 'daily bonus keeps the later date');

const history = merged.dailyHistory ?? [];
assert(history.map((entry) => entry.date).join(',') === '2026-11-01,2026-11-02,2026-11-03', 'daily history is a sorted union');
const nov1 = history.find((entry) => entry.date === '2026-11-01');
assert(nov1?.correct === 2 && nov1.incorrect === 4 && nov1.practiced === 4 && nov1.exp === 20, 'the same day keeps the higher counts');

const tiedLocal: ProgressData = {
  ...emptyProgress(),
  hiragana: {
    あ: { char: 'あ', correct: 2, incorrect: 1, lastPracticed: 100, srs: srsEarly },
  },
};
const tiedCloud: ProgressData = {
  ...emptyProgress(),
  hiragana: {
    あ: { char: 'あ', correct: 1, incorrect: 2, lastPracticed: 900, srs: srsLate },
  },
};
const tied = mergeProgress(tiedLocal, tiedCloud).hiragana['あ'];
assert(tied.srs?.repetitions === 1, 'equal attempt counts use the later timestamp for SRS');

const missingSrs = mergeProgress(
  { ...emptyProgress(), hiragana: { う: { char: 'う', correct: 5, incorrect: 0, lastPracticed: 10 } } },
  { ...emptyProgress(), hiragana: { う: { char: 'う', correct: 1, incorrect: 0, lastPracticed: 20, srs: { ...srsLate, char: 'う' } } } },
).hiragana['う'];
assert(missingSrs.correct === 5 && missingSrs.srs?.char === 'う', 'a missing SRS is filled from the other side');

assert(progressEquals(mergeProgress(local, local), local), 'merging a copy with itself changes nothing');
assert(!hasSyncableProgress(emptyProgress()), 'a fresh profile is not syncable progress');
assert(hasSyncableProgress(local), 'practice, EXP, or an unlocked stage counts as progress');

const onlyLocal = resolveSignInProgress(local, null);
assert(onlyLocal.hiragana['あ'].correct === 8 && onlyLocal.learningPath?.unlockedThrough === 4, 'sign-in with only local data keeps local');

const onlyCloud = resolveSignInProgress(emptyProgress(), cloud);
assert(onlyCloud.hiragana['い'].correct === 3 && onlyCloud.exp?.level === 9, 'sign-in with only cloud data keeps cloud');

const both = resolveSignInProgress(local, cloud);
assert(both.hiragana['あ'].correct === 8 && both.hiragana['あ'].incorrect === 6, 'sign-in with both sides merges');

const emptyCloud = emptyProgress();
assert(
  resolveSignInProgress(local, emptyCloud).katakana['ア'].correct === 2,
  'an empty cloud document does not erase local progress',
);
assert(
  !hasSyncableProgress(resolveSignInProgress(emptyProgress(), null)),
  'signing in with no progress on either side stays empty',
);

const legacy = resolveSignInProgress({
  hiragana: { あ: { char: 'あ', correct: 8, incorrect: 1, lastPracticed: 50 } },
  katakana: {},
  version: 4,
}, null);
assert(legacy.version === CURRENT_VERSION, 'older local progress is upgraded on sign-in');
assert(legacy.hiragana['あ'].correct === 8, 'upgrading keeps the practiced counts');
assert((legacy.learningPath?.unlockedThrough ?? 0) >= 0, 'upgrading still produces a learning path');

const document = toCloudDocument(merged);
assert(!('email' in document) && !('uid' in document), 'the cloud document stores progress only');
const roundTrip = parseCloudDocument(document);
assert(roundTrip !== null && progressEquals(roundTrip, merged), 'a cloud document can be read back');
assert(parseCloudDocument(null) === null, 'missing values are not progress documents');
assert(parseCloudDocument({ email: 'person@example.com' }) === null, 'an email-only document is rejected');

console.log('progress merge selfcheck passed');
