import { useEffect, useRef } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { useAgentStore } from '@/store/agentStore';
import { useSystemStore } from '@/store/systemStore';
import { useSettingsStore } from '@/store/settingsStore';
import { writeToTerminal } from '@/components/Terminal/XTerminal';
import type {
  Agent,
  ApprovalRequest,
  SystemStats,
  EventLog,
  FullSettings,
  Workflow,
} from '@/types';

// 系統統計節流常數
const STATS_THROTTLE_MS = 1000;

/**
 * 集中管理所有 socket 事件監聽器
 * 在 App 層級只註冊一次，避免重複註冊導致效能問題
 */
export function useSocketEvents() {
  const { socket } = useSocketContext();
  const isInitializedRef = useRef(false);
  const lastStatsUpdateRef = useRef(0);

  useEffect(() => {
    // 確保只初始化一次
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    useSystemStore.getState().setConnectionStatus('connecting');

    // === 連線狀態事件 ===
    const handleConnect = () => {
      useSystemStore.getState().setConnectionStatus('online');
      // 連線後請求設定
      socket.emit('settings:get');
    };

    const handleDisconnect = () => {
      useSystemStore.getState().setConnectionStatus('offline');
    };

    // === 系統事件 ===
    const handleSystemStats = (stats: SystemStats) => {
      // 節流：每秒最多更新一次
      const now = Date.now();
      if (now - lastStatsUpdateRef.current >= STATS_THROTTLE_MS) {
        lastStatsUpdateRef.current = now;
        useSystemStore.getState().setStats(stats);
      }
    };

    const handleSystemLog = (log: EventLog) => {
      useSystemStore.getState().addLog(log);
    };

    // === Agent 事件 ===
    const handleAgentSync = (agents: Agent[]) => {
      useAgentStore.getState().syncAgents(agents);
    };

    const handleAgentCreated = (agent: Agent) => {
      useAgentStore.getState().addAgent(agent);
    };

    const handleAgentUpdated = (agent: Agent) => {
      useAgentStore.getState().updateAgent(agent);
    };

    const handleAgentRemoved = (agentId: string) => {
      useAgentStore.getState().removeAgent(agentId);
    };

    const handleAgentRestarted = (agent: Agent) => {
      useAgentStore.getState().updateAgent(agent);
      useAgentStore.getState().setRestartedAgentId(agent.id);
    };

    const handleAgentOutput = (output: { agentId: string; data: string }) => {
      writeToTerminal(output.agentId, output.data);
    };

    // === Workflow 事件 ===
    const handleWorkflowSync = (workflows: Workflow[]) => {
      useAgentStore.getState().syncWorkflows(workflows);
    };

    const handleWorkflowCreated = (workflow: Workflow) => {
      useAgentStore.getState().addWorkflow(workflow);
    };

    const handleWorkflowUpdated = (workflow: Workflow) => {
      useAgentStore.getState().updateWorkflow(workflow);
    };

    const handleWorkflowStepChanged = ({ workflowId, step }: { workflowId: string; step: import('@/types').WorkflowStep }) => {
      useAgentStore.getState().updateWorkflowStep(workflowId, step);
    };

    const handleWorkflowApprovalRequired = (request: ApprovalRequest) => {
      useAgentStore.getState().addPendingApproval(request);
    };

    const handleWorkflowDeleted = (workflowId: string) => {
      useAgentStore.getState().removeWorkflow(workflowId);
    };

    // === 設定事件 ===
    const handleSettingsUpdated = (settings: FullSettings) => {
      useSettingsStore.getState().setSettings(settings);
    };

    const handleSettingsResponse = (settings: FullSettings) => {
      useSettingsStore.getState().initFromServer(settings);
    };

    // === 註冊所有監聽器 ===
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('system:stats', handleSystemStats);
    socket.on('system:log', handleSystemLog);
    socket.on('agent:sync', handleAgentSync);
    socket.on('agent:created', handleAgentCreated);
    socket.on('agent:updated', handleAgentUpdated);
    socket.on('agent:removed', handleAgentRemoved);
    socket.on('agent:restarted', handleAgentRestarted);
    socket.on('agent:output', handleAgentOutput);
    socket.on('workflow:sync', handleWorkflowSync);
    socket.on('workflow:created', handleWorkflowCreated);
    socket.on('workflow:updated', handleWorkflowUpdated);
    socket.on('workflow:stepChanged', handleWorkflowStepChanged);
    socket.on('workflow:approvalRequired', handleWorkflowApprovalRequired);
    socket.on('workflow:deleted', handleWorkflowDeleted);
    socket.on('settings:updated', handleSettingsUpdated);
    socket.on('settings:response', handleSettingsResponse);

    // 如果已連線，立即更新狀態並請求設定
    if (socket.connected) {
      useSystemStore.getState().setConnectionStatus('online');
      socket.emit('settings:get');
    }

    // 清理函數 - socket 生命週期由 SocketContext 管理，這裡只清理監聽器
    return () => {
      // 重置初始化狀態，以便在 Strict Mode 下能重新註冊
      isInitializedRef.current = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('system:stats', handleSystemStats);
      socket.off('system:log', handleSystemLog);
      socket.off('agent:sync', handleAgentSync);
      socket.off('agent:created', handleAgentCreated);
      socket.off('agent:updated', handleAgentUpdated);
      socket.off('agent:removed', handleAgentRemoved);
      socket.off('agent:restarted', handleAgentRestarted);
      socket.off('agent:output', handleAgentOutput);
      socket.off('workflow:sync', handleWorkflowSync);
      socket.off('workflow:created', handleWorkflowCreated);
      socket.off('workflow:updated', handleWorkflowUpdated);
      socket.off('workflow:stepChanged', handleWorkflowStepChanged);
      socket.off('workflow:approvalRequired', handleWorkflowApprovalRequired);
      socket.off('workflow:deleted', handleWorkflowDeleted);
      socket.off('settings:updated', handleSettingsUpdated);
      socket.off('settings:response', handleSettingsResponse);
    };
  }, [socket]);
}
