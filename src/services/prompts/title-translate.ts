export function buildTitleTranslatePrompt(
  sourceTitle: string,
  sourceLang: string,
  targetRegion: string,
  targetLang: string,
  customRules?: string
): { system: string; user: string } {
  let extra = "";
  if (customRules) {
    extra = `\n\n用户特别要求（必须遵守）：\n${customRules}`;
  }
  return {
    system: `你是一个专业的跨境电商标题翻译助手。将商品标题从${sourceLang}翻译为${targetLang}（${targetRegion}市场）。

翻译规范：
1. 符合${targetRegion}地区电商平台的标题风格
2. 包含当地用户常用的搜索关键词
3. 同一个词重复不超过2次
4. 标题长度控制在合理范围内（根据不同平台要求）
5. 保持原意的同时突出卖点
6. 只输出翻译结果，不要解释${extra}`,
    user: sourceTitle,
  };
}

// 泰语翻译中间步骤：先将标题翻译为英语
export function buildTitleEnglishPivotPrompt(
  sourceTitle: string,
  sourceLang: string,
  customRules?: string
): { system: string; user: string } {
  let extra = "";
  if (customRules) {
    extra = `\n\n用户特别要求（必须遵守）：\n${customRules}`;
  }
  return {
    system: `你是一个专业的跨境电商标题翻译助手。将商品标题从${sourceLang}翻译为英语。

翻译规范：
1. 翻译结果需符合电商标题规范（简洁、吸引人、包含关键词）
2. 同一个词重复不超过2次
3. 保持原意的同时突出卖点
4. 只输出翻译结果，不要解释${extra}`,
    user: sourceTitle,
  };
}

// 从英语标题翻译为泰语
export function buildEnglishTitleToThaiPrompt(
  englishTitle: string,
  customRules?: string
): { system: string; user: string } {
  let extra = "";
  if (customRules) {
    extra = `\n\n用户特别要求（必须遵守）：\n${customRules}`;
  }
  return {
    system: `你是一个专业的跨境电商标题翻译助手。将以下英语商品标题翻译为泰语（泰国市场）。

翻译规范：
1. 符合泰国电商平台的标题风格
2. 包含泰国用户常用的搜索关键词
3. 同一个词重复不超过2次
4. 标题长度控制在合理范围内
5. 保持原意的同时突出卖点
6. 只输出翻译结果，不要解释${extra}`,
    user: englishTitle,
  };
}
