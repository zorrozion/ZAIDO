import { SentenceItem, MatchScoringDetail } from '../types/speech';
import { cleanSpeechWithFillerDiscount } from './normalizeText';

/**
 * 提取文本的 2-char Bigrams 集合
 */
function getBigrams(text: string): Map<string, number> {
  const map = new Map<string, number>();
  if (text.length < 2) {
    if (text.length === 1) map.set(text, 1);
    return map;
  }
  for (let i = 0; i < text.length - 1; i++) {
    const gram = text.slice(i, i + 2);
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return map;
}

/**
 * 计算句子在语音缓冲区中的覆盖 Dice / Overlap 相似度
 * 特别适配语音 Buffer 较长（50-150字）而单句较短（10-35字）的非对称匹配场景。
 * 重点评估：句子的二元片段在语音缓冲区中被命中的比例。
 */
export function computeDiceOverlap(sentenceClean: string, speechBufferClean: string): number {
  if (!sentenceClean || !speechBufferClean) return 0;

  // 截取近期语音滑动窗口（重点聚焦在用户最近 3-8 秒所讲的内容）
  const recentWindowLen = Math.max(sentenceClean.length + 20, 40);
  const recentSpeech = speechBufferClean.slice(-recentWindowLen);

  // 1. 若近期语音直接完整包含该句，满分
  if (recentSpeech.includes(sentenceClean)) {
    return 1.0;
  }

  // 2. 若全缓冲区包含，但距离当前说话尾部已经很远，则按时间距离衰减
  const lastIndex = speechBufferClean.lastIndexOf(sentenceClean);
  if (lastIndex !== -1) {
    const trailingChars = speechBufferClean.length - (lastIndex + sentenceClean.length);
    if (trailingChars <= 10) return 1.0;
    return Math.max(0.15, 1.0 - (trailingChars - 10) * 0.03);
  }

  const sBigrams = getBigrams(sentenceClean);
  if (sBigrams.size === 0) return 0;

  let totalSentenceGrams = 0;
  for (const count of sBigrams.values()) {
    totalSentenceGrams += count;
  }

  // 计算近期语音对该句的召回度 (Recent Recall)
  const recentBigrams = getBigrams(recentSpeech);
  let recentIntersection = 0;
  for (const [gram, count] of sBigrams.entries()) {
    if (recentBigrams.has(gram)) {
      recentIntersection += Math.min(count, recentBigrams.get(gram)!);
    }
  }
  const recentRecall = recentIntersection / totalSentenceGrams;

  // 计算全缓冲区的基准召回度
  const bBigrams = getBigrams(speechBufferClean);
  let fullIntersection = 0;
  for (const [gram, count] of sBigrams.entries()) {
    if (bBigrams.has(gram)) {
      fullIntersection += Math.min(count, bBigrams.get(gram)!);
    }
  }
  const fullRecall = fullIntersection / totalSentenceGrams;

  // 近期召回占 70% 权重，全量召回占 30%
  return Math.min(1.0, (recentRecall * 0.75) + (fullRecall * 0.25));
}

/**
 * 计算句子关键词在语音缓冲区中的命中率
 */
export function computeKeywordOverlap(sentenceKeywords: string[], speechBufferClean: string): number {
  if (sentenceKeywords.length === 0) return 0.5; // 无特殊关键词时不施加惩罚

  // 重点检索最近 50 个字符（当前正在讲的片段）
  const recentSpeech = speechBufferClean.slice(-50);

  let recentMatched = 0;
  let fullMatched = 0;

  for (const kw of sentenceKeywords) {
    if (recentSpeech.includes(kw)) {
      recentMatched++;
    }
    if (speechBufferClean.includes(kw)) {
      fullMatched++;
    }
  }

  const recentRatio = recentMatched / sentenceKeywords.length;
  const fullRatio = fullMatched / sentenceKeywords.length;

  // 70% 近期重合 + 30% 全缓冲区重合
  return Number(((recentRatio * 0.70) + (fullRatio * 0.30)).toFixed(3));
}

/**
 * 计算空间连续性先验得分 (Continuity Prior)
 * 约束阅读单向推进，奖励自然顺延，惩罚大幅回退。
 */
export function computeContinuityScore(
  candidateIndex: number,
  currentIndex: number,
  isGlobalSearch: boolean = false
): number {
  if (isGlobalSearch) {
    // 全局重定位模式下不施加严格距离惩罚，但略微偏向当前之后的内容
    return candidateIndex >= currentIndex ? 0.55 : 0.35;
  }

  const diff = candidateIndex - currentIndex;

  if (diff === 0) return 0.92;      // 仍在当前句，正常
  if (diff === 1) return 1.00;      // 迈入紧邻下一句，最优自然流转
  if (diff === 2) return 0.90;      // 跨过短句流转
  if (diff === 3) return 0.80;
  if (diff >= 4 && diff <= 8) {
    return 0.70 - (diff - 4) * 0.05; // 0.70 ~ 0.50
  }
  if (diff > 8 && diff <= 25) {
    return 0.35;                    // 跳段需极强文本相似度方可触发
  }

  // 回退惩罚
  if (diff === -1) return 0.55;     // 允许轻微口误回读
  if (diff < -1) return 0.10;       // 严厉惩罚大步倒退

  return 0.20;
}

/**
 * 计算句子起始前缀在近期语音尾部的匹配度 (Prefix Match for Early Triggering)
 * 允许在讲员刚读出下一句的前 3~8 个字时，系统立即先知先觉地高亮该句，
 * 彻底消除“读完了才高亮”的滞后感。
 */
export function computePrefixOverlap(sentenceClean: string, speechBufferClean: string): number {
  if (!sentenceClean || !speechBufferClean) return 0;
  if (sentenceClean.length < 2 || speechBufferClean.length < 2) return 0;

  // 截取句子前部的关键前缀（取前 4~10 个字，或前 35% 长度）
  const prefixLen = Math.min(10, Math.max(4, Math.floor(sentenceClean.length * 0.35)));
  const prefix = sentenceClean.slice(0, prefixLen);

  // 重点检查近期语音的尾部（最近 30 个字）
  const tailSpeech = speechBufferClean.slice(-30);

  // 1. 若近期语音尾部直接包含完整前缀，满分
  if (tailSpeech.includes(prefix)) {
    return 1.0;
  }

  // 2. 检查更短的起始核心词（前 3~5 个字）
  const shortPrefix = sentenceClean.slice(0, Math.min(5, Math.max(3, prefixLen - 2)));
  if (shortPrefix.length >= 3 && tailSpeech.includes(shortPrefix)) {
    return 0.88;
  }

  // 3. 2-gram 连续前缀命中率
  const pBigrams = getBigrams(prefix);
  if (pBigrams.size === 0) return 0;

  const tBigrams = getBigrams(tailSpeech);
  let matched = 0;
  for (const [gram, count] of pBigrams.entries()) {
    if (tBigrams.has(gram)) {
      matched += Math.min(count, tBigrams.get(gram)!);
    }
  }

  return Number((matched / pBigrams.size).toFixed(3));
}

/**
 * 综合多维打分
 */
export function scoreCandidateSentence(
  candidate: SentenceItem,
  currentIndex: number,
  speechBuffer: string,
  isGlobalSearch: boolean = false
): MatchScoringDetail {
  const cleanSpeech = cleanSpeechWithFillerDiscount(speechBuffer);

  const diceScore = Math.min(1.0, computeDiceOverlap(candidate.cleanText, cleanSpeech));
  const keywordScore = computeKeywordOverlap(candidate.keywords, cleanSpeech);
  const continuityScore = computeContinuityScore(candidate.globalIndex, currentIndex, isGlobalSearch);

  // 前缀先验加速：若候选句是紧随的下一句 (currentIndex + 1)，赋予前缀高灵敏度检测
  let effectiveTextScore = diceScore;
  if (!isGlobalSearch && candidate.globalIndex === currentIndex + 1) {
    const prefixScore = computePrefixOverlap(candidate.cleanText, cleanSpeech);
    // 当讲员刚读出下一句的前几个字时，前缀匹配度迅速提升，让得分立即达到推进阈值
    effectiveTextScore = Math.max(diceScore, prefixScore * 0.95);
  }

  // 权重分配：文本相似度 0.50 + 关键词重合 0.25 + 连续性 0.25
  const totalScore = (effectiveTextScore * 0.50) + (keywordScore * 0.25) + (continuityScore * 0.25);

  return {
    diceScore: Number(effectiveTextScore.toFixed(3)),
    keywordScore: Number(keywordScore.toFixed(3)),
    continuityScore: Number(continuityScore.toFixed(3)),
    totalScore: Number(totalScore.toFixed(3))
  };
}
