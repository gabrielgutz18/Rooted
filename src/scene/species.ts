// The trees you can grow. Each one is a palette plus a few numbers that shape how
// the branches split; the pine has its own builder because it grows in tiers.

import { clamp, mulberry32, TAU } from './raster';

export type SpeciesId = 'oak' | 'sakura' | 'maple' | 'apple' | 'birch' | 'willow' | 'pine';

interface Shape {
  maxd: number; // how many times branches split
  height: number; // overall size multiplier
  trunk: number; // trunk length, as a share of height
  trunkR: number; // trunk radius, as a share of height
  spread: number; // base angle of side branches
  spreadVar: number;
  light: number; // how strongly branches turn upward
  decay: number; // child branch length factor
  kids3: number; // chance of a three-way split
  leaf: number; // leaf clump size multiplier
  squash: number; // clump height / width
}

export interface Species {
  id: SpeciesId;
  name: string;
  blurb: string;
  bark: string[]; // dark → light
  barkOutline: string;
  birch?: boolean;
  leaves: string[]; // [0] is the outline, then dark → light
  foliage: 'round' | 'blossom' | 'willow' | 'pine';
  flower?: string;
  fruit?: string;
  fall: string[]; // what drifts down from it
  fallKind: 'leaf' | 'petal';
  fallRate: number;
  shape: Shape;
}

const OAK_BARK = ['#2e1c16', '#45291f', '#5e3a28', '#7a4c32', '#98623f', '#b87f52'];

