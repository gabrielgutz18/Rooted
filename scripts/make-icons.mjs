// Draws the Rooted app icon as pixel art (a lit, outlined tree on a hill, in the same
// style as the scene) and writes the PNG sizes that installing the app needs:
// Android/desktop (192, 512, maskable 512), iPhone/iPad (180) and the browser tab (32).
// Run with: npm run icons

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => B4[((y & 3) << 2) | (x & 3)];

const SKY = ['#3f8ed8', '#62aae6', '#93cdf0', '#c8e8f4'].map(hex);
const SOIL = ['#6a4630', '#5a3b28', '#4a3020', '#3a2418'].map(hex);
const LEAVES = ['#163a24', '#1f5230', '#2d6b37', '#3f873c', '#5ea443', '#86c04e', '#b4dc68'].map(hex);
const BARK = { lite: hex('#b87f52'), mid: hex('#7a4c32'), dark: hex('#45291f'), groove: hex('#5e3a28') };
const OUTLINE = { 1: hex('#1a0f0e'), 2: hex('#0c2216') };
const LIGHT = (() => {
  const v = [-0.6, -0.75, 0.55], l = Math.hypot(...v);
  return v.map((a) => a / l);
})();

/**
 * The tree is designed on a 32×32 grid (ground at row 25). `size` is the canvas in art
 * pixels and (ox, oy) where that 32×32 design sits, so bigger canvases get real sky and
 * soil around the tree rather than stretched edges.
 */
function render(size, ox, oy) {
  const img = new Array(size * size).fill(null);
  const kind = new Uint8Array(size * size); // 0 world, 1 bark, 2 leaves
  const put = (x, y, c, k = 0) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    img[y * size + x] = c;
    kind[y * size + x] = k;
  };
  const G = 25 + oy; // ground row on this canvas

  // sky, a far hill, grass and soil
  for (let y = 0; y < G; y++)
    for (let x = 0; x < size; x++) put(x, y, SKY[Math.min(SKY.length - 1, Math.floor((y / (G - 1)) * (SKY.length - 1) + bayer(x, y)))]);
  for (let x = 0; x < size; x++) {
    const top = G - Math.round(3 + 2 * Math.sin((x - ox) * 0.22 + 1));
    for (let y = top; y < G; y++) put(x, y, hex(y === top ? '#9ccaa8' : '#7fb89a'));
  }
  for (let y = G; y < size; y++)
    for (let x = 0; x < size; x++) {
      const r = y - G;
      if (r === 0) put(x, y, hex('#86c85a'));
      else if (r === 1) put(x, y, hex((x * 5) % 3 ? '#4f9a3c' : '#2f6a2e'));
      else put(x, y, SOIL[Math.min(SOIL.length - 1, Math.floor(((r - 2) / Math.max(1, size - G - 3)) * (SOIL.length - 1) + bayer(x, y)))]);
    }
  for (const [x, y] of [[4, 29], [26, 28], [21, 30], [9, 27]]) {
    put(x + ox, y + oy, hex('#a89a8a'));
    put(x + ox + 1, y + oy, hex('#7a6c60'));
  }

  // trunk and two limbs, lit from the left
  for (let y = 14; y <= 26; y++) {
    const w = y >= 24 ? 8 : y >= 18 ? 5 : 4;
    const x0 = Math.round(15.5 - w / 2);
    for (let i = 0; i < w; i++) {
      const u = ((i + 0.5) / w) * 2 - 1;
      let c = u < -0.35 ? BARK.lite : u > 0.45 ? BARK.dark : BARK.mid;
      if (c === BARK.mid && (i * 7 + y * 3) % 5 === 0) c = BARK.groove;
      put(x0 + i + ox, y + oy, c, 1);
    }
  }
  const limb = (ax, ay, bx, by) => {
    for (let t = 0; t <= 1; t += 0.08) {
      const x = Math.round(ax + (bx - ax) * t) + ox, y = Math.round(ay + (by - ay) * t) + oy;
      put(x, y, BARK.mid, 1);
      put(x + 1, y, BARK.dark, 1);
    }
  };
  limb(14, 19, 8, 13);
  limb(17, 19, 22, 12);

  // the canopy: lumpy tufts, bottom first so the upper ones overlap them
  const main = { x: 15.5, y: 11.5, rx: 11, ry: 7.2 };
  const tufts = [
    [7, 15, 4.1], [24, 15, 4.1], [11.5, 16, 4.3], [19.5, 16, 4.3], [6, 10, 4.3], [25, 10, 4.3],
    [10, 6.5, 4.4], [21, 6.5, 4.4], [15.5, 5.2, 4.3], [15.5, 10, 5],
  ].map(([x, y, r]) => ({ x, y, rx: r, ry: r * 0.92 }));
  tufts.sort((a, b) => b.y - a.y);
  for (const d of [main, ...tufts]) {
    const rim = Math.pow(Math.max(0, 1 - 1.2 / d.rx), 2);
    for (let y = Math.floor(d.y - d.ry); y <= Math.ceil(d.y + d.ry); y++)
      for (let x = Math.floor(d.x - d.rx); x <= Math.ceil(d.x + d.rx); x++) {
        const ux = (x - d.x) / d.rx, uy = (y - d.y) / d.ry;
        const d2 = ux * ux + uy * uy;
        if (d2 > 1) continue;
        const diff = ux * LIGHT[0] + uy * LIGHT[1] + Math.sqrt(1 - d2) * LIGHT[2];
        let v = (0.12 + 0.88 * Math.max(0, diff)) * (1 - Math.max(0, (y - 9) / 12) * 0.35);
        if (d !== main && d2 > rim && diff < 0.35) v = Math.min(v, 0.08); // crease under a tuft
        const k = Math.round(Math.min(1, Math.max(0, v)) * (LEAVES.length - 1) + (bayer(x, y) - 0.5) * 0.5);
        put(x + ox, y + oy, LEAVES[Math.max(0, Math.min(LEAVES.length - 1, k))], 2);
      }
  }

  // bright rim where leaves meet the sky, then a dark outline round the whole tree
  for (let y = 1; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (kind[i] === 2 && kind[i - size] !== 2 && LEAVES.indexOf(img[i]) >= 4) img[i] = LEAVES[6];
    }
  const k0 = kind.slice();
  for (let y = 0; y < G; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (k0[i]) continue;
      const n = [x > 0 && k0[i - 1], x < size - 1 && k0[i + 1], y > 0 && k0[i - size], k0[i + size]].find(Boolean);
      if (n) img[i] = OUTLINE[n];
    }
  return { size, img };
}

