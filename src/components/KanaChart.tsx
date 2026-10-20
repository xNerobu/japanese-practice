import { useState } from 'react';
import type { KanaChar } from '../data/kana';
import type { CharProgress } from '../utils/progress';
import { speakKana, isSpeechSupported } from '../utils/speech';
import {
  getMasteryCellClass,
  getMasteryCue,
  getMasteryDetail,
  getMasteryStage,
  getMasteryTextClass,
} from '../utils/mastery';
import { StrokeOrderAnimation } from './StrokeOrderAnimation';
import { MasteryLegend } from './MasteryLegend';
import { hasStrokeData } from '../data/strokeOrder';
import { Volume2 } from 'lucide-react';

interface KanaChartProps {
  data: KanaChar[];
  title: string;
  charProgress: Record<string, CharProgress>;
}

export function KanaChart({ data, title, charProgress }: KanaChartProps) {
  const [selectedChar, setSelectedChar] = useState<KanaChar | null>(null);
  const [filter, setFilter] = useState<'all' | 'basic' | 'dakuten' | 'handakuten' | 'yoon'>('all');
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);

  const filteredData = filter === 'all' ? data : data.filter(k => k.type === filter);

  const basicChars = filteredData.filter(k => k.type === 'basic');
  const dakutenChars = filteredData.filter(k => k.type === 'dakuten');
  const handakutenChars = filteredData.filter(k => k.type === 'handakuten');
  const yoonChars = filteredData.filter(k => k.type === 'yoon');

  const handleCharClick = (kana: KanaChar) => {
    setSelectedChar(kana);
    if (isSpeechSupported()) {
      speakKana(kana.char);
    }
  };

  const renderKanaGrid = (chars: KanaChar[], title: string) => {
    if (chars.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {chars.map((kana) => {
            const record = charProgress[kana.char];
            const stage = getMasteryStage(record);
            const detail = getMasteryDetail(record);
            const selected = selectedChar?.char === kana.char;

            return (
              <button
                key={kana.char}
                type="button"
                onClick={() => handleCharClick(kana)}
                title={`${kana.char}（${kana.romaji}）：${detail}`}
                aria-label={`${kana.char}，${kana.romaji}，${detail}`}
                aria-pressed={selected}
                className={`
                  aspect-square flex flex-col items-center justify-center gap-0.5
                  rounded-lg border-2 transition-all
                  hover:scale-105 active:scale-95
                  ${getMasteryCellClass(stage)}
                  ${getMasteryTextClass(stage)}
                  ${selected
                    ? 'border-purple-700 dark:border-purple-200 ring-2 ring-purple-500/80 shadow-md'
                    : 'border-black/10 dark:border-white/15'
                  }
                `}
              >
                <span className="text-xl sm:text-2xl font-bold leading-none">{kana.char}</span>
                <span className="text-[10px] sm:text-xs font-semibold leading-none tabular-nums opacity-90">
                  {getMasteryCue(record)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('basic')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'basic'
              ? 'bg-purple-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          清音
        </button>
        <button
          onClick={() => setFilter('dakuten')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'dakuten'
              ? 'bg-purple-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          濁音
        </button>
        <button
          onClick={() => setFilter('handakuten')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'handakuten'
              ? 'bg-purple-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          半濁音
        </button>
        <button
          onClick={() => setFilter('yoon')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'yoon'
              ? 'bg-purple-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
          }`}
        >
          拗音
        </button>
      </div>

      <div className="rounded-lg bg-white/80 dark:bg-gray-800/80 px-3 py-3 shadow-sm">
        <MasteryLegend />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          顏色與進度頁相同。熟練為正確率 ≥ 80% 且至少練習 5 次；未滿 3 次顯示為未熟練。
        </p>
      </div>

      {filter === 'all' ? (
        <>
          {renderKanaGrid(basicChars, '清音')}
          {renderKanaGrid(dakutenChars, '濁音')}
          {renderKanaGrid(handakutenChars, '半濁音')}
          {renderKanaGrid(yoonChars, '拗音')}
        </>
      ) : (
        renderKanaGrid(filteredData, title)
      )}

      {selectedChar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-purple-500 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold">{selectedChar.char}</span>
              <div>
                <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                  {selectedChar.romaji}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {getMasteryDetail(charProgress[selectedChar.char])}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  點擊字符以聆聽發音
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasStrokeData(selectedChar.char) && (
                <button
                  onClick={() => setShowStrokeOrder(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  📝 筆順
                </button>
              )}
              {isSpeechSupported() && (
                <button
                  onClick={() => speakKana(selectedChar.char)}
                  className="p-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                >
                  <Volume2 size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stroke Order Modal */}
      {selectedChar && <div className="h-48 sm:h-32" aria-hidden="true" />}

      {showStrokeOrder && selectedChar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowStrokeOrder(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-300"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
              {selectedChar.char} 的筆順
            </h3>
            <StrokeOrderAnimation
              char={selectedChar.char}
              size={280}
              showNumbers={true}
              autoPlay={false}
              className="mx-auto"
            />
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              {selectedChar.romaji}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
