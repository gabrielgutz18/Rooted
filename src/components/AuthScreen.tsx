import { useEffect, useRef, useState, type FormEvent } from 'react';
import { backend } from '../lib/backend';
import { Scene } from '../scene/engine';

/** One short form: name, email, password — and you are in. */
export default function AuthScreen() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
    setInfo(null);
    try {
      if (mode === 'signup') {
        const { needsConfirm } = await backend.signUp({ name: name.trim(), email: email.trim(), password });
        if (needsConfirm) {
          setInfo('Account created. Confirm the email we sent you, then sign in.');
          setMode('signin');
        }
      } else {
        await backend.signIn({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <canvas ref={canvasRef} className="auth-bg" aria-hidden="true" />
      <form className="px-panel auth-card" onSubmit={submit}>
        <h1 className="brand-title">Rooted</h1>
        <p className="muted auth-sub">A tree that grows with your walk of faith.</p>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={`tab ${mode === 'signup' ? 'is-on' : ''}`} onClick={() => setMode('signup')}>
            Create account
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={`tab ${mode === 'signin' ? 'is-on' : ''}`} onClick={() => setMode('signin')}>
            Sign in
          </button>
        </div>
        {mode === 'signup' && (
          <label className="field">
            <span className="field-label">Your name</span>
            <input type="text" required maxLength={40} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {!local && (
          <label className="field">
            <span className="field-label">Password</span>
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
            {error}
          </p>
        )}
        {info && <p className="form-info">{info}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Plant my tree' : 'Sign in'}
        </button>
        {local && <p className="muted small">Trial mode: accounts live only in this browser until Supabase is connected.</p>}
      </form>
    </div>
  );
}
