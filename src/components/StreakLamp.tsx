// The daily-streak lamp: a pixel lantern on a scrap of paper, with a fire inside that
// changes colour at 10, 20, 30, 50, 100 and 200 days. It flares up when the streak grows,
// and pressing it swings the lantern and stokes the fire so it blazes and shines.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FLAMES, flameIndex, type FlameId } from '../lib/streak';
import { useT } from '../lib/i18n';

/** Sent when a note just made the streak longer. */
export interface LampFire {
  key: number;
  from: number; // the streak before the note
}

interface Props {
  streak: number;
  owner?: string; // set when it's a friend's lamp
  todayDone: boolean; // a note was written today
  fire: LampFire | null;
}

// [edge, body, bright, core] for each fire
const FIRE: Record<FlameId, [string, string, string, string]> = {
  ember: ['#a2300e', '#ea5a1c', '#ffa830', '#ffe88e'],
  gold: ['#8e5c06', '#e8a818', '#ffd83c', '#fff8cc'],
  emerald: ['#0e5e2c', '#22aa4c', '#70e872', '#e2ffcc'],
  sky: ['#0a5c7c', '#1ab2da', '#6ce4f8', '#e6fcff'],
  sapphire: ['#16287c', '#2c5cea', '#6c9eff', '#dee9ff'],
  violet: ['#4c1478', '#9c3ce2', '#d27cff', '#f7e2ff'],
  glory: ['#b8a050', '#f2e4a8', '#fffbea', '#ffffff'],
};

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
const W = 17;
const H = ART.length;
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

export default function StreakLamp({ streak, owner, todayDone, fire }: Props) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const idx = flameIndex(streak);
  const [pop, setPop] = useState<{ key: number; text: string } | null>(null);
  const live = useRef({ idx, from: idx, flareAt: -1e9 });
  live.current.idx = idx;
  const art = useRef<HTMLButtonElement>(null);
  const shine = useRef<HTMLSpanElement>(null);
  const stoke = useRef({ at: -1e9, amp: 0 });

  // pressed: the lantern swings on its ring, the fire leaps up and light bursts out
  const poke = () => {
    const now = performance.now();
    const lit = live.current.idx >= 0;
    const amp = Math.min(STOKE_MAX, stokeAt(stoke.current, now) + 1);
    if (lit) stoke.current = { at: now, amp };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const swing = lit ? 7 + amp * 3 : 6; // degrees; harder with each quick press
    art.current?.animate(
      [
        { transform: 'rotate(0deg)' },
        { transform: `rotate(${-swing}deg)` },
        { transform: `rotate(${swing * 0.75}deg)` },
        { transform: `rotate(${-swing * 0.45}deg)` },
        { transform: `rotate(${swing * 0.2}deg)` },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 650, easing: 'ease-out' },
    );
    if (!lit) return;
    const big = 1 + (amp - 1) * 0.35;
    shine.current?.animate(
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' },
        { opacity: Math.min(1, 0.7 + amp * 0.15), transform: `translate(-50%, -50%) scale(${big})`, offset: 0.12 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${big * 1.7})` },
      ],
      { duration: 1500, easing: 'ease-out' },
    );
  };

  // a note made the streak longer: flare up, and change colour if it reached a new one
  useEffect(() => {
    if (!fire) return;
    const from = flameIndex(fire.from);
    live.current.from = from;
    live.current.flareAt = performance.now();
    const text = from < 0 ? t.lampLit : from !== live.current.idx ? t.newFlame(t.flames[FLAMES[live.current.idx].id]) : t.streak(streak);
    setPop({ key: fire.key, text });
    const timer = setTimeout(() => setPop((p) => (p?.key === fire.key ? null : p)), 4200);
    return () => clearTimeout(timer);
    // only a new fire starts a flare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire]);

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, last = 0;

    const draw = (now: number) => {
      const L = live.current;
      const since = now - L.flareAt;
      const flare = reduced ? 0 : Math.max(0, 1 - since / FLARE_MS);
      const boost = stokeAt(stoke.current, now); // from presses
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
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const ch = ART[y][x];
          const i = (y * W + x) * 4;
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
  }, []);

  const fireCols = idx >= 0 ? FIRE[FLAMES[idx].id] : null;
  const flameName = idx >= 0 ? t.flames[FLAMES[idx].id] : null;
  const next = idx >= 0 && idx < FLAMES.length - 1 ? FLAMES[idx + 1].min : null;
  const sub =
    idx < 0 ? (owner ? t.lampOutTheirs : t.lampOut) : !owner && !todayDone ? t.keepLit : t.flameLine(flameName!, next);
  const style = fireCols ? ({ '--flame': fireCols[1], '--flame-hi': fireCols[2] } as CSSProperties) : undefined;

  return (
    <div className={`lamp-card ${idx < 0 ? 'is-out' : ''} ${pop ? 'is-firing' : ''}`} style={style} role="group" aria-label={t.lampLabel(streak, flameName)}>
      <button ref={art} type="button" className="lamp-art" onClick={poke} aria-label={idx < 0 ? t.lampShake : t.lampStoke} title={idx < 0 ? t.lampShake : t.lampStoke}>
        <span ref={shine} className="lamp-shine" aria-hidden="true" />
        <canvas ref={canvas} width={W} height={H} aria-hidden="true" />
        {pop && (
          <span key={pop.key} className="lamp-sparks" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </span>
        )}
      </button>
      <div className="lamp-text">
        <span className="lamp-kicker">{owner ? t.theirStreak(owner) : t.yourStreak}</span>
        <span key={streak} className="lamp-count">
          {t.streakDays(streak)}
        </span>
        <span className="lamp-sub">{sub}</span>
      </div>
      {pop && (
        <span key={pop.key} className="lamp-pop" role="status">
          {pop.text}
        </span>
      )}
    </div>
  );
}
