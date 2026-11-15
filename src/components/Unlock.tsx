import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { errorText, useT } from '../lib/i18n';

const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong.';

/**
 * Shown instead of the composer when this device can't read your notes yet: the first time
 * after the encryption update, on a new device, or after your password was reset.
 */
export function UnlockPanel({
  hasKey,
  problem,
  onOpen,
}: {
  hasKey: boolean | null;
  problem: string | null;
  onOpen(recoveryKey: string | null): void;
}) {
  const t = useT();
  const [mode, setMode] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(problem);
  const first = hasKey === false;

  async function run(task: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    try {
      onOpen(await task());
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'password') run(async () => (await backend.unlock(password)).recoveryKey);
    else
      run(async () => {
        await backend.recover(code, password);
        return null;
      });
  }

  function startOver() {
    if (!password) return setError(t.enterPasswordFirst);
    if (!window.confirm(t.startOverConfirm)) return;
    run(async () => (await backend.startOver(password)).recoveryKey);
  }

  const switchTo = (m: typeof mode) => {
    setMode(m);
    setError(null);
  };

  return (
    <form className="px-panel" onSubmit={submit} aria-labelledby="unlock-title">
      <div className="composer-head">
        <h2 id="unlock-title" className="panel-title">
          {first ? t.lockTitle : t.unlockTitle}
        </h2>
        <span className="muted small">{t.onlyYou}</span>
      </div>
      <p className="muted">{first ? t.lockIntro : mode === 'password' ? t.unlockIntro : t.recoverIntro}</p>
      {hasKey === null && !problem && <p className="muted small">{t.unlockOffline}</p>}
      {mode === 'recovery' && (
        <label className="field">
          <span className="field-label">{t.recoveryKey}</span>
          <input
            className="mono"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      )}
      <label className="field">
        <span className="field-label">{mode === 'recovery' ? t.currentPassword : t.password}</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {errorText(t, error)}
        </p>
      )}
      <div className="composer-foot">
        <span className="link-row">
          {!first && mode === 'password' && (
            <button type="button" className="link" onClick={() => switchTo('recovery')}>
              {t.useRecovery}
            </button>
          )}
          {mode === 'recovery' && (
            <>
              <button type="button" className="link" onClick={() => switchTo('password')}>
                {t.back}
              </button>
              <button type="button" className="link danger" disabled={busy} onClick={startOver}>
                {t.startOver}
              </button>
            </>
          )}
        </span>
        <button className="btn btn-primary" disabled={busy || !!problem}>
          {busy ? t.unlocking : first ? t.lockNotes : t.unlock}
        </button>
      </div>
    </form>
  );
}

/**
 * Shows a recovery key once (right after it was made), or — opened from the menu without
 * one — asks for the password and makes a new one.
 */
export function RecoveryDialog({ code: given, onClose }: { code: string | null; onClose(): void }) {
  const t = useT();
  const [code, setCode] = useState(given);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const keyText = useRef<HTMLOutputElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // focus once on open (not on every re-render, which would pull focus out of the field)
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function make(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setCode(await backend.newRecoveryKey(password));
      setPassword('');
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code!);
      setCopied(true);
    } catch {
      // no clipboard access: select it so it can be copied by hand
      const range = document.createRange();
      range.selectNodeContents(keyText.current!);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
  }

  return (
    <>
      <div className="modal-scrim" onClick={code ? undefined : onClose} />
      <div ref={box} className="px-panel picker picker-narrow" role="dialog" aria-modal="true" aria-labelledby="recovery-title" tabIndex={-1}>
        <div className="composer-head">
          <h2 id="recovery-title" className="panel-title">
            {t.recoveryTitle}
          </h2>
          {!code && (
            <button className="btn btn-small" onClick={onClose}>
              {t.close}
            </button>
          )}
        </div>
        {code ? (
          <>
            <p>{t.recoveryWhy}</p>
            <output ref={keyText} className="recovery-key">
              {code}
            </output>
            <p className="muted small">{t.recoveryKeep}</p>
            <div className="composer-foot">
              <button className="btn" onClick={copy}>
                {copied ? t.copied : t.copy}
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                {t.savedIt}
              </button>
            </div>
          </>
        ) : (
          <form className="stack" onSubmit={make}>
            <p className="muted">{t.newRecoveryIntro}</p>
            <label className="field">
              <span className="field-label">{t.password}</span>
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {errorText(t, error)}
              </p>
            )}
            <div className="composer-foot">
              <span />
              <button className="btn btn-primary" disabled={busy}>
                {busy ? t.making : t.makeNewKey}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
