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

## Connect Supabase

1. Create a project at supabase.com.
2. SQL Editor → paste each file in `supabase/migrations/` in order (oldest first) → Run.
   Already set up before tree choice existed? Just run `20261116000000_tree_choice.sql`.
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
| The word analyzer (keywords, points per theme, Bible reference detection) | `src/lib/analyze.ts` |
| The trees you can grow: colours, branch shape, what falls from them | `src/scene/species.ts` |
| Wind, swaying, fluttering leaves, animals, sun and moon | `src/scene/engine.ts` |
| Leaf clumps (outlined, lit tufts) | `src/scene/foliage.ts` |
| Sky, mountains, hills, soil | `src/scene/backdrop.ts` |
| Pixel drawing helpers (bark shading, leaf shapes, dithering) | `src/scene/raster.ts` |
| Animal pixel art | `src/scene/sprites.ts` |
| Tree picker | `src/components/TreePicker.tsx` |
| Database tables and security rules | `supabase/migrations/` |

## Privacy

Notes are private: only the writer can read them. Friends see the tree, total growth,
stage and the progress squares. The admin page lists users (name, email, totals) — not notes.
