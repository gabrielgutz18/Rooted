// The coconut palm's own parts: long feathery fronds that bend in the wind, rings up the
// trunk, coconuts under the crown, and the seed, which is a whole coconut lying in the sand
// (a young palm keeps it at its foot for a while, the way real ones do).
// src/scene/engine.ts calls these; src/scene/species.ts builds the trunk and lays out the fronds.

import { bayer, clamp, gradeAll, h2, leafMask, mixc, noise2, stamp, TAU, type Grade, type Light, type Pix } from './raster';
import type { Tree } from './species';

/** A frond this frame: points along its midrib from the trunk out, in art pixels. */
export interface FrondAt {
  pts: number[]; // x, y pairs
  dirs: number[]; // which way the midrib points at each point
  wide: number; // its longest leaflets, in pixels
  back: boolean;
  ls: number;
  phase: number;
}

/** Where every frond is this frame, starting at the top of the trunk (tx, ty). */
export function layFronds(
  tree: Tree, tx: number, ty: number, z: number, t: number, gust: (x: number) => number, bare: number, gy: number, windOn: number,
): FrondAt[] {
  const out: FrondAt[] = [];
  const gs = gust(tx);
  for (const f of tree.fronds ?? []) {
    // a neglected palm loses its fronds one by one, each drooping and shrinking before it goes
    const keep = bare > 0 ? clamp((h2(f.ls, 91) - bare * 1.1 + 0.1) / 0.1, 0, 1) : 1;
    if (keep <= 0) continue;
    const L = f.len * z * (0.35 + 0.65 * keep);
    const n = Math.max(4, Math.round(L / 1.3));
    const toward = Math.cos(f.a) < 0 ? -1 : 1; // which way it bends down
    const droop = f.droop + (1 - keep) * 0.8;
    const pts = [tx, ty], dirs = [f.a];
    let x = tx, y = ty;
    for (let j = 1; j <= n; j++) {
      const q = j / n;
      // the wind blows from the left: the outer part of each frond gives the most
      const sway = windOn * (gs * 0.28 * q + Math.sin(t * 1.3 + f.phase + q * 1.6) * 0.05 * (0.5 + gs) * q);
      const a = f.a + toward * droop * Math.pow(q, 1.3) + sway;
      x += Math.cos(a) * (L / n);
      y = Math.min(gy - 1, y + Math.sin(a) * (L / n));
      pts.push(x, y);
      dirs.push(a);
    }
    out.push({ pts, dirs, wide: Math.max(1.2, L * 0.2), back: f.back, ls: f.ls, phase: f.phase });
  }
  return out;
}

/** How far the crown reaches above and beside the top of the trunk, at rest, in world units. */
export function frondReach(tree: Tree): { up: number; side: number } {
  let up = 0, side = 0;
  for (const f of layFronds(tree, 0, 0, 1, 0, () => 0, 0, 1e9, 0)) {
    for (let i = 0; i < f.pts.length; i += 2) {
      up = Math.max(up, -f.pts[i + 1] + f.wide * 0.4);
      side = Math.max(side, Math.abs(f.pts[i]) + f.wide * 0.6);
    }
  }
  return { up, side };
}

/** Stand-ins for leaf clumps (one along each frond), for falling leaves, perched birds and the shadow. */
export function frondClumps(fronds: FrondAt[]) {
  return fronds.map((f) => {
    const i = Math.floor((f.pts.length / 2) * 0.55) * 2;
    return { x: Math.round(f.pts[i]), y: Math.round(f.pts[i + 1]), r: Math.max(1, Math.round(f.wide * 0.6)), ls: f.ls, back: f.back, squash: 0.6 };
  });
}

/**
 * The fronds in front (`back` false) or behind. Two passes, like the branches: the dark outline
 * round everything first, then the leaflets, so neighbouring leaflets show as stripes.
 */
