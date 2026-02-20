import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowGateway } from './workflow.gateway';
import { AgentModule } from '../agent/agent.module';
import { WorkflowEntity } from '../entities';

@Module({
  imports: [forwardRef(() => AgentModule), TypeOrmModule.forFeature([WorkflowEntity])],
  providers: [WorkflowService, WorkflowGateway],
  exports: [WorkflowService, WorkflowGateway],
})
export class WorkflowModule {}
