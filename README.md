# Spray

A spray wall route-setting and tracking app. Set boulder problems on a spray wall, log ascents, rate routes, and compete on a leaderboard.

Static React app backed by Supabase (auth, Postgres, storage). No server.

Live at [spray.arquipelago.org](https://spray.arquipelago.org).

## Setup

```
cp .env.example .env   # fill in Supabase URL + anon key
npm install
npm run dev
```

Supabase credentials are in your project dashboard under Settings > API. Use the **publishable** (anon) key, not the secret key.

## Database

Run `schema.sql` in the Supabase SQL Editor to create tables and RLS policies. Tables: `walls`, `routes`, `ascents`, `profiles`.

Walls reference an image and holds JSON hosted in a public Supabase Storage bucket. Insert a wall row with the URLs after uploading.

## Preprocessing

The `preprocessing/` directory contains a SAM-based script to detect holds from a wall photo. See `preprocessing/README.md` for setup. There's also `editor.html`, a minimal canvas-based tool for tweaking hold polygons — run with `python3 -m http.server` from that directory.

## Deploy

```
npm run publish
```

Builds and rsyncs `dist/` to the server. The server runs Caddy with `try_files` for SPA routing.

## Stack

- React (Vite) + React Router
- Supabase (auth, Postgres, storage)
- PWA via vite-plugin-pwa (cache-first for images/holds, network-first for API)
- SAM (Segment Anything Model) for hold detection
