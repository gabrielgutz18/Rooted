// The still part of the world, baked once per size and time of day: a dithered sky,
// hazy mountains, forested hills, the meadow and a cross-section of soil.

import { bayer, clamp, gradeAll, grade, h2, hex, mixc, noise1, noise2, type Grade, type PSprite } from './raster';

export interface Backdrop {
  px: Uint32Array;
  skyTop: Int16Array; // first non-sky row in each column
}

const fbm = (u: number, seed: number) => 0.6 * noise1(u, seed) + 0.28 * noise1(u * 2.3, seed + 1) + 0.12 * noise1(u * 5.1, seed + 2);

/** lxP: where the light comes from on the hills (-1 left … 1 right). */
export function buildBackdrop(W: number, H: number, gy: number, stops: [string, string, string], G: Grade, lxP: number): Backdrop {
  const px = new Uint32Array(W * H);
  const top = new Int16Array(W).fill(gy);
  const cx = W >> 1;
  const sc = H / 200; // feature size relative to the view

  // ----- sky: a smooth gradient, ordered-dithered into bands -----
  const s0 = hex(stops[0]), s1 = hex(stops[1]), s2 = hex(stops[2]);
  const BANDS = 18;
  const band: number[] = [];
  for (let b = 0; b < BANDS; b++) {
    const k = b / (BANDS - 1);
    band.push(k < 0.5 ? mixc(s0, s1, k * 2) : mixc(s1, s2, (k - 0.5) * 2));
  }
  for (let y = 0; y < gy; y++)
    for (let x = 0; x < W; x++) px[y * W + x] = band[Math.min(BANDS - 1, Math.floor((y / gy) * (BANDS - 1) + bayer(x, y)))];
  const horizon = s2;

  // ----- far mountains, lit on the faces that turn toward the light -----
  const mtn = [mixc(grade(hex('#55698c'), G), horizon, 0.45), mixc(grade(hex('#7088aa'), G), horizon, 0.45), mixc(grade(hex('#93a9c6'), G), horizon, 0.45)];
  const hazeC = mtn.map((c) => mixc(c, horizon, 0.3));
  const snow = mixc(grade(hex('#f2f5fa'), G), horizon, 0.25);
  // ridged noise gives sharp peaks rather than rolling bumps
  const ridge = (u: number) => {
    const r = 1 - Math.abs(2 * noise1(u * 1.6 + 40, 11) - 1);
    return 0.7 * r * r + 0.3 * noise1(u * 4.2 + 3, 12);
  };
  const farTop = (x: number) => gy - H * (0.1 + 0.27 * ridge((x - cx) / H));
  for (let x = 0; x < W; x++) {
    const t0 = Math.round(farTop(x));
    const sl = (farTop(x + 3) - farTop(x - 3)) / 6; // >0 = sloping down to the right
    const light = clamp(0.5 + sl * lxP * 2.2, 0, 1);
    const tall = t0 < gy - H * 0.29;
    for (let y = Math.max(0, t0); y < gy; y++) {
      const k = Math.min(2, Math.max(0, Math.floor(light * 2.99 + (bayer(x, y) - 0.5) * 0.45)));
      const haze = (y - t0) / Math.max(1, gy - t0);
      let c = haze * 2 + (bayer(x, y) - 0.5) * 0.4 > 1 ? hazeC[k] : mtn[k];
      if (tall && y - t0 < 1 + noise1(x * 0.5, 5) * 4) c = k >= 1 ? snow : mixc(snow, mtn[0], 0.4);
      px[y * W + x] = c;
    }
    top[x] = Math.min(top[x], t0);
  }

  // ----- hills with a line of distant trees -----
  const [hA, hB, fDark, fMid, fLit] = gradeAll(['#4f8a5e', '#3d7250', '#1e4a34', '#2f6644', '#4a8a56'], G).map((c) => mixc(c, horizon, 0.26));
  const midTop = (x: number) => gy - Math.round(H * (0.05 + 0.12 * fbm(((x - cx) / H) * 2.8 + 90, 21)));
  for (let x = 0; x < W; x++) {
    const t0 = midTop(x);
    for (let y = t0; y < gy; y++) {
      const k = (y - t0) / Math.max(1, gy - t0);
      px[y * W + x] = k * 2 + bayer(x, y) > 1.2 ? hB : hA;
    }
    top[x] = Math.min(top[x], t0);
  }
  const crown = (x0: number, y0: number, r: number, pine: boolean) => {
    const R = Math.ceil(r) + 1;
    for (let dy = -R * (pine ? 2 : 1); dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || x >= W || y < 0 || y >= gy) continue;
        const inside = pine ? dy <= r * 0.6 && Math.abs(dx) <= (dy + r * 2) * 0.33 : dx * dx + dy * dy <= r * r;
        if (!inside) continue;
        const v = (-dx * lxP * 0.7 - dy * 0.7) / r + (bayer(x, y) - 0.5) * 0.8;
        px[y * W + x] = v > 0.35 ? fLit : v > -0.45 ? fMid : fDark;
        if (y < top[x]) top[x] = y;
      }
  };
  for (let x = 0; x < W; x++) {
    const r0 = h2(x - cx, 61);
    if (r0 > 0.2) continue;
    const r = (1.6 + h2(x - cx, 62) * 2.6) * Math.max(0.8, sc);
    const t0 = midTop(x);
    crown(x, Math.round(t0 + r * 0.4), r, h2(x - cx, 63) < 0.35);
  }

  // ----- near meadow -----
  const [mA, mB, mC] = gradeAll(['#6aa84e', '#58963f', '#7cba58'], G);
  const nearTop = (x: number) => gy - Math.round(H * (0.012 + 0.035 * noise1(((x - cx) / H) * 4.5 + 7, 31)));
  for (let x = 0; x < W; x++) {
    const t0 = nearTop(x);
    for (let y = t0; y < gy; y++) {
      const n = noise2(x * 0.35, y * 0.9, 77);
      px[y * W + x] = y === t0 ? mC : n + (bayer(x, y) - 0.5) * 0.3 > 0.55 ? mA : mB;
    }
    top[x] = Math.min(top[x], t0);
  }

  // ----- grass edge and soil -----
  const [g0, g1, g2] = gradeAll(['#86c85a', '#4f9a3c', '#2f6a2e'], G);
  const soil = gradeAll(['#6a4630', '#5a3b28', '#4a3020', '#3a2418', '#2c1b12'], G);
  const soilH = H - gy;
  for (let y = gy; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x, r = y - gy;
      if (r === 0) px[i] = g0;
      else if (r === 1) px[i] = g1;
      else if (r <= 3 && h2(x - cx, r * 7) < (r === 2 ? 0.7 : 0.3)) px[i] = g2; // grass hanging over the edge
      else {
        const k = (r - 2) / Math.max(1, soilH - 2);
        px[i] = soil[Math.min(soil.length - 1, Math.floor(k * (soil.length - 1) + bayer(x, y) + (noise2(x * 0.2, y * 0.6, 9) - 0.5) * 0.6))];
      }
    }
  // pebbles, lit from above
  const [pd, pm, pl] = gradeAll(['#4a4038', '#7a6c60', '#a89a8a'], G);
  const stones = Math.round((W * soilH) / 70);
  for (let s = 0; s < stones; s++) {
    const sx = h2(s, 301) * W, sy = gy + 5 + h2(s, 302) * (soilH - 5), rx = 0.7 + h2(s, 303) * 1.8 * Math.max(1, sc), ry = rx * 0.7;
    for (let dy = Math.floor(-ry); dy <= Math.ceil(ry); dy++)
      for (let dx = Math.floor(-rx); dx <= Math.ceil(rx); dx++) {
        const ux = dx / rx, uy = dy / ry;
        if (ux * ux + uy * uy > 1) continue;
        const x = Math.round(sx + dx), y = Math.round(sy + dy);
        if (x < 0 || x >= W || y <= gy + 3 || y >= H) continue;
        px[y * W + x] = uy < -0.3 && ux < 0.4 ? pl : uy > 0.45 ? pd : pm;
      }
  }
  return { px, skyTop: top };
}

