import { useEffect, useState } from 'react';
import type { ExpData } from '../utils/progress';
import { getLevelTitle, getExpProgress, getExpForLevel } from '../utils/progress';
import { Trophy, Sparkles, X } from 'lucide-react';

interface LevelBadgeProps {
  exp: ExpData;
  compact?: boolean;
}

export function LevelBadge({ exp, compact = false }: LevelBadgeProps) {
  const title = getLevelTitle(exp.level);
  const { current, needed, progress } = getExpProgress(exp.totalExp, exp.level);

  if (compact) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-2.5 py-1 rounded-full shadow-md">
          <Trophy size={14} className="flex-shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">Lv {exp.level}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 hidden sm:block">
            {current} / {needed} EXP
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-lg text-white">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={20} />
        <div>
          <div className="text-lg font-bold">等級 {exp.level}</div>
          <div className="text-xs opacity-90">{title}</div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-yellow-300 to-orange-400 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs opacity-90">
          <span>{current} EXP</span>
          <span>{needed} EXP 升級</span>
        </div>
      </div>
      
      <div className="mt-2 text-xs opacity-75">
        總經驗值：{exp.totalExp.toLocaleString()} EXP
      </div>
    </div>
  );
}

interface ExpAnimationProps {
  amount: number;
  onComplete: () => void;
}

export function ExpAnimation({ amount, onComplete }: ExpAnimationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 100);
    }, prefersReducedMotion ? 800 : 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-up">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-1.5">
        <Sparkles size={16} />
        <span>+{amount} EXP</span>
      </div>
    </div>
  );
}

interface LevelUpModalProps {
  oldLevel: number;
  newLevel: number;
  onClose: () => void;
}

export function LevelUpModal({ oldLevel, newLevel, onClose }: LevelUpModalProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const newTitle = getLevelTitle(newLevel);
  const nextLevelExp = getExpForLevel(newLevel + 1) - getExpForLevel(newLevel);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setShowConfetti(false);
    } else {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-2xl relative animate-scale-in">
        {showConfetti && <ConfettiEffect />}
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            等級提升！
          </h2>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-3xl font-bold text-gray-400">Lv {oldLevel}</div>
            <div className="text-2xl text-purple-600 dark:text-purple-400">→</div>
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
              Lv {newLevel}
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 mb-4">
            <div className="text-sm text-purple-800 dark:text-purple-300 mb-1">新稱號</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-200">
              {newTitle}
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            繼續努力！下一級需要 {nextLevelExp.toLocaleString()} EXP
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all transform hover:scale-105"
          >
            太棒了！
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfettiEffect() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) return null;

  const confettiColors = [
    'bg-red-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 2 + Math.random() * 1;
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        
        return (
          <div
            key={i}
            className={`absolute w-2 h-2 ${color} rounded-sm animate-confetti-fall`}
            style={{
              left: `${left}%`,
              top: '-10px',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}
