export type ID = string;
export type ISODate = string;

export type Slot = 'morning' | 'noon' | 'afternoon' | 'evening';
export type Energy = 1 | 2 | 3 | 4 | 5;

export interface SlotMeta {
  key: Slot;
  label: string;
  hint: string;
  clock: string;
}

export const SLOTS: SlotMeta[] = [
  { key: 'morning', label: '早', hint: '起床后', clock: '08:00' },
  { key: 'noon', label: '午', hint: '午饭后', clock: '13:00' },
  { key: 'afternoon', label: '午后', hint: '三四点', clock: '16:00' },
  { key: 'evening', label: '夜', hint: '睡前', clock: '21:00' }
];

export interface SleepLog {
  bed?: string;
  wake?: string;
  quality?: number;
  napMin?: number;
}

export type MealKey = 'breakfast' | 'lunch' | 'dinner';

export interface Meal {
  time?: string;
  staple?: string;
  protein?: string;
}

export interface FoodLog {
  meals?: Partial<Record<MealKey, Meal>>;
  note?: string;
}

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' }
];

export const STAPLES_BY_MEAL: Record<MealKey, string[]> = {
  breakfast: ['面包', '粥', '馒头', '面', '粉', '没吃'],
  lunch: ['米饭', '杂粮', '面', '粥', '粉', '馒头', '面包', '没吃'],
  dinner: ['米饭', '杂粮', '面', '粥', '粉', '馒头', '面包', '没吃']
};

export const PROTEINS = ['猪', '鸡', '牛', '鱼', '蛋', '豆制品', '没有'];

export type ActivityKey = 'outdoor' | 'exercise' | 'work' | 'screen';

export interface Segment {
  id: string;
  start?: string;
  end?: string;
  minutes?: number;
}

export const ACTIVITIES: { key: ActivityKey; label: string; short: string }[] = [
  { key: 'outdoor', label: '外出', short: '外出' },
  { key: 'exercise', label: '运动', short: '运动' },
  { key: 'work', label: '学习 / 工作', short: '工作' },
  { key: 'screen', label: '屏幕', short: '屏幕' }
];

export interface ReadingLog {
  book?: string;
  pages?: number;
}

export interface RetroNote {
  id: ID;
  at: number;
  text: string;
  kind?: 'self' | 'ai';
}

export interface Entry {
  id: ID;
  date: ISODate;
  createdAt: number;
  updatedAt: number;
  body: string;
  energy: Partial<Record<Slot, Energy>>;
  mood: string[];
  moodScore?: number;
  sleep?: SleepLog;
  food?: FoodLog;
  outdoorMin?: number;
  exerciseMin?: number;
  workMin?: number;
  screenMin?: number;
  segments?: Partial<Record<ActivityKey, Segment[]>>;
  reading?: ReadingLog;
  tags: string[];
  notes: RetroNote[];
}

export interface Analysis {
  id: ID;
  date: ISODate;
  entryId: string;
  at: number;
  seen: string;
  cheer: string;
  experiment: string;
  question?: string;
  model?: string;
}

export type MetricKey = 'energy' | 'mood' | 'sleep' | 'focus' | 'anxiety';

export const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'energy', label: '精力' },
  { key: 'mood', label: '心情' },
  { key: 'sleep', label: '睡眠' },
  { key: 'focus', label: '专注' },
  { key: 'anxiety', label: '焦虑' }
];

export interface ExperimentLog {
  done: boolean;
  skipped?: boolean;
  value?: number;
  note?: string;
}

export type ExperimentStatus = 'idea' | 'running' | 'done';

export interface Experiment {
  id: ID;
  title: string;
  hypothesis: string;
  action: string;
  metric: MetricKey;
  startDate: ISODate;
  days: number;
  status: ExperimentStatus;
  createdAt: number;
  finishedAt?: number;
  logs: Record<ISODate, ExperimentLog>;
  result?: string;
  origin?: 'self' | 'ai';
}

export interface Settings {
  name: string;
  theme: 'auto' | 'light' | 'dark';
  apiKey: string;
  baseUrl: string;
  model: string;
  book: string;
  onboarded: boolean;
}

export interface AppState {
  v: number;
  settings: Settings;
  entries: Entry[];
  experiments: Experiment[];
  analyses: Analysis[];
}

export const MOOD_TAGS = [
  '平静',
  '轻快',
  '兴奋',
  '满足',
  '有希望',
  '焦虑',
  '烦躁',
  '低落',
  '疲惫',
  '麻木',
  '想逃避'
];

export const COMMON_TAGS = [
  '睡眠',
  '午睡',
  '饮食',
  '运动',
  '外出',
  '学习',
  '工作',
  '阅读',
  '社交',
  '刷视频',
  '家庭',
  '未来'
];

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  theme: 'auto',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  book: '',
  onboarded: false
};

export function emptyEntry(date: ISODate): Entry {
  const now = Date.now();
  return {
    id: `${date}-${now.toString(36)}`,
    date,
    createdAt: now,
    updatedAt: now,
    body: '',
    energy: {},
    mood: [],
    tags: [],
    notes: []
  };
}
