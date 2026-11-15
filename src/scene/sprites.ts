// Hand-drawn pixel animals. Each letter is a colour from the palette, '.' is empty.
// All face right; the scene flips them when they turn around.

export interface Sprite {
  w: number;
  h: number;
  frames: HTMLCanvasElement[]; // facing right
  flipped: HTMLCanvasElement[]; // facing left
}

type Pal = Record<string, string>;

function render(rows: string[], pal: Pal, flip: boolean): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }),
  );
  return c;
}

function make(frames: string[][], pal: Pal): Sprite {
  const f = frames.map((r) => render(r, pal, false));
  return { w: f[0].width, h: f[0].height, frames: f, flipped: frames.map((r) => render(r, pal, true)) };
}

const INK = '#160c1c';

const BIRD = [
  ['..w....', '..ww...', '.bbbbo.', 'bbbbbby', '..bb...'],
  ['.......', '.bbbbo.', 'bbbbbby', '..ww...', '..w....'],
  // perched
  ['.......', '..bbo..', '.bbbby.', 'bwwbb..', '..l.l..'],
];
const birdPal = (body: string, wing: string): Pal => ({ b: body, w: wing, o: INK, y: '#f0a030', l: '#6a4a3a' });

const SQUIRREL = [
  ['.tt.......', 'ttt...e.e.', 'ttt..bbbb.', 'tt..bbbbob', '.tbbbbbbbn', '.tbbbwwb..', '..bbbwb...', '..l...l...'],
  ['.tt.......', 'ttt...e.e.', 'ttt..bbbb.', 'tt..bbbbob', '.tbbbbbbbn', '.tbbbwwb..', '..bbbwb...', '...l.l....'],
];

const RACCOON = [
  ['............e.e', 'sgsg..ggggggggg', 'gsgsgggggggmwmn', '.sgsgggggggggw.', '....gggggggg...', '....g.g..g.g...'],
  ['............e.e', 'sgsg..ggggggggg', 'gsgsgggggggmwmn', '.sgsgggggggggw.', '....gggggggg...', '...g..g.g..g...'],
];

const DEER = [
  [
    '..........a.a.', '..........aaa.', '..........dd..', '.........ddod.', '.........dddn.', '.t.......dd...',
    'dddddddddd....', 'ddddddddddd...', 'dwwwwddddd....', '.d.d....d.d...', '.d.d....d.d...', '.k.k....k.k...',
  ],
  [
    '..........a.a.', '..........aaa.', '..........dd..', '.........ddod.', '.........dddn.', '.t.......dd...',
    'dddddddddd....', 'ddddddddddd...', 'dwwwwddddd....', '..d.d..d.d....', '..d.d..d.d....', '..k.k..k.k....',
  ],
  // grazing: head down
  [
    '..............', '..............', '..............', '..............', '..............', '.t............',
    'dddddddddd....', 'ddddddddddda.a', 'dwwwwddddddaa.', '.d.d....d.ddd.', '.d.d....d.dod.', '.k.k....k.kdn.',
  ],
];

const MONKEY = [
  ['..mmmm...', '.mffffm..', '.mfofom..', '..mffm...', '.mmmmmm..', 'm.mccm.m.', 'm.mccm.m.', '..mmmm...', '..m..m..t', '.mm..mmtt'],
  ['m.mmmm.m.', 'mmffffmm.', '.mfofom..', '..mffm...', '..mmmm...', '..mccm...', '..mccm...', '..mmmm..t', '..m..m..t', '.mm..mmt.'],
];

export interface Sprites {
  birds: Sprite[];
  squirrel: Sprite;
  raccoon: Sprite;
  deer: Sprite;
  monkey: Sprite;
}

let cache: Sprites | null = null;

export function getSprites(): Sprites {
  if (cache) return cache;
  cache = {
    birds: [
      make(BIRD, birdPal('#d8504a', '#8a2a34')),
      make(BIRD, birdPal('#4a8fd8', '#2a4a8a')),
      make(BIRD, birdPal('#f0c040', '#b07a20')),
    ],
    squirrel: make(SQUIRREL, { t: '#a4522a', b: '#d6804c', w: '#f4dcb0', o: INK, n: INK, e: '#a4522a', l: '#7a3a22' }),
    raccoon: make(RACCOON, { g: '#8a8794', s: '#3a3542', m: '#2a2530', w: '#f1ece2', n: INK, e: '#5a5664' }),
    deer: make(DEER, { d: '#b07a48', w: '#ead7b4', a: '#e8d2a0', o: INK, n: INK, t: '#ffffff', k: '#3a2618' }),
    monkey: make(MONKEY, { m: '#6e4a2e', f: '#e2b98c', o: INK, c: '#c79a6a', t: '#6e4a2e' }),
  };
  return cache;
}
