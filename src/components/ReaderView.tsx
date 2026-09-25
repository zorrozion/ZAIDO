import { forwardRef } from 'react';
import { ScriptModel, SentenceItem } from '../types/speech';

interface ReaderViewProps {
  script: ScriptModel;
  currentSentenceIndex: number;
  fontSize: number;
  lineHeight: number;
  isStatusBarVisible?: boolean;
  onSentenceClick: (index: number) => void;
}

export const ReaderView = forwardRef<HTMLDivElement, ReaderViewProps>(({
  script,
  currentSentenceIndex,
  fontSize,
  lineHeight,
  isStatusBarVisible = true,
  onSentenceClick
}, ref) => {
  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden px-0 pt-3 sm:pt-4 pb-28 sm:pb-36 scroll-smooth select-none"
      style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif'
      }}
    >
      {/* 视口上方 5% 黄金聚焦点参考线（仅保留纯线条，无文字） */}
      <div
        className="pointer-events-none fixed left-0 w-full z-10 border-t border-dashed border-blue-500/30"
        style={{ top: isStatusBarVisible ? 'calc(2.75rem + 5%)' : '5%' }}
      />

      <div className="w-full px-0 space-y-5 sm:space-y-7">
        {script.paragraphs.map((paragraph) => {
          return (
            <div
              key={paragraph.id}
              className="transition-all duration-300 relative group w-full px-0"
            >
              {/* 段落正文渲染：左右完全不留边距 */}
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight.toString()
                }}
                className="tracking-wide break-words w-full px-0"
              >
                {paragraph.sentences.map((sentence: SentenceItem) => {
                  const isCurrent = sentence.globalIndex === currentSentenceIndex;
                  const isPast = sentence.globalIndex < currentSentenceIndex;

                  let sentenceClass = 'transition-all duration-300 rounded inline cursor-pointer select-text px-0.5 ';

                  if (isCurrent) {
                    sentenceClass += 'text-white font-medium bg-blue-500/25 shadow-sm shadow-blue-500/10 ring-1 ring-blue-400/40';
                  } else if (isPast) {
                    sentenceClass += 'text-slate-500 hover:text-slate-400';
                  } else {
                    sentenceClass += 'text-slate-200/90 hover:text-white';
                  }

                  return (
                    <span
                      key={sentence.globalIndex}
                      id={`sentence-${sentence.globalIndex}`}
                      onClick={() => onSentenceClick(sentence.globalIndex)}
                      className={sentenceClass}
                      title={`点击跳转至此句 (句号: #${sentence.globalIndex + 1})`}
                    >
                      {sentence.rawText}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ReaderView.displayName = 'ReaderView';
