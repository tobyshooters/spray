# Spray Wall App — Build Plan for Claude Code

## Overview
Static React app + Supabase (auth + db + storage). No server. Deployed via Netlify/Vercel/GitHub Pages.

---

## Tech Stack
- **React** (Vite) — UI
- **Supabase** — auth, Postgres DB, image storage
- **React Router** — client-side routing
- **vite-plugin-pwa** — PWA/installable app support
- **react-zoom-pan-pinch** — pinch-to-zoom on wall canvas
- **No backend server**

---

## PWA Setup

Make this a PWA using `vite-plugin-pwa`. It auto-generates a service worker and manifest. Required:

- `manifest.json` — app name, icons, `"display": "standalone"`, theme color
- A service worker (Workbox via the plugin) — cache the wall image + holds JSON so the app works offline at the wall (where wifi is often bad)
- 192px + 512px icons

**Caching strategy:**
- Cache-first for wall images and holds JSON (they rarely change)
- Network-first for Supabase API calls

**What you get:**
- Installable from browser ("Add to Home Screen") on iOS and Android
- Works offline — view existing routes even without signal
- Looks native: no browser chrome in standalone mode

---

## Preprocessing Pipeline (offline, separate script)

1. Take a photo of the spray wall
2. Run a segmentation model (e.g. SAM — Segment Anything Model) to detect holds
3. Output: wall image + a JSON file of hold polygons/bounding boxes with IDs
4. Upload both to Supabase Storage manually (or via a one-off script)

Each hold in the JSON looks like:
```json
{ "id": "h42", "polygon": [[x1,y1],[x2,y2],...], "cx": 320, "cy": 180 }
```

---

## Database Schema (Supabase Postgres)

```sql
users          -- managed by Supabase Auth
walls          -- id, name, image_url, holds_json_url
routes         -- id, wall_id, name, setter_id (FK users), hold_ids (int[]), grade, created_at
ascents        -- id, route_id, climber_id (FK users), notes, date
```

---

## App Pages & Components

```
/login                  — Supabase email/password auth
/walls                  — list of walls
/walls/:id              — view wall, list routes
/walls/:id/set          — route setter UI (hold selection)
/routes/:id             — route detail + log ascent
```

### Core UI Component: `WallCanvas`
- Renders wall image in a `<div>` with `position: relative`
- Overlays SVG holds (polygons from JSON) on top
- Wrapped in `TransformWrapper` from `react-zoom-pan-pinch` for pinch-to-zoom
- Two modes: **view** (highlights a route's holds) and **set** (select holds to build a route)

---

## Touch Considerations for `WallCanvas`

Spray walls are dense and used on mobile. Several things to get right:

**1. No hover on mobile** — don't rely on hover to indicate interactable holds. Use visible strokes always.

**2. Tap vs. drag conflict** — use `touch-action: none` on the SVG and handle pointer events manually, or use `use-gesture`. This prevents conflict between hold selection taps and pinch-zoom gestures.

**3. Touch target size** — small holds will be hard to tap. Two mitigations:
- Expand hit area with a slightly larger invisible rect behind each polygon
- Show a confirmation UI: tap selects a "candidate" hold (highlighted differently), tap again confirms

**4. Prevent scroll-jacking** — add `touch-action: none` on the canvas container so the page doesn't scroll when interacting with the wall.

**5. Pinch-to-zoom** — wrap `WallCanvas` in `TransformWrapper` from `react-zoom-pan-pinch`.

---

## File Structure

```
src/
  components/
    WallCanvas.jsx      # SVG hold overlay, TransformWrapper, touch-action: none
    HoldPolygon.jsx     # single hold with hover/selected state + expanded hit area
    RouteList.jsx
  pages/
    Login.jsx
    Walls.jsx
    WallView.jsx
    SetRoute.jsx
    RouteDetail.jsx
  lib/
    supabase.js         # createClient(url, anonKey)
  contexts/
    AuthContext.jsx
  pwa/
    icons/              # 192px, 512px PNGs
preprocessing/
  segment_holds.py      # offline SAM script → outputs holds.json
```

---

## Dependencies

```
vite-plugin-pwa
react-zoom-pan-pinch
@supabase/supabase-js
react-router-dom
```

---

## Brutalist Design Direction
- Black/white/raw. Monospace font. No rounded corners.
- Selected holds: filled red. Unselected: white stroke, transparent fill.
- Candidate hold (tapped once on mobile): yellow/orange fill.
- Minimal CSS — lean toward a single `style.css` with CSS variables.

---

## Build Order for Claude Code

1. Vite + React scaffold with React Router
2. Supabase client setup + AuthContext
3. `WallCanvas` with SVG overlay (use a placeholder holds JSON), wrapped in `TransformWrapper`
4. Login page
5. SetRoute page (hold selection → save to Supabase)
6. WallView page (list routes, view highlighted holds)
7. RouteDetail + ascent logging
8. PWA config (`vite-plugin-pwa`, manifest, icons)
9. `segment_holds.py` preprocessing script
