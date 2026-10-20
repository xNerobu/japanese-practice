import { getAccuracy, type CharProgress } from './progress';

/**
 * Mastery stages used by the progress heatmap and the kana chart.
 *
 * Thresholds match the existing heatmap:
 * - no record, or zero attempts → unpracticed
 * - fewer than 3 attempts → insufficient (not yet scored)
 * - accuracy ≥ 80% and at least 5 attempts → mastered
 * - accuracy ≥ 60% → familiar (also high accuracy with only 3–4 attempts)
 * - accuracy ≥ 40% → developing
 * - otherwise → low
 */
export type MasteryStage =
  | 'unpracticed'
  | 'insufficient'
  | 'low'
  | 'developing'
  | 'familiar'
  | 'mastered';

export interface MasteryLegendItem {
  stage: MasteryStage;
  label: string;
  swatchClass: string;
}

const CELL_CLASS: Record<MasteryStage, string> = {
  unpracticed: 'bg-gray-200 dark:bg-gray-700',
  insufficient: 'bg-gray-300 dark:bg-gray-600',
  low: 'bg-red-500 dark:bg-red-600',
  developing: 'bg-orange-500 dark:bg-orange-600',
  familiar: 'bg-yellow-500 dark:bg-yellow-600',
  mastered: 'bg-green-500 dark:bg-green-600',
};

export const MASTERY_LEGEND: MasteryLegendItem[] = [
  { stage: 'unpracticed', label: '尚未練習', swatchClass: CELL_CLASS.unpracticed },
  { stage: 'insufficient', label: '未熟練', swatchClass: CELL_CLASS.insufficient },
  { stage: 'low', label: '< 40%', swatchClass: CELL_CLASS.low },
  { stage: 'developing', label: '40-60%', swatchClass: CELL_CLASS.developing },
  { stage: 'familiar', label: '60-80%', swatchClass: CELL_CLASS.familiar },
  { stage: 'mastered', label: '≥ 80% 熟練', swatchClass: CELL_CLASS.mastered },
];

export function getAttemptCount(charProgress: CharProgress | undefined): number {
  if (!charProgress) return 0;
  return charProgress.correct + charProgress.incorrect;
}

export function getMasteryStage(charProgress: CharProgress | undefined): MasteryStage {
  const total = getAttemptCount(charProgress);
  if (!charProgress || total <= 0) return 'unpracticed';
  if (total < 3) return 'insufficient';

  const accuracy = getAccuracy(charProgress);
  if (accuracy >= 80 && total >= 5) return 'mastered';
  if (accuracy >= 60) return 'familiar';
  if (accuracy >= 40) return 'developing';
  return 'low';
}

export function getMasteryCellClass(stage: MasteryStage): string {
  return CELL_CLASS[stage];
}

/**
 * Glyph color for chart cells. Saturated heatmap fills stay recognizable,
 * while the kana itself stays readable in light and dark mode.
 */
export function getMasteryTextClass(stage: MasteryStage): string {
  switch (stage) {
    case 'unpracticed':
    case 'insufficient':
      return 'text-gray-900 dark:text-gray-100';
    case 'low':
      // Red-500 is light enough for dark glyphs; red-600 in dark mode needs light glyphs.
      return 'text-gray-900 dark:text-white';
    case 'developing':
    case 'familiar':
    case 'mastered':
      return 'text-gray-900';
  }
}

/** Short non-color cue shown inside a chart cell. */
export function getMasteryCue(charProgress: CharProgress | undefined): string {
  const stage = getMasteryStage(charProgress);
  if (stage === 'unpracticed' || !charProgress) return '—';
  const total = getAttemptCount(charProgress);
  if (stage === 'insufficient') return `${total}次`;
  return `${Math.round(getAccuracy(charProgress))}%`;
}

/** Longer description for tooltips and the selected-character panel. */
export function getMasteryDetail(charProgress: CharProgress | undefined): string {
  const stage = getMasteryStage(charProgress);
  if (stage === 'unpracticed' || !charProgress) return '尚未練習';

  const total = getAttemptCount(charProgress);
  const accuracy = Math.round(getAccuracy(charProgress));

  if (stage === 'insufficient') {
    return `未熟練，正確率 ${accuracy}%（${total} 次，未滿 3 次）`;
  }
  if (stage === 'mastered') {
    return `熟練，正確率 ${accuracy}%（${total} 次）`;
  }
  if (accuracy >= 80 && total < 5) {
    return `正確率 ${accuracy}%（${total} 次，滿 5 次且達 80% 才算熟練）`;
  }
  return `正確率 ${accuracy}%（${total} 次）`;
}
