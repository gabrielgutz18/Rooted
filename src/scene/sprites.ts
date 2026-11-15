// Hand-drawn pixel animals. Each letter is a colour from the palette, '.' is empty.
// All face right; the scene flips them when they turn around. They are drawn small and
// then doubled with Scale2x (which rounds off the corners), given a lit top and shaded
// underside, and a dark outline, so they sit well in the finer-pixel scene.

import { hex, scalec, type PSprite } from './raster';

export interface Sprite {
  w: number;
  h: number;
  frames: PSprite[]; // facing right
}

type Pal = Record<string, string>;

function render(rows: string[], pal: Pal): PSprite {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const d = new Uint32Array(w * h);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = pal[ch];
      if (c) d[y * w + x] = hex(c);
    }),
  );
  return { w, h, d };
}

function scale2x({ w, h, d }: PSprite): PSprite {
  const W = w * 2, out = new Uint32Array(W * h * 2);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      out[2 * y * W + 2 * x] = C === A && C !== D && A !== B ? A : P;
      out[2 * y * W + 2 * x + 1] = A === B && A !== C && B !== D ? B : P;
      out[(2 * y + 1) * W + 2 * x] = D === C && D !== B && C !== A ? C : P;
      out[(2 * y + 1) * W + 2 * x + 1] = B === D && B !== A && D !== C ? D : P;
    }
  return { w: W, h: h * 2, d: out };
}

function finish({ w, h, d }: PSprite): PSprite {
  const W = w + 2, H = h + 2;
  const body = new Uint32Array(W * H);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = d[y * w + x];
      if (!c) continue;
      body[(y + 1) * W + x + 1] = !at(x, y - 1) ? scalec(c, 1.15) : !at(x, y + 1) ? scalec(c, 0.78) : c;
    }
  const out = new Uint32Array(body);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (body[i]) continue;
      const n = (x > 0 && body[i - 1]) || (x < W - 1 && body[i + 1]) || (y > 0 && body[i - W]) || (y < H - 1 && body[i + W]);
      if (n) out[i] = scalec(n, 0.3);
    }
  return { w: W, h: H, d: out };
}

function make(frames: string[][], pal: Pal): Sprite {
  const f = frames.map((r) => finish(scale2x(render(r, pal))));
  return { w: f[0].w, h: f[0].h, frames: f };
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
