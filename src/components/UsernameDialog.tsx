import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { errorText, useT } from '../lib/i18n';
import { normalizeUsername } from '../lib/username';

const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong.';

/**
 * Asked once after signing in, for accounts made with an email before usernames existed.
 * After this they sign in with the username; the email stops working.
 */
export default function UsernameDialog({ onDone, onLater }: { onDone(username: string): void; onLater(): void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.querySelector('input')?.focus();
  }, []);

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
    <>
      <div className="modal-scrim" />
      <div ref={box} className="px-panel picker picker-narrow" role="dialog" aria-modal="true" aria-labelledby="username-title">
        <div className="composer-head">
          <h2 id="username-title" className="panel-title">
            {t.pickUsernameTitle}
          </h2>
        </div>
        <form className="stack" onSubmit={save}>
          <p>{t.pickUsernameIntro}</p>
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
            <button type="button" className="link" onClick={onLater}>
              {t.notNow}
            </button>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? t.pleaseWait : t.saveUsername}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
