import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

const looksConfigured = !!url && !!key && !url.includes('your-project-ref');

/** null when no Supabase env vars are set — the app then runs in local-only mode. */
export const supabase: SupabaseClient | null = looksConfigured ? createClient(url!, key!) : null;
