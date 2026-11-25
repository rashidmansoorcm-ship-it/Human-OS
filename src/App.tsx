import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Compass,
  HeartPulse,
  Moon,
  Sun,
  Target,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { GoalsView } from './components/GoalsView';
import { HealthView } from './components/HealthView';
import { LibraryView } from './components/LibraryView';
import { MoneyView } from './components/MoneyView';
import { Onboarding } from './components/Onboarding';
import { PeopleView } from './components/PeopleView';
import { ProfileModal } from './components/ProfileModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { RemindersView } from './components/RemindersView';
import { TodayView } from './components/TodayView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { registerSW } from 'virtual:pwa-register';
import {
  DailyHealthLog,
  GoalHorizon,
  HumanOSState,
  LifeArea,
  MoneyKind,
  NoteKind,
  SPIRITUAL_ANCHORS,
  SpiritualAnchorKey,
  TabId,
  TaskPriority,
} from './types/humanOs';
import {
  THEME_KEY,
  createEmptyState,
  downloadJson,
  isAnchorDone,
  loadState,
  saveState,
  todayIso,
  uid,
} from './utils/storage';

interface ToastMessage {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const NAV_ITEMS: {
  id: TabId;
  label: string;
  shortLabel: string;
  title: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today', title: 'Today', icon: Compass },
  {
    id: 'health',
    label: 'Health',
    shortLabel: 'Health',
    title: 'Mind & body',
    icon: HeartPulse,
  },
  { id: 'goals', label: 'Goals', shortLabel: 'Goals', title: 'Goals', icon: Target },
  {
    id: 'money',
    label: 'Money',
    shortLabel: 'Money',
    title: 'Earn, spend, save, share',
    icon: Wallet,
  },
  { id: 'people', label: 'People', shortLabel: 'People', title: 'Family & people', icon: Users },
  {
    id: 'library',
    label: 'Library',
    shortLabel: 'Library',
    title: 'Knowledge & writing',
    icon: BookOpen,
  },
  { id: 'remind', label: 'Reminders', shortLabel: 'Remind', title: 'Reminders', icon: Bell },
];

function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export default function App() {
  const [state, setState] = useState<HumanOSState>(() => loadState());
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [isDark, setIsDark] = useState<boolean>(() => getInitialDark());
  const [showProfile, setShowProfile] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isOnline = useOnlineStatus();
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  const firedRemindersRef = useRef<Set<string>>(new Set());

  // Register offline service worker
  useEffect(() => {
    try {
      registerSW({ immediate: true });
    } catch {
      // ignore in environments without SW support
    }
  }, []);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  // Persist state on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const pushToast = useCallback(
    (text: string, actionLabel?: string, onAction?: () => void) => {
      const id = uid();
      setToasts((prev) => [...prev.slice(-2), { id, text, actionLabel, onAction }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Daily reminder checker (uses in-app toast banner + optional browser Notification, never window.alert)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const dayKey = todayIso(now);

      state.rem.forEach((rem) => {
        if (rem.paused || rem.h !== hhmm) return;
        const fireKey = `${dayKey}:${rem.id}:${hhmm}`;
        if (firedRemindersRef.current.has(fireKey)) return;
        firedRemindersRef.current.add(fireKey);

        pushToast(`Reminder (${rem.h}): ${rem.t}`);
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Human OS', { body: rem.t });
          } catch {
            // ignore notification errors in sandboxed iframes
          }
        }
      });
    };

    checkReminders();
    const timer = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(timer);
  }, [state.rem, pushToast]);

  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        pushToast('Browser notifications enabled.');
      }
    } catch {
      pushToast('In-app reminders are active while Human OS is open.');
    }
  };

  // Profile & Backup handlers
  const handleSaveProfile = (profile: {
    name: string;
    age: string;
    stage: string;
    vals: string;
  }) => {
    setState((prev) => ({
      ...prev,
      name: profile.name,
      age: profile.age,
      stage: profile.stage,
      vals: profile.vals,
    }));
  };

  const handleExportBackup = () => {
    downloadJson('human-os.json', state);
    pushToast('Exported backup as human-os.json.');
  };

  const handleImportBackup = (imported: HumanOSState) => {
    setState(imported);
    pushToast('Backup restored on this device.');
  };

  const handleResetAll = () => {
    const fresh = createEmptyState();
    setState(fresh);
    setActiveTab('today');
  };

  // Today & Health handlers
  const handleToggleAnchor = (dateIso: string, anchorKey: SpiritualAnchorKey) => {
    const anchorDef = SPIRITUAL_ANCHORS.find((a) => a.key === anchorKey);
    if (!anchorDef) return;
    setState((prev) => {
      const existing = prev.days[dateIso] ?? { prayers: {}, reflect: {} };
      const nextVal = !isAnchorDone(existing, anchorDef);
      const nextPrayers = { ...existing.prayers, [anchorKey]: nextVal };
      delete nextPrayers[anchorDef.legacyKey];
      return {
        ...prev,
        days: {
          ...prev.days,
          [dateIso]: {
            ...existing,
            prayers: nextPrayers,
          },
        },
      };
    });
  };

  const handleUpdateHealth = (dateIso: string, patch: Partial<DailyHealthLog>) => {
    setState((prev) => {
      const existing = prev.days[dateIso] ?? { prayers: {}, reflect: {} };
      return {
        ...prev,
        days: {
          ...prev.days,
          [dateIso]: {
            ...existing,
            health: {
              ...existing.health,
              ...patch,
            },
          },
        },
      };
    });
  };

  const handleAddTask = (title: string, priority: TaskPriority, due: string) => {
    setState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { id: uid(), t: title, pr: priority, due: due || undefined }],
    }));
  };

  const handleToggleTask = (id: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  };

  const handleDeleteTask = (id: string) => {
    const removed = state.tasks.find((t) => t.id === id);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
    if (removed) {
      pushToast(`Removed “${removed.t}”`, 'Undo', () => {
        setState((prev) => ({ ...prev, tasks: [...prev.tasks, removed] }));
      });
    }
  };

  const handleUpdateReflection = (dateIso: string, index: number, value: string) => {
    setState((prev) => {
      const existing = prev.days[dateIso] ?? { prayers: {}, reflect: {} };
      return {
        ...prev,
        days: {
          ...prev.days,
          [dateIso]: {
            ...existing,
            reflect: {
              ...existing.reflect,
              [String(index)]: value,
            },
          },
        },
      };
    });
  };

  // Goals handlers
  const handleAddGoal = (title: string, area: LifeArea, horizon: GoalHorizon) => {
    setState((prev) => ({
      ...prev,
      goals: [...prev.goals, { id: uid(), t: title, a: area, h: horizon, p: 0 }],
    }));
  };

  const handleUpdateGoalProgress = (id: string, progress: number) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, p: progress } : g)),
    }));
  };

  const handleDeleteGoal = (id: string) => {
    const removed = state.goals.find((g) => g.id === id);
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
    if (removed) {
      pushToast(`Removed goal “${removed.t}”`, 'Undo', () => {
        setState((prev) => ({ ...prev, goals: [...prev.goals, removed] }));
      });
    }
  };

  // Money handlers
  const handleAddMoney = (kind: MoneyKind, value: number, note: string, date: string) => {
    setState((prev) => ({
      ...prev,
      money: [...prev.money, { id: uid(), k: kind, v: value, n: note, d: date }],
    }));
  };

  const handleDeleteMoney = (id: string) => {
    const removed = state.money.find((m) => m.id === id);
    setState((prev) => ({
      ...prev,
      money: prev.money.filter((m) => m.id !== id),
    }));
    if (removed) {
      pushToast(`Removed ${removed.k.toLowerCase()} entry`, 'Undo', () => {
        setState((prev) => ({ ...prev, money: [...prev.money, removed] }));
      });
    }
  };

  // People handlers
  const handleAddPerson = (name: string, relation: string, everyDays: number, note: string) => {
    setState((prev) => ({
      ...prev,
      people: [
        ...prev.people,
        {
          id: uid(),
          name,
          rel: relation,
          every: everyDays,
          last: 0,
          note: note || undefined,
        },
      ],
    }));
  };

  const handleMarkContacted = (id: string) => {
    const target = state.people.find((p) => p.id === id);
    const prevLast = target?.last ?? 0;
    setState((prev) => ({
      ...prev,
      people: prev.people.map((p) => (p.id === id ? { ...p, last: Date.now() } : p)),
    }));
    if (target) {
      pushToast(`Marked ${target.name} as contacted today.`, 'Undo', () => {
        setState((prev) => ({
          ...prev,
          people: prev.people.map((p) => (p.id === id ? { ...p, last: prevLast } : p)),
        }));
      });
    }
  };

  const handleDeletePerson = (id: string) => {
    const removed = state.people.find((p) => p.id === id);
    setState((prev) => ({
      ...prev,
      people: prev.people.filter((p) => p.id !== id),
    }));
    if (removed) {
      pushToast(`Removed ${removed.name}`, 'Undo', () => {
        setState((prev) => ({ ...prev, people: [...prev.people, removed] }));
      });
    }
  };

  // Library handlers
  const handleAddNote = (kind: NoteKind, title: string, body: string) => {
    setState((prev) => ({
      ...prev,
      notes: [...prev.notes, { id: uid(), k: kind, t: title, b: body, d: todayIso() }],
    }));
    pushToast('Saved entry to Library.');
  };

  const handleUpdateNote = (id: string, title: string, body: string, kind: NoteKind) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, t: title, b: body, k: kind } : n)),
    }));
    pushToast('Updated entry.');
  };

  const handleDeleteNote = (id: string) => {
    const removed = state.notes.find((n) => n.id === id);
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
    if (removed) {
      pushToast('Deleted note from Library', 'Undo', () => {
        setState((prev) => ({ ...prev, notes: [...prev.notes, removed] }));
      });
    }
  };

  const handleBulkImportNotes = (entries: string[]) => {
    const date = todayIso();
    setState((prev) => ({
      ...prev,
      notes: [
        ...prev.notes,
        ...entries.map((b) => ({ id: uid(), k: 'Thought' as const, t: '', b, d: date })),
      ],
    }));
    pushToast(`Imported ${entries.length} ${entries.length === 1 ? 'thought' : 'thoughts'}.`);
  };

  // Reminder handlers
  const handleAddReminder = (title: string, time: string) => {
    setState((prev) => ({
      ...prev,
      rem: [...prev.rem, { id: uid(), t: title, h: time, paused: false }],
    }));
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then((perm) => setNotifPermission(perm))
        .catch(() => {});
    }
  };

  const handleToggleReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      rem: prev.rem.map((r) => (r.id === id ? { ...r, paused: !r.paused } : r)),
    }));
  };

  const handleDeleteReminder = (id: string) => {
    setState((prev) => ({
      ...prev,
      rem: prev.rem.filter((r) => r.id !== id),
    }));
  };

  if (!state.name) {
    return (
      <Onboarding
        noteCount={state.notes.length}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onComplete={handleSaveProfile}
        onImportBackup={handleImportBackup}
      />
    );
  }

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col lg:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-[var(--line)] bg-[var(--surface)] px-4 py-6 justify-between">
        <div>
          <div className="px-3 mb-7">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className="font-display text-xl font-semibold tracking-tight text-[var(--ink)] whitespace-nowrap"
            >
              Human OS
            </button>
          </div>

          <nav aria-label="Primary navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--emerald-soft)] text-[var(--emerald)] font-semibold'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[var(--line)] space-y-1.5">
          <PWAInstallButton variant="sidebar" />
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-3 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)] transition-colors whitespace-nowrap"
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{state.name}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-3 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)] transition-colors whitespace-nowrap"
          >
            {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--canvas)]/90 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-baseline gap-3">
              <h1 className="font-display text-lg sm:text-2xl font-semibold tracking-tight truncate">
                {currentNav.title}
              </h1>
              <span className="hidden md:inline text-xs font-mono tabular-nums text-[var(--ink-muted)] whitespace-nowrap">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="lg:hidden">
                <PWAInstallButton variant="header" />
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                aria-label="Profile and backup settings"
                className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="hidden lg:inline-flex min-h-[38px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Profile & backup</span>
              </button>
            </div>
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
          {activeTab === 'today' && (
            <TodayView
              state={state}
              onToggleAnchor={handleToggleAnchor}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onUpdateReflection={handleUpdateReflection}
              onMarkContacted={handleMarkContacted}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'health' && (
            <HealthView days={state.days} onUpdateHealth={handleUpdateHealth} />
          )}

          {activeTab === 'goals' && (
            <GoalsView
              goals={state.goals}
              onAddGoal={handleAddGoal}
              onUpdateProgress={handleUpdateGoalProgress}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'money' && (
            <MoneyView
              entries={state.money}
              onAddEntry={handleAddMoney}
              onDeleteEntry={handleDeleteMoney}
            />
          )}

          {activeTab === 'people' && (
            <PeopleView
              people={state.people}
              onAddPerson={handleAddPerson}
              onMarkContacted={handleMarkContacted}
              onDeletePerson={handleDeletePerson}
            />
          )}

          {activeTab === 'library' && (
            <LibraryView
              notes={state.notes}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onBulkImport={handleBulkImportNotes}
              onExportBackup={handleExportBackup}
            />
          )}

          {activeTab === 'remind' && (
            <RemindersView
              reminders={state.rem}
              notificationPermission={notifPermission}
              onRequestNotifications={handleRequestNotifications}
              onAddReminder={handleAddReminder}
              onToggleReminder={handleToggleReminder}
              onDeleteReminder={handleDeleteReminder}
              onTestReminder={(label) => pushToast(`Reminder preview: ${label}`)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md pb-safe"
      >
        <div className="flex items-center overflow-x-auto h-14 px-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[var(--emerald)] font-semibold' : 'text-[var(--ink-muted)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] leading-none whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Profile & Backup Modal */}
      {showProfile && (
        <ProfileModal
          state={state}
          onClose={() => setShowProfile(false)}
          onSaveProfile={handleSaveProfile}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onResetAll={handleResetAll}
        />
      )}

      {/* Non-blocking Offline Indicator */}
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-16 lg:bottom-6 left-4 z-50 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-md px-3.5 py-2 text-xs font-medium"
        >
          Offline mode · All data is saved locally on this device
        </div>
      )}

      {/* Non-blocking In-App Toast Stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-18 lg:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-lg px-4 py-3 flex items-center justify-between gap-3 text-sm"
            >
              <span className="leading-snug">{toast.text}</span>
              <div className="flex items-center gap-2 shrink-0">
                {toast.actionLabel && toast.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismissToast(toast.id);
                    }}
                    className="text-xs font-semibold text-[var(--emerald)] hover:underline whitespace-nowrap"
                  >
                    {toast.actionLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
