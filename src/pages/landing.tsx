import { useEffect, useRef, useState } from 'react';
import { Scene, type FreeArea } from '../scene/engine';
import { SPECIES } from '../scene/species';
import { stageFor } from '../lib/growth';
import { useInstall } from '../lib/install';
import { useT } from '../lib/i18n';
import LangSwitch from '../components/LangSwitch';
import InstallDialog from '../components/InstallDialog';

// The tree on the landing page grows a stage at a time, the way notes grow yours.
const STEPS = [60, 250, 700, 1800, 4000];
const STEP_MS = 2800;
// a few of the brightest trees; one is picked for each visit
const SHOWN = ['sakura', 'jacaranda', 'poinciana', 'maple', 'oak'];

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where the tree can stand clear of the card: beside it on a wide screen, under it on a phone. */
function freeAreaFor(box: HTMLElement, card: HTMLElement): FreeArea {
  const b = box.getBoundingClientRect();
  const r = card.getBoundingClientRect();
  const gap = 12;
  if ((r.left + r.right) / 2 - b.left < b.width * 0.4) return { left: r.right - b.left + gap, right: b.width, top: 0 };
  return { left: 0, right: b.width, top: r.bottom - b.top + gap };
}

/** The first page a visitor sees: what Rooted is, and Try now / Install. */
export default function Landing({ onStart }: { onStart(door: 'signup' | 'signin'): void }) {
  const t = useT();
  const install = useInstall();
  const [installHelp, setInstallHelp] = useState(false);
  const [step, setStep] = useState(reduced ? STEPS.length - 1 : 0);
  const heroRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const howRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const species = SHOWN[Math.floor(Math.random() * SHOWN.length)];
    const s = new Scene(canvasRef.current!, { points: STEPS[reduced ? STEPS.length - 1 : 0], seed: 'landing', species });
    // the page's colours follow the sky, as in the app
    s.onPeriod = (p) => (document.documentElement.dataset.period = p);
    scene.current = s;
    const hero = heroRef.current!;
    const card = cardRef.current!;
    const ro = new ResizeObserver(() => {
      s.resize(hero.clientWidth, hero.clientHeight);
      s.setFreeArea(freeAreaFor(hero, card));
    });
    ro.observe(hero);
    ro.observe(card);
    return () => {
      ro.disconnect();
      s.destroy();
      scene.current = null;
    };
  }, []);

  // grow a stage every few seconds, with a sparkle, until it's a grown tree
  useEffect(() => {
    if (step >= STEPS.length - 1) return;
    const timer = setTimeout(() => {
      const next = step + 1;
      const s = scene.current;
      if (s) {
        s.state = { ...s.state, points: STEPS[next] };
        s.burst(18);
      }
      setStep(next);
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [step]);

  async function installApp() {
    if (install.canPrompt) await install.prompt();
    else setInstallHelp(true);
  }

  const actions = (
    <div className="landing-actions">
      <button className="btn btn-primary" onClick={() => onStart('signup')}>
        {t.tryNow}
      </button>
      {!install.installed && (
        <button className="btn" onClick={installApp}>
          {t.installShort}
        </button>
      )}
    </div>
  );

  return (
    <div className="landing">
      <section ref={heroRef} className="landing-hero" aria-labelledby="landing-title">
        <canvas ref={canvasRef} className="landing-scene" aria-hidden="true" />
        <div ref={cardRef} className="px-panel landing-card">
          <LangSwitch className="landing-lang" />
          <h1 id="landing-title" className="brand-title landing-title">
            Rooted
          </h1>
          <p className="landing-tagline">{t.tagline}</p>
          <p className="muted">{t.landingLead}</p>
          {actions}
          {install.installed && <p className="muted small">{t.landingInstalled}</p>}
          <p className="small landing-signin">
            <span className="muted">{t.haveTree}</span>{' '}
            <button type="button" className="link" onClick={() => onStart('signin')}>
              {t.signIn}
            </button>
            <span className="muted" aria-hidden="true">
              {' '}
              ·{' '}
            </span>
            <button type="button" className="link" onClick={() => howRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })}>
              {t.howItWorks} ↓
            </button>
          </p>
        </div>
        <p className="tag landing-stage" aria-live="polite">
          {t.landingStage(t.stages[stageFor(STEPS[step]).index])}
        </p>
      </section>

      <div className="landing-body">
        <section ref={howRef} className="landing-section" aria-labelledby="how-title">
          <h2 id="how-title" className="landing-h2">
            {t.howItWorks}
          </h2>
          <ol className="landing-grid landing-steps">
            {t.landingSteps.map((s, i) => (
              <li key={i} className="px-panel landing-item">
                <span className="landing-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="landing-h3">{s.title}</h3>
                <p className="muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" aria-labelledby="why-title">
          <h2 id="why-title" className="landing-h2">
            {t.landingWhy}
          </h2>
          <ul className="landing-grid landing-features">
            {t.landingFeatures(SPECIES.length).map((f, i) => (
              <li key={i} className="px-panel landing-item">
                <h3 className="landing-h3">{f.title}</h3>
                <p className="muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-panel landing-cta" aria-labelledby="cta-title">
          <h2 id="cta-title" className="landing-h2">
            {t.landingCta}
          </h2>
          <p className="muted">{t.landingCtaBody}</p>
          {actions}
        </section>
      </div>

      {installHelp && <InstallDialog platform={install.platform} onClose={() => setInstallHelp(false)} />}
    </div>
  );
}
