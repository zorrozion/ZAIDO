import React from 'react';
import { Mic, MicOff, ArrowLeft, Terminal, AlertCircle } from 'lucide-react';
import { TrackingStatus } from '../types/speech';

interface StatusBarProps {
  status: TrackingStatus;
  isListening: boolean;
  currentSentence: number;
  totalSentences: number;
  isManualOverridden: boolean;
  onResumeAutoScroll: () => void;
  onToggleDebug: () => void;
  onBackToEdit: () => void;
  isDebugOpen: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  isListening,
  currentSentence,
  totalSentences,
  isManualOverridden,
  onResumeAutoScroll,
  onToggleDebug,
  onBackToEdit,
  isDebugOpen
}) => {
  const progressPercent = totalSentences > 0
    ? Math.min(100, Math.round(((currentSentence + 1) / totalSentences) * 100))
    : 0;

  // 状态显示胶囊标签配置
  const getStatusBadge = () => {
    if (isManualOverridden) {
      return (
        <button
          onClick={onResumeAutoScroll}
          className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors shrink-0"
          title="点击立即恢复自动居中跟随"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>手动控制 · 点此恢复</span>
        </button>
      );
    }

    switch (status) {
      case 'locked':
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>已锁定</span>
          </div>
        );
      case 'tracking':
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>跟随中</span>
          </div>
        );
      case 'weak':
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
            <span>脱稿驻留</span>
          </div>
        );
      case 'searching':
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>寻找中...</span>
          </div>
        );
      case 'paused':
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>已暂停</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>收音异常</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>就绪</span>
          </div>
        );
    }
  };

  return (
    <header
      onTouchMove={(e) => e.stopPropagation()}
      className="sticky top-0 z-40 w-full h-11 sm:h-12 bg-slate-900/95 backdrop-blur border-b border-slate-800/80 px-2.5 sm:px-6 flex items-center justify-between select-none touch-none overscroll-none"
    >
      {/* 左侧：返回编辑与标题 */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={onBackToEdit}
          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs sm:text-sm font-medium"
          title="返回修改讲稿"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">返回编辑</span>
        </button>

        <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center space-x-1.5">
          {isListening ? (
            <div className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">聆听中</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-slate-400 text-xs">
              <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">静音</span>
            </div>
          )}
        </div>
      </div>

      {/* 中间：状态胶囊 */}
      <div className="flex items-center space-x-2">
        {getStatusBadge()}
      </div>

      {/* 右侧：进度与调试开关 */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* 进度提示 */}
        <div className="flex items-baseline space-x-1 text-[11px] sm:text-xs text-slate-300 font-mono">
          <span className="text-slate-400 font-sans hidden sm:inline">进度</span>
          <span className="text-emerald-400 font-bold">{progressPercent}%</span>
          <span className="text-slate-500 hidden md:inline">
            ({currentSentence + 1}/{totalSentences})
          </span>
        </div>

        {/* 调试面板触发器 */}
        <button
          onClick={onToggleDebug}
          className={`p-1 sm:p-1.5 rounded-lg text-xs transition-colors flex items-center space-x-1 ${
            isDebugOpen
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="切换算法调试面板 (快捷键 D)"
        >
          <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[10px] font-mono hidden md:inline">D</span>
        </button>
      </div>
    </header>
  );
};
