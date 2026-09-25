import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { parseScript } from './utils/splitText';
import { VoiceFollowMatcher } from './utils/matcher';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSimulator } from './hooks/useSpeechSimulator';
import { useAutoScroll } from './hooks/useAutoScroll';
import { EditorView } from './components/EditorView';
import { ReaderView } from './components/ReaderView';
import { StatusBar } from './components/StatusBar';
import { ControlBar } from './components/ControlBar';
import { DebugPanel } from './components/DebugPanel';
import { SAMPLE_SERMON_SHORT } from './sampleData/sermons';
import { MatchResult, TrackingStatus } from './types/speech';

// 检测是否为移动端设备（手机或 iPad/平板触控屏）
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 1024 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const App: React.FC = () => {
  // 模式切换：'edit' (讲稿输入) | 'read' (提词跟读)
  const [viewMode, setViewMode] = useState<'edit' | 'read'>('edit');
  const [rawText, setRawText] = useState(SAMPLE_SERMON_SHORT.content);

  // 解析后的结构化讲稿对象
  const script = useMemo(() => parseScript(rawText), [rawText]);

  // 当前激活阅读的句子索引 (0-indexed)
  const [currentIndex, setCurrentIndex] = useState(0);

  // 讲稿跟随状态
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('unstarted');
  const [isPaused, setIsPaused] = useState(false);
  const [fontSize, setFontSize] = useState(27); // 演示页面默认字号 27px
  const [lineHeight, setLineHeight] = useState(1.6); // 默认 1.6 倍行距（3档：1.4 / 1.6 / 1.8）
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // 状态栏在移动端跟读时隐藏
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(true);

  // 算法诊断数据缓存
  const [lastSpeechFragment, setLastSpeechFragment] = useState('');
  const [lastMatchResult, setLastMatchResult] = useState<MatchResult | null>(null);
  const [consecutiveHits, setConsecutiveHits] = useState(0);
  const [currentBufferDisplay, setCurrentBufferDisplay] = useState('');

  // 状态机匹配器实例
  const matcherRef = useRef(new VoiceFollowMatcher(0));

  // 视口黄金线自动滚动管理 Hook
  const {
    containerRef,
    isManualOverridden,
    scrollToSentence,
    resumeAutoScroll
  } = useAutoScroll({
    currentSentenceIndex: currentIndex,
    isPaused
  });

  // 核心统一语音处理函数（同时接收真实 ASR 与模拟推流）
  const handleIncomingSpeech = useCallback(
    (transcript: string) => {
      if (isPaused || script.sentences.length === 0) return;

      setLastSpeechFragment(transcript);
      const decision = matcherRef.current.processStep(transcript, script.sentences);

      setCurrentBufferDisplay(matcherRef.current.getBuffer());
      setLastMatchResult(decision.result);
      setConsecutiveHits(decision.consecutiveHits);
      setTrackingStatus(decision.status);

      if (decision.isUpdated) {
        setCurrentIndex(decision.newIndex);
      }
    },
    [isPaused, script.sentences]
  );

  // 真实浏览器 Web Speech API Hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    errorMessage: speechError,
    startListening,
    stopListening
  } = useSpeechRecognition({
    onInterimResult: (interim) => handleIncomingSpeech(interim),
    onFinalResult: (final) => handleIncomingSpeech(final),
    onError: (err) => {
      console.warn('Speech error received:', err);
      setTrackingStatus('error');
    }
  });

  // 语音模拟推流器 Hook (免开麦验证长文与跳段)
  const {
    isSimulating,
    speedMultiplier,
    setSpeedMultiplier,
    startSimulation,
    stopSimulation,
    injectOffScript,
    injectSkipAhead
  } = useSpeechSimulator({
    sentences: script.sentences,
    currentIndex,
    onSpeechChunk: (chunk) => handleIncomingSpeech(chunk)
  });

  // 开始跟稿（演示模式）
  const handleStartReading = () => {
    if (script.sentences.length === 0) return;
    setViewMode('read');
    setCurrentIndex(0);
    setIsPaused(false);
    matcherRef.current.resetPosition(0);
    matcherRef.current.clearBuffer();
    setTrackingStatus('listening');

    // 移动端/iPad 运行演示时隐藏顶上状态栏，释放最大垂直阅读视野
    if (isMobileDevice()) {
      setIsStatusBarVisible(false);
    } else {
      setIsStatusBarVisible(true);
    }

    // 默认尝试开启麦克风
    if (isSpeechSupported) {
      startListening();
    }
  };

  // 返回编辑
  const handleBackToEdit = () => {
    stopListening();
    stopSimulation();
    setIsStatusBarVisible(true);
    setViewMode('edit');
    setTrackingStatus('unstarted');
  };

  // 切换暂停/恢复
  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        stopListening();
        if (isSimulating) stopSimulation();
        setTrackingStatus('paused');
      } else {
        if (isSpeechSupported) startListening();
        setTrackingStatus('listening');
      }
      return next;
    });
  }, [isSpeechSupported, startListening, stopListening, isSimulating, stopSimulation]);

  // 点击句子手动跳转
  const handleSentenceClick = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      matcherRef.current.resetPosition(index);
      scrollToSentence(index, false);
    },
    [scrollToSentence]
  );

  // 上一段
  const handlePrevParagraph = useCallback(() => {
    if (script.paragraphs.length === 0) return;
    const currentParaId = script.sentences[currentIndex]?.paragraphIndex ?? 0;
    const targetParaId = Math.max(0, currentParaId - 1);
    const targetSentence = script.paragraphs[targetParaId].startSentenceIndex;

    setCurrentIndex(targetSentence);
    matcherRef.current.resetPosition(targetSentence);
    scrollToSentence(targetSentence, false);
  }, [currentIndex, script.paragraphs, script.sentences, scrollToSentence]);

  // 下一段
  const handleNextParagraph = useCallback(() => {
    if (script.paragraphs.length === 0) return;
    const currentParaId = script.sentences[currentIndex]?.paragraphIndex ?? 0;
    const targetParaId = Math.min(script.paragraphs.length - 1, currentParaId + 1);
    const targetSentence = script.paragraphs[targetParaId].startSentenceIndex;

    setCurrentIndex(targetSentence);
    matcherRef.current.resetPosition(targetSentence);
    scrollToSentence(targetSentence, false);
  }, [currentIndex, script.paragraphs, script.sentences, scrollToSentence]);

  // 重新校准
  const handleRecalibrate = useCallback(() => {
    matcherRef.current.clearBuffer();
    matcherRef.current.resetPosition(currentIndex);
    setCurrentBufferDisplay('');
    setLastMatchResult(null);
    setTrackingStatus('listening');
    resumeAutoScroll();
  }, [currentIndex, resumeAutoScroll]);

  // 循环切换行距：3档调节 (1.4 -> 1.6 -> 1.8，默认 1.6)
  const LINE_HEIGHT_PRESETS = [1.4, 1.6, 1.8];
  const handleCycleLineHeight = useCallback(() => {
    setLineHeight((prev) => {
      const idx = LINE_HEIGHT_PRESETS.findIndex((lh) => Math.abs(lh - prev) < 0.05);
      const nextIdx = (idx + 1) % LINE_HEIGHT_PRESETS.length;
      return LINE_HEIGHT_PRESETS[nextIdx];
    });
  }, []);

  // 全局快捷键绑定 (Space, ArrowLeft, ArrowRight, R, +, -, L, D)
  useEffect(() => {
    if (viewMode !== 'read') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 若聚焦在输入框内，不拦截按键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevParagraph();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextParagraph();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRecalibrate();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setFontSize((prev) => Math.min(48, prev + 2));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setFontSize((prev) => Math.max(18, prev - 2));
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleCycleLineHeight();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setIsDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    viewMode,
    handleTogglePause,
    handlePrevParagraph,
    handleNextParagraph,
    handleRecalibrate,
    handleCycleLineHeight
  ]);

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {viewMode === 'edit' ? (
        <div className="w-full h-full overflow-y-auto">
          <EditorView
            rawText={rawText}
            onChangeText={setRawText}
            onStartReading={handleStartReading}
            isSpeechSupported={isSpeechSupported}
          />
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col w-full h-full overflow-hidden">
          {/* 顶部状态栏（移动端跟读时隐藏） */}
          {isStatusBarVisible && (
            <StatusBar
              status={trackingStatus}
              isListening={isListening || isSimulating}
              currentSentence={currentIndex}
              totalSentences={script.totalSentences}
              isManualOverridden={isManualOverridden}
              onResumeAutoScroll={resumeAutoScroll}
              onToggleDebug={() => setIsDebugOpen((prev) => !prev)}
              onBackToEdit={handleBackToEdit}
              isDebugOpen={isDebugOpen}
            />
          )}

          {/* 错误提示横幅 */}
          {speechError && (
            <div className="bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs px-4 py-2 flex items-center justify-between">
              <span>{speechError}</span>
              <button
                onClick={handleRecalibrate}
                className="underline hover:text-white"
              >
                重试
              </button>
            </div>
          )}

          {/* 提词器阅读视口 */}
          <div className="relative flex-1 w-full h-full overflow-hidden">
            <ReaderView
              ref={containerRef}
              script={script}
              currentSentenceIndex={currentIndex}
              fontSize={fontSize}
              lineHeight={lineHeight}
              isStatusBarVisible={isStatusBarVisible}
              onSentenceClick={handleSentenceClick}
            />
          </div>

          {/* 底部悬浮控制条（含返回编辑、播放控制、生动简洁的进度显示、字号与行距） */}
          <ControlBar
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onPrevParagraph={handlePrevParagraph}
            onNextParagraph={handleNextParagraph}
            currentSentenceIndex={currentIndex}
            totalSentences={script.totalSentences}
            fontSize={fontSize}
            onIncreaseFontSize={() => setFontSize((s) => Math.min(48, s + 2))}
            onDecreaseFontSize={() => setFontSize((s) => Math.max(18, s - 2))}
            lineHeight={lineHeight}
            onCycleLineHeight={handleCycleLineHeight}
            onBackToEdit={handleBackToEdit}
          />

          {/* 调试面板 */}
          <DebugPanel
            isOpen={isDebugOpen}
            onClose={() => setIsDebugOpen(false)}
            speechBuffer={currentBufferDisplay}
            lastTranscript={lastSpeechFragment}
            currentIndex={currentIndex}
            currentSentence={script.sentences[currentIndex]}
            lastResult={lastMatchResult}
            consecutiveHits={consecutiveHits}
            isSimulating={isSimulating}
            speedMultiplier={speedMultiplier}
            onToggleSimulator={() => {
              if (isSimulating) {
                stopSimulation();
              } else {
                startSimulation();
              }
            }}
            onChangeSpeed={setSpeedMultiplier}
            onInjectOffScript={injectOffScript}
            onInjectSkip={injectSkipAhead}
            onClearBuffer={() => {
              matcherRef.current.clearBuffer();
              setCurrentBufferDisplay('');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default App;
