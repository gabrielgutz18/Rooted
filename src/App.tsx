import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backend, type AdminUser, type Entry, type EntryInput, type Profile } from './lib/backend';
import { ARRIVALS, STAGES, dayStats, dayStreak, stageFor, type DayStat } from './lib/growth';
import type { Period } from './scene/engine';
import Hero, { type HeroHandle } from './components/Hero';
import Heatmap from './components/Heatmap';
import { Composer, Notes } from './components/Diary';
import AuthScreen from './components/AuthScreen';

// ?hour=21 previews another time of day.
const hourParam = (() => {
  const h = Number(new URLSearchParams(location.search).get('hour'));
  return location.search.includes('hour=') && h >= 0 && h < 24 ? h : undefined;
})();

const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong.';

export default function App() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    backend.getUserId().then(setUserId);
    return backend.onAuth(setUserId);
  }, []);

  if (userId === undefined) return <div className="splash">Planting…</div>;
  if (!userId) return <AuthScreen />;
  return <Garden key={userId} userId={userId} />;
}

type View = { kind: 'home' } | { kind: 'visit'; profile: Profile } | { kind: 'admin' };

function Garden({ userId }: { userId: string }) {
  const [me, setMe] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [visitDays, setVisitDays] = useState<DayStat[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const hero = useRef<HeroHandle>(null);

  const loadPeople = useCallback(() => backend.listProfiles().then(setPeople), []);

  useEffect(() => {
    Promise.all([backend.profile(userId).then(setMe), backend.listEntries().then(setEntries), loadPeople()])
      .catch((err) => setError(message(err)))
      .finally(() => setLoading(false));
  }, [userId, loadPeople]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const points = useMemo(() => entries.reduce((s, e) => s + e.points, 0), [entries]);
  const myDays = useMemo(() => dayStats(entries), [entries]);
  const friends = useMemo(() => people.filter((p) => p.id !== userId), [people, userId]);

  const setPeriod = useCallback((p: Period) => {
    document.documentElement.dataset.period = p;
  }, []);

  async function save(input: EntryInput) {
    const before = stageFor(points).index;
    const created = await backend.addEntry(input);
    setEntries((list) => [created, ...list]);
    const after = stageFor(points + created.points).index;
    hero.current?.celebrate({
      points: created.points,
      stageName: after > before ? STAGES[after].name : undefined,
      arrivals: ARRIVALS.filter((a) => a.stage > before && a.stage <= after).map((a) => a.name),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadPeople().catch(() => {});
  }

  async function remove(id: string) {
    try {
      await backend.removeEntry(id);
      setEntries((list) => list.filter((e) => e.id !== id));
    } catch (err) {
      setError(message(err));
    }
  }

  function go(next: View) {
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
    if (next.kind === 'visit') {
      setVisitDays([]);
      backend.activity(next.profile.id).then(setVisitDays).catch((err) => setError(message(err)));
    }
  }

  const visiting = view.kind === 'visit' ? view.profile : null;

  return (
    <div className="shell">
      <button className="btn menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="side-menu">
        ☰ Menu
      </button>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <aside id="side-menu" className={`side ${menuOpen ? 'is-open' : ''}`}>
        <div className="side-brand">
          <h1 className="brand-title">Rooted</h1>
          <p className="muted small">{me?.display_name ?? '…'}</p>
        </div>
        <nav className="side-nav" aria-label="Main">
          <button className={`side-link ${view.kind === 'home' ? 'is-on' : ''}`} onClick={() => go({ kind: 'home' })}>
            My tree
          </button>
          {me?.is_admin && (
            <button className={`side-link ${view.kind === 'admin' ? 'is-on' : ''}`} onClick={() => go({ kind: 'admin' })}>
              Admin · users
            </button>
          )}
        </nav>
        <h2 className="side-title">Friends</h2>
        <ul className="friend-list">
          {friends.length === 0 && <li className="muted small friend-empty">No one else has planted a tree yet. Invite a friend to sign up.</li>}
          {friends.map((p) => (
            <li key={p.id}>
              <button className={`friend ${visiting?.id === p.id ? 'is-on' : ''}`} onClick={() => go({ kind: 'visit', profile: p })} title={`Visit ${p.display_name}'s tree`}>
                <span className="friend-name">{p.display_name}</span>
                <span className="friend-meta">
                  {stageFor(p.points).stage.name} · {p.points}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="side-foot">
          <span className="muted small">{backend.mode === 'cloud' ? 'Synced to your account' : 'Trial mode · this browser only'}</span>
          <button className="btn btn-small" onClick={() => backend.signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <Hero
          ref={hero}
          points={visiting ? visiting.points : points}
          seed={visiting ? visiting.id : userId}
          hour={hourParam}
          owner={visiting?.display_name}
          onBack={() => go({ kind: 'home' })}
          onPeriod={setPeriod}
        />

        <div className="body">
          {view.kind === 'home' && (
            <>
              <Composer onSave={save} />
              <section className="px-panel" aria-labelledby="track-title">
                <div className="composer-head">
                  <h2 id="track-title" className="panel-title">
                    Progress
                  </h2>
                  <span className="muted">{dayStreak(myDays)}-day streak</span>
                </div>
                <Heatmap days={myDays} />
              </section>
              <Notes entries={entries} loading={loading} onDelete={remove} />
            </>
          )}

          {visiting && (
            <section className="px-panel" aria-labelledby="visit-title">
              <div className="composer-head">
                <h2 id="visit-title" className="panel-title">
                  {visiting.display_name}’s progress
                </h2>
                <span className="muted">{dayStreak(visitDays)}-day streak</span>
              </div>
              <div className="stat-grid">
                <Stat value={visiting.points} label="growth" />
                <Stat value={visiting.entry_count} label="notes" />
                <Stat value={stageFor(visiting.points).stage.name} label="stage" />
              </div>
              <Heatmap key={visiting.id} days={visitDays} />
              <p className="muted small">Notes are private — friends only see the tree and the progress squares.</p>
            </section>
          )}

          {view.kind === 'admin' && <Admin onError={setError} />}
        </div>
      </div>

      {error && (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function Admin({ onError }: { onError(msg: string): void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  useEffect(() => {
    backend.adminUsers().then(setUsers).catch((err) => {
      setUsers([]);
      onError(message(err));
    });
  }, [onError]);

  return (
    <section className="px-panel" aria-labelledby="admin-title">
      <div className="composer-head">
        <h2 id="admin-title" className="panel-title">
          Users
        </h2>
        <span className="muted">{users ? `${users.length} total` : 'Loading…'}</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Stage</th>
              <th className="num">Growth</th>
              <th className="num">Notes</th>
              <th>Last note</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  {u.display_name} {u.is_admin && <span className="tag">admin</span>}
                </td>
                <td>{u.email}</td>
                <td>{stageFor(u.points).stage.name}</td>
                <td className="num">{u.points}</td>
                <td className="num">{u.entry_count}</td>
                <td>{u.last_entry_at ? dateFmt.format(new Date(u.last_entry_at)) : '—'}</td>
                <td>{dateFmt.format(new Date(u.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
