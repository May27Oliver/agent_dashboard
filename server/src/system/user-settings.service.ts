import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettingsEntity, ActiveProject, ClaudePlan } from '../entities/user-settings.entity';

export interface FullSettings {
  id: string;
  theme: 'dark' | 'light';
  terminalFontSize: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  maxLogEntries: number;
  socketUrl: string;
  projectDirs: string[];
  activeProjects: ActiveProject[];
  expandedActiveProjects: string[];
  claudePlan: ClaudePlan;
  customPromptLimit: number | null;
  collapsedPanels: Record<string, boolean>;
}

const DEFAULT_SETTINGS: Omit<FullSettings, 'id'> = {
  theme: 'dark',
  terminalFontSize: 13,
  autoScroll: true,
  showTimestamps: true,
  maxLogEntries: 100,
  socketUrl: 'http://localhost:3001',
  projectDirs: ['~/Documents/learn', '~/Documents/work'],
  activeProjects: [],
  expandedActiveProjects: [],
  claudePlan: 'max20',
  customPromptLimit: null,
  collapsedPanels: {},
};

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    @InjectRepository(UserSettingsEntity)
    private readonly settingsRepository: Repository<UserSettingsEntity>,
  ) {}

  async getSettings(id: string = 'default'): Promise<FullSettings> {
    let settings = await this.settingsRepository.findOne({ where: { id } });

    if (!settings) {
      // Create default settings
      settings = this.settingsRepository.create({
        id,
        ...DEFAULT_SETTINGS,
      });
      await this.settingsRepository.save(settings);
      this.logger.log(`Created default settings for id: ${id}`);
    }

    return this.toFullSettings(settings);
  }

  async updateSettings(id: string = 'default', partial: Partial<FullSettings>): Promise<FullSettings> {
    let settings = await this.settingsRepository.findOne({ where: { id } });

    if (!settings) {
      // Create with defaults + partial update
      settings = this.settingsRepository.create({
        id,
        ...DEFAULT_SETTINGS,
        ...partial,
      });
    } else {
      // Merge with existing settings
      Object.assign(settings, partial);
    }

    await this.settingsRepository.save(settings);
    this.logger.debug(`Updated settings for id: ${id}`);

    return this.toFullSettings(settings);
  }

  private toFullSettings(entity: UserSettingsEntity): FullSettings {
    return {
      id: entity.id,
      theme: entity.theme,
      terminalFontSize: entity.terminalFontSize,
      autoScroll: entity.autoScroll,
      showTimestamps: entity.showTimestamps,
      maxLogEntries: entity.maxLogEntries,
      socketUrl: entity.socketUrl,
      projectDirs: entity.projectDirs,
      activeProjects: entity.activeProjects,
      expandedActiveProjects: entity.expandedActiveProjects,
      claudePlan: entity.claudePlan,
      customPromptLimit: entity.customPromptLimit,
      collapsedPanels: entity.collapsedPanels,
    };
  }
}
