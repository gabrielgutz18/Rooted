// The living scene: a procedural tree that grows with points and moves in the wind,
// with sky, hills, time-of-day light and animals that move in as it gets bigger.
//
// It is drawn as fine "32-bit era" pixel art on a fixed grid of small pixels (about
// 2.6 CSS px each). As the tree grows the camera zooms out: things are drawn smaller,
// but a pixel stays the same size. Light comes from wherever the sun (or moon) is.

import { growthValue, STAGES } from '../lib/growth';
import { buildBackdrop, makeCloud } from './backdrop';
import { clumpSprite, edgeLeaves, EDGE_MAX, type ClumpStyle } from './foliage';
import { buildTree, speciesOf, type Species, type Tree } from './species';
import { getSprites, type Sprite } from './sprites';
import {
  Pix, TAU, bayer, blit, clamp, grade, gradeAll, gradeSprite, h2, hashStr, hex, leafMask, limb, mixc, mulberry32, noise1,
  norm3, scalec, stamp, type Grade, type Light, type PSprite,
} from './raster';

export type Period = 'dawn' | 'day' | 'dusk' | 'night';
export function periodForHour(h: number): Period {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 19.5) return 'dusk';
  return 'night';
}

const SKY: Record<Period, { stops: [string, string, string]; cloud: [string, string, string] }> = {
  dawn: { stops: ['#6a7fc0', '#f0a890', '#ffd8a0'], cloud: ['#fff0e4', '#f4c8b8', '#c89aa0'] },
  day: { stops: ['#4f9ee0', '#94ccf0', '#d8f0f4'], cloud: ['#ffffff', '#e2edf6', '#b4c6dc'] },
  dusk: { stops: ['#3a2f6a', '#c05a6a', '#f4a060'], cloud: ['#f8c4b0', '#d88a90', '#8a5a7a'] },
  night: { stops: ['#0a0e2a', '#161c48', '#28306a'], cloud: ['#4a5486', '#363e70', '#262c58'] },
};

// How the world (not the sky) is coloured at each time of day.
const GRADE: Record<Period, Grade> = {
  dawn: { r: 1, g: 0.9, b: 0.86, ar: 14, ag: 6, ab: 4 },
  day: { r: 1, g: 1, b: 1, ar: 0, ag: 0, ab: 0 },
  dusk: { r: 0.95, g: 0.74, b: 0.8, ar: 16, ag: 0, ab: 12 },
  night: { r: 0.34, g: 0.42, b: 0.66, ar: 4, ag: 6, ab: 18 },
};
const HILL_LIGHT: Record<Period, number> = { dawn: -0.8, day: -0.35, dusk: 0.8, night: 0.4 };

const GREEN = ['#0c2216', '#174026', '#215a2e', '#2f7436', '#43903c', '#64ac46', '#8cc652', '#bce06c'];
const STEM = ['#1f4a22', '#2e6a2c', '#46893a', '#64a845', '#8cc457', '#b4dc70'];
// What leaves dry to before they fall, when the tree has been left alone (dark → light).
const DRY = ['#24160c', '#3e2814', '#5a3a1a', '#76501f', '#926626', '#ab7c30', '#c4963e', '#dab052'];
const SPARKS = ['#fff6c8', '#ffd76a', '#aae654', '#ffffff'].map(hex);

const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Walker {
  sprite: Sprite;
  kind: 'squirrel' | 'raccoon' | 'deer';
  x: number; // pixels from the middle
  dir: 1 | -1;
  walking: boolean;
  timer: number;
  speed: number;
}

interface Flyer {
  sprite: Sprite;
  x: number;
  y: number; // fraction of sky height
  dir: 1 | -1;
  speed: number;
  phase: number;
}

interface Particle {
  kind: 'leaf' | 'petal' | 'spark';
  x: number; // pixels from the tree base
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  ramp: number[];
  phase: number;
  spin: number;
}

interface ClumpAt {
  x: number;
  y: number;
  r: number;
  ls: number;
  back: boolean;
  squash: number;
}

interface Pal {
  bark: number[];
  barkOut: number;
  root: number[];
  leaves: number[];
  leavesBack: number[];
  sproutLeaves: number[];
  stem: number[];
  flower: number;
  fruit: number;
  bloom: number;
  hang: number[];
  streaks: number[][] | undefined;
  fall: number[][];
  grass: number[];
  flowers: number[];
  shadow: number;
}

export interface SceneState {
  points: number;
  seed: string;
  species?: string;
  hour?: number; // override the clock (for previews)
  bare?: number; // 0 = full leaves, 1 = bare branches (no notes for a long while)
}

export interface SceneOptions {
  pixel: number; // CSS pixels per art pixel
  animals: boolean;
  tight: boolean; // frame the tree closely (for small previews)
}

/** The part of the view the tree may fill, clear of the cards and the lamp post (CSS px from the top-left). */
export interface FreeArea {
  left: number;
  right: number;
  top: number;
}

/** How high the tree's crown reaches above the ground, and how far it spreads each side, at rest. */
function crownOf(tree: Tree): { top: number; half: number } {
  const n = tree.nodes.length;
  const ang = new Float32Array(n), x0 = new Float32Array(n), y0 = new Float32Array(n), x1 = new Float32Array(n), y1 = new Float32Array(n);
  let top = 1, half = 1;
  for (let i = 0; i < n; i++) {
    const nd = tree.nodes[i], pi = nd.parent;
    ang[i] = (pi >= 0 ? ang[pi] : 0) + nd.off;
    x0[i] = pi >= 0 ? x0[pi] + (x1[pi] - x0[pi]) * nd.at : 0;
    y0[i] = pi >= 0 ? y0[pi] + (y1[pi] - y0[pi]) * nd.at : 0;
    x1[i] = x0[i] + Math.cos(ang[i]) * nd.len;
    y1[i] = y0[i] + Math.sin(ang[i]) * nd.len;
    // a clump's leaves reach a little past its radius
    top = Math.max(top, -y1[i] + nd.leaf * 1.3);
    half = Math.max(half, Math.abs(x1[i]) + nd.leaf * 1.3);
  }
  return { top, half };
}

/**
 * How much of the world (in tree units, top to bottom) the camera shows so the crown fits: its top
 * about a tenth below the top edge and under any card there, and its sides inside the free space
 * (`margin` spare; -1 when there's no free area, which keeps the old side room). All in one unit.
 */