export function drawFronds(
  p: Pix, fronds: FrondAt[], back: boolean, ramp: number[], L: Light, t: number, gust: (x: number) => number, gy: number, windOn: number,
) {
  const n = ramp.length, outline = ramp[0];
  const rib = mixc(ramp[n - 3], ramp[n - 1], 0.6);
  const put = (x: number, y: number, c: number, pass: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (y >= gy) return;
    if (pass) p.put(x, y, c);
    else {
      p.put(x, y, outline);
      p.put(x - 1, y, outline);
      p.put(x + 1, y, outline);
      p.put(x, y - 1, outline);
      p.put(x, y + 1, outline);
    }
  };
  for (const pass of [0, 1])
    for (const f of fronds) {
      if (f.back !== back) continue;
      const N = f.pts.length / 2;
      const every = f.wide > 3 ? 2 : 1; // leaflets every other pixel, so there are gaps between them
      for (let j = 1; j < N; j++) {
        const q = j / (N - 1);
        const x = f.pts[2 * j], y = f.pts[2 * j + 1], a = f.dirs[j];
        // a bare stalk near the trunk, the longest leaflets a third of the way out, short ones at the tip
        const lw = q < 0.12 ? 0 : f.wide * Math.pow(Math.sin((Math.PI * (q - 0.12)) / 0.88), 0.55) * (1.05 - 0.35 * q);
        if (lw >= 1 && j % every === 0) {
          const gs = gust(x);
          const r1 = Math.sin(a + 0.95), r2 = Math.sin(a - 0.95);
          for (const row of [1, -1]) {
            const upper = (row === 1 ? r1 : r2) < (row === 1 ? r2 : r1);
            const wig = windOn * Math.sin(t * 3.2 + j * 0.8 + f.phase + row) * 0.1 * (0.4 + gs);
            const la = a + row * 0.95 + wig;
            // leaflets point out toward the tip and hang down under their own weight
            let dx = Math.cos(la), dy = Math.sin(la) + 0.55;
            const m = Math.hypot(dx, dy) || 1;
            dx /= m;
            dy /= m;
            const ll = Math.max(1, Math.round(lw * (upper ? 0.85 : 1)));
            const glint = windOn && Math.sin(t * 2.7 + j * 1.3 + f.phase * 3 + row) > 0.97 - gs * 0.1;
            const lit = dx * L.x + dy * L.y;
            for (let s = 1; s <= ll; s++) {
              const px = x + dx * s, py = y + dy * s + Math.pow(s / ll, 2) * ll * 0.25;
              if (!pass) {
                put(px, py, outline, 0);
                continue;
              }
              const v = 0.42 + (upper ? 0.22 : -0.12) + 0.28 * lit + (s / ll) * 0.08 + (h2(f.ls + j, row) - 0.5) * 0.14
                + (bayer(Math.round(px), Math.round(py)) - 0.5) * 0.2;
              put(px, py, glint && s > 1 ? ramp[n - 1] : ramp[1 + Math.round(clamp(v, 0, 1) * (n - 2))], 1);
            }
          }
        }
        // the midrib, thicker near the trunk on a big frond
        put(x, y, rib, pass);
        if (f.wide > 5 && q < 0.4) put(x, y + 1, ramp[n - 4], pass);
      }
    }
}

/** Rings up the trunk, where old fronds have fallen away. */
export function drawRings(
  p: Pix, tree: Tree, cx: number, gy: number, z: number, rf: number,
  x0: Float32Array, y0: Float32Array, x1: Float32Array, y1: Float32Array, ramp: number[],
) {
  const dark = ramp[1], lite = ramp[Math.min(ramp.length - 1, 4)];
  let along = 0;
  for (let i = 0; i < tree.nodes.length; i++) {
    const nd = tree.nodes[i];
    const ax = cx + x0[i] * z, ay = gy + y0[i] * z, bx = cx + x1[i] * z, by = gy + y1[i] * z;
    const len = Math.hypot(bx - ax, by - ay);
    const ra = nd.r0 * rf, rb = nd.r1 * rf;
    if (len < 0.5 || Math.max(ra, rb) < 1.6) {
      along += len;
      continue;
    }
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const gap = Math.max(2, Math.round(1.4 + ra * 0.45));
    for (let s = (gap - (along % gap)) % gap; s < len; s += gap) {
      if (i === 0 && s < ra * 1.6) continue; // not on the swollen foot
      const r = ra + (rb - ra) * (s / len) - 0.7;
      const cxr = ax + ux * s, cyr = ay + uy * s;
      for (let k = -r; k <= r; k += 0.5) {
        p.put(Math.round(cxr - uy * k), Math.round(cyr + ux * k), dark);
        if (k > r * 0.2 && k < r * 0.7) p.put(Math.round(cxr - uy * k - ux), Math.round(cyr + ux * k - uy), lite); // its lit lip
      }
    }
    along += len;
  }
}

