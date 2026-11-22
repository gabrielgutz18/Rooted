import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { analyze, type Part } from '../lib/analyze';
import { errorText, tagName, useT, type Strings } from '../lib/i18n';
import { backend, type Entry, type EntryEdit, type EntryInput } from '../lib/backend';
import { checkNote, noteLimit, NOTES_PER_DAY, type LimitIssue, type NoteIssue } from '../lib/spam';
import { BlessedTag } from './Visitor';

const partLabel = (t: Strings, p: Part) =>
  p.kind === 'show'
    ? t.partShow
    : p.kind === 'scripture'
      ? t.partScripture(p.n ?? 1)
      : p.kind === 'words'
        ? t.partWords(p.n ?? 0)
        : p.kind === 'offtopic'
          ? t.partOffTopic
          : tagName(t, p.label);

type Problem = { empty: true } | { save: string } | { issue: NoteIssue | LimitIssue };

function problemText(t: Strings, p: Problem): string {
  if ('empty' in p) return t.writeFirst;
  if ('save' in p) return t.couldNotSave(p.save && errorText(t, p.save));
  const i = p.issue;
  switch (i.kind) {
    case 'junk':
      return t.junkWords(i.words);
    case 'repeat':
      return t.junkRepeat;
    case 'short':
      return t.junkShort;
    case 'same':
      return t.sameNote;
    case 'fast':
      return t.tooFast(t.inTime(i.wait));
    case 'many':
      return t.tooMany(NOTES_PER_DAY, t.inTime(i.wait));
  }
}

/**
 * Subject + note. The date and time are recorded automatically when you save.
 * `entries` (saved and waiting) are what the spam limits count. `bonus`: Jesus is visiting, and
 * the note will grow the tree this many times over (the app multiplies the points when it saves).
 */
export function Composer({ entries, bonus = 1, onSave }: { entries: Entry[]; bonus?: number; onSave(input: EntryInput): Promise<void> }) {
  const t = useT();
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Problem | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(() => navigator.onLine);
  // A different question each visit, and a new one after every saved note.
  // Kept as a number so it follows the language when that changes.
  const [prompt, setPrompt] = useState(() => Math.floor(Math.random() * t.prompts.length));
  const clockFmt = useMemo(
    () => new Intl.DateTimeFormat(t.locale, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    [t.locale],
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 20000);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const result = useMemo(() => analyze(subject, note), [subject, note]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() && !note.trim()) return setError({ empty: true });
    const next = { subject: subject.trim() || t.prompts[prompt], note: note.trim() };
    const issue = checkNote(subject, note) ?? noteLimit(entries, next);
    if (issue) return setError({ issue });
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...next, points: result.points, tags: result.tags });
      setSubject('');
      setNote('');
      setPrompt((p) => (p + 1 + Math.floor(Math.random() * (t.prompts.length - 1))) % t.prompts.length);
    } catch (err) {
      // Supabase errors are plain objects, not Error instances; show their message too.
      const m = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
      setError({ save: m });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="px-panel composer" onSubmit={submit}>
      <div className="composer-head">
        <h2 className="panel-title">{t.todaysNote}</h2>
        <time className="muted stamp">{clockFmt.format(now)}</time>
      </div>
      <label className="field">
        <span className="field-label">{t.subject}</span>
        <input
          type="text"
          value={subject}
          maxLength={200}
          placeholder={t.prompts[prompt]}
          onChange={(e) => {
            setSubject(e.target.value);
            setError(null);
          }}
        />
      </label>
      <label className="field">
        <span className="field-label">{t.note}</span>
        <textarea
          value={note}
          rows={6}
          maxLength={20000}
          placeholder={t.notePlaceholder}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
        />
      </label>

      <div className="analysis" aria-live="polite">
        <strong className="analysis-points">{t.plusGrowth(result.points * bonus)}</strong>
        {bonus > 1 && <BlessedTag points={result.points} />}
        {result.parts.length === 0 ? (
          <span className="muted">{t.startWriting}</span>
        ) : (
          result.parts.map((p) => (
            <span key={p.label} className="tag">
              {partLabel(t, p)} <b>+{p.points}</b>
            </span>
          ))
        )}
        {result.parts[0]?.kind === 'offtopic' && <span className="muted small">{t.offTopicHint}</span>}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {problemText(t, error)}
        </p>
      )}
      <div className="composer-foot">
        <span className="muted small">{online ? (backend.mode === 'cloud' ? t.autoDatePrivate : t.autoDate) : t.offlineNote}</span>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? t.saving : t.saveNote}
        </button>
      </div>
    </form>
  );
}

