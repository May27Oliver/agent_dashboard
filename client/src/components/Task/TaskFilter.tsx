import type { TaskStatus } from '@/types';

interface TaskFilterProps {
  activeFilter: TaskStatus;
  onFilterChange: (filter: TaskStatus) => void;
  counts?: {
    all: number;
    pending: number;
    active: number;
    done: number;
  };
}

const filters: { id: TaskStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
];

export function TaskFilter({
  activeFilter,
  onFilterChange,
  counts,
}: TaskFilterProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
      {filters.map((filter) => {
        const count = counts?.[filter.id];
        const isActive = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {filter.label}
            {count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive
                    ? 'bg-cyan-500/30 text-white'
                    : 'bg-slate-700 text-slate-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
