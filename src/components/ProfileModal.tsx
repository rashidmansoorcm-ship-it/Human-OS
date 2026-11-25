import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload, X } from 'lucide-react';
import { HumanOSState, LIFE_STAGES } from '../types/humanOs';
import { validateImportedState } from '../utils/storage';

interface ProfileModalProps {
  state: HumanOSState;
  onClose: () => void;
  onSaveProfile: (profile: {
    name: string;
    age: string;
    stage: string;
    vals: string;
  }) => void;
  onExportBackup: () => void;
  onImportBackup: (next: HumanOSState) => void;
  onResetAll: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  state,
  onClose,
  onSaveProfile,
  onExportBackup,
  onImportBackup,
  onResetAll,
}) => {
  const [name, setName] = useState(state.name ?? '');
  const [age, setAge] = useState(state.age ?? '');
  const [stage, setStage] = useState(state.stage ?? '');
  const [vals, setVals] = useState(state.vals ?? '');
  const [importError, setImportError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveProfile({
      name: name.trim(),
      age: age.trim(),
      stage,
      vals: vals.trim(),
    });
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const validated = validateImportedState(parsed);
        if (!validated) {
          setImportError('Invalid Human OS backup file.');
          return;
        }
        if (!validated.name) validated.name = state.name || 'Friend';
        onImportBackup(validated);
        onClose();
      } catch {
        setImportError('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="profile-modal-title" className="font-display text-xl font-semibold">
              Profile & device data
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              All information stays locally in your browser storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-medium mb-1">
              Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-sm text-[var(--ink)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-age" className="block text-xs font-medium mb-1">
                Age
              </label>
              <input
                id="prof-age"
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-sm font-mono tabular-nums text-[var(--ink)]"
              />
            </div>

            <div>
              <label htmlFor="prof-stage" className="block text-xs font-medium mb-1">
                Life stage
              </label>
              <select
                id="prof-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                <option value="">Not set</option>
                {LIFE_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="prof-vals" className="block text-xs font-medium mb-1">
              What matters most right now
            </label>
            <textarea
              id="prof-vals"
              rows={3}
              value={vals}
              onChange={(e) => setVals(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-xs font-semibold hover:opacity-90"
            >
              Save profile
            </button>
          </div>
        </form>

        {/* Backup & Restore */}
        <div className="pt-5 border-t border-[var(--line)] space-y-3">
          <h3 className="text-sm font-semibold">Backup & restore</h3>
          <p className="text-xs text-[var(--ink-muted)]">
            Compatible with Human OS JSON exports (`human-os.json`).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="min-h-[40px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export backup</span>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[40px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import backup</span>
            </button>
          </div>
          {importError && (
            <p className="text-xs font-medium text-[var(--danger)]" role="alert">
              {importError}
            </p>
          )}
        </div>

        {/* Reset Device Data */}
        <div className="pt-5 border-t border-[var(--line)] space-y-3">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[38px] px-3 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--danger)] hover:bg-[var(--canvas)] inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset this device</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl border border-[var(--danger)]/40 bg-[var(--canvas)] space-y-2.5">
              <p className="text-xs text-[var(--ink)]">
                Clear all tasks, goals, finances, people, and custom notes on this device? Export a
                backup first if you want to keep your records.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetAll();
                    onClose();
                  }}
                  className="min-h-[36px] px-3.5 rounded-lg bg-[var(--danger)] text-white text-xs font-semibold"
                >
                  Confirm reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[36px] px-3 rounded-lg border border-[var(--line)] text-xs text-[var(--ink-muted)]"
                >
                  Keep data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
