import { MASTERY_LEGEND } from '../utils/mastery';

export function MasteryLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 sm:gap-x-4 text-xs sm:text-sm" aria-label="熟練度圖例">
      {MASTERY_LEGEND.map((item) => (
        <div key={item.stage} className="flex items-center gap-1.5">
          <div
            className={`w-4 h-4 rounded border border-black/10 dark:border-white/20 ${item.swatchClass}`}
            aria-hidden="true"
          />
          <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
