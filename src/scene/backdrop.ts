// The still part of the world, baked once per size, time of day and kind of tree: a dithered
// sky, then the tree's native land (src/scene/lands.ts): far mountains, water, hills with a
// landmark and small trees of the same kind in the distance, the meadow and a cross-section
// of soil.

import { landOf, type Land, type Landmark } from './lands';
import { bayer, clamp, gradeAll, grade, h2, hex, mixc, noise1, noise2, type Grade, type PSprite } from './raster';
import type { Species } from './species';

export interface Backdrop {
  px: Uint32Array;
  skyTop: Int16Array; // first non-sky row in each column
}

const fbm = (u: number, seed: number) => 0.6 * noise1(u, seed) + 0.28 * noise1(u * 2.3, seed + 1) + 0.12 * noise1(u * 5.1, seed + 2);

/** Far mountain colours (dark, mid, light) and how much they fade into the sky. */
const FAR_COLORS: Record<string, { c: [string, string, string]; haze: number }> = {
  stone: { c: ['#55698c', '#7088aa', '#93a9c6'], haze: 0.45 },
  fuji: { c: ['#4a5f8e', '#647ca8', '#88a0c8'], haze: 0.32 },
  rolling: { c: ['#56786e', '#68907e', '#82a890'], haze: 0.42 },
  taiga: { c: ['#2f4c4a', '#3b5c56', '#4b6e64'], haze: 0.36 },
  karstBack: { c: ['#56746e', '#6a8a80', '#86a494'], haze: 0.55 },
  karst: { c: ['#3e6052', '#4f7462', '#6a8e76'], haze: 0.3 },
  ridgeBack: { c: ['#56708e', '#6a86a2', '#86a0b8'], haze: 0.5 },
  ridgeMid: { c: ['#3e6458', '#4c7666', '#62907a'], haze: 0.36 },
  ridgeFront: { c: ['#2e5a44', '#3a6c50', '#4e8660'], haze: 0.24 },
  volcano: { c: ['#4e5a78', '#68748e', '#8a94aa'], haze: 0.3 },
  kili: { c: ['#5a6480', '#747e98', '#949cb4'], haze: 0.42 },
  mesa: { c: ['#8a6a56', '#a8866a', '#c4a484'], haze: 0.38 },
  sugarloaf: { c: ['#3e5a5a', '#56746e', '#78928a'], haze: 0.26 },
  spiresBack: { c: ['#5a6c7c', '#72849a', '#90a0b2'], haze: 0.55 },
  spires: { c: ['#46585e', '#5c7076', '#7a8e90'], haze: 0.32 },
};

