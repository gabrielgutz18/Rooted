// The desktop in My notes: pixel folders to open, make, rename, recolour and delete, and the
// pieces the note list uses to move notes between them (src/lib/folders.ts holds the data).

import { memo, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../lib/i18n';
import type { Dragging } from '../lib/drag';
import { reducedMotion } from './lantern';
import {
  cleanName,
  FOLDER_COLOR_IDS,
  FOLDER_COLORS,
  FOLDER_H,
  FOLDER_ICON_IDS,
  FOLDER_NAME_MAX,
  FOLDER_W,
  folderRuns,
  iconRuns,
  inkOn,
  type Desk,
  type Folder,
  type FolderColor,
  type FolderIconId,
} from '../lib/folders';

/**
 * A pixel folder, `scale` screen pixels per art pixel, with its little icon (if it has one)
 * stamped on the front. A folder holding notes has paper sticking out.
 */
export const FolderIcon = memo(function FolderIcon({
  color,
  full,
  icon,
  scale = 3,
}: {
  color: FolderColor;
  full: boolean;
  icon?: FolderIconId | null;
  scale?: number;
}) {
  return (
    <svg
      className="folder-icon"
      width={FOLDER_W * scale}
      height={FOLDER_H * scale}
      viewBox={`0 0 ${FOLDER_W} ${FOLDER_H}`}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {folderRuns(color, full, icon).map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
});

/** A folder's colour for its window and chips (CSS variables). */
const tint = (color: FolderColor) => ({ '--folder': FOLDER_COLORS[color], '--folder-ink': inkOn(color) }) as CSSProperties;

/**
 * The folders, side by side like icons on a desktop. Each one is also a place to drop a note.
 * While a note that's in a folder is being dragged, a "Back to desktop" tile takes it out.
 */
export function FolderGrid({
  desk,
  counts,
  openId,
  drag,
  draggedFrom,
  bounce,
  canAdd,
  onOpen,
  onNew,
}: {
  desk: Desk;
  counts: Record<string, number>;
  openId: string | null;
  drag: Dragging | null;
  /** the folder the note being dragged is in */
  draggedFrom: string | null;
  /** a folder that just got a note: it bounces */
  bounce: string | null;
  canAdd: boolean;
  onOpen(id: string | null): void;
  onNew(): void;
}) {
  const t = useT();
  return (
    <div className={`desk ${drag ? 'is-dragging' : ''}`}>
      <ul className="folder-grid" aria-label={t.folders}>
        {desk.folders.map((f) => {
          const n = counts[f.id] ?? 0;
          const open = openId === f.id;
          return (
            <li key={f.id}>
              <button
                type="button"
                className={`folder ${open ? 'is-open' : ''} ${drag?.over === f.id && draggedFrom !== f.id ? 'is-target' : ''} ${bounce === f.id ? 'is-bounce' : ''}`}
                data-drop={f.id}
                aria-pressed={open}
                aria-label={t.folderLabel(f.name, n)}
                onClick={() => onOpen(open ? null : f.id)}
              >
                <span className="folder-art">
                  <FolderIcon color={f.color} full={n > 0} icon={f.icon} />
                  {n > 0 && <span className="folder-count">{n}</span>}
                </span>
                <span className="folder-name">{f.name}</span>
              </button>
            </li>
          );
        })}
        {/* in the New folder tile's place, so the folders don't shift as a note lifts */}
        {drag && draggedFrom && (
          <li>
            <div className={`folder folder-desk ${drag.over === 'desk' ? 'is-target' : ''}`} data-drop="desk">
              <span className="folder-art folder-desk-art" aria-hidden>
                ↩
              </span>
              <span className="folder-name">{t.dropOnDesk}</span>
            </div>
          </li>
        )}
        {canAdd && !drag && (
          <li>
            <button type="button" className="folder folder-new" onClick={onNew}>
              <span className="folder-art folder-new-art" aria-hidden>
                +
              </span>
              <span className="folder-name">{t.newFolder}</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Make a folder, or change one's name, colour or icon, or delete it. */
export function FolderForm({
  folder,
  count,
  onSave,
  onDelete,
  onCancel,
}: {
  /** the folder being edited; none to make a new one */
  folder?: Folder;
  count: number;
  onSave(name: string, color: FolderColor, icon: FolderIconId | null): void;
  onDelete?(): void;
  onCancel(): void;
}) {
  const t = useT();
  const [name, setName] = useState(folder?.name ?? '');
  const [color, setColor] = useState<FolderColor>(folder?.color ?? 'manila');
  const [icon, setIcon] = useState<FolderIconId | null>(folder?.icon ?? null);
  const [noName, setNoName] = useState(false);
  const [sure, setSure] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLFormElement>(null);

  // Bring the whole form into view: it opens above an open folder's window, and its icons and
  // colours would otherwise be off the bottom of the screen. A new folder starts in its name;
  // editing doesn't, since that would open a phone's keyboard over the icons and colours.
  useEffect(() => {
    if (folder) box.current?.focus({ preventScroll: true });
    else input.current?.focus({ preventScroll: true });
    box.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) {
      setNoName(true);
      input.current?.focus();
      return;
    }
    onSave(clean, color, icon);
  }

  return (
    <form
      ref={box}
      tabIndex={-1}
      className="folder-form"
      style={tint(color)}
      onSubmit={submit}
      aria-label={folder ? t.editFolderLabel(folder.name) : t.newFolder}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className="folder-form-top">
        <span className="folder-form-preview">
          <FolderIcon color={color} full={count > 0} icon={icon} />
        </span>
        <label className="field folder-form-name">
          <span className="field-label">{t.folderName}</span>
          <input
            ref={input}
            type="text"
            value={name}
            maxLength={FOLDER_NAME_MAX}
            placeholder={t.folderNamePlaceholder}
            onChange={(e) => {
              setName(e.target.value);
              setNoName(false);
            }}
          />
        </label>
      </div>
      <fieldset className="folder-colors folder-icons">
        <legend className="field-label">{t.folderIcon}</legend>
        <label className="swatch icon-swatch" title={t.folderIcons.none}>
          <input type="radio" name="folder-icon" value="" checked={icon === null} onChange={() => setIcon(null)} aria-label={t.folderIcons.none} />
          <span className="icon-none" aria-hidden />
        </label>
        {FOLDER_ICON_IDS.map((i) => (
          <label key={i} className="swatch icon-swatch" title={t.folderIcons[i]}>
            <input type="radio" name="folder-icon" value={i} checked={icon === i} onChange={() => setIcon(i)} aria-label={t.folderIcons[i]} />
            <svg width={21} height={21} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
              {iconRuns(i, 'currentColor').map((r) => (
                <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
              ))}
            </svg>
          </label>
        ))}
      </fieldset>
      {/* after the icons, so each colour shows the icon picked */}
      <fieldset className="folder-colors">
        <legend className="field-label">{t.folderColor}</legend>
        {FOLDER_COLOR_IDS.map((c) => (
          <label key={c} className="swatch" title={t.folderColors[c]}>
            <input type="radio" name="folder-color" value={c} checked={color === c} onChange={() => setColor(c)} aria-label={t.folderColors[c]} />
            <FolderIcon color={c} full={false} icon={icon} scale={2} />
          </label>
        ))}
      </fieldset>
      {noName && (
        <p className="form-error" role="alert">
          {t.folderNameFirst}
        </p>
      )}
      {sure && folder && onDelete ? (
        <div className="pin-ask" role="group" aria-label={t.deleteFolder}>
          <p>{t.deleteFolderConfirm(folder.name, count)}</p>
          <span className="note-edit-actions">
            <button type="button" className="btn btn-small" onClick={() => setSure(false)}>
              {t.keep}
            </button>
            <button type="button" className="btn btn-small btn-danger" onClick={onDelete}>
              {t.yesDeleteFolder}
            </button>
          </span>
        </div>
      ) : (
        <div className="composer-foot">
          {folder && onDelete ? (
            <button type="button" className="link danger" onClick={() => setSure(true)}>
              {t.deleteFolder}
            </button>
          ) : (
            <span />
          )}
          <span className="note-edit-actions">
            <button type="button" className="btn btn-small" onClick={onCancel}>
              {t.cancel}
            </button>
            <button className="btn btn-primary btn-small">{folder ? t.saveChanges : t.createFolder}</button>
          </span>
        </div>
      )}
    </form>
  );
}

/** An open folder's title bar, in the folder's colour. */
export function FolderBar({ folder, count, onEdit, onClose }: { folder: Folder; count: number; onEdit(): void; onClose(): void }) {
  const t = useT();
  return (
    <div className="folder-bar" style={tint(folder.color)}>
      <FolderIcon color={folder.color} full={count > 0} icon={folder.icon} scale={2} />
      <h3 className="folder-bar-title">{folder.name}</h3>
      <span className="folder-bar-count">{t.noteCount(count)}</span>
      <span className="folder-bar-actions">
        <button type="button" className="btn btn-small" onClick={onEdit}>
          {t.editFolder}
        </button>
        <button type="button" className="btn btn-small" onClick={onClose} aria-label={t.closeFolder} title={t.closeFolder}>
          ×
        </button>
      </span>
    </div>
  );
}

/** Which folder a note is in (shown on search results). */
export function FolderChip({ folder }: { folder: Folder }) {
  const t = useT();
  return (
    <span className="tag folder-chip" title={t.inFolder(folder.name)}>
      <FolderIcon color={folder.color} full icon={folder.icon} scale={1} />
      {folder.name}
    </span>
  );
}

/** Move without dragging: the desktop or any other folder, as buttons. */
export function MoveChooser({
  desk,
  current,
  subject,
  onMove,
  onCancel,
}: {
  desk: Desk;
  current: string | null;
  subject: string;
  onMove(folder: string | null): void;
  onCancel(): void;
}) {
  const t = useT();
  return (
    <div className="move-ask" role="group" aria-label={t.moveNoteLabel(subject)}>
      <span className="move-ask-title">{t.moveTo}</span>
      <span className="move-options">
        {current && (
          <button type="button" className="btn btn-small" onClick={() => onMove(null)}>
            {t.desktop}
          </button>
        )}
        {desk.folders
          .filter((f) => f.id !== current)
          .map((f) => (
            <button key={f.id} type="button" className="btn btn-small move-option" onClick={() => onMove(f.id)}>
              <FolderIcon color={f.color} full={false} icon={f.icon} scale={1} />
              {f.name}
            </button>
          ))}
      </span>
      <button type="button" className="link" onClick={onCancel}>
        {t.cancel}
      </button>
    </div>
  );
}

/** The note being dragged, following the pointer. */
export function NoteGhost({ drag, subject }: { drag: Dragging; subject: string }) {
  return createPortal(
    <div className={`note-ghost ${drag.over ? 'is-over' : ''}`} style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }} aria-hidden>
      <span className="note-ghost-paper">{subject}</span>
    </div>,
    document.body,
  );
}
