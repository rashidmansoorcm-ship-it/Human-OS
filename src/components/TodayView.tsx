import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import {
  HumanOSState,
  LIFE_AREAS,
  REFLECTION_PROMPTS,
  SPIRITUAL_ANCHORS,
  SpiritualAnchorKey,
  TabId,
  TaskPriority,
  WISDOM_QUOTES,
} from '../types/humanOs';
import {
  countAnchorsDone,
  countWords,
  formatReadableDate,
  getDayLog,
  isAnchorDone,
  shiftIsoDate,
  todayIso,
} from '../utils/storage';

interface TodayViewProps {
  state: HumanOSState;
  onToggleAnchor: (dateIso: string, anchor: SpiritualAnchorKey) => void;
  onAddTask: (title: string, priority: TaskPriority, due: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateReflection: (dateIso: string, index: number, value: string) => void;
  onMarkContacted: (personId: string) => void;
  onNavigate: (tab: TabId) => void;
}

type TaskFilter = 'all' | 'open' | 'top3' | 'done';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  'Top 3': 0,
  Normal: 1,
  Low: 2,
};

export const TodayView: React.FC<TodayViewProps> = ({
  state,
  onToggleAnchor,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateReflection,
  onMarkContacted,
  onNavigate,
}) => {
  const today = todayIso();
  const [selectedDate, setSelectedDate] = useState(today);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Task composer state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Normal');
  const [taskDue, setTaskDue] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');

  const isViewingToday = selectedDate === today;
  const dayLog = getDayLog(state, selectedDate);
  const todayLog = getDayLog(state, today);

  const quote = WISDOM_QUOTES[quoteIdx % WISDOM_QUOTES.length];

  // Daily remembrance stats for trailing 7 days
  const remembranceWeek = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const iso = shiftIsoDate(today, -(6 - i));
      const count = countAnchorsDone(state.days[iso]);
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        iso,
        count,
        shortDay: dt.toLocaleDateString('en-US', { weekday: 'narrow' }),
        fullLabel: dt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      };
    });

    let streak = 0;
    for (let i = 6; i >= 0; i--) {
      if (days[i].count === 5) {
        streak++;
      } else if (i === 6) {
        continue;
      } else {
        break;
      }
    }

    const total = days.reduce((sum, item) => sum + item.count, 0);
    return { days, streak, total };
  }, [state.days, today]);

  const anchorsDoneSelected = countAnchorsDone(dayLog);
  const anchorsDoneToday = countAnchorsDone(todayLog);

  // Today's mind & body quick summary
  const todayHealth = todayLog.health;
  const healthCheckedInToday = Boolean(
    todayHealth &&
      (todayHealth.sleepHours ||
        todayHealth.waterGlasses ||
        todayHealth.movementMins ||
        todayHealth.mood ||
        todayHealth.clarity)
  );

  // Task stats
  const openTasks = useMemo(() => state.tasks.filter((t) => !t.done), [state.tasks]);
  const doneTasks = useMemo(() => state.tasks.filter((t) => t.done), [state.tasks]);
  const overdueTasks = useMemo(
    () => openTasks.filter((t) => Boolean(t.due && t.due < today)),
    [openTasks, today]
  );

  const focusTasks = useMemo(
    () =>
      [...openTasks]
        .sort((a, b) => PRIORITY_ORDER[a.pr] - PRIORITY_ORDER[b.pr])
        .slice(0, 3),
    [openTasks]
  );

  const filteredTasks = useMemo(() => {
    const list = state.tasks.filter((t) => {
      if (taskFilter === 'open') return !t.done;
      if (taskFilter === 'done') return Boolean(t.done);
      if (taskFilter === 'top3') return !t.done && t.pr === 'Top 3';
      return true;
    });

    return [...list].sort((a, b) => {
      if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
      return PRIORITY_ORDER[a.pr] - PRIORITY_ORDER[b.pr];
    });
  }, [state.tasks, taskFilter]);

  // Monthly money summary
  const monthPrefix = today.slice(0, 7);
  const monthMoney = useMemo(() => {
    const sumKind = (k: 'Earn' | 'Spend' | 'Save' | 'Share') =>
      state.money
        .filter((x) => x.d.startsWith(monthPrefix) && x.k === k)
        .reduce((s, x) => s + x.v, 0);
    const inc = sumKind('Earn');
    const sp = sumKind('Spend');
    const sv = sumKind('Save');
    const sh = sumKind('Share');
    const saveSharePct = inc ? Math.min(100, Math.round(((sv + sh) / inc) * 100)) : 0;
    const spentPct = inc ? Math.round((sp / inc) * 100) : 0;
    return { inc, sp, sv, sh, saveSharePct, spentPct };
  }, [state.money, monthPrefix]);

  // Goals summary
  const goalsSummary = useMemo(() => {
    const avg = state.goals.length
      ? Math.round(state.goals.reduce((s, g) => s + g.p, 0) / state.goals.length)
      : 0;
    const missingAreas = LIFE_AREAS.filter((a) => !state.goals.some((g) => g.a === a));
    return {
      avg,
      covered: LIFE_AREAS.length - missingAreas.length,
      missingAreas,
    };
  }, [state.goals]);

  // People needing outreach
  const stalePeople = useMemo(() => {
    const now = Date.now();
    return state.people.filter((p) => {
      const daysSince = p.last ? (now - p.last) / 86400000 : Infinity;
      return daysSince > (p.every || 30);
    });
  }, [state.people]);

  // Reflection state
  const reflectionStartedToday = Object.values(todayLog.reflect).some((v) => v.trim().length > 0);
  const totalWords = useMemo(
    () => state.notes.reduce((sum, n) => sum + countWords(n.b), 0),
    [state.notes]
  );

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = taskTitle.trim();
    if (!cleaned) return;
    onAddTask(cleaned, taskPriority, taskDue);
    setTaskTitle('');
    setTaskDue('');
    setTaskPriority('Normal');
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner — Dominant Focal Anchor */}
      <section
        className="rounded-2xl p-6 sm:p-8 text-[#f4efe0]"
        style={{
          backgroundColor: 'var(--emerald-deep)',
          backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(176, 141, 60, 0.28) 0%, rgba(176, 141, 60, 0) 56%)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-mono tabular-nums text-[#f4efe0]/75">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#f4efe0]">
              Peace, {state.name}
            </h2>
            <p className="text-sm text-[#f4efe0]/85 font-mono tabular-nums">
              {anchorsDoneToday} of 5 remembrances today · {openTasks.length} open{' '}
              {openTasks.length === 1 ? 'task' : 'tasks'}
              {stalePeople.length > 0
                ? ` · ${stalePeople.length} ${stalePeople.length === 1 ? 'person' : 'people'} to reach out to`
                : ''}
            </p>
          </div>

          <div className="md:max-w-sm md:text-right flex flex-col md:items-end justify-between gap-2 pt-4 md:pt-0 border-t border-white/15 md:border-t-0">
            <p className="font-display italic text-base sm:text-lg text-[#e3c987] leading-snug">
              “{quote.text}”
            </p>
            <div className="flex items-center gap-3 text-xs text-[#f4efe0]/70">
              <span>{quote.source}</span>
              <button
                type="button"
                onClick={() => setQuoteIdx((idx) => (idx + 1) % WISDOM_QUOTES.length)}
                aria-label="Next reflection quote"
                className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg hover:bg-white/10 text-[#e3c987] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Workspace Split: Remembrance & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 columns: Remember God / Your Master + Tasks */}
        <div className="lg:col-span-7 space-y-6">
          {/* Daily Remembrance */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold">
                  Remember God / your Master
                </h3>
                <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
                  {anchorsDoneSelected} of 5 daily pauses ·{' '}
                  {isViewingToday ? 'Today' : formatReadableDate(selectedDate)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate((d) => shiftIsoDate(d, -1))}
                  aria-label="Previous day"
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {!isViewingToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(today)}
                    className="min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap shrink-0"
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate((d) => (d < today ? shiftIsoDate(d, 1) : d))
                  }
                  disabled={isViewingToday}
                  aria-label="Next day"
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {SPIRITUAL_ANCHORS.map((anchor) => {
                const done = isAnchorDone(dayLog, anchor);
                return (
                  <button
                    key={anchor.key}
                    type="button"
                    onClick={() => onToggleAnchor(selectedDate, anchor.key)}
                    aria-pressed={done}
                    title={`${anchor.label} — ${anchor.hint}`}
                    className={`min-h-[72px] rounded-xl border px-1.5 py-2.5 flex flex-col items-center justify-center gap-1 transition-all ${
                      done
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--emerald)]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {anchor.label}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        done
                          ? 'bg-white/20 dark:bg-black/15'
                          : 'border border-[var(--line)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 7-day consistency bar */}
            <div className="mt-5 pt-5 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {remembranceWeek.days.map((d) => {
                  const isSelected = d.iso === selectedDate;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => setSelectedDate(d.iso)}
                      title={`${d.fullLabel}: ${d.count}/5 remembrances`}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-medium tabular-nums transition-transform group-hover:scale-105 ${
                          d.count >= 4
                            ? 'text-white dark:text-[#06150f]'
                            : 'text-[var(--ink)]'
                        } ${
                          isSelected
                            ? 'ring-2 ring-[var(--gold)] ring-offset-1 ring-offset-[var(--surface)]'
                            : ''
                        }`}
                        style={{
                          backgroundColor:
                            d.count === 0
                              ? 'var(--surface-subtle)'
                              : `color-mix(in srgb, var(--emerald) ${20 + d.count * 16}%, transparent)`,
                        }}
                      >
                        {d.count}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] font-mono">
                        {d.shortDay}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-[var(--ink-muted)] font-mono tabular-nums sm:text-right">
                <p className="text-[var(--ink)] font-medium">
                  {remembranceWeek.total}/35 this week
                </p>
                <p className="mt-0.5">{remembranceWeek.streak}-day full streak</p>
              </div>
            </div>
          </section>

          {/* Tasks */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Tasks</h3>
                <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
                  {doneTasks.length} done · {openTasks.length} open
                  {overdueTasks.length > 0 ? ` · ${overdueTasks.length} overdue` : ''}
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--canvas)] border border-[var(--line)]">
                {(
                  [
                    ['all', 'All'],
                    ['open', 'Open'],
                    ['top3', 'Top 3'],
                    ['done', 'Done'],
                  ] as [TaskFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTaskFilter(key)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      taskFilter === key
                        ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleTaskSubmit} className="flex flex-wrap sm:flex-nowrap gap-2 mb-4">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Add a task for today…"
                aria-label="New task"
                className="flex-1 min-w-[180px] min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
              />
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                aria-label="Task priority"
                className="min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                <option value="Top 3">Top 3</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
              <input
                type="date"
                value={taskDue}
                onChange={(e) => setTaskDue(e.target.value)}
                aria-label="Due date"
                className="min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-sm font-mono tabular-nums text-[var(--ink)]"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {filteredTasks.length === 0 ? (
              <p className="py-6 text-sm text-[var(--ink-muted)]">
                {state.tasks.length === 0
                  ? 'Nothing here yet. Add your first task above and mark up to three as Top 3.'
                  : 'No tasks match this filter.'}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {filteredTasks.map((task) => {
                  const isOverdue = Boolean(!task.done && task.due && task.due < today);
                  return (
                    <li
                      key={task.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(task.done)}
                          onChange={() => onToggleTask(task.id)}
                          className="mt-1 h-4 w-4 rounded border-[var(--line)] accent-[var(--emerald)] cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm leading-snug ${
                              task.done
                                ? 'line-through text-[var(--ink-muted)]'
                                : 'text-[var(--ink)] font-medium'
                            }`}
                          >
                            {task.pr === 'Top 3' && !task.done && (
                              <Star className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5 text-[var(--gold)] fill-[var(--gold)]" />
                            )}
                            {task.t}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                            <span>{task.pr}</span>
                            {task.due && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className={isOverdue ? 'text-[var(--danger)] font-medium' : ''}>
                                  {isOverdue ? `Overdue · due ${task.due}` : `Due ${task.due}`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete task ${task.t}`}
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--canvas)] transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right 5 columns: Focus, Needs Attention, Quick Snapshots */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Top Focus */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold mb-3">Focus</h3>
            {focusTasks.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                Add up to three tasks marked Top 3 to set today’s focus.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {focusTasks.map((t) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTask(t.id)}
                      className="text-left flex items-center gap-2.5 min-w-0 flex-1 group"
                    >
                      <span className="w-4 h-4 rounded-full border border-[var(--line)] group-hover:border-[var(--emerald)] shrink-0" />
                      <span className="text-sm font-medium truncate text-[var(--ink)]">
                        {t.pr === 'Top 3' && (
                          <Star className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5 text-[var(--gold)] fill-[var(--gold)]" />
                        )}
                        {t.t}
                      </span>
                    </button>
                    {t.due && (
                      <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)] shrink-0">
                        {t.due}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Needs Attention */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold mb-3">Needs attention</h3>
            {overdueTasks.length === 0 &&
            stalePeople.length === 0 &&
            (monthMoney.sh > 0 || state.money.length === 0) &&
            (goalsSummary.missingAreas.length === 0 || state.goals.length === 0) &&
            healthCheckedInToday &&
            reflectionStartedToday ? (
              <p className="text-sm text-[var(--emerald)] font-medium">
                Nothing neglected right now. Well tended.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)] text-sm">
                {overdueTasks.slice(0, 3).map((t) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[var(--ink)] truncate">
                      <span className="text-[var(--danger)] font-medium">Overdue:</span> {t.t}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleTask(t.id)}
                      className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Complete
                    </button>
                  </li>
                ))}

                {stalePeople.slice(0, 3).map((p) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[var(--ink)] truncate">
                      Reach out to {p.name}
                      {p.rel ? ` (${p.rel})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkContacted(p.id)}
                      className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Mark contacted
                    </button>
                  </li>
                ))}

                {!healthCheckedInToday && (
                  <li className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)]">Mind & body check-in not logged</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('health')}
                      className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Check in
                    </button>
                  </li>
                )}

                {monthMoney.sh === 0 && state.money.length > 0 && (
                  <li className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)]">No giving recorded this month</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('money')}
                      className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Log share
                    </button>
                  </li>
                )}

                {goalsSummary.missingAreas.length > 0 && state.goals.length > 0 && (
                  <li className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)] truncate">
                      No goals in: {goalsSummary.missingAreas.slice(0, 3).join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('goals')}
                      className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Add goal
                    </button>
                  </li>
                )}

                {!reflectionStartedToday && (
                  <li className="py-2.5 flex items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)]">Evening reflection not started</span>
                    <a
                      href="#evening-reflection"
                      className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Write
                    </a>
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Compact Domain Overview Strip */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] divide-y divide-[var(--line)]">
            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="w-full p-5 text-left hover:bg-[var(--canvas)]/60 transition-colors rounded-t-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-semibold">Mind & body today</span>
                <ArrowRight className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
              </div>
              <p className="mt-1.5 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                {healthCheckedInToday
                  ? [
                      todayHealth?.sleepHours !== undefined ? `Sleep ${todayHealth.sleepHours}h` : null,
                      todayHealth?.waterGlasses ? `Water ${todayHealth.waterGlasses}/8` : null,
                      todayHealth?.movementMins ? `Move ${todayHealth.movementMins}m` : null,
                      todayHealth?.mood ? `Mind: ${todayHealth.mood}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Log sleep, hydration, movement, and mental clarity'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('money')}
              className="w-full p-5 text-left hover:bg-[var(--canvas)]/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-semibold">Money this month</span>
                <ArrowRight className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
              </div>
              <p className="mt-1.5 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                Earned {monthMoney.inc.toLocaleString()} · Spent {monthMoney.sp.toLocaleString()} ·
                Saved {monthMoney.sv.toLocaleString()} · Shared {monthMoney.sh.toLocaleString()}
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--line)] overflow-hidden">
                <div
                  className="h-full bg-[var(--gold)] transition-all"
                  style={{ width: `${monthMoney.saveSharePct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                {monthMoney.inc > 0
                  ? `${monthMoney.spentPct}% of income spent · ${monthMoney.saveSharePct}% saved & shared`
                  : 'Add income to see monthly ratios'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="w-full p-5 text-left hover:bg-[var(--canvas)]/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-semibold">Goals</span>
                <span className="font-display text-xl font-semibold tabular-nums text-[var(--emerald)]">
                  {goalsSummary.avg}%
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-[var(--line)] overflow-hidden">
                <div
                  className="h-full bg-[var(--emerald)] transition-all"
                  style={{ width: `${goalsSummary.avg}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                {state.goals.length} {state.goals.length === 1 ? 'goal' : 'goals'} across{' '}
                {goalsSummary.covered} of {LIFE_AREAS.length} life areas
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('library')}
              className="w-full p-5 text-left hover:bg-[var(--canvas)]/60 transition-colors rounded-b-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-semibold">You & Library</span>
                <ArrowRight className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
              </div>
              <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
                {state.age ? `Age ${state.age} · ` : ''}
                {state.stage || 'Life stage not set'}
              </p>
              <p className="mt-1 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                {state.people.length} people tracked · {state.notes.length} notes ·{' '}
                {totalWords.toLocaleString()} words
              </p>
              {state.vals && (
                <p className="mt-2 text-xs italic text-[var(--ink)]/85 line-clamp-2">
                  “{state.vals}”
                </p>
              )}
            </button>
          </section>
        </div>
      </div>

      {/* Evening Reflection */}
      <section
        id="evening-reflection"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Evening reflection</h3>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Saved automatically on this device for{' '}
              <span className="font-mono tabular-nums">
                {isViewingToday ? 'today' : formatReadableDate(selectedDate)}
              </span>
            </p>
          </div>
          {Object.values(dayLog.reflect).some((v) => v.trim()) && (
            <span className="text-xs font-mono text-[var(--emerald)]">Saved locally</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {REFLECTION_PROMPTS.map((prompt, index) => (
            <div key={prompt}>
              <label
                htmlFor={`reflect-${index}`}
                className="block text-sm font-medium text-[var(--ink)] mb-1.5"
              >
                {prompt}
              </label>
              <textarea
                id={`reflect-${index}`}
                rows={3}
                value={dayLog.reflect[String(index)] ?? ''}
                onChange={(e) => onUpdateReflection(selectedDate, index, e.target.value)}
                placeholder="Write honestly…"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60 resize-y leading-relaxed"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
