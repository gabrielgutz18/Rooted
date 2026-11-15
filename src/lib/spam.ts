// Keeps spam out of the diary, before anything is saved:
//  - random typing ("shadgjhasgd", "asdasd", "a1s2d3", "!@#$%"), the same word over and
//    over, or no real words at all are refused;
//  - one note a minute, NOTES_PER_DAY in any 24 hours, and never the same note twice.
// Notes are locked on the device before they are sent, so the server can't read them and
// can't check the words. It does enforce the 24-hour limit, with room to spare
// (supabase/migrations/20261119000000_note_limits.sql), for anyone who skips the app.

import type { Entry } from './backend';

export const NOTE_GAP_MS = 60_000;
export const NOTES_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export type NoteIssue =
  | { kind: 'junk'; words: string[] } // random typing, or a jumble of letters, numbers and symbols
  | { kind: 'repeat' } // the same word again and again
  | { kind: 'short' }; // no real words

export type LimitIssue =
  | { kind: 'same' } // this note was already saved in the last 24 hours
  | { kind: 'fast'; wait: number } // ms until the next note is allowed
  | { kind: 'many'; wait: number };

// ---------- what random typing looks like ----------

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const both = (rows: string[]) => rows.flatMap((r) => [r, [...r].reverse().join('')]);
const slices = (rows: string[], n: number) => rows.flatMap((r) => Array.from({ length: r.length - n + 1 }, (_, i) => r.slice(i, i + n)));

// Four keys in a row on the keyboard ("asdf", "lkjh"). Real words only have these few.
const RUN4 = new Set(slices(both(ROWS), 4).filter((s) => !['erty', 'ytre', 'wert', 'trew'].includes(s)));
// Three in a row, the ones no word has (the top row is in "power", "party", "tree"…).
const RUN3 = new Set([...slices(both(ROWS.slice(1)), 3), 'qwe', 'ewq']);

// Letter pairs that (almost) never meet inside an English, Tagalog or Taglish word.
// Pairs starting with g, n, r, s or d are left out: Tagalog puts pag-, nag-, mag- in front
// of anything ("nagjoin", "pagdating", "nagvlog").
const RARE = new Set(
  [
    'qb qc qd qf qg qh qj qk ql qm qn qp qq qr qs qt qv qw qx qz',
    'jb jc jd jf jg jh jj jk jl jm jn jp jq jr js jt jv jw jx jz',
    'cj fj hj kj lj mj pj qj rj sj tj vj wj xj zj',
    'xb xd xf xg xj xk xm xn xq xr xs xv xw xx xz',
    'zb zc zd zf zg zh zj zk zm zn zp zq zr zs zt zv zw zx',
    'vb vc vd vf vg vh vj vk vm vn vp vq vr vt vw vx vz',
    'wj wq wv wx wz',
    'fb fc fd fg fh fj fk fm fn fp fq fv fx fz',
    'hc hg hj hk hp hq hv hx hz',
    'kj kq kv kx kz',
    'lj lq lx',
    'pj pq pv px pz',
    'mj mq mx mz',
    'bq bx bz',
    'cb cf cg cj cp cv cw cx',
    'tj tq tx',
  ]
    .join(' ')
    .split(' '),
);

const VOWEL = /[aeiouy]/g;

/** A lowercase, letters-only word of 4+ letters: does it look like keyboard mashing? */
function looksRandom(w: string): boolean {
  const vowels = (w.match(VOWEL) ?? []).length;
  if (!vowels && w.length >= 6) return true;
  for (let i = 0; i + 4 <= w.length; i++) if (RUN4.has(w.slice(i, i + 4))) return true;

  // "asdasdasd"; laughter like "hahaha" and Tagalog "kakakain" are fine
  for (const [, chunk] of w.matchAll(/([a-z]{3,8})\1{2,}/g)) if (!/^(.{1,2})\1+$/.test(chunk)) return true;
  // "asdasd", "qweqwe"
  for (const [, chunk] of w.matchAll(/([a-z]{3,8})\1/g)) for (const r of RUN3) if (chunk.includes(r)) return true;

  // the first pair is skipped: names like Jhon, Rjay, Zhang
  let rare = 0;
  for (let i = 1; i + 2 <= w.length; i++) if (RARE.has(w.slice(i, i + 2))) rare++;
  if (rare >= 2) return true;

  // six consonants running (th, sh, ng… count as one, so "strengths", "watchstrap" are fine)
  const units = w.replace(/th|sh|ch|ph|wh|gh|ck|ng/g, '#');
  if (/[^aeiouy]{6}/.test(units)) return true;

  // home-row mashing with hardly a vowel ("shadgjhasgd"); "dalaga", "halaga" have plenty
  return w.length >= 7 && /^[asdfghjkl]+$/.test(w) && vowels / w.length < 0.3;
}

type Verdict = 'skip' | 'ok' | 'weak' | 'strong';

