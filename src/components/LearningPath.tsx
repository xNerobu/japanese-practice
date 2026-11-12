import type { ProgressData } from '../utils/progress';
import {
  UNLOCK_RULE_TEXT,
  describeLearningPath,
  unlockProgressLabel,
  type PathPracticeTarget,
  type StageSnapshot,
  type StageVisual,
} from '../utils/learningPath';
import { getMasteryCellClass, getMasteryCue, getMasteryDetail, getMasteryStage, getMasteryTextClass } from '../utils/mastery';
import { Brain, Check, Headphones, Lock, PenTool } from 'lucide-react';

interface LearningPathProps {
  progress: ProgressData;
  onPractice: (target: PathPracticeTarget, mode: 'quiz' | 'listening' | 'handwriting') => void;
}

const VISUAL_LABEL: Record<StageVisual, string> = {
  current: '目前',
  complete: '已完成',
  unlocked: '已解鎖',
  locked: '未解鎖',
};

export function LearningPath({ progress, onPractice }: LearningPathProps) {
  const path = describeLearningPath(progress);
  const active = path.current;
  const bar = active.passed
    ? 100
    : active.requiredCount === 0
      ? 0
      : Math.min(100, Math.round((active.familiarCount / active.requiredCount) * 100));

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-lg border-2 border-purple-400 dark:border-purple-500">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">學習路徑</h2>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
            平假名 → 片假名
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          從平假名あ行開始，依五十音順序解開下一行。清音全部完成後，才會進到濁音、半濁音、拗音，接著才是片假名。
        </p>

        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/40 px-3 py-3 mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{UNLOCK_RULE_TEXT}</p>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{active.title}</h3>
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300 whitespace-nowrap">
              {path.allComplete ? '路徑完成' : '目前階段'}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
            {unlockProgressLabel(active, path.allComplete)}
          </p>
          <div
            className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={bar}
            aria-label="距離解鎖下一階段"
          >
            <div className="h-full bg-purple-500" style={{ width: `${bar}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4" aria-label={`${active.title}的假名`}>
          {active.kana.map((kana) => {
            const record = progress[active.script][kana.char];
            const stage = getMasteryStage(record);
            return (
              <div
                key={kana.char}
                title={`${kana.char} ${kana.romaji} ${getMasteryDetail(record)}`}
                className={`w-11 h-12 rounded-md flex flex-col items-center justify-center ${getMasteryCellClass(stage)}`}
              >
                <span className={`text-lg leading-none font-semibold ${getMasteryTextClass(stage)}`}>{kana.char}</span>
                <span className={`text-[10px] leading-none mt-1 ${getMasteryTextClass(stage)}`}>{getMasteryCue(record)}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onPractice(active.target, 'quiz')}
            className="min-h-12 py-3 px-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Brain size={18} />
            開始測驗
          </button>
          <button
            type="button"
            onClick={() => onPractice(active.target, 'listening')}
            className="min-h-12 py-3 px-3 border-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-semibold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors flex items-center justify-center gap-2"
          >
            <Headphones size={18} />
            聽音選字
          </button>
          <button
            type="button"
            onClick={() => onPractice(active.target, 'handwriting')}
            className="min-h-12 py-3 px-3 border-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-semibold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors flex items-center justify-center gap-2"
          >
            <PenTool size={18} />
            手寫練習
          </button>
        </div>
      </section>

      <ol className="space-y-2">
        {path.stages.map((stage, index) => {
          const showGroup = index === 0 || stage.groupLabel !== path.stages[index - 1]?.groupLabel;
          return (
            <li key={stage.id} className="list-none">
              {showGroup && (
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-3 mb-2 px-1">
                  {stage.groupLabel}
                </h3>
              )}
              <StageRow
                stage={stage}
                onPractice={() => onPractice(stage.target, 'quiz')}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageRow({ stage, onPractice }: { stage: StageSnapshot; onPractice: () => void }) {
  const locked = stage.visual === 'locked';
  const rowClass = stage.visual === 'current'
    ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/40'
    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 flex items-center gap-2 ${rowClass} ${locked ? 'opacity-60' : ''}`}
      aria-current={stage.visual === 'current' ? 'step' : undefined}
    >
      <StatusBadge visual={stage.visual} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{stage.shortTitle}</div>
        {!locked && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            達標 {stage.familiarCount}/{stage.requiredCount}
          </div>
        )}
      </div>
      {locked ? (
        <Lock size={16} className="text-gray-400 shrink-0" aria-hidden="true" />
      ) : stage.visual === 'current' ? null : (
        <button
          type="button"
          onClick={onPractice}
          className="shrink-0 min-h-10 px-3 text-sm font-semibold rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800"
        >
          {stage.visual === 'complete' ? '再練習' : '練習'}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ visual }: { visual: StageVisual }) {
  const className = visual === 'current'
    ? 'bg-purple-500 text-white'
    : visual === 'complete'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : visual === 'unlocked'
        ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';

  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-1 ${className}`}>
      {visual === 'complete' && <Check size={12} aria-hidden="true" />}
      {VISUAL_LABEL[visual]}
    </span>
  );
}
