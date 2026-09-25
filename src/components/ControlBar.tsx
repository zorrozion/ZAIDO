import React from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronsUpDown,
  ArrowLeft,
  Maximize,
  Minimize
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
  lineHeight: number;
  onCycleLineHeight: () => void;
  onBackToEdit?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isPaused,
  onTogglePause,
  onPrevParagraph,
  onNextParagraph,
  onRecalibrate,
  fontSize,
  onIncreaseFontSize,
  onDecreaseFontSize,
  lineHeight,
  onCycleLineHeight,
  onBackToEdit,
  isFullscreen,
  onToggleFullscreen
}) => {
  return (
    <aside
      aria-label="讲稿快捷控制"
      onTouchMove={(e) => e.stopPropagation()}
      className="fixed bottom-0 left-0 right-0 z-40 w-full flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,4px)] touch-none select-none"
    >
      <div className="pointer-events-auto flex items-center justify-between sm:justify-center w-full sm:w-auto max-w-2xl px-1.5 sm:px-3 py-1 sm:py-1.5 bg-slate-900/95 backdrop-blur-md border-t sm:border border-slate-700/80 sm:rounded-2xl shadow-2xl shadow-black/80 select-none touch-none">
        {/* 返回编辑 (移动端常驻，确保状态栏隐藏时依然随时可退出跟稿) */}
        {onBackToEdit && (
          <>
            <button
              onClick={onBackToEdit}
              className="flex items-center space-x-1 p-1.5 sm:px-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-all text-xs font-medium shrink-0"
              title="返回编辑讲稿"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">编辑</span>
            </button>
            <div className="h-3.5 w-px bg-slate-700/80 mx-0.5 sm:mx-1 shrink-0" />
          </>
        )}

        {/* 上一段 */}
        <button
          onClick={onPrevParagraph}
          className="flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-all text-xs font-medium shrink-0"
          title="上一段 (快捷键 ←)"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">上一段</span>
        </button>

        {/* 暂停 / 继续跟随（手机端纯图标显示三角形/双竖杠，桌面端展示文字） */}
        <button
          onClick={onTogglePause}
          className={`flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-medium text-xs transition-all shrink-0 ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40'
          }`}
          title={isPaused ? "恢复跟随 (快捷键 Space)" : "暂停跟随 (快捷键 Space)"}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 fill-white shrink-0" />
              <span className="hidden sm:inline ml-1.5 whitespace-nowrap">恢复跟随</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 fill-white shrink-0" />
              <span className="hidden sm:inline ml-1.5 whitespace-nowrap">暂停跟随</span>
            </>
          )}
        </button>

        {/* 下一段 */}
        <button
          onClick={onNextParagraph}
          className="flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-all text-xs font-medium shrink-0"
          title="下一段 (快捷键 →)"
        >
          <span className="hidden sm:inline">下一段</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-3.5 w-px bg-slate-700/80 mx-0.5 sm:mx-1 shrink-0" />

        {/* 重新校准 */}
        <button
          onClick={onRecalibrate}
          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          title="重新校准与重置缓冲区 (快捷键 R)"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* 字号缩小 */}
        <button
          onClick={onDecreaseFontSize}
          disabled={fontSize <= 18}
          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          title="减小字号 (快捷键 -)"
        >
          <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* 当前字号显示 */}
        <span className="text-[11px] font-mono text-slate-400 px-0.5 min-w-[20px] text-center select-none shrink-0">
          {fontSize}
        </span>

        {/* 字号放大 */}
        <button
          onClick={onIncreaseFontSize}
          disabled={fontSize >= 48}
          className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          title="增大字号 (快捷键 +)"
        >
          <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="h-3.5 w-px bg-slate-700/80 mx-0.5 sm:mx-1 shrink-0" />

        {/* 行距调节 (循环三档: 1.4 -> 1.6 -> 1.8，默认 1.6) */}
        <button
          onClick={onCycleLineHeight}
          className="flex items-center space-x-0.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          title={`切换行距 (当前 ${lineHeight.toFixed(1)} 倍，共3档: 1.4 / 1.6 / 1.8，快捷键 L)`}
        >
          <ChevronsUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
          <span className="text-[11px] font-mono text-slate-300">
            {lineHeight.toFixed(1)}
          </span>
        </button>

        {/* 全屏切换 */}
        {onToggleFullscreen && (
          <>
            <div className="h-3.5 w-px bg-slate-700/80 mx-0.5 sm:mx-1 shrink-0" />
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
              title={isFullscreen ? "退出全屏" : "进入全屏"}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
