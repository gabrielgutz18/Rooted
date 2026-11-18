import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backend, type AdminUser, type Entry, type EntryEdit, type EntryInput, type NoteLock, type Profile } from './lib/backend';
import { ARRIVALS, dayKey, dayStats, dayStreak, stageFor, type DayStat } from './lib/growth';
import { dayOf, daysIdle, lastDayOf } from './lib/streak';
import { errorText, strings, useT } from './lib/i18n';
import LangSwitch from './components/LangSwitch';
import type { Period } from './scene/engine';
import Hero, { type HeroHandle } from './components/Hero';
import Heatmap from './components/Heatmap';
import { Composer, Notes } from './components/Diary';
import AuthScreen from './components/AuthScreen';
import TreePicker from './components/TreePicker';
import InstallDialog from './components/InstallDialog';
import UpdateNotice from './components/UpdateNotice';
import { hasUnseenUpdate, markUpdatesSeen } from './lib/updates';
import { RecoveryDialog, UnlockPanel } from './components/Unlock';
import UsernameDialog from './components/UsernameDialog';
import ProfileDialog from './components/ProfileDialog';
import { speciesOf } from './scene/species';
import { useInstall } from './lib/install';
import { clearSnapshots, readSnapshot, writeSnapshot } from './lib/cache';
import { addToOutbox, asEntry, clearOutbox, editInOutbox, isOffline, readOutbox, removeFromOutbox, withPending, withTimeout } from './lib/outbox';

const cloud = backend.mode === 'cloud';

// ?hour=21 previews another time of day; ?tree=sakura previews another kind of tree.
const hourParam = (() => {
  const h = Number(new URLSearchParams(location.search).get('hour'));
  return location.search.includes('hour=') && h >= 0 && h < 24 ? h : undefined;
})();
const treeParam = new URLSearchParams(location.search).get('tree') ?? undefined;

const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Something went wrong.';

export default function App() {
  const t = useT();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    backend.getUserId().then(setUserId);
    return backend.onAuth(setUserId);
  }, []);

  if (userId === undefined) return <div className="splash">{t.planting}</div>;
  if (!userId) return <AuthScreen />;
  return <Garden key={userId} userId={userId} />;
}

type View = { kind: 'home' } | { kind: 'visit'; profile: Profile } | { kind: 'admin' };

