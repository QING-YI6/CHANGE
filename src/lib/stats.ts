import type { Energy, Entry, Slot } from '../types';
import { SLOTS } from '../types';
import { activeDate, addDays, diffDays, sleepHours } from './date';
import { activityTotal } from './segments';

export function avg(nums: (number | null | undefined)[]): number | null {
  const v = nums.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function entryEnergy(e?: Entry | null): number | null {
  if (!e) return null;
  return avg(SLOTS.map((s) => e.energy?.[s.key]).filter((v): v is Energy => typeof v === 'number'));
}

export function slotValue(e: Entry | undefined, slot: Slot): number | undefined {
  return e?.energy?.[slot];
}

export function afternoonEnergy(e?: Entry | null): number | null {
  if (!e) return null;
  return avg([e.energy?.afternoon, e.energy?.evening].filter((v): v is Energy => typeof v === 'number'));
}

export function hasContent(e?: Entry | null): boolean {
  if (!e) return false;
  return (
    Boolean(e.body && e.body.trim()) ||
    Object.keys(e.energy || {}).length > 0 ||
    (e.mood && e.mood.length > 0) ||
    (e.notes && e.notes.length > 0)
  );
}

export function streak(entries: Entry[]): number {
  const set = new Set(entries.filter(hasContent).map((e) => e.date));
  let d = activeDate();
  if (!set.has(d)) {
    d = addDays(d, -1);
    if (!set.has(d)) return 0;
  }
  let n = 0;
  while (set.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

export function rangeEntries(entries: Entry[], days: number): Entry[] {
  const from = addDays(activeDate(), -(days - 1));
  return entries.filter((e) => e.date >= from && e.date <= activeDate());
}

interface Group {
  label: string;
  values: number[];
}

function compare(
  id: string,
  title: string,
  a: Group,
  b: Group,
  unit: string,
  floor = 0.25
): Insight | null {
  const aAvg = avg(a.values);
  const bAvg = avg(b.values);
  if (aAvg == null || bAvg == null) return null;
  if (a.values.length < 2 || b.values.length < 2) return null;
  if (Math.abs(aAvg - bAvg) < floor) return null;
  return {
    id,
    title,
    aLabel: a.label,
    aN: a.values.length,
    aAvg,
    bLabel: b.label,
    bN: b.values.length,
    bAvg,
    unit
  };
}

export interface Insight {
  id: string;
  title: string;
  aLabel: string;
  aN: number;
  aAvg: number;
  bLabel: string;
  bN: number;
  bAvg: number;
  unit: string;
}

export function insights(entries: Entry[]): Insight[] {
  const recent = rangeEntries(entries, 60);
  const out: (Insight | null)[] = [];

  // 午睡 vs 不午睡 → 午后精力
  const napLong: number[] = [];
  const napNone: number[] = [];
  for (const e of recent) {
    const nap = e.sleep?.napMin;
    const ae = afternoonEnergy(e);
    if (nap == null || ae == null) continue;
    if (nap >= 30) napLong.push(ae);
    else if (nap === 0) napNone.push(ae);
  }
  out.push(
    compare('nap', '午睡长度 × 午后精力', { label: '午睡 ≥ 30 分钟', values: napLong }, { label: '没午睡', values: napNone }, '分')
  );

  // 睡眠时长 → 全天精力
  const shortSleep: number[] = [];
  const longSleep: number[] = [];
  for (const e of recent) {
    const h = sleepHours(e.sleep?.bed, e.sleep?.wake);
    const en = entryEnergy(e);
    if (h == null || en == null) continue;
    if (h < 6.5) shortSleep.push(en);
    else if (h >= 7.5) longSleep.push(en);
  }
  out.push(
    compare('sleep', '睡眠时长 × 全天精力', { label: '睡 ≥ 7.5 小时', values: longSleep }, { label: '睡 < 6.5 小时', values: shortSleep }, '分')
  );

  // 外出 → 午后精力
  const outYes: number[] = [];
  const outNo: number[] = [];
  for (const e of recent) {
    const o = activityTotal(e, 'outdoor');
    const ae = afternoonEnergy(e);
    if (o == null || ae == null) continue;
    if (o >= 30) outYes.push(ae);
    else if (o < 10) outNo.push(ae);
  }
  out.push(
    compare('outdoor', '外出 × 午后精力', { label: '外出 ≥ 30 分钟', values: outYes }, { label: '几乎没出门', values: outNo }, '分')
  );

  // 工作负荷 → 夜间精力
  const workHeavy: number[] = [];
  const workLight: number[] = [];
  for (const e of recent) {
    const w = activityTotal(e, 'work');
    const ev = e.energy?.evening;
    if (w == null || ev == null) continue;
    if (w >= 300) workHeavy.push(ev);
    else if (w < 180) workLight.push(ev);
  }
  out.push(
    compare('work', '工作时长 × 夜间精力', { label: '工作 ≥ 5 小时', values: workHeavy }, { label: '工作 < 3 小时', values: workLight }, '分')
  );

  // 阅读 → 心情
  const readYes: number[] = [];
  const readNo: number[] = [];
  for (const e of recent) {
    const p = e.reading?.pages;
    const m = e.moodScore;
    if (m == null) continue;
    if (p && p > 0) readYes.push(m);
    else readNo.push(m);
  }
  out.push(
    compare('reading', '阅读 × 心情评分', { label: '读了书', values: readYes }, { label: '没读书', values: readNo }, '分')
  );

  return out.filter((x): x is Insight => Boolean(x)).sort((a, b) => Math.abs(b.aAvg - b.bAvg) - Math.abs(a.aAvg - b.aAvg));
}

export function avgEnergyOf(entries: Entry[]): number | null {
  return avg(entries.map((e) => entryEnergy(e)).filter((v): v is number => v != null));
}

export function daysSince(iso: string): number {
  return diffDays(activeDate(), iso);
}
