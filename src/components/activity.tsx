import { useState } from 'react';
import type { ActivityKey, Segment } from '../types';
import { fmtDuration } from '../lib/date';
import { segmentLabel, segmentMinutes } from '../lib/segments';
import { Icon, Sheet } from './ui';
import { TimeField } from './time-picker';

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function ActivitySheet({
  open,
  onClose,
  activity,
  segments,
  onChange
}: {
  open: boolean;
  onClose: () => void;
  activity: { key: ActivityKey; label: string };
  segments: Segment[];
  onChange: (next: Segment[]) => void;
}) {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('09:30');
  const [quick, setQuick] = useState('');
  const total = segments.reduce((sum, s) => sum + segmentMinutes(s), 0);

  const addRange = () => {
    if (!start || !end) return;
    const next = [...segments, { id: uid(), start, end }];
    onChange(next);
  };

  const addQuick = () => {
    const n = Number(quick);
    if (!Number.isFinite(n) || n <= 0) return;
    onChange([...segments, { id: uid(), minutes: Math.round(n) }]);
    setQuick('');
  };

  const remove = (id: string) => onChange(segments.filter((s) => s.id !== id));

  return (
    <Sheet open={open} onClose={onClose} title={activity.label}>
      <div className="-mt-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] tracking-[0.16em] text-faint">合计</div>
            <div className="num mt-1 font-serif text-[32px] leading-none text-ink">
              {total ? fmtDuration(total) : <span className="text-[22px] text-faint">还没记</span>}
            </div>
          </div>
          <div className="pb-1 text-[10.5px] text-faint">{segments.length} 段</div>
        </div>

        <div className="mt-5 space-y-2">
          {segments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line/70 px-4 py-6 text-center">
              <p className="font-serif text-[13px] text-soft">还没有分段</p>
              <p className="mt-1 text-[10.5px] text-faint">按时间段记，或者直接填总时长，合计会自动算。</p>
            </div>
          ) : (
            segments.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-line/60 bg-surface/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="num text-[14px] text-ink/90">{segmentLabel(s)}</div>
                  <div className="mt-0.5 text-[10px] text-faint">{fmtDuration(segmentMinutes(s))}</div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint transition active:scale-90"
                  aria-label="删除这一段"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-line/60 bg-paper2/50 p-3.5">
          <div className="text-[10px] tracking-[0.14em] text-faint">加一段</div>
          <div className="mt-2 flex items-center gap-2">
            <TimeField value={start} onChange={setStart} placeholder="开始" title="开始时间" className="py-2 text-[13px]" />
            <span className="text-[11px] text-faint">到</span>
            <TimeField value={end} onChange={setEnd} placeholder="结束" title="结束时间" className="py-2 text-[13px]" />
            <button
              type="button"
              onClick={addRange}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition active:scale-90"
              aria-label="添加这一段"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder="或直接填分钟"
              className="field num flex-1 py-2 text-[13px]"
            />
            <button type="button" onClick={addQuick} className="btn-soft shrink-0 px-3 py-2 text-[12px]">
              添加
            </button>
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-faint">
          跨过午夜的时间段会自动算成到第二天。分段只是细节，页面上永远显示合计。
        </p>
      </div>
    </Sheet>
  );
}
