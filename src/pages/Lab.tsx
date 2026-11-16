import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, Chip, Eyebrow, Icon, Sheet, Field, Seg } from '../components/ui';
import { activeDate, addDays } from '../lib/date';
import { avgEnergyOf, entryEnergy } from '../lib/stats';
import { METRICS, type Entry, type Experiment, type MetricKey } from '../types';
import { cx } from '../components/ui';

interface Template {
  title: string;
  hypothesis: string;
  action: string;
  metric: MetricKey;
  days: number;
}

const TEMPLATES: Template[] = [
  {
    title: '午睡只睡 20 分钟',
    hypothesis: '20 分钟的功率小睡，比睡到自然醒更能保住下午的精力，也不会越睡越沉。',
    action: '午饭后定 25 分钟闹钟，躺下但不追求睡着，闹钟响就起来。',
    metric: 'energy',
    days: 10
  },
  {
    title: '午饭后走 10 分钟',
    hypothesis: '午饭后出门走一小段，下午的精力比直接坐下更高。',
    action: '吃完午饭不坐下，出门走 10 分钟再回来。',
    metric: 'energy',
    days: 10
  },
  {
    title: '咖啡在 14 点前喝完',
    hypothesis: '14 点后不碰咖啡因，入睡更快、夜里醒得少。',
    action: '14:00 之后只喝水或淡茶。',
    metric: 'sleep',
    days: 12
  },
  {
    title: '起床后先见 10 分钟太阳',
    hypothesis: '起床后 1 小时内出门见光，上午更清醒，晚上更容易困。',
    action: '刷牙后下楼站 10 分钟，不戴墨镜。',
    metric: 'energy',
    days: 10
  },
  {
    title: '睡前只读两页书',
    hypothesis: '用两页书替代睡前刷视频，入睡更顺，第二天上午更稳。',
    action: '手机放到另一个房间，只带书上床，读两页就关灯。',
    metric: 'sleep',
    days: 10
  },
  {
    title: '上午先做一件难事',
    hypothesis: '上午完成一件拖着的事，全天的焦虑感更低。',
    action: '起床后两小时内，先做那件一直想躲的事，只做 15 分钟。',
    metric: 'anxiety',
    days: 7
  }
];

function progressDots(x: Experiment, today: string) {
  return Array.from({ length: x.days }, (_, i) => {
    const d = addDays(x.startDate, i);
    const log = x.logs[d];
    const done = log?.done;
    const skipped = log?.skipped;
    const isToday = d === today;
    const past = d < today;
    return (
      <span
        key={d}
        title={d}
        className={cx(
          'h-[7px] w-[7px] rounded-full transition-colors',
          done
            ? 'bg-moss'
            : skipped
              ? 'border border-clay bg-clay/20'
              : past
                ? 'bg-line'
                : 'bg-line/50',
          isToday && !done && !skipped && 'ring-2 ring-clay/40'
        )}
      />
    );
  });
}

function statsOf(x: Experiment, entries: Entry[]) {
  const doneDates = Object.keys(x.logs).filter((d) => x.logs[d]?.done);
  const skippedDates = Object.keys(x.logs).filter((d) => x.logs[d]?.skipped);
  const during = avgEnergyOf(entries.filter((e) => doneDates.includes(e.date)));
  const beforeFrom = addDays(x.startDate, -7);
  const before = avgEnergyOf(entries.filter((e) => e.date >= beforeFrom && e.date < x.startDate));
  return { done: doneDates.length, skipped: skippedDates.length, during, before };
}

