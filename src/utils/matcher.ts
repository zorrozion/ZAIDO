import {
  SentenceItem,
  MatchResult,
  MatcherDecision
} from '../types/speech';
import { scoreCandidateSentence } from './similarity';
import { normalizeText } from './normalizeText';

/**
 * 局部搜索窗口参数定义
 */
export const MATCHER_CONFIG = {
  LOCAL_BACKWARD_WINDOW: 5,   // 当前句向前回看 5 句
  LOCAL_FORWARD_WINDOW: 25,   // 当前句向后前瞻 25 句
  MAX_SPEECH_BUFFER_LEN: 120, // 语音缓冲区保留字符数（汉字）
  HIGH_CONFIDENCE_THRESHOLD: 0.68,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.52,
  LOW_CONFIDENCE_THRESHOLD: 0.38,
  CONSECUTIVE_CONFIRM_REQUIRED: 2, // 跳跃/远距离候选需连续确认次数
  GLOBAL_TRIGGER_FAIL_COUNT: 4,    // 连续失败多少次后尝试全局搜索
  GLOBAL_MATCH_MIN_SCORE: 0.76     // 全局重定位必须达到高相似度
};

export class VoiceFollowMatcher {
  private currentIndex: number = 0;
  private pendingCandidateIndex: number | null = null;
  private pendingCandidateHits: number = 0;
  private localFailCount: number = 0;
  private isGlobalMode: boolean = false;
  private finalizedBuffer: string = '';
  private interimSpeech: string = '';
  private speechBuffer: string = '';

  constructor(initialIndex: number = 0) {
    this.currentIndex = initialIndex;
  }

  /**
   * 重置或手动设定当前阅读位置（用户点击段落、上一段/下一段、重新定位时调用）
   */
  public resetPosition(newIndex: number) {
    this.currentIndex = Math.max(0, newIndex);
    this.pendingCandidateIndex = null;
    this.pendingCandidateHits = 0;
    this.localFailCount = 0;
    this.isGlobalMode = false;
  }

  /**
   * 清理语音缓冲区
   */
  public clearBuffer() {
    this.finalizedBuffer = '';
    this.interimSpeech = '';
    this.speechBuffer = '';
  }

  /**
   * 追加新识别文本到双层环形缓冲区（实时分离 interim 与 final，防止累加错乱）
   */
  public appendSpeech(rawSpeechText: string, isFinal: boolean = true): string {
    const clean = normalizeText(rawSpeechText);
    if (isFinal) {
      if (clean) {
        this.finalizedBuffer += clean;
        if (this.finalizedBuffer.length > MATCHER_CONFIG.MAX_SPEECH_BUFFER_LEN) {
          this.finalizedBuffer = this.finalizedBuffer.slice(-MATCHER_CONFIG.MAX_SPEECH_BUFFER_LEN);
        }
      }
      this.interimSpeech = '';
    } else {
      // 临时识别：随说话实时变动，不写入持久 finalized 队列
      this.interimSpeech = clean;
    }

    this.speechBuffer = this.finalizedBuffer + this.interimSpeech;
    if (this.speechBuffer.length > MATCHER_CONFIG.MAX_SPEECH_BUFFER_LEN) {
      this.speechBuffer = this.speechBuffer.slice(-MATCHER_CONFIG.MAX_SPEECH_BUFFER_LEN);
    }
    return this.speechBuffer;
  }

  /**
   * 获取当前缓冲区纯文本
   */
  public getBuffer(): string {
    return this.speechBuffer;
  }

  /**
   * 核心推进决策函数：输入最新语音增量并结合当前状态做出定位判定
   */
  public processStep(
    newSpeechText: string,
    sentences: SentenceItem[],
    isFinal: boolean = true
  ): MatcherDecision {
    if (sentences.length === 0) {
      return this.createEmptyDecision(0);
    }

    if (newSpeechText) {
      this.appendSpeech(newSpeechText, isFinal);
    }

    // 缓冲区字符不足 4 个字时暂不触发判定，避免微小噪音误判
    if (this.speechBuffer.length < 4) {
      return {
        newIndex: this.currentIndex,
        isUpdated: false,
        status: 'listening',
        result: {
          candidateIndex: this.currentIndex,
          score: 0,
          scoringDetail: { diceScore: 0, keywordScore: 0, continuityScore: 0.95, totalScore: 0 },
          confidence: 'low',
          mode: 'hold'
        },
        consecutiveHits: 0
      };
    }

    // 1. 尝试局部滑动窗口搜索
    let bestResult = this.searchWindow(
      sentences,
      Math.max(0, this.currentIndex - MATCHER_CONFIG.LOCAL_BACKWARD_WINDOW),
      Math.min(sentences.length - 1, this.currentIndex + MATCHER_CONFIG.LOCAL_FORWARD_WINDOW),
      false
    );

    // 2. 检查是否需要触发全局检索 (Local fail count 累加到阈值)
    if (bestResult.score < MATCHER_CONFIG.LOW_CONFIDENCE_THRESHOLD) {
      this.localFailCount++;
      if (this.localFailCount >= MATCHER_CONFIG.GLOBAL_TRIGGER_FAIL_COUNT) {
        this.isGlobalMode = true;
        const globalResult = this.searchWindow(sentences, 0, sentences.length - 1, true);
        // 全局搜索必须达到严格的阈值才采纳
        if (globalResult.score >= MATCHER_CONFIG.GLOBAL_MATCH_MIN_SCORE) {
          bestResult = globalResult;
        }
      }
    } else {
      this.localFailCount = 0;
      this.isGlobalMode = false;
    }

    // 3. 多帧连续确认与防跳跃状态机
    return this.applyConfirmationFilter(bestResult, sentences.length);
  }

