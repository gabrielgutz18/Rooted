// Note folders: a little desktop in My notes. Each member makes folders (a name and a colour)
// and drags notes into them. A note is in one folder at most; deleting a folder puts its notes
// back on the desktop, and never deletes them.
//
// The whole desk (the folders, and which note is in which) is saved as one value, locked with
// the note key like the notes themselves (backend.desk / saveDesk), so the server can't read a
// folder's name. Every change is a small operation, kept on this device until it is saved:
// saving loads the desk, applies the waiting operations and saves it, so a change made on
// another device in between isn't lost. Offline, the operations wait here.

import { lighten, luminance, shade } from './avatars';

// In the order they're offered (around the colour wheel, then the browns and greys).
// Ids are saved in people's desks: add new ones freely, but never rename or remove one.
export const FOLDER_COLORS = {
  manila: '#e9b949',
  cream: '#efe4c8',
  yellow: '#f5d63d',
  orange: '#f08a3c',
  red: '#e0574c',
  maroon: '#9a2f45',
  pink: '#e472ad',
  lavender: '#b49ae6',
  purple: '#8d5fd3',
  navy: '#2f4a9e',
  blue: '#4b82dc',
  sky: '#5cc3ec',
  teal: '#35a89f',
  green: '#5cb04c',
  lime: '#a6d23f',
  brown: '#9a6a3f',
  slate: '#7d8797',
  charcoal: '#4a4656',
} as const;

export type FolderColor = keyof typeof FOLDER_COLORS;
export const FOLDER_COLOR_IDS = Object.keys(FOLDER_COLORS) as FolderColor[];
const isFolderColor = (c: unknown): c is FolderColor => typeof c === 'string' && Object.hasOwn(FOLDER_COLORS, c);

// The little pictures stamped on a folder's front, 7 × 7. 'x' is a pixel.
// Ids are saved in people's desks: add new ones freely, but never rename or remove one.
export const FOLDER_ICONS = {
  cross: ['...x...', '...x...', '.xxxxx.', '...x...', '...x...', '...x...', '...x...'],
  heart: ['.......', '.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
  book: ['x.xxxxx', 'x.xx.xx', 'x.x...x', 'x.xx.xx', 'x.xx.xx', 'x.xxxxx', 'x.xxxxx'],
  dove: ['.....xx', '....xxx', '.x.xxx.', 'xxxxxx.', '.xxxxxx', '...x..x', '.......'],
  flame: ['...x...', '...xx..', '..xxx..', '.xxxxx.', '.xx.xx.', 'xx...xx', '.xxxxx.'],
  fish: ['.......', '..xxx.x', '.x.xxxx', 'xxxxxx.', '.xxxxxx', '..xxx.x', '.......'],
  church: ['.x.....', 'xxx....', '.x.....', 'xxx....', 'xxxxxxx', 'xxx.x.x', 'xxx.xxx'],
  globe: ['..xxx..', '.x.x.x.', 'xxxxxxx', 'x..x..x', 'xxxxxxx', '.x.x.x.', '..xxx..'],
  people: ['.x...x.', 'xxx.xxx', '.x...x.', '.......', 'xxx.xxx', 'xxx.xxx', 'xxx.xxx'],
  music: ['..xxxxx', '..xxxxx', '..x...x', '..x...x', 'xxx.xxx', 'xxx.xxx', '.......'],
  chat: ['.xxxxx.', 'xxxxxxx', 'x.x.x.x', 'xxxxxxx', '.xxxxx.', '.xx....', '.x.....'],
  star: ['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', '.x...x.'],
  sun: ['...x...', '.x...x.', '..xxx..', 'x.xxx.x', '..xxx..', '.x...x.', '...x...'],
  sprout: ['.....xx', 'xx..xxx', 'xxx.xx.', '.xxx...', '...x...', '...x...', '.xxxxx.'],
  light: ['..xxx..', '.xxxxx.', '.xxxxx.', '.xxxxx.', '..xxx..', '.......', '..xxx..'],
  anchor: ['...x...', '..x.x..', '...x...', '.xxxxx.', '...x...', 'x..x..x', '.xxxxx.'],
  crown: ['.......', 'x..x..x', 'xx.x.xx', 'xxxxxxx', 'x.x.x.x', 'xxxxxxx', '.......'],
  check: ['.......', '......x', '.....xx', 'x...xx.', 'xx.xx..', '.xxx...', '..x....'],
  home: ['...x...', '..xxx..', '.xxxxx.', 'xxxxxxx', '.xx.xx.', '.xx.xx.', '.xx.xx.'],
} satisfies Record<string, string[]>;

export type FolderIconId = keyof typeof FOLDER_ICONS;
export const FOLDER_ICON_IDS = Object.keys(FOLDER_ICONS) as FolderIconId[];
const isFolderIcon = (i: unknown): i is FolderIconId => typeof i === 'string' && Object.hasOwn(FOLDER_ICONS, i);

export const FOLDER_NAME_MAX = 40;
export const MAX_FOLDERS = 60;

export interface Folder {
  id: string;
  name: string;
  color: FolderColor;
  /** the little picture on its front; none when left out */
  icon?: FolderIconId | null;
}

export interface Desk {
  folders: Folder[]; // in the order they were made
  /** note id → the id of the folder it's in. Notes not listed are on the desktop. */
  placed: Record<string, string>;
}

export const emptyDesk = (): Desk => ({ folders: [], placed: {} });

export type DeskOp =
  | { kind: 'add'; folder: Folder }
  | { kind: 'edit'; id: string; name: string; color: FolderColor; icon?: FolderIconId | null }
  | { kind: 'remove'; id: string }
  /** folder null: back to the desktop */
  | { kind: 'move'; note: string; folder: string | null };

/** Spaces tidied and cut to length; '' means there's no name. */
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, FOLDER_NAME_MAX);