// ---------- coconuts ----------

const nutCache = new Map<Grade, { green: number[]; brown: number[]; husk: number[]; sand: number[] }>();
function nutColors(G: Grade) {
  let c = nutCache.get(G);
  if (!c) {
    c = {
      green: gradeAll(['#16200a', '#34480f', '#4e6a18', '#6c8c24', '#8eac36', '#b4cc5a'], G),
      brown: gradeAll(['#1e1208', '#3e2614', '#5c3a1e', '#7c5428', '#9c6c34', '#bc8a4a'], G),
      husk: gradeAll(['#1e1208', '#3a2412', '#56361a', '#744c24', '#94642e', '#b27e3e', '#cc9a56'], G),
      sand: gradeAll(['#b8955c', '#d2b47a', '#e6cc96', '#f2dfb2'], G),
    };
    nutCache.set(G, c);
  }
  return c;
}

/** A round, outlined coconut lit like a ball. */
function ball(p: Pix, x: number, y: number, r: number, ramp: number[], L: Light) {
  const R = Math.ceil(r) + 1, n = ramp.length;
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const ux = dx / r, uy = dy / r, d2 = ux * ux + uy * uy;
      const X = Math.round(x + dx), Y = Math.round(y + dy);
      if (d2 > 1) {
        if (d2 < 1 + 2.4 / r) p.put(X, Y, ramp[0]);
        continue;
      }
      const v = 0.12 + 0.88 * Math.max(0, ux * L.x + uy * L.y + Math.sqrt(1 - d2) * L.z);
      p.put(X, Y, ramp[1 + Math.min(n - 2, Math.round(v * (n - 2) + (bayer(X, Y) - 0.5) * 0.5))]);
    }
}

/** A bunch of coconuts hanging just under the crown at (x, y). */
export function drawNuts(p: Pix, x: number, y: number, r: number, count: number, seed: number, L: Light, G: Grade) {
  const c = nutColors(G);
  // a hanging bunch: the top ones first, so the lower ones overlap them
  const bunch = [[0, 0], [-1.45, 0.45], [1.45, 0.45], [-0.75, 1.55], [0.75, 1.55], [0, 2.5]];
  for (let k = 0; k < Math.min(count, bunch.length); k++) {
    const bx = x + bunch[k][0] * r + (h2(seed, k) - 0.5) * r * 0.3, by = y + r * (1.1 + bunch[k][1]);
    ball(p, bx, by, r, h2(seed, k + 40) < 0.5 ? c.green : c.brown, L); // some still green, some ripe and brown
  }
}

/**
 * The coconut the palm grows from, lying on its side in the sand at (x, gy). `size` is its
 * half-length in pixels; `fade` < 1 dissolves it (a young palm's coconut wears away).
 */
