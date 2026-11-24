// Leaf clumps: lumpy, outlined balls of foliage, lit from the sun's side with a bright
// rim on top and dark creases where tufts overlap. They are baked once per size and
// light direction and then stamped every frame; the moving leaves go on top of them.

import { bayer, h2, mixc, mulberry32, noise2, TAU, type Light, type PSprite } from './raster';

export type ClumpStyle = 'round' | 'blossom' | 'pine' | 'cluster';

export interface Clump extends PSprite {
  ox: number; // centre inside the sprite
  oy: number;
}

const cache = new Map<string, Clump>();

/** `key` must identify the palette + light (species, layer, time of day, light side). */
export function clumpSprite(
  key: string, R: number, variant: number, squash: number, style: ClumpStyle, ramp: number[], flower: number, L: Light, bud = 0,
): Clump {
  const k = `${key}|${R}|${variant}|${Math.round(squash * 20)}`;
  let c = cache.get(k);
  if (c) return c;
  if (cache.size > 1200) cache.clear();
  c = style === 'cluster'
    ? makeCluster(Math.max(2, R), variant, squash, ramp, flower, bud, L)
    : makeClump(Math.max(2, R), variant, squash, style, ramp, flower, L);
  cache.set(k, c);
  return c;
}

// One flower, in three sizes: open and facing us (a star round a yellow heart), or seen from
// the side (a cup of petals on a green calyx). h = lit petal, p = petal, d = shaded petal,
// o = the heart (stamens), c = the calyx.
const FLOWERS: [string[], string[]][] = [
  [
    ['.h.', 'hop', '.d.'],
    ['h.h', 'php', '.c.'],
  ],
  [
    ['..h..', 'hhohh', '.ppp.', '.d.d.'],
    ['p.o.p', 'hhphh', '.ppd.', '..c..'],
  ],
  [
    ['...h...', '..hph..', 'hhhohhh', '.ppopp.', '..ppd..', '.pd.pd.', '.d...d.'],
    ['h..o..h', 'ph.o.hp', '.hhphh.', '.ppppd.', '..pdd..', '...c...'],
  ],
];

/**
 * Separate flowers on bare twigs (bombax): little stars and cups scattered over the clump's
 * ball with gaps between them, so the branches show through. Each flower takes its light from
 * where it sits on the ball, with a few dark green buds in the gaps.
 */
function makeCluster(R: number, variant: number, squash: number, ramp: number[], heart: number, bud: number, L: Light): Clump {
  const rng = mulberry32(variant * 7919 + R * 104729 + 29);
  const size = R >= 11 ? 2 : R >= 5 ? 1 : 0;
  const ext = Math.ceil(R) + 5;
  const S = ext * 2 + 1, o = ext;
  const d = new Uint32Array(S * S);
  const n = ramp.length;
  const put = (X: number, Y: number, c: number) => {
    if (X >= 0 && Y >= 0 && X < S && Y < S) d[Y * S + X] = c;
  };

  // places for the flowers: crowded in the middle so the cluster reads as one red puff,
  // spread out toward the rim so single flowers stand against the sky
  const gap = [1.9, 3, 4.4][size];
  const spots: { x: number; y: number }[] = [];
  for (let tries = 0; tries < 320 && spots.length < 64; tries++) {
    const a = rng() * TAU, f = Math.sqrt(rng()), rr = f * R;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * squash;
    const gg = gap * (0.8 + f * 0.6);
    if (!spots.some((s) => (s.x - x) ** 2 + ((s.y - y) / Math.max(0.6, squash)) ** 2 < gg * gg)) spots.push({ x, y });
  }
  // lower flowers first, so the ones above sit over them
  spots.sort((p, q) => q.y - p.y);

  for (const s of spots) {
    const ux = s.x / R, uy = s.y / (R * squash);
    const nz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
    const v = (0.2 + 0.8 * Math.max(0, ux * L.x + uy * L.y + nz * L.z)) * (1 - Math.max(0, uy) * 0.3) + (rng() - 0.5) * 0.22;
    // the petals keep to the bright half of the ramp, so the crown stays red, not brown
    const b = Math.max(2, Math.min(n - 2, Math.round(2.4 + v * (n - 3.4))));
    const open = nz > 0.45 && rng() < 0.6; // facing us; the rest are seen from the side
    const shape = FLOWERS[size][open ? 0 : 1];
    const flip = rng() < 0.5;
    const w = shape[0].length;
    const X0 = Math.round(s.x + o - (w >> 1)), Y0 = Math.round(s.y + o - (shape.length >> 1));
    const lit = v > 0.45;
    shape.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        let ch = row[flip ? w - 1 - i : i];
        if (ch === '.') continue;
        if (ch === 'o' && !lit) ch = 'p'; // the heart only shows in the light
        if (ch === 'c' && uy < -0.2) ch = 'd'; // the calyx shows from below
        const t = ch === 'h' ? b + 1 : ch === 'd' ? b - 1 : b;
        put(X0 + i, Y0 + j, ch === 'o' ? heart : ch === 'c' ? bud : ramp[Math.max(1, Math.min(n - 1, t))]);
      }
    });
  }

  // a few buds, dark green knobs out at the rim
  const budLit = mixc(bud, ramp[n - 1], 0.3);
  for (let k = 0; k < Math.round(spots.length * 0.18); k++) {
    const a = rng() * TAU, rr = R * (0.85 + rng() * 0.3);
    const X = Math.round(Math.cos(a) * rr + o), Y = Math.round(Math.sin(a) * rr * squash + o);
    if (X < 1 || Y < 1 || X >= S - 1 || Y >= S - 1 || d[Y * S + X] || d[(Y - 1) * S + X]) continue;
    put(X, Y, bud);
    if (size > 0) put(X, Y - 1, budLit);
  }
  return { w: S, h: S, d, ox: o, oy: o };
}