/** Short, since every placed note repeats it. */
export const newFolderId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);

export function applyOp(desk: Desk, op: DeskOp): Desk {
  switch (op.kind) {
    case 'add':
      if (desk.folders.length >= MAX_FOLDERS || desk.folders.some((f) => f.id === op.folder.id)) return desk;
      return { ...desk, folders: [...desk.folders, op.folder] };
    case 'edit':
      return {
        ...desk,
        folders: desk.folders.map((f) => (f.id === op.id ? { ...f, name: op.name, color: op.color, icon: 'icon' in op ? op.icon : f.icon } : f)),
      };
    case 'remove':
      return {
        folders: desk.folders.filter((f) => f.id !== op.id),
        placed: Object.fromEntries(Object.entries(desk.placed).filter(([, folder]) => folder !== op.id)),
      };
    case 'move': {
      const placed = { ...desk.placed };
      // a folder deleted on another device in the meantime: the note stays on the desktop
      if (op.folder && desk.folders.some((f) => f.id === op.folder)) placed[op.note] = op.folder;
      else delete placed[op.note];
      return { ...desk, placed };
    }
  }
}

export const applyOps = (desk: Desk, ops: DeskOp[]) => ops.reduce(applyOp, desk);

/** A desk read back from storage or the server, with anything malformed left out. */
export function readDesk(value: unknown): Desk {
  if (!value || typeof value !== 'object') return emptyDesk();
  const v = value as Partial<Record<keyof Desk, unknown>>;
  const folders: Folder[] = [];
  for (const f of Array.isArray(v.folders) ? v.folders : []) {
    if (!f || typeof f !== 'object') continue;
    const { id, name, color, icon } = f as Record<string, unknown>;
    const clean = typeof name === 'string' ? cleanName(name) : '';
    if (typeof id !== 'string' || !id || id.length > 64 || !clean || folders.some((x) => x.id === id)) continue;
    // a colour or icon from a newer version of the app falls back to the plain folder
    folders.push({ id, name: clean, color: isFolderColor(color) ? color : 'manila', icon: isFolderIcon(icon) ? icon : null });
    if (folders.length === MAX_FOLDERS) break;
  }
  const ids = new Set(folders.map((f) => f.id));
  const placed: Record<string, string> = {};
  if (v.placed && typeof v.placed === 'object')
    for (const [note, folder] of Object.entries(v.placed)) if (typeof folder === 'string' && ids.has(folder)) placed[note] = folder;
  return { folders, placed };
}

// ---------------- changes waiting on this device ----------------

const OPS = 'rooted.deskops.v1.';

export function loadDeskOps(userId: string): DeskOp[] {
  try {
    const list = JSON.parse(localStorage.getItem(OPS + userId) ?? '[]');
    return Array.isArray(list) ? list.filter((op) => op && typeof op === 'object' && typeof op.kind === 'string') : [];
  } catch {
    return [];
  }
}

