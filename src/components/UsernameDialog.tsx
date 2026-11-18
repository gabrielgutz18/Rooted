import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { errorText, useT } from '../lib/i18n';
import { normalizeUsername } from '../lib/username';

const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong.';

/**
 * For accounts made with an email before usernames existed: pick a username, and from then
 * on sign in with it (the email stops working; the password stays). Used by the dialog
 * below and by the profile.
 */
export function UsernameForm({ onDone, onLater, autoFocus }: { onDone(username: string): void; onLater?(): void; autoFocus?: boolean }) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (autoFocus) form.current?.querySelector('input')?.focus();
  }, [autoFocus]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await backend.chooseUsername(name);
      onDone(normalizeUsername(name));
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  return (
    <form ref={form} className="stack" onSubmit={save}>
      <label className="field">
        <span className="field-label">{t.username}</span>
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
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <span className="muted small">{t.usernameRule}</span>
      </label>
      <p className="muted small">{t.pickUsernameReset}</p>
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
        <button className="btn btn-primary" disabled={busy}>
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
