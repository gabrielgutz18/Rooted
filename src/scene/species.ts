// The trees you can grow. Each one is a palette plus a few numbers that shape how
// the branches split; the pine has its own builder because it grows in tiers, and the
// coconut palm its own because it doesn't branch at all (src/scene/palm.ts draws it).

import { clamp, mulberry32, TAU } from './raster';

export type SpeciesId =
  | 'oak' | 'sakura' | 'maple' | 'apple' | 'birch' | 'willow' | 'pine'
  | 'jacaranda' | 'eucalyptus' | 'socotra' | 'poinciana' | 'goldenshower' | 'magnolia'
  | 'spruce' | 'silktree' | 'baobab' | 'ginkgo' | 'trumpet' | 'monkeypuzzle' | 'coconut';

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
  taper?: number; // how much narrower a branch is at its tip (0.7 if not set)
  fork?: number; // how far along its parent a side branch starts, at the least (0.45 if not set)
  kidR?: number; // the first branches' thickness, as a share of the trunk's (0.68 if not set)
  canopy?: number; // how many levels in from the tips carry leaves: 1 keeps a thin umbrella (3 if not set)
}

/** How a conifer (foliage 'pine') stacks its boughs. */
interface Conifer {
  bare: number; // share of the trunk, from the ground, with no boughs
  droop: number; // how far the boughs bend down (negative turns them up)
  reach: number; // longest bough, as a share of height
  dome?: boolean; // boughs longest in the middle (an umbrella), not at the bottom (a cone)
}

