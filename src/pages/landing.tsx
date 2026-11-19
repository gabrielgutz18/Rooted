import { useEffect, useRef, useState } from 'react';
import { Scene, type FreeArea } from '../scene/engine';
import { SPECIES } from '../scene/species';
import { stageFor } from '../lib/growth';
import { useInstall } from '../lib/install';
import { useT } from '../lib/i18n';
import { navigate } from '../lib/route';
import LangSwitch from '../components/LangSwitch';
import InstallDialog from '../components/InstallDialog';
import LandingShowcase from './landing-showcase';
import LandingUpdates, { LatestUpdate, useUpdateScroll } from './landing-updates';

// The tree on the landing page grows a stage at a time, the way notes grow yours.
const STEPS = [60, 250, 700, 1800, 4000];
const STEP_MS = 2800;
// a few of the brightest trees; one is picked for each visit
const SHOWN = ['sakura', 'jacaranda', 'poinciana', 'maple', 'oak'];

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Where the tree can stand clear of the card and the navigation bar: beside the card on a wide
 * screen, under it on a phone. (The bar is fixed at the top of the window, over the hero.)
 */
function freeAreaFor(box: HTMLElement, card: HTMLElement, nav: HTMLElement): FreeArea {
  const b = box.getBoundingClientRect();
  const r = card.getBoundingClientRect();
  const gap = 12;
  const below = nav.getBoundingClientRect().bottom + gap;
  if ((r.left + r.right) / 2 - b.left < b.width * 0.4) return { left: r.right - b.left + gap, right: b.width, top: below };
  return { left: 0, right: b.width, top: Math.max(below, r.bottom - b.top + gap) };
}

/** The first page a visitor sees: what Rooted is, and Try now / Install. */
export default function Landing({ onStart }: { onStart(door: 'signup' | 'signin'): void }) {
  const t = useT();
  const install = useInstall();
  const [installHelp, setInstallHelp] = useState(false);
  // the update notices (src/pages/landing-updates.tsx) open the scroll from Menu → Updates
  const updates = useUpdateScroll();
  const [step, setStep] = useState(reduced ? STEPS.length - 1 : 0);
  const heroRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);
  const whyRef = useRef<HTMLElement>(null);
  // on a phone the links fold into a menu under the bar
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
  /** Close the menu, then do what the link says. */
  const pick = (then: () => void) => () => {
    setMenuOpen(false);
    then();
  };

  useEffect(() => {
    const species = SHOWN[Math.floor(Math.random() * SHOWN.length)];
    const s = new Scene(canvasRef.current!, { points: STEPS[reduced ? STEPS.length - 1 : 0], seed: 'landing', species });
    // the page's colours follow the sky, as in the app
    s.onPeriod = (p) => (document.documentElement.dataset.period = p);
    scene.current = s;
    const hero = heroRef.current!;
    const card = cardRef.current!;
    const nav = navRef.current!;
    const ro = new ResizeObserver(() => {
      s.resize(hero.clientWidth, hero.clientHeight);
      s.setFreeArea(freeAreaFor(hero, card, nav));
    });
    ro.observe(hero);
    ro.observe(card);
    ro.observe(nav);
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
      <header ref={navRef} className="landing-nav">
        <div className="px-panel landing-bar">
          <button type="button" className="landing-brand" aria-label={t.backToTop} onClick={pick(() => window.scrollTo({ top: 0, behavior }))}>
            <img src="/icons/icon-192.png" alt="" width={30} height={30} />
            <span aria-hidden="true">Rooted</span>
          </button>
          <nav id="landing-links" className={`landing-links ${menuOpen ? 'is-open' : ''}`} aria-label={t.mainNav}>
            {/* the screenshots section (src/pages/landing-showcase.tsx) */}
            <button type="button" className="landing-link" onClick={pick(() => document.getElementById('see-it')?.scrollIntoView({ behavior }))}>
              {t.screenshotsNav}
            </button>
            <button type="button" className="landing-link" onClick={pick(() => howRef.current?.scrollIntoView({ behavior }))}>
              {t.howItWorks}
            </button>
            <button type="button" className="landing-link" onClick={pick(() => whyRef.current?.scrollIntoView({ behavior }))}>
              {t.whyRooted}
            </button>
            <button type="button" className="landing-link" onClick={pick(() => navigate('developer'))}>
              {t.developerMenu}
            </button>
            <button type="button" className="landing-link landing-link-signin" onClick={pick(() => onStart('signin'))}>
              {t.signIn}
            </button>
          </nav>
          <LangSwitch className="landing-lang" />
          <button type="button" className="btn btn-primary btn-small landing-nav-try" onClick={() => onStart('signup')}>
            {t.tryNow}
          </button>
          <button
            type="button"
            className="btn btn-small landing-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="landing-links"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {t.menu}
          </button>
        </div>
      </header>
      {menuOpen && <div className="landing-scrim" onClick={() => setMenuOpen(false)} />}

      <section ref={heroRef} className="landing-hero" aria-labelledby="landing-title">
        <canvas ref={canvasRef} className="landing-scene" aria-hidden="true" />
        <div ref={cardRef} className="px-panel landing-card">
          <LatestUpdate onOpen={updates.open} />
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
            <button type="button" className="link" onClick={() => howRef.current?.scrollIntoView({ behavior })}>
              {t.howItWorks} ↓
            </button>
          </p>
        </div>
        <p className="tag landing-stage" aria-live="polite">
          {t.landingStage(t.stages[stageFor(STEPS[step]).index])}
        </p>
      </section>

      <div className="landing-body">
        <LandingShowcase />
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

        <section ref={whyRef} className="landing-section" aria-labelledby="why-title">
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

        <LandingUpdates onOpen={updates.open} />

        <section className="px-panel landing-cta" aria-labelledby="cta-title">
          <h2 id="cta-title" className="landing-h2">
            {t.landingCta}
          </h2>
          <p className="muted">{t.landingCtaBody}</p>
          {actions}
        </section>

        <footer className="landing-foot">
          <span className="muted small">Rooted</span>
          <button type="button" className="link" onClick={() => updates.open()}>
            {t.updatesMenu}
          </button>
          <button type="button" className="link" onClick={() => navigate('developer')}>
            {t.developerMenu}
          </button>
        </footer>
      </div>

      {installHelp && <InstallDialog platform={install.platform} onClose={() => setInstallHelp(false)} />}
      {updates.scroll}
    </div>
  );
}
