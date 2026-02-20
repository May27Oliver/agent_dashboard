import { useState, useEffect } from 'react';
import { useSystemStore } from '@/store/systemStore';
import { CircularGauge } from './CircularGauge';

const STORAGE_KEY = 'dashboard-panel-collapsed';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function getCollapsedState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setCollapsedState(key: string, collapsed: boolean) {
  try {
    const state = getCollapsedState();
    state[key] = collapsed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}

export function SystemStatusPanel() {
  const { stats } = useSystemStore();
  const [isCollapsed, setIsCollapsed] = useState(() => getCollapsedState()['system-status'] ?? false);

  useEffect(() => {
    setCollapsedState('system-status', isCollapsed);
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  if (!stats) {
    return (
      <div className={`bg-slate-800/50 rounded-lg border border-slate-700/50 ${!isCollapsed ? 'min-h-[380px]' : ''}`}>
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors rounded-t-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-inset"
          aria-expanded={!isCollapsed}
          aria-controls="system-status-content"
        >
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            System Status
          </h3>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          id="system-status-content"
          className={`transition-all duration-250 ease-out overflow-hidden ${
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
          }`}
        >
          <div className="flex items-center justify-center h-32 px-4 pb-4">
            <div className="animate-pulse text-slate-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate percentages for PTY and WS (assuming max of 10 for visual purposes)
  const ptyPercentage = Math.min(100, (stats.activePty / 10) * 100);
  const wsPercentage = Math.min(100, (stats.wsConnections / 10) * 100);

  return (
    <div className={`bg-slate-800/50 rounded-lg border border-slate-700/50 ${!isCollapsed ? 'min-h-[380px]' : ''}`}>
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors rounded-t-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-inset"
        aria-expanded={!isCollapsed}
        aria-controls="system-status-content"
      >
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          System Status
        </h3>
        <svg
          className={`w-4 h-4 text-slate-400 hover:text-cyan-400 transition-all duration-200 ${
            isCollapsed ? '-rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id="system-status-content"
        className={`transition-all duration-250 ease-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
        }`}
        aria-hidden={isCollapsed}
      >
        <div className="px-4 pb-4">
          {/* Gauges */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <CircularGauge value={stats.cpu} label="CPU" color="cyan" size="sm" />
            <CircularGauge value={stats.memory} label="Memory" color="blue" size="sm" />
            <CircularGauge value={ptyPercentage} label="PTY" color="green" size="sm" showValue={false} />
            <CircularGauge value={wsPercentage} label="WS" color="orange" size="sm" showValue={false} />
          </div>

          {/* Stats */}
          <div className="space-y-2 pt-3 border-t border-slate-700/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Active PTY</span>
              <span className="text-green-400 font-mono">{stats.activePty}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">WS Connections</span>
              <span className="text-orange-400 font-mono">{stats.wsConnections}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Uptime</span>
              <span className="text-cyan-400 font-mono">{formatUptime(stats.uptime)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