export interface Species {
  id: SpeciesId;
  name: string;
  blurb: string;
  bark: string[]; // dark → light
  barkOutline: string;
  birch?: boolean;
  leaves: string[]; // [0] is the outline, then dark → light
  foliage: 'round' | 'blossom' | 'willow' | 'pine' | 'palm';
  flower?: string;
  fruit?: string;
  /** Big flowers sitting on the leaves (magnolia, silk tree). */
  bloom?: string;
  /** Bark peeling in coloured stripes (rainbow eucalyptus). */
  streaks?: string[];
  /** Chains hanging from the leaves: their colours (outline, then dark → light) and length. */
  hang?: { colors: string[]; len: number };
  conifer?: Conifer;
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
    shape: { maxd: 6, height: 0.9, trunk: 0.2, trunkR: 0.052, spread: 0.78, spreadVar: 0.5, light: 0.04, decay: 0.7, kids3: 0.35, leaf: 0.88, squash: 0.75 },
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
    conifer: { bare: 0.2, droop: 0.18, reach: 0.34 },
    fall: ['#6a4a2a', '#3b7648'],
    fallKind: 'leaf',
    fallRate: 0.25,
    shape: { maxd: 0, height: 1.1, trunk: 0, trunkR: 0.042, spread: 0, spreadVar: 0, light: 0, decay: 0, kids3: 0, leaf: 1, squash: 0.5 },
  },
  {
    id: 'jacaranda',
    name: 'Jacaranda',
    blurb: 'A cloud of purple blossoms.',
    bark: ['#2a2224', '#3c3032', '#524244', '#6a5856', '#84706a', '#a08a80'],
    barkOutline: '#151012',
    leaves: ['#2a1848', '#46287a', '#5e3a9e', '#7650bc', '#8e68d4', '#a886e4', '#c4a8f0', '#e2d0fa'],
    foliage: 'blossom',
    flower: '#f0e6ff',
    fall: ['#8e68d4', '#a886e4', '#c4a8f0', '#7650bc'],
    fallKind: 'petal',
    fallRate: 3,
    shape: { maxd: 6, height: 0.92, trunk: 0.24, trunkR: 0.05, spread: 0.72, spreadVar: 0.45, light: 0.06, decay: 0.7, kids3: 0.35, leaf: 0.9, squash: 0.72 },
  },
  {
    id: 'eucalyptus',
    name: 'Rainbow Eucalyptus',
    blurb: 'Bark streaked in every colour of the rainbow.',
    bark: ['#2e3a2a', '#44583c', '#5e7a4c', '#7e985c', '#a0b46e', '#c4d08a'],
    barkOutline: '#16140f',
    streaks: ['#d8462e', '#ee8a2e', '#e8c040', '#62a84a', '#3a86b8', '#7a52a8', '#b04a6a'],
    leaves: ['#0c2216', '#163a24', '#20522c', '#2c6a34', '#3e843c', '#5a9e46', '#80b852', '#acd46a'],
    foliage: 'round',
    fall: ['#5a9e46', '#80b852', '#ee8a2e'],
    fallKind: 'leaf',
    fallRate: 0.9,
    shape: { maxd: 6, height: 1.15, trunk: 0.42, trunkR: 0.05, spread: 0.46, spreadVar: 0.4, light: 0.18, decay: 0.64, kids3: 0.35, leaf: 0.85, squash: 0.78 },
  },
  {
    id: 'socotra',
    name: 'Socotra Tree',
    blurb: 'An umbrella of leaves on a desert island.',
    bark: ['#3a3430', '#56504a', '#78706a', '#9a9088', '#b8aea2', '#d4cabc'],
    barkOutline: '#1c1816',
    leaves: ['#0a1c16', '#14302a', '#1c4434', '#265a40', '#34724c', '#4a8c58', '#68a46a', '#94c084'],
    foliage: 'round',
    fall: ['#34724c', '#4a8c58', '#a8302a'],
    fallKind: 'leaf',
    fallRate: 0.4,
    shape: { maxd: 6, height: 0.8, trunk: 0.36, trunkR: 0.065, spread: 0.55, spreadVar: 0.15, light: 0.22, decay: 0.74, kids3: 0.5, leaf: 1.3, squash: 0.36, taper: 0.8, fork: 0.95, kidR: 0.72, canopy: 1 },
  },
  {
    id: 'poinciana',
    name: 'Royal Poinciana',
    blurb: 'A wide crown of flame-red flowers.',
    bark: ['#2a2420', '#403630', '#584a40', '#726050', '#8c7864', '#a8927a'],
    barkOutline: '#16110e',
    leaves: ['#3a0a06', '#6a140c', '#9a2210', '#c43418', '#e04a1e', '#f06a28', '#fa9040', '#ffbe6a'],
    foliage: 'blossom',
    flower: '#5a9a3e',
    fall: ['#e04a1e', '#c43418', '#fa9040'],
    fallKind: 'petal',
    fallRate: 2.5,
    shape: { maxd: 6, height: 0.78, trunk: 0.2, trunkR: 0.055, spread: 0.78, spreadVar: 0.3, light: 0.16, decay: 0.76, kids3: 0.3, leaf: 1.1, squash: 0.42, fork: 0.7, canopy: 1 },
  },
  {
    id: 'goldenshower',
    name: 'Golden Shower',
    blurb: 'Long chains of yellow flowers hang down.',
    bark: ['#2a221c', '#3e3228', '#564636', '#6e5a44', '#887054', '#a48a68'],
    barkOutline: '#15100c',
    leaves: ['#1e2a0c', '#344a16', '#4a6a1e', '#628628', '#7ea234', '#9cbc44', '#bcd45a', '#dcea80'],
    foliage: 'round',
    hang: { colors: ['#4a3a06', '#9a740a', '#c89c10', '#e4b818', '#f4d030', '#fce250', '#fff07a', '#fffab0'], len: 0.5 },
    fall: ['#f4d030', '#fce250', '#e4b818'],
    fallKind: 'petal',
    fallRate: 3,
    shape: { maxd: 6, height: 0.9, trunk: 0.24, trunkR: 0.05, spread: 0.6, spreadVar: 0.5, light: 0.08, decay: 0.68, kids3: 0.4, leaf: 0.85, squash: 0.8 },
  },
  {
    id: 'magnolia',
    name: 'Magnolia',
    blurb: 'Glossy leaves and big white flowers.',
    bark: ['#24221f', '#383430', '#4e4a44', '#66605a', '#807a72', '#9c968c'],
    barkOutline: '#141210',
    leaves: ['#081a10', '#0f2c1a', '#163e22', '#1f522c', '#2c6836', '#3e8040', '#5a9a4a', '#86b860'],
    foliage: 'round',
    bloom: '#fffcf0',
    fall: ['#2c6836', '#3e8040', '#f4f0e0'],
    fallKind: 'leaf',
    fallRate: 0.6,
    shape: { maxd: 6, height: 1, trunk: 0.2, trunkR: 0.055, spread: 0.42, spreadVar: 0.4, light: 0.16, decay: 0.68, kids3: 0.45, leaf: 0.95, squash: 0.95 },
  },
  {
    id: 'spruce',
    name: 'Blue Spruce',
    blurb: 'Silver-blue needles on the high slopes.',
    bark: ['#241a14', '#3a2a20', '#523c2c', '#6a4e3a', '#82624a', '#9c785c'],
    barkOutline: '#120c08',
    leaves: ['#0a1a22', '#1a3444', '#28495e', '#365e74', '#4a768a', '#6490a2', '#86acba', '#b0ccd6'],
    foliage: 'pine',
    conifer: { bare: 0.06, droop: 0.34, reach: 0.3 },
    fall: ['#6a4a2a', '#4a768a'],
    fallKind: 'leaf',
    fallRate: 0.2,
    shape: { maxd: 0, height: 1.02, trunk: 0, trunkR: 0.04, spread: 0, spreadVar: 0, light: 0, decay: 0, kids3: 0, leaf: 1, squash: 0.5 },
  },
  {
    id: 'silktree',
    name: 'Persian Silk',
    blurb: 'Soft pink puffs, like threads of silk.',
    bark: ['#2a2420', '#3e3630', '#564c44', '#6e6258', '#887a6e', '#a49488'],
    barkOutline: '#15110e',
    leaves: ['#0e2414', '#1a3c20', '#265628', '#347032', '#468a3a', '#62a446', '#86bc58', '#b0d474'],
    foliage: 'round',
    bloom: '#ff8ec4',
    fall: ['#ff9ccc', '#ffc4e0', '#f070a8'],
    fallKind: 'petal',
    fallRate: 2,
    shape: { maxd: 6, height: 0.8, trunk: 0.2, trunkR: 0.05, spread: 0.6, spreadVar: 0.3, light: 0.08, decay: 0.74, kids3: 0.3, leaf: 0.95, squash: 0.5, canopy: 2 },
  },
  {
    id: 'baobab',
    name: 'Baobab',
    blurb: 'A giant trunk that stores water.',
    bark: ['#3a2a26', '#56403a', '#76584e', '#947064', '#b0897a', '#c8a494'],
    barkOutline: '#1c1210',
    leaves: ['#0e2214', '#183a20', '#22522a', '#2e6a32', '#40843a', '#5c9e44', '#80b850', '#acd468'],
    foliage: 'round',
    fall: ['#5c9e44', '#80b850', '#b0894a'],
    fallKind: 'leaf',
    fallRate: 0.5,
    shape: { maxd: 4, height: 0.75, trunk: 0.55, trunkR: 0.13, spread: 0.75, spreadVar: 0.4, light: 0.2, decay: 0.42, kids3: 0.6, leaf: 0.85, squash: 0.6, taper: 0.8, fork: 0.88, kidR: 0.36 },
  },
  {
    id: 'ginkgo',
    name: 'Ginkgo',
    blurb: 'Golden fan-shaped leaves from an ancient line.',
    bark: ['#2a2420', '#3e342e', '#544840', '#6c5e52', '#867666', '#a2907e'],
    barkOutline: '#15100e',
    leaves: ['#3a2a04', '#6a4c08', '#9a700e', '#c49414', '#dcb020', '#ecc63a', '#f6dc60', '#fff09a'],
    foliage: 'round',
    fall: ['#ecc63a', '#f6dc60', '#dcb020'],
    fallKind: 'leaf',
    fallRate: 2.2,
    shape: { maxd: 6, height: 1, trunk: 0.3, trunkR: 0.05, spread: 0.45, spreadVar: 0.4, light: 0.18, decay: 0.66, kids3: 0.35, leaf: 0.9, squash: 0.85 },
  },
  {
    id: 'trumpet',
    name: 'Pink Trumpet',
    blurb: 'Bare branches burst into pink.',
    bark: ['#2a2220', '#3e3230', '#564644', '#6e5c58', '#88746e', '#a48e86'],
    barkOutline: '#151010',
    leaves: ['#4a1030', '#7a1e4e', '#a8306c', '#cc4a88', '#e46aa2', '#f08cbc', '#f8b2d4', '#ffd8ea'],
    foliage: 'blossom',
    flower: '#fff4c0',
    fall: ['#e46aa2', '#f08cbc', '#cc4a88'],
    fallKind: 'petal',
    fallRate: 3.5,
    shape: { maxd: 6, height: 0.88, trunk: 0.24, trunkR: 0.05, spread: 0.62, spreadVar: 0.5, light: 0.08, decay: 0.7, kids3: 0.35, leaf: 0.9, squash: 0.78 },
  },
  {
    id: 'monkeypuzzle',
    name: 'Monkey Puzzle',
    blurb: 'Spiky, rope-like branches from the age of dinosaurs.',
    bark: ['#24201c', '#38322c', '#4e4640', '#665c54', '#7e746a', '#9a8e82'],
    barkOutline: '#12100e',
    leaves: ['#06140c', '#0c2416', '#12341e', '#1a4628', '#245a32', '#32703c', '#468848', '#64a058'],
    foliage: 'pine',
    conifer: { bare: 0.4, droop: -0.12, reach: 0.24, dome: true },
    fall: ['#5a4630', '#32703c'],
    fallKind: 'leaf',
    fallRate: 0.1,
    shape: { maxd: 0, height: 1.05, trunk: 0, trunkR: 0.045, spread: 0, spreadVar: 0, light: 0, decay: 0, kids3: 0, leaf: 1, squash: 0.5 },
  },
  {
    id: 'coconut',
    name: 'Coconut Palm',
    blurb: 'Swaying fronds and coconuts by the sea.',
    bark: ['#2e261e', '#463a2e', '#5e5040', '#786854', '#94846c', '#b0a088'],
    barkOutline: '#16120e',
    leaves: ['#0a200e', '#143a16', '#1e5420', '#2c6e28', '#408a30', '#5ea63a', '#84c24a', '#b4de6c'],
    foliage: 'palm',
    fall: ['#84c24a', '#c8b050', '#a88a3a'],
    fallKind: 'leaf',
    fallRate: 0.3,
    shape: { maxd: 0, height: 1.08, trunk: 0, trunkR: 0.034, spread: 0, spreadVar: 0, light: 0, decay: 0, kids3: 0, leaf: 1, squash: 0.5 },
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

/** One palm frond, starting at the top of the trunk. */
export interface Frond {
  a: number; // the way it points where it leaves the trunk (-π/2 = straight up)
  len: number; // world units
  droop: number; // how far it bends down toward its tip (radians)
  phase: number;
  ls: number; // its own seed
  back: boolean; // behind the trunk and the coconuts
}

export interface Tree {
  nodes: TNode[];
  S: number; // rough height in world units
  sprout: boolean; // just a stem with its first leaves
  /** A palm's crown (its trunk is `nodes`, one segment above the other). */
  fronds?: Frond[];
  /** How many coconuts hang under a palm's crown. */
  nuts?: number;
}

/** Same seed → same tree at every size, so it grows instead of reshuffling. */
export function buildTree(sp: Species, seed: number, g: number): Tree {
  if (sp.foliage === 'pine') return buildConifer(sp, seed, g);
  if (sp.foliage === 'palm') return buildPalm(sp, seed, g);
  const sh = sp.shape;
  const taper = sh.taper ?? 0.7;
  const rng = mulberry32(seed);
  const L = g * sh.maxd;
  const S = (5 + 150 * Math.pow(g, 1.15)) * sh.height;
  const nodes: TNode[] = [];
  // a big tree also leafs out along its inner branches, so the crown is full
  const leafFrom = Math.max(1, Math.ceil(L) - Math.min(sh.canopy ?? 3, g > 0.55 ? 3 : 2));
  const fork = sh.fork ?? 0.45;
  const leafBase = clamp(1.4 + S * 0.065, 1.8, 12) * sh.leaf;

  const rec = (parent: number, depth: number, len: number, r: number, abs: number, parentAbs: number, at: number) => {
    const jit = rng(), phase = rng() * TAU, kids = depth === 0 ? 3 : rng() < sh.kids3 ? 3 : 2, ls = (rng() * 1e9) | 0;
    const f = depth === 0 ? 1 : clamp(L - depth + 1, 0, 1);
    let idx = -2;
    if (parent !== -2 && f > 0.03) {
      const hasLeaf = depth >= leafFrom || (depth === 0 && g < 0.1);
      const rr = r * Math.max(f, 0.45);
      idx = nodes.length;
      nodes.push({
        parent, off: abs - parentAbs, len: len * f, r0: rr, r1: rr * taper, depth, flex: depth, at, phase, ls, squash: sh.squash,
        leaf: hasLeaf ? Math.max(1.3, leafBase * (0.75 + jit * 0.5) * f) : 0,
      });
    }
    if (depth >= sh.maxd) return;
    for (let k = 0; k < kids; k++) {
      const a = rng(), b = rng(), c = rng();
      const middle = kids === 3 && k === 2;
      let cabs = abs + (middle ? (a - 0.5) * 0.4 : (k === 0 ? -1 : 1) * (sh.spread + a * sh.spreadVar));
      cabs += (-Math.PI / 2 - cabs) * sh.light; // reach for the light
      rec(idx, depth + 1, len * (sh.decay + c * 0.2), r * (depth === 0 ? sh.kidR ?? 0.68 : 0.68), cabs, abs, middle ? 1 : fork + b * (1 - fork));
    }
  };
  rec(-1, 0, S * sh.trunk, Math.max(0.7, S * sh.trunkR), -Math.PI / 2 + (rng() - 0.5) * 0.16, 0, 0);
  return { nodes, S, sprout: g < 0.1 };
}

/**
 * A straight trunk with boughs in tiers: shorter toward the top for a cone (pine, spruce),
 * or longest in the middle of a high crown for an umbrella (monkey puzzle).
 */
function buildConifer(sp: Species, seed: number, g: number): Tree {
  const cf = sp.conifer ?? { bare: 0.2, droop: 0.18, reach: 0.34 };
  const rng = mulberry32(seed);
  const S = (5 + 150 * Math.pow(g, 1.15)) * sp.shape.height;
  const nodes: TNode[] = [];
  const segs = Math.max(3, Math.round(3 + g * 9));
  const segLen = S / segs;
  const r0 = Math.max(0.6, S * sp.shape.trunkR);
  const leafBase = clamp(1.8 + S * 0.06, 2.2, 11);
  let parent = -1;
  for (let k = 0; k < segs; k++) {
    const h = k / segs; // 0 at the ground
    const idx = nodes.length;
    const top = k === segs - 1;
    const crown = clamp((h - cf.bare) / Math.max(0.01, 1 - cf.bare), 0, 1); // 0 at the lowest bough
    // needle mass shrinks toward the top of a cone; an umbrella keeps it even
    const tier = leafBase * (cf.dome ? 0.8 + 0.2 * (1 - crown) : 0.5 + 0.55 * (1 - h));
    nodes.push({
      parent, off: k === 0 ? -Math.PI / 2 + (rng() - 0.5) * 0.05 : (rng() - 0.5) * 0.05, len: segLen,
      r0: r0 * (1 - h * 0.85), r1: r0 * (1 - (h + 1 / segs) * 0.85), depth: k, flex: 0.12 * k, at: 1, phase: rng() * TAU,
      // needles hugging the trunk fill the middle of each tier
      leaf: h >= cf.bare ? (top ? leafBase * 0.5 : tier * 1.05) : 0, ls: (rng() * 1e9) | 0, squash: top ? 1.1 : 0.62,
    });
    if (h >= cf.bare && !top) {
      const reach = cf.dome
        ? S * (0.05 + cf.reach * Math.sin(Math.PI * clamp(0.2 + crown * 0.8, 0, 1)))
        : S * (0.07 + cf.reach * (1 - h));
      for (const side of [-1, 1]) {
        const droop = cf.droop + rng() * 0.14;
        const bidx = nodes.length;
        nodes.push({
          parent: idx, off: side * (Math.PI / 2 + droop), len: reach, r0: Math.max(0.5, r0 * (1 - h) * 0.32), r1: 0.4,
          depth: k + 1, flex: 1 + h * 1.4, at: 0.55 + rng() * 0.45, phase: rng() * TAU,
          leaf: tier * 0.55, ls: (rng() * 1e9) | 0, squash: 0.5,
        });
        if (cf.dome) {
          // the bough's tip turns up, like a candelabra arm
          nodes.push({
            parent: bidx, off: -side * 0.9, len: reach * 0.28, r0: 0.6, r1: 0.4, depth: k + 2, flex: 1.4 + h, at: 1,
            phase: rng() * TAU, leaf: tier * 0.75, ls: (rng() * 1e9) | 0, squash: 0.7,
          });
        }
        // more needles along the bough, bigger toward the trunk, so each tier is a triangle
        const along = cf.dome ? [[0.85, 0.8], [0.62, 0.85], [0.4, 0.9], [0.2, 0.8]] : [[0.62, 0.78], [0.3, 0.95]];
        for (const [at, f] of along) {
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

/**
 * A coconut palm: one slim trunk that leans out and curves back up, under a crown of long
 * fronds. A young palm is nearly all fronds; the trunk rises as it grows. The fronds are laid
 * out once from the seed and each size shows the first so many, so new ones fill the gaps
 * instead of the crown reshuffling.
 */
function buildPalm(sp: Species, seed: number, g: number): Tree {
  const S = (5 + 150 * Math.pow(g, 1.15)) * sp.shape.height;
  const k = clamp((g - 0.1) / 0.5, 0, 1); // 0 = a young palm, 1 = grown
  // the crown has its own random numbers, so the trunk's (more segments as it grows) can't shift it
  const fr = mulberry32(seed ^ 0x9e3779b9);
  const side = fr() < 0.5 ? -1 : 1;
  const lean = (0.1 + fr() * 0.12) * (0.3 + 0.7 * k);
  const all: Frond[] = [];
  for (let i = 0; i < 16; i++) {
    const u = (0.5 + i * 0.618034) % 1; // any first few are spread evenly round the crown
    const out = Math.abs(u - 0.5) * 2; // 0 = straight up, 1 = out to the side
    all.push({
      a: -Math.PI / 2 + (u - 0.5) * 3.2 + (fr() - 0.5) * 0.12,
      // fronds turned toward or away from us look shorter
      len: S * (0.5 - 0.14 * k) * (0.62 + 0.38 * fr()) * (out < 0.15 ? 0.75 : 1),
      droop: (0.35 + 1.25 * out + fr() * 0.35) * (0.55 + 0.45 * k),
      phase: fr() * TAU,
      ls: (fr() * 1e9) | 0,
      back: i % 2 === 1,
    });
  }

  const rng = mulberry32(seed);
  const trunkH = S * (0.1 + 0.62 * k);
  const segs = Math.max(3, Math.round(3 + g * 9));
  const r0 = Math.max(0.7, S * sp.shape.trunkR);
  // slim all the way up, with a swollen foot
  const rAt = (h: number) => r0 * (0.82 + 0.18 * (1 - h)) * (1 + 0.2 * Math.max(0, 1 - h * 6));
  const nodes: TNode[] = [];
  for (let i = 0; i < segs; i++) {
    const h = i / segs;
    nodes.push({
      parent: i - 1, off: i === 0 ? -Math.PI / 2 + side * lean : (-side * lean * 0.9) / (segs - 1), len: trunkH / segs,
      r0: rAt(h), r1: rAt(h + 1 / segs), depth: i, flex: 0.1 * i, at: 1, phase: rng() * TAU, leaf: 0, ls: (rng() * 1e9) | 0, squash: 0.5,
    });
  }
  const nuts = g >= 0.66 ? 3 + Math.round(3 * clamp((g - 0.66) / 0.3, 0, 1)) : 0;
  return { nodes, S, sprout: g < 0.1, fronds: all.slice(0, Math.round(4 + 10 * k)), nuts };
}
