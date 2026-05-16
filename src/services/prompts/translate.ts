export function buildTranslatePrompt(
  sourceText: string,
  sourceLang: string,
  targetLang: string
): { system: string; user: string } {
  return {
    system: `你是一个专业电商翻译助手。将用户提供的文本从${sourceLang}翻译为${targetLang}。
翻译要求：
1. 翻译结果需符合电商标题规范（简洁、吸引人、包含关键词）
2. 同一个词在同一标题中重复不超过2次
3. 保持原文的营销意图和语气
4. 只输出翻译结果，不要解释`,
    user: sourceText,
  };
}
