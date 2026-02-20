import { AgentSkill } from '../../types';

/**
 * 通用 Skills - 跨 Role 共用
 */

export const deliverSpecSkill: AgentSkill = {
  id: 'deliver-spec',
  name: 'Deliver Specification',
  description: '將產出的文件存檔到指定位置',
  category: 'delivery',
  promptTemplate: `
將你的產出儲存到以下檔案：
{{outputPath}}

完成後，請確認檔案已成功寫入。
`,
  outputFileName: '{{stepOutputFile}}',
};

export const reviewFeedbackSkill: AgentSkill = {
  id: 'review-feedback',
  name: 'Review Feedback',
  description: '接收回饋並修正產出',
  category: 'review',
  promptTemplate: `
請審視以下回饋並修正你的產出：

## 回饋內容
{{feedback}}

## 原始檔案
{{originalFile}}

## 輸出要求
修正後存檔到：{{outputPath}}
`,
  requiredInputs: ['feedback', 'originalFile'],
};

export const commonSkills: AgentSkill[] = [
  deliverSpecSkill,
  reviewFeedbackSkill,
];
