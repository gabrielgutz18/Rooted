// Reads a note and decides how much the tree grows.
// It looks for words about faith activities (English + some Tagalog),
// Bible references, and how much you actually wrote.

interface Theme {
  id: string;
  label: string;
  points: number;
  stems: string[]; // matched at the start of a word, so "pray" also finds "prayed", "prayer"
}

export const THEMES: Theme[] = [
  {
    id: 'church', label: 'Church', points: 10,
    stems: ['church', 'sunday service', 'worship service', 'sermon', 'preach', 'pastor', 'worship', 'simba', 'pagsamba', 'sumamba', 'congregation'],
  },
  {
    id: 'cell', label: 'Cell group', points: 10,
    stems: ['cell group', 'cellgroup', 'small group', 'life group', 'lifegroup', 'care group', 'fellowship', 'discipl', 'kapatiran', 'mga kapatid'],
  },
  {
    id: 'study', label: 'Study', points: 8,
    stems: ['bible', 'biblia', 'bibliya', 'scripture', 'study', 'studied', 'studying', 'lesson', 'christian life', 'sunyl', 'devotion', 'quiet time', 'verse', 'chapter', 'memoriz', 'nag-aral', 'pag-aaral', 'aralin', 'salita ng diyos'],
  },
  {
    id: 'prayer', label: 'Prayer', points: 6,
    stems: ['pray', 'dasal', 'nagdasal', 'panalangin', 'nanalangin', 'fasting', 'fasted', 'interce'],
  },
  {
    id: 'serve', label: 'Serving', points: 6,
    stems: ['serve', 'serving', 'ministry', 'volunteer', 'outreach', 'evangel', 'gospel', 'invited', 'tithe', 'offering', 'helped', 'encourag', 'naglingkod', 'paglilingkod'],
  },
  {
    id: 'thanks', label: 'Gratitude', points: 4,
    stems: ['thank', 'grateful', 'bless', 'praise', 'salamat', 'pasasalamat', 'pagpapala'],
  },
  {
    id: 'heart', label: 'Reflection', points: 5,
    stems: ['learn', 'realiz', 'repent', 'forgiv', 'obey', 'obedien', 'faith', 'grace', 'trust', 'hope', 'jesus', 'christ', 'god', 'lord', 'holy spirit', 'diyos', 'panginoon', 'hesus', 'natutun', 'pananampalataya'],
  },
];

const BOOKS =
  'genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song of songs|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation|mateo|marcos|lucas|juan|gawa|roma|awit|kawikaan';
const REF = new RegExp(`\\b(?:[1-3]\\s?)?(?:${BOOKS})\\s+\\d{1,3}(?::\\d{1,3}(?:\\s?-\\s?\\d{1,3})?)?`, 'gi');

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const THEME_RE = THEMES.map((t) => new RegExp(`(?<![a-z])(?:${t.stems.map(escape).join('|')})`, 'g'));

export const MAX_POINTS = 60;

export interface Analysis {
  points: number;
  tags: string[];
  parts: { label: string; points: number }[];
  words: number;
}

export function analyze(subject: string, note: string): Analysis {
  const text = `${subject}\n${note}`.toLowerCase();
  const words = (note.trim().match(/\S+/g) ?? []).length;
  const parts: Analysis['parts'] = [];
  const tags: string[] = [];

  if (!subject.trim() && !note.trim()) return { points: 0, tags, parts, words };

  parts.push({ label: 'Showing up', points: 5 });

  THEMES.forEach((t, i) => {
    const hits = (text.match(THEME_RE[i]) ?? []).length;
    if (!hits) return;
    tags.push(t.label);
    parts.push({ label: t.label, points: t.points + Math.min(2, hits - 1) });
  });

  const refs = new Set((text.match(REF) ?? []).map((r) => r.replace(/\s+/g, ' ')));
  if (refs.size) {
    tags.push('Scripture');
    parts.push({ label: `Scripture ×${refs.size}`, points: Math.min(3, refs.size) * 4 });
  }

  const depth = Math.min(12, Math.floor(words / 10));
  if (depth) parts.push({ label: `${words} words written`, points: depth });

  const points = Math.min(MAX_POINTS, parts.reduce((s, p) => s + p.points, 0));
  return { points, tags, parts, words };
}
