import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

const looksConfigured = !!url && !!key && !url.includes('your-project-ref');

/**
 * Where the sign-in is kept in this browser. This is the name supabase-js picks by default;
 * it is spelled out so `storedUser` can read the same place (changing it would sign everyone out).
 */
const STORAGE_KEY = looksConfigured ? `sb-${new URL(url!).hostname.split('.')[0]}-auth-token` : '';

/**
 * null when no Supabase env vars are set — the app then runs in local-only mode.
 * The sign-in is kept on this device and refreshed in the background, so people stay
 * signed in between visits (and in the installed app) until they press Sign out.
 */
export const supabase: SupabaseClient | null = looksConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY },
    })
  : null;

/**
 * The person signed in on this device, read straight from storage without the network.
 *
 * An access token lasts about an hour. After that, supabase-js won't report the session
 * until it has refreshed the token, and offline it can't: it retries for ~30 seconds and
 * then answers "no session". The sign-in is still here, though, and it is only removed when
 * the server says it has really ended (or on Sign out). So offline, this is who is signed in.
 */
export function storedUser(): { id: string; email?: string } | null {
  if (!STORAGE_KEY) return null;
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      refresh_token?: unknown;
      user?: { id?: unknown; email?: unknown };
    } | null;
    if (!s || typeof s.refresh_token !== 'string' || typeof s.user?.id !== 'string') return null;
    return { id: s.user.id, email: typeof s.user.email === 'string' ? s.user.email : undefined };
  } catch {
    return null;
  }
}
