import { memo } from 'react';
import { formatNumber } from '@/utils/format';
import type { ClaudeUsageInfo } from '@/types';

interface TokenUsageDisplayProps {
  claudeUsage: ClaudeUsageInfo;
}

function TokenUsageDisplayComponent({ claudeUsage }: TokenUsageDisplayProps) {
  const { todayTokens, todayInputTokens, todayOutputTokens, todayRequests, todaySessions } = claudeUsage;

  return (
    <div className="mt-4 pt-4 border-t border-slate-700/50">
      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Today's Usage</h4>

      {/* Token count */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xl font-semibold text-white font-mono">{formatNumber(todayTokens)}</span>
        <span className="text-sm text-slate-400">total tokens</span>
      </div>

      {/* Token breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Input Tokens</span>
          <span className="text-blue-400 font-mono">{formatNumber(todayInputTokens)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Output Tokens</span>
          <span className="text-green-400 font-mono">{formatNumber(todayOutputTokens)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Requests</span>
          <span className="text-cyan-400 font-mono">{todayRequests}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Sessions</span>
          <span className="text-purple-400 font-mono">{todaySessions}</span>
        </div>
      </div>
    </div>
  );
}

export const TokenUsageDisplay = memo(TokenUsageDisplayComponent);