function makeClump(R: number, variant: number, squash: number, style: ClumpStyle, ramp: number[], flower: number, L: Light): Clump {
  const rng = mulberry32(variant * 7919 + R * 104729 + 17);
  const pine = style === 'pine';
  const main = { x: 0, y: R * 0.1 * squash, r: R * 0.8 };
  const tufts: { x: number; y: number; r: number }[] = [];
  const nt = pine ? 6 + Math.min(10, R) : 4 + Math.min(7, R >> 1);
  for (let k = 0; k < nt; k++) {
    const a = ((k + rng() * 0.7) / nt) * TAU;
    const up = -Math.sin(a);
    const dist = R * (pine ? 0.5 + rng() * 0.3 : 0.42 + rng() * 0.24);
    const tr = R * (pine ? 0.22 + rng() * 0.12 : 0.3 + rng() * 0.15 + Math.max(0, up) * 0.07);
    tufts.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist * squash, r: Math.max(1.2, tr) });
  }
  // lower tufts first, so the ones above overlap them with their shaded undersides
  tufts.sort((p, q) => q.y - p.y);
  const order = [main, ...tufts];

  const ext = Math.ceil(R * 1.25) + 2;
  const S = ext * 2 + 1, o = ext;
  const tone = new Int8Array(S * S).fill(-1);
  const n = ramp.length; // ramp[0] is the outline colour
  for (const dsc of order) {
    const ry = dsc.r * squash;
    const rim = Math.pow(Math.max(0, 1 - 1.3 / dsc.r), 2);
    for (let fy = Math.floor(dsc.y - ry); fy <= Math.ceil(dsc.y + ry); fy++)
      for (let fx = Math.floor(dsc.x - dsc.r); fx <= Math.ceil(dsc.x + dsc.r); fx++) {
        const ux = (fx - dsc.x) / dsc.r, uy = (fy - dsc.y) / ry;
        const d2 = ux * ux + uy * uy;
        if (d2 > 1) continue;
        const X = fx + o, Y = fy + o;
        if (X < 1 || Y < 1 || X >= S - 1 || Y >= S - 1) continue;
        const nz = Math.sqrt(1 - d2);
        const diff = ux * L.x + uy * L.y + nz * L.z;
        const occ = 1 - Math.max(0, Math.min(1, fy / (R * squash))) * 0.32;
        const cell = noise2(X * (pine ? 0.8 : 0.62), Y * (pine ? 0.8 : 0.62), variant * 13 + R);
        let v = (0.12 + 0.88 * Math.max(0, diff)) * occ + (cell - 0.5) * 0.4;
        if (dsc !== main && d2 > rim && diff < 0.35) v = Math.min(v, 0.1); // crease under a tuft
        const k = 1 + v * (n - 2) + (bayer(X, Y) - 0.5) * 0.5;
        tone[Y * S + X] = k < 1 ? 1 : k > n - 1 ? n - 1 : Math.round(k);
      }
  }

  // dark outline around the silhouette, bright rim where the top meets the sky
  const out = new Int8Array(tone);
  for (let Y = 0; Y < S; Y++)
    for (let X = 0; X < S; X++) {
      const i = Y * S + X;
      if (tone[i] < 0) {
        if ((X > 0 && tone[i - 1] >= 0) || (X < S - 1 && tone[i + 1] >= 0) || (Y > 0 && tone[i - S] >= 0) || (Y < S - 1 && tone[i + S] >= 0)) out[i] = 0;
      } else if (tone[i] >= n - 3) {
        const above = Y > 0 ? tone[i - S] : -1;
        const side = L.x < -0.2 ? (X > 0 ? tone[i - 1] : -1) : L.x > 0.2 ? (X < S - 1 ? tone[i + 1] : -1) : 0;
        if (above < 0 || side < 0) out[i] = n - 1;
      }
    }

  const d = new Uint32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const t = out[i];
    if (t < 0) continue;
    d[i] = ramp[t];
    if (style === 'blossom' && t >= 3 && h2(i, variant * 31 + R) < 0.1) d[i] = flower;
  }
  return { w: S, h: S, d, ox: o, oy: o };
}

// ---------- the loose leaves that flutter around each clump ----------

export interface EdgeLeaf {
  a: number; // direction from the clump centre
  rr: number; // distance, as a fraction of the radius
  ph: number;
  fr: number;
  j: number; // colour jitter
  s: number; // size factor
}

const edges = new Map<number, EdgeLeaf[]>();
export const EDGE_MAX = 44;

export function edgeLeaves(variant: number): EdgeLeaf[] {
  let e = edges.get(variant);
  if (e) return e;
  const rng = mulberry32(variant * 31337 + 5);
  e = [];
  for (let k = 0; k < EDGE_MAX; k++) {
    // spread evenly round the rim, a little more on top where the light is
    const a = ((k * 0.618034) % 1) * TAU + rng() * 0.3;
    e.push({ a, rr: 0.72 + rng() * 0.34, ph: rng() * TAU, fr: 1.6 + rng() * 2.4, j: (rng() - 0.5) * 0.25, s: 0.8 + rng() * 0.45 });
  }
  edges.set(variant, e);
  return e;
}
