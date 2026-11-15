import { useEffect, useRef } from 'react';
import type { Platform } from '../lib/install';
import { useT } from '../lib/i18n';

/** How to install, for browsers that have no install prompt we can trigger (iPhone, Firefox...). */
export default function InstallDialog({ platform, onClose }: { platform: Platform; onClose(): void }) {
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
      <div ref={box} className="px-panel picker picker-narrow" role="dialog" aria-modal="true" aria-labelledby="install-title" tabIndex={-1}>
        <div className="composer-head">
          <h2 id="install-title" className="panel-title">
            {t.installTitle}
          </h2>
          <button className="btn btn-small" onClick={onClose}>
            {t.close}
          </button>
        </div>
        <p className="muted">{t.installIntro}</p>
        <ol className="steps">
          {t.installSteps[platform].map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </>
  );
}
