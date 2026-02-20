import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from './agent/agent.module';
import { WorkflowModule } from './workflow/workflow.module';
import { SystemModule } from './system/system.module';
import { AppController } from './app.controller';
import { ProjectEntity, WorkflowEntity, AgentEntity, UserSettingsEntity } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'claude_cockpit',
      entities: [ProjectEntity, WorkflowEntity, AgentEntity, UserSettingsEntity],
      synchronize: true,
    }),
    SystemModule,
    AgentModule,
    WorkflowModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
