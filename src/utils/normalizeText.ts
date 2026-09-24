/**
 * 标点符号与特殊字符过滤正则（含中文、英文标点及空白符）
 */
const PUNCTUATION_REGEX = /[，。！？；：“”‘’（）《》【】、—…～·\s\.,!?;:"'()[\]{}<>\/\\_+=*&^%$#@`~|·\-]/g;

/**
 * 常见口头语、语气词、连接词（讲道与演讲中频繁出现的非内容性填充词）
 * 在定位匹配中需要降低权重或过滤，防止因为“弟兄姊妹”或“然后”产生虚假高分。
 */
export const FILLER_WORDS = new Set([
  '弟兄姊妹',
  '弟兄姐妹',
  '亲爱的',
  '各位朋友',
  '那么',
  '然后',
  '就是',
  '这个',
  '那个',
  '实际上',
  '可以说',
  '也就是说',
  '我们知道',
  '你看',
  '其实',
  '所以说',
  '啊',
  '呢',
  '嗯',
  '吧',
  '呀',
  '嘛',
  '呃',
  '噢',
  '哈'
]);

/**
 * 基础文本正规化：去除标点、转小写、去除空格
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(PUNCTUATION_REGEX, '');
}

/**
 * 提取文本关键词（基于简单中文 n-gram 与停用词过滤，无需庞大的第三方词库）
 * 生成 2~4 个字符的有辨识度的实词片段
 */
export function extractKeywords(text: string): string[] {
  const clean = normalizeText(text);
  if (clean.length < 2) return clean ? [clean] : [];

  const keywords: string[] = [];
  const len = clean.length;

  // 提取 2-gram 和 3-gram
  for (let i = 0; i < len; i++) {
    // 2-gram
    if (i + 2 <= len) {
      const w2 = clean.slice(i, i + 2);
      if (!FILLER_WORDS.has(w2)) {
        keywords.push(w2);
      }
    }
    // 3-gram
    if (i + 3 <= len) {
      const w3 = clean.slice(i, i + 3);
      if (!FILLER_WORDS.has(w3)) {
        keywords.push(w3);
      }
    }
  }

  // 去重
  return Array.from(new Set(keywords));
}

/**
 * 计算降权后的有效字符序列（用于精细文本重叠计算）
 */
export function cleanSpeechWithFillerDiscount(text: string): string {
  let cleaned = normalizeText(text);
  // 不直接全部删空，但可消除部分高频无意义单音节
  const SINGLE_FILLERS = /[啊呢嗯吧呀嘛呃噢哈]/g;
  cleaned = cleaned.replace(SINGLE_FILLERS, '');
  return cleaned;
}
