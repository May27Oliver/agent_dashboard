import { useState } from 'react';
import type { AgentRole, CollaborativeWorkflowRequest } from '@/types';

interface CollaborativeWorkflowCreatorProps {
  projectPath: string;
  onCreateWorkflow: (request: CollaborativeWorkflowRequest) => void;
  onCancel: () => void;
}

interface RoleConfig {
  role: AgentRole;
  label: string;
  description: string;
  outputFile: string;
  enabled: boolean;
  requiresApproval: boolean;
  customPrompt: string;
}

const DEFAULT_ROLES: RoleConfig[] = [
  {
    role: 'PM',
    label: 'PM',
    description: 'Product Manager - Creates requirement specification',
    outputFile: '01-requirement.md',
    enabled: true,
    requiresApproval: true,
    customPrompt: '',
  },
  {
    role: 'UIUX',
    label: 'UI/UX',
    description: 'Designer - Creates design specification',
    outputFile: '02-design.md',
    enabled: true,
    requiresApproval: true,
    customPrompt: '',
  },
  {
    role: 'RD',
    label: 'RD',
    description: 'Developer - Creates implementation plan',
    outputFile: '03-implementation.md',
    enabled: true,
    requiresApproval: true,
    customPrompt: '',
  },
  {
    role: 'QA',
    label: 'QA',
    description: 'QA Engineer - Creates test plan & cases',
    outputFile: '04-test-plan.md',
    enabled: true,
    requiresApproval: true,
    customPrompt: '',
  },
  {
    role: 'REVIEW',
    label: 'Review',
    description: 'Reviewer - Creates code review report',
    outputFile: '05-review.md',
    enabled: true,
    requiresApproval: true,
    customPrompt: '',
  },
];

export function CollaborativeWorkflowCreator({
  projectPath,
  onCreateWorkflow,
  onCancel,
}: CollaborativeWorkflowCreatorProps) {
  const [featureName, setFeatureName] = useState('');
  const [expandedRole, setExpandedRole] = useState<AgentRole | null>(null);
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>(DEFAULT_ROLES);

  const handleRoleConfigChange = (
    role: AgentRole,
    field: keyof RoleConfig,
    value: string | boolean
  ) => {
    setRoleConfigs((prev) =>
      prev.map((config) =>
        config.role === role ? { ...config, [field]: value } : config
      )
    );
  };

  const handleToggleRole = (role: AgentRole) => {
    setRoleConfigs((prev) =>
      prev.map((config) =>
        config.role === role ? { ...config, enabled: !config.enabled } : config
      )
    );
  };

  const handleSubmit = () => {
    if (!featureName.trim()) {
      return;
    }

    const enabledConfigs = roleConfigs.filter((c) => c.enabled);

    if (enabledConfigs.length === 0) {
      return;
    }

    const request: CollaborativeWorkflowRequest = {
      name: `Dev Workflow: ${featureName}`,
      featureName,
      projectPath,
      roles: enabledConfigs.map((config) => ({
        role: config.role,
        enabled: config.enabled,
        requiresApproval: config.requiresApproval,
        customPrompt: config.customPrompt || undefined,
      })),
    };

    onCreateWorkflow(request);
  };

  const isValid = featureName.trim() && roleConfigs.some((c) => c.enabled);

  const enabledCount = roleConfigs.filter((c) => c.enabled).length;

  // Extract project name from path
  const projectName = projectPath.split('/').pop() || projectPath;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <span className="text-2xl">&#9889;</span>
        Create Dev Workflow
      </h2>

      {/* Project Info */}
      <div className="mb-4 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">&#128193;</span>
          <span className="text-slate-300 font-medium">{projectName}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 font-mono">{projectPath}</p>
      </div>

      {/* Feature Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Feature Name
        </label>
        <input
          type="text"
          value={featureName}
          onChange={(e) => setFeatureName(e.target.value)}
          placeholder="e.g., user-authentication, shopping-cart"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <p className="text-xs text-slate-500 mt-1">
          This will create a spec/{featureName || 'feature-name'}/ directory
        </p>
      </div>

      {/* Role Configuration */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Workflow Steps ({enabledCount} enabled)
        </label>
        <div className="space-y-2">
          {roleConfigs.map((config) => {
            const isExpanded = expandedRole === config.role;

            return (
              <div
                key={config.role}
                className={`border rounded-lg transition-all ${
                  config.enabled
                    ? 'border-slate-600 bg-slate-800/50'
                    : 'border-slate-700/50 bg-slate-900/30'
                }`}
              >
                {/* Role Header */}
                <div className="p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={() => handleToggleRole(config.role)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        → {config.outputFile}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {config.description}
                    </p>
                  </div>

                  {config.enabled && (
                    <button
                      onClick={() =>
                        setExpandedRole(isExpanded ? null : config.role)
                      }
                      className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Advanced settings"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Expanded Settings */}
                {isExpanded && config.enabled && (
                  <div className="px-3 pb-3 pt-0 border-t border-slate-700/50">
                    <div className="mt-3 space-y-3">
                      {/* Approval Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.requiresApproval}
                          onChange={(e) =>
                            handleRoleConfigChange(
                              config.role,
                              'requiresApproval',
                              e.target.checked
                            )
                          }
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                        />
                        <span className="text-xs text-slate-400">
                          Require approval before next step
                        </span>
                      </label>

                      {/* Custom Prompt */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Custom Prompt (optional)
                        </label>
                        <textarea
                          value={config.customPrompt}
                          onChange={(e) =>
                            handleRoleConfigChange(
                              config.role,
                              'customPrompt',
                              e.target.value
                            )
                          }
                          placeholder="Leave empty for default prompt. Use {{featureName}}, {{specPath}}, {{outputPath}} variables."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info about auto-created agents */}
      <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
        <p className="text-sm text-cyan-300">
          <span className="font-medium">&#128161; Auto-create Agents:</span> Agents will be automatically created for each enabled role with naming pattern: <code className="bg-slate-800 px-1 rounded">{featureName || 'feature'}-[ROLE]</code>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Create Workflow
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">
          The workflow will execute enabled roles in order. Each step waits for approval before proceeding to the next.
          Agents and output files will be created in <code className="bg-slate-800 px-1 rounded">{projectPath}/spec/{featureName || 'feature-name'}/</code>
        </p>
      </div>
    </div>
  );
}