function judgeWord(part: string): Verdict {
  const caps = part.length > 1 && part === part.toUpperCase() && part !== part.toLowerCase();
  const w = part
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/(.)\1{2,}/g, '$1$1'); // "sooo blessed" reads as "soo"
  if (!/^[a-z]+$/.test(w) || w.length < 3) return 'skip'; // short words, other alphabets
  if (w.length === 3) return RUN3.has(w) ? 'weak' : 'skip'; // "asd", "qwe"
  if (caps && w.length <= 6) return 'skip'; // acronyms: GCASH, BCBP, DLSU
  if (!looksRandom(w)) return 'ok';
  return w.length >= 6 ? 'strong' : 'weak';
}

const SYMBOL = /[@#$%^&*=+<>~|\\{}[\]`]/;

/** One piece of text between spaces. */
function judgeToken(raw: string): Verdict {
  // links, emails, #hashtags and @names aren't judged
  if (/^(https?:\/\/|www\.)|^[#@]\S|^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(raw)) return 'skip';

  // a jumble of symbols ("!@#$%^"), or symbols wedged between letters ("as@d#f")
  const symbols = new Set([...raw].filter((c) => SYMBOL.test(c)));
  if (symbols.size >= 4) return 'strong';
  if ((raw.match(/[a-z][@#$%^&*=+<>~|\\{}[\]`]+(?=[a-z])/gi) ?? []).length >= 2) return 'strong';

  const core = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  if (!core) return 'skip'; // punctuation, emoji
  if (/^[\p{N}.,:/-]+$/u.test(core)) return core.replace(/\D/g, '').length >= 14 ? 'strong' : 'skip'; // numbers, 3:16

  let worst: Verdict = 'skip';
  const rank = { skip: 0, ok: 1, weak: 2, strong: 3 };
  const note = (v: Verdict) => {
    if (rank[v] > rank[worst]) worst = v;
  };
  for (const part of core.split(/[^\p{L}\p{N}]+/u)) {
    if (!part) continue;
    const segs = part.match(/\p{L}+|\p{N}+/gu) ?? [];
    if (segs.length > 1) {
      // letters and numbers mixed. Fine: 3pm, 2nd, covid19, 1Cor13, 10x10, gr8.
      // Not fine: a1b2, asd123qwe, 123abc456.
      const letters = (s: string) => /\p{L}/u.test(s);
      const [a = '', b = '', c = ''] = segs;
      const mixed =
        segs.length >= 4 ||
        (segs.length === 3 && letters(a) && a.length >= 2 && c.length >= 2) ||
        (segs.length === 3 && !letters(a) && a.length >= 2 && b.length >= 2);
      if (mixed) note(part.length >= 6 ? 'strong' : 'weak');
    }
    for (const s of segs) if (/\p{L}/u.test(s)) note(judgeWord(s));
  }
  return worst;
}

/** The random-typing words in one field, when there are enough of them to refuse it. */
function junkIn(text: string): string[] | null {
  const junk: string[] = [];
  let judged = 0;
  let strong = false;
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    const v = judgeToken(raw);
    if (v === 'skip') continue;
    judged++;
    if (v === 'ok') continue;
    if (v === 'strong') strong = true;
    if (!junk.includes(raw)) junk.push(raw);
  }
  // one long jumble is enough; short ones (could be a name or text-speak) only in numbers
  return junk.length && (strong || junk.length / judged >= 0.4) ? junk.slice(0, 3) : null;
}

/**
 * The same word over and over ("pray pray pray…", a sentence pasted ten times).
 * "Holy, holy, holy is the Lord" is fine.
 */
function repetitive(text: string): boolean {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < 6) return false;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return top / words.length >= 0.6 || (words.length >= 12 && counts.size / words.length < 0.25);
}

/** Why this note can't be saved, or null when it's fine. */
export function checkNote(subject: string, note: string): NoteIssue | null {
  if ((`${subject} ${note}`.match(/\p{L}/gu) ?? []).length < 2) return { kind: 'short' };
  const junk = [...(junkIn(subject) ?? []), ...(junkIn(note) ?? [])];
  if (junk.length) return { kind: 'junk', words: junk.slice(0, 3) };
  if (repetitive(subject) || repetitive(note)) return { kind: 'repeat' };
  return null;
}

// ---------- how often ----------

const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Whether one more note may be saved now, given the notes already written (including ones
 * still waiting to upload). `next` is the note about to be saved.
 */
export function noteLimit(entries: Entry[], next: { subject: string; note: string }, now = Date.now()): LimitIssue | null {
  const recent = entries.filter((e) => !e.locked && Date.parse(e.created_at) > now - DAY_MS);
  const copy = recent.some(
    (e) => same(e.note, next.note) && (same(e.subject, next.subject) || next.note.trim().length >= 30),
  );
  if (copy) return { kind: 'same' };

  const times = recent.map((e) => Date.parse(e.created_at)).sort((a, b) => a - b);
  if (times.length >= NOTES_PER_DAY) return { kind: 'many', wait: Math.max(1000, times[times.length - NOTES_PER_DAY] + DAY_MS - now) };
  const last = times[times.length - 1];
  if (last !== undefined && now - last < NOTE_GAP_MS) return { kind: 'fast', wait: Math.max(1000, last + NOTE_GAP_MS - now) };
  return null;
}
