import { hiraganaData, katakanaData, rowNames, type KanaChar } from '../data/kana';
import { CURRENT_VERSION, type CharProgress, type ProgressData } from './progress';
import { getMasteryStage } from './mastery';

/** Gojūon order. わ行 includes を and ん. */
export const GOJUON_ROWS = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'] as const;

export type PathScript = 'hiragana' | 'katakana';
export type PathStageKind = 'row' | 'dakuten' | 'handakuten' | 'yoon';
export type KanaTypeName = 'basic' | 'dakuten' | 'handakuten' | 'yoon';

/**
 * A stage unlocks when at least 60% of its kana are at the chart's yellow
 * band or better: 3+ attempts and accuracy ≥ 60%. That is below 熟練
 * (80% and 5+ attempts), so a beginner is not stuck on one row, and above
 * a single lucky quiz, which cannot give every required kana 3 attempts.
 */
export const UNLOCK_FAMILIAR_RATIO = 0.6;

export const UNLOCK_RULE_TEXT =
  '解鎖下一階段：本階段至少 60% 的假名要各自練習滿 3 次，且正確率達 60%（字母表上為黃色或綠色）。還不需要達到熟練（正確率 80% 且至少 5 次）。只練對一次不會解鎖。';

export interface PathStageDef {
  id: string;
  script: PathScript;
  kind: PathStageKind;
  row?: (typeof GOJUON_ROWS)[number];
  title: string;
  shortTitle: string;
  groupLabel: string;
}

export interface PathPracticeTarget {
  stageId: string;
  script: PathScript;
  rows: string[];
  types: KanaTypeName[];
  label: string;
}

export interface StageLaunch extends PathPracticeTarget {
  nonce: number;
}

export type StageVisual = 'current' | 'complete' | 'unlocked' | 'locked';

export interface StageSnapshot {
  id: string;
  index: number;
  script: PathScript;
  title: string;
  shortTitle: string;
  groupLabel: string;
  visual: StageVisual;
  passed: boolean;
  familiarCount: number;
  requiredCount: number;
  total: number;
  kana: KanaChar[];
  target: PathPracticeTarget;
}

export interface LearningPathSnapshot {
  stages: StageSnapshot[];
  current: StageSnapshot;
  unlockedThrough: number;
  allComplete: boolean;
}

const SCRIPT_LABEL: Record<PathScript, string> = {
  hiragana: '平假名',
  katakana: '片假名',
};

const LATER_STAGES: { kind: Exclude<PathStageKind, 'row'>; title: string }[] = [
  { kind: 'dakuten', title: '濁音' },
  { kind: 'handakuten', title: '半濁音' },
  { kind: 'yoon', title: '拗音' },
];

function rowTitle(row: (typeof GOJUON_ROWS)[number]): string {
  if (row === 'wa') return 'わ行／ん';
  return rowNames[row];
}

function buildStages(): PathStageDef[] {
  const stages: PathStageDef[] = [];
  for (const script of ['hiragana', 'katakana'] as const) {
    const groupLabel = SCRIPT_LABEL[script];
    for (const row of GOJUON_ROWS) {
      const shortTitle = rowTitle(row);
      stages.push({
        id: `${script}-${row}`,
        script,
        kind: 'row',
        row,
        shortTitle,
        groupLabel,
        title: `${groupLabel}・${shortTitle}`,
      });
    }
    for (const later of LATER_STAGES) {
      stages.push({
        id: `${script}-${later.kind}`,
        script,
        kind: later.kind,
        shortTitle: later.title,
        groupLabel,
        title: `${groupLabel}・${later.title}`,
      });
    }
  }
  return stages;
}

export const PATH_STAGES: readonly PathStageDef[] = buildStages();

const DATA: Record<PathScript, readonly KanaChar[]> = {
  hiragana: hiraganaData,
  katakana: katakanaData,
};

export function familiarKanaRequired(total: number): number {
  if (total <= 0) return 0;
  return Math.ceil((total * 3) / 5);
}

export function isFamiliarProgress(charProgress: CharProgress | undefined): boolean {
  const stage = getMasteryStage(charProgress);
  return stage === 'familiar' || stage === 'mastered';
}

export function kanaForStage(stage: PathStageDef): KanaChar[] {
  const data = DATA[stage.script];
  if (stage.kind === 'row') {
    return data.filter((kana) => kana.type === 'basic' && kana.row === stage.row);
  }
  return data.filter((kana) => kana.type === stage.kind);
}

export function stageIndexForKana(script: PathScript, kana: KanaChar): number {
  if (kana.type === 'basic') {
    return PATH_STAGES.findIndex(
      (stage) => stage.script === script && stage.kind === 'row' && stage.row === kana.row,
    );
  }
  return PATH_STAGES.findIndex(
    (stage) => stage.script === script && stage.kind === kana.type,
  );
}

