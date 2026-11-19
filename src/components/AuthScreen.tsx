import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { Scene } from '../scene/engine';
import { errorText, useT } from '../lib/i18n';
import LangSwitch from './LangSwitch';

type Mode = 'signup' | 'signin' | 'reset';

/** One short form: username and password, and you are in. (The admin signs in with email.) */
export default function AuthScreen({ start = 'signup', onBack }: { start?: 'signup' | 'signin'; onBack?: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(start);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const local = backend.mode === 'local';

  // A grown tree behind the form, to show what you are planting.
  useEffect(() => {
    const s = new Scene(canvasRef.current!, { points: 2200, seed: 'welcome', species: 'sakura' });
    const fit = () => s.resize(window.innerWidth, window.innerHeight);
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      s.destroy();
    };
  }, []);

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmSent(false);
    setPassword('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmSent(false);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await backend.signUp({ username: login, password });
        if (needsConfirm) {
          setConfirmSent(true);
          setMode('signin');
        }
      } else if (mode === 'signin') {
        await backend.signIn({ login, password });
      } else {
        await backend.resetPassword({ username: login, recoveryKey, password });
      }
    } catch (err) {
      // kept in English and translated when shown, so switching language updates it
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const label = { signup: t.plantTree, signin: t.signIn, reset: t.resetAndSignIn }[mode];

  return (
    <div className="auth">
      <canvas ref={canvasRef} className="auth-bg" aria-hidden="true" />
      <form className="px-panel auth-card" onSubmit={submit}>
        <LangSwitch className="lang-auth" />
        <h1 className="brand-title">Rooted</h1>
        <p className="muted auth-sub">{mode === 'reset' ? t.resetIntro : t.tagline}</p>
        {mode !== 'reset' && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'is-on' : ''}`} onClick={() => switchTo('signup')}>
              {t.createAccount}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={`tab ${mode === 'signin' ? 'is-on' : ''}`} onClick={() => switchTo('signin')}>
              {t.signIn}
            </button>
          </div>
        )}
        <label className="field">
          <span className="field-label">{t.username}</span>
          <input
            type="text"
            required
            maxLength={mode === 'signin' ? 254 : 20}
            pattern={mode === 'signin' ? undefined : '[A-Za-z0-9_]{3,20}'}
            title={mode === 'signin' ? undefined : t.usernameRule}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          {mode === 'signup' && <span className="muted small">{t.usernameRule}</span>}
        </label>
        {mode === 'reset' && (
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
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
            />
          </label>
        )}
        {!local && (
          <label className="field">
            <span className="field-label">{mode === 'reset' ? t.newPassword : t.password}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {errorText(t, error)}
          </p>
        )}
        {confirmSent && <p className="form-info">{t.confirmEmail}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? t.pleaseWait : label}
        </button>
        {!local && mode === 'signin' && (
          <button type="button" className="link auth-link" onClick={() => switchTo('reset')}>
            {t.forgotPassword}
          </button>
        )}
        {mode === 'reset' && (
          <>
            <p className="muted small">{t.noRecoveryKey}</p>
            <button type="button" className="link auth-link" onClick={() => switchTo('signin')}>
              {t.back}
            </button>
          </>
        )}
        {local && <p className="muted small">{t.localTrial}</p>}
        {onBack && mode !== 'reset' && (
          <button type="button" className="link auth-link" onClick={onBack}>
            ← {t.aboutRooted}
          </button>
        )}
      </form>
    </div>
  );
}
