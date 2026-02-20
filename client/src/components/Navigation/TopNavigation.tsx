import { useUIStore } from '@/store/uiStore';
import { useSystemStore } from '@/store/systemStore';
import { Clock } from './Clock';
import { ConnectionIndicator } from './ConnectionIndicator';
import type { TabType } from '@/types';

const tabs: { id: TabType; label: string }[] = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'settings', label: 'SETTINGS' },
];

export function TopNavigation() {
  const { activeTab, setActiveTab } = useUIStore();
  const { connectionStatus } = useSystemStore();

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-6">
      {/* Left: Logo + Version */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Claude Cockpit
            </h1>
          </div>
        </div>
        <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-2 py-0.5 rounded">
          v1.0.0
        </span>
      </div>

      {/* Center: Tab Navigation */}
      <nav className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium tracking-wide rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right: Clock + Connection Status */}
      <div className="flex items-center gap-6">
        <Clock />
        <ConnectionIndicator status={connectionStatus} />
      </div>
    </header>
  );
}
