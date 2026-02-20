import { useAgentStore } from '@/store/agentStore';
import { useUIStore } from '@/store/uiStore';
import { useSocket } from '@/hooks/useSocket';
import { WorkflowSidebar } from './WorkflowSidebar';
import { CollaborativeWorkflowCreator } from '@/components/Workflow/CollaborativeWorkflowCreator';
import { SelectedWorkflowView } from '@/components/Dashboard/SelectedWorkflowView';
import { DashboardOverview } from '@/components/Dashboard/DashboardOverview';

export function Dashboard() {
  const agents = useAgentStore((state) => state.agents);
  const workflows = useAgentStore((state) => state.workflows);
  const pendingApprovals = useAgentStore((state) => state.pendingApprovals);
  const getAgentsByWorkflow = useAgentStore((state) => state.getAgentsByWorkflow);

  const selectedWorkflowId = useUIStore((state) => state.selectedWorkflowId);
  const setSelectedWorkflow = useUIStore((state) => state.setSelectedWorkflow);
  const isCreatingWorkflow = useUIStore((state) => state.isCreatingWorkflow);
  const creatingWorkflowForProject = useUIStore((state) => state.creatingWorkflowForProject);
  const startCreatingWorkflow = useUIStore((state) => state.startCreatingWorkflow);
  const cancelCreatingWorkflow = useUIStore((state) => state.cancelCreatingWorkflow);

  const {
    sendInput,
    resizeTerminal,
    removeAgent,
    restartAgent,
    createCollaborativeWorkflow,
    createAgent,
    approveStep,
    rejectStep,
    deleteWorkflow,
    listDirs,
  } = useSocket();

  const handleCreateWorkflow = (projectPath: string) => {
    startCreatingWorkflow(projectPath);
  };

  const agentArray = Array.from(agents.values());
  const workflowArray = Array.from(workflows.values());
  const pendingApprovalsArray = Array.from(pendingApprovals.values());

  // Get selected workflow
  const selectedWorkflow = selectedWorkflowId ? workflows.get(selectedWorkflowId) : null;

  // Get agents for selected workflow
  const workflowAgents = selectedWorkflowId ? getAgentsByWorkflow(selectedWorkflowId) : [];

  // Get pending approvals for selected workflow
  const workflowPendingApprovals = selectedWorkflow
    ? pendingApprovalsArray.filter((a) => a.workflowId === selectedWorkflowId)
    : [];

  return (
    <div className="flex h-full">
      <WorkflowSidebar
        onCreateWorkflow={handleCreateWorkflow}
        onListDirs={listDirs}
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Collaborative Workflow Creator Modal */}
        {isCreatingWorkflow && creatingWorkflowForProject && (
          <section className="mb-6">
            <CollaborativeWorkflowCreator
              projectPath={creatingWorkflowForProject}
              onCreateWorkflow={(request) => {
                createCollaborativeWorkflow(request);
                cancelCreatingWorkflow();
              }}
              onCancel={cancelCreatingWorkflow}
            />
          </section>
        )}

        {/* Selected Workflow View - 只在不是創建模式時顯示 */}
        {!isCreatingWorkflow && selectedWorkflow ? (
          <SelectedWorkflowView
            workflow={selectedWorkflow}
            agents={workflowAgents}
            allAgents={agentArray}
            pendingApprovals={workflowPendingApprovals}
            onApproveStep={approveStep}
            onRejectStep={rejectStep}
            onSendInput={sendInput}
            onResizeTerminal={resizeTerminal}
            onRemoveAgent={removeAgent}
            onRestartAgent={restartAgent}
            onCreateAgent={createAgent}
            onDeleteWorkflow={deleteWorkflow}
            onClose={() => setSelectedWorkflow(null)}
          />
        ) : !isCreatingWorkflow ? (
          <DashboardOverview
            agentArray={agentArray}
            workflowArray={workflowArray}
            pendingApprovalsArray={pendingApprovalsArray}
            onApproveStep={approveStep}
            onRejectStep={rejectStep}
            onSendInput={sendInput}
            onResizeTerminal={resizeTerminal}
            onRemoveAgent={removeAgent}
            onRestartAgent={restartAgent}
          />
        ) : null}
      </div>
    </div>
  );
}
