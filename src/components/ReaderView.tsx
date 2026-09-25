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
      {/* 视口上方 11% 黄金聚焦点参考线（仅保留纯线条，无文字） */}
      <div
        className="pointer-events-none fixed left-0 w-full z-10 border-t border-dashed border-blue-500/30"
        style={{ top: isStatusBarVisible ? 'calc(2.75rem + 11%)' : '11%' }}
      />

      <div className="w-full px-0 space-y-5 sm:space-y-7">
        {script.paragraphs.map((paragraph) => {
          return (
            <div
              key={paragraph.id}
              className="relative group w-full px-0"
            >
              {/* 段落正文渲染：左右完全不留边距 */}
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight.toString()
                }}
                className="tracking-wide break-words w-full px-0 font-normal"
              >
                {paragraph.sentences.map((sentence: SentenceItem) => {
                  const isCurrent = sentence.globalIndex === currentSentenceIndex;
                  const isPast = sentence.globalIndex < currentSentenceIndex;
                  const offset = sentence.globalIndex - currentSentenceIndex;

                  // 严防排版抖动与换行突变：统一锁定 font-normal，零内边距/外边距，纯色彩/背景渲染
                  let sentenceClass = 'transition-colors duration-150 inline cursor-pointer select-text font-normal rounded-sm ';

                  if (isCurrent) {
                    // 当前句：高对比聚焦
                    sentenceClass += 'text-white bg-blue-600/45 [box-decoration-break:clone] -webkit-[box-decoration-break:clone]';
                  } else if (offset > 0 && offset <= 2) {
                    // 紧跟的第 1、2 句：前瞻高亮区，彻底避免超前阅读未高亮内容
                    sentenceClass += 'text-slate-100 bg-blue-500/25 [box-decoration-break:clone] -webkit-[box-decoration-break:clone]';
                  } else if (offset === 3) {
                    // 之后第 3 句：轻度柔和前瞻高亮
                    sentenceClass += 'text-slate-200 bg-blue-500/15 [box-decoration-break:clone] -webkit-[box-decoration-break:clone]';
                  } else if (isPast) {
                    // 历史已读句：低亮沉底
                    sentenceClass += 'text-slate-500 hover:text-slate-400 bg-transparent';
                  } else {
                    // 远端未来句：常态预备
                    sentenceClass += 'text-slate-400/80 hover:text-white bg-transparent';
                  }

                  return (
                    <span
                      key={sentence.globalIndex}
                      id={`sentence-${sentence.globalIndex}`}
                      onClick={() => onSentenceClick(sentence.globalIndex)}
                      className={sentenceClass}
                      title={`点击跳转至此句 (第 ${sentence.globalIndex + 1} 句)`}
                    >
                      {sentence.rawText}
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
