// Rooted's account server: the few things that change how someone signs in, which the
// browser can't be trusted to do on its own.
//
//   choose-username  an older email account picks its username (signed in)
//   change-username  a member swaps their username for another, like a handle (signed in)
//   reset            forgot password: a new one, for whoever holds the recovery key (signed out)
//   admin-reset      the admin gives a member a new random password (admin only)
//
// Deploy with the gateway's JWT check off (it checks the caller itself, and the project's
// publishable key isn't a JWT):
//   npx supabase functions deploy account --no-verify-jwt --project-ref <your-project-ref>
//
// Username rules and the stand-in email domain match src/lib/username.ts.

import { createClient } from 'npm:@supabase/supabase-js@2';

const DOMAIN = 'rooted.invalid';
const USERNAME = /^[a-z0-9_]{3,20}$/;
const MAX_TRIES = 5; // failed resets per username per hour

const BAD_USERNAME = 'A username is 3–20 letters, numbers or _ (no spaces).';
const NO_MATCH = "That username and recovery key don't match.";

function secretKey(): string {
  try {
    const key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
    if (typeof key === 'string' && key) return key;
  } catch {
    /* older project: fall back to the legacy key */
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const fail = (status: number, error: string) => reply(status, { error });

const usernameOf = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** The signed-in person making the request, or null. */
async function caller(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromB64(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const s = atob(text);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Compares without stopping at the first difference, so timing says nothing. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 12 easy-to-read characters (no 0/o, 1/l/i), like "k7dm-qx3a-9fhe". */
function makePassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  while (out.length < 12) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && out.length < 12) out += letters[b % letters.length]; // 248 = 8 × 31: no bias
    }
  }
  return out.match(/.{4}/g)!.join('-');
}

async function chooseUsername(req: Request, body: Record<string, unknown>) {
  const user = await caller(req);
  if (!user) return fail(401, 'Not signed in');
  const name = usernameOf(body.username);
  if (!USERNAME.test(name)) return fail(400, BAD_USERNAME);

  const { data: profile, error } = await admin.from('profiles').select('is_admin, username').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!profile) return fail(400, 'Profile not found');
  if (profile.is_admin) return fail(400, 'The admin keeps signing in with email.');
  if (profile.username) return fail(400, 'You already have a username.');

  // The database keeps the old email for the admin and sets the username (usernames migration).
  const { error: e2 } = await admin.auth.admin.updateUserById(user.id, { email: `${name}@${DOMAIN}`, email_confirm: true });
  if (e2) {
    if (e2.code === 'email_exists' || /already/i.test(e2.message)) return fail(409, 'That username is taken.');
    throw e2;
  }
  return reply(200, { username: name });
}

/**
 * Like changing a handle: the new username signs in from now on, the old one stops working
 * at once and is free for anyone. Password, tree and notes stay. A display name that was
 * just the old username follows the new one (as typed, so "Grace_G" keeps its capitals).
 */
async function changeUsername(req: Request, body: Record<string, unknown>) {
  const user = await caller(req);
  if (!user) return fail(401, 'Not signed in');
  const typed = String(body.username ?? '').trim();
  const name = usernameOf(typed);
  if (!USERNAME.test(name)) return fail(400, BAD_USERNAME);

  const { data: profile, error } = await admin.from('profiles').select('is_admin, username, display_name').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!profile) return fail(400, 'Profile not found');
  if (profile.is_admin) return fail(400, 'The admin keeps signing in with email.');
  if (!profile.username) return fail(400, 'Pick a username first.');
  if (profile.username === name) return fail(400, "That's already your username.");

  // The database moves the username along with the stand-in email (usernames migration).
  const { error: e2 } = await admin.auth.admin.updateUserById(user.id, { email: `${name}@${DOMAIN}`, email_confirm: true });
  if (e2) {
    if (e2.code === 'email_exists' || /already/i.test(e2.message)) return fail(409, 'That username is taken.');
    throw e2;
  }
  let displayName = profile.display_name as string;
  if (displayName.trim().toLowerCase() === profile.username) {
    const { error: e3 } = await admin.from('profiles').update({ display_name: typed }).eq('id', user.id);
    if (!e3) displayName = typed; // best effort: the username itself has already changed
  }
  return reply(200, { username: name, display_name: displayName });
}

async function reset(body: Record<string, unknown>) {
  const name = usernameOf(body.username);
  const check = typeof body.check === 'string' ? fromB64(body.check) : null;
  const password = String(body.password ?? '');
  if (!USERNAME.test(name) || !check || check.length !== 32) return fail(400, NO_MATCH);
  if (password.length < 6) return fail(400, 'Password should be at least 6 characters.');

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('reset_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('username', name)
    .gte('at', since);
  if (error) throw error;
  if ((count ?? 0) >= MAX_TRIES) return fail(429, 'Too many tries. Wait an hour, then try again.');

  const { data: profile, error: e1 } = await admin.from('profiles').select('id').eq('username', name).maybeSingle();
  if (e1) throw e1;
  const { data: row, error: e2 } = profile
    ? await admin.from('reset_checks').select('check_hash').eq('user_id', profile.id).maybeSingle()
    : { data: null, error: null };
  if (e2) throw e2;

  if (profile && !row) {
    // made before resets existed: only a newer recovery key (Menu → Recovery key) can do this
    return fail(400, "This account's recovery key can't reset the password. Ask the admin to reset it.");
  }
  if (!profile || !row || !same(await sha256Hex(check), row.check_hash)) {
    await admin.from('reset_attempts').insert({ username: name });
    return fail(400, NO_MATCH);
  }

  const { error: e3 } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (e3) return fail(400, e3.message);
  await admin.from('reset_attempts').delete().eq('username', name);
  return reply(200, { ok: true });
}

async function adminReset(req: Request, body: Record<string, unknown>) {
  const user = await caller(req);
  if (!user) return fail(401, 'Not signed in');
  const { data: me, error } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!me?.is_admin) return fail(403, 'Admins only');

  const target = String(body.user_id ?? '');
  if (target === user.id) return fail(400, 'Reset your own password from the Supabase dashboard.');
  const password = makePassword();
  const { error: e2 } = await admin.auth.admin.updateUserById(target, { password });
  if (e2) return fail(400, e2.message);
  return reply(200, { password });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'Method not allowed');
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Bad request');
  }
  try {
    switch (body.action) {
      case 'choose-username':
        return await chooseUsername(req, body);
      case 'change-username':
        return await changeUsername(req, body);
      case 'reset':
        return await reset(body);
      case 'admin-reset':
        return await adminReset(req, body);
      default:
        return fail(400, 'Unknown action');
    }
  } catch (err) {
    console.error(err);
    return fail(500, 'Something went wrong.');
  }
});
