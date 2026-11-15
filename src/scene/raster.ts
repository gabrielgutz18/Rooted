// A tiny software renderer for the scene. The world is drawn pixel by pixel into a
// Uint32Array (one packed colour per art pixel) and pushed to the canvas once a frame;
// the canvas is then scaled up with crisp, whole-number pixels.

export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ---------- colour (packed 0xAABBGGRR, i.e. RGBA bytes in memory) ----------

export function rgb(r: number, g: number, b: number): number {
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}
export function hex(h: string): number {
  const n = parseInt(h.slice(1), 16);
  return rgb((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
export const cr = (c: number) => c & 255;
export const cg = (c: number) => (c >>> 8) & 255;
export const cb = (c: number) => (c >>> 16) & 255;
const to8 = (v: number) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

export function mixc(a: number, b: number, t: number): number {
  return rgb(to8(cr(a) + (cr(b) - cr(a)) * t), to8(cg(a) + (cg(b) - cg(a)) * t), to8(cb(a) + (cb(b) - cb(a)) * t));
}
export function scalec(c: number, f: number): number {
  return rgb(to8(cr(c) * f), to8(cg(c) * f), to8(cb(c) * f));
}

/** Time-of-day colour grade: multiply then add, per channel. */
export interface Grade {
  r: number;
  g: number;
  b: number;
  ar: number;
  ag: number;
  ab: number;
}
export function grade(c: number, G: Grade): number {
  return rgb(to8(cr(c) * G.r + G.ar), to8(cg(c) * G.g + G.ag), to8(cb(c) * G.b + G.ab));
}
export const gradeAll = (hexes: string[], G: Grade) => hexes.map((h) => grade(hex(h), G));

// 4x4 ordered-dither thresholds in (0, 1)
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => B4[((y & 3) << 2) | (x & 3)];

// ---------- randomness ----------

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function h2(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise1(x: number, seed: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return h2(i, seed) * (1 - u) + h2(i + 1, seed) * u;
}

export function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const s = Math.imul(seed | 0, 2654435761) | 0;
  const a = h2(ix + s, iy), b = h2(ix + 1 + s, iy), c = h2(ix + s, iy + 1), d = h2(ix + 1 + s, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// ---------- the frame buffer ----------

export class Pix {
  w = 1;
  h = 1;
  img = new ImageData(1, 1);
  d = new Uint32Array(this.img.data.buffer);

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.img = new ImageData(w, h);
    this.d = new Uint32Array(this.img.data.buffer);
  }

  put(x: number, y: number, c: number) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }

  blend(x: number, y: number, c: number, a: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = y * this.w + x;
    this.d[i] = a >= 1 ? c : lerpc(this.d[i], c, a);
  }

  /** Additive light, for glows, sparks and fireflies. */
  add(x: number, y: number, c: number, a: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = y * this.w + x, o = this.d[i];
    this.d[i] = rgb(Math.min(255, cr(o) + cr(c) * a) | 0, Math.min(255, cg(o) + cg(c) * a) | 0, Math.min(255, cb(o) + cb(c) * a) | 0);
  }
}

export function lerpc(a: number, b: number, t: number): number {
  const ar = cr(a), ag = cg(a), ab = cb(a);
  return rgb((ar + (cr(b) - ar) * t) | 0, (ag + (cg(b) - ag) * t) | 0, (ab + (cb(b) - ab) * t) | 0);
}

// ---------- sprites ----------

/** A small picture; colour 0 means transparent. */
export interface PSprite {
  w: number;
  h: number;
  d: Uint32Array;
}

/** Copy a sprite into the frame. `mask` (per column) hides anything at or below that row. */
export function blit(p: Pix, s: PSprite, x: number, y: number, flip = false, alpha = 1, mask?: Int16Array) {
  const { w, h, d } = s;
  const W = p.w, H = p.h, out = p.d;
  for (let j = 0; j < h; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= H) continue;
    for (let i = 0; i < w; i++) {
      const c = d[j * w + (flip ? w - 1 - i : i)];
      if (!c) continue;
      const xx = x + i;
      if (xx < 0 || xx >= W || (mask && yy >= mask[xx])) continue;
      const k = yy * W + xx;
      out[k] = alpha >= 1 ? c : lerpc(out[k], c, alpha);
    }
  }
}

export function gradeSprite(s: PSprite, G: Grade): PSprite {
  const d = new Uint32Array(s.d.length);
  for (let i = 0; i < d.length; i++) if (s.d[i]) d[i] = grade(s.d[i], G);
  return { w: s.w, h: s.h, d };
}

// ---------- leaves ----------

const masks = new Map<string, Int8Array>();

/**
 * A pointed leaf rasterised at one of 32 angles, as triples of (dx, dy, tone):
 * tone 1 = the side facing the light, 0 = body, -1 = shadowed edge.
 * `lxs` is which way the light comes from (-1 left, 0 above, 1 right).
 */
export function leafMask(len: number, wid: number, a32: number, lxs: number): Int8Array {
  const L = Math.max(1, Math.round(len * 2) / 2), Wd = Math.max(0.5, Math.round(wid * 2) / 2), ai = ((a32 % 32) + 32) % 32;
  const key = `${L}|${Wd}|${ai}|${lxs}`;
  let m = masks.get(key);
  if (m) return m;
  const th = (ai / 32) * TAU, co = Math.cos(th), si = Math.sin(th);
  const lx = lxs * 0.6, ly = -0.8;
  const out: number[] = [];
  const hl = L / 2, R = Math.ceil(hl) + 1;
  for (let y = -R; y <= R; y++)
    for (let x = -R; x <= R; x++) {
      const u = x * co + y * si, v = -x * si + y * co;
      if (u < -hl - 0.25 || u > hl + 0.25) continue;
      const q = clamp((u + hl) / L, 0, 1);
      const half = (Wd / 2) * Math.pow(Math.sin(Math.PI * q), 0.7) * (1.15 - 0.3 * q) + 0.3;
      if (Math.abs(v) > half) continue;
      // the leaf's side at this pixel points along ±(-si, co); lit if that faces the light
      const facing = Math.sign(v) * (-si * lx + co * ly);
      let tone = facing > 0.05 ? 1 : 0;
      if (facing <= 0.05 && Math.abs(v) > half * 0.5) tone = -1;
      if (L >= 5 && Math.abs(v) < 0.45) tone = 0; // midrib
      out.push(x, y, tone);
    }
  if (!out.length) out.push(0, 0, 0);
  m = Int8Array.from(out);
  masks.set(key, m);
  return m;
}

/**
 * Stamp a leaf mask using ramp[idx + tone], never going below ramp[lo].
 * fade < 1 dissolves it with the dither pattern (for things disappearing).
 */
export function stamp(p: Pix, m: Int8Array, x: number, y: number, ramp: number[], idx: number, lo = 1, fade = 1) {
  const W = p.w, H = p.h, d = p.d, top = ramp.length - 1;
  for (let k = 0; k < m.length; k += 3) {
    const xx = x + m[k], yy = y + m[k + 1];
    if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    if (fade < 1 && bayer(xx, yy) >= fade) continue;
    let t = idx + m[k + 2];
    t = t < lo ? lo : t > top ? top : t;
    d[yy * W + xx] = ramp[t];
  }
}

// ---------- branches ----------

export interface Light {
  x: number;
  y: number;
  z: number;
}

export function norm3(x: number, y: number, z: number): Light {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}

/**
 * A tapered, rounded branch from a to b, lit like a cylinder with bark furrows.
 * Call once with pass 0 for every branch (dark outline), then pass 1 (the wood),
 * so the outline only shows around the whole silhouette.
 */
export function limb(
  p: Pix,
  ax: number, ay: number, bx: number, by: number, ra: number, rb: number,
  ramp: number[], outline: number, L: Light, seed: number, along0: number, birch: boolean,
  pass: 0 | 1, clipTop = -1e9, clipBot = 1e9,
) {
  ra = Math.max(ra, 0.5);
  rb = Math.max(rb, 0.5);
  const thin = Math.max(ra, rb) < 1.1;
  if (pass === 0 && Math.max(ra, rb) < 1.6) return; // twigs get no outline
  const e = pass === 0 ? 1 : 0;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  const ok = len > 1e-4;
  const ux = ok ? dx / len : 0, uy = ok ? dy / len : -1;
  const nx = -uy, ny = ux;
  const W = p.w, H = p.h, d = p.d, n = ramp.length;
  const x0 = Math.max(0, Math.floor(Math.min(ax - ra, bx - rb) - e));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(ax + ra, bx + rb) + e));
  const y0 = Math.max(0, Math.floor(Math.min(ay - ra, by - rb) - e), Math.ceil(clipTop));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(ay + ra, by + rb) + e), Math.floor(clipBot));
  for (let y = y0; y <= y1; y++) {
    const qy = y + 0.5 - ay;
    for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5 - ax;
      let t = ok ? (qx * ux + qy * uy) / len : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = ra + (rb - ra) * t + e;
      const px = qx - ux * len * t, py = qy - uy * len * t;
      if (px * px + py * py > r * r) continue;
      const i = y * W + x;
      if (e) {
        d[i] = outline;
        continue;
      }
      if (thin) {
        d[i] = ramp[1];
        continue;
      }
      const s = (px * nx + py * ny) / r;
      const nz = Math.sqrt(Math.max(0, 1 - s * s));
      let v = 0.16 + 0.84 * Math.max(0, s * nx * L.x + s * ny * L.y + nz * L.z);
      const along = along0 + t * len;
      v += (noise2(s * r * 0.6, along * 0.17, seed) - 0.5) * 0.42;
      if (birch && r > 1.6 && noise2(s * r * 0.22 + 3, along * 0.55, seed + 11) > 0.72) v = 0.02;
      const k = v * (n - 1) + (bayer(x, y) - 0.5) * 0.55;
      d[i] = ramp[k <= 0 ? 0 : k >= n - 1 ? n - 1 : Math.round(k)];
    }
  }
}
