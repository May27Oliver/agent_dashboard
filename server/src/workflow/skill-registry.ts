import { AgentRole, AgentSkill, RoleSkillMapping } from '../types';
import {
  commonSkills,
  pmSkills,
  defaultPmWorkflowSkill,
  uiuxSkills,
  defaultUiuxWorkflowSkill,
  rdSkills,
  defaultRdWorkflowSkill,
  qaSkills,
  defaultQaWorkflowSkill,
  reviewSkills,
  defaultReviewWorkflowSkill,
  testSkills,
  defaultTestWorkflowSkill,
  customSkills,
  defaultCustomWorkflowSkill,
} from './skills';

/**
 * SkillRegistry - 管理所有 Skills 的註冊和查詢
 */
export class SkillRegistry {
  private skills: Map<string, AgentSkill> = new Map();
  private roleSkillMappings: Map<AgentRole, RoleSkillMapping> = new Map();

  constructor() {
    this.registerDefaultSkills();
  }

  /**
   * 註冊預設的 Skills
   */
  private registerDefaultSkills(): void {
    // 註冊通用 Skills
    for (const skill of commonSkills) {
      this.registerSkill(skill);
    }

    // 註冊 PM Skills
    this.registerRoleSkills('PM', pmSkills, defaultPmWorkflowSkill);

    // 註冊 UIUX Skills
    this.registerRoleSkills('UIUX', uiuxSkills, defaultUiuxWorkflowSkill);

    // 註冊 RD Skills
    this.registerRoleSkills('RD', rdSkills, defaultRdWorkflowSkill);

    // 註冊 QA Skills
    this.registerRoleSkills('QA', qaSkills, defaultQaWorkflowSkill);

    // 註冊 REVIEW Skills
    this.registerRoleSkills('REVIEW', reviewSkills, defaultReviewWorkflowSkill);

    // 註冊 TEST Skills
    this.registerRoleSkills('TEST', testSkills, defaultTestWorkflowSkill);

    // 註冊 CUSTOM Skills
    this.registerRoleSkills('CUSTOM', customSkills, defaultCustomWorkflowSkill);
  }

  /**
   * 註冊單一 Skill
   */
  registerSkill(skill: AgentSkill): void {
    this.skills.set(skill.id, skill);
  }

  /**
   * 註冊 Role 的 Skills
   */
  private registerRoleSkills(
    role: AgentRole,
    skills: AgentSkill[],
    defaultWorkflowSkill: string,
  ): void {
    // 註冊每個 skill
    for (const skill of skills) {
      this.registerSkill(skill);
    }

    // 建立 Role -> Skills 映射
    const allSkillsForRole = [
      ...skills,
      // 加入通用 skills
      ...commonSkills,
    ];

    this.roleSkillMappings.set(role, {
      role,
      skills: allSkillsForRole,
      defaultWorkflowSkill,
    });
  }

  /**
   * 取得特定 Role 的所有 Skills
   */
  getSkillsForRole(role: AgentRole): AgentSkill[] {
    const mapping = this.roleSkillMappings.get(role);
    return mapping?.skills || [];
  }

  /**
   * 取得特定 Skill
   */
  getSkill(skillId: string): AgentSkill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 取得 Role 的預設 Workflow Skill
   */
  getDefaultWorkflowSkill(role: AgentRole): AgentSkill | undefined {
    const mapping = this.roleSkillMappings.get(role);
    if (!mapping) return undefined;

    return this.skills.get(mapping.defaultWorkflowSkill);
  }

  /**
   * 取得 Role 的預設 Workflow Skill ID
   */
  getDefaultWorkflowSkillId(role: AgentRole): string | undefined {
    const mapping = this.roleSkillMappings.get(role);
    return mapping?.defaultWorkflowSkill;
  }

  /**
   * 取得所有已註冊的 Skills
   */
  getAllSkills(): AgentSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 取得所有 Role 的 Skill 映射
   */
  getAllRoleSkillMappings(): RoleSkillMapping[] {
    return Array.from(this.roleSkillMappings.values());
  }

  /**
   * 根據 Role 取得預設輸出檔名
   */
  getDefaultOutputFileName(role: AgentRole): string {
    const skill = this.getDefaultWorkflowSkill(role);
    return skill?.outputFileName || 'output.md';
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistry();
