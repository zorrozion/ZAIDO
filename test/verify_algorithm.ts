import { parseScript } from '../src/utils/splitText.ts';
import { normalizeText, cleanSpeechWithFillerDiscount } from '../src/utils/normalizeText.ts';
import { scoreCandidateSentence } from '../src/utils/similarity.ts';
import { VoiceFollowMatcher } from '../src/utils/matcher.ts';
import { SAMPLE_SERMON_1K, SAMPLE_SERMON_10K } from '../src/sampleData/sermons.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('=== TEST SUITE 1: 文本解析与正规化 ===');
const norm1 = normalizeText('弟兄姊妹，今天我们来看彼得后书2:9！“主知道搭救……”');
assert(!norm1.includes('，') && !norm1.includes('！') && !norm1.includes('“'), '标点符号已被正确剔除');
assert(norm1.includes('主知道搭救'), '核心文字得以保留');

const cleanedDiscount = cleanSpeechWithFillerDiscount('那个弟兄姊妹然后啊我们来看一下嗯');
assert(!cleanedDiscount.includes('啊') && !cleanedDiscount.includes('嗯'), '语气词已折减');

const parsed1k = parseScript(SAMPLE_SERMON_1K.content);
console.log(`- 1k 样本解析完成: ${parsed1k.totalSentences} 句, ${parsed1k.totalParagraphs} 段, ${parsed1k.totalChars} 字`);
assert(parsed1k.totalSentences >= 15, '1k 样本句子切分正常');

const parsed10k = parseScript(SAMPLE_SERMON_10K.content);
console.log(`- 10k 样本解析完成: ${parsed10k.totalSentences} 句, ${parsed10k.totalParagraphs} 段, ${parsed10k.totalChars} 字`);
assert(parsed10k.totalSentences >= 80, '10k 样本句子切分正常');
assert(parsed10k.totalChars >= 6000, '10k 样本字数符合要求（纯文本 6,000+ 字，含标点空格约 8,500 字）');

console.log('\n=== TEST SUITE 2: 文本相似度与关键词打分 ===');
const targetSentence = parsed1k.sentences[1]; // "今天我们要一同思想的主题是：敬虔生活的试炼与搭救。"
const identicalSpeech = targetSentence.cleanText;
const scoreExact = scoreCandidateSentence(targetSentence, 0, identicalSpeech);
console.log(`- 精确匹配得分: ${scoreExact.totalScore} (Dice: ${scoreExact.diceScore}, KW: ${scoreExact.keywordScore}, Cont: ${scoreExact.continuityScore})`);
assert(scoreExact.totalScore >= 0.85, '精确匹配得分应当高于 0.85');

// 带有口语语气词与同义替换（如“一起”代替“一同”，“就是”等语气词）
const fuzzySpeech = '今天我们要一起思想的主题就是敬虔生活的试炼与搭救呢';
const scoreFuzzy = scoreCandidateSentence(targetSentence, 0, fuzzySpeech);
console.log(`- 包含口语错词/语气词得分: ${scoreFuzzy.totalScore} (Dice: ${scoreFuzzy.diceScore}, KW: ${scoreFuzzy.keywordScore})`);
assert(scoreFuzzy.totalScore >= 0.65, '轻微错词与口语语气词仍应保持高置信度');

// 完全无关的文本
const unrelatedSpeech = '今天天气真不错大家中午去哪里吃饭呢';
const scoreUnrelated = scoreCandidateSentence(targetSentence, 0, unrelatedSpeech);
console.log(`- 无关文本得分: ${scoreUnrelated.totalScore}`);
assert(scoreUnrelated.totalScore < 0.40, '无关文本得分应当很低');

console.log('\n=== TEST SUITE 3: 状态机单向锁定与推进 ===');
const matcher = new VoiceFollowMatcher(0);

// 第 0 步
let d1 = matcher.processStep(parsed1k.sentences[0].cleanText, parsed1k.sentences);
console.log(`- 输入第0句语音 -> 位置: ${d1.newIndex}, 状态: ${d1.status}`);
assert(d1.newIndex === 0, '首句保持在 0');

// 顺延讲第 1 句
let d2 = matcher.processStep(parsed1k.sentences[1].cleanText, parsed1k.sentences);
console.log(`- 输入第1句语音 -> 位置: ${d2.newIndex}, 状态: ${d2.status}`);
assert(d2.newIndex === 1, '自然流转推进到第 1 句');

