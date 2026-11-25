// Reads a note and decides how much the tree grows.
// It looks for words about faith activities in English and Tagalog (or a mix),
// Bible references, and how much you actually wrote. A note with nothing about faith in
// it (no theme, no verse) only grows the tree a little, however long it is.

interface Theme {
  id: string;
  label: string; // stored on the note as a tag; shown translated
  points: number;
  // matched at the start of a word, so "pray" also finds "prayed", "prayer"
  stems: string[];
  // matched only as whole words, for short names like "SOL" that would otherwise
  // also find "solve", "solid", "solo"
  words?: string[];
  // Tagalog roots, matched anywhere inside a word, because Tagalog wraps affixes
  // around the root: "dasal" finds nagdasal, magdarasal is "darasal", ipinagdasal…
  roots?: string[];
}

export const THEMES: Theme[] = [
  {
    id: 'church', label: 'Church', points: 10,
    stems: ['church', 'sunday service', 'worship service', 'sermon', 'preach', 'pastor', 'worship', 'congregation', 'sumamba', 'kongregasyon', 'mangaral', 'nangaral', 'pangangaral', 'mangangaral'],
    roots: ['simba', 'samba'],
  },
  {
    id: 'cell', label: 'Cell group', points: 10,
    stems: ['cell group', 'cellgroup', 'small group', 'life group', 'lifegroup', 'care group', 'fellowship', 'discipl', 'kapatiran', 'mga kapatid'],
    roots: ['tipon', 'disipul'],
  },
  {
    // the church's discipleship classes: SUYNL (Start Up Your New Life), Life Class,
    // the School of Leaders (SOL 1, 2, 3) and the Encounter retreats around them
    id: 'class', label: 'Discipleship class', points: 10,
    stems: [
      'suynl', 'sunyl', 'start up your new life', 'life class', 'lifeclass', 'school of leaders', 'school of leadership',
      'encounter retreat', 'encounter weekend', 'pre-encounter', 'post-encounter', 're-encounter',
    ],
    words: ['sol'],
  },
  {
    id: 'study', label: 'Study', points: 8,
    stems: [
      'bible', 'biblia', 'bibliya', 'scripture', 'study', 'studied', 'studying', 'lesson', 'christian life', 'devotion', 'quiet time', 'verse', 'chapter', 'memoriz',
      'aral', 'aaral', 'salita ng diyos', 'salita ng dios', 'kasulatan', 'talata', 'kabanata', 'debosyon', 'leksyon', 'leksiyon',
    ],
    roots: ['saulo'],
  },
  {
    id: 'prayer', label: 'Prayer', points: 6,
    stems: ['pray', 'fasting', 'fasted', 'interce'],
    roots: ['dasal', 'darasal', 'dalangin', 'nalangin', 'ayuno'],
  },
  {
    id: 'serve', label: 'Serving', points: 6,
    stems: [
      'serve', 'serving', 'ministry', 'volunteer', 'outreach', 'evangel', 'gospel', 'invited', 'tithe', 'offering', 'helped', 'encourag',
      'ministeryo', 'tumulong', 'ikapu', 'alay', 'ebanghelyo', 'mabuting balita', 'boluntaryo',
    ],
    roots: ['lingkod', 'tulong', 'tulung', 'handog', 'imbita', 'patotoo'],
  },
  {
    id: 'thanks', label: 'Gratitude', points: 4,
    stems: ['thank', 'grateful', 'bless', 'praise', 'pagpapala', 'pagpala', 'pinagpala', 'biyaya', 'papuri', 'purihin', 'pinupuri', 'nagpupuri'],
    roots: ['salamat'],
  },
  {
    id: 'heart', label: 'Reflection', points: 5,
    stems: [
      'learn', 'realiz', 'repent', 'forgiv', 'obey', 'obedien', 'faith', 'grace', 'trust', 'hope', 'jesus', 'christ', 'god', 'lord', 'holy spirit',
      'diyos', 'dios', 'panginoon', 'hesus', 'jesucristo', 'kristo', 'kristiyan', 'espiritu santo', 'banal na espiritu', 'ama sa langit',
      'natutun', 'natutuh', 'natuto', 'matuto', 'napagtanto', 'nagsisi', 'magsisi', 'pagsisisi', 'pagsunod', 'pag-asa', 'pananalig', 'pagpapakumbaba',
    ],
    roots: ['mpalataya', 'patawad', 'patawar', 'tiwala'],
  },
];

const BOOKS = [
  // English
  'genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song of songs|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi',
  'matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation',
  // Tagalog
  'exodo|levitico|mga bilang|deuteronomio|josue|hukom|hari|cronica|nehemias|ester|awit|kawikaan|eclesiastes|mangangaral|isaias|jeremias|panaghoy|oseas|obadias|jonas|mikas|habacuc|sofonias|hageo|zacarias|malakias',
  'mateo|marcos|lucas|juan|gawa|roma|corinto|galacia|efeso|filipos|colosas|tesalonica|timoteo|tito|filemon|hebreo|santiago|pedro|judas|pahayag|apocalipsis',
].join('|');
const REF = new RegExp(`\\b(?:[1-3]\\s?)?(?:${BOOKS})\\s+\\d{1,3}(?::\\d{1,3}(?:\\s?-\\s?\\d{1,3})?)?`, 'gi');

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const THEME_RE = THEMES.map((t) => {
  const any = (list: string[]) => list.map(escape).join('|');
  const parts = [`(?<![a-z])(?:${any(t.stems)})`];
  if (t.words?.length) parts.push(`(?<![a-z])(?:${any(t.words)})(?![a-z])`);
  if (t.roots?.length) parts.push(any(t.roots));
  return new RegExp(parts.join('|'), 'g');
});

export const MAX_POINTS = 60;
export const OFF_TOPIC_POINTS = 2;

export interface Part {
  kind: 'show' | 'theme' | 'scripture' | 'words' | 'offtopic';
  label: string; // English; the theme's tag for kind 'theme'
  points: number;
  n?: number; // how many references, or how many words
}

export interface Analysis {
  points: number;
  tags: string[];
  parts: Part[];
  words: number;
}

export function analyze(subject: string, note: string): Analysis {
  const text = `${subject}\n${note}`.toLowerCase();
  const words = (note.trim().match(/\S+/g) ?? []).length;
  const parts: Part[] = [];
  const tags: string[] = [];

  if (!subject.trim() && !note.trim()) return { points: 0, tags, parts, words };

  THEMES.forEach((t, i) => {
    const hits = (text.match(THEME_RE[i]) ?? []).length;
    if (!hits) return;
    tags.push(t.label);
    parts.push({ kind: 'theme', label: t.label, points: t.points + Math.min(2, hits - 1) });
  });

  const refs = new Set((text.match(REF) ?? []).map((r) => r.replace(/\s+/g, ' ')));
  if (refs.size) {
    tags.push('Scripture');
    parts.push({ kind: 'scripture', label: 'Scripture', points: Math.min(3, refs.size) * 4, n: refs.size });
  }

  if (!parts.length) {
    return { points: OFF_TOPIC_POINTS, tags, parts: [{ kind: 'offtopic', label: 'Off-topic', points: OFF_TOPIC_POINTS }], words };
  }
  parts.unshift({ kind: 'show', label: 'Showing up', points: 5 });

  const depth = Math.min(12, Math.floor(words / 10));
  if (depth) parts.push({ kind: 'words', label: 'Words written', points: depth, n: words });

  const points = Math.min(MAX_POINTS, parts.reduce((s, p) => s + p.points, 0));
  return { points, tags, parts, words };
}
