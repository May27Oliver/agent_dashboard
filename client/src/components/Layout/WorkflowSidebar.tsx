import { useState, useEffect } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { useUIStore, type ActiveProject } from '@/store/uiStore';
import { loadSettings } from '@/pages/SettingsPage';
import type { Workflow } from '@/types';

interface WorkflowSidebarProps {
  onCreateWorkflow: (projectPath: string) => void;
  onListDirs?: (dirPath: string) => Promise<{ name: string; path: string }[]>;
}

const getWorkflowStatusIcon = (status: Workflow['status']) => {
  switch (status) {
    case 'running':
      return <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />;
    case 'completed':
      return <span className="text-green-400 text-xs">&#10003;</span>;
    case 'failed':
      return <span className="text-red-400 text-xs">&#10007;</span>;
    case 'paused':
      return <span className="w-2 h-2 bg-yellow-400 rounded-full" />;
    case 'awaiting_approval':
      return <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />;
    default:
      return <span className="w-2 h-2 bg-slate-500 rounded-full" />;
  }
};

const getWorkflowStatusColor = (status: Workflow['status']) => {
  switch (status) {
    case 'running':
      return 'text-green-400';
    case 'completed':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'paused':
      return 'text-yellow-400';
    case 'awaiting_approval':
      return 'text-amber-400';
    default:
      return 'text-slate-400';
  }
};