const saveError = (err: unknown): Problem => ({
  save: err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '',
});

/**
 * Rewrites an older note in place. Only the words change: the note keeps its date and the
 * growth it earned (so editing can't be used to grow the tree), and its tags follow the new words.
 */
function EditNote({ entry, onSave, onCancel }: { entry: Entry; onSave(edit: EntryEdit): Promise<void>; onCancel(): void }) {
  const t = useT();
  const [subject, setSubject] = useState(entry.subject);
  const [note, setNote] = useState(entry.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Problem | null>(null);
  const body = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() && !note.trim()) return setError({ empty: true });
    const issue = checkNote(subject, note);
    if (issue) return setError({ issue });
    const next = { subject: subject.trim() || entry.subject, note: note.trim() };
    if (next.subject === entry.subject && next.note === entry.note) return onCancel(); // nothing changed
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...next, tags: analyze(next.subject, next.note).tags });
    } catch (err) {
      setError(saveError(err));
      setBusy(false);
    }
  }

  return (
    <form
      className="note-edit"
      onSubmit={submit}
      aria-label={t.editNote(entry.subject)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) onCancel();
      }}
    >
      <label className="field">
        <span className="field-label">{t.subject}</span>
        <input
          type="text"
          value={subject}
          maxLength={200}
          placeholder={entry.subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setError(null);
          }}
        />
      </label>
      <label className="field">
        <span className="field-label">{t.note}</span>
        <textarea
          ref={body}
          value={note}
          rows={6}
          maxLength={20000}
          placeholder={t.notePlaceholder}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {problemText(t, error)}
        </p>
      )}
      <div className="composer-foot">
        <span className="muted small">{t.editKeeps}</span>
        <span className="note-edit-actions">
          <button type="button" className="btn btn-small" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </button>
          <button className="btn btn-primary btn-small" disabled={busy}>
            {busy ? t.saving : t.saveChanges}
          </button>
        </span>
      </div>
    </form>
  );
}

