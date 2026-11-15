import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Scene, type Period } from '../scene/engine';
import { stageFor, VERSES } from '../lib/growth';

export interface HeroHandle {
  celebrate(o: { points: number; stageName?: string; arrivals?: string[] }): void;
}

interface Props {
  points: number;
  seed: string;
  hour?: number;
  owner?: string; // set when visiting someone else's tree
  onBack?: () => void;
  onPeriod(p: Period): void;
  ref?: Ref<HeroHandle>;
}

const GREETING: Record<Period, string> = {
  dawn: 'Good morning',
  day: 'Good day',
  dusk: 'Good evening',
  night: 'Good night',
};

export default function Hero({ points, seed, hour, owner, onBack, onPeriod, ref }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const uid = useRef(0);
  const verseIdx = useRef(Math.floor(Math.random() * VERSES.length));
  const [period, setPeriod] = useState<Period>('day');
  const [floaters, setFloaters] = useState<{ id: number; text: string }[]>([]);
  const [banner, setBanner] = useState<{ key: number; title: string; lines: string[] } | null>(null);
  const [verse, setVerse] = useState<{ key: number; ref: string; text: string } | null>(null);

  useEffect(() => {
    const s = new Scene(canvasRef.current!, { points, seed, hour });
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
    if (scene.current) scene.current.state = { points, seed, hour };
  }, [points, seed, hour]);

  useImperativeHandle(ref, () => ({
    celebrate({ points: p, stageName, arrivals }) {
      scene.current?.burst(stageName ? 80 : 30);
      const id = ++uid.current;
      setFloaters((f) => [...f, { id, text: `+${p}` }]);
      setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1800);
      if (stageName) {
        setBanner({ key: id, title: stageName, lines: (arrivals ?? []).map((a) => `${a} moved in!`) });
        setTimeout(() => setBanner((b) => (b?.key === id ? null : b)), 4500);
      }
    },
  }));

  useEffect(() => {
    if (!verse) return;
    const t = setTimeout(() => setVerse(null), 9000);
    return () => clearTimeout(t);
  }, [verse]);

  function shake() {
    scene.current?.rustle();
    const v = VERSES[verseIdx.current++ % VERSES.length];
    setVerse({ ...v, key: verseIdx.current });
  }

  const info = stageFor(points);

  return (
    <section className={`hero hero-${period}`} ref={boxRef} aria-label="Your tree">
      <canvas
        ref={canvasRef}
        className="hero-canvas"
        role="button"
        tabIndex={0}
        aria-label={`${owner ? `${owner}'s` : 'Your'} tree: ${info.stage.name}. Press to shake the branches and read a verse.`}
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
              ← My tree
            </button>
            <span>
              Visiting <strong>{owner}</strong>’s tree
            </span>
          </div>
        ) : (
          <div className="hero-chip">{GREETING[period]}</div>
        )}
      </div>

      <div className="hero-hud">
        <div className="hud-row">
          <h2 className="hud-stage">{info.stage.name}</h2>
          <span className="hud-points">{points} growth</span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(info.progress * 100)}
          aria-label="Progress to next stage"
        >
          <div className="progress-fill" style={{ width: `${info.progress * 100}%` }} />
        </div>
        <p className="hud-next">
          {info.next ? (
            <>
              {info.toNext} more to <strong>{info.next.name}</strong>
            </>
          ) : (
            'Fully grown — keep tending it.'
          )}
        </p>
      </div>

      {floaters.map((f) => (
        <div key={f.id} className="float-points">
          {f.text}
        </div>
      ))}
      {banner && (
        <div key={banner.key} className="levelup" role="status">
          <span className="levelup-kicker">The tree grew!</span>
          <span className="levelup-name">{banner.title}</span>
          {banner.lines.map((l) => (
            <span key={l} className="levelup-kicker">
              {l}
            </span>
          ))}
        </div>
      )}
      {verse && (
        <button key={verse.key} className="verse-bubble" onClick={() => setVerse(null)}>
          <span>“{verse.text}”</span>
          <span className="verse-ref">{verse.ref} (KJV)</span>
        </button>
      )}
    </section>
  );
}
