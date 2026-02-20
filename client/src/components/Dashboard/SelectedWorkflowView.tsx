import { useState, memo } from 'react';
import { AgentCard } from '@/components/Agent/AgentCard';
import { WorkflowDiagram } from '@/components/Workflow/WorkflowDiagram';
import { ApprovalPanel } from '@/components/Workflow/ApprovalPanel';
import type { Workflow, Agent, ApprovalRequest, AgentConfig, AgentRole } from '@/types';

// Status color mapping
const statusColorMap: Record<Workflow['status'], string> = {
  running: 'text-green-400 bg-green-500/20',
  completed: 'text-green-400 bg-green-500/20',
  failed: 'text-red-400 bg-red-500/20',
  paused: 'text-yellow-400 bg-yellow-500/20',
  awaiting_approval: 'text-amber-400 bg-amber-500/20',
  idle: 'text-slate-400 bg-slate-500/20',
};

export interface SelectedWorkflowViewProps {
  workflow: Workflow;
  agents: Agent[];
  allAgents: Agent[];
  pendingApprovals: ApprovalRequest[];
  onApproveStep: (workflowId: string, stepId: string, comment?: string) => void;
  onRejectStep: (workflowId: string, stepId: string, comment: string, retry?: boolean) => void;
  onSendInput: (agentId: string, data: string) => void;
  onResizeTerminal: (agentId: string, cols: number, rows: number) => void;
  onRemoveAgent: (agentId: string) => void;
  onRestartAgent: (agentId: string) => void;
  onCreateAgent: (config: AgentConfig) => void;
  onClose: () => void;
}

// Available roles for adding agents
const AVAILABLE_ROLES: { role: AgentRole; label: string; description: string }[] = [
  { role: 'PM', label: 'PM', description: 'Product Manager' },
  { role: 'UIUX', label: 'UI/UX', description: 'Designer' },
  { role: 'RD', label: 'RD', description: 'Developer' },
  { role: 'QA', label: 'QA', description: 'QA Engineer' },
  { role: 'TEST', label: 'Test', description: 'Test Engineer' },
  { role: 'REVIEW', label: 'Review', description: 'Code Reviewer' },
  { role: 'CUSTOM', label: 'Custom', description: 'Custom Agent' },
];

function SelectedWorkflowViewComponent({
  workflow,
  agents,
  allAgents,
  pendingApprovals,
  onApproveStep,
  onRejectStep,
  onSendInput,
  onResizeTerminal,
  onRemoveAgent,
  onRestartAgent,
  onCreateAgent,
  onClose,
}: SelectedWorkflowViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentRole, setNewAgentRole] = useState<AgentRole>('CUSTOM');
  const [newAgentName, setNewAgentName] = useState('');

  const handleAddAgent = () => {
    if (!newAgentName.trim()) return;

    const config = {
      name: newAgentName.trim(),
      role: newAgentRole,
      cwd: workflow.projectPath,
      workflowId: workflow.id,
    };
    onCreateAgent(config);

    // Reset form
    setNewAgentName('');
    setNewAgentRole('CUSTOM');
    setShowAddAgent(false);
  };

  const getStatusColor = (status: Workflow['status']) => {
    return statusColorMap[status] || statusColorMap.idle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Back to overview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-slate-200">
              {workflow.featureName || workflow.name}
            </h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(workflow.status)}`}>
              {workflow.status}
            </span>
          </div>
          {workflow.projectPath && (
            <p className="text-xs text-slate-500 mt-1 ml-8 font-mono">{workflow.projectPath}</p>
          )}
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
          Workflow Steps
        </h3>
        <WorkflowDiagram
          workflow={workflow}
          agents={
            new Map(
              allAgents.map((a) => [a.id, { name: a.name, role: a.role }])
            )
          }
        />
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Pending Approvals
          </h3>
          <div className="space-y-4">
            {pendingApprovals.map((request) => (
              <ApprovalPanel
                key={`${request.workflowId}-${request.stepId}`}
                request={request}
                onApprove={onApproveStep}
                onReject={onRejectStep}
              />
            ))}
          </div>
        </section>
      )}

      {/* Workflow Agents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Workflow Agents ({agents.length})
          </h3>
          <button
            onClick={() => setShowAddAgent(!showAddAgent)}
            className="px-3 py-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors flex items-center gap-1.5 bg-cyan-600/10 hover:bg-cyan-600/20 rounded-lg border border-cyan-600/30"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Agent
          </button>
        </div>

        {/* Add Agent Panel */}
        {showAddAgent && (
          <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-200 mb-3">Add New Agent</h4>
            <div className="space-y-3">
              {/* Agent Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g., feature-reviewer"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Agent Role */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Role
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => setNewAgentRole(r.role)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        newAgentRole === r.role
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title={r.description}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAddAgent}
                  disabled={!newAgentName.trim()}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create Agent
                </button>
                <button
                  onClick={() => {
                    setShowAddAgent(false);
                    setNewAgentName('');
                    setNewAgentRole('CUSTOM');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {agents.length === 0 && !showAddAgent ? (
          <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 border-dashed p-8 text-center">
            <p className="text-slate-400 text-sm">No agents yet</p>
            <p className="text-slate-500 text-xs mt-1">Click &quot;Add Agent&quot; to create one, or start the workflow</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={agents.length === 1 ? 'w-full' : 'flex-1 min-w-[calc(50%-0.5rem)]'}
              >
                <AgentCard
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                  onSendInput={(data) => onSendInput(agent.id, data)}
                  onResize={(cols, rows) => onResizeTerminal(agent.id, cols, rows)}
                  onRemove={() => onRemoveAgent(agent.id)}
                  onRestart={() => onRestartAgent(agent.id)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export const SelectedWorkflowView = memo(SelectedWorkflowViewComponent);
