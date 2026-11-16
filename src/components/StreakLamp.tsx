// Your daily-streak lamp: the pixel lantern on a scrap of paper in the corner of your tree.
// It flares up when the streak grows, and pressing it swings the lantern and stokes the fire.
// The card can be hidden (×); the same lantern also hangs on a lamp post by the tree (LampPost.tsx).

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FLAMES, flameIndex } from '../lib/streak';
import { useT } from '../lib/i18n';
import { fireColors, fireText, LANTERN_H, LANTERN_W, shineOut, swing, useLantern, type LampFire } from './lantern';

export type { LampFire } from './lantern';

interface Props {
  streak: number;
  todayDone: boolean; // a note was written today
  fire: LampFire | null;
  onHide(): void;
}

export default function StreakLamp({ streak, todayDone, fire, onHide }: Props) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const art = useRef<HTMLButtonElement>(null);
  const shine = useRef<HTMLSpanElement>(null);
  const idx = flameIndex(streak);
  const lantern = useLantern(canvas, idx);
  const [pop, setPop] = useState<{ key: number; text: string } | null>(null);

  // pressed: the lantern swings on its ring, the fire leaps up and light bursts out
  const poke = () => {
    const amp = lantern.stoke();
    swing(art.current, amp);
    shineOut(shine.current, amp);
  };

  // a note made the streak longer: flare up, and change colour if it reached a new one
  useEffect(() => {
    if (!fire) return;
    const from = flameIndex(fire.from);
    lantern.flare(from);
    setPop({ key: fire.key, text: fireText(t, from, idx, streak) });
    const timer = setTimeout(() => setPop((p) => (p?.key === fire.key ? null : p)), 4200);
    return () => clearTimeout(timer);
    // only a new fire starts a flare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire]);

  const cols = fireColors(idx);
  const flameName = idx >= 0 ? t.flames[FLAMES[idx].id] : null;
  const next = idx >= 0 && idx < FLAMES.length - 1 ? FLAMES[idx + 1].min : null;
  const sub = idx < 0 ? t.lampOut : !todayDone ? t.keepLit : t.flameLine(flameName!, next);
  const style = cols ? ({ '--flame': cols[1], '--flame-hi': cols[2] } as CSSProperties) : undefined;

  return (
    <div className={`lamp-card ${idx < 0 ? 'is-out' : ''} ${pop ? 'is-firing' : ''}`} style={style} role="group" aria-label={t.lampLabel(streak, flameName)}>
      <button ref={art} type="button" className="lamp-art" onClick={poke} aria-label={idx < 0 ? t.lampShake : t.lampStoke} title={idx < 0 ? t.lampShake : t.lampStoke}>
        <span ref={shine} className="lamp-shine" aria-hidden="true" />
        <canvas ref={canvas} width={LANTERN_W} height={LANTERN_H} aria-hidden="true" />
        {pop && (
          <span key={pop.key} className="lamp-sparks" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </span>
        )}
      </button>
      <button type="button" className="lamp-hide" onClick={onHide} aria-label={t.hideStreak} title={t.hideStreak}>
        ×
      </button>
      <div className="lamp-text">
        <span className="lamp-kicker">{t.yourStreak}</span>
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
