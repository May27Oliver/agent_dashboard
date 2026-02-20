import { useState, useEffect, memo } from 'react';
import type { PromptUsageInfo } from '@/types';

interface PromptGaugeProps {
  promptUsage: PromptUsageInfo;
}

function formatResetTime(resetStr: string | null): string {
  if (!resetStr) return '--:--:--';
  try {
    const resetDate = new Date(resetStr);
    const now = Date.now();
    const remaining = Math.max(0, resetDate.getTime() - now);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } catch {
    return '--:--:--';
  }
}

function PromptGaugeComponent({ promptUsage }: PromptGaugeProps) {
  const [, setTick] = useState(0);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { windowPrompts, windowLimit, windowRemaining, windowResetTime, todayPrompts } = promptUsage;

  // Calculate percentage for prompts
  const promptPercentage = windowLimit
    ? Math.min(100, (windowPrompts / windowLimit) * 100)
    : 0;

  // Determine status based on remaining percentage
  const getStatus = () => {
    if (windowLimit === null || windowRemaining === null) return 'unknown';
    const remainingPercent = (windowRemaining / windowLimit) * 100;
    if (remainingPercent <= 0) return 'limited';
    if (remainingPercent <= 20) return 'warning';
    return 'normal';
  };

  const status = getStatus();

  const getGaugeColor = () => {
    switch (status) {
      case 'limited': return 'stroke-red-500';
      case 'warning': return 'stroke-amber-500';
      default: return 'stroke-cyan-500';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'limited': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      case 'unknown': return 'text-slate-500';
      default: return 'text-cyan-400';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'limited': return 'Limited';
      case 'warning': return 'Low';
      case 'unknown': return 'Unknown';
      default: return 'Normal';
    }
  };

  // Circular gauge calculations
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (promptPercentage / 100) * circumference;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
        Prompt Usage
      </h4>

      <div className="flex items-start gap-4">
        {/* Circular usage gauge */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-slate-700"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${getGaugeColor()} transition-all duration-500`}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-lg font-bold ${getStatusColor()}`}>
              {windowPrompts}
            </span>
            <span className="text-[10px] text-slate-500">
              / {windowLimit ?? '?'}
            </span>
          </div>
        </div>

        {/* Status info */}
        <div className="flex-1 space-y-2">
          {/* Remaining prompts */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Remaining</span>
            <span className={`font-mono font-semibold ${getStatusColor()}`}>
              {windowRemaining !== null ? `${windowRemaining} prompts` : 'N/A'}
            </span>
          </div>

          {/* Reset countdown */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Resets in</span>
            <span className="font-mono text-slate-300">
              {formatResetTime(windowResetTime)}
            </span>
          </div>

          {/* Today's total */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Today</span>
            <span className="font-mono text-slate-300">
              {todayPrompts} prompts
            </span>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'limited' ? 'bg-red-400 animate-pulse' :
                status === 'warning' ? 'bg-amber-400 animate-pulse' :
                status === 'unknown' ? 'bg-slate-500' :
                'bg-cyan-400'
              }`}
            />
            <span className={`text-xs ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PromptGauge = memo(PromptGaugeComponent);
