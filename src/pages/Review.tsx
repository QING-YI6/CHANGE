import { useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, Chip, Echo, Eyebrow, Icon, Sheet } from '../components/ui';
import { DayRibbon, EnergyBars, EnergyCurve } from '../components/energy';
import { DiaryText } from '../components/diary';
import { Marginalia } from '../components/marginalia';
import {
  fmtDate,
  fmtDuration,
  fmtFull,
  fmtHours,
  monthKey,
  monthLabel,
  relDay,
  sleepHours,
  weekday,
  weekdayShort
} from '../lib/date';
import { avgEnergyOf, entryEnergy, hasContent, insights, rangeEntries, streak } from '../lib/stats';
import { activityTotal } from '../lib/segments';
import { weeklyReport, weekRangeLabel, type WeeklyReport } from '../lib/weekly';
import { runRetroLine } from '../lib/llm';
import type { Entry } from '../types';
import { MEALS } from '../types';

type Filter = 'all' | 'high' | 'low' | 'read' | 'notes';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'high', label: '电量高' },
  { key: 'low', label: '电量低' },
  { key: 'read', label: '读过书' },
  { key: 'notes', label: '有回看' }
];

function passes(e: Entry, f: Filter): boolean {
  if (!hasContent(e)) return false;
  const avg = entryEnergy(e);
  if (f === 'high') return avg != null && avg >= 3.4;
  if (f === 'low') return avg != null && avg <= 2.6;
  if (f === 'read') return Boolean(e.reading?.pages && e.reading.pages > 0);
  if (f === 'notes') return e.notes.length > 0;
  return true;
}

function InsightCard({ ins }: { ins: ReturnType<typeof insights>[number] }) {
  const max = 5;
  const rows = [
    { label: ins.aLabel, avg: ins.aAvg, n: ins.aN, color: 'rgb(var(--c-moss))' },
    { label: ins.bLabel, avg: ins.bAvg, n: ins.bN, color: 'rgb(var(--c-clay))' }
  ];
  return (
    <Card className="p-4">
      <div className="text-[11px] tracking-[0.1em] text-faint">{ins.title}</div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[11.5px] text-soft">{r.label}</span>
              <span className="num text-[12px] text-ink/80">
                {r.avg.toFixed(1)}
                <span className="ml-1 text-[9.5px] text-faint">{ins.unit} · {r.n} 天</span>
              </span>
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-line/40">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(r.avg / max) * 100}%`, background: r.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[9.5px] leading-relaxed text-faint">只是你自己数据里的相关，不是因果关系。</p>
    </Card>
  );
}

