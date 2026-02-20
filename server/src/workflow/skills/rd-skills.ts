import { AgentSkill } from '../../types';

/**
 * RD (Software Developer) 專用 Skills
 */

export const analyzeImplementationSkill: AgentSkill = {
  id: 'rd-analyze-implementation',
  name: 'Analyze Implementation',
  description: '分析規格和設計，產出實作計畫',
  category: 'analysis',
  promptTemplate: `
你是一位專業的軟體開發工程師 (RD)。

## 任務
基於需求規格和設計文件，產出詳細的實作計畫。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸入文件 (需求規格和設計文件)
{{inputFiles}}

## 輸出要求
請產出 Markdown 格式的實作計畫，包含：
1. 技術架構概述 (Technical Architecture Overview)
2. 檔案結構 (File Structure)
3. 元件/模組分解 (Component/Module Breakdown)
4. API 端點設計 (API Endpoints) - 如適用
5. 資料庫變更 (Database Changes) - 如適用
6. 實作步驟 (Implementation Steps)
7. 相依套件 (Dependencies)
8. 技術考量和建議 (Technical Considerations)

## ⚠️ 限制
- 這個階段只產出 Markdown 格式的實作計畫
- 暫時不要撰寫實際程式碼
- 禁止修改需求文件或設計文件
- 專注於規劃，不是實作

## 輸出檔案
將實作計畫寫入：{{outputPath}}

請確保實作計畫具體可執行，讓開發團隊能夠依循實作。
`,
  requiredInputs: ['requirement_doc', 'design_doc'],
  outputType: 'implementation_plan',
  outputFileName: '03-implementation.md',
};

export const writeCodeSkill: AgentSkill = {
  id: 'rd-write-code',
  name: 'Write Code',
  description: '實際撰寫程式碼',
  category: 'creation',
  promptTemplate: `
你是一位專業的軟體開發工程師 (RD)。

## 任務
根據實作計畫，撰寫程式碼。

## 功能名稱
{{featureName}}

## 專案路徑
{{projectPath}}

## 輸入文件 (實作計畫)
{{inputFiles}}

## 輸出要求
請依照實作計畫撰寫程式碼：
1. 建立所需的檔案和目錄
2. 撰寫符合專案規範的程式碼
3. 加入必要的註解
4. 確保程式碼可編譯/執行

## ⚠️ 限制
- 禁止修改需求文件 (requirement_doc)
- 禁止修改設計文件 (design_doc)
- 只能建立和修改程式碼檔案

## 注意事項
- 遵循專案現有的程式碼風格
- 處理錯誤情況
- 考慮安全性
`,
  requiredInputs: ['implementation_plan'],
  outputType: 'code',
};

export const rdSkills: AgentSkill[] = [
  analyzeImplementationSkill,
  writeCodeSkill,
];

export const defaultRdWorkflowSkill = 'rd-analyze-implementation';
