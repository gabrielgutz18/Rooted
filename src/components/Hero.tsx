import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Scene, type Period } from '../scene/engine';
import { stageFor, VERSES } from '../lib/growth';
import { useT } from '../lib/i18n';
import { barenessFor } from '../lib/streak';
import StreakLamp, { type LampFire } from './StreakLamp';

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
  const bare = barenessFor(idle);

  useEffect(() => {
    const s = new Scene(canvasRef.current!, { points, seed, species, hour, bare });
    s.onPeriod = (p) => {
      setPeriod(p);
      onPeriod(p);
    };
    scene.current = s;
    const ro = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
    ro.observe(boxRef.current!);
    return () => {
      ro.disconnect();
      s.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scene.current) scene.current.state = { points, seed, species, hour, bare };
  }, [points, seed, species, hour, bare]);

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
    <section className={`hero hero-${period}`} ref={boxRef} aria-label={t.yourTree}>
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

      {streak !== undefined && <StreakLamp key={seed} streak={streak} owner={owner} todayDone={todayDone} fire={owner ? null : fire} />}

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