export function drawCoconut(p: Pix, x: number, gy: number, size: number, L: Light, G: Grade, seed: number, fade = 1) {
  const c = nutColors(G), husk = c.husk, n = husk.length;
  const rx = size, ry = size * 0.86;
  const cy = gy - ry * 0.8; // just settled into the sand
  const tilt = -0.1, co = Math.cos(tilt), si = Math.sin(tilt);
  const show = (X: number, Y: number) => fade >= 1 || bayer(X, Y) < fade;
  // its three dark eyes, in a little triangle toward one end
  const eyes = [[-0.5, -0.3], [-0.24, -0.38], [-0.38, -0.1]];
  const eyeR = Math.max(0.09, 1.1 / rx);
  const R = Math.ceil(rx) + 2;
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      // in the nut's own frame: the long way along u, a little narrower toward one end (+u)
      const u = (dx * co + dy * si) / rx, w = (-dx * si + dy * co) / (ry * (1 - 0.08 * u));
      const d2 = u * u + w * w;
      const X = Math.round(x + dx), Y = Math.round(cy + dy);
      if (Y >= gy || !show(X, Y)) continue;
      if (d2 > 1) {
        // the outline, ragged with loose hairs
        if (d2 < 1 + 2.4 / Math.min(rx, ry) || (d2 < 1 + 4 / rx && h2(X, Y + seed) < 0.2)) p.put(X, Y, husk[0]);
        continue;
      }
      const nz = Math.sqrt(1 - d2);
      let v = 0.14 + 0.86 * Math.max(0, u * co * L.x + w * L.y + nz * L.z);
      // a hairy husk: fibres running round it, and loose speckles
      const fib = noise2(u * 3 + seed, w * 9, 71);
      if (fib > 0.68) v -= 0.18;
      else if (fib < 0.24) v += 0.1;
      v += (h2(X * 3 + seed, Y) - 0.5) * 0.3;
      let col = husk[1 + Math.min(n - 2, Math.max(0, Math.round(v * (n - 2) + (bayer(X, Y) - 0.5) * 0.5)))];
      for (const [eu, ew] of eyes) {
        const e2 = ((u - eu) ** 2 + (w - ew) ** 2) / (eyeR * eyeR);
        if (e2 < 1) col = husk[0];
        else if (e2 < 2.2 && w > ew) col = husk[n - 1]; // the lit lip under each eye
      }
      p.put(X, Y, col);
    }
  // a little sand heaped round its foot
  const mx = rx * 1.3, my = ry * 0.3;
  for (let dy = -Math.ceil(my); dy <= 0; dy++)
    for (let dx = -Math.ceil(mx); dx <= Math.ceil(mx); dx++) {
      const ux = dx / mx, uy = dy / my;
      if (ux * ux + uy * uy > 1) continue;
      const X = Math.round(x + dx), Y = gy + dy - 1;
      if (!show(X, Y)) continue;
      const v = -ux * L.x * 0.6 - uy * 0.5 + (bayer(X, Y) - 0.5) * 0.5 + (h2(X, Y) - 0.5) * 0.3;
      p.put(X, Y, c.sand[v > 0.5 ? 3 : v > 0.05 ? 2 : v > -0.4 ? 1 : 0]);
    }
}

/** A new shoot: a few long, folded leaves rising from the top of the coconut. */
export function drawShoot(
  p: Pix, x: number, gy: number, size: number, g: number, ramp: number[], lxs: number, t: number, gust: (x: number) => number, bare: number,
) {
  const full = 1 + Math.floor(clamp(g / 0.1, 0, 0.99) * 3);
  const count = Math.max(1, full - Math.round(bare * full));
  const bx = x - size * 0.45, by = gy - size * 1.25; // just behind the stalk end
  const gs = gust(bx);
  for (let k = 0; k < count; k++) {
    const side = k === 0 ? 0 : k % 2 ? -1 : 1;
    let a = -Math.PI / 2 + side * (0.3 + 0.18 * (k >> 1)) + Math.sin(t * 2 + k * 1.9) * 0.08 * (0.5 + gs) + gs * 0.12;
    if (k === 0) a -= 0.08;
    const l = size * (1.5 + g * 14) * (k === 0 ? 1 : 0.86);
    const m = leafMask(l, l * 0.3, Math.round((a / TAU) * 32), lxs);
    const lx = Math.round(bx + Math.cos(a) * l * 0.47), ly = Math.round(by + Math.sin(a) * l * 0.47);
    for (let i = 0; i < m.length; i += 3)
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.put(lx + m[i] + ox, ly + m[i + 1] + oy, ramp[0]);
    stamp(p, m, lx, ly, ramp, 5, 2);
  }
}
