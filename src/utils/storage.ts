import { SEEDED_BATCH_1, SEEDED_BATCH_2 } from '../data/seededNotes';
import {
  DayLog,
  HumanOSState,
  Note,
  SPIRITUAL_ANCHORS,
  SpiritualAnchor,
} from '../types/humanOs';

export const STORAGE_KEY = 'humanos.v1';
export const THEME_KEY = 'humanos.theme';

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function todayIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftIsoDate(iso: string, offsetDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + offsetDays);
  return todayIso(dt);
}

export function formatReadableDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getDayLog(state: HumanOSState, dateIso: string): DayLog {
  return state.days[dateIso] ?? { prayers: {}, reflect: {} };
}

export function isAnchorDone(dayLog: DayLog | undefined, anchor: SpiritualAnchor): boolean {
  if (!dayLog?.prayers) return false;
  return Boolean(dayLog.prayers[anchor.key] ?? dayLog.prayers[anchor.legacyKey]);
}

export function countAnchorsDone(dayLog: DayLog | undefined): number {
  return SPIRITUAL_ANCHORS.filter((a) => isAnchorDone(dayLog, a)).length;
}

export function createEmptyState(): HumanOSState {
  const date = todayIso();
  const notes: Note[] = [
    ...SEEDED_BATCH_2.map((b) => ({
      id: uid(),
      k: 'Thought' as const,
      t: '',
      b,
      d: date,
    })),
    ...SEEDED_BATCH_1.map((b) => ({
      id: uid(),
      k: 'Thought' as const,
      t: '',
      b,
      d: date,
    })),
  ];

  return {
    seeded: 1,
    seeded2: 1,
    tasks: [],
    goals: [],
    money: [],
    people: [],
    notes,
    days: {},
    rem: [],
  };
}

export function loadState(): HumanOSState {
  let raw: Partial<HumanOSState> | null = null;
  try {
    const str = localStorage.getItem(STORAGE_KEY);
    if (str) {
      raw = JSON.parse(str) as Partial<HumanOSState>;
    }
  } catch {
    raw = null;
  }

  const state: HumanOSState = {
    name: raw?.name,
    age: raw?.age,
    stage: raw?.stage,
    vals: raw?.vals,
    seeded: raw?.seeded,
    seeded2: raw?.seeded2,
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : [],
    goals: Array.isArray(raw?.goals) ? raw.goals : [],
    money: Array.isArray(raw?.money) ? raw.money : [],
    people: Array.isArray(raw?.people) ? raw.people : [],
    notes: Array.isArray(raw?.notes) ? raw.notes : [],
    days: raw?.days && typeof raw.days === 'object' ? raw.days : {},
    rem: Array.isArray(raw?.rem) ? raw.rem : [],
  };

  let mutated = false;
  const date = todayIso();

  if (!state.seeded2) {
    state.seeded2 = 1;
    for (const b of SEEDED_BATCH_2) {
      state.notes.push({ id: uid(), k: 'Thought', t: '', b, d: date });
    }
    mutated = true;
  }

  if (!state.seeded) {
    state.seeded = 1;
    for (const b of SEEDED_BATCH_1) {
      state.notes.push({ id: uid(), k: 'Thought', t: '', b, d: date });
    }
    mutated = true;
  }

  if (mutated) {
    saveState(state);
  }

  return state;
}

export function saveState(state: HumanOSState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function validateImportedState(parsed: unknown): HumanOSState | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Partial<HumanOSState>;
  const hasKnownShape =
    Array.isArray(obj.tasks) ||
    Array.isArray(obj.goals) ||
    Array.isArray(obj.money) ||
    Array.isArray(obj.people) ||
    Array.isArray(obj.notes) ||
    typeof obj.name === 'string';

  if (!hasKnownShape) return null;

  return {
    name: typeof obj.name === 'string' ? obj.name : undefined,
    age: typeof obj.age === 'string' ? obj.age : obj.age ? String(obj.age) : undefined,
    stage: typeof obj.stage === 'string' ? obj.stage : undefined,
    vals: typeof obj.vals === 'string' ? obj.vals : undefined,
    seeded: obj.seeded ?? 1,
    seeded2: obj.seeded2 ?? 1,
    tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
    goals: Array.isArray(obj.goals) ? obj.goals : [],
    money: Array.isArray(obj.money) ? obj.money : [],
    people: Array.isArray(obj.people) ? obj.people : [],
    notes: Array.isArray(obj.notes) ? obj.notes : [],
    days: obj.days && typeof obj.days === 'object' ? obj.days : {},
    rem: Array.isArray(obj.rem) ? obj.rem : [],
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = 'text/markdown'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
