import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('workflows')
export class WorkflowEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  featureName: string;

  @Column({ default: 'idle' })
  status: string; // idle | running | completed | failed | paused | awaiting_approval

  @Column()
  projectPath: string;

  @CreateDateColumn()
  createdAt: Date;
}
