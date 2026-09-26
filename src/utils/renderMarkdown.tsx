import React from 'react';

/**
 * 自动修补跨断句的悬挂 Markdown 语法标记（如句首仅有闭合 ** 或句尾仅有开启 **）
 * 确保单个断句独立解析时不产生残缺标记泄漏
 */
function balanceSentenceMarkdown(text: string): string {
  let processed = text;

  // 1. 检查粗体 ** 与 __
  const countDoubleAsterisk = (processed.match(/\*\*/g) || []).length;
  if (countDoubleAsterisk % 2 !== 0) {
    if (processed.startsWith('**')) {
      processed = processed + '**';
    } else if (processed.endsWith('**')) {
      processed = '**' + processed;
    }
  }

  const countDoubleUnder = (processed.match(/__/g) || []).length;
  if (countDoubleUnder % 2 !== 0) {
    if (processed.startsWith('__')) {
      processed = processed + '__';
    } else if (processed.endsWith('__')) {
      processed = '__' + processed;
    }
  }

  // 2. 检查删除线 ~~
  const countTilde = (processed.match(/~~/g) || []).length;
  if (countTilde % 2 !== 0) {
    if (processed.startsWith('~~')) {
      processed = processed + '~~';
    } else if (processed.endsWith('~~')) {
      processed = '~~' + processed;
    }
  }

  // 3. 检查行内代码 `
  const countBacktick = (processed.match(/`/g) || []).length;
  if (countBacktick % 2 !== 0) {
    if (processed.startsWith('`')) {
      processed = processed + '`';
    } else if (processed.endsWith('`')) {
      processed = '`' + processed;
    }
  }

  // 4. 检查高亮 ==
  const countEqual = (processed.match(/==/g) || []).length;
  if (countEqual % 2 !== 0) {
    if (processed.startsWith('==')) {
      processed = processed + '==';
    } else if (processed.endsWith('==')) {
      processed = '==' + processed;
    }
  }

  // 5. 检查单星号斜体 (排除 ** 后的独立 *)
  const strippedBold = processed.replace(/\*\*/g, '');
  const countSingleStar = (strippedBold.match(/\*/g) || []).length;
  if (countSingleStar % 2 !== 0) {
    if (processed.startsWith('*')) {
      processed = processed + '*';
    } else if (processed.endsWith('*')) {
      processed = '*' + processed;
    }
  }

  return processed;
}

/**
 * 行内 Markdown 正则匹配：
 * 优先匹配 3 级粗斜体，再匹配 2 级粗体/删除线/代码/高亮，最后匹配 1 级斜体
 */
const INLINE_TOKEN_REGEX = /(\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~|`[^`]+`|==[^=]+==)/g;

/**
 * 将包含行内 Markdown 标记的文本解析为 React 节点流
 */
export function renderInlineMarkdown(rawText: string, baseKey: string = ''): React.ReactNode[] {
  if (!rawText) return [];

  const balanced = balanceSentenceMarkdown(rawText);
  const parts = balanced.split(INLINE_TOKEN_REGEX);
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const key = `${baseKey}-${i}`;

    // 粗斜体 ***text*** 或 ___text___
    if (
      (part.startsWith('***') && part.endsWith('***') && part.length >= 6) ||
      (part.startsWith('___') && part.endsWith('___') && part.length >= 6)
    ) {
      nodes.push(
        <strong key={key} className="font-bold italic text-inherit">
          {part.slice(3, -3)}
        </strong>
      );
    }
    // 粗体 **text** 或 __text__
    else if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      nodes.push(
        <strong key={key} className="font-bold text-inherit">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // 斜体 *text* 或 _text_
    else if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      nodes.push(
        <em key={key} className="italic text-inherit">
          {part.slice(1, -1)}
        </em>
      );
    }
    // 删除线 ~~text~~
    else if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      nodes.push(
        <del key={key} className="line-through opacity-75 text-inherit">
          {part.slice(2, -2)}
        </del>
      );
    }
    // 行内代码 / 强调徽章 `code`
    else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/90 font-mono text-[0.88em] border border-slate-700/60 text-blue-300 font-normal inline-block"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // 高亮 ==text==
    else if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
      nodes.push(
        <mark
          key={key}
          className="bg-amber-400/25 text-amber-200 px-1 py-0.5 rounded font-normal"
        >
          {part.slice(2, -2)}
        </mark>
      );
    }
    // 普通文本片段
    else {
      nodes.push(part);
    }
  }

  return nodes;
}

/**
 * 句级 Markdown 渲染入口：识别块级前缀（标题、引用、列表）并级联处理行内富文本
 */
export function renderSentenceContent(rawText: string, sentenceIndex: number): React.ReactNode {
  if (!rawText) return null;

  // 1. 一级大标题 # 标题
  if (/^#\s+/.test(rawText)) {
    const cleanContent = rawText.replace(/^#\s+/, '');
    return (
      <span className="block text-[1.35em] font-extrabold text-blue-400 mt-2 mb-1 tracking-tight">
        {renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}
      </span>
    );
  }

  // 2. 二级标题 ## 标题
  if (/^##\s+/.test(rawText)) {
    const cleanContent = rawText.replace(/^##\s+/, '');
    return (
      <span className="block text-[1.2em] font-bold text-blue-400 mt-2 mb-1 tracking-tight">
        {renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}
      </span>
    );
  }

  // 3. 三级标题 ### 标题
  if (/^###\s+/.test(rawText)) {
    const cleanContent = rawText.replace(/^###\s+/, '');
    return (
      <span className="block text-[1.1em] font-bold text-sky-300 mt-1 mb-0.5 tracking-tight">
        {renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}
      </span>
    );
  }

  // 4. 四级及以下标题 #### 标题
  if (/^#{4,6}\s+/.test(rawText)) {
    const cleanContent = rawText.replace(/^#{4,6}\s+/, '');
    return (
      <span className="block text-[1.05em] font-semibold text-slate-200 mt-1">
        {renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}
      </span>
    );
  }

  // 5. 引用块 > 引用文本
  if (/^>\s+/.test(rawText)) {
    const cleanContent = rawText.replace(/^>\s+/, '');
    return (
      <span className="inline-block border-l-2 border-blue-500/70 pl-2.5 my-0.5 text-slate-200 italic">
        {renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}
      </span>
    );
  }

  // 6. 无序列表 - 项目 或 * 项目
  if (/^[-*]\s+/.test(rawText)) {
    const cleanContent = rawText.replace(/^[-*]\s+/, '');
    return (
      <span className="inline-flex items-baseline">
        <span className="text-blue-400 font-bold mr-1.5 select-none">•</span>
        <span>{renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}</span>
      </span>
    );
  }

  // 7. 有序列表 1. 项目
  const numberedMatch = rawText.match(/^(\d+)\.\s+(.*)/);
  if (numberedMatch) {
    const num = numberedMatch[1];
    const cleanContent = numberedMatch[2];
    return (
      <span className="inline-flex items-baseline">
        <span className="text-blue-400 font-mono font-bold mr-1.5 select-none">{num}.</span>
        <span>{renderInlineMarkdown(cleanContent, `s-${sentenceIndex}`)}</span>
      </span>
    );
  }

  // 常规句子：直接进行行内富文本解析
  return renderInlineMarkdown(rawText, `s-${sentenceIndex}`);
}
