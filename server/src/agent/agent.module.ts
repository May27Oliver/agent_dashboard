import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentGateway } from './agent.gateway';
import { AgentEntity } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity])],
  providers: [AgentService, AgentGateway],
  exports: [AgentService, AgentGateway],
})
export class AgentModule {}
