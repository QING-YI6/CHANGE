import type { Entry } from '../types';
import { activeDate, addDays, fmtDate, lastNDates, weekday } from './date';
import { afternoonEnergy, avgEnergyOf, entryEnergy, hasContent } from './stats';
import { activityTotal } from './segments';

export interface WeeklyReport {
  start: string;
  end: string;
  dates: string[];
  recorded: number;
  avg: number | null;
  prevAvg: number | null;
  best: { date: string; avg: number } | null;
  lowest: { date: string; avg: number } | null;
  napLongDays: number;
  outdoorDays: number;
  pages: number;
  workMin: number;
  moods: { tag: string; n: number }[];
  lines: string[];
}

function sum(nums: (number | undefined)[]): number {
  return nums.reduce<number>((a, b) => a + (b ?? 0), 0);
}

export function weeklyReport(entries: Entry[]): WeeklyReport {
  const end = activeDate();
  const dates = lastNDates(7, end);
  const week = entries.filter((e) => dates.includes(e.date));
  const recorded = week.filter(hasContent).length;
  const avg = avgEnergyOf(week);

  const prevDates = lastNDates(7, addDays(end, -7));
  const prevAvg = avgEnergyOf(entries.filter((e) => prevDates.includes(e.date)));

  let best: WeeklyReport['best'] = null;
  let lowest: WeeklyReport['lowest'] = null;
  for (const e of week) {
    const v = entryEnergy(e);
    if (v == null) continue;
    if (!best || v > best.avg) best = { date: e.date, avg: v };
    if (!lowest || v < lowest.avg) lowest = { date: e.date, avg: v };
  }

  const napLong = week.filter((e) => (e.sleep?.napMin ?? 0) >= 30);
  const outdoor = week.filter((e) => (activityTotal(e, 'outdoor') ?? 0) >= 30);
  const pages = sum(week.map((e) => e.reading?.pages));
  const workMin = sum(week.map((e) => activityTotal(e, 'work')));

  const moodCount = new Map<string, number>();
  for (const e of week) for (const m of e.mood) moodCount.set(m, (moodCount.get(m) ?? 0) + 1);
  const moods = Array.from(moodCount.entries())
    .map(([tag, n]) => ({ tag, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  const lines: string[] = [];

  if (recorded <= 2) {
    lines.push('这周记得还不多，先不用总结。');
    if (avg != null) lines.push(`已经记的几天里，平均电量 ${avg.toFixed(1)}。`);
  } else {
    if (avg != null) {
      if (prevAvg != null && Math.abs(avg - prevAvg) >= 0.2) {
        lines.push(`平均电量 ${avg.toFixed(1)}，比上一周${avg > prevAvg ? '高' : '低'}了 ${Math.abs(avg - prevAvg).toFixed(1)}。`);
      } else if (prevAvg != null) {
        lines.push(`平均电量 ${avg.toFixed(1)}，和上一周几乎一样。`);
      } else {
        lines.push(`平均电量 ${avg.toFixed(1)}，这是你的第一条基线。`);
      }
    }

    if (best && best.avg >= 3.4) {
      const d = week.find((e) => e.date === best!.date);
      const detail = d?.outdoorMin && d.outdoorMin >= 30 ? `那天你出了门 ${d.outdoorMin} 分钟。` : d?.reading?.pages ? `那天你读了 ${d.reading.pages} 页书。` : '';
      lines.push(`电量最高的一天是 ${fmtDate(best.date)}（${best.avg.toFixed(1)}）。${detail}`);
    }

    if (napLong.length >= 2) {
      const withNap = napLong.map((e) => afternoonEnergy(e)).filter((v): v is number => v != null);
      const without = week
        .filter((e) => (e.sleep?.napMin ?? -1) === 0)
        .map((e) => afternoonEnergy(e))
        .filter((v): v is number => v != null);
      const a = withNap.length ? withNap.reduce((x, y) => x + y, 0) / withNap.length : null;
      const b = without.length ? without.reduce((x, y) => x + y, 0) / without.length : null;
      if (a != null && b != null && b - a >= 0.3) {
        lines.push(`午睡超过半小时的那 ${napLong.length} 天，下午平均 ${a.toFixed(1)}；没午睡的 ${without.length} 天是 ${b.toFixed(1)}。`);
      } else {
        lines.push(`这周有 ${napLong.length} 天午睡超过半小时，先记着，样本还少。`);
      }
    }

    if (outdoor.length >= 3) lines.push(`有 ${outdoor.length} 天出了门，最近 30 天的规律也在往这边指。`);
    if (pages > 0) lines.push(`读了 ${pages} 页书${workMin >= 900 ? `，同时学习工作了 ${Math.round(workMin / 60)} 小时。` : '。'}`);

    lines.push(recorded >= 5 ? '记了这么多天，这件事本身就不容易。' : '下周不用改很多，挑一件小事继续。');
  }

  return {
    start: dates[0],
    end,
    dates,
    recorded,
    avg,
    prevAvg,
    best,
    lowest,
    napLongDays: napLong.length,
    outdoorDays: outdoor.length,
    pages,
    workMin,
    moods,
    lines: lines.slice(0, 4)
  };
}

export function weekRangeLabel(r: WeeklyReport): string {
  return `${fmtDate(r.start)} – ${fmtDate(r.end)} · ${weekday(r.end)}`;
}
