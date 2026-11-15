// One interface, two homes for the data:
//  - cloud: Supabase (accounts, sync, friends on any device)
//  - local: this browser only (works with zero setup, good for trying things out)

import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { dayStats, type DayStat } from './growth';
import * as vault from './vault';
import { isOffline } from './outbox';

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  points: number;
  entry_count: number;
  last_entry_at: string | null;
  created_at: string;
  tree?: string | null; // which kind of tree they grow; null until they choose
}

export interface AdminUser extends Profile {
  email: string;
}

export interface Entry {
  id: string;
  subject: string;
  note: string;
  points: number;
  tags: string[];
  created_at: string; // set automatically when saved
  pending?: boolean; // written offline, still waiting on this device to upload
  locked?: boolean; // locked with a note key this account no longer has: can't be opened
}

/**
 * Whether this device can read your notes. Notes are encrypted in the browser, so a new
 * device (or one that was signed out) needs the password once to unlock them.
 */
export type NoteLock =
  | { open: true; recoveryKey: string | null } // recoveryKey: just made, show it once
  | { open: false; hasKey: boolean | null; problem: string | null }; // hasKey null: couldn't check (offline)

export type EntryInput = Pick<Entry, 'subject' | 'note' | 'points' | 'tags'>;

/**
 * The id a note was given on the device (so uploading it twice saves it once) and, for
 * notes written offline, when it was written. Without created_at the server's clock is used.
 */
export interface KeepAs {
  id: string;
  created_at?: string;
}

export interface Backend {
  mode: 'cloud' | 'local';
  getUserId(): Promise<string | null>;
  onAuth(cb: (userId: string | null) => void): () => void;
  /** Returns needsConfirm=true when Supabase is still set to require email confirmation. */
  signUp(a: { name: string; email: string; password: string }): Promise<{ needsConfirm: boolean }>;
  signIn(a: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
  profile(id: string): Promise<Profile>;
  listProfiles(): Promise<Profile[]>;
  setTree(tree: string): Promise<void>;
  listEntries(): Promise<Entry[]>;
  addEntry(input: EntryInput, keep?: KeepAs): Promise<Entry>;
  removeEntry(id: string): Promise<void>;
  /** Per-day activity for anyone's tree — counts only, never their notes. */
  activity(userId: string): Promise<DayStat[]>;
  adminUsers(): Promise<AdminUser[]>;
  /** Waits for a sign-in that is still unlocking, then says whether notes can be read here. */
  noteLock(): Promise<NoteLock>;
  /** Unlocks notes with the password (setting up encryption the first time; then a recovery key is returned). */
  unlock(password: string): Promise<{ recoveryKey: string | null }>;
  /** For a forgotten or reset password: unlocks with the recovery key, then locks again with `password`. */
  recover(recoveryKey: string, password: string): Promise<void>;
  /** Lost both password and recovery key: new key from now on; notes so far stay locked for good. */
  startOver(password: string): Promise<{ recoveryKey: string }>;
  /** A new recovery key (the old one stops working). */
  newRecoveryKey(password: string): Promise<string>;
}

const NEEDS_UPDATE =
  'Private notes need the latest database update (supabase/migrations/20261118000000_private_notes.sql) — ask the admin to run it.';
const LOCKED_SUBJECT = 'locked'; // what the database holds in place of a locked note's subject

// ---------------- cloud ----------------

const WRONG_PASSWORD = "That password doesn't open your notes. If it was changed or reset, use your recovery key instead.";

const messageOf = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err);

