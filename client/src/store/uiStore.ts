import { create } from 'zustand';
import type { TabType } from '@/types';

interface UIState {
  activeTab: TabType;
  sidebarCollapsed: boolean;
  selectedWorkflowId: string | null;
  expandedProjects: Set<string>; // 展開的專案路徑 (舊版，保留相容性)
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
  setShowAddProjectPanel: (show: boolean) => void;
  // Workflow creation actions
  startCreatingWorkflow: (projectPath: string) => void;
  cancelCreatingWorkflow: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  sidebarCollapsed: false,
  selectedWorkflowId: null,
  expandedProjects: new Set(),
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
