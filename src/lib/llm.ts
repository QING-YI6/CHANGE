import type { Analysis, AppState, Entry, Settings } from '../types';
import { MEALS, SLOTS } from '../types';
import { activeDate, addDays, fmtDate, sleepHours, weekday } from './date';
import { avgEnergyOf, entryEnergy, rangeEntries } from './stats';
import { activityTotal } from './segments';

const SYSTEM = `你是 change 里的「看见者」。用户在做一项长期自我实验：用每天的数据和文字，弄明白自己这台身体怎么运转、怎样一点一点地改变。
你的输出是「微分析」，不是总结报告，不是心理诊断，不是励志演讲。

四项输出：
1. seen：今天数据里最值得他自己注意的一件事。必须具体——引用他写下的词、某个数字、某个时间点。只给观察，不给结论。
2. cheer：一句鼓励。只能基于他实际做到的事（哪怕很小），不要空泛夸奖，不要「你很棒」。
3. experiment：一个最小尝试。小到 2 分钟内就能开始，只改一个变量，明天就能验证。如果数据不足，就改成「先记录三天」这类观察任务。
4. question：一个问题，帮他把模糊的感受变具体。不要问「你为什么……」，要问「什么时候 / 和谁 / 具体哪一刻 / 当时身体什么感觉」。

规则：
- 中文，平实，像熟悉他的朋友。不用感叹号堆砌，不用「亲爱的」「加油」。
- 每条 1–2 句，四项加起来不超过 180 字。
- 数据不足就说「还看不出来」，绝不编造因果。
- 不做医疗诊断。如果出现持续失眠、明显抑郁等信号，只温和建议他和专业的人聊聊。
只输出 JSON：{"seen":"","cheer":"","experiment":"","question":""}`;

const RETRO_SYSTEM = `你在 change 里帮用户回看过去的日记。用户会给你「那一天」的记录，以及「今天的他」的近况。
请写一句现在的他对那一天说的话：温和、具体、克制，不说教，不总结人生，不评判当时的自己。
可以点出当时没注意到的细节，也可以只是陪他站一会儿。
不超过 60 字，中文，只输出 JSON：{"line":""}`;

function endpoint(base: string): string {
  const b = base.trim().replace(/\/+$/, '');
  if (b.endsWith('/chat/completions')) return b;
  return `${b}/chat/completions`;
}

