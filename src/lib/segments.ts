import type { ActivityKey, Entry, Segment } from '../types';
import { clockToMin } from './date';

const LEGACY: Record<ActivityKey, 'outdoorMin' | 'exerciseMin' | 'workMin' | 'screenMin'> = {
  outdoor: 'outdoorMin',
  exercise: 'exerciseMin',
  work: 'workMin',
  screen: 'screenMin'
};

export function segmentMinutes(s: Segment): number {
  if (typeof s.minutes === 'number' && Number.isFinite(s.minutes)) {
    return Math.max(0, Math.round(s.minutes));
  }
  const a = clockToMin(s.start);
  const b = clockToMin(s.end);
  if (a == null || b == null) return 0;
  const d = b - a;
  return d >= 0 ? d : d + 24 * 60;
}

export function segmentsOf(e: Entry | undefined | null, key: ActivityKey): Segment[] {
  return e?.segments?.[key] ?? [];
}

/** 有分段就算分段总和，没有就回退到旧的总分钟字段。 */
export function activityTotal(e: Entry | undefined | null, key: ActivityKey): number | undefined {
  const list = segmentsOf(e, key);
  if (list.length) return list.reduce((sum, s) => sum + segmentMinutes(s), 0);
  return e?.[LEGACY[key]];
}

export function segmentPatch(e: Entry, key: ActivityKey, list: Segment[]): Partial<Entry> {
  const total = list.length ? list.reduce((sum, s) => sum + segmentMinutes(s), 0) : undefined;
  return {
    segments: { ...e.segments, [key]: list },
    [LEGACY[key]]: total
  };
}

export function segmentLabel(s: Segment): string {
  if (s.start && s.end) return `${s.start} – ${s.end}`;
  if (typeof s.minutes === 'number') return `约 ${s.minutes} 分钟`;
  return '未填';
}
