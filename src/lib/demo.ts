import type { AppState, Energy, Entry, Experiment } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { activeDate, addDays } from './date';

interface Spec {
  off: number;
  body: string;
  e?: [number, number, number, number];
  bed?: string;
  wake?: string;
  quality?: number;
  nap?: number;
  outdoor?: number;
  work?: number;
  screen?: number;
  ex?: number;
  mood?: string[];
  score?: number;
  tags?: string[];
  pages?: number;
}

const SPECS: Spec[] = [
  {
    off: 0,
    body: '〔12:10〕\n今天又是那种说不清的状态。闹钟响了三遍才起来，上午勉强把邮件回了。中午睡了四十分钟，起来头是沉的，下午坐在桌前两个小时，什么都没推进。\n\n〔23:05〕\n到了晚上反而清醒了一点，开始想「是不是我根本不适合做这个」。我知道这么想没有用，但当时就是那么想的。',
    e: [3, 2, 2, 3],
    bed: '01:20',
    wake: '08:40',
    quality: 2,
    nap: 40,
    outdoor: 0,
    work: 150,
    screen: 260,
    mood: ['疲惫', '焦虑'],
    score: 2,
    tags: ['睡眠', '午睡', '工作'],
  },
  {
    off: 1,
    body: '〔15:20〕\n中午没睡，吃完饭直接出门走了快两个小时。走到河边的时候风很大，脑子里那些绕来绕去的东西忽然安静了。\n\n〔21:40〕\n回来以后居然还有力气把房间收拾了一遍。晚上十点多就困了，没刷手机。',
    e: [4, 3, 4, 4],
    bed: '23:10',
    wake: '07:30',
    quality: 4,
    nap: 0,
    outdoor: 95,
    work: 60,
    screen: 120,
    mood: ['平静', '轻快'],
    score: 4,
    tags: ['外出', '运动'],
    pages: 6,
  },
  {
    off: 2,
    body: '硬撑着学了五个多小时，中间起来倒水三次。到下午四点的时候眼睛还在看，但已经进不去了。\n\n晚上什么都不想做，躺着刷了两个小时视频，越刷越空。',
    e: [3, 3, 3, 2],
    bed: '00:40',
    wake: '07:10',
    quality: 3,
    nap: 0,
    outdoor: 5,
    work: 320,
    screen: 300,
    mood: ['疲惫'],
    score: 2,
    tags: ['学习', '刷视频'],
  },
  {
    off: 4,
    body: '把手机放到客厅，只带书进卧室。读了两页，眼睛就睁不开了，十一点不到睡着。\n\n第二天醒来的时候第一次没有那种被闹钟打断的烦躁感。可能只是巧合，但先记下来。',
    e: [4, 4, 3, 4],
    bed: '22:50',
    wake: '07:20',
    quality: 5,
    nap: 20,
    outdoor: 30,
    work: 180,
    screen: 90,
    mood: ['平静', '满足'],
    score: 5,
    tags: ['阅读', '睡眠'],
    pages: 9,
  },
  {
    off: 5,
    body: '试着把午睡定在 20 分钟。闹钟响的时候很想继续睡，但起来了。下午三点居然没有那种塌下去的感觉。\n\n不知道能维持几天。',
    e: [3, 3, 4, 3],
    bed: '23:40',
    wake: '07:40',
    quality: 3,
    nap: 20,
    outdoor: 45,
    work: 210,
    screen: 150,
    mood: ['平静'],
    score: 3,
    tags: ['午睡', '实验'],
    pages: 4,
  },
  {
    off: 6,
    body: '睡了快一个小时，起来整个人是木的。下午坐在电脑前发呆，想不起自己要干什么。\n\n晚上开始翻以前的东西，越翻越觉得自己这几年白过了。',
    e: [3, 2, 2, 2],
    bed: '01:00',
    wake: '08:30',
    quality: 2,
    nap: 45,
    outdoor: 0,
    work: 90,
    screen: 320,
    mood: ['低落', '想逃避'],
    score: 1,
    tags: ['午睡', '家庭'],
  },
  {
    off: 7,
    body: '下午出门办了点事，顺便走了很远。回来的时候路过一家旧书店，站着看了二十分钟。\n\n今天没有那种「必须做点什么」的紧迫感，反而做成了一些事。',
    e: [4, 4, 4, 4],
    bed: '23:20',
    wake: '07:50',
    quality: 4,
    nap: 0,
    outdoor: 70,
    work: 90,
    screen: 130,
    mood: ['平静', '有希望'],
    score: 4,
    tags: ['外出', '阅读'],
    pages: 12,
  },
  {
    off: 8,
    body: '从上午十点坐到晚上七点，除了吃饭没动过。写完了该写的东西，但代价是晚上整个人是空的。\n\n我发现「有效率的长时间工作」和「晚上还有力气」这两件事，好像不能同时要。',
    e: [4, 3, 3, 1],
    bed: '01:30',
    wake: '08:50',
    quality: 3,
    nap: 0,
    outdoor: 0,
    work: 380,
    screen: 280,
    mood: ['疲惫', '麻木'],
    score: 2,
    tags: ['工作', '学习'],
  },
  {
    off: 10,
    body: '晚上读《我们为什么要睡觉》，看到讲光照的那一章，才知道早上那点太阳比咖啡有用。\n\n决定明天起来先下楼站十分钟。',
    e: [3, 3, 3, 4],
    bed: '23:00',
    wake: '07:15',
    quality: 4,
    nap: 15,
    outdoor: 20,
    work: 200,
    screen: 140,
    mood: ['平静', '有希望'],
    score: 4,
    tags: ['阅读', '睡眠'],
    pages: 18,
  },
  {
    off: 11,
    body: '一整天都在想下个月的事。越想越具体，具体到开始算钱、算时间、算别人会怎么看我。\n\n晚上跟朋友打了个电话，说出来以后好像没那么可怕了。挂了电话才发现，我怕的其实是「一直这样下去」。',
    e: [2, 2, 3, 3],
    bed: '01:40',
    wake: '08:20',
    quality: 2,
    nap: 30,
    outdoor: 15,
    work: 300,
    screen: 260,
    mood: ['焦虑'],
    score: 2,
    tags: ['家庭', '未来', '社交'],
  },
  {
    off: 12,
    body: '中午没睡，骑车去了一个没去过的公园。坐在长椅上看了很久的水。\n\n回来以后思路反而清楚了，把拖了一周的那件事做完了。',
    e: [3, 4, 4, 4],
    bed: '23:30',
    wake: '07:45',
    quality: 4,
    nap: 0,
    outdoor: 130,
    work: 100,
    screen: 100,
    mood: ['轻快', '平静'],
    score: 5,
    tags: ['外出', '运动'],
    pages: 5,
  },
  {
    off: 13,
    body: '中午一睡就睡了一个半小时，闹钟没听见。醒来已经四点，一天像被削掉了一半。\n\n晚上睡不着，又开始刷视频。',
    e: [3, 2, 2, 2],
    bed: '02:00',
    wake: '09:10',
    quality: 2,
    nap: 90,
    outdoor: 0,
    work: 60,
    screen: 360,
    mood: ['疲惫', '烦躁'],
    score: 2,
    tags: ['午睡', '刷视频'],
  },
  {
    off: 14,
    body: '午饭后出门快走了十二分钟，回来没有马上坐下，站着把上午的东西收了个尾。\n\n下午状态一般，但至少没有崩。',
    e: [3, 3, 4, 3],
    bed: '23:50',
    wake: '07:35',
    quality: 3,
    nap: 0,
    outdoor: 35,
    work: 240,
    screen: 180,
    mood: ['平静'],
    score: 3,
    tags: ['运动', '实验'],
  },
  {
    off: 15,
    body: '午睡睡过头，起来之后一直很钝。下午开了个会，全程在硬撑。\n\n今天没做什么，也不想逼自己做什么。',
    e: [2, 2, 2, 2],
    bed: '00:50',
    wake: '08:40',
    quality: 2,
    nap: 80,
    outdoor: 0,
    work: 120,
    screen: 300,
    mood: ['麻木', '疲惫'],
    score: 2,
    tags: ['午睡'],
  },
  {
    off: 16,
    body: '见了一个很久没见的朋友，聊了四个小时。回家路上天已经黑了，走路的时候感觉身体是轻的。\n\n原来我不是不想说话，是一直没找到想说话的人。',
    e: [4, 3, 4, 4],
    bed: '23:30',
    wake: '08:00',
    quality: 4,
    nap: 0,
    outdoor: 75,
    work: 0,
    screen: 90,
    mood: ['满足', '轻快'],
    score: 5,
    tags: ['社交', '外出'],
    pages: 3,
  },
  {
    off: 17,
    body: '夜里醒了三次，早上起不来。一整天都在低电量里，连吃饭都觉得费劲。\n\n只记了一笔，不想写。',
    e: [1, 2, 2, 2],
    bed: '02:20',
    wake: '07:50',
    quality: 1,
    nap: 30,
    outdoor: 0,
    work: 100,
    screen: 240,
    mood: ['疲惫', '低落'],
    score: 1,
    tags: ['睡眠'],
  },
  {
    off: 19,
    body: '阴天，一整天没出门。把桌子收拾了一遍，算是做了点事。',
    e: [2, 3, 3, 3],
    bed: '00:20',
    wake: '08:10',
    quality: 3,
    nap: 0,
    outdoor: 0,
    work: 180,
    screen: 220,
    mood: ['平静'],
    score: 3,
    tags: ['工作'],
  },
  {
    off: 20,
    body: '早上出门走了一圈，回来以后把拖了很久的一件事开了个头。\n\n发现「开始」比「做完」难得多。',
    e: [3, 3, 4, 3],
    bed: '23:10',
    wake: '07:20',
    quality: 4,
    nap: 0,
    outdoor: 40,
    work: 150,
    screen: 140,
    mood: ['有希望'],
    score: 4,
    tags: ['外出', '工作'],
    pages: 8,
  },
  {
    off: 21,
    body: '午睡睡了一个小时，醒来四点半。晚上又熬到一点。',
    e: [2, 2, 2, 2],
    bed: '01:10',
    wake: '08:30',
    quality: 2,
    nap: 60,
    outdoor: 10,
    work: 90,
    screen: 300,
    mood: ['烦躁'],
    score: 2,
    tags: ['午睡', '刷视频'],
  },
  {
    off: 23,
    body: '十点半就上床了，读了二十页。很久没有这种「想继续读但明天要早起」的感觉。',
    e: [4, 4, 4, 4],
    bed: '22:40',
    wake: '07:00',
    quality: 5,
    nap: 20,
    outdoor: 25,
    work: 200,
    screen: 120,
    mood: ['满足', '平静'],
    score: 5,
    tags: ['阅读', '睡眠'],
    pages: 20,
  },
  {
    off: 24,
    body: '和两个朋友吃了顿饭，聊到很晚。回家的时候有点累，但不是那种被掏空的累。',
    e: [4, 3, 3, 4],
    bed: '00:30',
    wake: '08:20',
    quality: 3,
    nap: 0,
    outdoor: 60,
    work: 0,
    screen: 160,
    mood: ['满足'],
    score: 4,
    tags: ['社交', '外出'],
  },
  {
    off: 25,
    body: '连着做了六个小时，中间只起来过一次。做完的时候手是抖的。\n\n晚上什么都吃不下，也睡不着。',
    e: [3, 3, 2, 1],
    bed: '02:10',
    wake: '08:40',
    quality: 2,
    nap: 0,
    outdoor: 0,
    work: 360,
    screen: 200,
    mood: ['焦虑', '疲惫'],
    score: 1,
    tags: ['工作'],
  },
  {
    off: 27,
    body: '下雨，一天没出门。下午开始刷视频，一抬头天黑了。\n\n没有特别难过，就是空。',
    e: [2, 2, 2, 2],
    bed: '01:30',
    wake: '09:20',
    quality: 2,
    nap: 45,
    outdoor: 0,
    work: 60,
    screen: 380,
    mood: ['麻木'],
    score: 2,
    tags: ['刷视频', '午睡'],
  },
  {
    off: 28,
    body: '下午出去走了半小时，买了个面包。回来状态好了一点，把该回的消息回了。',
    e: [3, 3, 3, 3],
    bed: '23:40',
    wake: '08:00',
    quality: 3,
    nap: 0,
    outdoor: 35,
    work: 120,
    screen: 180,
    mood: ['平静'],
    score: 3,
    tags: ['外出'],
    pages: 4,
  }
];