  /**
   * 在指定窗口内遍历打分，返回综合最优候选
   */
  private searchWindow(
    sentences: SentenceItem[],
    startIdx: number,
    endIdx: number,
    isGlobal: boolean
  ): MatchResult {
    let topCandidateIndex = this.currentIndex;
    let topScore = -1;
    let topDetail = { diceScore: 0, keywordScore: 0, continuityScore: 0, totalScore: 0 };

    for (let i = startIdx; i <= endIdx; i++) {
      const sentence = sentences[i];
      const detail = scoreCandidateSentence(sentence, this.currentIndex, this.speechBuffer, isGlobal);
      if (detail.totalScore > topScore) {
        topScore = detail.totalScore;
        topCandidateIndex = i;
        topDetail = detail;
      }
    }

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (topScore >= MATCHER_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
      confidence = 'high';
    } else if (topScore >= MATCHER_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
      confidence = 'medium';
    }

    return {
      candidateIndex: topCandidateIndex,
      score: topScore,
      scoringDetail: topDetail,
      confidence,
      mode: isGlobal ? 'global' : (topScore >= MATCHER_CONFIG.LOW_CONFIDENCE_THRESHOLD ? 'local' : 'hold')
    };
  }

  /**
   * 应用多帧平滑过滤与向前锁定
   */
  private applyConfirmationFilter(
    matchResult: MatchResult,
    totalSentences: number
  ): MatcherDecision {
    const candidate = matchResult.candidateIndex;
    const score = matchResult.score;

    // 情况 A：得分过低，判定为脱稿插话（OFF_SCRIPT / HOLD）
    // 原则：宁可少动，不可乱跳。完全保持原位。
    if (score < MATCHER_CONFIG.LOW_CONFIDENCE_THRESHOLD) {
      this.pendingCandidateIndex = null;
      this.pendingCandidateHits = 0;
      return {
        newIndex: this.currentIndex,
        isUpdated: false,
        status: this.isGlobalMode ? 'searching' : 'weak',
        result: matchResult,
        consecutiveHits: 0
      };
    }

    // 情况 B：候选就是当前句或紧随的下一句 (current 或 current + 1)，且置信度良好
    // 这是最自然的流转，允许 1 帧平滑跟进
    if (candidate === this.currentIndex) {
      this.pendingCandidateIndex = null;
      this.pendingCandidateHits = 0;
      let currentStatus: 'locked' | 'tracking' | 'weak' = 'weak';
      if (score >= MATCHER_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
        currentStatus = 'locked';
      } else if (score >= MATCHER_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
        currentStatus = 'tracking';
      }
      return {
        newIndex: this.currentIndex,
        isUpdated: false,
        status: currentStatus,
        result: matchResult,
        consecutiveHits: 1
      };
    }

    if (candidate === this.currentIndex + 1 && score >= MATCHER_CONFIG.MEDIUM_CONFIDENCE_THRESHOLD) {
      this.currentIndex = candidate;
      this.pendingCandidateIndex = null;
      this.pendingCandidateHits = 0;
      return {
        newIndex: this.currentIndex,
        isUpdated: true,
        status: score >= MATCHER_CONFIG.HIGH_CONFIDENCE_THRESHOLD ? 'locked' : 'tracking',
        result: matchResult,
        consecutiveHits: 1
      };
    }

    // 情况 C：小步后退 (current - 1)
    // 允许讲者口误复述上一句，但要求得分达到中高置信度
    if (candidate === this.currentIndex - 1 && score >= MATCHER_CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
      this.currentIndex = candidate;
      this.pendingCandidateIndex = null;
      this.pendingCandidateHits = 0;
      return {
        newIndex: this.currentIndex,
        isUpdated: true,
        status: 'tracking',
        result: matchResult,
        consecutiveHits: 1
      };
    }

    // 情况 D：候选发生跳跃（跨步向前 > 1 句，或全局重定位，或大幅回退）
    // 强制执行多帧二次确认机制！
    if (this.pendingCandidateIndex === candidate) {
      this.pendingCandidateHits++;
    } else {
      this.pendingCandidateIndex = candidate;
      this.pendingCandidateHits = 1;
    }

    // 检查是否达到连续确认阈值
    const requiredHits = matchResult.mode === 'global' ? 3 : MATCHER_CONFIG.CONSECUTIVE_CONFIRM_REQUIRED;

    if (this.pendingCandidateHits >= requiredHits) {
      // 确认通过，允许跳转！
      this.currentIndex = Math.min(Math.max(0, candidate), totalSentences - 1);
      const confirmedHits = this.pendingCandidateHits;
      this.pendingCandidateIndex = null;
      this.pendingCandidateHits = 0;

      return {
        newIndex: this.currentIndex,
        isUpdated: true,
        status: score >= MATCHER_CONFIG.HIGH_CONFIDENCE_THRESHOLD ? 'locked' : 'tracking',
        result: matchResult,
        consecutiveHits: confirmedHits
      };
    }

    // 尚未达到确认次数：先暂缓跳转，保持原句，状态标为 searching / tracking
    return {
      newIndex: this.currentIndex,
      isUpdated: false,
      status: 'searching',
      result: matchResult,
      consecutiveHits: this.pendingCandidateHits
    };
  }

  private createEmptyDecision(index: number): MatcherDecision {
    return {
      newIndex: index,
      isUpdated: false,
      status: 'unstarted',
      result: {
        candidateIndex: index,
        score: 0,
        scoringDetail: { diceScore: 0, keywordScore: 0, continuityScore: 0, totalScore: 0 },
        confidence: 'low',
        mode: 'hold'
      },
      consecutiveHits: 0
    };
  }
}
