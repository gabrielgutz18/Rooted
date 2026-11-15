// How growth points turn into the tree. Tweak thresholds here.

export interface Stage {
  name: string;
  min: number;
  blurb: string;
}

export const STAGES: Stage[] = [
  { name: 'Seed', min: 0, blurb: 'A seed planted in good soil.' },
  { name: 'Sprout', min: 60, blurb: 'The first green shoot breaks through.' },
  { name: 'Seedling', min: 250, blurb: 'Roots reach down, leaves reach up.' },
  { name: 'Sapling', min: 700, blurb: 'Small, but standing on its own.' },
  { name: 'Young Tree', min: 1800, blurb: 'Branches spreading, leaves full.' },
  { name: 'Grown Tree', min: 4000, blurb: 'Deep roots and wide shade for others.' },
  { name: 'Ancient Tree', min: 8000, blurb: 'Like a tree planted by the rivers of water.' },
];

/** Animals that move in when the tree reaches a stage. */
export const ARRIVALS: { stage: number; name: string }[] = [
  { stage: 1, name: 'Butterflies' },
  { stage: 2, name: 'Birds' },
  { stage: 3, name: 'A squirrel' },
  { stage: 4, name: 'A raccoon' },
  { stage: 5, name: 'Deer' },
  { stage: 6, name: 'Monkeys' },
];

export interface StageInfo {
  index: number;
  stage: Stage;
  next: Stage | null;
  progress: number; // 0..1 toward the next stage
  toNext: number;
}

export function stageFor(points: number): StageInfo {
  let index = 0;
  for (let i = 0; i < STAGES.length; i++) if (points >= STAGES[i].min) index = i;
  const stage = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  if (!next) return { index, stage, next, progress: 1, toNext: 0 };
  return { index, stage, next, progress: (points - stage.min) / (next.min - stage.min), toNext: next.min - points };
}

/** Continuous 0..1 size of the tree — it grows a little with every note. */
export function growthValue(points: number): number {
  const s = stageFor(points);
  return Math.min(1, (s.index + s.progress) / (STAGES.length - 1));
}

// ---------- days ----------

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DayStat {
  day: string; // YYYY-MM-DD (local)
  count: number;
  points: number;
}

export function dayStats(entries: { created_at: string; points: number }[]): DayStat[] {
  const map = new Map<string, DayStat>();
  for (const e of entries) {
    const k = dayKey(new Date(e.created_at));
    const s = map.get(k) ?? { day: k, count: 0, points: 0 };
    s.count++;
    s.points += e.points;
    map.set(k, s);
  }
  return [...map.values()];
}

/** Days in a row with at least one note. Today only breaks the streak once it is over. */
export function dayStreak(days: DayStat[], now = new Date()): number {
  const set = new Set(days.map((d) => d.day));
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!set.has(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

// ---------- little texts ----------

export const SUBJECT_PROMPTS = [
  'What did I do today?',
  'What did I learn about God today?',
  'What happened at church?',
  'What did we talk about in cell group?',
  'What verse stayed with me today?',
  'What am I thankful for today?',
  'What did I study today?',
  'Who did I pray for today?',
  'Where did I see God at work today?',
  'What is God teaching me this week?',
];

// Shown when you tap the tree (KJV, public domain).
export const VERSES: { ref: string; text: string }[] = [
  { ref: 'Psalm 1:3', text: 'And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither.' },
  { ref: 'Colossians 2:7', text: 'Rooted and built up in him, and stablished in the faith, as ye have been taught, abounding therein with thanksgiving.' },
  { ref: 'Jeremiah 17:8', text: 'For he shall be as a tree planted by the waters, and that spreadeth out her roots by the river.' },
  { ref: '2 Peter 3:18', text: 'But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ.' },
  { ref: '2 Timothy 2:15', text: 'Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.' },
  { ref: 'Hebrews 10:25', text: 'Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another.' },
  { ref: 'Matthew 18:20', text: 'For where two or three are gathered together in my name, there am I in the midst of them.' },
  { ref: 'Psalm 119:105', text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { ref: 'Galatians 6:9', text: 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.' },
  { ref: '1 Corinthians 3:6', text: 'I have planted, Apollos watered; but God gave the increase.' },
];
