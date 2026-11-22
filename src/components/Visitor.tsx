// Jesus visiting your tree (src/lib/visit.ts says when), at any size of tree. He appears in a
// column of light beside it and walks about on the grass: now and then He stops, and He goes
// back to the tree to rest His hand on it (bending down to a little one), and light flows from
// His palm up into it. When you save a note while He's there it grows 3×: He raises His hand
// to bless it, then goes. Drawn like the lamp post: a small pixel canvas on the hero's ground.
// What's happening shows in a small chip in the hero's corner (VisitChip), not over the tree.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import { VISIT_MULTIPLIER } from '../lib/visit';
import type { Trunk } from '../scene/engine';
import { BODY_X, drawJesus, JESUS_H, JESUS_W, PALM, type Frame } from './jesus';
import './visitor.css';

const TEXT = {
  en: {
    label: 'Jesus is visiting your tree',
    here: `Jesus is visiting · notes grow ${VISIT_MULTIPLIER}×`,
    blessed: `Note blessed: ${VISIT_MULTIPLIER}× growth!`,
    composer: `Jesus is visiting · ${VISIT_MULTIPLIER}× growth`,
    times: (n: number) => `+${n} × ${VISIT_MULTIPLIER}`,
    capped: `Your note was saved, but the ${VISIT_MULTIPLIER}× growth needs a database update (supabase/migrations/20261122000002_blessed_notes.sql) — ask the admin to run it.`,
  },
  tl: {
    label: 'Binibisita ni Hesus ang puno mo',
    here: `Narito si Hesus · ${VISIT_MULTIPLIER}× ang paglago`,
    blessed: `Pinagpala ang tala: ${VISIT_MULTIPLIER}× paglago!`,
    composer: `Narito si Hesus · ${VISIT_MULTIPLIER}× na paglago`,
    times: (n: number) => `+${n} × ${VISIT_MULTIPLIER}`,
    capped: `Na-save ang tala mo, pero kailangan ng update sa database ang ${VISIT_MULTIPLIER}× na paglago (supabase/migrations/20261122000002_blessed_notes.sql) — pakisabi sa admin.`,
  },
} satisfies Record<Lang, unknown>;

export const useVisitText = () => TEXT[useLang()];

/** In the note form while He's visiting: the growth the note will get, ×3. */
export function BlessedTag({ points }: { points: number }) {
  const v = useVisitText();
  return (
    <span className="tag blessed-tag">
      <i className="blessed-halo" aria-hidden="true" />
      {v.composer}
      {points > 0 && <b>{v.times(points)}</b>}
    </span>
  );
}

export type ChipKind = 'here' | 'blessed';

/** In the hero's corner, in place of the greeting, while He's visiting. */
export function VisitChip({ kind }: { kind: ChipKind }) {
  const v = useVisitText();
  return (
    <div key={kind} className={`hero-chip visit-chip is-${kind}`} role="status">
      <i className="blessed-halo" aria-hidden="true" />
      {kind === 'blessed' ? v.blessed : v.here}
    </div>
  );
}

type Phase = 'away' | 'arrive' | 'here' | 'bless' | 'leave';
// how long each step lasts before the next (ms)
const NEXT: Partial<Record<Phase, [Phase, number]>> = { arrive: ['here', 1500], bless: ['leave', 4200], leave: ['away', 1700] };
const PULSE_MS = 3200; // light flows from His hand into the tree this often

