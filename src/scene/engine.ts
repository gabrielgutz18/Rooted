// The living scene: a procedural pixel tree that grows with points, swaying in the wind,
// with sky, hills, weather-of-the-hour and animals that move in as it gets bigger.
// Everything is drawn into a small buffer and scaled up, so "zooming out" is simply
// a bigger buffer: the tree keeps its chunky pixels while the world around it widens.

import { growthValue, STAGES } from '../lib/growth';
import { getSprites, type Sprite } from './sprites';

const MAXD = 6;
const TAU = Math.PI * 2;

export type Period = 'dawn' | 'day' | 'dusk' | 'night';
export function periodForHour(h: number): Period {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 19.5) return 'dusk';
  return 'night';
}

const SKY: Record<Period, { stops: [string, string, string]; cloud: string; tint: string | null }> = {
  dawn: { stops: ['#6a7fc0', '#f0a890', '#ffd8a0'], cloud: '#ffe6d6', tint: 'rgba(255,150,110,0.14)' },
  day: { stops: ['#5fa8e0', '#9cd2f0', '#d8f0f4'], cloud: '#ffffff', tint: null },
  dusk: { stops: ['#3a2f6a', '#c05a6a', '#f4a060'], cloud: '#f0b0a0', tint: 'rgba(120,40,80,0.26)' },
  night: { stops: ['#0a0e2a', '#161c48', '#28306a'], cloud: '#343e74', tint: 'rgba(10,16,60,0.52)' },
};

// ---------- small maths ----------

