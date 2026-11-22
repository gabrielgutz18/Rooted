// One interface, two homes for the data:
//  - cloud: Supabase (accounts, sync, friends on any device)
//  - local: this browser only (works with zero setup, good for trying things out)

import type { PostgrestError } from '@supabase/supabase-js';
import { storedUser, supabase } from './supabase';
import { dayStats, type DayStat } from './growth';
import * as vault from './vault';
import { isAvatarValue } from './avatars';
import { isOffline, withTimeout } from './outbox';
import { BAD_USERNAME, USERNAME_DOMAIN, isValidUsername, loginEmail, normalizeUsername, usernameEmail } from './username';

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  points: number;
  entry_count: number;
  last_entry_at: string | null;
  created_at: string;
  tree?: string | null; // which kind of tree they grow; null until they choose
  /** What they sign in with. null: an older account that hasn't picked one yet (or the admin). */
  username?: string | null;
  /** Their profile icon (src/lib/avatars.ts); null until they choose, undefined before that update. */
  avatar?: string | null;
}

export interface AdminUser extends Profile {
  /** The admin's sign-in email, or the email a member used before picking a username. */
  email: string | null;
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
 * The one note someone pinned to their profile to share it. Every signed-in member can read it
 * (it shows under their tree), so it is a readable copy: the note in their diary stays locked.
 * Its points and date always come from the note itself.
 */
export interface SharedNote {
  entry_id: string;
  subject: string;
  note: string;
  tags: string[];
  points: number;
  written_at: string; // when the note was written
  shared_at: string; // when it was pinned
}

/** What editing a note can change. Its date and the growth it earned stay as they were. */
export type EntryEdit = Pick<Entry, 'subject' | 'note' | 'tags'>;

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
  signUp(a: { username: string; password: string }): Promise<{ needsConfirm: boolean }>;
  /** `login` is a username, or an email (the admin, and members who haven't picked a username yet). */
  signIn(a: { login: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
  /** An older email account picks its username; from then on it signs in with that. */
  chooseUsername(username: string): Promise<void>;
  /**
   * Swap your username for another, like a handle: the new one signs in from now on and the
   * old one is free for anyone. A display name that was just the old username follows it.
   */
  changeUsername(username: string): Promise<{ username: string; display_name: string }>;
  /** Whether a (valid) username is free, someone else's, or already yours. */
  usernameStatus(username: string): Promise<'available' | 'taken' | 'yours'>;
  /** The email this account signs in with, or null when it signs in with a username. Works offline. */
  signInEmail(): Promise<string | null>;
  /** Forgot password: the recovery key sets a new one, signs in and reopens the notes. */
  resetPassword(a: { username: string; recoveryKey: string; password: string }): Promise<void>;
  /** Admin only: gives a member a new random password, returned to pass on to them. */
  adminResetPassword(userId: string): Promise<string>;
  profile(id: string): Promise<Profile>;
  listProfiles(): Promise<Profile[]>;
  setTree(tree: string): Promise<void>;
  /** Your profile icon (one of src/lib/avatars.ts), or null for none. */
  setAvatar(avatar: string | null): Promise<void>;
  listEntries(): Promise<Entry[]>;
  addEntry(input: EntryInput, keep?: KeepAs): Promise<Entry>;
  /** Rewrites a saved note's subject, note and tags (locked again with the same key). */
  editEntry(id: string, edit: EntryEdit): Promise<void>;
  removeEntry(id: string): Promise<void>;
  /** Per-day activity for anyone's tree — counts only, never their notes. */
  activity(userId: string): Promise<DayStat[]>;
  /** The note someone pinned to share, or null (also null before that database update). */
  sharedNote(userId: string): Promise<SharedNote | null>;
  /** Pin one of your notes (replacing any pinned before): a readable copy every member can see. */
  shareNote(entry: Entry): Promise<SharedNote>;
  /** Unpin: the readable copy is deleted. The note itself stays. */
  unshareNote(): Promise<void>;
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
const NEEDS_ACCOUNT_SERVER =
  'Usernames need the latest server update (supabase/functions/account and 20261120000000_usernames.sql) — ask the admin to set it up.';
const NEEDS_SHARING =
  'Pinning a note needs the latest database update (supabase/migrations/20261122000000_shared_notes.sql) — ask the admin to run it.';
const NOT_PINNABLE = "That note can't be pinned yet — it's still waiting to upload.";
const NEEDS_AVATARS = 'Profile icons need the latest database update (supabase/migrations/20261121000000_avatars.sql) — ask the admin to run it.';
const NEEDS_AVATAR_FIX = 'Profile icons need a database fix (supabase/migrations/20261122000001_avatar_check_fix.sql) — ask the admin to run it.';
const TAKEN = 'That username is taken.';
const WRONG_LOGIN = 'Wrong username or password.';
const LOCKED_SUBJECT = 'locked'; // what the database holds in place of a locked note's subject

// ---------------- cloud ----------------

const WRONG_PASSWORD = "That password doesn't open your notes. If it was changed or reset, use your recovery key instead.";

const messageOf = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err);

/** Supabase Auth's wording assumes emails; members use usernames. */
function authError(err: { message: string; code?: string }): Error {
  if (err.code === 'user_already_exists' || err.code === 'email_exists' || /already (been )?registered/i.test(err.message)) return new Error(TAKEN);
  if (err.code === 'invalid_credentials' || /invalid login credentials/i.test(err.message)) return new Error(WRONG_LOGIN);
  return err instanceof Error ? err : new Error(err.message);
}

function cloud(): Backend {
  const sb = supabase!;
  const BASE = 'id, display_name, is_admin, points, entry_count, last_entry_at, created_at';
  // Newest columns first; each one is dropped while its migration hasn't been run yet.
  const COLS = [`${BASE}, tree, username, avatar`, `${BASE}, tree, username`, `${BASE}, tree`, BASE];
  let level = 0;
  const E = 'id, subject, note, points, tags, created_at, sealed';
  const K = 'salt, iterations, wrapped, recovery_salt, recovery';
  const S = 'entry_id, subject, note, tags, points, written_at, shared_at';
  /** Missing table or column (a migration that hasn't been run yet). */
  const missing = (e: PostgrestError) => ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(e.code);
  type Row = Omit<Entry, 'pending' | 'locked'> & { sealed: string | null };

  /** Missing table or column: the private-notes migration hasn't been run yet. */
  const explain = (e: PostgrestError) => (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(e.code) ? new Error(NEEDS_UPDATE) : e);

  /**
   * Who is signed in, without waiting on the network. Offline (or on a connection that
   * hangs) an expired sign-in can't be refreshed, so supabase-js reports none after ~30 s
   * of retrying; it is still kept on this device, so that one counts (see storedUser).
   */
  async function currentUser(): Promise<{ id: string; email?: string } | null> {
    if (navigator.onLine === false) return storedUser();
    try {
      const { data, error } = await withTimeout(sb.auth.getSession(), 5000);
      if (data.session) return data.session.user;
      // couldn't refresh for lack of a connection: storage still holds the sign-in
      if (error && (error.name === 'AuthRetryableFetchError' || isOffline(error))) return storedUser();
      return null;
    } catch {
      return storedUser(); // timed out
    }
  }

  async function me() {
    const user = await currentUser();
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
    await saveResetCheck(userId, made.recoveryKey);
    return made.recoveryKey;
  }

  /**
   * Lets this recovery key reset a forgotten password (the server keeps a hash of a value made
   * from it). Best effort: the key itself is already saved, and failing here must not hide it.
   */
  async function saveResetCheck(userId: string, recoveryKey: string) {
    try {
      const check_hash = await vault.resetCheckHash(recoveryKey);
      await sb.from('reset_checks').upsert({ user_id: userId, check_hash, updated_at: new Date().toISOString() });
    } catch {
      /* offline, or the usernames migration isn't run yet */
    }
  }

  /** The recovery key opens the note key; lock it again with `password` and keep it here. */
  async function reopenWithRecovery(userId: string, recoveryKey: string, password: string) {
    const row = await keyRow(userId);
    if (!row) throw new Error('This account has no note key yet — unlock with your password to set one up.');
    const { update, key } = await vault.openWithRecovery(userId, row, recoveryKey, password);
    await saveKeyRow(userId, update, false);
    await vault.rememberKey(userId, key);
  }

  /** Calls the `account` server function (anything that changes how someone signs in). */
  async function account<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.functions.invoke('account', { body });
    if (!error) return data as T;
    const res = (error as { context?: unknown }).context;
    if (res instanceof Response) {
      if (res.status === 404) throw new Error(NEEDS_ACCOUNT_SERVER);
      const said = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (said && typeof said.error === 'string') throw new Error(said.error);
    }
    throw error;
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

  // Until the tree-choice and usernames migrations have been run there are no `tree` and
  // `username` columns; fall back to the older columns so the app keeps working (everyone
  // shows as an oak, and nobody is asked for a username).
  async function profiles<T>(run: (cols: string) => PromiseLike<{ data: unknown; error: PostgrestError | null }>): Promise<T> {
    for (;;) {
      const { data, error } = await run(COLS[level]);
      if (error && level < COLS.length - 1 && (error.code === '42703' || /\b(tree|username|avatar)\b/.test(error.message))) {
        level++;
        continue;
      }
      if (error) throw error;
      return data as T;
    }
  }
  return {
    mode: 'cloud',
    async getUserId() {
      return (await currentUser())?.id ?? null;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((event, s) => {
        if (event === 'SIGNED_OUT') {
          void vault.forgetKeys(); // signed out (here, or the server ended the session): no keys left behind
          return cb(null);
        }
        // INITIAL_SESSION comes without a session when an expired sign-in couldn't be
        // refreshed offline. That isn't a sign-out: stay in, with the sign-in kept here.
        cb(s?.user.id ?? storedUser()?.id ?? null);
      });
      return () => data.subscription.unsubscribe();
    },
    // Sign-up and sign-in are the moments we have the password, so the note key is opened
    // (or made) then. The app waits for this before deciding whether notes are locked.
    // A username account's email is a stand-in that never receives mail (src/lib/username.ts).
    async signUp({ username, password }) {
      if (!isValidUsername(username)) throw new Error(BAD_USERNAME);
      return vault.whileUnlocking(async () => {
        const { data, error } = await sb.auth.signUp({
          email: usernameEmail(username),
          password,
          options: { data: { display_name: username.trim() } },
        });
        if (error) throw authError(error);
        if (data.session && data.user) await openAfterSignIn(data.user.id, password);
        return { needsConfirm: !data.session };
      });
    },
    async signIn({ login, password }) {
      await vault.whileUnlocking(async () => {
        const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail(login), password });
        if (error) throw authError(error);
        await openAfterSignIn(data.user.id, password);
      });
    },
    async chooseUsername(username) {
      if (!isValidUsername(username)) throw new Error(BAD_USERNAME);
      await account({ action: 'choose-username', username: normalizeUsername(username) });
      // the session still carries the old email until it is refreshed
      await sb.auth.refreshSession();
    },
    async changeUsername(username) {
      if (!isValidUsername(username)) throw new Error(BAD_USERNAME);
      let done: { username: string; display_name: string };
      try {
        done = await account({ action: 'change-username', username: username.trim() });
      } catch (err) {
        // the account function deployed on the server is older than this feature
        if (messageOf(err) === 'Unknown action') throw new Error(NEEDS_ACCOUNT_SERVER);
        throw err;
      }
      // the session still carries the old stand-in email until it is refreshed
      await sb.auth.refreshSession();
      return done;
    },
    async usernameStatus(username) {
      const name = normalizeUsername(username);
      const { data, error } = await sb.from('profiles').select('id').eq('username', name).maybeSingle();
      if (error) throw error;
      if (!data) return 'available';
      return data.id === (await currentUser())?.id ? 'yours' : 'taken';
    },
    async signInEmail() {
      const email = (await currentUser())?.email;
      return email && !email.endsWith(`@${USERNAME_DOMAIN}`) ? email : null;
    },
    async resetPassword({ username, recoveryKey, password }) {
      if (!isValidUsername(username)) throw new Error("That username and recovery key don't match.");
      if (password.length < 6) throw new Error('Password should be at least 6 characters.');
      const check = await vault.resetCheck(recoveryKey);
      await account({ action: 'reset', username: normalizeUsername(username), check, password });
      await vault.whileUnlocking(async () => {
        const { data, error } = await sb.auth.signInWithPassword({ email: usernameEmail(username), password });
        if (error) throw authError(error);
        try {
          // the same key reopens the notes, locked from now on with the new password
          await reopenWithRecovery(data.user.id, recoveryKey, password);
        } catch {
          /* the unlock screen takes it from here */
        }
      });
    },
    async adminResetPassword(userId) {
      return (await account<{ password: string }>({ action: 'admin-reset', user_id: userId })).password;
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
      const { id } = await me();
      const { error } = await sb.from('profiles').update({ tree }).eq('id', id);
      if (error) {
        if (error.code === '42703' || /\btree\b/.test(error.message))
          throw new Error('Choosing a tree needs the latest database update (supabase/migrations) — ask the admin to run it.');
        throw error;
      }
    },
    async setAvatar(avatar) {
      if (avatar !== null && !isAvatarValue(avatar)) throw new Error('Unknown icon');
      const { id } = await me();
      const { error } = await sb.from('profiles').update({ avatar }).eq('id', id);
      if (error) {
        // the value already passed isAvatarValue, so a failed check means the database's check is out of date
        if (error.code === '23514' || /profiles_avatar_name/.test(error.message)) throw new Error(NEEDS_AVATAR_FIX);
        if (error.code === '42703' || /\bavatar\b/.test(error.message)) throw new Error(NEEDS_AVATARS);
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
      // a note written while Jesus visited carries 3× (src/lib/visit.ts); until the database has
      // 20261122000002_blessed_notes.sql it still caps a note at 60, so keep the note with 60
      if (error?.code === '23514' && /points/.test(error.message) && Number(row.points) > 60) {
        row.points = 60;
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
    async editEntry(id, edit) {
      const key = await noteKey();
      const sealed = await vault.seal(key, id, edit);
      // the database only ever sees the new locked text; points and the date can't change
      const { data, error } = await sb.from('entries').update({ subject: LOCKED_SUBJECT, note: '', tags: [], sealed }).eq('id', id).select('id');
      if (error) throw explain(error);
      if (!data?.length) throw new Error('That note is gone — it may have been deleted on another device.');
      // pinned to share? its readable copy follows the new words (best effort)
      try {
        const uid = (await me()).id;
        await sb.from('shared_notes').update({ subject: edit.subject, note: edit.note, tags: edit.tags }).eq('user_id', uid).eq('entry_id', id);
      } catch {
        /* the sharing migration isn't run, or the connection dropped */
      }
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
    async sharedNote(userId) {
      const { data, error } = await sb.from('shared_notes').select(S).eq('user_id', userId).maybeSingle();
      if (error) {
        if (missing(error)) return null; // nobody can have pinned one yet
        throw error;
      }
      return data as SharedNote | null;
    },
    async shareNote(entry) {
      if (entry.pending || entry.locked) throw new Error(NOT_PINNABLE);
      const { id } = await me();
      const { data, error } = await sb
        .from('shared_notes')
        .upsert({ user_id: id, entry_id: entry.id, subject: entry.subject, note: entry.note, tags: entry.tags }, { onConflict: 'user_id' })
        .select(S)
        .single();
      if (error) throw missing(error) ? new Error(NEEDS_SHARING) : error;
      return data as SharedNote;
    },
    async unshareNote() {
      const { id } = await me();
      const { error } = await sb.from('shared_notes').delete().eq('user_id', id);
      if (error && !missing(error)) throw error;
    },
    async adminUsers() {
      const { data, error } = await sb.rpc('admin_list_users');
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
    async noteLock() {
      await vault.unlockSettled();
      const user = await currentUser();
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
      if (!(await keyRow(id))) throw new Error('This account has no note key yet — unlock with your password to set one up.');
      await checkPassword(password);
      await reopenWithRecovery(id, recoveryKey, password);
      await saveResetCheck(id, recoveryKey); // older keys: from now on this one resets the password too
    },
    async startOver(password) {
      const { id } = await me();
      await checkPassword(password);
      const row = await keyRow(id);
      const made = await vault.createKeys(id, password);
      await saveKeyRow(id, made.row, !row);
      await vault.rememberKey(id, made.key);
      await saveResetCheck(id, made.recoveryKey);
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
      await saveResetCheck(id, made.recoveryKey); // the old key stops resetting the password too
      return made.recoveryKey;
    },
  };
}

// ---------------- local ----------------

interface LocalDB {
  users: { id: string; name: string; username?: string | null; email?: string; is_admin: boolean; created_at: string; tree?: string | null; avatar?: string | null }[];
  entries: (Entry & { user_id: string })[];
  session: string | null;
  /** each person's pinned note, by user id */
  shared?: Record<string, SharedNote>;
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
      id: u.id, display_name: u.name, is_admin: u.is_admin, created_at: u.created_at, tree: u.tree ?? null, username: u.username ?? null, avatar: u.avatar ?? null,
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
    async signUp({ username }) {
      if (!isValidUsername(username)) throw new Error(BAD_USERNAME);
      const db = read();
      const name = normalizeUsername(username);
      if (db.users.some((u) => u.username === name)) throw new Error(TAKEN);
      const user = { id: uid(), name: username.trim(), username: name, is_admin: db.users.length === 0, created_at: new Date().toISOString() };
      db.users.push(user);
      setSession(db, user.id);
      return { needsConfirm: false };
    },
    async signIn({ login }) {
      const db = read();
      const user = login.includes('@')
        ? db.users.find((u) => u.email === login.trim().toLowerCase()) // trial accounts made before usernames
        : db.users.find((u) => u.username === normalizeUsername(login));
      if (!user) throw new Error('No account with that username in this browser.');
      setSession(db, user.id);
    },
    async chooseUsername(username) {
      if (!isValidUsername(username)) throw new Error(BAD_USERNAME);
      const db = read();
      const name = normalizeUsername(username);
      const user = db.users.find((u) => u.id === me(db));
      if (!user) throw new Error('Not signed in');
      if (db.users.some((u) => u.username === name && u.id !== user.id)) throw new Error(TAKEN);
      user.username = name;
      write(db);
    },
    async changeUsername(username) {
      if (!isValidUsername(username)) throw new Error(BAD_USERNAME);
      const db = read();
      const name = normalizeUsername(username);
      const user = db.users.find((u) => u.id === me(db));
      if (!user) throw new Error('Not signed in');
      if (!user.username) throw new Error('Pick a username first.');
      if (user.username === name) throw new Error("That's already your username.");
      if (db.users.some((u) => u.username === name)) throw new Error(TAKEN);
      if (user.name.trim().toLowerCase() === user.username) user.name = username.trim();
      user.username = name;
      write(db);
      return { username: name, display_name: user.name };
    },
    async usernameStatus(username) {
      const db = read();
      const owner = db.users.find((u) => u.username === normalizeUsername(username));
      return !owner ? 'available' : owner.id === db.session ? 'yours' : 'taken';
    },
    async signInEmail() {
      const db = read();
      const user = db.users.find((u) => u.id === db.session);
      return user && !user.username ? (user.email ?? null) : null;
    },
    async resetPassword() {
      throw new Error('Trial mode keeps notes in this browser only.');
    },
    async adminResetPassword() {
      throw new Error('Trial mode keeps notes in this browser only.');
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
    async setAvatar(avatar) {
      if (avatar !== null && !isAvatarValue(avatar)) throw new Error('Unknown icon');
      const db = read();
      const user = db.users.find((u) => u.id === me(db));
      if (!user) throw new Error('Not signed in');
      user.avatar = avatar;
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
    async editEntry(id, edit) {
      const db = read();
      const owner = me(db);
      const entry = db.entries.find((e) => e.id === id && e.user_id === owner);
      if (!entry) throw new Error('That note is gone.');
      Object.assign(entry, { subject: edit.subject, note: edit.note, tags: edit.tags });
      const pin = db.shared?.[owner];
      if (pin?.entry_id === id) Object.assign(pin, { subject: edit.subject, note: edit.note, tags: edit.tags });
      write(db);
    },
    async removeEntry(id) {
      const db = read();
      const owner = me(db);
      db.entries = db.entries.filter((e) => !(e.id === id && e.user_id === owner));
      if (db.shared?.[owner]?.entry_id === id) delete db.shared[owner]; // its pin goes with it
      write(db);
    },
    async activity(userId) {
      return dayStats(read().entries.filter((e) => e.user_id === userId));
    },
    async sharedNote(userId) {
      const db = read();
      const pin = db.shared?.[userId];
      return pin && db.entries.some((e) => e.id === pin.entry_id && e.user_id === userId) ? pin : null;
    },
    async shareNote(entry) {
      const db = read();
      const owner = me(db);
      const saved = db.entries.find((e) => e.id === entry.id && e.user_id === owner);
      if (!saved) throw new Error('You can only pin your own notes.');
      const before = db.shared?.[owner];
      const pin: SharedNote = {
        entry_id: saved.id,
        subject: entry.subject,
        note: entry.note,
        tags: entry.tags,
        points: saved.points,
        written_at: saved.created_at,
        shared_at: before?.entry_id === saved.id ? before.shared_at : new Date().toISOString(),
      };
      db.shared = { ...db.shared, [owner]: pin };
      write(db);
      return pin;
    },
    async unshareNote() {
      const db = read();
      const owner = me(db);
      if (db.shared) delete db.shared[owner];
      write(db);
    },
    async adminUsers() {
      const db = read();
      if (!db.users.find((u) => u.id === db.session)?.is_admin) throw new Error('Admins only');
      return db.users.map((u) => ({ ...toProfile(db, u), email: u.email ?? null }));
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
