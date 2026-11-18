import { useEffect, useMemo, useRef, useState } from 'react';
import { backend, type Profile } from '../lib/backend';
import { stageFor } from '../lib/growth';
import { useT } from '../lib/i18n';
import { speciesOf } from '../scene/species';
import { UsernameForm } from './UsernameDialog';

/**
 * Menu → My profile: who you are here and how you sign in. Accounts that still sign in
 * with an email can add a username from here (any time after "Not now").
 */
export default function ProfileDialog({
  me,
  points,
  notes,
  streak,
  onUsername,
  onChangeTree,
  onClose,
}: {
  me: Profile;
  points: number;
  notes: number;
  streak: number;
  onUsername(username: string, displayName?: string): void;
  onChangeTree(): void;
  onClose(): void;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [email, setEmail] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(t.locale, { month: 'long', day: 'numeric', year: 'numeric' }), [t.locale]);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    backend.signInEmail().then(setEmail, () => setEmail(null));
  }, [me.username]);

  // null: an older email account with no username yet (undefined: the usernames update isn't
  // on the server, so don't offer it). The admin always signs in with the email.
  const canAddName = me.username === null && !me.is_admin;
  const canChangeName = !!me.username && !me.is_admin;
  const tree = t.species[speciesOf(me.tree).id].name;

  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div ref={box} className="px-panel picker picker-narrow" role="dialog" aria-modal="true" aria-labelledby="profile-title" tabIndex={-1}>
        <div className="composer-head">
          <h2 id="profile-title" className="panel-title">
            {t.profileTitle}
          </h2>
          <button className="btn btn-small" onClick={onClose}>
            {t.close}
          </button>
        </div>

        <div className="profile-head">
          <p className="profile-name">{me.display_name}</p>
          <p className="muted">
            {tree} · {t.stages[stageFor(points).index]}
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <span className="stat-value">{points}</span>
            <span className="stat-label">{t.statGrowth}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{notes}</span>
            <span className="stat-label">{t.statNotes}</span>
          </div>
          <div className="stat">
            <span className="stat-value">{streak}</span>
            <span className="stat-label">{t.statStreak}</span>
          </div>
        </div>

        <dl className="profile-facts">
          {me.username !== undefined && (
            <div>
              <dt>{t.username}</dt>
              <dd className="profile-tree">
                {me.username ? `@${me.username}` : <span className="muted">{t.noUsernameYet}</span>}
                {canChangeName && !changing && (
                  <button className="btn btn-small" onClick={() => setChanging(true)} aria-label={t.changeUsernameTitle}>
                    {t.changeTree}
                  </button>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt>{t.signInWith}</dt>
            <dd>{me.username ? t.signInUsername(me.username) : email ? t.signInEmail(email) : t.signInEmailOnly}</dd>
          </div>
          <div>
            <dt>{t.profileTree}</dt>
            <dd className="profile-tree">
              {tree}
              <button className="btn btn-small" onClick={onChangeTree}>
                {t.changeTree}
              </button>
            </dd>
          </div>
          <div>
            <dt>{t.col.joined}</dt>
            <dd>{dateFmt.format(new Date(me.created_at))}</dd>
          </div>
        </dl>

        {me.is_admin && <p className="muted small">{t.adminKeepsEmail}</p>}

        {canChangeName && changing && (
          <section className="profile-add" aria-labelledby="change-username-title">
            <h3 id="change-username-title" className="side-title">
              {t.changeUsernameTitle}
            </h3>
            <p className="muted">{t.changeUsernameIntro}</p>
            <UsernameForm
              mode="change"
              current={me.username}
              autoFocus
              onCancel={() => setChanging(false)}
              onDone={(username, displayName) => {
                setChanging(false);
                onUsername(username, displayName);
              }}
            />
          </section>
        )}

        {canAddName && (
          <section className="profile-add" aria-labelledby="add-username-title">
            <h3 id="add-username-title" className="side-title">
              {t.addUsernameTitle}
            </h3>
            <p className="muted">{t.addUsernameIntro}</p>
            <UsernameForm onDone={onUsername} />
          </section>
        )}
      </div>
    </>
  );
}
