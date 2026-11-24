// Menu → Updates: what's new, written as a letter on a scroll that unrolls. A new update also
// opens it by itself, once, when the app opens (src/App.tsx).
// The landing page opens it too, at the notice a visitor picked (src/pages/landing-updates.tsx).

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLang, useT } from '../lib/i18n';
import { UPDATES, type UpdatePicture } from '../lib/updates';

/** `focus`: the id of an update to open the scroll at, instead of the top. */
export default function UpdateNotice({ onClose, focus }: { onClose(): void; focus?: string }) {
  const t = useT();
  const lang = useLang();
  const box = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // roll the paper on to that update before the first paint, so it unrolls already there
  useLayoutEffect(() => {
    const p = paper.current;
    const article = focus && p?.querySelector<HTMLElement>(`[data-update="${CSS.escape(focus)}"]`);
    if (!p || !article) return;
    p.scrollTop += article.getBoundingClientRect().top - p.getBoundingClientRect().top - 12;
  }, [focus]);

  const date = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(t.locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const picture = (p: UpdatePicture, i: number, small: boolean) => (
    <figure key={i} className={small ? 'scroll-thumb' : 'scroll-photo'}>
      <img src={p.src} alt={p.alt[lang]} loading="lazy" decoding="async" />
      {p.label && <figcaption>{p.label[lang]}</figcaption>}
    </figure>
  );

  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div ref={box} className="scroll" role="dialog" aria-modal="true" aria-labelledby="updates-title" tabIndex={-1}>
        <div className="scroll-rod" aria-hidden="true" />
        <div className="scroll-unroll">
          <div ref={paper} className="scroll-paper">
            <header className="scroll-head">
              <button className="btn btn-small scroll-x" onClick={onClose}>
                {t.close}
              </button>
              <span className="scroll-seal" aria-hidden="true">
                R
              </span>
              <span className="scroll-kicker">{t.updatesKicker}</span>
              <h2 id="updates-title" className="scroll-title">
                {t.updatesTitle}
              </h2>
              <p className="scroll-greeting">{t.updatesGreeting}</p>
            </header>

            {UPDATES.map((u, k) => (
              <article key={u.id} className="scroll-update" aria-labelledby={`upd-${u.id}`} data-update={u.id}>
                {k > 0 && (
                  <div className="scroll-rule" aria-hidden="true">
                    ❦
                  </div>
                )}
                <p className="scroll-date">
                  <time dateTime={u.date}>{date(u.date)}</time>
                  {k === 0 && <span className="scroll-new">{t.updatesNew}</span>}
                </p>
                <h3 id={`upd-${u.id}`} className="scroll-update-title">
                  {u.title[lang]}
                </h3>
                <p className="scroll-intro">{u.intro[lang]}</p>
                {u.sections.map((s, i) => (
                  <section key={i} className="scroll-section">
                    <h4>{s.heading[lang]}</h4>
                    <p>{s.text[lang]}</p>
                    {s.pictures &&
                      (s.row ? (
                        <div className="scroll-thumbs">{s.pictures.map((p, j) => picture(p, j, true))}</div>
                      ) : (
                        s.pictures.map((p, j) => picture(p, j, false))
                      ))}
                  </section>
                ))}
              </article>
            ))}

            <footer className="scroll-sign">
              <p>{t.updatesSignoff}</p>
              <p className="scroll-signature">— Rooted</p>
            </footer>
            <button className="btn scroll-close" onClick={onClose}>
              {t.updatesRollUp}
            </button>
          </div>
        </div>
        <div className="scroll-rod scroll-rod-bottom" aria-hidden="true" />
      </div>
    </>
  );
}
