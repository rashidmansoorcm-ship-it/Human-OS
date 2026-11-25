import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Wind,
} from 'lucide-react';
import {
  BODY_HABITS,
  BodyHabitKey,
  DailyHealthLog,
  DayLog,
  MIND_MOODS,
  MIND_PRACTICES,
  MOVEMENT_TYPES,
  MindMood,
  MindPracticeKey,
  SleepQuality,
} from '../types/humanOs';
import { formatReadableDate, shiftIsoDate, todayIso } from '../utils/storage';

interface HealthViewProps {
  days: Record<string, DayLog>;
  onUpdateHealth: (dateIso: string, patch: Partial<DailyHealthLog>) => void;
}

const SLEEP_QUALITIES: SleepQuality[] = ['Restful', 'Fair', 'Restless'];
const MOVEMENT_PRESETS = [15, 30, 45, 60];
const STILLNESS_PRESETS = [5, 10, 15, 20];

const BREATH_PHASES = [
  { label: 'Inhale slowly', seconds: 4 },
  { label: 'Hold gently', seconds: 4 },
  { label: 'Exhale completely', seconds: 4 },
  { label: 'Rest in stillness', seconds: 4 },
] as const;

function computeDayBalance(health?: DailyHealthLog): {
  bodyCount: number;
  mindCount: number;
  hasAny: boolean;
} {
  if (!health) return { bodyCount: 0, mindCount: 0, hasAny: false };
  const bodyHabitsDone = BODY_HABITS.filter((h) => health.bodyHabits?.[h.key]).length;
  const bodyCore =
    (health.sleepHours && health.sleepHours > 0 ? 1 : 0) +
    ((health.waterGlasses ?? 0) >= 6 ? 1 : 0) +
    ((health.movementMins ?? 0) >= 15 ? 1 : 0) +
    bodyHabitsDone;

  const mindPracticesDone = MIND_PRACTICES.filter((p) => health.mindPractices?.[p.key]).length;
  const mindCore =
    (health.mood ? 1 : 0) +
    (health.clarity ? 1 : 0) +
    ((health.stillnessMins ?? 0) > 0 ? 1 : 0) +
    mindPracticesDone;

  const hasAny =
    Boolean(health.sleepHours) ||
    Boolean(health.waterGlasses) ||
    Boolean(health.movementMins) ||
    Boolean(health.mood) ||
    Boolean(health.clarity) ||
    Boolean(health.energy) ||
    Boolean(health.stillnessMins) ||
    Boolean(health.mindNote?.trim()) ||
    bodyHabitsDone > 0 ||
    mindPracticesDone > 0;

  return { bodyCount: bodyCore, mindCount: mindCore, hasAny };
}

