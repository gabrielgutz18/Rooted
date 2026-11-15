// Leaf clumps: lumpy, outlined balls of foliage, lit from the sun's side with a bright
// rim on top and dark creases where tufts overlap. They are baked once per size and
// light direction and then stamped every frame; the moving leaves go on top of them.

import { bayer, h2, mulberry32, noise2, TAU, type Light, type PSprite } from './raster';

export type ClumpStyle = 'round' | 'blossom' | 'pine';

export interface Clump extends PSprite {
  ox: number; // centre inside the sprite
  oy: number;
}

const cache = new Map<string, Clump>();

/** `key` must identify the palette + light (species, layer, time of day, light side). */
export function clumpSprite(
  key: string, R: number, variant: number, squash: number, style: ClumpStyle, ramp: number[], flower: number, L: Light,
): Clump {
  const k = `${key}|${R}|${variant}|${Math.round(squash * 20)}`;
  let c = cache.get(k);
  if (c) return c;
  if (cache.size > 1200) cache.clear();
  c = makeClump(Math.max(2, R), variant, squash, style, ramp, flower, L);
  cache.set(k, c);
  return c;
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
