import { useCallback } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { useAgentStore } from '@/store/agentStore';
import type {
  AgentConfig,
  WorkflowDefinition,
  CollaborativeWorkflowRequest,
  FullSettings,
} from '@/types';

/**
 * Socket action hook
 * 只提供 socket actions，事件監聽由 useSocketEvents 統一管理
 */
export function useSocket() {
  const { socket } = useSocketContext();

  // === Agent Actions ===
  const createAgent = useCallback((config: AgentConfig) => {
    socket.emit('agent:create', config);
  }, [socket]);

  const sendCommand = useCallback((agentId: string, command: string) => {
    socket.emit('agent:command', { agentId, command });
  }, [socket]);

  const sendInput = useCallback((agentId: string, data: string) => {
    socket.emit('agent:input', { agentId, data });
  }, [socket]);

  const resizeTerminal = useCallback(
    (agentId: string, cols: number, rows: number) => {
      socket.emit('agent:resize', { agentId, cols, rows });
    },
    [socket]
  );

  const removeAgentById = useCallback((agentId: string) => {
    socket.emit('agent:remove', agentId);
  }, [socket]);

  const restartAgent = useCallback((agentId: string) => {
    socket.emit('agent:restart', agentId);
  }, [socket]);

  // === Workflow Actions ===
  const createWorkflow = useCallback((definition: WorkflowDefinition) => {
    socket.emit('workflow:create', definition);
  }, [socket]);

  const startWorkflow = useCallback((workflowId: string) => {
    socket.emit('workflow:start', workflowId);
  }, [socket]);

  const pauseWorkflow = useCallback((workflowId: string) => {
    socket.emit('workflow:pause', workflowId);
  }, [socket]);

  const resumeWorkflow = useCallback((workflowId: string) => {
    socket.emit('workflow:resume', workflowId);
  }, [socket]);

  const stopWorkflow = useCallback((workflowId: string) => {
    socket.emit('workflow:stop', workflowId);
  }, [socket]);

  const markStepComplete = useCallback(
    (workflowId: string, stepId: string, success: boolean) => {
      socket.emit('workflow:stepComplete', {
        workflowId,
        stepId,
        success,
      });
    },
    [socket]
  );

  const createCollaborativeWorkflow = useCallback(
    (request: CollaborativeWorkflowRequest) => {
      socket.emit('workflow:createCollaborative', request);
    },
    [socket]
  );

  const approveStep = useCallback(
    (workflowId: string, stepId: string, comment?: string) => {
      socket.emit('workflow:approve', { workflowId, stepId, comment });
      useAgentStore.getState().removePendingApproval(workflowId, stepId);
    },
    [socket]
  );

  const rejectStep = useCallback(
    (workflowId: string, stepId: string, comment: string, retry?: boolean) => {
      socket.emit('workflow:reject', { workflowId, stepId, comment, retry });
      useAgentStore.getState().removePendingApproval(workflowId, stepId);
    },
    [socket]
  );

  const deleteWorkflow = useCallback((workflowId: string) => {
    socket.emit('workflow:delete', workflowId);
  }, [socket]);

  // === File System Actions ===
  const listDirs = useCallback(
    (dirPath: string): Promise<{ name: string; path: string }[]> => {
      return new Promise((resolve) => {
        const requestId = Math.random().toString(36).substring(7);
        const handler = (response: { requestId: string; dirs: { name: string; path: string }[] }) => {
          if (response.requestId === requestId) {
            socket.off('fs:listDirs:response', handler);
            resolve(response.dirs);
          }
        };
        socket.on('fs:listDirs:response', handler);
        socket.emit('fs:listDirs', { dirPath, requestId });
      });
    },
    [socket]
  );

  // === Settings Actions ===
  const getSettings = useCallback((): Promise<FullSettings> => {
    return new Promise((resolve) => {
      const handler = (settings: FullSettings) => {
        socket.off('settings:response', handler);
        resolve(settings);
      };
      socket.on('settings:response', handler);
      socket.emit('settings:get');
    });
  }, [socket]);

  const updateSettings = useCallback((settings: Partial<FullSettings>) => {
    socket.emit('settings:update', settings);
  }, [socket]);

  // === Agent Subscription Actions ===
  const subscribeAgent = useCallback((agentId: string) => {
    socket.emit('agent:subscribe', agentId);
  }, [socket]);

  const unsubscribeAgent = useCallback((agentId: string) => {
    socket.emit('agent:unsubscribe', agentId);
  }, [socket]);

  return {
    socket,
    createAgent,
    sendCommand,
    sendInput,
    resizeTerminal,
    removeAgent: removeAgentById,
    restartAgent,
    createWorkflow,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
    markStepComplete,
    createCollaborativeWorkflow,
    approveStep,
    rejectStep,
    deleteWorkflow,
    listDirs,
    getSettings,
    updateSettings,
    subscribeAgent,
    unsubscribeAgent,
  };
}
