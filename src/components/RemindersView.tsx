import React, { useState } from 'react';
import { Bell, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { Reminder } from '../types/humanOs';

interface RemindersViewProps {
  reminders: Reminder[];
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => void;
  onAddReminder: (title: string, time: string) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onTestReminder: (title: string) => void;
}

const PRESETS: { title: string; time: string }[] = [
  { title: 'Morning remembrance & intentions', time: '06:00' },
  { title: 'Midday pause & breath reset', time: '13:00' },
  { title: 'Check in with family', time: '18:30' },
  { title: 'Evening reflection & mind check-in', time: '21:30' },
];

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  notificationPermission,
  onRequestNotifications,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onTestReminder,
}) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('21:00');

  const sorted = [...reminders].sort((a, b) => a.h.localeCompare(b.h));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = title.trim();
    if (!cleaned || !time) return;
    onAddReminder(cleaned, time);
    setTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Add Reminder Card */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Daily reminders</h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Gentle cues that fire in-app and via browser notifications while Human OS is open.
            </p>
          </div>

          {notificationPermission === 'default' && (
            <button
              type="button"
              onClick={onRequestNotifications}
              className="min-h-[38px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable browser alerts</span>
            </button>
          )}
          {notificationPermission === 'granted' && (
            <span className="text-xs font-mono text-[var(--emerald)]">
              Browser alerts enabled
            </span>
          )}
          {notificationPermission === 'denied' && (
            <span className="text-xs text-[var(--ink-muted)]">
              Browser alerts blocked · in-app banners active
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-wrap sm:flex-nowrap gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reminder label (e.g. Evening reflection, Read 10 pages)"
            aria-label="Reminder label"
            className="flex-1 min-w-[200px] min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Reminder time"
            className="min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[var(--ink)]"
          />
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>

        {/* Quick Presets */}
        <div className="mt-5 pt-4 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--ink-muted)] mb-2.5">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => onAddReminder(preset.title, preset.time)}
                className="min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap"
              >
                <span className="font-mono tabular-nums text-[var(--ink-muted)] mr-1.5">
                  {preset.time}
                </span>
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Active Reminders List */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-lg font-semibold">Scheduled</h3>
          <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
            {reminders.filter((r) => !r.paused).length} active · {reminders.length} total
          </span>
        </div>

        {sorted.length === 0 ? (
          <p className="py-6 text-sm text-[var(--ink-muted)]">
            No reminders yet. Add one above or tap a quick preset to begin.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {sorted.map((rem) => (
              <li
                key={rem.id}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-baseline gap-4 min-w-0 flex-1">
                  <span
                    className={`font-mono tabular-nums text-base font-medium shrink-0 ${
                      rem.paused ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--emerald)]'
                    }`}
                  >
                    {rem.h}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        rem.paused ? 'text-[var(--ink-muted)]' : 'text-[var(--ink)]'
                      }`}
                    >
                      {rem.t}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {rem.paused ? 'Paused' : 'Daily'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTestReminder(rem.t)}
                    className="min-h-[36px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleReminder(rem.id)}
                    aria-label={rem.paused ? `Resume ${rem.t}` : `Pause ${rem.t}`}
                    className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                  >
                    {rem.paused ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(rem.id)}
                    aria-label={`Delete reminder ${rem.t}`}
                    className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--canvas)] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
