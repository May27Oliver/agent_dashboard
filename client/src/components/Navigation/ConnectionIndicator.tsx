import type { ConnectionStatus } from '@/types';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
}

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const statusConfig = {
    online: {
      color: 'bg-green-500',
      text: 'ONLINE',
      textColor: 'text-green-400',
      pulse: false,
    },
    offline: {
      color: 'bg-red-500',
      text: 'OFFLINE',
      textColor: 'text-red-400',
      pulse: false,
    },
    connecting: {
      color: 'bg-yellow-500',
      text: 'CONNECTING',
      textColor: 'text-yellow-400',
      pulse: true,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={`w-2.5 h-2.5 rounded-full ${config.color} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
        />
        {config.pulse && (
          <div
            className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`}
          />
        )}
      </div>
      <span className={`text-xs font-semibold tracking-wider ${config.textColor}`}>
        {config.text}
      </span>
    </div>
  );
}
