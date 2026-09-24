import { ParagraphItem, SentenceItem, ScriptModel } from '../types/speech';
import { normalizeText, extractKeywords } from './normalizeText';

/**
 * 中文句末分隔符号：句号、问号、叹号、分号，以及带有后引号的组合
 */
const SENTENCE_END_REGEX = /([^。！？!?；;\n]+[。！？!?；;]+["'”’]?|[^。！？!?；;\n]+$)/g;

/**
 * 针对特别长的复合单句（如超长排比、逗号连接），超过设定字数后按逗号细化切分，
 * 增强提词器定位灵敏度，避免讲者讲了近一分钟屏幕完全不动。
 */
const MAX_SENTENCE_CHAR_LEN = 45;

function splitLongSentence(rawSentence: string): string[] {
  if (rawSentence.length <= MAX_SENTENCE_CHAR_LEN) {
    return [rawSentence];
  }

  // 尝试在逗号处切分
  const parts = rawSentence.split(/([，,])/g);
  const result: string[] = [];
  let buffer = '';

  for (let i = 0; i < parts.length; i++) {
    buffer += parts[i];
    // 遇到逗号且长度已达阈值，或 buffer 已经很长
    if ((parts[i] === '，' || parts[i] === ',') && buffer.length >= 20) {
      result.push(buffer);
      buffer = '';
    }
  }

  if (buffer.trim()) {
    result.push(buffer);
  }

  return result.length > 0 ? result : [rawSentence];
}

/**
 * 将整篇输入文本解析为具备全局索引与段落索引的结构化 ScriptModel
 */
export function parseScript(rawText: string): ScriptModel {
  if (!rawText || !rawText.trim()) {
    return {
      paragraphs: [],
      sentences: [],
      totalChars: 0,
      totalSentences: 0,
      totalParagraphs: 0
    };
  }

  // 统一换行符并切分段落
  const rawParagraphs = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const paragraphs: ParagraphItem[] = [];
  const allSentences: SentenceItem[] = [];
  let globalSentenceIndex = 0;
  let totalChars = 0;

  for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
    const pText = rawParagraphs[pIdx];
    // 匹配常规句子
    const rawMatches = pText.match(SENTENCE_END_REGEX) || [pText];
    const paraSentences: SentenceItem[] = [];
    const paraStartIndex = globalSentenceIndex;

    for (const rawMatch of rawMatches) {
      const trimmed = rawMatch.trim();
      if (!trimmed) continue;

      // 检查超长句并次级拆分
      const subSegments = splitLongSentence(trimmed);

      for (const segment of subSegments) {
        const segTrimmed = segment.trim();
        if (!segTrimmed) continue;

        const clean = normalizeText(segTrimmed);
        if (!clean) continue; // 纯符号忽略

        const sentence: SentenceItem = {
          globalIndex: globalSentenceIndex,
          paragraphIndex: pIdx,
          sentenceInPara: paraSentences.length,
          rawText: segTrimmed,
          cleanText: clean,
          keywords: extractKeywords(clean),
          charCount: segTrimmed.length
        };

        paraSentences.push(sentence);
        allSentences.push(sentence);
        totalChars += sentence.charCount;
        globalSentenceIndex++;
      }
    }

    if (paraSentences.length > 0) {
      paragraphs.push({
        id: pIdx,
        rawText: pText,
        sentences: paraSentences,
        startSentenceIndex: paraStartIndex,
        endSentenceIndex: globalSentenceIndex - 1
      });
    }
  }

  return {
    paragraphs,
    sentences: allSentences,
    totalChars,
    totalSentences: allSentences.length,
    totalParagraphs: paragraphs.length
  };
}
