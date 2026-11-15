import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { Scene } from '../scene/engine';
import { errorText, useT } from '../lib/i18n';
import LangSwitch from './LangSwitch';

/** One short form: name, email, password — and you are in. */
export default function AuthScreen() {
  const t = useT();
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmSent(false);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await backend.signUp({ name: name.trim(), email: email.trim(), password });
        if (needsConfirm) {
          setConfirmSent(true);
          setMode('signin');
        }
      } else {
        await backend.signIn({ email: email.trim(), password });
      }
    } catch (err) {
      // kept in English and translated when shown, so switching language updates it
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <canvas ref={canvasRef} className="auth-bg" aria-hidden="true" />
      <form className="px-panel auth-card" onSubmit={submit}>
        <LangSwitch className="lang-auth" />
        <h1 className="brand-title">Rooted</h1>
        <p className="muted auth-sub">{t.tagline}</p>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'is-on' : ''}`} onClick={() => setMode('signup')}>
            {t.createAccount}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={`tab ${mode === 'signin' ? 'is-on' : ''}`} onClick={() => setMode('signin')}>
            {t.signIn}
          </button>
        </div>
        {mode === 'signup' && (
          <label className="field">
            <span className="field-label">{t.yourName}</span>
            <input type="text" required maxLength={40} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span className="field-label">{t.email}</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {!local && (
          <label className="field">
            <span className="field-label">{t.password}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
          {busy ? t.pleaseWait : mode === 'signup' ? t.plantTree : t.signIn}
        </button>
        {local && <p className="muted small">{t.localTrial}</p>}
      </form>
    </div>
  );
}
