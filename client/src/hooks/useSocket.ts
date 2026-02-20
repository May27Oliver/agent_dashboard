import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAgentStore } from '@/store/agentStore';
import { useSystemStore } from '@/store/systemStore';
import { useSettingsStore } from '@/store/settingsStore';
import { writeToTerminal } from '@/components/Terminal/XTerminal';
import type {
  Agent,
  AgentConfig,
  WorkflowDefinition,
  CollaborativeWorkflowRequest,
  ApprovalRequest,
  SystemStats,
  EventLog,
  FullSettings,
} from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Singleton socket instance
let socketInstance: Socket | null = null;
let isInitialized = false;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  useEffect(() => {
    // Only initialize event listeners once
    if (isInitialized) return;
    isInitialized = true;

    const socket = getSocket();
    useSystemStore.getState().setConnectionStatus('connecting');

    socket.on('connect', () => {
      useSystemStore.getState().setConnectionStatus('online');
    });

    socket.on('disconnect', () => {
      useSystemStore.getState().setConnectionStatus('offline');
    });

    // System events
    socket.on('system:stats', (stats: SystemStats) => {
      useSystemStore.getState().setStats(stats);
    });

    socket.on('system:log', (log: EventLog) => {
      useSystemStore.getState().addLog(log);
    });

    socket.on('agent:sync', (agents: Agent[]) => {
      useAgentStore.getState().syncAgents(agents);
    });

    socket.on('workflow:sync', (workflows: import('@/types').Workflow[]) => {
      useAgentStore.getState().syncWorkflows(workflows);
    });

    socket.on('agent:created', (agent) => {
      useAgentStore.getState().addAgent(agent);
    });

    socket.on('agent:updated', (agent) => {
      useAgentStore.getState().updateAgent(agent);
    });

    socket.on('agent:removed', (agentId) => {
      useAgentStore.getState().removeAgent(agentId);
    });

    socket.on('agent:restarted', (agent) => {
      useAgentStore.getState().updateAgent(agent);
    });

    socket.on('agent:output', (output: { agentId: string; data: string }) => {
      writeToTerminal(output.agentId, output.data);
    });

    socket.on('workflow:created', (workflow) => {
      useAgentStore.getState().addWorkflow(workflow);
    });

    socket.on('workflow:updated', (workflow) => {
      useAgentStore.getState().updateWorkflow(workflow);
    });

    socket.on('workflow:stepChanged', ({ workflowId, step }) => {
      useAgentStore.getState().updateWorkflowStep(workflowId, step);
    });

    socket.on('workflow:approvalRequired', (request: ApprovalRequest) => {
      useAgentStore.getState().addPendingApproval(request);
    });

    // Settings events
    socket.on('settings:updated', (settings: FullSettings) => {
      useSettingsStore.getState().setSettings(settings);
    });

    // Request initial settings on connect
    socket.on('connect', () => {
      socket.emit('settings:get');
    });

    socket.on('settings:response', (settings: FullSettings) => {
      useSettingsStore.getState().initFromServer(settings);
    });

    // If already connected, request settings immediately
    if (socket.connected) {
      socket.emit('settings:get');
    }

    // No cleanup - socket persists for app lifetime
  }, []);

  const createAgent = useCallback((config: AgentConfig) => {
    const socket = getSocket();
    socket.emit('agent:create', config);
  }, []);

  const sendCommand = useCallback((agentId: string, command: string) => {
    getSocket().emit('agent:command', { agentId, command });
  }, []);

  const sendInput = useCallback((agentId: string, data: string) => {
    getSocket().emit('agent:input', { agentId, data });
  }, []);

  const resizeTerminal = useCallback(
    (agentId: string, cols: number, rows: number) => {
      getSocket().emit('agent:resize', { agentId, cols, rows });
    },
    []
  );

  const removeAgentById = useCallback((agentId: string) => {
    getSocket().emit('agent:remove', agentId);
  }, []);

  const restartAgent = useCallback((agentId: string) => {
    getSocket().emit('agent:restart', agentId);
  }, []);

  const createWorkflow = useCallback((definition: WorkflowDefinition) => {
    getSocket().emit('workflow:create', definition);
  }, []);

  const startWorkflow = useCallback((workflowId: string) => {
    getSocket().emit('workflow:start', workflowId);
  }, []);

  const pauseWorkflow = useCallback((workflowId: string) => {
    getSocket().emit('workflow:pause', workflowId);
  }, []);

  const resumeWorkflow = useCallback((workflowId: string) => {
    getSocket().emit('workflow:resume', workflowId);
  }, []);

  const stopWorkflow = useCallback((workflowId: string) => {
    getSocket().emit('workflow:stop', workflowId);
  }, []);

  const markStepComplete = useCallback(
    (workflowId: string, stepId: string, success: boolean) => {
      getSocket().emit('workflow:stepComplete', {
        workflowId,
        stepId,
        success,
      });
    },
    []
  );

  const createCollaborativeWorkflow = useCallback(
    (request: CollaborativeWorkflowRequest) => {
      getSocket().emit('workflow:createCollaborative', request);
    },
    []
  );

  const approveStep = useCallback(
    (workflowId: string, stepId: string, comment?: string) => {
      getSocket().emit('workflow:approve', { workflowId, stepId, comment });
      useAgentStore.getState().removePendingApproval(workflowId, stepId);
    },
    []
  );

  const rejectStep = useCallback(
    (workflowId: string, stepId: string, comment: string, retry?: boolean) => {
      getSocket().emit('workflow:reject', { workflowId, stepId, comment, retry });
      useAgentStore.getState().removePendingApproval(workflowId, stepId);
    },
    []
  );

  const listDirs = useCallback(
    (dirPath: string): Promise<{ name: string; path: string }[]> => {
      return new Promise((resolve) => {
        const socket = getSocket();
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
    []
  );

  const getSettings = useCallback((): Promise<FullSettings> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      const handler = (settings: FullSettings) => {
        socket.off('settings:response', handler);
        resolve(settings);
      };
      socket.on('settings:response', handler);
      socket.emit('settings:get');
    });
  }, []);

  const updateSettings = useCallback((settings: Partial<FullSettings>) => {
    getSocket().emit('settings:update', settings);
  }, []);

  return {
    socket: getSocket(),
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
    listDirs,
    getSettings,
    updateSettings,
  };
}
