const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

/** 一天从早上 5 点开始：凌晨 0–5 点仍然属于前一天。 */
export const DAY_CUTOFF_HOUR = 5;

export function activeDate(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < DAY_CUTOFF_HOUR) d.setDate(d.getDate() - 1);
  return toISO(d);
}

export function isDeepNight(now: Date = new Date()): boolean {
  return now.getHours() < DAY_CUTOFF_HOUR;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  const ms = parseISO(a).getTime() - parseISO(b).getTime();
  return Math.round(ms / 86400000);
}

const WD = ['日', '一', '二', '三', '四', '五', '六'];

export function weekday(s: string): string {
  return `周${WD[parseISO(s).getDay()]}`;
}

export function weekdayShort(s: string): string {
  return WD[parseISO(s).getDay()];
}

export function fmtDate(s: string): string {
  const d = parseISO(s);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function fmtFull(s: string): string {
  return `${parseISO(s).getFullYear()}年${fmtDate(s)}`;
}

export function relDay(s: string): string {
  const diff = diffDays(activeDate(), s);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  if (diff < 0) return `${-diff} 天后`;
  return `${diff} 天前`;
}

export type Phase = 'deep-night' | 'early' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'late-night';

export function phaseOf(hour = new Date().getHours()): Phase {
  if (hour < 5) return 'deep-night';
  if (hour < 9) return 'early';
  if (hour < 12) return 'morning';
  if (hour < 14) return 'noon';
  if (hour < 18) return 'afternoon';
  if (hour < 23) return 'evening';
  return 'late-night';
}

export function greeting(hour = new Date().getHours()): string {
  switch (phaseOf(hour)) {
    case 'deep-night':
      return '夜还很深';
    case 'early':
      return '早上好';
    case 'morning':
      return '上午好';
    case 'noon':
      return '中午好';
    case 'afternoon':
      return '下午好';
    case 'evening':
      return '晚上好';
    default:
      return '夜深了';
  }
}

export function phaseLine(hour = new Date().getHours()): string {
  switch (phaseOf(hour)) {
    case 'deep-night':
      return '过了零点也还算今天。写完这句就去睡。';
    case 'early':
      return '不急着变好，先看清楚。';
    case 'morning':
      return '上午的电量通常最诚实。';
    case 'noon':
      return '饭后那半小时，常常决定下午的形状。';
    case 'afternoon':
      return '下午三点是个分水岭，记一下此刻。';
    case 'evening':
      return '天黑了，今天可以慢慢收尾。';
    default:
      return '今天还没结束，但可以先放下。';
  }
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${y} 年 ${Number(m)} 月`;
}

export function lastNDates(n: number, end = activeDate()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

/** "23:30" → minutes since midnight */
export function clockToMin(t?: string): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function sleepHours(bed?: string, wake?: string): number | null {
  const b = clockToMin(bed);
  const w = clockToMin(wake);
  if (b == null || w == null) return null;
  let mins = w - b;
  if (mins <= 0) mins += 24 * 60;
  if (mins > 16 * 60) mins = 24 * 60 - mins;
  return Math.round((mins / 60) * 10) / 10;
}

export function nowClock(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDuration(min?: number | null): string {
  if (min == null || Number.isNaN(min)) return '—';
  if (min < 60) return `${Math.round(min)} 分钟`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

export function fmtHours(h?: number | null): string {
  if (h == null || Number.isNaN(h)) return '—';
  const whole = Math.floor(h);
  const m = Math.round((h - whole) * 60);
  return m ? `${whole} 小时 ${m} 分` : `${whole} 小时`;
}

export function startOfMonth(key: string): string {
  return `${key}-01`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
