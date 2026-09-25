import { forwardRef } from 'react';
import { ScriptModel, SentenceItem } from '../types/speech';

interface ReaderViewProps {
  script: ScriptModel;
  currentSentenceIndex: number;
  fontSize: number;
  lineHeight: number;
  onSentenceClick: (index: number) => void;
}

export const ReaderView = forwardRef<HTMLDivElement, ReaderViewProps>(({
  script,
  currentSentenceIndex,
  fontSize,
  lineHeight,
  onSentenceClick
}, ref) => {
  return (
    <div
      ref={ref}
      className="relative w-full h-[calc(100vh-2.75rem)] sm:h-[calc(100vh-3rem)] overflow-y-auto px-2 sm:px-6 md:px-8 lg:px-12 pt-6 sm:pt-10 pb-24 sm:pb-40 scroll-smooth"
      style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif'
      }}
    >
      {/* 视口约上五分之一 (20%) 黄金聚焦点参考指示标尺（微弱半透明） */}
      <div
        className="pointer-events-none fixed left-0 w-full z-10 hidden sm:block border-t border-dashed border-blue-500/20"
        style={{ top: 'calc(2.75rem + 20vh)' }}
      >
        <span className="absolute left-2 -top-3 text-[10px] font-mono tracking-wider text-blue-400/50 uppercase">
          FOCUS 20%
        </span>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {script.paragraphs.map((paragraph) => {
          return (
            <div
              key={paragraph.id}
              className="transition-all duration-300 relative group"
            >
              {/* 段落正文渲染 */}
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight.toString()
                }}
                className="tracking-wide"
              >
                {paragraph.sentences.map((sentence: SentenceItem) => {
                  const isCurrent = sentence.globalIndex === currentSentenceIndex;
                  const isPast = sentence.globalIndex < currentSentenceIndex;

                  let sentenceClass = 'transition-all duration-300 rounded px-1 -mx-1 inline cursor-pointer select-text ';

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