/** Best effort: if this browser can't keep them, they still save while the app stays open. */
export function keepDeskOps(userId: string, ops: DeskOp[]) {
  try {
    if (ops.length) localStorage.setItem(OPS + userId, JSON.stringify(ops));
    else localStorage.removeItem(OPS + userId);
  } catch {
    /* storage full or blocked */
  }
}

export const clearDeskOps = (userId: string) => keepDeskOps(userId, []);

// ---------------- the pixel folder ----------------

export const FOLDER_W = 22;
export const FOLDER_H = 18;

// '.' is empty. o: outline, B: the back, f: the front, h: its lit edge, d: its shaded edge,
// k/p/l: a sheet of paper (edge, paper, ruled line), sticking out when the folder holds notes.
const FULL = [
  '.ooooooo..............',
  'oBBBBBBBo.kkkkkkkkkk..',
  'oBBBBBBBBokppppppppko.',
  'oBBBBBBBBBkpllllllpkBo',
  'oBBBBBBBBBkppppppppkBo',
  'oBBBBBBBBBkpllllllpkBo',
  'oooooooooooooooooooooo',
  'ohhhhhhhhhhhhhhhhhhhfo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'ohffffffffffffffffffdo',
  'oddddddddddddddddddddo',
  '.oooooooooooooooooooo.',
];
const EMPTY = [
  '.ooooooo..............',
  'oBBBBBBBo.............',
  'oBBBBBBBBoooooooooooo.',
  'oBBBBBBBBBBBBBBBBBBBBo',
  'oBBBBBBBBBBBBBBBBBBBBo',
  'oBBBBBBBBBBBBBBBBBBBBo',
  ...FULL.slice(6),
];

export interface Run {
  x: number;
  y: number;
  w: number;
  c: string;
}

const light = (color: string) => luminance(color) > 140;

function paletteOf(color: FolderColor): Record<string, string> {
  const base = FOLDER_COLORS[color];
  return {
    o: shade(base, 0.34),
    B: shade(base, 0.74),
    f: base,
    h: lighten(base, 0.45),
    d: shade(base, 0.82),
    k: '#5b5566',
    p: '#fffaf0',
    l: '#a9bdd6',
    // the icon: stamped in a deep shade of a light folder, or a pale tint of a dark one,
    // with a one-pixel shadow under it so it looks pressed into the cardboard
    x: light(base) ? shade(base, 0.4) : lighten(base, 0.82),
    s: light(base) ? lighten(base, 0.35) : shade(base, 0.62),
  };
}

// where the icon sits: on the front, a little right of centre (under the paper)
const ICON_X = 8;
const ICON_Y = 8;

/** Rows of pixels, `.` empty, into runs of one colour. */
function toRuns(rows: string[], pal: Record<string, string>): Run[] {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w++;
      if (ch !== '.') runs.push({ x, y, w, c: pal[ch] });
      x += w;
    }
  });
  return runs;
}

const runCache = new Map<string, Run[]>();

/** The folder as rows of same-coloured pixels, ready to draw as SVG rectangles. */
export function folderRuns(color: FolderColor, full: boolean, icon?: FolderIconId | null): Run[] {
  const key = `${color}:${full}:${icon ?? ''}`;
  const hit = runCache.get(key);
  if (hit) return hit;
  const rows = (full ? FULL : EMPTY).map((r) => r.split(''));
  if (icon && isFolderIcon(icon)) {
    const art = FOLDER_ICONS[icon];
    art.forEach((line, y) =>
      [...line].forEach((ch, x) => {
        if (ch !== 'x') return;
        rows[ICON_Y + y][ICON_X + x] = 'x';
        // the shadow: below each pixel that has nothing of the icon under it
        const below = rows[ICON_Y + y + 1];
        if (art[y + 1]?.[x] !== 'x' && below && below[ICON_X + x] === 'f') below[ICON_X + x] = 's';
      }),
    );
  }
  const runs = toRuns(
    rows.map((r) => r.join('')),
    paletteOf(color),
  );
  runCache.set(key, runs);
  return runs;
}

/** Just the icon, in one colour (for the icon picker). */
export const iconRuns = (icon: FolderIconId, c: string) => toRuns(FOLDER_ICONS[icon], { x: c });

/** Text on a folder's colour: dark on light colours, light on dark ones. */
export const inkOn = (color: FolderColor) => (luminance(FOLDER_COLORS[color]) > 140 ? '#221b29' : '#fffaf0');