/** A puffy pixel cloud: lit top, soft shaded belly, flat base. */
export function makeCloud(w: number, h: number, seed: number, light: number, mid: number, dark: number): PSprite {
  const d = new Uint32Array(w * h);
  const base = Math.round(h * 0.86);
  const n = 4 + Math.floor(h2(seed, 1) * 3);
  const discs: { x: number; y: number; r: number }[] = [];
  for (let k = 0; k < n; k++) {
    const x = w * (0.18 + (0.64 * k) / (n - 1)) + (h2(seed, k + 10) - 0.5) * w * 0.08;
    const r = h * (0.3 + h2(seed, k + 20) * 0.3) * (1 - Math.abs(k / (n - 1) - 0.5) * 0.7);
    discs.push({ x, y: base - r * 0.55, r });
  }
  const topAt = new Float32Array(w).fill(1e9);
  for (let x = 0; x < w; x++)
    for (const c of discs) {
      const dx = x + 0.5 - c.x;
      if (Math.abs(dx) < c.r) topAt[x] = Math.min(topAt[x], c.y - Math.sqrt(c.r * c.r - dx * dx));
    }
  for (let x = 0; x < w; x++) {
    const t0 = Math.round(topAt[x]);
    if (t0 > base) continue;
    for (let y = Math.max(0, t0); y <= base && y < h; y++) {
      const k = (y - t0) / Math.max(1, base - t0);
      const v = k + (bayer(x, y) - 0.5) * 0.3;
      d[y * w + x] = y === base ? dark : v < 0.45 ? light : v < 0.8 ? mid : dark;
    }
  }
  return { w, h, d };
}
