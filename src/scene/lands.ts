// Where each tree comes from. The backdrop behind a tree is drawn as its native land:
// the shape of the far mountains, the hills, water, a landmark, and small trees of the
// same kind dotted across the distance.

import type { SpeciesId } from './species';

export type Far =
  | 'peaks' | 'rockies' | 'fuji' | 'rolling' | 'taiga' | 'karst' | 'ridges'
  | 'volcano' | 'kilimanjaro' | 'mesa' | 'sugarloaf' | 'spires' | 'sea';
export type Landmark =
  | 'pagoda' | 'spire' | 'yurt' | 'onion' | 'bridge' | 'hut' | 'canoe'
  | 'adobe' | 'vinta' | 'dhow' | 'tranogasy' | 'chhatri' | 'farmhouse' | 'cabin' | 'windcatcher' | 'rondavel'
  | 'paifang' | 'church' | 'ruka' | 'bangka' | 'buffalo';

export interface Land {
  /** The place, in English (the Tagalog name is in src/lib/i18n.tsx). */
  name: string;
  far: Far;
  /**
   * A beach: the sea runs out to the horizon (with an island on it, at `peakAt`), the ground
   * is sand instead of grass and soil, and crabs walk on it instead of squirrels and deer.
   */
  beach?: boolean;
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
  /** Where the lone mountain stands (Fuji, a volcano, Kilimanjaro), as for landmarkAt. */
  peakAt?: number;
  /** The near meadow's colours (dark, mid, light) in a dry land; green if not set. */
  meadow?: [string, string, string];
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
  jacaranda: {
    name: 'Argentina',
    far: 'peaks',
    hills: { base: 0.04, amp: 0.08, freq: 2.4, colors: ['#8aa458', '#76904a'] },
    farTrees: 0.18,
    landmark: 'adobe',
    landmarkAt: -0.3,
  },
  eucalyptus: {
    name: 'Mindanao',
    far: 'ridges',
    water: true,
    hills: { base: 0.01, amp: 0.06, freq: 3, colors: ['#3f9a4a', '#2f8040'] },
    farTrees: 0.3,
    landmark: 'vinta',
    landmarkAt: 0.26,
  },
  socotra: {
    name: 'Socotra, Yemen',
    far: 'mesa',
    water: true,
    hills: { base: 0.01, amp: 0.05, freq: 2.2, colors: ['#b8a070', '#a08a5c'] },
    farTrees: 0.1,
    landmark: 'dhow',
    landmarkAt: -0.26,
    meadow: ['#a89a5c', '#968a50', '#bcae6c'],
  },
  poinciana: {
    name: 'Madagascar',
    far: 'rolling',
    hills: { base: 0.05, amp: 0.1, freq: 2.6, colors: ['#b86a40', '#9c5634'], terraces: true },
    farTrees: 0.14,
    landmark: 'tranogasy',
    landmarkAt: 0.3,
  },
  goldenshower: {
    name: 'India',
    far: 'rolling',
    water: true,
    hills: { base: 0.01, amp: 0.05, freq: 2.4, colors: ['#8eaa50', '#7a9444'] },
    farTrees: 0.18,
    landmark: 'chhatri',
    landmarkAt: -0.27,
  },
  magnolia: {
    name: 'the southern United States',
    far: 'rolling',
    hills: { base: 0.03, amp: 0.07, freq: 2, colors: ['#5a9a50', '#4a8644'] },
    farTrees: 0.24,
    farPines: 0.35,
    landmark: 'farmhouse',
    landmarkAt: 0.3,
  },
  spruce: {
    name: 'Colorado',
    far: 'rockies',
    hills: { base: 0.05, amp: 0.1, freq: 2.6, colors: ['#5a8a52', '#4a7646'] },
    farTrees: 0.34,
    landmark: 'cabin',
    landmarkAt: -0.3,
  },
  silktree: {
    name: 'Iran',
    far: 'volcano',
    hills: { base: 0.04, amp: 0.08, freq: 2.2, colors: ['#a8a468', '#928e58'] },
    farTrees: 0.1,
    landmark: 'windcatcher',
    landmarkAt: 0.3,
    peakAt: -0.22,
    meadow: ['#8aa050', '#788e46', '#9cb25e'],
  },
  baobab: {
    name: 'Tanzania',
    far: 'kilimanjaro',
    hills: { base: 0.02, amp: 0.04, freq: 1.8, colors: ['#c0a458', '#a88c48'] },
    farTrees: 0.07,
    landmark: 'rondavel',
    landmarkAt: -0.3,
    peakAt: 0.18,
    meadow: ['#b49a50', '#a08844', '#c8b064'],
  },
  ginkgo: {
    name: 'eastern China',
    far: 'spires',
    hills: { base: 0.04, amp: 0.1, freq: 2.8, colors: ['#4f8a58', '#3f7650'] },
    farTrees: 0.2,
    farPines: 0.4,
    landmark: 'paifang',
    landmarkAt: 0.28,
  },
  trumpet: {
    name: 'Brazil',
    far: 'sugarloaf',
    water: true,
    hills: { base: 0.01, amp: 0.06, freq: 2.8, colors: ['#3f9a4a', '#2f8040'] },
    farTrees: 0.26,
    landmark: 'church',
    landmarkAt: 0.28,
  },
  monkeypuzzle: {
    name: 'Chile',
    far: 'volcano',
    water: true,
    hills: { base: 0.01, amp: 0.05, freq: 2.6, colors: ['#4f8a4a', '#3f7840'] },
    farTrees: 0.26,
    landmark: 'ruka',
    landmarkAt: -0.27,
    peakAt: 0.2,
  },
  bombax: {
    name: 'Vietnam',
    far: 'karst', // the limestone towers of Ninh Bình, rising out of the rice
    hills: { base: 0.05, amp: 0.04, freq: 2.2, colors: ['#7cb64e', '#68a244'], terraces: true }, // flat paddies
    farTrees: 0.1,
    landmark: 'buffalo',
    landmarkAt: -0.28,
  },
  coconut: {
    name: 'tropical beaches',
    far: 'sea',
    beach: true,
    hills: { base: 0, amp: 0, freq: 1, colors: GREEN }, // a beach has no hills
    farTrees: 0,
    landmark: 'bangka',
    landmarkAt: 0.27,
    peakAt: -0.3,
    meadow: ['#d4b47a', '#e2c690', '#eed8a6'],
  },
};

export const landOf = (id: SpeciesId): Land => LANDS[id];
