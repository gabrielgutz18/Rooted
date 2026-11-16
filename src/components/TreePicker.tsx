import { useEffect, useRef } from 'react';
import { Scene } from '../scene/engine';
import { SPECIES, type Species } from '../scene/species';
import { useT } from '../lib/i18n';

interface Props {
  current: string | null | undefined;
  first: boolean; // shown on a first visit, before a tree was ever chosen
  hour?: number;
  onPick(id: string): void;
  onClose(): void;
}

/** Choose which tree your notes grow. Each card is a small living scene. */
export default function TreePicker({ current, first, hour, onPick, onClose }: Props) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div ref={box} className="px-panel picker" role="dialog" aria-modal="true" aria-labelledby="picker-title" tabIndex={-1}>
        <div className="composer-head">
          <h2 id="picker-title" className="panel-title">
            {first ? t.pickFirstTitle : t.pickTitle}
          </h2>
          <button className="btn btn-small" onClick={onClose}>
            {first ? t.keepOak : t.close}
          </button>
        </div>
        <p className="muted">{first ? t.pickFirstBlurb : t.pickBlurb}</p>
        <div className="picker-grid">
          {SPECIES.map((s) => (
            <TreeCard key={s.id} species={s} hour={hour} selected={(current ?? 'oak') === s.id} onPick={() => onPick(s.id)} />
          ))}
        </div>
      </div>
    </>
  );
}

function TreeCard({ species, hour, selected, onPick }: { species: Species; hour?: number; selected: boolean; onPick(): void }) {
  const t = useT();
  const view = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const s = new Scene(canvas.current!, { points: 2600, seed: `preview-${species.id}`, species: species.id, hour }, { pixel: 1.6, animals: false, tight: true });
    const ro = new ResizeObserver(([e]) => s.resize(e.contentRect.width, e.contentRect.height));
    ro.observe(view.current!);
    // only the cards in view keep moving
    const io = new IntersectionObserver(([e]) => s.setActive(e.isIntersecting), { rootMargin: '80px' });
    io.observe(view.current!);
    return () => {
      ro.disconnect();
      io.disconnect();
      s.destroy();
    };
  }, [species.id, hour]);

  return (
    <button className={`tree-card ${selected ? 'is-on' : ''}`} aria-pressed={selected} onClick={onPick}>
      <div className="tree-card-view" ref={view}>
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      <span className="tree-card-name">
        {t.species[species.id].name}
        {selected && <span className="tag">{t.growing}</span>}
      </span>
      <span className="tree-card-blurb">{t.species[species.id].blurb}</span>
      <span className="tree-card-land">{t.nativeTo(t.species[species.id].land)}</span>
    </button>
  );
}