export const SPECIES: Species[] = [
  {
    id: 'oak',
    name: 'Oak',
    blurb: 'Strong and broad, with deep roots.',
    bark: OAK_BARK,
    barkOutline: '#1a0f0e',
    leaves: ['#0c2216', '#163a24', '#1f5230', '#2d6b37', '#3f873c', '#5ea443', '#86c04e', '#b4dc68'],
    foliage: 'round',
    fall: ['#5ea443', '#86c04e', '#c8b040', '#3f873c'],
    fallKind: 'leaf',
    fallRate: 1,
    shape: { maxd: 6, height: 1, trunk: 0.24, trunkR: 0.062, spread: 0.55, spreadVar: 0.6, light: 0.1, decay: 0.68, kids3: 0.4, leaf: 1, squash: 0.85 },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    blurb: 'Cherry blossoms that drift on the wind.',
    bark: ['#231a1c', '#352628', '#4a3434', '#5e4440', '#77574f', '#946e62'],
    barkOutline: '#140c0e',
    leaves: ['#4a1a32', '#7a2f52', '#a8476e', '#cc6a8c', '#e48eaa', '#f2b2c6', '#fad0dc', '#fff0f4'],
    foliage: 'blossom',
    flower: '#ffffff',
    fall: ['#f7b9cc', '#fbd3df', '#ffffff', '#ee9ab4'],
    fallKind: 'petal',
    fallRate: 4,
    shape: { maxd: 6, height: 0.9, trunk: 0.2, trunkR: 0.052, spread: 0.78, spreadVar: 0.5, light: 0.04, decay: 0.7, kids3: 0.35, leaf: 0.95, squash: 0.75 },
  },
  {
    id: 'maple',
    name: 'Maple',
    blurb: 'Blazing red and orange all year.',
    bark: ['#2b1d18', '#3f2a22', '#56392c', '#6e4a38', '#8a5e46', '#a77857'],
    barkOutline: '#170e0c',
    leaves: ['#3a0c08', '#6a1a10', '#9a2a14', '#c4421a', '#e0621e', '#f08a2a', '#f8b040', '#ffd66a'],
    foliage: 'round',
    fall: ['#e0621e', '#c4421a', '#f8b040', '#9a2a14'],
    fallKind: 'leaf',
    fallRate: 1.8,
    shape: { maxd: 6, height: 0.95, trunk: 0.26, trunkR: 0.055, spread: 0.5, spreadVar: 0.5, light: 0.14, decay: 0.68, kids3: 0.4, leaf: 1.05, squash: 0.9 },
  },
  {
    id: 'apple',
    name: 'Apple',
    blurb: 'Bears fruit in its season.',
    bark: OAK_BARK,
    barkOutline: '#1a0f0e',
    leaves: ['#0e2616', '#183e22', '#22582c', '#307234', '#448e3a', '#64aa44', '#8cc650', '#bce06c'],
    foliage: 'round',
    fruit: '#d8282e',
    fall: ['#64aa44', '#8cc650', '#d8282e'],
    fallKind: 'leaf',
    fallRate: 0.8,
    shape: { maxd: 6, height: 0.82, trunk: 0.21, trunkR: 0.058, spread: 0.62, spreadVar: 0.5, light: 0.08, decay: 0.68, kids3: 0.4, leaf: 0.95, squash: 0.85 },
  },
  {
    id: 'birch',
    name: 'Birch',
    blurb: 'Tall white bark, light bright leaves.',
    bark: ['#55555a', '#8c8a86', '#b8b6ae', '#d6d3c8', '#ebe8de', '#fbfaf4'],
    barkOutline: '#1c1c22',
    birch: true,
    leaves: ['#12301a', '#1f4a26', '#2e6630', '#438436', '#5fa23e', '#82bd48', '#a9d65a', '#d2ec7c'],
    foliage: 'round',
    fall: ['#d8c040', '#a9d65a', '#e0b030'],
    fallKind: 'leaf',
    fallRate: 1.2,
    shape: { maxd: 6, height: 1.08, trunk: 0.4, trunkR: 0.04, spread: 0.32, spreadVar: 0.32, light: 0.24, decay: 0.66, kids3: 0.3, leaf: 0.78, squash: 1 },
  },
  {
    id: 'willow',
    name: 'Willow',
    blurb: 'Long hanging strands that sway.',
    bark: ['#262018', '#3a3024', '#4f4230', '#66563c', '#7e6c4a', '#9a865c'],
    barkOutline: '#15110c',
    leaves: ['#13301a', '#1e4a22', '#2d662a', '#448232', '#61a03a', '#86bc44', '#acd454', '#d4ec78'],
    foliage: 'willow',
    fall: ['#acd454', '#86bc44', '#d4c050'],
    fallKind: 'leaf',
    fallRate: 1,
    shape: { maxd: 5, height: 0.95, trunk: 0.3, trunkR: 0.058, spread: 0.7, spreadVar: 0.45, light: 0.12, decay: 0.72, kids3: 0.35, leaf: 0.8, squash: 0.8 },
  },
  {
    id: 'pine',
    name: 'Pine',
    blurb: 'Evergreen, rising in tiers.',
    bark: ['#24160f', '#3a2418', '#523322', '#6a432c', '#83563a', '#9e6c4a'],
    barkOutline: '#120a06',
    leaves: ['#061612', '#0e2a22', '#15392c', '#1e4c36', '#2a6040', '#3b7648', '#558e52', '#7aa862'],
    foliage: 'pine',
    fall: ['#6a4a2a', '#3b7648'],
    fallKind: 'leaf',
    fallRate: 0.25,
    shape: { maxd: 0, height: 1.1, trunk: 0, trunkR: 0.042, spread: 0, spreadVar: 0, light: 0, decay: 0, kids3: 0, leaf: 1, squash: 0.5 },
  },
];

export function speciesOf(id: string | null | undefined): Species {
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0];
}

// ---------- building the branches ----------

export interface TNode {
  parent: number;
  off: number; // angle relative to parent
  len: number;
  r0: number;
  r1: number;
  depth: number;
  flex: number; // how much it bends in the wind
  at: number; // where along the parent it attaches
  phase: number;
  leaf: number; // leaf clump radius (0 = none)
  ls: number; // leaf seed
  squash: number;
}

export interface Tree {
  nodes: TNode[];
  S: number; // rough height in world units
  sprout: boolean; // just a stem with its first leaves
}

