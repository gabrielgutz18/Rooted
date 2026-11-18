import { useEffect, useState, useRef, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { errorText, useT } from '../lib/i18n';
import { isValidUsername, normalizeUsername } from '../lib/username';

const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong.';

type Status = 'checking' | 'available' | 'taken' | 'yours' | null;

/**
 * Picks a username, checking as you type whether it's free (like choosing a handle).
 *  - add:    an older email account picks its first one; the email stops signing in.
 *  - change: swap your username for another; the old one stops signing in and is free for anyone.
 * Used by the dialog below and by the profile.
 */
export function UsernameForm({
  mode = 'add',
  current,
  onDone,
  onLater,
  onCancel,
  autoFocus,
}: {
  mode?: 'add' | 'change';
  /** your username now (change mode) */
  current?: string | null;
  onDone(username: string, displayName?: string): void;
  onLater?(): void;
  onCancel?(): void;
  autoFocus?: boolean;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (autoFocus) form.current?.querySelector('input')?.focus();
  }, [autoFocus]);

  // is it free? asked a moment after typing stops; an older answer for other text is dropped
  useEffect(() => {
    const wanted = normalizeUsername(name);
    if (!isValidUsername(wanted)) return setStatus(null);
    if (current && wanted === current) return setStatus('yours');
    setStatus('checking');
    let live = true;
    const timer = setTimeout(() => {
      backend.usernameStatus(wanted).then(
        (s) => live && setStatus(s),
        () => live && setStatus(null), // offline: saving will say so
      );
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [name, current]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'change') {
        const done = await backend.changeUsername(name);
        onDone(done.username, done.display_name);
      } else {
        await backend.chooseUsername(name);
        onDone(normalizeUsername(name));
      }
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  const wanted = normalizeUsername(name);
  const blocked = status === 'taken' || status === 'yours';

  return (
    <form ref={form} className="stack" onSubmit={save}>
      <label className="field">
        <span className="field-label">{mode === 'change' ? t.newUsername : t.username}</span>
        <span className="handle-input">
          <span className="handle-at" aria-hidden="true">
            @
          </span>
          <input
            type="text"
            required
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            title={t.usernameRule}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={current ?? undefined}
            aria-describedby="username-status"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </span>
        <span id="username-status" className="small handle-status" aria-live="polite">
          {status === 'checking' && <span className="muted">{t.checkingName}</span>}
          {status === 'available' && <span className="handle-ok">{t.usernameFree(wanted)}</span>}
          {status === 'taken' && <span className="handle-bad">{errorText(t, 'That username is taken.')}</span>}
          {status === 'yours' && <span className="muted">{t.usernameIsYours}</span>}
          {!status && <span className="muted">{t.usernameRule}</span>}
        </span>
      </label>
      {mode === 'add' && <p className="muted small">{t.pickUsernameReset}</p>}
      {error && (
        <p className="form-error" role="alert">
          {errorText(t, error)}
        </p>
      )}
      <div className="composer-foot">
        {onLater && (
          <button type="button" className="link" onClick={onLater}>
            {t.notNow}
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
        <button className="btn btn-primary" disabled={busy || blocked}>
          {busy ? t.pleaseWait : t.saveUsername}
        </button>
      </div>
    </form>
  );
}

/** Asked once after signing in, for accounts that still sign in with an email. */
export default function UsernameDialog({ onDone, onLater }: { onDone(username: string): void; onLater(): void }) {
  const t = useT();
  return (
    <>
      <div className="modal-scrim" />
      <div className="px-panel picker picker-narrow" role="dialog" aria-modal="true" aria-labelledby="username-title">
        <div className="composer-head">
          <h2 id="username-title" className="panel-title">
            {t.pickUsernameTitle}
          </h2>
        </div>
        <div className="stack">
          <p>{t.pickUsernameIntro}</p>
          <UsernameForm onDone={onDone} onLater={onLater} autoFocus />
        </div>
      </div>
    </>
  );
}
