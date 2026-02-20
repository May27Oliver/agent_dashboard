import type { EventLog } from '@/types';

interface EventLogEntryProps {
  log: EventLog;
}

const levelConfig = {
  info: {
    textColor: 'text-slate-300',
    icon: 'ℹ',
    iconColor: 'text-blue-400',
  },
  success: {
    textColor: 'text-green-300',
    icon: '✓',
    iconColor: 'text-green-400',
  },
  warning: {
    textColor: 'text-yellow-300',
    icon: '⚠',
    iconColor: 'text-yellow-400',
  },
  error: {
    textColor: 'text-red-300',
    icon: '✕',
    iconColor: 'text-red-400',
  },
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EventLogEntry({ log }: EventLogEntryProps) {
  const config = levelConfig[log.level];

  return (
    <div className="flex items-start gap-2 py-1 px-2 hover:bg-slate-700/30 rounded text-xs font-mono">
      <span className="text-slate-500 shrink-0">
        [{formatTimestamp(log.timestamp)}]
      </span>
      <span className={`shrink-0 ${config.iconColor}`}>{config.icon}</span>
      {log.source && (
        <span className="text-slate-500 shrink-0">[{log.source}]</span>
      )}
      <span className={`${config.textColor} break-all`}>{log.message}</span>
    </div>
  );
}
