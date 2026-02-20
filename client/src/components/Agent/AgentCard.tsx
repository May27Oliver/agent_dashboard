import { useState } from 'react';
import type { Agent } from '@/types';
import { XTerminal } from '@/components/Terminal/XTerminal';
import { AgentStatusIndicator } from './AgentStatus';

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onSelect?: () => void;
  onSendInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  onRemove: () => void;
  onRestart: () => void;
}

const roleColors: Record<string, string> = {
  PM: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  RD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TEST: 'bg-green-500/20 text-green-400 border-green-500/30',
  REVIEW: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  QA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  UIUX: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  CUSTOM: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function AgentCard({
  agent,
  isSelected,
  onSelect,
  onSendInput,
  onResize,
  onRemove,
  onRestart,
}: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`bg-slate-800/50 rounded-xl border overflow-hidden shadow-lg transition-colors ${
        isSelected
          ? 'border-cyan-500/50 ring-1 ring-cyan-500/30'
          : 'border-slate-700/50'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-slate-700/50 ${
          onSelect ? 'cursor-pointer hover:bg-slate-700/30' : 'bg-slate-800/80'
        }`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
              roleColors[agent.role] || roleColors.CUSTOM
            }`}
          >
            {agent.role}
          </span>
          <h3 className="text-sm font-medium text-slate-200">{agent.name}</h3>
        </div>

        <div className="flex items-center gap-3">
          <AgentStatusIndicator status={agent.status} size="sm" />

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestart();
            }}
            className="p-1.5 rounded-md hover:bg-green-500/20 transition-colors text-slate-400 hover:text-green-400"
            title="Restart Terminal"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-md hover:bg-red-500/20 transition-colors text-slate-400 hover:text-red-400"
            title="Remove Agent"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal */}
      {isExpanded && (
        <div className="p-2">
          <div className="h-[300px]">
            <XTerminal
              agentId={agent.id}
              onInput={onSendInput}
              onResize={onResize}
            />
          </div>
        </div>
      )}
    </div>
  );
}