function demoMeals(off: number) {
  const variants = [
    { b: ['粥', '蛋'], l: ['米饭', '鸡'], d: ['面', '蛋'] },
    { b: ['面包', '蛋'], l: ['面', '牛'], d: ['米饭', '鱼'] },
    { b: ['馒头', '豆制品'], l: ['米饭', '猪'], d: ['粥', '没有'] }
  ];
  const v = variants[off % variants.length];
  return {
    breakfast: { time: '08:10', staple: v.b[0], protein: v.b[1] },
    lunch: { time: '12:20', staple: v.l[0], protein: v.l[1] },
    dinner: { time: '18:30', staple: v.d[0], protein: v.d[1] }
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toClock = (mins: number) => `${pad2(Math.floor((mins % 1440) / 60))}:${pad2(mins % 60)}`;

function segsFrom(off: number, key: string, total: number, startMin: number) {
  if (!total) return [];
  const list: { id: string; start: string; end: string }[] = [];
  let left = total;
  let at = startMin;
  let i = 0;
  while (left > 0) {
    const take = Math.min(left, 120);
    list.push({ id: `seg-${off}-${key}-${i++}`, start: toClock(at), end: toClock(at + take) });
    at += take;
    left -= take;
  }
  return list;
}

function toEntry(s: Spec, today: string): Entry {
  const date = addDays(today, -s.off);
  const e = s.e ?? [3, 3, 3, 3];
  const energy: Partial<Record<'morning' | 'noon' | 'afternoon' | 'evening', Energy>> = {
    morning: e[0] as Energy,
    noon: e[1] as Energy,
    afternoon: e[2] as Energy,
    evening: e[3] as Energy
  };
  const created = Date.parse(`${date}T21:10:00`);
  return {
    id: `demo-${date}`,
    date,
    createdAt: created,
    updatedAt: created + 40 * 60000,
    body: s.body,
    energy,
    mood: s.mood ?? [],
    moodScore: s.score,
    sleep: {
      bed: s.bed,
      wake: s.wake,
      quality: s.quality,
      napMin: s.nap
    },
    food: { meals: demoMeals(s.off) },
    segments: {
      outdoor: segsFrom(s.off, 'outdoor', s.outdoor ?? 0, 900),
      work: segsFrom(s.off, 'work', s.work ?? 0, 540),
      screen: segsFrom(s.off, 'screen', s.screen ?? 0, 1140),
      exercise: segsFrom(s.off, 'exercise', s.ex ?? 0, 1050)
    },
    outdoorMin: s.outdoor,
    workMin: s.work,
    screenMin: s.screen,
    exerciseMin: s.ex,
    reading: s.pages ? { book: '我们为什么要睡觉', pages: s.pages } : undefined,
    tags: s.tags ?? [],
    notes:
      s.off === 7
        ? [
            {
              id: 'n-1',
              at: Date.parse(`${addDays(today, -5)}T22:00:00`),
              text: '那天你在旧书店站了二十分钟，却没说一句「浪费」。这好像是你少有的、不计算产出的一天。',
              kind: 'ai' as const
            }
          ]
        : s.off === 4
          ? [
              {
                id: 'n-2',
                at: Date.parse(`${addDays(today, -2)}T23:20:00`),
                text: '现在回头看，那晚把手机放客厅，是你这两周做得最有效的一件事。',
                kind: 'self' as const
              }
            ]
          : []
  };
}

export function demoState(): AppState {
  const today = activeDate();
  const entries = SPECS.map((s) => toEntry(s, today)).sort((a, b) => (a.date < b.date ? 1 : -1));

  const experiments: Experiment[] = [
    {
      id: 'demo-x1',
      title: '午睡只睡 20 分钟',
      hypothesis: '20 分钟的功率小睡，比睡到自然醒更能保住下午的精力。',
      action: '午饭后定 25 分钟闹钟，响了起来，不赖床。',
      metric: 'energy',
      startDate: addDays(today, -6),
      days: 10,
      status: 'running',
      createdAt: Date.parse(`${addDays(today, -6)}T12:00:00`),
      logs: {
        [addDays(today, -6)]: { done: true },
        [addDays(today, -5)]: { done: true },
        [addDays(today, -4)]: { done: false, skipped: true },
        [addDays(today, -3)]: { done: true },
        [addDays(today, -2)]: { done: true },
        [addDays(today, -1)]: { done: false, skipped: true }
      }
    },
    {
      id: 'demo-x2',
      title: '午饭后走 10 分钟',
      hypothesis: '午饭后出门走一小段，下午的精力比直接坐下更高。',
      action: '吃完午饭不坐下，出门走 10 分钟再回来。',
      metric: 'energy',
      startDate: addDays(today, -2),
      days: 10,
      status: 'running',
      createdAt: Date.parse(`${addDays(today, -2)}T12:00:00`),
      logs: {
        [addDays(today, -2)]: { done: true },
        [addDays(today, -1)]: { done: true }
      }
    },
    {
      id: 'demo-x3',
      title: '睡前只读两页书',
      hypothesis: '用两页书替代睡前刷视频，入睡更顺。',
      action: '手机放到客厅，只带书上床，读两页就关灯。',
      metric: 'sleep',
      startDate: addDays(today, -22),
      days: 10,
      status: 'done',
      createdAt: Date.parse(`${addDays(today, -22)}T12:00:00`),
      finishedAt: Date.parse(`${addDays(today, -12)}T22:00:00`),
      logs: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [addDays(today, -22 + i), { done: i % 4 !== 3 }])
      ),
      result:
        '有读的那几天，入睡时间大概早了半小时，夜里醒的次数也少。但对第二天上午的精力影响不明显。可能是「不看屏幕」起了作用，而不是「读书」本身。'
    },
    {
      id: 'demo-x4',
      title: '咖啡在 14 点前喝完',
      hypothesis: '14 点后不碰咖啡因，入睡更快，夜里醒得少。',
      action: '14:00 之后只喝水。',
      metric: 'sleep',
      startDate: addDays(today, -1),
      days: 12,
      status: 'idea',
      createdAt: Date.parse(`${today}T09:00:00`),
      logs: {}
    }
  ];

  return {
    v: 1,
    settings: { ...DEFAULT_SETTINGS, book: '我们为什么要睡觉', onboarded: true },
    entries,
    experiments,
    analyses: [
      {
        id: 'demo-a1',
        date: today,
        entryId: `demo-${today}`,
        at: Date.parse(`${today}T21:20:00`),
        seen: '你写「到了晚上反而清醒了一点」。这句话出现过好几次了——白天在桌前是钝的，天一黑脑子才回来。',
        cheer: '今天你还是回了邮件、记了数据，在只有 2 分的状态下做完了这些，不算什么都没做。',
        experiment: '明天中午把午睡闹钟定在 20 分钟，响了就起来，哪怕只坐着。只改这一件事。',
        question: '晚上清醒的时候，你通常在做什么？是那件事让你清醒，还是那时候终于没人找你了？',
        model: 'deepseek-chat'
      },
      {
        id: 'demo-a2',
        date: addDays(today, -1),
        entryId: `demo-${addDays(today, -1)}`,
        at: Date.parse(`${addDays(today, -1)}T22:00:00`),
        seen: '走了快两个小时，回来还把房间收拾了。你说「脑子忽然安静了」——不是想通了，是走空了。',
        cheer: '你没睡午觉，也没崩。这件事以前你自己都不信。',
        experiment: '把这个发现记成一条待验证的假设：不睡午觉 + 白天出门 ≥ 1 小时，晚上精力不降。再做三天看看。',
        question: '如果明天不能出门，有什么在家里也能让脑子安静下来的十五分钟？',
        model: 'deepseek-chat'
      }
    ]
  };
}
