import { create } from 'zustand';
import type { TabType } from '@/types';

export interface ActiveProject {
  path: string;
  name: string;
  baseDir: string; // 完整的基礎目錄路徑 (e.g., '/Users/.../learn')
  baseDirLabel: string; // 顯示用的標籤 (e.g., 'learn', 'work')
}

interface UIState {
  activeTab: TabType;
  sidebarCollapsed: boolean;
  selectedWorkflowId: string | null;
  expandedProjects: Set<string>; // 展開的專案路徑 (舊版，保留相容性)
  activeProjects: ActiveProject[]; // 活動專案列表
  expandedActiveProjects: Set<string>; // 展開的活動專案路徑
  showAddProjectPanel: boolean; // 顯示添加專案面板
  isCreatingWorkflow: boolean; // 是否正在創建新 workflow
  creatingWorkflowForProject: string | null; // 正在創建 workflow 的專案路徑

  // Actions
  setActiveTab: (tab: TabType) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedWorkflow: (id: string | null) => void;
  toggleProjectExpanded: (projectPath: string) => void;
  setProjectExpanded: (projectPath: string, expanded: boolean) => void;
  // 新增 Active Projects 相關 actions
  addActiveProject: (project: ActiveProject) => void;
  removeActiveProject: (path: string) => void;
  toggleActiveProjectExpanded: (path: string) => void;
  setShowAddProjectPanel: (show: boolean) => void;
  // Workflow creation actions
  startCreatingWorkflow: (projectPath: string) => void;
  cancelCreatingWorkflow: () => void;
}

// localStorage key for persisting active projects
const ACTIVE_PROJECTS_STORAGE_KEY = 'claude-cockpit-active-projects';
const EXPANDED_ACTIVE_PROJECTS_STORAGE_KEY = 'claude-cockpit-expanded-active-projects';

// Load active projects from localStorage
const loadActiveProjects = (): ActiveProject[] => {
  try {
    const stored = localStorage.getItem(ACTIVE_PROJECTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Load expanded active projects from localStorage
const loadExpandedActiveProjects = (): Set<string> => {
  try {
    const stored = localStorage.getItem(EXPANDED_ACTIVE_PROJECTS_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// Save active projects to localStorage
const saveActiveProjects = (projects: ActiveProject[]) => {
  try {
    localStorage.setItem(ACTIVE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Ignore storage errors
  }
};

// Save expanded active projects to localStorage
const saveExpandedActiveProjects = (expanded: Set<string>) => {
  try {
    localStorage.setItem(EXPANDED_ACTIVE_PROJECTS_STORAGE_KEY, JSON.stringify([...expanded]));
  } catch {
    // Ignore storage errors
  }
};

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  sidebarCollapsed: false,
  selectedWorkflowId: null,
  expandedProjects: new Set(),
  activeProjects: loadActiveProjects(),
  expandedActiveProjects: loadExpandedActiveProjects(),
  showAddProjectPanel: false,
  isCreatingWorkflow: false,
  creatingWorkflowForProject: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setSelectedWorkflow: (id) => set({
    selectedWorkflowId: id,
    // 選擇 workflow 時自動關閉創建模式
    isCreatingWorkflow: false,
    creatingWorkflowForProject: null,
  }),

  toggleProjectExpanded: (projectPath) =>
    set((state) => {
      const newExpanded = new Set(state.expandedProjects);
      if (newExpanded.has(projectPath)) {
        newExpanded.delete(projectPath);
      } else {
        newExpanded.add(projectPath);
      }
      return { expandedProjects: newExpanded };
    }),

  setProjectExpanded: (projectPath, expanded) =>
    set((state) => {
      const newExpanded = new Set(state.expandedProjects);
      if (expanded) {
        newExpanded.add(projectPath);
      } else {
        newExpanded.delete(projectPath);
      }
      return { expandedProjects: newExpanded };
    }),

  // Active Projects actions
  addActiveProject: (project) =>
    set((state) => {
      // Check if project already exists
      if (state.activeProjects.some((p) => p.path === project.path)) {
        return state;
      }
      const newProjects = [...state.activeProjects, project];
      saveActiveProjects(newProjects);
      // Auto-expand newly added project
      const newExpanded = new Set(state.expandedActiveProjects);
      newExpanded.add(project.path);
      saveExpandedActiveProjects(newExpanded);
      return {
        activeProjects: newProjects,
        expandedActiveProjects: newExpanded,
        showAddProjectPanel: false,
      };
    }),

  removeActiveProject: (path) =>
    set((state) => {
      const newProjects = state.activeProjects.filter((p) => p.path !== path);
      saveActiveProjects(newProjects);
      const newExpanded = new Set(state.expandedActiveProjects);
      newExpanded.delete(path);
      saveExpandedActiveProjects(newExpanded);
      return {
        activeProjects: newProjects,
        expandedActiveProjects: newExpanded,
      };
    }),

  toggleActiveProjectExpanded: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedActiveProjects);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      saveExpandedActiveProjects(newExpanded);
      return { expandedActiveProjects: newExpanded };
    }),

  setShowAddProjectPanel: (show) => set({ showAddProjectPanel: show }),

  startCreatingWorkflow: (projectPath) => set({
    isCreatingWorkflow: true,
    creatingWorkflowForProject: projectPath,
    selectedWorkflowId: null, // 清除選中的 workflow
  }),

  cancelCreatingWorkflow: () => set({
    isCreatingWorkflow: false,
    creatingWorkflowForProject: null,
  }),
}));
