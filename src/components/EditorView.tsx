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
  // 中文正常演讲讲速约 160 ~ 200 字/分钟，估算阅读时间
  const estMinutes = Math.max(1, Math.round(charCount / 180));

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 max-w-5xl mx-auto">
      {/* 头部品牌区 */}
      <header className="space-y-3 pt-4 sm:pt-8 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>V1 本地优先 · 智能讲稿跟随器</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Voice<span className="text-blue-500">Follow</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl">
          让讲稿跟着你的声音移动。面向牧者、传道人与演讲者的免翻页智能提词工具。
        </p>

        {/* 浏览器兼容性提醒 */}
        {!isSpeechSupported && (
          <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>当前浏览器不支持实时语音识别，建议使用最新版 Chrome 或 Edge 获得最佳跟随体验。</span>
          </div>
        )}
      </header>

      {/* 预设讲章样例快捷载入 */}
      <div className="mt-8 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">一键载入真实测试讲章：</span>
          <span className="text-slate-500">点击自动填充文本框</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ALL_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="flex flex-col text-left p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 transition-all group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                  {sample.title.split('：')[0]}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {sample.wordCount} 字
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 主输入区 */}
      <main className="mt-6 flex-1 flex flex-col space-y-4">
        <div className="relative flex-1 min-h-[360px] flex flex-col">
          <textarea
            value={rawText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="在此处粘贴你的讲稿逐字稿，支持 5,000–10,000 字长篇文本……"
            className="w-full flex-1 min-h-[380px] p-5 sm:p-6 bg-slate-900/90 rounded-2xl border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder:text-slate-600 text-base leading-relaxed resize-y focus:outline-none transition-all font-sans"
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
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors border border-slate-700"
              title="支持导入 .txt 或 .md 文件"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>导入文件 (.txt / .md)</span>
            </button>
          </div>
        </div>

        {/* 统计指标与行动按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center space-x-6 text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>
                字数：<strong className="text-white font-mono">{charCount}</strong> 字
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>
                预计讲时：约 <strong className="text-white font-mono">{estMinutes}</strong> 分钟
              </span>
            </div>
          </div>

          <button
            onClick={onStartReading}
            disabled={charCount === 0}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base shadow-xl shadow-blue-900/30 flex items-center justify-center space-x-2 transition-all"
          >
            <Mic className="w-5 h-5" />
            <span>开始跟稿</span>
          </button>
        </div>
      </main>

      {/* 底部隐私声明与版权 */}
      <footer className="mt-8 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500/80" />
          <span>隐私承诺：VoiceFollow V1 仅在浏览器内存运行，不上传、不云端存储任何讲稿。</span>
        </div>
        <div>
          <span>快捷键提示：阅读时按 Space 暂停，按 D 打开调试，按 ←/→ 跳转段落</span>
        </div>
      </footer>
    </div>
  );
};
