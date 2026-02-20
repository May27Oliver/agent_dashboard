import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentGateway } from './agent.gateway';
import { OutputBufferService } from './output-buffer.service';
import { AgentEntity } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AgentEntity])],
  providers: [AgentService, AgentGateway, OutputBufferService],
  exports: [AgentService, AgentGateway, OutputBufferService],
})
export class AgentModule {}
