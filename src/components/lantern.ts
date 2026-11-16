// The pixel lantern and the fire inside it, shared by the streak card (your tree) and the
// lamp post (a friend's tree). The fire changes colour at 10, 20, 30, 50, 100 and 200 days,
// flares when a note makes the streak longer, and blazes up when it's pressed (stoked).

import { useEffect, useRef, type RefObject } from 'react';
import { FLAMES, type FlameId } from '../lib/streak';
import type { Strings } from '../lib/i18n';

/** Sent when a note just made the streak longer. */
export interface LampFire {
  key: number;
  from: number; // the streak before the note
}

// [edge, body, bright, core] for each fire
export const FIRE: Record<FlameId, [string, string, string, string]> = {
  ember: ['#a2300e', '#ea5a1c', '#ffa830', '#ffe88e'],
  gold: ['#8e5c06', '#e8a818', '#ffd83c', '#fff8cc'],
  emerald: ['#0e5e2c', '#22aa4c', '#70e872', '#e2ffcc'],
  sky: ['#0a5c7c', '#1ab2da', '#6ce4f8', '#e6fcff'],
  sapphire: ['#16287c', '#2c5cea', '#6c9eff', '#dee9ff'],
  violet: ['#4c1478', '#9c3ce2', '#d27cff', '#f7e2ff'],
  glory: ['#b8a050', '#f2e4a8', '#fffbea', '#ffffff'],
};

/** What pops up when a note made the streak longer (from `fromIdx` to `idx`). */
export const fireText = (t: Strings, fromIdx: number, idx: number, streak: number) =>
  fromIdx < 0 ? t.lampLit : fromIdx !== idx ? t.newFlame(t.flames[FLAMES[idx].id]) : t.streak(streak);

/** The fire's colours for a flame index, or null when the lamp is out. */
export const fireColors = (idx: number) => (idx >= 0 ? FIRE[FLAMES[idx].id] : null);

// The lantern, 17 × 26 art pixels. o outline, L/M/D light/mid/dark brass, g glass.
const ART = [
  '.......ooo.......',
  '......o...o......',
  '......o...o......',
  '.......ooo.......',
  '........o........',
  '......ooooo......',
  '.....oLMMMDo.....',
  '....oLMMMMMDo....',
  '...oLMMMMMMMDo...',
  '..ooooooooooooo..',
  ...Array.from({ length: 12 }, () => '..oMgggggggggMo..'),
  '..ooooooooooooo..',
  '...oLMMMMMMMDo...',
  '....oDDDDDDDo....',
  '.....ooooooo.....',
];
export const LANTERN_W = 17;
export const LANTERN_H = ART.length;
const GLASS_TOP = 10;
const BASE = 20; // the flame stands on the burner, one row above the bottom of the glass
const MID = 8.5; // the middle of the glass

