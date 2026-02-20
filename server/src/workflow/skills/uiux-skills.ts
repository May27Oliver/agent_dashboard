import { AgentSkill } from '../../types';

/**
 * UIUX (UI/UX Designer) 專用 Skills
 */

export const analyzeDesignSkill: AgentSkill = {
  id: 'uiux-analyze-design',
  name: 'Analyze Design',
  description: '分析 PM 的規格，產出 UI/UX 設計文件',
  category: 'analysis',
  promptTemplate: `
你是一位專業的 UI/UX 設計師。

## 任務
基於 PM 的需求規格，產出 UI/UX 設計文件。

## 功能名稱
{{featureName}}

## 輸入文件 (需求規格)
{{inputFiles}}

## 輸出要求
請產出 Markdown 格式的設計文件，包含：
1. 設計概述 (Design Overview)
2. 使用者流程 (User Flow) - 文字描述或 Mermaid 流程圖
3. 頁面/元件清單 (Component List)
4. 版面配置 (Layout Specifications)
5. 互動模式 (Interaction Patterns)
6. 響應式設計考量 (Responsive Design Considerations)
7. 無障礙設計要求 (Accessibility Requirements)

## ⚠️ 限制
- 你只能產出 Markdown 格式的設計文件
- 禁止撰寫任何程式碼 (JavaScript, TypeScript, CSS, HTML 等)
- 禁止建立或修改程式檔案
- 你可以描述 UI 元件，但不能實作它們
- 使用文字描述或 ASCII art 來呈現 wireframe，不要產生程式碼

## 輸出檔案
將設計文件寫入：{{outputPath}}

請確保設計文件能夠讓開發人員清楚理解 UI/UX 需求。
`,
  requiredInputs: ['requirement_doc'],
  outputType: 'design_doc',
  outputFileName: '02-design.md',
};

export const createWireframeSkill: AgentSkill = {
  id: 'uiux-create-wireframe',
  name: 'Create Wireframe',
  description: '產出 wireframe 或 mockup 描述',
  category: 'creation',
  promptTemplate: `
你是一位專業的 UI/UX 設計師。

## 任務
基於設計規格，產出詳細的 Wireframe 描述。

## 功能名稱
{{featureName}}

## 輸入文件
{{inputFiles}}

## 輸出要求
請產出詳細的 Wireframe 描述，包含：
1. 各頁面的線框圖描述 (ASCII art 或文字描述)
2. 元件尺寸和間距
3. 顏色和字型建議
4. 圖示和圖片位置

## ⚠️ 限制
- 你只能產出 Markdown 格式的設計文件
- 禁止撰寫任何程式碼 (JavaScript, TypeScript, CSS, HTML 等)
- 禁止建立或修改程式檔案
- 你可以描述 UI 元件，但不能實作它們
- 使用 ASCII art 或文字描述來呈現 wireframe

## 輸出檔案
將 Wireframe 描述寫入：{{outputPath}}
`,
  requiredInputs: ['design_doc'],
  outputType: 'wireframe_doc',
};

export const uiuxSkills: AgentSkill[] = [
  analyzeDesignSkill,
  createWireframeSkill,
];

export const defaultUiuxWorkflowSkill = 'uiux-analyze-design';
