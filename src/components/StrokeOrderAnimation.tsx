import { useState, useEffect, useRef } from 'react';
import { strokeOrderData, hasStrokeData } from '../data/strokeOrder';
import { Play, RotateCcw } from 'lucide-react';

interface StrokeOrderAnimationProps {
  char: string;
  size?: number;
  showNumbers?: boolean;
  autoPlay?: boolean;
  className?: string;
}

export function StrokeOrderAnimation({
  char,
  size = 200,
  showNumbers = true,
  autoPlay = false,
  className = '',
}: StrokeOrderAnimationProps) {
  const [currentStroke, setCurrentStroke] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [progress, setProgress] = useState<number>(0);
  const animationRef = useRef<number | undefined>(undefined);

  const strokeData = hasStrokeData(char) ? strokeOrderData[char] : null;
  const strokes = strokeData?.strokes || [];

  useEffect(() => {
    if (!isPlaying || strokes.length === 0) return;

    const startTime = Date.now();
    const strokeDuration = 800; // ms per stroke
    const pauseBetweenStrokes = 400; // ms pause between strokes

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const totalDuration = (strokeDuration + pauseBetweenStrokes) * strokes.length;

      if (elapsed >= totalDuration) {
        setCurrentStroke(strokes.length - 1);
        setProgress(1);
        setIsPlaying(false);
        return;
      }

      const cycleTime = elapsed % (strokeDuration + pauseBetweenStrokes);
      const strokeIndex = Math.floor(elapsed / (strokeDuration + pauseBetweenStrokes));

      setCurrentStroke(strokeIndex);

      if (cycleTime < strokeDuration) {
        setProgress(cycleTime / strokeDuration);
      } else {
        setProgress(1);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, strokes.length]);

  const handlePlay = () => {
    setCurrentStroke(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleReplay = () => {
    setCurrentStroke(0);
    setProgress(0);
    setIsPlaying(true);
  };

  if (!strokeData) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          無筆順資料
        </div>
      </div>
    );
  }

  // Calculate stroke start positions for numbers
  const getStrokeStartPosition = (pathData: string): { x: number; y: number } => {
    const match = pathData.match(/M\s*([\d.-]+)[,\s]+([\d.-]+)/);
    if (match) {
      return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    }
    return { x: 0, y: 0 };
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 109 109"
        width={size}
        height={size}
        className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white"
      >
        {/* Grid lines */}
        <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="2,2" />

        {/* Completed strokes (light gray) */}
        {strokes.slice(0, currentStroke).map((stroke, idx) => (
          <path
            key={`completed-${idx}`}
            d={stroke}
            fill="none"
            stroke="#cccccc"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Current animating stroke */}
        {currentStroke < strokes.length && (
          <path
            d={strokes[currentStroke]}
            fill="none"
            stroke="#333333"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - progress)}
            style={{ transition: isPlaying ? 'none' : 'stroke-dashoffset 0.3s ease' }}
          />
        )}

        {/* Stroke numbers */}
        {showNumbers && !isPlaying && strokes.map((stroke, idx) => {
          const pos = getStrokeStartPosition(stroke);
          return (
            <g key={`number-${idx}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="8"
                fill="#ff6b6b"
                opacity="0.9"
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex gap-2">
        {!isPlaying && currentStroke === 0 && (
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-semibold"
          >
            <Play size={16} />
            播放
          </button>
        )}
        {!isPlaying && currentStroke > 0 && (
          <button
            onClick={handleReplay}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-semibold"
          >
            <RotateCcw size={16} />
            重播
          </button>
        )}
        {isPlaying && (
          <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold">
            播放中... ({currentStroke + 1}/{strokes.length})
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {strokes.length} 筆畫
      </div>
    </div>
  );
}

interface StrokeOrderButtonProps {
  char: string;
  onShowStrokeOrder: () => void;
}

export function StrokeOrderButton({ char, onShowStrokeOrder }: StrokeOrderButtonProps) {
  if (!hasStrokeData(char)) {
    return null;
  }

  return (
    <button
      onClick={onShowStrokeOrder}
      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold"
    >
      📝 筆順
    </button>
  );
}
