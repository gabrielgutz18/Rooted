// Menu → About the developer, at /developer: who made Rooted, and why.
// It opens for anyone, signed in or not, and straight from a shared link (src/lib/route.ts).

import { useEffect, useRef } from 'react';
import { useT } from '../lib/i18n';
import { goBack } from '../lib/route';
import { MADE_WITH, type Tool } from '../lib/madeWith';
import { Scene } from '../scene/engine';
import LangSwitch from '../components/LangSwitch';
import myIcon from '../assets/myicon.png';

const PORTFOLIO = 'https://gabriel-port-zeta.vercel.app/';

export default function Developer() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // A grown pine behind the page: its native land in the scene is the Philippines.
  // On a wide screen the card moves aside and the tree stands in the room beside it.
  useEffect(() => {
    const s = new Scene(canvasRef.current!, { points: 2600, seed: 'developer', species: 'pine' });
    const fit = () => {
      s.resize(window.innerWidth, window.innerHeight);
      const right = cardRef.current!.getBoundingClientRect().right;
      s.setFreeArea(window.innerWidth - right >= 360 ? { left: right + 16, right: window.innerWidth, top: 0 } : null);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      s.destroy();
    };
  }, []);

  useEffect(() => {
    const before = document.title;
    document.title = t.dev.pageTitle;
    return () => {
      document.title = before;
    };
  }, [t.dev.pageTitle]);

  // a new page: start reading (and screen readers announce it) from the title
  useEffect(() => titleRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="dev">
      <canvas ref={canvasRef} className="auth-bg" aria-hidden="true" />
      <main ref={cardRef} className="px-panel dev-card" aria-labelledby="dev-title">
        <div className="dev-top">
          <button type="button" className="btn btn-small" onClick={goBack}>
            ← {t.dev.back}
          </button>
          <LangSwitch />
        </div>
        <header className="dev-head">
          <img className="dev-icon" src={myIcon} alt={t.dev.iconAlt} width={96} height={96} />
          <div>
            <span className="dev-kicker">{t.dev.kicker}</span>
            <h1 id="dev-title" ref={titleRef} tabIndex={-1} className="dev-title">
              {t.dev.title}
            </h1>
          </div>
        </header>
        {t.dev.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <p className="dev-signature">{t.dev.signature}</p>
        <a className="btn btn-primary dev-portfolio" href={PORTFOLIO} target="_blank" rel="noopener noreferrer">
          {t.dev.portfolio}
        </a>

        <section className="dev-made" aria-labelledby="dev-made-title">
          <h2 id="dev-made-title" className="dev-kicker">
            {t.dev.madeWith}
          </h2>
          <ul className="dev-tools">
            {MADE_WITH.map((tool) => (
              <li key={tool.name} className="dev-tool">
                <PixelLogo tool={tool} />
                {tool.name}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

/** A 16 × 16 pixel logo on a dark tile, one rect per run of same-coloured pixels. */
function PixelLogo({ tool }: { tool: Tool }) {
  const rects = [];
  for (let y = 0; y < tool.rows.length; y++) {
    const row = tool.rows[y];
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let w = 1;
      while (row[x + w] === c) w++;
      if (c !== '.') rects.push(<rect key={`${x},${y}`} x={x} y={y} width={w} height={1} fill={tool.pal[c]} />);
      x += w;
    }
  }
  return (
    <svg viewBox="-1 -1 18 18" width={54} height={54} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}
