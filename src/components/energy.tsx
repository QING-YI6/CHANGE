import type { Entry, Energy, Slot } from '../types';
import { SLOTS } from '../types';
import { cx } from './ui';
import { entryEnergy } from '../lib/stats';
import { lastNDates, weekdayShort } from '../lib/date';

export const RAMP = ['#AF715B', '#BF8763', '#CBA163', '#9BAC81', '#6E8A61'];

export function energyColor(v?: number | null): string {
  if (!v) return 'rgb(var(--c-line) / 0.55)';
  const i = Math.max(1, Math.min(5, Math.round(v))) - 1;
  return RAMP[i];
}

const HEIGHT = [9, 9, 9, 9, 9];

export function EnergyMeter({
  entry,
  onSet
}: {
  entry?: Entry;
  onSet: (slot: Slot, value: Energy | undefined) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {SLOTS.map((s) => {
        const v = entry?.energy?.[s.key];
        return (
          <div key={s.key} className="flex flex-col items-center gap-2">
            <div className="flex w-full flex-col-reverse gap-[3px]">
              {[1, 2, 3, 4, 5].map((level) => {
                const on = typeof v === 'number' && level <= v;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-label={`${s.label} ${level}`}
                    onClick={() => onSet(s.key, v === level ? undefined : (level as Energy))}
                    className="w-full rounded-full transition-all duration-300 ease-soft active:scale-y-[0.85]"
                    style={{
                      height: HEIGHT[level - 1],
                      background: on ? RAMP[level - 1] : 'rgb(var(--c-line) / 0.45)',
                      boxShadow: on ? `0 2px 8px -4px ${RAMP[level - 1]}` : 'none'
                    }}
                  />
                );
              })}
            </div>
            <div className="flex flex-col items-center leading-none">
              <span className="text-[11px] text-soft">{s.label}</span>
              <span className="mt-1 text-[9.5px] tracking-wide text-faint">{s.clock}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EnergyBars({ entry, className }: { entry?: Entry; className?: string }) {
  return (
    <div className={cx('flex items-end gap-[3px]', className)} style={{ height: 26 }}>
      {SLOTS.map((s) => {
        const v = entry?.energy?.[s.key];
        const h = v ? 6 + (v - 1) * 4.5 : 4;
        return (
          <span
            key={s.key}
            className="w-[5px] rounded-full transition-all duration-500 ease-soft"
            style={{ height: h, background: v ? RAMP[v - 1] : 'rgb(var(--c-line) / 0.6)' }}
          />
        );
      })}
    </div>
  );
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function EnergyCurve({ entry, height = 84 }: { entry?: Entry; height?: number }) {
  const pts = SLOTS.map((s, i) => {
    const v = entry?.energy?.[s.key];
    return v ? { x: 6 + (i / (SLOTS.length - 1)) * 88, y: 92 - ((v - 1) / 4) * 80 } : null;
  });
  const defined = pts.filter((p): p is { x: number; y: number } => p != null);
  const line = smoothPath(defined);
  const area = defined.length >= 2 ? `${line} L ${defined[defined.length - 1].x} 100 L ${defined[0].x} 100 Z` : '';
  const avg = entryEnergy(entry);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-moss))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(var(--c-moss))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="0" x2="100" y1={12 + i * 20} y2={12 + i * 20} stroke="rgb(var(--c-line))" strokeOpacity="0.35" strokeWidth="0.4" vectorEffect="non-scaling-stroke" strokeDasharray="1 2" />
        ))}
        {area && <path d={area} fill="url(#curveFill)" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="rgb(var(--c-moss))"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            className="draw"
          />
        )}
      </svg>
      <div className="absolute inset-0">
        {pts.map((p, i) =>
          p ? (
            <span
              key={i}
              className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: energyColor(entry?.energy?.[SLOTS[i].key])
              }}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

export function DayRibbon({
  entries,
  days = 30,
  onPick
}: {
  entries: Entry[];
  days?: number;
  onPick?: (date: string) => void;
}) {
  const dates = lastNDates(days);
  const map = new Map(entries.map((e) => [e.date, e]));
  return (
    <div>
      <div className="flex h-[72px] items-end gap-[3px]">
        {dates.map((d) => {
          const e = map.get(d);
          const v = entryEnergy(e);
          const h = v ? 10 + (v - 1) * 13 : 5;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick?.(d)}
              className="group relative flex-1 rounded-full transition-all duration-300 ease-soft hover:opacity-80"
              style={{
                height: h,
                background: v ? energyColor(v) : 'rgb(var(--c-line) / 0.45)',
                opacity: v ? 0.55 + (v - 1) * 0.09 : 1
              }}
            >
              <span className="sr-only">{d}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tracking-wider text-faint">
        <span>{dates[0]?.slice(5).replace('-', '/')}</span>
        <span>{dates[Math.floor(days / 2)]?.slice(5).replace('-', '/')}</span>
        <span>今天</span>
      </div>
    </div>
  );
}

export function WeekDots({ entries, days = 14 }: { entries: Entry[]; days?: number }) {
  const dates = lastNDates(days);
  const map = new Map(entries.map((e) => [e.date, e]));
  return (
    <div className="flex items-center gap-[5px]">
      {dates.map((d) => {
        const e = map.get(d);
        const v = entryEnergy(e);
        return (
          <span
            key={d}
            title={`${d} ${weekdayShort(d)}`}
            className="h-[5px] w-[5px] rounded-full"
            style={{ background: v ? energyColor(v) : 'rgb(var(--c-line) / 0.7)' }}
          />
        );
      })}
    </div>
  );
}
