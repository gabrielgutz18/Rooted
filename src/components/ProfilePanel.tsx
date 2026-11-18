import { useEffect, useMemo, useRef, useState } from 'react';
import { backend, type Profile } from '../lib/backend';
import { stageFor } from '../lib/growth';
import { useT } from '../lib/i18n';
import { speciesOf } from '../scene/species';
import { UsernameForm } from './UsernameDialog';
import { Avatar } from './Avatar';
import { AVATAR_IDS, BACKDROP_IDS, avatarValue, backdropOf, parseAvatar, type AvatarChoice } from '../lib/avatars';

/**
 * A profile, shown inside the side menu in place of the links.
 *  - yours (Menu → My profile): also how you sign in; change your username like a handle,
 *    or (older email accounts) add one; change your tree.
 *  - a friend's (View profile, while visiting their tree): who they are and how their tree
 *    is growing. Never their notes, and nothing about how they sign in.
 */
export default function ProfilePanel({
  me,
  mine,
  points,
  notes,
  streak,
  onUsername,
  onChangeTree,
  onAvatar,
  onBack,
}: {
  /** whose profile (yours, or a friend's) */
  me: Profile;
  mine: boolean;
  points: number;
  notes: number;
  /** undefined while a friend's days are loading */
  streak: number | undefined;
  onUsername?(username: string, displayName?: string): void;
  onChangeTree?(): void;
  /** Your profile icon was chosen (null: none). */
  onAvatar?(avatar: string | null): void;
  onBack(): void;
}) {
  const t = useT();
  const backBtn = useRef<HTMLButtonElement>(null);
  const back = useRef(onBack);
  back.current = onBack;
  const [email, setEmail] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [picking, setPicking] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const choice = parseAvatar(me.avatar);
  const shownBg = backdropOf(choice);
  // every change saves straight away; the big icon above shows it
  const choose = (next: AvatarChoice) => {
    const value = avatarValue(next);
    if (value !== (me.avatar ?? null)) onAvatar?.(value);
  };

  // the picker opens near the top of the panel: bring it into view, on the current icon
  useEffect(() => {
    if (!picking) return;
    const el = grid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    el?.focus({ preventScroll: true });
    grid.current?.parentElement?.scrollIntoView({ block: 'nearest' });
  }, [picking]);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(t.locale, { month: 'long', day: 'numeric', year: 'numeric' }), [t.locale]);

  // keyboard: start on Back (the menu was just replaced), Escape goes back to the menu
  useEffect(() => {
    backBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && back.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (mine) backend.signInEmail().then(setEmail, () => setEmail(null));
  }, [mine, me.username]);

  // null: an older email account with no username yet (undefined: the usernames update isn't
  // on the server, so don't offer it). The admin always signs in with the email.
  const canAddName = mine && !!onUsername && me.username === null && !me.is_admin;
  const canChangeName = mine && !!onUsername && !!me.username && !me.is_admin;
  const tree = t.species[speciesOf(me.tree).id].name;

  return (
    <section className="side-profile" aria-labelledby="profile-title">
      <div className="side-profile-head">
        <button ref={backBtn} className="btn btn-small" onClick={onBack}>
          ← {t.back}
        </button>
        <h2 id="profile-title" className="side-title">
          {mine ? t.profileTitle : t.theirProfile(me.display_name)}
        </h2>
      </div>

      <div className="profile-head">
        <Avatar value={me.avatar} name={me.display_name} size={72} label={t.iconOf(me.display_name)} />
        <div>
          <p className="profile-name">{me.display_name}</p>
          <p className="muted small">
            {tree} · {t.stages[stageFor(points).index]}
          </p>
        </div>
      </div>

      {mine && onAvatar && picking && (
        <section id="icon-picker" className="profile-add" aria-labelledby="icon-picker-title">
          <h3 id="icon-picker-title" className="side-title">
            {t.iconChoose}
          </h3>
          <p className="muted small">{t.iconHint}</p>
          <div className="icon-grid" ref={grid} role="group" aria-label={t.iconTitle}>
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                className="icon-choice"
                aria-pressed={choice.icon === id}
                aria-label={t.iconPick(t.avatars[id])}
                title={t.avatars[id]}
                onClick={() => choose({ ...choice, icon: id })}
              >
                <Avatar choice={{ icon: id, bg: choice.bg }} name={me.display_name} />
              </button>
            ))}
            <button
              className="icon-choice"
              aria-pressed={!choice.icon}
              aria-label={t.iconNoneHint}
              title={t.iconNone}
              onClick={() => choose({ ...choice, icon: null })}
            >
              <Avatar choice={{ icon: null, bg: choice.bg }} name={me.display_name} />
            </button>
          </div>
          <h3 className="side-title">{t.bgTitle}</h3>
          <div className="icon-grid bg-grid" role="group" aria-label={t.bgTitle}>
            <button
              className="icon-choice"
              aria-pressed={!choice.bg}
              aria-label={t.bgOwnHint}
              title={t.bgOwn}
              onClick={() => choose({ ...choice, bg: null })}
            >
              <Avatar choice={{ icon: choice.icon, bg: null }} name={me.display_name} />
            </button>
            {BACKDROP_IDS.map((bg) => (
              <button
                key={bg}
                className="icon-choice"
                aria-pressed={choice.bg === bg}
                aria-label={t.bgPick(t.backdrops[bg])}
                title={t.backdrops[bg]}
                onClick={() => choose({ ...choice, bg })}
              >
                <Avatar choice={{ icon: choice.icon, bg }} name={me.display_name} />
              </button>
            ))}
          </div>
          <button className="btn btn-small icon-done" onClick={() => setPicking(false)}>
            {t.done}
          </button>
        </section>
      )}

      <div className="stat-grid profile-stats">
        <div className="stat">
          <span className="stat-value">{points}</span>
          <span className="stat-label">{t.statGrowth}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{notes}</span>
          <span className="stat-label">{t.statNotes}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{streak ?? '…'}</span>
          <span className="stat-label">{t.statStreak}</span>
        </div>
      </div>

      <dl className="profile-facts">
        {(mine ? me.username !== undefined : !!me.username) && (
          <div>
            <dt>{t.username}</dt>
            <dd className="profile-row">
              {me.username ? `@${me.username}` : <span className="muted">{t.noUsernameYet}</span>}
              {canChangeName && !changing && (
                <button className="btn btn-small" onClick={() => setChanging(true)} aria-label={t.changeUsernameTitle}>
                  {t.changeTree}
                </button>
              )}
            </dd>
          </div>
        )}
        {mine && (
          <div>
            <dt>{t.signInWith}</dt>
            <dd>{me.username ? t.signInUsername(me.username) : email ? t.signInEmail(email) : t.signInEmailOnly}</dd>
          </div>
        )}
        <div>
          <dt>{t.profileTree}</dt>
          <dd className="profile-row">
            {tree}
            {mine && onChangeTree && (
              <button className="btn btn-small" onClick={onChangeTree}>
                {t.changeTree}
              </button>
            )}
          </dd>
        </div>
        {mine && onAvatar && me.avatar !== undefined && (
          <div>
            <dt>{t.iconTitle}</dt>
            <dd className="profile-row">
              {choice.icon ? t.avatars[choice.icon] : <span className="muted">{t.iconNone}</span>}
              {shownBg && <span className="muted small"> · {t.backdrops[shownBg]}</span>}
              <button className="btn btn-small" onClick={() => setPicking((p) => !p)} aria-expanded={picking} aria-controls="icon-picker" aria-label={t.iconChange}>
                {picking ? t.close : t.changeTree}
              </button>
            </dd>
          </div>
        )}
        {!mine && (
          <div>
            <dt>{t.col.last}</dt>
            <dd>{me.last_entry_at ? dateFmt.format(new Date(me.last_entry_at)) : <span className="muted">{t.noNotesYet}</span>}</dd>
          </div>
        )}
        <div>
          <dt>{t.col.joined}</dt>
          <dd>{dateFmt.format(new Date(me.created_at))}</dd>
        </div>
      </dl>

      {mine && me.is_admin && <p className="muted small">{t.adminKeepsEmail}</p>}
      {!mine && <p className="muted small">{t.notesPrivate}</p>}

      {canChangeName && changing && (
        <section className="profile-add" aria-labelledby="change-username-title">
          <h3 id="change-username-title" className="side-title">
            {t.changeUsernameTitle}
          </h3>
          <p className="muted small">{t.changeUsernameIntro}</p>
          <UsernameForm
            mode="change"
            current={me.username}
            autoFocus
            onCancel={() => setChanging(false)}
            onDone={(username, displayName) => {
              setChanging(false);
              onUsername!(username, displayName);
            }}
          />
        </section>
      )}

      {canAddName && (
        <section className="profile-add" aria-labelledby="add-username-title">
          <h3 id="add-username-title" className="side-title">
            {t.addUsernameTitle}
          </h3>
          <p className="muted small">{t.addUsernameIntro}</p>
          <UsernameForm onDone={onUsername!} />
        </section>
      )}
    </section>
  );
}
