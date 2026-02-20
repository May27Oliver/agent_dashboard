import { create } from 'zustand';
import type { Agent, TerminalOutput, Workflow, WorkflowStep, ApprovalRequest } from '@/types';

interface AgentState {
  agents: Map<string, Agent>;
  terminalOutputs: Map<string, string[]>;
  workflows: Map<string, Workflow>;
  selectedAgentId: string | null;
  pendingApprovals: Map<string, ApprovalRequest>; // key: `${workflowId}-${stepId}`
  restartedAgentId: string | null; // 記錄剛重啟的 agent，用於觸發終端 refresh

  // Agent actions
  addAgent: (agent: Agent) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  setSelectedAgent: (agentId: string | null) => void;
  setRestartedAgentId: (agentId: string | null) => void;
  syncAgents: (agents: Agent[]) => void;
  syncWorkflows: (workflows: Workflow[]) => void;

  // Terminal output actions
  appendOutput: (output: TerminalOutput) => void;
  clearOutput: (agentId: string) => void;

  // Workflow actions
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Workflow) => void;
  removeWorkflow: (workflowId: string) => void;
  updateWorkflowStep: (workflowId: string, step: WorkflowStep) => void;

  // Approval actions
  addPendingApproval: (request: ApprovalRequest) => void;
  removePendingApproval: (workflowId: string, stepId: string) => void;
  getPendingApprovals: () => ApprovalRequest[];

  // Selectors
  getAgentsByWorkflow: (workflowId: string) => Agent[];
  getWorkflowsByProject: (projectPath: string) => Workflow[];
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: new Map(),
  terminalOutputs: new Map(),
  workflows: new Map(),
  selectedAgentId: null,
  pendingApprovals: new Map(),
  restartedAgentId: null,

  addAgent: (agent) =>
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.set(agent.id, agent);

      const newOutputs = new Map(state.terminalOutputs);
      if (!newOutputs.has(agent.id)) {
        newOutputs.set(agent.id, []);
      }

      return { agents: newAgents, terminalOutputs: newOutputs };
    }),

  updateAgent: (agent) =>
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.set(agent.id, agent);
      return { agents: newAgents };
    }),

  removeAgent: (agentId) =>
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.delete(agentId);

      const newOutputs = new Map(state.terminalOutputs);
      newOutputs.delete(agentId);

      return {
        agents: newAgents,
        terminalOutputs: newOutputs,
        selectedAgentId:
          state.selectedAgentId === agentId ? null : state.selectedAgentId,
      };
    }),

  setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),

  setRestartedAgentId: (agentId) => set({ restartedAgentId: agentId }),

  syncAgents: (agents) =>
    set((state) => {
      // Replace all agents with the server's list
      const newAgents = new Map<string, Agent>();
      const newOutputs = new Map<string, string[]>();

      agents.forEach((agent) => {
        newAgents.set(agent.id, agent);
        // Preserve existing outputs if available, otherwise initialize empty
        const existingOutput = state.terminalOutputs.get(agent.id);
        newOutputs.set(agent.id, existingOutput || []);
      });

      // Update selectedAgentId if it no longer exists
      const selectedAgentId = newAgents.has(state.selectedAgentId || '')
        ? state.selectedAgentId
        : null;

      return {
        agents: newAgents,
        terminalOutputs: newOutputs,
        selectedAgentId,
      };
    }),

  syncWorkflows: (workflows) =>
    set((state) => {
      const newWorkflows = new Map<string, Workflow>();
      workflows.forEach((wf) => {
        // 保留現有的 steps 如果存在
        const existingWorkflow = state.workflows.get(wf.id);
        if (existingWorkflow && existingWorkflow.steps.length > 0) {
          newWorkflows.set(wf.id, { ...wf, steps: existingWorkflow.steps });
        } else {
          newWorkflows.set(wf.id, wf);
        }
      });
      return { workflows: newWorkflows };
    }),

  appendOutput: (output) =>
    set((state) => {
      const newOutputs = new Map(state.terminalOutputs);
      const existing = newOutputs.get(output.agentId) || [];
      newOutputs.set(output.agentId, [...existing, output.data]);
      return { terminalOutputs: newOutputs };
    }),

  clearOutput: (agentId) =>
    set((state) => {
      const newOutputs = new Map(state.terminalOutputs);
      newOutputs.set(agentId, []);
      return { terminalOutputs: newOutputs };
    }),

  addWorkflow: (workflow) =>
    set((state) => {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.set(workflow.id, workflow);
      return { workflows: newWorkflows };
    }),

  updateWorkflow: (workflow) =>
    set((state) => {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.set(workflow.id, workflow);
      return { workflows: newWorkflows };
    }),

  removeWorkflow: (workflowId) =>
    set((state) => {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.delete(workflowId);

      // 同時清理相關的 pending approvals
      const newPendingApprovals = new Map(state.pendingApprovals);
      for (const key of newPendingApprovals.keys()) {
        if (key.startsWith(`${workflowId}-`)) {
          newPendingApprovals.delete(key);
        }
      }

      return { workflows: newWorkflows, pendingApprovals: newPendingApprovals };
    }),

  updateWorkflowStep: (workflowId, step) =>
    set((state) => {
      const newWorkflows = new Map(state.workflows);
      const workflow = newWorkflows.get(workflowId);
      if (workflow) {
        const stepIndex = workflow.steps.findIndex((s) => s.id === step.id);
        if (stepIndex !== -1) {
          workflow.steps[stepIndex] = step;
          newWorkflows.set(workflowId, { ...workflow });
        }
      }

      // If step is no longer awaiting approval, remove from pending
      if (step.status !== 'awaiting_approval') {
        const newPendingApprovals = new Map(state.pendingApprovals);
        const key = `${workflowId}-${step.id}`;
        newPendingApprovals.delete(key);
        return { workflows: newWorkflows, pendingApprovals: newPendingApprovals };
      }

      return { workflows: newWorkflows };
    }),

  addPendingApproval: (request) =>
    set((state) => {
      const newPendingApprovals = new Map(state.pendingApprovals);
      const key = `${request.workflowId}-${request.stepId}`;
      newPendingApprovals.set(key, request);
      return { pendingApprovals: newPendingApprovals };
    }),

  removePendingApproval: (workflowId, stepId) =>
    set((state) => {
      const newPendingApprovals = new Map(state.pendingApprovals);
      const key = `${workflowId}-${stepId}`;
      newPendingApprovals.delete(key);
      return { pendingApprovals: newPendingApprovals };
    }),

  getPendingApprovals: () => {
    return Array.from(get().pendingApprovals.values());
  },

  getAgentsByWorkflow: (workflowId: string) => {
    const agents = Array.from(get().agents.values());
    return agents.filter((agent) => agent.workflowId === workflowId);
  },

  getWorkflowsByProject: (projectPath: string) => {
    const workflows = Array.from(get().workflows.values());
    return workflows.filter((workflow) => workflow.projectPath === projectPath);
  },
}));