function cloud(): Backend {
  const sb = supabase!;
  const BASE = 'id, display_name, is_admin, points, entry_count, last_entry_at, created_at';
  let P = `${BASE}, tree`;
  const E = 'id, subject, note, points, tags, created_at, sealed';
  const K = 'salt, iterations, wrapped, recovery_salt, recovery';
  type Row = Omit<Entry, 'pending' | 'locked'> & { sealed: string | null };

  /** Missing table or column: the private-notes migration hasn't been run yet. */
  const explain = (e: PostgrestError) => (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(e.code) ? new Error(NEEDS_UPDATE) : e);

  async function me() {
    const user = (await sb.auth.getSession()).data.session?.user;
    if (!user) throw new Error('Not signed in');
    return user;
  }

  async function keyRow(userId: string): Promise<vault.KeyRow | null> {
    const { data, error } = await sb.from('note_keys').select(K).eq('user_id', userId).maybeSingle();
    if (error) throw explain(error);
    return data as vault.KeyRow | null;
  }

  async function saveKeyRow(userId: string, row: Partial<vault.KeyRow>, isNew: boolean) {
    const { error } = isNew
      ? await sb.from('note_keys').insert(row)
      : await sb.from('note_keys').update({ ...row, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) throw explain(error);
  }

  /** The note key must never be locked with a mistyped password, so check it with the account. */
  async function checkPassword(password: string) {
    const { email } = await me();
    if (!email) throw new Error('Not signed in');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw /invalid login credentials/i.test(error.message) ? new Error("That isn't your password.") : error;
  }

  /**
   * With the (already checked) password in hand: open this person's note key and keep it on
   * this device, or make one the first time. Returns the new recovery key when one was made.
   */
  async function openKeys(userId: string, password: string, row?: vault.KeyRow | null): Promise<string | null> {
    const found = row === undefined ? await keyRow(userId) : row;
    if (found) {
      let key: CryptoKey;
      try {
        key = await vault.openWithPassword(userId, found, password);
      } catch {
        throw new Error(WRONG_PASSWORD);
      }
      await vault.rememberKey(userId, key);
      return null;
    }
    const made = await vault.createKeys(userId, password);
    const { error } = await sb.from('note_keys').insert(made.row);
    if (error) {
      // another device made one at the same moment: use that one
      const theirs = error.code === '23505' ? await keyRow(userId) : null;
      if (theirs) return openKeys(userId, password, theirs);
      throw explain(error);
    }
    await vault.rememberKey(userId, made.key);
    return made.recoveryKey;
  }

  /** Right after signing in. If it can't unlock (offline, password was reset…) the app asks later. */
  async function openAfterSignIn(userId: string, password: string) {
    try {
      const code = await openKeys(userId, password);
      if (code) vault.offerRecoveryKey(userId, code);
    } catch {
      /* the unlock screen takes it from here */
    }
  }

  async function noteKey(): Promise<CryptoKey> {
    const key = await vault.deviceKey((await me()).id);
    if (!key) throw new Error('Your notes are locked on this device — unlock them with your password first.');
    return key;
  }

  async function openRow(key: CryptoKey, r: Row): Promise<Entry> {
    const { sealed, ...rest } = r;
    if (!sealed) return rest; // saved before notes were locked; lockOld() locks it
    try {
      return { ...rest, ...(await vault.unseal(key, r.id, sealed)) };
    } catch {
      return { ...rest, subject: 'Locked note', note: '', tags: [], locked: true };
    }
  }

  /** Notes saved before encryption existed: lock them now, one by one, in the background. */
  let locking = false;
  async function lockOld(key: CryptoKey, rows: Row[]) {
    if (locking) return;
    locking = true;
    try {
      for (const r of rows) {
        const sealed = await vault.seal(key, r.id, r);
        const { error } = await sb.from('entries').update({ subject: LOCKED_SUBJECT, note: '', tags: [], sealed }).eq('id', r.id).is('sealed', null);
        if (error) break; // tried again next time the notes load
      }
    } finally {
      locking = false;
    }
  }

  // Until the tree-choice migration has been run there is no `tree` column; fall back
  // to the old columns so the app keeps working (everyone shows as an oak).
  async function profiles<T>(run: (cols: string) => PromiseLike<{ data: unknown; error: PostgrestError | null }>): Promise<T> {
    let { data, error } = await run(P);
    if (error && P !== BASE && (error.code === '42703' || /\btree\b/.test(error.message))) {
      P = BASE;
      ({ data, error } = await run(P));
    }
    if (error) throw error;
    return data as T;
  }
  return {
    mode: 'cloud',
    async getUserId() {
      return (await sb.auth.getSession()).data.session?.user.id ?? null;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => {
        if (!s) void vault.forgetKeys(); // signed out (here or because the session ended): no keys left behind
        cb(s?.user.id ?? null);
      });
      return () => data.subscription.unsubscribe();
    },
    // Sign-up and sign-in are the moments we have the password, so the note key is opened
    // (or made) then. The app waits for this before deciding whether notes are locked.
    async signUp({ name, email, password }) {
      return vault.whileUnlocking(async () => {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } });
        if (error) throw error;
        if (data.session && data.user) await openAfterSignIn(data.user.id, password);
        return { needsConfirm: !data.session };
      });
    },
    async signIn({ email, password }) {
      await vault.whileUnlocking(async () => {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await openAfterSignIn(data.user.id, password);
      });
    },
    async signOut() {
      await vault.forgetKeys(); // the next person on this device can't open the notes
      // this device only, and it works offline (a global sign-out needs the server)
      await sb.auth.signOut({ scope: 'local' });
    },
    async profile(id) {
      return profiles<Profile>((cols) => sb.from('profiles').select(cols).eq('id', id).single());
    },
    async listProfiles() {
      return profiles<Profile[]>((cols) => sb.from('profiles').select(cols).order('points', { ascending: false }).limit(500));
    },
    async setTree(tree) {
      const id = (await sb.auth.getSession()).data.session?.user.id;
      if (!id) throw new Error('Not signed in');
      const { error } = await sb.from('profiles').update({ tree }).eq('id', id);
      if (error) {
        if (error.code === '42703' || /\btree\b/.test(error.message))
          throw new Error('Choosing a tree needs the latest database update (supabase/migrations) — ask the admin to run it.');
        throw error;
      }
    },
    async listEntries() {
      const key = await noteKey();
      const rows: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from('entries').select(E).order('created_at', { ascending: false }).range(from, from + 999);
        if (error) throw explain(error);
        rows.push(...(data as Row[]));
        if (!data || data.length < 1000) break;
      }
      const old = rows.filter((r) => !r.sealed);
      if (old.length) void lockOld(key, old);
      return Promise.all(rows.map((r) => openRow(key, r)));
    },
    async addEntry(input, keep) {
      const key = await noteKey();
      const id = keep?.id ?? crypto.randomUUID();
      // The database gets the points (the tree needs them) and the locked text — nothing readable.
      const row: Record<string, unknown> = {
        id,
        points: input.points,
        subject: LOCKED_SUBJECT,
        note: '',
        tags: [],
        sealed: await vault.seal(key, id, input),
      };
      if (keep?.created_at) row.created_at = keep.created_at;
      let { data, error } = await sb.from('entries').insert(row).select('id, points, created_at').single();
      // offline-notes migration not run: save it without the time it was written (becomes "now")
      if (error?.code === '42501' && row.created_at) {
        delete row.created_at;
        ({ data, error } = await sb.from('entries').insert(row).select('id, points, created_at').single());
      }
      if (!error) return { ...input, ...(data as Pick<Entry, 'id' | 'points' | 'created_at'>) };
      // already uploaded earlier (the reply got lost): fetch the saved copy instead
      if (error.code === '23505') {
        const { data: saved, error: e2 } = await sb.from('entries').select(E).eq('id', id).single();
        if (e2) throw explain(e2);
        return openRow(key, saved as Row);
      }
      throw explain(error);
    },
    async removeEntry(id) {
      const { error } = await sb.from('entries').delete().eq('id', id);
      if (error) throw error;
    },
    async activity(userId) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error } = await sb.rpc('activity_days', { target: userId, tz });
      if (error) throw error;
      return (data ?? []) as DayStat[];
    },
    async adminUsers() {
      const { data, error } = await sb.rpc('admin_list_users');
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
    async noteLock() {
      await vault.unlockSettled();
      const user = (await sb.auth.getSession()).data.session?.user;
      if (!user) return { open: false, hasKey: null, problem: null };
      if (await vault.deviceKey(user.id)) return { open: true, recoveryKey: vault.takeRecoveryKey(user.id) };
      try {
        return { open: false, hasKey: !!(await keyRow(user.id)), problem: null };
      } catch (err) {
        return { open: false, hasKey: null, problem: isOffline(err) ? null : messageOf(err) };
      }
    },
    async unlock(password) {
      const { id } = await me();
      const row = await keyRow(id);
      if (!row) await checkPassword(password); // first time: the key gets locked with this password
      return { recoveryKey: await openKeys(id, password, row) };
    },
    async recover(recoveryKey, password) {
      const { id } = await me();
      const row = await keyRow(id);
      if (!row) throw new Error('This account has no note key yet — unlock with your password to set one up.');
      await checkPassword(password);
      const { update, key } = await vault.openWithRecovery(id, row, recoveryKey, password);
      await saveKeyRow(id, update, false);
      await vault.rememberKey(id, key);
    },
    async startOver(password) {
      const { id } = await me();
      await checkPassword(password);
      const row = await keyRow(id);
      const made = await vault.createKeys(id, password);
      await saveKeyRow(id, made.row, !row);
      await vault.rememberKey(id, made.key);
      return { recoveryKey: made.recoveryKey };
    },
    async newRecoveryKey(password) {
      const { id } = await me();
      const row = await keyRow(id);
      if (!row) throw new Error('Unlock your notes first.');
      let made: Awaited<ReturnType<typeof vault.replaceRecoveryKey>>;
      try {
        made = await vault.replaceRecoveryKey(id, row, password);
      } catch {
        throw new Error("That isn't the password your notes are locked with.");
      }
      await saveKeyRow(id, made.update, false);
      return made.recoveryKey;
    },
  };
}

