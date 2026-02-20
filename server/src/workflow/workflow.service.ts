import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { AgentService } from '../agent/agent.service';
import { AgentGateway } from '../agent/agent.gateway';
import {
  Workflow,
  WorkflowDefinition,
  WorkflowStep,
  CollaborativeWorkflowDefinition,
  ApprovalRequest,
  AgentRole,
} from '../types';
import { getSpecManager } from './spec-manager';
import { CommandTemplate } from './command-template';
import { skillRegistry } from './skill-registry';
import { WorkflowEntity } from '../entities';

@Injectable()
export class WorkflowService implements OnModuleInit {
  private workflows: Map<string, Workflow> = new Map();
  private outputBuffers: Map<string, string> = new Map(); // agentId -> output buffer
  private workflowCallbacks: Map<string, (workflow: Workflow) => void> = new Map();
  private stepCallbacks: Map<string, (workflowId: string, step: WorkflowStep) => void> = new Map();
  private approvalCallbacks: Map<string, (request: ApprovalRequest) => void> = new Map();

  constructor(
    private readonly agentService: AgentService,
    @Inject(forwardRef(() => AgentGateway))
    private readonly agentGateway: AgentGateway,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
  ) {}

  async onModuleInit() {
    // 將 WorkflowService 注入到 AgentGateway
    this.agentGateway.setWorkflowService(this);

    // Server 重啟時，將運行中的 workflow 標記為 failed（因為 agents 已不存在）
    const runningWorkflows = await this.workflowRepository.find({
      where: [
        { status: 'running' },
        { status: 'paused' },
        { status: 'awaiting_approval' },
      ],
    });

    if (runningWorkflows.length > 0) {
      console.log(`[WorkflowService] Marking ${runningWorkflows.length} interrupted workflows as failed`);
      for (const wf of runningWorkflows) {
        await this.workflowRepository.update(wf.id, { status: 'failed' });
      }
    }

    // 載入持久化的 workflows 到內存
    const savedWorkflows = await this.workflowRepository.find();
    for (const entity of savedWorkflows) {
      const workflow: Workflow = {
        id: entity.id,
        name: entity.name,
        steps: [], // Steps 需要重新初始化
        status: entity.status as Workflow['status'],
        createdAt: entity.createdAt.getTime(),
        featureName: entity.featureName,
        projectPath: entity.projectPath,
      };
      this.workflows.set(entity.id, workflow);
    }
    console.log(`[WorkflowService] Restored ${savedWorkflows.length} workflows to memory`);
  }