export function practiceTargetForStage(stage: PathStageDef): PathPracticeTarget {
  if (stage.kind === 'row') {
    return {
      stageId: stage.id,
      script: stage.script,
      rows: [stage.row ?? 'a'],
      types: ['basic'],
      label: stage.title,
    };
  }
  return {
    stageId: stage.id,
    script: stage.script,
    rows: [...GOJUON_ROWS],
    types: [stage.kind],
    label: stage.title,
  };
}

export function clampUnlockedThrough(index: number): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  const last = PATH_STAGES.length - 1;
  return Math.min(last, Math.floor(index));
}

interface StageScore {
  familiarCount: number;
  requiredCount: number;
  total: number;
  passed: boolean;
}

function scoreStage(
  stage: PathStageDef,
  progress: Pick<ProgressData, 'hiragana' | 'katakana'>,
): StageScore {
  const kana = kanaForStage(stage);
  const records = progress[stage.script] ?? {};
  const familiarCount = kana.filter((item) => isFamiliarProgress(records[item.char])).length;
  const requiredCount = familiarKanaRequired(kana.length);
  return {
    familiarCount,
    requiredCount,
    total: kana.length,
    passed: kana.length > 0 && familiarCount >= requiredCount,
  };
}

/**
 * Furthest stage index mastery already earns. The first stage is always
 * unlocked. A passed stage also unlocks the next one, and a later stage the
 * learner has already passed unlocks everything up to it.
 */
export function unlockedThroughFromMastery(
  progress: Pick<ProgressData, 'hiragana' | 'katakana'>,
): number {
  let frontier = 0;
  const last = PATH_STAGES.length - 1;
  PATH_STAGES.forEach((stage, index) => {
    if (!scoreStage(stage, progress).passed) return;
    frontier = Math.max(frontier, Math.min(index + 1, last));
  });
  return frontier;
}

/** Stored unlocks never move backward; mastery can still open a later stage. */
export function resolveUnlockedThrough(progress: ProgressData): number {
  const stored = progress.learningPath?.unlockedThrough ?? 0;
  return Math.max(
    unlockedThroughFromMastery(progress),
    clampUnlockedThrough(stored),
  );
}

export function reconcileLearningPath(progress: ProgressData): ProgressData {
  const unlockedThrough = resolveUnlockedThrough(progress);
  if (
    progress.version === CURRENT_VERSION
    && progress.learningPath?.unlockedThrough === unlockedThrough
  ) {
    return progress;
  }
  return {
    ...progress,
    version: CURRENT_VERSION,
    learningPath: { unlockedThrough },
  };
}

export function unlockedKana(script: PathScript, unlockedThrough: number): KanaChar[] {
  const limit = clampUnlockedThrough(unlockedThrough);
  return DATA[script].filter((kana) => {
    const index = stageIndexForKana(script, kana);
    return index >= 0 && index <= limit;
  });
}

export function describeLearningPath(progress: ProgressData): LearningPathSnapshot {
  const unlockedThrough = resolveUnlockedThrough(progress);
  const scored = PATH_STAGES.map((stage, index) => ({
    stage,
    index,
    score: scoreStage(stage, progress),
  }));

  let currentIndex = scored.findIndex((item) => item.index <= unlockedThrough && !item.score.passed);
  if (currentIndex === -1) currentIndex = unlockedThrough;

  const allComplete = scored.every((item) => item.score.passed);

  const stages: StageSnapshot[] = scored.map((item) => {
    let visual: StageVisual;
    if (item.index > unlockedThrough) visual = 'locked';
    else if (item.index === currentIndex) visual = 'current';
    else if (item.score.passed) visual = 'complete';
    else visual = 'unlocked';

    return {
      id: item.stage.id,
      index: item.index,
      script: item.stage.script,
      title: item.stage.title,
      shortTitle: item.stage.shortTitle,
      groupLabel: item.stage.groupLabel,
      visual,
      passed: item.score.passed,
      familiarCount: item.score.familiarCount,
      requiredCount: item.score.requiredCount,
      total: item.score.total,
      kana: kanaForStage(item.stage),
      target: practiceTargetForStage(item.stage),
    };
  });

  return {
    stages,
    current: stages[currentIndex],
    unlockedThrough,
    allComplete,
  };
}

export function unlockProgressLabel(stage: StageSnapshot, allComplete: boolean): string {
  if (allComplete && stage.visual === 'current') {
    return '所有階段都已達標。可以繼續複習這個階段，或到測驗頁依程度練習全部已解鎖的假名。';
  }
  if (stage.passed) {
    return `已達標（${stage.familiarCount}/${stage.total} 個假名）。`;
  }
  const remaining = Math.max(0, stage.requiredCount - stage.familiarCount);
  return `達標 ${stage.familiarCount}/${stage.requiredCount}，還差 ${remaining} 個。本階段共 ${stage.total} 個假名。`;
}
