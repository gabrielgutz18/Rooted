// Your name on your profile (Menu → My profile → Your name): the name friends see beside your
// tree, e.g. "Juan Dela Cruz". You still sign in with your username.
// The database keeps the same rule (profiles.display_name: 1–40 characters,
// supabase/migrations/20261122000003_real_names.sql).

export const NAME_MAX = 40;
export const BAD_NAME = 'Write your name, up to 40 letters.';

/** The name as it's saved: spaces tidied, no line breaks; null if it's empty or too long. */
export function cleanName(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  const length = [...name].length; // letters, not UTF-16 units (as the database counts them)
  return length >= 1 && length <= NAME_MAX ? name : null;
}
