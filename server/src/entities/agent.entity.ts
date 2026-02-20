import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('agents')
export class AgentEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  role: string; // PM | UIUX | RD | TEST | REVIEW | QA | CUSTOM

  @Column({ default: 'idle' })
  status: string; // idle | running | success | error | waiting

  @Column({ nullable: true })
  cwd: string;

  @Column({ nullable: true })
  workflowId: string;

  @CreateDateColumn()
  createdAt: Date;
}
