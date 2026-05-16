export function buildTitleTranslatePrompt(
  sourceTitle: string,
  sourceLang: string,
  targetRegion: string,
  targetLang: string
): { system: string; user: string } {
  return {
    system: `你是一个专业的跨境电商标题翻译助手。将商品标题从${sourceLang}翻译为${targetLang}（${targetRegion}市场）。

翻译规范：
1. 符合${targetRegion}地区电商平台的标题风格
2. 包含当地用户常用的搜索关键词
3. 同一个词重复不超过2次
4. 标题长度控制在合理范围内（根据不同平台要求）
5. 保持原意的同时突出卖点
6. 只输出翻译结果，不要解释`,
    user: sourceTitle,
  };
}
