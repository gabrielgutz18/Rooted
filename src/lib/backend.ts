// One interface, two homes for the data:
//  - cloud: Supabase (accounts, sync, friends on any device)
//  - local: this browser only (works with zero setup, good for trying things out)

import { supabase } from './supabase';
import { dayStats, type DayStat } from './growth';

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  points: number;
  entry_count: number;
  last_entry_at: string | null;
  created_at: string;
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
}

export type EntryInput = Pick<Entry, 'subject' | 'note' | 'points' | 'tags'>;

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
  listEntries(): Promise<Entry[]>;
  addEntry(input: EntryInput): Promise<Entry>;
  removeEntry(id: string): Promise<void>;
  /** Per-day activity for anyone's tree — counts only, never their notes. */
  activity(userId: string): Promise<DayStat[]>;
  adminUsers(): Promise<AdminUser[]>;
}

// ---------------- cloud ----------------

function cloud(): Backend {
  const sb = supabase!;
  const P = 'id, display_name, is_admin, points, entry_count, last_entry_at, created_at';
  const E = 'id, subject, note, points, tags, created_at';
  return {
    mode: 'cloud',
    async getUserId() {
      return (await sb.auth.getSession()).data.session?.user.id ?? null;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user.id ?? null));
      return () => data.subscription.unsubscribe();
    },
    async signUp({ name, email, password }) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw error;
      return { needsConfirm: !data.session };
    },
    async signIn({ email, password }) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async profile(id) {
      const { data, error } = await sb.from('profiles').select(P).eq('id', id).single();
      if (error) throw error;
      return data as Profile;
    },
    async listProfiles() {
      const { data, error } = await sb.from('profiles').select(P).order('points', { ascending: false }).limit(500);
      if (error) throw error;
      return data as Profile[];
    },
    async listEntries() {
      const all: Entry[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from('entries').select(E).order('created_at', { ascending: false }).range(from, from + 999);
        if (error) throw error;
        all.push(...(data as Entry[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
    async addEntry(input) {
      const { data, error } = await sb.from('entries').insert(input).select(E).single();
      if (error) throw error;
      return data as Entry;
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
  };
}

// ---------------- local ----------------

interface LocalDB {
  users: { id: string; name: string; email: string; is_admin: boolean; created_at: string }[];
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
      id: u.id, display_name: u.name, is_admin: u.is_admin, created_at: u.created_at,
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
    async listEntries() {
      const db = read();
      const id = me(db);
      return db.entries
        .filter((e) => e.user_id === id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ user_id: _u, ...e }) => e);
    },
    async addEntry(input) {
      const db = read();
      const entry = { ...input, id: uid(), created_at: new Date().toISOString() };
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
  };
}

export const backend: Backend = supabase ? cloud() : local();