// ---------------- local ----------------

interface LocalDB {
  users: { id: string; name: string; email: string; is_admin: boolean; created_at: string; tree?: string | null }[];
  entries: (Entry & { user_id: string })[];
  session: string | null;
}

const KEY = 'rooted.v2';

function local(): Backend {
  const listeners = new Set<(id: string | null) => void>();
  const read = (): LocalDB => {
    try {
      const db = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LocalDB | null;
      if (db && Array.isArray(db.users) && Array.isArray(db.entries)) return db;
    } catch {
      /* fall through */
    }
    return { users: [], entries: [], session: null };
  };
  const write = (db: LocalDB) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      throw new Error('Could not save in this browser (storage is full or blocked).');
    }
  };
  const uid = () => crypto.randomUUID();
  const toProfile = (db: LocalDB, u: LocalDB['users'][number]): Profile => {
    const mine = db.entries.filter((e) => e.user_id === u.id);
    return {
      id: u.id, display_name: u.name, is_admin: u.is_admin, created_at: u.created_at, tree: u.tree ?? null,
      points: mine.reduce((s, e) => s + e.points, 0), entry_count: mine.length,
      last_entry_at: mine.map((e) => e.created_at).sort().pop() ?? null,
    };
  };
  const me = (db: LocalDB) => {
    if (!db.session) throw new Error('Not signed in');
    return db.session;
  };
  const setSession = (db: LocalDB, id: string | null) => {
    db.session = id;
    write(db);
    listeners.forEach((l) => l(id));
  };
  return {
    mode: 'local',
    async getUserId() {
      const db = read();
      return db.users.some((u) => u.id === db.session) ? db.session : null;
    },
    onAuth(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signUp({ name, email }) {
      const db = read();
      const mail = email.trim().toLowerCase();
      if (db.users.some((u) => u.email === mail)) throw new Error('That email already has an account here — sign in instead.');
      const user = { id: uid(), name: name.trim(), email: mail, is_admin: db.users.length === 0, created_at: new Date().toISOString() };
      db.users.push(user);
      setSession(db, user.id);
      return { needsConfirm: false };
    },
    async signIn({ email }) {
      const db = read();
      const user = db.users.find((u) => u.email === email.trim().toLowerCase());
      if (!user) throw new Error('No account with that email in this browser.');
      setSession(db, user.id);
    },
    async signOut() {
      setSession(read(), null);
    },
    async profile(id) {
      const db = read();
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error('Profile not found');
      return toProfile(db, u);
    },
    async listProfiles() {
      const db = read();
      return db.users.map((u) => toProfile(db, u)).sort((a, b) => b.points - a.points);
    },
    async setTree(tree) {
      const db = read();
      const user = db.users.find((u) => u.id === me(db));
      if (!user) throw new Error('Not signed in');
      user.tree = tree;
      write(db);
    },
    async listEntries() {
      const db = read();
      const id = me(db);
      return db.entries
        .filter((e) => e.user_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ user_id: _u, ...e }) => e);
    },
    async addEntry(input, keep) {
      const db = read();
      const entry = { ...input, id: keep?.id ?? uid(), created_at: keep?.created_at ?? new Date().toISOString() };
      db.entries.push({ ...entry, user_id: me(db) });
      write(db);
      return entry;
    },
    async removeEntry(id) {
      const db = read();
      const owner = me(db);
      db.entries = db.entries.filter((e) => !(e.id === id && e.user_id === owner));
      write(db);
    },
    async activity(userId) {
      return dayStats(read().entries.filter((e) => e.user_id === userId));
    },
    async adminUsers() {
      const db = read();
      if (!db.users.find((u) => u.id === db.session)?.is_admin) throw new Error('Admins only');
      return db.users.map((u) => ({ ...toProfile(db, u), email: u.email }));
    },
    // Trial mode never sends notes anywhere, so there is nothing to lock.
    async noteLock() {
      return { open: true, recoveryKey: null };
    },
    async unlock() {
      return { recoveryKey: null };
    },
    async recover() {},
    async startOver() {
      throw new Error('Trial mode keeps notes in this browser only.');
    },
    async newRecoveryKey() {
      throw new Error('Trial mode keeps notes in this browser only.');
    },
  };
}

export const backend: Backend = supabase ? cloud() : local();
