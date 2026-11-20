import { useMemo, useState } from 'react';
import type { Entry, Profile, SharedNote } from '../lib/backend';
import { tagName, useT } from '../lib/i18n';
import { Avatar } from './Avatar';

/** Past this many characters the pinned note opens with "Read more". */
const LONG = 320;

/** A little pixel push-pin holding the note to the page. */
function PushPin() {
  return (
    <svg className="pin-tack" viewBox="0 0 10 14" width="30" height="42" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="6" height="1" fill="#2a2433" />
      <rect x="1" y="1" width="8" height="5" fill="#2a2433" />
      <rect x="2" y="1" width="6" height="4" fill="#d9483b" />
      <rect x="3" y="1" width="2" height="2" fill="#ff9a84" />
      <rect x="6" y="3" width="2" height="2" fill="#a8322a" />
      <rect x="2" y="6" width="6" height="1" fill="#2a2433" />
      <rect x="3" y="6" width="4" height="1" fill="#a8322a" />
      <rect x="4" y="7" width="2" height="6" fill="#2a2433" />
      <rect x="5" y="7" width="1" height="5" fill="#c9ccd6" />
    </svg>
  );
}

function useDate() {
  const t = useT();
  return useMemo(() => new Intl.DateTimeFormat(t.locale, { month: 'long', day: 'numeric', year: 'numeric' }), [t.locale]);
}

/**
 * The note someone pinned, under their tree (never over it): a sheet of ruled paper held on
 * with a push-pin. Yours has Change (opens your profile) and Unpin.
 */
export function PinnedNote({
  pin,
  owner,
  mine,
  onChange,
  onUnpin,
}: {
  pin: SharedNote;
  owner: Profile;
  mine: boolean;
  onChange?(): void;
  onUnpin?(): Promise<void>;
}) {
  const t = useT();
  const date = useDate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const long = pin.note.length > LONG;

  return (
    <section className="pinned" aria-labelledby="pinned-title">
      <PushPin />
      <header className="pinned-head">
        <Avatar value={owner.avatar} name={owner.display_name} size={36} />
        <div className="pinned-who">
          <h2 id="pinned-title" className="pinned-label">
            {mine ? t.pinnedTitleMine : t.pinnedTitleOf(owner.display_name)}
          </h2>
          <p className="muted small pinned-meta">
            <span>{t.pinWritten(date.format(new Date(pin.written_at)))}</span>
            {mine && <span className="pinned-shared">{t.pinShared}</span>}
          </p>
        </div>
        {mine && (
          <span className="pinned-actions">
            {onChange && (
              <button className="link" onClick={onChange}>
                {t.pinChange}
              </button>
            )}
            {onUnpin && (
              <button
                className="link"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  onUnpin().finally(() => setBusy(false));
                }}
              >
                {t.unpin}
              </button>
            )}
          </span>
        )}
      </header>

      <div className="pinned-paper">
        <h3 className="pinned-subject">{pin.subject}</h3>
        {pin.note && <p className={`pinned-body ${long && !open ? 'is-clamped' : ''}`}>{pin.note}</p>}
      </div>

      {(pin.tags.length > 0 || long) && (
        <footer className="pinned-foot">
          <span className="tags">
            {pin.tags.map((g) => (
              <span key={g} className="tag">
                {tagName(t, g)}
              </span>
            ))}
          </span>
          {long && (
            <button className="link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? t.showLess : t.readMore}
            </button>
          )}
        </footer>
      )}
    </section>
  );
}

/** A small preview of a pinned note, for the narrow side menu. */
function PinPreview({ pin }: { pin: { subject: string; note: string; written_at?: string; created_at?: string } }) {
  const date = useDate();
  const when = pin.written_at ?? pin.created_at;
  return (
    <div className="pin-preview">
      <p className="pin-preview-subject">{pin.subject}</p>
      {pin.note && <p className="pin-preview-body">{pin.note}</p>}
      {when && <time className="muted small" dateTime={when}>{date.format(new Date(when))}</time>}
    </div>
  );
}

