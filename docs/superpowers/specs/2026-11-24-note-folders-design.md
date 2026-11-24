# Note folders: a mini desktop in My notes

## Intent

Members want related notes kept together, like files in folders on a desktop: an
"Evangelism" folder holds evangelism notes, "Prayer" holds prayer notes. Folders are
pixel-art icons (medium size, about 66 × 54 px) that the member names and colours. They hold
a note, then drag and drop it onto a folder, on a computer or a phone.

## Goals

- Make, rename, recolour and delete folders. There are 18 colours to choose from, and an
  optional 7 × 7 pixel icon (19 of them: cross, Bible, dove, fish, church, world…) stamped on the
  folder's front, in a deep shade of a light folder or a pale tint of a dark one. (Colours and
  icons were added on 2026-11-24 at the member's request; ids are saved, so they are never
  renamed or removed.)
- Press and hold a note, then drag it onto a folder. This works with a mouse and with a
  finger, and the page doesn't scroll while a note is being dragged.
- Tap a folder to open it like a small window that shows its notes. Notes can be dragged out
  of it back to the desktop.
- Every note also has a **Move** button that does the same as dragging, for keyboard and
  screen-reader users and for anyone who finds dragging awkward.
- Search still looks through every note, and each result shows which folder it's in.
- Folders follow the member to every device and work offline (changes upload later).

## Non-goals

- Folders inside folders, and putting one note in two folders.
- Reordering folders by dragging. They stay in the order they were made.
- Sharing folders, or friends seeing them.

## Anti-goals

- Folder names, colours, or which note is in which folder must never be readable on the
  server. Notes are end-to-end encrypted, and a folder called "Struggles" would leak what
  the notes inside are about.
- Folders must not change how notes are saved, edited, pinned, counted or spam-limited.

## Approaches considered

1. **One locked "desk" record per member (chosen).** Folders and note placements are
   stored as a single JSON value, encrypted with the member's note key, in a new
   `note_desks` table (one row per member). Notes don't change at all. When two devices
   save at the same moment, the later save wins. To make that rare, every change is
   recorded as a small operation, and the operations are applied to a freshly loaded desk
   just before saving.
2. A folder label stored inside each note's locked text. Every move rewrites the note, which
   touches saving, editing, the offline outbox and pinning, and makes moving a note that's
   still waiting to upload awkward.
3. Folders kept on the device only. They wouldn't sync and would disappear on sign-out.

## Design

- **Data** (`src/lib/folders.ts`): `Desk = { folders: Folder[]; placed: Record<noteId, folderId> }`,
  `Folder = { id, name (1–40 chars), color, icon? }`, up to 60 folders. Changes are operations
  (`add`, `edit`, `remove`, `move`) applied by a pure `applyOp`. Deleting a folder puts its
  notes back on the desktop. Deleting a note removes its placement.
- **Pending operations** wait in localStorage (`rooted.deskops.v1.<user>`) until they are saved:
  load the desk, apply them, save, then drop the ones that were saved. Offline, they wait and
  are retried along with notes waiting to upload. If saving is refused (for example, the
  migration hasn't been run), the operations are dropped, the desk goes back to what was
  saved, and the error is shown, the same way pinning handles it.
- **Server**: `supabase/migrations/20261123000000_note_folders.sql` creates the
  `note_desks` table (`user_id` primary key, `sealed` text, `updated_at`), with row-level
  security limited to the owner. Until the migration is run, the desk loads empty and saving
  asks for the update.
- **Encryption**: `vault.sealData` / `vault.unsealData` encrypt any JSON value with the note
  key, bound to a label (`rooted:desk:<userId>`). If the desk was locked with an older key
  (after "start over"), it opens empty.
- **Trial mode**: the desk is kept in `rooted.v2` under `desks[userId]`.
- **Offline copy**: the desk is part of the cached snapshot, so folders show instantly and
  offline.
- **UI** (`src/components/Folders.tsx`, `src/components/Diary.tsx`): My notes shows the
  folder grid (plus a "New folder" tile) above the list. With no folder open, the list shows
  the notes on the desktop. An open folder shows a window with a title bar in its colour
  (Edit and Close) and its notes. The new/edit form is an inline card with a name field and
  the colours shown as small folder icons. Folders that hold notes show a sheet of paper
  sticking out.
- **Drag** (`src/lib/drag.ts`): pointer events. Holding for 250 ms (mouse) or 350 ms (touch)
  without moving lifts the note, so quick mouse drags still select text and swipes still
  scroll. While lifted, `touchmove` is cancelled, the folder row sticks to the top of the
  screen, the page scrolls near the top and bottom edges, a "Desktop" tile appears when the
  note is in a folder, and dropping on a `[data-drop]` target moves it. Escape cancels.

## Left to the builder

The exact pixel art, colours, copy and animations, written in English and Tagalog.
