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
to preview another tree (`oak`, `sakura`, `maple`, `apple`, `birch`, `willow`, `pine`, `jacaranda`,
`eucalyptus`, `socotra`, `poinciana`, `goldenshower`, `magnolia`, `spruce`, `silktree`, `baobab`,
`ginkgo`, `trumpet`, `monkeypuzzle`).
Everyone picks their own tree on first visit, and can change it from the menu (Choose tree).

To try trial mode while Supabase keys are set, start the `rooted-trial` launch entry
(port 5177): it hides the keys from that one server only.

## Streak lamp and falling leaves

**Your daily streak** is a pixel lamp on a scrap of paper in the corner of the tree. It counts
the days in a row with at least one note (today only breaks the streak once it's over), and
its fire changes colour as the streak grows: orange (Ember), then gold at 10 days, green at 20,
sky blue at 30, deep blue at 50, violet at 100 and white Glory at 200. When a note makes the
streak longer, the lamp flares up and throws sparks, and reaching a new colour says so.
With no streak the lamp is out.

Every tree also has a small wooden lamp post in the grass, the lantern hanging from it on a
chain: yours, and your friends' (theirs with no name or numbers, just their fire's colour).
Press it to swing the lantern and stoke the fire; at night it lights the ground
(`src/components/LampPost.tsx`). The × on the card hides it, leaving a small chip with your
streak to bring it back (remembered in that browser); a new streak day is then announced over
your lamp post instead. The lantern and its fire are shared in `src/components/lantern.ts`.

A tree left alone loses its leaves: they stay full for 2 days after the last note, then dry
to brown and fall, and the branches are bare by day 14. It's only how the tree looks: no growth
points are lost, and one note brings the leaves back. Numbers are in `src/lib/streak.ts`.

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

## Signing in: usernames

Members sign up and sign in with a **username and password**, with no email needed. Only the
admin signs in with an email (type it in the same Username box; anything with an `@` is
treated as an email).

- Supabase accounts need an email, so each username gets a stand-in address,
  `<username>@rooted.invalid`. The `.invalid` domain can never receive mail, and nobody
  types or sees it (`src/lib/username.ts`).
- Members who signed up with an email before this sign in with it once more. The app then
  asks them to pick a username, and from then on only the username works. The admin still
  sees their old email in Admin · users.
- **Forgot password?** (on the sign-in card): username + recovery key + a new password.
  The same key reopens their notes, so nothing ends up locked. Recovery keys made before this
  update can't reset passwords. Members can make a new one from Menu → Recovery key (or use
  their old one once on the unlock screen) to turn it on.
- **No recovery key?** The admin can give them a new password: Admin · users → **Reset**. It
  shows a random password once, for the admin to pass on. Notes written so far reopen only with
  their recovery key. Without one, they stay locked for good.
- Wrong recovery keys are limited to 5 tries per username per hour.

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
   (so creating an account logs you straight in; usernames can't confirm an email).
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key
   (Project Settings → API).
5. Deploy the account server function (usernames and password resets need it):

   ```bash
   npx supabase login
   npx supabase functions deploy account --no-verify-jwt --project-ref <your-project-ref>
   ```

   `<your-project-ref>` is the part before `.supabase.co` in your project URL. Keep
   `--no-verify-jwt`: the function checks who is calling itself, and the publishable key
   isn't a JWT. (Or, in the dashboard: Edge Functions → Deploy a new function → Via editor,
   name it `account`, paste `supabase/functions/account/index.ts`, deploy, then turn
   **Verify JWT** off in its settings.)

   Deploy it again whenever `supabase/functions/account/index.ts` changes (for example,
   changing a username needs the version with `change-username`).
6. Restart `npm run dev`.

**The first account created becomes the admin.** Create yours first, with your email:
Authentication → Users → Add user → Create new user (tick **Auto Confirm User**). Members
then sign up in the app with usernames.

## Put it online

Supabase holds the database and accounts; the website itself needs a static host.
Run `npm run build` and deploy the `dist` folder to Vercel, Netlify or Cloudflare Pages,
setting the same two `VITE_SUPABASE_…` variables there.

**Sharing the link.** When the address is shared (Facebook, Messenger, WhatsApp, X…), the
preview shows `public/og-image.png`: the landing page with a sakura at sunset, 1200 × 630
(the tags are in `index.html`). Most apps need the picture's full address, which is filled in
when the site is built: by itself on Vercel and Netlify, and anywhere else from a `SITE_URL`
setting (e.g. `SITE_URL=https://rooted.example.com`). After changing the landing page's look,
retake the picture with `SHOWCASE=1 npx playwright test -c playwright.showcase.config.ts share`.
Facebook keeps a copy of a preview for a while; its Sharing Debugger fetches it again.