/**
 * Profile → Shared note. Yours: pin one of your notes (after a clear word about who can read
 * it), change it, or unpin it. A friend's: the note they pinned, if any.
 */
export function ShareSection({
  owner,
  mine,
  pin,
  entries,
  canPick,
  onPin,
  onUnpin,
}: {
  owner: Profile;
  mine: boolean;
  /** undefined while loading */
  pin: SharedNote | null | undefined;
  /** your notes (to pick from) */
  entries?: Entry[];
  /** false while your notes are locked on this device */
  canPick?: boolean;
  onPin?(entry: Entry): Promise<void>;
  onUnpin?(): Promise<void>;
}) {
  const t = useT();
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const date = useDate();
  // only notes saved to the server (and readable) can be pinned
  const choices = useMemo(() => (entries ?? []).filter((e) => !e.pending && !e.locked), [entries]);

  if (!mine) {
    return (
      <section className="profile-add share-section" aria-labelledby="share-title">
        <h3 id="share-title" className="side-title">
          {t.shareTitle}
        </h3>
        {pin === undefined ? <p className="muted small">{t.loading}</p> : pin ? <PinPreview pin={pin} /> : <p className="muted small">{t.theirShareNone(owner.display_name)}</p>}
      </section>
    );
  }

  const run = (job: () => Promise<void>) => {
    setBusy(true);
    job()
      .then(() => {
        setPicked(null);
        setChoosing(false);
      })
      .catch(() => {}) // the app shows what went wrong
      .finally(() => setBusy(false));
  };

  return (
    <section id="share-note" className="profile-add share-section" aria-labelledby="share-title">
      <h3 id="share-title" className="side-title">
        {t.shareTitle}
      </h3>

      {picked ? (
        // one last look, and who will be able to read it
        <div className="share-confirm">
          <PinPreview pin={picked} />
          <p className="share-warn">{t.shareWarn}</p>
          <div className="share-buttons">
            <button className="btn btn-small" disabled={busy} onClick={() => setPicked(null)}>
              {t.back}
            </button>
            <button className="btn btn-primary btn-small" disabled={busy} onClick={() => run(() => onPin!(picked))}>
              {busy ? t.saving : t.yesPin}
            </button>
          </div>
        </div>
      ) : choosing ? (
        <div className="share-choose">
          <p className="muted small">{t.shareChooseTitle}</p>
          {!canPick ? (
            <p className="muted small">{t.shareLocked}</p>
          ) : choices.length === 0 ? (
            <p className="muted small">{t.shareNoNotes}</p>
          ) : (
            <ul className="share-list">
              {choices.map((e) => (
                <li key={e.id}>
                  <button className={`share-pick ${pin?.entry_id === e.id ? 'is-on' : ''}`} onClick={() => setPicked(e)} aria-label={t.sharePickLabel(e.subject)}>
                    <span className="share-pick-subject">{e.subject}</span>
                    <span className="share-pick-meta">
                      {date.format(new Date(e.created_at))}
                      {pin?.entry_id === e.id && ` · ${t.pinnedTag}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="btn btn-small" onClick={() => setChoosing(false)}>
            {t.cancel}
          </button>
        </div>
      ) : (
        <>
          {pin ? <PinPreview pin={pin} /> : <p className="muted small">{pin === undefined ? t.loading : t.shareIntro}</p>}
          {pin === null && <p className="muted small">{t.shareNone}</p>}
          <div className="share-buttons">
            <button className="btn btn-small" onClick={() => setChoosing(true)} aria-controls="share-note">
              {pin ? t.pinChange : t.shareChoose}
            </button>
            {pin && onUnpin && (
              <button className="btn btn-small" disabled={busy} onClick={() => run(onUnpin)}>
                {t.unpin}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
