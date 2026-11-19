import { useCallback, useRef, useState } from 'react';
import UpdateNotice from '../components/UpdateNotice';
import { useLang, useT, type Lang } from '../lib/i18n';
import { UPDATES, markUpdatesSeen, type Update } from '../lib/updates';
import './landing-updates.css';

// The landing page's update notices: the newest one on the hero card, and the latest few as
// a peek at the scroll from Menu → Updates. Both open that same scroll, at the notice picked.
// The notices are written once, in src/lib/updates.ts: a new entry there shows up here too.

const SHOWN = 3;
const FRESH_DAYS = 30; // "New" for a month after it's announced, then "Latest"

// This section's own text, kept here so it doesn't touch src/lib/i18n.tsx.
const COPY = {
  en: {
    lead: 'Rooted keeps growing too. Here’s what’s new lately: the same notices you’ll find in the app under Menu → Updates.',
    latest: 'Latest',
    readNotice: 'read the update notice',
    readMore: 'Read the notice',
    all: (n: number) => `Unroll all ${n} updates`,
  },
  tl: {
    lead: 'Patuloy ring lumalago ang Rooted. Narito ang mga bago nitong mga nakaraang araw: ang mga paunawang makikita mo rin sa app sa Menu → Mga update.',
    latest: 'Pinakabago',
    readNotice: 'basahin ang paunawa sa update',
    readMore: 'Basahin ang paunawa',
    all: (n: number) => `Buksan ang lahat ng ${n} update`,
  },
} satisfies Record<Lang, unknown>;

function dayOf(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

const isFresh = (u: Update) => Date.now() - dayOf(u.date).getTime() < FRESH_DAYS * 864e5;

/** The update's first picture, to show beside its notice. */
const pictureOf = (u: Update) => u.sections.find((s) => s.pictures?.length)?.pictures?.[0];

/**
 * The scroll from Menu → Updates, for the landing page: `open(id)` unrolls it at that update
 * (or at the top), and `scroll` is the dialog to render while it's open.
 */
export function useUpdateScroll() {
  const [at, setAt] = useState<string | null>(null); // '' = from the top
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback((id = '') => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    markUpdatesSeen(); // read here, so it isn't "New" in the app's menu later either
    setAt(id);
  }, []);

  const close = useCallback(() => {
    setAt(null);
    opener.current?.focus({ preventScroll: true }); // back to the button that opened it
  }, []);

  return { open, scroll: at === null ? null : <UpdateNotice focus={at || undefined} onClose={close} /> };
}

/** On the hero card: the newest update, as a small notice that opens it. */
export function LatestUpdate({ onOpen }: { onOpen(id: string): void }) {
  const t = useT();
  const lang = useLang();
  const u = UPDATES[0];
  if (!u) return null;
  return (
    <button type="button" className="upd-pill" onClick={() => onOpen(u.id)}>
      <span className="upd-pill-tag">{isFresh(u) ? t.updatesNew : COPY[lang].latest}</span>
      <span className="upd-pill-title">{u.title[lang]}</span>
      <span className="upd-pill-go" aria-hidden="true">
        →
      </span>
      <span className="upd-sr"> — {COPY[lang].readNotice}</span>
    </button>
  );
}

/** Further down the page: the latest few notices, on a piece of the scroll. */
export default function LandingUpdates({ onOpen }: { onOpen(id: string): void }) {
  const t = useT();
  const lang = useLang();
  const c = COPY[lang];
  const date = (d: string) => dayOf(d).toLocaleDateString(t.locale, { year: 'numeric', month: 'long', day: 'numeric' });

  if (!UPDATES.length) return null;
  return (
    <section id="updates" className="landing-section upd" aria-labelledby="upd-heading">
      <div className="upd-head">
        <h2 id="upd-heading" className="landing-h2">
          {t.updatesTitle}
        </h2>
        <p className="muted">{c.lead}</p>
      </div>

      <div className="upd-scroll">
        <div className="scroll-rod" aria-hidden="true" />
        <div className="upd-paper">
          <ol className="upd-list">
            {UPDATES.slice(0, SHOWN).map((u, k) => {
              const pic = pictureOf(u);
              return (
                <li key={u.id} className={`upd-item ${pic ? 'has-pic' : ''}`}>
                  {pic && (
                    <div className="upd-photo">
                      <img src={pic.src} alt={pic.alt[lang]} loading="lazy" decoding="async" />
                    </div>
                  )}
                  <div className="upd-text">
                    <p className="upd-date">
                      <time dateTime={u.date}>{date(u.date)}</time>
                      {k === 0 && <span className="upd-tag">{isFresh(u) ? t.updatesNew : c.latest}</span>}
                    </p>
                    <h3 className="upd-title">{u.title[lang]}</h3>
                    <p className="upd-intro">{u.intro[lang]}</p>
                    <button type="button" className="upd-more" aria-label={`${c.readMore}: ${u.title[lang]}`} onClick={() => onOpen(u.id)}>
                      {c.readMore} <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="upd-foot">
            <span className="upd-rule" aria-hidden="true">
              ❦
            </span>
            <button type="button" className="btn upd-all" onClick={() => onOpen('')}>
              {c.all(UPDATES.length)}
            </button>
          </div>
        </div>
        <div className="scroll-rod scroll-rod-bottom" aria-hidden="true" />
      </div>
    </section>
  );
}
