import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { Scene, type FreeArea, type Period } from '../scene/engine';
import { stageFor, VERSES } from '../lib/growth';
import { useT } from '../lib/i18n';
import { barenessFor, flameIndex } from '../lib/streak';
import StreakLamp, { type LampFire } from './StreakLamp';
import LampPost from './LampPost';
import { fireColors } from './lantern';

// Whether you've hidden the streak card in the corner (the lamp post stays). Per browser.
const CARD_KEY = 'rooted.streakCard';
function cardHiddenAtStart(): boolean {
  try {
    return localStorage.getItem(CARD_KEY) === 'hidden';
  } catch {
    return false; // blocked storage: the card shows
  }
}

/**
 * The space the tree can fill without the cards or the lamp post covering it. Things low down
 * (the stage card on a wide screen, the lamp post) narrow it from the sides; cards up top (the
 * stage card on a phone) push the tree's crown down, if they sit over the middle of that space.
 */
function freeAreaIn(box: HTMLElement): FreeArea {
  const b = box.getBoundingClientRect();
  const gap = 6;
  const rel = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { l: r.left - b.left, r: r.right - b.left, t: r.top - b.top, btm: r.bottom - b.top, w: r.width };
  };
  const cards = [...box.querySelectorAll('.hero-hud, .lamp-card, .streak-show')].map(rel).filter((r) => r.w > 0);
  const post = [...box.querySelectorAll('.lamp-post .post-wood, .lamp-post .post-lantern')].map(rel).filter((r) => r.w > 0);
  const low = cards.filter((r) => r.btm > b.height * 0.45);
  const high = cards.filter((r) => r.btm <= b.height * 0.45);

  let left = 0, right = b.width, top = 0;
  for (const r of low)
    if ((r.l + r.r) / 2 < b.width / 2) left = Math.max(left, r.r + gap);
    else right = Math.min(right, r.l - gap);
  // the lantern swings on its chain when pressed, so the leaves keep well clear of the post
  for (const r of post)
    if ((r.l + r.r) / 2 < b.width / 2) left = Math.max(left, r.r + gap + r.w * 0.6);
    else right = Math.min(right, r.l - gap - r.w * 0.6);
  const mid = (left + right) / 2, reach = (right - left) * 0.2;
  for (const r of high) if (r.r > mid - reach && r.l < mid + reach) top = Math.max(top, r.btm + gap);
  return { left, right, top };
}

export interface HeroHandle {
  /**
   * stage: the stage just reached, if any; arrivals: the stages whose animals just moved in;
   * streakFrom: the streak before this note, when the note made it longer.
   */
  celebrate(o: { points: number; stage?: number; arrivals?: number[]; streakFrom?: number }): void;
  sparkle(): void;
}

interface Props {
  points: number;
  seed: string;
  species?: string;
  hour?: number;
  owner?: string; // set when visiting someone else's tree
  /** Days in a row with a note; undefined while it isn't known yet (the lamp waits). */
  streak?: number;
  todayDone: boolean;
  /** Whole days since the last note (null: never wrote one). The leaves fall after a while. */
  idle: number | null;
  onBack?: () => void;
  onPeriod(p: Period): void;
  ref?: Ref<HeroHandle>;
}

