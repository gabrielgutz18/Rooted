import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { analyze } from '../lib/analyze';
import { SUBJECT_PROMPTS } from '../lib/growth';
import type { Entry, EntryInput } from '../lib/backend';

const clockFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const stampFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Subject + note. The date and time are recorded automatically when you save. */
export function Composer({ onSave }: { onSave(input: EntryInput): Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  // A different question each visit, and a new one after every saved note.
  const [prompt, setPrompt] = useState(() => SUBJECT_PROMPTS[Math.floor(Math.random() * SUBJECT_PROMPTS.length)]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const result = useMemo(() => analyze(subject, note), [subject, note]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() && !note.trim()) return setError('Write a subject or a note first.');
    setBusy(true);
    setError(null);
    try {
      await onSave({ subject: subject.trim() || prompt, note: note.trim(), points: result.points, tags: result.tags });
      setSubject('');
      setNote('');
      setPrompt((p) => {
        const rest = SUBJECT_PROMPTS.filter((x) => x !== p);
        return rest[Math.floor(Math.random() * rest.length)];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="px-panel composer" onSubmit={submit}>
      <div className="composer-head">
        <h2 className="panel-title">Today’s note</h2>
        <time className="muted stamp">{clockFmt.format(now)}</time>
      </div>
      <label className="field">
        <span className="field-label">Subject</span>
        <input type="text" value={subject} maxLength={200} placeholder={prompt} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label className="field">
        <span className="field-label">Note</span>
        <textarea
          value={note}
          rows={6}
          maxLength={20000}
          placeholder="Write it like a diary — what happened, what you learned, verses you read, who you prayed for…"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="analysis" aria-live="polite">
        <strong className="analysis-points">+{result.points} growth</strong>
        {result.parts.length === 0 ? (
          <span className="muted">Start writing — the tree reads your words and grows.</span>
        ) : (
          result.parts.map((p) => (
            <span key={p.label} className="tag">
              {p.label} <b>+{p.points}</b>
            </span>
          ))
        )}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="composer-foot">
        <span className="muted small">Date and time are saved automatically.</span>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </form>
  );
}

export function Notes({ entries, loading, onDelete }: { entries: Entry[]; loading: boolean; onDelete(id: string): Promise<void> }) {
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => `${e.subject} ${e.note} ${e.tags.join(' ')}`.toLowerCase().includes(q)) : entries;
  }, [entries, query]);

  return (
    <section className="px-panel" aria-labelledby="notes-title">
      <div className="composer-head">
        <h2 id="notes-title" className="panel-title">
          My notes
        </h2>
        <span className="muted">
          {entries.length} {entries.length === 1 ? 'note' : 'notes'}
        </span>
      </div>
      {entries.length > 3 && (
        <input className="search" type="search" placeholder="Search my notes…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search notes" />
      )}
      {loading ? (
        <p className="empty">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No notes yet.</p>
          <p>Write your first one above and watch the seed wake up.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="empty">Nothing matches.</p>
      ) : (
        <ul className="note-list">
          {visible.map((e) => {
            const long = e.note.length > 280;
            const expanded = open === e.id;
            return (
              <li key={e.id} className="note">
                <div className="note-head">
                  <h3 className="note-subject">{e.subject}</h3>
                  <span className="note-points">+{e.points}</span>
                </div>
                <time className="muted small" dateTime={e.created_at}>
                  {stampFmt.format(new Date(e.created_at))}
                </time>
                {e.note && <p className={`note-body ${long && !expanded ? 'is-clamped' : ''}`}>{e.note}</p>}
                <div className="note-foot">
                  <span className="tags">
                    {e.tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </span>
                  <span className="note-actions">
                    {long && (
                      <button className="link" onClick={() => setOpen(expanded ? null : e.id)}>
                        {expanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                    {confirm === e.id ? (
                      <>
                        <button className="link danger" onClick={() => onDelete(e.id).finally(() => setConfirm(null))}>
                          Yes, delete
                        </button>
                        <button className="link" onClick={() => setConfirm(null)}>
                          Keep
                        </button>
                      </>
                    ) : (
                      <button className="link" onClick={() => setConfirm(e.id)}>
                        Delete
                      </button>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
