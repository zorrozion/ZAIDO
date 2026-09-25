import { forwardRef } from 'react';
import { ScriptModel, SentenceItem } from '../types/speech';

interface ReaderViewProps {
  script: ScriptModel;
  currentSentenceIndex: number;
  fontSize: number;
  onSentenceClick: (index: number) => void;
}

export const ReaderView = forwardRef<HTMLDivElement, ReaderViewProps>(({
  script,
  currentSentenceIndex,
  fontSize,
  onSentenceClick
}, ref) => {
  return (
    <div
      ref={ref}
      className="relative w-full h-[calc(100vh-2.75rem)] sm:h-[calc(100vh-3rem)] overflow-y-auto px-4 sm:px-12 md:px-20 lg:px-36 xl:px-56 pt-8 sm:pt-16 pb-28 sm:pb-48 scroll-smooth"
      style={{
        fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", -apple-system, sans-serif'
      }}
    >
      {/* 视口约 38% 黄金阅读参考指示标尺（微弱半透明） */}
      <div
        className="pointer-events-none fixed left-0 w-full z-10 hidden sm:block border-t border-dashed border-blue-500/15"
        style={{ top: 'calc(2.75rem + 38vh)' }}
      >
        <span className="absolute left-2 -top-3 text-[10px] font-mono tracking-wider text-blue-400/40 uppercase">
          FOCUS 38%
        </span>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
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
                  lineHeight: '1.85'
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
