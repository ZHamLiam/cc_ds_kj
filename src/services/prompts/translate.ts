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

// 泰语翻译的中间步骤：先将源语言翻译为英语
export function buildEnglishPivotPrompt(
  sourceText: string,
  sourceLang: string
): { system: string; user: string } {
  return {
    system: `你是一个专业电商翻译助手。将用户提供的文本从${sourceLang}翻译为英语。
翻译要求：
1. 翻译结果需符合电商标题规范（简洁、吸引人、包含关键词）
2. 保持原文的营销意图和语气
3. 只输出翻译结果，不要解释`,
    user: sourceText,
  };
}

// 从英语翻译为泰语
export function buildEnglishToThaiPrompt(
  englishText: string
): { system: string; user: string } {
  return {
    system: `你是一个专业电商翻译助手。将以下英语文本翻译为泰语。
翻译要求：
1. 翻译结果需符合泰国电商平台的标题风格
2. 包含当地用户常用的搜索关键词
3. 保持原意的同时突出卖点
4. 只输出翻译结果，不要解释`,
    user: englishText,
  };
}
