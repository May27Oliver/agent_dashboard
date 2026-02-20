import { useState, memo, useCallback } from 'react';
import { useSystemStore } from '@/store/systemStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSocket } from '@/hooks/useSocket';
import { AgentCard } from '@/components/Agent/AgentCard';
import { WorkflowDiagram } from '@/components/Workflow/WorkflowDiagram';
import { ApprovalPanel } from '@/components/Workflow/ApprovalPanel';
import { SystemStatusPanel } from '@/components/System';
import { TokenUsageDisplay } from './TokenUsageDisplay';
import { PromptGauge } from './PromptGauge';
import type { Workflow, Agent, ApprovalRequest, AGENT_ROLES } from '@/types';

export interface DashboardOverviewProps {
  agentArray: Agent[];
  workflowArray: Workflow[];
  pendingApprovalsArray: ApprovalRequest[];
  onApproveStep: (workflowId: string, stepId: string, comment?: string) => void;
  onRejectStep: (workflowId: string, stepId: string, comment: string, retry?: boolean) => void;
  onSendInput: (agentId: string, data: string) => void;
  onResizeTerminal: (agentId: string, cols: number, rows: number) => void;
  onRemoveAgent: (agentId: string) => void;
  onRestartAgent: (agentId: string) => void;
}

// Role list for breakdown display
const ROLES: typeof AGENT_ROLES = ['PM', 'UIUX', 'RD', 'TEST', 'REVIEW', 'QA', 'CUSTOM'];

function DashboardOverviewComponent({
  agentArray,
  workflowArray,
  pendingApprovalsArray,
  onApproveStep,
  onRejectStep,
  onSendInput,
  onResizeTerminal,
  onRemoveAgent,
  onRestartAgent,
}: DashboardOverviewProps) {
  const { stats } = useSystemStore();
  const { updateSettings } = useSocket();
  const getCollapsedState = useSettingsStore((state) => state.getCollapsedState);
  const setCollapsedStateStore = useSettingsStore((state) => state.setCollapsedState);

  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(
    () => getCollapsedState('overview')
  );

  const handleToggleOverviewCollapse = useCallback(() => {
    const newValue = !isOverviewCollapsed;
    setIsOverviewCollapsed(newValue);
    const partialUpdate = setCollapsedStateStore('overview', newValue);
    updateSettings(partialUpdate);
  }, [isOverviewCollapsed, setCollapsedStateStore, updateSettings]);

  return (
    <>
      {/* Top Row: System Status, Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6 items-start">
        {/* System Status (Left) */}
        <div className="lg:col-span-4">
          <SystemStatusPanel />
        </div>

        {/* Overview (Center) */}
        <div className="lg:col-span-8">
          <div className={`bg-slate-800/50 rounded-lg border border-slate-700/50 ${!isOverviewCollapsed ? 'min-h-[380px]' : ''}`}>
            {/* Collapsible header */}
            <button
              onClick={handleToggleOverviewCollapse}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors rounded-t-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-inset"
              aria-expanded={!isOverviewCollapsed}
              aria-controls="overview-content"
            >
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Overview
              </h3>
              <svg
                className={`w-4 h-4 text-slate-400 hover:text-cyan-400 transition-all duration-200 ${
                  isOverviewCollapsed ? '-rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapsible content */}
            <div
              id="overview-content"
              className={`transition-all duration-250 ease-out overflow-hidden ${
                isOverviewCollapsed ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'
              }`}
              aria-hidden={isOverviewCollapsed}
            >
              <div className="px-4 pb-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {agentArray.length}
                    </div>
                    <div className="text-xs text-slate-500">Total Agents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {agentArray.filter((a) => a.status === 'running').length}
                    </div>
                    <div className="text-xs text-slate-500">Running</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {workflowArray.length}
                    </div>
                    <div className="text-xs text-slate-500">Workflows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {pendingApprovalsArray.length}
                    </div>
                    <div className="text-xs text-slate-500">Pending</div>
                  </div>
                </div>

                {/* Role breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => {
                      const count = agentArray.filter((a) => a.role === role).length;
                      if (count === 0) return null;
                      return (
                        <span
                          key={role}
                          className="px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-300"
                        >
                          {role}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Claude Usage & Prompt Gauge Display */}
                {stats?.claudeUsage ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Primary: Prompt Usage Gauge */}
                    {stats.claudeUsage.promptUsage && (
                      <PromptGauge promptUsage={stats.claudeUsage.promptUsage} />
                    )}
                    {/* Secondary: Token Usage */}
                    <TokenUsageDisplay claudeUsage={stats.claudeUsage} />
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Usage</h4>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <span className="text-slate-600">--</span>
                      <span className="text-xs">No usage data available</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingApprovalsArray.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Pending Approvals ({pendingApprovalsArray.length})
            </h2>
          </div>
          <div className="space-y-4">
            {pendingApprovalsArray.map((request) => (
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

      {/* Active Workflows Section */}
      {workflowArray.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">
              Workflows ({workflowArray.length})
            </h2>
          </div>
          <div className="space-y-4">
            {workflowArray.map((workflow) => (
              <div key={workflow.id}>
                <WorkflowDiagram
                  workflow={workflow}
                  agents={
                    new Map(
                      agentArray.map((a) => [a.id, { name: a.name, role: a.role }])
                    )
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Agents Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">
            All Agents ({agentArray.length})
          </h2>
        </div>

        {agentArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-slate-800/30 rounded-xl border border-slate-700/50 border-dashed">
            <div className="text-4xl mb-4">&#129302;</div>
            <p className="text-slate-400 text-sm">No agents created yet</p>
            <p className="text-slate-500 text-xs mt-1">
              Create a workflow from the sidebar to auto-generate agents
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {agentArray.map((agent) => (
              <div
                key={agent.id}
                className={agentArray.length === 1 ? 'w-full' : 'flex-1 min-w-[calc(50%-0.5rem)]'}
              >
                <AgentCard
                  agent={agent}
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
    </>
  );
}

export const DashboardOverview = memo(DashboardOverviewComponent);