function EntryDetail({ date, onClose }: { date: string; onClose: () => void }) {
  const { entryOf, addNote, state, toast } = useApp();
  const entry = entryOf(date);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hours = sleepHours(entry?.sleep?.bed, entry?.sleep?.wake);

  const meta: { label: string; value: string }[] = [];
  if (hours != null) meta.push({ label: '睡眠', value: fmtHours(hours) });
  if (entry?.sleep?.napMin != null) meta.push({ label: '午睡', value: fmtDuration(entry.sleep.napMin) });
  const outdoor = activityTotal(entry, 'outdoor');
  const exercise = activityTotal(entry, 'exercise');
  const work = activityTotal(entry, 'work');
  const screen = activityTotal(entry, 'screen');
  if (outdoor != null) meta.push({ label: '外出', value: fmtDuration(outdoor) });
  if (exercise) meta.push({ label: '运动', value: fmtDuration(exercise) });
  if (work != null) meta.push({ label: '学习工作', value: fmtDuration(work) });
  if (screen != null) meta.push({ label: '屏幕', value: fmtDuration(screen) });
  if (entry?.reading?.pages) meta.push({ label: '阅读', value: `${entry.reading.pages} 页` });
  const mealMarks = MEALS.filter((m) => entry?.food?.meals?.[m.key]).map((m) => m.label[0]);
  if (mealMarks.length) meta.push({ label: '三餐', value: mealMarks.join(' ') });
  if (entry?.moodScore) meta.push({ label: '心情', value: `${entry.moodScore}/5` });

  const avgEnergy = entryEnergy(entry);

  const askAI = async () => {
    if (!entry) return;
    if (!state.settings.apiKey.trim()) {
      toast('先到「我」里填 API Key');
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const line = await runRetroLine(state, entry, controller.signal);
      if (line) {
        addNote(date, line, 'ai');
        toast('写下了');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : '出了点问题');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <Sheet open onClose={onClose} title="这一天">
      <div className="-mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[22px] text-ink">{fmtFull(date)}</h2>
          <span className="text-[11px] text-faint">
            {weekday(date)} · {relDay(date)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-soft">
          平均精力 {avgEnergy != null ? avgEnergy.toFixed(1) : '—'}
          {entry?.notes?.length ? ` · ${entry.notes.length} 条回看` : ''}
        </div>

        <div className="mt-4">
          <EnergyCurve entry={entry} height={80} />
        </div>

        {meta.length ? (
          <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-3 rounded-2xl border border-line/50 bg-surface/50 p-3.5">
            {meta.map((m) => (
              <div key={m.label}>
                <div className="text-[9.5px] tracking-wide text-faint">{m.label}</div>
                <div className="mt-0.5 text-[12.5px] text-ink/85">{m.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {entry?.body?.trim() ? (
          <div className="mt-5">
            <DiaryText text={entry.body} />
          </div>
        ) : (
          <p className="mt-5 text-[12.5px] text-faint">这一天只留下了数据，没有文字。</p>
        )}

        {entry?.mood?.length || entry?.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {entry?.mood.map((m) => (
              <span key={m} className="rounded-full bg-clay/10 px-2.5 py-1 text-[10.5px] text-clay">{m}</span>
            ))}
            {entry?.tags.map((t) => (
              <span key={t} className="rounded-full border border-line/70 px-2.5 py-1 text-[10.5px] text-soft">
                #{t}
              </span>
            ))}
          </div>
        ) : null}

        {entry?.notes?.length ? (
          <div className="mt-6">
            <Eyebrow>后来的我</Eyebrow>
            <div className="mt-2.5 space-y-2.5">
              {entry.notes.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl border p-3.5 ${
                    n.kind === 'ai'
                      ? 'border-moss/30 bg-moss/[0.06]'
                      : 'border-line/60 bg-surface/60'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[9.5px] text-faint">
                    {n.kind === 'ai' ? <Icon name="spark" className="h-3 w-3 text-moss" /> : null}
                    <span>{n.kind === 'ai' ? 'change 写的' : '我写的'}</span>
                  </div>
                  <p className="font-serif text-[13.5px] leading-relaxed text-ink/85">{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-line/60 bg-surface/40 p-4">
          <Eyebrow>对那一天说一句</Eyebrow>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="如果现在的你回到那天，想说什么？"
            className="mt-2 w-full resize-none bg-transparent font-serif text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint/70"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={askAI}
              disabled={busy}
              className="flex items-center gap-1.5 text-[11.5px] text-moss disabled:opacity-50"
            >
              <Icon name="spark" className="h-3.5 w-3.5" />
              {busy ? '正在想…' : '让 change 说一句'}
            </button>
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                addNote(date, draft, 'self');
                setDraft('');
                toast('收好了');
              }}
              className="rounded-full bg-ink px-4 py-1.5 text-[11.5px] text-paper disabled:opacity-30"
            >
              存下
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function WeekBars({
  report,
  entries,
  height = 30,
  labels = false
}: {
  report: WeeklyReport;
  entries: Entry[];
  height?: number;
  labels?: boolean;
}) {
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {report.dates.map((d) => {
        const v = entryEnergy(entries.find((e) => e.date === d));
        return (
          <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="relative w-full max-w-[20px] flex-1 rounded-[3px] bg-line/25">
              <span
                className="absolute bottom-0 left-0 w-full rounded-[3px] transition-all duration-500"
                style={{
                  height: v ? `${22 + (v - 1) * 17}%` : '5%',
                  background: v ? 'rgb(var(--c-moss) / 0.75)' : 'rgb(var(--c-line))'
                }}
              />
            </div>
            {labels ? <span className="text-[8.5px] text-faint">{weekdayShort(d)}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function WeeklySheet({
  report,
  entries,
  onClose
}: {
  report: WeeklyReport;
  entries: Entry[];
  onClose: () => void;
}) {
  const tiles = [
    { label: '记录', value: `${report.recorded}`, unit: '天' },
    { label: '午睡 ≥30 分', value: `${report.napLongDays}`, unit: '天' },
    { label: '出门', value: `${report.outdoorDays}`, unit: '天' },
    { label: '阅读', value: `${report.pages}`, unit: '页' }
  ];
  return (
    <Sheet open onClose={onClose} title="这一周">
      <div className="-mt-4">
        <div className="text-[10px] tracking-[0.14em] text-faint">{weekRangeLabel(report)}</div>
        <div className="mt-2 flex items-end gap-3">
          <div className="num font-serif text-[40px] leading-none text-ink">
            {report.avg != null ? report.avg.toFixed(1) : '—'}
          </div>
          <div className="pb-1 text-[11px] leading-snug text-soft">
            平均电量
            <br />
            <span className="text-faint">
              {report.recorded}/7 天有记录
              {report.prevAvg != null ? ` · 上周 ${report.prevAvg.toFixed(1)}` : ''}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <WeekBars report={report} entries={entries} height={64} labels />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-line/50 bg-surface/50 p-2.5">
              <div className="text-[9px] text-faint">{t.label}</div>
              <div className="num mt-1 text-[17px] leading-none text-ink/90">
                {t.value}
                <span className="ml-0.5 text-[9px] text-faint">{t.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {report.lines.map((line, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? 'font-serif text-[15.5px] leading-[1.9] text-ink/90'
                  : 'text-[12.5px] leading-relaxed text-soft'
              }
            >
              {line}
            </p>
          ))}
        </div>

        {report.moods.length ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {report.moods.map((m) => (
              <span key={m.tag} className="rounded-full bg-clay/10 px-2.5 py-1 text-[10.5px] text-clay">
                {m.tag} × {m.n}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-6 text-[10px] leading-relaxed text-faint">
          只统计最近 7 天。这里只描述你自己的数据，不下结论，也不安排下周。
        </p>
      </div>
    </Sheet>
  );
}

export default function Review() {
  const { state, today } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [weekOpen, setWeekOpen] = useState(false);

  const filled = useMemo(() => state.entries.filter(hasContent), [state.entries]);
  const list = useMemo(
    () => state.entries.filter((e) => passes(e, filter)),
    [state.entries, filter]
  );
  const ins = useMemo(() => insights(state.entries).slice(0, 3), [state.entries]);
  const weekly = useMemo(() => weeklyReport(state.entries), [state.entries]);
  const avg30 = avgEnergyOf(rangeEntries(state.entries, 30));
  const months = useMemo(() => {
    const groups: { key: string; items: Entry[] }[] = [];
    for (const e of list) {
      const k = monthKey(e.date);
      const last = groups[groups.length - 1];
      if (last && last.key === k) last.items.push(e);
      else groups.push({ key: k, items: [e] });
    }
    return groups;
  }, [list]);

  return (
    <div className="px-5">
      <header className="pt-safe px-1 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>回望</Eyebrow>
            <h1 className="mt-1.5 font-serif text-[26px] leading-tight tracking-wide text-ink">
              你走过的样子
            </h1>
          </div>
          <div className="pb-1 text-right">
            <div className="num font-serif text-[20px] leading-none text-ink/80">{filled.length}</div>
            <div className="mt-1 text-[9.5px] tracking-wide text-faint">天记录</div>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-soft">
          近 30 天平均精力 {avg30 != null ? avg30.toFixed(1) : '—'} · 连续 {streak(state.entries)} 天
        </p>
      </header>

      <Card className="mb-3.5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10.5px] tracking-[0.14em] text-faint">最近 30 天</span>
          <div className="flex items-center gap-2.5 text-[9px] text-faint">
            <span className="flex items-center gap-1">
              <i className="h-2 w-1 rounded-full" style={{ background: 'rgb(var(--c-clay))' }} />低
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2 w-1 rounded-full" style={{ background: 'rgb(var(--c-moss))' }} />高
            </span>
          </div>
        </div>
        <DayRibbon entries={state.entries} days={30} onPick={(d) => setOpen(d)} />
      </Card>

      <button
        type="button"
        onClick={() => setWeekOpen(true)}
        className="card tap mb-3.5 w-full p-4 text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] tracking-[0.14em] text-faint">这一周</span>
          <span className="text-[10px] text-moss">看周报 →</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="num font-serif text-[26px] leading-none text-ink/90">
            {weekly.avg != null ? weekly.avg.toFixed(1) : '—'}
          </span>
          <span className="text-[10.5px] text-faint">
            平均电量 · 7 天里记了 {weekly.recorded} 天
          </span>
        </div>
        <div className="mt-3">
          <WeekBars report={weekly} entries={state.entries} height={30} />
        </div>
        {weekly.lines[0] ? (
          <p className="mt-2.5 line-clamp-2 font-serif text-[12.5px] leading-[1.85] text-soft">
            {weekly.lines[0]}
          </p>
        ) : null}
      </button>

      <div className="mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <Chip key={f.key} on={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-serif text-[15px] text-soft">
            {filled.length === 0 ? '还没有记录。' : '这个筛选下没有内容。'}
          </p>
          <button
            type="button"
            onClick={() => (window.location.hash = '/write')}
            className="mt-3 text-[12px] text-moss"
          >
            去写今天的 →
          </button>
        </Card>
      ) : (
        <div className="space-y-6 pb-4">
          {months.map((g) => (
            <div key={g.key}>
              <div className="mb-2.5 flex items-center gap-3 px-1">
                <span className="font-serif text-[13px] tracking-wide text-soft">{monthLabel(g.key)}</span>
                <span className="h-px flex-1 bg-line/50" />
                <span className="text-[9.5px] text-faint">{g.items.length} 天</span>
              </div>
              <div className="space-y-2.5">
                {g.items.map((e) => {
                  const avg = entryEnergy(e);
                  const day = Number(e.date.slice(8));
                  const words = e.body.trim().length;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setOpen(e.date)}
                      className="card tap w-full p-4 text-left"
                    >
                      <div className="flex gap-3.5">
                        <div className="w-10 shrink-0 pt-0.5 text-center">
                          <div className="num font-serif text-[21px] leading-none text-ink/85">{day}</div>
                          <div className="mt-1 text-[9px] text-faint">{weekday(e.date)}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap gap-1">
                              {e.mood.slice(0, 2).map((m) => (
                                <span
                                  key={m}
                                  className="rounded-full bg-clay/10 px-2 py-0.5 text-[9.5px] text-clay"
                                >
                                  {m}
                                </span>
                              ))}
                              {e.notes.length ? (
                                <span className="flex items-center gap-0.5 rounded-full bg-moss/10 px-2 py-0.5 text-[9.5px] text-moss">
                                  {e.notes.length} 条回看
                                </span>
                              ) : null}
                            </div>
                            <EnergyBars entry={e} className="shrink-0" />
                          </div>
                          <p className="mt-1.5 line-clamp-2 font-serif text-[13.5px] leading-[1.8] text-ink/80">
                            {e.body.replace(/〔\d{1,2}:\d{2}〕/g, '').replace(/\s+/g, ' ').trim() ||
                              '（只有数据，没有文字）'}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[9.5px] text-faint">
                            {avg != null ? <span className="num">精力 {avg.toFixed(1)}</span> : null}
                            {words ? <span>· {words} 字</span> : null}
                            {e.reading?.pages ? <span>· 读 {e.reading.pages} 页</span> : null}
                            {e.sleep?.napMin != null && e.sleep.napMin > 0 ? (
                              <span>· 午睡 {e.sleep.napMin}m</span>
                            ) : null}
                            {e.outdoorMin ? <span>· 外出 {e.outdoorMin}m</span> : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {ins.length ? (
        <div className="mb-4 mt-8">
          <div className="mb-2.5 flex items-baseline justify-between px-1">
            <h2 className="font-serif text-[16px] text-ink/90">数据里露出来的一点规律</h2>
            <span className="text-[9.5px] text-faint">只在这台手机上算</span>
          </div>
          <div className="space-y-2.5">
            {ins.map((x) => (
              <InsightCard key={x.id} ins={x} />
            ))}
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-faint">
            这些只是你自己的数字之间的相关。样本还小，别急着下结论——做两周实验再看。
          </p>
        </div>
      ) : null}

      {open ? <EntryDetail date={open} onClose={() => setOpen(null)} /> : null}
      {weekOpen ? (
        <WeeklySheet report={weekly} entries={state.entries} onClose={() => setWeekOpen(false)} />
      ) : null}

      <Marginalia book={state.settings.book} salt={2} className="mb-6 mt-8 px-2" />
    </div>
  );
}
