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

Add `?hour=21` to the address to preview another time of day (0–23).

## Connect Supabase

1. Create a project at supabase.com.
2. SQL Editor → paste `supabase/migrations/20261115000000_rooted.sql` → Run.
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
| Tree, sky, hills, animal behaviour | `src/scene/engine.ts` |
| Animal pixel art | `src/scene/sprites.ts` |
| Database tables and security rules | `supabase/migrations/` |

## Privacy

Notes are private: only the writer can read them. Friends see the tree, total growth,
stage and the progress squares. The admin page lists users (name, email, totals) — not notes.
