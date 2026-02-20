import { create } from 'zustand';
import type { SystemStats, EventLog, ConnectionStatus } from '@/types';

interface SystemState {
  stats: SystemStats | null;
  logs: EventLog[];
  connectionStatus: ConnectionStatus;
  maxLogs: number;

  // Actions
  setStats: (stats: SystemStats) => void;
  addLog: (log: EventLog) => void;
  clearLogs: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  stats: null,
  logs: [],
  connectionStatus: 'offline',
  maxLogs: 100,

  setStats: (stats) => set({ stats }),

  addLog: (log) =>
    set((state) => {
      // Check if log with same ID already exists to prevent duplicates
      if (state.logs.some((existingLog) => existingLog.id === log.id)) {
        return state;
      }
      const newLogs = [log, ...state.logs];
      // Keep only the most recent logs
      if (newLogs.length > state.maxLogs) {
        newLogs.pop();
      }
      return { logs: newLogs };
    }),

  clearLogs: () => set({ logs: [] }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