function mulberry32(seed: number) {
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

function h2(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise1(x: number, seed: number): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return h2(i, seed) * (1 - u) + h2(i + 1, seed) * u;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function mix(a: string, b: string, t: number): string {
  const p = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t)).join(',')})`;
}

// ---------- the tree ----------

interface Node {
  parent: number;
  off: number; // angle relative to parent
  len: number;
  r0: number;
  r1: number;
  depth: number;
  at: number; // where along the parent it attaches
  phase: number;
  leaf: number; // leaf cluster radius (0 = none)
  ls: number; // leaf seed
}

interface Tree {
  nodes: Node[];
  S: number; // rough height in world pixels
}

/** Same seed → same tree shape at every size, so it grows instead of reshuffling. */
function buildTree(seed: number, g: number): Tree {
  const rng = mulberry32(seed);
  const L = g * MAXD;
  const S = 5 + 150 * Math.pow(g, 1.15);
  const nodes: Node[] = [];
  const leafFrom = Math.max(1, Math.ceil(L) - 2);
  const leafBase = clamp(1.2 + S * 0.04, 1.6, 7);

  const rec = (parent: number, depth: number, len: number, r: number, abs: number, parentAbs: number, at: number) => {
    const jit = rng(), phase = rng() * TAU, kids = depth === 0 ? 3 : rng() < 0.4 ? 3 : 2, ls = (rng() * 1e9) | 0;
    const f = depth === 0 ? 1 : clamp(L - depth + 1, 0, 1);
    let idx = -2;
    if (parent !== -2 && f > 0.03) {
      const hasLeaf = depth >= leafFrom || (depth === 0 && g < 0.1);
      const rr = r * Math.max(f, 0.45);
      idx = nodes.length;
      nodes.push({
        parent, off: abs - parentAbs, len: len * f, r0: rr, r1: rr * 0.7, depth, at, phase, ls,
        leaf: hasLeaf ? Math.max(1.3, leafBase * (0.75 + jit * 0.5) * f) : 0,
      });
    }
    if (depth >= MAXD) return;
    for (let k = 0; k < kids; k++) {
      const a = rng(), b = rng(), c = rng();
      const middle = kids === 3 && k === 2;
      let cabs = abs + (middle ? (a - 0.5) * 0.4 : (k === 0 ? -1 : 1) * (0.5 + a * 0.6));
      cabs += (-Math.PI / 2 - cabs) * 0.1; // reach for the light
      rec(idx, depth + 1, len * (0.68 + c * 0.2), r * 0.68, cabs, abs, middle ? 1 : 0.45 + b * 0.55);
    }
  };
  rec(-1, 0, S * 0.24, Math.max(0.7, S * 0.055), -Math.PI / 2 + (rng() - 0.5) * 0.16, 0, 0);
  return { nodes, S };
}

// ---------- moving things ----------

interface Walker {
  sprite: Sprite;
  kind: 'squirrel' | 'raccoon' | 'deer';
  x: number;
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
  kind: 'leaf' | 'spark';
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; color: string; phase: number;
}

const LEAF_FRONT = ['#1f6a3c', '#3f9a44', '#8fd14f'];
const LEAF_BACK = ['#134a36', '#1f6a3c', '#3f9a44'];
const BARK = { mid: '#7a4a34', dark: '#4a2a2a', light: '#a86a44' };
const SPARKS = ['#fff6c8', '#ffd76a', '#aae654', '#ffffff'];

export interface SceneState {
  points: number;
  seed: string;
  hour?: number; // override the clock (for previews)
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private world = document.createElement('canvas');
  private wctx = this.world.getContext('2d')!;
  private bg = document.createElement('canvas');
  private bgKey = '';
  private raf = 0;
  private last = 0;
  private t = 0;
  private g = -1;
  private viewH = 0;
  private seedStr = '';
  private seed = 0;
  private cssW = 1;
  private cssH = 1;
  private walkers: Walker[] = [];
  private flyers: Flyer[] = [];
  private particles: Particle[] = [];
  private nextLeaf = 2;
  private reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private sprites = getSprites();
  state: SceneState;
  onPeriod?: (p: Period) => void;
  private period: Period | null = null;
  // last computed tip positions, for leaves / perches
  private tips: { x: number; y: number; r: number }[] = [];

  constructor(private canvas: HTMLCanvasElement, state: SceneState) {
    this.ctx = canvas.getContext('2d')!;
    this.state = state;
    this.raf = requestAnimationFrame(this.tick);
  }

  resize(w: number, h: number) {
    this.cssW = Math.max(1, w);
    this.cssH = Math.max(1, h);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  /** Sparkles rising around the tree after a note is saved. */
  burst(n = 30) {
    const S = 5 + 150 * Math.pow(Math.max(0, this.g), 1.15);
    for (let i = 0; i < (this.reduced ? 6 : n); i++)
      this.particles.push({
        kind: 'spark', x: rand(-S * 0.5 - 6, S * 0.5 + 6), y: -rand(0, S * 0.9 + 4),
        vx: rand(-4, 4), vy: rand(-22, -6), life: 0, max: rand(0.9, 2), color: SPARKS[(Math.random() * 4) | 0], phase: rand(0, TAU),
      });
  }

  /** Shake the branches: a flurry of leaves. */
  rustle() {
    if (this.reduced) return;
    for (let i = 0; i < 14 && this.tips.length; i++) this.dropLeaf();
  }

  private dropLeaf() {
    const tip = this.tips[(Math.random() * this.tips.length) | 0];
    this.particles.push({
      kind: 'leaf', x: tip.x + rand(-tip.r, tip.r), y: tip.y + rand(-tip.r, tip.r),
      vx: rand(-2, 5), vy: rand(7, 13), life: 0, max: 40, color: LEAF_FRONT[(Math.random() * 3) | 0], phase: rand(0, TAU),
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

  private frame(dt: number) {
    const t = this.t;
    const target = growthValue(this.state.points);
    if (this.seedStr !== this.state.seed || this.g < 0) {
      this.seedStr = this.state.seed;
      this.seed = hashStr(this.state.seed);
      this.g = target;
      this.viewH = 0;
      this.walkers = [];
      this.flyers = [];
      this.particles = [];
    }
    // grow smoothly toward the real size
    this.g += (target - this.g) * Math.min(1, dt * 0.8);
    if (Math.abs(target - this.g) < 0.0004) this.g = target;
    const g = this.g;
    const stage = Math.floor(g * (STAGES.length - 1) + 1e-6);
    const tree = buildTree(this.seed, g);

    // camera: zoom out as the tree gets taller
    const wantView = clamp(tree.S * 1.3 + 34, 46, 260);
    if (!this.viewH) this.viewH = wantView;
    this.viewH += (wantView - this.viewH) * Math.min(1, dt * 1.4);
    const H = Math.round(this.viewH);
    const W = Math.max(40, Math.round((H * this.cssW) / this.cssH));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = this.world.width = W;
      this.canvas.height = this.world.height = H;
    }
    const gy = H - Math.max(8, Math.round(H * 0.15));
    const cx = Math.round(W / 2);

    const hour = this.hour();
    const period = periodForHour(hour);
    if (period !== this.period) {
      this.period = period;
      this.onPeriod?.(period);
    }
    const sky = SKY[period];
    const c = this.ctx;

    // ----- sky -----
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      c.fillStyle = k < 0.5 ? mix(sky.stops[0], sky.stops[1], k * 2) : mix(sky.stops[1], sky.stops[2], (k - 0.5) * 2);
      c.fillRect(0, Math.floor((i * gy) / bands), W, Math.ceil(gy / bands) + 1);
    }
    if (period === 'night' || period === 'dusk') {
      for (let i = 0; i < 70; i++) {
        const sx = Math.floor(h2(i, 1) * W), sy = Math.floor(h2(i, 2) * gy * 0.8);
        const a = (period === 'night' ? 1 : 0.4) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + i)));
        c.globalAlpha = a;
        c.fillStyle = '#fffbe0';
        c.fillRect(sx, sy, 1, 1);
      }
      c.globalAlpha = 1;
    }
    // sun or moon on its arc
    const isNight = period === 'night';
    const f = isNight ? ((hour + 24 - 19.5) % 24) / 9.5 : (hour - 5) / 14.5;
    const bx = Math.round(W * (0.12 + 0.76 * f)), by = Math.round(gy * 0.92 - Math.sin(clamp(f, 0, 1) * Math.PI) * gy * 0.75);
    const br = Math.max(2, Math.round(H * 0.045));
    if (isNight) {
      disc(c, bx, by, br, '#f0ecd0');
      disc(c, bx + Math.ceil(br * 0.45), by - Math.ceil(br * 0.25), br * 0.8, sky.stops[0]); // crescent
    } else {
      c.globalAlpha = 0.25;
      disc(c, bx, by, br + 2, '#fff8c0');
      c.globalAlpha = 1;
      disc(c, bx, by, br, period === 'day' ? '#fff6b0' : '#ffd890');
    }
    // clouds
    for (let i = 0; i < 5; i++) {
      const sp = 1.2 + h2(i, 31) * 2;
      const span = W + 60;
      const x = ((h2(i, 32) * span + t * sp) % span) - 30;
      const y = Math.round(gy * (0.1 + h2(i, 33) * 0.4));
      const s = 2 + h2(i, 34) * 3;
      c.globalAlpha = period === 'night' ? 0.6 : 0.9;
      disc(c, x, y, s, sky.cloud);
      disc(c, x + s * 1.2, y - s * 0.4, s * 1.2, sky.cloud);
      disc(c, x + s * 2.6, y, s * 0.9, sky.cloud);
      c.fillStyle = sky.cloud;
      c.fillRect(Math.round(x - s), y, Math.round(s * 4.4), Math.ceil(s));
    }
    c.globalAlpha = 1;

    // ----- world layer (gets the time-of-day tint) -----
    const w = this.wctx;
    w.globalCompositeOperation = 'source-over';
    w.clearRect(0, 0, W, H);
    this.drawBackdrop(W, H, gy, cx);
    w.drawImage(this.bg, 0, 0);

    // grass tufts and flowers
    for (let sx = 0; sx < W; sx++) {
      const wx = sx - cx;
      const r = h2(wx, 77);
      if (r > 0.24) continue;
      const hgt = 1 + Math.floor(h2(wx, 5) * 3);
      const sway = this.reduced ? 0 : Math.round(Math.sin(t * 1.6 + wx * 0.35) * 0.6);
      w.fillStyle = r < 0.12 ? '#6cc24a' : '#3f8f3a';
      w.fillRect(sx, gy - hgt + 1, 1, hgt - 1);
      w.fillRect(sx + sway, gy - hgt, 1, 1);
      if (r < 0.03) {
        w.fillStyle = ['#ffe680', '#ff9ab0', '#ffffff'][Math.floor(h2(wx, 9) * 3)];
        w.fillRect(sx + sway, gy - hgt - 1, 1, 1);
      }
    }

    // animals that have moved in
    this.syncAnimals(stage, W, period);
    for (const a of this.walkers) {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.walking = !a.walking;
        a.timer = rand(2, 6);
        if (a.walking && Math.random() < 0.5) a.dir = a.dir === 1 ? -1 : 1;
      }
      if (a.walking) {
        a.x += a.dir * a.speed * dt;
        const lim = W / 2 - 6;
        if (a.x > lim) a.dir = -1;
        if (a.x < -lim) a.dir = 1;
      }
    }
    const drawWalker = (a: Walker) => {
      const fr = a.walking ? Math.floor(t * 6) % 2 : a.kind === 'deer' && Math.sin(t * 0.5 + a.x) > 0 ? 2 : 0;
      const img = (a.dir === 1 ? a.sprite.frames : a.sprite.flipped)[fr];
      w.drawImage(img, Math.round(cx + a.x - a.sprite.w / 2), gy - a.sprite.h + 1);
    };
    for (const a of this.walkers) if (a.kind !== 'squirrel') drawWalker(a);

    // ----- the tree -----
    const n = tree.nodes.length;
    const x0 = new Float32Array(n), y0 = new Float32Array(n), x1 = new Float32Array(n), y1 = new Float32Array(n), ang = new Float32Array(n);
    const wind = this.reduced ? 0 : 1;
    for (let i = 0; i < n; i++) {
      const nd = tree.nodes[i];
      const sway = Math.sin(t * 1.2 + nd.phase) * 0.011 * (nd.depth + 0.4) * wind + Math.sin(t * 0.45) * 0.006 * nd.depth * wind;
      const p = nd.parent;
      ang[i] = (p >= 0 ? ang[p] : 0) + nd.off + sway;
      x0[i] = p >= 0 ? x0[p] + (x1[p] - x0[p]) * nd.at : 0;
      y0[i] = p >= 0 ? y0[p] + (y1[p] - y0[p]) * nd.at : 0;
      x1[i] = x0[i] + Math.cos(ang[i]) * nd.len;
      y1[i] = y0[i] + Math.sin(ang[i]) * nd.len;
    }
    this.tips = [];
    for (let i = 0; i < n; i++) if (tree.nodes[i].leaf) this.tips.push({ x: x1[i], y: y1[i], r: tree.nodes[i].leaf });

    if (this.state.points <= 0 && g < 0.002) {
      // a seed resting in the soil
      w.fillStyle = '#3f2820';
      w.fillRect(cx - 3, gy, 6, 1);
      w.fillStyle = '#a4522a';
      w.fillRect(cx - 1, gy - 2, 3, 2);
      w.fillStyle = '#d6804c';
      w.fillRect(cx - 1, gy - 2, 1, 1);
      w.fillStyle = '#5a3a2a';
      w.fillRect(cx - 1, gy - 3, 3, 1);
    } else {
      const leaves = (back: boolean) => {
        const pal = back ? LEAF_BACK : LEAF_FRONT;
        for (let i = 0; i < n; i++) {
          const nd = tree.nodes[i];
          if (!nd.leaf || (nd.ls % 2 === 0) !== back) continue;
          const lx = cx + x1[i], ly = gy + y1[i], r = nd.leaf;
          w.fillStyle = pal[0];
          blob(w, lx, ly, r, nd.ls);
          w.fillStyle = pal[1];
          blob(w, lx - r * 0.15, ly - r * 0.25, r * 0.72, nd.ls + 1);
          if (r > 1.8) {
            w.fillStyle = pal[2];
            blob(w, lx - r * 0.3, ly - r * 0.45, r * 0.38, nd.ls + 2);
          }
        }
      };
      leaves(true);
      for (let pass = 0; pass < 3; pass++) {
        w.fillStyle = pass === 0 ? BARK.mid : pass === 1 ? BARK.dark : BARK.light;
        for (let i = 0; i < n; i++) {
          const nd = tree.nodes[i];
          const steps = Math.max(1, Math.ceil(nd.len));
          for (let s = 0; s <= steps; s++) {
            const k = s / steps;
            const r = nd.r0 + (nd.r1 - nd.r0) * k;
            const d = Math.max(1, Math.round(r * 2));
            if (pass > 0 && d < 3) continue;
            const px = Math.round(cx + x0[i] + (x1[i] - x0[i]) * k - r), py = Math.round(gy + y0[i] + (y1[i] - y0[i]) * k - r);
            if (pass === 0) w.fillRect(px, py, d, d);
            else if (pass === 1) w.fillRect(px + d - Math.max(1, Math.round(d * 0.3)), py, Math.max(1, Math.round(d * 0.3)), d);
            else w.fillRect(px, py, Math.max(1, Math.round(d * 0.22)), d);
          }
        }
      }
      // roots flaring at the base
      const r0 = tree.nodes[0]?.r0 ?? 0;
      if (r0 > 2) {
        w.fillStyle = BARK.mid;
        w.fillRect(Math.round(cx - r0 * 1.5), gy - 1, Math.round(r0 * 3), 2);
        w.fillRect(Math.round(cx - r0 * 1.25), gy - 3, Math.round(r0 * 2.5), 2);
        w.fillStyle = BARK.dark;
        w.fillRect(Math.round(cx + r0 * 0.8), gy - 3, Math.max(1, Math.round(r0 * 0.5)), 4);
      }
      // monkeys in the big branches
      if (stage >= 6) {
        const limbs: number[] = [];
        for (let i = 0; i < n; i++) if (tree.nodes[i].depth >= 1 && tree.nodes[i].depth <= 2 && tree.nodes[i].len > 12) limbs.push(i);
        const m = this.sprites.monkey;
        for (let k = 0; k < Math.min(3, limbs.length); k++) {
          const i = limbs[(k * 3 + (this.seed % 5)) % limbs.length];
          const mx = cx + (x0[i] + x1[i]) / 2, my = gy + (y0[i] + y1[i]) / 2 - tree.nodes[i].r0;
          const fr = Math.sin(t * 0.9 + k * 2) > 0.6 ? 1 : 0;
          w.drawImage((k % 2 ? m.flipped : m.frames)[fr], Math.round(mx - m.w / 2), Math.round(my - m.h + 2));
        }
      }
      leaves(false);
      // birds resting in the leaves
      if (stage >= 3 && this.tips.length) {
        for (let k = 0; k < Math.min(3, stage - 2); k++) {
          const tip = this.tips[(k * 37 + (this.seed % 97)) % this.tips.length];
          const b = this.sprites.birds[k % 3];
          const flip = Math.sin(t * 0.3 + k * 1.7) > 0;
          w.drawImage((flip ? b.flipped : b.frames)[2], Math.round(cx + tip.x - b.w / 2), Math.round(gy + tip.y - tip.r - b.h + 1));
        }
      }
    }

    for (const a of this.walkers) if (a.kind === 'squirrel') drawWalker(a);

    // birds crossing the sky
    for (const b of this.flyers) {
      b.x += b.dir * b.speed * dt;
      if (b.x > W + 20 || b.x < -20) {
        b.dir = Math.random() < 0.5 ? 1 : -1;
        b.x = b.dir === 1 ? -12 - rand(0, 80) : W + 12 + rand(0, 80);
        b.y = rand(0.08, 0.6);
      }
      const yy = gy * b.y + Math.sin(t * 2 + b.phase) * 2;
      w.drawImage((b.dir === 1 ? b.sprite.frames : b.sprite.flipped)[Math.floor(t * 7 + b.phase) % 2], Math.round(b.x), Math.round(yy));
    }

    // butterflies
    if (stage >= 1 && (period === 'day' || period === 'dawn') && !this.reduced) {
      for (let i = 0; i < 3; i++) {
        const bxx = cx + Math.sin(t * 0.35 + i * 2.1) * (tree.S * 0.5 + 14) + Math.sin(t * 1.3 + i) * 3;
        const byy = gy - 5 - (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.3)) * Math.min(30, tree.S * 0.4 + 6) + Math.sin(t * 3 + i) * 1.5;
        w.fillStyle = ['#ffb0d0', '#fff08a', '#b0d8ff'][i];
        if (Math.floor(t * 8 + i) % 2) w.fillRect(Math.round(bxx) - 1, Math.round(byy), 3, 1);
        else w.fillRect(Math.round(bxx), Math.round(byy) - 1, 1, 2);
      }
    }

    // falling leaves
    if (!this.reduced && stage >= 2 && this.tips.length && t > this.nextLeaf) {
      this.dropLeaf();
      this.nextLeaf = t + rand(1.2, 4) / (stage >= 5 ? 2 : 1);
    }
    for (const p of this.particles) {
      p.life += dt;
      if (p.kind === 'leaf') {
        if (p.y < 0) {
          p.x += (p.vx + Math.sin(t * 3 + p.phase) * 5) * dt;
          p.y += p.vy * dt;
          if (p.y >= 0) {
            p.y = 0;
            p.max = p.life + 2;
          }
        }
        w.fillStyle = p.color;
        w.globalAlpha = clamp((p.max - p.life) / 0.8, 0, 1);
        w.fillRect(Math.round(cx + p.x), Math.round(gy + p.y), 2, 1);
        w.globalAlpha = 1;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);

    if (sky.tint) {
      w.globalCompositeOperation = 'source-atop';
      w.fillStyle = sky.tint;
      w.fillRect(0, 0, W, H);
      w.globalCompositeOperation = 'source-over';
    }
    c.drawImage(this.world, 0, 0);

    // ----- lights on top (not tinted) -----
    if ((period === 'night' || period === 'dusk') && !this.reduced) {
      for (let i = 0; i < (period === 'night' ? 12 : 5); i++) {
        const fx = cx + Math.sin(t * 0.2 + i * 1.9) * (W * 0.3) + Math.sin(t * 0.7 + i) * 6;
        const fy = gy - 4 - (0.5 + 0.5 * Math.sin(t * 0.3 + i * 2.3)) * Math.min(gy * 0.5, 40);
        const a = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3);
        c.globalAlpha = a * 0.25;
        c.fillStyle = '#e8ff8a';
        c.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 3);
        c.globalAlpha = a;
        c.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      }
      c.globalAlpha = 1;
    }
    for (const p of this.particles) {
      if (p.kind !== 'spark') continue;
      c.globalAlpha = clamp((p.max - p.life) / 0.5, 0, 1) * (0.6 + 0.4 * Math.sin(t * 20 + p.phase));
      c.fillStyle = p.color;
      const sx = Math.round(cx + p.x), sy = Math.round(gy + p.y);
      c.fillRect(sx, sy, 1, 1);
      if (p.phase > 4) {
        c.fillRect(sx - 1, sy, 3, 1);
        c.fillRect(sx, sy - 1, 1, 3);
      }
    }
    c.globalAlpha = 1;
  }

  private syncAnimals(stage: number, W: number, period: Period) {
    const sp = this.sprites;
    const want: [Walker['kind'], Sprite, number][] = [];
    if (stage >= 3) want.push(['squirrel', sp.squirrel, 14]);
    if (stage >= 4) want.push(['raccoon', sp.raccoon, 7]);
    if (stage >= 5) want.push(['deer', sp.deer, 6]);
    if (stage >= 6) want.push(['deer', sp.deer, 5], ['squirrel', sp.squirrel, 16]);
    while (this.walkers.length < want.length) {
      const [kind, sprite, speed] = want[this.walkers.length];
      const dir = Math.random() < 0.5 ? 1 : -1;
      // they wander in from the edge of the screen
      this.walkers.push({ kind, sprite, speed, dir: dir as 1 | -1, x: -dir * (W / 2 + 16), walking: true, timer: rand(5, 9) });
    }
    if (this.walkers.length > want.length) this.walkers.length = want.length;

    const birds = stage >= 2 && period !== 'night' ? Math.min(4, stage - 1) : 0;
    while (this.flyers.length < birds) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.flyers.push({
        sprite: sp.birds[this.flyers.length % 3], dir: dir as 1 | -1, x: dir === 1 ? -12 - rand(0, 60) : W + 12 + rand(0, 60),
        y: rand(0.08, 0.6), speed: rand(14, 24), phase: rand(0, TAU),
      });
    }
    if (this.flyers.length > birds) this.flyers.length = birds;
  }

  /** Hills, distant pines and soil. Redrawn only when the view size changes. */
  private drawBackdrop(W: number, H: number, gy: number, cx: number) {
    const key = `${W}x${H}`;
    if (key === this.bgKey) return;
    this.bgKey = key;
    this.bg.width = W;
    this.bg.height = H;
    const b = this.bg.getContext('2d')!;
    for (let x = 0; x < W; x++) {
      const u = (x - cx) / H;
      const far = Math.round(H * 0.14 + noise1(u * 2.2 + 40, 1) * H * 0.26);
      b.fillStyle = '#8fbf9a';
      b.fillRect(x, gy - far, 1, far);
      const near = Math.round(H * 0.05 + noise1(u * 4 + 90, 2) * H * 0.15);
      b.fillStyle = '#5f9f6c';
      b.fillRect(x, gy - near, 1, near);
      if (h2(x - cx, 61) < 0.07) {
        const ph = 3 + Math.floor(h2(x - cx, 62) * 5);
        b.fillStyle = '#3d7a56';
        for (let k = 0; k < ph; k++) {
          const half = Math.floor(((k + 1) / ph) * 2.5);
          b.fillRect(x - half, gy - near - ph + k, half * 2 + 1, 1);
        }
      }
    }
    b.fillStyle = '#5a3a2a';
    b.fillRect(0, gy, W, H - gy);
    b.fillStyle = '#6cc24a';
    b.fillRect(0, gy, W, 1);
    b.fillStyle = '#3f8f3a';
    b.fillRect(0, gy + 1, W, 1);
    for (let y = gy + 2; y < H; y++)
      for (let x = 0; x < W; x++) {
        const r = h2(x - cx, y - gy + 1000);
        if (r < 0.1) {
          b.fillStyle = r < 0.04 ? '#7a5a48' : '#3f2820';
          b.fillRect(x, y, r < 0.02 ? 2 : 1, 1);
        } else if (y === gy + 2 && r < 0.45) {
          b.fillStyle = '#3f8f3a';
          b.fillRect(x, y, 1, 1);
        }
      }
  }
}

function disc(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  c.fillStyle = color;
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    const s = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (s < 0.4) continue;
    c.fillRect(Math.round(cx - s), Math.round(cy + dy), Math.max(1, Math.round(s * 2)), 1);
  }
}

/** A ragged-edged disc, used for leaf clumps. */
function blob(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    const s = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (s < 0.4) continue;
    const j = h2(seed, dy) < 0.5 ? 0 : 1;
    c.fillRect(Math.round(cx - s) - j, Math.round(cy + dy), Math.max(1, Math.round(s * 2) + j), 1);
  }
}