/** Same seed → same tree at every size, so it grows instead of reshuffling. */
export function buildTree(sp: Species, seed: number, g: number): Tree {
  if (sp.id === 'pine') return buildPine(seed, g);
  const sh = sp.shape;
  const rng = mulberry32(seed);
  const L = g * sh.maxd;
  const S = (5 + 150 * Math.pow(g, 1.15)) * sh.height;
  const nodes: TNode[] = [];
  const leafFrom = Math.max(1, Math.ceil(L) - 2);
  const leafBase = clamp(1.2 + S * 0.05, 1.6, 9) * sh.leaf;

  const rec = (parent: number, depth: number, len: number, r: number, abs: number, parentAbs: number, at: number) => {
    const jit = rng(), phase = rng() * TAU, kids = depth === 0 ? 3 : rng() < sh.kids3 ? 3 : 2, ls = (rng() * 1e9) | 0;
    const f = depth === 0 ? 1 : clamp(L - depth + 1, 0, 1);
    let idx = -2;
    if (parent !== -2 && f > 0.03) {
      const hasLeaf = depth >= leafFrom || (depth === 0 && g < 0.1);
      const rr = r * Math.max(f, 0.45);
      idx = nodes.length;
      nodes.push({
        parent, off: abs - parentAbs, len: len * f, r0: rr, r1: rr * 0.7, depth, flex: depth, at, phase, ls, squash: sh.squash,
        leaf: hasLeaf ? Math.max(1.3, leafBase * (0.75 + jit * 0.5) * f) : 0,
      });
    }
    if (depth >= sh.maxd) return;
    for (let k = 0; k < kids; k++) {
      const a = rng(), b = rng(), c = rng();
      const middle = kids === 3 && k === 2;
      let cabs = abs + (middle ? (a - 0.5) * 0.4 : (k === 0 ? -1 : 1) * (sh.spread + a * sh.spreadVar));
      cabs += (-Math.PI / 2 - cabs) * sh.light; // reach for the light
      rec(idx, depth + 1, len * (sh.decay + c * 0.2), r * 0.68, cabs, abs, middle ? 1 : 0.45 + b * 0.55);
    }
  };
  rec(-1, 0, S * sh.trunk, Math.max(0.7, S * sh.trunkR), -Math.PI / 2 + (rng() - 0.5) * 0.16, 0, 0);
  return { nodes, S, sprout: g < 0.1 };
}

/** A straight trunk with boughs in tiers that get shorter toward the top. */
function buildPine(seed: number, g: number): Tree {
  const rng = mulberry32(seed);
  const S = (5 + 150 * Math.pow(g, 1.15)) * 1.1;
  const nodes: TNode[] = [];
  const segs = Math.max(3, Math.round(3 + g * 9));
  const segLen = S / segs;
  const r0 = Math.max(0.6, S * 0.042);
  const leafBase = clamp(1.8 + S * 0.06, 2.2, 11);
  let parent = -1;
  for (let k = 0; k < segs; k++) {
    const h = k / segs; // 0 at the ground
    const idx = nodes.length;
    const top = k === segs - 1;
    const tier = leafBase * (0.5 + 0.55 * (1 - h)); // needle mass shrinks toward the top
    nodes.push({
      parent, off: k === 0 ? -Math.PI / 2 + (rng() - 0.5) * 0.05 : (rng() - 0.5) * 0.05, len: segLen,
      r0: r0 * (1 - h * 0.85), r1: r0 * (1 - (h + 1 / segs) * 0.85), depth: k, flex: 0.12 * k, at: 1, phase: rng() * TAU,
      // needles hugging the trunk fill the middle of each tier
      leaf: h >= 0.2 ? (top ? leafBase * 0.5 : tier * 1.05) : 0, ls: (rng() * 1e9) | 0, squash: top ? 1.1 : 0.62,
    });
    if (h >= 0.2 && !top) {
      const reach = S * (0.07 + 0.34 * (1 - h));
      for (const side of [-1, 1]) {
        const droop = 0.18 + rng() * 0.14;
        const bidx = nodes.length;
        nodes.push({
          parent: idx, off: side * (Math.PI / 2 + droop), len: reach, r0: Math.max(0.5, r0 * (1 - h) * 0.32), r1: 0.4,
          depth: k + 1, flex: 1 + h * 1.4, at: 0.55 + rng() * 0.45, phase: rng() * TAU,
          leaf: tier * 0.55, ls: (rng() * 1e9) | 0, squash: 0.5,
        });
        // more needles along the bough, bigger toward the trunk, so each tier is a triangle
        for (const [at, f] of [[0.62, 0.78], [0.3, 0.95]]) {
          nodes.push({
            parent: bidx, off: 0, len: 0.001, r0: 0.4, r1: 0.4, depth: k + 2, flex: 1.2 + h, at, phase: rng() * TAU,
            leaf: tier * f, ls: (rng() * 1e9) | 0, squash: 0.55,
          });
        }
      }
    }
    parent = idx;
  }
  return { nodes, S, sprout: false };
}
