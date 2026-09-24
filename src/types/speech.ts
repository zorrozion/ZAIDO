export interface SentenceItem {
  globalIndex: number;      // 0-indexed unique global sentence ID
  paragraphIndex: number;   // Index of paragraph containing this sentence
  sentenceInPara: number;   // Index of sentence within paragraph
  rawText: string;          // Display text with punctuations
  cleanText: string;        // Normalized text without punctuations/spaces
  keywords: string[];       // Significant content words
  charCount: number;
}

export interface ParagraphItem {
  id: number;
  rawText: string;
  sentences: SentenceItem[];
  startSentenceIndex: number;
  endSentenceIndex: number;
}

export type TrackingStatus =
  | 'unstarted'       // 未启动
  | 'listening'       // 正在聆听 (初始或正在收音)
  | 'locked'          // 已锁定 (高置信度匹配)
  | 'tracking'        // 稳定跟进中
  | 'weak'            // 定位较弱 (脱稿或自由发挥，原位保持)
  | 'searching'       // 正在寻找位置 (局部或全局搜索)
  | 'paused'          // 暂停跟稿
  | 'error';          // 麦克风或识别错误

export interface MatchScoringDetail {
  diceScore: number;
  keywordScore: number;
  continuityScore: number;
  totalScore: number;
}

export interface MatchResult {
  candidateIndex: number;
  score: number;
  scoringDetail: MatchScoringDetail;
  confidence: 'high' | 'medium' | 'low';
  mode: 'local' | 'global' | 'hold';
}

export interface MatcherDecision {
  newIndex: number;
  isUpdated: boolean;
  status: TrackingStatus;
  result: MatchResult;
  consecutiveHits: number;
}

export interface ScriptModel {
  paragraphs: ParagraphItem[];
  sentences: SentenceItem[];
  totalChars: number;
  totalSentences: number;
  totalParagraphs: number;
}
