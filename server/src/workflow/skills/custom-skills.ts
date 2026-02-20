import { AgentSkill } from '../../types';

/**
 * CUSTOM (Custom Role) 專用 Skills
 */

export const genericTaskSkill: AgentSkill = {
  id: 'custom-generic-task',
  name: 'Generic Task',
  description: '執行通用任務',
  category: 'creation',
  promptTemplate: `
## 任務
完成以下功能的指定任務。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸入文件
{{inputFiles}}

## 輸出要求
請完成任務並產出相關文件。

## 輸出檔案
將產出寫入：{{outputPath}}
`,
  outputType: 'custom_output',
  outputFileName: 'custom-output.md',
};

export const customSkills: AgentSkill[] = [
  genericTaskSkill,
];

export const defaultCustomWorkflowSkill = 'custom-generic-task';
