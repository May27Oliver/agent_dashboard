import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
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

// === 細粒度 Selectors ===
// 使用這些 selectors 可以減少不必要的組件重新渲染

/**
 * 僅訂閱連線狀態
 */
export const useConnectionStatus = () =>
  useSystemStore((state) => state.connectionStatus);

/**
 * 僅訂閱 CPU 和記憶體使用率
 */
export const useCpuMemory = () =>
  useSystemStore(
    useShallow((state) =>
      state.stats
        ? { cpu: state.stats.cpu, memory: state.stats.memory }
        : null
    )
  );

/**
 * 僅訂閱活躍 PTY 數量
 */
export const useActivePty = () =>
  useSystemStore((state) => state.stats?.activePty ?? 0);

/**
 * 僅訂閱 WebSocket 連線數
 */
export const useWsConnections = () =>
  useSystemStore((state) => state.stats?.wsConnections ?? 0);

/**
 * 僅訂閱 Claude 使用統計
 */
export const useClaudeUsage = () =>
  useSystemStore(useShallow((state) => state.stats?.claudeUsage ?? null));

/**
 * 僅訂閱 Rate Limit 資訊
 */
export const useRateLimit = () =>
  useSystemStore(useShallow((state) => state.stats?.rateLimit ?? null));

/**
 * 僅訂閱日誌列表
 */
export const useLogs = () =>
  useSystemStore((state) => state.logs);
