import type { ISODate } from '../types';

export interface Marginal {
  text: string;
  from: string;
  kind: 'quote' | 'fact' | 'book';
}

export const GENERAL: Marginal[] = [
  { text: '你不需要看见整个楼梯，只要迈出第一步。', from: '马丁·路德·金', kind: 'quote' },
  { text: '认识你自己。', from: '德尔斐神庙铭文', kind: 'quote' },
  { text: '未经省察的人生不值得过。', from: '苏格拉底', kind: 'quote' },
  { text: '人不是被事情困扰，而是被他们对事情的看法困扰。', from: '爱比克泰德', kind: 'quote' },
  { text: '慢即是快。', from: '老话', kind: 'quote' },
  { text: '我们无法用制造问题时的同一种思维，去解决那个问题。', from: '常被引用的话', kind: 'quote' },
  { text: '改变不是一次决定，是一连串很小的选择。', from: 'change', kind: 'quote' },
  { text: '休息不是奖励，是维持运转的一部分。', from: 'change', kind: 'quote' },
  { text: '你不是你的情绪，你是那个注意到情绪的人。', from: 'change', kind: 'quote' },
  { text: '习惯是第二天性。', from: '西塞罗', kind: 'quote' },
  { text: '对自己温柔一点，你也在一个很难的进程里。', from: 'change', kind: 'quote' }
];

export const FACTS: Marginal[] = [
  { text: '午睡 20 分钟和 90 分钟，醒来是两种人：一个刚醒，另一个还在睡眠惯性里。', from: '一个常识', kind: 'fact' },
  { text: '上午十点前见到自然光，晚上的困意会来得更准。', from: '一个常识', kind: 'fact' },
  { text: '饭后走十分钟，血糖曲线会比直接坐下平缓。', from: '一个常识', kind: 'fact' },
  { text: '把情绪写成句子，比在脑子里反复想它，更容易让它变小。', from: '一个常识', kind: 'fact' },
  { text: '久坐超过 45 分钟，身体的清醒信号会变弱；起来走两步，比再喝一杯更管用。', from: '一个常识', kind: 'fact' },
  { text: '固定起床时间，比固定入睡时间更能稳住生物钟。', from: '一个常识', kind: 'fact' },
  { text: '睡眠不足时，人对自己「有多困」的判断会变差。', from: '一个常识', kind: 'fact' },
  { text: '记录本身会改变被记录的行为，所以你的数据会有一点「变好」的偏差，这很正常。', from: '一个常识', kind: 'fact' },
  { text: '同一件事重复久了会自动运行，自动化之后就很难改——所以靠环境提醒，比靠意志可靠。', from: '一个常识', kind: 'fact' }
];

export const BOOK_LINES: { match: string[]; lines: Marginal[] }[] = [
  {
    match: ['5%', '5％', '百分之五', '5 的改变'],
    lines: [
      { text: '不求彻底改变，先做 5% 的不同。', from: '《5% 的改变》· 大意', kind: 'book' },
      { text: '问题之所以牢固，有时是因为我们一直在用力解决它。', from: '《5% 的改变》· 大意', kind: 'book' },
      { text: '改变可以从边缘开始，不必从根源开始。', from: '《5% 的改变》· 大意', kind: 'book' },
      { text: '允许自己暂时不改变，往往才是改变的开始。', from: '《5% 的改变》· 大意', kind: 'book' },
      { text: '先做一点不一样的事，理解会跟着行动长出来。', from: '《5% 的改变》· 大意', kind: 'book' }
    ]
  },
  {
    match: ['睡觉', '睡眠'],
    lines: [
      { text: '固定起床时间，比固定入睡时间更有用。', from: '《我们为什么要睡觉》· 大意', kind: 'book' },
      { text: '睡眠不是关机，是一整套修复程序在运行。', from: '《我们为什么要睡觉》· 大意', kind: 'book' },
      { text: '午后的一小段睡眠，和深夜的长睡，作用并不相同。', from: '《我们为什么要睡觉》· 大意', kind: 'book' },
      { text: '咖啡因的半衰期大约是五到六小时，下午喝的那杯，半夜还在。', from: '《我们为什么要睡觉》· 大意', kind: 'book' }
    ]
  },
  {
    match: ['福格', '行为模型'],
    lines: [
      { text: '行为发生在动机、能力和提示同时出现的时候。', from: '《福格行为模型》· 大意', kind: 'book' },
      { text: '把动作缩小到两分钟，先让它发生。', from: '《福格行为模型》· 大意', kind: 'book' },
      { text: '庆祝不是奖励，是让大脑记住这条路径。', from: '《福格行为模型》· 大意', kind: 'book' }
    ]
  },
  {
    match: ['认知觉醒', '打开心智'],
    lines: [
      { text: '焦虑常常来自模糊。把担忧写成具体的句子，它就会小一点。', from: '《认知觉醒》· 大意', kind: 'book' },
      { text: '在舒适区边缘做事，进步最快，也最不容易放弃。', from: '《认知觉醒》· 大意', kind: 'book' }
    ]
  },
  {
    match: ['习惯', '掌控习惯'],
    lines: [
      { text: '习惯是身份的证据：每次记录，都是在投票给「我是一个会记录的人」。', from: '《掌控习惯》· 大意', kind: 'book' },
      { text: '不要追求一次做到位，追求让它容易发生。', from: '《掌控习惯》· 大意', kind: 'book' }
    ]
  }
];

function hash(s: string): number {
  // FNV-1a + 雪崩，避免 seed 只差一位时落到同一个下标
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

function normalizeBook(book: string): string {
  return book.replace(/[《》\s「」]/g, '').toLowerCase();
}

/** 每天固定一条，同一本书优先，不会每次刷新都变。 */
export function pickMarginal(book: string, seed: string, salt = 0): Marginal {
  const key = normalizeBook(book || '');
  const bookSet = BOOK_LINES.find((b) => b.match.some((m) => key.includes(m.toLowerCase())));
  const h = hash(`${seed}:${key}:${salt}`);

  if (bookSet && key && h % 10 < 6) {
    return bookSet.lines[h % bookSet.lines.length];
  }
  const pool = h % 10 < 7 ? GENERAL : FACTS;
  return pool[h % pool.length];
}

/** 每 6 小时换一条：一天大约 4 次。 */
export const MARGINAL_ROTATE_MS = 6 * 60 * 60 * 1000;

export function marginalNow(book: string, salt = 0, now = Date.now()): Marginal {
  const bucket = Math.floor(now / MARGINAL_ROTATE_MS);
  return pickMarginal(book, String(bucket), salt);
}
