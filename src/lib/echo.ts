import type { Energy } from '../types';

export const MOOD_ECHO: Record<string, string> = {
  平静: '平静不是没有情绪，是终于不用跟它打架。',
  焦虑: '焦虑常常说明这件事对你重要。先写下来，不用现在解决。',
  疲惫: '累的时候不用硬撑出一个解释，记一笔就够了。',
  轻快: '记住这个感觉。以后可以翻回来看，那天到底发生了什么。',
  兴奋: '兴奋的时候容易高估明天。趁现在记下它从哪来，也别急着许愿。',
  低落: '低的时候不用急着爬出来，先把今天记完。',
  烦躁: '烦躁通常有个具体的来源。写下来，它会小一点。',
  满足: '满足感值得被记下来，它比成就更耐放。',
  麻木: '麻木也是一种信号，常常是太久没有变化了。',
  有希望: '有希望的时候别急着承诺太多，留一件小事给明天。',
  想逃避: '想逃避不丢人，它只是说这件事现在太大了。'
};

const ENERGY_ECHO = [
  '电量很低的时候，别做决定，先做一件不需要用脑子的事。',
  '还撑得住，但今天不适合塞太满。',
  '中间档。这种日子最适合做一点常规的事。',
  '不错的一天。记住是什么让它不一样的。',
  '很高。可以趁现在做那件一直拖着的事，但别贪多。'
];

export function energyEcho(avg: number | null | undefined): string | null {
  if (avg == null) return null;
  const i = Math.min(5, Math.max(1, Math.round(avg))) - 1;
  return ENERGY_ECHO[i];
}

export function energyEchoFor(value: Energy): string {
  return ENERGY_ECHO[Math.min(5, Math.max(1, value)) - 1];
}
