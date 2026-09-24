import { useState, useRef, useCallback, useEffect } from 'react';
import { SentenceItem } from '../types/speech';

interface SimulatorOptions {
  sentences: SentenceItem[];
  currentIndex: number;
  onSpeechChunk: (text: string, isFinal: boolean) => void;
}

export function useSpeechSimulator({ sentences, currentIndex, onSpeechChunk }: SimulatorOptions) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1); // 1x, 2x, 4x

  const simTimerRef = useRef<any>(null);
  const simIndexRef = useRef(currentIndex);
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;

  const onSpeechChunkRef = useRef(onSpeechChunk);
  onSpeechChunkRef.current = onSpeechChunk;

  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;

  // 保证模拟起点与当前实际位置同步
  useEffect(() => {
    if (!isSimulating) {
      simIndexRef.current = currentIndex;
    }
  }, [currentIndex, isSimulating]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  const startSimulation = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    setIsSimulating(true);

    const step = () => {
      const idx = simIndexRef.current;
      if (idx >= sentencesRef.current.length) {
        stopSimulation();
        return;
      }

      const sentence = sentencesRef.current[idx];
      const text = sentence.cleanText || sentence.rawText;

      // 模拟语音识别的两阶段：先推 interim，再推 final
      const halfLen = Math.floor(text.length / 2);
      const firstHalf = text.slice(0, halfLen);

      // 先送 interim
      onSpeechChunkRef.current(firstHalf, false);

      // 延时送完整 final
      const interimDelay = Math.max(300 / speedRef.current, 100);
      setTimeout(() => {
        if (!simTimerRef.current) return;
        onSpeechChunkRef.current(text, true);
        simIndexRef.current = idx + 1;
      }, interimDelay);
    };

    // 初始立即执行一次
    step();

    // 句子推进间隔：每个字平均约 200ms
    const intervalMs = Math.max(1600 / speedRef.current, 400);
    simTimerRef.current = setInterval(step, intervalMs);
  }, [stopSimulation]);

  /**
   * 模拟脱稿插话（向语音流注入一段稿子中完全不存在的内容）
   * 用于验证算法的 HOLD 驻留能力
   */
  const injectOffScript = useCallback(() => {
    const offScriptTexts = [
      '弟兄姊妹，我们在这里停一下，其实过去几个月我们也经历了很多类似的挑战。',
      '大家可以回想一下自己生活中的具体经历，是不是也经常会感到孤单与迷茫？',
      '我上周在路上遇到一位朋友，他也跟我聊起过这方面的一些内心困惑。'
    ];
    const randomText = offScriptTexts[Math.floor(Math.random() * offScriptTexts.length)];
    onSpeechChunkRef.current(randomText, true);
  }, []);

  /**
   * 模拟跳段讲读（向前瞬移 5 句）
   * 用于验证二次确认跳跃逻辑
   */
  const injectSkipAhead = useCallback(() => {
    const targetIdx = Math.min(sentencesRef.current.length - 1, simIndexRef.current + 5);
    simIndexRef.current = targetIdx;
    if (sentencesRef.current[targetIdx]) {
      onSpeechChunkRef.current(sentencesRef.current[targetIdx].rawText, true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  return {
    isSimulating,
    speedMultiplier,
    setSpeedMultiplier,
    startSimulation,
    stopSimulation,
    injectOffScript,
    injectSkipAhead
  };
}
