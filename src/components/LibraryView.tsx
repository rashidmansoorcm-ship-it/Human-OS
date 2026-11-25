import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { NOTE_KINDS, Note, NoteKind } from '../types/humanOs';
import { countWords, downloadText } from '../utils/storage';

interface LibraryViewProps {
  notes: Note[];
  onAddNote: (kind: NoteKind, title: string, body: string) => void;
  onUpdateNote: (id: string, title: string, body: string, kind: NoteKind) => void;
  onDeleteNote: (id: string) => void;
  onBulkImport: (entries: string[]) => void;
  onExportBackup: () => void;
}

const MALAYALAM_RE = /[\u0D00-\u0D7F]/;

export const LibraryView: React.FC<LibraryViewProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onBulkImport,
  onExportBackup,
}) => {
  const [kind, setKind] = useState<NoteKind>('Thought');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<NoteKind | 'All'>('All');
  const [visibleLimit, setVisibleLimit] = useState(12);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<NoteKind>('Thought');
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // Bulk import drawer
  const [showImport, setShowImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const totalWords = useMemo(
    () => notes.reduce((sum, n) => sum + countWords(n.b), 0),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...notes]
      .reverse()
      .filter((n) => {
        if (kindFilter !== 'All' && n.k !== kindFilter) return false;
        if (!q) return true;
        return (n.t + ' ' + n.b).toLowerCase().includes(q);
      });
  }, [notes, query, kindFilter]);

  const draftWords = countWords(body);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody) return;
    onAddNote(kind, title.trim(), trimmedBody);
    setTitle('');
    setBody('');
  };

  const handleBulkSubmit = () => {
    const parts = bulkText
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onBulkImport(parts);
    setBulkText('');
    setShowImport(false);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditKind(note.k);
    setEditTitle(note.t);
    setEditBody(note.b);
  };

  const saveEdit = () => {
    if (!editingId || !editBody.trim()) return;
    onUpdateNote(editingId, editTitle.trim(), editBody.trim(), editKind);
    setEditingId(null);
  };

  const handleCopy = async (note: Note) => {
    const full = note.t ? `${note.t}\n\n${note.b}` : note.b;
    try {
      await navigator.clipboard.writeText(full);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId((prev) => (prev === note.id ? null : prev)), 1800);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  const handleExportMarkdown = () => {
    const lines = [
      '# Human OS — Library & Reflections',
      '',
      ...notes.map((n) => {
        const heading = n.t ? `## ${n.t}` : `## ${n.k} (${n.d})`;
        return `${heading}\n\n*${n.k} · ${n.d}*\n\n${n.b}\n`;
      }),
    ];
    downloadText('human-os-library.md', lines.join('\n'));
  };

  return (
    <div className="space-y-6">
      {/* Write New Entry */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Write</h2>
            <p className="text-xs text-[var(--ink-muted)] font-mono tabular-nums mt-0.5">
              {notes.length} entries · {totalWords.toLocaleString()} words stored on this device
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="min-h-[38px] px-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk import</span>
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="min-h-[38px] px-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Markdown</span>
            </button>
            <button
              type="button"
              onClick={onExportBackup}
              className="min-h-[38px] px-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink)] hover:border-[var(--emerald)] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON backup</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as NoteKind)}
              aria-label="Entry type"
              className="sm:w-44 min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--ink)]"
            >
              {NOTE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              aria-label="Title"
              className="flex-1 min-h-[42px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
            />
          </div>

          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (body.trim()) {
                  onAddNote(kind, title.trim(), body.trim());
                  setTitle('');
                  setBody('');
                }
              }
            }}
            placeholder="Write a thought, chapter draft, reading note, or reflection…"
            aria-label="Entry body"
            className={`w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/65 resize-y ${
              MALAYALAM_RE.test(body) ? 'prose-malayalam' : 'leading-relaxed'
            }`}
          />

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              {draftWords} {draftWords === 1 ? 'word' : 'words'} · Ctrl/⌘ + Enter to save
            </span>
            <button
              type="submit"
              disabled={!body.trim()}
              className="min-h-[42px] px-5 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-45 transition-opacity whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Save entry</span>
            </button>
          </div>
        </form>

        {/* Collapsible Bulk Importer */}
        {showImport && (
          <div className="mt-5 pt-5 border-t border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink)]">Import thoughts</h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Paste your writing below. Separate each thought with a blank line.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImport(false)}
                aria-label="Close bulk import"
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={5}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'First thought...\n\nSecond thought...'}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                {
                  bulkText
                    .split(/\n\s*\n/)
                    .map((s) => s.trim())
                    .filter(Boolean).length
                }{' '}
                entries detected
              </span>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={!bulkText.trim()}
                className="min-h-[40px] px-4 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-xs font-semibold hover:opacity-90 disabled:opacity-45 transition-opacity whitespace-nowrap shrink-0"
              >
                Import entries
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Search, Filter & Reading List */}
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleLimit(12);
              }}
              placeholder={`Search ${notes.length} notes (English or Malayalam)…`}
              aria-label="Search notes"
              className="w-full min-h-[42px] pl-10 pr-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--canvas)] border border-[var(--line)] overflow-x-auto">
            {(['All', ...NOTE_KINDS] as (NoteKind | 'All')[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKindFilter(k);
                  setVisibleLimit(12);
                }}
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

        <p className="text-xs font-mono tabular-nums text-[var(--ink-muted)] mb-4">
          Showing {Math.min(visibleLimit, filteredNotes.length)} of {filteredNotes.length}{' '}
          {filteredNotes.length === 1 ? 'entry' : 'entries'}
        </p>

        {filteredNotes.length === 0 ? (
          <p className="py-8 text-sm text-[var(--ink-muted)]">
            No matching entries found. Try a different word or clear the filter.
          </p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filteredNotes.slice(0, visibleLimit).map((note) => {
              const isMalayalam = MALAYALAM_RE.test(note.b);
              const isLong = note.b.length > 260;
              const isExpanded = Boolean(expanded[note.id]);
              const isEditing = editingId === note.id;
              const wc = countWords(note.b);

              if (isEditing) {
                return (
                  <article key={note.id} className="py-5 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={editKind}
                        onChange={(e) => setEditKind(e.target.value as NoteKind)}
                        className="sm:w-40 min-h-[40px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 text-sm text-[var(--ink)]"
                      >
                        {NOTE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="flex-1 min-h-[40px] rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 text-sm text-[var(--ink)]"
                      />
                    </div>
                    <textarea
                      rows={5}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className={`w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2.5 text-sm text-[var(--ink)] resize-y ${
                        MALAYALAM_RE.test(editBody) ? 'prose-malayalam' : 'leading-relaxed'
                      }`}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-[38px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="min-h-[38px] px-4 rounded-xl bg-[var(--emerald)] text-white dark:text-[#06150f] text-xs font-semibold"
                      >
                        Save changes
                      </button>
                    </div>
                  </article>
                );
              }

              return (
                <article key={note.id} className="py-5 first:pt-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 max-w-[68ch]">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--ink-muted)] font-mono tabular-nums mb-1.5">
                        <span className="font-medium text-[var(--emerald)]">{note.k}</span>
                        <span aria-hidden="true">·</span>
                        <span>{note.d}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {wc} {wc === 1 ? 'word' : 'words'}
                        </span>
                      </div>

                      {note.t && (
                        <h3 className="font-display text-lg font-semibold text-[var(--ink)] mb-1.5">
                          {note.t}
                        </h3>
                      )}

                      <p
                        className={`text-[15px] text-[var(--ink)] whitespace-pre-wrap break-words ${
                          isMalayalam ? 'prose-malayalam' : 'leading-relaxed'
                        }`}
                      >
                        {isLong && !isExpanded ? `${note.b.slice(0, 260).trim()}…` : note.b}
                      </p>

                      {isLong && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [note.id]: !prev[note.id] }))
                          }
                          className="mt-2 text-xs font-medium text-[var(--emerald)] hover:underline"
                        >
                          {isExpanded ? 'Show less' : 'Read full entry'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(note)}
                        aria-label="Copy entry"
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)] transition-colors"
                      >
                        {copiedId === note.id ? (
                          <Check className="w-4 h-4 text-[var(--emerald)]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        aria-label="Edit entry"
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label="Delete entry"
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--canvas)] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {filteredNotes.length > visibleLimit && (
          <div className="pt-5 border-t border-[var(--line)] flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setVisibleLimit((n) => n + 20)}
              className="min-h-[42px] px-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)] text-sm font-medium text-[var(--ink)] hover:border-[var(--emerald)] transition-colors whitespace-nowrap"
            >
              Load more ({filteredNotes.length - visibleLimit} remaining)
            </button>
            <button
              type="button"
              onClick={() => setVisibleLimit(filteredNotes.length)}
              className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] whitespace-nowrap"
            >
              Show all
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