/** Nearest-neighbour upscale; `pad` real pixels repeat the edge (only ever a sliver). */
function scaled({ size, img }, s, pad = 0) {
  const W = size * s + pad * 2;
  const out = Buffer.alloc(W * W * 4);
  for (let Y = 0; Y < W; Y++)
    for (let X = 0; X < W; X++) {
      const sx = Math.min(size - 1, Math.max(0, Math.floor((X - pad) / s)));
      const sy = Math.min(size - 1, Math.max(0, Math.floor((Y - pad) / s)));
      const [r, g, b] = img[sy * size + sx];
      out.set([r, g, b, 255], (Y * W + X) * 4);
    }
  return { W, data: out };
}

// ----- PNG encoding (no dependencies) -----
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png({ W, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(W, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((W * 4 + 1) * W);
  for (let y = 0; y < W; y++) data.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = new URL('../public/icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
const base = render(32, 0, 0);
const files = {
  'icon-192.png': scaled(base, 6),
  'icon-512.png': scaled(base, 16),
  // phones crop maskable icons to a circle/squircle: keep the tree well inside
  'maskable-512.png': scaled(render(42, 5, 3), 12, 4),
  'apple-touch-icon.png': scaled(render(36, 2, 1), 5), // 180×180
  'favicon-32.png': scaled(base, 1),
};
for (const [name, im] of Object.entries(files)) {
  writeFileSync(new URL(name, dir), png(im));
  console.log(`public/icons/${name}  ${im.W}×${im.W}`);
}