## Where things are

| What | File |
| --- | --- |
| Stage names, point thresholds, which animal arrives when, subject prompts | `src/lib/growth.ts` |
| Streak lamp colours (10, 20, 30, 50, 100, 200 days) and when leaves fall | `src/lib/streak.ts` |
| The streak lamp (pixel lantern, paper card, flare) | `src/components/StreakLamp.tsx` |
| The word analyzer (English + Tagalog keywords, points per theme, Bible reference detection) | `src/lib/analyze.ts` |
| Spam check (random typing, repeats) and note limits | `src/lib/spam.ts` |
| Every piece of text in English and Tagalog, the language switch | `src/lib/i18n.tsx` |
| The trees you can grow: colours, branch shape, what falls from them | `src/scene/species.ts` |
| Wind, swaying, fluttering leaves, animals, sun and moon | `src/scene/engine.ts` |
| Leaf clumps (outlined, lit tufts) | `src/scene/foliage.ts` |
| Sky, mountains, hills, soil, landmarks, the small trees in the distance | `src/scene/backdrop.ts` |
| Each tree's native land (Japan for sakura, Canada for maple…) | `src/scene/lands.ts` |
| Pixel drawing helpers (bark shading, leaf shapes, dithering) | `src/scene/raster.ts` |
| Animal pixel art | `src/scene/sprites.ts` |
| Tree picker | `src/components/TreePicker.tsx` |
| Database tables and security rules | `supabase/migrations/` |
| Admin fixes to paste into the SQL Editor (bring back a streak, remove placeholder notes) | `supabase/sqleditor.md` |
| Note encryption (keys, locking, recovery key) | `src/lib/vault.ts` |
| Unlock screen and recovery key dialog | `src/components/Unlock.tsx` |
| Username rules and the stand-in email | `src/lib/username.ts` |
| Picking or changing a username (checks it's free as you type) | `src/components/UsernameDialog.tsx` |
| Your profile (Menu → My profile, opens inside the side menu) | `src/components/ProfilePanel.tsx` |
| Profile icons: the pixel art, background colours and how they're drawn | `src/lib/avatars.ts`, `src/components/Avatar.tsx` |
| Pinned (shared) notes: the paper card under the tree, Profile → Shared note | `src/components/SharedNote.tsx` |
| Choosing or changing a username, password resets (server) | `supabase/functions/account/index.ts` |

## Sharing a note

Each member can **pin one note** to their profile to share it: from My notes (**Pin**) or
Menu → My profile → **Shared note**. It shows on a sheet of ruled paper just *under* their tree
(not over it), for them and for every member who visits their tree, and in their profile.
Editing the note updates the pin; **Unpin**, or deleting the note, takes it down.

Because notes are encrypted, pinning saves a separate **readable copy** of that one note in
`shared_notes` (the app says so before pinning). The note in the diary stays locked, and so do all
the others. Needs `supabase/migrations/20261122000000_shared_notes.sql`; until it is run the app
works as before and pinning asks for that update.

## Privacy

Notes are **end-to-end encrypted**. They are locked in the browser before they are sent,
with a key only the writer has, so the database holds scrambled text. Nobody with database
access can read them: not friends, not Supabase, and not the admin (not even from the
dashboard's table editor or SQL editor).

- **What stays readable** (the tree and squares need it): each note's points and date, the
  number of notes, the profile (name, username, tree), and the one note a member chose to pin
  (see Sharing a note). Subject, note text and tags are
  locked. Emails exist only for the admin and for members who joined before usernames, and
  only the admin can see them.
- **How the key works:** each person has a random note key (AES-256-GCM). The server
  only stores it locked twice (`note_keys` table): once with a key made from their password
  (PBKDF2-SHA256, 600,000 rounds) and once with their **recovery key**. Once unlocked, the
  key stays on the device so the app opens without the password. Sign out deletes it.
- **Recovery key:** shown once when the key is made (at sign-up, or the first time after
  this update). Menu → **Recovery key** makes a new one. It also resets a forgotten password:
  the server keeps only a SHA-256 hash of a value made from the key (HKDF, its own label, so it
  says nothing about the notes), in `reset_checks`. If an admin resets someone's password,
  their notes stay locked until they enter the recovery key. If they lose both the password
  and the recovery key, nobody can open their old notes. That's the price of the admin not
  being able to read them.
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