function Garden({ userId }: { userId: string }) {
  const t = useT();
  // Start from the copy saved on this device last time, so the tree shows instantly.
  const [snap] = useState(() => (cloud ? readSnapshot(userId) : null));
  const [me, setMe] = useState<Profile | null>(snap?.me ?? null);
  // notes waiting on this device to upload are shown with the saved ones
  const [entries, setEntries] = useState<Entry[]>(() =>
    cloud ? withPending((snap?.entries ?? []).filter((e) => !e.pending), readOutbox(userId)) : [],
  );
  const [people, setPeople] = useState<Profile[]>(snap?.people ?? []);
  const [loading, setLoading] = useState(!snap);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const syncing = useRef(false);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [visitDays, setVisitDays] = useState<DayStat[] | null>(null); // null while loading
  const visitId = useRef<string | null>(null); // a late answer for a tree no longer shown is dropped
  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updateUnseen, setUpdateUnseen] = useState(hasUnseenUpdate);
  const [nameLater, setNameLater] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const install = useInstall();
  const askedTree = useRef(false);
  const hero = useRef<HeroHandle>(null);
  // Notes are encrypted; null while checking whether this device has the key to read them.
  const [lock, setLock] = useState<NoteLock | null>(null);
  const locked = useRef(true); // the same, for the upload loop (nothing uploads until unlocked)
  const [lockedDays, setLockedDays] = useState<DayStat[]>([]); // progress squares while locked
  const [recovery, setRecovery] = useState<{ code: string | null } | null>(null);
  const closeRecovery = useCallback(() => setRecovery(null), []);

  const loadPeople = useCallback(() => backend.listProfiles().then(setPeople), []);

  const loadNotes = useCallback(
    () =>
      backend.listEntries().then((list) => {
        if (!cloud) return setEntries(list);
        const ids = new Set(list.map((e) => e.id));
        for (const n of readOutbox(userId)) if (ids.has(n.id)) removeFromOutbox(userId, n.id); // uploaded before
        setEntries(withPending(list, readOutbox(userId)));
      }),
    [userId],
  );

  /** Upload notes written offline, oldest first. Safe to call often. */
  const syncNow = useCallback(async () => {
    if (!cloud || syncing.current || locked.current) return;
    const waiting = readOutbox(userId);
    if (!waiting.length) return;
    syncing.current = true;
    let uploaded = 0;
    try {
      for (const { id, created_at, ...input } of waiting) {
        try {
          let saved = await withTimeout(backend.addEntry(input, { id, created_at }), 15000);
          // edited while it was uploading: save the newer words too before letting it go
          const now = readOutbox(userId).find((n) => n.id === id);
          if (now && (now.subject !== saved.subject || now.note !== saved.note)) {
            const edit = { subject: now.subject, note: now.note, tags: now.tags };
            await withTimeout(backend.editEntry(id, edit), 15000);
            saved = { ...saved, ...edit };
          }
          removeFromOutbox(userId, id);
          setEntries((list) => list.map((e) => (e.id === id ? saved : e)));
          uploaded++;
        } catch (err) {
          if (!isOffline(err)) setError(strings().offlineUploadFailed(errorText(strings(), message(err))));
          break; // try again later
        }
      }
    } finally {
      syncing.current = false;
      if (uploaded) {
        setNotice(strings().offlineSaved(uploaded));
        loadPeople().catch(() => {});
      }
    }
  }, [userId, loadPeople]);

  useEffect(() => {
    const notes = backend.noteLock().then((s) => {
      setLock(s);
      locked.current = !s.open;
      if (s.open) {
        if (s.recoveryKey) setRecovery({ code: s.recoveryKey }); // just made at sign-up: show it once
        return loadNotes();
      }
      // can't read the notes here yet: show the tree and squares from the server's counts
      setEntries([]);
      return backend.activity(userId).then(setLockedDays);
    });
    // Offline, these requests can take ~30 s to fail; the tree from last time is already
    // showing, so say so sooner. (Anything that does arrive later is still used.)
    withTimeout(Promise.all([backend.profile(userId).then(setMe), notes, loadPeople()]), 10000)
      .then(() => syncNow())
      .catch((err) => setError(snap ? strings().showingCached : message(err)))
      .finally(() => setLoading(false));
  }, [userId, loadPeople, loadNotes, snap, syncNow]);

  function unlocked(recoveryKey: string | null) {
    setLock({ open: true, recoveryKey: null });
    locked.current = false;
    if (recoveryKey) setRecovery({ code: recoveryKey });
    setLoading(true);
    loadNotes()
      .then(() => syncNow())
      .catch((err) => setError(message(err)))
      .finally(() => setLoading(false));
  }

  // keep trying while notes are waiting: when the connection returns, when the app is
  // reopened, and every half minute
  useEffect(() => {
    if (!cloud) return;
    const onVisible = () => document.visibilityState === 'visible' && syncNow();
    window.addEventListener('online', syncNow);
    document.addEventListener('visibilitychange', onVisible);
    const t = setInterval(syncNow, 30000);
    return () => {
      window.removeEventListener('online', syncNow);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(t);
    };
  }, [syncNow]);

  useEffect(() => {
    if (cloud && me) writeSnapshot(userId, { me, entries, people });
  }, [userId, me, entries, people]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  function signOut() {
    const waiting = cloud ? readOutbox(userId).length : 0;
    if (waiting && !window.confirm(t.signOutConfirm(waiting))) return;
    clearSnapshots();
    clearOutbox(userId);
    backend.signOut();
  }

  async function installApp() {
    setMenuOpen(false);
    if (install.canPrompt) await install.prompt();
    else setInstallHelp(true);
  }

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  // First visit: ask which tree to grow (once).
  useEffect(() => {
    if (me && me.tree == null && !askedTree.current) {
      askedTree.current = true;
      setPicking(true);
    }
  }, [me]);

  async function chooseTree(tree: string) {
    setPicking(false);
    if (!me || me.tree === tree) return;
    const before = me.tree;
    setMe({ ...me, tree });
    setPeople((list) => list.map((p) => (p.id === me.id ? { ...p, tree } : p)));
    try {
      await backend.setTree(tree);
      hero.current?.sparkle();
    } catch (err) {
      setMe((m) => (m ? { ...m, tree: before } : m));
      setError(message(err));
    }
  }

  const closePicker = useCallback(() => {
    // closing the first-visit picker keeps the oak
    if (me && me.tree == null) chooseTree('oak');
    else setPicking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);
  const closeUpdates = useCallback(() => setUpdatesOpen(false), []);

  // Accounts made with an email before usernames pick one once (null: not yet; undefined:
  // the usernames migration isn't run, so don't ask). The admin keeps the email.
  const needsName = !!me && !me.is_admin && me.username === null && !nameLater;

  /** A username added (older email accounts) or changed; the display name may follow it. */
  function namePicked(username: string, displayName?: string) {
    const change = (p: Profile) => ({ ...p, username, display_name: displayName ?? p.display_name });
    setMe((m) => (m ? change(m) : m));
    setPeople((list) => list.map((p) => (p.id === userId ? change(p) : p)));
    setNotice(t.usernameSaved(username));
  }
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  // an older email account that hasn't picked a username yet (see needsName)
  const canAddName = !!me && !me.is_admin && me.username === null;

  const open = !lock || lock.open; // while checking, the copy from last time is shown
  const points = useMemo(() => (open ? entries.reduce((s, e) => s + e.points, 0) : (me?.points ?? 0)), [open, entries, me]);
  const myDays = useMemo(() => (open ? dayStats(entries) : lockedDays), [open, entries, lockedDays]);
  const friends = useMemo(() => people.filter((p) => p.id !== userId), [people, userId]);
  const myStreak = useMemo(() => dayStreak(myDays), [myDays]);
  const today = dayKey(new Date());

  const setPeriod = useCallback((p: Period) => {
    document.documentElement.dataset.period = p;
  }, []);

  async function save(input: EntryInput) {
    const before = stageFor(points).index;
    const streakBefore = myStreak;
    const id = crypto.randomUUID();
    let created: Entry;
    try {
      created = await withTimeout(backend.addEntry(input, { id }), 12000);
    } catch (err) {
      // no connection: keep it on this device (same id, so a late upload isn't doubled)
      if (!cloud || !isOffline(err)) throw err;
      created = asEntry(addToOutbox(userId, input, id));
      setNotice(t.offlineKept);
    }
    setEntries((list) => [created, ...list]);
    const after = stageFor(points + created.points).index;
    const streakAfter = dayStreak(dayStats([created, ...entries]));
    hero.current?.celebrate({
      points: created.points,
      streakFrom: streakAfter > streakBefore ? streakBefore : undefined,
      stage: after > before ? after : undefined,
      arrivals: ARRIVALS.filter((a) => a.stage > before && a.stage <= after).map((a) => a.stage),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!created.pending) loadPeople().catch(() => {});
  }

  /** Throws so the edit form stays open (with the words) when it can't be saved. */
  async function edit(id: string, change: EntryEdit) {
    if (cloud && readOutbox(userId).some((n) => n.id === id)) {
      editInOutbox(userId, id, change); // not uploaded yet: it uploads with the new words
    } else {
      try {
        await withTimeout(backend.editEntry(id, change), 12000);
      } catch (err) {
        if (cloud && isOffline(err)) throw new Error(t.editNeedsOnline);
        throw err;
      }
    }
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...change } : e)));
  }

  async function remove(id: string) {
    if (entries.find((e) => e.id === id)?.pending) {
      removeFromOutbox(userId, id);
      setEntries((list) => list.filter((e) => e.id !== id));
      return;
    }
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
      setVisitDays(null);
      const id = (visitId.current = next.profile.id);
      backend
        .activity(id)
        .then((days) => visitId.current === id && setVisitDays(days))
        .catch((err) => setError(message(err)));
    } else {
      visitId.current = null;
    }
  }

  const visiting = view.kind === 'visit' ? view.profile : null;
  // the lamp and the leaves, for whichever tree is showing
  const shownStreak = visiting ? (visitDays ? dayStreak(visitDays) : undefined) : loading ? undefined : myStreak;
  const lastDay = visiting ? (visitDays ? lastDayOf(visitDays) : dayOf(visiting.last_entry_at)) : lastDayOf(myDays);

  return (
    <div className="shell">
      <button className="btn menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="side-menu">
        {t.menu}
        {updateUnseen && <span className="new-dot" aria-label={t.updatesNew} />}
      </button>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <aside id="side-menu" className={`side ${menuOpen ? 'is-open' : ''}`}>
        <div className="side-brand">
          <h1 className="brand-title">Rooted</h1>
          <p className="muted small">{me?.display_name ?? '…'}</p>
        </div>
        <nav className="side-nav" aria-label={t.mainNav}>
          <button className={`side-link ${view.kind === 'home' ? 'is-on' : ''}`} onClick={() => go({ kind: 'home' })}>
            {t.myTree}
          </button>
          {me && (
            <button
              className="side-link"
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
            >
              {t.profileMenu}
              {canAddName && <span className="new-tag">{t.addUsernameTag}</span>}
            </button>
          )}
          <button
            className="side-link"
            onClick={() => {
              setMenuOpen(false);
              setPicking(true);
            }}
          >
            {t.chooseTree} · <span className="side-link-meta">{t.species[speciesOf(me?.tree).id].name}</span>
          </button>
          <button
            className="side-link"
            onClick={() => {
              setMenuOpen(false);
              setUpdatesOpen(true);
              markUpdatesSeen();
              setUpdateUnseen(false);
            }}
          >
            {t.updatesMenu}
            {updateUnseen && <span className="new-tag">{t.updatesNew}</span>}
          </button>
          {!install.installed && (
            <button className="side-link" onClick={installApp}>
              {t.installApp}
            </button>
          )}
          {cloud && open && (
            <button
              className="side-link"
              onClick={() => {
                setMenuOpen(false);
                setRecovery({ code: null });
              }}
            >
              {t.recoveryMenu}
            </button>
          )}
          {me?.is_admin && (
            <button className={`side-link ${view.kind === 'admin' ? 'is-on' : ''}`} onClick={() => go({ kind: 'admin' })}>
              {t.adminUsers}
            </button>
          )}
        </nav>
        <h2 className="side-title">{t.friends}</h2>
        <ul className="friend-list">
          {friends.length === 0 && <li className="muted small friend-empty">{t.noFriends}</li>}
          {friends.map((p) => (
            <li key={p.id}>
              <button className={`friend ${visiting?.id === p.id ? 'is-on' : ''}`} onClick={() => go({ kind: 'visit', profile: p })} title={t.visitTree(p.display_name)}>
                <span className="friend-name">{p.display_name}</span>
                <span className="friend-meta">
                  {t.species[speciesOf(p.tree).id].name} · {t.stages[stageFor(p.points).index]} · {p.points}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="side-foot">
          <LangSwitch />
          <span className="muted small">{backend.mode === 'cloud' ? t.synced : t.trial}</span>
          <button className="btn btn-small" onClick={signOut}>
            {t.signOut}
          </button>
        </div>
      </aside>

      <div className="main">
        <Hero
          ref={hero}
          points={visiting ? visiting.points : points}
          seed={visiting ? visiting.id : userId}
          species={visiting ? (visiting.tree ?? undefined) : (treeParam ?? me?.tree ?? undefined)}
          hour={hourParam}
          owner={visiting?.display_name}
          streak={shownStreak}
          todayDone={lastDay === today}
          idle={daysIdle(lastDay)}
          onBack={() => go({ kind: 'home' })}
          onPeriod={setPeriod}
        />

        <div className="body">
          {view.kind === 'home' && (
            <>
              {lock && !lock.open ? <UnlockPanel hasKey={lock.hasKey} problem={lock.problem} onOpen={unlocked} /> : <Composer entries={entries} onSave={save} />}
              <section className="px-panel" aria-labelledby="track-title">
                <div className="composer-head">
                  <h2 id="track-title" className="panel-title">
                    {t.progress}
                  </h2>
                </div>
                <Heatmap days={myDays} />
              </section>
              {open && <Notes entries={entries} loading={loading} onEdit={edit} onDelete={remove} />}
            </>
          )}

          {visiting && (
            <section className="px-panel" aria-labelledby="visit-title">
              <div className="composer-head">
                <h2 id="visit-title" className="panel-title">
                  {t.theirProgress(visiting.display_name)}
                </h2>
              </div>
              <div className="stat-grid">
                <Stat value={visiting.points} label={t.statGrowth} />
                <Stat value={visiting.entry_count} label={t.statNotes} />
                <Stat value={t.stages[stageFor(visiting.points).index]} label={t.statStage} />
              </div>
              <Heatmap key={visiting.id} days={visitDays ?? []} />
              <p className="muted small">{t.notesPrivate}</p>
            </section>
          )}

          {view.kind === 'admin' && <Admin selfId={userId} onError={setError} />}
        </div>
      </div>

      {needsName && <UsernameDialog onDone={namePicked} onLater={() => setNameLater(true)} />}
      {!needsName && picking && <TreePicker current={me?.tree} first={me?.tree == null} hour={hourParam} onPick={chooseTree} onClose={closePicker} />}
      {!needsName && profileOpen && me && (
        <ProfileDialog
          me={me}
          points={points}
          notes={open ? entries.length : me.entry_count}
          streak={myStreak}
          onUsername={namePicked}
          onChangeTree={() => {
            setProfileOpen(false);
            setPicking(true);
          }}
          onClose={closeProfile}
        />
      )}
      {updatesOpen && <UpdateNotice onClose={closeUpdates} />}
      {installHelp && <InstallDialog platform={install.platform} onClose={() => setInstallHelp(false)} />}
      {recovery && <RecoveryDialog key={recovery.code ?? 'new'} code={recovery.code} onClose={closeRecovery} />}

      {error ? (
        <div className="toast" role="alert" onClick={() => setError(null)}>
          {errorText(t, error)}
        </div>
      ) : (
        notice && (
          <div className="toast toast-info" role="status" onClick={() => setNotice(null)}>
            {notice}
          </div>
        )
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

function Admin({ selfId, onError }: { selfId: string; onError(msg: string): void }) {
  const t = useT();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(t.locale, { month: 'short', day: 'numeric', year: 'numeric' }), [t.locale]);

  useEffect(() => {
    backend.adminUsers().then(setUsers).catch((err) => {
      setUsers([]);
      onError(message(err));
    });
  }, [onError]);

  // A new random password for someone who forgot theirs and has no recovery key to reset it.
  async function resetFor(u: AdminUser) {
    if (!window.confirm(t.adminResetConfirm(u.display_name))) return;
    setResetting(u.id);
    try {
      setIssued({ name: u.display_name, password: await backend.adminResetPassword(u.id) });
    } catch (err) {
      onError(message(err));
    } finally {
      setResetting(null);
    }
  }

  return (
    <section className="px-panel" aria-labelledby="admin-title">
      <div className="composer-head">
        <h2 id="admin-title" className="panel-title">
          {t.users}
        </h2>
        <span className="muted">{users ? t.total(users.length) : t.loading}</span>
      </div>
      {issued && (
        <div className="form-info" role="status">
          <p>{t.adminResetDone(issued.name)}</p>
          <output className="recovery-key">{issued.password}</output>
          <p className="muted small">{t.adminResetHint}</p>
          <button className="btn btn-small" onClick={() => setIssued(null)}>
            {t.close}
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t.col.name}</th>
              <th>{t.col.username}</th>
              <th>{t.col.email}</th>
              <th>{t.col.stage}</th>
              <th className="num">{t.col.growth}</th>
              <th className="num">{t.col.notes}</th>
              <th>{t.col.last}</th>
              <th>{t.col.joined}</th>
              {cloud && <th>{t.col.password}</th>}
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  {u.display_name} {u.is_admin && <span className="tag">admin</span>}
                </td>
                <td>{u.username ?? '—'}</td>
                <td>{u.email ?? '—'}</td>
                <td>{t.stages[stageFor(u.points).index]}</td>
                <td className="num">{u.points}</td>
                <td className="num">{u.entry_count}</td>
                <td>{u.last_entry_at ? dateFmt.format(new Date(u.last_entry_at)) : '—'}</td>
                <td>{dateFmt.format(new Date(u.created_at))}</td>
                {cloud && (
                  <td>
                    {u.id !== selfId && (
                      <button className="btn btn-small" disabled={resetting === u.id} onClick={() => resetFor(u)}>
                        {resetting === u.id ? t.pleaseWait : t.adminReset}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