export default function Lab() {
  const { state, today, addExperiment, patchExperiment, markExperiment, deleteExperiment, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [action, setAction] = useState('');
  const [metric, setMetric] = useState<MetricKey>('energy');
  const [days, setDays] = useState(10);

  const running = useMemo(() => state.experiments.filter((x) => x.status === 'running'), [state.experiments]);
  const done = useMemo(() => state.experiments.filter((x) => x.status === 'done'), [state.experiments]);
  const ideas = useMemo(() => state.experiments.filter((x) => x.status === 'idea'), [state.experiments]);

  const pickTemplate = (t: Template) => {
    setTemplate(t);
    setTitle(t.title);
    setHypothesis(t.hypothesis);
    setAction(t.action);
    setMetric(t.metric);
    setDays(t.days);
  };

  const reset = () => {
    setTemplate(null);
    setTitle('');
    setHypothesis('');
    setAction('');
    setMetric('energy');
    setDays(10);
  };

  const create = () => {
    if (!title.trim()) {
      toast('先给它起个名字');
      return;
    }
    addExperiment({
      id: `x-${Date.now().toString(36)}`,
      title: title.trim(),
      hypothesis: hypothesis.trim(),
      action: action.trim(),
      metric,
      startDate: activeDate(),
      days,
      status: 'running',
      createdAt: Date.now(),
      logs: {},
      origin: template ? 'self' : 'self'
    });
    setOpen(false);
    reset();
    toast('实验开始了，做一天点一下');
  };

  return (
    <div className="px-5">
      <header className="pt-safe px-1 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>实验室</Eyebrow>
            <h1 className="mt-1.5 font-serif text-[26px] leading-tight tracking-wide text-ink">
              一次只改一件事
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 flex h-9 items-center gap-1 rounded-full border border-line bg-surface/70 px-3 text-[11.5px] text-ink transition active:scale-95"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            新实验
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-soft">
          别一次改全部。挑一个变量，做 7–14 天，做完看数据再决定。
        </p>
      </header>

      {running.length ? (
        <div className="mb-5 space-y-2.5">
          {running.map((x) => {
            const log = x.logs[today];
            const doneToday = Boolean(log?.done);
            const skippedToday = Boolean(log?.skipped);
            const dayIndex = Math.min(
              x.days,
              Math.max(1, Math.round((Date.parse(today) - Date.parse(x.startDate)) / 86400000) + 1)
            );
            const st = statsOf(x, state.entries);
            return (
              <Card key={x.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.14em] text-faint">
                    进行中 · 第 {dayIndex}/{x.days} 天
                  </span>
                  <button
                    type="button"
                    onClick={() => patchExperiment(x.id, { status: 'done', finishedAt: Date.now() })}
                    className="text-[10.5px] text-faint"
                  >
                    收尾
                  </button>
                </div>
                <h3 className="mt-1.5 font-serif text-[16.5px] leading-snug text-ink">{x.title}</h3>
                {x.hypothesis ? (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-soft">{x.hypothesis}</p>
                ) : null}
                {x.action ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-faint">做法：{x.action}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-[5px]">{progressDots(x, today)}</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-faint">
                    {METRICS.find((m) => m.key === x.metric)?.label}
                    {st.during != null ? ` · 平均 ${st.during.toFixed(1)}` : ''}
                    {st.skipped ? ` · 缺 ${st.skipped} 天` : ''}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => markExperiment(x.id, today, doneToday ? null : 'done')}
                      className={cx(
                        'flex items-center gap-1 rounded-full px-3 py-2 text-[11.5px] transition-all active:scale-95',
                        doneToday ? 'bg-moss/15 text-moss' : 'bg-ink text-paper'
                      )}
                    >
                      <Icon name="check" className="h-3.5 w-3.5" />
                      做到了
                    </button>
                    <button
                      type="button"
                      onClick={() => markExperiment(x.id, today, skippedToday ? null : 'skip')}
                      className={cx(
                        'flex items-center gap-1 rounded-full border px-3 py-2 text-[11.5px] transition-all active:scale-95',
                        skippedToday ? 'border-clay bg-clay/10 text-clay' : 'border-line text-soft'
                      )}
                    >
                      <Icon name="x" className="h-3 w-3" />
                      没做到
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mb-5 p-5">
          <p className="font-serif text-[15px] leading-relaxed text-ink/85">
            还没有进行中的实验。挑一个你最想弄明白的小问题——比如「午睡到底该睡多久」，从下面开始。
          </p>
        </Card>
      )}

      {ideas.length ? (
        <div className="mb-5">
          <div className="mb-2.5 px-1 font-serif text-[15px] text-ink/90">想试试的</div>
          <div className="space-y-2">
            {ideas.map((x) => (
              <div key={x.id} className="card flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-serif text-[14px] text-ink/90">{x.title}</div>
                  <div className="mt-0.5 truncate text-[10.5px] text-faint">{x.hypothesis || '还没写假设'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => patchExperiment(x.id, { status: 'running', startDate: activeDate() })}
                  className="shrink-0 text-[11px] text-moss"
                >
                  开始
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {done.length ? (
        <div className="mb-5">
          <div className="mb-2.5 px-1 font-serif text-[15px] text-ink/90">做完了的</div>
          <div className="space-y-2">
            {done.map((x) => {
              const st = statsOf(x, state.entries);
              const delta = st.during != null && st.before != null ? st.during - st.before : null;
              return (
                <Card key={x.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-serif text-[14.5px] text-ink/90">{x.title}</h3>
                      <p className="mt-1 text-[10.5px] text-faint">
                        做到 {st.done}/{x.days} 天
                        {st.skipped ? ` · 缺 ${st.skipped} 天` : ''}
                        {st.during != null ? ` · 期间精力 ${st.during.toFixed(1)}` : ''}
                        {delta != null ? `（之前 ${st.before!.toFixed(1)}）` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('删除这个实验？')) deleteExperiment(x.id);
                      }}
                      className="shrink-0 text-faint"
                      aria-label="删除"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={x.result ?? ''}
                    onChange={(e) => patchExperiment(x.id, { result: e.target.value })}
                    rows={2}
                    placeholder="结论写在这里：它有用吗？在什么情况下有用？"
                    className="mt-2.5 w-full resize-none rounded-xl bg-paper2/60 px-3 py-2 text-[12px] leading-relaxed text-ink outline-none placeholder:text-faint/70"
                  />
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <div className="mb-2.5 px-1 font-serif text-[15px] text-ink/90">现成的实验</div>
        <div className="space-y-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => {
                pickTemplate(t);
                setOpen(true);
              }}
              className="card tap flex w-full items-center gap-3 p-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] text-ink/90">{t.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[10.5px] text-faint">{t.hypothesis}</div>
              </div>
              <span className="shrink-0 text-[10.5px] text-moss">{t.days} 天</span>
            </button>
          ))}
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="新实验"
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] tracking-wide text-soft">从一个模板开始</div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <Chip key={t.title} on={template?.title === t.title} onClick={() => pickTemplate(t)}>
                  {t.title}
                </Chip>
              ))}
            </div>
          </div>

          <Field label="实验名">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder="给它起个名字" />
          </Field>

          <Field label="假设" hint="如果……那么……">
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              rows={3}
              className="field resize-none"
              placeholder="如果午睡只睡 20 分钟，那么下午的精力会更高。"
            />
          </Field>

          <Field label="具体做法" hint="小到明天就能开始">
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              rows={2}
              className="field resize-none"
              placeholder="午饭后定 25 分钟闹钟，响了起来。"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="主要看">
              <div className="relative">
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as MetricKey)}
                  className="field appearance-none pr-9"
                >
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Field>
            <Field label="周期">
              <div className="pt-1.5">
                <Seg
                  options={[
                    { key: '7', label: '7 天' },
                    { key: '10', label: '10 天' },
                    { key: '14', label: '14 天' }
                  ]}
                  value={String(days) as '7' | '10' | '14'}
                  onChange={(v) => setDays(Number(v))}
                />
              </div>
            </Field>
          </div>

          <button type="button" onClick={create} className="btn-primary w-full">
            开始实验
          </button>
          <p className="text-center text-[10px] leading-relaxed text-faint">
            开始之后每天在「实验」里点一下，数据会和当天的精力自动对照
          </p>
        </div>
      </Sheet>
    </div>
  );
}
