import { AgentSkill } from '../../types';

/**
 * TEST (Tester) 專用 Skills
 * 與 QA 有重疊，但更專注於執行測試
 */

export const executeTestCasesSkill: AgentSkill = {
  id: 'test-execute-cases',
  name: 'Execute Test Cases',
  description: '執行測試案例並記錄結果',
  category: 'creation',
  promptTemplate: `
你是一位專業的測試工程師。

## 任務
執行測試案例並產出測試報告。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸入文件 (測試計畫)
{{inputFiles}}

## 輸出要求
請執行測試並產出測試報告，包含：
1. 測試執行摘要 (Test Execution Summary)
   - 總測試案例數
   - 通過數量
   - 失敗數量
   - 跳過數量
2. 詳細測試結果 (Detailed Test Results)
   - 每個測試案例的執行結果
   - 失敗的錯誤訊息和截圖描述
3. 發現的缺陷 (Bugs Found)
   - 缺陷描述
   - 重現步驟
   - 嚴重程度
4. 測試覆蓋率分析 (Test Coverage Analysis)

## ⚠️ 限制
- 你只能產出 Markdown 格式的測試報告
- 禁止修改功能程式碼
- 你可以執行測試指令，但不能修改被測試的程式碼
- 發現的缺陷應記錄在報告中，由 RD 修復

## 輸出檔案
將測試報告寫入：{{outputPath}}
`,
  requiredInputs: ['test_plan'],
  outputType: 'test_report',
  outputFileName: '04-test-plan.md',
};

export const regressionTestSkill: AgentSkill = {
  id: 'test-regression',
  name: 'Regression Test',
  description: '執行迴歸測試',
  category: 'creation',
  promptTemplate: `
你是一位專業的測試工程師。

## 任務
執行迴歸測試，確保新功能不影響現有功能。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸入文件
{{inputFiles}}

## 輸出要求
請執行迴歸測試並產出報告，包含：
1. 迴歸測試範圍
2. 測試結果
3. 影響分析
4. 建議

## ⚠️ 限制
- 你只能產出 Markdown 格式的迴歸測試報告
- 禁止修改功能程式碼
- 你可以執行測試指令，但不能修改被測試的程式碼
- 發現的問題應記錄在報告中，由 RD 修復

## 輸出檔案
將迴歸測試報告寫入：{{outputPath}}
`,
  requiredInputs: ['test_plan'],
  outputType: 'regression_report',
};

export const testSkills: AgentSkill[] = [
  executeTestCasesSkill,
  regressionTestSkill,
];

export const defaultTestWorkflowSkill = 'test-execute-cases';
