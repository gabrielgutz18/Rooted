import { LANGS, setLang, useLang, useT } from '../lib/i18n';

/** English / Tagalog. Each button is written in its own language. */
export default function LangSwitch({ className = '' }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  return (
    <div className={`lang ${className}`} role="group" aria-label={t.language}>
      <span className="lang-label" aria-hidden="true">
        {t.language}
      </span>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          className={`lang-btn ${lang === l.id ? 'is-on' : ''}`}
          aria-pressed={lang === l.id}
          onClick={() => setLang(l.id)}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
