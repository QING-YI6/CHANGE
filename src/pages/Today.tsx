import { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, Chip, Echo, Eyebrow, Icon, SectionTitle } from '../components/ui';
import { EnergyMeter, WeekDots } from '../components/energy';
import { ScratchBox } from '../components/scratch';
import { Marginalia } from '../components/marginalia';
import { fmtDate, fmtDuration, greeting, isDeepNight, phaseLine, sleepHours, weekday } from '../lib/date';
import { avgEnergyOf, entryEnergy, hasContent, rangeEntries, streak } from '../lib/stats';
import { activityTotal } from '../lib/segments';
import { appendBody } from '../lib/scratch';
import { energyEchoFor } from '../lib/echo';
import { runDailyAnalysis } from '../lib/llm';
import { COMMON_TAGS, type Analysis, type Energy, type Slot } from '../types';

const DAILY_LIMIT = 10;

function MetricCard({
  icon,
  label,
  value,
  sub,
  onClick
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="card tap flex flex-col gap-1.5 p-3.5 text-left">
      <div className="flex items-center gap-1.5 text-faint">
        <Icon name={icon} className="h-3.5 w-3.5" />
        <span className="text-[10.5px] tracking-[0.1em]">{label}</span>
      </div>
      <div className="num font-serif text-[18px] leading-none text-ink/90">{value}</div>
      {sub ? <div className="truncate text-[10px] text-faint">{sub}</div> : null}
    </button>
  );
}

