import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  @PrimaryColumn()
  path: string;

  @Column()
  name: string;

  @Column()
  baseDir: string;

  @Column()
  baseDirLabel: string;

  @CreateDateColumn()
  createdAt: Date;
}
