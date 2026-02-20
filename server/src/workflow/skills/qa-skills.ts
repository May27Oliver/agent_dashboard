import { AgentSkill } from '../../types';

/**
 * QA (Quality Assurance) 專用 Skills
 */

export const analyzeTestplanSkill: AgentSkill = {
  id: 'qa-analyze-testplan',
  name: 'Analyze Test Plan',
  description: '分析需求，產出測試計畫',
  category: 'analysis',
  promptTemplate: `
你是一位專業的 QA 工程師。

## 任務
基於需求規格和設計文件，產出完整的測試計畫。

## 功能名稱
{{featureName}}

## 輸入文件 (需求規格、設計、實作計畫)
{{inputFiles}}

## 輸出要求
請產出 Markdown 格式的測試計畫，包含：
1. 測試策略 (Test Strategy)
2. 測試範圍 (Test Scope)
3. 測試案例 (Test Cases) - 依功能區域分類
   - 測試案例 ID
   - 測試描述
   - 前置條件
   - 測試步驟
   - 預期結果
4. 邊界條件和極端案例 (Edge Cases and Boundary Conditions)
5. 整合測試情境 (Integration Test Scenarios)
6. 效能測試考量 (Performance Test Considerations)
7. 驗收測試清單 (Acceptance Test Checklist)

## ⚠️ 限制
- 你只能產出 Markdown 格式的測試計畫文件
- 禁止撰寫或修改功能程式碼
- 你可以描述測試案例，但不能撰寫自動化測試腳本
- 禁止修改專案的原始碼

## 輸出檔案
將測試計畫寫入：{{outputPath}}

請確保測試計畫覆蓋所有需求中的驗收標準。
`,
  requiredInputs: ['requirement_doc', 'design_doc', 'implementation_plan'],
  outputType: 'test_plan',
  outputFileName: '04-test-plan.md',
};

export const executeTestsSkill: AgentSkill = {
  id: 'qa-execute-tests',
  name: 'Execute Tests',
  description: '執行測試並產出測試報告',
  category: 'creation',
  promptTemplate: `
你是一位專業的 QA 工程師。

## 任務
根據測試計畫，執行測試並產出測試報告。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸入文件 (測試計畫)
{{inputFiles}}

## 輸出要求
請執行測試並產出測試報告，包含：
1. 測試執行摘要 (Test Execution Summary)
2. 測試結果 (Test Results) - 通過/失敗
3. 發現的缺陷 (Bugs Found)
4. 測試覆蓋率分析 (Test Coverage Analysis)
5. 建議和結論 (Recommendations and Conclusion)

## ⚠️ 限制
- 你只能產出 Markdown 格式的測試報告
- 禁止修改功能程式碼
- 你可以執行測試指令，但不能修改被測試的程式碼
- 發現的缺陷應記錄在報告中，而非直接修改程式碼

## 輸出檔案
將測試報告寫入：{{outputPath}}
`,
  requiredInputs: ['test_plan'],
  outputType: 'test_report',
};

export const qaSkills: AgentSkill[] = [
  analyzeTestplanSkill,
  executeTestsSkill,
];

export const defaultQaWorkflowSkill = 'qa-analyze-testplan';