export function WorkflowSidebar({ onCreateWorkflow, onListDirs }: WorkflowSidebarProps) {
  const workflows = useAgentStore((state) => state.workflows);
  const selectedWorkflowId = useUIStore((state) => state.selectedWorkflowId);
  const setSelectedWorkflow = useUIStore((state) => state.setSelectedWorkflow);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const activeProjects = useUIStore((state) => state.activeProjects);
  const expandedActiveProjects = useUIStore((state) => state.expandedActiveProjects);
  const showAddProjectPanel = useUIStore((state) => state.showAddProjectPanel);
  const addActiveProject = useUIStore((state) => state.addActiveProject);
  const removeActiveProject = useUIStore((state) => state.removeActiveProject);
  const toggleActiveProjectExpanded = useUIStore((state) => state.toggleActiveProjectExpanded);
  const setShowAddProjectPanel = useUIStore((state) => state.setShowAddProjectPanel);

  const workflowArray = Array.from(workflows.values());

  // Get workflows for a specific project
  const getProjectWorkflows = (projectPath: string) => {
    return workflowArray.filter((w) => w.projectPath === projectPath);
  };

  // Get orphaned workflows (not belonging to any active project)
  const orphanedWorkflows = workflowArray.filter(
    (w) => !w.projectPath || !activeProjects.some((p) => p.path === w.projectPath)
  );

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-16' : 'w-72'
      } bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 relative`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10 border border-slate-600"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-3 h-3 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">&#129302;</span>
          {!sidebarCollapsed && 'Claude Cockpit'}
        </h1>
        {!sidebarCollapsed && <p className="text-xs text-slate-500 mt-1">Multi-Agent CLI Manager</p>}
      </div>

      {/* Active Projects Section */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-auto">
          {/* Section Header */}
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Projects
            </h2>
          </div>

          {/* Active Projects List */}
          {activeProjects.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-3xl mb-2">📁</div>
              <p className="text-sm text-slate-400">No projects added</p>
              <p className="text-xs text-slate-500 mt-1">
                Click &quot;Add Project&quot; to get started
              </p>
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {activeProjects.map((project) => (
                <ActiveProjectItem
                  key={project.path}
                  project={project}
                  workflows={getProjectWorkflows(project.path)}
                  isExpanded={expandedActiveProjects.has(project.path)}
                  selectedWorkflowId={selectedWorkflowId}
                  onToggleExpand={() => toggleActiveProjectExpanded(project.path)}
                  onRemove={() => removeActiveProject(project.path)}
                  onSelectWorkflow={setSelectedWorkflow}
                  onCreateWorkflow={() => onCreateWorkflow(project.path)}
                />
              ))}
            </div>
          )}

          {/* Add Project Button */}
          <div className="px-2 py-3">
            {showAddProjectPanel ? (
              <AddProjectPanel
                onListDirs={onListDirs}
                activeProjects={activeProjects}
                onAdd={addActiveProject}
                onCancel={() => setShowAddProjectPanel(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddProjectPanel(true)}
                className="w-full px-3 py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-700/50 hover:border-slate-600 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Project
              </button>
            )}
          </div>

          {/* Orphaned Workflows */}
          {orphanedWorkflows.length > 0 && (
            <div className="border-t border-slate-800 px-2 py-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
                Other Workflows ({orphanedWorkflows.length})
              </h3>
              <div className="space-y-1 max-h-32 overflow-auto">
                {orphanedWorkflows.map((workflow) => (
                  <WorkflowItem
                    key={workflow.id}
                    workflow={workflow}
                    isSelected={selectedWorkflowId === workflow.id}
                    onSelect={() => setSelectedWorkflow(workflow.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed state */}
      {sidebarCollapsed && (
        <div className="flex-1 flex flex-col items-center gap-2 p-2 pt-4">
          {activeProjects.length > 0 ? (
            activeProjects.map((project) => (
              <div
                key={project.path}
                className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-700 transition-colors"
                title={`${project.name} [${project.baseDirLabel}]`}
                onClick={() => {
                  toggleSidebar();
                  if (!expandedActiveProjects.has(project.path)) {
                    toggleActiveProjectExpanded(project.path);
                  }
                }}
              >
                📁
              </div>
            ))
          ) : (
            <div
              className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"
              title="No projects"
            >
              📁
            </div>
          )}
          <button
            onClick={() => {
              toggleSidebar();
              setShowAddProjectPanel(true);
            }}
            className="w-10 h-10 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg transition-colors flex items-center justify-center"
            title="Add Project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}

// Active Project Item Component
interface ActiveProjectItemProps {
  project: ActiveProject;
  workflows: Workflow[];
  isExpanded: boolean;
  selectedWorkflowId: string | null;
  onToggleExpand: () => void;
  onRemove: () => void;
  onSelectWorkflow: (id: string | null) => void;
  onCreateWorkflow: () => void;
}

function ActiveProjectItem({
  project,
  workflows,
  isExpanded,
  selectedWorkflowId,
  onToggleExpand,
  onRemove,
  onSelectWorkflow,
  onCreateWorkflow,
}: ActiveProjectItemProps) {
  // Count running workflows
  const runningCount = workflows.filter((w) => w.status === 'running').length;

  return (
    <div className="rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Project Header */}
      <div className="flex items-center gap-2 px-2 py-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
        {/* Expand/Collapse Toggle */}
        <button
          onClick={onToggleExpand}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Folder Icon */}
        <span className="text-slate-400">📁</span>

        {/* Project Name */}
        <button
          onClick={onToggleExpand}
          className="flex-1 text-left text-sm font-medium text-slate-200 truncate hover:text-white transition-colors"
          title={project.path}
        >
          {project.name}
        </button>

        {/* Running Indicator */}
        {runningCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {runningCount}
          </span>
        )}

        {/* Base Dir Label */}
        <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
          {project.baseDirLabel}
        </span>

        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          title="Remove from workspace"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Workflows List (Expanded) */}
      {isExpanded && (
        <div className="px-2 py-1.5 bg-slate-800/10 space-y-1">
          {workflows.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 py-2 text-center">
              No workflows
            </p>
          ) : (
            workflows.map((workflow) => (
              <WorkflowItem
                key={workflow.id}
                workflow={workflow}
                isSelected={selectedWorkflowId === workflow.id}
                onSelect={() => onSelectWorkflow(workflow.id)}
                indent
              />
            ))
          )}

          {/* New Workflow Button */}
          <button
            onClick={onCreateWorkflow}
            className="w-full px-3 py-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors flex items-center gap-1.5 pl-6"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workflow
          </button>
        </div>
      )}
    </div>
  );
}

// Add Project Panel Component
interface AddProjectPanelProps {
  onListDirs?: (dirPath: string) => Promise<{ name: string; path: string }[]>;
  activeProjects: ActiveProject[];
  onAdd: (project: ActiveProject) => void;
  onCancel: () => void;
}

function AddProjectPanel({ onListDirs, activeProjects, onAdd, onCancel }: AddProjectPanelProps) {
  const [projectDirs, setProjectDirs] = useState<string[]>([]);
  const [selectedBaseDir, setSelectedBaseDir] = useState<string>('');
  const [projects, setProjects] = useState<{ name: string; path: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load project directories from settings
  useEffect(() => {
    const settings = loadSettings();
    setProjectDirs(settings.projectDirs);
    if (settings.projectDirs.length > 0) {
      setSelectedBaseDir(settings.projectDirs[0]);
    }
  }, []);

  // Load projects when base directory changes
  useEffect(() => {
    if (!onListDirs || !selectedBaseDir) {
      setProjects([]);
      setSelectedProject('');
      return;
    }

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const dirs = await onListDirs(selectedBaseDir);
        // Filter out already active projects
        const filtered = dirs.filter(
          (d) => !activeProjects.some((ap) => ap.path === d.path)
        );
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        setProjects(filtered);
      } catch {
        setProjects([]);
      }
      setLoadingProjects(false);
    };

    loadProjects();
  }, [selectedBaseDir, onListDirs, activeProjects]);

  // Get base directory display name
  const getBaseDirLabel = (baseDir: string) => {
    const parts = baseDir.split('/');
    return parts[parts.length - 1] || baseDir;
  };

  const handleAdd = () => {
    if (!selectedProject) return;

    const projectInfo = projects.find((p) => p.path === selectedProject);
    if (!projectInfo) return;

    onAdd({
      path: projectInfo.path,
      name: projectInfo.name,
      baseDir: selectedBaseDir,
      baseDirLabel: getBaseDirLabel(selectedBaseDir),
    });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 space-y-3">
      {/* Directory Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Directory
        </label>
        <select
          value={selectedBaseDir}
          onChange={(e) => {
            setSelectedBaseDir(e.target.value);
            setSelectedProject('');
          }}
          className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          {projectDirs.map((dir) => (
            <option key={dir} value={dir}>
              {getBaseDirLabel(dir)}
            </option>
          ))}
        </select>
      </div>

      {/* Project Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Project
        </label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          disabled={loadingProjects || projects.length === 0}
          className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
        >
          <option value="">
            {loadingProjects ? 'Loading...' : projects.length === 0 ? 'No projects available' : 'Select project'}
          </option>
          {projects.map((project) => (
            <option key={project.path} value={project.path}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm font-medium rounded transition-colors border border-slate-600 hover:border-slate-500"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!selectedProject}
          className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// Workflow Item Component
interface WorkflowItemProps {
  workflow: Workflow;
  isSelected: boolean;
  onSelect: () => void;
  indent?: boolean;
}

function WorkflowItem({ workflow, isSelected, onSelect, indent }: WorkflowItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full px-3 py-1.5 flex items-center gap-2 text-left rounded transition-colors ${
        indent ? 'pl-6' : ''
      } ${
        isSelected
          ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30'
          : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
      }`}
    >
      {getWorkflowStatusIcon(workflow.status)}
      <span className="text-xs flex-1 truncate">
        {workflow.featureName || workflow.name}
      </span>
      <span className={`text-xs ${getWorkflowStatusColor(workflow.status)}`}>
        {workflow.status}
      </span>
    </button>
  );
}
