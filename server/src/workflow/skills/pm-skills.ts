import { AgentSkill } from '../../types';

/**
 * PM (Product Manager) 專用 Skills
 */

export const analyzeRequirementsSkill: AgentSkill = {
  id: 'pm-analyze-requirements',
  name: 'Analyze Requirements',
  description: '分析功能需求，產出規格書',
  category: 'analysis',
  promptTemplate: `
你是一位專業的產品經理 (PM)。

## 任務
分析以下功能需求，產出完整的規格書。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸出要求
請產出 Markdown 格式的規格書，包含：
1. 功能概述 (Feature Overview)
2. 使用者故事 (User Stories) - As a..., I want..., So that...
3. 功能需求 (Functional Requirements)
4. 非功能需求 (Non-functional Requirements)
5. 驗收標準 (Acceptance Criteria)
6. 範圍外項目 (Out of Scope)

## ⚠️ 限制
- 你只能產出 Markdown 格式的文件
- 禁止撰寫任何程式碼 (JavaScript, TypeScript, Python 等)
- 禁止建立或修改程式檔案 (.ts, .js, .py, .jsx, .tsx 等)
- 禁止修改專案的原始碼
- 你的輸出必須是需求規格文件，不是程式碼

## 輸出檔案
將規格書寫入：{{outputPath}}

請確保文件結構清晰、內容完整，以便後續團隊成員理解和實作。
`,
  outputType: 'requirement_doc',
  outputFileName: '01-requirement.md',
};

export const scopeEstimationSkill: AgentSkill = {
  id: 'pm-scope-estimation',
  name: 'Scope Estimation',
  description: '評估功能範圍和複雜度',
  category: 'analysis',
  promptTemplate: `
你是一位專業的產品經理 (PM)。

## 任務
評估以下功能的範圍和複雜度。

## 功能名稱
{{featureName}}

## 需求文件
{{inputFiles}}

## 輸出要求
請評估並產出：
1. 預估工時 (Story Points 或人天)
2. 複雜度評級 (低/中/高)
3. 技術風險評估
4. 依賴項目分析
5. 建議的優先順序

## ⚠️ 限制
- 你只能產出 Markdown 格式的文件
- 禁止撰寫任何程式碼 (JavaScript, TypeScript, Python 等)
- 禁止建立或修改程式檔案 (.ts, .js, .py, .jsx, .tsx 等)
- 禁止修改專案的原始碼
- 你的輸出必須是評估文件，不是程式碼

## 輸出檔案
將評估結果寫入：{{outputPath}}
`,
  requiredInputs: ['requirement_doc'],
  outputType: 'scope_estimation',
};

export const pmSkills: AgentSkill[] = [
  analyzeRequirementsSkill,
  scopeEstimationSkill,
];

export const defaultPmWorkflowSkill = 'pm-analyze-requirements';