export function Notes({
  entries,
  loading,
  onEdit,
  onDelete,
  pinnedId,
  onPin,
  onUnpin,
}: {
  entries: Entry[];
  loading: boolean;
  onEdit(id: string, edit: EntryEdit): Promise<void>;
  onDelete(id: string): Promise<void>;
  /** the note pinned to your profile to share, if any */
  pinnedId?: string | null;
  onPin?(entry: Entry): Promise<void>;
  onUnpin?(): Promise<void>;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pinAsk, setPinAsk] = useState<string | null>(null); // "share it with everyone?" on this note
  const [pinBusy, setPinBusy] = useState(false);
  const pinJob = (job: () => Promise<void>) => {
    setPinBusy(true);
    job()
      .then(() => setPinAsk(null))
      .catch(() => {}) // the app shows what went wrong
      .finally(() => setPinBusy(false));
  };
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const stampFmt = useMemo(
    () => new Intl.DateTimeFormat(t.locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    [t.locale],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    // tags match in either language
    return entries.filter((e) => `${e.subject} ${e.note} ${e.tags.join(' ')} ${e.tags.map((g) => tagName(t, g)).join(' ')}`.toLowerCase().includes(q));
  }, [entries, query, t]);
  const waiting = entries.filter((e) => e.pending).length;

  return (
    <section className="px-panel" aria-labelledby="notes-title">
      <div className="composer-head">
        <h2 id="notes-title" className="panel-title">
          {t.myNotes}
        </h2>
        <span className="muted">
          {t.noteCount(entries.length)}
          {waiting > 0 && ` · ${t.waitingCount(waiting)}`}
        </span>
      </div>
      {entries.length > 3 && (
        <input className="search" type="search" placeholder={t.searchNotes} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.searchLabel} />
      )}
      {loading ? (
        <p className="empty">{t.loading}</p>
      ) : entries.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{t.noNotes}</p>
          <p>{t.firstNote}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="empty">{t.nothingMatches}</p>
      ) : (
        <ul className="note-list">
          {visible.map((e) => {
            const long = e.note.length > 280;
            const expanded = open === e.id;
            if (editing === e.id)
              return (
                <li key={e.id} className="note is-editing">
                  <time className="muted small" dateTime={e.created_at}>
                    {stampFmt.format(new Date(e.created_at))}
                  </time>
                  <EditNote
                    entry={e}
                    onCancel={() => setEditing(null)}
                    onSave={(change) => onEdit(e.id, change).then(() => setEditing(null))}
                  />
                </li>
              );
            return (
              <li key={e.id} className="note">
                <div className="note-head">
                  <h3 className="note-subject">{e.locked ? `🔒 ${t.lockedNote}` : e.subject}</h3>
                  {pinnedId === e.id && <span className="tag tag-pinned">📌 {t.pinnedTag}</span>}
                  {e.pending && (
                    <span className="tag tag-pending" title={t.pendingTitle}>
                      {t.pendingTag}
                    </span>
                  )}
                  <span className="note-points">+{e.points}</span>
                </div>
                <time className="muted small" dateTime={e.created_at}>
                  {stampFmt.format(new Date(e.created_at))}
                </time>
                {e.locked && <p className="muted small">{t.lockedNoteBody}</p>}
                {e.note && <p className={`note-body ${long && !expanded ? 'is-clamped' : ''}`}>{e.note}</p>}
                {pinAsk === e.id && (
                  <div className="pin-ask" role="group" aria-label={t.pinNoteLabel(e.subject)}>
                    <p>{pinnedId ? t.pinConfirmReplace : t.pinConfirm}</p>
                    <span className="note-edit-actions">
                      <button className="btn btn-small" disabled={pinBusy} onClick={() => setPinAsk(null)}>
                        {t.keepPrivate}
                      </button>
                      <button className="btn btn-primary btn-small" disabled={pinBusy} onClick={() => pinJob(() => onPin!(e))}>
                        {pinBusy ? t.saving : t.yesPin}
                      </button>
                    </span>
                  </div>
                )}
                <div className="note-foot">
                  <span className="tags">
                    {e.tags.map((g) => (
                      <span key={g} className="tag">
                        {tagName(t, g)}
                      </span>
                    ))}
                  </span>
                  <span className="note-actions">
                    {long && (
                      <button className="link" onClick={() => setOpen(expanded ? null : e.id)}>
                        {expanded ? t.showLess : t.readMore}
                      </button>
                    )}
                    {pinnedId === e.id && onUnpin && confirm !== e.id ? (
                      <button className="link" disabled={pinBusy} onClick={() => pinJob(onUnpin)}>
                        {t.unpin}
                      </button>
                    ) : (
                      onPin &&
                      !e.locked &&
                      !e.pending &&
                      confirm !== e.id &&
                      pinAsk !== e.id && (
                        <button
                          className="link"
                          onClick={() => {
                            setPinAsk(e.id);
                            setConfirm(null);
                          }}
                          aria-label={t.pinNoteLabel(e.subject)}
                        >
                          {t.pin}
                        </button>
                      )
                    )}
                    {!e.locked && confirm !== e.id && (
                      <button
                        className="link"
                        onClick={() => {
                          setEditing(e.id);
                          setConfirm(null);
                        }}
                        aria-label={t.editNote(e.subject)}
                      >
                        {t.editBtn}
                      </button>
                    )}
                    {confirm === e.id ? (
                      <>
                        <button className="link danger" onClick={() => onDelete(e.id).finally(() => setConfirm(null))}>
                          {t.yesDelete}
                        </button>
                        <button className="link" onClick={() => setConfirm(null)}>
                          {t.keep}
                        </button>
                      </>
                    ) : (
                      <button
                        className="link"
                        onClick={() => {
                          setConfirm(e.id);
                          setPinAsk(null);
                        }}
                      >
                        {t.del}
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
