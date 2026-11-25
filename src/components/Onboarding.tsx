import React, { useRef, useState } from 'react';
import { Moon, Sun, Upload } from 'lucide-react';
import { HumanOSState, LIFE_STAGES } from '../types/humanOs';
import { validateImportedState } from '../utils/storage';

interface OnboardingProps {
  noteCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onComplete: (profile: {
    name: string;
    age: string;
    stage: string;
    vals: string;
  }) => void;
  onImportBackup: (state: HumanOSState) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  noteCount,
  isDark,
  onToggleTheme,
  onComplete,
  onImportBackup,
}) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [stage, setStage] = useState('');
  const [vals, setVals] = useState('');
  const [error, setError] = useState('');
  const [importError, setImportError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const gregorian = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to begin.');
      nameRef.current?.focus();
      return;
    }
    setError('');
    onComplete({
      name: trimmed,
      age: age.trim(),
      stage,
      vals: vals.trim(),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const validated = validateImportedState(parsed);
        if (!validated) {
          setImportError('That file does not look like a Human OS backup.');
          return;
        }
        if (!validated.name) {
          validated.name = 'Friend';
        }
        onImportBackup(validated);
      } catch {
        setImportError('Could not read that JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col">
      <header className="w-full max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-8">
        <span className="font-display text-xl font-semibold tracking-tight whitespace-nowrap shrink-0">
          Human OS
        </span>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--ink-muted)] font-mono tabular-nums">
          <span>{gregorian}</span>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--emerald)] transition-colors shrink-0"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left column: Hero invitation */}
        <section
          className="lg:col-span-5 rounded-2xl p-8 lg:p-10 flex flex-col justify-between text-[#f4efe0]"
          style={{
            backgroundColor: 'var(--emerald-deep)',
            backgroundImage:
              'radial-gradient(circle at 100% 0%, rgba(176, 141, 60, 0.28) 0%, rgba(176, 141, 60, 0) 58%)',
          }}
        >
          <div className="space-y-5">
            <p className="text-xs font-mono tracking-wide text-[#e3c987]">
              Private · On this device
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-[#f4efe0]">
              Live with purpose. Grow with wisdom. Leave with legacy.
            </h1>
            <p className="text-sm sm:text-base text-[#f4efe0]/85 leading-relaxed">
              A quiet daily space to remember God or your Master, tend mind and body, focus your
              work, care for family, steward your money, and write what endures.
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-white/15 space-y-4">
            <blockquote className="font-display italic text-lg text-[#e3c987] leading-snug">
              “With every hardship comes ease.”
            </blockquote>
            <p className="text-xs text-[#f4efe0]/75">
              Timeless Wisdom · {noteCount} reflections preloaded in your Library
            </p>
          </div>
        </section>

        {/* Right column: Begin form */}
        <section className="lg:col-span-7 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Begin</h2>
              <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
                Everything stays on this device. All questions are optional except your name.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="onboard-name" className="block text-sm font-medium mb-1.5">
                  Your name
                </label>
                <input
                  ref={nameRef}
                  id="onboard-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="How should Human OS greet you?"
                  autoFocus
                  className="w-full min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
                />
                {error && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--danger)]" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="onboard-age" className="block text-sm font-medium mb-1.5">
                    Age <span className="text-[var(--ink-muted)] font-normal">(optional)</span>
                  </label>
                  <input
                    id="onboard-age"
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 32"
                    className="w-full min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
                  />
                </div>

                <div>
                  <label htmlFor="onboard-stage" className="block text-sm font-medium mb-1.5">
                    Life stage{' '}
                    <span className="text-[var(--ink-muted)] font-normal">(optional)</span>
                  </label>
                  <select
                    id="onboard-stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)]"
                  >
                    <option value="">Select a stage</option>
                    {LIFE_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="onboard-vals" className="block text-sm font-medium mb-1.5">
                  What matters most to you right now?{' '}
                  <span className="text-[var(--ink-muted)] font-normal">(optional)</span>
                </label>
                <textarea
                  id="onboard-vals"
                  rows={3}
                  value={vals}
                  onChange={(e) => setVals(e.target.value)}
                  placeholder="Faith, family, learning, health, honest work…"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70 resize-y"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onComplete({
                      name: 'Friend',
                      age: '',
                      stage: '',
                      vals: '',
                    })
                  }
                  className="min-h-[44px] px-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap shrink-0"
                >
                  Continue as guest
                </button>
              </div>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-[40px] inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restore backup</span>
                </button>
              </div>
            </div>

            {importError && (
              <p className="text-xs font-medium text-[var(--danger)]" role="alert">
                {importError}
              </p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
};
