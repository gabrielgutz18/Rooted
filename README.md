# Rooted

A pixel tree that grows with your walk of faith. Write a note about what you did today
(study, church, cell group, prayer…), and the tree reads your words and grows. Animals
move in as it gets bigger, and friends can visit each other's trees.

Built with React + Vite. Data lives in Supabase (PostgreSQL — Supabase does not use SQLite).

## Run it

```bash
npm install
```

```bash
npm run dev
```

With no Supabase keys the app runs in **trial mode**: accounts and notes are kept only in
that browser. Good for trying it out.

Add `?hour=21` to the address to preview another time of day (0–23), and `?tree=sakura`
to preview another tree (`oak`, `sakura`, `maple`, `apple`, `birch`, `willow`, `pine`).
Everyone picks their own tree on first visit, and can change it from the menu (Choose tree).

To try trial mode while Supabase keys are set, start the `rooted-trial` launch entry
(port 5177): it hides the keys from that one server only.

## Languages: English and Tagalog

English is the default. **Wika / Language** (on the sign-in card and at the bottom of the
menu) switches the whole app to Tagalog, including dates, stage names, prompts and the
verse you get when you tap the tree (Ang Dating Biblia 1905, public domain). The choice is
remembered in that browser.

Notes can be written in English, Tagalog or a mix: the word analyzer knows Tagalog roots
inside affixed words (*nagsimba*, *ipinagdasal*, *pinag-aralan*, *nagpapasalamat*…) and
Tagalog Bible book names (*Awit 23*, *Mga Hebreo 10:25*), so a Tagalog note grows the tree
just as much.

A note with nothing about faith in it (no theme word, no Bible reference) grows the tree
by only +2, however long it is.

## Spam

Before a note is saved, the app refuses random typing (*shadgjhasgd*, *asdasd*,
*a1s2d3*, *!@#$%*), the same word over and over, notes with no real words, and a copy of
a note saved in the last 24 hours. It also allows one note a minute and 10 in any 24 hours.
Because notes are encrypted, only the app can read the words; the database enforces the
24-hour limit itself (`20261119000000_note_limits.sql`) so nobody can fill it by calling
the API directly. Limits are in `src/lib/spam.ts`.

All text people read lives in `src/lib/i18n.tsx`. Any new text needs both an `en` and a
`tl` entry (TypeScript enforces it).

## Install it like an app

Rooted is a web app that can also be installed (a PWA): menu → **Install app**. It then
opens in its own window from the home screen, Start menu or Dock, works offline with the
last tree it saw, and keeps you signed in until you press Sign out.

Notes written offline are kept on the device (marked "waiting to upload") and saved to
Supabase automatically when the connection comes back, keeping the time they were written
(needs `20261117000000_offline_notes.sql`; without it they upload with the upload time).

- The offline cache (`public/sw.js`) only runs in the built app (`npm run build`, then
  `npm run preview`), never in `npm run dev`.
- Icons live in `public/icons/` and are drawn by `npm run icons` (`scripts/make-icons.mjs`).

## Connect Supabase

1. Create a project at supabase.com.
2. SQL Editor → paste each file in `supabase/migrations/` in order (oldest first) → Run.
   Already set up? Run only the files that are newer than your setup, oldest first
   (for example `20261118000000_private_notes.sql` for encrypted notes).
3. Authentication → Sign In / Providers → Email → turn **Confirm email** off
   (so creating an account logs you straight in).
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key
   (Project Settings → API).
5. Restart `npm run dev`.

**The first account created becomes the admin** — create yours first.

## Put it online

Supabase holds the database and accounts; the website itself needs a static host.
Run `npm run build` and deploy the `dist` folder to Vercel, Netlify or Cloudflare Pages,
setting the same two `VITE_SUPABASE_…` variables there.

## Where things are

| What | File |
| --- | --- |
| Stage names, point thresholds, which animal arrives when, subject prompts | `src/lib/growth.ts` |
| The word analyzer (English + Tagalog keywords, points per theme, Bible reference detection) | `src/lib/analyze.ts` |
| Spam check (random typing, repeats) and note limits | `src/lib/spam.ts` |
| Every piece of text in English and Tagalog, the language switch | `src/lib/i18n.tsx` |
| The trees you can grow: colours, branch shape, what falls from them | `src/scene/species.ts` |
| Wind, swaying, fluttering leaves, animals, sun and moon | `src/scene/engine.ts` |
| Leaf clumps (outlined, lit tufts) | `src/scene/foliage.ts` |
| Sky, mountains, hills, soil | `src/scene/backdrop.ts` |
| Pixel drawing helpers (bark shading, leaf shapes, dithering) | `src/scene/raster.ts` |
| Animal pixel art | `src/scene/sprites.ts` |
| Tree picker | `src/components/TreePicker.tsx` |
| Database tables and security rules | `supabase/migrations/` |
| Note encryption (keys, locking, recovery key) | `src/lib/vault.ts` |
| Unlock screen and recovery key dialog | `src/components/Unlock.tsx` |

## Privacy

Notes are **end-to-end encrypted**. They are locked in the browser before they are sent,
with a key only the writer has, so the database holds scrambled text. Nobody with database
access can read them: not friends, not Supabase, and not the admin (not even from the
dashboard's table editor or SQL editor).

- **What stays readable** (the tree and squares need it): each note's points and date, the
  number of notes, and the profile (name, email, tree). Subject, note text and tags are locked.
- **How the key works:** each person has a random note key (AES-256-GCM). The server
  only stores it locked twice (`note_keys` table): once with a key made from their password
  (PBKDF2-SHA256, 600,000 rounds) and once with their **recovery key**. Once unlocked, the
  key stays on the device so the app opens without the password. Sign out deletes it.
- **Recovery key:** shown once when the key is made (at sign-up, or the first time after
  this update). Menu → **Recovery key** makes a new one. If an admin resets someone's
  password, their notes stay locked until they enter the recovery key. If they lose both the
  password and the recovery key, nobody can open their old notes. That's the price of the
  admin not being able to read them.
- **Older notes** saved before encryption are locked automatically the next time their
  owner opens the app. Until then they are readable in the database. Earlier plain copies
  can also stay in Supabase's backups until those expire.
- **Limits:** a weak password weakens the lock (someone holding the database could try
  guessing it), so use a good one. On the device itself, the last-seen copy of your notes
  (for offline use) isn't encrypted. Whoever controls the website's code could change it to
  capture notes, so only deploy code you trust.

Setting it up: run `supabase/migrations/20261118000000_private_notes.sql`, then deploy the
new app. After that the database refuses notes that aren't locked, so an old copy of the app
can't save notes until it reloads. The crypto lives in `src/lib/vault.ts`.
