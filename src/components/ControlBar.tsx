import React from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface ControlBarProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onPrevParagraph: () => void;
  onNextParagraph: () => void;
  onRecalibrate: () => void;
  fontSize: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isPaused,
  onTogglePause,
  onPrevParagraph,
  onNextParagraph,
  onRecalibrate,
  fontSize,
  onIncreaseFontSize,
  onDecreaseFontSize
}) => {
  return (
    <aside aria-label="讲稿快捷控制" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-2xl shadow-black/60 select-none">
        {/* 上一段 */}
        <button
          onClick={onPrevParagraph}
          className="flex items-center space-x-1 px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-all text-xs font-medium"
          title="上一段 (快捷键 ←)"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">上一段</span>
        </button>

        {/* 暂停 / 继续跟随 */}
        <button
          onClick={onTogglePause}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl font-medium text-xs transition-all ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'
          }`}
          title="暂停 / 恢复自动跟随 (快捷键 Space)"
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>恢复跟随</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>暂停跟随</span>
            </>
          )}
        </button>

        {/* 下一段 */}
        <button
          onClick={onNextParagraph}
          className="flex items-center space-x-1 px-2.5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-all text-xs font-medium"
          title="下一段 (快捷键 →)"
        >
          <span className="hidden sm:inline">下一段</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

        {/* 重新校准 */}
        <button
          onClick={onRecalibrate}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="重新校准与重置缓冲区 (快捷键 R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* 字号缩小 */}
        <button
          onClick={onDecreaseFontSize}
          disabled={fontSize <= 20}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="减小字号 (快捷键 -)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* 当前字号显示 */}
        <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[28px] text-center">
          {fontSize}
        </span>

        {/* 字号放大 */}
        <button
          onClick={onIncreaseFontSize}
          disabled={fontSize >= 48}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="增大字号 (快捷键 +)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
