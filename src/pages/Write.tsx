import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, Chip, CollapsibleCard, Echo, Field, Icon, NumInput } from '../components/ui';
import { EnergyMeter } from '../components/energy';
import { TimeField } from '../components/time-picker';
import { ActivitySheet } from '../components/activity';
import { addDays, fmtDate, fmtDuration, fmtHours, relDay, sleepHours, weekday } from '../lib/date';
import { MOOD_ECHO, energyEchoFor } from '../lib/echo';
import { activityTotal, segmentPatch, segmentsOf } from '../lib/segments';
import type { ActivityKey, Energy, Meal, SleepLog, Slot } from '../types';
import { ACTIVITIES, COMMON_TAGS, MEALS, MOOD_TAGS, PROTEINS, STAPLES_BY_MEAL } from '../types';

function BlockTitle({ title, right }: { title: string; right?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-serif text-[15px] tracking-wide text-ink/90">{title}</h3>
      {right ? <span className="text-[10.5px] text-faint">{right}</span> : null}
    </div>
  );
}

function Dots({
  value,
  onChange,
  count = 5
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const on = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className="flex-1 transition-transform active:scale-90"
            aria-label={String(n)}
          >
            <span
              className="block h-[7px] w-full rounded-full transition-all duration-300"
              style={{
                background: on ? 'rgb(var(--c-moss))' : 'rgb(var(--c-line) / 0.55)',
                opacity: on ? 0.45 + n * 0.11 : 1
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Write() {
  const { state, today, entryOf, patchEntry, toast } = useApp();
  const [date, setDate] = useState(today);
  const entry = entryOf(date);
  const hours = sleepHours(entry?.sleep?.bed, entry?.sleep?.wake);
  const isToday = date === today;
  const [energyNote, setEnergyNote] = useState<string | null>(null);
  const [moodNote, setMoodNote] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityKey | null>(null);
  const noteTimers = useRef<{ energy?: number; mood?: number }>({});

  useEffect(
    () => () => {
      window.clearTimeout(noteTimers.current.energy);
      window.clearTimeout(noteTimers.current.mood);
    },
    []
  );

  const flash = (kind: 'energy' | 'mood', text?: string | null) => {
    if (!text) return;
    if (kind === 'energy') setEnergyNote(text);
    else setMoodNote(text);
    window.clearTimeout(noteTimers.current[kind]);
    noteTimers.current[kind] = window.setTimeout(() => {
      if (kind === 'energy') setEnergyNote(null);
      else setMoodNote(null);
    }, 7000);
  };

  const setSleep = (patch: Partial<SleepLog>) =>
    patchEntry(date, (e) => ({ sleep: { ...e.sleep, ...patch } }));

  const setEnergy = (slot: Slot, value?: Energy) => {
    patchEntry(date, (e) => {
      const energy = { ...e.energy };
      if (value == null) delete energy[slot];
      else energy[slot] = value;
      return { energy };
    });
    if (value != null) flash('energy', energyEchoFor(value));
  };

  const toggleIn = (key: 'mood' | 'tags', value: string) => {
    patchEntry(date, (e) => {
      const list = e[key];
      return { [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });
  };

  const savedLabel = useMemo(() => {
    if (!entry) return '还没有内容';
    const diff = Date.now() - entry.updatedAt;
    if (diff < 60000) return '刚刚保存';
    return `${Math.floor(diff / 60000)} 分钟前保存`;
  }, [entry?.updatedAt, entry]);

  const sleepSummary =
    hours != null
      ? `${fmtHours(hours)}${entry?.sleep?.napMin ? ` · 午睡 ${entry.sleep.napMin} 分` : ''}`
      : '还没记';

  const mealSummary = (() => {
    const items = MEALS.map((m) => ({ m, meal: entry?.food?.meals?.[m.key] })).filter((x) => x.meal?.staple || x.meal?.protein);
    if (!items.length) return '还没记';
    return items.map((x) => `${x.m.label[0]} ${x.meal?.time || '已记'}`).join(' · ');
  })();

  const bodySummary = (() => {
    const parts: string[] = [];
    for (const a of ACTIVITIES) {
      const total = activityTotal(entry, a.key);
      if (total) parts.push(`${a.short} ${fmtDuration(total)}`);
    }
    return parts.length ? parts.join(' · ') : '还没记';
  })();

  const moodSummary = entry?.mood.length
    ? `${entry.mood.join('、')}${entry.moodScore ? ` · ${entry.moodScore}/5` : ''}`
    : '还没选';

  const readingSummary = entry?.reading?.pages
    ? `${entry.reading.pages} 页`
    : entry?.reading?.book || state.settings.book || '还没记';

  const tagSummary = entry?.tags.length ? entry.tags.join('、') : '还没选';

  return (
    <div>
      <header className="pt-safe sticky top-0 z-20 border-b border-line/40 bg-paper/80 px-4 pb-2.5 pt-2 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-soft transition active:scale-90"
            aria-label="前一天"
          >
            <Icon name="arrow" className="h-4 w-4 rotate-180" />
          </button>
          <button type="button" onClick={() => setDate(today)} className="flex flex-col items-center">
            <span className="text-[10px] tracking-[0.2em] text-faint">手 记</span>
            <span className="mt-0.5 font-serif text-[16px] text-ink">
              {fmtDate(date)} · {weekday(date)}
            </span>
            <span className="mt-0.5 text-[10px] text-faint">
              {relDay(date)}
              {isToday ? '' : ' · 点这里回到今天'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDate((d) => addDays(d, 1))}
            disabled={isToday}
            className="flex h-9 w-9 items-center justify-center rounded-full text-soft transition active:scale-90 disabled:opacity-25"
            aria-label="后一天"
          >
            <Icon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="space-y-3 px-5 pt-4">
        <Card className="overflow-hidden">
          <div className="px-5 pt-4">
            <BlockTitle
              title="随笔"
              right={entry?.body?.trim() ? `${entry.body.trim().length} 字` : '想到哪写到哪'}
            />
          </div>
          <textarea
            value={entry?.body ?? ''}
            onChange={(e) => patchEntry(date, { body: e.target.value })}
            rows={10}
            placeholder={'今天发生了什么？\n哪件事让你有点情绪，哪怕很小。\n身体有没有哪里不一样。'}
            className="w-full resize-none bg-transparent px-5 pb-3 font-serif text-[16px] leading-[2] text-ink outline-none placeholder:text-faint/60"
          />
          <div className="px-5 pb-2 text-[10px] leading-relaxed text-faint">
            「此刻」里停笔 8 分钟后的内容，会带着时间自动出现在这里。
          </div>
          <div className="flex items-center justify-between border-t border-line/50 px-4 py-2.5">
            <span className="text-[10px] text-faint">{savedLabel}</span>
            <span className="text-[10px] text-faint">自动保存</span>
          </div>
        </Card>

        <Card className="p-5">
          <BlockTitle title="精力" right="1 枯竭 — 5 充沛" />
          <EnergyMeter entry={entry} onSet={setEnergy} />
          <Echo text={energyNote} />
        </Card>

        <CollapsibleCard title="睡眠" summary={sleepSummary} storageKey="write-sleep" defaultOpen>
          <div className="grid grid-cols-2 gap-3">
            <Field label="入睡">
              <TimeField
                value={entry?.sleep?.bed}
                onChange={(v) => setSleep({ bed: v || undefined })}
                placeholder="选时间"
                title="入睡时间"
              />
            </Field>
            <Field label="起床">
              <TimeField
                value={entry?.sleep?.wake}
                onChange={(v) => setSleep({ wake: v || undefined })}
                placeholder="选时间"
                title="起床时间"
              />
            </Field>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] text-soft">睡得怎么样</span>
              <span className="text-[10.5px] text-faint">
                {entry?.sleep?.quality ? `${entry.sleep.quality}/5` : '没记'}
              </span>
            </div>
            <Dots value={entry?.sleep?.quality} onChange={(v) => setSleep({ quality: v })} />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] text-soft">午睡</span>
              <span className="text-[10.5px] text-faint">
                {entry?.sleep?.napMin != null ? `${entry.sleep.napMin} 分钟` : '没记'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 15, 20, 30, 45, 60, 90].map((m) => (
                <Chip
                  key={m}
                  on={entry?.sleep?.napMin === m}
                  onClick={() => setSleep({ napMin: entry?.sleep?.napMin === m ? undefined : m })}
                >
                  {m === 0 ? '没睡' : `${m} 分`}
                </Chip>
              ))}
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="身体与消耗" summary={bodySummary} storageKey="write-body">
          <div className="grid grid-cols-2 gap-2.5">
            {ACTIVITIES.map((a) => {
              const total = activityTotal(entry, a.key) ?? 0;
              const count = segmentsOf(entry, a.key).length;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setActivity(a.key)}
                  className="rounded-2xl border border-line/60 bg-paper2/50 p-3.5 text-left transition active:scale-[0.98]"
                >
                  <div className="text-[10.5px] text-faint">{a.label}</div>
                  <div className="num mt-1 font-serif text-[18px] leading-none text-ink/90">
                    {total ? fmtDuration(total) : '—'}
                  </div>
                  <div className="mt-1 text-[9.5px] text-faint">{count ? `${count} 段 · 点开改` : '点开分段记'}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-faint">
            点开可以按时间段记（比如 9:30–12:00），也可以直接填总分钟，合计自动算。
          </p>
        </CollapsibleCard>

        <CollapsibleCard title="三餐" summary={mealSummary} storageKey="write-meals">
          <div className="space-y-3">
            {MEALS.map((m) => {
              const meal: Meal = entry?.food?.meals?.[m.key] ?? {};
              const setMeal = (patch: Partial<Meal>) =>
                patchEntry(date, (e) => ({
                  food: {
                    ...e.food,
                    meals: { ...e.food?.meals, [m.key]: { ...meal, ...patch } }
                  }
                }));
              return (
                <div key={m.key} className="rounded-2xl border border-line/50 bg-paper2/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-soft">{m.label}</span>
                    <TimeField
                      value={meal.time}
                      onChange={(v) => setMeal({ time: v || undefined })}
                      placeholder="时间"
                      title={`${m.label}时间`}
                      className="w-[92px] py-1 text-center text-[11.5px]"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="w-6 shrink-0 pt-1 text-[9px] text-faint">主食</span>
                    <div className="flex flex-wrap gap-1">
                      {STAPLES_BY_MEAL[m.key].map((s) => (
                        <Chip
                          key={s}
                          className="px-2 py-1 text-[11.5px]"
                          on={meal.staple === s}
                          onClick={() => setMeal({ staple: meal.staple === s ? undefined : s })}
                        >
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <span className="w-6 shrink-0 pt-1 text-[9px] text-faint">蛋白</span>
                    <div className="flex flex-wrap gap-1">
                      {PROTEINS.map((s) => (
                        <Chip
                          key={s}
                          className="px-2 py-1 text-[11.5px]"
                          on={meal.protein === s}
                          onClick={() => setMeal({ protein: meal.protein === s ? undefined : s })}
                        >
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <input
            value={entry?.food?.note ?? ''}
            onChange={(e) => patchEntry(date, (ev) => ({ food: { ...ev.food, note: e.target.value } }))}
            placeholder="胃的感觉、想记的一口（选填）"
            className="field mt-3 py-2.5 text-[13.5px]"
          />
        </CollapsibleCard>

        <CollapsibleCard title="情绪" summary={moodSummary} storageKey="write-mood">
          <div className="flex flex-wrap gap-1.5">
            {MOOD_TAGS.map((m) => (
              <Chip
                key={m}
                on={entry?.mood.includes(m)}
                onClick={() => {
                  const adding = !entry?.mood.includes(m);
                  toggleIn('mood', m);
                  if (adding) flash('mood', MOOD_ECHO[m]);
                }}
              >
                {m}
              </Chip>
            ))}
          </div>
          <Echo text={moodNote} />
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[10.5px] text-faint">
              <span>很糟</span>
              <span>很好</span>
            </div>
            <Dots value={entry?.moodScore} onChange={(v) => patchEntry(date, { moodScore: v })} />
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="阅读" summary={readingSummary} storageKey="write-reading">
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label="在读">
              <input
                value={entry?.reading?.book ?? state.settings.book ?? ''}
                onChange={(e) =>
                  patchEntry(date, (ev) => ({ reading: { ...ev.reading, book: e.target.value } }))
                }
                placeholder="书名"
                className="field"
              />
            </Field>
            <Field label="页数">
              <NumInput
                value={entry?.reading?.pages}
                onChange={(v) => patchEntry(date, (ev) => ({ reading: { ...ev.reading, pages: v } }))}
                placeholder="0"
                max={2000}
              />
            </Field>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="标签" summary={tagSummary} storageKey="write-tags">
          <div className="flex flex-wrap gap-1.5">
            {COMMON_TAGS.map((t) => (
              <Chip key={t} on={entry?.tags.includes(t)} onClick={() => toggleIn('tags', t)}>
                {t}
              </Chip>
            ))}
          </div>
        </CollapsibleCard>

        <div className="flex items-center justify-between px-2 pb-4 pt-1">
          <span className="text-[10.5px] text-faint">记录是给自己看的，不用好看</span>
          <button
            type="button"
            onClick={() => {
              toast('已经存好了');
              window.location.hash = '/today';
            }}
            className="text-[11.5px] text-moss"
          >
            回今日 →
          </button>
        </div>
      </div>

      {activity ? (
        <ActivitySheet
          open
          onClose={() => setActivity(null)}
          activity={ACTIVITIES.find((a) => a.key === activity) ?? ACTIVITIES[0]}
          segments={segmentsOf(entry, activity)}
          onChange={(list) => patchEntry(date, (e) => segmentPatch(e, activity, list))}
        />
      ) : null}
    </div>
  );
}
