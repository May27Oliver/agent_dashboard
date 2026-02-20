import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ClaudePlan = 'pro' | 'max5' | 'max20' | 'custom';

export interface ActiveProject {
  path: string;
  name: string;
  baseDir: string;
  baseDirLabel: string;
}

@Entity('user_settings')
export class UserSettingsEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, default: 'default' })
  id: string;

  // Appearance
  @Column({ type: 'varchar', length: 10, default: 'dark' })
  theme: 'dark' | 'light';

  @Column({ type: 'int', default: 13 })
  terminalFontSize: number;

  // Behavior
  @Column({ type: 'boolean', default: true })
  autoScroll: boolean;

  @Column({ type: 'boolean', default: true })
  showTimestamps: boolean;

  @Column({ type: 'int', default: 100 })
  maxLogEntries: number;

  // Connection
  @Column({ type: 'varchar', length: 255, default: 'http://localhost:3001' })
  socketUrl: string;

  // Project directories (array of strings)
  @Column({ type: 'jsonb', default: ['~/Documents/learn', '~/Documents/work'] })
  projectDirs: string[];

  // Active projects
  @Column({ type: 'jsonb', default: [] })
  activeProjects: ActiveProject[];

  // Expanded active projects (array of paths)
  @Column({ type: 'jsonb', default: [] })
  expandedActiveProjects: string[];

  // Claude Plan
  @Column({ type: 'varchar', length: 20, default: 'max20' })
  claudePlan: ClaudePlan;

  @Column({ type: 'int', nullable: true })
  customPromptLimit: number | null;

  // UI State - collapsed panels
  @Column({ type: 'jsonb', default: {} })
  collapsedPanels: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