export const HealthView: React.FC<HealthViewProps> = ({ days, onUpdateHealth }) => {
  const today = todayIso();
  const [selectedDate, setSelectedDate] = useState(today);
  const isViewingToday = selectedDate === today;

  // Guided box-breathing timer state
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhaseIdx, setBreathPhaseIdx] = useState(0);
  const [breathSecondsLeft, setBreathSecondsLeft] = useState<number>(BREATH_PHASES[0].seconds);
  const [breathCycles, setBreathCycles] = useState(0);

  const health: DailyHealthLog = days[selectedDate]?.health ?? {};

  useEffect(() => {
    if (!breathRunning) return;
    const timer = window.setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setBreathPhaseIdx((phaseIdx) => {
          const next = (phaseIdx + 1) % BREATH_PHASES.length;
          if (next === 0) {
            setBreathCycles((c) => c + 1);
          }
          return next;
        });
        return BREATH_PHASES[(breathPhaseIdx + 1) % BREATH_PHASES.length].seconds;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [breathRunning, breathPhaseIdx]);

  // 7-day rolling summary
  const weekData = useMemo(() => {
    const list = Array.from({ length: 7 }, (_, i) => {
      const iso = shiftIsoDate(today, -(6 - i));
      const h = days[iso]?.health;
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const balance = computeDayBalance(h);
      return {
        iso,
        shortDay: dt.toLocaleDateString('en-US', { weekday: 'narrow' }),
        shortDate: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullLabel: dt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        health: h,
        ...balance,
      };
    });

    const sleepDays = list.filter((d) => (d.health?.sleepHours ?? 0) > 0);
    const avgSleep = sleepDays.length
      ? sleepDays.reduce((s, d) => s + (d.health?.sleepHours ?? 0), 0) / sleepDays.length
      : null;

    const totalMovement = list.reduce((s, d) => s + (d.health?.movementMins ?? 0), 0);

    const clarityDays = list.filter((d) => (d.health?.clarity ?? 0) > 0);
    const avgClarity = clarityDays.length
      ? clarityDays.reduce((s, d) => s + (d.health?.clarity ?? 0), 0) / clarityDays.length
      : null;

    const loggedDays = list.filter((d) => d.hasAny).length;

    return { list, avgSleep, totalMovement, avgClarity, loggedDays };
  }, [days, today]);

  const toggleBodyHabit = (key: BodyHabitKey) => {
    const current = Boolean(health.bodyHabits?.[key]);
    onUpdateHealth(selectedDate, {
      bodyHabits: {
        ...health.bodyHabits,
        [key]: !current,
      },
    });
  };

  const toggleMindPractice = (key: MindPracticeKey) => {
    const current = Boolean(health.mindPractices?.[key]);
    onUpdateHealth(selectedDate, {
      mindPractices: {
        ...health.mindPractices,
        [key]: !current,
      },
    });
  };

  const adjustSleep = (delta: number) => {
    const base = health.sleepHours ?? 7;
    const next = Math.max(0, Math.min(16, Math.round((base + delta) * 2) / 2));
    onUpdateHealth(selectedDate, { sleepHours: next });
  };

  const setWater = (glasses: number) => {
    const next = Math.max(0, Math.min(16, glasses));
    onUpdateHealth(selectedDate, { waterGlasses: next });
  };

  const bodyHabitsDone = BODY_HABITS.filter((h) => health.bodyHabits?.[h.key]).length;
  const mindPracticesDone = MIND_PRACTICES.filter((p) => health.mindPractices?.[p.key]).length;

  return (
    <div className="space-y-6">
      {/* Date Navigation & 7-Day Mind + Body Snapshot */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold">
              {isViewingToday ? 'Today — Mind & body' : formatReadableDate(selectedDate)}
            </h2>
            <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
              {weekData.loggedDays} of 7 days logged this week
              {weekData.avgSleep !== null ? ` · Avg sleep ${weekData.avgSleep.toFixed(1)}h` : ''}
              {weekData.totalMovement > 0 ? ` · ${weekData.totalMovement}m movement` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
              aria-label="Previous day"
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {!isViewingToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="min-h-[38px] px-3 rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap shrink-0"
              >
                Today
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedDate((d) => (d < today ? shiftIsoDate(d, 1) : d))}
              disabled={isViewingToday}
              aria-label="Next day"
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-column Key Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)]">
            <p className="text-xs text-[var(--ink-muted)]">Sleep</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
              {health.sleepHours !== undefined ? `${health.sleepHours}h` : '—'}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              {health.sleepQuality ?? (weekData.avgSleep ? `7d avg ${weekData.avgSleep.toFixed(1)}h` : 'Not logged')}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)]">
            <p className="text-xs text-[var(--ink-muted)]">Hydration</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
              {health.waterGlasses ?? 0}
              <span className="text-sm font-mono font-normal text-[var(--ink-muted)]"> / 8</span>
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              glasses of water
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)]">
            <p className="text-xs text-[var(--ink-muted)]">Movement</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
              {health.movementMins ?? 0}
              <span className="text-sm font-mono font-normal text-[var(--ink-muted)]"> min</span>
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)] truncate">
              {health.movementType || 'Select activity below'}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)]">
            <p className="text-xs text-[var(--ink-muted)]">Mind state</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[var(--ink)] truncate">
              {health.mood ?? '—'}
            </p>
            <p className="mt-1 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              {health.clarity ? `Clarity ${health.clarity}/5` : 'Check in below'}
              {health.energy ? ` · Energy ${health.energy}/5` : ''}
            </p>
          </div>
        </div>
      </section>

      {/* Two Balanced Pillars: Body & Mind */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* BODY COLUMN */}
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 space-y-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Body</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Rest, nourishment, water, and daily movement
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              {bodyHabitsDone}/{BODY_HABITS.length} habits
            </span>
          </div>

          {/* Sleep Control */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="health-sleep" className="text-sm font-medium text-[var(--ink)]">
                Sleep duration
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustSleep(-0.5)}
                  aria-label="Decrease sleep by 30 minutes"
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)] hover:border-[var(--emerald)] transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  id="health-sleep"
                  type="number"
                  min={0}
                  max={16}
                  step={0.5}
                  value={health.sleepHours ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(0, Math.min(16, Number(e.target.value)));
                    onUpdateHealth(selectedDate, { sleepHours: val });
                  }}
                  placeholder="7.5"
                  className="w-20 min-h-[38px] text-center rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-2 text-sm font-mono tabular-nums text-[var(--ink)]"
                />
                <button
                  type="button"
                  onClick={() => adjustSleep(0.5)}
                  aria-label="Increase sleep by 30 minutes"
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)] hover:border-[var(--emerald)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-[var(--ink-muted)] ml-1">hrs</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {SLEEP_QUALITIES.map((q) => {
                const active = health.sleepQuality === q;
                return (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onUpdateHealth(selectedDate, {
                        sleepQuality: active ? undefined : q,
                      })
                    }
                    className={`flex-1 min-h-[38px] px-3 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hydration 8-glass selector */}
          <div className="pt-5 border-t border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">Water intake</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                  {health.waterGlasses ?? 0} of 8 glasses
                </span>
                <button
                  type="button"
                  onClick={() => setWater((health.waterGlasses ?? 0) - 1)}
                  disabled={(health.waterGlasses ?? 0) <= 0}
                  aria-label="Remove one glass of water"
                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)] disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWater((health.waterGlasses ?? 0) + 1)}
                  aria-label="Add one glass of water"
                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)] hover:border-[var(--emerald)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 8 }, (_, idx) => {
                const glassNumber = idx + 1;
                const filled = (health.waterGlasses ?? 0) >= glassNumber;
                return (
                  <button
                    key={glassNumber}
                    type="button"
                    onClick={() =>
                      setWater(health.waterGlasses === glassNumber ? glassNumber - 1 : glassNumber)
                    }
                    aria-label={`Set water to ${glassNumber} glasses`}
                    aria-pressed={filled}
                    className={`min-h-[42px] rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      filled
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--emerald)]'
                    }`}
                  >
                    <Droplets className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono tabular-nums">{glassNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Movement */}
          <div className="pt-5 border-t border-[var(--line)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="health-move" className="text-sm font-medium text-[var(--ink)]">
                Movement & exercise
              </label>
              <div className="flex items-center gap-1.5">
                {MOVEMENT_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onUpdateHealth(selectedDate, { movementMins: mins })}
                    className={`min-h-[34px] px-2.5 rounded-lg border text-xs font-mono tabular-nums transition-colors whitespace-nowrap ${
                      health.movementMins === mins
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3">
                <input
                  id="health-move"
                  type="number"
                  min={0}
                  max={600}
                  value={health.movementMins ?? ''}
                  onChange={(e) => {
                    const val =
                      e.target.value === ''
                        ? undefined
                        : Math.max(0, Math.min(600, Number(e.target.value)));
                    onUpdateHealth(selectedDate, { movementMins: val });
                  }}
                  placeholder="Minutes"
                  className="w-full min-h-[40px] bg-transparent text-sm font-mono tabular-nums text-[var(--ink)] focus:outline-none"
                />
                <span className="text-xs text-[var(--ink-muted)] font-mono">min</span>
              </div>

              <select
                value={health.movementType ?? ''}
                onChange={(e) =>
                  onUpdateHealth(selectedDate, {
                    movementType: e.target.value || undefined,
                  })
                }
                aria-label="Movement type"
                className="min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="">Activity type</option>
                {MOVEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Body Daily Fundamentals */}
          <div className="pt-5 border-t border-[var(--line)] space-y-2.5">
            <p className="text-sm font-medium text-[var(--ink)]">Daily body care</p>
            <div className="divide-y divide-[var(--line)]">
              {BODY_HABITS.map((habit) => {
                const done = Boolean(health.bodyHabits?.[habit.key]);
                return (
                  <button
                    key={habit.key}
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => toggleBodyHabit(habit.key)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left group"
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          done ? 'text-[var(--emerald)]' : 'text-[var(--ink)]'
                        }`}
                      >
                        {habit.label}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">{habit.detail}</p>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        done
                          ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                          : 'border-[var(--line)] bg-[var(--canvas)] group-hover:border-[var(--emerald)]'
                      }`}
                    >
                      {done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Weight / Vitals */}
          <div className="pt-5 border-t border-[var(--line)] flex items-center justify-between gap-4">
            <label htmlFor="health-weight" className="text-xs text-[var(--ink-muted)]">
              Weight or vitals note (optional)
            </label>
            <input
              id="health-weight"
              type="text"
              value={health.weight ?? ''}
              onChange={(e) => onUpdateHealth(selectedDate, { weight: e.target.value })}
              placeholder="e.g. 72 kg · 64 bpm"
              className="w-44 min-h-[38px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 text-xs font-mono tabular-nums text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60"
            />
          </div>
        </section>

        {/* MIND COLUMN */}
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 space-y-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">Mind</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Emotional weather, clarity, stillness, and inner quiet
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              {mindPracticesDone}/{MIND_PRACTICES.length} practices
            </span>
          </div>

          {/* Emotional Weather / Mood */}
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-[var(--ink)]">How does your mind feel?</p>
            <div className="flex flex-wrap gap-2">
              {MIND_MOODS.map((m: MindMood) => {
                const active = health.mood === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onUpdateHealth(selectedDate, { mood: active ? undefined : m })
                    }
                    className={`min-h-[38px] px-3.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--emerald)]'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clarity, Energy & Tension 1–5 Ratings */}
          <div className="pt-5 border-t border-[var(--line)] space-y-4">
            {(
              [
                {
                  key: 'clarity' as const,
                  label: 'Mental clarity',
                  low: 'Foggy',
                  high: 'Clear',
                  value: health.clarity,
                },
                {
                  key: 'energy' as const,
                  label: 'Inner energy',
                  low: 'Low',
                  high: 'Vital',
                  value: health.energy,
                },
                {
                  key: 'stress' as const,
                  label: 'Mental tension',
                  low: 'Calm',
                  high: 'Tense',
                  value: health.stress,
                },
              ] as const
            ).map((metric) => (
              <div key={metric.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-sm text-[var(--ink)]">{metric.label}</span>
                  <span className="font-mono tabular-nums text-[var(--ink-muted)]">
                    {metric.value ? `${metric.value} / 5` : `${metric.low} → ${metric.high}`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = metric.value === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${metric.label} ${n} out of 5`}
                        onClick={() =>
                          onUpdateHealth(selectedDate, {
                            [metric.key]: active ? undefined : n,
                          })
                        }
                        className={`min-h-[38px] rounded-xl border text-xs font-mono tabular-nums font-medium transition-colors ${
                          active
                            ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                            : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--emerald)]'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Stillness Minutes + Guided Breath Reset */}
          <div className="pt-5 border-t border-[var(--line)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">
                Stillness & quiet sitting
              </span>
              <div className="flex items-center gap-1.5">
                {STILLNESS_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      onUpdateHealth(selectedDate, {
                        stillnessMins: mins,
                        mindPractices: { ...health.mindPractices, stillness: true },
                      })
                    }
                    className={`min-h-[34px] px-2.5 rounded-lg border text-xs font-mono tabular-nums transition-colors whitespace-nowrap ${
                      health.stillnessMins === mins
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Quiet 4-4-4-4 Breathing Reset Tool */}
            <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--emerald-soft)] text-[var(--emerald)] flex items-center justify-center shrink-0">
                  <Wind className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {breathRunning
                      ? `${BREATH_PHASES[breathPhaseIdx].label} · ${breathSecondsLeft}s`
                      : '4-4-4-4 breath reset'}
                  </p>
                  <p className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                    {breathCycles > 0
                      ? `${breathCycles} ${breathCycles === 1 ? 'cycle' : 'cycles'} completed`
                      : 'Inhale 4s · Hold 4s · Exhale 4s · Rest 4s'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (breathRunning) {
                      setBreathRunning(false);
                      if (breathCycles > 0 && !health.mindPractices?.breathing) {
                        onUpdateHealth(selectedDate, {
                          mindPractices: { ...health.mindPractices, breathing: true },
                        });
                      }
                    } else {
                      setBreathRunning(true);
                    }
                  }}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {breathRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{breathRunning ? 'Pause' : 'Start'}</span>
                </button>
                {(breathRunning || breathCycles > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBreathRunning(false);
                      setBreathPhaseIdx(0);
                      setBreathSecondsLeft(BREATH_PHASES[0].seconds);
                      if (breathCycles > 0 && !health.mindPractices?.breathing) {
                        onUpdateHealth(selectedDate, {
                          mindPractices: { ...health.mindPractices, breathing: true },
                        });
                      }
                      setBreathCycles(0);
                    }}
                    aria-label="Reset breathing timer"
                    className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mind Practices Checklist */}
          <div className="pt-5 border-t border-[var(--line)] space-y-2.5">
            <p className="text-sm font-medium text-[var(--ink)]">Mind practices</p>
            <div className="divide-y divide-[var(--line)]">
              {MIND_PRACTICES.map((practice) => {
                const done = Boolean(health.mindPractices?.[practice.key]);
                return (
                  <button
                    key={practice.key}
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => toggleMindPractice(practice.key)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left group"
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          done ? 'text-[var(--emerald)]' : 'text-[var(--ink)]'
                        }`}
                      >
                        {practice.label}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">{practice.detail}</p>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        done
                          ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                          : 'border-[var(--line)] bg-[var(--canvas)] group-hover:border-[var(--emerald)]'
                      }`}
                    >
                      {done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mind Note */}
          <div className="pt-5 border-t border-[var(--line)]">
            <label htmlFor="health-mind-note" className="block text-sm font-medium text-[var(--ink)] mb-1.5">
              Mind check-in
            </label>
            <textarea
              id="health-mind-note"
              rows={3}
              value={health.mindNote ?? ''}
              onChange={(e) => onUpdateHealth(selectedDate, { mindNote: e.target.value })}
              placeholder="What is lifting or weighing on your mind today?"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60 resize-y leading-relaxed"
            />
          </div>
        </section>
      </div>

      {/* Trailing 7-Day Mind & Body Table */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Past 7 days</h3>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Select any row to edit or review that day’s mind and body log.
            </p>
          </div>
          {weekData.avgClarity !== null && (
            <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              Avg clarity {weekData.avgClarity.toFixed(1)} / 5
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-muted)]">
                <th className="py-2.5 pr-4 font-medium">Day</th>
                <th className="py-2.5 pr-4 font-medium text-right">Sleep</th>
                <th className="py-2.5 pr-4 font-medium text-right">Water</th>
                <th className="py-2.5 pr-4 font-medium text-right">Move</th>
                <th className="py-2.5 pr-4 font-medium">Mind</th>
                <th className="py-2.5 pr-4 font-medium text-right">Clarity</th>
                <th className="py-2.5 font-medium text-right">Energy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-sm">
              {[...weekData.list].reverse().map((row) => {
                const isSelected = row.iso === selectedDate;
                const h = row.health;
                return (
                  <tr
                    key={row.iso}
                    onClick={() => setSelectedDate(row.iso)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--emerald-soft)]/60'
                        : 'hover:bg-[var(--canvas)]/70'
                    }`}
                  >
                    <td className="py-3 pr-4 whitespace-nowrap font-medium text-[var(--ink)]">
                      {row.iso === today ? 'Today' : row.fullLabel}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs text-[var(--ink)]">
                      {h?.sleepHours !== undefined ? `${h.sleepHours}h` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs text-[var(--ink)]">
                      {h?.waterGlasses ? `${h.waterGlasses}/8` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs text-[var(--ink)]">
                      {h?.movementMins ? `${h.movementMins}m` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--ink)] whitespace-nowrap">
                      {h?.mood ?? <span className="text-[var(--ink-muted)]">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums text-xs text-[var(--ink)]">
                      {h?.clarity ? `${h.clarity}/5` : '—'}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-xs text-[var(--ink)]">
                      {h?.energy ? `${h.energy}/5` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
