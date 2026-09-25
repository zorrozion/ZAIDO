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

                  // 严防排版抖动与换行突变：
                  // 1. 严格锁定 font-normal，绝不因高亮切换字重导致字宽微扩引起整段重排
                  // 2. 移除左右内边距与外边距，纯色彩/背景渲染
                  // 3. 不向句尾注入空格字符，杜绝因空格产生的意外断行
                  let sentenceClass = 'transition-colors duration-150 inline cursor-pointer select-text font-normal rounded-sm ';

                  if (isCurrent) {
                    sentenceClass += 'text-white bg-blue-600/35 [box-decoration-break:clone] -webkit-[box-decoration-break:clone]';
                  } else if (isPast) {
                    sentenceClass += 'text-slate-500 hover:text-slate-400 bg-transparent';
                  } else {
                    sentenceClass += 'text-slate-200/90 hover:text-white bg-transparent';
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
