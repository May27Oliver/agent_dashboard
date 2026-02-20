import { create } from 'zustand';
import type { FullSettings, ActiveProject } from '@/types';

interface SettingsState {
  settings: FullSettings | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setSettings: (settings: FullSettings) => void;
  updateSettingLocal: <K extends keyof FullSettings>(key: K, value: FullSettings[K]) => void;
  initFromServer: (settings: FullSettings) => void;

  // Convenience getters/setters
  getCollapsedState: (key: string) => boolean;
  setCollapsedState: (key: string, collapsed: boolean) => Partial<FullSettings>;

  // Active projects helpers
  addActiveProjectLocal: (project: ActiveProject) => Partial<FullSettings> | null;
  removeActiveProjectLocal: (path: string) => Partial<FullSettings>;
  toggleExpandedActiveProject: (path: string) => Partial<FullSettings>;
}

const DEFAULT_SETTINGS: FullSettings = {
  id: 'default',
  theme: 'dark',
  terminalFontSize: 13,
  autoScroll: true,
  showTimestamps: true,
  maxLogEntries: 100,
  socketUrl: 'http://localhost:3001',
  projectDirs: ['~/Documents/learn', '~/Documents/work'],
  activeProjects: [],
  expandedActiveProjects: [],
  claudePlan: 'max20',
  customPromptLimit: null,
  collapsedPanels: {},
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,
  initialized: false,

  setSettings: (settings) => set({ settings: { ...DEFAULT_SETTINGS, ...settings } }),

  updateSettingLocal: (key, value) => {
    const current = get().settings;
    if (!current) return;
    set({
      settings: { ...current, [key]: value },
    });
  },

  initFromServer: (settings) => set({
    // Merge with defaults to ensure all fields exist
    settings: { ...DEFAULT_SETTINGS, ...settings },
    loading: false,
    initialized: true,
  }),

  getCollapsedState: (key) => {
    const settings = get().settings;
    return settings?.collapsedPanels?.[key] ?? false;
  },

  setCollapsedState: (key, collapsed) => {
    const current = get().settings;
    if (!current) return {};

    const newCollapsedPanels = {
      ...current.collapsedPanels,
      [key]: collapsed,
    };

    set({
      settings: { ...current, collapsedPanels: newCollapsedPanels },
    });

    return { collapsedPanels: newCollapsedPanels };
  },

  addActiveProjectLocal: (project) => {
    const current = get().settings;
    if (!current) return null;

    // Check if already exists
    if (current.activeProjects.some((p) => p.path === project.path)) {
      return null;
    }

    const newActiveProjects = [...current.activeProjects, project];
    const newExpandedActiveProjects = [...current.expandedActiveProjects, project.path];

    set({
      settings: {
        ...current,
        activeProjects: newActiveProjects,
        expandedActiveProjects: newExpandedActiveProjects,
      },
    });

    return {
      activeProjects: newActiveProjects,
      expandedActiveProjects: newExpandedActiveProjects,
    };
  },

  removeActiveProjectLocal: (path) => {
    const current = get().settings;
    if (!current) return {};

    const newActiveProjects = current.activeProjects.filter((p) => p.path !== path);
    const newExpandedActiveProjects = current.expandedActiveProjects.filter((p) => p !== path);

    set({
      settings: {
        ...current,
        activeProjects: newActiveProjects,
        expandedActiveProjects: newExpandedActiveProjects,
      },
    });

    return {
      activeProjects: newActiveProjects,
      expandedActiveProjects: newExpandedActiveProjects,
    };
  },

  toggleExpandedActiveProject: (path) => {
    const current = get().settings;
    if (!current) return {};

    const isExpanded = current.expandedActiveProjects.includes(path);
    const newExpandedActiveProjects = isExpanded
      ? current.expandedActiveProjects.filter((p) => p !== path)
      : [...current.expandedActiveProjects, path];

    set({
      settings: {
        ...current,
        expandedActiveProjects: newExpandedActiveProjects,
      },
    });

    return { expandedActiveProjects: newExpandedActiveProjects };
  },
}));
