import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import type { ClaudePlan, UserSettings } from '@/types';

export interface Settings {
  theme: 'dark' | 'light';
  terminalFontSize: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  maxLogEntries: number;
  socketUrl: string;
  projectDirs: string[];
}

const defaultSettings: Settings = {
  theme: 'dark',
  terminalFontSize: 13,
  autoScroll: true,
  showTimestamps: true,
  maxLogEntries: 100,
  socketUrl: 'http://localhost:3001',
  projectDirs: [
    '~/Documents/learn',
    '~/Documents/work',
  ],
};

export function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem('claude-cockpit-settings');
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {
    // Failed to load settings, use defaults
  }
  return defaultSettings;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem('claude-cockpit-settings', JSON.stringify(settings));
  } catch {
    // Failed to save settings
  }
}

// Claude Plan 選項
const CLAUDE_PLANS: { value: ClaudePlan; label: string; prompts: number }[] = [
  { value: 'pro', label: 'Pro', prompts: 40 },
  { value: 'max5', label: 'Max 5x ($100/月)', prompts: 200 },
  { value: 'max20', label: 'Max 20x ($200/月)', prompts: 800 },
  { value: 'custom', label: '自訂', prompts: 0 },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const { getSettings, updateSettings } = useSocket();

  // Claude Plan 設定
  const [claudeSettings, setClaudeSettings] = useState<UserSettings>({
    claudePlan: 'max20',
    customPromptLimit: undefined,
  });
  const [claudeSettingsLoading, setClaudeSettingsLoading] = useState(true);

  // 載入 Claude 設定
  useEffect(() => {
    getSettings().then((settings) => {
      setClaudeSettings(settings);
      setClaudeSettingsLoading(false);
    });
  }, [getSettings]);

  const updateClaudePlan = useCallback((plan: ClaudePlan) => {
    const newSettings: UserSettings = {
      ...claudeSettings,
      claudePlan: plan,
    };
    setClaudeSettings(newSettings);
    updateSettings(newSettings);
    setSaved(true);
  }, [claudeSettings, updateSettings]);

  const updateCustomLimit = useCallback((limit: number) => {
    const newSettings: UserSettings = {
      ...claudeSettings,
      customPromptLimit: limit,
    };
    setClaudeSettings(newSettings);
    updateSettings(newSettings);
    setSaved(true);
  }, [claudeSettings, updateSettings]);

  useEffect(() => {
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      setSaved(true);
      return newSettings;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
    setSaved(true);
  };

  return (
    <div className="h-full overflow-auto bg-slate-900/50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-200">Settings</h1>
          {saved && (
            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
              Saved!
            </span>
          )}
        </div>

        {/* Claude Plan Settings */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Claude Plan
          </h2>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
            <p className="text-xs text-slate-500 mb-4">
              選擇你的 Claude 方案以正確顯示 Prompt 使用量限制（每 5 小時窗口）
            </p>
            {claudeSettingsLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {CLAUDE_PLANS.map((plan) => (
                  <label
                    key={plan.value}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      claudeSettings.claudePlan === plan.value
                        ? 'bg-cyan-600/20 border border-cyan-500/50'
                        : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="claudePlan"
                      value={plan.value}
                      checked={claudeSettings.claudePlan === plan.value}
                      onChange={() => updateClaudePlan(plan.value)}
                      className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 focus:ring-cyan-500/50"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-200">
                        {plan.label}
                      </span>
                      {plan.value !== 'custom' && (
                        <span className="ml-2 text-xs text-slate-500">
                          (~{plan.prompts} prompts/5hr)
                        </span>
                      )}
                    </div>
                  </label>
                ))}

                {/* Custom limit input */}
                {claudeSettings.claudePlan === 'custom' && (
                  <div className="ml-7 mt-2">
                    <label className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Prompt 限制:</span>
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={claudeSettings.customPromptLimit ?? 100}
                        onChange={(e) => updateCustomLimit(parseInt(e.target.value) || 100)}
                        className="w-24 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                      <span className="text-xs text-slate-500">prompts / 5hr</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Appearance */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
            <SettingRow
              label="Theme"
              description="Choose between dark and light mode"
            >
              <select
                value={settings.theme}
                onChange={(e) =>
                  updateSetting('theme', e.target.value as 'dark' | 'light')
                }
                className="bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="dark">Dark</option>
                <option value="light">Light (Coming Soon)</option>
              </select>
            </SettingRow>

            <SettingRow
              label="Terminal Font Size"
              description="Font size for terminal output"
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={settings.terminalFontSize}
                  onChange={(e) =>
                    updateSetting('terminalFontSize', parseInt(e.target.value))
                  }
                  className="w-24"
                />
                <span className="text-sm text-slate-400 font-mono w-8">
                  {settings.terminalFontSize}px
                </span>
              </div>
            </SettingRow>
          </div>
        </section>

        {/* Behavior */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Behavior
          </h2>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
            <SettingRow
              label="Auto-scroll"
              description="Automatically scroll to latest output"
            >
              <Toggle
                enabled={settings.autoScroll}
                onChange={(value) => updateSetting('autoScroll', value)}
              />
            </SettingRow>

            <SettingRow
              label="Show Timestamps"
              description="Display timestamps in event log"
            >
              <Toggle
                enabled={settings.showTimestamps}
                onChange={(value) => updateSetting('showTimestamps', value)}
              />
            </SettingRow>

            <SettingRow
              label="Max Log Entries"
              description="Maximum number of event log entries to keep"
            >
              <input
                type="number"
                min="50"
                max="500"
                value={settings.maxLogEntries}
                onChange={(e) =>
                  updateSetting('maxLogEntries', parseInt(e.target.value))
                }
                className="w-20 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </SettingRow>
          </div>
        </section>

        {/* Project Directories */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Project Directories
          </h2>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
            <p className="text-xs text-slate-500 mb-3">
              建立 Agent 時可選擇的工作目錄
            </p>
            <div className="space-y-2 mb-3">
              {settings.projectDirs.map((dir, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dir}
                    onChange={(e) => {
                      const newDirs = [...settings.projectDirs];
                      newDirs[index] = e.target.value;
                      updateSetting('projectDirs', newDirs);
                    }}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  <button
                    onClick={() => {
                      const newDirs = settings.projectDirs.filter((_, i) => i !== index);
                      updateSetting('projectDirs', newDirs);
                    }}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                updateSetting('projectDirs', [...settings.projectDirs, '~/Documents/']);
              }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Directory
            </button>
          </div>
        </section>

        {/* Connection */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Connection
          </h2>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
            <SettingRow
              label="Socket URL"
              description="WebSocket server URL"
            >
              <input
                type="text"
                value={settings.socketUrl}
                onChange={(e) => updateSetting('socketUrl', e.target.value)}
                className="w-48 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </SettingRow>
          </div>
        </section>

        {/* Actions */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Actions
          </h2>
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
            <button
              onClick={resetSettings}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-600/30"
            >
              Reset to Defaults
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper Components

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-cyan-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