function fitView(top: number, half: number, H: number, gy: number, freeL: number, freeR: number, freeT: number, margin: number) {
  const byHeight = Math.max(top * 1.36 + 14, (top * H) / Math.max(10, gy - freeT - 4));
  const room = margin < 0 ? (freeR - freeL) / 2.3 : Math.max(10, (freeR - freeL) / 2 - margin);
  return Math.max(byHeight, (half * H) / room);
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private pix = new Pix();
  private sizeKey = '';
  private bg: Uint32Array = new Uint32Array(0);
  private skyTop: Int16Array = new Int16Array(0);
  private bgKey = '';
  private clouds: PSprite[] = [];
  private raf = 0;
  private last = 0;
  private t = 0;
  private g = -1;
  private bare = 0;
  private viewH = 0;
  private free: FreeArea | null = null;
  private cxNow = -1; // where the trunk stands, in art pixels (eases when the free area moves)
  private seedStr = '';
  private seed = 0;
  private speciesId = '';
  private cssW = 1;
  private cssH = 1;
  private walkers: Walker[] = [];
  private flyers: Flyer[] = [];
  private particles: Particle[] = [];
  private nextLeaf = 2;
  private shakeUntil = 0;
  private treeH = 10; // tree height in pixels, for sparkles
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private sprites = getSprites();
  private palCache = new Map<string, Pal>();
  private stemCache = new Map<string, number[]>();
  private gradedSprites = new WeakMap<PSprite, Map<Period, PSprite>>();
  private opts: SceneOptions;
  state: SceneState;
  onPeriod?: (p: Period) => void;
  private period: Period | null = null;
  private clumps: ClumpAt[] = [];

  constructor(private canvas: HTMLCanvasElement, state: SceneState, opts: Partial<SceneOptions> = {}) {
    this.ctx = canvas.getContext('2d')!;
    this.state = state;
    this.opts = { pixel: 2.6, animals: true, tight: false, ...opts };
    this.raf = requestAnimationFrame(this.tick);
  }

  resize(w: number, h: number) {
    this.cssW = Math.max(1, w);
    this.cssH = Math.max(1, h);
  }

  /** Keep the tree inside this area (the main view only), so cards and the lamp post don't cover it. */
  setFreeArea(free: FreeArea | null) {
    this.free = free;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Stop drawing while off screen (the tree picker has many small scenes), and pick up again. */
  setActive(on: boolean) {
    if (!on) return this.destroy();
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  /** Sparkles rising around the tree after a note is saved. */
  burst(n = 30) {
    const S = this.treeH;
    for (let i = 0; i < (this.reduced ? 6 : n); i++)
      this.particles.push({
        kind: 'spark', x: rand(-S * 0.5 - 6, S * 0.5 + 6), y: -rand(0, S * 0.9 + 4), vx: rand(-5, 5), vy: rand(-26, -8),
        life: 0, max: rand(0.9, 2), ramp: [SPARKS[(Math.random() * 4) | 0]], phase: rand(0, TAU), spin: 0,
      });
  }

  /** Shake the branches: a gust and a flurry of leaves. */
  rustle() {
    if (this.reduced) return;
    this.shakeUntil = this.t + 1.4;
    for (let i = 0; i < 16 && this.clumps.length; i++) this.dropLeaf();
  }

  private dropLeaf() {
    const c = this.clumps[(Math.random() * this.clumps.length) | 0];
    const sp = speciesOf(this.state.species);
    const pal = this.palette(sp, this.period ?? 'day', this.dryLevel());
    const W = this.pix.w, gy = this.pix.h - Math.max(5, Math.round(this.pix.h * 0.15));
    this.particles.push({
      kind: sp.fallKind, x: c.x - (this.cxNow < 0 ? Math.round(W / 2) : Math.round(this.cxNow)) + rand(-c.r, c.r), y: c.y - gy + rand(-c.r * 0.5, c.r * 0.5),
      vx: rand(-3, 4), vy: rand(6, 12), life: 0, max: 60, ramp: pal.fall[(Math.random() * pal.fall.length) | 0],
      phase: rand(0, TAU), spin: rand(1.5, 4) * (Math.random() < 0.5 ? -1 : 1),
    });
  }

  private hour(): number {
    if (this.state.hour !== undefined) return this.state.hour;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    if (now - this.last < 32) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.frame(dt);
  };

  /** How far the leaves have dried, in 5 steps (so the baked clumps can be reused). */
  private dryLevel(): number {
    return Math.round(clamp(this.bare * 1.6, 0, 1) * 4);
  }

  private palette(sp: Species, period: Period, dry = 0): Pal {
    const key = sp.id + period + dry;
    let pl = this.palCache.get(key);
    if (pl) return pl;
    const G = GRADE[period];
    const dk = (dry / 4) * 0.7;
    const parch = (list: string[]) => (dk ? list.map((h, i) => mixc(hex(h), hex(DRY[Math.min(DRY.length - 1, i)]), dk)) : list.map(hex));
    const gradeDry = (list: string[]) => parch(list).map((c) => grade(c, G));
    const bark = gradeAll(sp.bark, G);
    const leaves = gradeDry(sp.leaves);
    const backTint = grade(hex('#16304a'), G);
    pl = {
      bark,
      barkOut: grade(hex(sp.barkOutline), G),
      root: bark.map((c) => scalec(c, 0.72)),
      leaves,
      leavesBack: leaves.map((c, i) => (i === 0 ? c : scalec(mixc(c, backTint, 0.18), 0.8))),
      sproutLeaves: sp.foliage === 'blossom' ? gradeDry(GREEN) : leaves,
      stem: gradeAll(STEM, G),
      flower: grade(hex(sp.flower ?? '#ffffff'), G),
      fruit: sp.fruit ? grade(hex(sp.fruit), G) : 0,
      bloom: sp.bloom && !dk ? grade(hex(sp.bloom), G) : 0, // a drying tree has dropped its flowers
      hang: sp.hang ? gradeDry(sp.hang.colors) : [],
      streaks: sp.streaks?.map((h) => {
        const c = grade(hex(h), G);
        return [scalec(c, 0.62), scalec(c, 0.82), c, scalec(c, 1.15)];
      }),
      fall: parch(sp.fall).map((h) => {
        const c = grade(h, G);
        return [scalec(c, 0.7), c, scalec(c, 1.18)];
      }),
      grass: gradeAll(['#24502c', '#2f6a32', '#3f8a3a', '#5aa843', '#7cc450', '#a6dc6a'], G),
      flowers: gradeAll(['#ffe680', '#ff9ab0', '#ffffff', '#c0a8ff'], G),
      shadow: grade(hex('#14261a'), G),
    };
    this.palCache.set(key, pl);
    return pl;
  }

  /** Young trees have green stems that turn to bark. */
  private woodRamp(sp: Species, period: Period, pal: Pal, g: number): number[] {
    const k = Math.round(clamp((g - 0.04) / 0.26, 0, 1) * 8) / 8;
    if (k >= 1) return pal.bark;
    const key = sp.id + period + k;
    let r = this.stemCache.get(key);
    if (!r) {
      r = pal.bark.map((c, i) => mixc(pal.stem[i], c, k));
      this.stemCache.set(key, r);
    }
    return r;
  }

  private graded(s: PSprite, period: Period): PSprite {
    let m = this.gradedSprites.get(s);
    if (!m) this.gradedSprites.set(s, (m = new Map()));
    let out = m.get(period);
    if (!out) m.set(period, (out = gradeSprite(s, GRADE[period])));
    return out;
  }

  private zoomKey = '';
  private zoom = 1;

  /**
   * How far to zoom out the whole land (1 = not at all, down to 0.55): as much as the grown
   * tree has to shrink below its usual size to fit the free area. Worked out for the size the
   * tree is growing to, so the pixels don't change size while it grows.
   */
  private landZoom(sp: Species, target: number): number {
    const fa = this.opts.tight ? null : this.free;
    if (!fa) return 1;
    const key = `${sp.id}:${this.seed}:${target}:${this.cssW}x${this.cssH}:${fa.left},${fa.right},${fa.top}`;
    if (key === this.zoomKey) return this.zoom;
    this.zoomKey = key;
    const { top, half } = crownOf(buildTree(sp, this.seed, target));
    // in CSS pixels; the margins are about what the art-pixel ones come to at full size
    const H = this.cssH, W = this.cssW, gy = H * 0.85;
    const freeL = clamp(fa.left, 0, W * 0.4), freeR = clamp(fa.right, W * 0.6, W), freeT = clamp(fa.top, 0, gy * 0.5);
    const usual = top * 1.36 + 14;
    this.zoom = clamp(usual / fitView(top, half, H, gy, freeL, freeR, freeT, 6 * this.opts.pixel), 0.55, 1);
    return this.zoom;
  }

  private frame(dt: number) {
    const t = this.t;
    const ft = this.reduced ? 0 : t; // time for things that flutter
    const sp = speciesOf(this.state.species);
    const target = growthValue(this.state.points);
    if (this.seedStr !== this.state.seed || this.g < 0) {
      this.seedStr = this.state.seed;
      this.seed = hashStr(this.state.seed);
      this.g = target;
      this.bare = clamp(this.state.bare ?? 0, 0, 1);
      this.viewH = 0;
      this.walkers = [];
      this.flyers = [];
      this.particles = [];
    }
    if (sp.id !== this.speciesId) {
      this.speciesId = sp.id;
      this.particles = this.particles.filter((p) => p.kind === 'spark');
    }
    // grow smoothly toward the real size
    this.g += (target - this.g) * Math.min(1, dt * 0.8);
    if (Math.abs(target - this.g) < 0.0004) this.g = target;
    const g = this.g;
    // leaves grow back quickly after a note, and fall slowly
    const bareTarget = clamp(this.state.bare ?? 0, 0, 1);
    this.bare += (bareTarget - this.bare) * Math.min(1, dt * (bareTarget < this.bare ? 0.9 : 0.35));
    if (Math.abs(bareTarget - this.bare) < 0.002) this.bare = bareTarget;
    const bare = this.bare;
    const stage = Math.floor(g * (STAGES.length - 1) + 1e-6);
    const tree = buildTree(sp, this.seed, g);

    // ----- the pixel grid: whole device pixels per art pixel -----
    // when the tree has to shrink to fit beside the cards (phones), the whole land zooms out with it
    const dpr = window.devicePixelRatio || 1;
    const step = Math.max(1, Math.round(this.opts.pixel * this.landZoom(sp, target) * dpr));
    const W = Math.max(24, Math.ceil((this.cssW * dpr) / step));
    const H = Math.max(24, Math.ceil((this.cssH * dpr) / step));
    const sizeKey = `${W}x${H}x${step}x${dpr}`;
    if (sizeKey !== this.sizeKey) {
      this.sizeKey = sizeKey;
      this.pix.resize(W, H);
      this.canvas.width = W;
      this.canvas.height = H;
      this.canvas.style.width = `${(W * step) / dpr}px`;
      this.canvas.style.height = `${(H * step) / dpr}px`;
    }
    const p = this.pix;
    const gy = H - Math.max(5, Math.round(H * 0.15));

    // ----- where the tree stands: in the middle of the space the cards and the lamp post leave -----
    const k = dpr / step; // art pixels per CSS pixel
    const fa = this.opts.tight ? null : this.free;
    const freeL = fa ? clamp(fa.left * k, 0, W * 0.4) : 0;
    const freeR = fa ? clamp(fa.right * k, W * 0.6, W) : W;
    const freeT = fa ? clamp(fa.top * k, 0, gy * 0.5) : 0;
    const wantCx = (freeL + freeR) / 2;
    if (this.cxNow < 0) this.cxNow = wantCx;
    this.cxNow += (wantCx - this.cxNow) * Math.min(1, dt * 1.4);
    if (Math.abs(wantCx - this.cxNow) < 0.3) this.cxNow = wantCx;
    const cx = Math.round(this.cxNow);

    // ----- camera: zoom out as the tree gets taller -----
    // previews leave room around the tree to show its native land
    // the main view frames the tree by its real crown, so tall birches and wide sakuras fit
    let wantView: number;
    if (this.opts.tight) wantView = clamp(tree.S * 1.5 + 22, 46, 400);
    else {
      const { top, half } = crownOf(tree);
      // the crown's top sits about a tenth below the top edge, and below any card up there
      // and it never spills past the sides of the free space (a few pixels spare for the wind)
      wantView = clamp(fitView(top, half, H, gy, freeL, freeR, freeT, fa ? 6 : -1), 40, 4000);
    }
    if (!this.viewH) this.viewH = wantView;
    this.viewH += (wantView - this.viewH) * Math.min(1, dt * 1.4);
    const z = H / this.viewH;
    this.treeH = tree.S * z;

    // ----- time of day -----
    const hour = this.hour();
    const period = periodForHour(hour);
    if (period !== this.period) {
      this.period = period;
      this.onPeriod?.(period);
    }
    const sky = SKY[period];
    const dry = this.dryLevel();
    const pal = this.palette(sp, period, dry);

    const bgKey = `${W}x${H}:${period}:${sp.id}`; // each tree stands in its own native land
    if (bgKey !== this.bgKey) {
      this.bgKey = bgKey;
      const b = buildBackdrop(W, H, gy, sky.stops, GRADE[period], HILL_LIGHT[period], sp);
      this.bg = b.px;
      this.skyTop = b.skyTop;
      const [cl, cm, cd] = sky.cloud.map(hex);
      this.clouds = [0, 1, 2, 3, 4].map((i) => {
        const cw = Math.round(H * (0.14 + h2(i, 34) * 0.16));
        return makeCloud(cw, Math.max(5, Math.round(cw * 0.36)), i * 17 + 3, cl, cm, cd);
      });
    }
    p.d.set(this.bg);

    // the sun or moon on its arc decides where the light comes from
    const isNight = period === 'night';
    const f = isNight ? ((hour + 24 - 19.5) % 24) / 9.5 : (hour - 5) / 14.5;
    const bx = Math.round(W * (0.12 + 0.76 * f));
    const by = Math.round(gy * 0.92 - Math.sin(clamp(f, 0, 1) * Math.PI) * gy * 0.75);
    const lxq = Math.round(clamp((bx - cx) / (W * 0.42), -1, 1) * 2) / 2;
    const L = norm3(lxq * 0.85, -0.72, 0.55);
    const lxs = lxq < -0.3 ? -1 : lxq > 0.3 ? 1 : 0;
    this.drawSky(period, t, bx, by, gy);

    // ----- wind: a steady breeze with gusts that sweep across from the left -----
    const windOn = this.reduced ? 0 : 1;
    const shake = t < this.shakeUntil ? (this.shakeUntil - t) / 1.4 : 0;
    const gust = (x: number) => {
      if (!windOn) return 0;
      const n = noise1((t - x / 70) * 0.23, 7);
      const k = Math.max(0, (n - 0.3) / 0.7);
      return Math.max(0.15 + 0.85 * k * Math.sqrt(k), shake);
    };

    // ----- where every branch is this frame -----
    const n = tree.nodes.length;
    const x0 = new Float32Array(n), y0 = new Float32Array(n), x1 = new Float32Array(n), y1 = new Float32Array(n), ang = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const nd = tree.nodes[i], pi = nd.parent;
      const gs = gust(pi >= 0 ? cx + x1[pi] * z : cx);
      const sway = windOn * (Math.sin(t * (1.1 + nd.flex * 0.12) + nd.phase) * 0.009 * (nd.flex + 0.4) * (0.6 + gs) + gs * 0.008 * nd.flex);
      ang[i] = (pi >= 0 ? ang[pi] : 0) + nd.off + sway;
      x0[i] = pi >= 0 ? x0[pi] + (x1[pi] - x0[pi]) * nd.at : 0;
      y0[i] = pi >= 0 ? y0[pi] + (y1[pi] - y0[pi]) * nd.at : 0;
      x1[i] = x0[i] + Math.cos(ang[i]) * nd.len;
      y1[i] = y0[i] + Math.sin(ang[i]) * nd.len;
    }
    const pine = sp.foliage === 'pine', willow = sp.foliage === 'willow', hang = sp.hang;
    const clumps: ClumpAt[] = [];
    for (let i = 0; i < n; i++) {
      const nd = tree.nodes[i];
      if (!nd.leaf || tree.sprout) continue;
      // a neglected tree loses its clumps one by one, each shrinking before it goes
      const keep = bare > 0 ? clamp((h2(nd.ls, 91) - bare * 1.1 + 0.1) / 0.1, 0, 1) : 1;
      if (keep <= 0) continue;
      const R = Math.max(1, Math.round(nd.leaf * z * (willow ? 0.7 : 1) * (0.35 + 0.65 * keep)));
      clumps.push({
        x: Math.round(cx + x1[i] * z), y: Math.round(gy + y1[i] * z - R * 0.2), r: R, ls: nd.ls,
        back: pine ? nd.ls % 4 === 0 : nd.ls % 2 === 0, squash: nd.squash,
      });
    }
    this.clumps = clumps;

    // ----- underground and on the ground -----
    if (g > 0.05) this.drawRoots(tree, pal, cx, gy, z, clamp(0.4 + g * 4, 0.4, 1), L);
    if (clumps.length) {
      let a = 1e9, b = -1e9;
      for (const c of clumps) {
        a = Math.min(a, c.x - c.r);
        b = Math.max(b, c.x + c.r);
      }
      const mid = (a + b) / 2, half = (b - a) / 2 + 2;
      for (let y = gy - 3; y <= gy; y++)
        for (let x = Math.floor(mid - half); x <= Math.ceil(mid + half); x++) {
          const u = (x - mid) / half;
          p.blend(x, y, pal.shadow, (1 - u * u) * 0.3);
        }
    }

    const animals = this.opts.animals;
    if (animals) this.moveAnimals(stage, W, period, dt);
    const drawWalker = (a: Walker) => {
      const fr = a.walking ? Math.floor(t * 6) % 2 : a.kind === 'deer' && Math.sin(t * 0.5 + a.x) > 0 ? 2 : 0;
      const s = this.graded(a.sprite.frames[fr], period);
      blit(p, s, Math.round(cx + a.x - s.w / 2), gy - s.h + 2, a.dir === -1);
    };
    for (const a of this.walkers) if (a.kind !== 'squirrel') drawWalker(a);

    // ----- the tree -----
    const leafLen = pine ? clamp(1.2 + z, 2, 4.5) : clamp(1.4 + z * 1.25, 2.4, 6.5);
    const leafWid = pine ? 0.6 : sp.foliage === 'blossom' ? leafLen * 0.7 : leafLen * 0.5;
    const style: ClumpStyle = pine ? 'pine' : sp.foliage === 'blossom' ? 'blossom' : 'round';
    const keyBase = `${sp.id}|${period}|${lxq}|${dry}`;
    const wood = this.woodRamp(sp, period, pal, g);
    const rf = clamp(0.4 + g * 4, 0.4, 1) * z; // seedlings get thinner stems
    const limbs = (pass: 0 | 1) => {
      const r0 = (tree.nodes[0]?.r0 ?? 0) * rf;
      if (r0 > 2) {
        // the trunk flares out where it meets the ground
        for (const s of [-1, 1])
          limb(p, cx + s * r0 * 1.7, gy + 1, cx, gy - r0 * 1.3, r0 * 0.45, r0 * 0.75, wood, pal.barkOut, L, 5 + s, 0, false, pass, -1e9, 1e9, g > 0.3 ? pal.streaks : undefined);
      }
      for (let i = 0; i < n; i++) {
        const nd = tree.nodes[i];
        if (nd.len < 0.01) continue;
        limb(
          p, cx + x0[i] * z, gy + y0[i] * z, cx + x1[i] * z, gy + y1[i] * z, nd.r0 * rf, nd.r1 * rf,
          wood, pal.barkOut, L, nd.ls & 1023, i * 13.7, !!sp.birch && g > 0.3, pass, -1e9, 1e9, g > 0.3 ? pal.streaks : undefined,
        );
      }
    };

    if (this.state.points <= 0 && g < 0.002) {
      this.drawSeed(cx, gy, z, L, period);
    } else if (tree.sprout) {
      limbs(1);
      this.drawSprout(cx + x1[0] * z, gy + y1[0] * z, cx + x0[0] * z, gy + y0[0] * z, tree, g, z, pal, lxs, ft, gust, bare);
    } else {
      for (const c of clumps) if (c.back) this.drawClump(c, true, pal, keyBase, style, L, lxs, leafLen, leafWid, ft, gust);
      if (willow) for (const c of clumps) if (c.back) this.drawStrands(c, pal.leavesBack, L, lxs, leafLen, ft, gust, gy, cx);
      if (hang) for (const c of clumps) if (c.back && stage >= 2) this.drawStrands(c, pal.hang, L, lxs, leafLen, ft, gust, gy, cx, hang.len);
      limbs(0);
      limbs(1);
      if (animals && stage >= 6) {
        const m = this.sprites.monkey;
        const spots: number[] = [];
        for (let i = 0; i < n; i++) if (tree.nodes[i].depth >= 1 && tree.nodes[i].depth <= 2 && tree.nodes[i].len * z > 14) spots.push(i);
        for (let k = 0; k < Math.min(3, spots.length); k++) {
          const i = spots[(k * 3 + (this.seed % 5)) % spots.length];
          const s = this.graded(m.frames[Math.sin(t * 0.9 + k * 2) > 0.6 ? 1 : 0], period);
          const mx = cx + ((x0[i] + x1[i]) / 2) * z, my = gy + ((y0[i] + y1[i]) / 2) * z - tree.nodes[i].r0 * z;
          blit(p, s, Math.round(mx - s.w / 2), Math.round(my - s.h + 3), k % 2 === 1);
        }
      }
      for (const c of clumps) {
        if (c.back) continue;
        this.drawClump(c, false, pal, keyBase, style, L, lxs, leafLen, leafWid, ft, gust);
        if (pal.fruit && stage >= 4 && c.ls % 3 === 0 && c.r >= 3) {
          const fx = c.x + Math.round((h2(c.ls, 1) - 0.5) * c.r);
          const fy = c.y + Math.round(c.r * c.squash * (0.1 + h2(c.ls, 2) * 0.4) + Math.sin(ft * 1.6 + c.ls) * 0.5 * gust(c.x));
          this.drawFruit(fx, fy, pal.fruit, c.r >= 8);
        }
      }
      if (willow) for (const c of clumps) if (!c.back) this.drawStrands(c, pal.leaves, L, lxs, leafLen, ft, gust, gy, cx);
      if (hang) for (const c of clumps) if (!c.back && stage >= 2) this.drawStrands(c, pal.hang, L, lxs, leafLen, ft, gust, gy, cx, hang.len);
      if (pal.bloom && stage >= 3) for (const c of clumps) if (!c.back && c.r >= 3 && c.ls % 3 !== 0) this.drawBlooms(c, pal.bloom, gust, ft);
      // birds resting on top of the leaves
      if (animals && stage >= 3) {
        const front = clumps.filter((c) => !c.back);
        for (let k = 0; k < Math.min(3, stage - 2) && front.length; k++) {
          const c = front[(k * 37 + (this.seed % 97)) % front.length];
          const s = this.graded(this.sprites.birds[k % 3].frames[2], period);
          blit(p, s, Math.round(c.x - s.w / 2), Math.round(c.y - c.r * c.squash - s.h + 4), Math.sin(t * 0.3 + k * 1.7) > 0);
        }
      }
    }

    for (const a of this.walkers) if (a.kind === 'squirrel') drawWalker(a);
    this.drawGrass(W, gy, cx, t, windOn, gust, pal);

    // birds crossing the sky
    for (const b of this.flyers) {
      b.x += b.dir * b.speed * dt;
      if (b.x > W + 24 || b.x < -24) {
        b.dir = Math.random() < 0.5 ? 1 : -1;
        b.x = b.dir === 1 ? -16 - rand(0, 90) : W + 16 + rand(0, 90);
        b.y = rand(0.08, 0.55);
      }
      const s = this.graded(b.sprite.frames[Math.floor(t * 7 + b.phase) % 2], period);
      blit(p, s, Math.round(b.x), Math.round(gy * b.y + Math.sin(t * 2 + b.phase) * 2), b.dir === -1);
    }

    // butterflies
    if (animals && stage >= 1 && (period === 'day' || period === 'dawn') && !this.reduced) {
      for (let i = 0; i < 3; i++) {
        const fx = Math.round(cx + Math.sin(t * 0.35 + i * 2.1) * (this.treeH * 0.5 + 18) + Math.sin(t * 1.3 + i) * 4);
        const fy = Math.round(gy - 6 - (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.3)) * Math.min(40, this.treeH * 0.4 + 8) + Math.sin(t * 3 + i) * 2);
        const col = pal.flowers[(i + 1) % 4], dark = scalec(col, 0.55);
        p.put(fx, fy, dark);
        if (Math.floor(t * 9 + i) % 2) {
          p.put(fx - 1, fy - 1, col);
          p.put(fx + 1, fy - 1, col);
          p.put(fx - 1, fy, col);
          p.put(fx + 1, fy, col);
        } else {
          p.put(fx - 1, fy, col);
          p.put(fx + 1, fy, col);
        }
      }
    }

    // ----- things drifting down -----
    if (!this.reduced && (stage >= 2 || (sp.fallKind === 'petal' && stage >= 1)) && clumps.length && t > this.nextLeaf) {
      this.dropLeaf();
      const gs = gust(cx);
      const shedding = bare > 0 && bare < 1 ? 1 + bare * 5 : 1; // a tree that's losing its leaves drops more
      this.nextLeaf = t + rand(1.2, 4) / ((stage >= 5 ? 2 : 1) * sp.fallRate * (0.6 + gs * 1.6) * shedding);
    }
    for (const q of this.particles) {
      q.life += dt;
      if (q.kind === 'spark') {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        continue;
      }
      if (q.y < 0) {
        const gs = gust(cx + q.x);
        const flutter = q.kind === 'petal' ? 9 : 5;
        q.x += (q.vx + gs * 14 + Math.sin(t * 3 + q.phase) * flutter) * dt;
        q.y += (q.vy * (q.kind === 'petal' ? 0.7 : 1) + Math.cos(t * 2.3 + q.phase) * 2) * dt;
        if (q.y >= 0) {
          q.y = 0;
          q.max = q.life + 3;
        }
      }
      const fade = clamp((q.max - q.life) / 1.2, 0, 1);
      const qx = Math.round(cx + q.x), qy = Math.round(gy + q.y);
      if (q.kind === 'petal') {
        if (fade < 1 && bayer(qx, qy) >= fade) continue;
        const wide = q.y >= 0 || Math.sin(q.life * 7 + q.phase) > -0.2;
        p.put(qx, qy, q.ramp[1]);
        if (wide) p.put(qx + 1, qy, q.ramp[2]);
      } else {
        const a32 = q.y >= 0 ? 0 : Math.round(((q.phase + q.life * q.spin) / TAU) * 32);
        stamp(p, leafMask(Math.max(2, leafLen * 0.8), Math.max(1, leafLen * 0.4), a32, lxs), qx, qy, q.ramp, 1, 0, fade);
      }
    }
    this.particles = this.particles.filter((q) => q.life < q.max && q.x > -W && q.x < W);

    // ----- lights on top (not tinted by the time of day) -----
    if ((period === 'night' || period === 'dusk') && !this.reduced) {
      const fly = hex('#e8ff8a');
      for (let i = 0; i < (period === 'night' ? 12 : 5); i++) {
        const fx = Math.round(cx + Math.sin(t * 0.2 + i * 1.9) * (W * 0.32) + Math.sin(t * 0.7 + i) * 6);
        const fy = Math.round(gy - 4 - (0.5 + 0.5 * Math.sin(t * 0.3 + i * 2.3)) * Math.min(gy * 0.5, 50));
        const a = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3);
        this.glow(fx, fy, fly, a);
      }
    }
    for (const q of this.particles) {
      if (q.kind !== 'spark') continue;
      const a = clamp((q.max - q.life) / 0.5, 0, 1) * (0.6 + 0.4 * Math.sin(t * 20 + q.phase));
      const sx = Math.round(cx + q.x), sy = Math.round(gy + q.y);
      p.add(sx, sy, q.ramp[0], a);
      if (q.phase > 4) {
        p.add(sx - 1, sy, q.ramp[0], a * 0.6);
        p.add(sx + 1, sy, q.ramp[0], a * 0.6);
        p.add(sx, sy - 1, q.ramp[0], a * 0.6);
        p.add(sx, sy + 1, q.ramp[0], a * 0.6);
      }
    }

    this.ctx.putImageData(p.img, 0, 0);
  }

  // ---------- sky ----------

  private drawSky(period: Period, t: number, bx: number, by: number, gy: number) {
    const p = this.pix, W = p.w, H = p.h, mask = this.skyTop;
    if (period === 'night' || period === 'dusk') {
      const star = hex('#fffbe0');
      for (let i = 0; i < 110; i++) {
        const sx = Math.floor(h2(i, 1) * W), sy = Math.floor(h2(i, 2) * gy * 0.85);
        if (sy >= mask[sx]) continue;
        const a = (period === 'night' ? 1 : 0.4) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + i)));
        p.blend(sx, sy, star, a);
        if (i % 11 === 0) {
          p.blend(sx - 1, sy, star, a * 0.45);
          p.blend(sx + 1, sy, star, a * 0.45);
          p.blend(sx, sy - 1, star, a * 0.45);
          p.blend(sx, sy + 1, star, a * 0.45);
        }
      }
    }
    const br = Math.max(3, Math.round(H * 0.035));
    const isNight = period === 'night';
    const glowCol = hex(isNight ? '#8a96d0' : period === 'day' ? '#fff4b0' : '#ffb070');
    const gr = br * (isNight ? 2.6 : 3.4);
    for (let dy = -Math.ceil(gr); dy <= Math.ceil(gr); dy++)
      for (let dx = -Math.ceil(gr); dx <= Math.ceil(gr); dx++) {
        const x = bx + dx, y = by + dy;
        if (x < 0 || x >= W || y < 0 || y >= mask[x]) continue;
        const d = Math.hypot(dx, dy);
        if (d > gr) continue;
        if (d <= br) {
          if (isNight) {
            const sx = dx - br * 0.45, sy = dy + br * 0.25;
            if (sx * sx + sy * sy < br * br * 0.72) continue; // the crescent's shadow
            p.put(x, y, h2(dx + 50, dy + 50) < 0.1 ? hex('#c8c2a8') : d > br - 1 ? hex('#fff8dc') : hex('#f0ead0'));
          } else {
            p.put(x, y, d > br - 1 ? hex(period === 'day' ? '#fff0a0' : '#ffc070') : hex(period === 'day' ? '#fffbe0' : '#ffe0a0'));
          }
          continue;
        }
        const ring = Math.floor((1 - d / gr) * (1 - d / gr) * 3 + bayer(x, y));
        if (ring > 0) p.add(x, y, glowCol, ring * (isNight ? 0.05 : 0.09));
      }
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const speed = 1.5 + h2(i, 31) * 3;
      const span = W + c.w * 2;
      const x = ((h2(i, 32) * span + t * speed) % span) - c.w;
      blit(p, c, Math.round(x), Math.round(gy * (0.05 + h2(i, 33) * 0.38)), false, isNight ? 0.7 : 0.95, mask);
    }
  }

  // ---------- the tree's parts ----------

  private drawRoots(tree: Tree, pal: Pal, cx: number, gy: number, z: number, thin: number, L: Light) {
    const S = tree.S, r0 = (tree.nodes[0]?.r0 ?? 1) * thin;
    const rng = mulberry32(this.seed ^ 0x5bd1e995);
    const roots: number[][] = [];
    const main = 3 + Math.floor(rng() * 2);
    for (let k = 0; k < main; k++) {
      const a = Math.PI / 2 + (k / (main - 1) - 0.5) * 2.3 + (rng() - 0.5) * 0.3;
      const len = S * 0.2 * (0.7 + rng() * 0.6);
      const ax = (rng() - 0.5) * r0, bx = ax + Math.cos(a) * len, by = Math.sin(a) * len;
      roots.push([ax, -r0 * 0.3, bx, by, r0 * 0.6, r0 * 0.12]);
      for (let j = 0; j < 2; j++) {
        const tt = 0.4 + j * 0.3, sx = ax + (bx - ax) * tt, sy = by * tt;
        const a2 = a + (j ? 1 : -1) * (0.5 + rng() * 0.5), l2 = len * 0.45;
        roots.push([sx, sy, sx + Math.cos(a2) * l2, sy + Math.sin(a2) * l2, r0 * 0.25, 0.3]);
      }
    }
    const p = this.pix;
    for (const pass of [0, 1] as const)
      for (const [ax, ay, bx, by, ra, rb] of roots)
        limb(p, cx + ax * z, gy + ay * z, cx + bx * z, gy + by * z, ra * z, rb * z, pal.root, pal.barkOut, L, 77, ax * 9, false, pass, gy + 2, p.h);
  }

  private drawClump(
    c: ClumpAt, back: boolean, pal: Pal, keyBase: string, style: ClumpStyle, L: Light, lxs: number,
    leafLen: number, leafWid: number, t: number, gust: (x: number) => number,
  ) {
    const p = this.pix;
    const ramp = back ? pal.leavesBack : pal.leaves;
    const variant = c.ls % 6;
    const spr = clumpSprite(`${keyBase}|${back ? 'b' : 'f'}|${style}`, c.r, variant, c.squash, style, ramp, pal.flower, L);
    blit(p, spr, c.x - spr.ox, c.y - spr.oy);

    // loose leaves round the edge flutter and flip over in the wind
    const list = edgeLeaves(variant);
    const K = Math.min(EDGE_MAX, Math.max(3, Math.round(c.r * (back ? 1 : 1.8))));
    const gs = gust(c.x);
    const amp = 0.25 + gs * 0.95;
    const n = ramp.length;
    for (let k = 0; k < K; k++) {
      const e = list[k];
      const fl = Math.sin(t * e.fr + e.ph);
      const ex = c.x + Math.round(Math.cos(e.a) * e.rr * c.r + fl * amp + gs * 0.7);
      const ey = c.y + Math.round(Math.sin(e.a) * e.rr * c.r * c.squash + Math.cos(t * e.fr * 0.8 + e.ph) * amp * 0.45);
      const diff = Math.cos(e.a) * L.x + Math.sin(e.a) * L.y + 0.5 * L.z;
      let idx = 1 + Math.round(clamp(0.12 + 0.88 * Math.max(0, diff) + e.j, 0, 1) * (n - 2));
      if (fl > 0.93 - gs * 0.22) idx = n - 1;
      const a32 = Math.round(((e.a + fl * 0.4 * amp) / TAU) * 32);
      stamp(p, leafMask(leafLen * e.s, leafWid * e.s, a32, lxs), ex, ey, ramp, idx);
    }
    // glints: leaves turning over across the surface
    for (let k = 0; k < c.r >> 1; k++) {
      const e = list[(k * 7 + 3) % EDGE_MAX];
      if (Math.sin(t * e.fr * 1.3 + e.ph * 2.1) < 0.95 - gs * 0.15) continue;
      const gx = c.x + Math.round(Math.cos(e.a + 1.3) * e.rr * 0.55 * c.r);
      const gy = c.y + Math.round(Math.sin(e.a + 1.3) * e.rr * 0.55 * c.r * c.squash);
      p.put(gx, gy, ramp[n - 1]);
      if (leafLen > 3) p.put(gx + 1, gy, ramp[n - 2]);
    }
  }

  /** Willow: strands of leaves hanging from each tip, swinging like pendulums. */
  private drawStrands(
    c: ClumpAt, ramp: number[], L: Light, lxs: number, leafLen: number, t: number, gust: (x: number) => number, gy: number, cx: number,
    lenK = 1,
  ) {
    const p = this.pix, n = ramp.length;
    const cnt = Math.min(6, 2 + (c.r >> 1));
    for (let k = 0; k < cnt; k++) {
      const hh = h2(c.ls, k), hv = h2(c.ls, k + 50), hl = h2(c.ls, k + 99);
      const sx = c.x + (hh - 0.5) * c.r * 1.6, sy = c.y + (hv - 0.3) * c.r * 0.6;
      const len = Math.min(c.r * (2.4 + hl * 2.6) * lenK, gy - 3 - sy);
      if (len < 2) continue;
      const ph = hh * TAU;
      const gs = gust(sx);
      const swing = gs * 3.4 + Math.sin(t * 1.3 + ph) * (0.5 + gs);
      const side = clamp((sx - cx) / 40, -1, 1);
      const step = Math.max(1.1, leafLen * 0.5);
      for (let s = 0; s <= len; s += step) {
        const f = s / len;
        const x = Math.round(sx + swing * Math.pow(f, 1.6) + Math.sin(s * 0.45 + ph + t * 2) * 0.35 * f);
        const y = Math.round(sy + s);
        const v = 0.72 - f * 0.35 + side * L.x * 0.3 + (h2(k * 31 + c.ls, Math.round(s)) - 0.5) * 0.24;
        let idx = 1 + Math.round(clamp(v, 0, 1) * (n - 2));
        const fl = Math.sin(t * 3.1 + s * 0.9 + ph);
        if (fl > 0.94 - gs * 0.2) idx = n - 1;
        const a32 = 8 + Math.round(swing * 0.25 * f + fl * 1.2); // 8/32 of a turn = pointing down
        stamp(p, leafMask(leafLen, leafLen * 0.42, a32, lxs), x, y, ramp, idx);
      }
    }
  }

  /** Big flowers sitting on the top of a clump: a few petals round a pale heart. */
  private drawBlooms(c: ClumpAt, col: number, gust: (x: number) => number, t: number) {
    const p = this.pix, shade = scalec(col, 0.78), heart = mixc(col, hex('#f4d860'), 0.55);
    const cnt = Math.min(3, 1 + (c.r >> 3));
    const big = c.r >= 7;
    for (let k = 0; k < cnt; k++) {
      const a = -Math.PI * (0.15 + 0.7 * h2(c.ls, k + 200)); // on the upper half, where they catch the light
      const rr = c.r * (0.35 + 0.45 * h2(c.ls, k + 230));
      const bx = Math.round(c.x + Math.cos(a) * rr + Math.sin(t * 1.3 + k + c.ls) * 0.4 * gust(c.x));
      const by = Math.round(c.y + Math.sin(a) * rr * c.squash);
      if (big) {
        for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1]]) p.put(bx + dx, by + dy, dy > 0 ? shade : col);
        p.put(bx, by, heart);
      } else {
        p.put(bx, by - 1, col);
        p.put(bx - 1, by, col);
        p.put(bx + 1, by, shade);
        p.put(bx, by, heart);
      }
    }
  }

  /** A seedling: a green stem and its first few leaves. */
  private drawSprout(
    tx: number, ty: number, bx: number, by: number, tree: Tree, g: number, z: number, pal: Pal, lxs: number, t: number,
    gust: (x: number) => number, bare: number,
  ) {
    const p = this.pix;
    const nd = tree.nodes[0];
    const full = 2 + Math.floor(clamp(g / 0.1, 0, 0.99) * 3);
    const count = Math.max(1, full - Math.round(bare * full)); // one dry leaf hangs on
    const len = clamp(nd.leaf * z * 1.5, 3, 16);
    const gs = gust(tx);
    const ramp = pal.sproutLeaves;
    for (let k = 0; k < count; k++) {
      const pair = k >> 1, side = k % 2 ? 1 : -1;
      const top = k === 4 || (count === 3 && k === 2);
      // the first pair sits lower on the stem; newer leaves come out at the top
      const at = pair === 0 && count > 2 ? 0.7 : 1;
      const ax = bx + (tx - bx) * at, ay = by + (ty - by) * at;
      let a = top ? -Math.PI / 2 : -Math.PI / 2 + side * (1.05 - pair * 0.3);
      a += Math.sin(t * 2.2 + k * 1.7) * 0.12 * (0.5 + gs) + gs * 0.15;
      const l = top ? len * 0.7 : len * (1 - pair * 0.15);
      const m = leafMask(l, l * 0.5, Math.round((a / TAU) * 32), lxs);
      const lx = Math.round(ax + Math.cos(a) * l * 0.45), ly = Math.round(ay + Math.sin(a) * l * 0.45);
      for (let i = 0; i < m.length; i += 3)
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.put(lx + m[i] + ox, ly + m[i + 1] + oy, ramp[0]);
      stamp(p, m, lx, ly, ramp, 5, 2);
    }
  }

  private drawSeed(cx: number, gy: number, z: number, L: Light, period: Period) {
    const p = this.pix, G = GRADE[period];
    const mound = gradeAll(['#3f2a1c', '#5a3b28', '#74503a'], G);
    const rx = 2.8 * z, ry = 1 * z;
    for (let dy = -Math.ceil(ry); dy <= 0; dy++)
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        const ux = dx / rx, uy = dy / ry;
        if (ux * ux + uy * uy > 1) continue;
        const v = -ux * L.x * 0.6 - uy * 0.6 + (bayer(cx + dx, gy + dy) - 0.5) * 0.5;
        p.put(cx + dx, gy + dy, mound[v > 0.45 ? 2 : v > -0.1 ? 1 : 0]);
      }
    const seed = gradeAll(['#2a140a', '#6a3a1e', '#9a5a2e', '#c4804a', '#e8a868'], G);
    const sx = cx, sy = gy - 0.9 * z, srx = 1.2 * z, sry = 0.8 * z;
    for (let dy = -Math.ceil(sry) - 1; dy <= Math.ceil(sry) + 1; dy++)
      for (let dx = -Math.ceil(srx) - 1; dx <= Math.ceil(srx) + 1; dx++) {
        const ux = dx / srx, uy = dy / sry, d2 = ux * ux + uy * uy;
        const x = Math.round(sx + dx), y = Math.round(sy + dy);
        if (d2 > 1) {
          if (d2 < 1 + 2.2 / Math.min(srx, sry)) p.put(x, y, seed[0]);
          continue;
        }
        const v = 0.15 + 0.85 * Math.max(0, ux * L.x + uy * L.y + Math.sqrt(1 - d2) * L.z);
        p.put(x, y, seed[1 + Math.min(3, Math.round(v * 3 + (bayer(x, y) - 0.5) * 0.5))]);
      }
  }

  private drawFruit(x: number, y: number, col: number, big: boolean) {
    const p = this.pix, dark = scalec(col, 0.6), lite = scalec(col, 1.4), stem = hex('#4a2e1a');
    const rows = big ? ['.ss.', 'cccc', 'clcc', 'cccd', '.dd.'] : ['.s.', 'ccc', 'lcc', '.d.'];
    rows.forEach((r, j) =>
      [...r].forEach((ch, i) => {
        const c = ch === 'c' ? col : ch === 'd' ? dark : ch === 'l' ? lite : ch === 's' ? stem : 0;
        if (c) p.put(x + i - (r.length >> 1), y + j - 1, c);
      }),
    );
  }

  private drawGrass(W: number, gy: number, cx: number, t: number, windOn: number, gust: (x: number) => number, pal: Pal) {
    const p = this.pix, gr = pal.grass, top = gr.length - 1;
    for (let x = 0; x < W; x++) {
      const wx = x - cx;
      const r = h2(wx, 77);
      if (r > 0.62) continue;
      const hgt = 2 + Math.floor(h2(wx, 5) * 4) + (r < 0.07 ? 3 : 0);
      const sway = gust(x) * 1.8 + Math.sin(t * 1.7 + wx * 0.31) * 0.6 * windOn;
      const shade = h2(wx, 6) < 0.5 ? 0 : 1;
      let tipX = x;
      for (let k = 0; k < hgt; k++) {
        const f = (k + 1) / hgt;
        tipX = Math.round(x + sway * f * f);
        p.put(tipX, gy - k, gr[Math.min(top, Math.floor(f * (top - 1)) + shade + (k === hgt - 1 ? 1 : 0))]);
      }
      if (r < 0.02) {
        const col = pal.flowers[Math.floor(h2(wx, 9) * 4)];
        p.put(tipX, gy - hgt, col);
        p.put(tipX + 1, gy - hgt, scalec(col, 0.8));
        p.put(tipX, gy - hgt - 1, scalec(col, 1.1));
      }
    }
  }

  private glow(x: number, y: number, col: number, a: number) {
    const p = this.pix;
    p.add(x, y, col, a);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.add(x + dx, y + dy, col, a * 0.35);
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) p.add(x + dx, y + dy, col, a * 0.12);
  }

  // ---------- animals ----------

  private moveAnimals(stage: number, W: number, period: Period, dt: number) {
    const sp = this.sprites;
    const want: [Walker['kind'], Sprite, number][] = [];
    if (stage >= 3) want.push(['squirrel', sp.squirrel, 16]);
    if (stage >= 4) want.push(['raccoon', sp.raccoon, 8]);
    if (stage >= 5) want.push(['deer', sp.deer, 7]);
    if (stage >= 6) want.push(['deer', sp.deer, 6], ['squirrel', sp.squirrel, 18]);
    while (this.walkers.length < want.length) {
      const [kind, sprite, speed] = want[this.walkers.length];
      const dir = Math.random() < 0.5 ? 1 : -1;
      // they wander in from the edge of the screen
      const cx = this.cxNow < 0 ? W / 2 : this.cxNow;
      this.walkers.push({ kind, sprite, speed, dir: dir as 1 | -1, x: dir === 1 ? -(cx + 20) : W - cx + 20, walking: true, timer: rand(5, 9) });
    }
    if (this.walkers.length > want.length) this.walkers.length = want.length;
    for (const a of this.walkers) {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.walking = !a.walking;
        a.timer = rand(2, 6);
        if (a.walking && Math.random() < 0.5) a.dir = a.dir === 1 ? -1 : 1;
      }
      if (a.walking) {
        a.x += a.dir * a.speed * dt;
        // walkers' x is measured from the trunk, which isn't always in the middle
        const cx = this.cxNow < 0 ? W / 2 : this.cxNow;
        if (a.x > W - cx - 10) a.dir = -1;
        if (a.x < 10 - cx) a.dir = 1;
      }
    }

    const birds = stage >= 2 && period !== 'night' ? Math.min(4, stage - 1) : 0;
    while (this.flyers.length < birds) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.flyers.push({
        sprite: sp.birds[this.flyers.length % 3], dir: dir as 1 | -1, x: dir === 1 ? -16 - rand(0, 60) : W + 16 + rand(0, 60),
        y: rand(0.08, 0.55), speed: rand(16, 28), phase: rand(0, TAU),
      });
    }
    if (this.flyers.length > birds) this.flyers.length = birds;
  }
}
