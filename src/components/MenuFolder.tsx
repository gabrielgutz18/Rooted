import { useEffect, useState, type ReactNode } from 'react';
import './menu-folder.css';

// A folder in the side menu: one button that opens to show the links tucked inside it, so the
// menu shows a few big links and keeps the rest out of the way. It remembers being left open.

const KEY = 'rooted.menuFolder';

function readOpen(): boolean {
  try {
    return localStorage.getItem(KEY) === 'open';
  } catch {
    return false;
  }
}

/** Whether the folder is open, remembered in this browser; `force` opens it (e.g. its page is showing). */
export function useFolderOpen(force = false): [boolean, () => void] {
  const [open, setOpen] = useState(readOpen);
  useEffect(() => {
    if (force) setOpen(true);
  }, [force]);
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem(KEY, was ? 'closed' : 'open');
      } catch {
        // private mode: it just won't be remembered
      }
      return !was;
    });
  return [open, toggle];
}

/** A little pixel folder, open or shut. */
function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg className="folder-icon" viewBox="0 0 16 14" width="20" height="18" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="0" y="1" width="8" height="4" fill="var(--line)" />
      <rect x="0" y="3" width="16" height="11" fill="var(--line)" />
      <rect x="1" y="2" width="6" height="3" fill="#c98e2c" />
      <rect x="1" y="4" width="14" height="9" fill="#c98e2c" />
      {open ? (
        <>
          <polygon points="2,6 16,6 14,14 0,14" fill="var(--line)" />
          <polygon points="3,7 15,7 13.4,13 1.3,13" fill="#f6d27a" />
        </>
      ) : (
        <>
          <rect x="1" y="5" width="14" height="8" fill="#e8b04a" />
          <rect x="1" y="5" width="14" height="1" fill="#f6d27a" />
        </>
      )}
    </svg>
  );
}

export default function MenuFolder({
  id,
  label,
  open,
  onToggle,
  badge,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle(): void;
  /** Shown on the folder while it's shut (e.g. "New" when an update inside hasn't been read). */
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`side-folder ${open ? 'is-open' : ''}`}>
      <button type="button" className="side-link side-folder-btn" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <FolderIcon open={open} />
        <span className="side-folder-label">{label}</span>
        {!open && badge}
        <span className="side-folder-chev" aria-hidden="true">
          ▸
        </span>
      </button>
      {open && (
        <div id={id} className="side-folder-items">
          {children}
        </div>
      )}
    </div>
  );
}