async function chat(
  settings: Settings,
  messages: { role: 'system' | 'user'; content: string }[],
  signal: AbortSignal
): Promise<string> {
  if (!settings.apiKey.trim()) throw new Error('还没有填写 API Key');
  const body: Record<string, unknown> = {
    model: settings.model || 'deepseek-chat',
    messages,
    temperature: 0.7,
    max_tokens: 700,
    response_format: { type: 'json_object' }
  };
  const send = (payload: Record<string, unknown>) =>
    fetch(endpoint(settings.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`
      },
      body: JSON.stringify(payload),
      signal
    });

  let res = await send(body);
  if (res.status === 400) {
    // 有些兼容接口不支持 response_format，退一步再试
    const { response_format, ...rest } = body;
    void response_format;
    res = await send(rest);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const brief = text.slice(0, 160).replace(/\s+/g, ' ');
    throw new Error(`模型接口返回 ${res.status}${brief ? `：${brief}` : ''}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('模型没有返回内容');
  return content;
}

function extractJSON(raw: string): Record<string, unknown> {
  let text = raw.trim();
  text = text.replace(/```json/gi, '```');
  if (text.includes('```')) text = text.split('```').join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('模型返回的格式看不懂');
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function str(obj: Record<string, unknown>, key: string, max = 120): string {
  const v = obj[key];
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function energyLine(e: Entry): string {
  return SLOTS.map((s) => `${s.label}${e.energy?.[s.key] ?? '—'}`).join(' ');
}

function dayBrief(e: Entry, withBody = false): string {
  const parts: string[] = [];
  const en = entryEnergy(e);
  if (en != null) parts.push(`精力${en.toFixed(1)}`);
  const h = sleepHours(e.sleep?.bed, e.sleep?.wake);
  if (h != null) parts.push(`睡${h}h`);
  if (e.sleep?.napMin != null) parts.push(`午睡${e.sleep.napMin}m`);
  if (e.outdoorMin != null) parts.push(`外出${e.outdoorMin}m`);
  if (e.workMin != null) parts.push(`工作${e.workMin}m`);
  if (e.reading?.pages) parts.push(`读${e.reading.pages}页`);
  if (e.moodScore != null) parts.push(`心情${e.moodScore}`);
  if (e.mood?.length) parts.push(e.mood.join('/'));
  let line = `${fmtDate(e.date)} ${parts.join(' ')}`;
  if (withBody && e.body.trim()) line += ` ｜「${e.body.trim().slice(0, 70)}」`;
  return line;
}

export interface DailyRunResult {
  seen: string;
  cheer: string;
  experiment: string;
  question: string;
  model: string;
}

export async function runDailyAnalysis(
  state: AppState,
  entry: Entry,
  signal: AbortSignal
): Promise<DailyRunResult> {
  const recent = rangeEntries(state.entries, 8).filter((e) => e.date !== entry.date);
  const baseline = avgEnergyOf(rangeEntries(state.entries, 30));
  const running = state.experiments.filter((x) => x.status === 'running').slice(0, 3);

  const lines: string[] = [];
  lines.push(`【今天】${entry.date} ${weekday(entry.date)}`);
  lines.push(`【精力 1–5】${energyLine(entry)}`);
  const h = sleepHours(entry.sleep?.bed, entry.sleep?.wake);
  const sleepBits = [
    entry.sleep?.bed ? `${entry.sleep.bed} 入睡` : '',
    entry.sleep?.wake ? `${entry.sleep.wake} 起床` : '',
    h != null ? `${h} 小时` : '',
    entry.sleep?.quality ? `质量 ${entry.sleep.quality}/5` : '',
    entry.sleep?.napMin != null ? `午睡 ${entry.sleep.napMin} 分钟` : ''
  ].filter(Boolean);
  lines.push(`【睡眠】${sleepBits.length ? sleepBits.join('，') : '没记'}`);
  const life: string[] = [];
  const outdoor = activityTotal(entry, 'outdoor');
  const exercise = activityTotal(entry, 'exercise');
  const work = activityTotal(entry, 'work');
  const screen = activityTotal(entry, 'screen');
  if (outdoor != null) life.push(`外出 ${outdoor} 分钟`);
  if (exercise != null) life.push(`运动 ${exercise} 分钟`);
  if (work != null) life.push(`学习工作 ${work} 分钟`);
  if (screen != null) life.push(`屏幕 ${screen} 分钟`);
  const meals = MEALS.map((mm) => ({ label: mm.label, meal: entry.food?.meals?.[mm.key] })).filter(
    (x) => x.meal && (x.meal.staple || x.meal.protein)
  );
  if (meals.length) {
    life.push(
      '三餐：' +
        meals
          .map((x) => `${x.label}${x.meal?.time ? x.meal.time : ''} ${x.meal?.staple ?? ''}${x.meal?.protein ? '·' + x.meal.protein : ''}`)
          .join('，')
    );
  }
  if (entry.reading?.pages) life.push(`读书 ${entry.reading.pages} 页`);
  if (life.length) lines.push(`【身体】${life.join('，')}`);
  if (entry.mood?.length) lines.push(`【情绪】${entry.mood.join('、')}${entry.moodScore ? `（总体 ${entry.moodScore}/5）` : ''}`);
  if (entry.tags?.length) lines.push(`【标签】${entry.tags.map((t) => `#${t}`).join(' ')}`);
  if (entry.body.trim()) lines.push(`【今天写下的】\n${entry.body.trim().slice(0, 1200)}`);
  else lines.push('【今天写下的】没有写字，只有数据。');

  lines.push('【最近一周】');
  if (recent.length) {
    for (const e of recent.slice(0, 7)) lines.push(dayBrief(e, true));
  } else {
    lines.push('几乎没有别的记录。');
  }
  if (running.length) {
    lines.push('【正在做的实验】');
    for (const x of running) {
      const done = Object.values(x.logs).filter((l) => l.done).length;
      lines.push(`${x.title}（已完成 ${done}/${x.days} 天）`);
    }
  }
  lines.push(`【基线】近 30 天平均精力 ${baseline != null ? baseline.toFixed(1) : '还不够算'}，共记录 ${state.entries.length} 天`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);
  try {
    const raw = await chat(
      state.settings,
      [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: lines.join('\n') }
      ],
      controller.signal
    );
    const obj = extractJSON(raw);
    return {
      seen: str(obj, 'seen', 160),
      cheer: str(obj, 'cheer', 160),
      experiment: str(obj, 'experiment', 160),
      question: str(obj, 'question', 160),
      model: state.settings.model
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

export async function runRetroLine(
  state: AppState,
  past: Entry,
  signal: AbortSignal
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);
  try {
    const user = [
      `【那一天】${past.date} ${weekday(past.date)}`,
      dayBrief(past, false),
      past.body.trim() ? `【那天写下的】\n${past.body.trim().slice(0, 1400)}` : '【那天没写字】',
      '',
      `【今天的他】${activeDate()}，近 30 天平均精力 ${avgEnergyOf(rangeEntries(state.entries, 30))?.toFixed(1) ?? '—'}，已经记录了 ${state.entries.length} 天。`,
      `距离那天已经过去 ${Math.max(1, Math.round((Date.parse(activeDate()) - Date.parse(past.date)) / 86400000))} 天。`
    ].join('\n');
    const raw = await chat(
      state.settings,
      [
        { role: 'system', content: RETRO_SYSTEM },
        { role: 'user', content: user }
      ],
      controller.signal
    );
    const obj = extractJSON(raw);
    return str(obj, 'line', 120);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

export async function testConnection(settings: Settings): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const raw = await chat(
      settings,
      [
        { role: 'system', content: '只输出 JSON。' },
        { role: 'user', content: '回复 {"ok":"yes"}' }
      ],
      controller.signal
    );
    return raw.slice(0, 80);
  } finally {
    clearTimeout(timer);
  }
}

export function nextSuggestion(): { seen: string; cheer: string; experiment: string; question: string } {
  return {
    seen: '',
    cheer: '',
    experiment: '',
    question: ''
  };
}

export type { Analysis };
