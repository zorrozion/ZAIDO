import { useEffect, useRef, useState, useCallback } from 'react';

interface AutoScrollOptions {
  currentSentenceIndex: number;
  isPaused: boolean;
  manualCooldownMs?: number; // 默认 4000ms
}

export function useAutoScroll({
  currentSentenceIndex,
  isPaused,
  manualCooldownMs = 4000
}: AutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isManualOverridden, setIsManualOverridden] = useState(false);
  const cooldownTimerRef = useRef<any>(null);
  const isProgrammaticScrollRef = useRef(false);

  // 精准平滑滚动到指定句子，保持在视口约 38% 黄金线上
  const scrollToSentence = useCallback((index: number, immediate: boolean = false) => {
    const container = containerRef.current;
    if (!container) return;

    const el = document.getElementById(`sentence-${index}`);
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // 句子顶部相对于容器滚动原点的绝对距离
    const elTopRelativeToContainer = elRect.top - containerRect.top + container.scrollTop;

    // 目标位置：让句子顶部停留在视口上五分之一处（约 20% 高度），留出下方 80% 视野显示未来讲稿
    const targetRatio = 0.20;
    const targetScrollTop = Math.max(0, elTopRelativeToContainer - container.clientHeight * targetRatio);

    // 标记为程序触发的平滑滚动，避免被滚轮监听器误判为人工操作
    isProgrammaticScrollRef.current = true;
    container.scrollTo({
      top: targetScrollTop,
      behavior: immediate ? 'auto' : 'smooth'
    });

    // 500ms 后解除程序触发标记
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  }, []);

  // 监听用户的人工滚动操作（滚轮、触控拖拽、键盘上下翻页）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleUserScrollInteraction = () => {
      // 如果是系统触发的平滑滚动，忽略
      if (isProgrammaticScrollRef.current) return;

      setIsManualOverridden(true);
      clearTimeout(cooldownTimerRef.current);

      cooldownTimerRef.current = setTimeout(() => {
        setIsManualOverridden(false);
      }, manualCooldownMs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        handleUserScrollInteraction();
      }
    };

    container.addEventListener('wheel', handleUserScrollInteraction, { passive: true });
    container.addEventListener('touchmove', handleUserScrollInteraction, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleUserScrollInteraction);
      container.removeEventListener('touchmove', handleUserScrollInteraction);
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(cooldownTimerRef.current);
    };
  }, [manualCooldownMs]);

  // 核心自动跟随驱动逻辑
  useEffect(() => {
    if (isPaused || isManualOverridden) return;

    const container = containerRef.current;
    if (!container) return;

    const el = document.getElementById(`sentence-${currentSentenceIndex}`);
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // 计算当前句子在视口中的百分比位置
    const currentViewportRatio = (elRect.top - containerRect.top) / container.clientHeight;

    // 死区设计（Deadband）：
    // 若当前句在 14% ~ 26% 的合理可视范围内，允许其保持静止，避免每换一句就产生微小抖动
    if (currentViewportRatio < 0.14 || currentViewportRatio > 0.26) {
      scrollToSentence(currentSentenceIndex, false);
    }
  }, [currentSentenceIndex, isPaused, isManualOverridden, scrollToSentence]);

  return {
    containerRef,
    isManualOverridden,
    scrollToSentence,
    resumeAutoScroll: () => {
      clearTimeout(cooldownTimerRef.current);
      setIsManualOverridden(false);
      scrollToSentence(currentSentenceIndex, false);
    }
  };
}
