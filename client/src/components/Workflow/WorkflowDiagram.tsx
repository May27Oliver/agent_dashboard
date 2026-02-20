import type { Workflow, WorkflowStep } from '@/types';

interface WorkflowDiagramProps {
  workflow: Workflow;
  agents: Map<string, { name: string; role: string }>;
}

const stepStatusColors: Record<WorkflowStep['status'], string> = {
  pending: 'bg-slate-600 border-slate-500',
  running: 'bg-blue-600 border-blue-400 animate-pulse',
  success: 'bg-green-600 border-green-400',
  failure: 'bg-red-600 border-red-400',
  skipped: 'bg-slate-700 border-slate-600 opacity-50',
  awaiting_approval: 'bg-amber-600 border-amber-400 animate-pulse',
};

const stepStatusIcons: Record<WorkflowStep['status'], string> = {
  pending: '○',
  running: '◉',
  success: '✓',
  failure: '✗',
  skipped: '−',
  awaiting_approval: '!',
};

export function WorkflowDiagram({ workflow, agents }: WorkflowDiagramProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-200">{workflow.name}</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            workflow.status === 'running'
              ? 'bg-blue-500/20 text-blue-400'
              : workflow.status === 'completed'
              ? 'bg-green-500/20 text-green-400'
              : workflow.status === 'failed'
              ? 'bg-red-500/20 text-red-400'
              : workflow.status === 'paused'
              ? 'bg-yellow-500/20 text-yellow-400'
              : workflow.status === 'awaiting_approval'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-500/20 text-slate-400'
          }`}
        >
          {workflow.status === 'awaiting_approval' ? 'AWAITING APPROVAL' : workflow.status.toUpperCase()}
        </span>
      </div>

      {/* Steps Flow */}
      <div className="flex flex-wrap gap-2 items-center">
        {workflow.steps.map((step, index) => {
          const agent = agents.get(step.agentId);
          return (
            <div key={step.id} className="flex items-center">
              {/* Step Node */}
              <div
                className={`flex flex-col items-center p-3 rounded-lg border-2 min-w-[100px] ${stepStatusColors[step.status]}`}
              >
                <span className="text-lg mb-1">
                  {stepStatusIcons[step.status]}
                </span>
                <span className="text-xs font-medium text-white">
                  {agent?.role || 'Unknown'}
                </span>
                <span className="text-[10px] text-slate-300 mt-1 truncate max-w-[80px]">
                  {step.command.slice(0, 15)}
                  {step.command.length > 15 ? '...' : ''}
                </span>
              </div>

              {/* Arrow */}
              {index < workflow.steps.length - 1 && (
                <svg
                  className="w-8 h-4 text-slate-500 mx-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline info */}
      {workflow.startedAt && (
        <div className="mt-4 text-xs text-slate-500">
          Started: {new Date(workflow.startedAt).toLocaleTimeString()}
          {workflow.completedAt && (
            <span className="ml-4">
              Completed: {new Date(workflow.completedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