// what He's doing while He's here
type Act = 'walk' | 'pause' | 'touch' | 'wave';
interface Walk {
  x: number; // the middle of His body, CSS px from the hero's left (NaN: not placed yet)
  facing: 1 | -1; // 1: right
  act: Act;
  until: number; // when this act is over (ms, performance.now)
  target: number; // where He's walking to
  toTree: 0 | 1 | -1; // walking to the tree, to touch it from its left (-1) or right (1) side
  side: 1 | -1; // which side of the tree He touches it from
  stride: number; // distance walked, for the steps
  blinkAt: number;
  pulseAt: number;
  first: boolean; // just arrived: He goes to the tree first
  away: number; // how far from the tree He appears
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Props {
  /** The visit going on (its start time), or null when there's none. */
  visit: number | null;
  /** Goes up by one each time a note is blessed: He blesses it, then leaves. */
  blessed: number;
  /** Where the trunk is now, from the scene. */
  trunk(): Trunk | null;
  /** Light flowing from His hand into the tree (sparkles in the scene). */
  onTouch?(): void;
  /** What the corner chip should say (null: the greeting again). */
  onChip?(kind: ChipKind | null): void;
}

export default function Visitor({ visit, blessed, trunk, onTouch, onChip }: Props) {
  const v = useVisitText();
  const button = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>(visit != null ? 'arrive' : 'away');
  const lastBlessed = useRef(blessed);
  const walk = useRef<Walk>({ x: NaN, facing: 1, act: 'pause', until: 0, target: 0, toTree: 0, side: -1, stride: 0, blinkAt: 0, pulseAt: 0, first: true, away: 0 });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const present = phase === 'arrive' || phase === 'here';

  // arrive, bless, leave
  useEffect(() => {
    if (blessed !== lastBlessed.current) {
      lastBlessed.current = blessed;
      // the note that ended the visit was written while He was here
      if (present) return setPhase('bless');
    }
    if (visit != null && (phase === 'away' || phase === 'leave')) setPhase('arrive');
    else if (visit == null && present) setPhase('leave'); // the visit's time is up
  }, [visit, blessed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const next = NEXT[phase];
    if (!next) return;
    const timer = setTimeout(() => setPhase((p) => (p === phase ? next[0] : p)), next[1]);
    return () => clearTimeout(timer);
  }, [phase]);

  // the corner chip
  useEffect(() => {
    if (phase === 'arrive' || phase === 'here') onChip?.('here');
    else if (phase === 'bless') onChip?.('blessed');
    else if (phase === 'away') onChip?.(null);
  }, [phase, onChip]);
  useEffect(() => () => onChip?.(null), [onChip]);

  // He moves about: drawn straight onto the canvas and the button, a few times a second
  useEffect(() => {
    if (phase === 'away') return;
    const w = walk.current;
    if (phase === 'arrive') w.x = NaN; // a new visit: appear somewhere new
    let raf = 0;
    let last = performance.now();
    let drawn = '';
    let wasTouching = false;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      if (dt < 0.033) return;
      last = now;
      const t = trunk();
      const el = button.current, c = canvas.current;
      if (!t || !el || !c) return;
      const ph = phaseRef.current;
      const px = matchMedia('(max-width: 860px)').matches ? 2 : 3; // as --px in visitor.css
      // a little tree (shorter than His hand is high): He bends down to it
      const reach: 'touch' | 'low' = t.height < (JESUS_H - 2 - PALM.touch.y) * px * 1.6 ? 'low' : 'touch';
      const palm = PALM[reach];
      const toPalm = (palm.x + 0.5 - BODY_X) * px; // from the middle of His body to His palm
      const bark = Math.max(1, t.r - px); // the palm rests a pixel into the bark
      const touchAt = (side: 1 | -1) => (side < 0 ? t.x - bark - toPalm : t.x + bark + toPalm);
      // the ground He walks on: clear of the cards and the lamp post
      const lo = t.left + (BODY_X + 2) * px;
      const hi = Math.max(lo, t.right - (BODY_X + 2) * px);
      const clampX = (x: number) => Math.min(hi, Math.max(lo, x));
      const wander = () => {
        // somewhere else on the grass, not just a step away
        let to = rand(lo, hi);
        for (let k = 0; k < 4 && Math.abs(to - w.x) < 30 * px; k++) to = rand(lo, hi);
        w.act = 'walk';
        w.toTree = 0;
        w.target = to;
      };
      const goToTree = () => {
        w.side = w.x < t.x ? -1 : 1;
        w.act = 'walk';
        w.toTree = w.side;
        w.target = touchAt(w.side);
      };

      if (Number.isNaN(w.x)) {
        // He appears in the light a little way from the tree, then walks to it
        w.side = Math.random() < 0.5 ? -1 : 1;
        w.away = rand(25, 45) * px;
        w.act = 'pause';
        w.until = now + 1700;
        w.first = true;
        w.blinkAt = now + rand(1500, 3000);
      }
      // until He walks off, His spot follows the tree, which settles beside the cards as the page opens
      if (w.first && w.act === 'pause') w.x = clampX(touchAt(w.side) + w.side * w.away);

      if (ph === 'here' && el.dataset.wave === '1') {
        delete el.dataset.wave;
        w.act = 'wave';
        w.until = now + 1300;
      }
      if (ph === 'here') {
        if (w.act === 'walk') {
          if (w.toTree) w.target = touchAt(w.toTree); // the tree may have grown or moved
          const speed = 14 * px; // CSS px a second
          const d = w.target - w.x;
          w.facing = d >= 0 ? 1 : -1;
          const move = Math.min(Math.abs(d), speed * dt);
          w.x += w.facing * move;
          w.stride += move / px;
          if (Math.abs(w.target - w.x) < 0.5) {
            w.x = w.target;
            if (w.toTree) {
              w.act = 'touch';
              w.facing = w.side < 0 ? 1 : -1;
              w.until = now + rand(7000, 11000);
              w.pulseAt = now + PULSE_MS * 0.4;
            } else {
              w.act = 'pause';
              w.until = now + rand(1200, 2800);
            }
          }
        } else if (w.act === 'touch') {
          w.x = touchAt(w.side);
          w.facing = w.side < 0 ? 1 : -1;
          if (now >= w.pulseAt) {
            w.pulseAt = now + PULSE_MS;
            onTouch?.();
          }
          if (now >= w.until) wander();
        } else if (now >= w.until) {
          // done pausing or waving: back to the tree, more often than not
          if (w.first || w.act === 'wave' || Math.random() < 0.6) goToTree();
          else wander();
          w.first = false;
        }
      }

      // blink now and then
      if (now >= w.blinkAt + 150) w.blinkAt = now + rand(2600, 5200);
      const blink = now >= w.blinkAt;

      const touching = ph === 'here' && w.act === 'touch';
      let frame: Frame;
      let facing = w.facing;
      if (ph === 'bless' || ph === 'leave' || (ph === 'here' && w.act === 'wave')) {
        frame = 'bless';
        facing = 1; // turned to you
      } else if (touching) frame = reach === 'low' ? (blink ? 'lowBlink' : 'low') : blink ? 'touchBlink' : 'touch';
      else if (ph === 'here' && w.act === 'walk') frame = Math.floor(w.stride / 4) % 2 ? 'walkB' : 'walkA';
      else {
        frame = blink ? 'blink' : 'idle';
        facing = 1;
      }

      const key = `${frame}|${facing}|${Math.round(w.x)}|${px}`;
      if (key === drawn) return;
      drawn = key;
      drawJesus(c, frame);
      // mirrored, the middle of His body is at JESUS_W - BODY_X across the frame
      el.style.left = `${Math.round(w.x - (facing === 1 ? BODY_X : JESUS_W - BODY_X) * px)}px`;
      el.style.transform = facing === 1 ? '' : 'scaleX(-1)';
      el.style.setProperty('--tx', String(palm.x));
      el.style.setProperty('--ty', String(palm.y));
      if (touching !== wasTouching) {
        wasTouching = touching;
        el.classList.toggle('is-touching', touching);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, trunk, onTouch]);

  if (phase === 'away') return null;
  return (
    <button
      ref={button}
      type="button"
      className={`visitor is-${phase}`}
      style={{ '--w': JESUS_W, '--h': JESUS_H, '--pulse': `${PULSE_MS}ms`, left: '-200px' } as CSSProperties}
      // pressed: He stops, turns to you and raises His hand
      onClick={() => {
        if (present && button.current) button.current.dataset.wave = '1';
      }}
      aria-label={v.label}
      title={v.label}
    >
      <span className="visitor-light" aria-hidden="true" />
      <span className="visitor-aura" aria-hidden="true" />
      <canvas ref={canvas} width={JESUS_W} height={JESUS_H} aria-hidden="true" />
      <span className="visitor-palm" aria-hidden="true" />
    </button>
  );
}
