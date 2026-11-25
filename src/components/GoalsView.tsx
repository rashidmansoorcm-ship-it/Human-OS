import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  GOAL_HORIZONS,
  Goal,
  GoalHorizon,
  LIFE_AREAS,
  LifeArea,
} from '../types/humanOs';

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (title: string, area: LifeArea, horizon: GoalHorizon) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAddGoal,
  onUpdateProgress,
  onDeleteGoal,
}) => {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<LifeArea>('Spiritual');
  const [horizon, setHorizon] = useState<GoalHorizon>('Year');
  const [areaFilter, setAreaFilter] = useState<LifeArea | 'All'>('All');
  const [horizonFilter, setHorizonFilter] = useState<GoalHorizon | 'All'>('All');

  const stats = useMemo(() => {
    const avg = goals.length
      ? Math.round(goals.reduce((s, g) => s + g.p, 0) / goals.length)
      : 0;
    const completed = goals.filter((g) => g.p >= 100).length;
    const perArea = LIFE_AREAS.map((a) => {
      const items = goals.filter((g) => g.a === a);
      const areaAvg = items.length
        ? Math.round(items.reduce((s, g) => s + g.p, 0) / items.length)
        : null;
      return { area: a, count: items.length, avg: areaAvg };
    });
    return { avg, completed, perArea };
  }, [goals]);

  const visibleGoals = useMemo(
    () =>
      goals.filter(
        (g) =>
          (areaFilter === 'All' || g.a === areaFilter) &&
          (horizonFilter === 'All' || g.h === horizonFilter)
      ),
    [goals, areaFilter, horizonFilter]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = title.trim();
    if (!cleaned) return;
    onAddGoal(cleaned, area, horizon);
    setTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Add Goal Card */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold mb-1">Set a goal</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-4">
          Balance your ambitions across all eight life areas and three horizons.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What meaningful outcome are you building toward?"
            aria-label="Goal title"
            className="md:col-span-6 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
          />
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as LifeArea)}
            aria-label="Life area"
            className="md:col-span-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--ink)]"
          >
            {LIFE_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
            aria-label="Horizon"
            className="md:col-span-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--ink)]"
          >
            {GOAL_HORIZONS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="md:col-span-2 min-h-[44px] px-4 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add goal</span>
          </button>
        </form>
      </section>

      {/* Life Areas Coverage Matrix */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Eight life areas</h3>
            <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
              Average progress {stats.avg}% · {stats.completed} completed · {goals.length} total
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--canvas)] border border-[var(--line)]">
            {(['All', ...GOAL_HORIZONS] as (GoalHorizon | 'All')[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonFilter(h)}
                className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  horizonFilter === h
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.perArea.map((item) => {
            const active = areaFilter === item.area;
            return (
              <button
                key={item.area}
                type="button"
                onClick={() =>
                  setAreaFilter((curr) => (curr === item.area ? 'All' : item.area))
                }
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  active
                    ? 'border-[var(--emerald)] bg-[var(--emerald-soft)]'
                    : 'border-[var(--line)] bg-[var(--canvas)] hover:border-[var(--emerald)]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--ink)] truncate">
                    {item.area}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                    {item.avg !== null ? `${item.avg}%` : '—'}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--gold)] transition-all"
                    style={{ width: `${item.avg ?? 0}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                  {item.count} {item.count === 1 ? 'goal' : 'goals'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Goals List */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-lg font-semibold">
            {areaFilter === 'All' ? 'All goals' : `${areaFilter} goals`}
          </h3>
          {(areaFilter !== 'All' || horizonFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setAreaFilter('All');
                setHorizonFilter('All');
              }}
              className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>

        {visibleGoals.length === 0 ? (
          <p className="py-6 text-sm text-[var(--ink-muted)]">
            {goals.length === 0
              ? 'Nothing here yet. Add your first goal above.'
              : 'No goals match the selected area and horizon.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {visibleGoals.map((goal) => (
              <li key={goal.id} className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-[var(--ink)] leading-snug">
                      {goal.t}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                      {goal.a} · {goal.h} · {goal.p}% complete
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {goal.p < 100 && (
                      <button
                        type="button"
                        onClick={() => onUpdateProgress(goal.id, Math.min(100, goal.p + 10))}
                        className="min-h-[36px] px-3 rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-xs font-mono font-medium text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap shrink-0"
                      >
                        +10%
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      aria-label={`Delete goal ${goal.t}`}
                      className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--canvas)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={goal.p}
                    onChange={(e) => onUpdateProgress(goal.id, Number(e.target.value))}
                    aria-label={`Progress for ${goal.t}`}
                    className="flex-1 h-2 cursor-pointer"
                  />
                  <span className="w-11 text-right text-xs font-mono tabular-nums text-[var(--ink)] font-medium">
                    {goal.p}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
