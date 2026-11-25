export type TabId = 'today' | 'health' | 'goals' | 'money' | 'people' | 'library' | 'remind';

export type SpiritualAnchorKey = 'dawn' | 'midday' | 'afternoon' | 'sunset' | 'night';

// Legacy keys retained for backwards-compatible reading of existing localStorage backups
export type LegacyPrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type TaskPriority = 'Top 3' | 'Normal' | 'Low';

export type LifeArea =
  | 'Spiritual'
  | 'Health'
  | 'Family'
  | 'Career'
  | 'Finance'
  | 'Learning'
  | 'Service'
  | 'Legacy';

export type GoalHorizon = 'Month' | 'Year' | '5 years';

export type MoneyKind = 'Earn' | 'Spend' | 'Save' | 'Share';

export type NoteKind =
  | 'Thought'
  | 'Journal'
  | 'Book idea'
  | 'Chapter'
  | 'Reading'
  | 'Reflection';

export type SleepQuality = 'Restful' | 'Fair' | 'Restless';

export type MindMood =
  | 'Peaceful'
  | 'Grateful'
  | 'Focused'
  | 'Neutral'
  | 'Tired'
  | 'Stressed'
  | 'Heavy';

export type BodyHabitKey = 'meals' | 'sunlight' | 'stretch' | 'screens';
export type MindPracticeKey = 'stillness' | 'breathing' | 'digitalQuiet' | 'nature' | 'reading';

export interface DailyHealthLog {
  // Body
  sleepHours?: number;
  sleepQuality?: SleepQuality;
  waterGlasses?: number;
  movementMins?: number;
  movementType?: string;
  weight?: string;
  bodyHabits?: Partial<Record<BodyHabitKey, boolean>>;
  // Mind
  mood?: MindMood;
  clarity?: number; // 1-5
  energy?: number; // 1-5
  stress?: number; // 1-5 (1 calm, 5 high)
  stillnessMins?: number;
  mindPractices?: Partial<Record<MindPracticeKey, boolean>>;
  mindNote?: string;
}

export interface Task {
  id: string;
  t: string;
  pr: TaskPriority;
  due?: string;
  done?: boolean;
}

export interface Goal {
  id: string;
  t: string;
  a: LifeArea;
  h: GoalHorizon;
  p: number;
}

export interface MoneyEntry {
  id: string;
  k: MoneyKind;
  v: number;
  n: string;
  d: string;
}

export interface Person {
  id: string;
  name: string;
  rel: string;
  every: number;
  last?: number;
  note?: string;
}

export interface Note {
  id: string;
  k: NoteKind;
  t: string;
  b: string;
  d: string;
}

export interface DayLog {
  prayers: Partial<Record<SpiritualAnchorKey | LegacyPrayerName, boolean>>;
  reflect: Record<string, string>;
  health?: DailyHealthLog;
}

export interface Reminder {
  id: string;
  t: string;
  h: string;
  paused?: boolean;
}

export interface HumanOSState {
  name?: string;
  age?: string;
  stage?: string;
  vals?: string;
  seeded?: number;
  seeded2?: number;
  tasks: Task[];
  goals: Goal[];
  money: MoneyEntry[];
  people: Person[];
  notes: Note[];
  days: Record<string, DayLog>;
  rem: Reminder[];
}

export interface SpiritualAnchor {
  key: SpiritualAnchorKey;
  legacyKey: LegacyPrayerName;
  label: string;
  hint: string;
}

export const SPIRITUAL_ANCHORS: SpiritualAnchor[] = [
  { key: 'dawn', legacyKey: 'Fajr', label: 'Dawn', hint: 'First remembrance' },
  { key: 'midday', legacyKey: 'Dhuhr', label: 'Midday', hint: 'Pause & align' },
  { key: 'afternoon', legacyKey: 'Asr', label: 'Afternoon', hint: 'Renew presence' },
  { key: 'sunset', legacyKey: 'Maghrib', label: 'Sunset', hint: 'Gratitude' },
  { key: 'night', legacyKey: 'Isha', label: 'Night', hint: 'Peace & surrender' },
];

export const BODY_HABITS: { key: BodyHabitKey; label: string; detail: string }[] = [
  { key: 'meals', label: 'Mindful meals', detail: 'Ate simply and with moderation' },
  { key: 'sunlight', label: 'Sunlight & fresh air', detail: 'Spent time outdoors in daylight' },
  { key: 'stretch', label: 'Mobility & posture', detail: 'Stretched or loosened tight joints' },
  { key: 'screens', label: 'Screen-free wind-down', detail: 'Stepped away from screens before bed' },
];

export const MIND_PRACTICES: { key: MindPracticeKey; label: string; detail: string }[] = [
  { key: 'stillness', label: 'Stillness / meditation', detail: 'Quiet sitting or contemplation' },
  { key: 'breathing', label: 'Conscious breathing', detail: 'Slow, intentional breath cycles' },
  { key: 'digitalQuiet', label: 'Digital quiet', detail: 'Uninterrupted focus without feeds' },
  { key: 'nature', label: 'Silence or nature', detail: 'Time away from noise and rush' },
  { key: 'reading', label: 'Nourishing reading', detail: 'Read something thoughtful or wise' },
];

export const MIND_MOODS: MindMood[] = [
  'Peaceful',
  'Grateful',
  'Focused',
  'Neutral',
  'Tired',
  'Stressed',
  'Heavy',
];

export const MOVEMENT_TYPES: string[] = [
  'Walk',
  'Strength',
  'Stretch / Yoga',
  'Run / Cardio',
  'Sport / Swim',
  'Rest day',
];

export const LIFE_AREAS: LifeArea[] = [
  'Spiritual',
  'Health',
  'Family',
  'Career',
  'Finance',
  'Learning',
  'Service',
  'Legacy',
];

export const GOAL_HORIZONS: GoalHorizon[] = ['Month', 'Year', '5 years'];

export const MONEY_KINDS: MoneyKind[] = ['Earn', 'Spend', 'Save', 'Share'];

export const RELATIONS: string[] = [
  'Mother',
  'Father',
  'Spouse',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandparent',
  'Relative',
  'Friend',
  'Neighbour',
  'Teacher / Mentor',
  'Colleague',
  'Other',
];

export const NOTE_KINDS: NoteKind[] = [
  'Thought',
  'Journal',
  'Book idea',
  'Chapter',
  'Reading',
  'Reflection',
];

export const LIFE_STAGES: string[] = [
  'Student',
  'Early career',
  'Building a family',
  'Raising children',
  'Established',
  'Elder / mentor',
];

export const REFLECTION_PROMPTS: string[] = [
  'What did I accomplish?',
  'Did I hurt or disappoint anyone?',
  'What am I grateful for?',
  'What should I improve tomorrow?',
];

export interface WisdomQuote {
  text: string;
  source: string;
}

export const WISDOM_QUOTES: WisdomQuote[] = [
  {
    text: 'With every hardship comes ease.',
    source: 'Timeless Wisdom',
  },
  {
    text: 'Remember your Maker in quietness, and your heart will find rest.',
    source: 'Contemplative Reflection',
  },
  {
    text: 'Speak when your words are more beautiful than silence.',
    source: 'Personal Notebook',
  },
  {
    text: 'Be still, and recognize the presence that walks with you.',
    source: 'Universal Wisdom',
  },
  {
    text: 'Do simply and sincerely, with inner peace, and be a peace giver.',
    source: 'Personal Notebook',
  },
  {
    text: 'The most meaningful practices are those kept steadily, even when small.',
    source: 'Daily Discipline',
  },
];
