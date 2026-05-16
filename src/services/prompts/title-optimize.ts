import type { UserStyleProfile } from "../../types";

export function buildTitleOptimizePrompt(
  originalTitle: string,
  region: string,
  platform: string,
  userStyle?: UserStyleProfile
): { system: string; user: string } {
  let customRulesSection = "";
  let examplesSection = "";

  if (userStyle?.customRules) {
    customRulesSection = `\n\n用户自定义规则：\n${userStyle.customRules}`;
  }

  if (userStyle?.goodExamples && userStyle.goodExamples.length > 0) {
    examplesSection = `\n\n用户认为好的标题示例：\n${userStyle.goodExamples
      .map((e, i) => `${i + 1}. ${e}`)
      .join("\n")}`;
  }

  return {
    system: `你是一个专业的跨境电商标题优化专家。针对${region}市场${platform}平台，优化用户提供的商品标题。

优化要求：
1. 生成3个优化方案，按SEO效果排序
2. 每个方案标注SEO得分（1-10分）
3. 考虑${region}地区用户的搜索习惯和偏好关键词
4. 标题要包含核心关键词、属性词、场景词
5. 符合${platform}平台的标题规范和长度限制
6. 同一个词重复不超过2次
7. 格式输出为 JSON 数组：[{"title": "...", "seoScore": 8, "keywords": ["..."], "reason": "优化理由"}]${customRulesSection}${examplesSection}`,
    user: `请优化以下商品标题：\n${originalTitle}`,
  };
}