  async getAllWorkflowsFromDb(): Promise<Workflow[]> {
    const entities = await this.workflowRepository.find();
    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      steps: [], // Steps 保持在記憶體中
      status: entity.status as Workflow['status'],
      createdAt: entity.createdAt.getTime(),
      featureName: entity.featureName,
      projectPath: entity.projectPath,
    }));
  }

  async createWorkflow(
    definition: WorkflowDefinition,
    onWorkflowUpdate: (workflow: Workflow) => void,
    onStepChange: (workflowId: string, step: WorkflowStep) => void,
  ): Promise<Workflow> {
    const workflow: Workflow = {
      id: definition.id || uuidv4(),
      name: definition.name,
      steps: definition.steps.map((step) => ({
        ...step,
        status: 'pending' as const,
      })),
      status: 'idle',
      createdAt: Date.now(),
      projectPath: definition.projectPath, // 設置專案路徑
    };

    this.workflows.set(workflow.id, workflow);
    this.workflowCallbacks.set(workflow.id, onWorkflowUpdate);
    this.stepCallbacks.set(workflow.id, onStepChange);

    // 保存到資料庫
    if (definition.projectPath) {
      const workflowEntity = this.workflowRepository.create({
        id: workflow.id,
        name: workflow.name,
        featureName: workflow.name,
        status: workflow.status,
        projectPath: definition.projectPath,
      });
      await this.workflowRepository.save(workflowEntity);
    }

    return workflow;
  }

  async createCollaborativeWorkflow(
    definition: CollaborativeWorkflowDefinition,
    projectPath: string,
    createdAgents: Map<string, { id: string }>,
    onWorkflowUpdate: (workflow: Workflow) => void,
    onStepChange: (workflowId: string, step: WorkflowStep) => void,
    onApprovalRequired: (request: ApprovalRequest) => void,
    preGeneratedWorkflowId?: string, // 可選的預先生成的 workflow ID
  ): Promise<Workflow> {
    const specManager = getSpecManager();

    // Create the spec directory
    const specDirectory = specManager.createSpecDirectory(definition.featureName);

    // Use pre-generated workflow ID if provided, otherwise generate new one
    const workflowId = preGeneratedWorkflowId || uuidv4();

    // Build steps with proper commands and artifacts
    const steps: WorkflowStep[] = definition.steps.map((stepDef, index) => {
      const role = stepDef.role;
      const inputFiles = specManager.getInputArtifactsForRole(definition.featureName, role);
      const outputPath = specManager.getOutputPath(definition.featureName, role);

      // 使用 skill 或預設 prompt 建立命令
      const command = CommandTemplate.buildWorkflowStepCommand(
        role,
        stepDef.skillId,
        definition.featureName,
        projectPath,
        specDirectory,
        inputFiles,
        outputPath,
        stepDef.command !== '' ? stepDef.command : undefined,
      );

      // Set up dependencies based on step order
      const dependsOn = index > 0 ? [definition.steps[index - 1].id] : [];

      // 取得 skill 設定
      const skillId = stepDef.skillId || skillRegistry.getDefaultWorkflowSkillId(role);
      const skill = skillId ? skillRegistry.getSkill(skillId) : undefined;

      return {
        id: stepDef.id,
        agentId: stepDef.agentId || '',
        command,
        dependsOn: stepDef.dependsOn || dependsOn,
        status: 'pending' as const,
        requiresApproval: stepDef.requiresApproval ?? true, // Default to requiring approval
        approvalStatus: stepDef.requiresApproval !== false ? 'pending' : 'not_required',
        inputArtifacts: inputFiles,
        outputArtifacts: [outputPath],
        role,
        // Skill 相關欄位
        skillId,
        skillConfig: stepDef.skillConfig || {
          outputFile: skill?.outputFileName || `${String(index + 1).padStart(2, '0')}-output.md`,
        },
      };
    });

    const workflow: Workflow = {
      id: workflowId,
      name: definition.name,
      steps,
      status: 'idle',
      createdAt: Date.now(),
      featureName: definition.featureName,
      specDirectory,
      projectPath, // 儲存專案路徑
      variables: {
        ...definition.variables,
        featureName: definition.featureName,
        specDirectory,
      },
      artifacts: [],
    };

    this.workflows.set(workflow.id, workflow);
    this.workflowCallbacks.set(workflow.id, onWorkflowUpdate);
    this.stepCallbacks.set(workflow.id, onStepChange);
    this.approvalCallbacks.set(workflow.id, onApprovalRequired);

    // 保存到資料庫
    const workflowEntity = this.workflowRepository.create({
      id: workflow.id,
      name: workflow.name,
      featureName: workflow.featureName || '',
      status: workflow.status,
      projectPath: projectPath,
    });
    await this.workflowRepository.save(workflowEntity);

    return workflow;
  }

  start(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status === 'running') {
      return false;
    }

    workflow.status = 'running';
    workflow.startedAt = Date.now();
    this.notifyWorkflowUpdate(workflow);

    // 註冊所有 agent 的完成回調
    this.registerAgentCompleteCallbacks(workflowId);

    this.executeNextStep(workflowId);
    return true;
  }

  pause(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'running') {
      return false;
    }

    workflow.status = 'paused';
    this.notifyWorkflowUpdate(workflow);
    return true;
  }

  resume(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'paused') {
      return false;
    }

    workflow.status = 'running';
    this.notifyWorkflowUpdate(workflow);
    this.executeNextStep(workflowId);
    return true;
  }

  stop(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    workflow.status = 'completed';
    workflow.completedAt = Date.now();
    this.notifyWorkflowUpdate(workflow);
    return true;
  }

  handleStepComplete(workflowId: string, stepId: string, success: boolean): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) return;

    if (!success) {
      step.status = 'failure';
      this.notifyStepChange(workflowId, step);

      if (step.onFailure) {
        const failureStep = workflow.steps.find((s) => s.id === step.onFailure);
        if (failureStep) {
          this.executeStep(workflowId, failureStep);
          return;
        }
      }
    } else {
      // Check if step requires approval
      if (step.requiresApproval && step.approvalStatus === 'pending') {
        step.status = 'awaiting_approval';
        workflow.status = 'awaiting_approval';
        this.notifyStepChange(workflowId, step);
        this.notifyWorkflowUpdate(workflow);

        // Emit approval required event
        this.notifyApprovalRequired(workflowId, step);
        return;
      }

      step.status = 'success';
      this.notifyStepChange(workflowId, step);

      if (step.onSuccess) {
        const successStep = workflow.steps.find((s) => s.id === step.onSuccess);
        if (successStep) {
          this.executeStep(workflowId, successStep);
          return;
        }
      }
    }

    // Check if workflow is complete
    const allCompleted = workflow.steps.every(
      (s) =>
        s.status === 'success' ||
        s.status === 'failure' ||
        s.status === 'skipped',
    );

    if (allCompleted) {
      const hasFailure = workflow.steps.some((s) => s.status === 'failure');
      workflow.status = hasFailure ? 'failed' : 'completed';
      workflow.completedAt = Date.now();
      this.notifyWorkflowUpdate(workflow);
    } else {
      this.executeNextStep(workflowId);
    }
  }

  approveStep(workflowId: string, stepId: string, comment?: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step || step.status !== 'awaiting_approval') return false;

    step.approvalStatus = 'approved';
    step.approvalComment = comment;
    step.status = 'success';
    workflow.status = 'running';

    this.notifyStepChange(workflowId, step);
    this.notifyWorkflowUpdate(workflow);

    // Record artifact if output exists
    if (step.outputArtifacts && step.outputArtifacts.length > 0 && step.role) {
      workflow.artifacts = workflow.artifacts || [];
      for (const filePath of step.outputArtifacts) {
        workflow.artifacts.push({
          id: uuidv4(),
          stepId: step.id,
          role: step.role,
          filePath,
          createdAt: Date.now(),
        });
      }
    }

    // Continue to next step
    this.executeNextStep(workflowId);
    return true;
  }

  rejectStep(
    workflowId: string,
    stepId: string,
    comment: string,
    retry: boolean = false,
  ): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step || step.status !== 'awaiting_approval') return false;

    step.approvalStatus = 'rejected';
    step.approvalComment = comment;

    if (retry) {
      // Re-run the step
      step.status = 'pending';
      step.approvalStatus = 'pending';
      workflow.status = 'running';
      this.notifyStepChange(workflowId, step);
      this.notifyWorkflowUpdate(workflow);
      this.executeStep(workflowId, step);
    } else {
      // Mark as failed and stop
      step.status = 'failure';
      workflow.status = 'failed';
      workflow.completedAt = Date.now();
      this.notifyStepChange(workflowId, step);
      this.notifyWorkflowUpdate(workflow);
    }

    return true;
  }

  // Capture agent output for workflow analysis
  // Limit buffer size to prevent memory issues with long-running agents
  private static readonly MAX_BUFFER_SIZE = 1024 * 1024; // 1MB

  captureOutput(agentId: string, data: string): void {
    const current = this.outputBuffers.get(agentId) || '';
    const newBuffer = (current + data).slice(-WorkflowService.MAX_BUFFER_SIZE);
    this.outputBuffers.set(agentId, newBuffer);
  }

  getAgentOutput(agentId: string): string {
    return this.outputBuffers.get(agentId) || '';
  }

  clearAgentOutput(agentId: string): void {
    this.outputBuffers.delete(agentId);
  }

  // Simple output analysis
  analyzeOutput(agentId: string): { success: boolean; reason?: string } {
    const output = this.getAgentOutput(agentId).toLowerCase();

    // Check for common failure patterns
    if (output.includes('error') || output.includes('failed') || output.includes('exception')) {
      return { success: false, reason: 'Error detected in output' };
    }

    // Check for npm test patterns
    if (output.includes('npm test') || output.includes('jest') || output.includes('mocha')) {
      if (output.includes('passed') || output.includes('✓')) {
        return { success: true };
      }
      if (output.includes('failed') || output.includes('✗')) {
        return { success: false, reason: 'Test failures detected' };
      }
    }

    // Default to success if no obvious errors
    return { success: true };
  }

  private executeNextStep(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'running') return;

    // Find next pending step with satisfied dependencies
    const nextStep = workflow.steps.find((step) => {
      if (step.status !== 'pending') return false;

      if (!step.dependsOn || step.dependsOn.length === 0) return true;

      return step.dependsOn.every((depId) => {
        const depStep = workflow.steps.find((s) => s.id === depId);
        return depStep?.status === 'success';
      });
    });

    if (nextStep) {
      this.executeStep(workflowId, nextStep);
    }
  }

  private executeStep(workflowId: string, step: WorkflowStep): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    step.status = 'running';
    workflow.currentStepId = step.id;
    this.notifyStepChange(workflowId, step);
    this.notifyWorkflowUpdate(workflow);

    // Clear previous output buffer for this agent
    this.clearAgentOutput(step.agentId);

    // Execute command on the agent
    this.agentService.executeCommand(step.agentId, step.command);
  }

  private async notifyWorkflowUpdate(workflow: Workflow): Promise<void> {
    // 更新資料庫中的狀態
    await this.workflowRepository.update(workflow.id, { status: workflow.status });

    const callback = this.workflowCallbacks.get(workflow.id);
    if (callback) {
      callback(workflow);
    }
  }

  private notifyStepChange(workflowId: string, step: WorkflowStep): void {
    const callback = this.stepCallbacks.get(workflowId);
    if (callback) {
      callback(workflowId, step);
    }
  }

  private notifyApprovalRequired(workflowId: string, step: WorkflowStep): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const callback = this.approvalCallbacks.get(workflowId);
    if (callback) {
      const request: ApprovalRequest = {
        workflowId,
        stepId: step.id,
        stepRole: step.role || 'CUSTOM',
        featureName: workflow.featureName || workflow.name,
        outputArtifacts: step.outputArtifacts || [],
        timestamp: Date.now(),
      };
      callback(request);
    }
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * 刪除 Workflow
   * 同時清理相關的 agents、callbacks 和資料庫記錄
   */
  async deleteWorkflow(workflowId: string): Promise<{ success: boolean; deletedAgentIds: string[] }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return { success: false, deletedAgentIds: [] };
    }

    // 如果 workflow 正在運行，先停止它
    if (workflow.status === 'running' || workflow.status === 'awaiting_approval') {
      workflow.status = 'failed';
    }

    // 收集所有要刪除的 agent IDs
    const agentIdsToDelete = new Set<string>();

    // 1. 從 workflow steps 中收集
    for (const step of workflow.steps) {
      if (step.agentId) {
        agentIdsToDelete.add(step.agentId);
      }
    }

    // 2. 從 agentService 中查找所有屬於此 workflow 的 agents
    const workflowAgents = this.agentService.getAgentsByWorkflowId(workflowId);
    for (const agent of workflowAgents) {
      agentIdsToDelete.add(agent.id);
    }

    // 刪除所有相關的 agents
    const deletedAgentIds: string[] = [];
    for (const agentId of agentIdsToDelete) {
      try {
        await this.agentService.removeAgent(agentId);
        deletedAgentIds.push(agentId);
        console.log(`[WorkflowService] Deleted agent: ${agentId}`);
      } catch (e) {
        // Agent 可能已經不存在，忽略錯誤
      }
    }

    // 從記憶體中移除 workflow
    this.workflows.delete(workflowId);
    this.workflowCallbacks.delete(workflowId);
    this.stepCallbacks.delete(workflowId);
    this.approvalCallbacks.delete(workflowId);

    // 從資料庫中刪除
    await this.workflowRepository.delete(workflowId);

    console.log(`[WorkflowService] Deleted workflow: ${workflowId} with ${deletedAgentIds.length} agents`);
    return { success: true, deletedAgentIds };
  }

  /**
   * 根據 agentId 找到對應的 workflow 和 step
   */
  findStepByAgentId(agentId: string): { workflow: Workflow | null; step: WorkflowStep | null } {
    for (const workflow of this.workflows.values()) {
      const step = workflow.steps.find((s) => s.agentId === agentId);
      if (step) {
        return { workflow, step };
      }
    }
    return { workflow: null, step: null };
  }

  /**
   * 處理 Agent 完成事件
   * 當 Agent PTY 結束時，自動驗證輸出並觸發 step 完成
   */
  handleAgentComplete(agentId: string, exitCode: number): void {
    const { workflow, step } = this.findStepByAgentId(agentId);
    if (!workflow || !step) {
      console.log(`[WorkflowService] Agent ${agentId} not found in any workflow`);
      return;
    }

    // 只處理 running 狀態的 step
    if (step.status !== 'running') {
      console.log(`[WorkflowService] Step ${step.id} is not running (status: ${step.status})`);
      return;
    }

    console.log(`[WorkflowService] Agent ${agentId} completed with exit code ${exitCode}`);

    // 基本成功判斷：exit code 為 0
    let success = exitCode === 0;

    // 如果有 skillConfig，驗證輸出檔案是否存在
    if (success && step.skillConfig?.outputFile && workflow.projectPath) {
      const specManager = getSpecManager();
      const outputPath = step.outputArtifacts?.[0] ||
        specManager.getOutputPath(workflow.featureName || '', step.role || 'CUSTOM');

      // 檢查檔案是否存在
      if (fs.existsSync(outputPath)) {
        console.log(`[WorkflowService] Output file verified: ${outputPath}`);
        // 確保 outputArtifacts 包含檔案路徑
        if (!step.outputArtifacts?.includes(outputPath)) {
          step.outputArtifacts = step.outputArtifacts || [];
          step.outputArtifacts.push(outputPath);
        }
      } else {
        console.log(`[WorkflowService] Output file not found: ${outputPath}`);
        // 根據 skill 類型決定是否視為失敗
        const skill = step.skillId ? skillRegistry.getSkill(step.skillId) : null;
        if (skill?.category === 'delivery' || skill?.category === 'analysis') {
          // 分析和交付類 skill 必須有輸出
          success = false;
        }
      }
    }

    // 額外的輸出分析（檢查錯誤訊息）
    if (success) {
      const outputAnalysis = this.analyzeOutput(agentId);
      if (!outputAnalysis.success) {
        console.log(`[WorkflowService] Output analysis failed: ${outputAnalysis.reason}`);
        success = false;
      }
    }

    // 觸發 step 完成處理
    this.handleStepComplete(workflow.id, step.id, success);
  }

  /**
   * 註冊所有 workflow agents 的完成回調
   * 在 workflow 啟動時調用
   */
  registerAgentCompleteCallbacks(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    for (const step of workflow.steps) {
      if (step.agentId) {
        this.agentService.registerAgentCompleteCallback(
          step.agentId,
          (agentId, exitCode) => this.handleAgentComplete(agentId, exitCode),
        );
      }
    }
  }
}
