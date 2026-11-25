import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { MONEY_KINDS, MoneyEntry, MoneyKind } from '../types/humanOs';
import { todayIso } from '../utils/storage';

interface MoneyViewProps {
  entries: MoneyEntry[];
  onAddEntry: (kind: MoneyKind, value: number, note: string, date: string) => void;
  onDeleteEntry: (id: string) => void;
}

function shiftMonth(yyyyMm: string, delta: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export const MoneyView: React.FC<MoneyViewProps> = ({
  entries,
  onAddEntry,
  onDeleteEntry,
}) => {
  const currentMonth = todayIso().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [kind, setKind] = useState<MoneyKind>('Spend');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(todayIso());
  const [kindFilter, setKindFilter] = useState<MoneyKind | 'All'>('All');

  // Optional quiet giving reference estimator
  const [showGivingCalc, setShowGivingCalc] = useState(false);
  const [givingBase, setGivingBase] = useState('');
  const [givingRate, setGivingRate] = useState<number>(2.5);

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.d.startsWith(selectedMonth))
        .sort((a, b) => (a.d < b.d ? 1 : -1)),
    [entries, selectedMonth]
  );

  const totals = useMemo(() => {
    const sum = (k: MoneyKind) =>
      monthEntries.filter((e) => e.k === k).reduce((acc, e) => acc + e.v, 0);
    const earn = sum('Earn');
    const spend = sum('Spend');
    const save = sum('Save');
    const share = sum('Share');
    const net = earn - spend;
    const pct = (v: number) => (earn > 0 ? Math.round((v / earn) * 100) : 0);
    return {
      earn,
      spend,
      save,
      share,
      net,
      spendPct: pct(spend),
      savePct: pct(save),
      sharePct: pct(share),
    };
  }, [monthEntries]);

  const filteredEntries = useMemo(
    () =>
      monthEntries.filter((e) => kindFilter === 'All' || e.k === kindFilter),
    [monthEntries, kindFilter]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    onAddEntry(kind, num, note.trim(), entryDate || todayIso());
    setAmount('');
    setNote('');
  };

  const givingEstimate = useMemo(() => {
    const val = Number(givingBase);
    if (!Number.isFinite(val) || val <= 0) return 0;
    return val * (givingRate / 100);
  }, [givingBase, givingRate]);

  return (
    <div className="space-y-6">
      {/* Month Switcher + Summary KPIs */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold">
              {formatMonthLabel(selectedMonth)}
            </h2>
            <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
              Net flow (earned − spent): {totals.net >= 0 ? '+' : ''}
              {totals.net.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
              aria-label="Previous month"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {selectedMonth !== currentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonth)}
                className="min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap shrink-0"
              >
                This month
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
              aria-label="Next month"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              ['Earned', totals.earn, 'Income & livelihood'],
              ['Spent', totals.spend, totals.earn > 0 ? `${totals.spendPct}% of earned` : 'Living expenses'],
              ['Saved', totals.save, totals.earn > 0 ? `${totals.savePct}% of earned` : 'Reserves & future'],
              ['Shared', totals.share, totals.earn > 0 ? `${totals.sharePct}% of earned` : 'Charity & giving'],
            ] as const
          ).map(([label, value, sub]) => (
            <div
              key={label}
              className="p-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)]"
            >
              <p className="text-xs text-[var(--ink-muted)]">{label}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">
                {value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-mono tabular-nums text-[var(--ink-muted)]">{sub}</p>
            </div>
          ))}
        </div>

        {/* Allocation visual bar */}
        {totals.earn > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--line)]">
            <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] font-mono tabular-nums mb-2">
              <span>Monthly allocation against earned income</span>
              <span>
                Spend {totals.spendPct}% · Save {totals.savePct}% · Share {totals.sharePct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--line)] overflow-hidden flex">
              <div
                className="h-full bg-[var(--ink-muted)]/60"
                style={{ width: `${Math.min(100, totals.spendPct)}%` }}
                title={`Spent: ${totals.spendPct}%`}
              />
              <div
                className="h-full bg-[var(--emerald)]"
                style={{ width: `${Math.min(100, totals.savePct)}%` }}
                title={`Saved: ${totals.savePct}%`}
              />
              <div
                className="h-full bg-[var(--gold)]"
                style={{ width: `${Math.min(100, totals.sharePct)}%` }}
                title={`Shared: ${totals.sharePct}%`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Log Entry Form */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <h3 className="font-display text-lg font-semibold mb-4">Record an entry</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MoneyKind)}
            aria-label="Category"
            className="sm:col-span-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--ink)]"
          >
            {MONEY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            aria-label="Amount"
            className="sm:col-span-3 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (e.g. Salary, groceries, charity)"
            aria-label="Note"
            className="sm:col-span-3 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
          />
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            aria-label="Date"
            className="sm:col-span-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2.5 text-sm font-mono tabular-nums text-[var(--ink)]"
          />
          <button
            type="submit"
            className="sm:col-span-2 min-h-[44px] px-4 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      </section>

      {/* Ledger Table */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-lg font-semibold">Ledger</h3>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--canvas)] border border-[var(--line)] overflow-x-auto">
            {(['All', ...MONEY_KINDS] as (MoneyKind | 'All')[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  kindFilter === k
                    ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="py-6 text-sm text-[var(--ink-muted)]">
            {monthEntries.length === 0
              ? `No entries recorded for ${formatMonthLabel(selectedMonth)}. Add your first entry above.`
              : `No ${kindFilter.toLowerCase()} entries for this month.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-muted)] font-medium">
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 pr-4 font-medium">Type</th>
                  <th className="py-2.5 pr-4 font-medium">Note</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Amount</th>
                  <th className="py-2.5 w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] text-sm">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-[var(--canvas)]/60 transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono tabular-nums text-xs text-[var(--ink-muted)] whitespace-nowrap">
                      {entry.d}
                    </td>
                    <td className="py-3 pr-4 font-medium whitespace-nowrap">
                      <span
                        className={
                          entry.k === 'Earn'
                            ? 'text-[var(--emerald)]'
                            : entry.k === 'Share'
                              ? 'text-[var(--gold)]'
                              : 'text-[var(--ink)]'
                        }
                      >
                        {entry.k}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--ink)]">
                      {entry.n || <span className="text-[var(--ink-muted)]">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                      {entry.v.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`Delete ${entry.k} entry of ${entry.v}`}
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--canvas)] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Giving Guidance & Optional Estimator */}
        <div className="mt-6 pt-5 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
            Generosity & giving: track your Share entries here to keep charity, tithes, or annual
            obligatory giving intentional.
          </p>
          <button
            type="button"
            onClick={() => setShowGivingCalc((v) => !v)}
            className="text-xs font-medium text-[var(--emerald)] hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            {showGivingCalc ? 'Hide giving calculator' : 'Giving % reference calculator'}
          </button>
        </div>

        {showGivingCalc && (
          <div className="mt-4 pt-4 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label htmlFor="giving-base" className="block text-xs text-[var(--ink-muted)] mb-1.5">
                Income or net savings amount
              </label>
              <input
                id="giving-base"
                type="number"
                min="0"
                step="any"
                value={givingBase}
                onChange={(e) => setGivingBase(e.target.value)}
                placeholder="Enter amount"
                className="w-full min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-sm font-mono tabular-nums text-[var(--ink)]"
              />
            </div>
            <div className="sm:col-span-3">
              <span className="block text-xs text-[var(--ink-muted)] mb-1.5">Share rate</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[2.5, 5, 10].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setGivingRate(rate)}
                    className={`min-h-[42px] rounded-xl border text-xs font-mono tabular-nums font-medium transition-colors ${
                      givingRate === rate
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-white dark:text-[#06150f]'
                        : 'bg-[var(--canvas)] border-[var(--line)] text-[var(--ink)]'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-4 p-3 rounded-xl bg-[var(--canvas)] border border-[var(--line)] flex items-baseline justify-between gap-4">
              <span className="text-xs text-[var(--ink-muted)]">{givingRate}% reference</span>
              <span className="font-display text-xl font-semibold tabular-nums text-[var(--gold)]">
                {givingEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
