import { X, Play, Square, MessageSquareOff, SkipForward, RefreshCw } from 'lucide-react';
import { MatchResult, SentenceItem } from '../types/speech';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  speechBuffer: string;
  lastTranscript: string;
  currentIndex: number;
  currentSentence?: SentenceItem;
  lastResult: MatchResult | null;
  consecutiveHits: number;
  // 模拟器控制
  isSimulating: boolean;
  speedMultiplier: number;
  onToggleSimulator: () => void;
  onChangeSpeed: (speed: number) => void;
  onInjectOffScript: () => void;
  onInjectSkip: () => void;
  onClearBuffer: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  isOpen,
  onClose,
  speechBuffer,
  lastTranscript,
  currentIndex,
  currentSentence,
  lastResult,
  consecutiveHits,
  isSimulating,
  speedMultiplier,
  onToggleSimulator,
  onChangeSpeed,
  onInjectOffScript,
  onInjectSkip,
  onClearBuffer
}) => {
  if (!isOpen) return null;

  const candidateIdx = lastResult?.candidateIndex ?? currentIndex;
  const score = lastResult?.score ?? 0;
  const detail = lastResult?.scoringDetail;

  return (
    <div className="fixed right-4 bottom-24 z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-4 text-xs font-mono text-slate-300 space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-semibold text-white tracking-wide">算法调试面板 (DEBUG)</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 模拟器快捷推流控制器 */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px] font-sans font-medium">语音推流模拟器 (免开麦)</span>
          <div className="flex items-center space-x-1">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  speedMultiplier === s
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onToggleSimulator}
            className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg font-sans font-medium text-xs transition-colors ${
              isSimulating
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>停止模拟</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>自动朗读推流</span>
              </>
            )}
          </button>

          <button
            onClick={onInjectOffScript}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-300 font-sans text-xs"
            title="注入脱稿题外话，测试原位驻留"
          >
            <MessageSquareOff className="w-3.5 h-3.5" />
            <span>注入脱稿插话</span>
          </button>
        </div>

        <button
          onClick={onInjectSkip}
          className="w-full flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 font-sans text-xs"
          title="瞬移 5 句，测试连续确认跳跃"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>模拟跳读 (向前跳 5 句)</span>
        </button>
      </div>

      {/* 实时语音输入 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>最近收音片段:</span>
        </div>
        <div className="p-2 rounded bg-slate-950 text-slate-200 border border-slate-800 break-all min-h-[32px]">
          {lastTranscript || '<暂无最新语音片段>'}
        </div>
      </div>

      {/* 语音缓冲区 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>语音缓冲区 (Buffer: {speechBuffer.length} 字):</span>
          <button
            onClick={onClearBuffer}
            className="flex items-center space-x-1 text-slate-400 hover:text-white"
            title="清空语音缓冲区"
          >
            <RefreshCw className="w-3 h-3" />
            <span>清空</span>
          </button>
        </div>
        <div className="p-2 rounded bg-slate-950 text-emerald-400/90 border border-slate-800 text-[11px] break-all max-h-20 overflow-y-auto">
          {speechBuffer || '<缓冲区为空>'}
        </div>
      </div>

      {/* 核心指标表格 */}
      <div className="space-y-1.5 border-t border-slate-800 pt-2">
        <div className="flex justify-between">
          <span className="text-slate-400">当前位置 (Current):</span>
          <span className="text-white font-bold">句 #{currentIndex + 1}</span>
        </div>
        <div className="text-[11px] text-slate-400 truncate pl-2">
          {currentSentence ? `"${currentSentence.rawText}"` : '-'}
        </div>

        <div className="flex justify-between pt-1">
          <span className="text-slate-400">候选位置 (Candidate):</span>
          <span className="text-blue-400 font-bold">句 #{candidateIdx + 1}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">综合得分 (Score):</span>
          <span
            className={`font-bold ${
              score >= 0.68 ? 'text-emerald-400' : score >= 0.5 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {score.toFixed(3)}
          </span>
        </div>

        {detail && (
          <div className="pl-2 space-y-0.5 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>- Dice 文本重合:</span>
              <span className="text-slate-200">{detail.diceScore} (×0.50)</span>
            </div>
            <div className="flex justify-between">
              <span>- 关键词命中率:</span>
              <span className="text-slate-200">{detail.keywordScore} (×0.25)</span>
            </div>
            <div className="flex justify-between">
              <span>- 空间连续性分:</span>
              <span className="text-slate-200">{detail.continuityScore} (×0.25)</span>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-1">
          <span className="text-slate-400">置信等级 (Confidence):</span>
          <span
            className={`uppercase font-semibold ${
              lastResult?.confidence === 'high'
                ? 'text-emerald-400'
                : lastResult?.confidence === 'medium'
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
          >
            {lastResult?.confidence || 'none'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">搜索模式 (Mode):</span>
          <span className="text-purple-400 font-semibold uppercase">
            {lastResult?.mode || 'local'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">连续确认命中数:</span>
          <span className="text-cyan-400 font-bold">{consecutiveHits}</span>
        </div>
      </div>
    </div>
  );
};