// 顺延讲第 2 句
let d3 = matcher.processStep(parsed1k.sentences[2].cleanText, parsed1k.sentences);
console.log(`- 输入第2句语音 -> 位置: ${d3.newIndex}, 状态: ${d3.status}`);
assert(d3.newIndex === 2, '自然流转推进到第 2 句');

console.log('\n=== TEST SUITE 4: 脱稿驻留测试 (宁可少动，绝不乱跳) ===');
// 讲者突然脱稿讲了 3 句题外话
for (let i = 0; i < 3; i++) {
  const offScriptDecision = matcher.processStep(
    '弟兄姊妹我们在这里稍微停顿一下其实我上个礼拜经历了一件非常有趣的事情',
    parsed1k.sentences
  );
  console.log(`- 脱稿第 ${i + 1} 轮 -> 位置: ${offScriptDecision.newIndex}, 状态: ${offScriptDecision.status}`);
  assert(offScriptDecision.newIndex === 2, '脱稿期间严禁改变当前阅读句，必须原位驻留');
  if (i > 0) {
    assert(offScriptDecision.status === 'weak' || offScriptDecision.status === 'searching', '持续脱稿后状态应显示脱稿驻留或寻找');
  }
}

// 讲者脱稿结束后重新回归讲稿第 3 句
let recoveryDecision = matcher.processStep(parsed1k.sentences[3].cleanText, parsed1k.sentences);
console.log(`- 脱稿后恢复第3句 -> 位置: ${recoveryDecision.newIndex}, 状态: ${recoveryDecision.status}`);
assert(recoveryDecision.newIndex === 3, '脱稿回归后自动恢复跟随第 3 句');

console.log('\n=== TEST SUITE 5: 跳段连续二次确认测试 ===');
// 当前在 3，讲者突然跳过数句读第 8 句
const jumpedSentence = parsed1k.sentences[8];
let jump1 = matcher.processStep(jumpedSentence.cleanText, parsed1k.sentences);
console.log(`- 跳段第 1 次注入语音 -> 候选: ${jump1.result.candidateIndex}, 当前实际位置: ${jump1.newIndex}, 连续确认数: ${jump1.consecutiveHits}`);
assert(jump1.newIndex === 3, '跳段第 1 次注入语音不得立即跳转，位置必须保持在 3');

let jump2 = matcher.processStep(jumpedSentence.cleanText, parsed1k.sentences);
console.log(`- 跳段第 2 次捕获候选 -> 候选: ${jump2.result.candidateIndex}, 当前实际位置: ${jump2.newIndex}, 连续确认数: ${jump2.consecutiveHits}`);
assert(jump2.result.candidateIndex === 8, '成功识别远端候选句 8');
assert(jump2.newIndex === 3, '初次识别远端候选未达到 2 次确认门槛，仍必须保持在 3');

let jump3 = matcher.processStep(jumpedSentence.cleanText, parsed1k.sentences);
console.log(`- 跳段第 3 次连续确认 -> 候选: ${jump3.result.candidateIndex}, 当前实际位置: ${jump3.newIndex}, 连续确认数: ${jump3.consecutiveHits}`);
assert(jump3.newIndex === 8, '连续 2 次确认通过，平滑跳转至第 8 句');

console.log('\n=== TEST SUITE 6: 严厉惩罚大幅倒退测试 (Forward Locking) ===');
// 当前在 8，噪音或口误导致第 1 句出现
matcher.processStep(parsed1k.sentences[1].cleanText, parsed1k.sentences);
assert(matcher.processStep('', parsed1k.sentences).newIndex === 8, '大幅向后倒退被向前锁定阻挡，保持在第 8 句');

console.log('\n=== TEST SUITE 7: 10,000 字全篇长文模拟遍历测试 ===');
const longMatcher = new VoiceFollowMatcher(0);
let simulatedCur = 0;
let forwardSteps = 0;

for (let i = 0; i < parsed10k.sentences.length; i++) {
  const sentence = parsed10k.sentences[i];
  const decision = longMatcher.processStep(sentence.cleanText, parsed10k.sentences);
  if (decision.isUpdated) {
    simulatedCur = decision.newIndex;
    forwardSteps++;
  }
}
console.log(`- 10k 字文本 (${parsed10k.totalSentences} 句) 遍历推进次数: ${forwardSteps}, 最终落点: ${simulatedCur}`);
assert(simulatedCur >= parsed10k.totalSentences - 2, '10,000 字超长文本能够完整稳定跟读至文末');

console.log('\n=========================================');
console.log('🎉 全部 7 组核心算法与状态机测试百分之百通过！');
console.log('=========================================');
