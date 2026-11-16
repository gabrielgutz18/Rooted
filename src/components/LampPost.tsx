// The streak lamp on a post: the lantern hangs on a chain from a small wooden lamp post
// standing in the grass beside the tree (yours and your friends'). No name, no numbers: just
// the post and the fire in the streak's colour. Pressing it swings the lantern on its chain
// and stokes the fire. On your tree it flares too when a note makes the streak longer.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FLAMES, flameIndex } from '../lib/streak';
import { useT } from '../lib/i18n';
import { fireColors, fireText, LANTERN_H, LANTERN_W, shineOut, swing, useLantern, type LampFire } from './lantern';

// ---------- the post: an upside-down L of wood, 22 × 60 art pixels ----------

const POST_W = 22;
const POST_H = 60;
const HOOK_X = 4; // where the chain hangs from the arm
const HOOK_Y = 9; // the bottom of the hook
const CHAIN = 7; // links, in art pixels

const WOOD = { out: '#24160c', dark: '#56361c', mid: '#7a5030', light: '#9c6c40', grain: '#4a2c16' };
const IRON = { dark: '#2e2e36', light: '#8a8a98' };
const GRASS = ['#24502c', '#3f8a3a', '#5aa843'];

function drawPost(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, POST_W, POST_H);
  const px = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  // wood with a little grain, shaded light → dark across `t` (0…1)
  const wood = (x: number, y: number, t: number) => {
    const col = t < 0.25 ? WOOD.light : t < 0.75 ? WOOD.mid : WOOD.dark;
    px(x, y, t > 0.2 && t < 0.8 && hash(x, y) < 0.16 ? WOOD.grain : col);
  };

  // outlines first, then the wood over them
  for (let y = 0; y < POST_H - 2; y++) {
    px(14, Math.max(y, 7), WOOD.out); // left edge of the post, below the arm
    px(19, y, WOOD.out); // right edge
  }
  for (let x = 14; x <= 19; x++) px(x, 0, WOOD.out); // the post's top, above the arm
  for (let x = 1; x <= 14; x++) {
    px(x, 2, WOOD.out); // top of the arm
    px(x, 6, WOOD.out); // underside of the arm
  }
  for (let y = 2; y <= 6; y++) px(1, y, WOOD.out); // the arm's sawn end

  // the brace between post and arm, outlined
  for (let k = 0; k <= 6; k++) {
    px(13 - k, 14 - k, WOOD.out);
    px(13 - k, 11 - k, WOOD.out);
  }
  for (let k = 0; k <= 6; k++) {
    wood(13 - k, 13 - k, 0.5);
    wood(13 - k, 12 - k, 0.85);
  }

  // the post
  for (let y = 1; y < POST_H; y++) for (let x = 15; x <= 18; x++) wood(x, y, (x - 15) / 3);
  // the arm
  for (let y = 3; y <= 5; y++) for (let x = 2; x <= 14; x++) wood(x, y, (y - 3) / 2);
  px(2, 3, WOOD.mid); // the sawn end is a shade darker
  px(2, 4, WOOD.dark);
  // a knot in the post
  px(16, 30, WOOD.grain);
  px(17, 30, WOOD.out);
  px(16, 31, WOOD.out);
  px(17, 31, WOOD.grain);

  // the iron hook under the arm
  px(HOOK_X, 7, IRON.dark);
  px(HOOK_X - 1, 8, IRON.dark);
  px(HOOK_X + 1, 8, IRON.light);
  px(HOOK_X, HOOK_Y - 0, IRON.dark);

  // grass round the foot of the post
  for (const [x, h, g] of [
    [12, 3, 1],
    [13, 2, 2],
    [14, 4, 1],
    [15, 2, 0],
    [18, 3, 2],
    [19, 4, 1],
    [20, 2, 0],
    [21, 3, 1],
  ])
    for (let k = 0; k < h; k++) px(x, POST_H - 1 - k, GRASS[Math.min(2, g + (k === h - 1 ? 1 : 0))]);
}

function drawChain(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 3, CHAIN);
  // oval links seen flat, joined by links seen edge-on
  const LINK = ['.d.', 'd.l', '.d.', '.l.'];
  for (let y = 0; y < CHAIN; y++)
    [...LINK[y % LINK.length]].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'd' ? IRON.dark : IRON.light;
      ctx.fillRect(x, y, 1, 1);
    });
}

interface Props {
  streak: number;
  /** A note just made the streak longer (your own tree). */
  fire?: LampFire | null;
  /** Say what happened in a bubble over the post (when your streak card is hidden). */
  announce?: boolean;
}

export default function LampPost({ streak, fire = null, announce = false }: Props) {
  const t = useT();
  const post = useRef<HTMLCanvasElement>(null);
  const chain = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hang = useRef<HTMLSpanElement>(null);
  const shine = useRef<HTMLSpanElement>(null);
  const pool = useRef<HTMLSpanElement>(null);
  const idx = flameIndex(streak);
  const lantern = useLantern(canvas, idx);
  const [flare, setFlare] = useState<{ key: number; text: string } | null>(null);

  useEffect(() => {
    drawPost(post.current!);
    drawChain(chain.current!);
  }, []);

  // a note made the streak longer: the fire flares (and changes colour) and throws sparks
  useEffect(() => {
    if (!fire) return;
    const from = flameIndex(fire.from);
    lantern.flare(from);
    setFlare({ key: fire.key, text: fireText(t, from, idx, streak) });
    const timer = setTimeout(() => setFlare((f) => (f?.key === fire.key ? null : f)), 4200);
    return () => clearTimeout(timer);
    // only a new fire starts a flare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire]);

  // pressed: the lantern swings on its chain, the fire leaps up and lights the ground
  const poke = () => {
    const amp = lantern.stoke();
    swing(hang.current, amp, 9, 1100);
    shineOut(shine.current, amp);
    shineOut(pool.current, amp);
  };

  const cols = fireColors(idx);
  const flameName = idx >= 0 ? t.flames[FLAMES[idx].id] : null;
  const style = {
    '--post-w': POST_W,
    '--post-h': POST_H,
    '--hook-x': HOOK_X + 0.5,
    '--hook-y': HOOK_Y,
    '--chain': CHAIN,
    ...(cols ? { '--flame': cols[1], '--flame-hi': cols[2] } : {}),
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`lamp-post ${idx < 0 ? 'is-out' : ''}`}
      style={style}
      onClick={poke}
      aria-label={t.postLabel(flameName)}
      title={idx < 0 ? t.lampShake : t.lampStoke}
    >
      <span ref={pool} className="post-pool" aria-hidden="true" />
      <canvas ref={post} className="post-wood" width={POST_W} height={POST_H} aria-hidden="true" />
      <span ref={hang} className="post-hang" aria-hidden="true">
        <canvas ref={chain} className="post-chain" width={3} height={CHAIN} />
        <span className="post-lantern">
          <span ref={shine} className="lamp-shine" />
          <canvas ref={canvas} width={LANTERN_W} height={LANTERN_H} />
          {flare && (
            <span key={flare.key} className="lamp-sparks">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
          )}
        </span>
      </span>
      {flare && announce && (
        <span key={flare.key} className="lamp-pop post-pop" role="status">
          {flare.text}
        </span>
      )}
    </button>
  );
}