export default function Hero({ points, seed, species, hour, owner, streak, todayDone, idle, onBack, onPeriod, ref }: Props) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const uid = useRef(0);
  const verseIdx = useRef(Math.floor(Math.random() * VERSES.length));
  const [period, setPeriod] = useState<Period>('day');
  const [floaters, setFloaters] = useState<{ id: number; text: string }[]>([]);
  // Kept as numbers so they show in whichever language is chosen.
  const [banner, setBanner] = useState<{ key: number; stage: number; arrivals: number[] } | null>(null);
  const [verse, setVerse] = useState<{ key: number; index: number } | null>(null);
  const [fire, setFire] = useState<LampFire | null>(null);
  const [cardHidden, setCardHidden] = useState(cardHiddenAtStart);
  const bare = barenessFor(idle);

  function hideCard(hidden: boolean) {
    setCardHidden(hidden);
    try {
      if (hidden) localStorage.setItem(CARD_KEY, 'hidden');
      else localStorage.removeItem(CARD_KEY);
    } catch {
      // private mode: the choice lasts until the page closes
    }
  }

  useEffect(() => {
    const s = new Scene(canvasRef.current!, { points, seed, species, hour, bare });
    s.onPeriod = (p) => {
      setPeriod(p);
      onPeriod(p);
    };
    scene.current = s;
    const box = boxRef.current!;
    const ro = new ResizeObserver(() => {
      s.resize(box.clientWidth, box.clientHeight);
      s.setFreeArea(freeAreaIn(box));
    });
    ro.observe(box);
    ro.observe(box.querySelector('.hero-hud')!); // it grows when a line is added
    return () => {
      ro.disconnect();
      s.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scene.current) scene.current.state = { points, seed, species, hour, bare };
  }, [points, seed, species, hour, bare]);

  // the cards change: showing or hiding the streak card, visiting a friend
  useEffect(() => {
    if (scene.current && boxRef.current) scene.current.setFreeArea(freeAreaIn(boxRef.current));
  }, [cardHidden, owner, streak]);

  useImperativeHandle(ref, () => ({
    celebrate({ points: p, stage, arrivals, streakFrom }) {
      scene.current?.burst(stage != null ? 80 : 30);
      const id = ++uid.current;
      if (streakFrom != null) {
        setFire({ key: id, from: streakFrom });
        setTimeout(() => setFire((f) => (f?.key === id ? null : f)), 4500); // don't replay it when the lamp remounts
      }
      setFloaters((f) => [...f, { id, text: `+${p}` }]);
      setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1800);
      if (stage != null) {
        setBanner({ key: id, stage, arrivals: arrivals ?? [] });
        setTimeout(() => setBanner((b) => (b?.key === id ? null : b)), 4500);
      }
    },
    sparkle() {
      scene.current?.burst(50);
    },
  }));

  useEffect(() => {
    if (!verse) return;
    const t = setTimeout(() => setVerse(null), 9000);
    return () => clearTimeout(t);
  }, [verse]);

  function shake() {
    scene.current?.rustle();
    const index = verseIdx.current++ % VERSES.length;
    setVerse({ index, key: verseIdx.current });
  }

  const info = stageFor(points);
  const shown = verse && t.verses[verse.index];

  return (
    <section
      className={`hero hero-${period} ${owner ? 'is-visiting' : ''} ${!owner && cardHidden ? 'card-hidden' : ''}`}
      ref={boxRef}
      aria-label={t.yourTree}
    >
      <canvas
        ref={canvasRef}
        className="hero-canvas"
        role="button"
        tabIndex={0}
        aria-label={t.treeLabel(owner, t.stages[info.index])}
        onClick={shake}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            shake();
          }
        }}
      />

      <div className="hero-top">
        {owner ? (
          <div className="hero-chip">
            <button className="btn btn-small" onClick={onBack}>
              {t.backToMine}
            </button>
            <span>{t.visiting(owner)}</span>
          </div>
        ) : (
          <div className="hero-chip">{t.greeting[period]}</div>
        )}
      </div>

      <div className="hero-hud">
        <div className="hud-row">
          <h2 className="hud-stage">{t.stages[info.index]}</h2>
          <span className="hud-points">{t.growthPoints(points)}</span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(info.progress * 100)}
          aria-label={t.toNextLabel}
        >
          <div className="progress-fill" style={{ width: `${info.progress * 100}%` }} />
        </div>
        <p className="hud-next">{info.next ? t.toNext(info.toNext, t.stages[info.index + 1]) : t.fullyGrown}</p>
        {bare > 0 && idle != null && <p className="hud-wilt">{owner ? t.wiltingTheirs(owner) : t.wilting(idle)}</p>}
      </div>

      {/* the lamp hangs on a post beside every tree; on your own there's also the streak card,
          which you can hide (a small chip brings it back) */}
      {streak !== undefined && <LampPost key={`post-${seed}`} streak={streak} fire={owner ? null : fire} announce={!owner && cardHidden} />}
      {streak !== undefined &&
        !owner &&
        (cardHidden ? (
          <button
            type="button"
            className="streak-show"
            onClick={() => hideCard(false)}
            aria-label={t.showStreak}
            title={t.showStreak}
            style={{ '--flame': fireColors(flameIndex(streak))?.[1] ?? '#6a5a48' } as CSSProperties}
          >
            <span className="streak-show-dot" aria-hidden="true" />
            {t.streakDays(streak)}
          </button>
        ) : (
          <StreakLamp key={`card-${seed}`} streak={streak} todayDone={todayDone} fire={fire} onHide={() => hideCard(true)} />
        ))}

      {floaters.map((f) => (
        <div key={f.id} className="float-points">
          {f.text}
        </div>
      ))}
      {banner && (
        <div key={banner.key} className="levelup" role="status">
          <span className="levelup-kicker">{t.treeGrew}</span>
          <span className="levelup-name">{t.stages[banner.stage]}</span>
          {banner.arrivals.map((a) => (
            <span key={a} className="levelup-kicker">
              {t.arrived[a]}
            </span>
          ))}
        </div>
      )}
      {verse && shown && (
        <button key={verse.key} className="verse-bubble" onClick={() => setVerse(null)}>
          <span>“{shown.text}”</span>
          <span className="verse-ref">
            {shown.ref} ({t.bible})
          </span>
        </button>
      )}
    </section>
  );
}
