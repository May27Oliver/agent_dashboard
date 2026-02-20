import type { TaskStatus } from '@/types';

interface TaskTagProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<
  TaskStatus,
  { bg: string; text: string; label: string }
> = {
  all: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'All' },
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
  active: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Active' },
  done: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Done' },
};

export function TaskTag({ status, size = 'sm' }: TaskTagProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses[size]}`}
    >
      {config.label}
    </span>
  );
}
