import type { AgentStatus as StatusType } from '@/types';

interface AgentStatusProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  StatusType,
  { color: string; bgColor: string; label: string; pulse?: boolean }
> = {
  idle: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-400',
    label: 'Idle',
  },
  running: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-400',
    label: 'Running',
    pulse: true,
  },
  success: {
    color: 'text-green-400',
    bgColor: 'bg-green-400',
    label: 'Success',
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-400',
    label: 'Error',
  },
  waiting: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
    label: 'Waiting',
    pulse: true,
  },
};

const sizeConfig = {
  sm: { dot: 'w-2 h-2', text: 'text-xs' },
  md: { dot: 'w-2.5 h-2.5', text: 'text-sm' },
  lg: { dot: 'w-3 h-3', text: 'text-base' },
};

export function AgentStatusIndicator({ status, size = 'md' }: AgentStatusProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex">
        <span
          className={`${sizes.dot} rounded-full ${config.bgColor} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
        />
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.bgColor} opacity-75 animate-ping`}
          />
        )}
      </span>
      <span className={`${sizes.text} ${config.color} font-medium`}>
        {config.label}
      </span>
    </div>
  );
}
