import React, { useRef } from 'react';
import { FileText, Upload, Sparkles, AlertTriangle, CheckCircle2, Mic } from 'lucide-react';
import { ALL_SAMPLES, SermonSample } from '../sampleData/sermons';

interface EditorViewProps {
  rawText: string;
  onChangeText: (text: string) => void;
  onStartReading: () => void;
  isSpeechSupported: boolean;
}

export const EditorView: React.FC<EditorViewProps> = ({
  rawText,
  onChangeText,
  onStartReading,
  isSpeechSupported
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = rawText.replace(/\s/g, '').length;
  // 主日讲道讲速（含宣读、顿歇、释经与祷告）约 130 ~ 150 字/分钟，中位数 140 字/分
  const PREACHING_WPM = 140;
  const estMinutes = Math.max(1, Math.round(charCount / PREACHING_WPM));
  const minMinutes = Math.max(1, Math.round(charCount / 150));
  const maxMinutes = Math.max(1, Math.round(charCount / 130));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onChangeText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSelectSample = (sample: SermonSample) => {
    onChangeText(sample.content);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 max-w-5xl mx-auto pb-24 sm:pb-12">
      {/* 头部品牌区 */}
      <header className="space-y-2 pt-2 sm:pt-6 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>本地优先 · 智能讲稿跟随器</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          ZAIDAO <span className="text-blue-500">载道</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
          让讲稿跟着你的声音移动。面向牧者、传道人与演讲者的免翻页智能提词工具。
        </p>

        {/* 浏览器兼容性提醒 */}
        {!isSpeechSupported && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>当前浏览器不支持实时语音识别，建议使用最新版 Chrome 或 Edge 获得最佳跟随体验。</span>
          </div>
        )}
      </header>

      {/* 预设讲章样例快捷载入 */}
      <div className="mt-5 sm:mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">一键载入真实测试讲章：</span>
          <span className="text-slate-500">点击自动填充</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ALL_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="flex flex-col text-left p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 transition-all group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                  {sample.title}
                </span>
                <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 ml-2">
                  {sample.estMinutes}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 主输入区 */}
      <main className="mt-4 sm:mt-6 flex-1 flex flex-col space-y-3 sm:space-y-4">
        <div className="relative flex-1 min-h-[220px] sm:min-h-[320px] flex flex-col">
          <textarea
            value={rawText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="在此处粘贴你的讲稿逐字稿，支持 5,000–10,000 字长篇文本……"
            className="w-full flex-1 min-h-[220px] sm:min-h-[340px] p-4 sm:p-6 bg-slate-900/90 rounded-2xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder:text-slate-600 text-sm sm:text-base leading-relaxed resize-y focus:outline-none transition-all font-sans"
          />

          {/* 底部输入框工具条 */}
          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700"
              title="支持导入 .txt 或 .md 文件"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>导入文件 (.txt / .md)</span>
            </button>
          </div>
        </div>

        {/* 统计指标与行动按钮（移动端固定贴底粘性定位，确保无论屏幕大小永远可见） */}
        <div className="sticky bottom-3 z-30 flex flex-row items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-black/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                <strong className="text-white font-mono">{charCount}</strong> 字
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 hidden sm:inline-block" />
              <span className="text-[11px] sm:text-sm text-slate-400">
                主日讲时：约 <strong className="text-white font-mono">{estMinutes}</strong> 分钟
                <span className="text-slate-500 text-[10px] sm:text-xs ml-1 font-mono">({minMinutes}–{maxMinutes} 分)</span>
              </span>
            </div>
          </div>

          <button
            onClick={onStartReading}
            disabled={charCount === 0}
            className="px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base shadow-xl shadow-blue-900/40 flex items-center justify-center space-x-1.5 sm:space-x-2 transition-all shrink-0"
          >
            <Mic className="w-4 h-4 sm:w-5 h-5" />
            <span>开始跟稿</span>
          </button>
        </div>
      </main>

      {/* 底部隐私声明与版权 */}
      <footer className="mt-6 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 text-center sm:text-left">
        <div className="flex items-center space-x-1.5 justify-center">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
          <span>ZAIDAO 载道仅在浏览器内存运行，不上传、不云端存储任何讲稿。</span>
        </div>
        <div>
          <span>快捷键提示：阅读时按 Space 暂停，按 D 打开调试，按 ←/→ 跳转段落</span>
        </div>
      </footer>
    </div>
  );
};
