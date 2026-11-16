// Where each tree comes from. The backdrop behind a tree is drawn as its native land:
// the shape of the far mountains, the hills, water, a landmark, and small trees of the
// same kind dotted across the distance.

import type { SpeciesId } from './species';

export type Far = 'peaks' | 'rockies' | 'fuji' | 'rolling' | 'taiga' | 'karst' | 'ridges';
export type Landmark = 'pagoda' | 'spire' | 'yurt' | 'onion' | 'bridge' | 'hut' | 'canoe';

export interface Land {
  /** The place, in English (the Tagalog name is in src/lib/i18n.tsx). */
  name: string;
  far: Far;
  /** A lake or river between the far mountains and the hills. */
  water?: boolean;
  hills: {
    base: number; // lowest hill height, as a share of the view height
    amp: number; // how much higher the hills roll
    freq: number; // how often they rise and fall
    colors: [string, string];
    terraces?: boolean; // stepped rice terraces
  };
  /** Share of positions along the hills that get a small tree (0–1). */
  farTrees: number;
  /** Share of those small trees that are evergreens instead of this tree's kind. */
  farPines?: number;
  /** Small trees planted in neat rows, like an orchard. */
  orchard?: boolean;
  landmark: Landmark;
  /** Where the landmark stands, as a share of the width from the middle (-0.5 … 0.5). */
  landmarkAt: number;
  /** Mt Fuji's position, for the Japanese backdrop. */
  peakAt?: number;
}

const GREEN: [string, string] = ['#4f8a5e', '#3d7250'];

export const LANDS: Record<SpeciesId, Land> = {
  oak: {
    name: 'England',
    far: 'rolling',
    hills: { base: 0.04, amp: 0.1, freq: 2.2, colors: ['#62a058', '#4f8a4a'] },
    farTrees: 0.16,
    landmark: 'spire',
    landmarkAt: -0.3,
  },
  sakura: {
    name: 'Japan',
    far: 'fuji',
    hills: { base: 0.04, amp: 0.1, freq: 2.8, colors: GREEN },
    farTrees: 0.22,
    landmark: 'pagoda',
    landmarkAt: 0.3,
    peakAt: -0.24,
  },
  maple: {
    name: 'Canada',
    far: 'rockies',
    water: true,
    hills: { base: 0.01, amp: 0.05, freq: 2.6, colors: ['#3f7a52', '#326646'] },
    farTrees: 0.24,
    farPines: 0.45,
    landmark: 'canoe',
    landmarkAt: 0.24,
  },
  apple: {
    name: 'Kazakhstan',
    far: 'peaks',
    hills: { base: 0.04, amp: 0.09, freq: 2.2, colors: ['#8a9c58', '#76884a'] },
    farTrees: 0,
    orchard: true,
    landmark: 'yurt',
    landmarkAt: 0.28,
  },
  birch: {
    name: 'Russia and Finland',
    far: 'taiga',
    hills: { base: 0.04, amp: 0.08, freq: 2.4, colors: ['#3f7050', '#335f44'] },
    farTrees: 0.4,
    farPines: 0.45,
    landmark: 'onion',
    landmarkAt: -0.28,
  },
  willow: {
    name: 'China',
    far: 'karst',
    water: true,
    hills: { base: 0.01, amp: 0.05, freq: 2.8, colors: ['#4f9058', '#3f7a4a'] },
    farTrees: 0.18,
    landmark: 'bridge',
    landmarkAt: 0.27,
  },
  pine: {
    name: 'the Philippines',
    far: 'ridges',
    hills: { base: 0.06, amp: 0.12, freq: 2.4, colors: ['#5a9c48', '#4a883e'], terraces: true },
    farTrees: 0.2,
    landmark: 'hut',
    landmarkAt: -0.3,
  },
};

export const landOf = (id: SpeciesId): Land => LANDS[id];