/** lxP: where the light comes from on the hills (-1 left … 1 right). */
export function buildBackdrop(W: number, H: number, gy: number, stops: [string, string, string], G: Grade, lxP: number, sp: Species): Backdrop {
  const land: Land = landOf(sp.id);
  const px = new Uint32Array(W * H);
  const top = new Int16Array(W).fill(gy);
  const cx = W >> 1;
  const sc = H / 200; // feature size relative to the view
  const u = Math.max(1, Math.round(H / 110)); // landmark pixel size
  const put = (x: number, y: number, c: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    px[y * W + x] = c;
    if (y < top[x]) top[x] = y;
  };
  const rect = (x: number, y: number, w: number, h: number, c: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
  };

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
  const fade = (c: number, k: number) => mixc(c, horizon, k);
  const snow = fade(grade(hex('#f2f5fa'), G), 0.25);

  // ----- far mountains, lit on the faces that turn toward the light -----
  const farLayer = (
    topAt: (x: number) => number,
    colors: keyof typeof FAR_COLORS,
    from = 0,
    to = W,
    snowy?: (x: number, y: number, t0: number) => boolean,
  ) => {
    const { c, haze } = FAR_COLORS[colors];
    const cols = gradeAll(c, G).map((v) => fade(v, haze));
    const hazy = cols.map((v) => fade(v, 0.3));
    for (let x = Math.max(0, Math.floor(from)); x < Math.min(W, Math.ceil(to)); x++) {
      const t0 = Math.round(topAt(x));
      if (t0 >= gy) continue;
      const sl = (topAt(x + 3) - topAt(x - 3)) / 6; // >0 = sloping down to the right
      const light = clamp(0.5 + sl * lxP * 2.2, 0, 1);
      for (let y = Math.max(0, t0); y < gy; y++) {
        const k = Math.min(2, Math.max(0, Math.floor(light * 2.99 + (bayer(x, y) - 0.5) * 0.45)));
        const depth = (y - t0) / Math.max(1, gy - t0);
        let col = depth * 2 + (bayer(x, y) - 0.5) * 0.4 > 1 ? hazy[k] : cols[k];
        if (snowy?.(x, y, t0)) col = k >= 1 ? snow : mixc(snow, cols[0], 0.4);
        px[y * W + x] = col;
      }
      top[x] = Math.min(top[x], t0);
    }
  };
  // ridged noise gives sharp peaks rather than rolling bumps
  const ridge = (v: number, f = 1.6, o = 40) => {
    const r = 1 - Math.abs(2 * noise1(v * f + o, 11) - 1);
    return 0.7 * r * r + 0.3 * noise1(v * f * 2.6 + o * 0.1 + 3, 12);
  };
  const U = (x: number) => (x - cx) / H;
  // in a narrow view (the picker cards) landmarks move out toward the edges, clear of the tree
  const narrow = W < H * 1.4;
  const aside = (a: number) => (narrow ? Math.sign(a) * Math.max(Math.abs(a), 0.36) : a);
  // a beach: the sea's horizon, and the shore where the waves come up the sand
  const seaTop = gy - Math.round(H * 0.17);
  const shore = (x: number) => gy - Math.round(H * (0.055 + 0.02 * noise1(U(x) * 3 + 7, 31)));
  const island = { at: cx + aside(land.peakAt ?? -0.3) * W, hw: H * 0.3 };
  const islandTop = (x: number) => {
    const d = Math.abs(x - island.at) / island.hw;
    return d >= 1 ? gy : seaTop - H * (0.032 * Math.pow(1 - d * d, 0.7) + 0.006 * noise1(x * 0.25, 5));
  };
  /**
   * A lone mountain at `at`: `hw` half-width and `peak` height (shares of the view height),
   * sides curving by `pow`, cut flat at `cap` of its height, snow above `snow`.
   */
  const cone = (at: number, hw: number, peak: number, pow: number, cap: number, snow: number, colors: keyof typeof FAR_COLORS) => {
    const fx = cx + aside(at) * W;
    hw *= H;
    peak *= H;
    const topAt = (x: number) => {
      const d = Math.min(1, Math.abs(x - fx) / hw);
      return gy - Math.min(peak * Math.pow(1 - d, pow), peak * cap);
    };
    farLayer(topAt, colors, fx - hw, fx + hw, (x, y) => {
      const streak = Math.max(0, noise1(x * 0.32, 9) - 0.45) * H * 0.16;
      const line = H * (snow + 0.015 * noise1(x * 0.9, 7)) - streak;
      return gy - y > line;
    });
  };
  /** A row of rounded pillars or domes: heights and widths as shares of the view height. */
  const humps = (seed: number, minH: number, maxH: number, minW = 0.05, varW = 0.06, gap = 1.3, pow = 0.45) => {
    const list: { x: number; w: number; h: number }[] = [];
    for (let x = -H * 0.2, i = 0; x < W + H * 0.2; i++) {
      const w = H * (minW + h2(i, seed) * varW);
      list.push({ x: x + w, w, h: H * (minH + h2(i, seed + 1) * (maxH - minH)) });
      x += w * (gap + h2(i, seed + 2) * 0.9);
    }
    return (x: number) => {
      let best = 0;
      for (const k of list) {
        const d = (x - k.x) / k.w;
        if (Math.abs(d) < 1) best = Math.max(best, k.h * Math.pow(1 - d * d, pow));
      }
      return gy - Math.max(best, H * 0.04);
    };
  };
  switch (land.far) {
    case 'peaks': {
      const t = (x: number) => gy - H * (0.1 + 0.27 * ridge(U(x)));
      farLayer(t, 'stone', 0, W, (x, y, t0) => t0 < gy - H * 0.27 && y - t0 < 1 + noise1(x * 0.5, 5) * 5);
      break;
    }
    case 'rockies': {
      const t = (x: number) => gy - H * (0.14 + 0.28 * ridge(U(x), 2.6));
      farLayer(t, 'stone', 0, W, (x, y, t0) => t0 < gy - H * 0.25 && y - t0 < 2 + noise1(x * 0.6, 5) * 7);
      break;
    }
    case 'fuji':
      farLayer((x) => gy - H * (0.05 + 0.08 * ridge(U(x))), 'stone');
      // Mt Fuji: one wide cone with gently curving sides, a flat top and a snow cap
      cone(land.peakAt ?? 0, 0.62, 0.37, 1.55, 0.93, 0.25, 'fuji');
      break;
    case 'rolling':
      farLayer((x) => gy - H * (0.07 + 0.09 * fbm(U(x) * 1.4 + 5, 41)), 'rolling');
      break;
    case 'taiga':
      farLayer((x) => gy - H * (0.06 + 0.06 * fbm(U(x) * 1.2 + 9, 43)), 'taiga');
      break;
    case 'karst':
      // Guilin: steep, rounded limestone pillars, a misty row behind a darker one
      farLayer(humps(71, 0.16, 0.34), 'karstBack');
      farLayer(humps(83, 0.09, 0.22), 'karst');
      break;
    case 'sugarloaf':
      // Rio: great bare granite domes rising straight out of the bay
      farLayer((x) => gy - H * (0.05 + 0.06 * fbm(U(x) * 1.6 + 7, 45)), 'karstBack');
      farLayer(humps(97, 0.14, 0.32, 0.07, 0.07, 2.4, 0.6), 'sugarloaf');
      break;
    case 'spires':
      // Huangshan: needles of granite rising out of the mist
      farLayer((x) => gy - H * (0.12 + 0.24 * Math.pow(ridge(U(x), 2.4, 9), 1.6)), 'spiresBack');
      farLayer(humps(53, 0.1, 0.28, 0.025, 0.035, 1.6, 0.9), 'spires');
      break;
    case 'volcano':
      // a lone snowy cone over lower ranges (Damavand, Villarrica)
      farLayer((x) => gy - H * (0.06 + 0.12 * ridge(U(x), 2)), 'stone');
      cone(land.peakAt ?? 0, 0.48, 0.36, 1.25, 0.96, 0.22, 'volcano');
      break;
    case 'kilimanjaro':
      // a vast, gentle mountain with a flat, snowy top, far across the plain
      farLayer((x) => gy - H * (0.03 + 0.04 * fbm(U(x) * 1.4 + 3, 49)), 'kili');
      cone(land.peakAt ?? 0, 0.95, 0.3, 1.05, 0.8, 0.235, 'kili');
      break;
    case 'mesa': {
      // Socotra: flat-topped limestone plateaus with sheer sides
      const top = (x: number, f: number, o: number, lo: number, hi: number) => {
        const m = clamp((fbm(U(x) * f + o, 47) - 0.42) * 7, 0, 1);
        return gy - H * (lo + hi * m + 0.012 * noise1(x * 0.3, 5));
      };
      farLayer((x) => top(x, 1.3, 11, 0.08, 0.14), 'karstBack');
      farLayer((x) => top(x, 2.1, 31, 0.04, 0.11), 'mesa');
      break;
    }
    case 'ridges':
      // the Cordillera: ridge behind ridge, each one bluer with distance
      farLayer((x) => gy - H * (0.14 + 0.22 * (0.6 * ridge(U(x), 1.2, 3) + 0.4 * fbm(U(x) * 1.3 + 3, 51))), 'ridgeBack');
      farLayer((x) => gy - H * (0.09 + 0.15 * (0.6 * ridge(U(x), 1.9, 17) + 0.4 * fbm(U(x) * 1.8 + 17, 53))), 'ridgeMid');
      farLayer((x) => gy - H * (0.06 + 0.08 * fbm(U(x) * 2.3 + 29, 57)), 'ridgeFront');
      break;
    case 'sea':
      // open sea, with one low green island far out on it
      farLayer(islandTop, 'rolling', island.at - island.hw, island.at + island.hw);
      break;
  }

  // ----- the sea, out to the horizon: deep blue far off, turquoise in the shallows -----
  if (land.beach) {
    const bands = gradeAll(['#2a62a0', '#2e74b0', '#3388bc', '#3c9ec4', '#4ab4c8', '#6cccc8'], G).map((c, i) => fade(c, 0.26 - i * 0.05));
    const glint = fade(grade(hex('#eef8fa'), G), 0.15);
    for (let y = seaTop; y < gy; y++) {
      const k = (y - seaTop) / Math.max(1, gy - seaTop);
      for (let x = 0; x < W; x++) {
        let c = bands[Math.min(bands.length - 1, Math.max(0, Math.floor(k * (bands.length - 0.01) + (bayer(x, y) - 0.5) * 0.8)))];
        // little whitecaps and glitter, in short flat dashes
        if (noise2(x * (0.09 + k * 0.08), y * (1.3 - k * 0.6), 63) > 0.8 - k * 0.04) c = mixc(glint, c, 0.45);
        px[y * W + x] = c;
      }
    }
    for (let x = 0; x < W; x++) top[x] = Math.min(top[x], seaTop);
  }

  // ----- a lake or river, reflecting the mountains -----
  const waterTop = gy - Math.round(H * 0.1);
  if (land.water) {
    const tint = fade(grade(hex('#4a78a8'), G), 0.35);
    const shine = fade(grade(hex('#dcecf6'), G), 0.3);
    for (let y = waterTop; y < gy; y++)
      for (let x = 0; x < W; x++) {
        const my = waterTop - (y - waterTop) - 1;
        const above = my >= 0 ? px[my * W + x] : horizon;
        const ripple = noise2(x * 0.18, y * 0.9, 61) + (bayer(x, y) - 0.5) * 0.2;
        px[y * W + x] = ripple > 0.72 ? mixc(shine, tint, 0.4) : mixc(above, tint, 0.55);
      }
  }

  // ----- hills -----
  const hl = land.hills;
  const markX = Math.round(cx + aside(land.landmarkAt) * W);
  // a boat or bridge sits on the water: the hills stay low around it so it shows
  const afloat = !!land.water && FLOATS.includes(land.landmark);
  const dip = (x: number) => (afloat ? clamp(Math.abs(x - markX) / (H * 0.14), 0, 1) ** 2 : 1);
  const midTop = (x: number) => gy - Math.round(H * (hl.base + hl.amp * fbm(U(x) * hl.freq + 90, 21)) * dip(x));
  const [hA, hB] = gradeAll(hl.colors, G).map((c) => fade(c, 0.24));
  const [tLip, tDark] = gradeAll(['#86c060', '#3f7a38'], G).map((c) => fade(c, 0.22));
  const step = Math.max(2, Math.round(2.2 * u)); // rice terrace height
  for (let x = 0; x < W && !land.beach; x++) {
    const t0 = midTop(x);
    for (let y = t0; y < gy; y++) {
      const k = (y - t0) / Math.max(1, gy - t0);
      let c = k * 2 + bayer(x, y) > 1.2 ? hB : hA;
      if (hl.terraces) {
        const r = (y - gy + 1000 * step + Math.round(noise1(x * 0.05, 3) * 2)) % step;
        c = r === 0 ? tLip : r === step - 1 ? tDark : c;
      }
      px[y * W + x] = c;
    }
    top[x] = Math.min(top[x], t0);
  }

  // ----- small trees of this kind in the distance -----
  const leaf = gradeAll([sp.leaves[2], sp.leaves[4], sp.leaves[6]], G);
  const pineLeaf = gradeAll(['#16402a', '#22573a', '#33704a'], G);
  const trunkC = grade(hex(sp.birch ? '#e8e4dc' : sp.bark[1]), G);
  const fruitC = sp.fruit ? grade(hex(sp.fruit), G) : 0;
  const flowerC = sp.flower ? grade(hex(sp.flower), G) : 0;
  const mini = (x0: number, cy: number, r: number, haze: number, evergreen: boolean) => {
    const shape = evergreen ? 'pine' : sp.foliage === 'pine' ? 'pine' : sp.birch ? 'birch' : sp.foliage;
    const [dk, md, lt] = (evergreen ? pineLeaf : leaf).map((c) => fade(c, haze));
    if (shape === 'palm') {
      // a slim leaning trunk and a star of drooping fronds
      const tc = fade(trunkC, haze), lean = h2(x0, 64) < 0.5 ? -1 : 1;
      const tx = x0 + lean * r * 0.35, ty = cy - r * 0.2, base = cy + r * 1.6;
      for (let y = Math.round(ty); y <= Math.round(base); y++) {
        const q = (base - y) / (base - ty);
        put(x0 + lean * r * 0.35 * Math.pow(q, 1.6), y, tc);
      }
      for (const a of [-2.9, -2.35, -1.85, -1.3, -0.8, -0.25]) {
        const toward = Math.cos(a) < 0 ? -1 : 1, len = r * 1.35;
        for (let s = 0; s <= len; s += 0.6) {
          const q = s / len, b = a + toward * 1.1 * Math.pow(q, 1.3);
          const x = tx + Math.cos(a) * s * 0.9 + Math.cos(b) * s * 0.1, y = ty + Math.sin(b) * s;
          put(x, y, q < 0.5 && a > -2 && a < -1.1 ? lt : md);
          if (r > 2.4 && q > 0.2) put(x, y + 1, dk);
        }
      }
      return;
    }
    const R = Math.ceil(r) + 1;
    if (r >= 2.2 && shape !== 'pine') {
      const tc = fade(evergreen ? pineLeaf[0] : trunkC, haze);
      for (let y = Math.round(cy + r * 0.5); y <= Math.round(cy + r * 1.5); y++) put(x0, y, tc);
    }
    for (let dy = -R * (shape === 'pine' ? 2 : 1); dy <= R * 1.4; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const x = x0 + dx, y = Math.round(cy) + dy;
        if (x < 0 || x >= W || y < 0 || y >= gy) continue;
        let inside: boolean;
        if (shape === 'pine') inside = dy <= r * 0.7 && Math.abs(dx) <= (dy + r * 2) * 0.34;
        else if (shape === 'willow') inside = dy <= r * 1.25 && dx * dx + (dy < 0 ? dy * dy : dy * dy * 0.35) <= r * r;
        else if (shape === 'birch') inside = dx * dx * 1.6 + dy * dy * 0.75 <= r * r;
        else if (shape === 'blossom') inside = dx * dx + dy * dy * 1.25 <= r * r;
        else inside = dx * dx + dy * dy <= r * r;
        if (!inside) continue;
        const v = (-dx * lxP * 0.7 - dy * 0.7) / r + (bayer(x, y) - 0.5) * 0.8;
        let c = v > 0.35 ? lt : v > -0.45 ? md : dk;
        if (shape === 'willow' && dy > 0 && (x & 1)) c = dk; // hanging strands
        if (!evergreen && fruitC && h2(x, y + 7) < 0.07) c = fade(fruitC, haze);
        if (!evergreen && flowerC && sp.foliage === 'blossom' && h2(x, y + 9) < 0.06) c = fade(flowerC, haze);
        px[y * W + x] = c;
        if (y < top[x]) top[x] = y;
      }
  };
  const farR = (i: number) => (1.5 + h2(i, 62) * 2.2) * Math.max(0.8, sc);
  if (land.beach) {
    // a few palms on the island out at sea
    for (let k = 0; k < 4; k++) {
      const x = Math.round(island.at + (k - 1.4) * island.hw * 0.28 + (h2(k, 65) - 0.5) * island.hw * 0.1);
      const r = (1.1 + h2(k, 66) * 0.6) * Math.max(0.8, sc);
      mini(x, islandTop(x) - r * 1.5, r, 0.4, false);
    }
  } else if (land.orchard) {
    // neat rows down the hillside
    const k = Math.max(0.9, sc);
    for (let row = 0; row < 3; row++) {
      const r = (1.9 + row * 0.7) * k;
      const gap = Math.max(5, Math.round(r * 3.4));
      for (let x = (row * gap) >> 1; x < W; x += gap) {
        const cy = midTop(x) + r + row * 3.2 * k * 1.6;
        if (cy + r < gy - 1) mini(x, cy, r, 0.28 - row * 0.06, false);
      }
    }
  } else {
    for (let x = 0; x < W; x++) {
      if (h2(x - cx, 61) > land.farTrees) continue;
      const r = farR(x - cx);
      mini(x, midTop(x) + r * 0.4, r, 0.26, h2(x - cx, 63) < (land.farPines ?? 0));
    }
  }

  // ----- the landmark (on a beach, a boat out on the water) -----
  const markY = land.beach ? Math.round(seaTop + (gy - H * 0.06 - seaTop) * 0.5) : afloat ? gy - Math.round(H * 0.045) : midTop(markX) + u;
  drawLandmark(land.landmark, markX, markY, u, G, fade, put, rect);

  // ----- a few nearer trees at the back of the meadow (on a beach, palms along the shore) -----
  const nearTop = land.beach ? shore : (x: number) => gy - Math.round(H * (0.012 + 0.035 * noise1(U(x) * 4.5 + 7, 31)));
  const nearCount = land.beach ? 2 : Math.max(2, Math.round(W / (H * 0.22)));
  for (let i = 0; i < nearCount; i++) {
    const x = Math.round(((i + 0.2 + h2(i, 71) * 0.6) / nearCount) * W);
    if (Math.abs(x - cx) < W * 0.12 || Math.abs(x - markX) < H * 0.1) continue; // keep the tree and landmark clear
    const r = (2.6 + h2(i, 72) * 2.2) * Math.max(0.9, sc);
    mini(x, nearTop(x) - r * (land.beach ? 2 : 0.5), r, 0.12, h2(i, 73) < (land.farPines ?? 0));
  }

  // ----- near meadow (on a beach: foam where the waves run up, damp sand, then dry sand) -----
  const [mB, mA, mC] = gradeAll(land.meadow ?? ['#58963f', '#6aa84e', '#7cba58'], G);
  const [foam, foamDk, wet] = gradeAll(['#f6fcfa', '#cfe8ea', '#b8995e'], G);
  for (let x = 0; x < W; x++) {
    const t0 = nearTop(x);
    if (land.beach) {
      if (h2(x, 81) < 0.9) put(x, t0 - 1, h2(x, 82) < 0.7 ? foam : foamDk);
      if (h2(x, 83) < 0.35) put(x, t0 - 2, foamDk);
    }
    for (let y = t0; y < gy; y++) {
      const n = noise2(x * 0.35, y * 0.9, 77);
      if (land.beach && y - t0 < 2) px[y * W + x] = y === t0 || bayer(x, y) < 0.5 ? wet : mB;
      else px[y * W + x] = y === t0 ? mC : n + (bayer(x, y) - 0.5) * 0.3 > 0.55 ? mA : mB;
    }
    top[x] = Math.min(top[x], land.beach ? t0 - 2 : t0);
  }

  // ----- grass edge and soil (on a beach, sand all the way down) -----
  const [g0, g1, g2] = gradeAll(land.beach ? ['#f2dfb0', '#e2c890', '#cdb078'] : ['#86c85a', '#4f9a3c', '#2f6a2e'], G);
  const soil = gradeAll(land.beach ? ['#d6b87e', '#c8a870', '#b89662', '#a48454', '#8c7046'] : ['#6a4630', '#5a3b28', '#4a3020', '#3a2418', '#2c1b12'], G);
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
  // pebbles, lit from above (on a beach, pale shells)
  const [pd, pm, pl] = gradeAll(land.beach ? ['#b08870', '#e8d0c0', '#fff6ee'] : ['#4a4038', '#7a6c60', '#a89a8a'], G);
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

const FLOATS: Landmark[] = ['bridge', 'canoe', 'vinta', 'dhow'];

/**
 * A small landmark standing on the hills, `u` pixels per block, with its base at (x, yb).
 * Everything fades a little toward the sky, like the hills around it.
 */
function drawLandmark(
  kind: Landmark,
  x: number,
  yb: number,
  u: number,
  G: Grade,
  fade: (c: number, k: number) => number,
  put: (x: number, y: number, c: number) => void,
  rect: (x: number, y: number, w: number, h: number, c: number) => void,
) {
  const col = (h: string) => fade(grade(hex(h), G), 0.18);
  /** A row `w` blocks wide, centred on x, `j` blocks above the base. */
  const row = (w: number, j: number, c: number, h = 1) => rect(x - Math.floor((w * u) / 2), yb - (j + h) * u, w * u, h * u, c);
  const thin = Math.max(1, u >> 1); // poles and masts
  switch (kind) {
    case 'pagoda': {
      // five-storey pagoda: vermilion walls under dark, upturned roofs
      const wall = col('#c8402e'), wallDk = col('#8a2a22'), roof = col('#2e2a36'), gold = col('#e0b040');
      let j = 0;
      for (let tier = 0; tier < 5; tier++) {
        const w = 7 - tier;
        row(w, j, wall, 2);
        rect(x - Math.floor(u / 2), yb - (j + 2) * u, u, u, wallDk); // a window
        j += 2;
        row(w + 4, j, roof);
        const half = Math.floor(((w + 4) * u) / 2);
        rect(x - half, yb - (j + 2) * u, u, u, roof); // the roof tips turn up
        rect(x - half + (w + 3) * u, yb - (j + 2) * u, u, u, roof);
        j += 1;
      }
      row(1, j, gold, 4); // the spire
      break;
    }
    case 'spire': {
      // a village church: stone nave and tower with a tall spire
      const stone = col('#c8c0b0'), stoneDk = col('#9a9284'), roof = col('#5a4a48'), dark = col('#2e2a30');
      rect(x - 4 * u, yb - 4 * u, 8 * u, 4 * u, stone);
      for (let i = 0; i < 2 * u; i++) rect(x - 4 * u + i, yb - 4 * u - 1 - i, 8 * u - 2 * i, 1, roof);
      rect(x - 2 * u, yb - 2 * u, u, u, dark);
      rect(x + u, yb - 2 * u, u, u, dark);
      const tx = x - 7 * u;
      rect(tx, yb - 8 * u, 3 * u, 8 * u, stoneDk);
      rect(tx + u, yb - 6 * u, u, u, dark);
      for (let i = 0; i < 7 * u; i++) {
        const w = Math.max(1, Math.round(3 * u * (1 - i / (7 * u))));
        rect(tx + Math.floor((3 * u - w) / 2), yb - 8 * u - 1 - i, w, 1, roof);
      }
      break;
    }
    case 'yurt': {
      // a white felt yurt with a red band and a dark door
      const felt = col('#f0ebe0'), shade = col('#cfc6b4'), band = col('#b8342c'), door = col('#6a3a22');
      row(9, 0, shade, 2);
      for (let i = 0; i < 3 * u; i++) {
        const w = Math.round(9 * u * Math.sqrt(1 - (i / (3 * u)) ** 2));
        rect(x - Math.floor(w / 2), yb - 2 * u - 1 - i, w, 1, felt);
      }
      row(9, 2, band);
      row(3, 5, band); // the crown on top
      row(2, 0, door, 2);
      break;
    }
    case 'onion': {
      // a white church with an onion dome
      const wall = col('#ece6da'), roof = col('#4a6a8a'), dome = col('#d8a830'), domeDk = col('#a87a20'), dark = col('#2e2a30');
      row(7, 0, wall, 5);
      row(1, 0, dark, 2);
      row(9, 5, roof);
      row(3, 6, wall, 2); // the drum
      const shape = [3, 5, 5, 4, 2, 1];
      shape.forEach((w, i) => row(w, 8 + i, i < 2 ? domeDk : dome));
      row(1, 14, dark, 2); // the cross
      break;
    }
    case 'bridge': {
      // a moon bridge: a stone arch whose reflection closes the circle
      const stone = col('#d0c8b8'), stoneDk = col('#9a9080');
      const R = 8 * u, T = 2 * u;
      for (let dx = -R - T; dx <= R + T; dx++) {
        const outer = Math.sqrt(Math.max(0, (R + T) ** 2 - dx * dx));
        const inner = Math.abs(dx) < R ? Math.sqrt(R * R - dx * dx) : 0;
        for (let y = Math.round(yb - outer); y <= Math.round(yb - inner); y++) put(x + dx, y, y <= yb - outer + 1 ? stone : stoneDk);
        for (let y = Math.round(yb + inner); y <= Math.round(yb + outer * 0.8); y++) if ((y + dx) & 1) put(x + dx, y, stoneDk); // reflection
      }
      break;
    }
    case 'hut': {
      // a bahay kubo: bamboo walls on stilts under a steep thatched roof
      const bamboo = col('#c8a860'), bambooDk = col('#8a6a34'), thatch = col('#7a5a30'), thatchLt = col('#a07a40');
      rect(x - 3 * u, yb - 2 * u, u, 2 * u, bambooDk);
      rect(x + 2 * u, yb - 2 * u, u, 2 * u, bambooDk);
      row(8, 2, bambooDk);
      row(6, 3, bamboo, 3);
      row(1, 3, bambooDk, 2);
      for (let i = 0; i < 4; i++) row(10 - 2 * i, 6 + i, i % 2 ? thatchLt : thatch);
      break;
    }
    case 'canoe': {
      // a red canoe out on the lake, someone paddling
      const red = col('#c8402e'), redDk = col('#8a2a22'), dark = col('#2a2630');
      row(7, 0, red);
      rect(x - Math.floor((7 * u) / 2) - u, yb - 2 * u, u, u, redDk);
      rect(x + Math.ceil((7 * u) / 2), yb - 2 * u, u, u, redDk);
      row(1, 1, dark, 2);
      break;
    }
    case 'adobe': {
      // a whitewashed adobe house with a flat roof, and a tall cardon cactus beside it
      const wall = col('#ece2cc'), shade = col('#c8b898'), roof = col('#8a6a48'), door = col('#5a3a24'), cac = col('#5a8a42'), cacDk = col('#3a6a30');
      row(9, 0, wall, 4);
      rect(x + 2 * u, yb - 4 * u, 3 * u, 4 * u, shade);
      row(11, 4, roof);
      rect(x - 3 * u, yb - 3 * u, 2 * u, 3 * u, door);
      rect(x + u, yb - 3 * u, u, u, door); // a window
      const kx = x + 7 * u;
      rect(kx, yb - 10 * u, 2 * u, 10 * u, cac);
      rect(kx + u, yb - 10 * u, u, 10 * u, cacDk);
      rect(kx - 2 * u, yb - 5 * u, 2 * u, u, cac);
      rect(kx - 2 * u, yb - 8 * u, u, 3 * u, cac);
      rect(kx + 2 * u, yb - 4 * u, 2 * u, u, cacDk);
      rect(kx + 3 * u, yb - 7 * u, u, 3 * u, cacDk);
      break;
    }
    case 'vinta': {
      // a vinta: a slim outrigger boat under a sail of bright vertical stripes
      const hull = col('#7a4a2a'), hullLt = col('#a8703e'), dark = col('#2a2420');
      const stripes = ['#d8342a', '#f0c030', '#2e9a4a', '#2a6ab8', '#d8342a', '#f0c030'].map(col);
      rect(x - 8 * u, yb - u, 16 * u, thin, dark); // the outrigger poles
      row(7, 0, hull);
      row(10, 1, hullLt);
      rect(x - 6 * u, yb - 3 * u, u, u, hullLt); // the prows curl up
      rect(x + 5 * u, yb - 3 * u, u, u, hullLt);
      rect(x - 2 * u, yb - 12 * u, u, 10 * u, dark); // the mast
      stripes.forEach((c, i) => rect(x + (i - 1) * u, yb - (11 - (i >> 1)) * u, u, (8 - (i >> 1)) * u, c));
      break;
    }
    case 'dhow': {
      // a wooden dhow with a high stern and a white lateen sail
      const hull = col('#8a5a32'), hullDk = col('#5e3a20'), sail = col('#f2ead8'), sailDk = col('#cfc4ac'), dark = col('#2a2420');
      row(8, 0, hullDk);
      row(11, 1, hull);
      rect(x + 4 * u, yb - 3 * u, 2 * u, u, hull); // the high stern
      rect(x, yb - 11 * u, thin, 9 * u, dark); // the mast
      for (let i = 0; i < 8 * u; i++) {
        const w = Math.max(1, Math.round(7 * u * (1 - i / (8 * u))));
        rect(x - w, yb - 2 * u - 1 - i, w, 1, i < u ? sailDk : sail);
      }
      break;
    }
    case 'tranogasy': {
      // a highland house: tall, narrow, red brick, with a steep roof over a wooden veranda
      const brick = col('#b4523a'), brickDk = col('#86382a'), roof = col('#3a2a28'), wood = col('#e6dccc'), dark = col('#2a2024');
      row(7, 0, brick, 8);
      rect(x + 2 * u, yb - 8 * u, Math.ceil(1.5 * u), 8 * u, brickDk);
      rect(x - 2 * u, yb - 7 * u, u, 2 * u, dark); // upstairs windows
      rect(x + u, yb - 7 * u, u, 2 * u, dark);
      row(1, 0, dark, 3); // the door
      row(9, 4, wood); // the veranda, on thin posts
      for (const k of [-4, 4]) rect(x + k * u, yb - 4 * u, thin, 4 * u, wood);
      for (let i = 0; i < 5 * u; i++) {
        const w = Math.max(1, Math.round(9 * u * (1 - i / (5 * u))));
        rect(x - Math.floor(w / 2), yb - 8 * u - 1 - i, w, 1, roof);
      }
      break;
    }
    case 'chhatri': {
      // a chhatri: a domed pavilion of pale sandstone on a stepped plinth
      const stone = col('#e4c89a'), stoneDk = col('#b8986a'), dome = col('#f2e6d0'), domeDk = col('#d0c0a2'), dark = col('#6a5040'), gold = col('#e0b040');
      row(13, 0, stoneDk);
      row(11, 1, stone);
      row(9, 2, dark, 4); // the open pavilion, shadowed inside
      const l0 = x - Math.floor((9 * u) / 2);
      for (const k of [0, 4, 8]) rect(l0 + k * u, yb - 6 * u, u, 4 * u, stone);
      row(11, 6, stoneDk); // the eave
      for (let i = 0; i < 4 * u; i++) {
        const w = Math.round(7 * u * Math.sqrt(1 - (i / (4 * u)) ** 2));
        rect(x - Math.floor(w / 2), yb - 7 * u - 1 - i, w, 1, i < u ? domeDk : dome);
      }
      row(1, 11, gold, 2); // the finial
      break;
    }
    case 'farmhouse': {
      // a white clapboard farmhouse with a deep front porch and a brick chimney
      const white = col('#f2eee6'), shade = col('#c8c2b6'), roof = col('#5a5864'), dark = col('#2e2a30'), brick = col('#8a4a3a');
      rect(x + 3 * u, yb - 10 * u, u, 3 * u, brick);
      row(12, 0, white, 6);
      for (const k of [-4, -1, 2]) rect(x + k * u, yb - 5 * u, u, u, dark); // upstairs windows
      row(14, 3, roof); // the porch roof
      for (const k of [-6, -2, 2, 5]) rect(x + k * u, yb - 3 * u, thin, 3 * u, shade);
      rect(x - u, yb - 2 * u, u, 2 * u, dark); // the door
      for (let i = 0; i < 3 * u; i++) {
        const w = Math.max(1, Math.round(13 * u * (1 - i / (3.6 * u))));
        rect(x - Math.floor(w / 2), yb - 6 * u - 1 - i, w, 1, roof);
      }
      break;
    }
    case 'cabin': {
      // a log cabin with a lit window and a stone chimney
      const log = col('#8e5c34'), logDk = col('#64401f'), roof = col('#3e3430'), stone = col('#9a968e'), dark = col('#2a2220'), lamp = col('#f0c860');
      rect(x - 4 * u, yb - 8 * u, 2 * u, 4 * u, stone);
      for (let j = 0; j < 4; j++) row(9, j, j % 2 ? log : logDk);
      rect(x - u, yb - 3 * u, 2 * u, 3 * u, dark);
      rect(x + 2 * u, yb - 3 * u, u, u, lamp);
      for (let i = 0; i < 3 * u; i++) {
        const w = Math.max(1, Math.round(11 * u * (1 - i / (3.4 * u))));
        rect(x - Math.floor(w / 2), yb - 4 * u - 1 - i, w, 1, roof);
      }
      break;
    }
    case 'windcatcher': {
      // Yazd: a mud-brick house with a low dome and a tall windcatcher tower
      const mud = col('#dcbc8c'), mudDk = col('#b0905e'), dark = col('#5a4030');
      row(12, 0, mud, 4);
      rect(x - 4 * u, yb - 2 * u, u, 2 * u, dark); // the door
      for (let i = 0; i < 2 * u; i++) {
        const w = Math.round(5 * u * Math.sqrt(1 - (i / (2 * u)) ** 2));
        rect(x - 3 * u - Math.floor(w / 2), yb - 4 * u - 1 - i, w, 1, i < u >> 1 ? mudDk : mud);
      }
      const tx = x + u;
      rect(tx, yb - 12 * u, 5 * u, 8 * u, mud);
      rect(tx + 4 * u, yb - 12 * u, u, 8 * u, mudDk);
      rect(tx, yb - 13 * u, 5 * u, u, mudDk);
      for (const k of [1, 3]) rect(tx + k * u, yb - 12 * u, u, 3 * u, dark); // the vents that catch the wind
      break;
    }
    case 'rondavel': {
      // a round mud hut under a cone of thatch, beside a flat-topped acacia
      const mud = col('#a8704a'), mudDk = col('#7e5034'), thatch = col('#cca456'), thatchDk = col('#9a7838'), dark = col('#2e2220');
      const trunk = col('#4a3a2c'), leaf = col('#6a8438'), leafDk = col('#4a6428');
      row(8, 0, mud, 3);
      rect(x + 2 * u, yb - 3 * u, 2 * u, 3 * u, mudDk);
      row(2, 0, dark, 2);
      for (let i = 0; i < 5 * u; i++) {
        const w = Math.max(1, Math.round(11 * u * (1 - i / (5 * u))));
        rect(x - Math.floor(w / 2), yb - 3 * u - 1 - i, w, 1, Math.floor(i / u) % 2 ? thatch : thatchDk);
      }
      const ax = x + 10 * u;
      rect(ax, yb - 7 * u, u, 7 * u, trunk);
      rect(ax - u, yb - 7 * u, u, u, trunk);
      rect(ax + u, yb - 7 * u, u, u, trunk);
      rect(ax - 5 * u, yb - 8 * u, 11 * u, u, leafDk);
      rect(ax - 5 * u, yb - 9 * u, 11 * u, u, leaf);
      rect(ax - 3 * u, yb - 10 * u, 7 * u, u, leaf);
      break;
    }
    case 'paifang': {
      // a paifang: a gateway of red pillars under tiled roofs with upturned eaves
      const red = col('#c43a2a'), redDk = col('#8a2a22'), roof = col('#2e3a3c'), gold = col('#e0b040');
      for (const k of [-5, 4]) rect(x + k * u, yb - 9 * u, u, 9 * u, red);
      for (const k of [-2, 1]) rect(x + k * u, yb - 9 * u, u, 9 * u, redDk);
      row(11, 6, redDk);
      row(3, 7, gold); // the name board
      row(13, 9, roof);
      const half = Math.floor((13 * u) / 2);
      rect(x - half, yb - 11 * u, u, u, roof); // the eaves turn up
      rect(x - half + 12 * u, yb - 11 * u, u, u, roof);
      row(9, 10, roof);
      break;
    }
    case 'church': {
      // a white colonial church with two bell towers and golden trim
      const white = col('#f2eee4'), shade = col('#cfc8b8'), trim = col('#d8a838'), cap = col('#3a5a7a'), dark = col('#2e2a30');
      for (const k of [-6, 3]) {
        rect(x + k * u, yb - 10 * u, 3 * u, 10 * u, white);
        rect(x + k * u + 2 * u, yb - 10 * u, u, 10 * u, shade);
        rect(x + k * u + u, yb - 8 * u, u, 2 * u, dark); // the belfry
        rect(x + k * u, yb - 11 * u, 3 * u, u, cap);
        rect(x + k * u + u, yb - 12 * u, u, u, cap);
      }
      row(7, 0, white, 7);
      row(7, 6, trim);
      row(5, 7, white);
      row(3, 8, white);
      row(1, 9, trim, 2); // the cross
      rect(x - u, yb - 3 * u, 2 * u, 3 * u, dark);
      rect(x - Math.floor(u / 2), yb - 5 * u, u, u, dark); // a round window
      break;
    }
    case 'ruka': {
      // a Mapuche ruka: a low, rounded house thatched down to the ground, smoke curling up
      const thatch = col('#b49454'), thatchDk = col('#86683a'), thatchLt = col('#ccae6a'), dark = col('#2a2220'), smoke = col('#dfe2e6');
      const R = 7 * u, hh = 6 * u;
      for (let i = 0; i < hh; i++) {
        const w = Math.round(2 * R * Math.sqrt(1 - (i / hh) ** 2));
        rect(x - Math.floor(w / 2), yb - 1 - i, w, 1, i < u ? thatchDk : i > hh * 0.7 ? thatchLt : thatch);
      }
      rect(x - u, yb - 3 * u, 2 * u, 3 * u, dark);
      for (let k = 0; k < 3; k++) rect(x + Math.round(Math.sin(k * 1.6) * u), yb - hh - (2 + 2 * k) * u, u, u, smoke);
      break;
    }
    case 'bangka': {
      // a bangka: a white outrigger boat with a blue stripe, bamboo floats and a little red canopy
      const white = col('#f4f2ec'), blue = col('#2a6ab8'), bamboo = col('#c8a860'), bambooDk = col('#8a6a34'), red = col('#d0402e'), redLt = col('#e8644a');
      row(8, 0, blue);
      row(10, 1, white);
      rect(x - 6 * u, yb - 3 * u, u, u, white); // the prows curve up
      rect(x + 5 * u, yb - 3 * u, u, u, white);
      rect(x - 9 * u, yb - 2 * u, 18 * u, thin, bambooDk); // the outrigger poles, out to its floats
      for (const k of [-10, 7]) rect(x + k * u, yb - u, 3 * u, u, bamboo);
      for (const k of [-2, 2]) rect(x + k * u, yb - 6 * u, thin, 4 * u, bambooDk); // the canopy's posts
      row(7, 6, red);
      row(5, 7, redLt);
      break;
    }
  }
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
