import { useState } from 'react';
import type { Task, TaskStatus } from '@/types';
import { TaskFilter } from './TaskFilter';
import { TaskTag } from './TaskTag';

interface TaskPanelProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void;
}

export function TaskPanel({
  tasks,
  onTaskClick,
  onTaskStatusChange,
}: TaskPanelProps) {
  const [filter, setFilter] = useState<TaskStatus>('all');

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    active: tasks.filter((t) => t.status === 'active').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const filteredTasks =
    filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Tasks
          </h3>
          <span className="text-xs text-slate-500">
            {filteredTasks.length} items
          </span>
        </div>
        <TaskFilter
          activeFilter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />
      </div>

      {/* Task List */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">
            No tasks found
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/50">
            {filteredTasks.map((task) => (
              <li
                key={task.id}
                className="p-3 hover:bg-slate-700/30 transition-colors cursor-pointer"
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {task.label}
                    </p>
                    {task.agentId && (
                      <p className="text-xs text-slate-500 mt-1">
                        Agent: {task.agentId.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TaskTag status={task.status} />
                    {onTaskStatusChange && task.status !== 'done' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus: TaskStatus =
                            task.status === 'pending' ? 'active' : 'done';
                          onTaskStatusChange(task.id, nextStatus);
                        }}
                        className="p-1 rounded hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                        title={
                          task.status === 'pending'
                            ? 'Start task'
                            : 'Complete task'
                        }
                      >
                        {task.status === 'pending' ? (
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
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