export default function Today() {
  const {
    state,
    today,
    entryOf,
    patchEntry,
    analysisOf,
    addAnalysis,
    addExperiment,
    setSettings,
    markExperiment,
    toast
  } = useApp();
  const entry = entryOf(today);
  const analysis = analysisOf(today);
  const [busy, setBusy] = useState(false);
  const [draftLen, setDraftLen] = useState(0);
  const [energyNote, setEnergyNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const echoTimer = useRef<number | undefined>(undefined);

  const avg = entryEnergy(entry);
  const weekBase = avgEnergyOf(rangeEntries(state.entries.filter((e) => e.date !== today), 7));
  const hours = sleepHours(entry?.sleep?.bed, entry?.sleep?.wake);
  const outdoorTotal = activityTotal(entry, 'outdoor');
  const streakDays = streak(state.entries);
  const running = state.experiments.filter((e) => e.status === 'running');
  const usedToday = state.analyses.filter((a) => a.date === today).length;
  const remaining = Math.max(0, DAILY_LIMIT - usedToday);
  const deepNight = isDeepNight();

  const deltaLabel = (() => {
    if (avg == null) return '还没记，点一下格子就好';
    if (weekBase == null) return '这是第一笔数据';
    const diff = avg - weekBase;
    if (Math.abs(diff) < 0.15) return `和最近一周差不多（${weekBase.toFixed(1)}）`;
    return `比最近一周${diff > 0 ? '高' : '低'} ${Math.abs(diff).toFixed(1)}`;
  })();

  useEffect(() => () => window.clearTimeout(echoTimer.current), []);

  const setEnergy = (slot: Slot, value?: Energy) => {
    patchEntry(today, (e) => {
      const energy = { ...e.energy };
      if (value == null) delete energy[slot];
      else energy[slot] = value;
      return { energy };
    });
    if (value != null) {
      setEnergyNote(energyEchoFor(value));
      window.clearTimeout(echoTimer.current);
      echoTimer.current = window.setTimeout(() => setEnergyNote(null), 7000);
    }
  };

  const toggleTag = (tag: string) => {
    patchEntry(today, (e) => ({
      tags: e.tags.includes(tag) ? e.tags.filter((t) => t !== tag) : [...e.tags, tag]
    }));
  };

  const flushScratch = (text: string, at: number, date: string) => {
    patchEntry(date, (e) => ({ body: appendBody(e.body, text, at) }));
  };

  const analyze = async () => {
    if (remaining <= 0) {
      toast('今天已经看够 10 次了，明天再来');
      return;
    }
    if (!entry || !hasContent(entry)) {
      toast('先记一点什么，哪怕一个数字');
      return;
    }
    if (!state.settings.apiKey.trim()) {
      toast('先到「我」里填一下 API Key');
      window.location.hash = '/me';
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await runDailyAnalysis(state, entry, controller.signal);
      const a: Analysis = {
        id: `${today}-${Date.now().toString(36)}`,
        date: today,
        entryId: entry.id,
        at: Date.now(),
        ...res
      };
      addAnalysis(a);
      toast('看完了');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '出了点问题';
      toast(msg.includes('abort') ? '取消了' : msg);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const goWrite = () => {
    window.location.hash = '/write';
    window.scrollTo({ top: 0 });
  };

  const startFromAnalysis = () => {
    if (!analysis) return;
    const short = analysis.experiment.replace(/[。；;，,].*$/, '').slice(0, 18) || '来自 change 的尝试';
    addExperiment({
      id: `x-${Date.now().toString(36)}`,
      title: short,
      hypothesis: analysis.experiment,
      action: analysis.experiment,
      metric: 'energy',
      startDate: today,
      days: 7,
      status: 'running',
      createdAt: Date.now(),
      logs: {},
      origin: 'ai'
    });
    toast('已经放进实验，做一天点一下');
  };

  const subline = deepNight
    ? phaseLine()
    : streakDays > 1
      ? `已经连续记录 ${streakDays} 天。`
      : phaseLine();

  return (
    <div className="px-5">
      <header className="pt-safe px-1 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10.5px] tracking-[0.16em] text-faint">
            <span>{fmtDate(today)}</span>
            <span className="h-2.5 w-px bg-line" />
            <span>{weekday(today)}</span>
            {deepNight ? <span className="text-clay/70">还没换天</span> : null}
          </div>
          <WeekDots entries={state.entries} />
        </div>
        <h1 className="mt-3 font-serif text-[29px] leading-[1.3] tracking-[0.02em] text-ink">
          {greeting()}
          {state.settings.name ? `，${state.settings.name}` : ''}
        </h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-soft">{subline}</p>
      </header>

      {!state.settings.onboarded && !hasContent(entry) ? (
        <Card className="anim-in-2 mb-3.5 overflow-hidden p-5">
          <Eyebrow>开始之前</Eyebrow>
          <p className="mt-2 font-serif text-[16px] leading-relaxed text-ink/90">
            这里不是打卡表。你会记下身体的数据和当时的想法，然后隔一段时间回头看——看看什么东西真的让你有劲，什么只是你以为有用。
          </p>
          <ul className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-soft">
            <li>· 一天记 10 秒也算数，空格比填满更常见</li>
            <li>· 分析不是必须的，想让它看的时候再点</li>
            <li>· 数据只存在这台手机里</li>
          </ul>
          <button
            type="button"
            onClick={() => setSettings({ onboarded: true })}
            className="mt-4 text-[12.5px] text-moss"
          >
            知道了，开始 →
          </button>
        </Card>
      ) : null}

      <Card className="anim-in-2 mb-3.5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>现在的电量</Eyebrow>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              {avg != null ? (
                <>
                  <span className="num font-serif text-[42px] leading-none text-ink">{avg.toFixed(1)}</span>
                  <span className="pb-1 text-[11px] text-faint">/ 5</span>
                </>
              ) : (
                <span className="font-serif text-[24px] leading-none text-faint/80">未记</span>
              )}
            </div>
            <div className="mt-2 max-w-[150px] text-[11.5px] leading-snug text-soft">{deltaLabel}</div>
          </div>
          <div className="pt-1 text-right text-[10.5px] leading-relaxed text-faint">
            轻点格子
            <br />
            记下这一刻
          </div>
        </div>
        <div className="mt-6">
          <EnergyMeter entry={entry} onSet={setEnergy} />
        </div>
        <Echo text={energyNote} />
      </Card>

      <Card className="anim-in-3 mb-3.5 overflow-hidden">
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <Eyebrow>此刻</Eyebrow>
          <span className="text-[10.5px] text-faint">
            {draftLen ? `${draftLen} 字 · 会带时间收进手记` : '写一句就行'}
          </span>
        </div>
        <ScratchBox date={today} onFlush={flushScratch} onTextChange={(t) => setDraftLen(t.trim().length)} />
        <div className="flex items-center justify-between gap-2 border-t border-line/50 px-3.5 py-2.5">
          <div className="flex gap-1.5 overflow-x-auto">
            {COMMON_TAGS.slice(0, 4).map((t) => (
              <Chip key={t} on={entry?.tags.includes(t)} onClick={() => toggleTag(t)}>
                {t}
              </Chip>
            ))}
          </div>
          <button type="button" onClick={goWrite} className="shrink-0 px-2 text-[11.5px] text-moss">
            展开手记
          </button>
        </div>
      </Card>

      <div className="mb-3.5 grid grid-cols-3 gap-2.5">
        <MetricCard
          icon="moon"
          label="睡眠"
          value={hours != null ? `${hours}` : '—'}
          sub={hours != null ? '小时' : '点这里记'}
          onClick={goWrite}
        />
        <MetricCard
          icon="walk"
          label="外出"
          value={outdoorTotal != null ? fmtDuration(outdoorTotal) : '—'}
          sub={outdoorTotal != null ? '今天' : '点这里记'}
          onClick={goWrite}
        />
        <MetricCard
          icon="book"
          label="阅读"
          value={entry?.reading?.pages ? `${entry.reading.pages}` : '—'}
          sub={entry?.reading?.pages ? '页' : '两页也算'}
          onClick={goWrite}
        />
      </div>

      {running.length ? (
        <div className="mb-3.5">
          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => (window.location.hash = '/lab')}
                className="text-[11px] text-faint"
              >
                全部实验 →
              </button>
            }
          >
            正在做
          </SectionTitle>
          <div className="space-y-2">
            {running.slice(0, 2).map((x) => {
              const log = x.logs[today];
              const doneToday = Boolean(log?.done);
              const skippedToday = Boolean(log?.skipped);
              const doneCount = Object.values(x.logs).filter((l) => l.done).length;
              return (
                <div key={x.id} className="card flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-[14.5px] text-ink/90">{x.title}</div>
                    <div className="mt-1 text-[10.5px] text-faint">
                      第 {Math.min(doneCount + (doneToday ? 0 : 1), x.days)}/{x.days} 天 · 做了点勾，没做点叉
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="今天做到了"
                      onClick={() => markExperiment(x.id, today, doneToday ? null : 'done')}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 active:scale-90 ${
                        doneToday ? 'border-moss bg-moss text-paper' : 'border-line text-faint'
                      }`}
                    >
                      <Icon name="check" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="今天没做到"
                      onClick={() => markExperiment(x.id, today, skippedToday ? null : 'skip')}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 active:scale-90 ${
                        skippedToday ? 'border-clay bg-clay/15 text-clay' : 'border-line text-faint'
                      }`}
                    >
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mb-3.5">
        <SectionTitle>今天的分析</SectionTitle>
        {analysis ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-[10.5px] tracking-[0.14em] text-faint">
              <Icon name="spark" className="h-3.5 w-3.5 text-clay" />
              <span>CHANGE 看了一眼</span>
            </div>
            <p className="mt-3 font-serif text-[16px] leading-[1.85] text-ink/90">{analysis.seen}</p>
            <p className="mt-3 border-l-2 border-clay/50 pl-3 text-[13px] leading-relaxed text-soft">
              {analysis.cheer}
            </p>
            <div className="mt-4 rounded-2xl bg-moss/[0.08] p-3.5">
              <div className="text-[10.5px] tracking-[0.14em] text-moss">明天可以试</div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/85">{analysis.experiment}</p>
              <button type="button" onClick={startFromAnalysis} className="mt-2.5 text-[11px] text-moss/90">
                → 放进实验室，盯 7 天
              </button>
            </div>
            {analysis.question ? (
              <p className="mt-3.5 font-serif text-[13.5px] italic leading-relaxed text-soft">
                「{analysis.question}」
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-faint">只是观察，不是结论</span>
              <button
                type="button"
                onClick={analyze}
                disabled={busy || remaining <= 0}
                className="text-[11.5px] text-moss disabled:opacity-40"
              >
                {busy ? '正在看…' : remaining > 0 ? `再看一次（今天还剩 ${remaining} 次）` : '今天看够了'}
              </button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
                <Icon name="spark" className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] leading-relaxed text-ink/85">
                  要不要让 change 看一眼今天？它会读今天和最近一周的记录，说一句它看见的、一句给你的话，和一个很小的尝试。
                </p>
                <p className="mt-1.5 text-[10.5px] text-faint">
                  你不点，它就不会读。今天还能看 {remaining} 次。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={analyze}
              disabled={busy || remaining <= 0}
              className="btn-soft mt-4 w-full py-2.5 text-[13.5px]"
            >
              {busy ? '正在看…' : remaining > 0 ? '看一眼今天' : '今天已经看够了'}
            </button>
          </Card>
        )}
      </div>

      <Card className="mb-4 flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sun/10 text-sun">
          <Icon name="book" className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] tracking-[0.14em] text-faint">今晚的书</div>
          <div className="mt-0.5 truncate font-serif text-[14px] text-ink/90">
            {state.settings.book || '还没选书'}
          </div>
          <div className="mt-1 text-[10px] text-faint">读两页，再决定要不要刷。</div>
        </div>
        <div className="text-right">
          <div className="num text-[13px] text-ink/80">
            {entry?.reading?.pages ? `${entry.reading.pages} 页` : '—'}
          </div>
          <div className="text-[10px] text-faint">今天</div>
        </div>
      </Card>

      <Marginalia book={state.settings.book} salt={1} className="mb-4 mt-2 px-1.5" />

      <div className="h-2" />
    </div>
  );
}
