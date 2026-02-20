import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowService } from './workflow.service';
import { AgentService } from '../agent/agent.service';
import { skillRegistry } from './skill-registry';
import {
  Workflow,
  WorkflowDefinition,
  WorkflowStep,
  CollaborativeWorkflowDefinition,
  CollaborativeWorkflowRequest,
  ApprovalRequest,
  Agent,
  TerminalOutput,
  AgentSkill,
} from '../types';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
})
export class WorkflowGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly agentService: AgentService,
  ) {}

  @SubscribeMessage('workflow:create')
  handleCreateWorkflow(@MessageBody() definition: WorkflowDefinition): Workflow {
    const workflow = this.workflowService.createWorkflow(
      definition,
      (updatedWorkflow) => {
        this.server.emit('workflow:updated', updatedWorkflow);
      },
      (workflowId, step) => {
        this.server.emit('workflow:stepChanged', { workflowId, step });
      },
    );

    this.server.emit('workflow:created', workflow);
    return workflow;
  }

  @SubscribeMessage('workflow:start')
  handleStartWorkflow(@MessageBody() workflowId: string): boolean {
    return this.workflowService.start(workflowId);
  }

  @SubscribeMessage('workflow:pause')
  handlePauseWorkflow(@MessageBody() workflowId: string): boolean {
    return this.workflowService.pause(workflowId);
  }

  @SubscribeMessage('workflow:resume')
  handleResumeWorkflow(@MessageBody() workflowId: string): boolean {
    return this.workflowService.resume(workflowId);
  }

  @SubscribeMessage('workflow:stop')
  handleStopWorkflow(@MessageBody() workflowId: string): boolean {
    return this.workflowService.stop(workflowId);
  }

  @SubscribeMessage('workflow:stepComplete')
  handleStepComplete(
    @MessageBody() payload: { workflowId: string; stepId: string; success: boolean },
  ): void {
    this.workflowService.handleStepComplete(
      payload.workflowId,
      payload.stepId,
      payload.success,
    );
  }

  @SubscribeMessage('workflow:list')
  handleListWorkflows(): Workflow[] {
    return this.workflowService.getAllWorkflows();
  }

  @SubscribeMessage('workflow:get')
  handleGetWorkflow(@MessageBody() workflowId: string): Workflow | undefined {
    return this.workflowService.getWorkflow(workflowId);
  }

  @SubscribeMessage('workflow:createCollaborative')
  async handleCreateCollaborativeWorkflow(
    @MessageBody() request: CollaborativeWorkflowRequest,
  ): Promise<Workflow> {
    // 先生成 workflow ID，這樣 agents 可以在創建時關聯到 workflow
    const workflowId = uuidv4();

    // 為每個啟用的角色自動建立 Agent
    const createdAgents: Map<string, Agent> = new Map();
    const enabledRoles = request.roles.filter((r) => r.enabled);

    for (const roleConfig of enabledRoles) {
      const agentName = `${request.featureName}-${roleConfig.role}`;
      const agent = await this.agentService.createAgent(
        {
          name: agentName,
          role: roleConfig.role,
          cwd: request.projectPath,
          useClaudeCli: true,
          workflowId, // 傳入預先生成的 workflow ID
        },
        (agentId, data) => {
          const output: TerminalOutput = {
            agentId,
            data,
            timestamp: Date.now(),
          };
          this.server.emit('agent:output', output);
          // 同時捕獲輸出用於 workflow 分析
          this.workflowService.captureOutput(agentId, data);
        },
        (updatedAgent) => {
          this.server.emit('agent:updated', updatedAgent);
        },
      );

      createdAgents.set(roleConfig.role, agent);
      this.server.emit('agent:created', agent);
    }

    // 將 request 轉換為 CollaborativeWorkflowDefinition，並填入 agentId 和 skill 資訊
    const steps = enabledRoles.map((roleConfig, index) => {
      // 取得這個 Role 的預設 workflow skill
      const skill: AgentSkill | undefined = skillRegistry.getDefaultWorkflowSkill(roleConfig.role);
      const skillId = skill?.id || skillRegistry.getDefaultWorkflowSkillId(roleConfig.role);

      return {
        id: `step-${index + 1}`,
        agentId: createdAgents.get(roleConfig.role)?.id || '',
        role: roleConfig.role,
        command: roleConfig.customPrompt || '',
        requiresApproval: roleConfig.requiresApproval,
        dependsOn: index > 0 ? [`step-${index}`] : [],
        // 新增 skill 相關資訊
        skillId,
        skillConfig: {
          outputFile: skill?.outputFileName || `${String(index + 1).padStart(2, '0')}-output.md`,
        },
      };
    });

    const definition: CollaborativeWorkflowDefinition = {
      name: request.name || `Dev Workflow: ${request.featureName}`,
      featureName: request.featureName,
      steps,
    };

    const workflow = await this.workflowService.createCollaborativeWorkflow(
      definition,
      request.projectPath,
      createdAgents,
      (updatedWorkflow) => {
        this.server.emit('workflow:updated', updatedWorkflow);
      },
      (wfId, step) => {
        this.server.emit('workflow:stepChanged', { workflowId: wfId, step });
      },
      (approvalRequest) => {
        this.server.emit('workflow:approvalRequired', approvalRequest);
      },
      workflowId, // 傳入預先生成的 workflow ID
    );

    this.server.emit('workflow:created', workflow);
    return workflow;
  }

  @SubscribeMessage('workflow:approve')
  handleApproveStep(
    @MessageBody() payload: { workflowId: string; stepId: string; comment?: string },
  ): boolean {
    return this.workflowService.approveStep(
      payload.workflowId,
      payload.stepId,
      payload.comment,
    );
  }

  @SubscribeMessage('workflow:reject')
  handleRejectStep(
    @MessageBody()
    payload: {
      workflowId: string;
      stepId: string;
      comment: string;
      retry?: boolean;
    },
  ): boolean {
    return this.workflowService.rejectStep(
      payload.workflowId,
      payload.stepId,
      payload.comment,
      payload.retry,
    );
  }

}
