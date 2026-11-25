import React, { useMemo, useRef, useState } from 'react';
import { Check, Plus, Search, Trash2 } from 'lucide-react';
import { Person, RELATIONS } from '../types/humanOs';

interface PeopleViewProps {
  people: Person[];
  onAddPerson: (name: string, relation: string, everyDays: number, note: string) => void;
  onMarkContacted: (id: string) => void;
  onDeletePerson: (id: string) => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  people,
  onAddPerson,
  onMarkContacted,
  onDeletePerson,
}) => {
  const [relation, setRelation] = useState('');
  const [name, setName] = useState('');
  const [every, setEvery] = useState('14');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState('All');
  const relRef = useRef<HTMLSelectElement>(null);

  const now = Date.now();

  const enrichedPeople = useMemo(() => {
    return people
      .map((p) => {
        const daysSince = p.last ? Math.floor((now - p.last) / 86400000) : null;
        const cadence = p.every || 14;
        const daysOverdue = daysSince === null ? cadence : daysSince - cadence;
        const isOverdue = daysSince === null || daysSince > cadence;
        const isDueSoon = !isOverdue && daysSince !== null && cadence - daysSince <= 2;
        return {
          ...p,
          daysSince,
          cadence,
          daysOverdue,
          isOverdue,
          isDueSoon,
        };
      })
      .sort((a, b) => {
        // Surface people who need outreach first
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return b.daysOverdue - a.daysOverdue;
      });
  }, [people, now]);

  const activeRelations = useMemo(() => {
    const set = new Set(people.map((p) => p.rel).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedPeople.filter((p) => {
      if (relationFilter !== 'All' && p.rel !== relationFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.rel.toLowerCase().includes(q) ||
        (p.note ?? '').toLowerCase().includes(q)
      );
    });
  }, [enrichedPeople, query, relationFilter]);

  const overdueCount = useMemo(
    () => enrichedPeople.filter((p) => p.isOverdue).length,
    [enrichedPeople]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!relation) {
      setError('Please select a relation.');
      relRef.current?.focus();
      return;
    }
    if (!trimmedName) {
      setError('Please enter their name.');
      return;
    }
    setError('');
    const cadence = Math.max(1, Number(every) || 14);
    onAddPerson(trimmedName, relation, cadence, note.trim());
    setName('');
    setRelation('');
    setEvery('14');
    setNote('');
  };

  return (
    <div className="space-y-6">
      {/* Add Person Card */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold mb-1">Keep ties of kinship</h2>
        <p className="text-xs text-[var(--ink-muted)] mb-4">
          Set a gentle cadence for family, elders, mentors, and friends so no bond quietly fades.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <select
              ref={relRef}
              value={relation}
              onChange={(e) => {
                setRelation(e.target.value);
                if (error) setError('');
              }}
              aria-label="Relation"
              className="sm:col-span-3 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--ink)]"
            >
              <option value="">Relation (required)</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Name"
              aria-label="Person name"
              className="sm:col-span-4 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
            />

            <div className="sm:col-span-3 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3">
              <span className="text-xs text-[var(--ink-muted)] whitespace-nowrap">Every</span>
              <input
                type="number"
                min={1}
                max={365}
                value={every}
                onChange={(e) => setEvery(e.target.value)}
                aria-label="Contact every N days"
                className="w-full min-h-[42px] bg-transparent text-sm font-mono tabular-nums text-[var(--ink)] focus:outline-none"
              />
              <span className="text-xs text-[var(--ink-muted)] whitespace-nowrap">days</span>
            </div>

            <button
              type="submit"
              className="sm:col-span-2 min-h-[44px] px-4 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (city, last conversation, care note…)"
            aria-label="Optional note"
            className="w-full min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
          />

          {error && (
            <p className="text-xs font-medium text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>

      {/* People Directory */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Your circle</h3>
            <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
              {people.length} {people.length === 1 ? 'person' : 'people'} tracked
              {overdueCount > 0 ? ` · ${overdueCount} awaiting outreach` : ''}
            </p>
          </div>

          {people.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  aria-label="Search people"
                  className="min-h-[38px] pl-9 pr-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
                />
              </div>
              {activeRelations.length > 2 && (
                <select
                  value={relationFilter}
                  onChange={(e) => setRelationFilter(e.target.value)}
                  aria-label="Filter by relation"
                  className="min-h-[38px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 text-xs text-[var(--ink)]"
                >
                  {activeRelations.map((r) => (
                    <option key={r} value={r}>
                      {r === 'All' ? 'All relations' : r}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-sm text-[var(--ink-muted)]">
            {people.length === 0
              ? 'Nothing here yet. Add a parent, sibling, spouse, or mentor above.'
              : 'No contacts match your search.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {filtered.map((person) => {
              let statusText = 'Not contacted yet';
              if (person.daysSince === 0) {
                statusText = 'Contacted today';
              } else if (person.daysSince === 1) {
                statusText = 'Contacted yesterday';
              } else if (person.daysSince !== null) {
                statusText = `Last contacted ${person.daysSince}d ago`;
              }

              return (
                <li
                  key={person.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-base font-medium text-[var(--ink)]">
                        {person.name}
                      </span>
                      <span className="text-xs text-[var(--ink-muted)]">
                        {person.rel} · every {person.cadence}d
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-mono tabular-nums">
                      <span
                        className={
                          person.isOverdue
                            ? 'text-[var(--warn)] font-medium'
                            : person.daysSince === 0
                              ? 'text-[var(--emerald)]'
                              : 'text-[var(--ink-muted)]'
                        }
                      >
                        {person.isOverdue && person.daysSince !== null
                          ? `Overdue by ${person.daysOverdue}d · ${statusText}`
                          : person.isOverdue
                            ? `Reach out · ${statusText}`
                            : person.isDueSoon
                              ? `Due soon · ${statusText}`
                              : statusText}
                      </span>
                    </p>
                    {person.note && (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">{person.note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMarkContacted(person.id)}
                      className="min-h-[40px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] hover:text-[var(--emerald)] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Contacted</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePerson(person.id)}
                      aria-label={`Remove ${person.name}`}
                      className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--canvas)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