const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const METAL: Record<string, [number, number, number]> = { o: rgb('#2a1a12'), L: rgb('#f0c45c'), M: rgb('#b8842e'), D: rgb('#6e4818') };
const GLASS = rgb('#2e2638');
const WHITE: [number, number, number] = [255, 255, 255];
const mix = (a: number[], b: number[], k: number) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
const hue = (deg: number): [number, number, number] => {
  // a soft rainbow, for the edge of the Glory flame
  const f = (n: number) => {
    const k = (n + deg / 30) % 12;
    return Math.round(255 * (0.8 - 0.18 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
};

const FLARE_MS = 2400;
const SWAP_MS = 700; // when a new colour takes over during a flare
const STOKE_RISE_MS = 140; // a press makes the fire jump up this fast…
const STOKE_MS = 1700; // …then it settles back over this long
const STOKE_MAX = 2.2; // quick presses stack up to this

/** How hard the fire is blazing from presses, at time `now`. */
const stokeAt = (s: { at: number; amp: number }, now: number) => {
  const since = now - s.at;
  if (since < 0 || since > STOKE_MS) return 0;
  if (since < STOKE_RISE_MS) return s.amp * (since / STOKE_RISE_MS);
  const k = 1 - (since - STOKE_RISE_MS) / (STOKE_MS - STOKE_RISE_MS);
  return s.amp * k * k; // eases out
};

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Lantern {
  /** Pressed: the fire leaps up. Returns how hard it's blazing (1…2.2), or 0 when the lamp is out. */
  stoke(): number;
  /** A note made the streak longer: flare up, changing colour if `fromIdx` was another flame. */
  flare(fromIdx: number): void;
}

/** Draws the lantern with flame `idx` (-1: out) into `canvas` (LANTERN_W × LANTERN_H) and keeps it burning. */
export function useLantern(canvas: RefObject<HTMLCanvasElement | null>, idx: number): Lantern {
  const live = useRef({ idx, from: idx, flareAt: -1e9, stoke: { at: -1e9, amp: 0 } });
  live.current.idx = idx;

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!;
    const img = ctx.createImageData(LANTERN_W, LANTERN_H);
    const reduced = reducedMotion();
    let raf = 0, last = 0;

    const draw = (now: number) => {
      const L = live.current;
      const since = now - L.flareAt;
      const flare = reduced ? 0 : Math.max(0, 1 - since / FLARE_MS);
      const boost = stokeAt(L.stoke, now); // from presses
      const swapping = L.from !== L.idx && since < SWAP_MS;
      const flash = L.from !== L.idx && Math.abs(since - SWAP_MS) < 140;
      const show = swapping ? L.from : L.idx;
      const pal = show >= 0 ? FIRE[FLAMES[show].id].map(rgb) : null;
      const glory = show >= 0 && FLAMES[show].id === 'glory';
      const tt = reduced ? 0 : now / 1000;

      // the flame's shape this frame: it flickers, leans, and grows tall when it flares
      const h = 7.6 + Math.sin(tt * 9.3) * 0.5 + Math.sin(tt * 23.7) * 0.35 + flare * 2.6 + boost * 1.6;
      const half = 2.9 + Math.sin(tt * 6.1) * 0.15 + flare * 0.7 + boost * 0.55;
      const lean = (Math.sin(tt * 3.7) * 0.55 + Math.sin(tt * 11.3) * 0.3) * (1 + boost * 0.4);
      const heat = Math.min(1.4, flare + boost * 0.6); // how brightly the glass and brass are lit

      const d = img.data;
      for (let y = 0; y < LANTERN_H; y++)
        for (let x = 0; x < LANTERN_W; x++) {
          const ch = ART[y][x];
          const i = (y * LANTERN_W + x) * 4;
          let c: number[] | null = null;
          if (ch === 'g') {
            // glass, lit from inside
            c = GLASS;
            if (pal) {
              const dist = Math.hypot(x + 0.5 - MID, (y - (BASE - h * 0.4)) * 0.8);
              c = mix(GLASS, pal[1], Math.min(1, Math.max(0, 1 - dist / (7.5 + boost * 2)) * (0.5 + heat * 0.35)));
            }
            if (x === 4 && y >= 11 && y <= 15) c = mix(c, WHITE, 0.3); // a glint on the glass
            if (y === BASE + 1 && x >= 6 && x <= 10) c = METAL.D; // the burner
            if (y === BASE && x === 8) c = METAL.o; // its wick
            if (pal && y <= BASE && y >= GLASS_TOP) {
              const f = (BASE + 0.5 - (y + 0.5)) / h; // 0 at the wick, 1 at the tip
              if (f >= 0 && f <= 1) {
                const w = half * Math.pow(f < 0.3 ? 0.62 + (f / 0.3) * 0.38 : 1 - (f - 0.3) / 0.7, 0.85);
                const k = Math.abs(x + 0.5 - (MID + lean * Math.pow(f, 1.4))) / Math.max(0.45, w);
                if (k <= 1) {
                  const tone = k < 0.42 && f < 0.55 ? 3 : k < 0.74 && f < 0.8 ? 2 : k < 0.94 && f < 0.94 ? 1 : 0;
                  c = tone === 0 && glory ? hue(tt * 140 + y * 36) : pal[tone];
                }
              }
            }
            if (flash) c = mix(c, WHITE, 0.85);
          } else if (ch !== '.') {
            c = METAL[ch];
            // the brass catches the firelight
            if (pal && ch !== 'o') c = mix(c, pal[2], 0.12 + heat * 0.2);
          }
          if (c) {
            d[i] = c[0];
            d[i + 1] = c[1];
            d[i + 2] = c[2];
            d[i + 3] = 255;
          } else d[i + 3] = 0;
        }
      ctx.putImageData(img, 0, 0);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 70) return; // a pixel fire looks right at a low frame rate
      last = now;
      draw(now);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canvas]);

  return {
    stoke() {
      const L = live.current;
      if (L.idx < 0) return 0;
      const now = performance.now();
      const amp = Math.min(STOKE_MAX, stokeAt(L.stoke, now) + 1);
      L.stoke = { at: now, amp };
      return amp;
    },
    flare(fromIdx) {
      live.current.from = fromIdx;
      live.current.flareAt = performance.now();
    },
  };
}

/** Swing `el` back and forth from its transform-origin; harder for a bigger `amp`. */
export function swing(el: Element | null, amp: number, degrees = 7, duration = 650) {
  if (!el || reducedMotion()) return;
  const s = amp ? degrees + amp * 3 : degrees - 1;
  el.animate(
    [
      { transform: 'rotate(0deg)' },
      { transform: `rotate(${-s}deg)` },
      { transform: `rotate(${s * 0.75}deg)` },
      { transform: `rotate(${-s * 0.45}deg)` },
      { transform: `rotate(${s * 0.2}deg)` },
      { transform: 'rotate(0deg)' },
    ],
    { duration, easing: 'ease-out' },
  );
}

/** A burst of light from the lantern (an element centred with translate(-50%, -50%)). */
export function shineOut(el: Element | null, amp: number) {
  if (!el || !amp || reducedMotion()) return;
  const big = 1 + (amp - 1) * 0.35;
  el.animate(
    [
      { opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' },
      { opacity: Math.min(1, 0.7 + amp * 0.15), transform: `translate(-50%, -50%) scale(${big})`, offset: 0.12 },
      { opacity: 0, transform: `translate(-50%, -50%) scale(${big * 1.7})` },
    ],
    { duration: 1500, easing: 'ease-out' },
  );
}
